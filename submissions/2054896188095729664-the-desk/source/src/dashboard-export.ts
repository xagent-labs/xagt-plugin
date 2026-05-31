import fs from "node:fs";
import path from "node:path";
import { loadPolicy, validateExecutionGate, verifyEventChain } from "./blackbox-core.js";
import type { BlackBoxEvent } from "./types.js";

export function exportDashboardData(input: {
  dataDir: string;
  events: BlackBoxEvent[];
  policyPath: string;
  replayPath: string;
  digestPath: string;
  okxEvidencePath?: string;
}) {
  fs.mkdirSync(input.dataDir, { recursive: true });
  const policy = loadPolicy(input.policyPath);
  const integrity = verifyEventChain(input.events);
  const ticketIds = [...new Set(input.events.map((event) => event.ticket_id))]
    .filter((ticketId) => ticketId !== "desk_daily")
    .sort();

  const gates = ticketIds.map((ticketId) => ({
    ticketId,
    ...validateExecutionGate(ticketId, input.events, policy),
  }));

  writeJson(path.join(input.dataDir, "events.json"), input.events);
  writeJson(path.join(input.dataDir, "policy.json"), policy);
  writeJson(path.join(input.dataDir, "integrity.json"), integrity);
  writeJson(path.join(input.dataDir, "gate-status.json"), gates);
  copyText(input.replayPath, path.join(input.dataDir, "replay.md"));
  copyText(input.digestPath, path.join(input.dataDir, "digest.md"));
  if (input.okxEvidencePath && fs.existsSync(input.okxEvidencePath)) {
    copyText(input.okxEvidencePath, path.join(input.dataDir, "okx-canary.md"));
  } else {
    fs.writeFileSync(
      path.join(input.dataDir, "okx-canary.md"),
      "# OKX Canary\n\nNo canary has been run yet. Run `npm run okx:canary` to generate live evidence.\n",
    );
  }
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function copyText(from: string, to: string) {
  fs.writeFileSync(to, fs.existsSync(from) ? fs.readFileSync(from, "utf8") : "");
}
