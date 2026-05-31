"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Shield,
  Scan,
  Eye,
  BarChart3,
  Search,
  Wallet,
  Paperclip,
} from "lucide-react";
import { ChatMessage, type ChatMessageData } from "./ChatMessage";
import { TradePlanCard } from "./TradePlanCard";
import { RiskResultCard } from "./RiskResultCard";
import { QuoteCard } from "./QuoteCard";
import type { ChatState } from "../lib/chat-states";
import type { TokenSignal, SimulationResult } from "../lib/schemas";
import { type ChainConfig } from "../lib/chains";

// ─── Pipeline types ───────────────────────────────────────────────────────────

interface TradePlanData { type: "trade-plan"; signals: TokenSignal[]; chainName: string; source: string; }
interface SignalsData { type: "signals"; signals: TokenSignal[]; chainName: string; tokenFilter?: string; }
interface RiskResultData { type: "risk-result"; tokenSymbol: string; tokenAddress: string; riskLevel: "safe" | "high_risk" | "unknown" | "skipped" | "pending"; riskDetails?: string; source: string; }
interface QuoteData { type: "quote"; quote: SimulationResult; fromSymbol: string; toSymbol: string; amount: number; scanDecision: string; source: string; approvalId?: string; tokenAddress?: string; targetWalletAddress?: string; needsApproval?: boolean; approveTxData?: any; }
type PipelineData = TradePlanData | SignalsData | RiskResultData | QuoteData;
interface ChatMessageWithCards extends ChatMessageData { pipelineData?: PipelineData | null; }

// ─── Prompt suggestions ───────────────────────────────────────────────────────

const SUGGESTIONS = [
  {
    icon: Eye, label: "Swap Preview", chipColor: "chip-emerald",
    agentQuestion: "What do you wanna swap? Give me the token and amount, like \"swap $5 USDC to OKB\".",
  },
  {
    icon: Scan, label: "Safety Scan", chipColor: "chip-indigo",
    agentQuestion: "Which token do you wanna check? Drop the name or paste the address.",
  },
  {
    icon: Search, label: "Trending Now", chipColor: "chip-cyan",
    agentQuestion: "Pulling what's hot right now, one sec\u2026",
    autoRun: "What tokens are trending on X Layer right now?",
  },
  {
    icon: BarChart3, label: "Market Read", chipColor: "chip-amber",
    agentQuestion: "Which token do you want me to look into? BTC, ETH, or something else?",
  },
  {
    icon: Shield, label: "Risk Check", chipColor: "chip-violet",
    agentQuestion: "What token are you eyeing? Give me the name or address and I'll scan it.",
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  conversationId: string;
  isAuthenticated: boolean;
  hasWallet: boolean;
  onConnectWallet: () => void;
  onSignIn: () => void;
  onRenameSession?: (label: string) => void;
  onCreateSession?: () => Promise<string | undefined>;
  walletAddress?: string | null;
  getAccessToken?: () => Promise<string | null>;
  getIdentityToken?: () => Promise<string | null>;
  selectedChain: ChainConfig;
}

// ─── Pipeline card wrapper with entrance animation ────────────────────────────

function PipelineCardWrapper({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        transform: "translateY(6px)",
        transition: "opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1) 0.1s, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1) 0.1s",
      }}
    >
      {children}
    </div>
  );
}

// ─── Empty-state wrapper with fade-in ─────────────────────────────────────────

