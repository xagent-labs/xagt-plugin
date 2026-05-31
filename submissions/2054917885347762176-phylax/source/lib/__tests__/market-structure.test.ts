/**
 * PhylaX Market Structure Adapter Tests
 *
 * Run: npx tsx lib/__tests__/market-structure.test.ts
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

console.log("\n🔄 Market Structure Adapter Tests\n");

const msPath = path.join(process.cwd(), "lib/market-structure.ts");
const msCode = fs.readFileSync(msPath, "utf8");

assert(msCode.includes("execFileAsync("), "Adapter uses execFile/spawn, not shell interpolation");
assert(msCode.includes("SUPPORTED_MSA_TOKENS.has(upperSymbol)"), "Unsupported symbols are blocked before script execution");
assert(msCode.includes("fs.existsSync(SCRIPT_PATH)"), "Python/script unavailable fails closed");

const registryPath = path.join(process.cwd(), "lib/tools/registry.ts");
const registryCode = fs.readFileSync(registryPath, "utf8");
assert(registryCode.includes("market_structure_check"), "market_structure_check is added to registry");

const anthropicPath = path.join(process.cwd(), "lib/anthropic.ts");
const anthropicCode = fs.readFileSync(anthropicPath, "utf8");

assert(anthropicCode.includes("market_structure_check"), "Persona references market_structure_check");
assert(anthropicCode.includes("read-only"), "market_structure_check is designated as read-only in persona");
assert(anthropicCode.includes("Refuse requests to auto-trade, snipe, or run a bot"), "No auto-trading/bot/server launch is exposed");
assert(!msCode.includes("msa_server.py"), "msa_server.py is not called");

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("\n⚠️  Some tests failed!");
  process.exit(1);
} else {
  console.log("\n✅ All market structure adapter tests passed.");
  process.exit(0);
}
