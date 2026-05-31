import test from "node:test";
import assert from "node:assert/strict";
import type { CandidateCluster, Opportunity } from "../src/types.js";
import { buildClusteredScan } from "../src/scanners/index.js";
import { clusterOpportunities, readyGate, selectDefaultClusters } from "../src/scanners/cluster.js";
import { makeOpportunity } from "../src/scanners/shared.js";

test("NOT ACTIONABLE risk reasoning blocks the cluster and caps score", () => {
  const opportunity = {
    ...baseOpportunity("NACT", "0xnact"),
    status: "blocked" as const,
    risk: { level: "blocked" as const, verdict: "block" as const, reasons: ["NOT ACTIONABLE reasoning"] },
    policy: { allowed: false, reasons: ["NOT ACTIONABLE reasoning"] },
    score: 99,
  };

  const cluster = clusterOpportunities([opportunity], "live-scout")[0]!;
  const gate = readyGate(cluster, { sourceMode: "live-scout" });

  assert.equal(gate.ready, false);
  assert.equal(gate.reasons.includes("NOT ACTIONABLE reasoning"), true);
  assert.equal(cluster.status, "blocked");
  assert.equal(cluster.score <= 25, true);
});

test("not-quoted cluster is never ready and is capped at watch score", () => {
  const opportunity = withOkxEvidence({
    ...baseOpportunity("NOQUOTE", "0xnoquote"),
    proposedOrder: {
      mode: "quote-only" as const,
      fromAsset: "USDC",
      toAsset: "NOQUOTE",
      amountUsd: 25,
      slippageBps: 100,
      quoteStatus: "not-quoted" as const,
    },
  });

  const cluster = clusterOpportunities([opportunity], "live-scout")[0]!;

  assert.equal(cluster.status, "watch");
  assert.equal(cluster.score <= 60, true);
  assert.equal(cluster.notReadyReasons.some((reason) => /quote status is not-quoted/.test(reason)), true);
  assert.equal(cluster.risk.level, "medium");
  assert.equal(cluster.risk.verdict, "review");
});

test("scout-only cluster does not keep low risk display", () => {
  const opportunity = baseOpportunity("SCOUTONLY", "0xscoutonly");

  const cluster = clusterOpportunities([opportunity], "live-scout")[0]!;

  assert.equal(cluster.status, "watch");
  assert.equal(cluster.score, 60);
  assert.equal(cluster.risk.level, "medium");
  assert.equal(cluster.risk.verdict, "review");
  assert.equal(cluster.risk.reasons.includes("missing OKX or wallet evidence"), true);
  assert.equal(cluster.risk.reasons.some((reason) => /quote status is not-quoted/.test(reason)), true);
});

test("NOT ACTIONABLE reasoning forces blocked risk display even from low-risk source rows", () => {
  const opportunity = withOkxEvidence({
    ...baseOpportunity("NACTLOW", "0xnactlow"),
    proposedOrder: {
      mode: "quote-only" as const,
      fromAsset: "USDC",
      toAsset: "NACTLOW",
      amountUsd: 25,
      slippageBps: 100,
      quoteStatus: "quoted" as const,
      quoteFreshenedAt: new Date().toISOString(),
      route: "USDC -> NACTLOW",
    },
  });

  const cluster = clusterOpportunities([opportunity], "live-scout", { reasoningText: "NOT ACTIONABLE: stale and manipulative flow" })[0]!;

  assert.equal(cluster.status, "blocked");
  assert.equal(cluster.score <= 25, true);
  assert.equal(cluster.risk.level, "blocked");
  assert.equal(cluster.risk.verdict, "block");
  assert.equal(cluster.risk.reasons.includes("NOT ACTIONABLE reasoning"), true);
});

test("stale quoted cluster downgrades to watch", () => {
  const oldQuote = new Date(Date.now() - 120_000).toISOString();
  const opportunity = quotedOpportunity("STALE", "0xstale", oldQuote);

  const cluster = clusterOpportunities([opportunity], "live-scout", { maxQuoteAgeSeconds: 60 })[0]!;

  assert.equal(cluster.status, "watch");
  assert.equal(cluster.score <= 60, true);
  assert.equal(cluster.notReadyReasons.includes("stale quote"), true);
});

test("fresh quoted cluster with OKX evidence can be ready", () => {
  const opportunity = quotedOpportunity("FRESH", "0xfresh", new Date().toISOString());

  const cluster = clusterOpportunities([opportunity], "live-scout", { maxQuoteAgeSeconds: 60 })[0]!;
  const gate = readyGate(cluster, { sourceMode: "live-scout", maxQuoteAgeSeconds: 60 });

  assert.equal(cluster.status, "ready");
  assert.equal(gate.ready, true);
  assert.deepEqual(cluster.notReadyReasons, []);
});

test("missing OKX or wallet evidence prevents ready even with a fresh quote", () => {
  const opportunity = {
    ...quotedOpportunity("NOEVID", "0xnoevid", new Date().toISOString()),
    evidence: [{ source: "DexScreener", skill: "dexscreener-boosts", summary: "public scout" }],
  };

  const cluster = clusterOpportunities([opportunity], "live-scout")[0]!;

  assert.equal(cluster.status, "watch");
  assert.equal(cluster.notReadyReasons.includes("missing OKX or wallet evidence"), true);
});

