"use client";

import { motion } from "framer-motion";
import { useDeFiHunterStore } from "@/store/defihunter-store";

const METRICS = [
  { key: "sentiment", label: "Sentiment" },
  { key: "yields", label: "Yields Tracked" },
  { key: "alpha", label: "Alpha Signals" },
  { key: "alerts", label: "Risk Alerts" },
] as const;

export function MetricsBar() {
  const { marketSentiment, topYields, alphaFeed, riskAlerts, isDashboardLoading } =
    useDeFiHunterStore();

  const values: Record<string, string> = {
    sentiment: marketSentiment.toUpperCase(),
    yields: String(topYields.length),
    alpha: String(alphaFeed.length),
    alerts: String(riskAlerts.length),
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {METRICS.map((m, i) => (
        <motion.div
          key={m.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="rounded-lg border border-hunter-border bg-hunter-panel/60 px-4 py-3"
        >
          <p className="text-[10px] uppercase tracking-widest text-hunter-muted">{m.label}</p>
          <p
            className={`mt-1 font-display text-2xl font-bold ${
              isDashboardLoading ? "animate-pulse text-hunter-muted" : "text-hunter-neon"
            }`}
          >
            {isDashboardLoading ? "—" : values[m.key]}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
