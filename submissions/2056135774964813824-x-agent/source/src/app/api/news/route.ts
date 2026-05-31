import { NextRequest } from "next/server";
import { DEFAULT_FEEDS, fetchAllFeeds } from "@/lib/sources/rss";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number.parseInt(url.searchParams.get("limit") ?? "60", 10) || 60));

  try {
    const all = await fetchAllFeeds(DEFAULT_FEEDS, req.signal);
    const items = all.slice(0, limit);
    return Response.json(
      {
        source: "rss",
        feeds: DEFAULT_FEEDS.map((f) => f.name),
        count: items.length,
        items,
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
