#!/usr/bin/env node
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const apiPort = Number(process.env.DESK_API_PORT || 4181);
const vitePort = Number(process.env.DESK_WEB_PORT || 4173);
const opportunitiesPath = path.join(root, "web/public/data/opportunities.json");
const viteBin = path.join(root, "node_modules/vite/bin/vite.js");
const eventsPath = path.join(root, "blackbox/events.jsonl");
const policyPath = path.join(root, "blackbox/policies.json");
const replayPath = path.join(root, "demo/replay.md");
const digestPath = path.join(root, "digest/latest.md");
const dashboardDataDir = path.join(root, "web/public/data");
const okxEvidencePath = path.join(root, "docs/evidence/okx-canary.md");
const stateFilePath = path.join(root, "blackbox/state.json");
const responseSigningKey = crypto.randomBytes(32);
const tamperSnapshotPath = path.join("/private/tmp", "the-desk-tamper-restore-events.jsonl");

const CAP_DEFAULTS = {
  maxNotionalUsd: Number(process.env.MAX_NOTIONAL_USD ?? 200),
  dailyNotionalCapUsd: Number(process.env.DAILY_NOTIONAL_CAP_USD ?? 1000),
  instrumentAllowlist: (process.env.INSTRUMENT_ALLOWLIST ?? "BTC-USDT,ETH-USDT,SOL-USDT,USDC-USDT,CLEAN-USDT")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

let scanRunning = false;
let runtimePromise;
let scannerPromise;
let tamperSnapshot = null;

const server = http.createServer(async (request, response) => {
  setCors(request, response);
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    if (request.method === "GET" && request.url === "/api/health") {
      writeJson(response, 200, { ok: true, apiPort, vitePort });
      return;
    }

    if (request.method === "GET" && request.url === "/api/opportunities") {
      writeJson(response, 200, readOpportunities());
      return;
    }

    if (request.method === "POST" && request.url === "/api/scan") {
      if (scanRunning) {
        writeJson(response, 200, { ...readOpportunities(), cacheHit: true, note: "scan already running; served current Radar snapshot" });
        return;
      }
      scanRunning = true;
      try {
        const scanner = await loadScannerModule();
        const scan = await scanner.scanOpportunities();
        writeJson(response, 200, scan);
      } finally {
        scanRunning = false;
      }
      return;
    }

    if (request.method === "POST" && request.url === "/api/events") {
      const body = await readJsonBody(request);
      const drafts = Array.isArray(body?.drafts) ? body.drafts : null;
      if (!drafts || drafts.length === 0) {
        writeJson(response, 400, { ok: false, error: "body.drafts must be a non-empty array" });
        return;
      }
      const result = await appendEventDrafts(drafts);
      writeJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && request.url === "/api/reason") {
      const body = await readJsonBody(request);
      const result = await reasonHandler(body ?? {});
      writeJson(response, 200, result);
      return;
    }

    if (request.method === "GET" && request.url === "/api/blotter") {
      const state = await loadDeskState();
      const runtime = await loadRuntime();
      const events = runtime.loadEvents(eventsPath);
      const integrity = runtime.verifyEventChain(events);
      writeJson(response, 200, {
        ok: true,
        state,
        summary: (await loadStateModule()).summarizeBlotter(state),
        integrity: { valid: integrity.valid, lastEventHash: integrity.lastEventHash, sessionHash: integrity.sessionHash },
        caps: CAP_DEFAULTS,
      });
      return;
    }

    if (request.method === "POST" && request.url === "/api/tickets") {
      const body = await readJsonBody(request);
      const result = await createTicketHandler(body ?? {});
      writeJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && request.url === "/api/orders") {
      const body = await readJsonBody(request);
      const result = await createOrderHandler(body ?? {});
      writeJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && request.url === "/api/fills") {
      const body = await readJsonBody(request);
      const result = await recordFillHandler(body ?? {});
      writeJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && request.url?.startsWith("/api/demo/tamper")) {
      const url = new URL(request.url, `http://127.0.0.1:${apiPort}`);
      const result = await tamperTrace(Number(url.searchParams.get("eventIndex") ?? "4"));
      writeJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && request.url === "/api/demo/restore") {
      const result = await restoreTrace();
      writeJson(response, 200, result);
      return;
    }

    writeJson(response, 404, { ok: false, error: "not found" });
  } catch (error) {
    writeJson(response, error.statusCode ?? 500, {
      ok: false,
      ...(error.payload ?? { error: error instanceof Error ? sanitize(error.message) : sanitize(String(error)) }),
    });
  }
});

