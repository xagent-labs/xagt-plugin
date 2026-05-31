"use client";

import { useEffect, useState } from "react";
import { Bookmark, RefreshCw, Star, Trash2, TrendingUp } from "lucide-react";
import { PageHeader, PageShell, EmptyState } from "@/components/app/page-header";
import { useWatchlist } from "@/lib/stores/watchlist";
import type { MarketCoin } from "@/lib/sources/coingecko";
import { cn } from "@/lib/utils";

interface MarketResponse {
  source: string;
  count: number;
  coins: MarketCoin[];
  error?: string;
}

export default function WatchlistPage() {
  const entries = useWatchlist((s) => s.entries);
  const remove = useWatchlist((s) => s.remove);
  const clear = useWatchlist((s) => s.clear);

  const [coins, setCoins] = useState<MarketCoin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function load(ids: string[]) {
    if (!ids.length) {
      setCoins([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/market?ids=${encodeURIComponent(ids.join(","))}&per_page=${Math.min(250, Math.max(ids.length, 1))}`);
      const json = (await res.json()) as MarketResponse;
      if (!res.ok || json.error) throw new Error(json.error ?? `request failed: ${res.status}`);
      setCoins(json.coins);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mounted) return;
    void load(entries.map((e) => e.id));
  }, [mounted, entries]);

  const ordered = coins
    ? entries
        .map((e) => coins.find((c) => c.id === e.id))
        .filter((c): c is MarketCoin => Boolean(c))
    : [];

  return (
    <PageShell>
      <PageHeader
        kicker="your tracked assets"
        tone="cyan"
        title="Watchlist"
        description="Pin assets from Market Intel. The watchlist is stored locally in your browser — no account, no server sync."
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => load(entries.map((e) => e.id))}
              disabled={loading || entries.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-cyan/40 bg-cyan/10 px-3 py-1.5 text-xs font-medium text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Refresh
            </button>
            {entries.length > 0 ? (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            ) : null}
          </div>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Tile
          label="Tracking"
          value={mounted ? `${entries.length} asset${entries.length === 1 ? "" : "s"}` : "—"}
          icon={Star}
          tone="text-cyan"
        />
        <Tile label="Price feed" value="CoinGecko · public" icon={TrendingUp} tone="text-electric" />
        <Tile label="Sync" value="local · no account" icon={Bookmark} tone="text-success" />
      </div>

      {!mounted ? null : entries.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Your watchlist is empty"
          description="Pin assets from Market Intel using the star button. Watchlist is persisted locally — no account required, no server sync."
          hint="localStorage · key: xagent.watchlist · array of {id, symbol, chain}"
        />
      ) : error ? (
        <EmptyState
          icon={TrendingUp}
          title="Price feed unreachable"
          description={error}
          hint="GET /api/market?ids=…"
        />
      ) : !coins && loading ? (
        <div className="mt-8 rounded-2xl border border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Resolving against CoinGecko…
        </div>
      ) : coins && ordered.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No prices returned"
          description="CoinGecko returned an empty list for the pinned ids. They may have been delisted or renamed."
        />
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-md">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-3 sm:px-4">#</th>
                  <th className="px-2 py-3 sm:px-4">Asset</th>
                  <th className="px-2 py-3 text-right sm:px-4">Price</th>
                  <th className="px-2 py-3 text-right sm:px-4">24h</th>
                  <th className="hidden px-2 py-3 text-right md:table-cell md:px-4">Market Cap</th>
                  <th className="px-2 py-3 text-right sm:px-4">·</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((c, i) => (
                  <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-card/60">
                    <td className="px-2 py-3 font-mono text-[11px] text-muted-foreground sm:px-4">{i + 1}</td>
                    <td className="px-2 py-3 sm:px-4">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-medium">{c.name}</span>
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">{c.symbol}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right font-mono tabular-nums sm:px-4">
                      ${formatPrice(c.current_price)}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-3 text-right font-mono tabular-nums sm:px-4",
                        c.price_change_percentage_24h >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {c.price_change_percentage_24h >= 0 ? "+" : ""}
                      {c.price_change_percentage_24h?.toFixed(2)}%
                    </td>
                    <td className="hidden px-2 py-3 text-right font-mono tabular-nums text-muted-foreground md:table-cell md:px-4">
                      ${formatCompact(c.market_cap)}
                    </td>
                    <td className="px-2 py-3 text-right sm:px-4">
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        aria-label="Remove from watchlist"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background/40 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function Tile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3 w-3 ${tone}`} />
        {label}
      </div>
      <div className="mt-2 text-base font-medium">{value}</div>
    </div>
  );
}

function formatPrice(n: number): string {
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 0.01) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}
