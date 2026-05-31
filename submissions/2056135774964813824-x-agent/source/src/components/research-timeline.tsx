"use client";

import {
  Search,
  Compass,
  FileSearch,
  ListChecks,
  Brain,
  Wrench,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  XCircle,
} from "lucide-react";
import type { ResearchStep, ResearchStepStatus } from "@/lib/types";
import type { LucideIcon } from "@/lib/lucide";
import { cn } from "@/lib/utils";

const KIND_META: Record<ResearchStep["kind"], { icon: LucideIcon; label: string; tone: string }> = {
  search: { icon: Search, label: "Search", tone: "text-electric" },
  discover: { icon: Compass, label: "Discover", tone: "text-cyan" },
  scrape: { icon: FileSearch, label: "Crawl", tone: "text-plasma" },
  rank: { icon: ListChecks, label: "Rank", tone: "text-cyan" },
  analyze: { icon: Brain, label: "Analyze", tone: "text-electric" },
  skill: { icon: Wrench, label: "Skill", tone: "text-warning" },
  synthesize: { icon: Sparkles, label: "Synthesize", tone: "text-plasma" },
};

const STATUS_DOT: Record<ResearchStepStatus, { Icon: LucideIcon; cls: string; bg: string }> = {
  queued: { Icon: Circle, cls: "text-muted-foreground", bg: "bg-muted-foreground/30" },
  running: { Icon: Loader2, cls: "text-electric animate-spin", bg: "bg-electric" },
  done: { Icon: CheckCircle2, cls: "text-success", bg: "bg-success" },
  error: { Icon: XCircle, cls: "text-destructive", bg: "bg-destructive" },
};

export function ResearchTimeline({
  steps,
  className,
}: {
  steps: ResearchStep[];
  className?: string;
}) {
  return (
    <ol className={cn("relative space-y-3", className)}>
      <div className="absolute left-[15px] top-1 bottom-1 w-px bg-border" aria-hidden />
      {steps.map((step) => {
        const meta = KIND_META[step.kind];
        const Icon = meta.icon;
        const sd = STATUS_DOT[step.status];
        const SIcon = sd.Icon;
        return (
          <li key={step.id} className="relative flex gap-3 pl-0">
            <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-card/80 backdrop-blur-md">
              <Icon className={cn("h-3.5 w-3.5", meta.tone)} />
              <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background", sd.bg)} />
            </div>
            <div className="min-w-0 flex-1 rounded-lg border border-border/70 bg-card/40 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] uppercase tracking-wider", meta.tone)}>{meta.label}</span>
                <span className="text-sm font-medium leading-snug">{step.label}</span>
                <SIcon className={cn("ml-auto h-3.5 w-3.5 shrink-0", sd.cls)} />
                {step.durationMs !== undefined && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {step.durationMs < 1000 ? `${step.durationMs}ms` : `${(step.durationMs / 1000).toFixed(1)}s`}
                  </span>
                )}
              </div>
              {step.detail && (
                <div className="mt-1 text-[11px] text-muted-foreground">{step.detail}</div>
              )}
              {step.outputs && step.outputs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {step.outputs.map((o, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      <span className="text-[9px] uppercase tracking-wider">{o.label}</span>
                      {o.value && <span className="text-foreground normal-case">{o.value}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
