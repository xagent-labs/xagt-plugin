/**
 * Builds a live "facts" context block for the research agent.
 *
 * Pulls only public, key-less sources:
 *   - CoinGecko public REST (markets, trending)
 *   - DefiLlama public REST (protocols)
 *   - Curated RSS feeds (news headlines)
 *
 * The output is a plain-text Markdown block the model can quote against. The
 * model is instructed (in /api/research) to ground claims in this block and
 * say "no data" if a fact is not present.
 */

import { fetchMarkets, fetchTrending, type MarketCoin } from "@/lib/sources/coingecko";
import { fetchProtocols, type ProtocolTVL } from "@/lib/sources/defillama";
import { DEFAULT_FEEDS, fetchAllFeeds, type RSSItem } from "@/lib/sources/rss";

const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ARB: "arbitrum",
  OP: "optimism",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  POL: "polygon-ecosystem-token",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  TRX: "tron",
  LINK: "chainlink",
  TON: "the-open-network",
  DOT: "polkadot",
  ATOM: "cosmos",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  NEAR: "near",
  APT: "aptos",
  SUI: "sui",
  SEI: "sei-network",
  INJ: "injective-protocol",
  TIA: "celestia",
  PEPE: "pepe",
  SHIB: "shiba-inu",
  WIF: "dogwifcoin",
  BONK: "bonk",
  UNI: "uniswap",
  AAVE: "aave",
  MKR: "maker",
  CRV: "curve-dao-token",
  LDO: "lido-dao",
  ENA: "ethena",
  ENS: "ethereum-name-service",
  RNDR: "render-token",
  FET: "fetch-ai",
  TAO: "bittensor",
  WLD: "worldcoin-wld",
  STX: "blockstack",
  BERA: "berachain-bera",
  HYPE: "hyperliquid",
  S: "sonic-3",
};

// Words that look like tickers but aren't — never resolve these.
const TICKER_STOPWORDS = new Set([
  "AI", "API", "APR", "APY", "AVS", "CEO", "CTO", "CEX", "DEX", "DEFI", "DAO",
  "DOA", "ETF", "EVM", "FAQ", "FED", "FUD", "GDP", "ICO", "IPO", "IRL", "KYC",
  "LP", "L1", "L2", "L3", "M1", "M2", "MEV", "NFT", "NYC", "OTC", "PMF", "POS",
  "POW", "PR", "QE", "RFC", "RPC", "ROI", "RWA", "SDK", "SEC", "SLA", "SOC",
  "TPS", "TVL", "URL", "USD", "USDC", "USDT", "UTC", "VC", "WEB", "WTF", "YOY",
  "ZK", "ZKP", "GM", "GN", "OK", "OG", "NEW", "OLD", "ALL",
]);

const HEADLINE_LIMIT = 14;
const PRICE_LIMIT = 12;
const TVL_LIMIT = 10;
const TRENDING_LIMIT = 8;

export interface ResearchContext {
  generatedAt: string;
  symbols: string[];
  markets: MarketCoin[];
  trending: { symbol: string; name: string; rank: number | null }[];
  topProtocols: ProtocolTVL[];
  headlines: RSSItem[];
  notes: string[];
}

export interface BuildContextOptions {
  query: string;
  signal?: AbortSignal;
}

/** Pull a context snapshot for the given query — never throws, partial-is-fine. */
export async function buildResearchContext(
  opts: BuildContextOptions,
): Promise<ResearchContext> {
  const symbols = extractSymbols(opts.query);
  const ids = symbols
    .map((s) => SYMBOL_TO_ID[s])
    .filter((id): id is string => !!id);

  // Always include the majors for stable orientation, dedup against extracted ids.
  const baselineIds = ["bitcoin", "ethereum", "solana"];
  const targetIds = Array.from(new Set([...ids, ...baselineIds]));

  const [marketsR, trendingR, protocolsR, headlinesR] = await Promise.allSettled([
    fetchMarkets({ ids: targetIds, per_page: Math.max(targetIds.length, 10), signal: opts.signal }),
    fetchTrending(opts.signal),
    fetchProtocols(opts.signal),
    fetchAllFeeds(DEFAULT_FEEDS, opts.signal),
  ]);

  const notes: string[] = [];
  const markets = marketsR.status === "fulfilled"
    ? marketsR.value.slice(0, PRICE_LIMIT)
    : (notes.push(`coingecko markets unavailable: ${reason(marketsR)}`), []);

  const trending = trendingR.status === "fulfilled"
    ? trendingR.value.slice(0, TRENDING_LIMIT).map((t) => ({
        symbol: t.symbol.toUpperCase(),
        name: t.name,
        rank: t.market_cap_rank,
      }))
    : (notes.push(`coingecko trending unavailable: ${reason(trendingR)}`), []);

  const topProtocols = protocolsR.status === "fulfilled"
    ? rankProtocols(protocolsR.value, symbols).slice(0, TVL_LIMIT)
    : (notes.push(`defillama unavailable: ${reason(protocolsR)}`), []);

  const headlines = headlinesR.status === "fulfilled"
    ? rankHeadlines(headlinesR.value, opts.query).slice(0, HEADLINE_LIMIT)
    : (notes.push(`rss feeds unavailable: ${reason(headlinesR)}`), []);

  return {
    generatedAt: new Date().toISOString(),
    symbols,
    markets,
    trending,
    topProtocols,
    headlines,
    notes,
  };
}

