"use client";

import { Wallet, Lock, FileText, Bot, Shield, Clock, ArrowRightLeft, TrendingUp } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

const FUTURE_FEATURES = [
  {
    icon: Bot,
    title: "Autonomous Execution",
    description: "Define budgets, token allowlists, and risk thresholds — let the agent execute within your policy.",
  },
  {
    icon: Shield,
    title: "Policy Controls",
    description: "Set per-token limits, max trade sizes, chain restrictions, and time-based execution windows.",
  },
  {
    icon: FileText,
    title: "Agent Audit Log",
    description: "Full transparency: every autonomous action logged with reasoning, risk assessment, and outcome.",
  },
  {
    icon: Clock,
    title: "Session Management",
    description: "Time-limited agent sessions with automatic expiry and kill-switch capability.",
  },
  {
    icon: TrendingUp,
    title: "DeFi Strategy & Limit Orders",
    description: "Automated yield discovery, limit order execution, and DeFi position management.",
  },
  {
    icon: ArrowRightLeft,
    title: "Cross-Chain Bridge",
    description: "Seamless asset bridging across chains with aggregated routing for optimal fees.",
  },
];

export function AgentWalletPanel() {
  return (
    <div className="flex-1 overflow-y-auto scroll-contain">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
              Agent Wallet
            </h1>
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-transparent">
              Preview
            </Badge>
            <Badge variant="secondary" className="bg-[var(--app-danger)]/10 text-[var(--app-danger)] hover:bg-[var(--app-danger)]/20 border-transparent">
              Not enabled
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Future roadmap feature — not currently active.
          </p>
        </div>

        {/* Current model notice */}
        <div className="rounded-xl p-5 mb-6 bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--app-warning)]/10">
              <Lock className="w-[18px] h-[18px] text-[var(--app-warning)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1 text-foreground">
                Current Model: User-Signed Execution
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                PhylaX currently operates in user-signed mode only. Every transaction requires your explicit
                wallet approval. The AI checks trades, but you always hold the signing key. No autonomous trading is active.
              </p>
            </div>
          </div>
        </div>

        {/* Agent Wallet concept */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-orange-500/10">
                <Wallet className="w-[18px] h-[18px] text-orange-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1 text-foreground">
                  What is Agent Wallet?
                </h3>
                <p className="text-xs leading-relaxed mb-4 text-muted-foreground">
                  Agentic Wallet is not enabled. The future Agent Wallet will be an opt-in only feature.
                  You must explicitly enable Agentic Wallet, configure limits, and fund a separate agent wallet 
                  before it can operate autonomously.
                </p>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button variant="default" disabled className="text-xs h-8">
                    Enable Agentic Wallet
                    <span className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-black/10 dark:bg-white/10">Coming soon</span>
                  </Button>
                  <Button variant="outline" disabled className="text-xs h-8">
                    Configure limits
                    <span className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-black/10 dark:bg-white/10">Coming soon</span>
                  </Button>
                  <Button variant="outline" disabled className="text-xs h-8">
                    Fund separate agent wallet
                    <span className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-black/10 dark:bg-white/10">Coming soon</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Powered by */}
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
              {["okx-agentic-wallet", "okx-audit-log", "okx-agent-payments-protocol", "okx-dex-strategy", "okx-defi-invest", "okx-dex-bridge"].map((skill) => (
                <Badge key={skill} variant="secondary" className="font-mono text-[10px]">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Future features */}
        <h2 className="text-sm font-semibold mb-3 text-foreground">
          Planned Capabilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FUTURE_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-xl p-4 bg-card border border-border">
                <div className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold mb-1 text-foreground">
                      {feature.title}
                    </h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-muted-foreground/70">
            Agent Wallet is a future roadmap feature powered by OKX Agentic Wallet.
            <br />
            Current PhylaX operates in non-custodial, user-signed mode only.
          </p>
        </div>
      </div>
    </div>
  );
}
