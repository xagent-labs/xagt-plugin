"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, RefreshCw, TrendingUp } from "lucide-react";
import { NarrativeCard } from "@/components/narrative-card";
import { PageHeader, PageShell, EmptyState } from "@/components/app/page-header";
import { cn } from "@/lib/utils";
import type { Narrative } from "@/lib/types";

interface NarrativesResponse {
  source: string;
  feeds: string[];
  items: number;
  narratives: Narrative[];
  error?: string;
}

export default function NarrativesPage() {
  const [data, setData] = useState<Narrative[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/narratives");
      const json = (await res.json()) as NarrativesResponse;
      if (!res.ok || json.error) throw new Error(json.error ?? `request failed: ${res.status}`);
      setData(json.narratives);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sorted = data ? [...data].sort((a, b) => b.momentum - a.momentum) : [];
  const top = sorted[0];

  return (
    <PageShell>
      <PageHeader
        kicker="sector rotation · live"
        tone="plasma"
        title="Narratives"
        description="The narrative agent clusters real public-RSS mentions into emerging sectors. Momentum is the exponentially-decayed mention count over the last 24h; sentiment is derived from bullish vs. bearish keyword frequency."
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-plasma/40 bg-plasma/10 px-3 py-1.5 text-xs font-medium text-plasma transition-colors hover:bg-plasma/20 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Refresh
            </button>
            {top && top.mentions > 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 backdrop-blur-md">
                <Flame className="h-3.5 w-3.5 text-plasma" />
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  top
                </div>
                <div className="text-sm font-medium">{top.name}</div>
                <div className="font-mono text-[11px] text-plasma">{top.momentum}</div>
              </div>
            ) : null}
          </div>
        }
      />

      <div className="mt-6 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
        <TrendingUp className="h-3 w-3 text-success" />
        clustered from public RSS · no Twitter API · no Reddit API · no paid feeds
      </div>

      {error ? (
        <EmptyState
          icon={Flame}
          title="Narrative aggregator unreachable"
          description={error}
          hint="GET /api/narratives · feeds in src/lib/sources/rss.ts"
        />
      ) : !data && loading ? (
        <div className="mt-8 rounded-2xl border border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Clustering public feeds…
        </div>
      ) : data && data.every((n) => n.mentions === 0) ? (
        <EmptyState
          icon={Flame}
          title="No clustered mentions in the last 24h"
          description="The configured RSS feeds returned items but none matched any narrative keyword. Try refreshing later."
          hint="categories in src/lib/narratives.ts"
        />
      ) : data ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <NarrativeCard narrative={n} />
            </motion.div>
          ))}
        </div>
      ) : null}
    </PageShell>
  );
}
