/**
 * PhylaX Agentic Planner & Decision Layer Tests
 *
 * Run: npx tsx lib/__tests__/agent-plan.test.ts
 */

import * as fs from "fs";
import * as path from "path";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

console.log("\n🔄 Agentic Planner Tests\n");

const planPath = path.join(process.cwd(), "lib/agent-plan.ts");
const planExists = fs.existsSync(planPath);
assert(planExists, "Agent plan schema file exists");
if (planExists) {
  const planCode = fs.readFileSync(planPath, "utf8");
  assert(planCode.includes("goal: string;"), "Schema has goal");
  assert(planCode.includes("plan: string[];"), "Schema has plan array");
  assert(planCode.includes("nextAction:"), "Schema has nextAction");
}

const anthropicPath = path.join(process.cwd(), "lib/anthropic.ts");
const anthropicCode = fs.readFileSync(anthropicPath, "utf8");

assert(anthropicCode.includes("<agent_plan>"), "LLM is instructed to output <agent_plan> JSON block");
assert(anthropicCode.includes("Candidate Comparison"), "LLM is instructed to produce candidate comparison");
assert(anthropicCode.includes("Decision Summary"), "LLM is instructed to produce a decision summary");
assert(anthropicCode.includes("Suggest exactly ONE safe next action"), "LLM is constrained to one safe next action");
assert(anthropicCode.includes("Never suggest auto-buy, copy-trade, sniper"), "LLM refuses auto-trade in next actions");

assert(anthropicCode.includes("Planning route"), "SSE step 'Planning route' is present");
assert(anthropicCode.includes("Searching candidates"), "SSE step 'Searching candidates' is present");
assert(anthropicCode.includes("Comparing candidates"), "SSE step 'Comparing candidates' is present");
assert(anthropicCode.includes("Scanning risks"), "SSE step 'Scanning risks' is present");
assert(anthropicCode.includes("Preparing quote preview"), "SSE step 'Preparing quote preview' is present");
assert(anthropicCode.includes("Synthesizing decision"), "SSE step 'Synthesizing decision' is present");

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("\n⚠️  Some tests failed!");
  process.exit(1);
} else {
  console.log("\n✅ All agentic planner tests passed.");
  process.exit(0);
}
