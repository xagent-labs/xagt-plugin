import { z } from "zod";
import type { SkillDefinition } from "@/types/agent";
import { chainData } from "@/lib/data";

const inputSchema = z.object({
  minApy: z.number().default(3),
  maxRiskScore: z.number().default(70),
  chainId: z.number().optional(),
  limit: z.number().default(10),
});

const outputSchema = z.object({
  opportunities: z.array(
    z.object({
      id: z.string(),
      protocol: z.string(),
      pool: z.string(),
      chain: z.string(),
      asset: z.string(),
      apy: z.number(),
      tvlUsd: z.number(),
      riskScore: z.number(),
      audited: z.boolean(),
      yieldRank: z.number(),
    })
  ),
  bestOpportunity: z.object({
    protocol: z.string(),
    apy: z.number(),
    riskAdjustedApy: z.number(),
  }).nullable(),
});

export const yieldFinderSkill: SkillDefinition = {
  meta: {
    id: "yield-finder",
    name: "Yield Finder",
    description: "Discovers and ranks high-yield DeFi pools with risk-adjusted scoring",
    category: "yield",
    mcpCompatible: true,
  },
  inputSchema,
  outputSchema,
  async execute(raw) {
    const input = inputSchema.parse(raw);
    const rows = await chainData.getYieldOpportunities(
      input.minApy,
      input.maxRiskScore,
      input.chainId
    );

    const opportunities = rows.slice(0, input.limit).map((r, i) => ({
      id: r.id,
      protocol: r.protocol,
      pool: r.pool,
      chain: r.chain,
      asset: r.asset,
      apy: r.apy,
      tvlUsd: r.tvlUsd,
      riskScore: r.riskScore,
      audited: r.audited,
      yieldRank: i + 1,
    }));

    const top = opportunities[0];
    const bestOpportunity = top
      ? {
          protocol: top.protocol,
          apy: top.apy,
          riskAdjustedApy: top.apy * (1 - top.riskScore / 200),
        }
      : null;

    return { opportunities, bestOpportunity };
  },
};
