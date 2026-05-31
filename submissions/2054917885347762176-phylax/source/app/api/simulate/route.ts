import { NextResponse } from "next/server";
import { simulateSwap, OkxRealModeError, simulateTransaction } from "../../../lib/okx";
import { createApproval } from "../../../lib/approval-store";
import { checkGuardrails } from "../../../lib/guardrails";
import { verifyWalletSession } from "../../../lib/privy-auth";
import { checkRateLimit } from "../../../lib/rate-limit";
import { audit } from "../../../lib/audit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const allowed = await checkRateLimit(`simulate:${ip}`, 30, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  // ── Wallet session enforcement ──────────────────────────────────────────
  const auth = await verifyWalletSession(req);
  if (!auth.authenticated || !auth.session) {
    return NextResponse.json(
      { error: auth.error ?? "Wallet connection required." },
      { status: auth.statusCode || 401 }
    );
  }
  const session = auth.session;

  try {
    const {
      address,
      amount,
      chain,
      slippageLimitPercent,
      isScanned,
      riskLevel,
      fromToken: requestFromToken,
      fromSymbol: requestFromSymbol
    } = await req.json();

    if (!address || amount === undefined || !chain) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // ── X Layer enforcement ─────────────────────────────────────────────────
    const { normalizeChain } = await import("../../../lib/chains");
    let chainConfig;
    try {
      chainConfig = normalizeChain(chain);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (chainConfig.id !== "x-layer") {
      return NextResponse.json({
        error: "Live execution is currently available on X Layer only. Base/BSC/Solana support is Coming Soon."
      }, { status: 403 });
    }

    // ── Token security scan ─────────────────────────────────────────────────
    const { scanToken } = await import("../../../lib/okx");
    const scanResult = await scanToken(address, chainConfig.id);

    if (!scanResult.executionAllowed) {
      return NextResponse.json(
        { error: `Token risk is ${scanResult.riskLevel}. Simulation and execution are blocked.` },
        { status: 403 }
      );
    }

    // ── Quote / preflight ───────────────────────────────────────────────────
    const { simulation, fromToken, fromSymbol, fromAmountUsd, meta } = await simulateSwap(
      address,
      amount,
      chain,
      requestFromToken,
      requestFromSymbol
    );

    const SERVER_HARD_CAP = Math.max(1, parseFloat(process.env.MAX_TRADE_USD_HARD_CAP || "100"));
    const guardrails = checkGuardrails(
      fromAmountUsd,
      SERVER_HARD_CAP,
      slippageLimitPercent !== undefined ? slippageLimitPercent : 2,
      simulation.slippage
    );
    if (!guardrails.valid) {
      return NextResponse.json({ error: guardrails.reason }, { status: 400 });
    }

    // ── Build swap tx data (needed for simulation and for execution) ────────
    const { getSwapTxData, checkAllowance, getApproveTxData, getTokenDecimals, toMinimalUnits } = await import("../../../lib/okx");
    const swapData = await getSwapTxData(address, amount, chain, session.walletAddress, fromToken, slippageLimitPercent);

    if (!swapData.txData || swapData.error) {
      return NextResponse.json({ error: swapData.error ?? "Failed to build swap transaction data." }, { status: 400 });
    }

    // ── Phase 2: Real EVM-level pre-sign simulation ─────────────────────────
    // Simulate the actual unsigned swap calldata BEFORE creating an approvalId.
    // This is an OKX gateway dry-run — not a quote, not a preflight check.
    // If simulation reverts or the CLI fails → fail-closed: 403, no approvalId.

    await audit({
      event: "simulation_started",
      walletAddress: session.walletAddress,
      privyUserId: session.userId,
      metadata: { chain: chainConfig.id, tokenAddress: address }
    });

    const simulationResult = await simulateTransaction({
      from:  session.walletAddress,
      to:    swapData.txData.to,
      data:  swapData.txData.data,
      value: swapData.txData.value,
      chain: chainConfig.chainSlug,
    });

    if (!simulationResult.ok || simulationResult.reverted) {
      // Audit the block
      await audit({
        event: "simulation_blocked",
        walletAddress: session.walletAddress,
        privyUserId: session.userId,
        metadata: {
          chain: chainConfig.id,
          tokenAddress: address,
          failReason: simulationResult.failReason,
          gasUsed: simulationResult.gasUsed,
        },
      });

      return NextResponse.json(
        {
          error: simulationResult.failReason
            ? `Pre-sign simulation reverted: ${simulationResult.failReason}`
            : "Pre-sign simulation failed. Trade blocked for safety.",
          simulationResult: {
            ok: false,
            reverted: simulationResult.reverted,
            failReason: simulationResult.failReason,
            gasUsed: simulationResult.gasUsed,
          },
        },
        { status: 403 }
      );
    }

    await audit({
      event: "simulation_passed",
      walletAddress: session.walletAddress,
      privyUserId: session.userId,
      metadata: {
        chain: chainConfig.id,
        tokenAddress: address,
        gasUsed: simulationResult.gasUsed,
      },
    });

    // ── Allowance check (only after simulation passes) ──────────────────────
    let routerAddress: string | undefined = swapData.txData.to;
    let allowanceResult = { hasSufficient: true };
    let approveTxData = null;
    let decimals = 18;
    let approveAmountStr: string | undefined = undefined;

    decimals = await getTokenDecimals(chain, fromToken);
    allowanceResult = await checkAllowance(chain, session.walletAddress, fromToken, amount, decimals);
    if (!allowanceResult.hasSufficient) {
      const approveData = await getApproveTxData(chain, fromToken, amount, decimals);
      approveTxData = approveData.txData;
      try {
        approveAmountStr = toMinimalUnits(amount, decimals);
      } catch { /* ignore */ }
    }

    // ── Create approvalId — only reached if simulation PASSED ───────────────
    const approvalId = await createApproval(
      address,
      chain,
      fromAmountUsd,
      slippageLimitPercent,
      session.walletAddress,
      fromToken,
      routerAddress,
      !allowanceResult.hasSufficient,
      approveAmountStr,
      routerAddress
    );

    await audit({
      event: "approval_created",
      walletAddress: session.walletAddress,
      privyUserId: session.userId,
      metadata: { approvalId, chain, tokenAddress: address }
    });

    return NextResponse.json({
      simulation,
      fromToken,
      fromSymbol,
      fromAmountUsd,
      approvalId,
      meta,
      needsApproval: !allowanceResult.hasSufficient,
      approveTxData,
      // Phase 2 addition: pre-sign simulation result (additive, does not break QuoteCard)
      preSignSimulation: {
        ok: true,
        reverted: false,
        gasUsed: simulationResult.gasUsed,
        assetChanges: simulationResult.assetChanges,
        risks: simulationResult.risks,
      },
    });
  } catch (err) {
    if (err instanceof OkxRealModeError) {
      return NextResponse.json(
        { error: err.message, meta: err.meta, integration: "okx-dex-swap" },
        { status: 502 }
      );
    }
    console.error("Simulation error:", err);
    return NextResponse.json({ error: "Failed to simulate swap" }, { status: 500 });
  }
}
