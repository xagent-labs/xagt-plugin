import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEvents, verifyEventChain, writeEvents } from "../src/blackbox-core.js";

function main() {
  const sourcePath = process.argv[2] ?? "blackbox/events.jsonl";
  const outputPath = process.argv[3] ?? "demo/tampered-events.jsonl";
  const events = loadEvents(sourcePath);

  if (events.length === 0) {
    console.error(`No events found at ${sourcePath}. Run npm run demo first.`);
    process.exitCode = 1;
    return;
  }

  const tampered = structuredClone(events);
  const target = tampered.find((event) => event.type === "allocation.sized") ?? tampered[0];
  target.summary = `${target.summary} [tampered]`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  writeEvents(outputPath, tampered);

  const result = verifyEventChain(tampered);
  console.log(`Tampered trace written to ${outputPath}`);
  console.log(`Trace integrity: ${result.valid ? "PASS" : "FAIL"}`);
  if (result.valid) {
    console.error("Expected tampered trace to fail verification.");
    process.exitCode = 1;
  } else {
    for (const error of result.errors) {
      console.log(`- ${error}`);
    }
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
