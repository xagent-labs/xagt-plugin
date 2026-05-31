import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { runDemoFlow } from "../src/orchestrator.js";
import { loadEvents, loadPolicy, validateExecutionGate, verifyEventChain } from "../src/blackbox-core.js";

test("demo flow creates veto path, approved path, chain anchor event, replay, and digest", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "the-desk-"));
  const policyPath = path.join(dir, "policies.json");
  fs.copyFileSync("blackbox/policies.json", policyPath);

  const result = await runDemoFlow(
    {
      eventsPath: path.join(dir, "events.jsonl"),
      policyPath,
      digestPath: path.join(dir, "digest.md"),
      replayPath: path.join(dir, "replay.md"),
    },
    true,
  );

  assert.equal(result.blockedBeforeConfirmation.allowed, false);
  assert.match(result.blockedBeforeConfirmation.errors.join("\n"), /missing required event: user\.confirmed/);
  assert.equal(result.finalGate.allowed, true);

  const events = loadEvents(path.join(dir, "events.jsonl"));
  assert.equal(verifyEventChain(events).valid, true);
  const riskyAllocations = events.filter(
    (event) => event.ticket_id === "ticket_rugcat_solana" && event.type === "allocation.sized",
  );
  assert.equal(riskyAllocations.length, 0);
  assert.ok(events.some((event) => event.type === "execution.signed_or_simulated"));
  assert.ok(events.some((event) => event.ticket_id === "ticket_clean_xlayer" && event.type === "risk.security_check"));
  assert.ok(events.some((event) => event.ticket_id === "ticket_clean_xlayer" && event.type === "quote.simulation"));
  const commitment = events.find((event) => event.type === "chain.commitment");
  assert.ok(commitment, "missing chain.commitment event");
  assert.equal(commitment.ticket_id, "ticket_clean_xlayer");
  assert.equal(commitment.payload.chainId, 1952);
  assert.equal(commitment.payload.chain, "X Layer Testnet");
  for (const execution of events.filter((event) => event.type === "execution.signed_or_simulated")) {
    const prefix = events.filter((event) => event.ticket_id === execution.ticket_id && event.timestamp < execution.timestamp);
    assert.ok(prefix.some((event) => event.type === "risk.security_check"), `${execution.ticket_id} missing risk.security_check before execution`);
    assert.ok(prefix.some((event) => event.type === "quote.simulation"), `${execution.ticket_id} missing quote.simulation before execution`);
  }
  assert.match(fs.readFileSync(path.join(dir, "replay.md"), "utf8"), /Risk Officer vetoed RUGCAT/);
  assert.match(fs.readFileSync(path.join(dir, "digest.md"), "utf8"), /Agentic Wallet Ops Center Daily Memo/);

  const gate = validateExecutionGate("ticket_clean_xlayer", events, loadPolicy(policyPath));
  assert.equal(gate.allowed, true);
});
