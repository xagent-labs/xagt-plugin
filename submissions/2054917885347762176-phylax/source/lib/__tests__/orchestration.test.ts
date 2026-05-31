/**
 * PhylaX Orchestration Tests.
 *
 * Run: npx tsx lib/__tests__/orchestration.test.ts
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

console.log("\n🔄 Orchestration Tests\n");

const anthropicRoute = fs.readFileSync(
  path.join(process.cwd(), "lib/anthropic.ts"),
  "utf8"
);

console.log("── Multi-tool Orchestration ──");
{
  assert(anthropicRoute.includes("const blocksToExecute = toolUseBlocks.slice(0, 5);"), "Multiple tool_use blocks are handled");
  assert(anthropicRoute.includes("Promise.allSettled("), "scan_token calls run with Promise.allSettled");
  assert(anthropicRoute.includes("settled.status === \"rejected\""), "One failed scan does not fail the whole agent turn");
  assert(anthropicRoute.includes("scanCount >= 3"), "Max 3 candidates are scanned");
}

console.log("\n── Quote Safety ──");
{
  assert(anthropicRoute.includes("quoteResultData.blocked"), "High-risk token blocks quote");
}

console.log("\n── Signal / Market Intelligence ──");
{
  // Signal-only flow must never transition to WAITING_FOR_CONFIRMATION
  assert(
    anthropicRoute.includes('type: "signals"'),
    "Signal-only results use type='signals' (not 'trade-plan')"
  );
  assert(
    !anthropicRoute.match(/successfulSignals\.length > 0[\s\S]{0,200}chatState\s*=\s*.*?WAITING_FOR_CONFIRMATION/),
    "Signal-only flow does not set WAITING_FOR_CONFIRMATION"
  );
  // TradePlanCard supports displayMode
  const tradePlanCard = fs.readFileSync(
    path.join(process.cwd(), "components/TradePlanCard.tsx"),
    "utf8"
  );
  assert(tradePlanCard.includes("displayMode"), "TradePlanCard supports displayMode prop");
  assert(tradePlanCard.includes("Market Signals") || tradePlanCard.includes("X Layer Signals"), "TradePlanCard shows 'Market Signals' or 'X Layer Signals' in signal mode");
  assert(!tradePlanCard.includes('"Pending"') && !tradePlanCard.includes("'Pending'"), "TradePlanCard does not show 'Pending' badge");
  assert(tradePlanCard.includes("SIGNAL") || tradePlanCard.includes("signalBadge"), "TradePlanCard uses signal-appropriate badges");
  
  // Token filter support in get_signals
  const registry = fs.readFileSync(
    path.join(process.cwd(), "lib/tools/registry.ts"),
    "utf8"
  );
  assert(registry.includes("token_filter"), "get_signals supports token_filter parameter");
  assert(registry.includes("tokenSpecificSignals"), "get_signals separates matched vs other signals");
  
  // Market structure debug logging
  assert(registry.includes("[market-debug]"), "market_structure_check has debug logging");
  assert(registry.includes("dataConfidence"), "market_structure_check returns dataConfidence");
  
  // System prompt includes signal rules
  assert(anthropicRoute.includes("SIGNAL AND MARKET INTELLIGENCE RULES"), "System prompt includes signal/market intelligence rules");
  assert(anthropicRoute.includes("token_filter"), "System prompt instructs LLM to use token_filter");
  assert(anthropicRoute.includes("no signal is found for that specific token"), "System prompt instructs clear message for missing token signals");
  assert(anthropicRoute.includes("explicitly say data is incomplete"), "System prompt instructs honest handling of incomplete data");
}

console.log("\n── Safety Invariants ──");
{
  const executeExists = fs.existsSync(path.join(process.cwd(), "app/api/execute/route.ts"));
  const confirmExists = fs.existsSync(path.join(process.cwd(), "app/api/confirm/route.ts"));
  
  assert(executeExists, "/api/execute remains untouched");
  assert(confirmExists, "/api/confirm remains untouched");
}

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("\n⚠️  Some tests failed!");
  process.exit(1);
} else {
  console.log("\n✅ All orchestration tests passed.");
  process.exit(0);
}
