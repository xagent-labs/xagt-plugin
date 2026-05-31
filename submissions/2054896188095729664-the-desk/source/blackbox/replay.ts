import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEvents, renderReplay } from "../src/blackbox-core.js";

export function replay(eventsPath = "blackbox/events.jsonl") {
  return renderReplay(loadEvents(eventsPath));
}

function main() {
  console.log(replay());
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