function EmptyStateWrapper({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        transform: "translateY(10px)",
        transition: "opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1), transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatPanel({
  conversationId,
  isAuthenticated,
  hasWallet,
  onConnectWallet,
  onSignIn,
  onRenameSession,
  onCreateSession,
  walletAddress,
  getAccessToken,
  getIdentityToken,
  selectedChain,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageWithCards[]>([]);
  const [input, setInput] = useState("");
  const [chatState, setChatState] = useState<ChatState>(
    isAuthenticated ? "WALLET_CONNECTED" : "WALLET_REQUIRED"
  );
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const canChat = isAuthenticated; // email login is enough for chat
  const prevAuthenticated = useRef(isAuthenticated);
  const hasRenamed = useRef(false);
  const hasMessages = messages.length > 0;

  const [isFetchingMessages, setIsFetchingMessages] = useState(false);

  // ── Fetch messages ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !conversationId || conversationId.startsWith("session-")) {
      return;
    }

    let ignore = false;
    setTimeout(() => setIsFetchingMessages(true), 0);

    const runFetch = async () => {
      try {
        const token = getAccessToken ? await getAccessToken() : null;
        const res = await fetch(`/api/chat/sessions/${conversationId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!ignore && data.messages) {
          setMessages(data.messages.map((m: { id: string; role: string; content: string; createdAt: string; metadata: Record<string, unknown> | null }) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
            timestamp: new Date(m.createdAt).getTime(),
            pipelineData: (m.metadata as unknown as PipelineData) || null,
          })));

          if (data.messages.length > 0) {
            hasRenamed.current = true;
            setChatState("WALLET_CONNECTED");
          }
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        if (!ignore) setIsFetchingMessages(false);
      }
    };

    runFetch();
    return () => { ignore = true; };
  }, [isAuthenticated, conversationId, getAccessToken]);

  useEffect(() => {
    if (isAuthenticated && !prevAuthenticated.current && messages.length === 0 && !isFetchingMessages) {
      // Signed in — show welcome only if no messages
      queueMicrotask(() => {
        setChatState("WALLET_CONNECTED");
        setMessages(prev => {
          if (prev.length > 0) return prev;
          return [...prev, {
            id: `system-welcome-${Date.now()}`,
            role: "assistant",
            content: `Hey, you're live on ${selectedChain.name}. What do you wanna do?`,
            timestamp: Date.now(),
          }];
        });
      });
    } else if (!isAuthenticated && prevAuthenticated.current) {
      // Signed out — reset to welcome state
      setMessages([]);
      setChatState("WALLET_REQUIRED");
      setInput("");
      setIsLoading(false);
      hasRenamed.current = false;
    }
    prevAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, hasWallet, selectedChain.name, messages.length, isFetchingMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !canChat || isLoading) return;

    let targetConversationId = conversationId;
    if (!targetConversationId || targetConversationId.startsWith("session-")) {
      if (onCreateSession) {
        setIsLoading(true);
        try {
          const newId = await onCreateSession();
          if (newId) targetConversationId = newId;
        } catch (err) {
          console.error("Failed to implicitly create session:", err);
        }
      }

      if (!targetConversationId || targetConversationId.startsWith("session-")) {
        setMessages(prev => [...prev, {
          id: `system-error-${Date.now()}`,
          role: "system",
          content: "Session is still initializing. Please wait a moment and try again.",
          timestamp: Date.now(),
        }]);
        setIsLoading(false);
        return;
      }
    }

    const trimmedText = text.trim();
    // Auto-rename session on first user message
    if (!hasRenamed.current && onRenameSession) {
      hasRenamed.current = true;
      onRenameSession(trimmedText);
    }
    const userMsg: ChatMessageWithCards = { id: `user-${Date.now()}`, role: "user", content: trimmedText, timestamp: Date.now() };
    const loadingMsg: ChatMessageWithCards = { id: `assistant-loading-${Date.now()}`, role: "assistant", content: "", timestamp: Date.now(), isLoading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput(""); setIsLoading(true); setChatState("UNDERSTANDING_INTENT");
    try {
      let authToken = "client-token"; let identityToken: string | null = null;
      if (getAccessToken) { try { const t = await getAccessToken(); if (t) authToken = t; } catch { /* */ } }
      if (getIdentityToken) { try { identityToken = await getIdentityToken(); } catch { /* */ } }
      const headers: Record<string, string> = { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}`, "x-wallet-address": walletAddress ?? "" };
      if (identityToken) headers["x-privy-identity-token"] = identityToken;

      const res = await fetch("/api/chat/stream", { method: "POST", headers, body: JSON.stringify({ conversationId: targetConversationId, message: text.trim(), chain: selectedChain.id }) });

      if (!res.ok) {
        let errorContent = "Something went wrong. Please try again.";
        try {
          const data = await res.json();
          errorContent = data.error ?? errorContent;
        } catch { /* */ }
        if (res.status === 401) errorContent = errorContent.includes("expired") ? "Session expired. Please reconnect your wallet." : errorContent;
        else if (res.status === 403) errorContent = "Wallet mismatch. Please reconnect.";
        setMessages(prev => prev.map(m => m.id === loadingMsg.id ? { ...m, isLoading: false, content: errorContent, role: "system" as const } : m));
        setChatState("FAILED"); return;
      }

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader available");
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex;
          while ((newlineIndex = buffer.indexOf("\n\n")) >= 0) {
            const chunk = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 2);

            if (chunk.startsWith("event: ")) {
              const eventTypeLine = chunk.split("\n")[0];
              const dataLine = chunk.split("\n").find(l => l.startsWith("data: "));
              if (!dataLine) continue;

              const type = eventTypeLine.replace("event: ", "").trim();
              const data = JSON.parse(dataLine.replace("data: ", ""));

              if (type === "step" || type === "tool_start" || type === "tool_result" || type === "partial_failure") {
                setMessages(prev => prev.map(m => {
                  if (m.id === loadingMsg.id) {
                    const currentSteps = m.steps ? [...m.steps] : [];
                    const stepId = data.id || `step-${Date.now()}`;
                    const existingIdx = currentSteps.findIndex(s => s.id === stepId);

                    if (existingIdx >= 0) {
                      currentSteps[existingIdx] = { ...currentSteps[existingIdx], status: data.status, label: data.label || currentSteps[existingIdx].label };
                    } else {
                      currentSteps.push({ id: stepId, label: data.label, status: data.status });
                    }
                    return { ...m, steps: currentSteps };
                  }
                  return m;
                }));
              } else if (type === "final") {
                setMessages(prev => prev.map(m => m.id === loadingMsg.id ? { ...m, isLoading: false, content: data.agentMessage ?? "Done.", pipelineData: data.pipelineData ?? null } : m));
                if (data.chatState) setChatState(data.chatState as ChatState);
              } else if (type === "error") {
                throw new Error(data.error);
              }
            }
          }
        }
      } else {
        const data = await res.json();
        const newState: ChatState = data.chatState ?? "WALLET_CONNECTED";
        setMessages(prev => prev.map(m => m.id === loadingMsg.id ? { ...m, isLoading: false, content: data.agentMessage ?? "Done.", pipelineData: data.pipelineData ?? null } : m));
        setChatState(newState);
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? { ...m, isLoading: false, content: "Network error. Check your connection.", role: "system" as const } : m));
      setChatState("FAILED");
    } finally { setIsLoading(false); }
  }, [canChat, isLoading, walletAddress, getAccessToken, getIdentityToken, onRenameSession, selectedChain.id, conversationId]);

  const handleSuggestionClick = (suggestion: typeof SUGGESTIONS[number]) => {
    if (!canChat) { onSignIn(); return; }

    // If this suggestion has autoRun (like Trending), send it as a real message
    if (suggestion.autoRun) {
      sendMessage(suggestion.autoRun);
      return;
    }

    // Otherwise, inject the agent's contextual question — no API call
    // Date.now() lives inside the updater fn (not render scope) to satisfy react-hooks/purity
    const agentQuestion = suggestion.agentQuestion;
    setMessages(prev => {
      const now = Date.now();
      return [
        ...prev,
        { id: `agent-q-${now}`, role: "assistant" as const, content: agentQuestion, timestamp: now },
      ];
    });
    // Focus the input so the user can respond immediately
    setTimeout(() => inputRef.current?.focus(), 100);
  };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const renderPipelineCard = (data: PipelineData) => {
    switch (data.type) {
      case "trade-plan": return <TradePlanCard tokens={data.signals} chainName={data.chainName} displayMode="trade-plan" />;
      case "signals": return <TradePlanCard tokens={data.signals} chainName={data.chainName} displayMode="signals" requestedToken={data.tokenFilter} />;
      case "risk-result": return <RiskResultCard tokenSymbol={data.tokenSymbol} tokenAddress={data.tokenAddress} riskLevel={data.riskLevel} details={data.riskDetails} />;
      case "quote": return <QuoteCard quote={data.quote} fromSymbol={data.fromSymbol} toSymbol={data.toSymbol} approvalId={data.approvalId} showExecute={!!data.approvalId} getAccessToken={getAccessToken} getIdentityToken={getIdentityToken} walletAddress={walletAddress} targetWalletAddress={data.targetWalletAddress} onConnectWallet={onConnectWallet} amount={data.amount} tokenAddress={data.tokenAddress} scanDecision={data.scanDecision} chainConfig={selectedChain} needsApproval={data.needsApproval} approveTxData={data.approveTxData} />;
      default: return null;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">
      {hasMessages ? (
        /* ═══ CONVERSATION MODE ═══ */
        <>
          <div className="flex-1 overflow-y-auto scroll-contain min-h-0">
            <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
              {messages.map(msg => (
                <div key={msg.id} className="space-y-3">
                  <ChatMessage message={msg} />
                  {msg.pipelineData && msg.role === "assistant" && !msg.isLoading && (
                    <PipelineCardWrapper>
                      {renderPipelineCard(msg.pipelineData)}
                    </PipelineCardWrapper>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Pinned capsule input */}
          <div className="shrink-0 px-4 sm:px-6 py-4">
            <div className="max-w-3xl lg:max-w-4xl mx-auto">
              <form onSubmit={handleSubmit}>
                <div className="chat-input-capsule flex items-center gap-2 sm:gap-3">
                  <button type="button" className="shrink-0 p-1.5 rounded-full transition-colors text-muted-foreground">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder="Ask PhylaX anything…"
                    rows={1}
                    className="flex-1 bg-transparent text-sm sm:text-[15px] placeholder:opacity-25 resize-none outline-none min-h-[24px] max-h-[100px] text-foreground"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    aria-label="Send"
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      background: input.trim() && !isLoading
                        ? "linear-gradient(135deg, oklch(0.62 0.19 260), oklch(0.7 0.13 280))"
                        : "var(--app-disabled-btn)",
                      color: input.trim() && !isLoading ? "white" : "var(--app-text-tertiary)",
                      cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <p className="text-[10px] text-center mt-2 text-muted-foreground/50">
                Non-custodial · User-signed execution · {selectedChain.name}
              </p>
            </div>
          </div>
        </>
      ) : (
        /* ═══ EMPTY STATE — Xona-style Welcome ═══ */
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl mx-auto">

            {/* Clean centered hero */}
            <EmptyStateWrapper>
              <div className="text-center mb-10">
                {/* Subtle brand mark */}
                <div className="inline-flex items-center justify-center mb-6">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "oklch(0.62 0.19 260 / 0.1)",
                      border: "1px solid oklch(0.62 0.19 260 / 0.15)",
                    }}
                  >
                    <img
                      src="/assets/PhylaX-mark.png"
                      alt="PhylaX"
                      width={28}
                      height={28}
                      className="object-contain"
                    />
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mb-3 text-foreground">
                  Trade secure on X Layer
                </h2>
                <p className="text-sm sm:text-base max-w-md mx-auto leading-relaxed text-muted-foreground">
                  Your DeFi guard. Every trade scanned, every quote guarded.
                </p>
              </div>
            </EmptyStateWrapper>

            {/* Capsule input */}
            <EmptyStateWrapper>
              {!canChat ? (
                <div className="flex justify-center mb-8">
                  <button
                    type="button"
                    onClick={onConnectWallet}
                    className="btn-capsule-white text-[14px] px-8 py-3"
                  >
                    <Wallet className="w-4 h-4" />
                    Sign in to start trading
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mb-8">
                  <div className="chat-input-capsule flex items-center gap-3">
                    <button type="button" className="shrink-0 p-1.5 rounded-full transition-colors text-muted-foreground">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      placeholder="Ask PhylaX anything…"
                      rows={1}
                      className="flex-1 bg-transparent text-[15px] placeholder:opacity-25 resize-none outline-none disabled:cursor-not-allowed min-h-[24px] max-h-[100px] text-foreground"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      aria-label="Send"
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        background: input.trim() && !isLoading
                          ? "linear-gradient(135deg, oklch(0.62 0.19 260), oklch(0.7 0.13 280))"
                          : "var(--app-disabled-btn)",
                        color: input.trim() && !isLoading ? "white" : "var(--app-text-tertiary)",
                      }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </EmptyStateWrapper>

            {/* Colored suggestion chips */}
            <EmptyStateWrapper>
              <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
                {SUGGESTIONS.map(s => (
                  <button
                    type="button"
                    key={s.label}
                    onClick={() => handleSuggestionClick(s)}
                    disabled={isLoading}
                    className={`suggestion-chip ${s.chipColor}`}
                  >
                    <s.icon className="w-3.5 h-3.5" />
                    {s.label}
                  </button>
                ))}
              </div>
            </EmptyStateWrapper>

            <p className="text-[10px] text-center mt-4 tracking-wide text-muted-foreground/30">
              Powered by OKX Onchain OS · Non-custodial
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
