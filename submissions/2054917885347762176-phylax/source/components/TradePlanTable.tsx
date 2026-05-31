"use client";

import { RiskBadge } from "./RiskBadge";
import { TokenSignal } from "../lib/schemas";
import { motion } from "framer-motion";

interface Props {
  tokens: TokenSignal[];
  onSimulate: (t: TokenSignal) => void;
  isSimulating: boolean;
  fromSymbol?: string;
  chainName: string;
}

export function TradePlanTable({ tokens, onSimulate, isSimulating, chainName }: Props) {
  if (tokens.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/60 backdrop-blur border border-border rounded-3xl overflow-hidden shadow-soft relative"
    >
      <div className="px-6 py-5 border-b border-border/50 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white/40">
        <div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-[0.2em] font-display">Execution Trade Plan</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Displaying KOL/smart-money signals processed by OKX Security.
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center gap-2 text-xs font-bold bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-border text-muted-foreground uppercase tracking-widest shadow-sm">
          Total signals: <span className="text-electric">{tokens.length}</span>
        </div>
      </div>
      
      {/* Mobile Card View */}
      <div className="block md:hidden">
        {tokens.map((t, i) => (
          <div key={i} className="p-5 border-b border-border/50 last:border-0 hover:bg-white/40 transition-colors relative group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-bold text-foreground text-lg">{t.symbol}</div>
                <div className="text-xs text-muted-foreground font-mono mt-1">{t.address.slice(0, 12)}…</div>
              </div>
              <RiskBadge status={t.riskStatus} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-5">
              <div>
                <div className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1 font-bold">Chain</div>
                <div className="text-foreground/80 font-medium">{chainName}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1 font-bold">KOL Vol.</div>
                <div className="text-foreground/80 font-medium">${t.amountUsd.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1 font-bold">Wallet</div>
                <div className="text-foreground/80 font-medium">Smart Money</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1 font-bold">Decision</div>
                <div className="text-foreground/80 font-medium capitalize">{t.riskStatus === "safe" ? "Pass" : t.riskStatus === "unknown" ? "Watchlist" : t.riskStatus === "high_risk" ? "Block" : t.riskStatus}</div>
              </div>
            </div>

            {t.riskStatus === "safe" ? (
              <button
                onClick={() => onSimulate(t)}
                disabled={isSimulating}
                className="w-full py-3 bg-gradient-brand hover:shadow-glow text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 overflow-hidden relative group/btn"
              >
                <span className="relative z-10">Simulate Swap</span>
              </button>
            ) : t.riskStatus === "high_risk" ? (
              <div className="w-full py-3 bg-destructive/10 text-destructive font-bold tracking-widest uppercase rounded-xl border border-destructive/20 text-center text-xs">
                Blocked
              </div>
            ) : t.riskStatus === "unknown" ? (
              <div className="w-full py-3 bg-amber-50 text-amber-600 font-bold tracking-widest uppercase rounded-xl border border-amber-100 text-center text-xs">
                Watchlist
              </div>
            ) : (
              <div className="w-full py-3 bg-muted text-muted-foreground font-bold tracking-widest uppercase rounded-xl border border-border text-center text-xs">
                Skipped
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left text-foreground/70">
          <thead className="text-[10px] text-muted-foreground bg-white/40 uppercase tracking-widest border-b border-border/50">
            <tr>
              <th className="px-6 py-4 font-bold">Token</th>
              <th className="px-6 py-4 font-bold">Chain</th>
              <th className="px-6 py-4 font-bold">KOL Vol.</th>
              <th className="px-6 py-4 font-bold">Wallet Type</th>
              <th className="px-6 py-4 font-bold">Risk</th>
              <th className="px-6 py-4 font-bold">Decision</th>
              <th className="px-6 py-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t, i) => (
              <tr
                key={i}
                className="border-b border-border/30 last:border-0 hover:bg-white/40 transition-colors relative"
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-foreground">{t.symbol}</div>
                  <div className="text-xs text-muted-foreground font-mono">{t.address.slice(0, 10)}…</div>
                </td>
                <td className="px-6 py-4 font-medium">{chainName}</td>
                <td className="px-6 py-4 font-medium">${t.amountUsd.toLocaleString()}</td>
                <td className="px-6 py-4 font-medium">Smart Money</td>
                <td className="px-6 py-4"><RiskBadge status={t.riskStatus} /></td>
                <td className="px-6 py-4 capitalize font-medium">
                  {t.riskStatus === "safe" ? "Pass" : t.riskStatus === "unknown" ? "Watchlist" : t.riskStatus === "high_risk" ? "Block" : t.riskStatus}
                </td>
                <td className="px-6 py-4 text-right">
                  {t.riskStatus === "safe" ? (
                    <button
                      onClick={() => onSimulate(t)}
                      disabled={isSimulating}
                      className="group/btn relative px-5 py-2 bg-gradient-brand text-white font-bold text-xs uppercase tracking-widest rounded-full shadow-soft disabled:opacity-50 transition-all hover:scale-[1.02] hover:shadow-glow overflow-hidden"
                    >
                      <span className="relative z-10">Simulate</span>
                    </button>
                  ) : t.riskStatus === "high_risk" ? (
                    <span className="text-destructive font-bold text-xs uppercase tracking-widest bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">Blocked</span>
                  ) : t.riskStatus === "unknown" ? (
                    <span className="text-amber-600 font-bold text-xs uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-100">Watchlist</span>
                  ) : (
                    <span className="text-muted-foreground font-bold text-xs uppercase tracking-widest bg-muted px-3 py-1 rounded-full border border-border">Skipped</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
