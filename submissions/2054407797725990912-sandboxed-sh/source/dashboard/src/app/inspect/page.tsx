'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { getHealth, listMcps } from '@/lib/api';
import { listWorkspaces } from '@/lib/api/workspaces';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/format';
import { getValidJwt } from '@/lib/auth';
import { getRuntimeApiBase } from '@/lib/settings';
import {
  Activity,
  Cpu,
  HardDrive,
  Loader,
  Plug,
  Server,
  Wifi,
  WifiOff,
  ArrowRight,
} from 'lucide-react';

interface SystemMetrics {
  cpu_percent: number;
  cpu_cores: number[];
  memory_used: number;
  memory_total: number;
  memory_percent: number;
  network_rx_bytes_per_sec: number;
  network_tx_bytes_per_sec: number;
  timestamp_ms: number;
}

function metricNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function SystemHealthCard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const connectionIdRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    connectionIdRef.current += 1;
    const thisId = connectionIdRef.current;

    const baseUrl = getRuntimeApiBase();
    const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const jwt = getValidJwt();
    const token = jwt?.token ?? null;
    const protocols = token ? ['sandboxed', `jwt.${token}`] : ['sandboxed'];
    const ws = new WebSocket(`${wsUrl}/api/monitoring/ws?interval_ms=2000`, protocols);

    ws.onopen = () => {
      if (connectionIdRef.current !== thisId) return;
      setConnected(true);
    };
    ws.onmessage = (event) => {
      if (connectionIdRef.current !== thisId) return;
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'history' && Array.isArray(parsed.history)) {
          if (parsed.history.length > 0) setMetrics(parsed.history[parsed.history.length - 1]);
        } else {
          setMetrics(parsed);
        }
      } catch { /* ignore */ }
    };
    ws.onclose = () => {
      if (connectionIdRef.current !== thisId) return;
      setConnected(false);
    };
    ws.onerror = () => {
      if (connectionIdRef.current !== thisId) return;
      setConnected(false);
    };
    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      connectionIdRef.current += 1;
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    if (!connected) {
      const timeout = setTimeout(connect, 3000);
      return () => clearTimeout(timeout);
    }
  }, [connected, connect]);

  const displayMetrics = metrics
    ? {
        cpuPercent: metricNumber(metrics.cpu_percent),
        memoryPercent: metricNumber(metrics.memory_percent),
        memoryUsed: metricNumber(metrics.memory_used),
        memoryTotal: metricNumber(metrics.memory_total),
      }
    : null;

  return (
    <Link
      href="/inspect/system"
      className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 hover:bg-white/[0.04] transition-colors group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-white/40" />
          <span className="text-xs font-medium text-white/70">System Health</span>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
      </div>

      {!displayMetrics ? (
        <div className="flex items-center justify-center py-4">
          <Loader className="h-4 w-4 animate-spin text-white/30" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-white/30" />
              <span className="text-xs text-white/50">CPU</span>
            </div>
            <span className={cn(
              'text-xs font-medium tabular-nums',
              displayMetrics.cpuPercent > 80 ? 'text-amber-400' : 'text-white/80'
            )}>
              {displayMetrics.cpuPercent.toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-3.5 w-3.5 text-white/30" />
              <span className="text-xs text-white/50">RAM</span>
            </div>
            <span className={cn(
              'text-xs font-medium tabular-nums',
              displayMetrics.memoryPercent > 80 ? 'text-amber-400' : 'text-white/80'
            )}>
              {formatBytes(displayMetrics.memoryUsed)} / {formatBytes(displayMetrics.memoryTotal)}
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}

function McpHealthCard() {
  const { data: mcps = [], isLoading } = useSWR('inspect-mcps', listMcps, {
    refreshInterval: 10000,
    revalidateOnFocus: false,
  });

  const connected = mcps.filter((m) => m.status === 'connected').length;
  const errored = mcps.filter((m) => m.status === 'error').length;
  const total = mcps.filter((m) => m.status !== 'disabled').length;

  return (
    <Link
      href="/inspect/mcps"
      className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 hover:bg-white/[0.04] transition-colors group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-white/40" />
          <span className="text-xs font-medium text-white/70">MCPs</span>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader className="h-4 w-4 animate-spin text-white/30" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Connected</span>
            <span className="text-xs font-medium text-emerald-400 tabular-nums">
              {connected}/{total}
            </span>
          </div>
          {errored > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Errors</span>
              <span className="text-xs font-medium text-red-400 tabular-nums">
                {errored}
              </span>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

function WorkspacesCard() {
  const { data: workspaces = [], isLoading } = useSWR('inspect-workspaces', listWorkspaces, {
    refreshInterval: 10000,
    revalidateOnFocus: false,
  });

  const ready = workspaces.filter((w) => w.status === 'ready').length;
  const building = workspaces.filter((w) => w.status === 'building').length;
  const errored = workspaces.filter((w) => w.status === 'error').length;

  return (
    <Link
      href="/workspaces"
      className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 hover:bg-white/[0.04] transition-colors group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-white/40" />
          <span className="text-xs font-medium text-white/70">Workspaces</span>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader className="h-4 w-4 animate-spin text-white/30" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Ready</span>
            <span className="text-xs font-medium text-emerald-400 tabular-nums">{ready}</span>
          </div>
          {building > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Building</span>
              <span className="text-xs font-medium text-amber-400 tabular-nums">{building}</span>
            </div>
          )}
          {errored > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Errors</span>
              <span className="text-xs font-medium text-red-400 tabular-nums">{errored}</span>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

function ServerCard() {
  const { data: health, isLoading } = useSWR('inspect-health', getHealth, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
  });

  const isConnected = !!health;

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-emerald-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-400" />
          )}
          <span className="text-xs font-medium text-white/70">Server</span>
        </div>
        <span className={cn(
          'text-xs font-medium',
          isConnected ? 'text-emerald-400' : isLoading ? 'text-amber-400' : 'text-red-400'
        )}>
          {isConnected ? 'Online' : isLoading ? 'Checking' : 'Offline'}
        </span>
      </div>

      {health && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Version</span>
            <span className="text-xs font-medium text-white/80">{health.version}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Mode</span>
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded',
              health.dev_mode
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-emerald-500/10 text-emerald-400'
            )}>
              {health.dev_mode ? 'Dev' : 'Prod'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InspectPage() {
  return (
    <div className="min-h-screen flex flex-col p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Inspect</h1>
        <p className="text-sm text-white/60 mt-1">
          At-a-glance health overview of your system, MCPs, and workspaces.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SystemHealthCard />
        <McpHealthCard />
        <WorkspacesCard />
        <ServerCard />
      </div>
    </div>
  );
}
