"use client";

import { motion } from "framer-motion";
import { Wallet, Eye, BarChart3, ShieldOff, Radio, ArrowRight, AlertTriangle } from "lucide-react";
import type { WalletState } from "../lib/wallet";

interface Props {
  wallet: WalletState;
  onConnectWallet: () => void;
  onDisconnect: () => void;
}

export function WalletStatusCard({ wallet, onConnectWallet, onDisconnect }: Props) {
  const truncAddr = wallet.address
    ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="backdrop-blur border border-border rounded-3xl overflow-hidden shadow-soft"
      style={{ background: "var(--card)" }}
    >
      <div className="p-5 border-b border-border/50 flex items-center gap-3" style={{ background: "oklch(0 0 0 / 0.06)" }}>
        <Wallet className="w-5 h-5 text-electric" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-[0.15em]">Wallet &amp; Readiness</h3>
      </div>

      <div className="p-5 space-y-4">
        {/* Wallet status */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground font-medium">Wallet</span>
          {wallet.connected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "oklch(0.5 0.15 160 / 0.1)", border: "1px solid oklch(0.55 0.15 160 / 0.2)", color: "oklch(0.6 0.17 160)" }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              {truncAddr}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground text-xs font-bold">
              Not Connected
            </span>
          )}
        </div>

        {/* Provider */}
        {wallet.providerName && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Provider</span>
            <span className="text-xs font-bold text-foreground">{wallet.providerName}</span>
          </div>
        )}

        {/* Network */}
        {wallet.connected && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Network</span>
            {wallet.correctNetwork ? (
              <span className="text-xs font-bold" style={{ color: "oklch(0.6 0.17 160)" }}>✓ Correct</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: "oklch(0.7 0.2 27)" }}>
                <AlertTriangle className="w-3 h-3" />
                Wrong (ID: {wallet.chainId})
              </span>
            )}
          </div>
        )}

        {/* Balance */}
        {wallet.connected && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Balance</span>
            <span className="text-xs font-bold text-foreground">
              {wallet.nativeBalance !== null ? `${wallet.nativeBalance} ETH` : "Loading…"}
            </span>
          </div>
        )}

        {/* Mode */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground font-medium">Mode</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-electric/10 border border-electric/20 text-electric text-xs font-bold">
            <Eye className="w-3 h-3" />
            {wallet.connected ? "Production" : "Research"}
          </span>
        </div>

        {/* Execution */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground font-medium">Live Execution</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground text-xs font-bold">
            <ShieldOff className="w-3 h-3" />
            Disabled
          </span>
        </div>

        <hr className="border-border/50" />

        {/* Capabilities */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Available Without Wallet</h4>
          <div className="flex flex-col gap-1.5 text-xs text-foreground/70">
            <span className="flex items-center gap-2"><Radio className="w-3 h-3 text-emerald-500" /> KOL signal discovery</span>
            <span className="flex items-center gap-2"><BarChart3 className="w-3 h-3 text-emerald-500" /> Security risk scanning</span>
            <span className="flex items-center gap-2"><BarChart3 className="w-3 h-3 text-emerald-500" /> Real OKX quote &amp; preflight</span>
          </div>
        </div>

        {/* Error */}
        {wallet.error && (
          <div className="text-xs px-3 py-2 rounded-lg font-medium break-words" style={{ color: "oklch(0.7 0.2 27)", background: "oklch(0.55 0.22 27 / 0.08)", border: "1px solid oklch(0.55 0.22 27 / 0.15)" }}>
            {wallet.error}
          </div>
        )}

        {/* Connect / Disconnect */}
        {!wallet.connected ? (
          <div className="space-y-3 pt-2">
            {!wallet.providerDetected && (
              <p className="text-xs px-3 py-2 rounded-lg font-medium" style={{ color: "oklch(0.75 0.18 85)", background: "oklch(0.6 0.18 85 / 0.08)", border: "1px solid oklch(0.6 0.18 85 / 0.15)" }}>
                No wallet detected. Install OKX Wallet or MetaMask.
              </p>
            )}
            <button
              onClick={onConnectWallet}
              disabled={wallet.connecting}
              aria-label="Connect wallet"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-electric/30 bg-electric/10 text-electric text-sm font-bold hover:bg-electric/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wallet className="w-4 h-4" />
              {wallet.connecting ? "Connecting…" : "Connect Wallet"}
              {!wallet.connecting && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <button
            onClick={onDisconnect}
            className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors pt-1"
          >
            Disconnect
          </button>
        )}
      </div>
    </motion.div>
  );
}
