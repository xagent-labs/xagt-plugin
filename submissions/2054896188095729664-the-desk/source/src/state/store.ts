import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  DeskState,
  ExecutionAdapterMode,
  Fill,
  Order,
  OrderSide,
  OrderType,
  OrderVenue,
  Position,
  Ticket,
  TicketState,
} from "../types.js";

const SCHEMA_VERSION = 1 as const;

const TERMINAL_STATES: TicketState[] = ["filled", "canceled", "failed"];

const STATE_TRANSITIONS: Record<TicketState, TicketState[]> = {
  proposed: ["staged", "canceled"],
  staged: ["quoted", "canceled"],
  quoted: ["confirmed", "canceled"],
  confirmed: ["submitted", "canceled", "failed"],
  submitted: ["filled", "canceled", "failed"],
  filled: [],
  canceled: [],
  failed: [],
};

export function emptyState(now = new Date().toISOString()): DeskState {
  return {
    schema_version: SCHEMA_VERSION,
    tickets: [],
    orders: [],
    fills: [],
    positions: [],
    updated_at: now,
  };
}

export function loadState(stateFilePath: string): DeskState {
  if (!fs.existsSync(stateFilePath)) {
    return emptyState();
  }
  const raw = fs.readFileSync(stateFilePath, "utf8");
  if (!raw.trim()) return emptyState();
  const parsed = JSON.parse(raw) as DeskState;
  if (parsed.schema_version !== SCHEMA_VERSION) {
    throw new Error(
      `desk state schema mismatch: file=${parsed.schema_version} expected=${SCHEMA_VERSION}`,
    );
  }
  return parsed;
}

export function writeState(stateFilePath: string, state: DeskState): DeskState {
  fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
  const stamped: DeskState = { ...state, updated_at: new Date().toISOString() };
  const tmpPath = `${stateFilePath}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(stamped, null, 2)}\n`);
  fs.renameSync(tmpPath, stateFilePath);
  return stamped;
}

export interface CreateTicketInput {
  opportunity_id?: string;
  symbol: string;
  chain: string;
  side: OrderSide;
  notional_usd: number;
  reasoning?: string;
  evidence_skills?: string[];
}

export function createTicket(state: DeskState, input: CreateTicketInput): { state: DeskState; ticket: Ticket } {
  if (!Number.isFinite(input.notional_usd) || input.notional_usd <= 0) {
    throw new Error("ticket notional_usd must be a positive finite number");
  }
  const now = new Date().toISOString();
  const ticket: Ticket = {
    ticket_id: `tkt_${crypto.randomBytes(6).toString("hex")}`,
    opportunity_id: input.opportunity_id,
    symbol: input.symbol,
    chain: input.chain,
    state: "proposed",
    side: input.side,
    notional_usd: input.notional_usd,
    created_at: now,
    updated_at: now,
    reasoning: input.reasoning,
    evidence_skills: input.evidence_skills ?? [],
  };
  const nextState: DeskState = {
    ...state,
    tickets: [...state.tickets, ticket],
  };
  return { state: nextState, ticket };
}

export function transitionTicket(
  state: DeskState,
  ticketId: string,
  nextTicketState: TicketState,
): DeskState {
  const idx = state.tickets.findIndex((t) => t.ticket_id === ticketId);
  if (idx < 0) throw new Error(`ticket not found: ${ticketId}`);
  const current = state.tickets[idx];
  if (current.state === nextTicketState) return state;
  if (!STATE_TRANSITIONS[current.state].includes(nextTicketState)) {
    throw new Error(
      `invalid ticket transition ${current.state} -> ${nextTicketState} for ${ticketId}`,
    );
  }
  const updated: Ticket = { ...current, state: nextTicketState, updated_at: new Date().toISOString() };
  const tickets = [...state.tickets];
  tickets[idx] = updated;
  return { ...state, tickets };
}

