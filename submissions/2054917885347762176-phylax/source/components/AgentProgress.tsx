"use client";

import { motion } from "framer-motion";
import { Brain, Radio, ScanLine, ListChecks, Gauge, ShieldCheck, AlertTriangle } from "lucide-react";

export type AgentState =
  | "IDLE"
  | "PARSING_THESIS"
  | "FETCHING_SIGNALS"
  | "SCANNING_SECURITY"
  | "BUILDING_TRADE_PLAN"
  | "SIMULATING_SWAP"
  | "WAITING_FOR_APPROVAL"
  | "EXECUTING_SWAP"
  | "COMPLETED"
  | "FAILED";

const STEPS = [
  { id: "PARSING_THESIS",       label: "Parse",    icon: Brain,       hint: "Reading intent" },
  { id: "FETCHING_SIGNALS",     label: "Signals",  icon: Radio,       hint: "Fetching OKX signals" },
  { id: "SCANNING_SECURITY",    label: "Scan",     icon: ScanLine,    hint: "Dual token scan" },
  { id: "BUILDING_TRADE_PLAN",  label: "Plan",     icon: ListChecks,  hint: "Building plan" },
  { id: "SIMULATING_SWAP",      label: "Quote",    icon: Gauge,       hint: "OKX DEX quote" },
  { id: "WAITING_FOR_APPROVAL", label: "Approve",  icon: ShieldCheck, hint: "Awaiting confirmation" },
] as const;

const ORDER = STEPS.map((s) => s.id);

export function AgentProgress({ state }: { state: AgentState }) {
  const currentIdx = ORDER.indexOf(state as typeof ORDER[number]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
    >
      <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, oklch(0.62 0.19 260), oklch(0.7 0.13 280), transparent)" }} />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Agent Pipeline</p>
          {state !== "IDLE" && state !== "COMPLETED" && state !== "FAILED" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: "oklch(0.62 0.19 260 / 0.1)", color: "oklch(0.62 0.19 260)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse inline-block" />
              Running
            </span>
          )}
          {state === "COMPLETED" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShieldCheck className="w-3 h-3" /> Done
            </span>
          )}
        </div>

        {/* Desktop: horizontal stepper */}
        <div className="hidden md:block relative">
          <div className="absolute top-7 left-[8%] right-[8%] h-px bg-border" />
          {currentIdx > 0 && (
            <div
              className="absolute top-7 left-[8%] h-px transition-all duration-700"
              style={{
                background: "linear-gradient(90deg, oklch(0.62 0.19 260), oklch(0.7 0.13 280))",
                width: `${Math.min((currentIdx / (STEPS.length - 1)) * 84, 84)}%`,
              }}
            />
          )}
          <div className="relative flex items-start justify-between px-[8%]">
            {STEPS.map((step, i) => {
              const isCompleted = currentIdx > i;
              const isCurrent = ORDER[currentIdx] === step.id;
              const isError = state === "FAILED" && isCurrent;
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex flex-col items-center relative">
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-2xl animate-ping opacity-25" style={{ border: "2px solid oklch(0.62 0.19 260)" }} />
                  )}
                  <div
                    className="relative grid place-items-center w-14 h-14 rounded-2xl border-2 transition-all duration-500"
                    style={{
                      background: isCompleted ? "oklch(0.97 0.02 160)" : isCurrent ? "oklch(0.62 0.19 260 / 0.08)" : "oklch(0.975 0.005 250)",
                      borderColor: isCompleted ? "oklch(0.8 0.1 160)" : isCurrent ? "oklch(0.62 0.19 260)" : isError ? "oklch(0.7 0.2 27)" : "oklch(0.92 0.01 260)",
                      boxShadow: isCurrent ? "0 0 20px oklch(0.62 0.19 260 / 0.25)" : "none",
                    }}
                  >
                    <Icon size={20} style={{ color: isCompleted ? "oklch(0.55 0.15 160)" : isCurrent ? "oklch(0.62 0.19 260)" : isError ? "oklch(0.6 0.22 27)" : "oklch(0.75 0.02 260)" }} />
                  </div>
                  <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: isCompleted ? "oklch(0.55 0.15 160)" : isCurrent ? "oklch(0.62 0.19 260)" : "oklch(0.75 0.02 260)" }}>
                    {step.label}
                  </p>
                  {isCurrent && <p className="text-[9px] text-muted-foreground/60 mt-0.5 text-center max-w-[72px] leading-tight">{step.hint}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: vertical */}
        <div className="md:hidden flex flex-col gap-2.5">
          {STEPS.map((step, i) => {
            const isCompleted = currentIdx > i;
            const isCurrent = ORDER[currentIdx] === step.id;
            const isError = state === "FAILED" && isCurrent;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className="grid place-items-center w-9 h-9 rounded-xl border transition-all duration-300 shrink-0"
                  style={{
                    background: isCompleted ? "oklch(0.97 0.02 160)" : isCurrent ? "oklch(0.62 0.19 260 / 0.1)" : "oklch(0.975 0.005 250)",
                    borderColor: isCompleted ? "oklch(0.8 0.1 160)" : isCurrent ? "oklch(0.62 0.19 260)" : "oklch(0.92 0.01 260)",
                  }}
                >
                  <Icon size={15} style={{ color: isCompleted ? "oklch(0.55 0.15 160)" : isCurrent ? "oklch(0.62 0.19 260)" : isError ? "oklch(0.6 0.22 27)" : "oklch(0.75 0.02 260)" }} />
                </div>
                <div>
                  <span className="text-[12px] font-bold" style={{ color: isCompleted ? "oklch(0.55 0.15 160)" : isCurrent ? "oklch(0.62 0.19 260)" : "oklch(0.75 0.02 260)" }}>{step.label}</span>
                  {isCurrent && <p className="text-[10px] text-muted-foreground">{step.hint}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {state === "FAILED" && (
          <div className="mt-5 flex items-center gap-2 text-sm font-medium bg-red-50 border border-red-100 text-red-600 px-4 py-2.5 rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Agent encountered an error. Check details below.
          </div>
        )}
        {state === "COMPLETED" && (
          <div className="mt-5 flex items-center gap-2 text-sm font-medium bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-2.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Pipeline complete — ready to review.
          </div>
        )}
      </div>
    </motion.div>
  );
}
