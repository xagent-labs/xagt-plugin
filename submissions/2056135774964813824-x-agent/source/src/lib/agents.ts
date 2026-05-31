import type { Agent } from "./types";

export const AGENTS: Agent[] = [
  {
    id: "research",
    name: "Research Agent",
    role: "Autonomous web research",
    description:
      "Crawls crypto news, RSS feeds, and public pages. Aggregates sources, ranks relevance, and produces source-backed briefings.",
    status: "researching",
    model: "anthropic/claude-sonnet-4",
    skills: ["DEX market analysis", "Token discovery", "Source aggregation"],
    tasksCompleted: 1284,
    uptimeSec: 86_400 * 7,
    lastActivity: "scraping coindesk.com/markets/2024/...",
    accentColor: "electric",
  },
  {
    id: "narrative",
    name: "Narrative Agent",
    role: "Sector & narrative detection",
    description:
      "Clusters mentions across thousands of articles into emerging narratives. Computes momentum, sentiment, and rotation signals.",
    status: "thinking",
    model: "openai/gpt-4o",
    skills: ["Narrative clustering", "Sentiment scoring"],
    tasksCompleted: 642,
    uptimeSec: 86_400 * 4,
    lastActivity: "clustering 412 articles across AI + RWA",
    accentColor: "plasma",
  },
  {
    id: "signal",
    name: "Signal Agent",
    role: "Signal generation",
    description:
      "Cross-references on-chain activity, narrative shifts and volatility to generate institutional-grade trade signals.",
    status: "executing",
    model: "anthropic/claude-sonnet-4",
    skills: ["Signal generation", "Strategy systems", "DEX market analysis"],
    tasksCompleted: 318,
    uptimeSec: 86_400 * 11,
    lastActivity: "evaluating breakout on ETH/USDC",
    accentColor: "cyan",
  },
  {
    id: "security",
    name: "Security Agent",
    role: "On-chain & contract risk",
    description:
      "Audits contract metadata, liquidity locks, ownership status and known exploit patterns before suggesting any position.",
    status: "idle",
    model: "anthropic/claude-haiku-4-5",
    skills: ["Security analysis", "Onchain gateways"],
    tasksCompleted: 894,
    uptimeSec: 86_400 * 18,
    lastActivity: "verified 12 contracts in last batch",
    accentColor: "warning",
  },
  {
    id: "market",
    name: "Market Intel Agent",
    role: "Market intelligence synthesis",
    description:
      "Synthesizes signals, narratives and price action into a continuously updated institutional intelligence brief.",
    status: "synthesizing",
    model: "openai/gpt-4o",
    skills: ["Portfolio analysis", "Strategy systems", "DEX market analysis"],
    tasksCompleted: 502,
    uptimeSec: 86_400 * 6,
    lastActivity: "drafting daily intelligence brief",
    accentColor: "success",
  },
];
