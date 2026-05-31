/**
 * Maps an internal risk level string to an agent action.
 *
 * riskLevel values:
 *   "safe"      → cleared by OKX scan (LOW)
 *   "high_risk" → CRITICAL or HIGH from OKX scan
 *   "unknown"   → scan returned ok:true but data:[] (empty result)
 *
 * Actions:
 *   "safe"      → token can be simulated and (after approval) executed
 *   "high_risk" → conservative/moderate: skipped; degen: flagged but allowed
 *   "skipped"   → removed from trade plan silently
 *   "unknown"   → watchlisted; execution blocked regardless of riskMode
 */
export function determineRiskAction(
  riskLevel: string,
  riskMode: "conservative" | "moderate" | "degen"
): "safe" | "high_risk" | "skipped" | "unknown" {
  if (riskLevel === "unknown") {
    // Unknown risk = no data from scan → always watchlist, never executable
    return "unknown";
  }
  if (riskLevel === "high_risk") {
    return riskMode === "degen" ? "high_risk" : "skipped";
  }
  return "safe";
}
