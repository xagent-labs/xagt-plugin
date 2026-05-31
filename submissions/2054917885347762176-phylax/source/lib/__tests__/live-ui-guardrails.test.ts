/**
 * Phase 12: Live UI Guardrails & UX Tests
 * 
 * Verifies that the UI components and agent persona adhere to the 
 * compact, action-oriented requirements of Phase 12.
 * 
 * Run: npx tsx lib/__tests__/live-ui-guardrails.test.ts
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

console.log("\n🔄 Phase 12 Live UI Guardrails Tests\n");

// ── 1. Persona Style Enforcement ──
console.log("── 1. Persona Style Enforcement ──");
const anthropicPath = path.join(process.cwd(), "lib/anthropic.ts");
const anthropicContent = fs.readFileSync(anthropicPath, "utf8");

assert(anthropicContent.includes("short (2–5 sentences)"), "Persona requires short responses.");
assert(anthropicContent.includes("NO generic fillers"), "Persona explicitly forbids generic fillers.");
assert(anthropicContent.includes("Action-Oriented"), "Persona is action-oriented.");
assert(!anthropicContent.includes("I have analyzed"), "Generic filler 'I have analyzed' is removed from prompt examples.");

// ── 2. Action Button Explicit Labels ──
console.log("\n── 2. Action Button Explicit Labels ──");
const quoteCardPath = path.join(process.cwd(), "components/QuoteCard.tsx");
const quoteCardContent = fs.readFileSync(quoteCardPath, "utf8");

assert(quoteCardContent.includes("Approve USDC spending"), "Button label 'Approve USDC spending' is explicit.");
assert(quoteCardContent.includes("Sign swap in wallet"), "Button label 'Sign swap in wallet' is explicit.");
assert(quoteCardContent.includes("Refresh quote"), "Button label 'Refresh quote' is present.");
assert(quoteCardContent.includes("New trade"), "Button label 'New trade' is present.");
assert(quoteCardContent.includes("Scan another token"), "Button label 'Scan another token' is present.");
assert(!quoteCardContent.includes('className="btn">Continue</button>'), "Vague 'Continue' button is absent.");
assert(!quoteCardContent.includes('className="btn">Proceed</button>'), "Vague 'Proceed' button is absent.");

// ── 3. Tool Message Actionability ──
console.log("\n── 3. Tool Message Actionability ──");
const registryPath = path.join(process.cwd(), "lib/tools/registry.ts");
const registryContent = fs.readFileSync(registryPath, "utf8");

assert(registryContent.includes("Switch to X Layer to proceed"), "Coming soon error suggests switching chain.");
assert(registryContent.includes("Reduce amount or top up"), "Insufficient balance error suggests user action.");
assert(registryContent.includes("safety scan unavailable"), "Scan error message is direct.");

// ── 4. Safety Wording ──
console.log("\n── 4. Safety Wording ──");
assert(quoteCardContent.includes("LOW risk by current scan"), "Uses 'LOW risk' wording.");
assert(!quoteCardContent.includes("safe token"), "Does not use 'safe token' wording.");
assert(!quoteCardContent.includes("risk-free"), "Does not use 'risk-free' wording.");

// ── 5. Mobile & UI Polish ──
console.log("\n── 5. Mobile & UI Polish ──");
const chatPanelPath = path.join(process.cwd(), "components/ChatPanel.tsx");
const chatPanelContent = fs.readFileSync(chatPanelPath, "utf8");

assert(chatPanelContent.includes("Trade secure on X Layer"), "Welcome message is concise.");
assert(chatPanelContent.includes("text-xl"), "Welcome heading uses optimized sizing.");

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
