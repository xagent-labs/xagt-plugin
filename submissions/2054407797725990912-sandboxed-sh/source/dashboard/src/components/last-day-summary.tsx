'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { CheckCircle, XCircle, Loader, DollarSign, BarChart3 } from 'lucide-react';
import { getStats, type Mission, type StatsResponse } from '@/lib/api';
import { formatCents, cn } from '@/lib/utils';
import { stableJsonCompare } from '@/lib/swr-config';

interface LastDaySummaryProps {
  missions: Mission[];
  runningMissionIds: Set<string>;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Compact "Last 24 hours" panel for the Overview right sidebar.
 * Pulls global 24h stats from the API and derives a few extras
 * (active count, needs-attention count) from the missions list
 * already loaded by the page.
 */
export function LastDaySummary({ missions, runningMissionIds }: LastDaySummaryProps) {
  const { sinceIso, cutoff } = useDailyWindow();

  const { data: dayStats, isLoading } = useSWR<StatsResponse>(
    ['stats', sinceIso],
    () => getStats(sinceIso),
    {
      refreshInterval: 30_000,
      revalidateOnFocus: false,
      compare: stableJsonCompare,
    },
  );

  const activeCount = runningMissionIds.size;

  const updatedLast24h = useMemo(
    () =>
      missions.filter((m) => {
        const ts = new Date(m.updated_at).getTime();
        return Number.isFinite(ts) && ts >= cutoff;
      }),
    [missions, cutoff],
  );
  const finishedLast24h = updatedLast24h.filter((m) =>
    m.status === 'completed' || m.status === 'acknowledged',
  ).length;
  const failedLast24h = updatedLast24h.filter((m) =>
    m.status === 'failed' || m.status === 'not_feasible',
  ).length;

  const completed = dayStats?.completed_tasks ?? finishedLast24h;
  const failed = dayStats?.failed_tasks ?? failedLast24h;
  const spent = dayStats?.total_cost_cents ?? 0;
  const hourlyBuckets = useMemo(
    () => buildHourlyBuckets(updatedLast24h, cutoff),
    [updatedLast24h, cutoff],
  );

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium text-white/80">Last 24 hours</h2>
          <p className="mt-0.5 text-[11px] text-white/35">Rolling mission activity</p>
        </div>
        <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-1 text-[9px] font-medium uppercase tracking-wider text-white/35">
          Live
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SummaryTile
          icon={CheckCircle}
          label="Completed"
          value={completed}
          tone="emerald"
          loading={isLoading}
        />
        <SummaryTile
          icon={XCircle}
          label="Failed"
          value={failed}
          tone={failed > 0 ? 'red' : 'muted'}
          loading={isLoading}
        />
        <SummaryTile
          icon={Loader}
          label="Active"
          value={activeCount}
          tone={activeCount > 0 ? 'indigo' : 'muted'}
          live={activeCount > 0}
        />
        <SummaryTile
          icon={DollarSign}
          label="Spent"
          value={formatCents(spent)}
          tone="muted"
          loading={isLoading}
        />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-white/65">
            <BarChart3 className="h-3.5 w-3.5 text-indigo-400/70" />
            <span>Activity shape</span>
          </div>
          <span className="text-[10px] tabular-nums text-white/35">
            {updatedLast24h.length} updated
          </span>
        </div>
        <HourlyActivityChart buckets={hourlyBuckets} />
        <div className="mt-2 flex items-center justify-between text-[10px] text-white/30">
          <span>24h ago</span>
          <span>now</span>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
  loading,
  live,
}: {
  icon: typeof CheckCircle;
  label: string;
  value: number | string;
  tone: 'emerald' | 'red' | 'indigo' | 'muted';
  loading?: boolean;
  live?: boolean;
}) {
  const toneIcon = {
    emerald: 'text-emerald-400/80',
    red: 'text-red-400/70',
    indigo: 'text-indigo-400/70',
    muted: 'text-white/50',
  }[tone];

  const toneValue = {
    emerald: 'text-white',
    red: 'text-white',
    indigo: 'text-white',
    muted: 'text-white/80',
  }[tone];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.04]">
          <Icon className={cn('h-3 w-3', toneIcon, live && 'animate-spin')} />
        </span>
        <span>{label}</span>
      </div>
      <div
        className={cn(
          'mt-2 text-xl font-light tabular-nums leading-none tracking-normal',
          toneValue,
          loading && 'opacity-50',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function HourlyActivityChart({ buckets }: { buckets: number[] }) {
  const max = Math.max(...buckets, 1);
  return (
    <div className="flex h-16 items-end gap-1" aria-label="Mission updates by hour">
      {buckets.map((count, index) => {
        const height = count === 0 ? 4 : Math.max(8, Math.round((count / max) * 54));
        return (
          <div
            key={index}
            className="flex min-w-0 flex-1 items-end"
            title={`${count} update${count === 1 ? '' : 's'}`}
          >
            <div
              className={cn(
                'w-full rounded-t-sm border border-white/[0.04] transition-colors',
                count > 0
                  ? 'bg-indigo-300/55 hover:bg-indigo-300/75'
                  : 'bg-white/[0.045]',
              )}
              style={{ height }}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Returns the 24h window cutoff, snapped to the minute and refreshed every
 * 60s. Lazy useState initializer keeps the impure Date.now() call off the
 * render path; the interval bumps the window forward so stats and the
 * mission filter stay roughly aligned without re-rendering on each tick.
 */
function useDailyWindow(): { sinceIso: string; cutoff: number } {
  const [window, setWindow] = useState(computeWindow);
  useEffect(() => {
    const id = setInterval(() => setWindow(computeWindow()), 60_000);
    return () => clearInterval(id);
  }, []);
  return window;
}

function computeWindow(): { sinceIso: string; cutoff: number } {
  const minute = Math.floor(Date.now() / 60_000) * 60_000;
  const cutoff = minute - ONE_DAY_MS;
  return { sinceIso: new Date(cutoff).toISOString(), cutoff };
}

function buildHourlyBuckets(missions: Mission[], cutoff: number): number[] {
  const buckets = Array.from({ length: 24 }, () => 0);
  const hourMs = 60 * 60 * 1000;
  for (const mission of missions) {
    const ts = new Date(mission.updated_at).getTime();
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    const index = Math.min(23, Math.max(0, Math.floor((ts - cutoff) / hourMs)));
    buckets[index] += 1;
  }
  return buckets;
}
