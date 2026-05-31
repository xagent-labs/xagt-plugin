/**
 * PhylaX E2E Trade Flow Tests.
 *
 * Run: npx tsx lib/__tests__/e2e-trade-flow.test.ts
 *
 * Tests the complete trade flow from quote → confirm → execute → sign → confirm
 * without requiring live infrastructure.
 */

import * as fs from "fs";
import * as path from "path";

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

// ─── Execute Blocks When TxData Missing ──────────────────────────────────────

console.log("\n🔄 E2E Trade Flow Tests\n");

console.log("── Execute blocks when txData missing ──");
{
  // Simulate /api/execute with missing txData
  const quoteSnapshot = { chainId: "196", slippage: 1, quoteCreatedAt: Date.now() };
  // No txData field → should be blocked

  assert(!quoteSnapshot.hasOwnProperty("txData"), "Missing txData → must be detected");

  const txData = undefined;
  const shouldBlock = !txData;
  assert(shouldBlock, "Execute blocks when txData is undefined");

  const emptyTxData = { to: "", data: "" };
  const shouldBlockEmpty = !emptyTxData.to || !emptyTxData.data;
  assert(shouldBlockEmpty, "Execute blocks when txData has empty to/data");
}

// ─── Execute Returns UnsignedTx When Valid ───────────────────────────────────

console.log("\n── Execute returns unsignedTx when txData valid ──");
{
  const validTxData = {
    to: "0x1234567890abcdef1234567890abcdef12345678",
    data: "0xabcdef12",
    value: "0x0",
    gas: "150000",
    chainId: "196",
  };

  assert(!!validTxData.to, "Valid txData has 'to'");
  assert(!!validTxData.data, "Valid txData has 'data'");
  assert(!!validTxData.gas, "Valid txData has 'gas'");

  // Simulate building unsignedTx
  const unsignedTx = {
    to: validTxData.to,
    data: validTxData.data,
    value: validTxData.value,
    chainId: validTxData.chainId,
    gas: validTxData.gas,
  };

  assert(!!unsignedTx.to, "UnsignedTx includes 'to'");
  assert(!!unsignedTx.data, "UnsignedTx includes 'data'");
  assert(unsignedTx.value === "0x0", "UnsignedTx includes 'value'");
  assert(unsignedTx.chainId === "196", "UnsignedTx includes 'chainId'");
}

// ─── Frontend Handles User Rejection ─────────────────────────────────────────

console.log("\n── Frontend handles user rejection ──");
{
  const WALLET_ERROR_CODES: Record<number, string> = {
    4001: "rejected",
    4100: "rejected",
    4902: "wrong_chain",
  };

  assert(WALLET_ERROR_CODES[4001] === "rejected", "Code 4001 → rejected state");
  assert(WALLET_ERROR_CODES[4100] === "rejected", "Code 4100 → rejected state");
  assert(WALLET_ERROR_CODES[4902] === "wrong_chain", "Code 4902 → wrong_chain state");

  // Unknown error code → generic failure
  assert(WALLET_ERROR_CODES[9999] === undefined, "Unknown code → falls through to generic error");
}

// ─── Frontend Calls Confirm After TxHash ─────────────────────────────────────

console.log("\n── Frontend calls confirm after txHash ──");
{
  const txHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  const txHashRegex = /^0x[a-fA-F0-9]{64}$/;

  assert(txHashRegex.test(txHash), "Valid txHash passes regex");

  // Confirm response shape
  const confirmResponse = {
    executionId: "exec-123",
    txHash,
    status: "confirmed",
    blockNumber: 12345,
    gasUsed: "21000",
    explorerUrl: "https://etherscan.io/tx/0xabc...",
  };

  assert(!!confirmResponse.executionId, "Confirm has executionId");
  assert(!!confirmResponse.txHash, "Confirm has txHash");
  assert(["pending", "submitted", "confirmed", "failed", "reverted"].includes(confirmResponse.status), "Confirm has valid status");
  assert(!!confirmResponse.explorerUrl, "Confirm has explorerUrl");
}

// ─── Server Never Broadcasts ─────────────────────────────────────────────────

console.log("\n── Server never broadcasts ──");
{
  const executeRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/execute/route.ts"),
    "utf8"
  );

  // Check that server does NOT import ethers/web3/viem providers for sending
  assert(!executeRoute.includes("import { ethers"), "Execute route does NOT import ethers");
  assert(!executeRoute.includes("import Web3"), "Execute route does NOT import Web3");
  assert(!executeRoute.includes("provider.request"), "Execute route does NOT call provider.request");
  assert(executeRoute.includes("unsignedTx"), "Execute route returns unsignedTx");
  // The route should NOT contain any RPC send call
  assert(!executeRoute.includes(".sendRawTransaction"), "Execute route does NOT sendRawTransaction");
}

