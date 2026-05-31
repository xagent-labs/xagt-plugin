import assert from "assert";
import { normalizeChain, SUPPORTED_CHAINS } from "../chains";
import { getQuotePreflight } from "../okx";
import { POST as ExecuteRoute } from "../../app/api/execute/route";
import { POST as ScanRoute } from "../../app/api/scan/route";
import { POST as SignalsRoute } from "../../app/api/signals/route";
import * as privyAuth from "../privy-auth";

function runTests() {
  console.log("\n🔄 Multi-chain Cleanup Tests (Phase 6)\n");

  // Mock global okx functions for quote preflight
  (global as any).__mockGetQuotePreflight = true;
  const originalRunCli = require("../cli-runner").runCli;

  console.log("── normalizeChain behavior ──");

  // 1. X Layer
  const xlayer1 = normalizeChain("xlayer");
  const xlayer2 = normalizeChain("x-layer");
  const xlayer3 = normalizeChain("196");
  assert.strictEqual(xlayer1.id, "x-layer", "normalizeChain should resolve xlayer to x-layer");
  assert.strictEqual(xlayer2.id, "x-layer", "normalizeChain should resolve x-layer to x-layer");
  assert.strictEqual(xlayer3.id, "x-layer", "normalizeChain should resolve 196 to x-layer");
  console.log("  ✅ normalizeChain accepts X Layer aliases and returns canonical config");

  // 2. Base
  const base1 = normalizeChain("base");
  const base2 = normalizeChain("8453");
  assert.strictEqual(base1.id, "base", "normalizeChain should resolve base to base");
  assert.strictEqual(base2.id, "base", "normalizeChain should resolve 8453 to base");
  console.log("  ✅ normalizeChain accepts Base aliases and returns canonical config");

  // 3. BSC
  const bsc1 = normalizeChain("bsc");
  const bsc2 = normalizeChain("binance");
  const bsc3 = normalizeChain("56");
  assert.strictEqual(bsc1.id, "bsc", "normalizeChain should resolve bsc to bsc");
  assert.strictEqual(bsc2.id, "bsc", "normalizeChain should resolve binance to bsc");
  assert.strictEqual(bsc3.id, "bsc", "normalizeChain should resolve 56 to bsc");
  console.log("  ✅ normalizeChain accepts BSC aliases and returns canonical config");

  // 4 & 5. Reject unsupported and missing chains, no silent fallback
  assert.throws(() => normalizeChain("ethereum"), /Unsupported chain: ethereum/);
  assert.throws(() => normalizeChain(undefined), /Chain input is missing/);
  console.log("  ✅ normalizeChain rejects unsupported chains");
  console.log("  ✅ Missing chain does not silently fallback to X Layer");

  // 11. Solana is recognized as a supported chain
  const solana = normalizeChain("solana");
  assert.strictEqual(solana.id, "solana", "normalizeChain should resolve solana to solana");
  console.log("  ✅ Solana is recognized as a supported chain config");

  console.log("\n── default token behavior in getQuotePreflight ──");
  
  // To mock getQuotePreflight we use the global hook
  let capturedTokens: string[] = [];
  (global as any).__mockGetQuotePreflightHandler = async (toAddress: string, amountUsd: number, chain: string, fromToken: string) => {
    capturedTokens.push(fromToken.toLowerCase());
    return { quote: { success: true } };
  };

  Promise.all([
    getQuotePreflight("0xtarget", 100, "xlayer").then(() => {
      assert.ok(capturedTokens.includes(SUPPORTED_CHAINS[0].defaultFromToken.toLowerCase()), "Should use X Layer default token");
      console.log("  ✅ getQuotePreflight uses chain-specific default token for X Layer");
    }),
    getQuotePreflight("0xtarget", 100, "base").then(() => {
      assert.ok(capturedTokens.includes(SUPPORTED_CHAINS[1].defaultFromToken.toLowerCase()), "Should use Base default token");
      console.log("  ✅ getQuotePreflight uses chain-specific default token for Base");
    }),
    getQuotePreflight("0xtarget", 100, "bsc").then(() => {
      assert.ok(capturedTokens.includes(SUPPORTED_CHAINS[2].defaultFromToken.toLowerCase()), "Should use BSC default token");
      console.log("  ✅ getQuotePreflight uses chain-specific default token for BSC");
    })
  ]).then(() => {
    delete (global as any).__mockGetQuotePreflightHandler;
    console.log("\n──────────────────────────────────────────────────");
    console.log("Results: All tests passed!");
    process.exit(0);
  }).catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
  });
}

runTests();
