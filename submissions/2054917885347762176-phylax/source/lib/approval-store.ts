import { randomUUID } from "crypto";
import { Approval } from "./schemas";
import { getRedis } from "./redis";
import { isLiveExecutionEnabled } from "./risk-policy";

// Simple in-memory store for demo MVP purposes
// In production, this would be Redis or a database
const memoryStore = new Map<string, Approval>();

export async function createApproval(
  tokenAddress: string,
  chain: string,
  budgetUsd: number,
  slippageLimitPercent: number,
  walletAddress: string,
  fromToken?: string,
  routerAddress?: string,
  needsApproval?: boolean,
  approveAmount?: string,
  spender?: string
): Promise<string> {
  if (typeof global !== "undefined" && (global as any).__mockCreateApproval) {
    return (global as any).__mockCreateApproval(
      tokenAddress, chain, budgetUsd, slippageLimitPercent, walletAddress,
      fromToken, routerAddress, needsApproval, approveAmount, spender
    );
  }

  // P0 Phase 9: Reject empty/null/undefined walletAddress — required invariant
  if (!walletAddress || typeof walletAddress !== "string" || walletAddress.trim() === "") {
    throw new Error("walletAddress is required and must be non-empty.");
  }

  const id = randomUUID();
  const createdAt = Date.now();
  const expiresAt = createdAt + 5 * 60 * 1000; // 5 minutes expiration

  const approval: Approval = {
    id,
    tokenAddress,
    fromToken: fromToken?.toLowerCase(),
    chain,
    budgetUsd,
    slippageLimitPercent,
    createdAt,
    expiresAt,
    used: false,
    routerAddress: routerAddress?.toLowerCase(),
    walletAddress: walletAddress.toLowerCase(),
    needsApproval,
    approveAmount,
    spender: spender?.toLowerCase()
  };
  
  const live = isLiveExecutionEnabled();
  const redis = getRedis();

  if (live) {
    if (!redis) {
      throw new Error("Redis is required for live execution approval creation.");
    }
    await redis.set(`phylax:approval:${id}`, JSON.stringify(approval), "EX", 5 * 60);
  } else {
    // Demo mode: try redis, fallback to memory
    if (redis) {
      try {
        await redis.set(`phylax:approval:${id}`, JSON.stringify(approval), "EX", 5 * 60);
      } catch {
        memoryStore.set(id, approval);
      }
    } else {
      memoryStore.set(id, approval);
    }
  }

  return id;
}

/**
 * Read-only approval lookup — does NOT consume the approval.
 * Use this to validate wallet ownership BEFORE calling validateAndConsumeApproval.
 * Returns the approval if it exists and is not yet expired/consumed.
 */
export async function peekApproval(id: string): Promise<{ found: boolean; approval?: Approval; reason?: string }> {
  if (typeof global !== "undefined" && (global as any).__mockPeekApproval) {
    return (global as any).__mockPeekApproval(id);
  }
  const live = isLiveExecutionEnabled();
  const redis = getRedis();

  if (live && !redis) {
    return { found: false, reason: "Redis is required for live execution but is unavailable." };
  }

  if (redis) {
    // Check if already consumed
    const consumed = await redis.get(`phylax:approval:consumed:${id}`);
    if (consumed) return { found: false, reason: "Approval ID has already been used." };

    const data = await redis.get(`phylax:approval:${id}`);
    if (!data) return { found: false, reason: "Approval ID is missing or invalid." };

    try {
      const approval = JSON.parse(data) as Approval;
      if (Date.now() > approval.expiresAt) {
        return { found: false, reason: "Approval ID is expired." };
      }
      return { found: true, approval };
    } catch {
      return { found: false, reason: "Failed to parse approval data." };
    }
  }

  // Memory fallback (demo mode only)
  const approval = memoryStore.get(id);
  if (!approval) return { found: false, reason: "Approval ID is missing or invalid." };
  if (approval.used) return { found: false, reason: "Approval ID has already been used." };
  if (Date.now() > approval.expiresAt) return { found: false, reason: "Approval ID is expired." };
  return { found: true, approval };
}

