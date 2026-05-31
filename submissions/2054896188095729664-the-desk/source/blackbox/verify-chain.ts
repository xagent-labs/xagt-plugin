import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEvents, verifyEventChain } from "../src/blackbox-core.js";

export function verifyChain(eventsPath = "blackbox/events.jsonl") {
  return verifyEventChain(loadEvents(eventsPath));
}

function main() {
  const eventsPath = process.argv[2] ?? "blackbox/events.jsonl";
  const result = verifyChain(eventsPath);

  console.log(`Trace integrity: ${result.valid ? "PASS" : "FAIL"}`);
  console.log(`Events: ${result.eventCount}`);
  console.log(`Session: ${result.sessionId ?? "n/a"}`);
  console.log(`Session hash: ${result.sessionHash ?? "n/a"}`);
  if (!result.valid) {
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
