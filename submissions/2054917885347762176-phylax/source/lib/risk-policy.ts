/**
 * PhylaX Production Risk Policy.
 *
 * Enforces safety invariants before any live execution:
 * - Quote freshness (expiry)
 * - Slippage limits
 * - Chain allowlist
 * - Kill switch check
 * - Infrastructure readiness (Redis, DB)
 * - Live execution env validation
 * - No silent demo fallback in production
 */

import { isKillSwitchActive, isRedisAvailable } from "./redis";
import { isDbAvailable } from "./db";
import { audit } from "./audit";

// ─── Configuration ────────────────────────────────────────────────────────────

/** Maximum allowed slippage in percent */
const MAX_SLIPPAGE_PERCENT = 5;

/** Quote expiry duration in milliseconds (2 minutes) */
export const QUOTE_EXPIRY_MS = 2 * 60 * 1000;

/** Approval expiry duration in milliseconds (5 minutes) */
export const APPROVAL_EXPIRY_MS = 5 * 60 * 1000;

import { SUPPORTED_CHAINS } from "./chains";

/** Chains allowed for live execution (enabled only) */
const CHAIN_ALLOWLIST = new Set(SUPPORTED_CHAINS.filter((c) => c.enabled).map((c) => c.chainIndex));

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PolicyCheckInput {
  chainId: string;
  slippagePercent: number;
  quoteCreatedAt: number; // epoch ms
  walletAddress: string;
  privyUserId: string;
  amountUsd?: number;
}

export interface PolicyResult {
  allowed: boolean;
  reason: string | null;
}

// ─── Environment checks ──────────────────────────────────────────────────────

/**
 * Whether live execution is enabled.
 * Defaults to false (simulation-only mode).
 */
export function isLiveExecutionEnabled(): boolean {
  if (typeof global !== "undefined" && (global as any).__mockIsLiveExecutionEnabled) {
    return (global as any).__mockIsLiveExecutionEnabled();
  }
  return process.env.ENABLE_LIVE_EXECUTION === "true";
}

// ─── Main Policy Check ───────────────────────────────────────────────────────

/**
 * Run all risk policy checks before allowing execution.
 * Returns { allowed: true } or { allowed: false, reason: "..." }.
 */
export async function enforceRiskPolicy(
  input: PolicyCheckInput
): Promise<PolicyResult> {
  if (typeof global !== "undefined" && (global as any).__mockEnforceRiskPolicy) {
    return (global as any).__mockEnforceRiskPolicy(input);
  }
  // 1. Live execution must be explicitly enabled
  if (!isLiveExecutionEnabled()) {
    return {
      allowed: false,
      reason: "Live execution is not enabled. Set ENABLE_LIVE_EXECUTION=true to allow.",
    };
  }

  // 3. Kill switch
  const killActive = await isKillSwitchActive();
  if (killActive) {
    await audit({
      event: "kill_switch_active",
      privyUserId: input.privyUserId,
      walletAddress: input.walletAddress,
      metadata: { chainId: input.chainId },
    });
    return {
      allowed: false,
      reason: "Execution is temporarily paused by kill switch.",
    };
  }

  // 4. Redis required for live execution (replay protection)
  if (!isRedisAvailable()) {
    return {
      allowed: false,
      reason: "Redis is required for live execution but is not available.",
    };
  }

  // 5. DB required for live execution (audit trail)
  if (!isDbAvailable()) {
    return {
      allowed: false,
      reason: "Database is required for live execution but is not available.",
    };
  }

  // 6. Chain allowlist
  if (!CHAIN_ALLOWLIST.has(input.chainId)) {
    return {
      allowed: false,
      reason: `Chain ${input.chainId} is not in the execution allowlist.`,
    };
  }

  // 7. Slippage limit
  if (input.slippagePercent > MAX_SLIPPAGE_PERCENT) {
    return {
      allowed: false,
      reason: `Slippage ${input.slippagePercent}% exceeds maximum ${MAX_SLIPPAGE_PERCENT}%.`,
    };
  }

  // 8. Quote freshness
  const now = Date.now();
  const quoteAge = now - input.quoteCreatedAt;
  if (quoteAge > QUOTE_EXPIRY_MS) {
    return {
      allowed: false,
      reason: `Quote is stale (${Math.round(quoteAge / 1000)}s old, max ${QUOTE_EXPIRY_MS / 1000}s). Please request a new quote.`,
    };
  }

  // 9. Hard Cap
  const { getHardCapUsd, checkLiveExecutionReadiness } = await import("./live-execution");
  const readiness = checkLiveExecutionReadiness();
  if (!readiness.allowed) {
    return {
      allowed: false,
      reason: readiness.reason,
    };
  }

  if (typeof input.amountUsd !== "number" || input.amountUsd <= 0 || isNaN(input.amountUsd)) {
    return {
      allowed: false,
      reason: "Missing or invalid trade amount. Exact USD value required for live execution.",
    };
  }

  const hardCap = getHardCapUsd();
  if (input.amountUsd > hardCap) {
    return {
      allowed: false,
      reason: `Trade amount $${input.amountUsd} exceeds the live trade hard cap of $${hardCap}.`,
    };
  }

  return { allowed: true, reason: null };
}
