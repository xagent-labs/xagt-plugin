import type { RadarToken, RiskLevel, SecurityVerdict } from "../types";

export const riskTone: Record<RiskLevel, string> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

export const verdictLabel: Record<SecurityVerdict, string> = {
  safe: "No block",
  warn: "Warn",
  block: "Block",
};

export function formatMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatAge(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function truncateAddress(address: string) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function classifyToken(token: RadarToken) {
  if (token.securityVerdict === "block") return "Do not touch";
  if (token.riskScore >= 76) return "Research only";
  if (token.smartMoneyScore >= 72 && token.riskScore < 55) return "Watchlist";
  if (token.bondingProgress > 85 && token.liquidity > 20_000) return "Late-stage watch";
  return "Needs checks";
}

export function momentumScore(token: RadarToken) {
  const volume = Math.min(35, token.volume24h / 2500);
  const smart = token.smartMoneyScore * 0.42;
  const bonding = token.bondingProgress * 0.18;
  const price = Math.max(-12, Math.min(15, token.priceChange1h)) * 0.5;
  return Math.max(5, Math.min(95, volume + smart + bonding + price));
}

export function safetyScore(token: RadarToken) {
  return Math.max(5, Math.min(95, 100 - token.riskScore));
}
