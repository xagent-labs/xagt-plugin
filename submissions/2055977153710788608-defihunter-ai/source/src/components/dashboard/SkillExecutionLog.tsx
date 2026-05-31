"use client";

import type { SkillResult } from "@/types/agent";
import { NeonCard } from "@/components/ui/NeonCard";
import clsx from "clsx";

interface SkillExecutionLogProps {
  results: SkillResult[];
  loading?: boolean;
}

export function SkillExecutionLog({ results, loading }: SkillExecutionLogProps) {
  return (
    <NeonCard title="Skill Execution Log" delay={0.2}>
      {loading ? (
        <p className="animate-pulse text-xs text-hunter-muted">Running pipeline...</p>
      ) : results.length === 0 ? (
        <p className="text-xs text-hunter-muted">No skill runs yet</p>
      ) : (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto font-mono text-[10px]">
          {results.map((r) => (
            <li
              key={`${r.skillId}-${r.executedAt}`}
              className={clsx(
                "rounded border px-2 py-1",
                r.status === "success"
                  ? "border-hunter-neon/30 bg-hunter-neon/5"
                  : "border-hunter-danger/40 bg-hunter-danger/5"
              )}
            >
              <div className="flex justify-between gap-2">
                <span className="text-hunter-cyan">{r.skillId}</span>
                <span className={r.status === "success" ? "text-hunter-neon" : "text-hunter-danger"}>
                  {r.status} / {r.durationMs}ms
                </span>
              </div>
              {r.status === "error" && r.error ? (
                <p className="mt-1 text-hunter-danger">{r.error}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </NeonCard>
  );
}
