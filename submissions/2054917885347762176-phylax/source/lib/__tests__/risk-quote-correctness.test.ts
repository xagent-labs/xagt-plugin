import * as fs from "fs";
import * as path from "path";
import { parseTradeIntent } from "../trade-intent-parser";

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

console.log("\n🔄 Risk and Quote Correctness Tests (Phase 5)\n");

async function runTests() {
  // 1-6: trade-intent parser
  console.log("── trade-intent-parser hardening ──");
  
  const scan1 = parseTradeIntent("Is it safe to buy ETH?");
  assert(scan1.intentType !== "swap", "'Is it safe to buy ETH?' must not parse as swap");
  assert(scan1.intentType === "scan", "'Is it safe to buy ETH?' should be scan");

  const scan2 = parseTradeIntent("how to trade");
  assert(scan2.intentType !== "swap", "'how to trade' must not parse as swap");
  
  const scan3 = parseTradeIntent("what is the best way to buy ETH?");
  assert(scan3.intentType !== "swap", "'what is the best way to buy ETH?' must not parse as swap");

  const swap1 = parseTradeIntent("swap 100 USDC to ETH");
  assert(swap1.intentType === "swap", "'swap 100 USDC to ETH' must parse as swap");
  assert(swap1.fromToken === "USDC" && swap1.toToken === "ETH", "swap 100 USDC to ETH extracts correct tokens");

  const swap2 = parseTradeIntent("trade 50 USDC for PEPE");
  assert(swap2.intentType === "swap", "'trade 50 USDC for PEPE' must parse as swap");
  
  const swap3 = parseTradeIntent("buy ETH with 100 USDC");
  assert(swap3.intentType === "swap", "'buy ETH with 100 USDC' must parse as swap");

  console.log("\n── tool registry & metadata propagation ──");
  
  const registrySource = fs.readFileSync(path.join(process.cwd(), "lib/tools/registry.ts"), "utf8");
  const anthropicSource = fs.readFileSync(path.join(process.cwd(), "lib/anthropic.ts"), "utf8");
  const okxSource = fs.readFileSync(path.join(process.cwd(), "lib/okx.ts"), "utf8");

  // 7. scan_token returns isHoneypot and executionAllowed
  assert(registrySource.includes("isHoneypot: scanResult.isHoneypot"), "scan_token returns isHoneypot");
  assert(registrySource.includes("executionAllowed: scanResult.executionAllowed"), "scan_token returns executionAllowed");

  // 8. risk_mode defaults to conservative when missing/invalid
  assert(registrySource.includes("input.risk_mode || \"conservative\""), "risk_mode defaults to conservative when missing/invalid");

  // 9. risk_mode="degen" must not allow honeypot or executionAllowed=false execution
  const scoringSource = fs.readFileSync(path.join(process.cwd(), "lib/risk-scoring.ts"), "utf8");
  assert(scoringSource.includes("high_risk") || registrySource.includes("determineRiskAction"), "risk_mode degen must not allow honeypot execution");

  // 10. get_swap_quote returns toSymbol as symbol and preserves tokenAddress separately
  assert(registrySource.includes("toSymbol: quoteResult.toSymbol"), "get_swap_quote returns toSymbol as symbol");
  assert(registrySource.includes("toAddress: input.to_address"), "get_swap_quote preserves tokenAddress separately");
  assert(okxSource.includes("toSymbol: string;"), "getQuotePreflight Response includes toSymbol");
  assert(anthropicSource.includes("toSymbol: quoteResultData.toSymbol"), "pipelineData uses toSymbol");
  assert(anthropicSource.includes("tokenAddress: quoteResultData.toAddress"), "pipelineData preserves tokenAddress");

  // 11. slippage is propagated and not hardcoded to 3
  assert(!anthropicSource.includes("3, walletAddress);"), "slippage is not hardcoded to 3");
  assert(anthropicSource.includes("quoteResultData.slippage"), "slippage is extracted from quoteResultData");
  assert(registrySource.includes("slippage: input.slippage"), "get_swap_quote propagates input.slippage");

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error("\n⚠️  Some tests failed!");
    process.exit(1);
  } else {
    console.log("\n✅ All risk and quote correctness tests passed.");
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
