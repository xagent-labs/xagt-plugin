"use client";

import { ShieldAlert, Info, Lock, Wallet, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onApprove: () => void;
  onReject: () => void;
  disabled: boolean;
  walletConnected: boolean;
  correctNetwork: boolean;
}

export function ApprovalPanel({ onApprove, onReject, disabled, walletConnected, correctNetwork }: Props) {
  const liveEnabled = process.env.NEXT_PUBLIC_ENABLE_LIVE_EXECUTION === "true";
  const canExecuteLive = liveEnabled && walletConnected && correctNetwork;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/60 backdrop-blur border border-emerald-200 rounded-3xl p-6 sm:p-8 text-center shadow-soft relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-100 via-emerald-400 to-emerald-100 opacity-50" />
      
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5 shadow-sm border border-emerald-100">
        <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500" />
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 tracking-tight font-display">Execution Readiness</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
        Real OKX quote received. Review the trade plan and quote above. Unknown-risk and high-risk tokens cannot proceed.
      </p>

      {/* Status chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {!walletConnected && (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-600 px-3 py-1.5 rounded-full text-xs font-bold">
            <Wallet className="w-3 h-3" />
            Wallet not connected
          </span>
        )}
        {walletConnected && !correctNetwork && (
          <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-full text-xs font-bold">
            <AlertTriangle className="w-3 h-3" />
            Wrong network
          </span>
        )}
        {!liveEnabled && (
          <span className="inline-flex items-center gap-1.5 bg-muted border border-border text-muted-foreground px-3 py-1.5 rounded-full text-xs font-bold">
            <Lock className="w-3 h-3" />
            Live execution disabled by config
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
        <button 
          onClick={onReject}
          disabled={disabled}
          aria-label="Reject this trade"
          className="w-full sm:w-auto px-8 py-3 rounded-full text-foreground/70 border border-border hover:bg-muted hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
        >
          Reject
        </button>
        <button 
          onClick={onApprove}
          disabled={disabled}
          aria-label={canExecuteLive ? "Approve and sign with wallet" : "Approve and record decision"}
          className="group relative w-full sm:w-auto px-8 py-3 rounded-full bg-emerald-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:bg-emerald-600 hover:-translate-y-0.5 overflow-hidden text-sm"
        >
          <span className="relative z-10">
            {canExecuteLive ? "Approve & Sign" : "Approve"}
          </span>
        </button>
      </div>

      <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground border border-border max-w-md">
        <Info className="w-4 h-4 text-electric shrink-0" />
        <span className="text-left">
          {canExecuteLive
            ? "Your browser wallet will prompt for transaction signing. No keys are handled by this app."
            : "Live execution is disabled. Approval records your decision. No funds are moved."
          }
        </span>
      </div>
    </motion.div>
  );
}
