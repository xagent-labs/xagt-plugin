"use client";

import { LogOut } from "lucide-react";
import { CopyAddress } from "./CopyAddress";

interface Props {
  isAuthenticated: boolean;
  hasWallet: boolean;
  walletAddress?: string | null;
  userEmail?: string | null;
  chainName: string;
  executionMode: string;
  onConnectWallet: () => void;
  onSignIn: () => void;
  onLogout: () => void;
}

/* Inline SVG icons for premium feel — no lucide dependency for these */
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function SettingsPanel({
  isAuthenticated,
  hasWallet,
  walletAddress,
  userEmail,
  chainName,
  executionMode,
  onConnectWallet,
  onSignIn,
  onLogout,
}: Props) {
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "oklch(0.62 0.19 260 / 0.1)", border: "1px solid oklch(0.62 0.19 260 / 0.15)" }}
          >
            <span style={{ color: "oklch(0.7 0.19 260)" }}><IconShield /></span>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--app-text-primary)" }}>Settings</h2>
          <p className="text-sm mb-6" style={{ color: "var(--app-text-secondary)" }}>Sign in to manage your account and preferences.</p>
          <button type="button" onClick={onSignIn} className="btn-capsule-white text-sm px-6 py-2.5">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const sectionStyle = {
    background: "var(--app-card-glass)",
    border: "1px solid var(--app-card-border)",
    backdropFilter: "blur(12px)",
  };

  const rowBorder = { borderBottom: "1px solid var(--app-card-border)" };

  return (
    <div className="flex-1 overflow-y-auto scroll-contain">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="section-header">
          <h1 className="text-xl sm:text-2xl font-display font-bold" style={{ color: "var(--app-text-primary)" }}>Settings</h1>
          <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>Manage your account, wallet, and preferences.</p>
        </div>

        {/* Account */}
        <section className="rounded-xl p-5 mb-4" style={sectionStyle}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--app-text-primary)" }}>
            <span style={{ color: "oklch(0.7 0.19 260)" }}><IconUser /></span>
            Account
          </h2>
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2.5" style={rowBorder}>
              <span className="text-sm" style={{ color: "var(--app-text-secondary)" }}>Email</span>
              <span className="text-sm font-medium" style={{ color: "var(--app-text-primary)" }}>{userEmail ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm" style={{ color: "var(--app-text-secondary)" }}>Auth Provider</span>
              <span className="text-sm font-medium" style={{ color: "var(--app-text-primary)" }}>Privy</span>
            </div>
          </div>
        </section>

        {/* Wallet */}
        <section className="rounded-xl p-5 mb-4" style={sectionStyle}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--app-text-primary)" }}>
            <span style={{ color: "oklch(0.7 0.19 260)" }}><IconWallet /></span>
            Wallet
          </h2>
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2.5" style={rowBorder}>
              <span className="text-sm" style={{ color: "var(--app-text-secondary)" }}>Status</span>
              {hasWallet && walletAddress ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--app-success)" }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--app-success)" }} />
                  Connected
                </span>
              ) : (
                <span className="text-sm" style={{ color: "var(--app-text-tertiary)" }}>Not connected</span>
              )}
            </div>
            {hasWallet && walletAddress && (
              <div className="flex items-center justify-between py-2.5" style={rowBorder}>
                <span className="text-sm" style={{ color: "var(--app-text-secondary)" }}>Address</span>
                <CopyAddress address={walletAddress} className="text-sm" />
              </div>
            )}
            {!hasWallet && (
              <div className="pt-2">
                <button
                  onClick={onConnectWallet}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                  style={{ border: "1px solid oklch(0.62 0.19 260 / 0.3)", color: "oklch(0.7 0.19 260)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "oklch(0.62 0.19 260 / 0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <IconLink />
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Network & Execution */}
        <section className="rounded-xl p-5 mb-4" style={sectionStyle}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--app-text-primary)" }}>
            <span style={{ color: "oklch(0.7 0.19 260)" }}><IconLayers /></span>
            Network & Execution
          </h2>
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2.5" style={rowBorder}>
              <span className="text-sm" style={{ color: "var(--app-text-secondary)" }}>Active Chain</span>
              <span className="text-sm font-medium" style={{ color: "var(--app-text-primary)" }}>{chainName}</span>
            </div>
            <div className="flex items-center justify-between py-2.5" style={rowBorder}>
              <span className="text-sm" style={{ color: "var(--app-text-secondary)" }}>Execution Mode</span>
              <span
                className="text-sm font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{
                  color: executionMode === "Live" ? "var(--app-danger)" : "var(--app-success)",
                  background: executionMode === "Live" ? "oklch(0.65 0.2 25 / 0.1)" : "oklch(0.72 0.17 155 / 0.1)",
                }}
              >
                {executionMode}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm" style={{ color: "var(--app-text-secondary)" }}>Security Model</span>
              <span className="text-sm font-medium" style={{ color: "var(--app-text-primary)" }}>Non-custodial, user-signed</span>
            </div>
          </div>
        </section>

        {/* Billing & API Access — Preview */}
        <section className="rounded-xl p-5 mb-4" style={sectionStyle}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--app-text-primary)" }}>
            <span style={{ color: "oklch(0.78 0.15 85)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </span>
            Billing & API Access
            <span
              className="status-badge"
              style={{ background: "oklch(0.78 0.15 85 / 0.1)", color: "oklch(0.78 0.15 85)", borderColor: "oklch(0.78 0.15 85 / 0.15)" }}
            >
              Coming Soon
            </span>
          </h2>
          <p className="text-[13px] mb-3 leading-relaxed" style={{ color: "var(--app-text-secondary)" }}>
            Machine-to-machine payment protocols for premium API access and agent-to-agent commerce.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["okx-agent-payments-protocol", "okx-x402-payment", "okx-a2a-payment"].map((skill) => (
              <span key={skill} className="skill-tag">
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* Session */}
        <section className="rounded-xl p-5" style={{ ...sectionStyle, borderColor: "oklch(0.65 0.2 25 / 0.15)" }}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--app-text-primary)" }}>
            <span style={{ color: "var(--app-danger)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </span>
            Session
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--app-text-secondary)" }}>
            Sign out will disconnect your session. You will need to sign in again.
          </p>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
            style={{ border: "1px solid oklch(0.65 0.2 25 / 0.2)", color: "var(--app-danger)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "oklch(0.65 0.2 25 / 0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
