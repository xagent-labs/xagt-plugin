'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Clock,
  ExternalLink,
  Bot,
  User,
  Wrench,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMissionShortName } from '@/lib/mission-display';
import { MarkdownContent } from '@/components/markdown-content';
import {
  getMissionEvents,
  type Mission,
  type StoredEvent,
  type RunningMissionInfo,
} from '@/lib/api';

interface WorkerPeekModalProps {
  mission: Mission;
  runningInfo?: RunningMissionInfo;
  onClose: () => void;
  onOpenFull: (missionId: string) => void;
}

function getStatusBadge(mission: Mission, runningInfo?: RunningMissionInfo) {
  if (runningInfo) {
    const state = runningInfo.state;
    if (state === 'running') {
      return {
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
        label: 'Running',
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10 border-indigo-500/20',
      };
    }
    if (state === 'waiting_for_tool') {
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: 'Waiting for tool',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
      };
    }
    if (state === 'queued') {
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: 'Queued',
        color: 'text-white/50',
        bg: 'bg-white/[0.04] border-white/[0.08]',
      };
    }
  }

  switch (mission.status) {
    case 'completed':
      return {
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        label: 'Completed',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
      };
    case 'failed':
      return {
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: 'Failed',
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/20',
      };
    case 'interrupted':
      return {
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: 'Interrupted',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
      };
    case 'not_feasible':
      return {
        icon: <Ban className="h-3.5 w-3.5" />,
        label: 'Not feasible',
        color: 'text-rose-400',
        bg: 'bg-rose-500/10 border-rose-500/20',
      };
    default:
      return {
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
        label: 'Active',
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10 border-indigo-500/20',
      };
  }
}

interface ParsedMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolCallId?: string;
  timestamp?: string;
}

function parseEventsToMessages(events: StoredEvent[]): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const toolCalls = new Map<string, { name: string; args: string }>();

  for (const event of events) {
    switch (event.event_type) {
      case 'user_message':
        messages.push({ role: 'user', content: event.content, timestamp: event.timestamp });
        break;
      case 'assistant_message':
        messages.push({ role: 'assistant', content: event.content, timestamp: event.timestamp });
        break;
      case 'tool_call':
        if (event.tool_call_id) {
          toolCalls.set(event.tool_call_id, {
            name: event.tool_name || 'unknown',
            args: event.content,
          });
        }
        break;
      case 'tool_result':
        if (event.tool_call_id) {
          const call = toolCalls.get(event.tool_call_id);
          messages.push({
            role: 'tool',
            content: event.content,
            toolName: call?.name || event.tool_name || 'tool',
            toolCallId: event.tool_call_id,
            timestamp: event.timestamp,
          });
        }
        break;
    }
  }

  return messages;
}

function ToolResultItem({
  message,
}: {
  message: ParsedMessage;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentPreview = message.content.length > 200
    ? message.content.slice(0, 200) + '...'
    : message.content;

  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/50 hover:bg-white/[0.03] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <Wrench className="h-3 w-3 shrink-0 text-white/30" />
        <span className="font-mono text-[11px] text-white/60 truncate">
          {message.toolName}
        </span>
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-white/[0.04] bg-white/[0.01]">
          <pre className="text-[11px] text-white/50 whitespace-pre-wrap break-all font-mono max-h-[200px] overflow-y-auto">
            {message.content}
          </pre>
        </div>
      )}
      {!expanded && contentPreview.length > 0 && (
        <div className="px-3 pb-2 -mt-1">
          <p className="text-[10px] text-white/25 truncate font-mono">
            {contentPreview}
          </p>
        </div>
      )}
    </div>
  );
}

