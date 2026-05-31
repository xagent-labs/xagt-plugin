import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { evaluatePolicy as evaluateSharedPolicy } from "./policy/index.js";
import type { BlackBoxEvent, BlackBoxPolicy, ChainVerificationResult, EventType, ValidationResult } from "./types.js";

export const GENESIS_EVENT_HASH = "sha256:genesis";
export { loadPolicy } from "./policy/index.js";

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: unknown): string {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

export function loadEvents(eventsPath: string): BlackBoxEvent[] {
  if (!fs.existsSync(eventsPath)) {
    return [];
  }

  return fs
    .readFileSync(eventsPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as BlackBoxEvent);
}

export function writeEvents(eventsPath: string, events: BlackBoxEvent[]) {
  fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
  const body = events.map((event) => JSON.stringify(event)).join("\n");
  fs.writeFileSync(eventsPath, `${body}${body ? "\n" : ""}`);
}

export function appendEvent(eventsPath: string, event: BlackBoxEvent) {
  fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
  fs.appendFileSync(eventsPath, `${JSON.stringify(event)}\n`);
}

export interface MakeEventOptions {
  sessionId?: string;
  previousEventHash?: string;
}

export function makeEvent(
  index: number,
  ticketId: string,
  agent: BlackBoxEvent["agent"],
  type: EventType,
  summary: string,
  payload: Record<string, unknown>,
  okxSkill?: string,
  options: MakeEventOptions = {},
): BlackBoxEvent {
  const timestamp = new Date(Date.UTC(2026, 4, 15, 9, 0, index)).toISOString();
  const eventWithoutHash: Omit<BlackBoxEvent, "event_hash" | "integrity_status"> = {
    event_id: `evt_${String(index).padStart(3, "0")}`,
    session_id: options.sessionId ?? "session_demo_blackbox",
    ticket_id: ticketId,
    timestamp,
    agent,
    type,
    summary,
    input_hash: sha256({ ticketId, agent, type, payload }),
    prev_event_hash: options.previousEventHash ?? GENESIS_EVENT_HASH,
    payload,
  };
  if (okxSkill) {
    eventWithoutHash.okx_skill = okxSkill;
  }

  return {
    ...eventWithoutHash,
    event_hash: computeEventHash(eventWithoutHash),
    integrity_status: "valid",
  };
}

export function computeEventHash(event: Omit<BlackBoxEvent, "event_hash" | "integrity_status">): string;
export function computeEventHash(event: BlackBoxEvent): string;
export function computeEventHash(event: BlackBoxEvent | Omit<BlackBoxEvent, "event_hash" | "integrity_status">): string {
  const hashable = { ...event } as Record<string, unknown>;
  delete hashable.event_hash;
  delete hashable.integrity_status;
  return sha256(hashable);
}

export function verifyEventChain(events: BlackBoxEvent[]): ChainVerificationResult {
  const errors: string[] = [];
  let expectedPrev = GENESIS_EVENT_HASH;
  let sessionId: string | null = null;
  let lastEventHash: string | null = null;

  events.forEach((event, index) => {
    const label = event.event_id || `event[${index}]`;

    if (!event.session_id) {
      errors.push(`${label}: missing session_id`);
    } else if (sessionId === null) {
      sessionId = event.session_id;
    } else if (event.session_id !== sessionId) {
      errors.push(`${label}: session_id ${event.session_id} does not match ${sessionId}`);
    }

    if (!event.prev_event_hash) {
      errors.push(`${label}: missing prev_event_hash`);
    } else if (event.prev_event_hash !== expectedPrev) {
      errors.push(`${label}: prev_event_hash ${event.prev_event_hash} does not match expected ${expectedPrev}`);
    }

    if (!event.event_hash) {
      errors.push(`${label}: missing event_hash`);
    } else {
      const recomputed = computeEventHash(event);
      if (event.event_hash !== recomputed) {
        errors.push(`${label}: event_hash mismatch, expected ${recomputed}`);
      }
    }

    expectedPrev = event.event_hash || expectedPrev;
    lastEventHash = event.event_hash || lastEventHash;
  });

  const sessionHash = events.length > 0 ? sha256({ sessionId, eventHashes: events.map((event) => event.event_hash) }) : null;

  return {
    valid: errors.length === 0,
    eventCount: events.length,
    sessionId,
    sessionHash,
    lastEventHash,
    errors,
  };
}

export function eventsForTicket(ticketId: string, events: BlackBoxEvent[]) {
  return events.filter((event) => event.ticket_id === ticketId);
}

export function latestEvent(ticketEvents: BlackBoxEvent[], type: EventType) {
  return [...ticketEvents].reverse().find((event) => event.type === type);
}

export function validateExecutionGate(
  ticketId: string,
  events: BlackBoxEvent[],
  policy: BlackBoxPolicy,
): ValidationResult {
  const ticketEvents = eventsForTicket(ticketId, events);
  const executionIndex = ticketEvents.findIndex((event) => event.type === "execution.signed_or_simulated");
  const gateEvents = executionIndex >= 0 ? ticketEvents.slice(0, executionIndex) : ticketEvents;
  const schemaErrors: string[] = [];
  const orderingErrors = orderedPrefixErrors(gateEvents, policy.requiredEventsBeforeExecution);

  let traceIntegrity:
    | {
        required: boolean;
        valid: boolean;
        errors?: string[];
      }
    | undefined;
  if (policy.requiresTraceIntegrity) {
    const chain = verifyEventChain(events);
    traceIntegrity = { required: true, valid: chain.valid, errors: chain.errors };
  }

  const riskVeto = ticketEvents.find((event) => event.type === "risk.verdict" && event.payload.verdict === "veto");
  const candidate = latestEvent(gateEvents, "candidate.created");
  const securityCheck = latestEvent(gateEvents, "risk.security_check");
  const risk = riskVeto ?? latestEvent(gateEvents, "risk.verdict");
  const allocation = latestEvent(gateEvents, "allocation.sized");
  const quote = latestEvent(gateEvents, "route.quoted");
  const quoteSimulation = latestEvent(gateEvents, "quote.simulation");
  const confirmation = latestEvent(gateEvents, "user.confirmed");
  const execution = executionIndex >= 0 ? ticketEvents[executionIndex] : undefined;

  const presentEvents = new Set(gateEvents.map((event) => event.type));
  const candidatePayload = candidate ? candidatePayloadForPolicy(candidate, schemaErrors) : undefined;
  if (securityCheck) responseHashPayloadForPolicy(securityCheck, "responseHash", schemaErrors);
  const riskPayload = risk ? riskPayloadForPolicy(risk, schemaErrors) : undefined;
  const allocationPayload = allocation ? allocationPayloadForPolicy(allocation, schemaErrors) : undefined;
  const routePayload = quote ? routePayloadForPolicy(quote, schemaErrors) : undefined;
  if (quoteSimulation) responseHashPayloadForPolicy(quoteSimulation, "resultHash", schemaErrors);
  const confirmationPayload = confirmation ? confirmationPayloadForPolicy(confirmation, schemaErrors) : undefined;
  const result = evaluateSharedPolicy({
    policy,
    chain: candidatePayload?.chain,
    traceIntegrity,
    requiredEvents: {
      required: policy.requiredEventsBeforeExecution,
      present: presentEvents,
    },
    riskVerdict: riskPayload?.verdict,
    riskReason: riskPayload?.reason,
    allocation: allocationPayload,
    route: routePayload,
    confirmation: {
      required: policy.requiresUserConfirmation,
      exists: Boolean(confirmation),
      confirmed: confirmationPayload?.confirmed === true,
    },
    executionExists: Boolean(execution),
  });

  const errors = [...orderingErrors, ...schemaErrors, ...result.errors];
  const warnings = [...result.warnings];
  if (execution && errors.length > 0 && !warnings.includes("execution event exists even though current policy gate fails")) {
    warnings.push("execution event exists even though current policy gate fails");
  }

  return { allowed: errors.length === 0, errors, warnings };
}

export function renderReplay(events: BlackBoxEvent[]): string {
  const chain = verifyEventChain(events);
  const byTicket = new Map<string, BlackBoxEvent[]>();
  for (const event of events) {
    const group = byTicket.get(event.ticket_id) ?? [];
    group.push(event);
    byTicket.set(event.ticket_id, group);
  }

  const sections = [
    "# Agentic Wallet Ops Center Black Box Replay",
    "",
    `Trace integrity: ${chain.valid ? "valid" : "invalid"}`,
    `Session hash: ${chain.sessionHash ?? "n/a"}`,
    `Events: ${chain.eventCount}`,
  ];
  for (const [ticketId, ticketEvents] of [...byTicket.entries()].sort()) {
    sections.push("", `## ${ticketId}`);
    for (const event of ticketEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
      const skill = event.okx_skill ? ` via ${event.okx_skill}` : "";
      sections.push(`- ${event.timestamp} | ${event.agent} | ${event.type}${skill} | ${event.summary}`);
    }
  }

  return `${sections.join("\n")}\n`;
}

function numberPayload(event: BlackBoxEvent, key: string): number {
  const value = event.payload[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${event.type} payload.${key} must be a number`);
  }
  return value;
}

function stringPayload(event: BlackBoxEvent, key: string): string {
  const value = event.payload[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${event.type} payload.${key} must be a non-empty string`);
  }
  return value;
}