server.listen(apiPort, "127.0.0.1", () => {
  console.log(`Desk API listening on http://127.0.0.1:${apiPort}`);
});

const vite = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(vitePort)], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

vite.on("exit", (code, signal) => {
  server.close();
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    vite.kill(signal);
    server.close(() => process.exit(0));
  });
}

function readOpportunities() {
  return JSON.parse(fs.readFileSync(opportunitiesPath, "utf8"));
}

function findCluster(scan, clusterId) {
  if (!clusterId) return null;
  return (scan.clusters ?? []).find((cluster) => cluster.cluster_id === clusterId) ?? null;
}

async function appendEventDrafts(rawDrafts) {
  const runtime = await loadRuntime();
  const policy = runtime.loadPolicy(policyPath);
  const existingEvents = runtime.loadEvents(eventsPath);
  const nextEvents = [...existingEvents];
  const sessionId = nextEvents[0]?.session_id ?? "session_mission_control";
  let previousEventHash = nextEvents.at(-1)?.event_hash ?? "sha256:genesis";
  const appended = [];

  for (const rawDraft of rawDrafts) {
    const draft = normalizeDraft(rawDraft);
    validateAppendSemantics(draft, nextEvents, policy, runtime.validateExecutionGate);
    const event = runtime.makeEvent(
      nextEvents.length + 1,
      draft.ticket_id,
      draft.agent,
      draft.type,
      draft.summary,
      draft.payload,
      draft.okx_skill,
      { sessionId, previousEventHash },
    );
    previousEventHash = event.event_hash;
    nextEvents.push(event);
    appended.push(event);
  }

  previousEventHash = await maybeAppendCommitmentEvent(runtime, nextEvents, appended, previousEventHash);

  runtime.writeEvents(eventsPath, nextEvents);
  const artifacts = writeTraceArtifacts(runtime, nextEvents);

  return {
    ok: true,
    appended,
    events: nextEvents,
    integrity: artifacts.integrity,
    replay: artifacts.replay,
    digest: artifacts.digest,
    signature: signResponse({
      eventCount: nextEvents.length,
      lastEventHash: artifacts.integrity.lastEventHash,
      sessionHash: artifacts.integrity.sessionHash,
    }),
  };
}

async function loadScannerModule() {
  if (!scannerPromise) {
    scannerPromise = import(pathToFileURL(path.join(root, "dist/src/opportunity-scanner.js")).href);
  }
  return scannerPromise;
}

async function maybeAppendCommitmentEvent(runtime, nextEvents, appended, previousEventHash) {
  const receipt = [...appended].reverse().find((event) => event.type === "receipt.verified");
  if (!receipt) return previousEventHash;
  if (nextEvents.some((event) => event.ticket_id === receipt.ticket_id && event.type === "chain.commitment")) {
    return previousEventHash;
  }

  const integrity = runtime.verifyEventChain(nextEvents);
  const anchorResult =
    integrity.valid && integrity.sessionHash
      ? await runtime.commitSessionHash(integrity.sessionHash)
      : {
          ok: false,
          mode: "failed",
          chain: "X Layer Testnet",
          chainId: 1952,
          sessionHash: integrity.sessionHash ?? "n/a",
          error: `cannot anchor invalid trace: ${integrity.errors.join("; ") || "missing session hash"}`,
        };
  const event = runtime.makeEvent(
    nextEvents.length + 1,
    receipt.ticket_id,
    "Orchestrator",
    "chain.commitment",
    anchorResult.ok
      ? `Session hash committed to X Layer testnet: ${anchorResult.txHash}.`
      : `Session anchor not submitted: ${anchorResult.error}.`,
    runtime.commitmentEventPayload(anchorResult),
    "x-layer-session-anchor",
    { sessionId: nextEvents[0]?.session_id ?? "session_mission_control", previousEventHash },
  );
  nextEvents.push(event);
  appended.push(event);
  return event.event_hash;
}

