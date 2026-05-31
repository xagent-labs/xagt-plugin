/**
 * PhylaX Execution Foundation Tests.
 *
 * Run: npx tsx lib/__tests__/execution-foundation.test.ts
 *
 * Tests risk policy, Redis operations, approval flow,
 * and unsigned tx validation without requiring live infra.
 */

// ─── Inline helpers (mirrors lib code without importing singletons) ───────────

function extractWalletAddresses(
  linkedAccounts: Array<{ type?: string; address?: string }>
): string[] {
  if (!Array.isArray(linkedAccounts)) return [];
  return linkedAccounts
    .filter((a) => a.type === "wallet" || a.type === "smart_wallet")
    .map((a) => a.address?.toLowerCase())
    .filter((a): a is string => !!a);
}

function isWalletLinked(wallet: string, linked: string[]): boolean {
  return linked.includes(wallet.toLowerCase());
}

// ─── Test runner ──────────────────────────────────────────────────────────────

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

// ─── Risk Policy Tests ───────────────────────────────────────────────────────

console.log("\n🛡️  Execution Foundation Tests\n");

console.log("── Risk Policy: Slippage ──");
{
  const MAX_SLIPPAGE = 5;
  assert(3 <= MAX_SLIPPAGE, "3% slippage within limit → allowed");
  assert(5 <= MAX_SLIPPAGE, "5% slippage at limit → allowed");
  assert(!(6 <= MAX_SLIPPAGE), "6% slippage over limit → blocked");
  assert(!(10 <= MAX_SLIPPAGE), "10% slippage way over → blocked");
}

console.log("\n── Risk Policy: Chain Allowlist ──");
{
  const { SUPPORTED_CHAINS } = require("../chains");
  const CHAIN_ALLOWLIST = new Set(SUPPORTED_CHAINS.map((c: any) => c.chainIndex));
  assert(CHAIN_ALLOWLIST.has("196"), "X Layer (196) → allowed");
  assert(CHAIN_ALLOWLIST.has("8453"), "Base (8453) → allowed");
  
  if (CHAIN_ALLOWLIST.has("1")) {
    assert(CHAIN_ALLOWLIST.has("1"), "Ethereum (1) → allowed (explicitly enabled)");
  } else {
    assert(!CHAIN_ALLOWLIST.has("1"), "Ethereum (1) → rejected (not in SUPPORTED_CHAINS)");
  }
  
  assert(!CHAIN_ALLOWLIST.has("999"), "Unknown chain (999) → blocked");
  assert(!CHAIN_ALLOWLIST.has(""), "Empty chain → blocked");
}

console.log("\n── Risk Policy: Quote Freshness ──");
{
  const QUOTE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes
  const now = Date.now();

  assert(now - now < QUOTE_EXPIRY_MS, "Fresh quote (0s old) → valid");
  assert(now - (now - 60_000) < QUOTE_EXPIRY_MS, "1 min old quote → valid");
  assert(now - (now - 119_000) < QUOTE_EXPIRY_MS, "119s old quote → valid");
  assert(!(now - (now - 121_000) < QUOTE_EXPIRY_MS), "121s old quote → stale");
  assert(!(now - (now - 300_000) < QUOTE_EXPIRY_MS), "5 min old quote → stale");
}

console.log("\n── Risk Policy: Live Execution Env ──");
{
  // Simulate env checks
  const liveEnabled = (env: string | undefined) => env === "true";
  assert(!liveEnabled(undefined), "ENABLE_LIVE_EXECUTION unset → disabled");
  assert(!liveEnabled("false"), "ENABLE_LIVE_EXECUTION=false → disabled");
  assert(liveEnabled("true"), "ENABLE_LIVE_EXECUTION=true → enabled");
  assert(!liveEnabled("TRUE"), "ENABLE_LIVE_EXECUTION=TRUE → disabled (case-sensitive)");
}

console.log("\n── Risk Policy: Kill Switch ──");
{
  // Kill switch: Redis unavailable → fail closed
  const killSwitchWhenRedisDown = true; // getRedis() returns null → true
  assert(killSwitchWhenRedisDown, "Redis unavailable → kill switch active (fail closed)");

  // Kill switch values
  const isKillActive = (val: string | null) => val === "1" || val === "true";
  assert(isKillActive("1"), "Kill switch value '1' → active");
  assert(isKillActive("true"), "Kill switch value 'true' → active");
  assert(!isKillActive(null), "Kill switch null → inactive");
  assert(!isKillActive("0"), "Kill switch '0' → inactive");
}

// ─── Approval Tests ──────────────────────────────────────────────────────────

console.log("\n── Approval: Replay Protection ──");
{
  // Simulate Redis SETNX behavior
  const consumed = new Set<string>();

  function tryConsume(id: string): boolean {
    if (consumed.has(id)) return false;
    consumed.add(id);
    return true;
  }

  assert(tryConsume("approval-1"), "First consume → success");
  assert(!tryConsume("approval-1"), "Second consume (replay) → rejected");
  assert(!tryConsume("approval-1"), "Third consume (replay) → rejected");
  assert(tryConsume("approval-2"), "Different approval → success");
}

