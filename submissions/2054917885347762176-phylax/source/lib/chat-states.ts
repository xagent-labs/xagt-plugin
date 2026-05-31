/**
 * Chat session states for the PhylaX wallet-gated trading assistant.
 *
 * These states drive both the frontend UI (ChatPanel) and the
 * backend orchestrator decision logic.
 */

export const CHAT_STATES = [
  "WALLET_REQUIRED",
  "WALLET_CONNECTED",
  "UNDERSTANDING_INTENT",
  "NEEDS_CLARIFICATION",
  "SCANNING_MARKET",
  "BUILDING_QUOTE",
  "WAITING_FOR_CONFIRMATION",
  "WAITING_FOR_WALLET_SIGNATURE",
  "TRANSACTION_SUBMITTED",
  "CONFIRMED",
  "FAILED",
] as const;

export type ChatState = (typeof CHAT_STATES)[number];

/** Human-friendly label for each state (used in UI badges / progress) */
export const CHAT_STATE_LABELS: Record<ChatState, string> = {
  WALLET_REQUIRED: "Connect Wallet",
  WALLET_CONNECTED: "Ready",
  UNDERSTANDING_INTENT: "Understanding…",
  NEEDS_CLARIFICATION: "Need More Info",
  SCANNING_MARKET: "Scanning Market",
  BUILDING_QUOTE: "Building Quote",
  WAITING_FOR_CONFIRMATION: "Review Required",
  WAITING_FOR_WALLET_SIGNATURE: "Awaiting Signature",
  TRANSACTION_SUBMITTED: "Submitted",
  CONFIRMED: "Confirmed",
  FAILED: "Failed",
};

/** Whether the state represents an active / busy operation */
export function isBusyState(state: ChatState): boolean {
  return (
    state === "UNDERSTANDING_INTENT" ||
    state === "SCANNING_MARKET" ||
    state === "BUILDING_QUOTE" ||
    state === "TRANSACTION_SUBMITTED"
  );
}
