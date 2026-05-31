import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

const execFileAsync = promisify(execFile);

export const SUPPORTED_MSA_TOKENS = new Set([
  "BTC", "ETH", "SOL", "BNB", "DOGE", "AVAX", "ARB", "XRP", "LINK", "PEPE", "OKB"
]);

export interface MarketStructureResult {
  symbol: string;
  success: boolean;
  data?: unknown;
  error?: string;
  limitations?: string;
}

const SCRIPT_PATH = path.join(process.cwd(), ".agents", "skills", "market-structure-analyzer", "scripts", "fetch_market_data.py");
const CLI_TIMEOUT_MS = 15_000;

export async function checkMarketStructure(symbols: string[]): Promise<MarketStructureResult[]> {
  const results: MarketStructureResult[] = [];

  for (const symbol of symbols) {
    const upperSymbol = symbol.toUpperCase();
    
    if (!SUPPORTED_MSA_TOKENS.has(upperSymbol)) {
      results.push({
        symbol: upperSymbol,
        success: false,
        error: `Token ${upperSymbol} is currently unsupported for deep market structure analysis. Supported tokens: ${Array.from(SUPPORTED_MSA_TOKENS).join(", ")}.`,
      });
      continue;
    }

    if (!fs.existsSync(SCRIPT_PATH)) {
      results.push({
        symbol: upperSymbol,
        success: false,
        error: "Market structure analyzer skill is not installed or unavailable.",
      });
      continue;
    }

    try {
      const { stdout } = await execFileAsync("python3", [SCRIPT_PATH, upperSymbol], {
        timeout: CLI_TIMEOUT_MS,
        env: {
          ...process.env,
          PATH: `${process.env.PATH ?? ""}:/usr/local/bin:/usr/bin`,
        },
      });

      let parsed: unknown = null;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch {
        // If JSON parsing fails, return sanitized error
        results.push({
          symbol: upperSymbol,
          success: false,
          error: "Failed to parse market structure data.",
        });
        continue;
      }

      // Sanitize the output (only allow certain fields or just safely wrap it without secrets)
      // Since we don't know the exact schema, we strip out any string that looks like a secret or raw stack trace.
      const sanitizedStr = JSON.stringify(parsed)
        .replace(/API_KEY/gi, "REDACTED")
        .replace(/SECRET/gi, "REDACTED")
        .replace(/Bearer\s+[A-Za-z0-9\-\._~+\/]+/gi, "REDACTED");

      results.push({
        symbol: upperSymbol,
        success: true,
        data: JSON.parse(sanitizedStr),
        limitations: "Smart money activity does not guarantee safety. Do not fake data.",
      });

    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException & { killed?: boolean };
      if (e.killed) {
        results.push({
          symbol: upperSymbol,
          success: false,
          error: "Market structure analysis timed out.",
        });
      } else {
        results.push({
          symbol: upperSymbol,
          success: false,
          error: "Market structure analysis failed due to an internal error.",
        });
      }
    }
  }

  return results;
}
