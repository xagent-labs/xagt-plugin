import type {
  Opportunity,
  OpportunityAction,
  OpportunityEvidence,
  OpportunityMetrics,
  OpportunityRisk,
  OpportunityStatus,
} from "../types.js";

export interface ScannerOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText?: string;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
}

export type FetchLike = (input: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<FetchResponseLike>;

export interface ScannerSourceHealth {
  name: string;
  ok: boolean;
  command: string;
  error?: string;
  detail?: string;
  cached?: boolean;
}

export interface ProviderScanResult {
  ok: boolean;
  opportunities: Opportunity[];
  sourceHealth: ScannerSourceHealth[];
  mode: "live" | "degraded";
  reason?: string;
}

export interface NormalizedOpportunityInput {
  provider: string;
  evidenceSkill?: string;
  tokenAddress: string;
  chain: string;
  chainIndex?: string;
  symbol?: string;
  name?: string;
  source?: string;
  metrics?: OpportunityMetrics;
  baseSymbol?: string;
  quoteSymbol?: string;
  categoryHint?: Opportunity["category"];
  signal?: RankingSignals;
  evidenceSummary: string;
  freshness?: string;
  externalId?: string;
}

export interface RankingSignals {
  profileListed?: boolean;
  boosted?: boolean;
  boostUsd?: number;
  trending?: boolean;
  newPool?: boolean;
  poolCreatedAt?: string;
  freshnessMinutes?: number;
}

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_ORDER_USD = 25;

export const knownStableSymbols = symbolSet(["USDC", "USDT", "DAI", "FRAX", "USDe", "USDS", "USDD", "TUSD", "USDP", "GUSD", "USDG", "mUSD", "PYUSD", "FDUSD", "USD1"]);
export const knownWrappedSymbols = symbolSet(["WETH", "cbBTC", "WBTC", "weETH", "stETH", "wstETH", "cbETH", "sfrxETH", "tBTC", "WSOL", "WBNB"]);
export const knownMajorSymbols = symbolSet(["BTC", "ETH", "SOL", "BNB", "MATIC", "ARB", "OP", "AVAX", "OKB"]);

const chainMeta: Record<string, { chain: string; chainIndex: string }> = {
  "1": { chain: "Ethereum", chainIndex: "1" },
  eth: { chain: "Ethereum", chainIndex: "1" },
  ethereum: { chain: "Ethereum", chainIndex: "1" },
  "56": { chain: "BSC", chainIndex: "56" },
  bnb: { chain: "BSC", chainIndex: "56" },
  bsc: { chain: "BSC", chainIndex: "56" },
  "196": { chain: "X Layer", chainIndex: "196" },
  xlayer: { chain: "X Layer", chainIndex: "196" },
  "x-layer": { chain: "X Layer", chainIndex: "196" },
  "501": { chain: "Solana", chainIndex: "501" },
  sol: { chain: "Solana", chainIndex: "501" },
  solana: { chain: "Solana", chainIndex: "501" },
  "8453": { chain: "Base", chainIndex: "8453" },
  base: { chain: "Base", chainIndex: "8453" },
  "42161": { chain: "Arbitrum", chainIndex: "42161" },
  arbitrum: { chain: "Arbitrum", chainIndex: "42161" },
  "arbitrum-one": { chain: "Arbitrum", chainIndex: "42161" },
};

export async function fetchJson<T>(url: string, options: ScannerOptions = {}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });

  try {
    const fetcher = options.fetchImpl ?? ((input, init) => fetch(input, init));
    const response = await fetcher(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "TheDesk/0.1 live-market-radar",
      },
    });
    if (!response.ok) {
      let body = "";
      try {
        body = response.text ? await response.text() : "";
      } catch {
        body = "";
      }
      throw new Error(`HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}${body ? `: ${body.slice(0, 180)}` : ""}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) {
      throw new Error(`timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}

export function makeOpportunity(input: NormalizedOpportunityInput): Opportunity {
  const chain = normalizeChain(input.chain, input.chainIndex);
  const tokenAddress = input.tokenAddress.trim();
  const symbol = sanitizeSymbol(input.symbol, tokenAddress);
  const name = cleanString(input.name);
  const metrics = normalizeMetrics(input.metrics ?? {}, input.signal);
  const rank = rankOpportunity({
    symbol,
    metrics,
    baseSymbol: input.baseSymbol,
    quoteSymbol: input.quoteSymbol,
    categoryHint: input.categoryHint,
    signal: input.signal,
  });
  const status = rank.status;
  const action = actionForStatus(status);
  const risk = rank.risk;
  const policy = {
    allowed: status !== "blocked",
    reasons: status !== "blocked" ? ["public market-data preflight passed"] : risk.reasons,
  };
  const source = input.source ?? input.provider;
  const evidence: OpportunityEvidence[] = [
    {
      source,
      skill: input.evidenceSkill ?? input.provider,
      summary: input.evidenceSummary,
      timestamp: new Date().toISOString(),
    },
  ];
  const score = rank.score;

  return {
    id: `${input.provider}:${chain.chainIndex}:${slugToken(tokenAddress)}`,
    ticketId: `opp_${input.provider.replace(/[^a-z0-9]/gi, "").toLowerCase()}_${slugToken(input.externalId ?? tokenAddress).slice(0, 12)}`,
    status,
    action,
    actionLabel: action === "quote-buy" ? `Prepare quote for ${symbol}` : `Watch ${symbol}`,
    symbol,
    name,
    chain: chain.chain,
    chainIndex: chain.chainIndex,
    tokenAddress,
    source,
    thesis: thesisFor(input.provider, symbol, chain.chain, metrics, status),
    invalidation: invalidationFor(status),
    confidence: Math.round(clamp(status === "ready" ? score - 6 : status === "watch" ? score - 14 : 20, 1, 95)),
    score,
    freshness: input.freshness ?? "live snapshot",
    metrics,
    risk,
    policy,
    proposedOrder: {
      mode: status === "ready" ? "quote-only" : "watch-only",
      fromAsset: "USDC",
      toAsset: symbol,
      amountUsd: DEFAULT_ORDER_USD,
      slippageBps: status === "ready" ? 100 : 250,
      quoteStatus: "not-quoted",
      route: status === "ready" ? "public source -> OKX quote pending" : undefined,
    },
    evidence,
    category: rank.category,
  };
}

export function normalizeChain(chain: string, chainIndex?: string) {
  const key = String(chainIndex ?? chain).trim().toLowerCase();
  return chainMeta[key] ?? { chain: titleCase(chain), chainIndex: chainIndex ?? chain };
}

export function dedupeKey(opportunity: Pick<Opportunity, "tokenAddress" | "chain">) {
  return `${opportunity.chain.toLowerCase()}:${opportunity.tokenAddress.toLowerCase()}`;
}

export function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") {
    const normalized = value.replace(/[$,%\s,]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function compactNumber(value?: number) {
  if (value === undefined) return "n/a";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(value >= 10 ? 0 : 2);
}

export function shortError(error: unknown, maxLength = 180) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  return sanitizeMessage(message ?? "unknown error").slice(0, maxLength);
}

export function cleanString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function stableSymbolFromAddress(address: string) {
  const cleaned = address.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.length > 5 ? cleaned.slice(-5).toUpperCase() : cleaned.toUpperCase();
}

export function isKnownStableSymbol(symbol: unknown) {
  return knownStableSymbols.has(normalizeSymbol(symbol));
}

export function isKnownWrappedSymbol(symbol: unknown) {
  return knownWrappedSymbols.has(normalizeSymbol(symbol));
}

export function isKnownMajorSymbol(symbol: unknown) {
  return knownMajorSymbols.has(normalizeSymbol(symbol));
}

export function isKnownBlueChipSymbol(symbol: unknown) {
  const normalized = normalizeSymbol(symbol);
  return knownStableSymbols.has(normalized) || knownWrappedSymbols.has(normalized) || knownMajorSymbols.has(normalized);
}

export function rankOpportunity(input: {
  symbol: string;
  metrics: OpportunityMetrics;
  baseSymbol?: string;
  quoteSymbol?: string;
  categoryHint?: Opportunity["category"];
  signal?: RankingSignals;
}): { status: OpportunityStatus; risk: OpportunityRisk; score: number; category: Opportunity["category"] } {
  const metrics = normalizeMetrics(input.metrics, input.signal);
  const signal = input.signal ?? {};
  const liquidity = metrics.liquidityUsd;
  const price = metrics.priceUsd;
  const volume = metrics.volumeUsd;
  const volumeLiquidityRatio = liquidity && liquidity > 0 && volume !== undefined ? volume / liquidity : undefined;
  const flow = txFlow(metrics);
  const reasons: string[] = [];
  let blocked = false;
  let watch = false;

  if (price === undefined || price <= 0 || liquidity === undefined || liquidity <= 0 || liquidity < 1_000) {
    blocked = true;
    reasons.push("missing or near-zero liquidity");
  }

  if ((liquidity === undefined || liquidity <= 0) && volume !== undefined && volume > 0) {
    blocked = true;
    reasons.push("extreme volume-to-liquidity ratio");
  } else if (volumeLiquidityRatio !== undefined && volumeLiquidityRatio > 30) {
    blocked = true;
    reasons.push("extreme volume-to-liquidity ratio");
  }

  if (flow && flow.total > 0 && Math.max(flow.buyPercent, flow.sellPercent) > 95) {
    watch = true;
    reasons.push(`one-sided tx flow (${Math.round(flow.buyPercent)}% buys / ${Math.round(flow.sellPercent)}% sells)`);
  }

  if (!blocked && liquidity !== undefined && liquidity < 10_000) {
    watch = true;
    reasons.push("liquidity below emerging-token sweet spot");
  }

  const move = Math.abs(metrics.priceChangePct ?? 0);
  const hasLaunchSignal = Boolean(signal.profileListed || signal.boosted || signal.trending || signal.newPool);
  if (!blocked && !hasLaunchSignal && move <= 3) {
    watch = true;
    reasons.push("muted 24h price movement");
  }

  const status: OpportunityStatus = blocked ? "blocked" : watch ? "watch" : "ready";
  const risk: OpportunityRisk =
    status === "blocked"
      ? { level: "high", verdict: "block", reasons: uniqueReasons(reasons.length > 0 ? reasons : ["public source did not pass execution preflight"]) }
      : status === "watch"
        ? { level: "medium", verdict: "review", reasons: uniqueReasons(reasons.length > 0 ? reasons : ["market-data quality needs review"]) }
        : { level: "low", verdict: "allow", reasons: ["price, liquidity, volume, and tx-flow cleared emerging-token preflight"] };
  const score = scoreForEmerging(input.symbol, metrics, status, signal, input.baseSymbol);
  const category = input.categoryHint ?? categoryFor(input.symbol, status, signal, metrics, input.baseSymbol);
  return { status, risk, score, category };
}

function actionForStatus(status: OpportunityStatus): OpportunityAction {
  return status === "ready" ? "quote-buy" : "watch";
}

function scoreForEmerging(
  symbol: string,
  metrics: OpportunityMetrics,
  status: OpportunityStatus,
  signal: RankingSignals,
  baseSymbol?: string,
) {
  const liquidity = Math.max(metrics.liquidityUsd ?? 0, 1);
  const volume = Math.max(metrics.volumeUsd ?? 0, 1);
  const ratio = volume / liquidity;
  const move = Math.abs(metrics.priceChangePct ?? 0);
  const flow = txFlow(metrics);
  let score = 35;

  if (signal.profileListed) score += 24;
  if (signal.boosted) score += 28 + Math.min(10, (signal.boostUsd ?? metrics.signalAmountUsd ?? 0) / 100);
  if (signal.trending) score += 18;
  if (signal.newPool) score += 30;

  const freshness = metrics.freshness_minutes ?? signal.freshnessMinutes;
  if (freshness !== undefined) {
    if (freshness <= 60) score += 24;
    else if (freshness <= 360) score += 18;
    else if (freshness <= 1_440) score += 10;
    else if (freshness > 10_080) score -= 10;
  }

  if (liquidity >= 20_000 && liquidity <= 2_000_000) score += 20;
  else if (liquidity >= 10_000 && liquidity < 20_000) score += 8;
  else if (liquidity > 2_000_000 && liquidity <= 5_000_000) score += 8;
  else if (liquidity > 5_000_000) score -= 18;
  else if (liquidity < 10_000) score -= 15;

  if (ratio > 3 && ratio < 30) score += 20;
  else if (ratio >= 1 && ratio <= 3) score += 8;
  else if (ratio > 0 && ratio < 1) score -= 5;
  else if (ratio >= 30) score -= 25;

  if (flow && Math.max(flow.buyPercent, flow.sellPercent) <= 95 && flow.buyPercent > 0 && flow.sellPercent > 0) score += 10;

  if (move > 3 && move < 500) score += 10;
  else if (move >= 500) score -= 12;
  else if (move > 0 && move <= 3) score -= 4;

  if (isKnownBlueChipSymbol(symbol) || (baseSymbol && isKnownBlueChipSymbol(baseSymbol))) score -= 60;

  const capped = status === "blocked" ? Math.min(score, 25) : status === "watch" ? Math.min(score, 60) : score;
  return Math.round(clamp(capped, 1, 99));
}

function thesisFor(provider: string, symbol: string, chain: string, metrics: OpportunityMetrics, status: OpportunityStatus) {
  const volume = compactNumber(metrics.volumeUsd);
  const liquidity = compactNumber(metrics.liquidityUsd);
  const change = metrics.priceChangePct === undefined ? "n/a" : `${metrics.priceChangePct.toFixed(Math.abs(metrics.priceChangePct) >= 10 ? 1 : 2)}%`;
  const verdict = status === "ready" ? "ready for policy-gated OKX quote review" : status === "watch" ? "needs review before execution" : "blocked by market-data preflight";
  return `${provider} live market data shows ${symbol} on ${chain}: liquidity $${liquidity}, 24h volume $${volume}, 24h move ${change}; ${verdict}.`;
}

function invalidationFor(status: OpportunityStatus) {
  if (status === "blocked") return "Do not execute until live liquidity and price data clear preflight.";
  return "Invalidate if liquidity drops below threshold, volume collapses, or the OKX quote/policy gate rejects the route.";
}

function sanitizeSymbol(symbol: unknown, address: string) {
  const value = typeof symbol === "string" ? symbol.trim() : "";
  if (value) return value.replace(/[^a-zA-Z0-9$._-]/g, "").slice(0, 16) || stableSymbolFromAddress(address);
  return stableSymbolFromAddress(address);
}

function slugToken(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "token";
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeMessage(message: string) {
  return message.replace(/\s+/g, " ").trim();
}

function normalizeMetrics(metrics: OpportunityMetrics, signal?: RankingSignals): OpportunityMetrics {
  const freshness =
    metrics.freshness_minutes ??
    signal?.freshnessMinutes ??
    (signal?.poolCreatedAt ? minutesSince(signal.poolCreatedAt) : undefined);
  return freshness === undefined ? { ...metrics } : { ...metrics, freshness_minutes: freshness };
}

function categoryFor(symbol: string, status: OpportunityStatus, signal: RankingSignals, metrics: OpportunityMetrics, baseSymbol?: string): Opportunity["category"] {
  if (status === "blocked") return "blocked-risk";
  if (isKnownBlueChipSymbol(symbol) || (baseSymbol && isKnownBlueChipSymbol(baseSymbol))) return "blue-chip";
  const freshness = metrics.freshness_minutes ?? signal.freshnessMinutes;
  if ((signal.newPool || signal.boosted || signal.profileListed) && (freshness === undefined || freshness <= 1_440)) return "new-launch";
  if (signal.trending || signal.boosted || signal.profileListed) return "trending";
  return "trending";
}

function txFlow(metrics: OpportunityMetrics) {
  if (metrics.buyTxCount1h === undefined || metrics.sellTxCount1h === undefined) return null;
  const buys = Math.max(metrics.buyTxCount1h, 0);
  const sells = Math.max(metrics.sellTxCount1h, 0);
  const total = buys + sells;
  if (total <= 0) return null;
  return {
    total,
    buyPercent: (buys / total) * 100,
    sellPercent: (sells / total) * 100,
  };
}

function minutesSince(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  const minutes = Math.max(0, (Date.now() - timestamp) / 60_000);
  return Math.round(minutes);
}

function uniqueReasons(reasons: string[]) {
  return [...new Set(reasons)];
}

function normalizeSymbol(symbol: unknown) {
  return typeof symbol === "string" ? symbol.trim().toUpperCase() : "";
}

function symbolSet(symbols: string[]) {
  return new Set(symbols.map((symbol) => symbol.toUpperCase()));
}
