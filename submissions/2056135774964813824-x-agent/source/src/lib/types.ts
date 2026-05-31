export type AgentStatus = "idle" | "thinking" | "researching" | "executing" | "synthesizing" | "complete" | "error";

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: AgentStatus;
  model: string;
  skills: string[];
  tasksCompleted: number;
  uptimeSec: number;
  lastActivity: string;
  accentColor?: "electric" | "plasma" | "cyan" | "success" | "warning";
}

export type SkillCategory =
  | "dex"
  | "wallet"
  | "signal"
  | "strategy"
  | "dapp"
  | "security"
  | "onchain"
  | "portfolio"
  | "bridge"
  | "market"
  | "narrative";

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  installed: boolean;
  executions24h: number;
  latencyMs: number;
  compatibleAgents: string[];
}

export interface Narrative {
  id: string;
  name: string;
  description: string;
  momentum: number;
  sentiment: number;
  volume24h: number;
  mentions: number;
  topTokens: string[];
  spark: number[];
  color: "electric" | "plasma" | "cyan" | "success" | "warning" | "danger";
}

export interface Signal {
  id: string;
  asset: string;
  type: "breakout" | "reversal" | "narrative" | "volatility" | "onchain" | "social";
  direction: "bullish" | "bearish" | "neutral";
  strength: number;
  confidence: number;
  timeframe: string;
  reason: string;
  sources: SourceRef[];
  timestamp: string;
}

export interface SourceRef {
  id: string;
  title: string;
  url: string;
  domain: string;
  publishedAt?: string;
  relevance?: number;
  reliability?: number;
  category?: string;
}

export type ResearchStepStatus = "queued" | "running" | "done" | "error";
export interface ResearchStep {
  id: string;
  kind: "search" | "discover" | "scrape" | "rank" | "analyze" | "skill" | "synthesize";
  label: string;
  detail?: string;
  status: ResearchStepStatus;
  durationMs?: number;
  outputs?: { label: string; value?: string }[];
}

