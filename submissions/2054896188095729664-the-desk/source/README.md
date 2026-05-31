# The Desk

The Desk is a Bloomberg-style terminal for AI trading agents. Agents scan markets, propose trades with reasoning, and execute through OKX — every wallet-affecting action is backed by a tamper-evident Black Box receipt, with optional X Layer anchoring when configured.

## Hackathon Snapshot

| Field | Value |
| --- | --- |
| Builder track | X Agent Hackathon Builder track |
| One-line description | The Desk is an agent trading cockpit where AI agents scan markets and OKX Agentic Wallet execution unlocks only after a tamper-evident Black Box proves risk, policy, quote, and confirmation gates. |
| Parent platform | Agentic Wallet Ops Center |
| GitHub | `https://github.com/Leonwenhao/the-desk` |
| Architecture diagram | `docs/architecture/the-desk-architecture.png` placeholder |
| Submit command | `xagt-plugin submit --name "The Desk" --intro "Agent trading cockpit where AI agents scan markets and OKX Agentic Wallet execution unlocks only after a tamper-evident Black Box proves risk, policy, quote, and confirmation gates." --repo "https://github.com/Leonwenhao/the-desk"` |
| Demo video | https://x.com/0xHermes_/status/2056159159117025545?s=20 |
| X post | https://x.com/0xHermes_/status/2056159159117025545?s=20 |

## OKX Skill Coverage

The current desk flow is built around these OKX / OnchainOS skill surfaces:

- `okx-dex-signal` for smart-money and whale/KOL signals.
- `okx-dex-trenches` for new-token and meme-launch diligence.
- `okx-security` for token, dApp, transaction, and signature risk checks.
- `okx-dex-swap` for quote and calldata review paths.
- `okx-wallet-portfolio` for wallet holdings and portfolio context.
- `okx-agentic-wallet` for wallet status and signing paths.
- `okx-onchain-gateway` for transaction simulation and status checks.
- `okx-dex-token` for token tape, liquidity, holders, and concentration checks.
- `okx-defi-invest` for passive rotation ideas when available.

## Run Locally

```bash
npm install
npm run app
```

Open `http://127.0.0.1:4173`.

`npm run app` runs the deterministic demo, refreshes the opportunity scan, starts the local API on `http://127.0.0.1:4181`, and serves the Vite app through `scripts/dev-app.mjs`.

Useful sprint commands:

```bash
npm run demo
npm test
npm run submit:check
npm run blackbox:verify-chain
npm run xagt:doctor
npm run okx:install:skills
```

Additional prototype commands:

```bash
npm run scan
npm run replay
npm run verify -- ticket_clean_xlayer
npm run blackbox:tamper-demo
npm run okx:canary
```

Default mode is fixture-backed. To ask the current adapter to try live OKX / OnchainOS command surfaces first and fall back to fixtures if unavailable:

```bash
DESK_OKX_MODE=live npm run demo
```

No mainnet broadcast is part of the required demo. Keep execution in fixture, read-only, paper, calldata-only, or X Layer testnet modes unless a later sprint gate explicitly changes that.

## Product Flow

The first screen is the Opportunity Radar. Scout pulls OKX smart-money signals, hot-token tape, new launch / trenches data, token security evidence, and quote routes into one terminal surface. A trader can refresh the scan, inspect the agent thesis, stage an opportunity, and confirm or reject the proposed wallet action from the same screen.

The desk records:

- `blackbox/events.jsonl` - canonical append-only trace.
- `demo/replay.md` - readable order timeline.
- `digest/latest.md` - Reporter output.
- `web/public/data/*` - Vite dashboard data bundle.
- `docs/evidence/opportunity-scan.md` - sanitized Opportunity Radar evidence.

## Trust Layer

The Black Box is the trust layer behind the terminal. Every event commits to the previous event hash, and execution is blocked unless the ticket has the required risk, allocation, quote, confirmation, and trace-integrity events.

```bash
npm run blackbox:verify-chain
npm run blackbox:tamper-demo
```

The normal trace verifies with a session hash. The tamper demo rewrites one event and proves the trace fails verification. The desk can also record an X Layer testnet session commitment when the testnet anchor environment is configured.

Execution is blocked unless a ticket contains these prior events:

1. `candidate.created`
2. `risk.security_check` with an `okx-security` response hash
3. `risk.verdict` with `approved`
4. `allocation.sized`
5. `route.quoted`
6. `quote.simulation` with an `okx-onchain-gateway` result hash
7. `user.confirmed`

The verifier rejects missing risk, risk vetoes, oversized allocations, missing user confirmation, route slippage above policy, disallowed chains, and broken event hash chains when trace integrity is required.

## X Layer Session Anchor

`SessionAnchor.sol` stores a `bytes32` session hash commitment and emits `SessionCommitted`. The app records the result as `chain.commitment` after the simulated or testnet receipt, and the terminal links to the X Layer explorer when a transaction hash exists.

```bash
npm run anchor:deploy
npm run anchor:commit
```

