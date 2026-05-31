import { NextRequest } from "next/server";
import { fetchChains, fetchProtocols } from "@/lib/sources/defillama";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") === "chains" ? "chains" : "protocols";
  const limit = Math.max(1, Math.min(200, Number.parseInt(url.searchParams.get("limit") ?? "30", 10) || 30));

  try {
    if (scope === "chains") {
      const all = await fetchChains(req.signal);
      const top = all.sort((a, b) => b.tvl - a.tvl).slice(0, limit);
      return Response.json(
        { source: "defillama", scope, count: top.length, chains: top },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
      );
    }
    const all = await fetchProtocols(req.signal);
    const top = all.sort((a, b) => b.tvl - a.tvl).slice(0, limit);
    return Response.json(
      { source: "defillama", scope, count: top.length, protocols: top },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
