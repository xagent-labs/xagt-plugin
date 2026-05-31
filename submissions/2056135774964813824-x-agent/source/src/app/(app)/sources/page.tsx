"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Globe, Newspaper, RefreshCw, Rss, ShieldCheck } from "lucide-react";
import { PageHeader, PageShell, EmptyState } from "@/components/app/page-header";
import type { RSSItem } from "@/lib/sources/rss";
import { cn, pickHost, relativeTime } from "@/lib/utils";

interface NewsResponse {
  source: string;
  feeds: string[];
  count: number;
  items: RSSItem[];
  error?: string;
}

const FEED_GROUPS = [
  {
    label: "News",
    color: "text-electric",
    items: ["CoinDesk · RSS", "The Block · RSS", "Decrypt · RSS", "Bankless · RSS"],
  },
  {
    label: "On-chain",
    color: "text-cyan",
    items: ["DefiLlama · public", "Etherscan · public", "Solscan · public"],
  },
  {
    label: "Market",
    color: "text-success",
    items: ["CoinGecko · public", "GeckoTerminal · public"],
  },
];

export default function SourcesPage() {
  const [items, setItems] = useState<RSSItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news?limit=40");
      const json = (await res.json()) as NewsResponse;
      if (!res.ok || json.error) throw new Error(json.error ?? `request failed: ${res.status}`);
      setItems(json.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <PageShell>
      <PageHeader
        kicker="public data only"
        tone="success"
        title="Sources"
        description="Every fact this terminal surfaces is traceable to a public source. No Twitter API, no Reddit API, no paid data feeds — RSS, public REST and on-chain explorers only."
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Refresh
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 font-mono text-[11px] backdrop-blur-md">
              <ShieldCheck className="h-3 w-3 text-success" />
              <span className="text-foreground">100%</span>
              <span className="text-muted-foreground">public</span>
            </div>
          </div>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {FEED_GROUPS.map((g) => (
          <div
            key={g.label}
            className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <Rss className={`h-3 w-3 ${g.color}`} />
              {g.label}
            </div>
            <ul className="mt-3 space-y-2">
              {g.items.map((i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-background/30 px-3 py-2 text-xs text-foreground/80"
                >
                  <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono">{i}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {error ? (
        <EmptyState
          icon={Newspaper}
          title="RSS aggregator unreachable"
          description={error}
          hint="GET /api/news · feeds in src/lib/sources/rss.ts"
        />
      ) : items === null && loading ? (
        <div className="mt-8 rounded-2xl border border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Crawling public feeds…
        </div>
      ) : items && items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No items"
          description="The aggregated feeds returned nothing. Try refreshing."
        />
      ) : items ? (
        <div className="mt-8 rounded-2xl border border-border bg-card/40 p-3 backdrop-blur-md">
          <div className="mb-2 flex items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <Newspaper className="h-3 w-3 text-electric" />
            <span>recent · public RSS · {items.length} items</span>
          </div>
          <ul className="divide-y divide-border/60">
            {items.map((it) => (
              <li key={it.id}>
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-3 px-2 py-3 hover:bg-card/60"
                >
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border bg-background/60 text-muted-foreground">
                    <Newspaper className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span className="font-mono">{pickHost(it.url)}</span>
                      <span>·</span>
                      <span className="font-mono">{it.source}</span>
                      <span>·</span>
                      <span>{relativeTime(it.publishedAt)}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium leading-snug">
                      {it.title}
                      <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 -translate-y-0.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-1" />
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PageShell>
  );
}
