"use client";

import { ShieldAlert, Bug, Users, BarChart3, TrendingDown, Route } from "lucide-react";

import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

const ANALYSIS_CARDS = [
  {
    icon: ShieldAlert,
    title: "Token Risk",
    description: "Honeypot detection, rug pull indicators, and contract risk scoring.",
    skills: ["okx-security", "okx-dex-token"],
    color: "text-[var(--app-danger)]",
    bgColor: "bg-[var(--app-danger)]/10",
  },
  {
    icon: Bug,
    title: "Meme Radar",
    description: "New meme launches, bonding curve progress, and developer reputation.",
    skills: ["okx-dex-trenches", "okx-dex-market"],
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Users,
    title: "KOL Signals",
    description: "Smart money and KOL wallet activity tracking with aggregated buy signals.",
    skills: ["okx-dex-signal"],
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: BarChart3,
    title: "Position Check",
    description: "Wallet holdings, portfolio value, and DeFi position overview.",
    skills: ["okx-wallet-portfolio", "okx-dex-market", "okx-defi-portfolio"],
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: TrendingDown,
    title: "Buy/Sell Pressure",
    description: "Taker volume, trade feed analysis, and real-time order flow.",
    skills: ["okx-dex-market", "okx-dex-ws", "market-structure-analyzer"],
    color: "text-[var(--app-warning)]",
    bgColor: "bg-[var(--app-warning)]/10",
  },
  {
    icon: Route,
    title: "Route Analysis",
    description: "DEX aggregation routing, gas estimation, and execution path optimization.",
    skills: ["okx-dex-swap", "okx-onchain-gateway"],
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

export function AnalysisPanel() {
  return (
    <div className="flex-1 overflow-y-auto scroll-contain">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Analysis</h1>
          <p className="text-sm mt-1 text-muted-foreground">
            On-chain intelligence modules. Use Chat to run live analysis.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ANALYSIS_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="group">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.bgColor}`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">
                        {card.title}
                      </h3>
                      <p className="text-[13px] mt-1 leading-relaxed text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  {/* Data placeholder */}
                  <div className="rounded-lg px-3 py-3 mb-4 bg-muted/50 border border-dashed border-border">
                    <p className="text-xs text-center font-medium text-muted-foreground">
                      Data belum tersedia.
                    </p>
                    <p className="text-[10px] mt-1 text-center text-muted-foreground/70">
                      Data confidence: —
                    </p>
                  </div>

                  {/* Skill mapping */}
                  <div className="flex flex-wrap gap-1.5">
                    {card.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="font-mono text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Hint */}
        <div className="mt-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            Switch to Chat tab to run live analysis queries with PhylaX AI.
          </p>
        </div>
      </div>
    </div>
  );
}
