import { NextRequest } from "next/server";
import { DEFAULT_FEEDS, fetchAllFeeds } from "@/lib/sources/rss";
import { aggregateNarratives } from "@/lib/sources/narratives";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(req: NextRequest) {
  try {
    const items = await fetchAllFeeds(DEFAULT_FEEDS, req.signal);
    const narratives = aggregateNarratives(items);
    return Response.json(
      {
        source: "rss-clustered",
        feeds: DEFAULT_FEEDS.map((f) => f.name),
        items: items.length,
        narratives,
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
