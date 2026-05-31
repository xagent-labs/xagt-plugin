import type { Opportunity } from "../types.js";
import { makeOpportunity } from "./shared.js";

export function demoSnapshotOpportunities(): Opportunity[] {
  return [
    makeSnapshot({
      chain: "Base",
      chainIndex: "8453",
      tokenAddress: "0x000000000000000000000000000000000000dead",
      symbol: "NOVA",
      name: "Nova Launch",
      metrics: {
        priceUsd: 0.0042,
        liquidityUsd: 184_000,
        volumeUsd: 1_420_000,
        priceChangePct: 86,
        buyTxCount1h: 382,
        sellTxCount1h: 211,
        holders: 913,
        freshness_minutes: 42,
      },
      summary: "Deterministic demo snapshot: boosted launch-style candidate with balanced two-sided flow.",
    }),
    makeSnapshot({
      chain: "Solana",
      chainIndex: "501",
      tokenAddress: "solana-demo-launch-0002-dead",
      symbol: "MINTX",
      name: "Mint X",
      metrics: {
        priceUsd: 0.00091,
        liquidityUsd: 72_000,
        volumeUsd: 392_000,
        priceChangePct: 41,
        buyTxCount1h: 221,
        sellTxCount1h: 148,
        holders: 626,
        freshness_minutes: 18,
      },
      summary: "Deterministic demo snapshot: fresh pool candidate with moderate liquidity and volume acceleration.",
    }),
    makeSnapshot({
      chain: "Ethereum",
      chainIndex: "1",
      tokenAddress: "0x000000000000000000000000000000000003dead",
      symbol: "PULSE",
      name: "Pulse Scout",
      metrics: {
        priceUsd: 0.018,
        liquidityUsd: 418_000,
        volumeUsd: 2_100_000,
        priceChangePct: 54,
        buyTxCount1h: 175,
        sellTxCount1h: 132,
        holders: 1_204,
        freshness_minutes: 130,
      },
      summary: "Deterministic demo snapshot: trending candidate with enough liquidity for investigation.",
    }),
    makeSnapshot({
      chain: "Base",
      chainIndex: "8453",
      tokenAddress: "0x000000000000000000000000000000000004dead",
      symbol: "QUILL",
      name: "Quill Market",
      metrics: {
        priceUsd: 0.0063,
        liquidityUsd: 39_500,
        volumeUsd: 171_000,
        priceChangePct: 24,
        buyTxCount1h: 92,
        sellTxCount1h: 67,
        holders: 372,
        freshness_minutes: 240,
      },
      summary: "Deterministic demo snapshot: lower-liquidity emerging token kept in watch mode.",
    }),
    makeSnapshot({
      chain: "Solana",
      chainIndex: "501",
      tokenAddress: "solana-demo-launch-0005-dead",
      symbol: "EMBER",
      name: "Ember Route",
      metrics: {
        priceUsd: 0.0017,
        liquidityUsd: 118_000,
        volumeUsd: 614_000,
        priceChangePct: 112,
        buyTxCount1h: 308,
        sellTxCount1h: 154,
        holders: 842,
        freshness_minutes: 95,
      },
      summary: "Deterministic demo snapshot: high-interest launch candidate for Scout Radar fallback.",
    }),
    makeSnapshot({
      chain: "Arbitrum",
      chainIndex: "42161",
      tokenAddress: "0x000000000000000000000000000000000006dead",
      symbol: "VAULTY",
      name: "Vaulty AI",
      metrics: {
        priceUsd: 0.031,
        liquidityUsd: 264_000,
        volumeUsd: 988_000,
        priceChangePct: 33,
        buyTxCount1h: 141,
        sellTxCount1h: 119,
        holders: 1_033,
        freshness_minutes: 360,
      },
      summary: "Deterministic demo snapshot: representative healthy emerging-token scout candidate.",
    }),
  ];
}

function makeSnapshot(input: {
  chain: string;
  chainIndex: string;
  tokenAddress: string;
  symbol: string;
  name: string;
  metrics: NonNullable<Parameters<typeof makeOpportunity>[0]["metrics"]>;
  summary: string;
}) {
  return makeOpportunity({
    provider: "deterministic-demo-snapshot",
    evidenceSkill: "deterministic-demo-snapshot",
    categoryHint: "demo",
    tokenAddress: input.tokenAddress,
    chain: input.chain,
    chainIndex: input.chainIndex,
    symbol: input.symbol,
    name: input.name,
    source: "deterministic demo snapshot",
    metrics: input.metrics,
    signal: { boosted: true, trending: true, newPool: true, freshnessMinutes: Number(input.metrics.freshness_minutes ?? 60) },
    evidenceSummary: input.summary,
    freshness: "demo snapshot",
  });
}
