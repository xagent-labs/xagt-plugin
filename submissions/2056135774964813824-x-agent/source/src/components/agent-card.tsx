"use client";

import { motion } from "framer-motion";
import { Activity, Cpu, Sparkles, Zap } from "lucide-react";
import type { Agent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<Agent["status"], { label: string; cls: string }> = {
  idle: { label: "Idle", cls: "text-muted-foreground border-border" },
  thinking: { label: "Thinking", cls: "text-electric border-electric/30 bg-electric/10" },
  researching: { label: "Researching", cls: "text-plasma border-plasma/30 bg-plasma/10" },
  executing: { label: "Executing", cls: "text-cyan border-cyan/30 bg-cyan/10" },
  synthesizing: { label: "Synthesizing", cls: "text-success border-success/30 bg-success/10" },
  complete: { label: "Complete", cls: "text-success border-success/30 bg-success/10" },
  error: { label: "Error", cls: "text-destructive border-destructive/30 bg-destructive/10" },
};

const ACCENT = {
  electric: "from-electric/30 via-electric/0 to-transparent",
  plasma: "from-plasma/30 via-plasma/0 to-transparent",
  cyan: "from-cyan/30 via-cyan/0 to-transparent",
  success: "from-success/30 via-success/0 to-transparent",
  warning: "from-warning/30 via-warning/0 to-transparent",
} as const;

export function AgentCard({ agent, dense }: { agent: Agent; dense?: boolean }) {
  const accent = ACCENT[agent.accentColor ?? "electric"];
  const status = STATUS_LABEL[agent.status];
  const isActive = agent.status !== "idle" && agent.status !== "complete";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-md"
    >
      <div className={cn("pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r", accent)} />
      <div className={cn("pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br", accent)} />

      <div className={cn("relative p-5", dense && "p-4")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-secondary/40">
                <Cpu className="h-4 w-4 text-electric" />
              </div>
              {isActive && (
                <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background animate-pulse-glow" />
              )}
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight leading-tight">{agent.name}</div>
              <div className="text-[11px] text-muted-foreground">{agent.role}</div>
            </div>
          </div>

          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider", status.cls)}>
            <Activity className="h-3 w-3" />
            {status.label}
          </span>
        </div>

        {!dense && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{agent.description}</p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Stat label="Model" value={agent.model.split("/")[1] ?? agent.model} mono />
          <Stat label="Tasks" value={agent.tasksCompleted.toLocaleString()} />
          <Stat label="Uptime" value={`${Math.round(agent.uptimeSec / 3600)}h`} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1">
          {agent.skills.slice(0, 3).map((s) => (
            <Badge key={s} variant="secondary" className="lowercase">
              <Sparkles className="h-2.5 w-2.5 -translate-y-px" /> {s}
            </Badge>
          ))}
        </div>

        {isActive && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
            <Zap className="h-3 w-3 text-electric" />
            <span className="truncate">{agent.lastActivity}</span>
            <span className="ml-auto animate-blink text-electric">●</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded border border-border/60 bg-background/30 px-2 py-1.5">
      <div className="text-[9px]">{label}</div>
      <div className={cn("mt-0.5 text-xs text-foreground", mono && "font-mono normal-case tracking-normal")}>{value}</div>
    </div>
  );
}
