"use client";

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { PanelLeft, LogOut, User, AlertTriangle, Bot, BarChart3, History, Settings as SettingsIcon, Info, Moon, Sun } from "lucide-react";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { LandingHero } from "../components/landing/LandingHero";
import { SignalDivider } from "../components/landing/SignalDivider";
import { LandingAbout } from "../components/landing/LandingAbout";
import { LandingFeatures } from "../components/landing/LandingFeatures";
import { LandingEcosystem } from "../components/landing/LandingEcosystem";
import { LandingTeam } from "../components/landing/LandingTeam";
import { LandingToken } from "../components/landing/LandingToken";
import { LandingCTA } from "../components/landing/LandingCTA";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LoadingIntro } from "../components/landing/LoadingIntro";
import { ChatPanel } from "../components/ChatPanel";
import { AppSidebar, type ChatSession, type SidebarView, type AgentTab } from "../components/AppSidebar";
import { PortfolioPanel } from "../components/PortfolioPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { ActivityPanel } from "../components/ActivityPanel";
import { AboutPanel } from "../components/AboutPanel";
import { AnalysisPanel } from "../components/AnalysisPanel";
import { SignalsPanel } from "../components/SignalsPanel";
import { ExecutionPanel } from "../components/ExecutionPanel";
import { AgentWalletPanel } from "../components/AgentWalletPanel";
import { ChainSelector } from "../components/ChainSelector";
import { DEFAULT_CHAIN, type ChainConfig } from "../lib/chains";
import { usePrivyAuth } from "../components/PrivyProviderWrapper";
import { CopyAddress } from "../components/CopyAddress";
function createSession(): ChatSession {
  return { id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label: "New Chat", createdAt: Date.now() };
}

const EXECUTION_MODE = process.env.NEXT_PUBLIC_ENABLE_LIVE_EXECUTION === "true" ? "Live" : "Simulation";

