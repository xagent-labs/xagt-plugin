"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pulse, ShieldWarning, Wallet, SignOut } from "@phosphor-icons/react";
import { walletLogout } from "@/lib/api";
import { removeToken, simulateRug, setSessionToken } from "@/lib/api";
import type { StatusResponse, TokenStatus } from "@/lib/types";

import AddTokenForm from "@/components/AddTokenForm";
import BuyPosition from "@/components/BuyPosition";
import ErrorBoundary from "@/components/ErrorBoundary";
import EventLog from "@/components/EventLog";
import RiskGauge from "@/components/RiskGauge";
import ScoreChart from "@/components/ScoreChart";
import SignalPanel from "@/components/SignalPanel";
import WalletPanel from "@/components/WalletPanel";
import WatchList from "@/components/WatchList";

const POLL_MS = 10_000;

export default function Dashboard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [simulating, setSimulating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error();
      const data: StatusResponse = await res.json();
      if (data.wallet?.session_token) {
        setSessionToken(data.wallet.session_token);
      }
      setStatus(data);
      setBackendOk(true);
      setSelectedAddr((prev) => {
        const addrs = Object.keys(data.tokens);
        if (!prev && addrs.length > 0) return addrs[0];
        if (prev && !data.tokens[prev] && addrs.length > 0) return addrs[0];
        return prev;
      });
    } catch {
      setBackendOk(false);
    }
  }, []);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [poll]);

  const tokens = status ? Object.values(status.tokens) : [];
  const selected: TokenStatus | null =
    selectedAddr && status ? status.tokens[selectedAddr] ?? null : null;
  const globalEvents = status?.global_events ?? [];
  const wallet = status?.wallet;
  const walletConnected = Boolean(wallet?.logged_in);

  async function handleRemove(address: string) {
    await removeToken(address);
    poll();
  }

  async function handleSimulate() {
    if (!selectedAddr) return;
    setSimulating(true);
    try {
      await simulateRug({
        address: selectedAddr,
        dev_wallet: 1.0,
        smart_money: 1.0,
        holder_concentration: 1.0,
        liquidity_withdrawal: 1.0,
        trade_flow_toxicity: 1.0,
        trigger_exit: walletConnected,
      });
      await poll();
    } finally {
      setSimulating(false);
    }
  }

  async function handlePartialSimulate(score: number) {
    if (!selectedAddr) return;
    const v = Math.min(1, score);
    await simulateRug({
      address: selectedAddr,
      dev_wallet: v,
      smart_money: v * 0.9,
      holder_concentration: v * 0.8,
      liquidity_withdrawal: v * 0.6,
      trade_flow_toxicity: v * 0.5,
    });
    await poll();
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden pt-[52px]">
      {/* Fixed nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100">
        <div>
          <h1 className="text-base font-medium text-neutral-900 tracking-tight">RugWatch</h1>
          <p className="text-xs text-neutral-400">Autonomous rug detection · OKX OnchainOS</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button type="button" aria-label="Wallet" className="btn-ghost gap-2">
              <Wallet size={16} weight="regular" className={walletConnected ? "text-indigo-400" : "text-neutral-400"} />
              <span className="text-xs text-neutral-500">
                {walletConnected && wallet?.evm_address
                  ? `${wallet.evm_address.slice(0, 6)}…${wallet.evm_address.slice(-4)}`
                  : "no wallet"}
              </span>
            </button>
            {walletConnected && (
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50">
                <div className="card min-w-[200px] flex flex-col gap-2 shadow-lg">
                  <div className="text-xs text-neutral-500">{wallet?.email}</div>
                  <div className="text-xs font-mono text-neutral-400 truncate">{wallet?.evm_address}</div>
                  <button
                    type="button"
                    onClick={async () => {
                      try { await walletLogout(); } catch {} poll();
                    }}
                    className="btn-ghost gap-2 w-full justify-start mt-1"
                  >
                    <SignOut size={14} weight="regular" />
                    disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
          <span className="flex items-center gap-1.5 text-sm text-neutral-500">
            <Pulse
              size={16}
              weight="fill"
              className={backendOk === false ? "text-red-500" : "text-emerald-500"}
            />
            {backendOk === false ? "offline" : "live"}
          </span>
        </div>
      </header>

      {backendOk === false && (
        <div className="shrink-0 mx-6 mt-3 px-3 py-2 rounded-[3px] bg-red-50 text-sm text-red-600">
          Backend unreachable — run{" "}
          <code className="text-red-500">cd backend && .venv/bin/uvicorn main:app --reload</code>
        </div>
      )}

      {status === null && backendOk === null && <LoadingSkeleton />}

      {/* Main content — fills remaining height, no page scroll */}
      <ErrorBoundary>
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-3 p-6 pt-4 min-h-0">
        {/* Left sidebar: wallet + watchlist + add token */}
        <aside className="w-full md:w-64 md:shrink-0 flex flex-col gap-2 min-h-0">
          <div className="shrink-0">
            <WalletPanel wallet={wallet} onChange={poll} />
          </div>

          <div className="panel flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-2 pt-2 pb-1.5">
              <p className="label-col">Watchlist</p>
              <span className="text-xs text-neutral-400">{tokens.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-1">
              <WatchList
                tokens={tokens}
                selectedAddress={selectedAddr}
                onSelect={setSelectedAddr}
                onRemove={handleRemove}
              />
            </div>
          </div>

          <div className="shrink-0">
            <AddTokenForm
              onAdded={poll}
              walletConnected={walletConnected}
              walletAddress={wallet?.evm_address}
            />
          </div>
        </aside>

        {/* Center: token detail — scrollable */}
        <main className="flex-1 panel flex flex-col min-h-0 min-w-0">
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {!selected ? (
              <EmptyState />
            ) : (
              <>
                <div className="card flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-medium text-neutral-900">{selected.symbol}</h2>
                      <span className="text-sm text-neutral-400">{selected.chain}</span>
                      {selected.exited && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-[3px] bg-neutral-100 text-neutral-500">
                          exited
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 font-mono">{selected.address}</p>
                    {selected.dev_wallet_address && (
                      <p className="text-xs text-neutral-300 mt-0.5">
                        dev {selected.dev_wallet_address.slice(0, 10)}…
                      </p>
                    )}
                  </div>

                  {!selected.exited && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-neutral-400">demo</span>
                      {[0.45, 0.7, 0.9].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handlePartialSimulate(s)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-[3px] ${
                            s >= 0.8 ? "status-danger" : s >= 0.65 ? "status-warn" : "status-safe"
                          }`}
                        >
                          {s.toFixed(2)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleSimulate}
                        disabled={simulating}
                        className="text-xs font-medium px-2.5 py-1 rounded-[3px] status-danger disabled:opacity-50"
                      >
                        {simulating ? "…" : walletConnected ? "simulate + exit" : "simulate rug"}
                      </button>
                    </div>
                  )}
                </div>

                {!selected.exited && (
                  <BuyPosition
                    tokenAddress={selected.address}
                    chain={selected.chain}
                    symbol={selected.symbol}
                    walletConnected={walletConnected}
                    onBought={poll}
                  />
                )}

                <div className="flex flex-wrap gap-3 items-start">
                  <div className="card flex flex-col items-center gap-2">
                    <RiskGauge
                      score={selected.rug_score}
                      warnAt={selected.warn_threshold}
                      exitAt={selected.exit_threshold}
                      size={220}
                    />
                    <ThresholdBadges token={selected} />
                  </div>
                  <div className="flex-1 min-w-[260px]">
                    <SignalPanel signals={selected.signals} />
                  </div>
                </div>

                <ScoreChart
                  history={selected.score_history}
                  warnAt={selected.warn_threshold}
                  exitAt={selected.exit_threshold}
                  width={560}
                  height={120}
                />

                {selected.events.length > 0 && (
                  <div>
                    <p className="label-col px-1 mb-2">Token events</p>
                    <EventLog events={selected.events} />
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Right sidebar: all events — scrollable */}
        <aside className="hidden md:flex md:w-72 md:shrink-0 panel flex-col min-h-0">
          <p className="label-col px-3 pt-2 pb-2 shrink-0">All events</p>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            <EventLog events={globalEvents} />
          </div>
        </aside>
      </div>
      </ErrorBoundary>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex gap-3 p-6 animate-pulse">
      <div className="w-64 shrink-0 h-64 bg-neutral-50 rounded-[3px]" />
      <div className="flex-1 h-64 bg-neutral-50 rounded-[3px]" />
      <div className="w-72 shrink-0 h-64 bg-neutral-50 rounded-[3px]" />
    </div>
  );
}

function ThresholdBadges({ token }: { token: TokenStatus }) {
  return (
    <div className="flex gap-3 text-xs text-neutral-500">
      <span>
        warn <span className="text-orange-600 font-medium">{token.warn_threshold.toFixed(2)}</span>
      </span>
      <span className="text-neutral-300">·</span>
      <span>
        exit <span className="text-red-600 font-medium">{token.exit_threshold.toFixed(2)}</span>
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16">
      <ShieldWarning size={32} weight="regular" className="text-neutral-300" />
      <p className="text-sm font-medium text-neutral-500">No token selected</p>
      <p className="text-sm text-neutral-400">Add a token to the watchlist to begin</p>
    </div>
  );
}
