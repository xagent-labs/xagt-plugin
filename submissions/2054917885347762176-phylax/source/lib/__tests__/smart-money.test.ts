/**
 * PhylaX Smart Money & Trenches Routing Tests
 *
 * Run: npx tsx lib/__tests__/smart-money.test.ts
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

console.log("\n🔄 Smart Money & Trenches Routing Tests\n");

const registryPath = path.join(process.cwd(), "lib/tools/registry.ts");
const registryCode = fs.readFileSync(registryPath, "utf8");

assert(!registryCode.includes("check_smart_money"), "check_smart_money fake tool is NOT added to registry");
assert(!registryCode.includes("trenches_scan"), "trenches_scan fake tool is NOT added to registry");
assert(!registryCode.includes("meme_risk_scan"), "meme_risk_scan fake tool is NOT added to registry");

const anthropicPath = path.join(process.cwd(), "lib/anthropic.ts");
const anthropicCode = fs.readFileSync(anthropicPath, "utf8");

assert(anthropicCode.includes("Smart money activity does not mean safe"), "Smart money rules added to persona");
assert(anthropicCode.includes("KOL activity does not mean safe"), "KOL rules added to persona");
assert(anthropicCode.includes("Trending does not mean safe"), "Trending rules added to persona");
assert(anthropicCode.includes("not available yet") || anthropicCode.includes("unsupported"), "Unsupported fallback rule added to persona");
assert(anthropicCode.includes("fake"), "No-faking rule is strictly enforced in persona");

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("\n⚠️  Some tests failed!");
  process.exit(1);
} else {
  console.log("\n✅ All smart money & trenches tests passed.");
  process.exit(0);
}
