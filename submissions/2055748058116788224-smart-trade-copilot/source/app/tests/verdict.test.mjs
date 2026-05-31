// Unit tests for the deterministic verdict engine.
// Run:  node tests/verdict.test.mjs   (exit 0 = all pass)
//
// These prove the safety-critical invariants hold regardless of the
// network or API tier: security can hard-veto, negatives downgrade,
// a failed scan is NEVER a pass.

import { computeVerdict } from "../src/verdict.js";

const cases = [
  {
    name: "clean LOW-risk token → BUY",
    signals: { security: { level: "LOW", isHoneypot: false, completed: true }, liquidityUsd: 5e6, ageHours: 1000 },
    expect: "BUY",
  },
  {
    name: "honeypot → AVOID (hard veto)",
    signals: { security: { level: "LOW", isHoneypot: true, completed: true }, liquidityUsd: 5e6 },
    expect: "AVOID",
  },
  {
    name: "CRITICAL security → AVOID (hard veto)",
    signals: { security: { level: "CRITICAL", isHoneypot: false, completed: true } },
    expect: "AVOID",
  },
  {
    name: "HIGH security → CAUTION (floor)",
    signals: { security: { level: "HIGH", isHoneypot: false, completed: true }, liquidityUsd: 5e6, ageHours: 1000 },
    expect: "CAUTION",
  },
  {
    name: "security scan failed → CAUTION, never a pass",
    signals: { security: { level: null, isHoneypot: false, completed: false } },
    expect: "CAUTION",
  },
  {
    name: "two independent downgrades → AVOID",
    signals: { security: { level: "LOW", isHoneypot: false, completed: true }, liquidityUsd: 500, devRugCount: 2, ageHours: 1000 },
    expect: "AVOID",
  },
  {
    name: "single downgrade (dev rug history) → CAUTION",
    signals: { security: { level: "LOW", isHoneypot: false, completed: true }, liquidityUsd: 5e6, devRugCount: 1, ageHours: 1000 },
    expect: "CAUTION",
  },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const r = computeVerdict(c.signals);
  const ok = r.verdict === c.expect;
  ok ? pass++ : fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${c.name}\n      got=${r.verdict} want=${c.expect} veto=${r.vetoed} risk=${r.biggestRisk?.tag || "-"}`,
  );
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
