"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NeonCard } from "@/components/ui/NeonCard";

interface GasRow {
  chainId: number;
  chainName: string;
  standardGwei: number;
  estimatedTransferUsd: number;
  congestion: string;
}

export function GasTracker() {
  const [rows, setRows] = useState<GasRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gas")
      .then((r) => r.json())
      .then((d) => setRows(d.snapshots ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <NeonCard title="Gas Tracker" delay={0.12}>
      {loading ? (
        <p className="animate-pulse text-xs text-hunter-muted">Fetching gas…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-hunter-muted">Gas data unavailable</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((g, i) => (
            <motion.li
              key={g.chainId}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center justify-between rounded border border-hunter-border/60 px-2 py-1.5 text-xs"
            >
              <span className="font-bold text-hunter-text">{g.chainName}</span>
              <span className="text-hunter-neon">{g.standardGwei} gwei</span>
              <span className="text-hunter-muted">${g.estimatedTransferUsd}</span>
              <span
                className={
                  g.congestion === "high"
                    ? "text-hunter-danger"
                    : g.congestion === "low"
                      ? "text-hunter-neon"
                      : "text-hunter-amber"
                }
              >
                {g.congestion}
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    </NeonCard>
  );
}
