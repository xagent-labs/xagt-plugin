"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Wallet, ChevronDown } from "lucide-react";
import { SUPPORTED_CHAINS, type ChainConfig } from "../lib/chains";

const landingLinks = [
  { label: "Read More", href: "#about" },
  { label: "Safety Model", href: "#safety-model" },
  { label: "How It Works", href: "#ecosystem" },
];

interface NavbarProps {
  /** Whether the user is in app/console mode vs landing */
  appMode: boolean;
  onLaunch?: () => void;
  /** Selected chain config */
  selectedChain: ChainConfig;
  onChainChange: (chain: ChainConfig) => void;
  walletConnected: boolean;
  onConnectWallet: () => void;
}

function ChainIcon({ label, size = 20 }: { label: string; size?: number }) {
  const isUrl = label.startsWith("/");
  return (
    <div
      className="inline-flex items-center justify-center rounded-full overflow-hidden bg-muted shrink-0 border border-white/20"
      style={{ width: size, height: size }}
    >
      {isUrl ? (
        <Image src={label} alt="chain" width={size} height={size} className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-bold" style={{ fontSize: size * 0.5 }}>{label}</span>
      )}
    </div>
  );
}

export function Navbar({
  appMode,
  onLaunch,
  selectedChain,
  onChainChange,
  walletConnected,
  onConnectWallet,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close chain dropdown on outside click
  useEffect(() => {
    if (!chainOpen) return;
    const close = () => setChainOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [chainOpen]);

  const textColor = scrolled ? "text-white" : "text-foreground";
  const subtextColor = scrolled ? "text-white/70" : "text-foreground/60";

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ease-out ${
        scrolled ? "glass-dark border-b border-white/10" : "bg-transparent"
      }`}
      style={{
        transform: mounted ? "translateY(0)" : "translateY(-20px)",
        opacity: mounted ? 1 : 0,
        transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.5s ease-out, backdrop-filter 0.5s ease-out",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 h-16 md:h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className={`text-xl md:text-2xl font-bold tracking-tight transition-colors duration-300 ${textColor}`}>
            Phyla<span className="text-gradient-brand">X</span>
          </span>
        </Link>

        {/* ─── Desktop Nav ─── */}
        <nav className="hidden md:flex items-center gap-1">
          {!appMode && (
            <>
              {/* Landing links */}
              {landingLinks.map((it) => (
                <a
                  key={it.label}
                  href={it.href}
                  className={`relative group px-4 py-2 text-sm rounded-full transition-all duration-200 ${
                    scrolled ? "text-white/80 hover:text-white" : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {it.label}
                  <span
                    className={`absolute left-4 right-4 -bottom-0.5 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-250 origin-left ${
                      scrolled ? "bg-gradient-to-r from-electric to-indigo-soft" : "bg-foreground/40"
                    }`}
                  />
                </a>
              ))}
              {/* Launch App — landing only */}
              <button
                type="button"
                onClick={onLaunch}
                aria-label="Launch Agent Console"
                className="ml-2 relative inline-flex items-center rounded-full bg-gradient-brand text-white px-5 py-2 text-sm font-medium hover:shadow-glow transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{ boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.2), 0 10px 30px -10px oklch(0.62 0.19 260 / 0.5)" }}
              >
                Launch App
              </button>
            </>
          )}

          {appMode && (
            <>
              {/* Back to overview */}
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`px-4 py-2 text-sm rounded-full transition-all duration-200 ${subtextColor} hover:${textColor}`}
              >
                Overview
              </a>

              {/* Chain Selector */}
              <div className="relative ml-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setChainOpen((o) => !o); }}
                  aria-label="Select chain"
                  aria-expanded={chainOpen}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-all duration-200 ${
                    scrolled
                      ? "bg-white/10 border-white/20 text-white/90 hover:bg-white/20"
                      : "bg-white border-border text-foreground hover:border-electric/30"
                  }`}
                >
                  <ChainIcon label={selectedChain.iconLabel} />
                  <span className="hidden lg:inline">{selectedChain.name}</span>
                  <ChevronDown size={14} className={`chevron-rotate ${chainOpen ? "is-open" : ""}`} />
                </button>

                {/* Always-mounted chain dropdown */}
                <div
                  className={`absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-border shadow-soft overflow-hidden z-50 dropdown-panel ${chainOpen ? "is-open" : ""}`}
                >
                  {SUPPORTED_CHAINS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      disabled={!c.enabled}
                      onClick={() => { if (c.enabled) { onChainChange(c); setChainOpen(false); } }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors duration-120 ${
                        c.id === selectedChain.id
                          ? "bg-electric/10 text-electric font-bold"
                          : c.enabled
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground/50 cursor-not-allowed"
                      }`}
                    >
                      <ChainIcon label={c.iconLabel} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">Index: {c.chainIndex}</div>
                      </div>
                      {c.id === selectedChain.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-electric" />
                      )}
                      {!c.enabled && c.disabledReason && (
                        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{c.disabledReason}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Connect Wallet */}
              <button
                type="button"
                onClick={onConnectWallet}
                aria-label={walletConnected ? "Wallet connected" : "Connect wallet"}
                className={`ml-1 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border transition-all duration-200 ${
                  walletConnected
                    ? scrolled
                      ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                      : "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : scrolled
                    ? "bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:text-white"
                    : "bg-white border-border text-foreground/70 hover:border-electric/30 hover:text-foreground"
                }`}
              >
                <Wallet size={14} />
                <span className="hidden lg:inline">{walletConnected ? "Connected" : "Connect"}</span>
                {walletConnected && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                )}
              </button>
            </>
          )}
        </nav>

        {/* ─── Mobile Right ─── */}
        <div className="md:hidden flex items-center gap-1.5">
          {appMode && (
            <>
              {/* Compact chain icon */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setChainOpen((o) => !o); }}
                aria-label="Select chain"
                className={`p-2 rounded-full transition-colors duration-150 ${scrolled ? "text-white/80" : "text-foreground/70"}`}
              >
                <ChainIcon label={selectedChain.iconLabel} size={22} />
              </button>
              {/* Compact wallet icon */}
              <button
                type="button"
                onClick={onConnectWallet}
                aria-label={walletConnected ? "Wallet connected" : "Connect wallet"}
                className={`p-2 rounded-full transition-colors duration-150 ${
                  walletConnected
                    ? scrolled ? "text-emerald-300" : "text-emerald-600"
                    : scrolled ? "text-white/70" : "text-foreground/60"
                }`}
              >
                <Wallet size={18} />
              </button>
            </>
          )}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen((o) => !o)}
            className={`p-2 rounded-full transition-colors duration-150 ${scrolled ? "text-white" : "text-foreground"}`}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ─── Mobile Drawer ─── */}
      <div
        className="md:hidden overflow-hidden transition-all duration-250 ease-out"
        style={{
          maxHeight: mobileOpen ? "400px" : "0px",
          opacity: mobileOpen ? 1 : 0,
        }}
      >
        <div className="bg-navy text-white px-6 py-6 flex flex-col gap-1">
          {!appMode && (
            <>
              {landingLinks.map((it) => (
                <a
                  key={it.label}
                  href={it.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-3 rounded-xl text-base text-white/80 hover:bg-white/10 hover:text-white transition-colors duration-150"
                >
                  {it.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => { setMobileOpen(false); onLaunch?.(); }}
                className="mt-2 rounded-xl bg-gradient-brand text-white px-5 py-3 text-center font-medium"
              >
                Launch App
              </button>
            </>
          )}

          {appMode && (
            <>
              {/* Chain selector in mobile menu */}
              <div className="px-3 py-2">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Network</p>
                <div className="flex gap-2">
                  {SUPPORTED_CHAINS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      disabled={!c.enabled}
                      onClick={() => { onChainChange(c); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors duration-150 ${
                        c.id === selectedChain.id
                          ? "bg-electric/20 border-electric/40 text-white"
                          : c.enabled
                          ? "border-white/10 text-white/60 hover:bg-white/10"
                          : "border-white/5 text-white/30 cursor-not-allowed"
                      }`}
                    >
                      <ChainIcon label={c.iconLabel} size={18} />
                      {c.name}
                      {!c.enabled && <span className="text-[9px] uppercase">Soon</span>}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setMobileOpen(false); onConnectWallet(); }}
                className={`mt-2 rounded-xl px-5 py-3 text-center font-medium border transition-colors duration-150 ${
                  walletConnected
                    ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/20"
                    : "border-white/20 text-white/80 hover:bg-white/10"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Wallet size={16} />
                  {walletConnected ? "Wallet Connected" : "Connect Wallet"}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile chain dropdown overlay (app mode) — always mounted, CSS animated */}
      <div
        className={`md:hidden absolute right-4 top-full mt-1 w-56 rounded-2xl bg-white border border-border shadow-soft overflow-hidden z-50 dropdown-panel ${chainOpen && appMode ? "is-open" : ""}`}
      >
        {SUPPORTED_CHAINS.map((c) => (
          <button
            type="button"
            key={c.id}
            disabled={!c.enabled}
            onClick={() => { if (c.enabled) { onChainChange(c); setChainOpen(false); } }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors duration-120 ${
              c.id === selectedChain.id
                ? "bg-electric/10 text-electric font-bold"
                : c.enabled
                ? "text-foreground hover:bg-muted"
                : "text-muted-foreground/50 cursor-not-allowed"
            }`}
          >
            <ChainIcon label={c.iconLabel} />
            <span>{c.name}</span>
            {!c.enabled && c.disabledReason && (
              <span className="text-[10px] text-muted-foreground/60 ml-auto">{c.disabledReason}</span>
            )}
          </button>
        ))}
      </div>
    </header>
  );
}