async function tamperTrace(eventIndex) {
  const runtime = await loadRuntime();
  const events = runtime.loadEvents(eventsPath);
  if (!Number.isInteger(eventIndex) || eventIndex < 0 || eventIndex >= events.length) {
    throw httpError(400, { ok: false, error: `eventIndex must be between 0 and ${Math.max(events.length - 1, 0)}` });
  }

  tamperSnapshot = events.map((event) => structuredClone(event));
  fs.writeFileSync(tamperSnapshotPath, events.map((event) => JSON.stringify(event)).join("\n") + "\n");

  const tampered = events.map((event) => structuredClone(event));
  const target = tampered[eventIndex];
  const before = String(target.summary);
  const after = `${before} [tampered by demo]`;
  target.summary = after;
  runtime.writeEvents(eventsPath, tampered);
  const artifacts = writeTraceArtifacts(runtime, tampered);
  const firstInvalidIndex = firstInvalidEventIndex(artifacts.integrity.errors, tampered);

  return {
    ok: true,
    events: tampered,
    integrity: artifacts.integrity,
    replay: artifacts.replay,
    digest: artifacts.digest,
    tamper: {
      active: true,
      eventIndex,
      firstInvalidIndex,
      errors: artifacts.integrity.errors,
      diff: {
        field: "summary",
        before,
        after,
      },
    },
  };
}

async function restoreTrace() {
  const runtime = await loadRuntime();
  const snapshot =
    tamperSnapshot ??
    (fs.existsSync(tamperSnapshotPath)
      ? fs
          .readFileSync(tamperSnapshotPath, "utf8")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line))
      : null);
  if (!snapshot) {
    throw httpError(409, { ok: false, error: "no tamper snapshot available to restore" });
  }

  runtime.writeEvents(eventsPath, snapshot);
  const artifacts = writeTraceArtifacts(runtime, snapshot);
  tamperSnapshot = null;
  if (fs.existsSync(tamperSnapshotPath)) {
    fs.unlinkSync(tamperSnapshotPath);
  }

  return {
    ok: true,
    events: snapshot,
    integrity: artifacts.integrity,
    replay: artifacts.replay,
    digest: artifacts.digest,
    tamper: {
      active: false,
      errors: artifacts.integrity.errors,
    },
  };
}

function writeTraceArtifacts(runtime, events) {
  const replay = runtime.renderReplay(events);
  const digest = runtime.renderDigest(events);
  fs.writeFileSync(replayPath, replay);
  fs.writeFileSync(digestPath, digest);
  runtime.exportDashboardData({
    dataDir: dashboardDataDir,
    events,
    policyPath,
    replayPath,
    digestPath,
    okxEvidencePath,
  });
  return {
    integrity: runtime.verifyEventChain(events),
    replay,
    digest,
  };
}

function firstInvalidEventIndex(errors, events) {
  const eventIds = new Map(events.map((event, index) => [event.event_id, index]));
  for (const error of errors) {
    const eventId = String(error).split(":")[0];
    const index = eventIds.get(eventId);
    if (index !== undefined) return index;
  }
  return errors.length > 0 ? 0 : null;
}

