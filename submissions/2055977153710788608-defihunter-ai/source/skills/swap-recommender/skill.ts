import { z } from "zod";
import type { SkillDefinition } from "@/types/agent";
import { chainData } from "@/lib/data";

const inputSchema = z.object({
  fromToken: z.string(),
  toToken: z.string(),
  amountIn: z.number().positive(),
  maxSlippagePct: z.number().default(0.5),
  chainId: z.number().default(1),
  walletAddress: z.string().optional(),
});

const outputSchema = z.object({
  quote: z.object({
    from: z.string(),
    to: z.string(),
    amountIn: z.number(),
    amountOut: z.number(),
    priceImpactPct: z.number(),
    route: z.array(z.string()),
    gasUsd: z.number(),
  }),
  recommendation: z.enum(["execute", "wait", "avoid"]),
  reasoning: z.string(),
});

export const swapRecommenderSkill: SkillDefinition = {
  meta: {
    id: "swap-recommender",
    name: "Swap Recommender",
    description: "Recommends optimal swap routes with slippage and impact analysis",
    category: "swap",
    mcpCompatible: true,
  },
  inputSchema,
  outputSchema,
  async execute(raw) {
    const input = inputSchema.parse(raw);
    const quote = await chainData.getSwapQuote(
      input.fromToken,
      input.toToken,
      input.amountIn,
      input.chainId
    );

    let recommendation: "execute" | "wait" | "avoid" = "execute";
    let reasoning = `Route ${quote.route.join(" → ")} with ${quote.priceImpactPct}% impact`;

    if (quote.priceImpactPct > input.maxSlippagePct) {
      recommendation = "wait";
      reasoning = `Price impact ${quote.priceImpactPct}% exceeds max slippage ${input.maxSlippagePct}%`;
    }
    if (quote.priceImpactPct > 1) {
      recommendation = "avoid";
      reasoning = "Impact too high for size — consider splitting orders";
    }

    return { quote, recommendation, reasoning };
  },
};
