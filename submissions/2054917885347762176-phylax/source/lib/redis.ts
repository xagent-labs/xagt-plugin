/**
 * PhylaX Redis client.
 *
 * Used for:
 * - Approval one-time-use consume (atomic)
 * - Idempotency keys
 * - Rate limit counters
 * - Global kill switch: phylax:execution:paused
 *
 * Env: REDIS_URL (redis:// connection string)
 *
 * If REDIS_URL is not set AND live execution is enabled → fail closed.
 */

import Redis from "ioredis";

let _redis: Redis | null = null;
let _initAttempted = false;
let _initError: string | null = null;

export function getRedis(): Redis | null {
  if (typeof global !== "undefined" && (global as any).__mockGetRedis !== undefined) {
    return (global as any).__mockGetRedis();
  }
  if (_redis) return _redis;
  if (_initAttempted) return null;
  _initAttempted = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    _initError = "REDIS_URL is not set. Redis is unavailable.";
    console.warn(`[redis] ${_initError}`);
    return null;
  }

  try {
    _redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      tls: url.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });
    return _redis;
  } catch (err) {
    _initError = `Failed to initialize Redis: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[redis] ${_initError}`);
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}

export function getRedisError(): string | null {
  return _initError;
}

// ─── Kill Switch ──────────────────────────────────────────────────────────────

const KILL_SWITCH_KEY = "phylax:execution:paused";

/**
 * Check if the global kill switch is active.
 * If Redis is unavailable, returns true (fail closed).
 */
export async function isKillSwitchActive(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // fail closed
  try {
    const val = await redis.get(KILL_SWITCH_KEY);
    return val === "1" || val === "true";
  } catch {
    return true; // fail closed on error
  }
}

/**
 * Set the kill switch state.
 */
export async function setKillSwitch(active: boolean): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    if (active) {
      await redis.set(KILL_SWITCH_KEY, "1");
    } else {
      await redis.del(KILL_SWITCH_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

// ─── Approval Consume (Atomic) ────────────────────────────────────────────────

/**
 * Atomically consume an approval. Returns true if this call consumed it,
 * false if it was already consumed (replay protection).
 */
export async function consumeApproval(approvalId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    // SETNX-style: only set if not exists, with 24h TTL
    const key = `phylax:approval:consumed:${approvalId}`;
    const result = await redis.set(key, Date.now().toString(), "EX", 86400, "NX");
    return result === "OK";
  } catch {
    return false;
  }
}

/**
 * Check if an approval has already been consumed.
 */
export async function isApprovalConsumed(approvalId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // fail closed
  try {
    const key = `phylax:approval:consumed:${approvalId}`;
    const val = await redis.get(key);
    return val !== null;
  } catch {
    return true; // fail closed
  }
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

/**
 * Check or set an idempotency key. Returns true if this is a new request.
 */
export async function checkIdempotency(key: string, ttlSeconds = 300): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // allow if Redis unavailable
  try {
    const fullKey = `phylax:idempotency:${key}`;
    const result = await redis.set(fullKey, Date.now().toString(), "EX", ttlSeconds, "NX");
    return result === "OK";
  } catch {
    return true;
  }
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

// P0 Phase 9: Atomic Lua script for INCR + EXPIRE to prevent TTL-less keys on crash
const RATE_LIMIT_LUA = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return current
`;

/**
 * Atomic sliding window rate limiter using Lua script. Returns true if within limit.
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // allow if Redis unavailable
  try {
    const key = `phylax:rate:${identifier}`;
    const current = await redis.eval(RATE_LIMIT_LUA, 1, key, windowSeconds) as number;
    return current <= maxRequests;
  } catch {
    return true;
  }
}
