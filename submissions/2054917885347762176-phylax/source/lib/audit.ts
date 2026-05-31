/**
 * PhylaX Audit Logger.
 *
 * Writes structured audit events to Postgres (if available)
 * and always logs to console for observability.
 *
 * Events:
 * - chat_intent_parsed
 * - quote_requested / quote_returned
 * - approval_created / approval_consumed
 * - execution_requested / execution_blocked
 * - unsigned_tx_created
 * - wallet_tx_submitted
 * - tx_confirmed / tx_failed
 * - kill_switch_active
 */

import { getDb, schema } from "./db";

export type AuditEvent =
  | "chat_intent_parsed"
  | "quote_requested"
  | "quote_returned"
  | "approval_created"
  | "approval_consumed"
  | "execution_requested"
  | "execution_blocked"
  | "confirm_blocked"
  | "unsigned_tx_created"
  | "wallet_tx_submitted"
  | "tx_confirmed"
  | "tx_failed"
  | "kill_switch_active"
  | "approval_missing"
  | "approval_replay_blocked"
  | "approval_expired"
  | "simulation_started"
  | "simulation_passed"
  | "simulation_blocked";

export interface AuditEntry {
  event: AuditEvent;
  privyUserId?: string;
  walletAddress?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit event. Always logs to console.
 * Writes to Postgres if available (best-effort, never blocks).
 */
export async function audit(entry: AuditEntry): Promise<void> {
  // Always log to console for observability
  const logLine = `[audit] ${entry.event}${entry.walletAddress ? ` wallet=${entry.walletAddress}` : ""}${
    entry.privyUserId ? ` user=${entry.privyUserId}` : ""
  }`;
  console.log(logLine, entry.metadata ? JSON.stringify(entry.metadata) : "");

  // Write to Postgres if available (best-effort)
  try {
    const db = getDb();
    if (db) {
      await db.insert(schema.auditLog).values({
        event: entry.event,
        privyUserId: entry.privyUserId ?? null,
        walletAddress: entry.walletAddress ?? null,
        metadata: entry.metadata ?? null,
      });
    }
  } catch (err) {
    // Never fail the main flow due to audit logging
    console.error(
      `[audit] Failed to write to DB: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