test("default radar ready clusters satisfy readyGate", () => {
  const scan = buildClusteredScan(
    "live",
    [
      quotedOpportunity("READYX", "0xreadyx", new Date().toISOString()),
      baseOpportunity("WATCHX", "0xwatchx"),
    ],
    [{ name: "DexScreener", ok: true, command: "fixture" }],
    "live-scout",
    60,
  );
  const defaults = scan.clusters.filter((cluster) => scan.defaultClusterIds.includes(cluster.cluster_id));

  for (const cluster of defaults) {
    if (cluster.status === "ready") {
      assert.equal(readyGate(cluster, scan).ready, true, `${cluster.symbol} should pass readyGate`);
    }
  }
});

test("cross-chain default dedupe keeps one SPCX and records sibling", () => {
  const clusters = [
    directCluster("SPCX", "Ethereum", "0xethspcx", 90),
    directCluster("SPCX", "Solana", "solspcx", 80),
    directCluster("OTHER", "Base", "0xother", 70),
  ];

  const defaults = selectDefaultClusters(clusters, "live-scout");
  const spcx = defaults.filter((cluster) => cluster.symbol === "SPCX");

  assert.equal(spcx.length, 1);
  assert.equal(spcx[0]?.chain, "Ethereum");
  assert.equal(spcx[0]?.cross_chain_siblings?.length, 1);
  assert.equal(spcx[0]?.cross_chain_siblings?.[0]?.chain, "Solana");
});

test("default radar has no repeated symbols across chains", () => {
  const clusters = [
    directCluster("SPCX", "Ethereum", "0xethspcx", 90),
    directCluster("SPCX", "Solana", "solspcx", 80),
    directCluster("AWF", "Ethereum", "0xawf", 70),
    directCluster("AWF", "Base", "0xbaseawf", 68),
    directCluster("COAR", "Solana", "solcoar", 66),
  ];

  const defaults = selectDefaultClusters(clusters, "live-scout");
  const symbols = defaults.map((cluster) => cluster.symbol.toLowerCase());

  assert.equal(symbols.length, new Set(symbols).size);
});

function baseOpportunity(symbol: string, tokenAddress: string): Opportunity {
  return makeOpportunity({
    provider: "test-scout",
    evidenceSkill: "dexscreener-boosts",
    tokenAddress,
    chain: tokenAddress.startsWith("sol") ? "Solana" : "Ethereum",
    chainIndex: tokenAddress.startsWith("sol") ? "501" : "1",
    symbol,
    metrics: {
      priceUsd: 0.01,
      liquidityUsd: 120_000,
      volumeUsd: 640_000,
      priceChangePct: 44,
      buyTxCount1h: 90,
      sellTxCount1h: 64,
    },
    signal: { boosted: true, trending: true, freshnessMinutes: 20 },
    evidenceSummary: "test scout candidate",
  });
}

function quotedOpportunity(symbol: string, tokenAddress: string, quoteFreshenedAt: string): Opportunity {
  return withOkxEvidence({
    ...baseOpportunity(symbol, tokenAddress),
    proposedOrder: {
      mode: "quote-only",
      fromAsset: "USDC",
      toAsset: symbol,
      amountUsd: 25,
      slippageBps: 100,
      quoteStatus: "quoted",
      quoteFreshenedAt,
      route: `USDC -> ${symbol}`,
    },
  });
}

function withOkxEvidence(opportunity: Opportunity): Opportunity {
  return {
    ...opportunity,
    evidence: [
      ...opportunity.evidence,
      { source: "OKX OnchainOS enrichment", skill: "okx-dex-signal", summary: "OKX quote/evidence available" },
    ],
  };
}

function directCluster(symbol: string, chain: string, address: string, score: number): CandidateCluster {
  return {
    cluster_id: `cluster:${chain.toLowerCase()}:${symbol.toLowerCase()}`,
    symbol,
    chain,
    primary_address: address,
    addresses: [address],
    pool_count: 1,
    contract_count: 1,
    aggregated_metrics: { liquidityUsd: score * 1_000, volumeUsd: score * 4_000 },
    top_evidence: [{ source: "OKX OnchainOS enrichment", skill: "okx-dex-signal", summary: "okx" }],
    risk: { level: "low", verdict: "allow", reasons: ["ok"] },
    policy: { allowed: true, reasons: ["ok"] },
    status: "ready",
    score,
    category: "trending",
    sourceMode_hint: "live-scout",
    member_ids: [`${chain}:${symbol}`],
    quoteStatus: "quoted",
    proposedOrder: {
      mode: "quote-only",
      fromAsset: "USDC",
      toAsset: symbol,
      amountUsd: 25,
      slippageBps: 100,
      quoteStatus: "quoted",
      quoteFreshenedAt: new Date().toISOString(),
    },
    notReadyReasons: [],
    actionLabel: `Prepare ticket`,
  };
}
