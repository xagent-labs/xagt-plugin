import fs from "node:fs";
import path from "node:path";
import {
  appendEvent,
  loadEvents,
  loadPolicy,
  makeEvent,
  renderReplay,
  validateExecutionGate,
  verifyEventChain,
  writeEvents,
} from "./blackbox-core.js";
import { commitSessionHash, commitmentEventPayload } from "./anchor/xlayer-anchor.js";
import { exportDashboardData } from "./dashboard-export.js";
import { OkxSkillAdapter } from "./okx/skill-adapter.js";
import { renderDigest } from "./report.js";
import type { BlackBoxEvent, DemoPaths } from "./types.js";

export interface DemoResult {
  events: BlackBoxEvent[];
  blockedBeforeConfirmation: ReturnType<typeof validateExecutionGate>;
  finalGate: ReturnType<typeof validateExecutionGate>;
  digestPath: string;
  replayPath: string;
}

export async function runDemoFlow(paths: DemoPaths, quiet = false): Promise<DemoResult> {
  const okx = new OkxSkillAdapter();
  const sessionId = "session_demo_blackbox";
  fs.mkdirSync(path.dirname(paths.eventsPath), { recursive: true });
  fs.mkdirSync(path.dirname(paths.digestPath), { recursive: true });
  fs.mkdirSync(path.dirname(paths.replayPath), { recursive: true });
  writeEvents(paths.eventsPath, []);

  let index = 1;
  let previousEventHash = "sha256:genesis";
  const commit = (
    ticketId: string,
    agent: BlackBoxEvent["agent"],
    type: BlackBoxEvent["type"],
    summary: string,
    payload: Record<string, unknown>,
    okxSkill?: string,
  ) => {
    const event = makeEvent(index++, ticketId, agent, type, summary, payload, okxSkill, {
      sessionId,
      previousEventHash,
    });
    previousEventHash = event.event_hash;
    appendEvent(paths.eventsPath, event);
    if (!quiet) {
      console.log(`${event.event_id} ${agent}: ${summary}`);
    }
    return event;
  };

  if (!quiet) {
    console.log("Booting The Desk: six agents, one book, every wallet decision black-boxed.");
  }

  const [risky, clean] = okx.scoutCandidates();
  if (!risky || !clean) {
    throw new Error("OKX Scout adapter must return one risky candidate and one clean candidate");
  }
  const riskySecurity = okx.securityCheck(risky);
  const cleanSecurity = okx.securityCheck(clean);
  const riskyRisk = okx.riskCheck(risky, riskySecurity);
  const cleanRisk = okx.riskCheck(clean, cleanSecurity);
  const wallet = okx.walletSnapshot();
  const allocationUsd = Math.min(50, (wallet.bookValueUsd * 2) / 100);
  const quote = okx.quoteSwap(clean, allocationUsd);
  const quoteSimulation = okx.simulateQuote(clean, quote);

  commit(
    risky.ticketId,
    "Scout",
    "candidate.created",
    `Scout found ${risky.symbol} from ${risky.source}, queued for mandatory risk review.`,
    { ...risky },
    risky.skillName,
  );
  commit(
    risky.ticketId,
    "Risk Officer",
    "risk.security_check",
    `OKX security scan bound ${risky.symbol} result hash ${riskySecurity.responseHash}.`,
    {
      verdict: riskySecurity.verdict,
      reason: riskySecurity.reason,
      flags: riskySecurity.flags,
      responseHash: riskySecurity.responseHash,
      mode: riskySecurity.mode,
      raw: riskySecurity.raw,
    },
    riskySecurity.skillName,
  );
  commit(
    risky.ticketId,
    "Risk Officer",
    "risk.verdict",
    `Risk Officer vetoed ${risky.symbol}: ${riskyRisk.reason}.`,
    {
      verdict: riskyRisk.verdict,
      reason: riskyRisk.reason,
      flags: riskyRisk.flags,
      securityResponseHash: riskyRisk.securityResponseHash,
      mode: riskyRisk.mode,
      raw: riskyRisk.raw,
    },
    riskyRisk.skillName,
  );

  commit(
    clean.ticketId,
    "Scout",
    "candidate.created",
    `Scout found ${clean.symbol} on ${clean.chain}, queued for mandatory risk review.`,
    { ...clean },
    clean.skillName,
  );
  commit(
    clean.ticketId,
    "Risk Officer",
    "risk.security_check",
    `OKX security scan bound ${clean.symbol} result hash ${cleanSecurity.responseHash}.`,
    {
      verdict: cleanSecurity.verdict,
      reason: cleanSecurity.reason,
      flags: cleanSecurity.flags,
      responseHash: cleanSecurity.responseHash,
      mode: cleanSecurity.mode,
      raw: cleanSecurity.raw,
    },
    cleanSecurity.skillName,
  );
  commit(
    clean.ticketId,
    "Risk Officer",
    "risk.verdict",
    `Risk Officer approved ${clean.symbol}: ${cleanRisk.reason}.`,
    {
      verdict: cleanRisk.verdict,
      reason: cleanRisk.reason,
      flags: cleanRisk.flags,
      securityResponseHash: cleanRisk.securityResponseHash,
      mode: cleanRisk.mode,
      raw: cleanRisk.raw,
    },
    cleanRisk.skillName,
  );
  commit(
    clean.ticketId,
    "Allocator",
    "allocation.sized",
    `Allocator sized ${clean.symbol} to 2% of book using ${wallet.skillName}.`,
    {
      sizeUsd: allocationUsd,
      bookValueUsd: wallet.bookValueUsd,
      maxPositionPct: 5,
      baseAsset: wallet.baseAsset,
      wallet: wallet.wallet,
      mode: wallet.mode,
      raw: wallet.raw,
    },
    wallet.skillName,
  );
  commit(
    clean.ticketId,
    "Executor",
    "route.quoted",
    `Executor quoted ${quote.chain} route with ${quote.slippageBps} bps slippage.`,
    {
      chain: quote.chain,
      fromAsset: quote.fromAsset,
      toAsset: quote.toAsset,
      amountUsd: quote.amountUsd,
      slippageBps: quote.slippageBps,
      netPriceImpactBps: quote.netPriceImpactBps,
      estimatedGasUsd: quote.estimatedGasUsd,
      route: quote.route,
      mode: quote.mode,
      raw: quote.raw,
    },
    quote.skillName,
  );
  commit(
    clean.ticketId,
    "Executor",
    "quote.simulation",
    `OKX gateway simulated ${quote.chain} route and bound result hash ${quoteSimulation.resultHash}.`,
    {
      status: quoteSimulation.status,
      resultHash: quoteSimulation.resultHash,
      chain: quoteSimulation.chain,
      chainId: quoteSimulation.chainId,
      gasUsd: quoteSimulation.gasUsd,
      mode: quoteSimulation.mode,
      raw: quoteSimulation.raw,
    },
    quoteSimulation.skillName,
  );

  const policy = loadPolicy(paths.policyPath);
  const blockedBeforeConfirmation = validateExecutionGate(clean.ticketId, loadEvents(paths.eventsPath), policy);
  if (!quiet && !blockedBeforeConfirmation.allowed) {
    console.log(`Executor gate before confirmation: BLOCKED (${blockedBeforeConfirmation.errors.join("; ")})`);
  }

  commit(
    clean.ticketId,
    "Orchestrator",
    "user.confirmed",
    "Human confirmation recorded with a $50 cap.",
    {
      confirmed: true,
      capUsd: 50,
      note: "Demo approval for simulated execution only.",
    },
  );

  const finalGate = validateExecutionGate(clean.ticketId, loadEvents(paths.eventsPath), policy);
  if (!finalGate.allowed) {
    throw new Error(`clean ticket should pass after confirmation: ${finalGate.errors.join("; ")}`);
  }

  commit(
    clean.ticketId,
    "Executor",
    "execution.signed_or_simulated",
    "Executor simulated signature via OKX Agentic Wallet.",
    {
      mode: policy.signingMode,
      wallet: wallet.wallet,
      action: "swap",
      simulatedTxId: "sim_okx_wallet_xlayer_0001",
      label: "Signed via OKX Agentic Wallet (simulated)",
    },
    "OKX Agentic Wallet",
  );
  commit(
    clean.ticketId,
    "Executor",
    "receipt.verified",
    "Executor verified simulated X Layer testnet receipt.",
    {
      status: "simulated-confirmed",
      receiptId: "receipt_xlayer_sim_0001",
      submitted: true,
      chainId: 1952,
    },
  );

  const anchorInput = verifyEventChain(loadEvents(paths.eventsPath));
  if (!anchorInput.valid || !anchorInput.sessionHash) {
    throw new Error(`cannot anchor invalid trace: ${anchorInput.errors.join("; ") || "missing session hash"}`);
  }
  const anchorResult = await commitSessionHash(anchorInput.sessionHash);
  commit(
    clean.ticketId,
    "Orchestrator",
    "chain.commitment",
    anchorResult.ok
      ? `Session hash committed to X Layer testnet: ${anchorResult.txHash}.`
      : `Session anchor not submitted: ${anchorResult.error}.`,
    commitmentEventPayload(anchorResult),
    "x-layer-session-anchor",
  );

  const eventsBeforeReport = loadEvents(paths.eventsPath);
  const digest = renderDigest(eventsBeforeReport);
  fs.writeFileSync(paths.digestPath, digest);
  commit(
    "desk_daily",
    "Reporter",
    "report.digest",
    "Reporter wrote the desk memo from the Black Box trace.",
    {
      path: paths.digestPath,
      orderCount: eventsBeforeReport.filter((event) => event.type === "candidate.created").length,
    },
  );

  const events = loadEvents(paths.eventsPath);
  fs.writeFileSync(paths.replayPath, renderReplay(events));
  if (paths.dashboardDataDir) {
    exportDashboardData({
      dataDir: paths.dashboardDataDir,
      events,
      policyPath: paths.policyPath,
      replayPath: paths.replayPath,
      digestPath: paths.digestPath,
      okxEvidencePath: "docs/evidence/okx-canary.md",
    });
  }

  if (!quiet) {
    console.log(`Replay written to ${paths.replayPath}`);
    console.log(`Digest written to ${paths.digestPath}`);
  }

  return {
    events,
    blockedBeforeConfirmation,
    finalGate,
    digestPath: paths.digestPath,
    replayPath: paths.replayPath,
  };
}
