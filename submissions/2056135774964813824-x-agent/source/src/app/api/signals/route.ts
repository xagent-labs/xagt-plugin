import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api/http";
import { hasOpenRouter } from "@/lib/env";
import { generateSignals } from "@/lib/signals/generate";
import { fetchMarkets } from "@/lib/sources/coingecko";
import { aggregateNarratives } from "@/lib/sources/narratives";
import { DEFAULT_FEEDS, fetchAllFeeds } from "@/lib/sources/rss";
import type { Signal } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; payload: SignalsPayload } | null = null;

interface SignalsPayload {
  source: string;
  generatedAt: string;
  narrativesUsed: number;
  marketCoins: number;
  signals: Signal[];
}

export async function GET(req: NextRequest) {
  if (!hasOpenRouter()) {
    return jsonResponse(503, {
      error: "OPENROUTER_API_KEY not set. Add it to .env.local — it is the only required key.",
    });
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("refresh") === "1";

  if (!force && cache && Date.now() - cache.at < CACHE_MS) {
    return jsonResponse(200, cache.payload, {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-Signals-Cache": "hit",
    });
  }

  try {
    const [items, coins] = await Promise.all([
      fetchAllFeeds(DEFAULT_FEEDS, req.signal),
      fetchMarkets({ per_page: 50, signal: req.signal }),
    ]);

    const narratives = aggregateNarratives(items);
    const { signals } = await generateSignals({
      narratives,
      coins,
      signal: req.signal,
    });

    const payload: SignalsPayload = {
      source: "openrouter+narratives+coingecko",
      generatedAt: new Date().toISOString(),
      narrativesUsed: narratives.filter((n) => n.mentions > 0).length,
      marketCoins: coins.length,
      signals,
    };

    cache = { at: Date.now(), payload };

    return jsonResponse(200, payload, {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-Signals-Cache": "miss",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return jsonResponse(502, { error: message });
  }
}
