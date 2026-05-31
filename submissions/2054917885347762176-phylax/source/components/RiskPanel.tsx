"use client";

import { Shield, Info, StopCircle, Wallet } from "lucide-react";
import { TokenSignal } from "../lib/schemas";
import { motion } from "framer-motion";

interface Props {
  tokens: TokenSignal[];
  maxBudgetUsd: number;
  fromSymbol: string;
  walletConnected: boolean;
}

export function RiskPanel({ tokens, maxBudgetUsd, fromSymbol, walletConnected }: Props) {
  const total = tokens.length;
  const safe = tokens.filter((t) => t.riskStatus === "safe").length;
  const watchlist = tokens.filter((t) => t.riskStatus === "unknown").length;
  const blocked = tokens.filter((t) => t.riskStatus === "high_risk").length;
  const skipped = tokens.filter((t) => t.riskStatus === "skipped").length;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/60 backdrop-blur border border-border rounded-3xl overflow-hidden shadow-soft sticky top-24"
    >
      <div className="bg-white/40 p-5 border-b border-border/50 flex items-center gap-3">
        <Shield className="w-5 h-5 text-electric" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-[0.15em]">Safety Guardrails</h3>
      </div>
      
      <div className="p-5 space-y-5">
        {/* Token Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/80 backdrop-blur p-3 rounded-xl border border-border shadow-sm">
            <div className="text-muted-foreground text-[10px] mb-1 font-bold uppercase tracking-wider">Total</div>
            <div className="text-lg font-bold text-foreground">{total}</div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 shadow-sm">
            <div className="text-emerald-600 text-[10px] mb-1 font-bold uppercase tracking-wider">LOW Risk</div>
            <div className="text-lg font-bold text-emerald-600">{safe}</div>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 shadow-sm">
            <div className="text-amber-600 text-[10px] mb-1 font-bold uppercase tracking-wider">Watchlist</div>
            <div className="text-lg font-bold text-amber-500">{watchlist}</div>
          </div>
          <div className="bg-red-50 p-3 rounded-xl border border-red-100 shadow-sm">
            <div className="text-red-600 text-[10px] mb-1 font-bold uppercase tracking-wider">Blocked</div>
            <div className="text-lg font-bold text-red-500">{blocked}</div>
          </div>
        </div>

        {skipped > 0 && (
          <div className="text-xs text-muted-foreground bg-muted/60 px-3 py-2 rounded-lg border border-border">
            {skipped} token{skipped > 1 ? "s" : ""} skipped — scan unavailable or filtered by risk mode.
          </div>
        )}

        <hr className="border-border/50" />

        {/* Session Context */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Session</h4>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Budget</span>
            <span className="font-bold text-foreground">${maxBudgetUsd}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Source Token</span>
            <span className="font-bold text-foreground">{fromSymbol}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Wallet</span>
            {walletConnected ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                <Wallet className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="text-xs font-bold text-muted-foreground">Not connected</span>
            )}
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Live Execution</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-muted border border-border text-muted-foreground uppercase">
              <StopCircle className="w-3 h-3" />
              Disabled
            </span>
          </div>
        </div>

        {/* Execution readiness summary */}
        <div className={`text-xs p-3 rounded-xl flex items-start gap-2.5 border ${
          safe > 0
            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
            : "bg-muted border-border text-muted-foreground"
        }`}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {safe > 0
              ? `${safe} token${safe > 1 ? "s" : ""} passed security scan and ${process.env.NEXT_PUBLIC_ENABLE_LIVE_EXECUTION === "true" ? "ready for live execution." : "ready to simulate."}`
              : total > 0
              ? "No tokens passed security scan. Check risk details in the trade plan."
              : "Waiting for signal discovery and security scan to complete."
            }
          </p>
        </div>
      </div>
    </motion.div>
  );
}
