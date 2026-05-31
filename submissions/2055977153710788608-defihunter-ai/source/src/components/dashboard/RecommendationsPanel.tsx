"use client";

import { motion } from "framer-motion";
import type { RecommendedAction } from "@/types/agent";
import { NeonCard } from "@/components/ui/NeonCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface RecommendationsPanelProps {
  actions: RecommendedAction[];
}

export function RecommendationsPanel({ actions }: RecommendationsPanelProps) {
  const variant = (t: RecommendedAction["type"]) =>
    t === "avoid" ? "danger" : t === "deposit" ? "success" : "neutral";

  return (
    <NeonCard title="Agent Actions" delay={0.18}>
      {actions.length === 0 ? (
        <p className="text-xs text-hunter-muted">Run the agent to generate recommendations</p>
      ) : (
        <ul className="space-y-2">
          {actions.map((a, i) => (
            <li
              key={`${a.type}-${i}`}
              className="rounded border border-hunter-border/50 p-2 text-xs"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start justify-between gap-2"
              >
                <motion.div>
                  <p className="font-bold text-hunter-neon">{a.title}</p>
                  <p className="mt-1 text-hunter-muted">{a.detail}</p>
                </motion.div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge label={a.type} variant={variant(a.type)} />
                  <span className="text-[10px] text-hunter-cyan">
                    {(a.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </motion.div>
            </li>
          ))}
        </ul>
      )}
    </NeonCard>
  );
}
