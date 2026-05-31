/** Skill ID 分组：规范名 + 历史别名，供 Planner / Synthesizer 统一匹配 */
export const SKILL = {
  MARKET: ["market-analyzer", "token_price"],
  YIELD: ["yield-finder", "defi_yield_scan"],
  RISK: ["risk-evaluator", "risk_checker"],
  WALLET: ["wallet-analyzer", "wallet_analyze"],
  SWAP: ["swap-recommender", "swap_executor"],
  NARRATIVE: ["narrative-detector", "narrative_detector", "alpha_feed"],
  GAS: ["gas-tracker", "gas_optimizer"],
  STRATEGY: ["strategy-optimizer"],
  LEADERBOARD: ["protocol-leaderboard"],
} as const;

export function matchesSkill(skillId: string, group: readonly string[]): boolean {
  return (group as readonly string[]).includes(skillId);
}

export function findSkillResult<T extends { skillId: string; status: string }>(
  results: T[],
  group: readonly string[]
): T | undefined {
  return results.find((r) => matchesSkill(r.skillId, group) && r.status === "success");
}
