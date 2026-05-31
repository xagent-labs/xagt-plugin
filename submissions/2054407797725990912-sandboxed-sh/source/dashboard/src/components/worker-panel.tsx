'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import {
  X,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Ban,
  ExternalLink,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMissionShortName } from '@/lib/mission-display';
import { WorkerPeekModal } from '@/components/worker-peek-modal';
import type { Mission, RunningMissionInfo } from '@/lib/api';

interface WorkerPanelProps {
  childMissions: Mission[];
  runningMissions: RunningMissionInfo[];
  bossMissionId: string;
  viewingMissionId?: string | null;
  onSelectWorker: (missionId: string) => void;
  onClose: () => void;
  className?: string;
}

function getWorkerStatusInfo(
  mission: Mission,
  runningInfo?: RunningMissionInfo
): {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  isActive: boolean;
} {
  if (runningInfo) {
    const state = runningInfo.state;
    if (state === 'running') {
      return {
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
        label: runningInfo.current_activity || 'Running',
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-500/10 border-indigo-500/20',
        isActive: true,
      };
    }
    if (state === 'waiting_for_tool') {
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: runningInfo.current_activity || 'Waiting for tool',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 border-amber-500/20',
        isActive: true,
      };
    }
    if (state === 'queued') {
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: 'Queued',
        color: 'text-white/50',
        bgColor: 'bg-white/[0.03] border-white/[0.08]',
        isActive: false,
      };
    }
  }

  switch (mission.status) {
    case 'completed':
      return {
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        label: 'Completed',
        color: 'text-emerald-700 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10 border-emerald-500/20',
        isActive: false,
      };
    case 'failed':
      return {
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: 'Failed',
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-500/10 border-red-500/20',
        isActive: false,
      };
    case 'interrupted':
      return {
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: 'Interrupted',
        color: 'text-amber-700 dark:text-amber-400',
        bgColor: 'bg-amber-500/10 border-amber-500/20',
        isActive: false,
      };
    case 'not_feasible':
      return {
        icon: <Ban className="h-3.5 w-3.5" />,
        label: 'Not feasible',
        color: 'text-rose-700 dark:text-rose-400',
        bgColor: 'bg-rose-500/10 border-rose-500/20',
        isActive: false,
      };
    case 'active':
      return {
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
        label: 'Active',
        color: 'text-indigo-700 dark:text-indigo-400',
        bgColor: 'bg-indigo-500/10 border-indigo-500/20',
        isActive: true,
      };
    default:
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: mission.status || 'Unknown',
        color: 'text-foreground/60 dark:text-white/40',
        bgColor: 'bg-white/[0.03] border-white/[0.08]',
        isActive: false,
      };
  }
}

function ProgressBar({
  completed,
  total,
  className,
}: {
  completed: number;
  total: number;
  className?: string;
}) {
  if (total <= 0) return null;
  const pct = Math.min(100, Math.round((completed / total) * 100));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            pct === 100 ? 'bg-emerald-400' : 'bg-indigo-400'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-white/40 tabular-nums shrink-0">
        {completed}/{total}
      </span>
    </div>
  );
}

