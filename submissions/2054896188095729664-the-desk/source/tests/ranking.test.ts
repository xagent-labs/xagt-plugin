import test from "node:test";
import assert from "node:assert/strict";
import { clearScannerCache, composeOpportunityScan } from "../src/scanners/index.js";
import { makeOpportunity, type ProviderScanResult } from "../src/scanners/shared.js";

test("known stables, wrapped assets, and majors are excluded from the default emerging category", () => {
  for (const symbol of ["USDC", "WETH", "cbBTC"]) {
    const opportunity = makeOpportunity({
      provider: "test",
      tokenAddress: `0x${symbol.toLowerCase()}`,
      chain: "Base",
      symbol,
      metrics: { priceUsd: 1, liquidityUsd: 2_000_000, volumeUsd: 5_000_000, buyTxCount1h: 100, sellTxCount1h: 80, priceChangePct: 4 },
      evidenceSummary: "unit",
    });

    assert.equal(opportunity.category, "blue-chip");
    assert.ok(opportunity.score < 80);
  }
});

test("100x volume-to-liquidity ratio blocks a row", () => {
  const opportunity = makeOpportunity({
    provider: "test",
    tokenAddress: "0xratio",
    chain: "Solana",
    symbol: "RATIO",
    metrics: { priceUsd: 0.01, liquidityUsd: 10_000, volumeUsd: 1_000_000, buyTxCount1h: 60, sellTxCount1h: 40, priceChangePct: 12 },
    evidenceSummary: "unit",
  });

  assert.equal(opportunity.status, "blocked");
  assert.equal(opportunity.risk.verdict, "block");
  assert.ok(opportunity.risk.reasons.includes("extreme volume-to-liquidity ratio"));
});

test("99 percent buy flow is watch with a one-sided-flow reason", () => {
  const opportunity = makeOpportunity({
    provider: "test",
    tokenAddress: "0xflow",
    chain: "Solana",
    symbol: "FLOW",
    metrics: { priceUsd: 0.02, liquidityUsd: 75_000, volumeUsd: 220_000, buyTxCount1h: 99, sellTxCount1h: 1, priceChangePct: 18 },
    evidenceSummary: "unit",
  });

  assert.equal(opportunity.status, "watch");
  assert.match(opportunity.risk.reasons.join("; "), /one-sided tx flow \(99% buys \/ 1% sells\)/);
});

test("blocked and watch rows respect score caps", () => {
  const blocked = makeOpportunity({
    provider: "test",
    tokenAddress: "0xblocked",
    chain: "Base",
    symbol: "BLOCKED",
    metrics: { priceUsd: 0.1, liquidityUsd: 50_000, volumeUsd: 5_000_000, buyTxCount1h: 300, sellTxCount1h: 280, priceChangePct: 40 },
    signal: { boosted: true, boostUsd: 5_000, trending: true },
    evidenceSummary: "unit",
  });
  const watch = makeOpportunity({
    provider: "test",
    tokenAddress: "0xwatch",
    chain: "Base",
    symbol: "WATCH",
    metrics: { priceUsd: 0.1, liquidityUsd: 50_000, volumeUsd: 120_000, buyTxCount1h: 99, sellTxCount1h: 1, priceChangePct: 40 },
    signal: { boosted: true, boostUsd: 5_000, trending: true },
    evidenceSummary: "unit",
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.score <= 25);
  assert.equal(watch.status, "watch");
  assert.ok(watch.score <= 60);
});

test("composer keeps one row for duplicate token addresses", async () => {
  clearScannerCache();
  const scan = await composeOpportunityScan({
    providers: [
      { name: "left", fetchOpportunities: async () => duplicateProvider("left", 52) },
      { name: "right", fetchOpportunities: async () => duplicateProvider("right", 91) },
    ],
  });

  assert.equal(scan.opportunities.length, 1);
  assert.match(scan.opportunities[0]?.source ?? "", /right/);
  assert.equal(scan.opportunities[0]?.score, 91);
});

function duplicateProvider(source: string, score: number): ProviderScanResult {
  return {
    ok: true,
    mode: "live",
    opportunities: [
      {
        id: source,
        ticketId: `opp_${source}`,
        status: "ready",
        action: "quote-buy",
        actionLabel: "Prepare quote",
        symbol: "DUP",
        chain: "Base",
        chainIndex: "8453",
        tokenAddress: "0xdup",
        source,
        thesis: source,
        invalidation: "none",
        confidence: score,
        score,
        freshness: "unit",
        metrics: { priceUsd: 1, liquidityUsd: 50_000, volumeUsd: 150_000 },
        risk: { level: "low", verdict: "allow", reasons: ["ok"] },
        policy: { allowed: true, reasons: ["ok"] },
        proposedOrder: { mode: "quote-only", fromAsset: "USDC", toAsset: "DUP", amountUsd: 25, slippageBps: 100, quoteStatus: "not-quoted" },
        evidence: [{ source, skill: source, summary: source }],
        category: "new-launch",
      },
    ],
    sourceHealth: [{ name: source, ok: true, command: source }],
  };
}
