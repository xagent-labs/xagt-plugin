import { z } from "zod";
import type { SkillDefinition } from "@/types/agent";
import { fetchGasSnapshot } from "@/lib/data/providers/gas";
import { fetchSpotPrice } from "@/lib/data/providers/coingecko";

const inputSchema = z.object({
  chainIds: z.array(z.number()).default([1, 42161, 8453]),
});

const outputSchema = z.object({
  snapshots: z.array(
    z.object({
      chainId: z.number(),
      chainName: z.string(),
      slowGwei: z.number(),
      standardGwei: z.number(),
      fastGwei: z.number(),
      estimatedTransferUsd: z.number(),
      congestion: z.enum(["low", "medium", "high"]),
      source: z.string(),
    })
  ),
  recommendation: z.string(),
  cheapestChain: z.string(),
});

export const gasTrackerSkill: SkillDefinition = {
  meta: {
    id: "gas-tracker",
    name: "Gas Tracker",
    description: "Tracks gas prices across chains and recommends cheapest execution window",
    category: "gas",
    mcpCompatible: true,
  },
  inputSchema,
  outputSchema,
  async execute(raw) {
    const input = inputSchema.parse(raw);
    const ethPrice = await fetchSpotPrice("ETH").catch(() => 3400);

    const snapshots = await Promise.all(
      input.chainIds.map((id) => fetchGasSnapshot(id, ethPrice))
    );

    const cheapest = [...snapshots].sort(
      (a, b) => a.estimatedTransferUsd - b.estimatedTransferUsd
    )[0];

    const highCongestion = snapshots.filter((s) => s.congestion === "high");
    let recommendation = `Lowest transfer cost on ${cheapest.chainName} (~$${cheapest.estimatedTransferUsd}).`;
    if (highCongestion.length > 0) {
      recommendation += ` High congestion: ${highCongestion.map((s) => s.chainName).join(", ")}.`;
    }

    return {
      snapshots: snapshots.map(({ updatedAt: _, ...rest }) => rest),
      recommendation,
      cheapestChain: cheapest.chainName,
    };
  },
};
