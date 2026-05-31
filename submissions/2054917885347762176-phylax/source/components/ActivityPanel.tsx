"use client";

import { History, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Radio } from "lucide-react";

interface Props {
  isAuthenticated: boolean;
  onSignIn: () => void;
}

const ACTIVITY_CATEGORIES = [
  {
    icon: CheckCircle2,
    label: "Confirmed Transactions",
    description: "Successfully executed and confirmed on X Layer.",
    color: "oklch(0.72 0.17 155)",
    bgColor: "oklch(0.72 0.17 155 / 0.08)",
  },
  {
    icon: XCircle,
    label: "Blocked Attempts",
    description: "Transactions blocked by risk checks or policy violations.",
    color: "oklch(0.65 0.2 25)",
    bgColor: "oklch(0.65 0.2 25 / 0.08)",
  },
  {
    icon: ShieldCheck,
    label: "Risk Checks",
    description: "Token scans, honeypot detection, and security assessments.",
    color: "oklch(0.62 0.19 260)",
    bgColor: "oklch(0.62 0.19 260 / 0.08)",
  },
  {
    icon: Radio,
    label: "Pre-sign Simulations",
    description: "EVM dry-run simulations executed before wallet signing.",
    color: "oklch(0.7 0.15 200)",
    bgColor: "oklch(0.7 0.15 200 / 0.08)",
  },
  {
    icon: AlertTriangle,
    label: "Execution Events",
    description: "Approval requests, wallet submissions, and confirmations.",
    color: "oklch(0.78 0.15 85)",
    bgColor: "oklch(0.78 0.15 85 / 0.08)",
  },
];

export function ActivityPanel({ isAuthenticated, onSignIn }: Props) {
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "oklch(0.62 0.19 260 / 0.1)", border: "1px solid oklch(0.62 0.19 260 / 0.15)" }}
          >
            <History style={{ width: 20, height: 20, color: "oklch(0.7 0.19 260)" }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--app-text-primary)" }}>Activity</h2>
          <p className="text-sm mb-6" style={{ color: "var(--app-text-secondary)" }}>
            Sign in to view your execution history, blocked attempts, and risk checks.
          </p>
          <button type="button" onClick={onSignIn} className="btn-capsule-white text-sm px-6 py-2.5">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-contain">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="section-header">
          <h1 className="text-xl sm:text-2xl font-display font-bold" style={{ color: "var(--app-text-primary)" }}>Activity</h1>
          <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
            Execution history, blocked attempts, and risk check logs.
          </p>
        </div>

        {/* Activity categories */}
        <div className="space-y-3">
          {ACTIVITY_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.label}
                className="rounded-xl p-5"
                style={{
                  background: "var(--app-card-glass)",
                  border: "1px solid var(--app-card-border)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: cat.bgColor }}
                  >
                    <Icon style={{ width: 18, height: 18, color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--app-text-primary)" }}>
                      {cat.label}
                    </h3>
                    <p className="text-xs mb-3" style={{ color: "var(--app-text-secondary)" }}>
                      {cat.description}
                    </p>
                    <div
                      className="text-xs px-3 py-2 rounded-lg inline-block"
                      style={{
                        background: "var(--app-card-glass)",
                        border: "1px solid var(--app-card-border)",
                        color: "var(--app-text-tertiary)",
                      }}
                    >
                      No activity recorded yet.
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* OKX Skill Mapping */}
        <div className="mt-8 rounded-xl p-4" style={{ background: "var(--app-card-glass)", border: "1px solid var(--app-card-border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--app-text-tertiary)" }}>
            Powered by
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["okx-audit-log", "okx-onchain-gateway", "okx-security"].map((skill) => (
              <span key={skill} className="skill-tag">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
