import { z } from "zod";
import type { SkillDefinition } from "@/types/agent";
import { chainData } from "@/lib/data";
import { hasWalletProvider } from "@/lib/data/providers/alchemy";

const inputSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().default(1),
  includeSmartMoneyComparison: z.boolean().default(true),
});

const outputSchema = z.object({
  dataSource: z.enum(["live", "mock"]),
  wallet: z.object({
    address: z.string(),
    chainId: z.number(),
    totalUsd: z.number(),
    balances: z.array(
      z.object({ symbol: z.string(), amount: z.number(), usdValue: z.number() })
    ),
    recentTxCount: z.number(),
  }),
  smartMoneySignals: z.array(
    z.object({
      label: z.string(),
      address: z.string(),
      overlapTokens: z.array(z.string()),
      pnl30dUsd: z.number(),
    })
  ),
  behaviorScore: z.number(),
  insights: z.array(z.string()),
});

export const walletAnalyzerSkill: SkillDefinition = {
  meta: {
    id: "wallet-analyzer",
    name: "Wallet Analyzer",
    description: "Analyzes wallet holdings and compares against smart money patterns",
    category: "wallet",
    mcpCompatible: true,
  },
  inputSchema,
  outputSchema,
  async execute(raw) {
    const input = inputSchema.parse(raw);
    const bal = await chainData.getWalletBalances(input.walletAddress, input.chainId);
    const totalUsd = bal.balances.reduce((s, b) => s + b.usdValue, 0);
    const symbols = new Set(bal.balances.map((b) => b.symbol));

    let smartMoneySignals: {
      label: string;
      address: string;
      overlapTokens: string[];
      pnl30dUsd: number;
    }[] = [];

    if (input.includeSmartMoneyComparison) {
      const whales = await chainData.getSmartMoneyWallets(5);
      smartMoneySignals = whales
        .map((w) => ({
          label: w.label,
          address: w.address,
          overlapTokens: w.topHoldings.filter((t) => symbols.has(t)),
          pnl30dUsd: w.pnl30dUsd,
        }))
        .filter((s) => s.overlapTokens.length > 0);
    }

    const overlapCount = smartMoneySignals.reduce((a, s) => a + s.overlapTokens.length, 0);
    const behaviorScore = Math.min(100, 40 + overlapCount * 15 + (bal.recentTxCount > 20 ? 20 : 10));

    const insights: string[] = [
      `Portfolio value: $${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      `Activity: ${bal.recentTxCount} txs tracked on chain ${input.chainId}`,
    ];
    if (smartMoneySignals.length > 0) {
      insights.push(
        `Smart money overlap with ${smartMoneySignals[0].label}: ${smartMoneySignals[0].overlapTokens.join(", ")}`
      );
    } else {
      insights.push("No significant smart-money token overlap detected");
    }

    const usingMock = !hasWalletProvider() || process.env.USE_MOCK_DATA === "true";

    return {
      dataSource: usingMock ? "mock" : "live",
      wallet: {
        address: bal.address,
        chainId: input.chainId,
        totalUsd,
        balances: bal.balances,
        recentTxCount: bal.recentTxCount,
      },
      smartMoneySignals,
      behaviorScore,
      insights,
    };
  },
};
