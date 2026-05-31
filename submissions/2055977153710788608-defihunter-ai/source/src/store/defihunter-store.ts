"use client";

import { create } from "zustand";
import type {
  AgentRunResult,
  TerminalMessage,
  YieldRankItem,
  AlphaItem,
  RiskAlert,
  RecommendedAction,
  WalletContext,
  SkillResult,
} from "@/types/agent";
import { runAgent, getDashboardData } from "@/lib/api/client";
import { findSkillResult, SKILL } from "@/lib/agent/skill-ids";

const MAX_HISTORY = 20;

function extractWalletFromResults(results: SkillResult[]): {
  wallet: WalletContext | null;
  dataSource?: "live" | "mock";
} {
  const hit = findSkillResult(results, SKILL.WALLET);
  if (!hit?.data || typeof hit.data !== "object") return { wallet: null };
  const d = hit.data as {
    wallet?: {
      address: string;
      chainId: number;
      balances: WalletContext["balances"];
      recentTxCount: number;
    };
    dataSource?: "live" | "mock";
  };
  if (!d.wallet) return { wallet: null };
  return {
    wallet: {
      address: d.wallet.address,
      chainId: d.wallet.chainId,
      balances: d.wallet.balances,
      recentTxCount: d.wallet.recentTxCount,
    },
    dataSource: d.dataSource,
  };
}

interface DeFiHunterState {
  walletAddress: string;
  chainId: number;
  isAgentRunning: boolean;
  isDashboardLoading: boolean;
  lastRun: AgentRunResult | null;
  runHistory: AgentRunResult[];
  skillResults: SkillResult[];
  recommendedActions: RecommendedAction[];
  watchlist: YieldRankItem[];
  walletSnapshot: WalletContext | null;
  walletDataSource: "live" | "mock" | null;
  messages: TerminalMessage[];
  alphaFeed: AlphaItem[];
  topYields: YieldRankItem[];
  riskAlerts: RiskAlert[];
  marketSentiment: string;
  error: string | null;
  autoRefresh: boolean;

  setWallet: (address: string) => void;
  setChainId: (id: number) => void;
  setAutoRefresh: (v: boolean) => void;
  addMessage: (msg: TerminalMessage) => void;
  runAgentQuery: (query: string) => Promise<void>;
  refreshDashboard: () => Promise<void>;
  clearTerminal: () => void;
  exportLastRun: () => void;
  toggleWatchlist: (item: YieldRankItem) => void;
  restoreRun: (run: AgentRunResult) => void;
}

export const useDeFiHunterStore = create<DeFiHunterState>((set, get) => ({
  walletAddress: "",
  chainId: 1,
  isAgentRunning: false,
  isDashboardLoading: false,
  lastRun: null,
  runHistory: [],
  skillResults: [],
  recommendedActions: [],
  watchlist: [],
  walletSnapshot: null,
  walletDataSource: null,
  messages: [
    {
      id: "boot",
      role: "system",
      content:
        "DeFiHunter AI v1.2 — Skill OS 在线。输入指令或点击快捷命令。数据默认来自 DeFiLlama + CoinGecko。",
      timestamp: new Date().toISOString(),
    },
  ],
  alphaFeed: [],
  topYields: [],
  riskAlerts: [],
  marketSentiment: "neutral",
  error: null,
  autoRefresh: false,

  setWallet: (address) => set({ walletAddress: address }),
  setChainId: (id) => set({ chainId: id }),
  setAutoRefresh: (v) => set({ autoRefresh: v }),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  runAgentQuery: async (query) => {
    const { walletAddress, chainId, addMessage } = get();
    set({ isAgentRunning: true, error: null, skillResults: [] });

    addMessage({
      id: `u-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await runAgent({
        query,
        walletAddress: walletAddress?.trim() || undefined,
        chainId,
      });

      for (const step of result.plan.steps) {
        const skillResult = result.results.find((r) => r.skillId === step.skillId);
        const status = skillResult?.status ?? "error";
        addMessage({
          id: `sk-${step.skillId}-${Date.now()}`,
          role: "skill",
          content:
            status === "success"
              ? `▸ ${step.skillId}: ${step.reason} (${skillResult?.durationMs ?? 0}ms)`
              : `▸ ${step.skillId}: FAILED — ${skillResult?.error ?? "unknown"}`,
          timestamp: new Date().toISOString(),
          skillId: step.skillId,
          status: status === "success" ? "success" : "error",
        });
      }

      addMessage({
        id: `a-${result.runId}`,
        role: "agent",
        content: result.synthesis.summary,
        timestamp: new Date().toISOString(),
      });

      const { wallet, dataSource } = extractWalletFromResults(result.results);

      set((s) => ({
        lastRun: result,
        skillResults: result.results,
        runHistory: [result, ...s.runHistory].slice(0, MAX_HISTORY),
        recommendedActions: result.synthesis.recommendedActions,
        alphaFeed: result.synthesis.alphaFeed,
        topYields: result.synthesis.topYields,
        riskAlerts: result.synthesis.riskAlerts,
        walletSnapshot: wallet,
        walletDataSource: dataSource ?? null,
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      set({ error: message });
      addMessage({
        id: `err-${Date.now()}`,
        role: "system",
        content: `ERROR: ${message}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      set({ isAgentRunning: false });
    }
  },

  refreshDashboard: async () => {
    set({ isDashboardLoading: true, error: null });
    try {
      const data = await getDashboardData();
      set({
        alphaFeed: data.alphaFeed ?? [],
        topYields: data.topYields ?? [],
        riskAlerts: data.risks ?? data.riskAlerts ?? [],
        marketSentiment: data.marketSentiment ?? "neutral",
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Dashboard refresh failed" });
    } finally {
      set({ isDashboardLoading: false });
    }
  },

  clearTerminal: () =>
    set({
      messages: [
        {
          id: "boot",
          role: "system",
          content: "Terminal cleared.",
          timestamp: new Date().toISOString(),
        },
      ],
    }),

  exportLastRun: () => {
    const { lastRun } = get();
    if (!lastRun) return;
    const blob = new Blob([JSON.stringify(lastRun, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `defihunter-run-${lastRun.runId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  toggleWatchlist: (item) =>
    set((s) => {
      const key = `${item.protocol}-${item.pool}`;
      const exists = s.watchlist.some((w) => `${w.protocol}-${w.pool}` === key);
      return {
        watchlist: exists
          ? s.watchlist.filter((w) => `${w.protocol}-${w.pool}` !== key)
          : [...s.watchlist, item],
      };
    }),

  restoreRun: (run) => {
    const { wallet, dataSource } = extractWalletFromResults(run.results);
    set({
      lastRun: run,
      skillResults: run.results,
      recommendedActions: run.synthesis.recommendedActions,
      alphaFeed: run.synthesis.alphaFeed,
      topYields: run.synthesis.topYields,
      riskAlerts: run.synthesis.riskAlerts,
      walletSnapshot: wallet,
      walletDataSource: dataSource ?? null,
    });
  },
}));