export default function Home() {
  const STORAGE_KEY_SHOW_CONSOLE = "phylax_show_console";
  const STORAGE_KEY_AUTH_INTENT = "phylax_auth_intent";

  const [showConsole, setShowConsole] = useState(false);
  const [authFlowStarted, setAuthFlowStarted] = useState(false);
  const [hasRestoredClientState, setHasRestoredClientState] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainConfig>(DEFAULT_CHAIN);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLightMode, setIsLightMode] = useState(false);

  // Restore theme preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("phylax_theme");
    if (saved === "light") {
      setTimeout(() => setIsLightMode(true), 0);
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    setIsLightMode(prev => {
      const next = !prev;
      if (typeof window !== "undefined") window.localStorage.setItem("phylax_theme", next ? "light" : "dark");
      return next;
    });
  }, []);

  const [mobileSidebar, setMobileSidebar] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const shouldShowConsole = window.sessionStorage.getItem(STORAGE_KEY_SHOW_CONSOLE) === "1";
    const hasAuthIntent = window.sessionStorage.getItem(STORAGE_KEY_AUTH_INTENT) === "1";

    if (shouldShowConsole || hasAuthIntent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowConsole(true);
    }

    if (hasAuthIntent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthFlowStarted(true);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasRestoredClientState(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY_SHOW_CONSOLE, showConsole ? "1" : "0");
  }, [showConsole]);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<SidebarView>("agent");
  const [agentTab, setAgentTab] = useState<AgentTab>("chat");
  const consoleRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("phylax_active_session") || "";
    }
    return "";
  });
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Persist activeSessionId to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !activeSessionId) return;
    window.localStorage.setItem("phylax_active_session", activeSessionId);
  }, [activeSessionId]);

  // Track view transitions with a key to trigger the CSS animation
  const [viewKey, setViewKey] = useState(0);

  const privy = usePrivyAuth();

  const [initialPrivyReady, setInitialPrivyReady] = useState(false);
  useEffect(() => {
    if (privy.ready && !initialPrivyReady) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialPrivyReady(true);
    }
  }, [privy.ready, initialPrivyReady]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (e: Event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [userMenuOpen]);

  const handleLaunch = useCallback(() => {
    setShowConsole(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY_SHOW_CONSOLE, "1");
    }
    setTimeout(() => consoleRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);
  const handleChainChange = useCallback((chain: ChainConfig) => { if (chain.enabled) setSelectedChain(chain); }, []);
  const handleSignIn = useCallback((event?: unknown) => {
    if (event) {
      const e = event as { preventDefault?: () => void; stopPropagation?: () => void };
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }
    
    // Immediately lock the user into the app shell so no redirect back to landing
    // happens while the Privy OAuth popup/redirect is opening or pending.
    setShowConsole(true);
    setAuthFlowStarted(true);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY_SHOW_CONSOLE, "1");
      window.sessionStorage.setItem(STORAGE_KEY_AUTH_INTENT, "1");
    }

    console.log("[PhylaX] Calling privy.login()...");
    try {
      if (typeof privy.login === "function") {
        privy.login();
      } else {
        console.error("[PhylaX] privy.login is not a function!", privy);
      }
    } catch (err) {
      console.error("[PhylaX] Error during privy.login:", err);
    }

    return false;
  }, [privy]);
  const handleLogout = useCallback(async () => {
    await privy.logout();
    setUserMenuOpen(false);
    setShowConsole(false);
    setAuthFlowStarted(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY_SHOW_CONSOLE);
      window.sessionStorage.removeItem(STORAGE_KEY_AUTH_INTENT);
    }
  }, [privy]);
  const handleConnectWallet = useCallback((event?: unknown) => {
    if (event) {
      const e = event as { preventDefault?: () => void; stopPropagation?: () => void };
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }
    
    console.log("[PhylaX] handleConnectWallet clicked. Storing intent...");
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY_SHOW_CONSOLE, "1");
    }
    
    console.log("[PhylaX] Calling privy.connectWallet()...");
    try {
      if (typeof privy.connectWallet === "function") {
        privy.connectWallet();
      } else {
        console.error("[PhylaX] privy.connectWallet is not a function!", privy);
      }
    } catch (err) {
      console.error("[PhylaX] Error during privy.connectWallet:", err);
    }
    
    setUserMenuOpen(false);
    return false;
  }, [privy]);
  const handleChangeView = useCallback((view: SidebarView) => {
    setActiveView(view);
    setMobileSidebar(false);
    setViewKey((k: number) => k + 1);
  }, []);

  // ─── DB Session Management ──────────────────────────────────────────

  const handleNewChat = useCallback(async () => {
    console.log("[PhylaX] handleNewChat called. authenticated:", privy.authenticated);
    setActiveView("agent");
    setViewKey((k: number) => k + 1);

    if (privy.authenticated) {
      try {
        console.log("[PhylaX] Fetching token for new session POST...");
        const token = await privy.getAccessToken();
        const res = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chain: selectedChain.id }),
        });
        console.log("[PhylaX] Sent POST /api/chat/sessions. Response status:", res.status);
        const data = await res.json();
        if (data.session) {
          console.log("[PhylaX] DB Session created successfully:", data.session.id);
          const newS = {
            id: data.session.id,
            label: data.session.title,
            createdAt: new Date(data.session.createdAt).getTime(),
          };
          setSessions((prev: ChatSession[]) => [newS, ...prev]);
          setActiveSessionId(newS.id);
          return newS.id;
        } else {
          console.error("[PhylaX] DB Session missing in response data:", data);
        }
      } catch (err) {
        console.error("[PhylaX] Failed to create session:", err);
      }
    } else {
      console.log("[PhylaX] Not authenticated, creating local dummy session...");
      const s = createSession();
      setSessions((prev: ChatSession[]) => [s, ...prev]);
      setActiveSessionId(s.id);
      return s.id;
    }
  }, [privy, selectedChain.id]);

  const fetchSessions = useCallback(async () => {
    if (!privy.authenticated) return;
    setIsLoadingSessions(true);
    try {
      const token = await privy.getAccessToken();
      const res = await fetch("/api/chat/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.sessions) {
        const formatted = data.sessions.map((s: { id: string; title: string; createdAt: string }) => ({
          id: s.id,
          label: s.title,
          createdAt: new Date(s.createdAt).getTime(),
        }));
        setSessions(formatted);
        if (formatted.length > 0) {
          const savedId = typeof window !== "undefined"
            ? window.localStorage.getItem("phylax_active_session")
            : null;
          const savedExists = savedId && formatted.some((s: { id: string }) => s.id === savedId);
          setActiveSessionId(savedExists ? savedId : formatted[0].id);
        } else {
          // Create an initial session if none exist
          handleNewChat();
        }
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [privy, handleNewChat]);

  const hasFetchedSessions = useRef(false);

  useEffect(() => {
    if (!privy.authenticated) {
      hasFetchedSessions.current = false;
      return;
    }
    
    if (hasFetchedSessions.current || isLoadingSessions) return;

    let ignore = false;
    hasFetchedSessions.current = true;
    setTimeout(() => setIsLoadingSessions(true), 0);

    const runFetch = async () => {
      try {
        const token = await privy.getAccessToken();
        const res = await fetch("/api/chat/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        
        if (!ignore && data.sessions) {
          const formatted = data.sessions.map((s: { id: string; title: string; createdAt: string }) => ({
            id: s.id,
            label: s.title,
            createdAt: new Date(s.createdAt).getTime(),
          }));
          setSessions(formatted);
          if (formatted.length > 0) {
            // Prefer the saved session from localStorage if it still exists in DB
            const savedId = typeof window !== "undefined"
              ? window.localStorage.getItem("phylax_active_session")
              : null;
            const savedExists = savedId && formatted.some((s: { id: string }) => s.id === savedId);
            setActiveSessionId(savedExists ? savedId : formatted[0].id);
          } else {
            handleNewChat();
          }
        }
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        if (!ignore) setIsLoadingSessions(false);
      }
    };

    runFetch();
    return () => { ignore = true; };
  }, [privy, handleNewChat, isLoadingSessions]);

  // Aggressively auto-convert dummy sessions to real DB sessions once authenticated
  useEffect(() => {
    if (
      privy.authenticated &&
      activeSessionId.startsWith("session-") &&
      !isLoadingSessions &&
      hasFetchedSessions.current
    ) {
      console.log("[PhylaX] Auto-converting dummy session to real DB session...");
      handleNewChat();
    }
  }, [privy.authenticated, activeSessionId, isLoadingSessions, handleNewChat]);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setActiveView("agent");
    setViewKey((k: number) => k + 1);
  }, []);

  const handleRenameSession = useCallback((id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const short = trimmed.length > 35 ? trimmed.slice(0, 35) + "…" : trimmed;
    setSessions((prev: ChatSession[]) => prev.map((s: ChatSession) => s.id === id ? { ...s, label: short } : s));
  }, []);

  const handleDeleteSession = useCallback(async (id: string) => {
    // Optimistic UI
    setSessions((prev: ChatSession[]) => {
      const next = prev.filter((s: ChatSession) => s.id !== id);
      if (next.length === 0) {
        handleNewChat();
        return [];
      }
      if (id === activeSessionId) setActiveSessionId(next[0].id);
      return next;
    });

    if (privy.authenticated) {
      try {
        const token = await privy.getAccessToken();
        await fetch(`/api/chat/sessions/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("Failed to delete session:", err);
        // Re-fetch on error to sync with DB
        fetchSessions();
      }
    }
  }, [activeSessionId, fetchSessions, handleNewChat, privy]);

  // ─── Boot: wait for Privy to resolve, then route accordingly ─────────

  useEffect(() => {
    if (!privy.ready) return;

    if (privy.authenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowConsole(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthFlowStarted(false);

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY_SHOW_CONSOLE, "1");
        window.sessionStorage.removeItem(STORAGE_KEY_AUTH_INTENT);
      }
    }
  }, [privy.ready, privy.authenticated]);

  const handleChangeAgentTab = useCallback((tab: AgentTab) => {
    setAgentTab(tab);
    if (activeView !== "agent") {
      setActiveView("agent");
      setViewKey((k: number) => k + 1);
    }
  }, [activeView]);

  // ─── Landing ──────────────────────────────────────────────────────────

  const shouldShowAppShell = showConsole || authFlowStarted || privy.authenticated;
  const shouldShowLanding = hasRestoredClientState && initialPrivyReady && !shouldShowAppShell;

  // Show a minimal loading shell while session storage is being restored or
  // Privy is still initialising — prevents a blank screen flash on first load.
  if (!hasRestoredClientState || !initialPrivyReady) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center font-sans"
        style={{ background: "oklch(0.08 0.025 265)", color: "oklch(0.95 0 0)" }}
        aria-label="Loading PhylaX"
      >
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="text-2xl font-bold tracking-tight">
            Phyla<span style={{ background: "linear-gradient(90deg, oklch(0.62 0.19 260), oklch(0.7 0.13 280))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>X</span>
          </div>
          <div className="flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: "oklch(0.62 0.19 260)", animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (shouldShowLanding) {
    return (
      <div className="bg-background text-foreground font-sans selection:bg-electric/20 overflow-x-hidden">
        <LoadingIntro />
        <LandingNavbar onLaunchApp={handleLaunch} />
        <LandingHero onLaunchApp={handleLaunch} />
        <SignalDivider />
        <LandingAbout />
        <SignalDivider />
        <LandingFeatures />
        <LandingEcosystem />
        <LandingTeam />
        <LandingToken />
        <LandingCTA onLaunchApp={handleLaunch} />
        <LandingFooter />
      </div>
    );
  }

  // ─── App shell ────────────────────────────────────────────────────────

  const displayName = privy.userEmail ?? (privy.walletAddress ? `${privy.walletAddress.slice(0, 6)}…${privy.walletAddress.slice(-4)}` : "User");



  const sidebarProps = {
    sessions, activeSessionId, activeView, agentTab,
    onNewChat: handleNewChat, onSelectSession: handleSelectSession,
    onDeleteSession: handleDeleteSession, onChangeView: handleChangeView,
    onChangeAgentTab: handleChangeAgentTab,
    isLightMode, onToggleTheme: handleToggleTheme,
  };

  return (
    <div className={`app-shell app-viewport-glow ${isLightMode ? "app-light" : ""} fixed inset-0 h-[100dvh] flex flex-col font-sans selection:bg-electric/20 overflow-hidden overscroll-none`} style={{ color: isLightMode ? "oklch(0.18 0.04 265)" : "oklch(0.95 0 0)" }}>
      {/* ═══ LIVE MODE BANNER ═══ */}
      {EXECUTION_MODE === "Live" && (
        <div
          className="text-[11px] sm:text-xs font-bold px-3 py-1.5 text-center flex items-center justify-center gap-2 shrink-0 z-50"
          style={{ background: "oklch(0.45 0.22 25)", color: "oklch(0.95 0 0)" }}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">LIVE MODE — REAL FUNDS AT RISK</span>
        </div>
      )}

      {/* ═══ NAVBAR ═══ */}
      <header
        className="flex items-center justify-between px-3 sm:px-5 h-14 shrink-0 z-50 relative"
        style={{
          background: "var(--app-navbar)",
          backdropFilter: isLightMode ? "blur(16px)" : "none",
          WebkitBackdropFilter: isLightMode ? "blur(16px)" : "none",
          borderBottom: isLightMode ? "1px solid oklch(0 0 0 / 0.06)" : "none",
        }}
      >
        {/* Left: toggle + brand */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (window.innerWidth < 1024) setMobileSidebar((v: boolean) => !v); else setSidebarOpen((v: boolean) => !v); }}
            className="btn-icon-circle w-9 h-9"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="w-[16px] h-[16px]" />
          </button>
          <button
            onClick={() => { if (privy.authenticated) { setActiveView("agent"); } else { setShowConsole(false); } }}
            className="text-base sm:text-lg font-bold tracking-tight hover:opacity-80 transition-opacity duration-150 ml-1"
            style={{ color: "var(--app-text-primary)" }}
            aria-label="Back to landing page"
          >
            Phyla<span className="text-gradient-brand">X</span>
          </button>
        </div>

        {/* Right: chain selector + user menu */}
        <div className="flex items-center gap-2">
          {privy.authenticated && (
            <ChainSelector selected={selectedChain} onChange={handleChainChange} />
          )}
          <div className="relative" ref={userMenuRef}>
            {privy.authenticated ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setUserMenuOpen((v: boolean) => !v); }}
                  className="btn-icon-circle w-9 h-9"
                  aria-label="Account menu"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-brand flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                </button>
                {/* Account dropdown — premium, theme-aware */}
                <div
                  className={`absolute right-0 top-full mt-2 w-[260px] rounded-2xl overflow-hidden z-50 dropdown-panel ${userMenuOpen ? "is-open" : ""}`}
                  style={{
                    background: isLightMode ? "oklch(0.99 0.003 260)" : "oklch(0.11 0.03 265)",
                    border: isLightMode ? "1px solid oklch(0.88 0.01 260)" : "1px solid oklch(1 0 0 / 0.1)",
                    boxShadow: isLightMode
                      ? "0 16px 48px oklch(0 0 0 / 0.12), 0 0 0 1px oklch(0 0 0 / 0.04)"
                      : "0 16px 48px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(1 0 0 / 0.04)",
                  }}
                >
                  {/* Gradient top accent line */}
                  <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, oklch(0.62 0.19 260), oklch(0.7 0.13 280), oklch(0.82 0.11 220))" }} />
                  
                  {/* User info section */}
                  <div className="px-4 pt-4 pb-3" style={{ borderBottom: isLightMode ? "1px solid oklch(0 0 0 / 0.06)" : "1px solid oklch(1 0 0 / 0.06)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center shrink-0 shadow-md" style={{ boxShadow: "0 0 16px oklch(0.62 0.19 260 / 0.3)" }}>
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {privy.userEmail && <p className="text-[12px] font-semibold truncate" style={{ color: isLightMode ? "oklch(0.15 0.04 265)" : "var(--app-text-primary)" }}>{privy.userEmail}</p>}
                        <p className="text-[10px] mt-0.5" style={{ color: isLightMode ? "oklch(0.55 0.015 260)" : "var(--app-text-tertiary)" }}>Connected via Privy</p>
                      </div>
                    </div>
                    {privy.hasWallet && privy.walletAddress && (
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{
                          background: isLightMode ? "oklch(0.96 0.005 260)" : "oklch(1 0 0 / 0.04)",
                          border: isLightMode ? "1px solid oklch(0.88 0.01 260)" : "1px solid oklch(1 0 0 / 0.06)",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <CopyAddress address={privy.walletAddress} />
                      </div>
                    )}
                    {!(privy.hasWallet && privy.walletAddress) && (
                      <p className="text-[11px] px-3 py-2 rounded-xl" style={{
                        color: isLightMode ? "oklch(0.55 0.015 260)" : "var(--app-text-tertiary)",
                        background: isLightMode ? "oklch(0.96 0.005 260)" : "oklch(1 0 0 / 0.03)",
                      }}>No wallet connected</p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150"
                      style={{ color: "var(--app-danger)" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "oklch(0.65 0.2 25 / 0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button type="button" onClick={handleSignIn} className="btn-capsule-white">
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ═══ BODY ═══ */}
      <div className="flex flex-1 min-h-0 relative z-10" ref={consoleRef}>
        {/* Mobile sidebar overlay */}
        <div
          className={`fixed inset-0 z-30 lg:hidden transition-all duration-300 ${mobileSidebar ? "bg-black/40 backdrop-blur-sm pointer-events-auto" : "bg-black/0 backdrop-blur-none pointer-events-none"}`}
          style={{ top: "3.5rem" }}
          onClick={() => setMobileSidebar(false)}
          aria-hidden={!mobileSidebar}
        />
        {/* Mobile sidebar drawer */}
        <div
          className={`fixed bottom-0 left-0 z-40 w-[280px] lg:hidden flex flex-col transition-transform duration-300 ease-out ${mobileSidebar ? "translate-x-0" : "-translate-x-full"}`}
          style={{
            top: "3.5rem",
            background: isLightMode
              ? "oklch(0.99 0.003 260 / 0.97)"
              : "oklch(0.08 0.025 265 / 0.95)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRight: isLightMode ? "1px solid oklch(0 0 0 / 0.05)" : "1px solid oklch(1 0 0 / 0.06)",
            boxShadow: mobileSidebar
              ? isLightMode
                ? "8px 0 32px oklch(0 0 0 / 0.06)"
                : "8px 0 32px oklch(0 0 0 / 0.4)"
              : "none",
          }}
        >
          {/* Mobile Drawer Content */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            
            {/* Account Summary */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: isLightMode ? "oklch(0.55 0.015 260)" : "oklch(1 0 0 / 0.35)" }}>
                Account
              </p>
              {privy.authenticated ? (
                <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: isLightMode ? "oklch(0.96 0.005 260)" : "oklch(1 0 0 / 0.04)", border: isLightMode ? "1px solid oklch(0.88 0.01 260)" : "1px solid oklch(1 0 0 / 0.06)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center shrink-0 shadow-md">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {privy.userEmail && <p className="text-[13px] font-semibold truncate" style={{ color: isLightMode ? "oklch(0.15 0.04 265)" : "var(--app-text-primary)" }}>{privy.userEmail}</p>}
                      <p className="text-[11px] mt-0.5" style={{ color: isLightMode ? "oklch(0.55 0.015 260)" : "var(--app-text-tertiary)" }}>Connected via Privy</p>
                    </div>
                  </div>
                  {privy.hasWallet && privy.walletAddress && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: isLightMode ? "oklch(0.99 0.003 260)" : "oklch(1 0 0 / 0.04)" }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <CopyAddress address={privy.walletAddress} />
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" onClick={handleSignIn} className="w-full btn-capsule-white justify-center">
                  Sign in
                </button>
              )}
            </div>

            {/* Utilities */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: isLightMode ? "oklch(0.55 0.015 260)" : "oklch(1 0 0 / 0.35)" }}>
                Utilities
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => handleChangeView("about")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 text-left"
                  style={{ color: isLightMode ? "oklch(0.35 0.02 260)" : "oklch(1 0 0 / 0.6)" }}
                >
                  <Info style={{ width: 16, height: 16 }} />
                  About PhylaX
                </button>
                <button
                  onClick={() => window.open("https://docs.phylax.com", "_blank")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 text-left"
                  style={{ color: isLightMode ? "oklch(0.35 0.02 260)" : "oklch(1 0 0 / 0.6)" }}
                >
                  <AlertTriangle style={{ width: 16, height: 16 }} />
                  Help / Docs
                </button>
                <button
                  onClick={handleToggleTheme}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 text-left"
                  style={{ color: isLightMode ? "oklch(0.35 0.02 260)" : "oklch(1 0 0 / 0.6)" }}
                >
                  <div className="flex items-center gap-3">
                    {isLightMode ? <Moon style={{ width: 16, height: 16 }} /> : <Sun style={{ width: 16, height: 16 }} />}
                    Theme
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isLightMode ? "oklch(0.5 0.02 260)" : "oklch(1 0 0 / 0.4)" }}>
                    {isLightMode ? "Light" : "Dark"}
                  </span>
                </button>
              </div>
            </div>
            
            {/* Network Status */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: isLightMode ? "oklch(0.55 0.015 260)" : "oklch(1 0 0 / 0.35)" }}>
                Network
              </p>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: isLightMode ? "oklch(0.96 0.005 260)" : "oklch(1 0 0 / 0.03)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[12px] font-semibold tracking-wide" style={{ color: isLightMode ? "oklch(0.35 0.02 260)" : "oklch(1 0 0 / 0.6)" }}>
                  {selectedChain.name} Live
                </span>
              </div>
            </div>

            {/* Actions */}
            {privy.authenticated && (
              <div className="pt-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 text-left"
                  style={{ color: "var(--app-danger)", background: "oklch(0.65 0.2 25 / 0.05)" }}
                >
                  <LogOut style={{ width: 16, height: 16 }} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop floating sidebar */}
        <div className={`hidden lg:block shrink-0 overflow-hidden sidebar-shell ${sidebarOpen ? "w-[272px] xl:w-[292px]" : "w-0"}`}>
          <div className="w-[260px] xl:w-[280px] h-full sidebar-floating">
            <AppSidebar {...sidebarProps} />
          </div>
        </div>

        {/* Main content with grid texture */}
        <main className="flex-1 min-w-0 flex flex-col app-grid-bg" style={{ background: "var(--app-main)" }}>
          {/* Mobile agent tab strip */}
          {activeView === "agent" && (
            <div
              className="lg:hidden shrink-0 py-2 agent-tab-strip"
              style={{
                borderBottom: isLightMode ? "1px solid oklch(0 0 0 / 0.06)" : "1px solid oklch(1 0 0 / 0.06)",
              }}
            >
              {([
                { icon: "💬", label: "Chat", tab: "chat" as AgentTab },
                { icon: "🔍", label: "Analysis", tab: "analysis" as AgentTab },
                { icon: "📡", label: "Signals", tab: "signals" as AgentTab },
                { icon: "🛡️", label: "Execution", tab: "execution" as AgentTab },
                { icon: "💼", label: "Wallet", tab: "wallet" as AgentTab },
              ]).map(({ icon, label, tab }) => {
                const isActive = agentTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => handleChangeAgentTab(tab)}
                    className="agent-tab-chip"
                    style={{
                      background: isActive
                        ? isLightMode ? "oklch(0.62 0.19 260 / 0.1)" : "oklch(0.62 0.19 260 / 0.12)"
                        : "transparent",
                      color: isActive
                        ? isLightMode ? "oklch(0.45 0.19 260)" : "oklch(0.78 0.17 260)"
                        : isLightMode ? "oklch(0.45 0.02 260)" : "oklch(1 0 0 / 0.45)",
                      borderColor: isActive
                        ? isLightMode ? "oklch(0.62 0.19 260 / 0.2)" : "oklch(0.62 0.19 260 / 0.2)"
                        : "transparent",
                    }}
                  >
                    <span className="text-xs">{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          {activeView === "agent" && agentTab === "chat" && (
            <div key={`agent-${activeSessionId}`} className="flex flex-col flex-1 min-h-0 view-enter">
              <ChatPanel
                key={activeSessionId}
                conversationId={activeSessionId}
                isAuthenticated={privy.authenticated}
                hasWallet={privy.hasWallet}
                onConnectWallet={handleConnectWallet}
                onSignIn={handleSignIn}
                onRenameSession={(label) => handleRenameSession(activeSessionId, label)}
                onCreateSession={handleNewChat}
                walletAddress={privy.walletAddress}
                getAccessToken={privy.getAccessToken}
                getIdentityToken={privy.getIdentityToken}
                selectedChain={selectedChain}
              />
            </div>
          )}
          {activeView === "agent" && agentTab === "analysis" && (
            <div key={`analysis-${viewKey}`} className="flex flex-col flex-1 min-h-0 view-enter">
              <AnalysisPanel />
            </div>
          )}
          {activeView === "agent" && agentTab === "signals" && (
            <div key={`signals-${viewKey}`} className="flex flex-col flex-1 min-h-0 view-enter">
              <SignalsPanel />
            </div>
          )}
          {activeView === "agent" && agentTab === "execution" && (
            <div key={`execution-${viewKey}`} className="flex flex-col flex-1 min-h-0 view-enter">
              <ExecutionPanel />
            </div>
          )}
          {activeView === "agent" && agentTab === "wallet" && (
            <div key={`wallet-${viewKey}`} className="flex flex-col flex-1 min-h-0 view-enter">
              <AgentWalletPanel />
            </div>
          )}
          {activeView === "portfolio" && (
            <div key={`portfolio-${viewKey}`} className="flex flex-col flex-1 min-h-0 view-enter">
              <PortfolioPanel
                isAuthenticated={privy.authenticated}
                hasWallet={privy.hasWallet}
                walletAddress={privy.walletAddress}
                chainName={selectedChain.name}
                executionMode={EXECUTION_MODE}
                onConnectWallet={handleConnectWallet}
                onSignIn={handleSignIn}
                getAccessToken={privy.getAccessToken}
              />
            </div>
          )}
          {activeView === "activity" && (
            <div key={`activity-${viewKey}`} className="flex flex-col flex-1 min-h-0 view-enter">
              <ActivityPanel
                isAuthenticated={privy.authenticated}
                onSignIn={handleSignIn}
              />
            </div>
          )}
          {activeView === "settings" && (
            <div key={`settings-${viewKey}`} className="flex flex-col flex-1 min-h-0 view-enter">
              <SettingsPanel
                isAuthenticated={privy.authenticated}
                hasWallet={privy.hasWallet}
                walletAddress={privy.walletAddress}
                userEmail={privy.userEmail}
                chainName={selectedChain.name}
                executionMode={EXECUTION_MODE}
                onConnectWallet={handleConnectWallet}
                onSignIn={handleSignIn}
                onLogout={handleLogout}
              />
            </div>
          )}
          {activeView === "about" && (
            <div key={`about-${viewKey}`} className="flex flex-col flex-1 min-h-0 view-enter">
              <AboutPanel />
            </div>
          )}
        </main>

        {/* ═══ MOBILE BOTTOM NAV ═══ */}
        <nav
          className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-1.5 mobile-bottom-nav transition-all duration-300 ${mobileSidebar ? "opacity-40 pointer-events-none scale-[0.98] translate-y-2" : ""}`}
          style={{
            background: isLightMode ? "oklch(0.99 0.003 260 / 0.95)" : "oklch(0.08 0.025 265 / 0.95)",
            borderTop: isLightMode ? "1px solid oklch(0 0 0 / 0.06)" : "1px solid oklch(1 0 0 / 0.06)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {[
            { icon: Bot, label: "Agent", view: "agent" as SidebarView },
            { icon: BarChart3, label: "Portfolio", view: "portfolio" as SidebarView },
            { icon: History, label: "Activity", view: "activity" as SidebarView },
            { icon: SettingsIcon, label: "Settings", view: "settings" as SidebarView },
          ].map(({ icon: Icon, label, view }) => {
            const active = activeView === view;
            return (
              <button
                key={view}
                onClick={() => handleChangeView(view)}
                className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-150"
                style={{
                  color: active
                    ? "oklch(0.7 0.19 260)"
                    : isLightMode ? "oklch(0.5 0.02 260)" : "oklch(1 0 0 / 0.35)",
                }}
              >
                <Icon style={{ width: 18, height: 18 }} />
                <span className="text-[9px] font-semibold">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
