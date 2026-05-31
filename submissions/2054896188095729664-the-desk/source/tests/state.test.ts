import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createOrder,
  createTicket,
  emptyState,
  enforceCaps,
  loadState,
  recordFill,
  summarizeBlotter,
  transitionOrder,
  transitionTicket,
  writeState,
} from "../src/state/store.js";

function tmpStatePath(): string {
  return path.join(os.tmpdir(), `desk-state-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
}

test("emptyState round-trips through writeState/loadState", () => {
  const file = tmpStatePath();
  try {
    const written = writeState(file, emptyState());
    const loaded = loadState(file);
    assert.equal(loaded.schema_version, 1);
    assert.deepEqual(loaded.tickets, []);
    assert.equal(typeof loaded.updated_at, "string");
    assert.equal(typeof written.updated_at, "string");
  } finally {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
});

test("createTicket assigns id and proposed state", () => {
  const { state, ticket } = createTicket(emptyState(), {
    symbol: "BTC-USDT",
    chain: "okx-cex",
    side: "buy",
    notional_usd: 100,
    reasoning: "scanner signal",
    evidence_skills: ["okx-dex-signal"],
  });
  assert.equal(ticket.state, "proposed");
  assert.match(ticket.ticket_id, /^tkt_/);
  assert.equal(state.tickets.length, 1);
});

test("transitionTicket rejects invalid backwards moves", () => {
  let { state, ticket } = createTicket(emptyState(), {
    symbol: "ETH-USDT",
    chain: "okx-cex",
    side: "buy",
    notional_usd: 50,
  });
  state = transitionTicket(state, ticket.ticket_id, "staged");
  assert.throws(() => transitionTicket(state, ticket.ticket_id, "proposed"), /invalid ticket transition/);
});

test("createOrder requires a non-terminal ticket and emits unique cl_ord_id", () => {
  const created = createTicket(emptyState(), {
    symbol: "BTC-USDT",
    chain: "okx-cex",
    side: "buy",
    notional_usd: 100,
  });
  const stagedState = transitionTicket(
    transitionTicket(transitionTicket(created.state, created.ticket.ticket_id, "staged"), created.ticket.ticket_id, "quoted"),
    created.ticket.ticket_id,
    "confirmed",
  );
  const order = createOrder(stagedState, {
    ticket_id: created.ticket.ticket_id,
    venue: "okx-cex",
    mode: "cex_paper",
    side: "buy",
    type: "limit",
    instrument: "BTC-USDT",
    qty: 0.001,
    price: 70000,
    notional_usd: 70,
  });
  assert.match(order.order.cl_ord_id, /^cli_/);
  assert.equal(order.order.state, "confirmed");
});

test("recordFill updates position and flips order/ticket to filled", () => {
  const created = createTicket(emptyState(), {
    symbol: "BTC-USDT",
    chain: "okx-cex",
    side: "buy",
    notional_usd: 100,
  });
  let state = transitionTicket(created.state, created.ticket.ticket_id, "staged");
  state = transitionTicket(state, created.ticket.ticket_id, "quoted");
  state = transitionTicket(state, created.ticket.ticket_id, "confirmed");
  const ord = createOrder(state, {
    ticket_id: created.ticket.ticket_id,
    venue: "okx-cex",
    mode: "cex_paper",
    side: "buy",
    type: "limit",
    instrument: "BTC-USDT",
    qty: 0.001,
    price: 70000,
    notional_usd: 70,
  });
  state = transitionTicket(ord.state, created.ticket.ticket_id, "submitted");
  state = transitionOrder(state, ord.order.order_id, "submitted");
  const fillRes = recordFill(state, { order_id: ord.order.order_id, qty: 0.001, price: 70000 });
  const ticket = fillRes.state.tickets.find((t) => t.ticket_id === created.ticket.ticket_id);
  const order = fillRes.state.orders.find((o) => o.order_id === ord.order.order_id);
  const position = fillRes.state.positions.find((p) => p.symbol === "BTC-USDT");
  assert.equal(ticket?.state, "filled");
  assert.equal(order?.state, "filled");
  assert.ok(position && Math.abs(position.qty - 0.001) < 1e-9);
  assert.equal(position?.avg_price, 70000);
});

test("enforceCaps blocks notional > cap and instrument outside allowlist", () => {
  const state = emptyState();
  const caps = {
    maxNotionalUsd: 200,
    dailyNotionalCapUsd: 1000,
    instrumentAllowlist: ["BTC-USDT"],
  };
  assert.throws(
    () =>
      enforceCaps(state, {
        ticket_id: "tkt_x",
        venue: "okx-cex",
        mode: "cex_paper",
        side: "buy",
        type: "limit",
        instrument: "BTC-USDT",
        qty: 1,
        price: 300,
        notional_usd: 300,
      }, caps),
    /exceeds max/,
  );
  assert.throws(
    () =>
      enforceCaps(state, {
        ticket_id: "tkt_x",
        venue: "okx-cex",
        mode: "cex_paper",
        side: "buy",
        type: "limit",
        instrument: "RUGCAT-USDT",
        qty: 1,
        price: 50,
        notional_usd: 50,
      }, caps),
    /not in allowlist/,
  );
});

test("summarizeBlotter counts open vs filled", () => {
  let state = emptyState();
  const a = createTicket(state, { symbol: "BTC-USDT", chain: "okx-cex", side: "buy", notional_usd: 50 });
  state = a.state;
  const b = createTicket(state, { symbol: "ETH-USDT", chain: "okx-cex", side: "sell", notional_usd: 50 });
  state = b.state;
  state = transitionTicket(state, b.ticket.ticket_id, "staged");
  const summary = summarizeBlotter(state);
  assert.equal(summary.ticket_count, 2);
  assert.equal(summary.open_tickets, 2);
});