export interface CreateOrderInput {
  ticket_id: string;
  venue: OrderVenue;
  mode: ExecutionAdapterMode;
  side: OrderSide;
  type: OrderType;
  instrument: string;
  qty: number;
  price?: number;
  notional_usd: number;
  degraded?: boolean;
}

export function createOrder(state: DeskState, input: CreateOrderInput): { state: DeskState; order: Order } {
  const ticket = state.tickets.find((t) => t.ticket_id === input.ticket_id);
  if (!ticket) throw new Error(`order references unknown ticket: ${input.ticket_id}`);
  if (TERMINAL_STATES.includes(ticket.state)) {
    throw new Error(`cannot create order against terminal ticket ${ticket.ticket_id} (${ticket.state})`);
  }
  if (input.type === "limit" || input.type === "post_only") {
    if (input.price === undefined || !Number.isFinite(input.price) || input.price <= 0) {
      throw new Error(`${input.type} order requires positive price`);
    }
  } else {
    throw new Error(`unsupported order type: ${input.type}`);
  }
  const now = new Date().toISOString();
  const seq = state.orders.filter((o) => o.ticket_id === input.ticket_id).length;
  const order: Order = {
    order_id: `ord_${crypto.randomBytes(6).toString("hex")}`,
    ticket_id: input.ticket_id,
    cl_ord_id: `cli_${input.ticket_id}_${seq}`,
    venue: input.venue,
    mode: input.mode,
    side: input.side,
    type: input.type,
    instrument: input.instrument,
    qty: input.qty,
    price: input.price,
    notional_usd: input.notional_usd,
    state: "confirmed",
    degraded: input.degraded ?? false,
    created_at: now,
    updated_at: now,
  };
  if (state.orders.some((o) => o.cl_ord_id === order.cl_ord_id)) {
    throw new Error(`duplicate cl_ord_id ${order.cl_ord_id}`);
  }
  return { state: { ...state, orders: [...state.orders, order] }, order };
}

export function transitionOrder(
  state: DeskState,
  orderId: string,
  nextOrderState: TicketState,
  externalId?: string,
): DeskState {
  const idx = state.orders.findIndex((o) => o.order_id === orderId);
  if (idx < 0) throw new Error(`order not found: ${orderId}`);
  const current = state.orders[idx];
  if (!STATE_TRANSITIONS[current.state].includes(nextOrderState) && current.state !== nextOrderState) {
    throw new Error(
      `invalid order transition ${current.state} -> ${nextOrderState} for ${orderId}`,
    );
  }
  const updated: Order = {
    ...current,
    state: nextOrderState,
    external_id: externalId ?? current.external_id,
    updated_at: new Date().toISOString(),
  };
  const orders = [...state.orders];
  orders[idx] = updated;
  return { ...state, orders };
}

export interface RecordFillInput {
  order_id: string;
  qty: number;
  price: number;
  fees_usd?: number;
}

export function recordFill(state: DeskState, input: RecordFillInput): { state: DeskState; fill: Fill } {
  const order = state.orders.find((o) => o.order_id === input.order_id);
  if (!order) throw new Error(`fill references unknown order: ${input.order_id}`);
  if (!Number.isFinite(input.qty) || input.qty <= 0) throw new Error("fill qty must be positive");
  if (!Number.isFinite(input.price) || input.price <= 0) throw new Error("fill price must be positive");
  const fill: Fill = {
    fill_id: `fil_${crypto.randomBytes(6).toString("hex")}`,
    order_id: order.order_id,
    ticket_id: order.ticket_id,
    qty: input.qty,
    price: input.price,
    notional_usd: input.qty * input.price,
    fees_usd: input.fees_usd ?? 0,
    timestamp: new Date().toISOString(),
  };
  let nextState: DeskState = { ...state, fills: [...state.fills, fill] };
  nextState = updatePositionForFill(nextState, order, fill);
  // Aggregate fill qty vs order qty; mark order filled when total fill qty meets order qty.
  const filledQty = nextState.fills
    .filter((f) => f.order_id === order.order_id)
    .reduce((sum, f) => sum + f.qty, 0);
  if (filledQty >= order.qty - 1e-9) {
    nextState = transitionOrder(nextState, order.order_id, "filled");
    nextState = transitionTicket(nextState, order.ticket_id, "filled");
  }
  return { state: nextState, fill };
}

