"use client";

import { Radio, TrendingUp, Flame, BarChart2, Zap } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

const SIGNAL_CARDS = [
  {
    icon: Radio,
    title: "X Layer Signals",
    description: "Smart money buy signals aggregated across X Layer DEXs.",
    skills: ["okx-dex-signal"],
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: TrendingUp,
    title: "OKB Momentum",
    description: "OKB price action, volume trends, and market structure indicators.",
    skills: ["okx-dex-market"],
    color: "text-[var(--app-warning)]",
    bgColor: "bg-[var(--app-warning)]/10",
  },
  {
    icon: Flame,
    title: "Trending Tokens",
    description: "High activity tokens with notable volume or smart money interest.",
    skills: ["okx-dex-token", "okx-dex-signal"],
    color: "text-[var(--app-danger)]",
    bgColor: "bg-[var(--app-danger)]/10",
  },
  {
    icon: BarChart2,
    title: "Signal Confidence",
    description: "Confidence scoring based on provider availability and data freshness.",
    skills: ["okx-dex-market", "okx-dex-ws"],
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
];

export function SignalsPanel() {
  return (
    <div className="flex-1 overflow-y-auto scroll-contain">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Signals</h1>
            <Badge variant="secondary" className="bg-[var(--app-warning)]/10 text-[var(--app-warning)] hover:bg-[var(--app-warning)]/20 border-transparent">
              Informational Only
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Market intelligence from X Layer. Signals do not trigger execution.
          </p>
        </div>

        {/* Safety notice */}
        <div className="rounded-xl p-4 mb-6 flex items-start gap-3 bg-primary/5 border border-primary/10">
          <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-1" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Signal views are read-only. No approvalId, unsignedTx, wallet popup, or execution path
            is created from this panel. Use Chat to interact with live signal data.
          </p>
        </div>

        {/* Signal cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SIGNAL_CARDS.map((card) => {
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
                  </div>

                  {/* Skills */}
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

        {/* Chart placeholder */}
        <div className="mt-6 rounded-xl p-6 text-center bg-card border border-dashed border-border">
          <BarChart2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs font-medium mb-1 text-muted-foreground">
            Chart data belum tersedia.
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            TradingView Lightweight Charts will be integrated for price and volume visualization.
          </p>
        </div>
      </div>
    </div>
  );
}
