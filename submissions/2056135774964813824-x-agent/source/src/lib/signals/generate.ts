/**
 * Signal generation — narratives (RSS cluster) + market (CoinGecko) context
 * synthesized by OpenRouter into trade-grade Signal objects.
 */
import { openrouterComplete } from "@/lib/openrouter";
import type { MarketCoin } from "@/lib/sources/coingecko";
import type { Narrative } from "@/lib/types";
import type { Signal } from "@/lib/types";

const SIGNAL_TYPES = new Set<Signal["type"]>([
  "breakout",
  "reversal",
  "narrative",
  "volatility",
  "onchain",
  "social",
]);
const DIRECTIONS = new Set<Signal["direction"]>(["bullish", "bearish", "neutral"]);

interface RawSignal {
  asset?: string;
  type?: string;
  direction?: string;
  strength?: number;
  confidence?: number;
  timeframe?: string;
  reason?: string;
}

interface LlmPayload {
  signals?: RawSignal[];
}

export interface GenerateSignalsInput {
  narratives: Narrative[];
  coins: MarketCoin[];
  signal?: AbortSignal;
}

export interface GenerateSignalsResult {
  signals: Signal[];
  model: string;
}

function buildContext(narratives: Narrative[], coins: MarketCoin[]) {
  const activeNarratives = [...narratives]
    .filter((n) => n.mentions > 0)
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 10)
    .map((n) => ({
      id: n.id,
      name: n.name,
      momentum: n.momentum,
      mentions: n.mentions,
      sentiment: Math.round(n.sentiment * 100),
      topTokens: n.topTokens,
    }));

  const topByCap = [...coins]
    .filter((c) => c.current_price != null)
    .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))
    .slice(0, 30)
    .map((c) => ({
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      priceUsd: c.current_price,
      change24hPct: c.price_change_percentage_24h,
      volume24h: c.total_volume,
    }));

  const movers = [...coins]
    .filter((c) => c.price_change_percentage_24h != null)
    .sort(
      (a, b) =>
        Math.abs(b.price_change_percentage_24h ?? 0) -
        Math.abs(a.price_change_percentage_24h ?? 0),
    )
    .slice(0, 8)
    .map((c) => ({
      symbol: c.symbol.toUpperCase(),
      change24hPct: c.price_change_percentage_24h,
    }));

  return { activeNarratives, topByCap, movers };
}

const SYSTEM = `You are the X-Agent signal agent. Produce institutional-grade crypto trade signals from ONLY the JSON context provided (clustered RSS narratives + CoinGecko market snapshot).

Rules:
- Output valid JSON only, matching the schema exactly.
- Generate 4 to 8 signals. Each must cite real context (narrative momentum, 24h price move, or sector rotation).
- Never invent prices, TVL, or on-chain metrics not in the context.
- asset: ticker symbol (e.g. ETH, SOL).
- type: one of breakout | reversal | narrative | volatility | onchain | social
- direction: bullish | bearish | neutral
- strength and confidence: numbers 0.0–1.0
- timeframe: short label e.g. "24h", "48-72h", "1w"
- reason: 1–2 sentences, specific and refutable

Schema:
{"signals":[{"asset":"ETH","type":"narrative","direction":"bullish","strength":0.72,"confidence":0.65,"timeframe":"48h","reason":"..."}]}`;

export async function generateSignals(
  input: GenerateSignalsInput,
): Promise<GenerateSignalsResult> {
  const ctx = buildContext(input.narratives, input.coins);
  const now = new Date().toISOString();

  const raw = await openrouterComplete({
    signal: input.signal,
    temperature: 0.35,
    maxTokens: 3500,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Context (real data only):\n${JSON.stringify(ctx, null, 0)}\n\nGenerate signals JSON now.`,
      },
    ],
  });

  const parsed = parseLlmJson(raw);
  const signals = normalizeSignals(parsed.signals ?? [], now);

  if (!signals.length) {
    throw new Error("Model returned no valid signals");
  }

  return { signals, model: "openrouter" };
}

function parseLlmJson(raw: string): LlmPayload {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as LlmPayload;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Failed to parse signal JSON from model");
    return JSON.parse(match[0]) as LlmPayload;
  }
}

function normalizeSignals(raw: RawSignal[], timestamp: string): Signal[] {
  const out: Signal[] = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    if (!r?.asset || !r.reason) continue;

    const type = SIGNAL_TYPES.has(r.type as Signal["type"])
      ? (r.type as Signal["type"])
      : "narrative";
    const direction = DIRECTIONS.has(r.direction as Signal["direction"])
      ? (r.direction as Signal["direction"])
      : "neutral";

    const asset = String(r.asset).toUpperCase().slice(0, 12);
    const id = `sig-${asset.toLowerCase()}-${i}-${Date.now()}`;

    out.push({
      id,
      asset,
      type,
      direction,
      strength: clamp01(r.strength ?? 0.5),
      confidence: clamp01(r.confidence ?? 0.5),
      timeframe: String(r.timeframe ?? "24h").slice(0, 24),
      reason: String(r.reason).slice(0, 600),
      timestamp,
      sources: [
        {
          id: "coingecko",
          title: "CoinGecko market snapshot",
          url: "https://www.coingecko.com",
          domain: "coingecko.com",
          category: "market",
          reliability: 0.9,
        },
        {
          id: "rss-narratives",
          title: "RSS narrative cluster",
          url: "/narratives",
          domain: "rss-clustered",
          category: "narrative",
          reliability: 0.85,
        },
      ],
    });
  }

  return out.slice(0, 8);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}
