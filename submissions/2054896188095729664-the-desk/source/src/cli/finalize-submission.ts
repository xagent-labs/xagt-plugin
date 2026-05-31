import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { explorerTxUrl, isTransactionHash, verifySessionAnchorTx } from "../anchor/xlayer-anchor.js";
import { loadEvents } from "../blackbox-core.js";
import { exportDashboardData } from "../dashboard-export.js";
import { runDemoFlow } from "../orchestrator.js";

const manifestPath = "docs/submission-manifest.json";
const requiredTxHash = requiredEnv("DESK_XLAYER_ANCHOR_TX_HASH");
const requiredContractAddress = requiredEnv("DESK_XLAYER_SESSION_ANCHOR_ADDRESS");

if (!isTransactionHash(requiredTxHash)) {
  throw new Error("DESK_XLAYER_ANCHOR_TX_HASH must be a 32-byte hex transaction hash");
}
if (!/^0x[a-fA-F0-9]{40}$/.test(requiredContractAddress)) {
  throw new Error("DESK_XLAYER_SESSION_ANCHOR_ADDRESS must be a 20-byte hex address");
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "the-desk-finalize-"));
const tmpEventsPath = path.join(tmpDir, "events.jsonl");
const tmpDigestPath = path.join(tmpDir, "digest.md");
const tmpReplayPath = path.join(tmpDir, "replay.md");

try {
  await runDemoFlow(
    {
      eventsPath: tmpEventsPath,
      policyPath: "blackbox/policies.json",
      digestPath: tmpDigestPath,
      replayPath: tmpReplayPath,
    },
    true,
  );

  const stagedEvents = loadEvents(tmpEventsPath);
  const commitment = [...stagedEvents].reverse().find((event) => event.type === "chain.commitment");
  if (!commitment) {
    throw new Error("finalized trace is missing chain.commitment");
  }
  if (commitment.payload.status !== "submitted") {
    throw new Error(`chain.commitment status is ${String(commitment.payload.status)}, expected submitted`);
  }
  if (String(commitment.payload.txHash).toLowerCase() !== requiredTxHash.toLowerCase()) {
    throw new Error("chain.commitment txHash does not match DESK_XLAYER_ANCHOR_TX_HASH");
  }
  if (String(commitment.payload.contractAddress).toLowerCase() !== requiredContractAddress.toLowerCase()) {
    throw new Error("chain.commitment contractAddress does not match DESK_XLAYER_SESSION_ANCHOR_ADDRESS");
  }

  const anchorVerification = await verifySessionAnchorTx({
    txHash: requiredTxHash,
    contractAddress: requiredContractAddress,
    sessionHashBytes32: String(commitment.payload.sessionHashBytes32 ?? ""),
  });
  if (!anchorVerification.ok) {
    throw new Error(`X Layer anchor verification failed: ${anchorVerification.error}`);
  }

  fs.mkdirSync("blackbox", { recursive: true });
  fs.mkdirSync("digest", { recursive: true });
  fs.mkdirSync("demo", { recursive: true });
  fs.copyFileSync(tmpEventsPath, "blackbox/events.jsonl");
  fs.copyFileSync(tmpDigestPath, "digest/latest.md");
  fs.copyFileSync(tmpReplayPath, "demo/replay.md");
  exportDashboardData({
    dataDir: "web/public/data",
    events: stagedEvents,
    policyPath: "blackbox/policies.json",
    replayPath: "demo/replay.md",
    digestPath: "digest/latest.md",
    okxEvidencePath: "docs/evidence/okx-canary.md",
  });

  const manifest = readManifest();
  manifest.xLayerContractAddress = requiredContractAddress;
  manifest.xLayerCommitmentTxHash = requiredTxHash;
  manifest.xLayerExplorerUrl = typeof commitment.payload.explorerUrl === "string" ? commitment.payload.explorerUrl : explorerTxUrl(requiredTxHash);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Finalized trace commitment: ${requiredTxHash}`);
  console.log(`Explorer: ${manifest.xLayerExplorerUrl}`);
  console.log(`Updated ${manifestPath}`);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
}

function requiredEnv(key: string) {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}
