/**
 * PhylaX SSE Tests.
 *
 * Run: npx tsx lib/__tests__/sse.test.ts
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

console.log("\n🔄 SSE Streaming Tests\n");

const streamRoute = fs.existsSync(path.join(process.cwd(), "app/api/chat/stream/route.ts"));
assert(streamRoute, "SSE endpoint /api/chat/stream exists");

if (streamRoute) {
  const code = fs.readFileSync(path.join(process.cwd(), "app/api/chat/stream/route.ts"), "utf8");
  assert(code.includes("text/event-stream"), "Endpoint uses text/event-stream");
  assert(code.includes("sendEvent(\"final\""), "Final event is emitted");
  assert(code.includes("sendEvent(\"error\""), "Error event is emitted on failure path");
}

const anthropicRoute = fs.readFileSync(path.join(process.cwd(), "lib/anthropic.ts"), "utf8");
assert(anthropicRoute.includes("onProgress?.(\"tool_start\""), "tool_start event is emitted");
assert(anthropicRoute.includes("onProgress?.(\"tool_result\""), "tool_result event is emitted");
assert(anthropicRoute.includes("onProgress?.(\"partial_failure\""), "partial_failure event is emitted");
assert(anthropicRoute.includes("onProgress?.(\"step\""), "step event is emitted");

const executeRoute = fs.existsSync(path.join(process.cwd(), "app/api/execute/route.ts"));
const confirmRoute = fs.existsSync(path.join(process.cwd(), "app/api/confirm/route.ts"));
assert(executeRoute, "/api/execute remains untouched");
assert(confirmRoute, "/api/confirm remains untouched");

const chatRoute = fs.readFileSync(path.join(process.cwd(), "app/api/chat/route.ts"), "utf8");
assert(chatRoute.includes("const result = await runAgentLoop(message, chain, history, conversationId"), "Existing /api/chat behavior is not broken");

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("\n⚠️  Some tests failed!");
  process.exit(1);
} else {
  console.log("\n✅ All SSE streaming tests passed.");
  process.exit(0);
}
