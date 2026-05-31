// Safe CLI runner for onchainos commands.
//
// Rules:
// - Only allowlisted subcommand groups are permitted.
// - Arguments are passed as an array to execFile — NO shell string concatenation.
// - Secrets are never logged.
// - Hard timeout of 15 seconds per command.
// - stdout is parsed as JSON; parse errors surface as OkxCliError.

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const CLI_BINARY = "onchainos";
const CLI_TIMEOUT_MS = 15_000;

// Strict allowlist of permitted first two argv tokens (group + subcommand)
const ALLOWED_COMMANDS = new Set([
  // okx-dex-signal
  "signal list",
  "signal chains",
  // okx-dex-token
  "token search",
  "market price",
  "market prices",
  // okx-security
  "security token-scan",
  // okx-dex-swap
  "swap quote",
  "swap swap",
  "swap check-approvals",
  "swap approve",
  // okx-wallet-portfolio
  "portfolio token-balances",
  "portfolio all-balances",
  // okx-onchain-gateway
  "gateway gas",
  "gateway gas-limit",
  "gateway simulate",
  "gateway chains",
  // okx-agentic-wallet (read-only)
  "wallet status",
  "wallet balance",
  "wallet chains",
]);

export class OkxCliError extends Error {
  constructor(
    message: string,
    public readonly detail: string
  ) {
    super(message);
    this.name = "OkxCliError";
  }
}

/**
 * Run an onchainos CLI command safely.
 * @param args  Full argv array, e.g. ["signal", "list", "--chain", "196", "--limit", "5"]
 * @returns     Parsed JSON output from stdout
 */
export async function runCli(args: string[]): Promise<unknown> {
  if (typeof global !== "undefined" && (global as any).__mockRunCli) {
    return (global as any).__mockRunCli(args);
  }
  if (args.length < 2) {
    throw new OkxCliError("Invalid CLI args", "Must have at least group and subcommand");
  }

  const commandKey = `${args[0]} ${args[1]}`;
  if (!ALLOWED_COMMANDS.has(commandKey)) {
    throw new OkxCliError(
      `CLI command not allowed: ${commandKey}`,
      `Allowed: ${Array.from(ALLOWED_COMMANDS).join(", ")}`
    );
  }

  let stdout: string;
  let stderr: string;

  try {
    const result = await execFileAsync(CLI_BINARY, args, {
      timeout: CLI_TIMEOUT_MS,
      env: {
        ...process.env,
        // Ensure PATH includes common install locations for onchainos
        PATH: `${process.env.PATH ?? ""}:/usr/local/bin:/usr/bin`,
      },
      // Never pass shell: true — prevents injection
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err: unknown) {
    // execFile throws on non-zero exit or timeout
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string; killed?: boolean };
    if (e.killed) {
      throw new OkxCliError(
        `onchainos command timed out after ${CLI_TIMEOUT_MS / 1000}s`,
        `Command: ${commandKey}`
      );
    }
    // stdout may still contain partial JSON on non-zero exit — try to parse it
    const partialOut = e.stdout ?? "";
    if (partialOut.trim().startsWith("{") || partialOut.trim().startsWith("[")) {
      return tryParseJson(partialOut, commandKey);
    }
    throw new OkxCliError(
      `onchainos exited with error for command: ${commandKey}`,
      // Redact any secret-looking content from stderr
      redactSecrets(e.stderr ?? e.message ?? "unknown error")
    );
  }

  if (stderr && !stdout.trim()) {
    throw new OkxCliError(
      `onchainos produced no stdout for command: ${commandKey}`,
      redactSecrets(stderr)
    );
  }

  return tryParseJson(stdout, commandKey);
}

function tryParseJson(raw: string, commandKey: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new OkxCliError(`Empty output from onchainos: ${commandKey}`, "stdout was empty");
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new OkxCliError(
      `Failed to parse onchainos JSON output for: ${commandKey}`,
      `First 200 chars: ${trimmed.slice(0, 200)}`
    );
  }
}

/** Strip anything that looks like an API key or passphrase from error strings */
function redactSecrets(s: string): string {
  return s
    .replace(/OK-ACCESS-KEY[:\s]+\S+/gi, "OK-ACCESS-KEY=[REDACTED]")
    .replace(/OK-SECRET-KEY[:\s]+\S+/gi, "OK-SECRET-KEY=[REDACTED]")
    .replace(/OK-ACCESS-PASSPHRASE[:\s]+\S+/gi, "OK-ACCESS-PASSPHRASE=[REDACTED]")
    .replace(/apiKey[:\s]+\S+/gi, "apiKey=[REDACTED]")
    .slice(0, 500); // cap length
}
