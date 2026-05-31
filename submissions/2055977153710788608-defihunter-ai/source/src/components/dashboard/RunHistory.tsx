"use client";

import type { AgentRunResult } from "@/types/agent";
import { NeonCard } from "@/components/ui/NeonCard";

interface RunHistoryProps {
  runs: AgentRunResult[];
  onSelect: (run: AgentRunResult) => void;
}

export function RunHistory({ runs, onSelect }: RunHistoryProps) {
  return (
    <NeonCard title="Run History" delay={0.22}>
      {runs.length === 0 ? (
        <p className="text-xs text-hunter-muted">No agent runs yet</p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {runs.map((run) => (
            <li key={run.runId}>
              <button
                type="button"
                onClick={() => onSelect(run)}
                className="w-full rounded border border-hunter-border/40 px-2 py-1.5 text-left text-[10px] transition hover:border-hunter-neon/40 hover:bg-hunter-neon/5"
              >
                <span className="line-clamp-1 text-hunter-text">{run.plan.query}</span>
                <span className="text-hunter-muted">
                  {run.plan.steps.length} skills · {run.totalDurationMs}ms
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </NeonCard>
  );
}
