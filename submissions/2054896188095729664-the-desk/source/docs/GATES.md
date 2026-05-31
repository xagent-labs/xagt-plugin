# Hard Review Gates

## Gate 0: Setup Truth

- `xagt-plugin setup --target all` is attempted.
- `xagt-plugin doctor` passes or the blocker is documented in `docs/SETUP_TRUTH.md`.
- Repo scaffold, README, agents, state, blackbox, scripts, demo docs exist.

## Gate 1: Black Box Core

- Required events are represented.
- Verifier blocks missing risk, vetoes, oversized positions, missing confirmation, quote slippage, and disallowed chains.
- Event log is hash-chained with `session_id`, `prev_event_hash`, and `event_hash`.
- `npm run blackbox:verify-chain` passes and `npm run blackbox:tamper-demo` fails as expected.
- Replay renders readable timelines.

## Gate 2: Agent Handoff

- Scout creates risky and clean candidates.
- Risk Officer vetoes risky and approves clean.
- Allocator only sizes approved tickets.

## Gate 3: Executor

- Executor refuses direct execution when verification fails.
- Executor records quote, confirmation, simulated OKX Agentic Wallet signature, and receipt.

## Gate 4: Demo

- `npm run demo` creates the trace, replay, and digest.
- `npm run app` opens Mission Control with agent seats, ticket queue, policy gate, replay, digest, and OKX evidence.
- README explains X-Agent, OKX Agentic Wallet, X Layer, and skill usage.

## Gate 4b: OKX Evidence

- `npm run okx:canary` writes sanitized read-only evidence to `docs/evidence/okx-canary.md`.
- Live command failures do not break deterministic fixture review.

## Gate 4c: X Layer Session Anchor

- `contracts/SessionAnchor.sol` compiles and exposes `commit(bytes32)`.
- Anchor code refuses non-X Layer-testnet chain IDs.
- `chain.commitment` appears in the trace after `receipt.verified`.
- A real M7 pass requires `chain.commitment.payload.txHash` plus a resolving X Layer testnet explorer link.
- If no funded testnet key/address or external tx hash is configured, the trace must say `status: "not-configured"` instead of inventing a transaction.

## Gate 5: Submission

- `npm run submit:check` passes.
- Demo video and X post are ready.
- `xagt-plugin submit` opens the PR.
