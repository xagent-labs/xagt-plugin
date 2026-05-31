import { POST as ConfirmPost } from "../../app/api/confirm/route";
import { execute as runTool } from "../tools/registry";
import { createExecutionRecord } from "../approval-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ ${message}`);
}

async function runTests() {
  console.log("\n🔄 Phase 9 Live Money Readiness Tests\n");

  const mockWallet = "0x1234567890abcdef1234567890abcdef12345678";
  const mockTarget = "0xrouterrouterrouterrouterrouterrouter";
  const mockChain = "196";
  const validTxHash = "0x" + "a".repeat(64);

  // General mocks
  (global as any).__mockVerifyWalletSession = async () => ({
    authenticated: true,
    statusCode: 200,
    session: { userId: "did:privy:test", walletAddress: mockWallet, method: "identity_token" }
  });
  (global as any).__mockCheckRateLimit = async () => true;

  // Track if we explicitly call the mocked onchain check
  let mockOnchainResult: any = null;
  (global as any).__mockCheckTxOnchain = async (hash: string, chainId: string) => {
    return mockOnchainResult || { status: "pending" };
  };

  // Mock DB / Redis so execution record works in memory
  (global as any).__mockGetRedis = () => null;
  (global as any).__mockGetDb = () => ({
    insert: () => ({ values: () => ({ returning: () => [{ id: "mock" }] }) })
  });
  (global as any).__mockCheckBalance = async () => ({ hasSufficient: true, balance: "1000", meta: {} });
  process.env.ENABLE_LIVE_EXECUTION = "false"; // Force memory mode for execution records

  console.log("── 1. Confirm Endpoint Tx Ownership Binding ──");
  
  // Create an execution record
  const execId1 = await createExecutionRecord(mockWallet, mockChain, "app-123", mockTarget);
  
  // Test 1: Rejects txHash where transaction.from does not match execution wallet
  mockOnchainResult = { status: "confirmed", hash: validTxHash, from: "0xWrongWallet", to: mockTarget };
  let req = new Request("http://localhost/api/confirm", {
    method: "POST", headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ executionId: execId1, txHash: validTxHash, chainId: mockChain })
  });
  let res = await ConfirmPost(req);
  let data = await res.json();
  assert(res.status === 403 && data.error.includes("sender does not match execution wallet"), "/api/confirm rejects txHash where transaction.from does not match execution wallet.");

  // Test 2: Rejects txHash where transaction.to does not match expected target/router
  mockOnchainResult = { status: "confirmed", hash: validTxHash, from: mockWallet, to: "0xWrongTarget" };
  req = new Request("http://localhost/api/confirm", {
    method: "POST", headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ executionId: execId1, txHash: validTxHash, chainId: mockChain })
  });
  res = await ConfirmPost(req);
  data = await res.json();
  assert(res.status === 403 && data.error.includes("target does not match authorized router"), "/api/confirm rejects txHash where transaction.to does not match expected target/router.");

  // Test 3: Rejects failed/reverted receipt
  mockOnchainResult = { status: "reverted", hash: validTxHash, from: mockWallet, to: mockTarget };
  req = new Request("http://localhost/api/confirm", {
    method: "POST", headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ executionId: execId1, txHash: validTxHash, chainId: mockChain })
  });
  res = await ConfirmPost(req);
  data = await res.json();
  assert(res.status === 400 && data.error.includes("failed or reverted on-chain"), "/api/confirm rejects failed/reverted receipt.");

  // Test 4: Accepts valid matching wallet + target + receipt
  mockOnchainResult = { status: "confirmed", hash: validTxHash, from: mockWallet, to: mockTarget };
  req = new Request("http://localhost/api/confirm", {
    method: "POST", headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ executionId: execId1, txHash: validTxHash, chainId: mockChain })
  });
  res = await ConfirmPost(req);
  data = await res.json();
  assert(res.status === 200, "/api/confirm accepts valid matching wallet + target + receipt.");

  // Test 5: Rejects reused executionId after successful confirm
  req = new Request("http://localhost/api/confirm", {
    method: "POST", headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ executionId: execId1, txHash: validTxHash, chainId: mockChain })
  });
  res = await ConfirmPost(req);
  data = await res.json();
  assert(res.status === 403 && data.error.includes("Execution record not found or expired"), "/api/confirm rejects reused executionId after successful confirm.");

  console.log("\n── 2. Scan Failure Quote Blocking ──");
  
  // Find swap tool in registry
  const { registry } = await import("../tools/registry");
  const swapTool = registry.get("get_swap_quote");
  if (!swapTool) throw new Error("get_swap_quote tool not found");

  // Mock getQuotePreflight
  (global as any).__mockGetQuotePreflightHandler = async () => ({ quote: "100", fromSymbol: "USDC", toSymbol: "TOKEN", meta: {} });
  
  // Test 6: get_swap_quote blocks when scanToken throws
  (global as any).__mockScanToken = async () => { throw new Error("Network error"); };
  let swapRes = await swapTool.execute({ to_address: "0xtoken", amount: 10, chain: mockChain }, { conversationId: "c1", walletAddress: mockWallet });
  assert(swapRes.blocked === true && swapRes.error.includes("Token safety scan unavailable"), "get_swap_quote blocks when scanToken throws.");

  // Test 7: get_swap_quote blocks when scan result is unknown/unavailable
  (global as any).__mockScanToken = async () => ({ decision: "unknown" });
  swapRes = await swapTool.execute({ to_address: "0xtoken", amount: 10, chain: mockChain }, { conversationId: "c1", walletAddress: mockWallet });
  assert(swapRes.blocked === true && swapRes.error.includes("Token safety scan unavailable"), "get_swap_quote blocks when scan result is unknown/unavailable.");

  // Test 8: get_swap_quote blocks when executionAllowed=false
  (global as any).__mockScanToken = async () => ({ decision: "high_risk", executionAllowed: false, isHoneypot: false, riskLevel: "HIGH", triggeredLabels: [], meta: {} });
  swapRes = await swapTool.execute({ to_address: "0xtoken", amount: 10, chain: mockChain, risk_mode: "degen" }, { conversationId: "c1", walletAddress: mockWallet });
  assert(swapRes.blocked === true && swapRes.error.includes("High risk or honeypot token detected"), "get_swap_quote blocks when executionAllowed=false.");

  // Test 9: blocked quote path does not create approval
  assert(!swapRes.quote && !swapRes.approvalId, "blocked quote path does not create approval.");

  console.log("\n──────────────────────────────────────────────────");
  console.log("Results: All tests passed!");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
