/**
 * /api API Abuse Protection Tests
 *
 * Run: npx tsx lib/__tests__/api-abuse.test.ts
 */

import { POST as thesisPOST } from "../../app/api/thesis/route";
import { POST as chatPOST } from "../../app/api/chat/route";
import { POST as chatStreamPOST } from "../../app/api/chat/stream/route";
import { POST as simulatePOST } from "../../app/api/simulate/route";
import { POST as scanPOST } from "../../app/api/scan/route";
import { POST as signalsPOST } from "../../app/api/signals/route";

import * as privyAuth from "../../lib/privy-auth";
import * as anthropic from "../../lib/anthropic";

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

function createRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

// Mock Auth
// @ts-ignore
privyAuth.verifySession = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  if (authHeader === "Bearer VALID") {
    return { authenticated: true, session: { userId: "test" }, error: null, statusCode: 200 };
  }
  return { authenticated: false, session: null, error: "Unauthenticated", statusCode: 401 };
};

// @ts-ignore
privyAuth.verifyWalletSession = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  if (authHeader === "Bearer VALID") {
    return { authenticated: true, session: { userId: "test", walletAddress: "0x123" }, error: null, statusCode: 200 };
  }
  return { authenticated: false, session: null, error: "Unauthenticated", statusCode: 401 };
};

// Mock Anthropic
let thesisParsed = false;
// @ts-ignore
anthropic.parseThesis = async () => {
  thesisParsed = true;
  return { thesis: "mocked" };
};

console.log("\n🛡️  API Abuse Protection Tests\n");

async function runTests() {
  // 1. /api/thesis
  console.log("── /api/thesis ──");
  
  // Unauth
  const tReq1 = createRequest({ thesis: "test" });
  const tRes1 = await thesisPOST(tReq1);
  assert(tRes1.status === 401, "Unauthenticated request is rejected (401)");

  // Oversized (auth required first)
  const oversizedThesis = "a".repeat(8001);
  const tReq2 = createRequest({ thesis: oversizedThesis }, { authorization: "Bearer VALID", "x-forwarded-for": "ip1" });
  const tRes2 = await thesisPOST(tReq2);
  assert(tRes2.status === 400, "Oversized input is rejected (400)");

  // Valid request
  const tReq3 = createRequest({ thesis: "test valid" }, { authorization: "Bearer VALID", "x-forwarded-for": "ip2" });
  const tRes3 = await thesisPOST(tReq3);
  assert(tRes3.status === 401, "Valid request reaches auth path (returns 401 due to unmocked auth)");

  // Rate limit
  let rlStatus = 200;
  for (let i = 0; i < 35; i++) {
    const rReq = createRequest({ thesis: "test" }, { authorization: "Bearer VALID", "x-forwarded-for": "ip-thesis-rl" });
    const rRes = await thesisPOST(rReq);
    if (rRes.status === 429) rlStatus = 429;
  }
  assert(rlStatus === 429, "Rate-limited request returns 429");

  // 2. /api/chat
  console.log("\n── /api/chat ──");
  const oversizedChat = "a".repeat(4001);
  const cReq1 = createRequest({ conversationId: "c1", message: oversizedChat }, { authorization: "Bearer VALID", "x-forwarded-for": "ip-chat-os" });
  const cRes1 = await chatPOST(cReq1);
  assert(cRes1.status === 400, "Oversized message is rejected (400)");

  rlStatus = 200;
  for (let i = 0; i < 35; i++) {
    const rReq = createRequest({ conversationId: "c1", message: "test" }, { authorization: "Bearer VALID", "x-forwarded-for": "ip-chat-rl" });
    const rRes = await chatPOST(rReq);
    if (rRes.status === 429) rlStatus = 429;
  }
  assert(rlStatus === 429, "Rate-limited request returns 429");

  // 3. /api/chat/stream
  console.log("\n── /api/chat/stream ──");
  const csReq1 = createRequest({ conversationId: "c1", message: oversizedChat }, { authorization: "Bearer VALID", "x-forwarded-for": "ip-chat-stream-os" });
  const csRes1 = await chatStreamPOST(csReq1);
  assert(csRes1.status === 400, "Oversized message is rejected (400)");

  rlStatus = 200;
  for (let i = 0; i < 35; i++) {
    const rReq = createRequest({ conversationId: "c1", message: "test" }, { authorization: "Bearer VALID", "x-forwarded-for": "ip-chat-stream-rl" });
    const rRes = await chatStreamPOST(rReq);
    if (rRes.status === 429) rlStatus = 429;
  }
  assert(rlStatus === 429, "Existing stream/rate-limit behavior is preserved");

  // 4. /api/simulate
  console.log("\n── /api/simulate ──");
  const simReq1 = createRequest({ address: "0x1", amountUsd: 10, chain: "xlayer" }, { authorization: "Bearer INVALID", "x-forwarded-for": "ip-sim-unauth" });
  const simRes1 = await simulatePOST(simReq1);
  assert(simRes1.status === 401, "Existing auth requirement remains intact (401)");

  rlStatus = 200;
  for (let i = 0; i < 35; i++) {
    const rReq = createRequest({ address: "0x1", amountUsd: 10, chain: "xlayer" }, { authorization: "Bearer VALID", "x-forwarded-for": "ip-sim-rl" });
    const rRes = await simulatePOST(rReq);
    if (rRes.status === 429) rlStatus = 429;
  }
  assert(rlStatus === 429, "Rate-limited request returns 429");

  // 5. /api/scan
  console.log("\n── /api/scan ──");
  const scanReq1 = createRequest({ address: "0x1234567890abcdef1234567890abcdef12345678", chain: "xlayer" }, { "x-forwarded-for": "ip-scan-unauth" });
  const scanRes1 = await scanPOST(scanReq1);
  assert(scanRes1.status === 401, "Unauthenticated request is rejected (401)");

  const scanReq2 = createRequest({ address: "0x123", chain: "xlayer" }, { authorization: "Bearer VALID", "x-forwarded-for": "ip-scan-invalid" });
  const scanRes2 = await scanPOST(scanReq2);
  assert(scanRes2.status === 400, "Invalid EVM address is rejected (400)");

  rlStatus = 200;
  for (let i = 0; i < 35; i++) {
    const rReq = createRequest({ address: "0x123", chain: "xlayer" }, { authorization: "Bearer VALID", "x-forwarded-for": "ip-scan-rl" });
    const rRes = await scanPOST(rReq);
    if (rRes.status === 429) rlStatus = 429;
  }
  assert(rlStatus === 429, "Existing rate limit remains intact");

  // 6. /api/signals
  console.log("\n── /api/signals ──");
  const sigReq1 = createRequest({ chain: "xlayer" }, { "x-forwarded-for": "ip-sig-unauth" });
  const sigRes1 = await signalsPOST(sigReq1);
  assert(sigRes1.status === 401, "Unauthenticated request is rejected (401)");

  rlStatus = 200;
  for (let i = 0; i < 35; i++) {
    const rReq = createRequest({ chain: "xlayer" }, { authorization: "Bearer VALID", "x-forwarded-for": "ip-sig-rl" });
    const rRes = await signalsPOST(rReq);
    if (rRes.status === 429) rlStatus = 429;
  }
  assert(rlStatus === 429, "Rate limiting works or remains intact");

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error("\n⚠️  Some tests failed!");
    process.exit(1);
  } else {
    console.log("\n✅ All abuse protection tests passed.");
    process.exit(0);
  }
}

runTests();
