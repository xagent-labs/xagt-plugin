import fs from "node:fs";
import path from "node:path";
import type { BlackBoxPolicy, Opportunity, OpportunityPolicyVerdict, OpportunityScan } from "./types.js";
import { runOnchainJson, type OnchainJsonResult } from "./okx/onchainos.js";
import { DEFAULT_OPPORTUNITY_ORDER_USD, DEFAULT_POLICY_PATH, evaluatePolicy, loadPolicy } from "./policy/index.js";
import { buildClusteredScan, classifySourceMode, composeOpportunityScan, type ComposeScanOptions } from "./scanners/index.js";
import type { ScannerSourceHealth } from "./scanners/shared.js";

export interface ScannerPolicyVerdictInput {
  policy: BlackBoxPolicy;
  chain: string;
  riskVerdict: "allow" | "review" | "block";
  riskReason?: string;
  quoteRequired: boolean;
  hasExecutableQuote: boolean;
  allocation: {
    sizeUsd: number;
    bookValueUsd: number;
  };
  route: {
    chain: string;
    slippageBps: number;
  };
}

const defaultDataDir = "web/public/data";
export const DEFAULT_OPPORTUNITY_BOOK_VALUE_USD = 10_000;

export async function scanOpportunities(options: {
  dataDir?: string;
  policyPath?: string;
  maxOpportunities?: number;
  timeoutMs?: number;
  fetchImpl?: ComposeScanOptions["fetchImpl"];
} = {}): Promise<OpportunityScan> {
  const policy = loadPolicy(options.policyPath ?? DEFAULT_POLICY_PATH);
  const publicScan = await composeOpportunityScan({
    maxOpportunities: options.maxOpportunities ?? 12,
    timeoutMs: options.timeoutMs ?? 5_000,
    fetchImpl: options.fetchImpl,
    fallbackOpportunities: () => fallbackOpportunities(policy),
  });
  const okxEnrichment = collectOkxEnrichment();

  const publicOpportunities =
    publicScan.mode === "fixture-fallback"
      ? publicScan.opportunities
      : publicScan.opportunities.map((opportunity) => applyScannerPolicy(opportunity, policy));
  const opportunities = okxEnrichment.available ? addOkxEvidence(publicOpportunities) : publicOpportunities;
  const sourceHealth = [...publicScan.sourceHealth, ...okxEnrichment.sourceHealth];
  const sourceMode =
    publicScan.sourceMode === "demo-snapshot" && opportunities.every((opportunity) => opportunity.category === "demo")
      ? "demo-snapshot"
      : classifySourceMode(sourceHealth, opportunities, okxEnrichment.available);
  const scan = buildClusteredScan(publicScan.mode, opportunities, sourceHealth, sourceMode, policy.maxQuoteAgeSeconds ?? 60);

  writeScanArtifacts(scan, options.dataDir ?? defaultDataDir);
  return scan;
}

function collectOkxEnrichment() {
  const result = runOnchainJson({
    name: "OKX OnchainOS enrichment",
    args: ["signal", "list", "--chain", "solana", "--limit", "3"],
    timeoutMs: 5_000,
  });
  return {
    available: result.ok,
    sourceHealth: [okxSourceHealth(result)],
  };
}

function okxSourceHealth(result: OnchainJsonResult): ScannerSourceHealth {
  if (result.ok) {
    return {
      name: "OKX OnchainOS enrichment",
      ok: true,
      command: result.command,
    };
  }
  return {
    name: "OKX OnchainOS enrichment",
    ok: false,
    command: result.command,
    error: shortOkxReason(result.error),
    detail: result.error.slice(0, 600),
  };
}

function addOkxEvidence(opportunities: Opportunity[]) {
  return opportunities.map((opportunity, index) => {
    if (index >= 6) return opportunity;
    return {
      ...opportunity,
      source: `${opportunity.source} + OKX enrichment`,
      evidence: [
        ...opportunity.evidence,
        {
          source: "OKX OnchainOS enrichment",
          skill: "okx-dex-signal",
          summary: "OKX OnchainOS enrichment responded; public/free providers remain the primary Radar source.",
          timestamp: new Date().toISOString(),
        },
      ],
    };
  });
}