const WorkerCard = memo(function WorkerCard({
  mission,
  runningInfo,
  isViewing,
  onSelect,
}: {
  mission: Mission;
  runningInfo?: RunningMissionInfo;
  isViewing: boolean;
  onSelect: (missionId: string) => void;
}) {
  const status = getWorkerStatusInfo(mission, runningInfo);
  const title = mission.title?.trim() || getMissionShortName(mission.id);
  const shortDescription = mission.short_description?.trim();
  const hasProgress =
    runningInfo && runningInfo.subtask_total > 0;
  const isStalled =
    runningInfo?.health?.status === 'stalled';
  const stallSeverity =
    isStalled && runningInfo?.health?.status === 'stalled'
      ? (runningInfo.health as { severity?: string }).severity
      : null;

  return (
    <button
      onClick={() => onSelect(mission.id)}
      className={cn(
        'w-full text-left rounded-lg border p-3 transition-all duration-200 group',
        isViewing
          ? 'border-indigo-500/30 bg-indigo-500/10 ring-1 ring-indigo-500/20'
          : status.bgColor,
        !isViewing && 'hover:bg-white/[0.06] hover:border-white/[0.12]',
        isStalled && stallSeverity === 'severe' && 'border-red-500/30 bg-red-500/5',
        isStalled && stallSeverity !== 'severe' && 'border-amber-500/20 bg-amber-500/5'
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1">
        <span className={status.color}>{status.icon}</span>
        <span className="text-sm font-medium text-foreground/90 truncate flex-1">
          {title}
        </span>
        <ExternalLink className="h-3 w-3 text-foreground/50 dark:text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>

      {/* Description */}
      {shortDescription && shortDescription !== title && (
        <p className="text-[11px] text-white/45 truncate mb-1.5 pl-[22px]">
          {shortDescription}
        </p>
      )}

      {/* Activity line */}
      {status.isActive && status.label !== 'Active' && status.label !== 'Running' && (
        <p className="text-[11px] text-white/50 truncate mb-1.5 pl-[22px] italic">
          {status.label}
        </p>
      )}

      {/* Progress bar */}
      {hasProgress && (
        <div className="pl-[22px]">
          <ProgressBar
            completed={runningInfo.subtask_completed}
            total={runningInfo.subtask_total}
          />
        </div>
      )}

      {/* Stall warning */}
      {isStalled && runningInfo && (
        <div className={cn(
          'flex items-center gap-1.5 mt-1.5 pl-[22px] text-[10px]',
          stallSeverity === 'severe' ? 'text-red-400' : 'text-amber-400'
        )}>
          <AlertTriangle className="h-3 w-3" />
          <span>
            Stalled {Math.floor(runningInfo.seconds_since_activity)}s
          </span>
        </div>
      )}
    </button>
  );
});

export function WorkerPanel({
  childMissions,
  runningMissions,
  viewingMissionId,
  onSelectWorker,
  onClose,
  className,
}: WorkerPanelProps) {
  const [peekMissionId, setPeekMissionId] = useState<string | null>(null);
  // Stable so memoized WorkerCards don't re-render on every parent update
  // (runningMissions ticks every second while a worker is streaming).
  const handleCardSelect = useCallback((missionId: string) => {
    setPeekMissionId(missionId);
  }, []);
  const handlePeekClose = useCallback(() => setPeekMissionId(null), []);

  const runningByMissionId = useMemo(() => {
    const map = new Map<string, RunningMissionInfo>();
    for (const rm of runningMissions) {
      map.set(rm.mission_id, rm);
    }
    return map;
  }, [runningMissions]);

  // Sort: active first, then by most recently updated
  const sortedWorkers = useMemo(() => {
    return [...childMissions].sort((a, b) => {
      const aRunning = runningByMissionId.has(a.id);
      const bRunning = runningByMissionId.has(b.id);
      if (aRunning !== bRunning) return aRunning ? -1 : 1;

      const aActive = a.status === 'active';
      const bActive = b.status === 'active';
      if (aActive !== bActive) return aActive ? -1 : 1;

      const aTime = a.updated_at || a.created_at || '';
      const bTime = b.updated_at || b.created_at || '';
      return bTime.localeCompare(aTime);
    });
  }, [childMissions, runningByMissionId]);

  const activeCount = sortedWorkers.filter(
    (m) => runningByMissionId.has(m.id) || m.status === 'active'
  ).length;
  const completedCount = sortedWorkers.filter(
    (m) => m.status === 'completed'
  ).length;
  const failedCount = sortedWorkers.filter(
    (m) => m.status === 'failed' || m.status === 'not_feasible'
  ).length;

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl glass-panel border border-white/[0.06] overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-white/90">Workers</span>
          <span className="text-xs text-white/40 font-mono">
            {sortedWorkers.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
          title="Close worker panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Summary stats */}
      {sortedWorkers.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.04] text-[10px]">
          {activeCount > 0 && (
            <span className="flex items-center gap-1 text-indigo-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              {activeCount} active
            </span>
          )}
          {completedCount > 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {completedCount} done
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              {failedCount} failed
            </span>
          )}
        </div>
      )}

      {/* Worker list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sortedWorkers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <Users className="h-8 w-8 text-white/10 mb-2" />
            <p className="text-sm text-white/30">No workers yet</p>
            <p className="text-[11px] text-white/20 mt-1">
              Workers will appear here when the boss delegates tasks
            </p>
          </div>
        ) : (
          sortedWorkers.map((mission) => (
            <WorkerCard
              key={mission.id}
              mission={mission}
              runningInfo={runningByMissionId.get(mission.id)}
              isViewing={mission.id === viewingMissionId}
              onSelect={handleCardSelect}
            />
          ))
        )}
      </div>

      {/* Peek modal */}
      {peekMissionId && (() => {
        const peekMission = childMissions.find((m) => m.id === peekMissionId);
        if (!peekMission) return null;
        return (
          <WorkerPeekModal
            mission={peekMission}
            runningInfo={runningByMissionId.get(peekMissionId)}
            onClose={handlePeekClose}
            onOpenFull={onSelectWorker}
          />
        );
      })()}
    </div>
  );
}