export function WorkerPeekModal({
  mission,
  runningInfo,
  onClose,
  onOpenFull,
}: WorkerPeekModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [eventsState, setEventsState] = useState<{
    missionId: string;
    events: StoredEvent[] | null;
  }>({ missionId: mission.id, events: null });
  const status = getStatusBadge(mission, runningInfo);

  const title = mission.title?.trim() || getMissionShortName(mission.id);
  const shortDescription = mission.short_description?.trim();
  const backend = mission.backend?.trim() || 'claudecode';
  const workingDir = mission.working_directory;

  // Fetch events on mount
  useEffect(() => {
    let cancelled = false;
    getMissionEvents(mission.id, {
      types: ['user_message', 'assistant_message', 'tool_call', 'tool_result'],
      limit: 100,
    })
      .then((result) => {
        if (!cancelled) setEventsState({ missionId: mission.id, events: result });
      })
      .catch((err) => {
        console.error('Failed to fetch worker events:', err);
        if (!cancelled) setEventsState({ missionId: mission.id, events: [] });
      });
    return () => { cancelled = true; };
  }, [mission.id]);
  const events =
    eventsState.missionId === mission.id ? eventsState.events : null;
  const loading = events === null;

  // Parse messages from events, falling back to mission.history
  const messages = useMemo(() => {
    if (events && events.length > 0) {
      return parseEventsToMessages(events);
    }
    // Fallback: use mission.history (role/content pairs)
    if (mission.history?.length > 0) {
      return mission.history.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      }));
    }
    return [];
  }, [events, mission.history]);

  // Only show the last N messages (assistant messages are most interesting)
  const displayMessages = useMemo(() => {
    // Show last 20 messages to give enough context
    return messages.slice(-20);
  }, [messages]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleOpenFull = useCallback(() => {
    onOpenFull(mission.id);
    onClose();
  }, [mission.id, onOpenFull, onClose]);

  const modalContent = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" />

      {/* Modal */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl max-h-[75vh] flex flex-col rounded-xl bg-[#1a1a1a] border border-white/[0.06] shadow-2xl animate-in fade-in zoom-in-95 duration-150 mx-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-white truncate">
                {title}
              </h2>
              <span className={cn(
                'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0',
                status.bg, status.color
              )}>
                {status.icon}
                {status.label}
              </span>
            </div>
            {shortDescription && shortDescription !== title && (
              <p className="text-sm text-white/50 truncate">{shortDescription}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-white/30">
              <span className="font-mono">{backend}</span>
              {workingDir && (
                <>
                  <span className="text-white/15">|</span>
                  <span className="font-mono truncate max-w-[200px]" title={workingDir}>
                    {workingDir.split('/').pop()}
                  </span>
                </>
              )}
              {runningInfo?.current_activity && (
                <>
                  <span className="text-white/15">|</span>
                  <span className="italic text-white/40 truncate">
                    {runningInfo.current_activity}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-white/20 animate-spin mb-2" />
              <p className="text-sm text-white/30">Loading messages...</p>
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bot className="h-8 w-8 text-white/10 mb-2" />
              <p className="text-sm text-white/30">No messages yet</p>
            </div>
          ) : (
            displayMessages.map((msg, i) => {
              if (msg.role === 'tool') {
                return (
                  <ToolResultItem
                    key={`tool-${i}`}
                    message={msg}
                  />
                );
              }

              const isUser = msg.role === 'user';
              return (
                <div key={`msg-${i}`} className="flex gap-3">
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full shrink-0 mt-0.5',
                    isUser ? 'bg-white/[0.06]' : 'bg-indigo-500/20'
                  )}>
                    {isUser ? (
                      <User className="h-3.5 w-3.5 text-white/50" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-indigo-400" />
                    )}
                  </div>
                  <div className={cn(
                    'flex-1 min-w-0 rounded-xl px-4 py-3',
                    isUser
                      ? 'bg-white/[0.03] border border-white/[0.06]'
                      : 'bg-indigo-500/[0.04] border border-indigo-500/[0.08]'
                  )}>
                    <div className="text-[10px] text-white/30 mb-1.5 font-medium uppercase tracking-wider">
                      {isUser ? 'User' : 'Assistant'}
                    </div>
                    <div className="text-sm text-white/80 prose-compact">
                      <MarkdownContent
                        content={msg.content}
                        basePath={workingDir ?? undefined}
                        workspaceId={mission.workspace_id}
                        missionId={mission.id}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06] shrink-0">
          <div className="text-[11px] text-white/25">
            {messages.length > 0 && (
              <span>{messages.filter((m) => m.role === 'assistant').length} assistant messages</span>
            )}
          </div>
          <button
            onClick={handleOpenFull}
            className="flex items-center gap-2 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/20 px-3 py-1.5 text-sm text-indigo-400 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open full mission
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to document.body to escape any overflow:hidden ancestors
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
