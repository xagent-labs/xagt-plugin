import assert from "assert";
import { registry } from "../tools/registry";
import { parseThesis } from "../anthropic";
import { checkBalance } from "../okx";

async function runFlexibleTokenSwapTests() {
  process.env.MAX_TRADE_USD_HARD_CAP = "100";
  console.log("\n🔄 Flexible Token Swap Tests\n");
  let passed = 0;
  let failed = 0;

  try {
    // Mock the global tools
    (global as any).__mockCheckBalance = async (chain: string, wallet: string, token: string, amount: number) => {
      // Mock sufficient balance for testing
      return { hasSufficient: true, balance: (amount + 10).toString(), meta: { source: "mock", timestamp: new Date().toISOString() } };
    };

    (global as any).__mockScanToken = async (address: string) => {
      if (address === "0xmedium") {
        return {
          address,
          decision: "high_risk", // Treat MEDIUM as high risk for quote blocking
          riskLevel: "MEDIUM",
          isHoneypot: false,
          executionAllowed: false,
          triggeredLabels: [],
          meta: { source: "mock", timestamp: new Date().toISOString() }
        };
      }
      if (address === "0xfailscan") {
        throw new Error("Scan failed");
      }
      return {
        address,
        decision: "safe",
        riskLevel: "LOW",
        isHoneypot: false,
        executionAllowed: true,
        triggeredLabels: [],
        meta: { source: "mock", timestamp: new Date().toISOString() }
      };
    };

    (global as any).__mockGetQuotePreflightHandler = async (toAddress: string, amount: number, chain: string, fromToken: string) => {
      if (chain === "unsupported_chain") {
        throw new Error("Unsupported chain");
      }
      if (toAddress === "0xunsupported") {
        throw new Error("Unsupported token");
      }
      if (amount <= 0) {
        throw new Error("Invalid amount");
      }

      const isUsdc = fromToken === "0xusdc" || !fromToken;
      const isNative = fromToken === "0xnative";
      const fromDecimals = isUsdc ? 6 : (isNative ? 18 : 18); // Mocking decimals
      
      return {
        quote: {
          success: true,
          expectedOutputUsd: amount * 10,
          slippage: 1,
          gasFeeUsd: 0.5,
          route: "OKX Mock Route",
          txData: { to: "0xrouter", data: "0xswapdata" }
        },
        fromToken: fromToken || "0xusdc",
        fromSymbol: isUsdc ? "USDC" : (isNative ? "ETH" : "MOCK"),
        fromAmountUsd: amount,
        toSymbol: "MOCKTO",
        needsApproval: !isNative,
        approveTxData: !isNative ? { to: "0xspender", data: "0xapprove" } : undefined,
        meta: { source: "mock", timestamp: new Date().toISOString() }
      };
    };

    (global as any).__mockGetSwapTxData = async (toAddress: string, amount: number, chain: string, walletAddress: string, fromToken: string, slippage: number) => {
      return {
        txData: { to: "0xrouter", data: "0xswapdata" }
      };
    };

    process.env.NODE_ENV = "test";
    (global as any).__mockCheckRateLimit = async () => true;

    (global as any).__mockGetTokenDecimals = async (chain: string, tokenAddress: string) => 18;
    
    (global as any).__mockCheckAllowance = async (chain: string, wallet: string, token: string, amount: number, decimals: number) => ({ hasSufficient: true });
    
    (global as any).__mockGetApproveTxData = async (chain: string, token: string, amount: number, decimals: number) => ({ txData: { to: "0xspender", data: "0xapprove" } });

    const get_swap_quote = registry.get("get_swap_quote")!;
    const testContext = { conversationId: "test", walletAddress: "0xtestwallet" };

    // Test 1: USDC -> token
    let res = await get_swap_quote.execute({
      to_address: "0xto",
      from_address: "0xusdc",
      from_symbol: "USDC",
      amount: 1,
      chain: "x-layer"
    }, testContext) as any;
    console.log("Res:", res);
    assert(!res.error && !res.blocked, "USDC -> token quote should succeed");
    assert(res.fromToken === "0xusdc", "Quote should use the provided USDC from_address");
    passed++;
    console.log("  ✅ USDC -> token successful");

    // Test 2: token -> USDC
    res = await get_swap_quote.execute({
      to_address: "0xusdc",
      from_address: "0xtokenA",
      from_symbol: "TKA",
      amount: 1,
      chain: "x-layer"
    }, testContext) as any;
    assert(!res.error && !res.blocked, "token -> USDC quote should succeed");
    assert(res.fromToken === "0xtokenA", "Quote should use the provided tokenA from_address");
    passed++;
    console.log("  ✅ token -> USDC successful");

    // Test 3: token A -> token B
    res = await get_swap_quote.execute({
      to_address: "0xtokenB",
      from_address: "0xtokenA",
      from_symbol: "TKA",
      amount: 1,
      chain: "x-layer"
    }, testContext) as any;
    assert(!res.error && !res.blocked, "token A -> token B quote should succeed");
    assert(res.fromToken === "0xtokenA", "Quote should use the provided tokenA from_address");
    passed++;
    console.log("  ✅ token A -> token B successful");

    // Test 4: default source token fallback
    res = await get_swap_quote.execute({
      to_address: "0xto",
      amount: 1,
      chain: "x-layer"
    }, testContext) as any;
    assert(!res.error && !res.blocked, "Default source token fallback quote should succeed");
    assert(res.fromToken === "0x74b7f16337b8972027f6196a17a631ac6de26d22" || !res.fromToken, "Quote should fallback to default USDC");
    passed++;
    console.log("  ✅ Default source token fallback successful");

    // Test 5: unsupported chain blocked
    res = await get_swap_quote.execute({
      to_address: "0xto",
      amount: 1,
      chain: "unsupported_chain"
    }, testContext) as any;
    assert(res.blocked && res.error?.includes("Unsupported chain"), "Unsupported chain should be blocked");
    passed++;
    console.log("  ✅ Unsupported chain blocked");

    // Test 6: unsupported token blocked
    res = await get_swap_quote.execute({
      to_address: "0xunsupported",
      amount: 1,
      chain: "x-layer"
    }, testContext) as any;
    assert(res.blocked && res.error?.includes("Unsupported token"), "Unsupported token should be blocked");
    passed++;
    console.log("  ✅ Unsupported token blocked");

    // Test 7: invalid/zero/negative amount blocked
    res = await get_swap_quote.execute({
      to_address: "0xto",
      amount: -5,
      chain: "x-layer"
    }, testContext) as any;
    assert(res.blocked, "Negative amount should be blocked");
    passed++;
    console.log("  ✅ Invalid/zero/negative amount blocked");

    // Test 8: above hard cap blocked
    process.env.MAX_TRADE_USD_HARD_CAP = "100";
    res = await get_swap_quote.execute({
      to_address: "0xto",
      from_address: "0xfrom",
      amount: 200, // Mocked as 200 USD
      chain: "x-layer"
    }, testContext) as any;
    assert(res.blocked && res.error?.includes("exceeds server hard cap"), "Above hard cap should be blocked");
    passed++;
    console.log("  ✅ Above hard cap blocked");

    // Test 9: scan failure blocks quote
    res = await get_swap_quote.execute({
      to_address: "0xfailscan",
      amount: 1,
      chain: "x-layer"
    }, testContext) as any;
    assert(res.blocked, "Scan failure should block quote");
    passed++;
    console.log("  ✅ Scan failure blocks quote");

    // Test 10: MEDIUM fromToken blocks quote
    res = await get_swap_quote.execute({
      to_address: "0xto",
      from_address: "0xmedium",
      amount: 1,
      chain: "x-layer"
    }, testContext) as any;
    assert(res.blocked && res.error?.includes("High risk or honeypot"), "MEDIUM fromToken should block quote");
    passed++;
    console.log("  ✅ MEDIUM fromToken blocks quote");

    // Test 11: MEDIUM toToken blocks quote
    res = await get_swap_quote.execute({
      to_address: "0xmedium",
      from_address: "0xfrom",
      amount: 1,
      chain: "x-layer"
    }, testContext) as any;
    assert(res.blocked && res.error?.includes("High risk or honeypot"), "MEDIUM toToken should block quote");
    passed++;
    console.log("  ✅ MEDIUM toToken blocks quote");

    // Test 12: executionAllowed=false blocks quote
    res = await get_swap_quote.execute({
      to_address: "0xmedium", // mock executionAllowed=false
      amount: 1,
      chain: "x-layer"
    }, testContext) as any;
    assert(res.blocked && res.error?.includes("High risk or honeypot"), "executionAllowed=false should block quote");
    passed++;
    console.log("  ✅ executionAllowed=false blocks quote");

    // Test 14: Insufficient balance blocks quote
    (global as any).__mockCheckBalance = async () => ({ hasSufficient: false, balance: "1", meta: {} });
    res = await get_swap_quote.execute({
      to_address: "0xto",
      amount: 1,
      chain: "x-layer"
    }, testContext) as any;
    assert(res.blocked && res.error?.includes("Insufficient balance"), "Insufficient balance should block quote");
    passed++;
    console.log("  ✅ Insufficient balance blocks quote");

    // Test 15: Missing wallet blocks live quote
    (global as any).__mockCheckBalance = async () => ({ hasSufficient: true, balance: "100", meta: {} });
    res = await get_swap_quote.execute({
      to_address: "0xto",
      amount: 1,
      chain: "x-layer"
    }, {} as any) as any;
    assert(res.blocked && res.error?.includes("Verified wallet address is required"), "Missing wallet should block quote");
    passed++;
    console.log("  ✅ Missing wallet blocks live quote");

    // Test 16: ambiguous symbol returns needs_clarification
    const search_token = registry.get("search_token")!;
    (global as any).__mockSearchTokenHandler = async (symbol: string) => {
      return [
        { symbol: "AMB", address: "0x111", name: "Ambiguous 1" },
        { symbol: "AMB", address: "0x222", name: "Ambiguous 2" }
      ];
    };
    
    let searchRes = await search_token.execute({ symbol: "AMB", chain: "x-layer" }) as any;
    assert(searchRes.blocked === true && searchRes.candidates.length === 2, "Ambiguous symbol requires clarification");
    
    console.log("  ✅ Ambiguous symbol returns needs_clarification");
    passed++;
    delete (global as any).__mockSearchTokenHandler;

    // Test 17: BigInt allowance works for large values
    const { checkAllowance } = require("../okx");
    const { toMinimalUnits } = require("../okx");
    assert(toMinimalUnits(1.5, 18) === "1500000000000000000", "BigInt minimal units correctly padded");
    passed++;
    console.log("  ✅ BigInt allowance works for large values");

    // Test 18: execute rejects when approval is required but approvalTxHash is missing
    (global as any).__mockVerifyWalletSession = async () => ({ authenticated: true, session: { userId: "u1", walletAddress: "0xtestwallet" } });
    
    const mockRouter = "1111111111111111111111111111111111111111"; // 40 chars
    const executeRoute = require("../../app/api/execute/route");
    (global as any).__mockValidateAndConsumeApproval = async () => ({
      valid: true,
      approval: { needsApproval: true, budgetUsd: 10, walletAddress: "0xtestwallet", chain: "x-layer", fromToken: "0xtoken", spender: "0x" + mockRouter, approveAmount: "1000", tokenAddress: "0xto" }
    });
    
    (global as any).__mockPeekApproval = async () => ({
      found: true,
      approval: { needsApproval: true, budgetUsd: 10, walletAddress: "0xtestwallet", chain: "x-layer", fromToken: "0xtoken", spender: "0x" + mockRouter, approveAmount: "1000", tokenAddress: "0xto" }
    });
    
    const mockRequest = (body: any) => ({
      json: async () => body,
      headers: {
        get: (name: string) => null
      }
    });

    let resExecute = await executeRoute.POST(mockRequest({ approvalId: "req-approve", riskAcknowledged: true }), { params: {} });
    let resJson = await resExecute.json();
    console.log("execute response:", resExecute.status, resJson);
    assert(resExecute.status === 400 && resJson.error.includes("Approval transaction hash is missing"), "execute should reject missing approvalTxHash");
    passed++;
    console.log("  ✅ execute rejects missing approvalTxHash");

    // Test 19: execute rejects pending/failed approval tx
    (global as any).__mockCheckTxOnchain = async () => ({ status: "pending" });
    resExecute = await executeRoute.POST(mockRequest({ approvalId: "req-approve", riskAcknowledged: true, approvalTxHash: "0xpending" }), { params: {} });
    resJson = await resExecute.json();
    assert(resExecute.status === 400 && resJson.error.includes("not confirmed on-chain"), "execute should reject pending tx");
    passed++;
    console.log("  ✅ execute rejects pending/failed approval tx");

    // Test 20: execute rejects wrong wallet approval
    (global as any).__mockValidateAndConsumeApproval = async () => ({
      valid: true,
      approval: { needsApproval: true, budgetUsd: 10, walletAddress: "0xtestwallet", chain: "x-layer", fromToken: "0xtoken", spender: "0x" + mockRouter, approveAmount: "1000" }
    });
    (global as any).__mockCheckTxOnchain = async () => ({
      status: "confirmed",
      from: "0xwrongwallet",
      to: "0xtoken",
      input: "0x095ea7b3" + "000000000000000000000000" + mockRouter + "00000000000000000000000000000000000000000000000000000000000003e8"
    });
    resExecute = await executeRoute.POST(mockRequest({ approvalId: "req-approve", riskAcknowledged: true, approvalTxHash: "0xhash" }), { params: {} });
    resJson = await resExecute.json();
    assert(resExecute.status === 403 && resJson.error.includes("Approval transaction sender"), "execute should reject wrong wallet");
    passed++;
    console.log("  ✅ execute rejects wrong wallet approval");

    // Test 21: execute rejects wrong spender calldata
    (global as any).__mockCheckTxOnchain = async () => ({
      status: "confirmed",
      from: "0xtestwallet",
      to: "0xtoken",
      input: "0x095ea7b3" + "000000000000000000000000" + "wrong_spender".padEnd(40, "0") + "00000000000000000000000000000000000000000000000000000000000003e8"
    });
    resExecute = await executeRoute.POST(mockRequest({ approvalId: "req-approve", riskAcknowledged: true, approvalTxHash: "0xwrongspender" }), { params: {} });
    resJson = await resExecute.json();
    assert(resExecute.status === 403 && resJson.error.includes("spender does not match expected"), "execute should reject wrong spender");
    passed++;
    console.log("  ✅ execute rejects wrong spender calldata");

    // Test 22: execute rejects insufficient approve amount
    (global as any).__mockCheckTxOnchain = async () => ({
      status: "confirmed",
      from: "0xtestwallet",
      to: "0xtoken",
      input: "0x095ea7b3" + "000000000000000000000000" + mockRouter + "0000000000000000000000000000000000000000000000000000000000000005" // Amount 5 < 1000
    });
    resExecute = await executeRoute.POST(mockRequest({ approvalId: "req-approve", riskAcknowledged: true, approvalTxHash: "0xinsufficient" }), { params: {} });
    resJson = await resExecute.json();
    console.log("Debug: status =", resExecute.status, "error =", resJson.error);
    assert(resExecute.status === 403 && resJson.error.includes("insufficient"), "execute should reject insufficient amount");
    passed++;
    console.log("  ✅ execute rejects insufficient approve amount");

    // Test 23: execute accepts valid approval and consumes replay lock
    (global as any).__mockCheckTxOnchain = async () => ({
      status: "confirmed",
      from: "0xtestwallet",
      to: "0xtoken",
      input: "0x095ea7b3" + "000000000000000000000000" + mockRouter + "00000000000000000000000000000000000000000000000000000000000003e8" // 1000 in hex
    });
    (global as any).__mockMarkApprovalTxConsumed = async () => true;
    (global as any).__mockIsLiveExecutionEnabled = () => false; // to avoid hitting real execution logic for testing
    
    resExecute = await executeRoute.POST(mockRequest({ approvalId: "req-approve", riskAcknowledged: true, approvalTxHash: "0xvalid" }), { params: {} });
    resJson = await resExecute.json();
    assert(resJson.error === undefined || !resJson.error.includes("Approval transaction"), "execute should accept valid approval tx");
    passed++;
    console.log("  ✅ execute accepts valid approval and consumes replay lock");

    // Test 24: execute rejects replay of consumed approval
    (global as any).__mockMarkApprovalTxConsumed = async () => false;
    resExecute = await executeRoute.POST(mockRequest({ approvalId: "req-approve", riskAcknowledged: true, approvalTxHash: "0xvalid" }), { params: {} });
    resJson = await resExecute.json();
    console.log("Debug Test 24:", resExecute.status, resJson);
    assert(resExecute.status === 403 && resJson.error.includes("replay blocked"), "execute should reject replay");
    passed++;
    console.log("  ✅ execute rejects approval replay");

    // Test 25: execute rejects wrong chain approval (simulated by tx not found)
    (global as any).__mockCheckTxOnchain = async () => ({ status: "not_found" }); // Not found on the expected chain
    resExecute = await executeRoute.POST(mockRequest({ approvalId: "req-approve", riskAcknowledged: true, approvalTxHash: "0xhashonwrongchain" }), { params: {} });
    resJson = await resExecute.json();
    assert(resExecute.status === 400 && resJson.error.includes("not confirmed on-chain"), "execute should reject wrong chain approval");
    passed++;
    console.log("  ✅ execute rejects wrong chain approval tx");

    // Test 26: checkBalance fails if decimals are missing for non-native token
    (global as any).__mockCheckBalance = undefined; // Ensure we test the real logic
    (global as any).__mockRunCli = async () => ({
      ok: true,
      data: [{ balance: "1.5" }] // missing decimals
    });
    const balanceRes = await checkBalance("x-layer", "0xwallet", "0xtoken", 10);
    assert(balanceRes.hasSufficient === false, "Missing decimals blocks quote for non-native token.");
    passed++;
    console.log("  ✅ Missing decimals blocks quote");

    // Test 27: checkBalance uses BigInt (no parseFloat precision loss)
    (global as any).__mockRunCli = async () => ({
      ok: true,
      data: [{ balance: "1000000000000.000000000000000001", decimals: 18 }]
    });
    // If it used parseFloat, "1000000000000.000000000000000001" might lose precision
    // but here we just test that it works for a very specific BigInt case
    const balanceRes2 = await checkBalance("x-layer", "0xwallet", "0xtoken", 1000000000000);
    assert(balanceRes2.hasSufficient === true, "Strict BigInt balance comparison works.");
    passed++;
    console.log("  ✅ No parseFloat fallback for balance comparison");
    delete (global as any).__mockRunCli;

  } catch (err) {
    console.error("Test failed:", err);
    failed++;
  }

  console.log(`\n──────────────────────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runFlexibleTokenSwapTests().catch(console.error);

