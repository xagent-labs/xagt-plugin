"use client";

import { useEffect, useState } from "react";
import { ChartNoAxesCombined, Database, Lock, RefreshCw, Star } from "lucide-react";
import { PageHeader, PageShell, EmptyState } from "@/components/app/page-header";
import type { MarketCoin } from "@/lib/sources/coingecko";
import { useWatchlist } from "@/lib/stores/watchlist";
import { cn } from "@/lib/utils";

interface MarketResponse {
  source: string;
  count: number;
  coins: MarketCoin[];
  error?: string;
}

export default function MarketPage() {
  const [data, setData] = useState<MarketCoin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const watchlist = useWatchlist((s) => s.entries);
  const addToWatchlist = useWatchlist((s) => s.add);
  const removeFromWatchlist = useWatchlist((s) => s.remove);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const pinned = new Set(watchlist.map((e) => e.id));

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market?per_page=30");
      const json = (await res.json()) as MarketResponse;
      if (!res.ok || json.error) throw new Error(json.error ?? `request failed: ${res.status}`);
      setData(json.coins);
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
        kicker="market intel"
        tone="cyan"
        title="Market Intel"
        description="Live price action routed through public providers — never paid APIs."
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="hidden items-center gap-1.5 rounded-md border border-cyan/40 bg-cyan/10 px-3 py-1.5 text-xs font-medium text-cyan transition-colors hover:bg-cyan/20 sm:inline-flex disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </button>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Price source", value: "CoinGecko · public", icon: Database, tone: "text-cyan" },
          { label: "On-chain", value: "DefiLlama · public", icon: Database, tone: "text-electric" },
          { label: "Paid APIs", value: "none", icon: Lock, tone: "text-success" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md"
            >
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <Icon className={`h-3 w-3 ${s.tone}`} />
                {s.label}
              </div>
              <div className="mt-2 text-base font-medium">{s.value}</div>
            </div>
          );
        })}
      </div>

      {error ? (
        <EmptyState
          icon={ChartNoAxesCombined}
          title="Market feed unreachable"
          description={error}
          hint="GET https://api.coingecko.com/api/v3/coins/markets"
        />
      ) : !data && loading ? (
        <div className="mt-8 rounded-2xl border border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Loading CoinGecko…
        </div>
      ) : data && data.length === 0 ? (
        <EmptyState
          icon={ChartNoAxesCombined}
          title="No coins returned"
          description="CoinGecko returned an empty market list. Try refreshing."
        />
      ) : data ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-md">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-3 sm:px-4">#</th>
                  <th className="px-2 py-3 sm:px-4">Asset</th>
                  <th className="px-2 py-3 text-right sm:px-4">Price</th>
                  <th className="px-2 py-3 text-right sm:px-4">24h</th>
                  <th className="hidden px-2 py-3 text-right sm:table-cell sm:px-4">Market Cap</th>
                  <th className="hidden px-2 py-3 text-right md:table-cell md:px-4">Volume 24h</th>
                  <th className="px-2 py-3 text-right sm:px-4">·</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c, i) => (
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
                    <td className="hidden px-2 py-3 text-right font-mono tabular-nums text-muted-foreground sm:table-cell sm:px-4">
                      ${formatCompact(c.market_cap)}
                    </td>
                    <td className="hidden px-2 py-3 text-right font-mono tabular-nums text-muted-foreground md:table-cell md:px-4">
                      ${formatCompact(c.total_volume)}
                    </td>
                    <td className="px-2 py-3 text-right sm:px-4">
                      {mounted ? (
                        <button
                          type="button"
                          onClick={() =>
                            pinned.has(c.id)
                              ? removeFromWatchlist(c.id)
                              : addToWatchlist({ id: c.id, symbol: c.symbol })
                          }
                          aria-label={pinned.has(c.id) ? "Remove from watchlist" : "Add to watchlist"}
                          title={pinned.has(c.id) ? "Remove from watchlist" : "Add to watchlist"}
                          className={cn(
                            "inline-grid h-8 w-8 place-items-center rounded-md border transition-colors",
                            pinned.has(c.id)
                              ? "border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/20"
                              : "border-border bg-background/40 text-muted-foreground hover:border-cyan/40 hover:text-cyan",
                          )}
                        >
                          <Star className={cn("h-3.5 w-3.5", pinned.has(c.id) && "fill-current")} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </PageShell>
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