Current anchor environment names:

- `DESK_XLAYER_ANCHOR_PRIVATE_KEY` - funded X Layer testnet deploy / commit key.
- `DESK_XLAYER_SESSION_ANCHOR_ADDRESS` - deployed `SessionAnchor` address.
- `DESK_XLAYER_RPC_URL` - optional; defaults to X Layer testnet RPC.
- `DESK_XLAYER_ANCHOR_TX_HASH` - optional external tx hash handoff when the commitment was submitted outside this process.

The anchor code refuses non-testnet chain IDs. If key, address, and tx hash are absent, the demo appends `chain.commitment` with `status: "not-configured"` and keeps simulated execution valid.

## Architecture

```text
Scout -> Risk Officer -> Allocator -> Executor -> Reporter
   \          \              \           \          \
    \          \              \           \          -> digest/latest.md
     \          \              \           -> OKX signing / simulation path
      \          \              -> sizing event
       \          -> hard veto or approval
        -> candidate event

All canonical events are committed by the Orchestrator into blackbox/events.jsonl.
Executor must pass blackbox/verify.ts and blackbox/verify-chain.ts before execution.
```

## Agent Roster

| Seat | Critical path | Authority | OKX skill surface |
| --- | --- | --- | --- |
| Scout | Yes | Creates candidate tickets | `okx-dex-signal`, `okx-dex-trenches`, `okx-dex-token` |
| Risk Officer | Yes | Final veto | `okx-security`, holder cluster checks |
| Allocator | Yes | Sizes approved tickets | `okx-agentic-wallet`, `okx-wallet-portfolio`, market data |
| Executor | Yes | Quotes and signs / simulates only after verification | `okx-dex-swap`, `okx-onchain-gateway`, `okx-agentic-wallet` |
| Reporter | Demo path | Writes digest, read-only | Reads the event trace |
| Yield Manager | Stub | Proposes passive rotations | `okx-defi-invest` |

## Live Opportunity Radar

```bash
npm run scan
```

The scanner currently pulls a live Solana opportunity board from OKX / OnchainOS read-only surfaces when available:

- `okx-dex-signal` for smart-money buy alerts.
- `okx-dex-token` for hot-token tape, liquidity, volume, holders, and concentration.
- `okx-dex-trenches` for new meme launch / trenches data.
- `okx-dex-swap` for quote evidence on top candidates.

Each opportunity receives a desk score, risk verdict, policy verdict, proposed capped action, invalidation rule, source-health evidence, and trace ticket id. Ready ideas can be staged and simulated from the terminal; watch and proposed ideas remain blocked or review-only until risk and policy clear.

## Threat Model Summary

| Incident / pattern | Failure mode | Trust-layer gate |
| --- | --- | --- |
| Freysa | Prompt bypass convinces an agent to violate withdrawal constraints. | Ordered policy prefix, human confirmation, and trace integrity are mandatory before execution. |
| AIXBT | Market or social signal is treated as execution authority. | `candidate.created` is evidence only; risk, allocation, quote simulation, and confirmation must follow. |
| BasisOS | Automated financial agent acts from stale or weak context. | Size caps, chain allowlist, quote freshness, and receipt evidence are committed into the hash chain. |
| Banana Gun | Fast trading hides route, slippage, or execution risk. | `route.quoted` and `quote.simulation` bind slippage, chain, and gateway result hash before signing. |
| ElizaOS memory injection | Plugin or memory output corrupts the agent authorization context. | OKX skill provenance and evidence hashes are chained so unsupported context cannot silently authorize execution. |

The longer spec is in `docs/black-box-spec.md`; the submission checklist is in `docs/submission-checklist.md`.

## Execution Modes

| Mode | Purpose | Broadcasts funds |
| --- | --- | --- |
| `fixture` | deterministic review path | No |
| `live_read` | live OKX read-only evidence with simulated execution | No |
| `calldata` | quote / unsigned transaction preview path | No |
| `xlayer_testnet` | testnet signing path when stable | No mainnet funds |
| `cex_paper` | OKX demo-trading execution when credentials exist | No real funds |
| `cex_live_capped` | explicitly capped CEX live mode | Disabled by default |
| `dex_mainnet_capped` | mainnet quote / review mode | No broadcast by default |

Default is `fixture`. Mainnet execution is not part of the required demo and remains blocked by policy caps plus human confirmation.

## X-Agent Setup

```bash
npm run xagt:doctor
npm run xagt:setup
npm run okx:install:skills
```

Project OKX skills are pinned in `skills-lock.json`. If live OKX skills are unavailable during review, deterministic fixtures keep the repo runnable and clearly label execution as simulated.

## Submission

```bash
npm run submit:check
npx @xagt/agent-plugin@latest submit \
  --name "The Desk" \
  --intro "Agent trading cockpit where AI agents scan markets and OKX Agentic Wallet execution unlocks only after a tamper-evident Black Box proves risk, policy, quote, and confirmation gates." \
  --repo "https://github.com/Leonwenhao/the-desk"
```
