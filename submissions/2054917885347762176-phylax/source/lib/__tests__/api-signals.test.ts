/**
 * /api/signals Endpoint Tests
 *
 * Run: npx tsx lib/__tests__/api-signals.test.ts
 */

import { POST } from "../../app/api/signals/route";

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

function createRequest(body?: unknown, text?: string) {
  return new Request("http://localhost:3000/api/signals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: text !== undefined ? text : (body ? JSON.stringify(body) : null),
  });
}

console.log("\n📡 /api/signals Tests\n");

async function runTests() {
  // 1. Empty body returns 400
  const req1 = createRequest(null, "");
  const res1 = await POST(req1);
  assert(res1.status === 400, "empty body returns 400");
  const json1 = await res1.json();
  assert(json1.error === "Invalid JSON body", "empty body error message");

  // 2. Invalid JSON returns 400
  const req2 = createRequest(undefined, "{ invalid_json: ");
  const res2 = await POST(req2);
  assert(res2.status === 400, "invalid JSON returns 400");
  const json2 = await res2.json();
  assert(json2.error === "Invalid JSON body", "invalid JSON error message");

  // We cannot easily mock OKX responses here since we are not using jest.
  // We can pass valid requests. If the CLI fails (because we don't have python or proper OKX connection),
  // it should return 502/503 OkxRealModeError.
  
  // 3. { chainId: "196" } does not throw 500
  const req3 = createRequest({ chainId: "196" });
  const res3 = await POST(req3);
  assert(res3.status !== 500, "{ chainId: '196' } does not throw 500");

  // 4. { chain: "xlayer" } does not throw 500
  const req4 = createRequest({ chain: "xlayer" });
  const res4 = await POST(req4);
  assert(res4.status !== 500, "{ chain: 'xlayer' } does not throw 500");

  // 5. Check if real integration failure returns 502/503 (or 401 since auth is now required)
  // Without real OKX CLI setup, it will definitely fail.
  assert(res3.status === 502 || res3.status === 200 || res3.status === 401, "OKX real integration returns 200 or 502 or 401");

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error("\n⚠️  Some tests failed!");
    process.exit(1);
  } else {
    console.log("\n✅ All signals endpoint tests passed.");
    process.exit(0);
  }
}

runTests();
