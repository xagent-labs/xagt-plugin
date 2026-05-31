import type { z } from "zod";

export type SkillStatus = "idle" | "running" | "success" | "error";

export interface SkillMeta {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  mcpCompatible: boolean;
}

export type SkillCategory =
  | "market"
  | "narrative"
  | "yield"
  | "risk"
  | "wallet"
  | "swap"
  | "strategy"
  | "gas"
  | "leaderboard";

export interface SkillDefinition {
  meta: SkillMeta;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  execute: (input: unknown, ctx: SkillExecutionContext) => Promise<unknown>;
}

export interface SkillExecutionContext {
  requestId: string;
  walletAddress?: string;
  chainId: number;
  signal?: AbortSignal;
}

export interface SkillInvocation {
  skillId: string;
  input: Record<string, unknown>;
}

export interface SkillResult<T = unknown> {
  skillId: string;
  status: "success" | "error";
  data?: T;
  error?: string;
  durationMs: number;
  executedAt: string;
}

export interface AgentPlanStep {
  skillId: string;
  reason: string;
  input: Record<string, unknown>;
  dependsOn?: string[];
}

export interface AgentPlan {
  id: string;
  query: string;
  steps: AgentPlanStep[];
  createdAt: string;
}

export interface AgentRunResult {
  runId: string;
  plan: AgentPlan;
  results: SkillResult[];
  synthesis: AgentSynthesis;
  totalDurationMs: number;
}

export interface AgentSynthesis {
  summary: string;
  alphaFeed: AlphaItem[];
  topYields: YieldRankItem[];
  riskAlerts: RiskAlert[];
  recommendedActions: RecommendedAction[];
}

export interface AlphaItem {
  id: string;
  narrative: string;
  strength: number;
  tokens: string[];
  timestamp: string;
}

export interface YieldRankItem {
  protocol: string;
  pool: string;
  apy: number;
  tvlUsd: number;
  riskScore: number;
  chain: string;
}

export interface RiskAlert {
  protocol: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
}

export interface RecommendedAction {
  type: "swap" | "deposit" | "monitor" | "avoid";
  title: string;
  detail: string;
  confidence: number;
}

export interface TerminalMessage {
  id: string;
  role: "user" | "agent" | "system" | "skill";
  content: string;
  timestamp: string;
  skillId?: string;
  status?: SkillStatus;
}

export interface WalletContext {
  address: string;
  chainId: number;
  balances: { symbol: string; amount: number; usdValue: number }[];
  recentTxCount: number;
}