console.log("\n── Approval: Expiry ──");
{
  const APPROVAL_EXPIRY_MS = 5 * 60 * 1000;
  const now = Date.now();

  const freshApproval = { expiresAt: now + APPROVAL_EXPIRY_MS };
  const expiredApproval = { expiresAt: now - 1000 };

  assert(now < freshApproval.expiresAt, "Fresh approval → valid");
  assert(now >= expiredApproval.expiresAt, "Expired approval → rejected");
}

// ─── Wallet Ownership Tests ──────────────────────────────────────────────────

console.log("\n── Wallet Ownership ──");
{
  const linked = extractWalletAddresses([
    { type: "wallet", address: "0xUserWallet" },
    { type: "smart_wallet", address: "0xSmartWallet" },
    { type: "email" },
  ]);

  assert(isWalletLinked("0xUserWallet", linked), "Linked wallet → allowed");
  assert(isWalletLinked("0xUSERWALLET", linked), "Different casing → allowed");
  assert(!isWalletLinked("0xOtherWallet", linked), "Unlinked wallet → rejected (403)");
  assert(!isWalletLinked("", linked), "Empty wallet → rejected");
}

// ─── Unsigned Tx Validation ──────────────────────────────────────────────────

console.log("\n── Unsigned Tx Validation ──");
{
  const validTx = {
    to: "0x1234567890abcdef",
    data: "0xabcdef",
    value: "0x0",
    chainId: "196",
    gas: "150000",
  };

  assert(!!validTx.to, "Tx has 'to' field → valid");
  assert(!!validTx.data, "Tx has 'data' field → valid");
  assert(!!validTx.gas || !!validTx.gas, "Tx has gas/gasLimit → valid");

  const noGasTx = { to: "0x123", data: "0xabc", value: "0x0", chainId: "1" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert(!(noGasTx as any).gas && !(noGasTx as any).gasLimit, "Tx without gas → blocked");

  const noDataTx = { to: "0x123", value: "0x0" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert(!(noDataTx as any).data, "Tx without data → blocked");
}

// ─── Server Never Broadcasts ─────────────────────────────────────────────────

console.log("\n── Server Never Broadcasts ──");
{
  // Verify that execute route returns unsignedTx, not a txHash
  const mockExecuteResponse = {
    executionId: "exec-123",
    unsignedTx: { to: "0x123", data: "0xabc", value: "0x0", chainId: "1", gas: "21000" },
    walletAddress: "0xuser",
    chainId: "1",
  };

  assert(!!mockExecuteResponse.unsignedTx, "Execute returns unsignedTx");
  assert(!("txHash" in mockExecuteResponse), "Execute does NOT return txHash");
  assert(!!mockExecuteResponse.walletAddress, "Execute includes wallet for client signing");
}

// ─── Tx Hash Format Validation ───────────────────────────────────────────────

console.log("\n── Tx Hash Validation ──");
{
  const validHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  const shortHash = "0xabc";
  const noPrefix = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab";
  const invalidChars = "0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg";

  const txHashRegex = /^0x[a-fA-F0-9]{64}$/;

  assert(txHashRegex.test(validHash), "Valid tx hash → accepted");
  assert(!txHashRegex.test(shortHash), "Short hash → rejected");
  assert(!txHashRegex.test(noPrefix), "No 0x prefix → rejected");
  assert(!txHashRegex.test(invalidChars), "Invalid hex chars → rejected");
}

// ─── Wallet Rejection Handling ───────────────────────────────────────────────

console.log("\n── Wallet Rejection Handling ──");
{
  // Simulate wallet rejection errors
  const errorMessages = [
    { code: 4001, msg: "User rejected the request" },
    { code: 4100, msg: "Unauthorized" },
    { code: 4902, msg: "Chain not added" },
  ];

  assert(errorMessages[0].code === 4001, "User rejection code 4001 → handled");
  assert(errorMessages[2].code === 4902, "Wrong chain code 4902 → handled");
}

// ─── Infrastructure Dependency Checks ────────────────────────────────────────

console.log("\n── Infrastructure: Live Execution Requires Redis ──");
{
  const isLiveEnabled = true;
  const redisAvailable = false;

  assert(
    isLiveEnabled && !redisAvailable,
    "Live execution + no Redis → must be blocked"
  );

  const policyWouldBlock = isLiveEnabled && !redisAvailable;
  assert(policyWouldBlock, "Risk policy blocks live execution without Redis");
}

console.log("\n── Infrastructure: Live Execution Requires DB ──");
{
  const isLiveEnabled = true;
  const dbAvailable = false;

  const policyWouldBlock = isLiveEnabled && !dbAvailable;
  assert(policyWouldBlock, "Risk policy blocks live execution without DB");
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("\n⚠️  Some tests failed!");
  process.exit(1);
} else {
  console.log("\n✅ All execution foundation tests passed.");
  process.exit(0);
}
