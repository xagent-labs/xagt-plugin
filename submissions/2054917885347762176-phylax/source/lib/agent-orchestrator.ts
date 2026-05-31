import { type TradeIntent } from "./trade-intent-parser";

// ─── Action types the orchestrator can decide ─────────────────────────────────

export const ORCHESTRATOR_ACTIONS = [
  "ask_clarification",
  "run_signals",
  "run_scan",
  "run_quote",
  "show_quote",
  "request_confirmation",
] as const;

export type OrchestratorAction = (typeof ORCHESTRATOR_ACTIONS)[number];

export interface OrchestratorDecision {
  action: OrchestratorAction;
  /** Human-readable explanation of what the agent is doing */
  agentMessage: string;
  /** The parsed intent that led to this decision */
  intent: TradeIntent;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Decides the next action based on a parsed TradeIntent.
 *
 * Rules:
 * - Never executes trades directly from chat
 * - "Execute now" still requires explicit UI confirmation + wallet signature
 * - Missing fields → ask clarification
 * - Scan/safety requests → run_scan
 * - Vague "find safe token" → run_signals
 * - Quote requests → run_quote
 * - Swap requests with all fields → run_quote (never direct execution)
 */
export function orchestrate(intent: TradeIntent): OrchestratorDecision {
  // 1. Needs clarification?
  if (intent.needsClarification) {
    return {
      action: "ask_clarification",
      agentMessage:
        intent.clarificationQuestion ??
        "I need more details to proceed. Could you clarify your request?",
      intent,
    };
  }

  // 2. Unknown intent
  if (intent.intentType === "unknown") {
    return {
      action: "ask_clarification",
      agentMessage:
        "I'm not sure what you'd like to do. You can ask me to:\n" +
        "• **Scan** a token for risks\n" +
        "• **Quote** a swap (e.g. \"Quote 100 USDC to OKB\")\n" +
        "• **Find** low-risk tokens on a chain\n" +
        "• **Explain** the risk before trading",
      intent,
    };
  }

  // 3. Scan intent
  if (intent.intentType === "scan") {
    // If user said "find a safe token" without a specific token address → signal discovery
    if (!intent.toToken && !intent.fromToken) {
      return {
        action: "run_signals",
        agentMessage:
          `Searching for low-risk token signals${intent.chain ? ` on ${intent.chain}` : ""}. ` +
          "I'll scan discovered tokens for risk before showing results.",
        intent,
      };
    }

    return {
      action: "run_scan",
      agentMessage: `Running a security scan on ${intent.toToken ?? intent.fromToken ?? "the specified token"}. I'll check for honeypots, rug risks, and other red flags.`,
      intent,
    };
  }

  // 4. Quote intent
  if (intent.intentType === "quote") {
    return {
      action: "run_quote",
      agentMessage:
        `Building a quote for ${intent.amount ?? intent.amountUsd ?? "?"} ` +
        `${intent.fromToken ?? "?"} → ${intent.toToken ?? "?"}` +
        `${intent.chain ? ` on ${intent.chain}` : ""}. ` +
        "I'll show you the expected output, slippage, and gas fees.",
      intent,
    };
  }

  // 5. Swap intent → always goes through quote first, never direct execution
  if (intent.intentType === "swap") {
    return {
      action: "run_quote",
      agentMessage:
        `Preparing a swap quote for ${intent.amount ?? intent.amountUsd ?? "?"} ` +
        `${intent.fromToken ?? "?"} → ${intent.toToken ?? "?"}` +
        `${intent.chain ? ` on ${intent.chain}` : ""}. ` +
        "You'll review the quote and confirm with your wallet before anything executes.",
      intent,
    };
  }

  // Fallback (should not reach here)
  return {
    action: "ask_clarification",
    agentMessage: "I couldn't determine the right action. Could you rephrase your request?",
    intent,
  };
}
