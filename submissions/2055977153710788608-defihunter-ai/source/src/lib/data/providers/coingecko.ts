import { fetchJson } from "../http";
import type { NarrativeSignal, TokenMarketRow } from "../types";

const BASE = "https://api.coingecko.com/api/v3";

function cgHeaders(): HeadersInit {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { "x-cg-pro-api-key": key } : {};
}

interface CGMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  total_volume: number;
  market_cap: number;
}

interface CGTrending {
  coins: { item: { id: string; symbol: string; name: string; market_cap_rank: number } }[];
}

interface CGGlobal {
  data: {
    market_cap_change_percentage_24h_usd: number;
    total_market_cap: { usd: number };
    total_volume: { usd: number };
  };
}

const NARRATIVE_RULES: {
  id: string;
  name: string;
  keywords: string[];
  tokenSymbols: string[];
}[] = [
  {
    id: "ai-agents",
    name: "AI & Agents",
    keywords: ["ai", "agent", "virtual", "fetch", "render"],
    tokenSymbols: ["FET", "RENDER", "VIRTUAL", "TAO", "NEAR"],
  },
  {
    id: "restaking",
    name: "Liquid Restaking",
    keywords: ["restak", "eigen", "etherfi", "lido"],
    tokenSymbols: ["EIGEN", "ETH", "REZ", "ETHFI"],
  },
  {
    id: "rwa",
    name: "Real World Assets",
    keywords: ["ondo", "real", "treasury", "maple"],
    tokenSymbols: ["ONDO", "MPL", "CFG"],
  },
  {
    id: "meme",
    name: "Meme Momentum",
    keywords: ["doge", "pepe", "bonk", "wif", "meme"],
    tokenSymbols: ["DOGE", "PEPE", "BONK", "WIF"],
  },
  {
    id: "l2",
    name: "L2 Ecosystem",
    keywords: ["arbitrum", "optimism", "base", "stark"],
    tokenSymbols: ["ARB", "OP", "STRK", "MATIC"],
  },
  {
    id: "defi-bluechip",
    name: "DeFi Blue Chips",
    keywords: ["aave", "uniswap", "maker", "curve"],
    tokenSymbols: ["AAVE", "UNI", "MKR", "CRV"],
  },
];

export async function fetchTopMarkets(perPage = 15): Promise<TokenMarketRow[]> {
  const markets = await fetchJson<CGMarket[]>(
    `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&sparkline=false`,
    { headers: cgHeaders() }
  );

  return markets.map((m) => ({
    symbol: m.symbol.toUpperCase(),
    address: m.id,
    priceUsd: m.current_price ?? 0,
    change24hPct: m.price_change_percentage_24h ?? 0,
    volume24hUsd: m.total_volume ?? 0,
    marketCapUsd: m.market_cap ?? 0,
  }));
}

export async function fetchGlobalSentiment(): Promise<{
  change24h: number;
  totalVolume: number;
}> {
  const g = await fetchJson<CGGlobal>(`${BASE}/global`);
  return {
    change24h: g.data.market_cap_change_percentage_24h_usd ?? 0,
    totalVolume: g.data.total_volume?.usd ?? 0,
  };
}

export async function fetchSpotPrice(symbol: string): Promise<number> {
  const id = SYMBOL_TO_ID[symbol.toUpperCase()];
  if (!id) return 0;
  const data = await fetchJson<Record<string, { usd: number }>>(
    `${BASE}/simple/price?ids=${id}&vs_currencies=usd`
  );
  return data[id]?.usd ?? 0;
}

const SYMBOL_TO_ID: Record<string, string> = {
  ETH: "ethereum",
  WETH: "ethereum",
  BTC: "bitcoin",
  WBTC: "wrapped-bitcoin",
  USDC: "usd-coin",
  USDT: "tether",
  ARB: "arbitrum",
  OP: "optimism",
  LINK: "chainlink",
  DAI: "dai",
};

export async function fetchNarrativesFromTrending(): Promise<NarrativeSignal[]> {
  const [trending, markets, global] = await Promise.all([
    fetchJson<CGTrending>(`${BASE}/search/trending`),
    fetchTopMarkets(50),
    fetchGlobalSentiment(),
  ]);

  const trendingSymbols = new Set(
    trending.coins.map((c) => c.item.symbol.toUpperCase())
  );
  const marketBySymbol = new Map(markets.map((m) => [m.symbol, m]));

  const narratives: NarrativeSignal[] = NARRATIVE_RULES.map((rule) => {
    const matchedTokens = rule.tokenSymbols.filter(
      (s) => trendingSymbols.has(s) || marketBySymbol.has(s)
    );

    const avgChange =
      matchedTokens.reduce((sum, sym) => {
        const m = marketBySymbol.get(sym);
        return sum + (m?.change24hPct ?? 0);
      }, 0) / Math.max(1, matchedTokens.length);

    const trendingHits = rule.tokenSymbols.filter((s) => trendingSymbols.has(s)).length;
    const keywordHits = trending.coins.filter((c) =>
      rule.keywords.some((k) => c.item.name.toLowerCase().includes(k))
    ).length;

    let strength = 40 + trendingHits * 15 + keywordHits * 10 + matchedTokens.length * 5;
    strength = Math.min(98, strength);

    let momentum: NarrativeSignal["momentum"] = "stable";
    if (avgChange > 3 || trendingHits >= 2) momentum = "rising";
    else if (avgChange < -2) momentum = "cooling";

    const socialProxy = Math.round(
      (trendingHits * 8000 + keywordHits * 5000) * (1 + Math.abs(global.change24h) / 100)
    );

    return {
      id: rule.id,
      name: rule.name,
      strength,
      momentum,
      relatedTokens: matchedTokens.length > 0 ? matchedTokens : rule.tokenSymbols.slice(0, 3),
      socialMentions24h: socialProxy,
    };
  });

  return narratives.sort((a, b) => b.strength - a.strength);
}
