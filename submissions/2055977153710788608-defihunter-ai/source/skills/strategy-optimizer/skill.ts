import { z } from "zod";
import type { SkillDefinition } from "@/types/agent";
import { chainData } from "@/lib/data";

const inputSchema = z.object({
  capitalUsd: z.number().positive(),
  riskTolerance: z.enum(["conservative", "balanced", "aggressive"]),
  preferredChains: z.array(z.number()).optional(),
});

const outputSchema = z.object({
  strategy: z.object({
    name: z.string(),
    expectedApy: z.number(),
    blendedRisk: z.number(),
    allocation: z.array(
      z.object({
        protocol: z.string(),
        pool: z.string(),
        weightPct: z.number(),
        amountUsd: z.number(),
        apy: z.number(),
      })
    ),
  }),
  executionSteps: z.array(z.string()),
});

export const strategyOptimizerSkill: SkillDefinition = {
  meta: {
    id: "strategy-optimizer",
    name: "Strategy Optimizer",
    description: "Builds capital allocation across yield pools based on risk profile",
    category: "strategy",
    mcpCompatible: true,
  },
  inputSchema,
  outputSchema,
  async execute(raw) {
    const input = inputSchema.parse(raw);
    const maxRisk =
      input.riskTolerance === "conservative"
        ? 35
        : input.riskTolerance === "balanced"
          ? 55
          : 80;

    let pools = await chainData.getYieldOpportunities(2, maxRisk);
    if (input.preferredChains?.length) {
      pools = pools.filter((p) => input.preferredChains!.includes(p.chainId));
    }
    pools = pools.slice(0, 3);

    const weights =
      input.riskTolerance === "conservative"
        ? [0.5, 0.35, 0.15]
        : input.riskTolerance === "balanced"
          ? [0.4, 0.35, 0.25]
          : [0.25, 0.35, 0.4];

    const allocation = pools.map((p, i) => ({
      protocol: p.protocol,
      pool: p.pool,
      weightPct: (weights[i] ?? 0) * 100,
      amountUsd: input.capitalUsd * (weights[i] ?? 0),
      apy: p.apy,
    }));

    const expectedApy =
      allocation.reduce((s, a) => s + a.apy * (a.weightPct / 100), 0) || 0;
    const blendedRisk =
      pools.reduce((s, p, i) => s + p.riskScore * (weights[i] ?? 0), 0) || 0;

    return {
      strategy: {
        name: `${input.riskTolerance} yield stack`,
        expectedApy,
        blendedRisk,
        allocation,
      },
      executionSteps: [
        "Approve underlying assets for target vaults",
        ...allocation.map(
          (a) => `Deposit $${a.amountUsd.toFixed(0)} into ${a.protocol} — ${a.pool}`
        ),
        "Enable position monitoring via DeFiHunter alerts",
      ],
    };
  },
};
