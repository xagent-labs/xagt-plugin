import { isLiveExecutionEnabled } from "./risk-policy";
import * as fs from "fs";
import * as path from "path";

/**
 * Checks if the system is configured correctly for live execution.
 * If live execution is disabled, this gracefully passes without checks.
 * If enabled, it strictly validates required environment variables and hard caps.
 */
export function checkLiveExecutionReadiness(): { allowed: boolean; reason: string | null; missingDependencies: string[] } {
  if (!isLiveExecutionEnabled()) {
    return { allowed: false, reason: "Live execution is disabled. PhylaX currently supports risk intelligence and quote preview only.", missingDependencies: [] };
  }

  const missing: string[] = [];
  
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.REDIS_URL) missing.push("REDIS_URL");
  if (!process.env.PRIVY_APP_SECRET) missing.push("PRIVY_APP_SECRET");
  if (!process.env.OKX_PROJECT_ID) missing.push("OKX_PROJECT_ID");
  if (!process.env.APPROVAL_SECRET) missing.push("APPROVAL_SECRET");
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) missing.push("NEXT_PUBLIC_PRIVY_APP_ID");
  if (!process.env.MAX_TRADE_USD_HARD_CAP) missing.push("MAX_TRADE_USD_HARD_CAP");

  // Only X Layer is live — Base/BSC/Solana are Coming Soon
  if (!process.env.RPC_URL_196) missing.push("RPC_URL_196");

  if (missing.length > 0) {
    return {
      allowed: false,
      reason: `Live execution is enabled but missing required environment dependencies: ${missing.join(", ")}`,
      missingDependencies: missing
    };
  }

  const hardCapStr = process.env.MAX_TRADE_USD_HARD_CAP;
  const hardCap = parseFloat(hardCapStr || "0");
  if (isNaN(hardCap) || hardCap <= 0) {
    return {
      allowed: false,
      reason: "Invalid MAX_TRADE_USD_HARD_CAP. Must be a positive number.",
      missingDependencies: ["MAX_TRADE_USD_HARD_CAP"]
    };
  }

  return { allowed: true, reason: null, missingDependencies: [] };
}

export function getHardCapUsd(): number {
  const hardCapStr = process.env.MAX_TRADE_USD_HARD_CAP;
  return parseFloat(hardCapStr || "0");
}

export function isMarketStructureAvailable(): boolean {
  try {
    const scriptPath = path.join(process.cwd(), ".agents", "skills", "market-structure-analyzer", "scripts", "fetch_market_data.py");
    return fs.existsSync(scriptPath);
  } catch {
    return false;
  }
}
