"use client";

import { motion } from "framer-motion";
import { Cpu, Search, Brain, Wrench, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "@/lib/lucide";
import { cn } from "@/lib/utils";

export interface WorkflowNode {
  id: string;
  label: string;
  kind: "input" | "research" | "agent" | "skill" | "synthesize" | "output";
  status?: "idle" | "active" | "done";
  detail?: string;
}

const NODE_META: Record<WorkflowNode["kind"], { icon: LucideIcon; tone: string }> = {
  input: { icon: Search, tone: "text-cyan border-cyan/30 bg-cyan/10" },
  research: { icon: Search, tone: "text-electric border-electric/30 bg-electric/10" },
  agent: { icon: Cpu, tone: "text-electric border-electric/30 bg-electric/10" },
  skill: { icon: Wrench, tone: "text-warning border-warning/30 bg-warning/10" },
  synthesize: { icon: Brain, tone: "text-plasma border-plasma/30 bg-plasma/10" },
  output: { icon: Sparkles, tone: "text-success border-success/30 bg-success/10" },
};

export function AgentWorkflowGraph({
  nodes,
  className,
}: {
  nodes: WorkflowNode[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-x-auto rounded-xl border border-border bg-card/40 backdrop-blur-md",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative flex min-w-max items-center gap-3 p-4">
        {nodes.map((node, i) => (
          <Step key={node.id} node={node} isLast={i === nodes.length - 1} delay={i * 0.08} />
        ))}
      </div>
    </div>
  );
}

function Step({
  node,
  isLast,
  delay,
}: {
  node: WorkflowNode;
  isLast: boolean;
  delay: number;
}) {
  const meta = NODE_META[node.kind];
  const Icon = meta.icon;
  const active = node.status === "active";
  const done = node.status === "done";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className={cn(
          "relative flex w-44 shrink-0 flex-col gap-2 rounded-lg border bg-card/80 p-3 backdrop-blur-md",
          active ? "border-electric/40 shadow-glow" : done ? "border-success/40" : "border-border",
        )}
      >
        {active && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-shimmer bg-[length:200%_100%] animate-shimmer opacity-40" />
          </div>
        )}
        <div className="relative flex items-center gap-2">
          <div className={cn("grid h-7 w-7 place-items-center rounded-md border", meta.tone)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {node.kind}
            </div>
            <div className="truncate text-xs font-medium">{node.label}</div>
          </div>
          {done && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
        </div>
        {node.detail && (
          <div className="relative truncate font-mono text-[10px] text-muted-foreground">
            {node.detail}
          </div>
        )}
        {active && (
          <div className="relative flex items-center gap-1 text-[10px] text-electric">
            <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse-glow" />
            <span className="font-mono">processing</span>
          </div>
        )}
      </motion.div>

      {!isLast && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: delay + 0.05 }}
          className="relative flex w-6 shrink-0 items-center justify-center"
        >
          <ArrowRight className={cn("h-4 w-4", done ? "text-success" : active ? "text-electric" : "text-muted-foreground/50")} />
          {active && (
            <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-electric/0 via-electric to-electric/0 animate-shimmer bg-[length:200%_100%]" />
          )}
        </motion.div>
      )}
    </>
  );
}
