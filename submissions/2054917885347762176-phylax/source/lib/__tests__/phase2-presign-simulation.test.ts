/**
 * PhylaX Phase 2 — Real Pre-Sign Transaction Simulation Tests
 *
 * Tests (tsx-runnable, pure source inspection + lib unit tests — no Next.js route import):
 *  1.  simulateTransaction wrapper exists and is exported from lib/okx.ts
 *  2.  simulateTransaction uses --amount (NOT --value) CLI flag
 *  3.  registry.ts simulate_transaction tool uses --amount (NOT --value)
 *  4.  /api/simulate route imports and calls simulateTransaction
 *  5.  /api/simulate route gates approvalId on simulationResult
 *  6.  /api/simulate route emits simulation_blocked audit event
 *  7.  /api/simulate route returns preSignSimulation in 200 branch
 *  8.  /api/simulate route returns simulationResult in 403 branch
 *  9.  /api/simulate still enforces X Layer only (source check)
 * 10.  /api/simulate still scans token before simulation (source check)
 * 11.  /api/execute still has risk re-check wired (regression guard)
 * 12.  simulateTransaction mock hook respected
 * 13.  simulateTransaction normalises hex value to decimal for CLI
 * 14.  simulateTransaction fail-closed on OkxRealModeError
 * 15.  audit.ts includes simulation_blocked event type
 */

import { readFileSync } from "fs";
import * as path from "path";

// We test the lib function directly — no next/server dependency needed
import { simulateTransaction } from "../../lib/okx";

// ─── Assertion helpers ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}`); failed++; }
}

// ─── Source helpers ───────────────────────────────────────────────────────────

