"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ListChecks,
  Radio,
  Activity,
  Eye,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { ChainBadge } from "./ChainBadge";
import type { TokenSignal, SignalBadge } from "../lib/schemas";
import { Card, CardHeader, CardTitle } from "./ui/card";

type DisplayMode = "trade-plan" | "signals";

interface Props {
  tokens: TokenSignal[];
  chainName: string;
  /** Controls whether this card shows as an execution trade plan or signal-only display */
  displayMode?: DisplayMode;
  /** Optional: the token the user specifically asked about */
  requestedToken?: string;
}

/* ── Signal badges (non-execution context) ───────────────────────────────── */

const signalBadge = (badge?: SignalBadge) => {
  switch (badge) {
    case "SIGNAL":
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            background: "oklch(0.55 0.19 260 / 0.1)",
            color: "oklch(0.65 0.17 260)",
            border: "1px solid oklch(0.55 0.19 260 / 0.2)",
          }}
        >
          <Radio className="w-3 h-3" /> Signal
        </span>
      );
    case "WATCH":
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            background: "oklch(0.6 0.18 85 / 0.1)",
            color: "oklch(0.75 0.18 85)",
            border: "1px solid oklch(0.6 0.18 85 / 0.2)",
          }}
        >
          <Eye className="w-3 h-3" /> Watch
        </span>
      );
    case "HIGH ACTIVITY":
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            background: "oklch(0.5 0.15 160 / 0.1)",
            color: "oklch(0.6 0.17 160)",
            border: "1px solid oklch(0.55 0.15 160 / 0.2)",
          }}
        >
          <TrendingUp className="w-3 h-3" /> High Activity
        </span>
      );
    case "LOW LIQUIDITY":
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            background: "oklch(0.55 0.22 27 / 0.1)",
            color: "oklch(0.7 0.2 27)",
            border: "1px solid oklch(0.55 0.22 27 / 0.2)",
          }}
        >
          <AlertTriangle className="w-3 h-3" /> Low Liquidity
        </span>
      );
    case "INCOMPLETE DATA":
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            background: "oklch(0.5 0.02 260 / 0.08)",
            color: "var(--app-text-secondary)",
            border: "1px solid oklch(0.5 0.02 260 / 0.15)",
          }}
        >
          <AlertCircle className="w-3 h-3" /> Incomplete Data
        </span>
      );
    default:
      // Default to SIGNAL badge for signal mode — never show a pending state
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            background: "oklch(0.55 0.19 260 / 0.1)",
            color: "oklch(0.65 0.17 260)",
            border: "1px solid oklch(0.55 0.19 260 / 0.2)",
          }}
        >
          <Radio className="w-3 h-3" /> Signal
        </span>
      );
  }
};

/* ── Risk badges (execution context) ─────────────────────────────────────── */

const riskBadge = (status: TokenSignal["riskStatus"]) => {
  switch (status) {
    case "safe":
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            background: "oklch(0.5 0.15 160 / 0.1)",
            color: "oklch(0.6 0.17 160)",
            border: "1px solid oklch(0.55 0.15 160 / 0.2)",
          }}
        >
          <CheckCircle2 className="w-3 h-3" /> Low Risk
        </span>
      );
    case "high_risk":
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            background: "oklch(0.55 0.22 27 / 0.1)",
            color: "oklch(0.7 0.2 27)",
            border: "1px solid oklch(0.55 0.22 27 / 0.2)",
          }}
        >
          <AlertTriangle className="w-3 h-3" /> High Risk
        </span>
      );
    case "unknown":
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            background: "oklch(0.6 0.18 85 / 0.1)",
            color: "oklch(0.75 0.18 85)",
            border: "1px solid oklch(0.6 0.18 85 / 0.2)",
          }}
        >
          <HelpCircle className="w-3 h-3" /> Needs Review
        </span>
      );
    case "skipped":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
          Skipped
        </span>
      );
    default:
      // In trade-plan mode, default to "Scanning…" instead of a pending state
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
          <Activity className="w-3 h-3 animate-pulse" /> Scanning…
        </span>
      );
  }
};

/* ── Token row ─────────────────────────────────────────────────────────────── */

function TokenRow({ t, mode, i }: { t: TokenSignal; mode: DisplayMode; i: number }) {
  return (
    <div
      key={`${t.address}-${i}`}
      className="px-4 py-3 flex items-center justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-foreground">{t.symbol}</span>
          {mode === "signals" ? signalBadge(t.signalBadge) : riskBadge(t.riskStatus)}
        </div>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{t.address}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-foreground">${t.amountUsd}</p>
        <p className="text-[10px] text-muted-foreground">
          {t.triggerCount} signal{t.triggerCount !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────────────────── */

export function TradePlanCard({ tokens, chainName, displayMode = "trade-plan", requestedToken }: Props) {
  if (!tokens.length) return null;

  const mode = displayMode;
  const chainId = chainName.toLowerCase().includes("layer") ? "x-layer" : chainName.toLowerCase();

  // In signal mode, determine title based on context
  const isSignalMode = mode === "signals";
  const title = isSignalMode
    ? (chainName.toLowerCase().includes("layer") ? "X Layer Signals" : "Market Signals")
    : "Trade Plan";
  const TitleIcon = isSignalMode ? Radio : ListChecks;

  // Separate token-specific vs other signals (only relevant in signal mode with requestedToken)
  const matchedTokens = requestedToken
    ? tokens.filter(t => t.symbol.toUpperCase() === requestedToken.toUpperCase())
    : [];
  const otherTokens = requestedToken
    ? tokens.filter(t => t.symbol.toUpperCase() !== requestedToken.toUpperCase())
    : tokens;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 px-4 py-3 flex flex-row items-center justify-between space-y-0 border-b">
        <div className="flex items-center gap-2">
          <TitleIcon className="w-4 h-4 text-primary" />
          <CardTitle className="text-xs uppercase tracking-widest text-foreground">
            {title}
          </CardTitle>
        </div>
        <ChainBadge chainName={chainName} chainId={chainId} size="sm" />
      </CardHeader>

      <div className="divide-y divide-border">
        {/* Show matched tokens first if requestedToken is set */}
        {requestedToken && matchedTokens.length > 0 && (
          <>
            {matchedTokens.map((t, i) => (
              <TokenRow key={`matched-${t.address}-${i}`} t={t} mode={mode} i={i} />
            ))}
          </>
        )}

        {/* Separator between matched and other signals */}
        {requestedToken && matchedTokens.length > 0 && otherTokens.length > 0 && (
          <div className="px-4 py-2 flex items-center gap-2 bg-muted/10">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
              Other active {chainName.toLowerCase().includes("layer") ? "X Layer" : chainName} signals
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* Show other tokens */}
        {otherTokens.map((t, i) => (
          <TokenRow key={`other-${t.address}-${i}`} t={t} mode={mode} i={i} />
        ))}

        {/* If requested token was specified but not found */}
        {requestedToken && matchedTokens.length === 0 && (
          <div className="px-4 py-3 text-xs text-muted-foreground bg-muted/10">
            No {requestedToken.toUpperCase()}-specific signal found right now.
            {otherTokens.length > 0 && " Showing other active signals below."}
          </div>
        )}
      </div>

      {/* Signal-only disclaimer */}
      {isSignalMode && (
        <div className="px-4 py-2 border-t border-border bg-muted/10">
          <p className="text-[10px] text-muted-foreground">
            Signals are for informational purposes only. Not financial advice. Run a token scan before trading.
          </p>
        </div>
      )}
    </Card>
  );
}