function orderedPrefixErrors(ticketEvents: BlackBoxEvent[], requiredTypes: EventType[]) {
  const errors: string[] = [];
  let previousIndex = -1;
  for (const requiredType of requiredTypes) {
    const index = ticketEvents.findIndex((event) => event.type === requiredType);
    if (index === -1) continue;
    if (index < previousIndex) {
      errors.push(`required event ${requiredType} occurs out of order`);
    } else {
      previousIndex = index;
    }
  }
  return errors;
}

function riskPayloadForPolicy(event: BlackBoxEvent, errors: string[]) {
  const verdict = event.payload.verdict;
  if (typeof verdict !== "string" || verdict.length === 0) {
    errors.push(`${event.type} payload.verdict must be a non-empty string`);
    return undefined;
  }
  return {
    verdict,
    reason: String(event.payload.reason ?? event.summary),
  };
}

function candidatePayloadForPolicy(event: BlackBoxEvent, errors: string[]) {
  const chain = event.payload.chain;
  if (chain === undefined) return undefined;
  if (typeof chain !== "string" || chain.length === 0) {
    errors.push(`${event.type} payload.chain must be a non-empty string when provided`);
    return undefined;
  }
  return { chain };
}

function allocationPayloadForPolicy(event: BlackBoxEvent, errors: string[]) {
  const sizeUsd = optionalFiniteNumberPayload(event, "sizeUsd", errors);
  const bookValueUsd = optionalFiniteNumberPayload(event, "bookValueUsd", errors);
  if (sizeUsd === undefined || bookValueUsd === undefined) return undefined;
  return { sizeUsd, bookValueUsd };
}