function validateAppendSemantics(draft, events, policy, validateExecutionGate) {
  const ticketEvents = events.filter((event) => event.ticket_id === draft.ticket_id);
  const veto = ticketEvents.find((event) => event.type === "risk.verdict" && event.payload?.verdict === "veto");

  if (draft.type === "execution.signed_or_simulated") {
    const orderingErrors = requiredPrefixErrors(ticketEvents, policy.requiredEventsBeforeExecution);
    const gate = validateExecutionGate(draft.ticket_id, events, policy);
    const errors = [
      ...orderingErrors,
      ...(veto ? [`risk veto is final: ${String(veto.payload?.reason ?? veto.summary)}`] : []),
      ...gate.errors,
    ];
    if (errors.length > 0) {
      throw httpError(409, {
        ok: false,
        error: "execution gate rejected event draft",
        errors: [...new Set(errors)],
      });
    }
  }

  if (draft.type === "receipt.verified" && !ticketEvents.some((event) => event.type === "execution.signed_or_simulated")) {
    throw httpError(409, {
      ok: false,
      error: "receipt.verified requires a prior execution.signed_or_simulated event",
      errors: ["missing required event before receipt: execution.signed_or_simulated"],
    });
  }
}

function requiredPrefixErrors(ticketEvents, requiredTypes) {
  const errors = [];
  for (const requiredType of requiredTypes) {
    if (!ticketEvents.some((event) => event.type === requiredType)) {
      errors.push(`missing required event before execution: ${requiredType}`);
    }
  }
  const requiredIndices = requiredTypes
    .map((requiredType) => ticketEvents.findIndex((event) => event.type === requiredType))
    .filter((index) => index >= 0);
  for (let index = 1; index < requiredIndices.length; index += 1) {
    if (requiredIndices[index] < requiredIndices[index - 1]) {
      errors.push("required execution prefix is out of order");
      break;
    }
  }
  return errors;
}

function normalizeDraft(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw httpError(400, { ok: false, error: "event draft must be an object" });
  }
  const draft = {
    ticket_id: stringField(value, "ticket_id"),
    agent: stringField(value, "agent"),
    type: stringField(value, "type"),
    summary: stringField(value, "summary"),
    okx_skill: optionalStringField(value, "okx_skill"),
    payload: objectField(value, "payload"),
  };

  if (!allowedAgents.has(draft.agent)) {
    throw httpError(400, { ok: false, error: `unsupported agent: ${draft.agent}` });
  }
  if (!allowedEventTypes.has(draft.type)) {
    throw httpError(400, { ok: false, error: `unsupported event type: ${draft.type}` });
  }
  return draft;
}

function stringField(value, key) {
  const field = value[key];
  if (typeof field !== "string" || field.trim().length === 0) {
    throw httpError(400, { ok: false, error: `event draft ${key} must be a non-empty string` });
  }
  return field.trim();
}

function optionalStringField(value, key) {
  const field = value[key];
  if (field === undefined) return undefined;
  if (typeof field !== "string" || field.trim().length === 0) {
    throw httpError(400, { ok: false, error: `event draft ${key} must be a non-empty string when provided` });
  }
  return field.trim();
}

function objectField(value, key) {
  const field = value[key];
  if (!field || typeof field !== "object" || Array.isArray(field)) {
    throw httpError(400, { ok: false, error: `event draft ${key} must be an object` });
  }
  return field;
}

