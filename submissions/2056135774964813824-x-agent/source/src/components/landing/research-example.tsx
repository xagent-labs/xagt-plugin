"use client";

import { AgentWorkflowGraph, WorkflowNode } from "@/components/agent-workflow-graph";
import { ResearchTimeline } from "@/components/research-timeline";
import { AIResponseCard, AIResponse } from "@/components/ai-response-card";
import { SectionHeader } from "@/components/landing/agent-orbit";
import type { ResearchStep } from "@/lib/types";

const WORKFLOW: WorkflowNode[] = [
  { id: "n1", kind: "input", label: "Question", detail: "ETH vs SOL — 7d", status: "done" },
  { id: "n2", kind: "research", label: "Crawl & rank", detail: "18 sources", status: "done" },
  { id: "n3", kind: "agent", label: "Narrative agent", detail: "AI · L2", status: "done" },
  { id: "n4", kind: "skill", label: "OKX skills", detail: "market + onchain", status: "active" },
  { id: "n5", kind: "synthesize", label: "Synthesize", detail: "draft thesis", status: "idle" },
  { id: "n6", kind: "output", label: "Source-backed brief", status: "idle" },
];

const TIMELINE: ResearchStep[] = [
  {
    id: "s1",
    kind: "search",
    label: "Resolve query intent",
    detail: "Identified entities ETH, SOL · timeframe 7d · benchmark BTC.",
    status: "done",
    durationMs: 412,
    outputs: [{ label: "entities", value: "ETH, SOL" }, { label: "timeframe", value: "7d" }],
  },
  {
    id: "s2",
    kind: "discover",
    label: "Discover public sources",
    detail: "Searched curated RSS + indexed publications. No paid APIs.",
    status: "done",
    durationMs: 980,
    outputs: [{ label: "feeds", value: "62" }, { label: "candidates", value: "184" }],
  },
  {
    id: "s3",
    kind: "scrape",
    label: "Fetch & extract",
    detail: "Pulled article HTML, stripped boilerplate, kept canonical bodies.",
    status: "done",
    durationMs: 2310,
    outputs: [{ label: "fetched", value: "18" }, { label: "tokens", value: "21.4k" }],
  },
  {
    id: "s4",
    kind: "rank",
    label: "Rank by relevance + reliability",
    status: "done",
    durationMs: 280,
    outputs: [{ label: "kept", value: "14" }, { label: "rejected", value: "4 low-trust" }],
  },
  {
    id: "s5",
    kind: "skill",
    label: "okx.dex.market(ETH/USDC · SOL/USDC)",
    detail: "Pulled live DEX depth, dominant routes and flow concentration.",
    status: "running",
  },
  { id: "s6", kind: "analyze", label: "Cross-reference on-chain inflows", status: "queued" },
  { id: "s7", kind: "synthesize", label: "Assemble source-backed thesis", status: "queued" },
];

const RESPONSE: AIResponse = {
  id: "preview",
  question: "Why is ETH outperforming SOL this week?",
  answer: `**Short answer.** ETH's 7-day outperformance is being driven primarily by **(1) restaking-narrative inflows**, **(2) reduced selling pressure on validator unstakes**, and **(3) DEX liquidity rotating back into ETH/USDC pairs from SOL meme pairs as memecoin velocity cooled.**

### Drivers

- **Restaking inflows** continue accumulating into EigenLayer and AVS deposits — measurable through staking-deposit gateway calls (\`okx.onchain.gateway\`) and corroborated by 4 independent publications.
- **Net validator withdrawals** are negative for the week — fewer ETH hitting circulating supply than entering staking contracts.
- **DEX flow concentration** shifted into ETH/USDC on Base + Arbitrum — captured live by \`okx.dex.market\`.
- **SOL memecoin rotation** appears exhausted (lower 24h velocity, declining new-pair counts) — narrative momentum cooled per the narrative agent.

### Risk to thesis

- An L2 shock or restaking incident would invalidate (1). Validator queue dynamics are the cleanest invalidation signal.
- This is intelligence, not financial advice.`,
  confidence: 0.88,
  agent: "Market Intel Agent",
  model: "openai/gpt-4o",
  timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  sources: [
    {
      id: "src1",
      title: "Restaking inflows hit new 30-day high",
      url: "https://www.coindesk.com",
      domain: "coindesk.com",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      relevance: 0.94,
      reliability: 0.88,
      category: "news",
    },
    {
      id: "src2",
      title: "ETH staking queue turns net positive",
      url: "https://www.theblock.co",
      domain: "theblock.co",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      relevance: 0.9,
      reliability: 0.86,
      category: "news",
    },
    {
      id: "src3",
      title: "Solana memecoin velocity cools",
      url: "https://blockworks.co",
      domain: "blockworks.co",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      relevance: 0.81,
      reliability: 0.82,
      category: "news",
    },
    {
      id: "src4",
      title: "Base DEX flows trend ETH-heavy",
      url: "https://defillama.com",
      domain: "defillama.com",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      relevance: 0.78,
      reliability: 0.95,
      category: "onchain",
    },
  ],
  skillsUsed: ["okx.dex.market", "okx.onchain.gateway", "okx.dex.signal"],
  followUps: [
    "Show me the ETH staking queue this week",
    "Which Base DEX pairs are gaining flow?",
    "Is the SOL memecoin rotation truly exhausted?",
  ],
};

export function ResearchExample() {
  return (
    <section className="relative mx-auto mt-20 max-w-6xl px-4 sm:mt-28 sm:px-6">
      <SectionHeader
        kicker="Workflow"
        title="Watch the agent think — every step shown, every source cited"
        body="No black box. Every question kicks off a transparent pipeline you can inspect: which sources were read, which skills ran, which agent assembled the thesis, which confidence level the synthesis earned."
      />

      <div className="mt-10 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="min-w-[640px] sm:min-w-0">
          <AgentWorkflowGraph nodes={WORKFLOW} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[420px,1fr]">
        <div className="rounded-xl border border-border bg-card/40 p-4 backdrop-blur-md sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse-glow" />
            research trace
          </div>
          <ResearchTimeline steps={TIMELINE} />
        </div>
        <AIResponseCard response={RESPONSE} />
      </div>
    </section>
  );
}
