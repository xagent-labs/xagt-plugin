import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadLocalEnv } from "../env.js";

const evidencePath = "docs/evidence/okx-canary.md";
const dashboardPath = "web/public/data/okx-canary.md";

interface CanaryResult {
  name: string;
  command: string[];
  status: "pass" | "blocked" | "unavailable";
  exitCode: number | null;
  output: string;
}

const checks: Array<{ name: string; command: string[] }> = [
  { name: "Wallet status", command: ["onchainos", "wallet", "status"] },
  { name: "Signal chains", command: ["onchainos", "signal", "chains"] },
  { name: "Meme trenches chains", command: ["onchainos", "memepump", "chains"] },
  {
    name: "X Layer USDC token scan",
    command: ["onchainos", "security", "token-scan", "--chain", "xlayer", "--address", "0x74b7f16337b8972027f6196a17a631ac6de26d22"],
  },
];

function main() {
  loadLocalEnv();
  const results = checks.map(runCheck);
  const installedSkills = loadInstalledSkills();
  const markdown = renderEvidence(results, installedSkills);

  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, markdown);
  fs.mkdirSync(path.dirname(dashboardPath), { recursive: true });
  fs.writeFileSync(dashboardPath, markdown);

  console.log(`OKX canary evidence written to ${evidencePath}`);
  console.log(`Dashboard evidence copied to ${dashboardPath}`);
}

function runCheck(check: { name: string; command: string[] }): CanaryResult {
  const [bin, ...args] = check.command;
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    timeout: 20_000,
    env: process.env,
  });
  const combined = sanitize(`${result.stdout ?? ""}\n${result.stderr ?? ""}\n${result.error ? String(result.error) : ""}`.trim());
  const exitCode = result.status;

  let status: CanaryResult["status"] = "pass";
  if (result.error || exitCode !== 0) {
    status = result.error && String(result.error).includes("ENOENT") ? "unavailable" : "blocked";
  }

  return {
    name: check.name,
    command: check.command,
    status,
    exitCode,
    output: combined.slice(0, 1800) || "(no output)",
  };
}

function loadInstalledSkills() {
  if (!fs.existsSync("skills-lock.json")) {
    return [];
  }
  const lock = JSON.parse(fs.readFileSync("skills-lock.json", "utf8")) as { skills?: Record<string, unknown> };
  return Object.keys(lock.skills ?? {}).sort();
}

function renderEvidence(results: CanaryResult[], skills: string[]) {
  const now = new Date().toISOString();
  return `# OKX Live Canary Evidence

Generated at: ${now}

This canary uses safe read-only commands only. It records command availability and sanitized status, but deterministic fixtures remain the reliable review path for the demo.

## Installed Skills

${skills.map((skill) => `- ${skill}`).join("\n")}

## Checks

${results.map(renderResult).join("\n\n")}

## Fallback Policy

If a command is blocked by region, quota, missing wallet login, or local CLI availability, The Desk keeps running in fixture mode and records the fallback mode in the Black Box event payload.
`;
}

function renderResult(result: CanaryResult) {
  return `### ${result.name}

- Status: ${result.status}
- Exit code: ${result.exitCode ?? "n/a"}
- Command: \`${result.command.join(" ")}\`

\`\`\`text
${result.output}
\`\`\``;
}

function sanitize(value: string) {
  return value
    .replace(/[A-Fa-f0-9]{32,}/g, "[redacted-hex]")
    .replace(/0x[A-Fa-f0-9]{8,}/g, "0x[redacted]")
    .replace(/[1-9A-HJ-NP-Za-km-z]{42,}/g, "[redacted-address]")
    .replace(/(token|secret|passphrase|api[-_ ]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}

main();
