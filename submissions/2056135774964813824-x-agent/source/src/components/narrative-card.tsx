"use client";

import { motion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";
import type { Narrative } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/charts/sparkline";

const COLOR_MAP = {
  electric: "from-electric/30 to-transparent text-electric stroke-electric",
  plasma: "from-plasma/30 to-transparent text-plasma stroke-plasma",
  cyan: "from-cyan/30 to-transparent text-cyan stroke-cyan",
  success: "from-success/30 to-transparent text-success stroke-success",
  warning: "from-warning/30 to-transparent text-warning stroke-warning",
  danger: "from-destructive/30 to-transparent text-destructive stroke-destructive",
} as const;

export function NarrativeCard({ narrative }: { narrative: Narrative }) {
  const tone = COLOR_MAP[narrative.color];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card/60 p-5 backdrop-blur-md"
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30 group-hover:opacity-60 transition-opacity", tone)} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider", tone.split(" ").find((c) => c.startsWith("text-")))}>
                <Flame className="h-3 w-3" /> narrative
              </span>
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight">{narrative.name}</div>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{narrative.description}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Momentum</div>
            <div className={cn("text-2xl font-semibold", tone.split(" ").find((c) => c.startsWith("text-")))}>
              {narrative.momentum}
            </div>
          </div>
        </div>

        <div className="mt-4 h-10">
          <Sparkline data={narrative.spark} className={tone.split(" ").find((c) => c.startsWith("stroke-"))!} />
        </div>

        <div
          className={cn(
            "mt-3 grid gap-2 text-[10px] uppercase tracking-wider text-muted-foreground",
            narrative.volume24h > 0 ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          <Mini label="Sentiment" value={(narrative.sentiment * 100).toFixed(0) + "%"} />
          {narrative.volume24h > 0 ? (
            <Mini label="Volume 24h" value={"$" + formatNumber(narrative.volume24h)} />
          ) : null}
          <Mini label="Mentions" value={formatNumber(narrative.mentions)} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {narrative.topTokens.map((t) => (
            <Badge key={t} variant="secondary">{t}</Badge>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <TrendingUp className="h-3 w-3 text-success" />
          autonomous detection · live
        </div>
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
