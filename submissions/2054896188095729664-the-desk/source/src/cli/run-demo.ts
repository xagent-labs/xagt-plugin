import { runDemoFlow } from "../orchestrator.js";

await runDemoFlow({
  eventsPath: "blackbox/events.jsonl",
  policyPath: "blackbox/policies.json",
  digestPath: "digest/latest.md",
  replayPath: "demo/replay.md",
  dashboardDataDir: "web/public/data",
});
