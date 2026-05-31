import { loadEvents, verifyEventChain } from "../blackbox-core.js";
import { commitSessionHash } from "../anchor/xlayer-anchor.js";

const eventsPath = process.argv[2] ?? "blackbox/events.jsonl";
const integrity = verifyEventChain(loadEvents(eventsPath));
if (!integrity.valid || !integrity.sessionHash) {
  throw new Error(`cannot anchor invalid trace: ${integrity.errors.join("; ") || "missing session hash"}`);
}

const result = await commitSessionHash(integrity.sessionHash);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) {
  process.exitCode = 1;
}
