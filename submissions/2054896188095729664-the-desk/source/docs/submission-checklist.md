# Submission Checklist

## Required Fields

Record final values in `docs/submission-manifest.json`; `npm run sprint:audit` reads that manifest directly.

| Field | Current Value | Status |
| --- | --- | --- |
| Project name | Agentic Wallet Ops Center: The Desk | ready |
| Repo URL | `https://github.com/Leonwenhao/the-desk` | ready |
| Demo video URL | unset | user will add after X post |
| Backup recording | unset | optional |
| X Layer contract address | unset | optional; current demo trace is local proof only |
| X Layer session tx | unset | optional; current demo trace is local proof only |
| X post | `demo/X_POST.md` | ready for review |

## Manifest Requirements

`npm run sprint:audit` validates these fields strictly:

- `repoUrl`, `demoVideoUrl`, and `backupRecordingUrl` must be HTTP(S) URLs.
- `xLayerContractAddress` must be a 20-byte hex address.
- `xLayerContractAddress` must match `chain.commitment.payload.contractAddress`.
- `xLayerCommitmentTxHash` must be a 32-byte hex tx hash and must match `chain.commitment.payload.txHash`.
- `xLayerExplorerUrl` must be an HTTP(S) URL and must match `chain.commitment.payload.explorerUrl`.
- Network audit must fetch the X Layer testnet transaction by RPC, confirm it is mined successfully, confirm `tx.to` is the recorded `SessionAnchor` contract, and confirm calldata is exactly `commit(bytes32)` for `chain.commitment.payload.sessionHashBytes32`.
- `submissionTimestamp` must parse as a concrete timestamp.
- `coldViewerChecks` must contain at least three viewers, and at least two must have `correct: true`.

## Final Local Checks

```bash
npm run submit:check
npm run sprint:audit
DESK_SPRINT_AUDIT_NETWORK=1 npm run sprint:audit
make demo
find demo -maxdepth 3 -type f \( -name "*.mp4" -o -name "*.mov" \)
grep "chain.commitment" blackbox/events.jsonl
```

## Finalize X Layer Anchor

After a real X Layer testnet commitment exists, export only the non-secret address/tx values in the shell and run:

```bash
DESK_XLAYER_SESSION_ANCHOR_ADDRESS=0x... \
DESK_XLAYER_ANCHOR_TX_HASH=0x... \
npm run submission:finalize-anchor
```

This stages the rebuilt trace in a temp directory, verifies the supplied transaction by X Layer testnet RPC, then writes the canonical trace, dashboard data, and `docs/submission-manifest.json` only after the tx is proven to call `SessionAnchor.commit(bytes32)` with the recorded trace hash. It does not read `.env`.

## Submission Truth Rules

- Do not claim mainnet execution.
- Do not claim an X Layer session anchor unless `chain.commitment.payload.status` is `submitted`, the explorer link resolves, and `DESK_SPRINT_AUDIT_NETWORK=1 npm run sprint:audit` verifies the recorded tx by X Layer testnet RPC.
- If the app shows `Anchor not configured`, the submission should describe simulated execution plus local Black Box proof only.
- The video should start on Opportunity Radar, not the manual intent console.
- The close should be tamper red propagation, then restore to green.
