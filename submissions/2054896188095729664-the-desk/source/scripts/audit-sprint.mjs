#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import { JsonRpcProvider, id } from "ethers";

const checks = [];
const networkAudit = process.env.DESK_SPRINT_AUDIT_NETWORK === "1";
const XLAYER_TESTNET_CHAIN_ID = 1952;
const XLAYER_TESTNET_RPC_URL = process.env.DESK_XLAYER_RPC_URL || "https://testrpc.xlayer.tech/terigon";
const COMMIT_SELECTOR = id("commit(bytes32)").slice(0, 10).toLowerCase();

function add(id, requirement, evidence, ok) {
  checks.push({ id, requirement, evidence, ok: Boolean(ok) });
}

function exists(path) {
  return fs.existsSync(path);
}

function text(path) {
  return exists(path) ? fs.readFileSync(path, "utf8") : "";
}

function has(path, pattern) {
  return pattern.test(text(path));
}

function loadEvents() {
  if (!exists("blackbox/events.jsonl")) return [];
  return text("blackbox/events.jsonl")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const events = loadEvents();
const executionEvents = events.filter((event) => event.type === "execution.signed_or_simulated");
const commitment = [...events].reverse().find((event) => event.type === "chain.commitment");
const submissionManifest = exists("docs/submission-manifest.json")
  ? JSON.parse(text("docs/submission-manifest.json"))
  : {};
const localRecordingPath =
  typeof submissionManifest.localRecordingPath === "string" && submissionManifest.localRecordingPath.trim()
    ? submissionManifest.localRecordingPath.trim()
    : "demo/recording.mp4";
const coldViewerChecks = Array.isArray(submissionManifest.coldViewerChecks) ? submissionManifest.coldViewerChecks : [];
const coldViewerCorrect = coldViewerChecks.filter((check) => check && typeof check === "object" && check.correct === true).length;
const manifestTxHash = stringValue(submissionManifest.xLayerCommitmentTxHash);
const manifestExplorerUrl = stringValue(submissionManifest.xLayerExplorerUrl);
const manifestVideoUrl = stringValue(submissionManifest.demoVideoUrl);
const manifestBackupUrl = stringValue(submissionManifest.backupRecordingUrl);
const manifestRepoUrl = stringValue(submissionManifest.repoUrl);
const manifestContractAddress = stringValue(submissionManifest.xLayerContractAddress);
const manifestSubmissionTimestamp = stringValue(submissionManifest.submissionTimestamp);
const traceTxHash = typeof commitment?.payload?.txHash === "string" ? commitment.payload.txHash : "";
const traceExplorerUrl = typeof commitment?.payload?.explorerUrl === "string" ? commitment.payload.explorerUrl : "";
const traceContractAddress = typeof commitment?.payload?.contractAddress === "string" ? commitment.payload.contractAddress : "";
const traceSessionHashBytes32 =
  typeof commitment?.payload?.sessionHashBytes32 === "string" ? commitment.payload.sessionHashBytes32 : "";
const hasSubmittedCommitment =
  commitment?.payload?.status === "submitted" &&
  isTxHash(traceTxHash) &&
  isHttpUrl(traceExplorerUrl) &&
  isAddress(traceContractAddress) &&
  isBytes32(traceSessionHashBytes32) &&
  (!manifestTxHash || sameLower(manifestTxHash, traceTxHash)) &&
  (!manifestExplorerUrl || manifestExplorerUrl === traceExplorerUrl) &&
  (!manifestContractAddress || sameLower(manifestContractAddress, traceContractAddress));
const hasSubmissionFields =
  isHttpUrl(manifestRepoUrl) &&
  isHttpUrl(manifestVideoUrl) &&
  isHttpUrl(manifestBackupUrl) &&
  isAddress(manifestContractAddress) &&
  isTxHash(manifestTxHash) &&
  isHttpUrl(manifestExplorerUrl) &&
  timestampIsValid(manifestSubmissionTimestamp) &&
  hasSubmittedCommitment &&
  sameLower(manifestContractAddress, traceContractAddress) &&
  sameLower(manifestTxHash, traceTxHash) &&
  manifestExplorerUrl === traceExplorerUrl;
const networkResults = networkAudit
  ? await resolveUrls({
      explorer: traceExplorerUrl,
      manifestExplorer: manifestExplorerUrl,
      repo: manifestRepoUrl,
      video: manifestVideoUrl,
      backup: manifestBackupUrl,
    })
  : {};
const anchorRpcResult = networkAudit
  ? await verifyAnchorTx({
      txHash: traceTxHash,
      contractAddress: traceContractAddress,
      sessionHashBytes32: traceSessionHashBytes32,
    })
  : { ok: undefined, status: "not-run" };

add(
  "M1",
  "scanner and verifier import shared policy module",
  "src/opportunity-scanner.ts and src/blackbox-core.ts import ./policy/index.js",
  has("src/opportunity-scanner.ts", /from "\.\/policy\/index\.js"/) &&
    has("src/blackbox-core.ts", /from "\.\/policy\/index\.js"/) &&
    exists("src/policy/index.ts"),
);
add(
  "M1",
  "black-box spec exists and maps named incidents",
  "docs/black-box-spec.md includes Freysa, AIXBT, BasisOS, Banana Gun, and ElizaOS",
  exists("docs/black-box-spec.md") && ["Freysa", "AIXBT", "BasisOS", "Banana Gun", "ElizaOS"].every((name) => text("docs/black-box-spec.md").includes(name)),
);

add(
  "M2",
  "browser writes events through POST /api/events",
  "scripts/dev-app.mjs exposes /api/events and web/src/main.tsx posts event drafts",
  has("scripts/dev-app.mjs", /request\.method === "POST" && request\.url === "\/api\/events"/) &&
    has("web/src/main.tsx", /postEventDrafts|api\/events/) &&
    !has("web/src/main.tsx", /buildBlackBoxEvent|event_hash:\s*await|prev_event_hash:\s*"preview"/),
);

add(
  "M3",
  "adversarial verifier tests cover veto-finality, execution ordering, and malformed payloads",
  "tests/blackbox.test.ts contains the required adversarial cases",
  has("tests/blackbox.test.ts", /veto is followed by approval/) &&
    has("tests/blackbox.test.ts", /execution appears before confirmation/) &&
    has("tests/blackbox.test.ts", /malformed allocation payload/),
);

add(
  "M4",
  "Black Box modal has timeline tamper and restore UX",
  "web/src/main.tsx has BlackBoxTimeline and scripts/dev-app.mjs has tamper/restore endpoints",
  has("web/src/main.tsx", /function BlackBoxTimeline/) &&
    has("web/src/main.tsx", /Demonstrate tamper/) &&
    has("scripts/dev-app.mjs", /api\/demo\/tamper/) &&
    has("scripts/dev-app.mjs", /api\/demo\/restore/),
);

add(
  "M5",
  "scanner-policy parity and OKX skill events are covered",
  "property test has 1000 cases; canonical executions have risk.security_check and quote.simulation before execution",
  has("tests/policy-parity.test.ts", /1000/) &&
    executionEvents.every((execution) => {
      const prefix = events.filter((event) => event.ticket_id === execution.ticket_id && event.timestamp < execution.timestamp);
      return prefix.some((event) => event.type === "risk.security_check") && prefix.some((event) => event.type === "quote.simulation");
    }) &&
    executionEvents.length > 0,
);

add(
  "M6",
  "policy console override and failure UI are implemented",
  "policy modal, safety banner, failure banner, takeover modal, and policy.updated support exist",
  has("web/src/main.tsx", /PolicyChangeModal/) &&
    has("web/src/main.tsx", /SafetyBanner/) &&
    has("web/src/main.tsx", /FailureBanner/) &&
    has("web/src/main.tsx", /IntegrityTakeoverModal/) &&
    has("scripts/dev-app.mjs", /"policy\.updated"/),
);

add(
  "M7",
  "SessionAnchor contract and chain.commitment event exist",
  "contracts/SessionAnchor.sol exists and current trace contains chain.commitment",
  exists("contracts/SessionAnchor.sol") && has("contracts/SessionAnchor.sol", /function commit\(bytes32 sessionHash\)/) && Boolean(commitment),
);
add(
  "M7",
  "hard gate: chain.commitment has real X Layer tx hash and explorer link",
  commitment
    ? `status=${commitment.payload?.status ?? "missing"} txHash=${traceTxHash || "missing"} explorerUrl=${traceExplorerUrl || "missing"} contract=${traceContractAddress || "missing"} sessionHashBytes32=${traceSessionHashBytes32 || "missing"} manifestTxMatches=${manifestTxHash ? sameLower(manifestTxHash, traceTxHash) : "missing"} manifestContractMatches=${manifestContractAddress ? sameLower(manifestContractAddress, traceContractAddress) : "missing"} explorerLive=${networkAudit ? okLabel(networkResults.explorer?.ok) : "not-run"} anchorRpc=${anchorRpcResult.status}`
    : "missing chain.commitment event",
  hasSubmittedCommitment && (!networkAudit || (networkResults.explorer?.ok === true && anchorRpcResult.ok === true)),
);

add(
  "M8",
  "radar-first demo script and make demo entrypoint exist",
  "demo/screenplay.md starts on Opportunity Radar and Makefile demo target runs npm run app",
  has("demo/screenplay.md", /Opportunity Radar first screen/) && has("Makefile", /demo:\n\tnpm run app/),
);
add(
  "M8",
  "hard gate: demo recording artifact exists",
  exists(localRecordingPath)
    ? `${localRecordingPath} exists`
    : `${localRecordingPath} missing; demoVideoUrl=${manifestVideoUrl || "missing"} validVideoUrl=${isHttpUrl(manifestVideoUrl)} videoLive=${networkAudit ? okLabel(networkResults.video?.ok) : "not-run"}`,
  exists(localRecordingPath) || (isHttpUrl(manifestVideoUrl) && (!networkAudit || networkResults.video?.ok === true)),
);
add(
  "M8",
  "hard gate: submission external artifacts are recorded",
  `manifest fields complete=${hasSubmissionFields}; cold viewers=${coldViewerChecks.length}; correct=${coldViewerCorrect}; contractMatchesTrace=${sameLower(manifestContractAddress, traceContractAddress)}; txMatchesTrace=${sameLower(manifestTxHash, traceTxHash)}; explorerMatchesTrace=${manifestExplorerUrl === traceExplorerUrl}; repoLive=${networkAudit ? okLabel(networkResults.repo?.ok) : "not-run"}; backupLive=${networkAudit ? okLabel(networkResults.backup?.ok) : "not-run"}`,
  exists("docs/submission-manifest.json") &&
    hasSubmissionFields &&
    coldViewerChecks.length >= 3 &&
    coldViewerCorrect >= 2 &&
    (!networkAudit || (networkResults.repo?.ok === true && networkResults.backup?.ok === true && networkResults.manifestExplorer?.ok === true)),
);

const failures = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.id} ${check.requirement}`);
  console.log(`  ${check.evidence}`);
}

console.log("");
if (failures.length > 0) {
  console.log(`SPRINT AUDIT: BLOCKED (${failures.length} failing checks)`);
  process.exitCode = 1;
} else {
  console.log("SPRINT AUDIT: COMPLETE");
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isTxHash(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isBytes32(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function sameLower(left, right) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function timestampIsValid(value) {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

async function resolveUrls(urls) {
  const entries = await Promise.all(
    Object.entries(urls).map(async ([key, url]) => [key, url ? await resolveUrl(url) : { ok: false, status: "missing" }]),
  );
  return Object.fromEntries(entries);
}

async function resolveUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    return {
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      finalUrl: response.url,
    };
  } catch (error) {
    return {
      ok: false,
      status: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyAnchorTx({ txHash, contractAddress, sessionHashBytes32 }) {
  if (!isTxHash(txHash)) return { ok: false, status: "missing tx hash" };
  if (!isAddress(contractAddress)) return { ok: false, status: "missing contract address" };
  if (!isBytes32(sessionHashBytes32)) return { ok: false, status: "missing session hash bytes32" };

  try {
    const provider = new JsonRpcProvider(XLAYER_TESTNET_RPC_URL, XLAYER_TESTNET_CHAIN_ID);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== XLAYER_TESTNET_CHAIN_ID) {
      return { ok: false, status: `wrong chainId ${String(network.chainId)}` };
    }

    const tx = await provider.getTransaction(txHash);
    if (!tx) return { ok: false, status: "transaction not found" };
    if (!sameLower(tx.to ?? "", contractAddress)) {
      return { ok: false, status: `tx.to mismatch ${tx.to ?? "missing"}` };
    }

    const expectedData = `${COMMIT_SELECTOR}${sessionHashBytes32.slice(2).toLowerCase()}`;
    if ((tx.data ?? "").toLowerCase() !== expectedData) {
      return { ok: false, status: "calldata mismatch" };
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return { ok: false, status: "missing receipt" };
    if (receipt.status !== 1) return { ok: false, status: `receipt status ${receipt.status}` };

    return { ok: true, status: `mined block ${receipt.blockNumber}` };
  } catch (error) {
    return {
      ok: false,
      status: sanitizeNetworkError(error),
    };
  }
}

function okLabel(ok) {
  if (ok === true) return "ok";
  if (ok === false) return "fail";
  return "missing";
}

function sanitizeNetworkError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/https?:\/\/[^\s)]+/gi, "[rpc-url-redacted]")
    .replace(/0x[a-fA-F0-9]{64,}/g, "0x[redacted]")
    .replace(/(private[-_ ]?key|secret|api[-_ ]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}
