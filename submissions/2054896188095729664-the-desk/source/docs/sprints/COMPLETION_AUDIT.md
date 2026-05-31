# Completion Audit — PROVE THE BLACK BOX

**Date:** 2026-05-17
**Status:** blocked, not complete

## Objective Restatement

Implement the full PROVE THE BLACK BOX sprint without inspecting `.env`, without mainnet or real-funds execution, and without destructive git operations. Each milestone must update `docs/sprints/SPRINT_PROGRESS.md` with changed files, verification commands, and gate result. The sprint is only complete when M1-M8 hard gates are satisfied by real artifacts, not proxy green checks.

## Prompt-To-Artifact Checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| M1 shared policy module in `src/policy/index.ts` | `src/opportunity-scanner.ts` and `src/blackbox-core.ts` import `./policy/index.js`; `docs/black-box-spec.md` exists | pass |
| M1 incident threat model | `docs/black-box-spec.md` and README map Freysa, AIXBT, BasisOS, Banana Gun, and ElizaOS to gates | pass |
| M2 browser cannot write execution events directly | `scripts/dev-app.mjs` owns `POST /api/events`; web posts drafts; no client event-hash fabrication pattern found | pass |
| M3 verifier hardening | `tests/blackbox.test.ts` covers veto-then-approve, execution-before-confirmation, malformed allocation | pass |
| M4 Black Box tamper UX | `BlackBoxTimeline` plus `/api/demo/tamper` and `/api/demo/restore`; prior browser/CDP check passed | pass |
| M5 scanner-policy parity | `tests/policy-parity.test.ts` runs 1000 cases; canonical execution has `risk.security_check` and `quote.simulation` before execution | pass |
| M6 policy console + failure UI | Policy-change modal, red banner, failure countdown, integrity takeover, and `policy.updated` support exist | pass |
| M7 `SessionAnchor.sol` + `chain.commitment` event | Contract exists; canonical trace contains `chain.commitment` after receipt | local implementation pass |
| M7 explorer hard gate | Current `chain.commitment.payload.status` is `not-configured`; no `txHash`; no `explorerUrl` | blocked |
| M8 radar-first screenplay | `demo/screenplay.md` starts on Opportunity Radar and closes on tamper red -> restore green | pass |
| M8 `make demo` entrypoint | `Makefile` target runs `npm run app`; verified local stack when port binding permitted | pass |
| M8 demo recording | `demo/recording.mp4` is absent | blocked |
| M8 submission artifacts | `docs/submission-manifest.json` still has empty external fields and no passing cold-viewer results | blocked |

## Executable Audit

Run:

```bash
npm run sprint:audit
DESK_SPRINT_AUDIT_NETWORK=1 npm run sprint:audit
```

Current result:

```text
SPRINT AUDIT: BLOCKED (3 failing checks)
```

Failing checks:

1. M7 hard gate: `chain.commitment` lacks a real X Layer testnet `txHash` and `explorerUrl`.
2. M8 hard gate: `demo/recording.mp4` is missing.
3. M8 hard gate: submission manifest still has empty external fields, invalid formats, trace mismatches, or missing cold-viewer results.

## Completion Boundary

Do not mark the sprint complete until:

- `chain.commitment.payload.status === "submitted"` with a real X Layer testnet `txHash`.
- The explorer URL resolves.
- Network audit fetches the X Layer testnet tx by RPC, confirms it is mined successfully, confirms `tx.to` is the recorded `SessionAnchor` contract, and confirms calldata is exactly `commit(bytes32)` for the recorded `sessionHashBytes32`.
- `demo/recording.mp4` exists or the uploaded video URL is recorded.
- Backup upload, cold-viewer check, final public repo URL, X Layer fields, and submission timestamp are recorded.
- Manifest contract address, tx hash, and explorer URL match the `chain.commitment` event.
- Network audit verifies the explorer, repo, demo video, and backup recording URLs resolve.
- `npm run sprint:audit` returns `SPRINT AUDIT: COMPLETE`.

For final X Layer anchoring, prefer:

```bash
DESK_XLAYER_SESSION_ANCHOR_ADDRESS=0x... DESK_XLAYER_ANCHOR_TX_HASH=0x... npm run submission:finalize-anchor
```

That command updates the canonical trace and manifest from the same submitted testnet transaction.
It stages the trace first and does not update canonical artifacts unless X Layer testnet RPC verifies the tx recipient, mined receipt, and `commit(bytes32)` calldata.
