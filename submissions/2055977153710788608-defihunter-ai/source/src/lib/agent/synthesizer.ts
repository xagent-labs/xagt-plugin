import type {
  AgentRunResult,
  AgentSynthesis,
  AlphaItem,
  RecommendedAction,
  RiskAlert,
  YieldRankItem,
  SkillResult,
} from "@/types/agent";
import { findSkillResult, SKILL } from "./skill-ids";

function extractNarratives(results: SkillResult[]): AlphaItem[] {
  const alpha = findSkillResult(results, SKILL.NARRATIVE);
  if (!alpha?.data || typeof alpha.data !== "object") return [];

  const data = alpha.data as Record<string, unknown>;

  if (Array.isArray(data.feed)) {
    return (data.feed as { id: string; narrative: string; strength: number; tokens: string[] }[]).map(
      (n) => ({
        id: n.id,
        narrative: n.narrative,
        strength: n.strength,
        tokens: n.tokens,
        timestamp: new Date().toISOString(),
      })
    );
  }

  const narratives = data.narratives as
    | { id: string; name: string; strength: number; relatedTokens: string[] }[]
    | undefined;
  return (narratives ?? []).map((n) => ({
    id: n.id,
    narrative: n.name,
    strength: n.strength,
    tokens: n.relatedTokens,
    timestamp: new Date().toISOString(),
  }));
}

function extractYields(results: SkillResult[]): YieldRankItem[] {
  const yieldRes = findSkillResult(results, SKILL.YIELD);
  if (!yieldRes?.data || typeof yieldRes.data !== "object") return [];

  const data = yieldRes.data as {
    opportunities?: {
      protocol: string;
      pool: string;
      apy: number;
      tvlUsd: number;
      riskScore: number;
      chain: string;
    }[];
  };

  return (data.opportunities ?? [])
    .filter((o) => Number.isFinite(o.apy) && Number.isFinite(o.tvlUsd))
    .map((o) => ({
      protocol: o.protocol,
      pool: o.pool,
      apy: o.apy,
      tvlUsd: o.tvlUsd,
      riskScore: o.riskScore,
      chain: o.chain,
    }));
}

function extractRiskAlerts(results: SkillResult[]): RiskAlert[] {
  const risk = findSkillResult(results, SKILL.RISK);
  if (!risk?.data || typeof risk.data !== "object") return [];

  const data = risk.data as {
    alerts?: { protocol: string; severity: RiskAlert["severity"]; message: string }[];
  };
  return data.alerts ?? [];
}

function buildActions(results: SkillResult[]): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  const swap = findSkillResult(results, SKILL.SWAP);
  if (swap?.data && typeof swap.data === "object") {
    const d = swap.data as { recommendation: string; reasoning: string };
    actions.push({
      type: d.recommendation === "execute" ? "swap" : d.recommendation === "avoid" ? "avoid" : "monitor",
      title: `Swap signal: ${d.recommendation.toUpperCase()}`,
      detail: d.reasoning,
      confidence: d.recommendation === "execute" ? 0.82 : 0.55,
    });
  }

  const gas = findSkillResult(results, SKILL.GAS);
  if (gas?.data && typeof gas.data === "object") {
    const d = gas.data as { recommendation?: string; cheapestChain?: string };
    if (d.recommendation) {
      actions.push({
        type: "monitor",
        title: `Gas: ${d.cheapestChain ?? "L2"}`,
        detail: d.recommendation,
        confidence: 0.7,
      });
    }
  }

  const strategy = findSkillResult(results, SKILL.STRATEGY);
  if (strategy?.data && typeof strategy.data === "object") {
    const d = strategy.data as { strategy: { name: string; expectedApy: number } };
    actions.push({
      type: "deposit",
      title: d.strategy.name,
      detail: `Target blended APY ~${d.strategy.expectedApy.toFixed(2)}%`,
      confidence: 0.78,
    });
  }

  const yields = extractYields(results);
  if (yields[0] && !actions.some((a) => a.type === "deposit")) {
    actions.push({
      type: "deposit",
      title: `Top yield: ${yields[0].protocol}`,
      detail: `${yields[0].pool} @ ${yields[0].apy.toFixed(2)}% APY (risk ${yields[0].riskScore})`,
      confidence: yields[0].riskScore < 40 ? 0.85 : 0.65,
    });
  }

  return actions;
}

export function synthesizeAgentResponse(
  runId: string,
  plan: AgentRunResult["plan"],
  results: SkillResult[],
  totalDurationMs: number
): AgentRunResult {
  const alphaFeed = extractNarratives(results);
  const topYields = extractYields(results);
  const riskAlerts = extractRiskAlerts(results);
  const recommendedActions = buildActions(results);

  const market = findSkillResult(results, SKILL.MARKET);
  const sentiment =
    market?.data && typeof market.data === "object"
      ? (market.data as { marketSentiment?: string }).marketSentiment ?? "neutral"
      : "neutral";

  const errors = results.filter((r) => r.status === "error");
  const summaryParts = [
    `Completed ${results.length} skill step(s) in ${totalDurationMs}ms.`,
    errors.length > 0 ? `${errors.length} step(s) reported errors.` : null,
    `Market sentiment: ${sentiment}.`,
    topYields.length > 0
      ? `Best yield: ${topYields[0].protocol} ${topYields[0].apy.toFixed(1)}% APY.`
      : null,
    alphaFeed.length > 0 ? `Dominant narrative: ${alphaFeed[0].narrative}.` : null,
    riskAlerts.length > 0 ? `${riskAlerts.length} risk alert(s) active.` : "Risk profile within thresholds.",
  ].filter(Boolean);

  const synthesis: AgentSynthesis = {
    summary: summaryParts.join(" "),
    alphaFeed,
    topYields,
    riskAlerts,
    recommendedActions,
  };

  return { runId, plan, results, synthesis, totalDurationMs };
}
