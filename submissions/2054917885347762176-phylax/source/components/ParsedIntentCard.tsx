"use client";

import { ThesisIntent } from "../lib/schemas";
import { getChainById } from "../lib/chains";
import { Settings2 } from "lucide-react";
import { motion } from "framer-motion";

export function ParsedIntentCard({ intent }: { intent: ThesisIntent | null }) {
  if (!intent) return null;

  const chainConfig = getChainById(intent.chain);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-2xl p-5 shadow-soft"
      style={{ background: "var(--card)" }}
    >
      <h3 className="text-xs font-bold text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-[0.15em]">
        <span className="bg-electric/10 text-electric p-1.5 rounded-lg">
          <Settings2 size={14} />
        </span>
        Parsed Configuration
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="block text-muted-foreground text-[10px] mb-1 uppercase tracking-wider font-bold">Max Budget</span>
          <span className="text-foreground font-bold">${intent.maxBudgetUsd}</span>
        </div>
        <div>
          <span className="block text-muted-foreground text-[10px] mb-1 uppercase tracking-wider font-bold">Risk Mode</span>
          <span className="text-foreground font-bold capitalize">{intent.riskMode}</span>
        </div>
        <div>
          <span className="block text-muted-foreground text-[10px] mb-1 uppercase tracking-wider font-bold">Chain</span>
          <span className="text-foreground font-bold">{chainConfig.name}</span>
          <span className="block text-muted-foreground text-[9px] font-mono">Index: {chainConfig.chainIndex}</span>
        </div>
        <div>
          <span className="block text-muted-foreground text-[10px] mb-1 uppercase tracking-wider font-bold">Simulation</span>
          <span className="text-foreground font-bold">{intent.requireSimulation ? "Required" : "Optional"}</span>
        </div>
      </div>
    </motion.div>
  );
}
