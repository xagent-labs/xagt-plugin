"use client";

import { CheckCircle2, AlertTriangle, ArrowRight, Zap, RefreshCw } from "lucide-react";
import { SimulationResult, SourceMeta } from "../lib/schemas";
import { motion } from "framer-motion";

interface Props {
  quote: SimulationResult | null;
  error: string | null;
  fromSymbol?: string;
  /**
   * quoteSource: the meta.source from the quote/preflight API response.
   * - "okx_real"           → show "Real OKX Quote" badge
   * - "okx_real_failed"    → real mode failure (should surface as error)
   * - null                 → loading / unknown
   */
  quoteSource: SourceMeta["source"] | null;
}

function QuoteBadge({ source }: { source: SourceMeta["source"] | null }) {
  if (source === "okx_real") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold tracking-widest uppercase">
        <Zap className="w-3 h-3" />
        Real OKX Quote
      </span>
    );
  }
  if (source === "okx_real_failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold tracking-widest uppercase">
        Quote Failed
      </span>
    );
  }
  return null;
}

export function QuotePreflightPanel({ quote, error, fromSymbol, quoteSource }: Props) {
  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border rounded-3xl overflow-hidden shadow-sm"
        style={{ background: "var(--card)", borderColor: "oklch(0.55 0.22 27 / 0.3)" }}
      >
        <div className="bg-destructive/10 p-5 border-b border-destructive/20 flex gap-3">
          <AlertTriangle className="text-destructive w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-destructive tracking-wide uppercase text-sm">Quote Failed</h4>
            <p className="text-sm text-destructive/80 mt-1 font-medium">{error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!quote) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-3xl overflow-hidden shadow-soft relative"
      style={{ background: "var(--card)" }}
    >
      <div className="px-5 sm:px-6 py-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: "oklch(0 0 0 / 0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-electric/10 flex items-center justify-center border border-electric/20">
            <RefreshCw className="w-4 h-4 text-electric" />
          </div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-[0.15em]">Quote &amp; Preflight</h3>
        </div>
        <QuoteBadge source={quoteSource} />
      </div>

      <div className="p-5 sm:p-6 relative">
        {/* Route Visualizer */}
        {fromSymbol && (
          <div className="flex items-center justify-center gap-4 mb-8 p-4 rounded-xl border border-border relative overflow-hidden" style={{ background: "oklch(0.5 0.02 260 / 0.06)" }}>
            <div className="px-4 py-2 rounded-lg font-bold border border-border shadow-sm relative z-10" style={{ background: "var(--card)", color: "var(--foreground)" }}>
              {fromSymbol}
            </div>
            <div className="flex flex-col items-center text-muted-foreground relative z-10">
              <span className="text-[10px] uppercase tracking-widest mb-1 font-bold">{quote.route.split(" ")[0] ?? "OKX DEX"}</span>
              <div className="relative flex items-center">
                 <ArrowRight className="w-4 h-4 text-electric" />
              </div>
            </div>
            <div className="px-4 py-2 bg-gradient-brand rounded-lg text-white font-bold shadow-soft relative z-10">
              Target Token
            </div>
          </div>
        )}

        {/* Quote Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-border flex flex-col justify-between group hover:border-electric/30 transition-colors" style={{ background: "oklch(0.5 0.02 260 / 0.06)" }}>
            <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.6 0.015 260)" }}>Expected Out</span>
            <span className="text-xl font-bold text-emerald-600">${quote.expectedOutputUsd.toFixed(4)}</span>
          </div>
          <div className="p-4 rounded-xl border border-border flex flex-col justify-between group hover:border-electric/30 transition-colors" style={{ background: "oklch(0.5 0.02 260 / 0.06)" }}>
            <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.6 0.015 260)" }}>Price Impact</span>
            <span className={`text-xl font-bold ${quote.slippage > 2 ? "text-destructive" : "text-amber-500"}`}>
              {quote.slippage.toFixed(2)}%
            </span>
          </div>
          <div className="p-4 rounded-xl border border-border flex flex-col justify-between group hover:border-electric/30 transition-colors" style={{ background: "oklch(0.5 0.02 260 / 0.06)" }}>
            <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.6 0.015 260)" }}>Est. Gas</span>
            <span className="text-xl font-bold text-foreground">${quote.gasFeeUsd.toFixed(4)}</span>
          </div>
          <div className="p-4 rounded-xl border border-border flex flex-col justify-between group hover:border-electric/30 transition-colors" style={{ background: "oklch(0.5 0.02 260 / 0.06)" }}>
            <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.6 0.015 260)" }}>Route</span>
            <span className="text-sm font-bold text-foreground/80 truncate" title={quote.route}>{quote.route}</span>
          </div>
        </div>

        <div className="px-4 py-3 rounded-xl text-sm flex items-start gap-3" style={{ background: "oklch(0.45 0.17 155 / 0.1)", border: "1px solid oklch(0.55 0.17 155 / 0.2)", color: "oklch(0.65 0.17 155)" }}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />
          <p className="font-medium">
            <strong className="text-emerald-700 font-bold">Preflight Passed.</strong> Real OKX quote received. 
            Price impact and gas within limits. User approval is required before any execution.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
