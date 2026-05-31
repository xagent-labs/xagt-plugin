import { createApproval, validateAndConsumeApproval } from "../approval-store";
import * as riskPolicy from "../risk-policy";

let mockRedisStore = new Map<string, string>();
let mockRedisUnavailable = false;

// Mock Redis Client
const mockRedis = {
  set: async (key: string, value: string, ...args: any[]) => {
    mockRedisStore.set(key, value);
    return "OK";
  },
  get: async (key: string) => {
    return mockRedisStore.get(key) || null;
  },
  eval: async (script: string, numkeys: number, ...args: any[]) => {
    const keys = args.slice(0, numkeys);
    const approvalKey = keys[0];
    const consumedKey = keys[1];

    const data = mockRedisStore.get(approvalKey);
    if (!data) return "MISSING";

    const alreadyConsumed = mockRedisStore.get(consumedKey);
    if (alreadyConsumed) return "CONSUMED";

    mockRedisStore.set(consumedKey, "1");
    return data;
  }
};

(global as any).__mockGetRedis = () => {
  if (mockRedisUnavailable) return null;
  return mockRedis;
};

// Mock risk policy to control live mode
let mockLiveExecutionEnabled = true;
(global as any).__mockIsLiveExecutionEnabled = () => mockLiveExecutionEnabled;

// Test runner setup
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

async function runTests() {
  console.log("\n🛡️  Approval Persistence and Atomic Consume Tests (Phase 4)\n");

  // Reset mocks
  mockRedisStore.clear();
  mockRedisUnavailable = false;
  mockLiveExecutionEnabled = true;

  console.log("── 1. Approval creation stores all required fields in Redis/shared store ──");
  {
    const id = await createApproval("0xTarget", "196", 100, 2.5, "0xUserWallet");
    const rawData = mockRedisStore.get(`phylax:approval:${id}`);
    assert(!!rawData, "Approval saved to Redis");
    const parsed = JSON.parse(rawData!);
    assert(parsed.id === id, "ID stored");
    assert(parsed.tokenAddress === "0xTarget", "Token address stored");
    assert(parsed.chain === "196", "Chain stored");
    assert(parsed.budgetUsd === 100, "Budget USD stored");
    assert(parsed.slippageLimitPercent === 2.5, "Slippage stored");
    assert(parsed.walletAddress === "0xuserwallet", "Wallet address normalized and stored");
    assert(!!parsed.createdAt && !!parsed.expiresAt, "Timestamps stored");
  }

  console.log("\n── 2 & 3. Approval can be retrieved across simulated instances, First consume succeeds ──");
  {
    const id = await createApproval("0xTarget", "196", 100, 2.5, "0xUserWallet");
    const result = await validateAndConsumeApproval(id);
    assert(result.valid === true, "First consume succeeds");
    assert(result.approval?.id === id, "Returns complete approval data");
  }

  console.log("\n── 4. Second consume of the same approval fails (Replay) ──");
  {
    const id = await createApproval("0xTarget", "196", 100, 2.5, "0xUserWallet");
    await validateAndConsumeApproval(id); // first
    const result2 = await validateAndConsumeApproval(id); // second
    assert(result2.valid === false, "Second consume rejected");
    assert(result2.code === "replay", "Returns correct replay error code");
  }

  console.log("\n── 5. Concurrent consume attempts allow exactly one success ──");
  {
    const id = await createApproval("0xTarget", "196", 100, 2.5, "0xUserWallet");
    
    // Simulate concurrent promises
    const promises = [
      validateAndConsumeApproval(id),
      validateAndConsumeApproval(id),
      validateAndConsumeApproval(id),
    ];
    const results = await Promise.all(promises);
    
    const successes = results.filter(r => r.valid).length;
    const replays = results.filter(r => r.code === "replay").length;
    
    assert(successes === 1, "Exactly one concurrent consume succeeds");
    assert(replays === 2, "Other concurrent consumes fail as replays");
  }

  console.log("\n── 6. Expired approval is rejected ──");
  {
    const id = await createApproval("0xTarget", "196", 100, 2.5, "0xUserWallet");
    // Manually mutate TTL in Redis to simulate expiry
    const raw = JSON.parse(mockRedisStore.get(`phylax:approval:${id}`)!);
    raw.expiresAt = Date.now() - 1000;
    mockRedisStore.set(`phylax:approval:${id}`, JSON.stringify(raw));

    const result = await validateAndConsumeApproval(id);
    assert(result.valid === false, "Expired approval rejected");
    assert(result.code === "expired", "Returns correct expired error code");
  }

  console.log("\n── 7. Missing approval is rejected ──");
  {
    const result = await validateAndConsumeApproval("non_existent_id");
    assert(result.valid === false, "Missing approval rejected");
    assert(result.code === "missing", "Returns correct missing error code");
  }

  console.log("\n── 9. Redis unavailable blocks live execution ──");
  {
    mockRedisUnavailable = true;
    let createFailed = false;
    try {
      await createApproval("0xTarget", "196", 100, 2.5, "0xUserWallet");
    } catch (err: any) {
      if (err.message.includes("Redis is required")) createFailed = true;
    }
    assert(createFailed, "Approval creation fails closed if Redis unavailable");

    const consumeResult = await validateAndConsumeApproval("some_id");
    assert(consumeResult.valid === false, "Approval consume fails closed if Redis unavailable");
  }

  console.log("\n── 10. Demo mode remains safe when ENABLE_LIVE_EXECUTION=false ──");
  {
    mockLiveExecutionEnabled = false;
    mockRedisUnavailable = true; // Memory fallback should activate

    const id = await createApproval("0xTarget", "196", 100, 2.5, "0xUserWallet");
    assert(!!id, "Approval created successfully in demo mode using memory fallback");

    const result = await validateAndConsumeApproval(id);
    assert(result.valid === true, "First consume succeeds in demo mode");

    const result2 = await validateAndConsumeApproval(id);
    assert(result2.valid === false, "Replay rejected in demo mode");
    assert(result2.code === "replay", "Returns correct replay error code in demo mode");
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
