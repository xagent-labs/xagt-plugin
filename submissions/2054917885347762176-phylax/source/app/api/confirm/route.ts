import { NextResponse } from "next/server";
import { verifyWalletSession } from "../../../lib/privy-auth";
import { audit } from "../../../lib/audit";
import { checkRateLimit } from "../../../lib/rate-limit";

/**
 * POST /api/confirm
 *
 * Called by the frontend after the user's wallet submits a transaction.
 * Verifies the tx hash belongs to the authenticated wallet and
 * returns the transaction status.
 *
 * This does NOT perform server-side RPC verification by default
 * (requires an RPC URL). When RPC is available, it checks the receipt.
 */

// Chain ID → RPC URL mapping (from env or defaults)
function getRpcUrl(chainId: string): string | null {
  const envKey = `RPC_URL_${chainId}`;
  const url = process.env[envKey];
  if (url) return url;

  // Common public RPCs as fallback (rate-limited, not for production)
  const defaults: Record<string, string> = {
    "196": "https://rpc.xlayer.tech", // X Layer public RPC
    "1": "https://eth.llamarpc.com",
    "8453": "https://mainnet.base.org",
    "137": "https://polygon-rpc.com",
    "42161": "https://arb1.arbitrum.io/rpc",
    "56": "https://bsc-dataseed.binance.org",
  };
  return defaults[chainId] ?? null;
}

interface TxOnchainData {
  status: "confirmed" | "failed" | "reverted" | "pending" | "not_found";
  blockNumber?: number;
  gasUsed?: string;
  explorerUrl?: string;
  from?: string;
  to?: string;
  hash?: string;
  input?: string;
}

