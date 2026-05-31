import test from "node:test";
import assert from "node:assert/strict";
import { makeEvent, validateExecutionGate } from "../src/blackbox-core.js";
import { evaluateScannerPolicyVerdict } from "../src/opportunity-scanner.js";
import type { BlackBoxEvent, BlackBoxPolicy } from "../src/types.js";

const basePolicy: BlackBoxPolicy = {
  maxPositionPct: 5,
  maxSlippageBps: 100,
  allowedChains: ["X Layer", "Solana", "Base", "Ethereum"],
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

test("scanner policy verdict matches verifier gate for 1000 boundary orders", () => {
  const random = seededRandom(0x0bb51a);
  let checked = 0;

  for (let index = 0; index < 1000; index += 1) {
    const bookValueUsd = pick(random, [100, 250, 500, 1_000, 2_500, 10_000]);
    const maxPositionPct = pick(random, [1, 2, 5, 10]);
    const maxPositionUsd = (bookValueUsd * maxPositionPct) / 100;
    const maxSlippageBps = pick(random, [25, 50, 100, 250]);
    const realFundsCapUsd = pick(random, [10, 25, 50, 100]);
    const executionMode = random() < 0.35 ? "mainnet-capped" : "fixture";
    const chain = random() < 0.85 ? pick(random, basePolicy.allowedChains) : "Arbitrum";
    const sizeUsd = nearBoundary(random, maxPositionUsd, [realFundsCapUsd]);
    const slippageBps = Math.round(nearBoundary(random, maxSlippageBps));
    const riskVerdict = random() < 0.15 ? "block" : random() < 0.25 ? "review" : "allow";
    const policy: BlackBoxPolicy = {
      ...basePolicy,
      maxPositionPct,
      maxSlippageBps,
      executionMode,
      realFundsCapUsd,
    };

    const scannerVerdict = evaluateScannerPolicyVerdict({
      policy,
      chain,
      riskVerdict,
      riskReason: riskVerdict === "block" ? "seeded high-risk boundary case" : "seeded clean boundary case",
      quoteRequired: true,
      hasExecutableQuote: true,
      allocation: {
        sizeUsd,
        bookValueUsd,
      },
      route: {
        chain,
        slippageBps,
      },
    });

    const events = orderEvents({
      chain,
      riskVerdict,
      sizeUsd,
      bookValueUsd,
      slippageBps,
      caseId: index,
    });
    const verifierVerdict = validateExecutionGate("ticket", events, policy);

    assert.equal(
      scannerVerdict.allowed,
      verifierVerdict.allowed,
      JSON.stringify({
        index,
        scanner: scannerVerdict,
        verifier: verifierVerdict,
        policy,
        order: { chain, riskVerdict, sizeUsd, bookValueUsd, slippageBps },
      }),
    );
    checked += 1;
  }

  assert.equal(checked, 1000);
});

function orderEvents(input: {
  chain: string;
  riskVerdict: "allow" | "review" | "block";
  sizeUsd: number;
  bookValueUsd: number;
  slippageBps: number;
  caseId: number;
}) {
  return chain([
    (index, prev) =>
      event(index, prev, "candidate.created", {
        symbol: "CHECK",
        chain: input.chain,
        caseId: input.caseId,
      }),
    (index, prev) =>
      event(index, prev, "risk.security_check", {
        verdict: input.riskVerdict === "block" ? "blocked" : "clear",
        responseHash: `sha256:security-${input.caseId}`,
      }),
    (index, prev) =>
      event(index, prev, "risk.verdict", {
        verdict: input.riskVerdict === "block" ? "veto" : "approved",
        reason: input.riskVerdict === "block" ? "seeded high-risk boundary case" : "seeded clean boundary case",
      }),
    (index, prev) =>
      event(index, prev, "allocation.sized", {
        sizeUsd: input.sizeUsd,
        bookValueUsd: input.bookValueUsd,
      }),
    (index, prev) =>
      event(index, prev, "route.quoted", {
        chain: input.chain,
        slippageBps: input.slippageBps,
      }),
    (index, prev) =>
      event(index, prev, "quote.simulation", {
        status: "simulated-ok",
        resultHash: `sha256:simulation-${input.caseId}`,
      }),
    (index, prev) =>
      event(index, prev, "user.confirmed", {
        confirmed: true,
        capUsd: 50,
      }),
  ]);
}

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
    sessionId: "policy_parity",
    previousEventHash: previousHash,
  });
}

function pick<T>(random: () => number, values: T[]): T {
  return values[Math.floor(random() * values.length)]!;
}

function nearBoundary(random: () => number, primary: number, extraBoundaries: number[] = []) {
  const boundary = pick(random, [primary, ...extraBoundaries]);
  const offsets = [-5, -1, -0.01, 0, 0.01, 1, 5];
  return Number(Math.max(0.01, boundary + pick(random, offsets)).toFixed(2));
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