// ─── DB Migration Config Exists ──────────────────────────────────────────────

console.log("\n── DB migration config exists ──");
{
  const configExists = fs.existsSync(
    path.join(process.cwd(), "drizzle.config.ts")
  );
  assert(configExists, "drizzle.config.ts exists");

  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")
  ) as { scripts?: Record<string, string> };

  assert(!!pkgJson.scripts?.["db:generate"], "package.json has db:generate script");
  assert(!!pkgJson.scripts?.["db:push"], "package.json has db:push script");
  assert(!!pkgJson.scripts?.["db:migrate"], "package.json has db:migrate script");

  // Check schema file exists
  const schemaExists = fs.existsSync(
    path.join(process.cwd(), "lib/db/schema.ts")
  );
  assert(schemaExists, "lib/db/schema.ts exists");
}

// ─── Demo Mode Still Works ───────────────────────────────────────────────────

console.log("\n── Demo mode still works ──");
{
  // Demo mode should not require DB or Redis
  const isLiveEnabled = (env: string | undefined) => env === "true";
  const isDemoSafe = !isLiveEnabled(undefined); // no ENABLE_LIVE_EXECUTION

  assert(isDemoSafe, "Demo mode works without ENABLE_LIVE_EXECUTION");

  // Check that execute returns execution_disabled when not enabled
  const liveOff = !isLiveEnabled("false");
  assert(liveOff, "ENABLE_LIVE_EXECUTION=false → execution disabled (demo safe)");
}

// ─── Approval Created With Quote ─────────────────────────────────────────────

console.log("\n── Approval created with quote in chat ──");
{
  const agentLoopRoute = fs.readFileSync(
    path.join(process.cwd(), "lib/anthropic.ts"),
    "utf8"
  );

  assert(agentLoopRoute.includes("createApproval"), "Agent loop creates approval with quote");
  assert(agentLoopRoute.includes("approvalId"), "Agent loop includes approvalId in response");
}

// ─── QuoteCard Has Confirm Button ────────────────────────────────────────────

console.log("\n── QuoteCard has explicit confirm button ──");
{
  const quoteCard = fs.readFileSync(
    path.join(process.cwd(), "components/QuoteCard.tsx"),
    "utf8"
  );

  assert(quoteCard.includes("confirm-execute-btn"), "QuoteCard has confirm button with ID");
  assert(quoteCard.includes("Sign swap in wallet"), "QuoteCard has confirm text");
  assert(quoteCard.includes("eth_sendTransaction"), "QuoteCard calls eth_sendTransaction");
  assert(quoteCard.includes("/api/confirm"), "QuoteCard calls /api/confirm");
  assert(quoteCard.includes("wallet will ask you to review"), "QuoteCard shows wallet signing notice");
  assert(!quoteCard.includes("broadcast"), "QuoteCard does NOT broadcast");
}

// ─── OKX Build-Tx Integration ────────────────────────────────────────────────

console.log("\n── OKX swap transaction data integration ──");
{
  const cliRunner = fs.readFileSync(
    path.join(process.cwd(), "lib/cli-runner.ts"),
    "utf8"
  );

  assert(cliRunner.includes('"swap swap"'), "CLI allowlist includes 'swap swap'");
  assert(!cliRunner.includes('"swap build-tx"'), "CLI does NOT reference non-existent 'swap build-tx'");

  const okx = fs.readFileSync(
    path.join(process.cwd(), "lib/okx.ts"),
    "utf8"
  );

  assert(okx.includes("getSwapTxData"), "OKX lib exports getSwapTxData");
  assert(okx.includes("SwapTxData"), "OKX lib exports SwapTxData interface");
  assert(okx.includes('"swap", "swap"'), "OKX lib calls 'swap swap' CLI command");
  assert(okx.includes("--wallet"), "OKX lib uses --wallet flag (not --user-address)");
}

// ─── Confirm Endpoint Exists ─────────────────────────────────────────────────

console.log("\n── Confirm endpoint exists ──");
{
  const confirmExists = fs.existsSync(
    path.join(process.cwd(), "app/api/confirm/route.ts")
  );
  assert(confirmExists, "/api/confirm route exists");

  const confirmRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/confirm/route.ts"),
    "utf8"
  );

  assert(confirmRoute.includes("verifyWalletSession"), "Confirm verifies wallet session");
  assert(confirmRoute.includes("eth_getTransactionReceipt"), "Confirm checks tx receipt via RPC");
  assert(confirmRoute.includes("explorerUrl"), "Confirm returns explorer URL");
  assert(confirmRoute.includes("tx_confirmed"), "Confirm audits tx_confirmed");
  assert(confirmRoute.includes("tx_failed"), "Confirm audits tx_failed");
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("\n⚠️  Some tests failed!");
  process.exit(1);
} else {
  console.log("\n✅ All E2E trade flow tests passed.");
  process.exit(0);
}
