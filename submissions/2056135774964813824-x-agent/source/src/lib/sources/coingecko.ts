/**
 * CoinGecko — public REST. No API key required.
 *
 * Docs: https://www.coingecko.com/en/api/documentation
 * Rate-limit guard: callers must cache responses; this module does not.
 */

const BASE = "https://api.coingecko.com/api/v3";

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}

export interface FetchMarketsOptions {
  vs?: string;
  per_page?: number;
  page?: number;
  ids?: string[];
  signal?: AbortSignal;
}

export async function fetchMarkets(opts: FetchMarketsOptions = {}): Promise<MarketCoin[]> {
  const params = new URLSearchParams({
    vs_currency: opts.vs ?? "usd",
    order: "market_cap_desc",
    per_page: String(Math.min(Math.max(opts.per_page ?? 50, 1), 250)),
    page: String(Math.max(opts.page ?? 1, 1)),
    sparkline: "true",
    price_change_percentage: "24h",
  });
  if (opts.ids && opts.ids.length) params.set("ids", opts.ids.join(","));

  const res = await fetch(`${BASE}/coins/markets?${params.toString()}`, {
    signal: opts.signal,
    next: { revalidate: 30 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko markets failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as MarketCoin[];
}

export interface TrendingItem {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
  thumb: string;
  score: number;
}

export async function fetchTrending(signal?: AbortSignal): Promise<TrendingItem[]> {
  const res = await fetch(`${BASE}/search/trending`, {
    signal,
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`CoinGecko trending failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as {
    coins: { item: TrendingItem }[];
  };
  return json.coins.map((c) => c.item);
}