function applyScannerPolicy(opportunity: Opportunity, policy: BlackBoxPolicy): Opportunity {
  const amountUsd = Math.min(policy.realFundsCapUsd || DEFAULT_OPPORTUNITY_ORDER_USD, DEFAULT_OPPORTUNITY_ORDER_USD);
  const slippageBps = opportunity.status === "ready" ? Math.min(100, policy.maxSlippageBps) : 250;
  const policyVerdict = evaluateScannerPolicyVerdict({
    policy,
    chain: opportunity.chain,
    riskVerdict: opportunity.risk.verdict,
    riskReason: opportunity.risk.reasons.join("; "),
    quoteRequired: false,
    hasExecutableQuote: true,
    allocation: {
      sizeUsd: amountUsd,
      bookValueUsd: DEFAULT_OPPORTUNITY_BOOK_VALUE_USD,
    },
    route: {
      chain: opportunity.chain,
      slippageBps,
    },
  });
  const blocked = opportunity.risk.verdict === "block";
  const status = blocked ? "blocked" : policyVerdict.allowed && opportunity.status === "ready" ? "ready" : "watch";
  const score = status === "blocked" ? Math.min(opportunity.score, 25) : status === "watch" ? Math.min(opportunity.score, 60) : opportunity.score;
  const policyRiskReason = !policyVerdict.allowed && opportunity.risk.verdict === "allow" ? policyVerdict.reasons[0] : undefined;
  const risk =
    status === "watch" && policyRiskReason
      ? { level: "medium" as const, verdict: "review" as const, reasons: [...opportunity.risk.reasons, policyRiskReason] }
      : opportunity.risk;
  return {
    ...opportunity,
    status,
    score,
    confidence: Math.min(opportunity.confidence, score),
    risk,
    action: status === "ready" ? "quote-buy" : "watch",
    actionLabel: status === "ready" ? `Prepare quote for ${opportunity.symbol}` : `Watch ${opportunity.symbol}`,
    policy: policyVerdict,
    proposedOrder: {
      ...opportunity.proposedOrder,
      mode: status === "ready" ? "quote-only" : "watch-only",
      amountUsd,
      slippageBps,
      quoteStatus: "not-quoted",
      route: status === "ready" ? `${opportunity.proposedOrder.fromAsset} -> ${opportunity.symbol} (OKX quote pending)` : undefined,
    },
  };
}

export function evaluateScannerPolicyVerdict(input: ScannerPolicyVerdictInput): OpportunityPolicyVerdict {
  const result = evaluatePolicy({
    policy: input.policy,
    chain: input.chain,
    riskVerdict: input.riskVerdict,
    riskReason: input.riskReason,
    quoteRequired: input.quoteRequired,
    hasExecutableQuote: input.hasExecutableQuote,
    allocation: input.allocation,
    route: input.route,
  });
  return {
    allowed: result.allowed,
    reasons: result.reasons,
  };
}

export function fallbackOpportunities(policy: BlackBoxPolicy): Opportunity[] {
  const readyPolicy = evaluateScannerPolicyVerdict({
    policy,
    chain: "X Layer",
    riskVerdict: "allow",
    quoteRequired: true,
    hasExecutableQuote: true,
    allocation: {
      sizeUsd: DEFAULT_OPPORTUNITY_ORDER_USD,
      bookValueUsd: DEFAULT_OPPORTUNITY_BOOK_VALUE_USD,
    },
    route: {
      chain: "X Layer",
      slippageBps: 42,
    },
  });
  const blockedPolicy = evaluateScannerPolicyVerdict({
    policy,
    chain: "Solana",
    riskVerdict: "block",
    riskReason: "fixture blocked: holder concentration and no quote",
    quoteRequired: true,
    hasExecutableQuote: false,
    allocation: {
      sizeUsd: DEFAULT_OPPORTUNITY_ORDER_USD,
      bookValueUsd: DEFAULT_OPPORTUNITY_BOOK_VALUE_USD,
    },
    route: {
      chain: "Solana",
      slippageBps: 250,
    },
  });
  return [
    {
      id: "fixture:xlayer:clean",
      ticketId: "opp_fixture_clean",
      status: readyPolicy.allowed ? "ready" : "watch",
      action: "quote-buy",
      actionLabel: "Quote buy $25 CLEAN",
      symbol: "CLEAN",
      name: "Clean Route",
      chain: "X Layer",
      chainIndex: "196",
      tokenAddress: "fixture-clean-xlayer",
      source: "fixture fallback",
      thesis: "Fixture fallback: clean X Layer route with OKX-style security, quote, and gateway simulation evidence.",
      invalidation: "Invalidate if live scanner returns risk flags, quote slippage rises, or trace verification fails.",
      confidence: 72,
      score: 72,
      freshness: "fixture",
      metrics: {
        signalAmountUsd: 320,
        triggerWalletCount: 3,
        marketCapUsd: 108_986,
        liquidityUsd: 54_000,
        volumeUsd: 18_000,
        holders: 513,
        priceImpactPercent: 0.42,
        priceChangePct: 2.4,
      },
      risk: { level: "low", verdict: "allow", reasons: ["fixture fallback has no blocking risk"] },
      policy: { allowed: readyPolicy.allowed, reasons: readyPolicy.allowed ? ["all fixture policy gates pass"] : readyPolicy.reasons },
      proposedOrder: {
        mode: "market-swap-capped",
        fromAsset: "USDC",
        toAsset: "CLEAN",
        amountUsd: 25,
        slippageBps: 42,
        quoteStatus: "quoted",
        quoteFreshenedAt: new Date().toISOString(),
        route: "USDC -> CLEAN",
      },
      evidence: [
        { source: "fixture", skill: "okx-dex-signal", summary: "Fallback smart-money signal used because live scanner returned no data." },
        { source: "fixture", skill: "okx-security", summary: "Fixture security check clears token and route for demo ceremony." },
        { source: "fixture", skill: "okx-onchain-gateway", summary: "Fixture gateway simulation binds a quote hash before signing." },
      ],
      category: "demo",
    },
    {
      id: "fixture:solana:rugcat",
      ticketId: "opp_fixture_rugcat",
      status: "blocked",
      action: "watch",
      actionLabel: "Watch RUGCAT",
      symbol: "RUGCAT",
      name: "Rug Cat",
      chain: "Solana",
      chainIndex: "501",
      tokenAddress: "fixture-rugcat-solana",
      source: "fixture fallback",
      thesis: "Fixture fallback: suspicious launch pattern intentionally demonstrates a blocked ticket.",
      invalidation: "Do not execute until holder concentration, quote status, and risk evidence clear.",
      confidence: 88,
      score: 18,
      freshness: "fixture",
      metrics: {
        signalAmountUsd: 120,
        triggerWalletCount: 2,
        marketCapUsd: 42_000,
        holders: 8,
        top10HolderPercent: 72,
        priceImpactPercent: 12,
        liquidityUsd: 1_200,
        volumeUsd: 400,
        priceChangePct: -48,
      },
      risk: { level: "blocked", verdict: "block", reasons: ["top-10 holder concentration 72%", "only 8 holders", "no executable quote"] },
      policy: { allowed: false, reasons: blockedPolicy.reasons.length ? blockedPolicy.reasons : ["fixture blocked by risk policy"] },
      proposedOrder: {
        mode: "watch-only",
        fromAsset: "USDC",
        toAsset: "RUGCAT",
        amountUsd: 25,
        slippageBps: 250,
        quoteStatus: "unavailable",
      },
      evidence: [
        { source: "fixture", skill: "okx-dex-trenches", summary: "Fallback launchpad evidence shows concentrated holders." },
        { source: "fixture", skill: "okx-security", summary: "Fixture security check blocks the ticket before allocation." },
      ],
      category: "demo",
    },
  ];
}

