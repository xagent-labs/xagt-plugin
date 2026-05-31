import { NextResponse } from "next/server";
import { verifyWalletSession } from "../../../lib/privy-auth";
import { enforceRiskPolicy, isLiveExecutionEnabled } from "../../../lib/risk-policy";
import { audit } from "../../../lib/audit";
import { checkRateLimit } from "../../../lib/rate-limit";

/**
 * Unsigned transaction shape returned to the client.
 * The client's wallet (MetaMask, Privy embedded, etc.) calls
 * eth_sendTransaction with this payload.
 */
interface UnsignedTx {
  to: string;
  data: string;
  value: string;
  chainId: string;
  gas?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const allowed = await checkRateLimit(`execute:${ip}`, 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  // ── 1. Wallet session & ownership verification ────────────────────────
  const auth = await verifyWalletSession(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error ?? "Wallet connection required." },
      { status: auth.statusCode }
    );
  }

  const session = auth.session!;

  // ── 1b. Per-user rate limit post-auth (IP rate limit alone is spoofable) ─
  const userAllowed = await checkRateLimit(`execute:user:${session.userId}`, 5, 60);
  if (!userAllowed) {
    return NextResponse.json({ error: "Too many execution requests. Please wait before trying again." }, { status: 429 });
  }

  await audit({
    event: "execution_requested",
    privyUserId: session.userId,
    walletAddress: session.walletAddress,
  });

  try {
    const body = await req.json();
    const { approvalId, riskAcknowledged, approvalTxHash } = body as {
      approvalId?: string;
      riskAcknowledged?: boolean;
      approvalTxHash?: string;
    };

    // ── 2. Validate required inputs ───────────────────────────────────────
    if (!approvalId) {
      return NextResponse.json({ error: "Approval ID is missing." }, { status: 400 });
    }
    
    if (!riskAcknowledged) {
      return NextResponse.json({ error: "Risk acknowledgement is required for execution." }, { status: 400 });
    }

    const { peekApproval, validateAndConsumeApproval, markApprovalTxConsumed } = await import("../../../lib/approval-store");
    const { normalizeChain } = await import("../../../lib/chains");
    const { checkTxOnchain } = await import("../confirm/route");

    // ── 3. Pre-flight: peek approval WITHOUT consuming to validate wallet ownership first.
    //    This prevents TOCTOU where approval gets burned on wallet mismatch — user would
    //    lose their approval and need to re-request a quote.
    const peek = await peekApproval(approvalId);
    if (!peek.found || !peek.approval) {
      return NextResponse.json({ error: peek.reason ?? "Approval ID is missing or invalid." }, { status: 403 });
    }

    // Validate wallet ownership before doing anything irreversible
    const approvalWallet = peek.approval.walletAddress;
    if (!approvalWallet || typeof approvalWallet !== "string" || approvalWallet.trim() === "") {
      await audit({
        event: "execution_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "missing_approval_wallet", approvalId },
      });
      return NextResponse.json({ error: "Approval has no bound wallet address. Execution rejected." }, { status: 403 });
    }

    if (approvalWallet.toLowerCase() !== session.walletAddress.toLowerCase()) {
      await audit({
        event: "execution_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "wallet_mismatch", approvalId },
      });
      return NextResponse.json({ error: "Execution wallet does not match the approval wallet." }, { status: 403 });
    }

    // ── 4. Chain validation (still pre-consume — no side effects yet) ──────
    let chainConfig;
    try {
      chainConfig = normalizeChain(peek.approval.chain);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (chainConfig.id !== "x-layer") {
      return NextResponse.json({
        error: "Live execution is currently available on X Layer only. Base/BSC/Solana support is Coming Soon."
      }, { status: 403 });
    }

    if (peek.approval.needsApproval && !approvalTxHash) {
      return NextResponse.json({ error: "Approval transaction hash is missing but required for execution." }, { status: 400 });
    }

    // ── 5. Onchain approval tx validation (still pre-consume) ─────────────
    if (approvalTxHash) {
      const onchainData = await checkTxOnchain(approvalTxHash, chainConfig.chainIndex);
      if (onchainData.status !== "confirmed") {
        return NextResponse.json({ error: "Approval transaction is not confirmed on-chain. Please wait or try again." }, { status: 400 });
      }
      if (onchainData.from && onchainData.from.toLowerCase() !== session.walletAddress.toLowerCase()) {
        return NextResponse.json({ error: "Approval transaction sender does not match verified wallet." }, { status: 403 });
      }
      if (peek.approval.fromToken && onchainData.to && onchainData.to.toLowerCase() !== peek.approval.fromToken.toLowerCase()) {
        return NextResponse.json({ error: "Approval transaction target does not match the expected token contract." }, { status: 403 });
      }

      if (peek.approval.needsApproval && onchainData.input && onchainData.input.length >= 138) {
        const method = onchainData.input.substring(0, 10);
        if (method.toLowerCase() !== "0x095ea7b3") {
          return NextResponse.json({ error: "Approval transaction has invalid method selector." }, { status: 403 });
        }
        const spender = "0x" + onchainData.input.substring(34, 74).toLowerCase();
        if (peek.approval.spender && spender !== peek.approval.spender.toLowerCase()) {
          return NextResponse.json({ error: "Approval transaction spender does not match expected router." }, { status: 403 });
        }
        const amountHex = "0x" + onchainData.input.substring(74, 138);
        try {
          const amountBigInt = BigInt(amountHex);
          const expectedBigInt = BigInt(peek.approval.approveAmount || "0");
          if (amountBigInt < expectedBigInt) {
            return NextResponse.json({ error: "Approval transaction amount is insufficient." }, { status: 403 });
          }
        } catch {}
      }

      // Mark approval tx consumed ONLY after full validation
      const isNew = await markApprovalTxConsumed(approvalTxHash);
      if (!isNew) {
        return NextResponse.json({ error: "Approval replay blocked." }, { status: 403 });
      }
    }

    // ── 5b. Execute-time token risk re-check ──────────────────────────────
    // Re-scan the target token at execution time to catch risk changes that
    // occurred AFTER the preflight quote was approved (e.g. liquidity removal,
    // honeypot reclassification). We use the peeked approval data so the
    // approval slot is NOT yet burned if we block here.
    {
      const { scanToken } = await import("../../../lib/okx");
      let riskResult;
      try {
        riskResult = await scanToken(peek.approval.tokenAddress, peek.approval.chain);
      } catch (scanErr: any) {
        // Scan hard-failure: fail closed — block the execution
        await audit({
          event: "execution_blocked",
          privyUserId: session.userId,
          walletAddress: session.walletAddress,
          metadata: {
            reason: "token_risk_scan_error",
            approvalId,
            detail: scanErr?.message ?? "scanToken threw unexpectedly",
            tokenAddress: peek.approval.tokenAddress,
          },
        });
        return NextResponse.json(
          { error: "Execution blocked: token risk scan failed at execute time. Please try again with a fresh quote." },
          { status: 403 }
        );
      }

      if (riskResult.decision === "high_risk" || !riskResult.executionAllowed) {
        await audit({
          event: "execution_blocked",
          privyUserId: session.userId,
          walletAddress: session.walletAddress,
          metadata: {
            reason: "token_risk_changed_at_execution",
            approvalId,
            tokenAddress: peek.approval.tokenAddress,
            riskDecision: riskResult.decision,
            riskLevel: riskResult.riskLevel,
            triggeredLabels: riskResult.triggeredLabels,
          },
        });
        return NextResponse.json(
          { error: "Execution blocked because token risk changed after preflight." },
          { status: 403 }
        );
      }
    }

    // ── 6. All pre-flight checks passed — now atomically consume the approval ─
    const { valid, reason, approval, code } = await validateAndConsumeApproval(approvalId);
    if (!valid || !approval) {
      let event: import("../../../lib/audit").AuditEvent = "execution_blocked";
      if (code === "missing") event = "approval_missing";
      else if (code === "replay") event = "approval_replay_blocked";
      else if (code === "expired") event = "approval_expired";

      await audit({
        event: event,
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: reason ?? "invalid_approval", approvalId },
      });
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // Spend amount is budgetUsd
    const spendAmountUsd = approval.budgetUsd;

    // Resolve chainIndex for risk policy and OKX API
    const { getSwapTxData } = await import("../../../lib/okx");
    // normalizeChain already imported above
    
    // chainConfig already resolved above
    const chainIndex = chainConfig.chainIndex;

    // ── 7. Check if live execution is enabled ─────────────────────────────
    if (!isLiveExecutionEnabled()) {
      return NextResponse.json({
        result: {
          txHash: null,
          status: "execution_disabled",
          requestedAddress: approval.tokenAddress,
          requestedAmountUsd: spendAmountUsd,
        },
        meta: {
          source: "execution_disabled",
          provider: "PhylaX",
          chainIndex,
          timestamp: new Date().toISOString(),
        },
        message:
          "Live execution is disabled. Quote and risk analysis are real. " +
          "Enable ENABLE_LIVE_EXECUTION=true and connect a browser wallet to execute.",
      });
    }

    // ── 8. Enforce risk policy ────────────────────────────────────────────
    const slippage = approval.slippageLimitPercent;
    const quoteCreatedAt = approval.createdAt;

    const policy = await enforceRiskPolicy({
      chainId: chainIndex,
      slippagePercent: slippage,
      quoteCreatedAt,
      walletAddress: session.walletAddress,
      privyUserId: session.userId,
      amountUsd: spendAmountUsd,
    });

    if (!policy.allowed) {
      await audit({
        event: "execution_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: policy.reason, approvalId },
      });
      return NextResponse.json(
        { error: policy.reason },
        { status: 403 }
      );
    }

    await audit({
      event: "approval_consumed",
      privyUserId: session.userId,
      walletAddress: session.walletAddress,
      metadata: { approvalId },
    });

    // ── 7. Build unsigned transaction SERVER-SIDE ─────────────────────────
    // The unsigned tx data is retrieved from OKX directly.
    // We do NOT trust the client for txData.
    
    const txDataResponse = await getSwapTxData(
      approval.tokenAddress,
      spendAmountUsd,
      chainIndex,
      session.walletAddress,
      approval.fromToken, // use fromToken from approval
      slippage
    );

    if (txDataResponse.error || !txDataResponse.txData) {
      await audit({
        event: "execution_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "swap_build_failed", approvalId, detail: txDataResponse.error },
      });
      return NextResponse.json(
        {
          error: txDataResponse.error || "Failed to build transaction data on the server.",
        },
        { status: 400 }
      );
    }

    const txData = txDataResponse.txData;

    const unsignedTx: UnsignedTx = {
      to: txData.to,
      data: txData.data,
      value: txData.value ?? "0x0",
      chainId: chainIndex,
      ...(txData.gas && { gas: txData.gas }),
      ...(txData.gasLimit && { gasLimit: txData.gasLimit }),
      ...(txData.gasPrice && { gasPrice: txData.gasPrice }),
      ...(txData.maxFeePerGas && { maxFeePerGas: txData.maxFeePerGas }),
      ...(txData.maxPriorityFeePerGas && {
        maxPriorityFeePerGas: txData.maxPriorityFeePerGas,
      }),
    };

    // Block if gas cannot be determined
    if (!unsignedTx.gas && !unsignedTx.gasLimit) {
      await audit({
        event: "execution_blocked",
        privyUserId: session.userId,
        walletAddress: session.walletAddress,
        metadata: { reason: "gas_undetermined", approvalId },
      });
      return NextResponse.json(
        {
          error:
            "Gas limit could not be determined for this transaction. " +
            "Live execution blocked. Please try again with a fresh quote.",
        },
        { status: 400 }
      );
    }

    const { createExecutionRecord } = await import("../../../lib/approval-store");
    const executionId = await createExecutionRecord(
      session.walletAddress,
      chainIndex,
      approvalId,
      unsignedTx.to
    );

    await audit({
      event: "unsigned_tx_created",
      privyUserId: session.userId,
      walletAddress: session.walletAddress,
      metadata: {
        executionId,
        approvalId,
        chainId: chainIndex,
        to: unsignedTx.to,
      },
    });

    return NextResponse.json({
      executionId,
      unsignedTx,
      walletAddress: session.walletAddress,
      chainId: chainIndex,
      message:
        "Sign this transaction with your wallet. " +
        "PhylaX returns unsigned data only — your wallet handles signing and on-chain submission.",
    });
  } catch (err) {
    console.error("Execution error:", err);
    return NextResponse.json(
      { error: "Failed to process execution request." },
      { status: 500 }
    );
  }
}