export async function checkTxOnchain(
  txHash: string,
  chainId: string
): Promise<TxOnchainData> {
  if (typeof global !== "undefined" && (global as any).__mockCheckTxOnchain) {
    return (global as any).__mockCheckTxOnchain(txHash, chainId);
  }

  const rpcUrl = getRpcUrl(chainId);
  
  // Explorer URL
  const explorerMap: Record<string, string> = {
    "1": "https://etherscan.io/tx/",
    "8453": "https://basescan.org/tx/",
    "137": "https://polygonscan.com/tx/",
    "42161": "https://arbiscan.io/tx/",
    "56": "https://bscscan.com/tx/",
    "196": "https://www.oklink.com/xlayer/tx/",
  };
  const explorerUrl = explorerMap[chainId] ? `${explorerMap[chainId]}${txHash}` : undefined;

  if (!rpcUrl) {
    if (typeof global !== "undefined" && (global as any).__mockCheckTxOnchain) {
      return (global as any).__mockCheckTxOnchain(txHash, chainId);
    }
    return { status: "pending", explorerUrl };
  }

  try {
    // Try with 1 retry (3s delay) for RPC resilience
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const [txRes, rcptRes] = await Promise.all([
          fetch(rpcUrl, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionByHash", params: [txHash], id: 1 }),
            signal: AbortSignal.timeout(10000),
          }),
          fetch(rpcUrl, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionReceipt", params: [txHash], id: 2 }),
            signal: AbortSignal.timeout(10000),
          })
        ]);

        const txData = await txRes.json() as any;
        const rcptData = await rcptRes.json() as any;

        if (!txData.result) {
          if (!txData.error) {
            return { status: "not_found", explorerUrl };
          }
          return { status: "pending", explorerUrl };
        }

        const tx = txData.result;
        const from = tx.from;
        const to = tx.to;
        const hash = tx.hash;
        const input = tx.input;

        if (!rcptData.result) {
          return { status: "pending", explorerUrl, from, to, hash, input };
        }

        const receipt = rcptData.result;
        const statusHex = receipt.status;
        const blockNumber = receipt.blockNumber ? parseInt(receipt.blockNumber, 16) : undefined;
        const gasUsed = receipt.gasUsed ? parseInt(receipt.gasUsed, 16).toString() : undefined;

        if (statusHex === "0x1") {
          return { status: "confirmed", blockNumber, gasUsed, explorerUrl, from, to, hash, input };
        } else if (statusHex === "0x0") {
          return { status: "reverted", blockNumber, gasUsed, explorerUrl, from, to, hash, input };
        } else {
          return { status: "failed", blockNumber, gasUsed, explorerUrl, from, to, hash, input };
        }
      } catch (e) {
        lastError = e;
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 3000)); // Wait 3s before retry
        }
      }
    }
    console.error(`[confirm] RPC check failed for ${txHash} after retries:`, lastError);
    return { status: "pending", explorerUrl };
  } catch (err) {
    console.error(`[confirm] RPC check failed for ${txHash}:`, err);
    return { status: "pending", explorerUrl };
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const allowed = await checkRateLimit(`confirm:${ip}`, 20, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  // ── 1. Auth verification ────────────────────────────────────────────────
  const auth = await verifyWalletSession(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error ?? "Wallet connection required." },
      { status: auth.statusCode }
    );
  }

  const session = auth.session!;

  // Per-user rate limit post-auth
  const userAllowed = await checkRateLimit(`confirm:user:${session.userId}`, 10, 60);
  if (!userAllowed) {
    return NextResponse.json({ error: "Too many confirmation requests. Please wait before trying again." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { executionId, txHash, chainId } = body as {
      executionId?: string;
      txHash?: string;
      chainId?: string;
    };

    // ── 2. Validate inputs ──────────────────────────────────────────────
    if (!executionId) {
      return NextResponse.json(
        { error: "Execution ID is required." },
        { status: 400 }
      );
    }

    if (!txHash) {
      return NextResponse.json(
        { error: "Transaction hash is required." },
        { status: 400 }
      );
    }

    // Validate tx hash format (0x + 64 hex chars)
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: "Invalid transaction hash format." },
        { status: 400 }
      );
    }

    const { validateExecutionRecord, consumeExecutionRecord } = await import("../../../lib/approval-store");
    const { valid, reason, record } = await validateExecutionRecord(executionId);
    
    if (!valid || !record) {
      await audit({
        event: "confirm_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: reason || "unknown_execution", executionId, txHash },
      });
      return NextResponse.json({ error: reason || "Invalid or expired execution ID." }, { status: 403 });
    }

    if (record.walletAddress !== session.walletAddress.toLowerCase()) {
      await audit({
        event: "confirm_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "wallet_mismatch", executionId, txHash },
      });
      return NextResponse.json({ error: "Execution wallet does not match the confirm wallet." }, { status: 403 });
    }

    const resolvedChainId = chainId ?? record.chainId;
    
    const { normalizeChain } = await import("../../../lib/chains");
    let chainConfig;
    try {
      chainConfig = normalizeChain(resolvedChainId);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    let recordChainConfig;
    try {
      recordChainConfig = normalizeChain(record.chainId);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (chainConfig.id !== recordChainConfig.id) {
      await audit({
        event: "confirm_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "chain_mismatch", executionId, txHash, expected: record.chainId, received: resolvedChainId },
      });
      return NextResponse.json({ error: "Execution chain does not match the confirm chain." }, { status: 403 });
    }

    if (chainConfig.id !== "x-layer") {
      return NextResponse.json({
        error: "Live execution is currently available on X Layer only. Base/BSC/Solana support is Coming Soon."
      }, { status: 403 });
    }

    // ── 3. Check transaction receipt and ownership ──────────────────────
    const onchainData = await checkTxOnchain(txHash, resolvedChainId);

    if (onchainData.status === "not_found") {
      await audit({
        event: "confirm_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "tx_not_found", executionId, txHash, status: onchainData.status },
      });
      return NextResponse.json({ error: "Transaction not found on-chain." }, { status: 400 });
    }

    if (onchainData.status === "failed" || onchainData.status === "reverted") {
      await audit({
        event: "confirm_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "tx_failed", executionId, txHash, status: onchainData.status },
      });
      return NextResponse.json({ error: "Transaction failed or reverted on-chain." }, { status: 400 });
    }

    // Enforce hash match
    if (onchainData.hash && onchainData.hash.toLowerCase() !== txHash.toLowerCase()) {
      await audit({
        event: "confirm_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "hash_mismatch", executionId, txHash, onchainHash: onchainData.hash },
      });
      return NextResponse.json({ error: "On-chain transaction hash mismatch." }, { status: 403 });
    }

    // Enforce from address
    if (onchainData.from && onchainData.from.toLowerCase() !== record.walletAddress) {
      await audit({
        event: "confirm_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "from_mismatch", executionId, txHash, expected: record.walletAddress, actual: onchainData.from },
      });
      return NextResponse.json({ error: "Transaction sender does not match execution wallet." }, { status: 403 });
    }

    // Enforce to address (target/router)
    if (record.target && onchainData.to && onchainData.to.toLowerCase() !== record.target.toLowerCase()) {
      await audit({
        event: "confirm_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "target_mismatch", executionId, txHash, expected: record.target, actual: onchainData.to },
      });
      return NextResponse.json({ error: "Transaction target does not match authorized router." }, { status: 403 });
    }

    if (onchainData.status === "pending") {
      return NextResponse.json({
        executionId,
        txHash,
        status: onchainData.status,
        explorerUrl: onchainData.explorerUrl ?? null,
        walletAddress: session.walletAddress,
      });
    }

    // Attempt to consume the execution record for one-time use
    const consumed = await consumeExecutionRecord(executionId);
    if (!consumed) {
      await audit({
        event: "confirm_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "execution_already_confirmed", executionId, txHash },
      });
      return NextResponse.json({ error: "Execution already confirmed or consumed." }, { status: 403 });
    }

    await audit({
      event: "wallet_tx_submitted",
      privyUserId: session.userId,
      walletAddress: session.walletAddress,
      metadata: { executionId, txHash, chainId: resolvedChainId },
    });

    await audit({
      event: "tx_confirmed",
      privyUserId: session.userId,
      walletAddress: session.walletAddress,
      metadata: {
        executionId,
        txHash,
        status: onchainData.status,
        blockNumber: onchainData.blockNumber,
        gasUsed: onchainData.gasUsed,
      },
    });

    return NextResponse.json({
      executionId,
      txHash,
      status: onchainData.status,
      blockNumber: onchainData.blockNumber ?? null,
      gasUsed: onchainData.gasUsed ?? null,
      explorerUrl: onchainData.explorerUrl ?? null,
      walletAddress: session.walletAddress,
    });
  } catch (err) {
    console.error("Confirm error:", err);
    return NextResponse.json(
      { error: "Failed to confirm transaction." },
      { status: 500 }
    );
  }
}
