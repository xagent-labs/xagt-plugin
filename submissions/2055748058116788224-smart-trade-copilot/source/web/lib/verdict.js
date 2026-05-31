// ──────────────────────────────────────────────────────────────────────
//  THE SAFETY CORE — non-overridable deterministic adjudicator.
//
//  The LLM agent decides WHICH skills to call and WHEN to stop. It does
//  NOT decide whether a token is safe. That judgement is made HERE, by
//  fixed rules, and the agent is contractually forbidden from overriding
//  it. Security can hard-veto; negatives downgrade; positives only
//  enrich the explanation. On the buy side, caution is cheap and being
//  wrong is permanent.
//
//  This file is pure, deterministic, and unit-tested. It is the part of
//  the system a user can trust precisely BECAUSE an LLM cannot touch it.
// ──────────────────────────────────────────────────────────────────────

export const LEVELS = ["AVOID", "CAUTION", "BUY"]; // 0 worst → 2 best
const idx = (v) => LEVELS.indexOf(v);
const worse = (a, b) => LEVELS[Math.min(idx(a), idx(b))];

export function computeVerdict(s) {
  const reasons = [];
  const positives = [];
  let verdict = "BUY";
  let vetoed = false;

  // Stage 1 — security gate (authoritative, can hard-veto)
  if (!s.security || s.security.completed === false || s.security.level == null) {
    verdict = worse(verdict, "CAUTION");
    reasons.push({
      tag: "SECURITY UNVERIFIED",
      detail:
        "Security scan did not complete — this is NOT a pass. Treat with caution and re-scan before executing.",
      weight: "floor",
    });
  } else {
    const lvl = String(s.security.level).toUpperCase();
    if (s.security.isHoneypot || lvl === "CRITICAL") {
      vetoed = true;
      verdict = "AVOID";
      reasons.push({
        tag: s.security.isHoneypot ? "HONEYPOT" : "CRITICAL RISK",
        detail: s.security.isHoneypot
          ? "Token flagged as a honeypot on the buy side — funds could be unsellable."
          : "Security scan returned CRITICAL risk.",
        weight: "veto",
      });
    } else if (lvl === "HIGH") {
      verdict = worse(verdict, "CAUTION");
      reasons.push({
        tag: "HIGH RISK",
        detail: "Security scan returned HIGH risk — explicit confirmation required.",
        weight: "floor",
      });
    } else if (lvl === "MEDIUM") {
      reasons.push({
        tag: "MEDIUM RISK",
        detail: "Security scan returned MEDIUM risk — noted.",
        weight: "note",
      });
    } else {
      positives.push("Security scan: LOW risk.");
    }
  }

  const downgrade = (tag, detail) => {
    reasons.push({ tag, detail, weight: "downgrade" });
    verdict = LEVELS[Math.max(0, idx(verdict) - 1)];
  };

  if (!vetoed) {
    if (s.liquidityUsd != null && s.liquidityUsd < 10_000)
      downgrade("LOW LIQUIDITY", `Liquidity ~$${fmt(s.liquidityUsd)} (< $10k) — high slippage / exit risk.`);
    else if (s.liquidityUsd != null) positives.push(`Liquidity ~$${fmt(s.liquidityUsd)}.`);

    if (s.taxPct != null && s.taxPct > 10)
      downgrade("HIGH TAX", `Transfer tax ~${s.taxPct}% (> 10%).`);

    if (s.devRugCount != null && s.devRugCount > 0)
      downgrade("DEV RUG HISTORY", `Creator linked to ${s.devRugCount} prior rug token(s).`);

    if (s.ageHours != null && s.ageHours < 24)
      downgrade("BRAND NEW", `Token is < 24h old (${Math.round(s.ageHours)}h) — extra buy-side caution.`);
    else if (s.ageHours != null) positives.push(`Token age ${Math.round(s.ageHours / 24)}d.`);

    if (s.clusterRugPct != null && s.clusterRugPct >= 20)
      downgrade("HOLDER CLUSTER RISK", `Holder-cluster rug-pull share ~${s.clusterRugPct}%.`);
    else if (s.clusterConcentrated)
      downgrade("CONCENTRATED FLOAT", "Top holder clusters are highly concentrated.");

    if (s.bundlerConcentrated)
      downgrade("BUNDLER/SNIPER RISK", "High bundler/sniper concentration at launch.");

    if (s.smartMoney === "distributing")
      downgrade("SMART MONEY EXITING", "Top traders are net-distributing this token.");
    else if (s.smartMoney === "accumulating")
      positives.push("Smart money is freshly accumulating (supportive, non-overriding).");
  }

  const downgrades = reasons.filter((r) => r.weight === "downgrade").length;
  if (!vetoed && downgrades >= 2) verdict = "AVOID";

  const biggestRisk =
    reasons.find((r) => r.weight === "veto") ||
    reasons.find((r) => r.weight === "floor") ||
    reasons.find((r) => r.weight === "downgrade") ||
    reasons.find((r) => r.weight === "note") ||
    null;

  return {
    verdict,
    vetoed,
    reasons,
    positives,
    biggestRisk,
    canOfferExecution: verdict === "BUY" || verdict === "CAUTION",
  };
}

function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(Math.round(n));
}
