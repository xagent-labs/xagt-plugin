import { z } from "zod";
import type { SkillDefinition } from "@/types/agent";
import { fetchTopMarkets, fetchSpotPrice } from "@/lib/data/providers/coingecko";
import { getDataSourceStatus } from "@/lib/data";

const inputSchema = z.object({
  symbols: z.array(z.string()).min(1).max(10).default(["ETH", "BTC", "USDC"]),
});

const outputSchema = z.object({
  dataSource: z.enum(["live", "mock"]),
  prices: z.array(
    z.object({
      symbol: z.string(),
      priceUsd: z.number(),
      change24hPct: z.number(),
      volume24hUsd: z.number(),
    })
  ),
});

export const tokenPriceSkill: SkillDefinition = {
  meta: {
    id: "token_price",
    name: "Token Price",
    description: "Fetches spot prices and 24h change for specified tokens via CoinGecko",
    category: "market",
    mcpCompatible: true,
  },
  inputSchema,
  outputSchema,
  async execute(raw) {
    const input = inputSchema.parse(raw);
    const live = getDataSourceStatus().liveEnabled;
    const markets = await fetchTopMarkets(50);
    const bySymbol = new Map(markets.map((m) => [m.symbol.toUpperCase(), m]));

    const prices = await Promise.all(
      input.symbols.map(async (sym) => {
        const key = sym.toUpperCase();
        const row = bySymbol.get(key);
        if (row) {
          return {
            symbol: key,
            priceUsd: row.priceUsd,
            change24hPct: row.change24hPct,
            volume24hUsd: row.volume24hUsd,
          };
        }
        const spot = await fetchSpotPrice(key).catch(() => 0);
        return {
          symbol: key,
          priceUsd: spot,
          change24hPct: 0,
          volume24hUsd: 0,
        };
      })
    );

    return {
      dataSource: live ? "live" : "mock",
      prices: prices.filter((p) => p.priceUsd > 0),
    };
  },
};
