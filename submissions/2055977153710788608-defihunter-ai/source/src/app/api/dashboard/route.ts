import { NextResponse } from "next/server";
import { initializeSkills } from "@skills/index";
import { executeSkillsParallel } from "@skills/core";
import { nanoid } from "nanoid";

export async function GET() {
  initializeSkills();

  const requestId = nanoid();
  const ctx = { requestId, chainId: 1 };

  const results = await executeSkillsParallel(
    [
      { skillId: "market-analyzer", input: {} },
      { skillId: "alpha_feed", input: { minStrength: 50, limit: 6 } },
      { skillId: "defi_yield_scan", input: { minApy: 4, maxRiskScore: 70, limit: 6 } },
      { skillId: "risk_checker", input: { maxAcceptableRisk: 55 } },
    ],
    ctx
  );

  const market = results.find((r) => r.skillId === "market-analyzer")?.data as
    | { marketSentiment?: string }
    | undefined;
  const alphaRes = results.find((r) => r.skillId === "alpha_feed")?.data as
    | { feed?: { id: string; narrative: string; strength: number; relatedTokens?: string[]; tokens?: string[] }[] }
    | undefined;
  const narratives = results.find((r) => r.skillId === "narrative_detector")?.data as
    | { narratives?: { id: string; name: string; strength: number; relatedTokens: string[] }[] }
    | undefined;
  const yields = results.find((r) => r.skillId === "defi_yield_scan")?.data as
    | {
        opportunities?: {
          protocol: string;
          pool: string;
          apy: number;
          tvlUsd: number;
          riskScore: number;
          chain: string;
        }[];
      }
    | undefined;
  const risks = results.find((r) => r.skillId === "risk_checker")?.data as
    | { alerts?: { protocol: string; severity: string; message: string }[] }
    | undefined;

  return NextResponse.json({
    marketSentiment: market?.marketSentiment ?? "neutral",
    alphaFeed:
      (alphaRes?.feed ?? []).map((n) => ({
        id: n.id,
        narrative: n.narrative,
        strength: n.strength,
        tokens: n.tokens ?? n.relatedTokens ?? [],
        timestamp: new Date().toISOString(),
      })) ||
      (narratives?.narratives ?? []).map((n) => ({
        id: n.id,
        narrative: n.name,
        strength: n.strength,
        tokens: n.relatedTokens,
        timestamp: new Date().toISOString(),
      })),
    topYields: (yields?.opportunities ?? []).map((o) => ({
      protocol: o.protocol,
      pool: o.pool,
      apy: o.apy,
      tvlUsd: o.tvlUsd,
      riskScore: o.riskScore,
      chain: o.chain,
    })),
    riskAlerts: risks?.alerts ?? [],
    refreshedAt: new Date().toISOString(),
  });
}
