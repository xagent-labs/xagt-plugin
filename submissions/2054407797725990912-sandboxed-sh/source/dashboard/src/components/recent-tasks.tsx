"use client";

import Link from "next/link";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { listMissions, Mission } from "@/lib/api";
import { ArrowRight, Clock } from "lucide-react";
import { getStatusIcon } from "@/components/ui/status-icons";
import { STATUS_TEXT_COLORS } from "@/lib/mission-status";

// Sort missions by updated_at descending
const sortMissions = (data: Mission[]): Mission[] =>
  [...data].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

export function RecentTasks() {
  // SWR: poll missions every 5 seconds (shared key with history page)
  const { data: missions = [], isLoading } = useSWR('missions', listMissions, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
  });

  const sortedMissions = sortMissions(missions);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-medium text-white">Recent Missions</h3>
        <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>

      {isLoading ? (
        <p className="text-xs text-white/40">Loading...</p>
      ) : sortedMissions.length === 0 ? (
        <p className="text-xs text-white/40">No missions yet</p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {sortedMissions.map((mission) => {
            const Icon = getStatusIcon(mission.status, Clock);
            const color = STATUS_TEXT_COLORS[mission.status] || "text-white/40";
            const title = mission.title || "Untitled Mission";
            return (
              <Link
                key={mission.id}
                href={`/control?mission=${mission.id}`}
                className="flex items-center justify-between rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] p-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      color,
                      mission.status === "active" && "animate-spin"
                    )}
                  />
                  <span className="max-w-[180px] truncate text-sm text-white/80">
                    {title}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-white/30" />
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/history"
        className="mt-4 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
      >
        View all <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