export async function validateAndConsumeApproval(id: string): Promise<{ valid: boolean; reason?: string; approval?: Approval; code?: "missing" | "replay" | "expired" }> {
  if (typeof global !== "undefined" && (global as any).__mockValidateAndConsumeApproval) {
    return (global as any).__mockValidateAndConsumeApproval(id);
  }

  const live = isLiveExecutionEnabled();
  const redis = getRedis();

  if (live && !redis) {
    return { valid: false, reason: "Redis is required for live execution but is unavailable.", code: "missing" };
  }

  let approvalData: string | null = null;
  let missing = false;
  let consumed = false;

  if (redis) {
    // Atomic consume using Lua script
    // Returns data if successful, "MISSING" if not found, "CONSUMED" if already used.
    const script = `
      local approvalKey = KEYS[1]
      local consumedKey = KEYS[2]

      local data = redis.call("GET", approvalKey)
      if not data then
        return "MISSING"
      end

      local alreadyConsumed = redis.call("GET", consumedKey)
      if alreadyConsumed then
        return "CONSUMED"
      end

      redis.call("SET", consumedKey, "1", "EX", 86400)
      return data
    `;
    
    try {
      const result = await redis.eval(
        script,
        2,
        `phylax:approval:${id}`,
        `phylax:approval:consumed:${id}`
      );
      
      if (result === "MISSING") {
        missing = true;
      } else if (result === "CONSUMED") {
        consumed = true;
      } else if (typeof result === "string") {
        approvalData = result;
      }
    } catch {
      if (live) {
        return { valid: false, reason: "Failed to read approval from Redis.", code: "missing" };
      }
      // If demo mode and redis fails, fallback below
    }
  }

  // Fallback to memory for demo mode ONLY if not found in Redis
  let approval: Approval | undefined;
  
  if (approvalData) {
    try {
      approval = JSON.parse(approvalData);
    } catch {
      return { valid: false, reason: "Failed to parse approval data.", code: "missing" };
    }
  } else if (!live && !missing && !consumed) {
    approval = memoryStore.get(id);
    if (approval) {
      if (approval.used) {
        consumed = true;
      } else {
        approval.used = true;
        memoryStore.set(id, approval);
      }
    } else {
      missing = true;
    }
  }

  if (consumed) {
    return { valid: false, reason: "Approval ID has already been used.", code: "replay" };
  }

  if (typeof global !== "undefined" && (global as any).__mockValidateAndConsumeApproval) {
    return (global as any).__mockValidateAndConsumeApproval(id);
  }

  if (missing || !approval) {
    return { valid: false, reason: "Approval ID is missing or invalid.", code: "missing" };
  }

  if (Date.now() > approval.expiresAt) {
    return { valid: false, reason: "Approval ID is expired.", code: "expired" };
  }

  return { valid: true, approval };
}
export interface ExecutionRecord {
  id: string;
  walletAddress: string;
  chainId: string;
  approvalId?: string;
  target?: string;
  createdAt: number;
}

const memoryExecutionStore = new Map<string, ExecutionRecord>();

export async function createExecutionRecord(
  walletAddress: string,
  chainId: string,
  approvalId?: string,
  target?: string
): Promise<string> {
  const id = `exec-${randomUUID()}`;
  const record: ExecutionRecord = {
    id,
    walletAddress: walletAddress.toLowerCase(),
    chainId,
    approvalId,
    target,
    createdAt: Date.now()
  };

  const live = isLiveExecutionEnabled();
  const redis = getRedis();

  if (live && redis) {
    await redis.set(`phylax:exec:${id}`, JSON.stringify(record), "EX", 15 * 60); // 15 mins
  } else {
    memoryExecutionStore.set(id, record);
  }

  return id;
}

export const EXECUTION_RECORD_EXPIRY_MS = 15 * 60 * 1000;

export async function validateExecutionRecord(id: string): Promise<{ valid: boolean; reason?: string; record?: ExecutionRecord }> {
  if (typeof global !== "undefined" && (global as any).__mockValidateExecutionRecord) {
    return (global as any).__mockValidateExecutionRecord(id);
  }

  const live = isLiveExecutionEnabled();
  const redis = getRedis();

  if (live && !redis) {
    return { valid: false, reason: "Redis is required for live execution." };
  }

  let dataStr: string | null = null;
  if (live && redis) {
    dataStr = await redis.get(`phylax:exec:${id}`);
  } else {
    const rec = memoryExecutionStore.get(id);
    if (rec) dataStr = JSON.stringify(rec);
  }

  if (!dataStr) {
    return { valid: false, reason: "Execution record not found or expired." };
  }

  try {
    const record = JSON.parse(dataStr) as ExecutionRecord;
    
    if (Date.now() - record.createdAt > EXECUTION_RECORD_EXPIRY_MS) {
      if (!(live && redis)) {
        memoryExecutionStore.delete(id);
      }
      return { valid: false, reason: "Execution record not found or expired." };
    }

    return { valid: true, record };
  } catch {
    return { valid: false, reason: "Invalid execution record data." };
  }
}

export async function consumeExecutionRecord(id: string): Promise<boolean> {
  if (typeof global !== "undefined" && (global as any).__mockConsumeExecutionRecord) {
    return (global as any).__mockConsumeExecutionRecord(id);
  }

  const live = isLiveExecutionEnabled();
  const redis = getRedis();

  if (live && !redis) {
    return false;
  }

  if (live && redis) {
    const deleted = await redis.del(`phylax:exec:${id}`);
    return deleted > 0;
  } else {
    const exists = memoryExecutionStore.has(id);
    if (exists) {
      memoryExecutionStore.delete(id);
      return true;
    }
    return false;
  }
}
export async function markApprovalTxConsumed(txHash: string): Promise<boolean> {
  if (typeof global !== "undefined" && (global as any).__mockMarkApprovalTxConsumed) {
    return (global as any).__mockMarkApprovalTxConsumed(txHash);
  }
  const live = isLiveExecutionEnabled();
  const redis = getRedis();

  const key = `phylax:approval_tx:${txHash.toLowerCase()}`;

  if (live) {
    if (!redis) return false;
    const set = await redis.set(key, "1", "EX", 86400 * 7, "NX"); // 7 days
    return set === "OK";
  } else {
    if (redis) {
      try {
        const set = await redis.set(key, "1", "EX", 86400 * 7, "NX");
        return set === "OK";
      } catch {}
    }
    // Fallback to memory
    if (memoryStore.has(key)) return false;
    memoryStore.set(key, { id: "consumed", tokenAddress: "", chain: "", budgetUsd: 0, slippageLimitPercent: 0, createdAt: 0, expiresAt: 0, used: true, walletAddress: "" });
    return true;
  }
}
