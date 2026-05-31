"use client";

import { motion } from "framer-motion";
import { Activity, Cpu, Radio, Sparkles, Wrench } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { cn, relativeTime } from "@/lib/utils";

type ActivityKind = "agent" | "skill" | "thought" | "source";

interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  agent?: string;
  label: string;
  detail?: string;
  ts: string;
}

const ICONS: Record<ActivityKind, any> = {
  agent: Cpu,
  skill: Wrench,
  thought: Sparkles,
  source: Radio,
};

const TONE: Record<ActivityKind, string> = {
  agent: "text-electric border-electric/30 bg-electric/10",
  skill: "text-warning border-warning/30 bg-warning/10",
  thought: "text-plasma border-plasma/30 bg-plasma/10",
  source: "text-cyan border-cyan/30 bg-cyan/10",
};

const ENTRIES: ActivityEntry[] = [
  {
    id: "e1",
    kind: "agent",
    agent: "Research Agent",
    label: "Resolving query intent",
    detail: "entities: ETH, SOL · timeframe: 7d",
    ts: new Date(Date.now() - 1000 * 14).toISOString(),
  },
  {
    id: "e2",
    kind: "skill",
    agent: "Market Agent",
    label: "okx.dex.market(ETH/USDC)",
    detail: "depth=top5 · routes=14",
    ts: new Date(Date.now() - 1000 * 38).toISOString(),
  },
  {
    id: "e3",
    kind: "source",
    label: "fetched theblock.co",
    detail: "21.4k tokens · canonical body extracted",
    ts: new Date(Date.now() - 1000 * 62).toISOString(),
  },
  {
    id: "e4",
    kind: "thought",
    agent: "Narrative Agent",
    label: "Detected restaking momentum",
    detail: "weight ↑ from 0.61 → 0.74",
    ts: new Date(Date.now() - 1000 * 95).toISOString(),
  },
  {
    id: "e5",
    kind: "skill",
    agent: "Signal Agent",
    label: "okx.onchain.gateway(staking_inflows_24h)",
    detail: "delta=+18.2% wow",
    ts: new Date(Date.now() - 1000 * 132).toISOString(),
  },
  {
    id: "e6",
    kind: "agent",
    agent: "Security Agent",
    label: "Re-validated contract hashes",
    detail: "0 critical · 1 informational",
    ts: new Date(Date.now() - 1000 * 184).toISOString(),
  },
];

export function ActivityPanel() {
  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-80 shrink-0 flex-col border-l border-border bg-background/50 backdrop-blur-xl xl:flex">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            live activity
          </div>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{ENTRIES.length} events</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 border-b border-border/60 px-3 py-3">
        {AGENTS.map((a) => (
          <div
            key={a.id}
            className="group relative flex flex-col items-center gap-1 rounded-md border border-border/60 bg-card/50 px-1.5 py-2"
            title={`${a.name} · ${a.status}`}
          >
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                a.status === "idle"
                  ? "bg-muted-foreground"
                  : a.status === "error"
                  ? "bg-destructive"
                  : "bg-success animate-pulse-glow",
              )}
            />
            <span className="truncate font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {a.name.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-2">
          {ENTRIES.map((e, i) => {
            const Icon = ICONS[e.kind];
            return (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="relative rounded-md border border-border/60 bg-card/50 p-2.5 backdrop-blur-md"
              >
                <div className="flex items-start gap-2">
                  <div className={cn("grid h-6 w-6 shrink-0 place-items-center rounded border", TONE[e.kind])}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="truncate text-[11.5px] font-medium">{e.label}</div>
                      <div className="shrink-0 font-mono text-[9px] text-muted-foreground">
                        {relativeTime(e.ts)}
                      </div>
                    </div>
                    {e.agent && (
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {e.agent}
                      </div>
                    )}
                    {e.detail && (
                      <div className="mt-1 truncate font-mono text-[10.5px] text-foreground/70">
                        {e.detail}
                      </div>
                    )}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-3 font-mono text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-electric animate-pulse-glow" />
          autonomous · streaming
        </span>
        <span>tail: live</span>
      </div>
    </aside>
  );
}
