"use client";

import { motion } from "framer-motion";
import type { YieldRankItem } from "@/types/agent";
import { NeonCard } from "@/components/ui/NeonCard";
import { formatApy, formatUsd, safeNum } from "@/lib/utils/format";

interface YieldTableProps {
  yields: YieldRankItem[];
  loading?: boolean;
}

export function YieldTable({ yields, loading }: YieldTableProps) {
  return (
    <NeonCard title="Yield Radar" glow delay={0.1}>
      {loading ? (
        <motion.div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-hunter-border/40" />
          ))}
        </motion.div>
      ) : yields.length === 0 ? (
        <p className="text-sm text-hunter-muted">Run agent scan to populate yields</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hunter-border text-hunter-muted">
                <th className="pb-2 pr-4">Protocol</th>
                <th className="pb-2 pr-4">Pool</th>
                <th className="pb-2 pr-4">APY</th>
                <th className="pb-2 pr-4">TVL</th>
                <th className="pb-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {yields.map((y) => (
                <tr key={`${y.protocol}-${y.pool}`} className="border-b border-hunter-border/50 hover:bg-hunter-neon/5">
                  <td className="py-2 pr-4 font-bold text-hunter-neon">{y.protocol}</td>
                  <td className="py-2 pr-4 text-hunter-text">{y.pool}</td>
                  <td className="py-2 pr-4 text-hunter-neon">{formatApy(y.apy)}</td>
                  <td className="py-2 pr-4">{formatUsd(y.tvlUsd)}</td>
                  <td className={`py-2 ${safeNum(y.riskScore) > 50 ? "text-hunter-danger" : "text-hunter-muted"}`}>
                    {safeNum(y.riskScore)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </NeonCard>
  );
}
