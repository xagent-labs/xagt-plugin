import { z } from "zod";
import type { SkillDefinition } from "@/types/agent";
import { chainData } from "@/lib/data";

const inputSchema = z.object({
  chainId: z.number().optional(),
  minVolume24hUsd: z.number().default(0),
});

const outputSchema = z.object({
  snapshots: z.array(
    z.object({
      chainId: z.number(),
      chainName: z.string(),
      blockHeight: z.number(),
      gasGwei: z.number(),
      totalTvlUsd: z.number(),
      volume24hUsd: z.number(),
      topTokens: z.array(
        z.object({
          symbol: z.string(),
          priceUsd: z.number(),
          change24hPct: z.number(),
          volume24hUsd: z.number(),
        })
      ),
    })
  ),
  marketSentiment: z.enum(["bullish", "neutral", "bearish"]),
  highlights: z.array(z.string()),
});

export const marketAnalyzerSkill: SkillDefinition = {
  meta: {
    id: "market-analyzer",
    name: "Market Analyzer",
    description: "Analyzes cross-chain market data, TVL, volume, and token momentum",
    category: "market",
    mcpCompatible: true,
  },
  inputSchema,
  outputSchema,
  async execute(raw) {
    const input = inputSchema.parse(raw);
    const snapshots = await chainData.getMarketSnapshot(input.chainId);
    const filtered = snapshots.map((s) => ({
      chainId: s.chainId,
      chainName: s.chainName,
      blockHeight: s.blockHeight,
      gasGwei: s.gasGwei,
      totalTvlUsd: s.totalTvlUsd,
      volume24hUsd: s.volume24hUsd,
      topTokens: s.topTokens
        .filter((t) => t.volume24hUsd >= input.minVolume24hUsd)
        .map((t) => ({
          symbol: t.symbol,
          priceUsd: t.priceUsd,
          change24hPct: t.change24hPct,
          volume24hUsd: t.volume24hUsd,
        })),
    }));

    const avgChange =
      filtered.flatMap((s) => s.topTokens).reduce((a, t) => a + t.change24hPct, 0) /
      Math.max(1, filtered.flatMap((s) => s.topTokens).length);

    const marketSentiment =
      avgChange > 2 ? "bullish" : avgChange < -1 ? "bearish" : "neutral";

    const highlights = filtered.map(
      (s) =>
        `${s.chainName}: TVL $${(s.totalTvlUsd / 1e9).toFixed(2)}B | Gas ${s.gasGwei} gwei`
    );

    return { snapshots: filtered, marketSentiment, highlights };
  },
};
