"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Radar,
  Zap,
  Waves,
  Network,
  Megaphone,
} from "lucide-react";
import type { Signal } from "@/lib/types";
import type { LucideIcon } from "@/lib/lucide";
import { cn, relativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/confidence-badge";

const TYPE_META: Record<
  Signal["type"],
  { icon: LucideIcon; label: string; tone: string }
> = {
  breakout: { icon: Zap, label: "Breakout", tone: "text-electric border-electric/30 bg-electric/10" },
  reversal: { icon: Activity, label: "Reversal", tone: "text-plasma border-plasma/30 bg-plasma/10" },
  narrative: { icon: Megaphone, label: "Narrative", tone: "text-cyan border-cyan/30 bg-cyan/10" },
  volatility: { icon: Waves, label: "Volatility", tone: "text-warning border-warning/30 bg-warning/10" },
  onchain: { icon: Network, label: "On-chain", tone: "text-success border-success/30 bg-success/10" },
  social: { icon: Radar, label: "Social", tone: "text-plasma border-plasma/30 bg-plasma/10" },
};

export function SignalCard({ signal }: { signal: Signal }) {
  const meta = TYPE_META[signal.type];
  const Icon = meta.icon;
  const DirectionIcon =
    signal.direction === "bullish" ? TrendingUp :
    signal.direction === "bearish" ? TrendingDown :
    Activity;
  const directionCls =
    signal.direction === "bullish" ? "text-bullish" :
    signal.direction === "bearish" ? "text-bearish" :
    "text-muted-foreground";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-electric/40 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("grid h-10 w-10 place-items-center rounded-lg border", meta.tone)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold tracking-tight">{signal.asset}</span>
              <Badge variant="outline" className="lowercase">{meta.label}</Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">{signal.timeframe}</span>
              <span>·</span>
              <span>{relativeTime(signal.timestamp)}</span>
            </div>
          </div>
        </div>
        <div className={cn("flex flex-col items-end", directionCls)}>
          <DirectionIcon className="h-5 w-5" />
          <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider">
            {signal.direction}
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{signal.reason}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <div className="rounded border border-border/60 bg-background/30 px-2 py-1.5">
          <div className="text-[9px]">Strength</div>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-secondary/40">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric to-plasma"
                style={{ width: `${Math.round(signal.strength * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-foreground normal-case">
              {Math.round(signal.strength * 100)}
            </span>
          </div>
        </div>
        <div className="rounded border border-border/60 bg-background/30 px-2 py-1.5">
          <div className="text-[9px]">Confidence</div>
          <div className="mt-1">
            <ConfidenceBadge value={signal.confidence} showIcon={false} />
          </div>
        </div>
      </div>

      {signal.sources.length > 0 && (
        <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">{signal.sources.length} source{signal.sources.length === 1 ? "" : "s"}</span>
          <span>·</span>
          <span className="truncate font-mono">{signal.sources.slice(0, 2).map((s) => s.domain).join(", ")}</span>
        </div>
      )}
    </motion.div>
  );
}
