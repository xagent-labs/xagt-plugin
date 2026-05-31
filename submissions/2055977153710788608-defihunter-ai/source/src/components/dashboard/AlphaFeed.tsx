"use client";

import { motion } from "framer-motion";
import type { AlphaItem } from "@/types/agent";
import { NeonCard } from "@/components/ui/NeonCard";

interface AlphaFeedProps {
  items: AlphaItem[];
  loading?: boolean;
}

export function AlphaFeed({ items, loading }: AlphaFeedProps) {
  return (
    <NeonCard title="Alpha Feed" delay={0.2}>
      {loading ? (
        <motion.div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="h-16 rounded border border-hunter-border bg-hunter-border/20"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      ) : items.length === 0 ? (
        <p className="text-sm text-hunter-muted">No narratives detected yet</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded border border-hunter-border bg-hunter-bg/50 p-3"
            >
              <motion.div
                className="flex items-center justify-between"
                whileHover={{ x: 2 }}
              >
                <span className="font-bold text-hunter-text">{item.narrative}</span>
                <span className="text-hunter-neon">{item.strength}%</span>
              </motion.div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-hunter-border">
                <motion.div
                  className="h-full bg-gradient-to-r from-hunter-neonDim to-hunter-neon"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.strength}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
              </div>
              <p className="mt-2 text-[10px] text-hunter-muted">
                {item.tokens.join(" · ")}
              </p>
            </motion.li>
          ))}
        </ul>
      )}
    </NeonCard>
  );
}
