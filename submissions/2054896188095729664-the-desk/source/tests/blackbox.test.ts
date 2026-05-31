import test from "node:test";
import assert from "node:assert/strict";
import { makeEvent, validateExecutionGate, verifyEventChain } from "../src/blackbox-core.js";
import type { BlackBoxEvent, BlackBoxPolicy } from "../src/types.js";

const policy: BlackBoxPolicy = {
  maxPositionPct: 5,
  maxSlippageBps: 100,
  allowedChains: ["X Layer", "Solana"],
  signingMode: "simulated",
  executionMode: "fixture",
  realFundsCapUsd: 50,
  requiresUserConfirmation: true,
  requiresTraceIntegrity: true,
  requiredEventsBeforeExecution: [
    "candidate.created",
    "risk.security_check",
    "risk.verdict",
    "allocation.sized",
    "route.quoted",
    "quote.simulation",
    "user.confirmed",
  ],
};

test("blocks execution when risk verdict is missing", () => {
  const events = chain([candidate, securityCheck, allocation, quote, quoteSimulation, confirmation]);
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /missing required event: risk\.verdict/);
});

test("blocks execution when risk vetoes", () => {
  const events = chain([candidate, securityCheck, veto, allocation, quote, quoteSimulation, confirmation]);
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /risk veto is final/);
});

test("blocks execution when veto is followed by approval", () => {
  const events = chain([candidate, securityCheck, veto, approval, allocation, quote, quoteSimulation, confirmation]);
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /risk veto is final/);
});

test("blocks execution when allocation exceeds max position", () => {
  const events = chain([candidate, securityCheck, approval, allocationWith({ sizeUsd: 200 }), quote, quoteSimulation, confirmation]);
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /exceeds max position/);
});

test("blocks execution when confirmation is missing", () => {
  const events = chain([candidate, securityCheck, approval, allocation, quote, quoteSimulation]);
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /missing user confirmation/);
});

test("blocks execution when quote exceeds slippage policy", () => {
  const events = chain([candidate, securityCheck, approval, allocation, quoteWith({ slippageBps: 250 }), quoteSimulation, confirmation]);
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /quote slippage 250 bps exceeds policy 100 bps/);
});

test("blocks execution when quote uses a disallowed chain", () => {
  const events = chain([candidate, securityCheck, approval, allocation, quoteWith({ chain: "Arbitrum" }), quoteSimulation, confirmation]);
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /route chain Arbitrum is not allowed/);
});

test("blocks mainnet-capped execution above the real-funds cap", () => {
  const events = chain([candidate, securityCheck, approval, allocationWith({ sizeUsd: 60, bookValueUsd: 2500 }), quote, quoteSimulation, confirmation]);
  const result = validateExecutionGate("ticket", events, { ...policy, executionMode: "mainnet-capped" });
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /exceeds real-funds cap 50 USD/);
});

test("allows execution when required trace is complete", () => {
  const events = chain([candidate, securityCheck, approval, allocation, quote, quoteSimulation, confirmation]);
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, true);
  assert.deepEqual(result.errors, []);
});

test("blocks execution when execution appears before confirmation", () => {
  const events = chain([candidate, securityCheck, approval, allocation, quote, quoteSimulation, execution, confirmation]);
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /missing required event: user\.confirmed/);
});

test("blocks execution when required gate events are out of order", () => {
  const events = chain([candidate, allocation, securityCheck, approval, quote, quoteSimulation, confirmation, execution]);
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /required event allocation\.sized occurs out of order/);
});

test("returns gate error instead of throwing for malformed allocation payload", () => {
  const events = chain([candidate, securityCheck, approval, allocationWith({ sizeUsd: "50" }), quote, quoteSimulation, confirmation]);
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /allocation\.sized payload\.sizeUsd must be a finite number/);
});

test("blocks execution when trace integrity is invalid", () => {
  const events = chain([candidate, securityCheck, approval, allocation, quote, quoteSimulation, confirmation]);
  events[2] = { ...events[2], summary: "tampered allocation" };
  const result = validateExecutionGate("ticket", events, policy);
  assert.equal(result.allowed, false);
  assert.match(result.errors.join("\n"), /trace integrity invalid/);
});

test("verifies a valid event hash chain", () => {
  const events = chain([candidate, securityCheck, approval, allocation, quote, quoteSimulation, confirmation]);
  const result = verifyEventChain(events);
  assert.equal(result.valid, true);
  assert.equal(result.eventCount, 7);
  assert.ok(result.sessionHash?.startsWith("sha256:"));
});

test("detects a broken previous hash pointer", () => {
  const events = chain([candidate, securityCheck, approval, allocation, quote, quoteSimulation, confirmation]);
  events[3] = { ...events[3], prev_event_hash: "sha256:wrong" };
  const result = verifyEventChain(events);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /prev_event_hash/);
});

test("detects missing event hash", () => {
  const events = chain([candidate, approval]);
  events[1] = { ...events[1], event_hash: "" };
  const result = verifyEventChain(events);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /missing event_hash/);
});

function chain(builders: Array<(index: number, prev: string) => BlackBoxEvent>) {
  const events: BlackBoxEvent[] = [];
  let previousHash = "sha256:genesis";
  builders.forEach((builder, offset) => {
    const event = builder(offset + 1, previousHash);
    previousHash = event.event_hash;
    events.push(event);
  });
  return events;
}

function event(index: number, previousHash: string, type: BlackBoxEvent["type"], payload: Record<string, unknown>) {
  return makeEvent(index, "ticket", "Orchestrator", type, type, payload, undefined, {
    sessionId: "test_session",
    previousEventHash: previousHash,
  });
}

function candidate(index: number, previousHash: string) {
  return event(index, previousHash, "candidate.created", { symbol: "CLEAN", chain: "X Layer" });
}

function securityCheck(index: number, previousHash: string) {
  return event(index, previousHash, "risk.security_check", { verdict: "clear", responseHash: "sha256:security" });
}

function approval(index: number, previousHash: string) {
  return event(index, previousHash, "risk.verdict", { verdict: "approved", reason: "clean" });
}

function veto(index: number, previousHash: string) {
  return event(index, previousHash, "risk.verdict", { verdict: "veto", reason: "honeypot" });
}

function allocation(index: number, previousHash: string) {
  return allocationWith()(index, previousHash);
}

function allocationWith(overrides: Record<string, unknown> = {}) {
  return (index: number, previousHash: string) =>
    event(index, previousHash, "allocation.sized", { sizeUsd: 50, bookValueUsd: 2500, ...overrides });
}

function quote(index: number, previousHash: string) {
  return quoteWith()(index, previousHash);
}

function quoteWith(overrides: Record<string, unknown> = {}) {
  return (index: number, previousHash: string) =>
    event(index, previousHash, "route.quoted", { chain: "X Layer", slippageBps: 42, ...overrides });
}

function quoteSimulation(index: number, previousHash: string) {
  return event(index, previousHash, "quote.simulation", { status: "simulated-ok", resultHash: "sha256:simulation" });
}

function confirmation(index: number, previousHash: string) {
  return event(index, previousHash, "user.confirmed", { confirmed: true, capUsd: 50 });
}

function execution(index: number, previousHash: string) {
  return event(index, previousHash, "execution.signed_or_simulated", { mode: "simulated" });
}
