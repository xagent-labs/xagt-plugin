"use client";

import { motion } from "framer-motion";
import type { RiskAlert } from "@/types/agent";
import { NeonCard } from "@/components/ui/NeonCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface RiskPanelProps {
  alerts: RiskAlert[];
}

export function RiskPanel({ alerts }: RiskPanelProps) {
  const variant = (s: RiskAlert["severity"]) =>
    s === "critical" || s === "high" ? "danger" : s === "medium" ? "warning" : "neutral";

  return (
    <NeonCard title="Risk Monitor" delay={0.15}>
      {alerts.length === 0 ? (
        <p className="text-sm text-hunter-neon">All monitored protocols within threshold</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a, i) => (
            <li
              key={`${a.protocol}-${i}`}
              className="flex items-start justify-between gap-2 rounded border border-hunter-border/60 p-2 text-xs"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="font-bold text-hunter-text">{a.protocol}</span>
                <p className="mt-1 text-hunter-muted">{a.message}</p>
              </motion.div>
              <StatusBadge label={a.severity} variant={variant(a.severity)} />
            </li>
          ))}
        </ul>
      )}
    </NeonCard>
  );
}