async function readJsonBody(request) {
  const raw = await readBody(request);
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw httpError(400, { ok: false, error: "request body must be valid JSON" });
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 128_000) {
        request.destroy();
        reject(httpError(413, { ok: false, error: "request body too large" }));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

let reasonerModulePromise;
async function loadReasonerModule() {
  reasonerModulePromise =
    reasonerModulePromise ?? import(pathToFileURL(path.join(root, "dist/src/agents/reasoner.js")).href);
  return reasonerModulePromise;
}

async function reasonHandler(body) {
  const opportunityId = typeof body.opportunity_id === "string" ? body.opportunity_id : null;
  if (!opportunityId) {
    throw httpError(400, { ok: false, error: "opportunity_id required" });
  }
  const data = readOpportunities();
  const cluster = findCluster(data, opportunityId);
  const opp =
    (data.opportunities ?? []).find((o) => o.id === opportunityId || o.ticketId === opportunityId) ??
    (cluster ? findClusterPrimaryOpportunity(data, cluster) : null);
  if (!opp) {
    throw httpError(404, { ok: false, error: `opportunity not found: ${opportunityId}` });
  }
  const mod = await loadReasonerModule();
  const result = await mod.generateReasoning(opp);
  return {
    ok: true,
    opportunity_id: opportunityId,
    reasoning: result.text,
    source: result.source,
    model: result.model,
    degraded: result.degraded,
    reason_for_degrade: result.reason_for_degrade,
  };
}

let stateModulePromise;
async function loadStateModule() {
  stateModulePromise =
    stateModulePromise ?? import(pathToFileURL(path.join(root, "dist/src/state/store.js")).href);
  return stateModulePromise;
}

async function loadDeskState() {
  const mod = await loadStateModule();
  return mod.loadState(stateFilePath);
}

async function persistDeskState(state) {
  const mod = await loadStateModule();
  return mod.writeState(stateFilePath, state);
}

async function requireValidTrace() {
  const runtime = await loadRuntime();
  const events = runtime.loadEvents(eventsPath);
  const integrity = runtime.verifyEventChain(events);
  if (!integrity.valid) {
    throw httpError(409, {
      ok: false,
      error: "trace integrity check failed; execution gate blocked",
      errors: integrity.errors,
    });
  }
  return { runtime, events, integrity };
}

async function createTicketHandler(body) {
  const mod = await loadStateModule();
  await requireValidTrace();
  validateClusterTicketGate(body);
  const state = await loadDeskState();
  const next = mod.createTicket(state, {
    opportunity_id: typeof body.opportunity_id === "string" ? body.opportunity_id : undefined,
    symbol: requireString(body, "symbol"),
    chain: requireString(body, "chain"),
    side: requireOneOf(body, "side", ["buy", "sell"]),
    notional_usd: requireNumber(body, "notional_usd"),
    reasoning: typeof body.reasoning === "string" ? body.reasoning : undefined,
    evidence_skills: Array.isArray(body.evidence_skills)
      ? body.evidence_skills.filter((s) => typeof s === "string")
      : [],
  });
  const saved = await persistDeskState(next.state);
  return { ok: true, ticket: next.ticket, state: saved };
}

function validateClusterTicketGate(body) {
  const clusterId = typeof body.cluster_id === "string" ? body.cluster_id : typeof body.opportunity_id === "string" && body.opportunity_id.startsWith("cluster:") ? body.opportunity_id : null;
  if (!clusterId) return;
  const scan = readOpportunities();
  const cluster = findCluster(scan, clusterId);
  const reasons = clusterTicketGateReasons(cluster, scan.sourceMode);
  if (reasons.length > 0) {
    throw httpError(409, {
      ok: false,
      code: "cluster_not_executable",
      error: "ticket rejected: cluster not execution-ready",
      cluster_id: clusterId,
      reasons,
    });
  }
}

function clusterTicketGateReasons(cluster, sourceMode) {
  if (!cluster) return ["source cluster not found"];
  const reasons = [];
  if (Array.isArray(cluster.notReadyReasons)) reasons.push(...cluster.notReadyReasons.filter((reason) => typeof reason === "string"));
  if (cluster.status !== "ready") reasons.push(`status is ${cluster.status}; execution requires a ready cluster`);
  if (cluster.risk?.verdict !== "allow") reasons.push(`risk verdict is ${cluster.risk?.verdict ?? "missing"}`);
  if (!cluster.policy?.allowed) reasons.push("policy gate is not allowed");
  if (sourceMode !== "okx-scout" && sourceMode !== "live-scout") reasons.push(`source mode ${sourceMode ?? "missing"} is not executable`);
  if (!clusterHasOkxOrWalletEvidence(cluster)) reasons.push("missing OKX or wallet evidence");
  const quoteStatus = cluster.proposedOrder?.quoteStatus ?? cluster.quoteStatus;
  if (quoteStatus !== "quoted") reasons.push(`quote status is ${quoteStatus ?? "missing"}`);
  if (quoteStatus === "quoted" && !quoteIsFresh(cluster.proposedOrder?.quoteFreshenedAt, 60)) reasons.push("stale quote");
  return [...new Set(reasons)];
}

function clusterHasOkxOrWalletEvidence(cluster) {
  return (cluster.top_evidence ?? []).some((evidence) => /okx|onchainos|wallet/i.test(`${evidence.source ?? ""} ${evidence.skill ?? ""}`));
}

function findClusterPrimaryOpportunity(scan, cluster) {
  const memberIds = new Set(cluster.member_ids ?? []);
  return (
    (scan.opportunities ?? []).find((opportunity) => memberIds.has(opportunity.id)) ??
    (scan.opportunities ?? []).find((opportunity) => opportunity.tokenAddress === cluster.primary_address && opportunity.chain === cluster.chain) ??
    null
  );
}

async function createOrderHandler(body) {
  const mod = await loadStateModule();
  await requireValidTrace();
  let state = await loadDeskState();
  const input = {
    ticket_id: requireString(body, "ticket_id"),
    venue: requireOneOf(body, "venue", ["okx-cex", "okx-dex", "fixture"]),
    mode: requireOneOf(body, "mode", [
      "fixture",
      "live_read",
      "calldata",
      "xlayer_testnet",
      "cex_paper",
      "cex_live_capped",
      "dex_mainnet_capped",
    ]),
    side: requireOneOf(body, "side", ["buy", "sell"]),
    type: requireOneOf(body, "type", ["limit", "post_only"]),
    instrument: requireString(body, "instrument"),
    qty: requireNumber(body, "qty"),
    price: body.price === undefined ? undefined : requireNumber(body, "price"),
    notional_usd: requireNumber(body, "notional_usd"),
    degraded: Boolean(body.degraded),
  };
  mod.enforceCaps(state, input, CAP_DEFAULTS);
  validateClusterTicketGate(body);
  // Ticket must be in a non-terminal pre-confirmed state; auto-advance to confirmed if quoted.
  const ticket = state.tickets.find((t) => t.ticket_id === input.ticket_id);
  if (!ticket) throw httpError(409, { ok: false, error: `ticket not found: ${input.ticket_id}` });
  validateTicketClusterForOrder(ticket);
  if (ticket.state === "proposed") state = mod.transitionTicket(state, ticket.ticket_id, "staged");
  if (state.tickets.find((t) => t.ticket_id === ticket.ticket_id)?.state === "staged") {
    state = mod.transitionTicket(state, ticket.ticket_id, "quoted");
  }
  if (state.tickets.find((t) => t.ticket_id === ticket.ticket_id)?.state === "quoted") {
    state = mod.transitionTicket(state, ticket.ticket_id, "confirmed");
  }
  const next = mod.createOrder(state, input);
  let finalState = mod.transitionTicket(next.state, ticket.ticket_id, "submitted");
  finalState = mod.transitionOrder(finalState, next.order.order_id, "submitted");
  const saved = await persistDeskState(finalState);
  return { ok: true, order: next.order, state: saved };
}

function validateTicketClusterForOrder(ticket) {
  const clusterId = typeof ticket.opportunity_id === "string" && ticket.opportunity_id.startsWith("cluster:") ? ticket.opportunity_id : null;
  if (!clusterId) return;
  const scan = readOpportunities();
  const cluster = findCluster(scan, clusterId);
  const reasons = clusterTicketGateReasons(cluster, scan.sourceMode);
  if (reasons.length > 0) {
    throw httpError(409, {
      ok: false,
      code: "cluster_not_executable",
      error: "ticket rejected: cluster not execution-ready",
      cluster_id: clusterId,
      reasons,
    });
  }
}

function quoteIsFresh(quoteFreshenedAt, maxQuoteAgeSeconds) {
  if (typeof quoteFreshenedAt !== "string") return false;
  const timestamp = Date.parse(quoteFreshenedAt);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= maxQuoteAgeSeconds * 1000;
}

async function recordFillHandler(body) {
  const mod = await loadStateModule();
  await requireValidTrace();
  const state = await loadDeskState();
  const next = mod.recordFill(state, {
    order_id: requireString(body, "order_id"),
    qty: requireNumber(body, "qty"),
    price: requireNumber(body, "price"),
    fees_usd: body.fees_usd === undefined ? undefined : requireNumber(body, "fees_usd"),
  });
  const saved = await persistDeskState(next.state);
  return { ok: true, fill: next.fill, state: saved };
}

function requireString(body, key) {
  const v = body[key];
  if (typeof v !== "string" || v.trim().length === 0) {
    throw httpError(400, { ok: false, error: `${key} must be a non-empty string` });
  }
  return v.trim();
}

function requireNumber(body, key) {
  const v = body[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw httpError(400, { ok: false, error: `${key} must be a finite number` });
  }
  return v;
}

function requireOneOf(body, key, allowed) {
  const v = requireString(body, key);
  if (!allowed.includes(v)) {
    throw httpError(400, { ok: false, error: `${key} must be one of: ${allowed.join(", ")}` });
  }
  return v;
}

async function loadRuntime() {
  runtimePromise =
    runtimePromise ??
    Promise.all([
      import(pathToFileURL(path.join(root, "dist/src/blackbox-core.js")).href),
      import(pathToFileURL(path.join(root, "dist/src/dashboard-export.js")).href),
      import(pathToFileURL(path.join(root, "dist/src/report.js")).href),
      import(pathToFileURL(path.join(root, "dist/src/anchor/xlayer-anchor.js")).href),
    ]).then(([blackbox, dashboard, report, anchor]) => ({
      ...blackbox,
      commitSessionHash: anchor.commitSessionHash,
      commitmentEventPayload: anchor.commitmentEventPayload,
      exportDashboardData: dashboard.exportDashboardData,
      renderDigest: report.renderDigest,
    }));
  return runtimePromise;
}

function signResponse(payload) {
  return `hmac-sha256:${crypto.createHmac("sha256", responseSigningKey).update(JSON.stringify(payload)).digest("hex")}`;
}

function httpError(statusCode, payload) {
  const error = new Error(payload.error ?? "request failed");
  error.statusCode = statusCode;
  error.payload = payload;
  return error;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with ${code}: ${stderr || stdout}`));
      }
    });
  });
}

function setCors(request, response) {
  const origin = request.headers.origin;
  const allowedOrigins = new Set([`http://127.0.0.1:${vitePort}`, `http://localhost:${vitePort}`]);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Origin", origin && allowedOrigins.has(origin) ? origin : `http://127.0.0.1:${vitePort}`);
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function writeJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sanitize(value) {
  return value
    .replace(/[A-Fa-f0-9]{32,}/g, "[redacted-hex]")
    .replace(/0x[A-Fa-f0-9]{8,}/g, "0x[redacted]")
    .replace(/(token|secret|passphrase|api[-_ ]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}

const allowedAgents = new Set(["Scout", "Risk Officer", "Allocator", "Executor", "Reporter", "Yield Manager", "Orchestrator"]);
const allowedEventTypes = new Set([
  "candidate.created",
  "risk.security_check",
  "risk.verdict",
  "allocation.sized",
  "route.quoted",
  "quote.simulation",
  "user.confirmed",
  "execution.signed_or_simulated",
  "receipt.verified",
  "policy.updated",
  "report.digest",
]);