function writeScanArtifacts(scan: OpportunityScan, dataDir: string) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "opportunities.json"), `${JSON.stringify(scan, null, 2)}\n`);
  fs.mkdirSync("docs/evidence", { recursive: true });
  fs.writeFileSync("docs/evidence/opportunity-scan.md", renderScanMarkdown(scan));
}

function renderScanMarkdown(scan: OpportunityScan) {
  return `# Opportunity Scan Evidence

Generated at: ${scan.generatedAt}
Mode: ${scan.mode}
Source mode: ${scan.sourceMode}

## Source Health

${scan.sourceHealth.map((source) => `- ${source.ok ? "PASS" : "FAIL"} ${source.name}: \`${source.command}\`${source.cached ? " (cache)" : ""}${source.error ? ` - ${source.error}` : ""}`).join("\n")}

## Top Opportunities

${scan.opportunities
  .map(
    (opportunity, index) => `### ${index + 1}. ${opportunity.symbol} on ${opportunity.chain}

- Status: ${opportunity.status}
- Action: ${opportunity.actionLabel}
- Score: ${opportunity.score}/100
- Liquidity: ${opportunity.metrics.liquidityUsd ?? "n/a"}
- Volume: ${opportunity.metrics.volumeUsd ?? "n/a"}
- 24h Change: ${opportunity.metrics.priceChangePct ?? "n/a"}
- Risk: ${opportunity.risk.level} (${opportunity.risk.reasons.join("; ")})
- Thesis: ${opportunity.thesis}
- Address: \`${opportunity.tokenAddress}\`
`,
  )
  .join("\n")}

## Candidate Clusters

${scan.clusters
  .map(
    (cluster, index) => `### ${index + 1}. ${cluster.symbol} on ${cluster.chain}

- Status: ${cluster.status}
- Score: ${cluster.score}/100
- Pools: ${cluster.pool_count}
- Contracts: ${cluster.contract_count}
- Primary address: \`${cluster.primary_address}\`
- Source mode hint: ${cluster.sourceMode_hint ?? scan.sourceMode}
- Risk: ${cluster.risk.level} (${cluster.risk.reasons.join("; ")})
`,
  )
  .join("\n")}
`;
}

function shortOkxReason(message: string) {
  if (/quota|MARKET_API_OLD_USER_POST_GRACE_OVER_QUOTA|payment/i.test(message)) {
    return "payment/grace quota gate";
  }
  if (/ENOENT|not found|spawn/i.test(message)) {
    return "onchainos CLI unavailable";
  }
  if (/timeout/i.test(message)) {
    return "onchainos enrichment timed out";
  }
  return message.replace(/\s+/g, " ").slice(0, 180) || "OKX enrichment unavailable";
}