/** Extract uppercase tickers (3-5 chars) from the query, filter stopwords. */
function extractSymbols(query: string): string[] {
  const out = new Set<string>();
  const matches = query.match(/\b[A-Z]{2,5}\b/g) ?? [];
  for (const m of matches) {
    if (TICKER_STOPWORDS.has(m)) continue;
    if (SYMBOL_TO_ID[m]) out.add(m);
  }
  // Case-insensitive coin names (ethereum, solana, bitcoin) — map back.
  const lower = query.toLowerCase();
  for (const [sym, id] of Object.entries(SYMBOL_TO_ID)) {
    if (lower.includes(id) || lower.includes(sym.toLowerCase() + " ")) {
      out.add(sym);
    }
  }
  return Array.from(out);
}

/** Boost protocols matching any mentioned symbol/chain; otherwise sort by TVL. */
function rankProtocols(all: ProtocolTVL[], symbols: string[]): ProtocolTVL[] {
  const wanted = new Set(symbols.map((s) => s.toUpperCase()));
  const matched = all.filter(
    (p) =>
      p.symbol && wanted.has(p.symbol.toUpperCase())
      || p.chains?.some((c) => wanted.has(c.toUpperCase())),
  );
  if (matched.length) {
    return matched.sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0));
  }
  return all
    .filter((p) => typeof p.tvl === "number" && p.tvl > 0)
    .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0));
}

/** Score headlines by token overlap with query, then by recency. */
function rankHeadlines(items: RSSItem[], query: string): RSSItem[] {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 14; // 14 days
  const recent = items.filter(
    (i) => new Date(i.publishedAt).getTime() >= cutoff,
  );

  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);

  return recent
    .map((it) => {
      const hay = `${it.title} ${it.summary ?? ""}`.toLowerCase();
      const score = terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
      const ageHrs =
        (Date.now() - new Date(it.publishedAt).getTime()) / (1000 * 60 * 60);
      const recencyBoost = Math.max(0, 1 - ageHrs / 168);
      return { it, score: score + recencyBoost };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.it);
}

/** Render context as a compact, model-friendly Markdown block. */
export function renderContextMarkdown(ctx: ResearchContext): string {
  const lines: string[] = [];
  lines.push(`# Live data snapshot · ${ctx.generatedAt}`);

  if (ctx.symbols.length) {
    lines.push(`\n_Detected tokens in query:_ ${ctx.symbols.join(", ")}`);
  }

  if (ctx.markets.length) {
    lines.push("\n## Market prices (CoinGecko · USD · 24h)");
    lines.push("| Symbol | Name | Price | 24h % | Market cap | 24h volume |");
    lines.push("|---|---|---|---|---|---|");
    for (const c of ctx.markets) {
      lines.push(
        `| ${c.symbol.toUpperCase()} | ${escapeCell(c.name)} | ${fmtUsd(c.current_price)} | ${fmtPct(c.price_change_percentage_24h)} | ${fmtUsd(c.market_cap, 0)} | ${fmtUsd(c.total_volume, 0)} |`,
      );
    }
  }

  if (ctx.trending.length) {
    lines.push("\n## Trending searches (CoinGecko)");
    lines.push(
      ctx.trending
        .map((t) => `- ${t.symbol} · ${escapeCell(t.name)}${t.rank ? ` · rank ${t.rank}` : ""}`)
        .join("\n"),
    );
  }

  if (ctx.topProtocols.length) {
    lines.push("\n## TVL leaders (DefiLlama)");
    lines.push("| Protocol | Category | Chains | TVL | 1d | 7d |");
    lines.push("|---|---|---|---|---|---|");
    for (const p of ctx.topProtocols) {
      lines.push(
        `| ${escapeCell(p.name)} | ${escapeCell(p.category ?? "—")} | ${escapeCell((p.chains ?? []).slice(0, 3).join(", "))} | ${fmtUsd(p.tvl, 0)} | ${fmtPct(p.change_1d)} | ${fmtPct(p.change_7d)} |`,
      );
    }
  }

  if (ctx.headlines.length) {
    lines.push("\n## Recent headlines (public RSS · sorted by relevance + recency)");
    for (const h of ctx.headlines) {
      const when = new Date(h.publishedAt);
      const ts = `${when.toISOString().slice(0, 10)} ${when.toISOString().slice(11, 16)}Z`;
      lines.push(`- [${h.source} · ${ts}] ${escapeCell(h.title)} — ${h.url}`);
    }
  }

  if (ctx.notes.length) {
    lines.push("\n## Source health notes");
    for (const n of ctx.notes) lines.push(`- ${n}`);
  }

  return lines.join("\n");
}

function fmtUsd(n: number | null | undefined, decimals = 4): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  if (Math.abs(n) >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(Math.min(decimals, 6))}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 160);
}

function reason(r: PromiseSettledResult<unknown>): string {
  if (r.status === "fulfilled") return "ok";
  const e = r.reason;
  return e instanceof Error ? e.message : String(e);
}
