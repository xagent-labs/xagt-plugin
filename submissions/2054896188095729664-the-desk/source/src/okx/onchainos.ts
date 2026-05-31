import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { loadLocalEnv } from "../env.js";

export interface OnchainCommand {
  name: string;
  args: string[];
  timeoutMs?: number;
}

export type OnchainJsonResult =
  | {
      ok: true;
      name: string;
      command: string;
      json: Record<string, unknown>;
      notifications: unknown[];
    }
  | {
      ok: false;
      name: string;
      command: string;
      error: string;
      status: number | null;
    };

export function runOnchainJson(input: OnchainCommand): OnchainJsonResult {
  loadLocalEnv();
  const command = ["onchainos", ...input.args];
  const result = spawnSync(command[0], command.slice(1), {
    encoding: "utf8",
    timeout: input.timeoutMs ?? 20_000,
    env: {
      ...process.env,
      PATH: `${homedir()}/.local/bin:${process.env.PATH ?? ""}`,
    },
  });

  const commandText = command.join(" ");
  if (result.status !== 0 || result.error) {
    return {
      ok: false,
      name: input.name,
      command: commandText,
      status: result.status,
      error: sanitize(`${result.stderr ?? ""}\n${result.stdout ?? ""}\n${result.error ? String(result.error) : ""}`.trim()),
    };
  }

  try {
    const json = JSON.parse(result.stdout) as Record<string, unknown>;
    return {
      ok: true,
      name: input.name,
      command: commandText,
      json,
      notifications: Array.isArray(json.notifications) ? json.notifications : [],
    };
  } catch {
    return {
      ok: false,
      name: input.name,
      command: commandText,
      status: result.status,
      error: sanitize(result.stdout || "Command returned non-JSON output."),
    };
  }
}

export function resultData<T = unknown>(result: OnchainJsonResult): T[] {
  if (!result.ok) return [];
  return Array.isArray(result.json.data) ? (result.json.data as T[]) : [];
}

export function resultHealth(results: OnchainJsonResult[]) {
  return results.map((result) => ({
    name: result.name,
    ok: result.ok,
    command: result.command,
    error: result.ok ? undefined : result.error.slice(0, 240),
  }));
}

export function sanitize(value: string) {
  return value
    .replace(/[A-Fa-f0-9]{32,}/g, "[redacted-hex]")
    .replace(/0x[A-Fa-f0-9]{8,}/g, "0x[redacted]")
    .replace(/(token|secret|passphrase|api[-_ ]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}
