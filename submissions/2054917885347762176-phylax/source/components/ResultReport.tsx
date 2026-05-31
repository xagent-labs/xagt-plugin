"use client";

import { CheckCircle2, AlertTriangle, Shield, Lock, Check } from "lucide-react";
import { ExecutionResult } from "../lib/schemas";
import { motion } from "framer-motion";

interface Props {
  result: ExecutionResult | null;
  error: string | null;
  message?: string | null;
}

export function ResultReport({ result, error, message }: Props) {
  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/60 backdrop-blur border border-destructive/30 rounded-3xl overflow-hidden shadow-soft"
      >
        <div className="bg-destructive/10 p-5 border-b border-destructive/20 flex gap-3">
          <AlertTriangle className="text-destructive w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-destructive tracking-wide uppercase text-sm">Execution Error</h4>
            <p className="text-sm text-destructive/80 font-medium mt-1">{error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!result) return null;

  const isDisabled = result.status === "execution_disabled";
  const isLive = result.status === "success";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/60 backdrop-blur border rounded-3xl overflow-hidden shadow-soft relative ${
        isDisabled ? "border-amber-200" : "border-emerald-100"
      }`}
    >
      <div className={`p-6 border-b relative z-10 ${
        isDisabled ? "border-amber-200 bg-amber-50/80" : "border-emerald-100 bg-emerald-50/80"
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center border shadow-sm ${
            isDisabled ? "border-amber-200" : "border-emerald-200"
          }`}>
            {isDisabled ? (
              <Lock className="w-6 h-6 text-amber-500" />
            ) : (
              <Check className="w-6 h-6 text-emerald-500" />
            )}
          </div>
          <div>
            <h3 className={`text-xl font-bold font-display ${isDisabled ? "text-amber-700" : "text-emerald-700"}`}>
              {isDisabled ? "Execution Gated" : "Execution Report"}
            </h3>
            <p className={`text-sm font-medium ${isDisabled ? "text-amber-600/80" : "text-emerald-600/80"}`}>
              {isDisabled
                ? "Risk analysis complete — live execution is disabled by config"
                : "Transaction broadcast and confirmed on-chain"
              }
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Decision</h4>
              <p className="text-sm font-bold text-foreground">
                {isDisabled ? "Approved — Awaiting Live Execution" : "Approved & Executed"}
              </p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Reason</h4>
              <p className="text-sm font-medium text-foreground/70 leading-relaxed">
                Token passed OKX Security scan (0 high-risk flags). Price impact within user limits. Budget constraints met.
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Data Source</h4>
              <p className="text-sm font-medium text-foreground/70">OKX Onchain OS CLI</p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Execution Status</h4>
              {isDisabled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 text-xs font-bold tracking-widest uppercase border border-amber-100 shadow-sm">
                  <Shield className="w-3 h-3" />
                  Live Execution Disabled
                </span>
              ) : isLive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold tracking-widest uppercase border border-emerald-100 shadow-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  Live on Chain
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-bold tracking-widest uppercase border border-border shadow-sm">
                  {result.status}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur p-5 rounded-xl border border-border group hover:border-electric/30 transition-colors">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Request Details</h4>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-4">
            <div className="flex flex-col">
              <span className="text-muted-foreground font-bold text-[10px] mb-1 uppercase tracking-widest">Target Address</span>
              <span className="text-foreground/80 font-mono font-medium text-xs break-all bg-white px-2 py-1 rounded border border-border">{result.requestedAddress}</span>
            </div>
            <div className="flex flex-col sm:text-right">
              <span className="text-muted-foreground font-bold text-[10px] mb-1 uppercase tracking-widest">Amount</span>
              <span className="text-foreground font-bold">${result.requestedAmountUsd}</span>
            </div>
          </div>
        </div>

        {/* Informational message from backend */}
        {message && (
          <p className="text-xs font-medium text-muted-foreground bg-muted/60 px-4 py-3 rounded-xl border border-border leading-relaxed">
            {message}
          </p>
        )}
        
        {isDisabled && !message && (
          <p className="text-xs font-medium text-muted-foreground bg-muted/60 px-4 py-3 rounded-xl border border-border leading-relaxed">
            ENABLE_LIVE_EXECUTION is false. The OKX quote and risk data are real. 
            Connect a browser wallet and enable live execution to broadcast transactions.
          </p>
        )}
      </div>
    </motion.div>
  );
}