function updatePositionForFill(state: DeskState, order: Order, fill: Fill): DeskState {
  const ticket = state.tickets.find((t) => t.ticket_id === order.ticket_id);
  if (!ticket) return state;
  const idx = state.positions.findIndex((p) => p.symbol === ticket.symbol && p.chain === ticket.chain);
  const direction = order.side === "buy" ? 1 : -1;
  const signedQty = direction * fill.qty;
  const now = new Date().toISOString();
  const next = [...state.positions];
  if (idx < 0) {
    next.push({
      symbol: ticket.symbol,
      chain: ticket.chain,
      qty: signedQty,
      avg_price: fill.price,
      notional_usd: fill.notional_usd * direction,
      realized_pnl_usd: 0,
      unrealized_pnl_usd: 0,
      updated_at: now,
    });
  } else {
    const current = next[idx];
    const newQty = current.qty + signedQty;
    // Same-direction add: weighted-average price. Opposing direction: realize PnL.
    if (Math.sign(current.qty) === Math.sign(signedQty) || current.qty === 0) {
      const totalQty = Math.abs(current.qty) + Math.abs(signedQty) || 1;
      const newAvg = (Math.abs(current.qty) * current.avg_price + Math.abs(signedQty) * fill.price) / totalQty;
      next[idx] = {
        ...current,
        qty: newQty,
        avg_price: newAvg,
        notional_usd: current.notional_usd + fill.notional_usd * direction,
        updated_at: now,
      };
    } else {
      const closingQty = Math.min(Math.abs(current.qty), Math.abs(signedQty));
      const realized = (fill.price - current.avg_price) * closingQty * Math.sign(current.qty);
      next[idx] = {
        ...current,
        qty: newQty,
        avg_price: newQty === 0 ? 0 : current.avg_price,
        notional_usd: current.notional_usd + fill.notional_usd * direction,
        realized_pnl_usd: current.realized_pnl_usd + realized,
        updated_at: now,
      };
    }
  }
  return { ...state, positions: next };
}

export interface CapPolicy {
  maxNotionalUsd: number;
  dailyNotionalCapUsd: number;
  instrumentAllowlist: string[];
}

export function enforceCaps(state: DeskState, input: CreateOrderInput, caps: CapPolicy): void {
  if (caps.instrumentAllowlist.length > 0 && !caps.instrumentAllowlist.includes(input.instrument)) {
    throw new Error(`instrument not in allowlist: ${input.instrument}`);
  }
  if (input.notional_usd > caps.maxNotionalUsd) {
    throw new Error(`order notional ${input.notional_usd} exceeds max ${caps.maxNotionalUsd}`);
  }
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const dailyTotal = state.orders
    .filter((o) => new Date(o.created_at).getTime() >= since)
    .reduce((sum, o) => sum + o.notional_usd, 0);
  if (dailyTotal + input.notional_usd > caps.dailyNotionalCapUsd) {
    throw new Error(
      `daily notional ${dailyTotal + input.notional_usd} exceeds cap ${caps.dailyNotionalCapUsd}`,
    );
  }
}

export function summarizeBlotter(state: DeskState) {
  const tickets = state.tickets;
  const openTickets = tickets.filter((t) => !TERMINAL_STATES.includes(t.state)).length;
  const filledTickets = tickets.filter((t) => t.state === "filled").length;
  const realized = state.positions.reduce((sum, p) => sum + p.realized_pnl_usd, 0);
  return {
    ticket_count: tickets.length,
    open_tickets: openTickets,
    filled_tickets: filledTickets,
    order_count: state.orders.length,
    fill_count: state.fills.length,
    position_count: state.positions.length,
    realized_pnl_usd: realized,
  };
}