const cwd = process.cwd();
const read = (relPath: string) => readFileSync(path.join(cwd, relPath), "utf-8");

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log("\n🛡️  Phase 2 — Real Pre-Sign Transaction Simulation Tests\n");

  // ── 1. simulateTransaction exported from lib/okx.ts ──────────────────────
  console.log("── 1. simulateTransaction exported from lib/okx.ts ──");
  {
    assert(typeof simulateTransaction === "function", "simulateTransaction is a function");
  }

  // ── 2. simulateTransaction uses --amount (not --value) ───────────────────
  console.log("\n── 2. simulateTransaction CLI flag is --amount (not --value) ──");
  {
    const src = read("lib/okx.ts");
    assert(src.includes('"--amount", amountStr'), 'lib/okx.ts uses "--amount", amountStr');
    assert(!src.includes('"--value", value'), 'lib/okx.ts does NOT use "--value", value');
  }

  // ── 3. registry.ts simulate_transaction uses --amount ─────────────────────
  console.log("\n── 3. registry.ts simulate_transaction uses --amount ──");
  {
    const src = read("lib/tools/registry.ts");
    assert(src.includes('args.push("--amount", input.value)'), 'registry.ts uses "--amount"');
    assert(!src.includes('args.push("--value", input.value)'), 'registry.ts does NOT use "--value"');
  }

  // ── 4. /api/simulate imports simulateTransaction ──────────────────────────
  console.log("\n── 4. /api/simulate route imports simulateTransaction ──");
  {
    const src = read("app/api/simulate/route.ts");
    assert(src.includes("simulateTransaction"), "route references simulateTransaction");
    assert(
      src.includes("import { simulateSwap") && src.includes("simulateTransaction"),
      "route imports both simulateSwap and simulateTransaction from okx"
    );
  }

  // ── 5. /api/simulate gates approvalId on simulationResult ─────────────────
  console.log("\n── 5. /api/simulate gates approvalId creation on simulation result ──");
  {
    const src = read("app/api/simulate/route.ts");
    // The gate must come BEFORE createApproval is called
    const gatePos  = src.indexOf("if (!simulationResult.ok || simulationResult.reverted)");
    const approvalPos = src.indexOf("const approvalId = await createApproval");
    assert(gatePos !== -1, "simulation gate present in route");
    assert(approvalPos !== -1, "createApproval call present in route");
    assert(gatePos < approvalPos, "simulation gate comes BEFORE createApproval (approval gated)");
  }

  // ── 6. /api/simulate emits simulation_blocked audit ──────────────────────
  console.log("\n── 6. /api/simulate emits simulation_blocked audit event ──");
  {
    const src = read("app/api/simulate/route.ts");
    assert(src.includes('"simulation_blocked"'), 'route emits "simulation_blocked" audit event');
    assert(src.includes("await audit("), "route awaits audit call");
  }

  // ── 7. /api/simulate returns preSignSimulation in 200 branch ─────────────
  console.log("\n── 7. /api/simulate returns preSignSimulation in 200 response ──");
  {
    const src = read("app/api/simulate/route.ts");
    assert(src.includes("preSignSimulation:"), "route includes preSignSimulation field in 200 response");
    assert(src.includes("ok: true"), "200 branch sets preSignSimulation.ok: true");
  }

  // ── 8. /api/simulate returns simulationResult in 403 branch ──────────────
  console.log("\n── 8. /api/simulate returns simulationResult block in 403 response ──");
  {
    const src = read("app/api/simulate/route.ts");
    assert(src.includes("simulationResult:"), "route includes simulationResult field in 403 response");
    assert(src.includes("status: 403"), "route returns 403 on simulation block");
    // The 403 must NOT include approvalId
    const block403 = src.substring(src.indexOf("if (!simulationResult.ok"), src.indexOf("// ── Allowance check"));
    assert(!block403.includes("approvalId"), "403 branch does NOT set approvalId");
  }

  // ── 9. /api/simulate still enforces X Layer only ─────────────────────────
  console.log("\n── 9. /api/simulate enforces X Layer only ──");
  {
    const src = read("app/api/simulate/route.ts");
    assert(src.includes('chainConfig.id !== "x-layer"'), "route rejects non-X-Layer chains");
    assert(src.includes("X Layer only"), "route error message references X Layer");
  }

  // ── 10. /api/simulate scans token before simulation ───────────────────────
  console.log("\n── 10. /api/simulate scans token BEFORE simulation ──");
  {
    const src = read("app/api/simulate/route.ts");
    const scanPos   = src.indexOf("scanToken(address");
    const simPos    = src.indexOf("simulateTransaction({");
    assert(scanPos !== -1, "scanToken call present in route");
    assert(simPos !== -1, "simulateTransaction call present in route");
    assert(scanPos < simPos, "scanToken is called BEFORE simulateTransaction");
  }

  // ── 11. /api/execute still has risk re-check (regression) ────────────────
  console.log("\n── 11. Execute-time risk re-check still wired in /api/execute ──");
  {
    const src = read("app/api/execute/route.ts");
    assert(src.includes("scanToken"), "execute route still calls scanToken re-check");
    assert(
      src.includes("Execution blocked because token risk changed"),
      "execute route still has canonical risk-change message"
    );
  }

  // ── 12. simulateTransaction respects mock hook ────────────────────────────
  console.log("\n── 12. simulateTransaction respects __mockSimulateTransaction hook ──");
  {
    const mockResult = {
      ok: true, reverted: false, gasUsed: "99000",
      meta: { source: "okx_real" as const, provider: "OKX Onchain OS", chainIndex: "196", chainName: "X Layer", chainSlug: "xlayer", timestamp: new Date().toISOString() },
    };
    (global as any).__mockSimulateTransaction = async () => mockResult;

    const result = await simulateTransaction({ from: "0xabc", to: "0xdef", data: "0x1234", chain: "x-layer" });
    assert(result.ok === true, "mock hook returns ok=true");
    assert(result.gasUsed === "99000", "mock hook returns correct gasUsed");

    delete (global as any).__mockSimulateTransaction;
  }

  // ── 13. simulateTransaction hex value converted to decimal ───────────────
  console.log("\n── 13. simulateTransaction normalises hex value to decimal for CLI ──");
  {
    const src = read("lib/okx.ts");
    assert(src.includes("BigInt(amountStr).toString(10)"), "hex-to-decimal conversion present");
    assert(src.includes('startsWith("0x") || amountStr.startsWith("0X")'), "hex prefix detection present");
  }

  // ── 14. simulateTransaction fail-closed on errors ────────────────────────
  console.log("\n── 14. simulateTransaction fail-closed on OkxRealModeError / OkxCliError ──");
  {
    const src = read("lib/okx.ts");
    assert(src.includes("Simulation CLI error:"), "simulateTransaction wraps errors with CLI error prefix");
    // The catch returns ok:false, reverted:true
    const catchBlock = src.substring(
      src.lastIndexOf("} catch (err) {", src.indexOf("SimulateTransactionResult") + 500),
      src.indexOf("// ---------------------------------------------------------------------------\n// 5. Swap build-tx")
    );
    assert(catchBlock.includes("ok: false"), "catch block returns ok: false");
    assert(catchBlock.includes("reverted: true"), "catch block returns reverted: true");
  }

  // ── 15. audit.ts includes simulation_blocked ──────────────────────────────
  console.log("\n── 15. audit.ts AuditEvent union includes simulation_blocked ──");
  {
    const src = read("lib/audit.ts");
    assert(src.includes('"simulation_blocked"'), 'audit.ts has "simulation_blocked" event type');
  }

  // ─── Results ──────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(55)}`);
  console.log(`Phase 2 Pre-Sign Simulation: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
