"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, ArrowRight, ArrowClockwise, ShieldWarning } from "@phosphor-icons/react";
import { buildDemoState, TOTAL_FRAMES } from "@/lib/demo-data";
import { SIGNAL_META } from "@/lib/types";

import EventLog from "@/components/EventLog";
import RiskGauge from "@/components/RiskGauge";
import ScoreChart from "@/components/ScoreChart";
import SignalPanel from "@/components/SignalPanel";

const FRAME_MS = 1500;

const PHASE_LABELS = [
  { from: 0, to: 2, label: "Monitoring", color: "text-emerald-600" },
  { from: 3, to: 5, label: "Warning signals detected", color: "text-orange-600" },
  { from: 6, to: 6, label: "Danger — exit threshold approaching", color: "text-red-600" },
  { from: 7, to: 7, label: "Autonomous exit executed", color: "text-red-700" },
];

function getPhase(frame: number) {
  return PHASE_LABELS.find((p) => frame >= p.from && frame <= p.to) ?? PHASE_LABELS[0];
}

export default function DemoView() {
  const [frame, setFrame] = useState(-1); // -1 = not started
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    stop();
    setPlaying(true);
    setFrame((prev) => (prev < 0 ? 0 : prev));
    timerRef.current = setInterval(() => {
      setFrame((prev) => {
        if (prev >= TOTAL_FRAMES - 1) {
          stop();
          return prev;
        }
        return prev + 1;
      });
    }, FRAME_MS);
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setFrame(-1);
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  const started = frame >= 0;
  const { token, events } = started
    ? buildDemoState(frame)
    : buildDemoState(0);
  const phase = started ? getPhase(frame) : null;
  const finished = frame >= TOTAL_FRAMES - 1;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="px-4 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <ShieldWarning size={22} weight="regular" className="text-indigo-300" />
          <div>
            <h1 className="text-base font-medium text-neutral-900 tracking-tight">
              RugWatch <span className="text-xs font-normal text-indigo-400 ml-1">Live Demo</span>
            </h1>
            <p className="text-xs text-neutral-400">Autonomous rug detection on OKX OnchainOS</p>
          </div>
        </div>
        <a
          href="/"
          className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5"
        >
          Launch App <ArrowRight size={14} />
        </a>
      </header>

      {/* Controls */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-neutral-50">
        {!started ? (
          <button onClick={play} className="btn-primary text-sm px-5 py-2 flex items-center gap-2">
            <Play size={16} weight="fill" /> Start Demo
          </button>
        ) : (
          <>
            {!finished && !playing && (
              <button onClick={play} className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5">
                <Play size={14} weight="fill" /> Resume
              </button>
            )}
            {playing && (
              <button onClick={stop} className="btn-ghost text-sm px-4 py-1.5">
                Pause
              </button>
            )}
            <button onClick={reset} className="btn-ghost text-sm px-4 py-1.5 flex items-center gap-1.5">
              <ArrowClockwise size={14} /> Reset
            </button>
          </>
        )}

        {phase && (
          <span className={`text-sm font-medium ${phase.color}`}>
            {phase.label}
          </span>
        )}

        {started && (
          <span className="text-xs text-neutral-400 ml-auto">
            Frame {frame + 1} / {TOTAL_FRAMES}
          </span>
        )}
      </div>

      {/* Demo dashboard */}
      {!started ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 px-4 text-center">
          <ShieldWarning size={48} weight="regular" className="text-neutral-200" />
          <h2 className="text-lg font-medium text-neutral-700">See RugWatch in action</h2>
          <p className="text-sm text-neutral-400 max-w-md">
            Watch the detection engine identify a rug pull through 5 on-chain signals,
            escalate from safe to warning to danger, and execute an autonomous exit — all in under 15 seconds.
          </p>
          <button onClick={play} className="btn-primary text-sm px-6 py-2.5 flex items-center gap-2 mt-2">
            <Play size={16} weight="fill" /> Start Demo
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-3 p-3 overflow-hidden">
          {/* Main panel */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Token header */}
            <div className="card flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-medium text-neutral-900">{token.symbol}</h2>
                  <span className="text-sm text-neutral-400">{token.chain}</span>
                  {token.exited && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-red-50 text-red-600">
                      exited to USDC
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-1 font-mono">{token.address}</p>
              </div>
            </div>

            {/* Gauge + Signals */}
            <div className="flex flex-wrap gap-3 items-start">
              <div className="card flex flex-col items-center gap-2">
                <RiskGauge
                  score={token.rug_score}
                  warnAt={token.warn_threshold}
                  exitAt={token.exit_threshold}
                  size={200}
                />
                <div className="flex gap-3 text-xs text-neutral-500">
                  <span>warn <span className="text-orange-600 font-medium">{token.warn_threshold.toFixed(2)}</span></span>
                  <span className="text-neutral-300">·</span>
                  <span>exit <span className="text-red-600 font-medium">{token.exit_threshold.toFixed(2)}</span></span>
                </div>
              </div>
              <div className="flex-1 min-w-[240px]">
                <SignalPanel signals={token.signals} />
              </div>
            </div>

            {/* Score chart */}
            {token.score_history.length >= 2 && (
              <ScoreChart
                history={token.score_history}
                warnAt={token.warn_threshold}
                exitAt={token.exit_threshold}
                width={560}
                height={88}
              />
            )}
          </div>

          {/* Events panel */}
          <aside className="w-full md:w-72 md:shrink-0 panel flex flex-col">
            <p className="label-col px-3 pt-2 pb-2">Events</p>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {events.length > 0 ? (
                <EventLog events={events} />
              ) : (
                <p className="text-sm text-neutral-400 px-1">Monitoring...</p>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Explainer */}
      <footer className="border-t border-neutral-100 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-sm font-medium text-neutral-700 mb-3">How RugWatch works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(SIGNAL_META).map(([key, meta]) => (
              <div key={key} className="flex items-start gap-2 text-xs text-neutral-500">
                <span className="font-medium text-neutral-600 shrink-0 w-8 text-right">
                  {(meta.weight * 100).toFixed(0)}%
                </span>
                <div>
                  <span className="font-medium text-neutral-600">{meta.label}</span>
                  <span className="text-neutral-400"> — {meta.description}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-4">
            Built on OKX OnchainOS · All signal data from on-chain sources · Exit routes across 500+ liquidity sources
          </p>
        </div>
      </footer>
    </div>
  );
}
