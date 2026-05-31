"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Radio, RefreshCw } from "lucide-react";
import { SignalCard } from "@/components/signal-card";
import { PageHeader, PageShell, EmptyState } from "@/components/app/page-header";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/types";

interface SignalsResponse {
  source?: string;
  generatedAt?: string;
  narrativesUsed?: number;
  marketCoins?: number;
  signals?: Signal[];
  error?: string;
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [meta, setMeta] = useState<{ generatedAt?: string; source?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(refresh ? "/api/signals?refresh=1" : "/api/signals");
      const json = (await res.json()) as SignalsResponse;
      if (!res.ok || json.error) throw new Error(json.error ?? `request failed: ${res.status}`);
      setSignals(json.signals ?? []);
      setMeta({ generatedAt: json.generatedAt, source: json.source });
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
        kicker="autonomous signals"
        tone="success"
        title="Signals"
        description="Trade-grade signals from live RSS narratives and CoinGecko market data, synthesized by the signal agent via OpenRouter."
        actions={
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            {loading ? "Generating…" : "Refresh"}
          </button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 grid gap-3 sm:grid-cols-3"
      >
        {[
          ["Generation", "narrative cluster + CoinGecko"],
          ["Confidence model", "calibrated via OpenRouter LLM"],
          ["Replay", "every signal is fully auditable"],
        ].map(([label, value]) => (
          <motion.div
            key={label}
            className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md"
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 text-sm font-medium">{value}</div>
          </motion.div>
        ))}
      </motion.div>

      {meta?.generatedAt && !error && (
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">
          generated {new Date(meta.generatedAt).toLocaleString()} · {meta.source}
        </p>
      )}

      {error ? (
        <EmptyState
          icon={Radio}
          title="Signal generation failed"
          description={error}
          hint="GET /api/signals · OPENROUTER_API_KEY in .env.local"
        />
      ) : !signals && loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 rounded-2xl border border-border bg-card/40 p-10 text-center text-sm text-muted-foreground"
        >
          Fetching narratives & market data, generating signals via OpenRouter…
          <p className="mt-2 font-mono text-[11px] text-muted-foreground/80">
            first load may take 15–30s
          </p>
        </motion.div>
      ) : signals && signals.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No signals generated"
          description="The model returned no actionable signals from the current feed snapshot. Try refreshing when narratives or market data have more activity."
        />
      ) : signals ? (
        <motion.div className="mt-6 grid gap-4 lg:grid-cols-2">
          {signals.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <SignalCard signal={s} />
            </motion.div>
          ))}
        </motion.div>
      ) : null}
    </PageShell>
  );
}
