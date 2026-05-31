import type { Signals, ScorePoint, RugEvent, TokenStatus } from "./types";
import { SIGNAL_META } from "./types";

/** Compute weighted RugScore from signal values. */
function rugScore(s: Omit<Signals, "ts">): number {
  let score = 0;
  for (const [key, meta] of Object.entries(SIGNAL_META)) {
    score += (s[key as keyof typeof s] ?? 0) * meta.weight;
  }
  return Math.round(score * 10000) / 10000;
}

// ── Keyframes ──────────────────────────────────────────────────────────────
// Each frame represents ~2 seconds of the walkthrough

interface Frame {
  signals: Omit<Signals, "ts">;
  event?: { type: RugEvent["type"]; message: string };
}

export const DEMO_FRAMES: Frame[] = [
  // Phase 1 — Safe (3 frames)
  {
    signals: { dev_wallet: 0.0, smart_money: 0.0, holder_concentration: 0.05, liquidity_withdrawal: 0.0, trade_flow_toxicity: 0.1 },
  },
  {
    signals: { dev_wallet: 0.0, smart_money: 0.05, holder_concentration: 0.08, liquidity_withdrawal: 0.0, trade_flow_toxicity: 0.12 },
  },
  {
    signals: { dev_wallet: 0.05, smart_money: 0.1, holder_concentration: 0.1, liquidity_withdrawal: 0.02, trade_flow_toxicity: 0.15 },
  },
  // Phase 2 — Warning ramp (3 frames)
  {
    signals: { dev_wallet: 0.4, smart_money: 0.3, holder_concentration: 0.2, liquidity_withdrawal: 0.1, trade_flow_toxicity: 0.25 },
  },
  {
    signals: { dev_wallet: 0.6, smart_money: 0.5, holder_concentration: 0.35, liquidity_withdrawal: 0.2, trade_flow_toxicity: 0.4 },
  },
  {
    signals: { dev_wallet: 0.75, smart_money: 0.6, holder_concentration: 0.5, liquidity_withdrawal: 0.35, trade_flow_toxicity: 0.5 },
    event: { type: "WARNING", message: "RugScore 0.63 — warning threshold crossed" },
  },
  // Phase 3 — Danger (2 frames)
  {
    signals: { dev_wallet: 0.9, smart_money: 0.8, holder_concentration: 0.7, liquidity_withdrawal: 0.6, trade_flow_toxicity: 0.7 },
  },
  {
    signals: { dev_wallet: 1.0, smart_money: 0.95, holder_concentration: 0.85, liquidity_withdrawal: 0.8, trade_flow_toxicity: 0.9 },
    event: { type: "EXIT", message: "RugScore 0.95 — autonomous exit executed" },
  },
];

// ── Build demo token state from frames up to a given index ─────────────────

export function buildDemoState(frameIndex: number): {
  token: TokenStatus;
  events: RugEvent[];
} {
  const now = Date.now() / 1000;
  const history: ScorePoint[] = [];
  const events: RugEvent[] = [];

  for (let i = 0; i <= frameIndex && i < DEMO_FRAMES.length; i++) {
    const frame = DEMO_FRAMES[i];
    const score = rugScore(frame.signals);
    history.push({ score, ts: now - (frameIndex - i) * 2 });
    if (frame.event) {
      events.push({
        type: frame.event.type,
        token: "0xdemo",
        symbol: "$RUGDEMO",
        score,
        ts: now - (frameIndex - i) * 2,
        message: frame.event.message,
        tx_hash: frame.event.type === "EXIT" ? "0x8f3a...c7d2" : "",
      });
    }
  }

  const current = DEMO_FRAMES[Math.min(frameIndex, DEMO_FRAMES.length - 1)];
  const score = rugScore(current.signals);
  const exited = frameIndex >= DEMO_FRAMES.length - 1;

  const token: TokenStatus = {
    address: "0xdead0000000000000000000000000000000beef",
    chain: "xlayer",
    symbol: "$RUGDEMO",
    name: "Demo Token",
    rug_score: score,
    signals: { ...current.signals, ts: now },
    score_history: history,
    events,
    exited,
    active: true,
    exit_threshold: 0.80,
    warn_threshold: 0.65,
    dev_wallet_address: "0x742d...35Cc",
    added_at: now - 60,
  };

  return { token, events };
}

export const TOTAL_FRAMES = DEMO_FRAMES.length;
