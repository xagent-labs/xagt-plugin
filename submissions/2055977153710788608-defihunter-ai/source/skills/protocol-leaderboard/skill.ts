import { z } from "zod";
import type { SkillDefinition } from "@/types/agent";
import { fetchJson } from "@/lib/data/http";

const inputSchema = z.object({
  limit: z.number().min(1).max(30).default(10),
  category: z.string().optional(),
});

const outputSchema = z.object({
  leaders: z.array(
    z.object({
      rank: z.number(),
      name: z.string(),
      slug: z.string(),
      tvlUsd: z.number(),
      category: z.string().optional(),
      chains: z.array(z.string()),
    })
  ),
  totalTvlUsd: z.number(),
});

interface LlamaProtocol {
  name: string;
  slug: string;
  tvl: number;
  category?: string;
  chains?: string[];
}

export const protocolLeaderboardSkill: SkillDefinition = {
  meta: {
    id: "protocol-leaderboard",
    name: "Protocol Leaderboard",
    description: "Ranks top DeFi protocols by TVL from DeFiLlama",
    category: "leaderboard",
    mcpCompatible: true,
  },
  inputSchema,
  outputSchema,
  async execute(raw) {
    const input = inputSchema.parse(raw);
    const protocols = await fetchJson<LlamaProtocol[]>("https://api.llama.fi/protocols");

    let filtered = protocols.filter((p) => p.tvl > 0);
    if (input.category) {
      const cat = input.category.toLowerCase();
      filtered = filtered.filter((p) => p.category?.toLowerCase().includes(cat));
    }

    filtered.sort((a, b) => b.tvl - a.tvl);
    const top = filtered.slice(0, input.limit);
    const totalTvlUsd = top.reduce((s, p) => s + p.tvl, 0);

    return {
      leaders: top.map((p, i) => ({
        rank: i + 1,
        name: p.name,
        slug: p.slug,
        tvlUsd: p.tvl,
        category: p.category,
        chains: p.chains ?? [],
      })),
      totalTvlUsd,
    };
  },
};
