"use client";

import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConfidenceBadge({
  value,
  className,
  showIcon = true,
}: {
  value: number;
  className?: string;
  showIcon?: boolean;
}) {
  const pct = Math.round(value * 100);
  const tone =
    pct >= 75 ? { cls: "text-success border-success/30 bg-success/10", Icon: ShieldCheck } :
    pct >= 50 ? { cls: "text-warning border-warning/30 bg-warning/10", Icon: ShieldAlert } :
                { cls: "text-muted-foreground border-border bg-secondary/40", Icon: ShieldQuestion };
  const Icon = tone.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        tone.cls,
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {pct}% conf
    </span>
  );
}
