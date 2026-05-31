import { tool, jsonSchema } from 'ai';

const OKX_BASE = 'https://www.okx.com/api/v5';
const CG_BASE = 'https://api.coingecko.com/api/v3';

async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ChainScribe/1.0',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function asJsonSchema(properties: Record<string, unknown>, required: string[] = []) {
  return jsonSchema({
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  });
}

export const tools = {
  okx_ticker: tool({
    description:
      'Get live spot price + 24h stats from OKX exchange for a single trading pair. Use this for current price queries. instId format: BASE-QUOTE, e.g. BTC-USDT, ETH-USDT, SOL-USDT, BONK-USDT.',
    inputSchema: asJsonSchema(
      {
        instId: {
          type: 'string',
          description: 'OKX instrument id, e.g. BTC-USDT, ETH-USDT, SOL-USDT',
        },
      },
      ['instId']
    ),
    execute: async (input) => {
      const { instId } = input as { instId: string };
      try {
        const data = await fetchJson<{ data: Array<Record<string, string>> }>(
          `${OKX_BASE}/market/ticker?instId=${encodeURIComponent(instId)}`
        );
        const row = data.data?.[0];
        if (!row) return { error: `No data for ${instId}. Try a different pair like BTC-USDT.` };
        const last = parseFloat(row.last);
        const open = parseFloat(row.open24h);
        const change24hPct = open ? ((last - open) / open) * 100 : 0;
        return {
          instId,
          last,
          high24h: parseFloat(row.high24h),
          low24h: parseFloat(row.low24h),
          open24h: open,
          volume24h_base: parseFloat(row.vol24h),
          volume24h_usd: parseFloat(row.volCcy24h),
          change24h_pct: Number(change24hPct.toFixed(2)),
          ts: row.ts,
          source: 'OKX V5 SPOT',
        };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),

  okx_multi_ticker: tool({
    description:
      'Get live prices for multiple OKX spot pairs at once. Use when user asks about several tokens. instIds is array of OKX instrument ids.',
    inputSchema: asJsonSchema(
      {
        instIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of OKX instrument ids, e.g. ["BTC-USDT", "ETH-USDT", "SOL-USDT"]',
          minItems: 1,
          maxItems: 20,
        },
      },
      ['instIds']
    ),
    execute: async (input) => {
      const { instIds } = input as { instIds: string[] };
      const out: Record<string, unknown> = {};
      await Promise.all(
        instIds.map(async (instId) => {
          try {
            const data = await fetchJson<{ data: Array<Record<string, string>> }>(
              `${OKX_BASE}/market/ticker?instId=${encodeURIComponent(instId)}`
            );
            const row = data.data?.[0];
            if (!row) {
              out[instId] = { error: 'no data' };
              return;
            }
            const last = parseFloat(row.last);
            const open = parseFloat(row.open24h);
            out[instId] = {
              last,
              change24h_pct: open ? Number((((last - open) / open) * 100).toFixed(2)) : 0,
              high24h: parseFloat(row.high24h),
              low24h: parseFloat(row.low24h),
              volume24h_usd: parseFloat(row.volCcy24h),
            };
          } catch (e) {
            out[instId] = { error: String(e) };
          }
        })
      );
      return { source: 'OKX V5 SPOT', results: out };
    },
  }),

  okx_candles: tool({
    description:
      'Get OHLC candle history from OKX for a trading pair. Use when user asks about price trend / chart / history. Returns array of [ts, open, high, low, close, vol]. Bar options: 1m, 5m, 15m, 30m, 1H, 4H, 1D, 1W.',
    inputSchema: asJsonSchema(
      {
        instId: { type: 'string', description: 'OKX instrument id, e.g. BTC-USDT' },
        bar: {
          type: 'string',
          enum: ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'],
          description: 'Candle interval',
        },
        limit: {
          type: 'number',
          description: 'Number of candles to return (1-100)',
          minimum: 1,
          maximum: 100,
        },
      },
      ['instId', 'bar']
    ),
    execute: async (input) => {
      const { instId, bar, limit = 50 } = input as { instId: string; bar: string; limit?: number };
      try {
        const data = await fetchJson<{ data: string[][] }>(
          `${OKX_BASE}/market/candles?instId=${encodeURIComponent(instId)}&bar=${encodeURIComponent(
            bar
          )}&limit=${limit}`
        );
        const rows = (data.data || []).map((r) => ({
          ts: Number(r[0]),
          open: parseFloat(r[1]),
          high: parseFloat(r[2]),
          low: parseFloat(r[3]),
          close: parseFloat(r[4]),
          volume: parseFloat(r[5]),
        }));
        return { instId, bar, count: rows.length, candles: rows, source: 'OKX V5 SPOT' };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),

  okx_top_movers: tool({
    description:
      'Get top gainers or top losers among OKX SPOT pairs (USDT-quoted). Use when user asks "what is pumping / dumping / hot today". Returns sorted list of pairs.',
    inputSchema: asJsonSchema(
      {
        direction: {
          type: 'string',
          enum: ['gainers', 'losers'],
          description: 'Top gainers (price up) or top losers (price down) over 24h',
        },
        limit: { type: 'number', minimum: 1, maximum: 20, description: 'How many to return' },
      },
      ['direction']
    ),
    execute: async (input) => {
      const { direction, limit = 10 } = input as { direction: 'gainers' | 'losers'; limit?: number };
      try {
        const data = await fetchJson<{ data: Array<Record<string, string>> }>(
          `${OKX_BASE}/market/tickers?instType=SPOT`
        );
        const rows = (data.data || [])
          .filter((r) => r.instId.endsWith('-USDT') && parseFloat(r.volCcy24h) > 1_000_000)
          .map((r) => {
            const last = parseFloat(r.last);
            const open = parseFloat(r.open24h);
            return {
              instId: r.instId,
              last,
              change24h_pct: open ? ((last - open) / open) * 100 : 0,
              volume24h_usd: parseFloat(r.volCcy24h),
            };
          })
          .sort((a, b) =>
            direction === 'gainers' ? b.change24h_pct - a.change24h_pct : a.change24h_pct - b.change24h_pct
          )
          .slice(0, limit)
          .map((r) => ({ ...r, change24h_pct: Number(r.change24h_pct.toFixed(2)) }));
        return {
          source: 'OKX V5 SPOT (USDT pairs with >$1M 24h vol)',
          direction,
          count: rows.length,
          rows,
        };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),

  cg_trending: tool({
    description:
      'Get the top 7 trending crypto tokens right now (by search interest). Use when user asks "what is trending / hot / pumping in crypto right now".',
    inputSchema: asJsonSchema({}, []),
    execute: async () => {
      try {
        const data = await fetchJson<{
          coins: Array<{ item: { id: string; name: string; symbol: string; market_cap_rank: number; data?: { price?: number; price_change_percentage_24h?: { usd?: number } } } }>;
        }>(`${CG_BASE}/search/trending`);
        const rows = data.coins.map((c) => ({
          id: c.item.id,
          name: c.item.name,
          symbol: c.item.symbol,
          rank: c.item.market_cap_rank,
          price_usd: c.item.data?.price,
          change24h_pct: c.item.data?.price_change_percentage_24h?.usd,
        }));
        return { source: 'CoinGecko /search/trending', count: rows.length, trending: rows };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),

  cg_search_coin: tool({
    description:
      'Search for a coin/token by name or symbol on CoinGecko. Returns matches with id, symbol, name. Use this first if user gives a name you do not have OKX pair for.',
    inputSchema: asJsonSchema(
      {
        query: { type: 'string', description: 'Token name or symbol to search' },
      },
      ['query']
    ),
    execute: async (input) => {
      const { query } = input as { query: string };
      try {
        const data = await fetchJson<{ coins: Array<{ id: string; name: string; symbol: string; market_cap_rank: number | null }> }>(
          `${CG_BASE}/search?query=${encodeURIComponent(query)}`
        );
        return {
          source: 'CoinGecko /search',
          results: data.coins.slice(0, 8),
        };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),

  cg_coin_info: tool({
    description:
      'Get rich info for a single coin from CoinGecko: market cap, supply, ATH, %change across multiple timeframes, links. Use coingecko id (e.g. "bitcoin", "ethereum", "solana", "bonk").',
    inputSchema: asJsonSchema(
      {
        id: { type: 'string', description: 'CoinGecko coin id like bitcoin, ethereum, solana, bonk' },
      },
      ['id']
    ),
    execute: async (input) => {
      const { id } = input as { id: string };
      try {
        const data = await fetchJson<{
          id: string;
          symbol: string;
          name: string;
          market_cap_rank: number;
          market_data: {
            current_price: { usd: number };
            market_cap: { usd: number };
            total_volume: { usd: number };
            ath: { usd: number };
            ath_change_percentage: { usd: number };
            price_change_percentage_1h_in_currency?: { usd: number };
            price_change_percentage_24h: number;
            price_change_percentage_7d: number;
            price_change_percentage_30d: number;
            circulating_supply: number;
            total_supply: number | null;
          };
          links: { homepage: string[]; twitter_screen_name: string | null };
          description?: { en?: string };
        }>(
          `${CG_BASE}/coins/${encodeURIComponent(
            id
          )}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
        );
        return {
          source: 'CoinGecko /coins/{id}',
          id: data.id,
          symbol: data.symbol.toUpperCase(),
          name: data.name,
          rank: data.market_cap_rank,
          price_usd: data.market_data.current_price.usd,
          market_cap_usd: data.market_data.market_cap.usd,
          volume24h_usd: data.market_data.total_volume.usd,
          ath_usd: data.market_data.ath.usd,
          pct_from_ath: data.market_data.ath_change_percentage.usd,
          change1h_pct: data.market_data.price_change_percentage_1h_in_currency?.usd,
          change24h_pct: data.market_data.price_change_percentage_24h,
          change7d_pct: data.market_data.price_change_percentage_7d,
          change30d_pct: data.market_data.price_change_percentage_30d,
          circulating_supply: data.market_data.circulating_supply,
          total_supply: data.market_data.total_supply,
          homepage: data.links.homepage[0] || null,
          twitter: data.links.twitter_screen_name,
          description_short: data.description?.en ? data.description.en.slice(0, 320) : null,
        };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),

  cg_global_market: tool({
    description:
      'Get global crypto market overview: total market cap, 24h volume, BTC dominance, ETH dominance, total coins. Use when user asks about overall market state.',
    inputSchema: asJsonSchema({}, []),
    execute: async () => {
      try {
        const data = await fetchJson<{
          data: {
            active_cryptocurrencies: number;
            total_market_cap: { usd: number };
            total_volume: { usd: number };
            market_cap_percentage: { btc: number; eth: number };
            market_cap_change_percentage_24h_usd: number;
          };
        }>(`${CG_BASE}/global`);
        return {
          source: 'CoinGecko /global',
          active_cryptocurrencies: data.data.active_cryptocurrencies,
          total_market_cap_usd: data.data.total_market_cap.usd,
          total_volume24h_usd: data.data.total_volume.usd,
          btc_dominance_pct: data.data.market_cap_percentage.btc,
          eth_dominance_pct: data.data.market_cap_percentage.eth,
          market_cap_change_24h_pct: data.data.market_cap_change_percentage_24h_usd,
        };
      } catch (e) {
        return { error: String(e) };
      }
    },
  }),
};
