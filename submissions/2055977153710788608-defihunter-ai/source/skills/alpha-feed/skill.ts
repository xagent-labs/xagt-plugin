import { z } from "zod";
import type { SkillDefinition } from "@/types/agent";
import { fetchNarrativesFromTrending } from "@/lib/data/providers/coingecko";
import { getDataSourceStatus } from "@/lib/data";

const inputSchema = z.object({
  minStrength: z.number().min(0).max(100).default(45),
  limit: z.number().min(1).max(15).default(8),
});

const outputSchema = z.object({
  dataSource: z.enum(["live", "mock"]),
  feed: z.array(
    z.object({
      id: z.string(),
      narrative: z.string(),
      strength: z.number(),
      momentum: z.enum(["rising", "stable", "cooling"]),
      tokens: z.array(z.string()),
      score: z.number(),
    })
  ),
  headline: z.string(),
});

export const alphaFeedSkill: SkillDefinition = {
  meta: {
    id: "alpha_feed",
    name: "Alpha Feed",
    description: "Aggregates trending narratives and tokens into an alpha signal feed",
    category: "narrative",
    mcpCompatible: true,
  },
  inputSchema,
  outputSchema,
  async execute(raw) {
    const input = inputSchema.parse(raw);
    const live = getDataSourceStatus().liveEnabled;
    const narratives = await fetchNarrativesFromTrending();
    const feed = narratives
      .filter((n) => n.strength >= input.minStrength)
      .slice(0, input.limit)
      .map((n) => ({
        id: n.id,
        narrative: n.name,
        strength: n.strength,
        momentum: n.momentum,
        tokens: n.relatedTokens,
        score: Math.round(n.strength * (n.momentum === "rising" ? 1.1 : 1)),
      }));

    return {
      dataSource: live ? "live" : "mock",
      feed,
      headline: feed[0] ? `Alpha: ${feed[0].narrative}` : "No dominant alpha signal",
    };
  },
};
