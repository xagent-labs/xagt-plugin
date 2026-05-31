"use client";

import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  className,
  fill,
  strokeWidth = 1.5,
}: {
  data: number[];
  className?: string;
  fill?: boolean;
  strokeWidth?: number;
}) {
  if (!data || data.length === 0) return null;
  const w = 100, h = 30;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / span) * h] as const);
  const d = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const dFill = `${d} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-full w-full", className)}>
      {fill && <path d={dFill} className="fill-current opacity-15" />}
      <path d={d} fill="none" strokeWidth={strokeWidth} className="stroke-current" />
    </svg>
  );
}
