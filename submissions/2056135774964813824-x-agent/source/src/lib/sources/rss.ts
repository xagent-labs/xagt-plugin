/**
 * RSS aggregator — public feeds only. No paid APIs. No Twitter API. No Reddit API.
 *
 * Parses an RFC 822-ish RSS 2.0 / Atom XML payload into a normalized item shape
 * without bringing in a heavy parser. Tolerant of <![CDATA[…]]> wrappers.
 */

export interface RSSItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
}

export interface RSSFeedConfig {
  name: string;
  url: string;
}

export const DEFAULT_FEEDS: RSSFeedConfig[] = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "The Block", url: "https://www.theblock.co/rss.xml" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "Bankless", url: "https://newsletter.banklesshq.com/feed" },
];

async function fetchFeed(
  feed: RSSFeedConfig,
  signal?: AbortSignal,
): Promise<RSSItem[]> {
  const res = await fetch(feed.url, {
    signal,
    next: { revalidate: 300 },
    headers: { Accept: "application/rss+xml, application/atom+xml, text/xml" },
  });
  if (!res.ok) {
    throw new Error(`RSS ${feed.name} failed: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  return parseFeed(xml, feed.name);
}

export async function fetchAllFeeds(
  feeds: RSSFeedConfig[] = DEFAULT_FEEDS,
  signal?: AbortSignal,
): Promise<RSSItem[]> {
  const settled = await Promise.allSettled(feeds.map((f) => fetchFeed(f, signal)));
  const items = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return items.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

/** Tiny XML island parser — pulls <item>/<entry> bodies, no DOM, no deps. */
function parseFeed(xml: string, source: string): RSSItem[] {
  const items: RSSItem[] = [];
  // RSS 2.0 <item>…</item>  OR  Atom <entry>…</entry>
  const re = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const body = m[2];
    const title = clean(pick(body, "title"));
    const link = pickLink(body);
    const date =
      pick(body, "pubDate") ||
      pick(body, "published") ||
      pick(body, "updated") ||
      pick(body, "dc:date") ||
      new Date().toISOString();
    const summary = clean(
      pick(body, "description") || pick(body, "summary") || pick(body, "content"),
    );
    if (!title || !link) continue;
    items.push({
      id: `${source}:${link}`,
      title,
      url: link,
      source,
      publishedAt: new Date(date).toISOString(),
      summary: summary || undefined,
    });
  }
  return items;
}

function pick(body: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

function pickLink(body: string): string {
  // Try Atom <link href="…"/> first
  const atom = body.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (atom) return atom[1];
  // Fall back to RSS <link>…</link>
  return clean(pick(body, "link"));
}

function clean(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
