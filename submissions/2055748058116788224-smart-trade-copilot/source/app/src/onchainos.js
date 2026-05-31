// Thin, defensive wrapper around the OKX `onchainos` CLI.
// Every on-chain read/write in this product goes through here so that
// auth, quota, and transport failures are handled in exactly one place.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

// Resolve the onchainos binary. Honor an explicit override, otherwise
// fall back to the standard install location, otherwise trust PATH.
function resolveBinary() {
  if (process.env.ONCHAINOS_BIN && existsSync(process.env.ONCHAINOS_BIN)) {
    return process.env.ONCHAINOS_BIN;
  }
  const local = join(
    homedir(),
    ".local",
    "bin",
    platform() === "win32" ? "onchainos.exe" : "onchainos",
  );
  if (existsSync(local)) return local;
  return platform() === "win32" ? "onchainos.exe" : "onchainos";
}

const BIN = resolveBinary();

export class OnchainosError extends Error {
  constructor(message, { kind, raw } = {}) {
    super(message);
    this.name = "OnchainosError";
    this.kind = kind || "unknown"; // 'quota' | 'auth' | 'transport' | 'cli' | 'parse'
    this.raw = raw;
  }
}

// Detect the documented "shared key throttled" condition so callers can
// degrade gracefully (mark a stage skipped) instead of fabricating data.
function classifyQuota(parsed, stderr) {
  const blob = JSON.stringify(parsed ?? "") + (stderr ?? "");
  if (/Invalid Authority|code=50114/i.test(blob)) {
    return "auth";
  }
  if (/OVER_QUOTA|rate.?limit|too many requests/i.test(blob)) {
    return "quota";
  }
  return null;
}

/**
 * Run an onchainos subcommand and return parsed JSON.
 * @param {string[]} args e.g. ["security", "token-scan", "--tokens", "1:0x.."]
 * @param {{timeoutMs?: number}} opts
 */
export function run(args, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 45_000;
  return new Promise((resolve, reject) => {
    let child;
    try {
      // Explicitly forward the full environment (incl. OKX_API_KEY /
      // OKX_SECRET_KEY / OKX_PASSPHRASE loaded from .env) to onchainos.
      child = spawn(BIN, args, { windowsHide: true, env: process.env });
    } catch (e) {
      return reject(
        new OnchainosError(
          `Could not launch onchainos (${BIN}). Is it installed? ${e.message}`,
          { kind: "cli" },
        ),
      );
    }

    let stdout = "";
    let stderr = "";
    const killer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(
        new OnchainosError(`onchainos ${args[0]} timed out after ${timeoutMs}ms`, {
          kind: "transport",
        }),
      );
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("error", (e) => {
      clearTimeout(killer);
      reject(
        new OnchainosError(`onchainos failed to start: ${e.message}`, {
          kind: "cli",
        }),
      );
    });

    child.on("close", (code) => {
      clearTimeout(killer);

      let parsed = null;
      const trimmed = stdout.trim();
      if (trimmed) {
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          // Some commands print a JSON object preceded by notices — grab the
          // first balanced {...} block as a best effort.
          const m = trimmed.match(/\{[\s\S]*\}/);
          if (m) {
            try {
              parsed = JSON.parse(m[0]);
            } catch {
              /* fall through to parse error below */
            }
          }
        }
      }

      const quotaKind = classifyQuota(parsed, stderr);
      if (quotaKind) {
        return reject(
          new OnchainosError(
            quotaKind === "auth"
              ? "OKX API rejected the key (Invalid Authority). The shared hackathon key is over-quota — set a personal key in .env (OKX Developer Portal)."
              : "OKX API quota exceeded for this key. Use a personal key (OKX Developer Portal) for full volume.",
            { kind: quotaKind, raw: parsed ?? stderr },
          ),
        );
      }

      if (parsed && parsed.ok === false) {
        return reject(
          new OnchainosError(parsed.error || "onchainos returned ok:false", {
            kind: "cli",
            raw: parsed,
          }),
        );
      }

      if (code !== 0 && !parsed) {
        return reject(
          new OnchainosError(
            `onchainos ${args.join(" ")} exited ${code}: ${stderr.trim() || "no output"}`,
            { kind: "cli", raw: stderr },
          ),
        );
      }

      if (!parsed) {
        return reject(
          new OnchainosError(
            `Could not parse onchainos output for: ${args.join(" ")}`,
            { kind: "parse", raw: stdout },
          ),
        );
      }

      resolve(parsed);
    });
  });
}

// Unwrap the common { ok, data } envelope; pass through bare payloads.
export function data(resp) {
  if (resp && typeof resp === "object" && "data" in resp) return resp.data;
  return resp;
}

export async function version() {
  const r = await new Promise((resolve) => {
    let out = "";
    const c = spawn(BIN, ["--version"], { windowsHide: true });
    c.stdout.on("data", (d) => (out += d));
    c.on("close", () => resolve(out.trim()));
    c.on("error", () => resolve(""));
  });
  return r || "unknown";
}

export const binaryPath = BIN;
