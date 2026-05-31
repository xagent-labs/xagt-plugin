"use client";

import { motion } from "framer-motion";
import {
  Activity, Wallet, Coins, Radio, Layers, Shield, Network,
  PieChart, Boxes, ChartNoAxesCombined, BarChart3, BadgeCheck,
} from "lucide-react";
import type { Skill, SkillCategory } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "@/lib/lucide";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<SkillCategory, { icon: LucideIcon; tone: string }> = {
  dex: { icon: ChartNoAxesCombined, tone: "text-electric border-electric/30 bg-electric/10" },
  wallet: { icon: Wallet, tone: "text-cyan border-cyan/30 bg-cyan/10" },
  signal: { icon: Radio, tone: "text-plasma border-plasma/30 bg-plasma/10" },
  strategy: { icon: BarChart3, tone: "text-success border-success/30 bg-success/10" },
  dapp: { icon: Boxes, tone: "text-cyan border-cyan/30 bg-cyan/10" },
  security: { icon: Shield, tone: "text-warning border-warning/30 bg-warning/10" },
  onchain: { icon: Network, tone: "text-electric border-electric/30 bg-electric/10" },
  portfolio: { icon: PieChart, tone: "text-plasma border-plasma/30 bg-plasma/10" },
  bridge: { icon: Layers, tone: "text-cyan border-cyan/30 bg-cyan/10" },
  market: { icon: ChartNoAxesCombined, tone: "text-electric border-electric/30 bg-electric/10" },
  narrative: { icon: Coins, tone: "text-plasma border-plasma/30 bg-plasma/10" },
};

export function SkillCard({ skill }: { skill: Skill }) {
  const meta = CATEGORY_META[skill.category];
  const Icon = meta.icon;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-md p-5"
    >
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-electric/40 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn("grid h-10 w-10 place-items-center rounded-lg border", meta.tone)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">{skill.name}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{skill.category}</div>
          </div>
        </div>
        {skill.installed && (
          <Badge variant="success">
            <BadgeCheck className="h-3 w-3" /> Installed
          </Badge>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{skill.description}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Mini label="Executions 24h" value={skill.executions24h.toLocaleString()} />
        <Mini label="Latency" value={`${skill.latencyMs}ms`} />
        <Mini label="Agents" value={`${skill.compatibleAgents.length}`} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Activity className="h-3 w-3 text-electric animate-pulse-glow" />
        <span className="font-mono truncate">last invocation just now</span>
      </div>
    </motion.div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 bg-background/30 px-2 py-1.5">
      <div className="text-[9px]">{label}</div>
      <div className="mt-0.5 text-xs text-foreground normal-case tracking-normal">{value}</div>
    </div>
  );
}
