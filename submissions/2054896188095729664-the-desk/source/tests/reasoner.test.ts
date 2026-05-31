import { test } from "node:test";
import assert from "node:assert/strict";
import { generateReasoning, templateReasoning } from "../src/agents/reasoner.js";
import type { Opportunity } from "../src/types.js";

function sampleOpportunity(): Opportunity {
  return {
    id: "501:TEST",
    ticketId: "opp_test",
    status: "ready",
    action: "quote-buy",
    actionLabel: "Quote buy $25 TEST",
    symbol: "TEST",
    chain: "Solana",
    chainIndex: "501",
    tokenAddress: "TEST111111111111111111111111111111111111111",
    source: "smart-money signal, hot-token tape",
    thesis: "3 smart-money wallets, fresh hot-tape momentum.",
    invalidation: "Invalidate if liquidity drops below $50k.",
    confidence: 80,
    score: 84,
    freshness: "1h",
    metrics: {
      priceUsd: 0.001,
      marketCapUsd: 600000,
      liquidityUsd: 120000,
      volumeUsd: 230000,
      holders: 1432,
      top10HolderPercent: 17.7,
      triggerWalletCount: 3,
      signalAmountUsd: 473,
      priceChangePct: -19.7,
    },
    risk: { level: "medium", verdict: "review", reasons: ["holder concentration"] },
    policy: { allowed: true, reasons: [] },
    proposedOrder: {
      mode: "quote-only",
      fromAsset: "USDC",
      toAsset: "TEST",
      amountUsd: 25,
      slippageBps: 100,
      quoteStatus: "quoted",
    },
    evidence: [
      { source: "okx-dex-signal", skill: "okx-dex-signal", summary: "3 smart-money wallets triggered buy" },
      { source: "okx-security", skill: "okx-security", summary: "concentration warning, no honeypot" },
    ],
  };
}

test("templateReasoning produces deterministic non-empty text", () => {
  const text = templateReasoning(sampleOpportunity());
  assert.ok(text.length > 40);
  assert.match(text, /TEST/);
  assert.match(text, /okx-dex-signal/);
  assert.match(text, /Invalidation/);
});

test("generateReasoning degrades to template when no ANTHROPIC_API_KEY", async () => {
  const prior = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const result = await generateReasoning(sampleOpportunity());
    assert.equal(result.source, "template");
    assert.equal(result.degraded, true);
    assert.match(result.reason_for_degrade ?? "", /ANTHROPIC_API_KEY/);
    assert.ok(result.text.length > 0);
  } finally {
    if (prior !== undefined) process.env.ANTHROPIC_API_KEY = prior;
  }
});
