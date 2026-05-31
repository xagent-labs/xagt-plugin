"use client";

import { Shield, Search, Radio, UserCheck, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

const PIPELINE_STEPS = [
  {
    icon: Search,
    title: "1. Quote & Preflight",
    description: "DEX aggregation fetches optimal swap route with slippage and gas estimation.",
    skill: "okx-dex-swap",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Shield,
    title: "2. Risk Gate",
    description: "Token security scan checks for honeypots, rug pulls, and suspicious contract behavior.",
    skill: "okx-security",
    color: "text-[var(--app-danger)]",
    bgColor: "bg-[var(--app-danger)]/10",
  },
  {
    icon: Radio,
    title: "3. Pre-sign Simulation",
    description: "EVM dry-run simulation detects reverts and asset changes before wallet signing.",
    skill: "okx-onchain-gateway",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: UserCheck,
    title: "4. User Approval",
    description: "Transaction data presented to your wallet. You review and sign — or reject.",
    skill: "wallet-provider",
    color: "text-[var(--app-warning)]",
    bgColor: "bg-[var(--app-warning)]/10",
  },
];

export function ExecutionPanel() {
  return (
    <div className="flex-1 overflow-y-auto scroll-contain">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
            Execution Firewall
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Every trade passes through 4 safety gates before your wallet is prompted.
          </p>
        </div>

        {/* Core principle */}
        <div className="rounded-xl p-5 mb-6 flex items-center justify-center gap-4 bg-primary/5 border border-primary/10">
          <span className="text-sm font-semibold text-primary">AI checks</span>
          <ArrowRight className="w-4 h-4 text-muted-foreground/70" />
          <span className="text-sm font-semibold text-[var(--app-warning)]">User signs</span>
        </div>

        {/* Pipeline steps */}
        <div className="space-y-3 mb-8">
          {PIPELINE_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative">
                <Card>
                  <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${step.bgColor}`}>
                      <Icon className={`w-5 h-5 ${step.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">
                          {step.title}
                        </h3>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {step.skill}
                        </Badge>
                      </div>
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                {/* Connector */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="flex justify-center mt-3 -mb-1">
                    <div className="w-px h-5 bg-gradient-to-b from-border to-transparent" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* State panels */}
        <h2 className="text-sm font-semibold mb-3 text-foreground">
          Execution States
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl p-4 flex items-center gap-3 bg-[var(--app-success)]/10 border border-[var(--app-success)]/20">
            <CheckCircle2 className="w-[18px] h-[18px] shrink-0 text-[var(--app-success)]" />
            <div>
              <h4 className="text-sm font-semibold text-[var(--app-success)]">Confirmed</h4>
              <p className="text-[11px] text-muted-foreground">Transaction signed and confirmed on-chain.</p>
            </div>
          </div>
          <div className="rounded-xl p-4 flex items-center gap-3 bg-[var(--app-danger)]/10 border border-[var(--app-danger)]/20">
            <XCircle className="w-[18px] h-[18px] shrink-0 text-[var(--app-danger)]" />
            <div>
              <h4 className="text-sm font-semibold text-[var(--app-danger)]">Blocked</h4>
              <p className="text-[11px] text-muted-foreground">Execution prevented by risk gate or simulation failure.</p>
            </div>
          </div>
        </div>

        {/* No active execution */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            No active execution. Use Chat to initiate a swap.
          </p>
        </div>
      </div>
    </div>
  );
}
