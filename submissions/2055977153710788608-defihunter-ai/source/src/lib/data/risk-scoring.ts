import type { ProtocolYieldRow } from "./types";

const AUDITED_PROTOCOLS = new Set([
  "aave",
  "aave-v3",
  "compound",
  "compound-v3",
  "curve",
  "curve-dex",
  "uniswap",
  "uniswap-v3",
  "maker",
  "makerdao",
  "lido",
  "convex",
  "yearn",
  "morpho",
  "morpho-blue",
  "gmx",
  "gmx-v2",
  "pendle",
]);

export function isAuditedProject(projectId: string): boolean {
  const normalized = projectId.toLowerCase().replace(/\s+/g, "-");
  return [...AUDITED_PROTOCOLS].some(
    (p) => normalized.includes(p) || p.includes(normalized.split("-")[0] ?? "")
  );
}

/** Heuristic risk 0–100 from pool metadata (DeFiLlama fields). */
export function computePoolRiskScore(pool: {
  tvlUsd: number;
  apy: number;
  ilRisk?: string;
  project: string;
  stablecoin?: boolean;
}): number {
  let score = 20;

  if (pool.tvlUsd < 1_000_000) score += 25;
  else if (pool.tvlUsd < 10_000_000) score += 12;
  else if (pool.tvlUsd > 100_000_000) score -= 8;

  if (pool.apy > 50) score += 30;
  else if (pool.apy > 25) score += 18;
  else if (pool.apy > 15) score += 8;

  if (pool.ilRisk === "yes") score += 15;
  if (!isAuditedProject(pool.project)) score += 12;
  if (pool.stablecoin) score -= 10;

  return Math.max(5, Math.min(95, Math.round(score)));
}

export function computeProtocolRiskFromTvl(
  protocol: string,
  chain: string,
  tvlUsd: number,
  hasExploit: boolean
): Omit<import("./types").ProtocolRiskProfile, "protocol" | "chain"> {
  const auditScore = isAuditedProject(protocol) ? 88 : 55;
  const liquidityRisk =
    tvlUsd < 10_000_000 ? 70 : tvlUsd < 100_000_000 ? 40 : 15;
  const centralizationRisk = isAuditedProject(protocol) ? 25 : 55;
  let overallRisk = Math.round(
    (100 - auditScore) * 0.35 + liquidityRisk * 0.35 + centralizationRisk * 0.3
  );
  if (hasExploit) overallRisk = Math.min(95, overallRisk + 25);

  return {
    auditScore,
    tvlUsd,
    exploitHistory: hasExploit,
    centralizationRisk,
    liquidityRisk,
    overallRisk,
  };
}

export function filterYields(
  rows: ProtocolYieldRow[],
  minApy: number,
  maxRisk: number
): ProtocolYieldRow[] {
  return rows
    .filter((y) => y.apy >= minApy && y.riskScore <= maxRisk && y.tvlUsd >= 100_000)
    .sort((a, b) => b.apy - a.apy);
}
