import { NextRequest } from "next/server";
import { fetchMarkets } from "@/lib/sources/coingecko";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const perPage = clampInt(url.searchParams.get("per_page"), 50, 1, 250);
  const page = clampInt(url.searchParams.get("page"), 1, 1, 20);
  const idsParam = url.searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

  try {
    const coins = await fetchMarkets({
      per_page: perPage,
      page,
      ids,
      signal: req.signal,
    });
    return Response.json(
      { source: "coingecko", count: coins.length, coins },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}

function clampInt(v: string | null, dflt: number, min: number, max: number): number {
  const n = v == null ? dflt : Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}
