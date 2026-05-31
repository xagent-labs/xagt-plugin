import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEvents, loadPolicy, validateExecutionGate } from "../src/blackbox-core.js";

export function verifyTicket(ticketId: string, eventsPath = "blackbox/events.jsonl", policyPath = "blackbox/policies.json") {
  const events = loadEvents(eventsPath);
  const policy = loadPolicy(policyPath);
  return validateExecutionGate(ticketId, events, policy);
}

function main() {
  const ticketId = process.argv[2] ?? "ticket_clean_xlayer";
  const result = verifyTicket(ticketId);

  if (result.allowed) {
    console.log(`Execution gate: PASS for ${ticketId}`);
    if (result.warnings.length > 0) {
      console.log(`Warnings: ${result.warnings.join("; ")}`);
    }
    return;
  }

  console.error(`Execution gate: BLOCKED for ${ticketId}`);
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
