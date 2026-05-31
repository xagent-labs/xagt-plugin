"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_STAGES = [
  "Parsing intent",
  "Querying open sources",
  "Discovering web pages",
  "Crawling articles",
  "Ranking by relevance",
  "Cross-checking on-chain data",
  "Synthesizing insight",
];

export function AIThinkingLoader({
  stages = DEFAULT_STAGES,
  className,
  intervalMs = 1400,
}: {
  stages?: string[];
  className?: string;
  intervalMs?: number;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % stages.length), intervalMs);
    return () => clearInterval(t);
  }, [stages.length, intervalMs]);

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-card/60 px-3 py-2.5 backdrop-blur-md",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-shimmer bg-[length:200%_100%] animate-shimmer opacity-40" />
      <div className="relative grid h-7 w-7 place-items-center rounded-md border border-electric/30 bg-electric/10 text-electric">
        <Sparkles className="h-3.5 w-3.5 animate-pulse-glow" />
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          autonomous agent
        </div>
        <div className="truncate font-mono text-xs">
          {stages[i]}
          <span className="ml-0.5 inline-block text-electric animate-blink">▋</span>
        </div>
      </div>
      <div className="relative flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse-glow" />
        <span className="h-1.5 w-1.5 rounded-full bg-electric/60 animate-pulse-glow [animation-delay:200ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-electric/30 animate-pulse-glow [animation-delay:400ms]" />
      </div>
    </div>
  );
}
