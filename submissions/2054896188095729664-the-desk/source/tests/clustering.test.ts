import test from "node:test";
import assert from "node:assert/strict";
import type { CandidateCluster, Opportunity } from "../src/types.js";
import { clusterOpportunities, clusterTicketGate, selectDefaultClusters } from "../src/scanners/cluster.js";
import { classifySourceMode } from "../src/scanners/index.js";
import { makeOpportunity, type ScannerSourceHealth } from "../src/scanners/shared.js";

test("clustering collapses same symbol and chain across addresses", () => {
  const opportunities = [10_000, 50_000, 25_000, 12_000].map((liquidity, index) =>
    makeEmergingOpportunity({ symbol: "SPACEX", tokenAddress: `0xspace${index}`, liquidityUsd: liquidity, volumeUsd: liquidity * 4 }),
  );

  const clusters = clusterOpportunities(opportunities, "degraded-pool-fallback");

  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]?.pool_count, 4);
  assert.equal(clusters[0]?.addresses.length, 4);
  assert.equal(clusters[0]?.primary_address, "0xspace1");
});

test("cluster risk uses the most restrictive member status", () => {
  const blocked = {
    ...makeEmergingOpportunity({ symbol: "GDOR", tokenAddress: "0xblocked", liquidityUsd: 500, volumeUsd: 100_000 }),
    status: "blocked" as const,
    risk: { level: "blocked" as const, verdict: "block" as const, reasons: ["missing or near-zero liquidity"] },
    policy: { allowed: false, reasons: ["missing or near-zero liquidity"] },
    score: 25,
  };
  const watch = [0, 1, 2].map((index) => ({
    ...makeEmergingOpportunity({ symbol: "GDOR", tokenAddress: `0xwatch${index}`, liquidityUsd: 40_000 + index, volumeUsd: 80_000 + index }),
    status: "watch" as const,
    risk: { level: "medium" as const, verdict: "review" as const, reasons: ["one-sided tx flow"] },
    score: 60,
  }));

  const clusters = clusterOpportunities([blocked, ...watch], "degraded-pool-fallback");

  assert.equal(clusters[0]?.status, "blocked");
  assert.equal(clusters[0]?.risk.verdict, "block");
  assert.equal(clusters[0]?.score, 25);
});

test("default radar filter excludes blue chips and keeps emerging clusters", () => {
  const opportunities = [
    makeEmergingOpportunity({ symbol: "USDC", tokenAddress: "0xusdc", categoryHint: "blue-chip" }),
    makeEmergingOpportunity({ symbol: "WETH", tokenAddress: "0xweth", categoryHint: "blue-chip" }),
    ...["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO"].map((symbol, index) =>
      makeEmergingOpportunity({ symbol, tokenAddress: `0x${symbol.toLowerCase()}`, liquidityUsd: 50_000 + index, volumeUsd: 250_000 + index }),
    ),
  ];

  const defaults = selectDefaultClusters(clusterOpportunities(opportunities, "live-scout"), "live-scout");

  assert.deepEqual(defaults.map((cluster) => cluster.symbol).sort(), ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO"]);
});

test("default radar filter has no duplicate symbol-chain clusters", () => {
  const base = clusterOpportunities([makeEmergingOpportunity({ symbol: "DUP", tokenAddress: "0xdup-a" })], "live-scout")[0]!;
  const duplicate: CandidateCluster = { ...base, cluster_id: "cluster:base:dup-b", primary_address: "0xdup-b", score: base.score - 3 };
  const other = clusterOpportunities([makeEmergingOpportunity({ symbol: "OTHER", tokenAddress: "0xother" })], "live-scout")[0]!;

  const defaults = selectDefaultClusters([base, duplicate, other], "live-scout");
  const keys = defaults.map((cluster) => `${cluster.chain}:${cluster.symbol}`.toLowerCase());

  assert.equal(keys.length, new Set(keys).size);
  assert.equal(defaults.filter((cluster) => cluster.symbol === "DUP").length, 1);
});

test("source mode classifier distinguishes OKX, live scout, degraded pool, and demo snapshot", () => {
  const health = (name: string, ok: boolean): ScannerSourceHealth => ({ name, ok, command: name, error: ok ? undefined : "down" });

  assert.equal(classifySourceMode([health("OKX OnchainOS enrichment", true)], [], true), "okx-scout");
  assert.equal(classifySourceMode([health("DexScreener", true), health("DexPaprika", true)]), "live-scout");
  assert.equal(classifySourceMode([health("DexScreener", false), health("GeckoTerminal", false), health("DexPaprika", true)]), "degraded-pool-fallback");
  assert.equal(classifySourceMode([health("DexScreener", false), health("GeckoTerminal", false), health("DexPaprika", false), health("OKX OnchainOS enrichment", false)]), "demo-snapshot");
});

test("degraded pool fallback clusters cannot enter prepare-ticket action gate", () => {
  const opportunity = {
    ...makeEmergingOpportunity({ symbol: "ALPHA", tokenAddress: "0xalpha", liquidityUsd: 100_000, volumeUsd: 600_000 }),
    proposedOrder: {
      mode: "quote-only" as const,
      fromAsset: "USDC",
      toAsset: "ALPHA",
      amountUsd: 25,
      slippageBps: 100,
      quoteStatus: "quoted" as const,
      route: "USDC -> ALPHA",
    },
    evidence: [
      { source: "OKX OnchainOS enrichment", skill: "okx-dex-signal", summary: "okx enrichment" },
      { source: "DexPaprika", skill: "dexpaprika-pools", summary: "pool" },
    ],
  };
  const cluster = clusterOpportunities([opportunity], "degraded-pool-fallback")[0];

  const gate = clusterTicketGate(cluster, "degraded-pool-fallback");

  assert.equal(gate.allowed, false);
  assert.match(gate.reasons.join("; "), /source mode degraded-pool-fallback is not executable/);
});

function makeEmergingOpportunity(input: {
  symbol: string;
  tokenAddress: string;
  liquidityUsd?: number;
  volumeUsd?: number;
  categoryHint?: Opportunity["category"];
}) {
  return makeOpportunity({
    provider: "test-provider",
    evidenceSkill: "test-provider",
    categoryHint: input.categoryHint ?? "trending",
    tokenAddress: input.tokenAddress,
    chain: "Base",
    chainIndex: "8453",
    symbol: input.symbol,
    metrics: {
      priceUsd: 0.01,
      liquidityUsd: input.liquidityUsd ?? 80_000,
      volumeUsd: input.volumeUsd ?? 420_000,
      priceChangePct: 28,
      buyTxCount1h: 60,
      sellTxCount1h: 42,
    },
    signal: { trending: true, freshnessMinutes: 60 },
    evidenceSummary: "test fixture",
  });
}
