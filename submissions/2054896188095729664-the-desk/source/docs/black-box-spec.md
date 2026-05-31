# Black Box Spec

## Purpose

The Black Box is the canonical decision log for Agentic Wallet Ops Center. A wallet-affecting action is only eligible for simulated or testnet signing after the log proves policy, risk, sizing, route, confirmation, and trace integrity gates.

## Policy Source Of Truth

Policy loading and shared policy evaluation live in `src/policy/index.ts`. Scanner and verifier code must import that module instead of carrying separate cap, chain, quote, or confirmation checks.

The baseline policy schema is:

- `maxPositionPct`: maximum ticket size as a percentage of book value.
- `maxSlippageBps`: maximum route slippage.
- `allowedChains`: chain names eligible for execution.
- `signingMode`: signing surface, currently simulated by default.
- `executionMode`: product execution mode, currently fixture by default.
- `realFundsCapUsd`: hard cap for any future real-funds mode.
- `requiresUserConfirmation`: whether affirmative human confirmation is required.
- `requiresTraceIntegrity`: whether the event hash chain must verify before execution.
- `requiredEventsBeforeExecution`: ordered gate events required before signing.

## Event Types

- `candidate.created`: Scout opens a wallet-action ticket.
- `risk.security_check`: Risk Officer records the `okx-security` response hash used by the verdict.
- `risk.verdict`: Risk Officer approves or vetoes the ticket.
- `allocation.sized`: Allocator records size, book value, and cap context.
- `route.quoted`: Executor records route, chain, amount, slippage, and quote evidence.
- `quote.simulation`: Executor records the `okx-onchain-gateway` simulation result hash.
- `user.confirmed`: Orchestrator records affirmative human confirmation and cap.
- `execution.signed_or_simulated`: Executor records simulated or testnet signing output.
- `receipt.verified`: Executor records receipt or simulation verification.
- `policy.updated`: Orchestrator records acknowledged operator policy changes.
- `chain.commitment`: Orchestrator records the X Layer testnet session-hash commitment result.
- `report.digest`: Reporter records read-only digest output.

## Ordered Semantics

The valid execution prefix is:

1. `candidate.created`
2. `risk.security_check`
3. `risk.verdict`
4. `allocation.sized`
5. `route.quoted`
6. `quote.simulation`
7. `user.confirmed`
8. `execution.signed_or_simulated`
9. `receipt.verified`
10. `chain.commitment`

For an execution event to be valid, every required event in `requiredEventsBeforeExecution` must exist on the same ticket before the execution event. Events appended after execution do not retroactively authorize that execution.

## Veto Finality

A `risk.verdict` payload with `verdict: "veto"` is final for the ticket. Later approvals do not clear the veto. Any future override must be a distinct, explicitly specified event type with its own policy gate, signer, reason, and reviewer identity. No override event exists in the current product.

## Policy Overrides

Disabling `requiresUserConfirmation` or `requiresTraceIntegrity` requires an operator acknowledgement modal. The UI must append a `policy.updated` event with the changed key, previous value, next value, acknowledgement flag, operator id, and before/after policy hashes before the local control changes. While either safety gate is disabled, a red override banner must remain visible until the operator re-enables the gate.

## Trace Integrity

Every event commits to the previous event through:

- `prev_event_hash`: hash of the previous canonical event, or `sha256:genesis`.
- `event_hash`: hash of the event material excluding `event_hash` and display-only integrity fields.
- `session_hash`: hash of the ordered event hashes for the session.

If `requiresTraceIntegrity` is true, a broken pointer, missing hash, or recomputed hash mismatch blocks execution.

## X Layer Anchor

After `receipt.verified`, the backend computes the current verifier `session_hash` and attempts to commit it to the minimal X Layer testnet `SessionAnchor.commit(bytes32)` contract. The `chain.commitment` payload must include:

- `chain: "X Layer Testnet"`
- `chainId: 1952`
- `sessionHash` and `sessionHashBytes32`
- `status: "submitted"` with `txHash` and `explorerUrl`, or `status: "not-configured" | "failed"` with a non-blocking error

Anchor failure never authorizes or blocks the simulated wallet action. It only proves whether this demo session was additionally committed on X Layer testnet. The implementation must not fabricate a transaction hash when no testnet transaction was submitted.

## Signature Scheme

M1 locks the expected scheme even though the current implementation is still local:

1. Compute `event_hash` for each canonical event.
2. Compute `session_hash` from ordered `event_hash` values.
3. Bind each signing-eligible execution to the active policy hash, risk evidence hash, route quote hash, confirmation payload hash, and session hash.
4. Sign the session hash with a server-side session key or wallet/testnet key.
5. Optionally commit the post-receipt session hash to X Layer testnet and record `chain.commitment`.
6. Record signer fingerprint and signature verification status before showing "Executor may proceed".

Until server-side signing lands, UI signatures are demo-only and must not be treated as authoritative Black Box proof.

## Threat Model

| Incident / Pattern | Failure Mode | Required Black Box Gate |
| --- | --- | --- |
| Freysa | Prompt or policy bypass convinces an agent to violate withdrawal constraints. | Ordered policy gate plus immutable confirmation and trace-integrity checks before execution. |
| AIXBT | Social or market signal is mistaken for sufficient execution authority. | `candidate.created` is only evidence; `risk.security_check`, `risk.verdict`, `allocation.sized`, `route.quoted`, `quote.simulation`, and `user.confirmed` remain mandatory. |
| BasisOS | Automated financial agent over-acts from stale or weak context. | Route quote freshness, policy cap, explicit chain allowlist, and receipt verification are bound into the event chain. |
| Banana Gun | Fast trading flow hides routing, slippage, or execution risk. | `route.quoted` must include slippage and chain checks, then `quote.simulation` must bind the OKX gateway result hash before signing. |
| ElizaOS | Agent framework/plugin output is accepted without provenance. | OKX skill provenance and evidence hashes are recorded as event payloads and committed through the hash chain. |

## M1 Review Rules

- Scanner and verifier import `src/policy/index.ts`.
- Policy constants and `evaluatePolicy()` are not duplicated in scanner or verifier code.
- Any unmapped incident in the threat model blocks the milestone.