function routePayloadForPolicy(event: BlackBoxEvent, errors: string[]) {
  const slippageBps = optionalFiniteNumberPayload(event, "slippageBps", errors);
  const chain = optionalNonEmptyStringPayload(event, "chain", errors);
  if (slippageBps === undefined || chain === undefined) return undefined;
  return { slippageBps, chain };
}

function confirmationPayloadForPolicy(event: BlackBoxEvent, errors: string[]) {
  const confirmed = event.payload.confirmed;
  if (typeof confirmed !== "boolean") {
    errors.push(`${event.type} payload.confirmed must be a boolean`);
    return undefined;
  }
  return { confirmed };
}

function responseHashPayloadForPolicy(event: BlackBoxEvent, key: string, errors: string[]) {
  const value = event.payload[key];
  if (typeof value !== "string" || !value.startsWith("sha256:")) {
    errors.push(`${event.type} payload.${key} must be a sha256 hash`);
    return undefined;
  }
  return value;
}

function optionalFiniteNumberPayload(event: BlackBoxEvent, key: string, errors: string[]) {
  const value = event.payload[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    errors.push(`${event.type} payload.${key} must be a finite number`);
    return undefined;
  }
  return value;
}

function optionalNonEmptyStringPayload(event: BlackBoxEvent, key: string, errors: string[]) {
  const value = event.payload[key];
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${event.type} payload.${key} must be a non-empty string`);
    return undefined;
  }
  return value;
}
