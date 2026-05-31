"use client";

import { Shield, Layers, ArrowRight, Lock, Eye, Cpu, AlertTriangle, Info } from "lucide-react";

const ABOUT_SECTIONS = [
  {
    icon: Shield,
    title: "What is PhylaX?",
    content: "PhylaX is an AI execution firewall for OKX X Layer. Before you sign any transaction, PhylaX checks the trade — scanning for token risks, simulating execution, and validating the safety of your swap.",
  },
  {
    icon: Lock,
    title: "Safety Model",
    content: "Non-custodial, user-signed execution only. PhylaX never holds your keys, never broadcasts transactions autonomously, and never bypasses your wallet approval. Every trade requires your explicit signature.",
  },
  {
    icon: Layers,
    title: "X Layer",
    content: "PhylaX currently operates on OKX X Layer (Chain ID 196). Support for additional chains is planned but not yet active.",
  },
  {
    icon: Eye,
    title: "Execution Flow",
    content: "AI checks → User signs. PhylaX runs risk scanning (token-scan), quote preflight, and pre-sign EVM simulation before presenting transaction data to your wallet for signing.",
  },
];

const ROADMAP_ITEMS = [
  { label: "Agentic Wallet", desc: "Autonomous execution with policy controls and budget limits.", status: "Roadmap" },
  { label: "x402 / Premium Actions", desc: "Machine-to-machine payment protocol for premium API access.", status: "Roadmap" },
  { label: "Multi-chain Execution", desc: "Expand beyond X Layer to Base, Ethereum, and other EVM chains.", status: "Planned" },
  { label: "Autonomy Controls", desc: "User-defined policies for automated trading strategies.", status: "Roadmap" },
];

const CAPABILITIES = [
  { skill: "okx-dex-swap", label: "DEX Swap & Quote" },
  { skill: "okx-security", label: "Token Risk Scanning" },
  { skill: "okx-onchain-gateway", label: "Transaction Simulation" },
  { skill: "okx-dex-signal", label: "Smart Money Signals" },
  { skill: "okx-dex-market", label: "Market Data & K-line" },
  { skill: "okx-dex-token", label: "Token Discovery" },
  { skill: "okx-wallet-portfolio", label: "Portfolio Lookup" },
  { skill: "okx-dex-trenches", label: "Meme Token Research" },
  { skill: "okx-dex-ws", label: "WebSocket Live Feed" },
  { skill: "okx-audit-log", label: "Audit Logging" },
  { skill: "market-structure-analyzer", label: "Market Structure Analysis" },
  { skill: "okx-agentic-wallet", label: "Agentic Wallet (Future)" },
  { skill: "okx-agent-payments-protocol", label: "x402 Payments (Future)" },
  { skill: "okx-dex-strategy", label: "Limit Orders (Future)" },
  { skill: "okx-dapp-discovery", label: "DApp Router (Future)" },
  { skill: "okx-defi-invest", label: "DeFi Yield Discovery (Future)" },
  { skill: "okx-defi-portfolio", label: "DeFi Positions (Future)" },
  { skill: "okx-dex-bridge", label: "Cross-Chain Bridge (Future)" },
  { skill: "plugin-store", label: "Plugin Store (Future)" },
];

export function AboutPanel() {
  return (
    <div className="flex-1 overflow-y-auto scroll-contain">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="section-header">
          <h1 className="text-xl sm:text-2xl font-display font-bold" style={{ color: "var(--app-text-primary)" }}>
            About PhylaX
          </h1>
          <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
            AI execution firewall for OKX X Layer.
          </p>
        </div>

        {/* Core sections */}
        <div className="space-y-3 mb-8">
          {ABOUT_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className="rounded-xl p-5"
                style={{ background: "var(--app-card-glass)", border: "1px solid var(--app-card-border)" }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.62 0.19 260 / 0.08)" }}
                  >
                    <Icon style={{ width: 18, height: 18, color: "oklch(0.7 0.19 260)" }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--app-text-primary)" }}>
                      {section.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--app-text-secondary)" }}>
                      {section.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Roadmap */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--app-text-primary)" }}>
            <ArrowRight style={{ width: 14, height: 14, color: "oklch(0.7 0.19 260)" }} />
            Future Roadmap
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROADMAP_ITEMS.map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-4"
                style={{ background: "var(--app-card-glass)", border: "1px solid var(--app-card-border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold" style={{ color: "var(--app-text-primary)" }}>{item.label}</h4>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{ background: "oklch(0.78 0.15 85 / 0.1)", color: "oklch(0.78 0.15 85)", border: "1px solid oklch(0.78 0.15 85 / 0.15)" }}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--app-text-secondary)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* OKX Capabilities */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--app-text-primary)" }}>
            <Cpu style={{ width: 14, height: 14, color: "oklch(0.7 0.19 260)" }} />
            OKX Onchain OS Capabilities
          </h2>
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--app-card-glass)", border: "1px solid var(--app-card-border)" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CAPABILITIES.map((cap) => (
                <div key={cap.skill} className="flex items-center gap-2 py-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: cap.skill.includes("Future") || cap.label.includes("Future") ? "oklch(0.78 0.15 85)" : "oklch(0.72 0.17 155)" }}
                  />
                  <span className="text-xs" style={{ color: "var(--app-text-secondary)" }}>{cap.label}</span>
                  <span className="text-[9px] font-mono ml-auto" style={{ color: "var(--app-text-tertiary)" }}>{cap.skill}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: "oklch(0.78 0.15 85 / 0.06)", border: "1px solid oklch(0.78 0.15 85 / 0.12)" }}
        >
          <AlertTriangle style={{ width: 16, height: 16, color: "oklch(0.78 0.15 85)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 className="text-xs font-semibold mb-1" style={{ color: "oklch(0.78 0.15 85)" }}>Disclaimer</h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--app-text-secondary)" }}>
              PhylaX is an experimental AI execution firewall. It does not constitute financial advice.
              Risk scans and simulations are best-effort and may not catch all threats.
              Always verify transaction details before signing. Use at your own risk.
            </p>
          </div>
        </div>

        {/* Version */}
        <div className="mt-6 text-center">
          <p className="text-[10px] font-mono" style={{ color: "var(--app-text-tertiary)" }}>
            PhylaX v1.0 · OKX Onchain OS · X Layer (196)
          </p>
        </div>
      </div>
    </div>
  );
}
