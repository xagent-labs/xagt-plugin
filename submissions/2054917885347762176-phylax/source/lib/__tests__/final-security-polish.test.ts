import { readFileSync } from "fs";
import * as path from "path";
import { POST as ConfirmPost } from "../../app/api/confirm/route";
import { GET as HealthGet } from "../../app/api/health/route";
import { enforceRiskPolicy } from "../risk-policy";
import { createExecutionRecord } from "../approval-store";
import { SUPPORTED_CHAINS } from "../chains";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ ${message}`);
}

async function runTests() {
  console.log("\n🔄 Final Security Polish Tests (Phase 8)\n");

  // ── 1. Confirm Endpoint Hardening ──────────────────────────────────────────
  console.log("── /api/confirm ──");
  
  const mockWallet = "0x1234567890abcdef1234567890abcdef12345678";
  const mockChain = "196";

  // Mock privy auth global
  (global as any).__mockVerifyWalletSession = async () => ({
    authenticated: true,
    statusCode: 200,
    session: { userId: "did:privy:test", walletAddress: mockWallet, method: "identity_token" }
  });

  // Mock global rate limiter
  (global as any).__mockCheckRateLimit = async () => true;

  // Rejects missing executionId
  const req1 = new Request("http://localhost/api/confirm", {
    method: "POST",
    headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ txHash: "0x" + "a".repeat(64), chainId: mockChain })
  });
  const res1 = await ConfirmPost(req1);
  const data1 = await res1.json();
  assert(res1.status === 400 && data1.error.includes("Execution ID is required"), "/api/confirm rejects missing executionId.");

  // Rejects invalid txHash
  const req2 = new Request("http://localhost/api/confirm", {
    method: "POST",
    headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ executionId: "exec-123", txHash: "invalid", chainId: mockChain })
  });
  const res2 = await ConfirmPost(req2);
  const data2 = await res2.json();
  assert(res2.status === 400 && data2.error.includes("Invalid transaction hash format"), "/api/confirm rejects invalid txHash.");

  // Rejects unknown or expired executionId
  const req3 = new Request("http://localhost/api/confirm", {
    method: "POST",
    headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ executionId: "exec-notfound", txHash: "0x" + "b".repeat(64), chainId: mockChain })
  });
  const res3 = await ConfirmPost(req3);
  const data3 = await res3.json();
  assert(res3.status === 403 && (data3.error.includes("Invalid or expired execution ID") || data3.error.includes("Execution record not found")), "/api/confirm rejects unknown or expired executionId.");

  // Test explicitly expired in-memory record
  const originalDateNow = Date.now;
  try {
    const expiredId = await createExecutionRecord(mockWallet, mockChain);
    // Move time forward by 16 minutes
    Date.now = () => originalDateNow() + 16 * 60 * 1000;
    
    const reqExpired = new Request("http://localhost/api/confirm", {
      method: "POST",
      headers: { "x-forwarded-for": "127.0.0.1" },
      body: JSON.stringify({ executionId: expiredId, txHash: "0x" + "f".repeat(64), chainId: mockChain })
    });
    const resExpired = await ConfirmPost(reqExpired);
    const dataExpired = await resExpired.json();
    assert(resExpired.status === 403 && (dataExpired.error.includes("Execution record not found") || dataExpired.error.includes("expired")), "/api/confirm explicitly rejects expired in-memory executionId.");
  } finally {
    Date.now = originalDateNow;
  }

  // Mock Redis presence to prove non-live mode ignores it and correctly reads from memoryExecutionStore
  let redisWasRead = false;
  (global as any).__mockGetRedis = () => ({
    get: async (key: string) => {
      redisWasRead = true;
      return null;
    },
    set: async () => "OK",
    eval: async () => null,
    del: async () => 0,
  });

  // Phase 9: Mock onchain tx check — confirm now requires onchain verification
  const validConfirmTxHash = "0x" + "e".repeat(64);
  (global as any).__mockCheckTxOnchain = async (hash: string, chainId: string) => {
    if (hash === validConfirmTxHash) {
      return { status: "confirmed", hash, from: mockWallet, to: "0xrouter" };
    }
    return { status: "pending" };
  };

  // Create a valid execution record
  const execId = await createExecutionRecord(mockWallet, mockChain);

  // Rejects wallet mismatch
  (global as any).__mockVerifyWalletSession = async () => ({
    authenticated: true,
    statusCode: 200,
    session: { userId: "did:privy:other", walletAddress: "0xOtherWallet", method: "identity_token" }
  });
  const req4 = new Request("http://localhost/api/confirm", {
    method: "POST",
    headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ executionId: execId, txHash: "0x" + "c".repeat(64), chainId: mockChain })
  });
  const res4 = await ConfirmPost(req4);
  const data4 = await res4.json();
  assert(res4.status === 403 && data4.error.includes("Execution wallet does not match"), "/api/confirm rejects wallet mismatch.");

  // Restore mock wallet
  (global as any).__mockVerifyWalletSession = async () => ({
    authenticated: true,
    statusCode: 200,
    session: { userId: "did:privy:test", walletAddress: mockWallet, method: "identity_token" }
  });

  // Rejects chain mismatch
  const req5 = new Request("http://localhost/api/confirm", {
    method: "POST",
    headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ executionId: execId, txHash: "0x" + "d".repeat(64), chainId: "8453" })
  });
  const res5 = await ConfirmPost(req5);
  const data5 = await res5.json();
  assert(res5.status === 403 && data5.error.includes("Execution chain does not match"), "/api/confirm rejects chain mismatch.");

  // Accepts valid verified wallet + matching execution
  const req6 = new Request("http://localhost/api/confirm", {
    method: "POST",
    headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ executionId: execId, txHash: validConfirmTxHash, chainId: mockChain })
  });
  const res6 = await ConfirmPost(req6);
  assert(res6.status === 200, "/api/confirm accepts valid verified wallet + matching execution + successful receipt.");

  assert(!redisWasRead, "/api/confirm explicitly ignores Redis for memory records in non-live mode.");
  delete (global as any).__mockGetRedis;
  delete (global as any).__mockCheckTxOnchain;

  // Check confirm code to ensure it doesn't broadcast
  const confirmCode = readFileSync(path.join(process.cwd(), "app/api/confirm/route.ts"), "utf-8");
  assert(!confirmCode.includes("eth_sendRawTransaction") && !confirmCode.includes("broadcast"), "/api/confirm never broadcasts a transaction.");

  // ── 2. Health Endpoint Hardening ──────────────────────────────────────────
  console.log("\n── /api/health ──");

  const hReq = new Request("http://localhost/api/health", { method: "GET" });
  const hRes = await HealthGet(hReq);
  const hData = await hRes.json();
  
  assert(!hData.details, "/api/health does not expose details to public by default.");
  assert(hData.status === "ok" || hData.status === "degraded", "/api/health returns coarse status.");
  assert("liveExecutionConfigured" in hData, "/api/health returns liveExecutionConfigured coarse value.");
  assert(hData.privyConfigured === undefined, "/api/health does not expose raw secrets or env values.");

  // ── 3. Risk Policy Chain Alignment ────────────────────────────────────────
  console.log("\n── risk-policy chain alignment ──");

  process.env.ENABLE_LIVE_EXECUTION = "true";
  
  process.env.DATABASE_URL = "postgres://dummy";
  process.env.REDIS_URL = "redis://dummy";
  process.env.PRIVY_APP_SECRET = "dummy";
  process.env.OKX_PROJECT_ID = "dummy";
  process.env.APPROVAL_SECRET = "dummy";
  process.env.NEXT_PUBLIC_PRIVY_APP_ID = "dummy";
  process.env.MAX_TRADE_USD_HARD_CAP = "100";
  process.env.RPC_URL_196 = "dummy";
  process.env.RPC_URL_8453 = "dummy";
  process.env.RPC_URL_56 = "dummy";
  
  (global as any).__mockGetRedis = () => ({
    get: async (key: string) => {
      if (key === "phylax:execution:paused") return null;
      return null;
    },
    set: async () => "OK",
    eval: async () => null,
  });

  (global as any).__mockGetDb = () => ({});

  const xlayerPolicy = await enforceRiskPolicy({
    chainId: "196",
    slippagePercent: 1,
    quoteCreatedAt: Date.now(),
    walletAddress: mockWallet,
    privyUserId: "did:privy:test",
    amountUsd: 10
  });
  assert(xlayerPolicy.allowed, `Risk policy allows X Layer. Reason: ${xlayerPolicy.reason}`);

  const basePolicy = await enforceRiskPolicy({
    chainId: "8453",
    slippagePercent: 1,
    quoteCreatedAt: Date.now(),
    walletAddress: mockWallet,
    privyUserId: "did:privy:test",
    amountUsd: 10
  });
  const isBaseSupported = SUPPORTED_CHAINS.some(c => c.chainIndex === "8453" && c.enabled);
  if (!isBaseSupported) {
    assert(!basePolicy.allowed, "Risk policy rejects Base (Coming Soon).");
  } else {
    assert(basePolicy.allowed, "Risk policy allows Base.");
  }

  const bscPolicy = await enforceRiskPolicy({
    chainId: "56",
    slippagePercent: 1,
    quoteCreatedAt: Date.now(),
    walletAddress: mockWallet,
    privyUserId: "did:privy:test",
    amountUsd: 10
  });
  const isBscSupported = SUPPORTED_CHAINS.some(c => c.chainIndex === "56" && c.enabled);
  if (!isBscSupported) {
    assert(!bscPolicy.allowed, "Risk policy rejects BSC (Coming Soon).");
  } else {
    assert(bscPolicy.allowed, "Risk policy allows BSC.");
  }

  const isEthSupported = SUPPORTED_CHAINS.some(c => c.chainIndex === "1");
  const ethPolicy = await enforceRiskPolicy({
    chainId: "1",
    slippagePercent: 1,
    quoteCreatedAt: Date.now(),
    walletAddress: mockWallet,
    privyUserId: "did:privy:test",
    amountUsd: 10
  });
  if (!isEthSupported) {
    assert(!ethPolicy.allowed && ethPolicy.reason === "Chain 1 is not in the execution allowlist.", "Risk policy rejects Ethereum if Ethereum is not in SUPPORTED_CHAINS.");
  } else {
    console.log("  ⚠️ Ethereum is supported, skipping rejection check.");
  }

  const unknownPolicy = await enforceRiskPolicy({
    chainId: "99999",
    slippagePercent: 1,
    quoteCreatedAt: Date.now(),
    walletAddress: mockWallet,
    privyUserId: "did:privy:test",
    amountUsd: 10
  });
  assert(!unknownPolicy.allowed && unknownPolicy.reason === "Chain 99999 is not in the execution allowlist.", "Risk policy rejects unknown chain.");

  const emptyPolicy = await enforceRiskPolicy({
    chainId: "",
    slippagePercent: 1,
    quoteCreatedAt: Date.now(),
    walletAddress: mockWallet,
    privyUserId: "did:privy:test",
    amountUsd: 10
  });
  assert(!emptyPolicy.allowed, "Risk policy rejects empty chain.");

  // ── 4. Concurrency checks ───────────────────────────────────────────────
  console.log("\n── Concurrency & Unawaited Promises ──");
  const simulateCode = readFileSync(path.join(process.cwd(), "app/api/simulate/route.ts"), "utf-8");
  assert(!simulateCode.includes("const approvalId = createApproval") || simulateCode.includes("const approvalId = await createApproval"), "No unawaited approval create callsites remain in /api/simulate.");

  console.log("\n──────────────────────────────────────────────────");
  console.log("Results: All tests passed!");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
