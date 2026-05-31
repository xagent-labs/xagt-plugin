export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SecurityVerdict = "safe" | "warn" | "block";
export type TokenStage = "NEW" | "MIGRATING" | "MIGRATED";

export interface RadarToken {
  id: string;
  symbol: string;
  name: string;
  address: string;
  chain: string;
  launchpad: string;
  stage: TokenStage;
  ageMinutes: number;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  priceChange1h: number;
  bondingProgress: number;
  smartMoneyScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  securityVerdict: SecurityVerdict;
  dev: {
    launches: number;
    rugs: number;
    holdingPercent: number;
  };
  holders: {
    top10Percent: number;
    snipers: number;
    bundlers: number;
    newWalletPercent: number;
  };
  flags: string[];
  opportunities: string[];
  recommendedChecks: string[];
  updatedAt: string;
}

export interface RadarSnapshot {
  generatedAt: string;
  source: "demo" | "okx-live";
  okxSkills: string[];
  status?: {
    ok: boolean;
    mode: "demo" | "okx-live" | "fallback";
    message: string;
    commandsAttempted?: string[];
    liveError?: string;
  };
  summary: {
    scanned: number;
    highRisk: number;
    smartMoneyHits: number;
    blocked: number;
  };
  tokens: RadarToken[];
}
