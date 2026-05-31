"use client";

import { type RugEvent } from "@/lib/types";

interface Props {
  events: RugEvent[];
}

const TYPE_STYLE: Record<string, { className: string; label: string }> = {
  WARNING: { className: "status-warn", label: "Warn" },
  EXIT: { className: "status-danger", label: "Exit" },
  EXIT_BLOCKED: { className: "bg-neutral-100 text-neutral-500", label: "Blocked" },
  EXIT_FAILED: { className: "status-danger", label: "Failed" },
  EXIT_DRY_RUN: { className: "status-info", label: "Dry run" },
  SIMULATE: { className: "status-info", label: "Sim" },
  SIMULATE_WARN: { className: "status-warn", label: "Sim·warn" },
  SIMULATE_EXIT: { className: "status-danger", label: "Sim·exit" },
  BUY: { className: "status-safe", label: "Buy" },
};

function relativeTime(ts: number) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function EventLog({ events }: Props) {
  const sorted = [...events].sort((a, b) => b.ts - a.ts);

  if (sorted.length === 0) {
    return <p className="text-sm text-neutral-400">No events yet</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((ev, i) => {
        const s = TYPE_STYLE[ev.type] ?? TYPE_STYLE.SIMULATE;
        return (
          <div key={i} className="card py-2.5 px-3">
            <div className="flex justify-between items-start gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-[3px] ${s.className}`}>
                  {s.label}
                </span>
                <span className="text-xs text-neutral-500">{ev.symbol || ev.token.slice(0, 6)}</span>
              </div>
              <span className="text-xs text-neutral-400 shrink-0">{relativeTime(ev.ts)}</span>
            </div>
            <p className="text-sm text-neutral-600">{ev.message}</p>
            {ev.tx_hash && ev.tx_hash !== "no_balance" && (
              <p className="text-xs text-neutral-400 mt-1 truncate">tx {ev.tx_hash}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
