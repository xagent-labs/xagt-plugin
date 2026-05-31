# The Desk — Production Sprint Plan

> **Status: APPROVED — sprint running.** Leon approved 2026-05-17. Codex implements/audits from tmux window 1 (YOLO); Claude Code orchestrates/reviews from window 0. Live progress at `docs/plans/SPRINT_PROGRESS.md`.

---

## Implementation Amendment — Vite/npm Reality (OVERRIDES below)

This amendment supersedes any conflicting detail later in the document. Product framing (The Desk-first, Black Box as trust layer) is unchanged.

**Stack reality (no migration).** Repo is **Vite + TypeScript + React 19**: SPA in `web/`, Node-side TS in `src/`, local API in `scripts/dev-app.mjs` (port 4181), Vite preview on 4173. **Do NOT migrate to Next.js.** No App Router, server actions, or Edge runtime. Build chain is `tsc → dist/`; tests use `node --test` against `dist/tests/*.test.js`.

**Repo-real commands (substitute everywhere for pnpm/Next equivalents):**
`npm install`, `npm run app`, `npm test`, `npm run demo`, `npm run scan`, `npm run replay`, `npm run verify`, `npm run blackbox:verify-chain`, `npm run blackbox:tamper-demo`, `npm run okx:canary`, `npm run anchor:deploy`, `npm run anchor:commit`, `npm run sprint:audit`, `npm run sprint:audit:network`, `npm run submit:check`, `npm run xagt:doctor`, `npm run xagt:setup`, `npm run okx:install:skills`.

**Blocking inputs (narrowed):**
1. **OKX demo credentials** (`OKX_API_KEY/SECRET_KEY/API_PASSPHRASE`, `OKX_DEMO=1`) — if absent, adapter ships in deterministic degraded mode with `PAPER-FALLBACK` badge + Black Box `cex.paper.degraded` event.
2. **OKX Wallet extension** on demo machine (required for G5 live moment).
3. **One live OKX skill path** (OnchainOS `signal` / `trenches` / `security`) with documented fixture fallback per skill.

**Optional / stretch (do NOT block; all have deterministic fallbacks):**
`ANTHROPIC_API_KEY` (reasoning text — fallback: template from `src/fixtures.ts`), `ETHERSCAN_API_KEY`, `CRYPTOPANIC_TOKEN`, Neon / Drizzle / Inngest / Doppler / Fly.io static IP, `LIVE_BROADCAST_CONFIRM`, `X_LAYER_DEPLOYER_PK` + `OKLINK_API_KEY` (G9 has Anvil-fork + cached anchor fallback).

**G3 redefined — durable demo state, not a platform rewrite.** Keep Black Box file-backed at `blackbox/events.jsonl`. Add a sibling `blackbox/state.json` (atomic tmp+rename) or extend `web/public/data/*.json` for tickets, orders, fills, positions. Plain TS modules in `src/state/`. No ORM. Postgres is explicitly cut from the blocking path; consider only if hour 12+ slack exists.

**Execution adapter contract.** `EXECUTION_MODE` env: `fixture | live_read | calldata | xlayer_testnet | cex_paper | cex_live_capped | dex_mainnet_capped`. Default `fixture`. If `cex_paper` requested without creds → degrade to `fixture` + visible badge + Black Box event. Never silently succeed. DEX adapter remains calldata-only; CI grep against `sendRawTransaction` in `src/okx/dex*` stays the gate. **Black Box `verifyChain` precondition is non-negotiable** before any wallet-affecting or paper-execution call.

**OKX Wallet (G5) — mandatory demo scope.** Connect → show address + chain in status bar pill. Sign Black Box receipt (EIP-191 personal sign over canonicalized session tip digest). Testnet anchor through user's connected wallet is **stretch**; server-side anchor via `src/anchor/` remains the demoable path.

**Owner split for the loop:**
- **Claude Code (orchestrator/reviewer + server/contracts):** plan, gate checks, `dev-app.mjs` handlers, `src/state/` module, adapter contracts, Black Box gate wiring, anchor adapter glue, submission preflight, PASS/FAIL telemetry.
- **Codex (implementation/audit partner, YOLO):** README + framing, env scaffolding, scanner adapters + fallbacks, UI surfaces (radar, ticket modal, blotter, evidence drawer, status bar, replay drawer, wallet connect), keyboard map, demo video prep.

**Framing rule (reinforced).** Demo arc = 55s scanner + reasoning + ticket + execution/blotter, 20s Black Box trust badge + replay + anchor link, 15s closer. No forced ceremony interstitial. README opens with The-Desk one-liner.

Below this line: anything referencing `pnpm`, `Next.js`, `app/api/...`, `server actions`, `Drizzle`, `Inngest`, `Neon`, or `Doppler` should be mentally substituted with the equivalents above, OR treated as stretch.

---

---

## 1. Executive Summary

**Product:** **The Desk** — a Bloomberg-style, OKX-powered agent trading terminal.

**One-line description (use everywhere — README, pitch, submission, X post):**
> *The Desk is a Bloomberg-style terminal for AI trading agents. Agents scan markets, propose trades with reasoning, and execute through OKX — every action backed by a tamper-evident receipt anchored on-chain.*

**Sprint goal:** Ship a hackathon-winning version of The Desk in ~15 working hours. Live multi-source scanner, real OKX paper execution, OKX Wallet connect/sign user path, DEX calldata review, and a Black Box trust layer that visibly catches unsafe actions. Lead with the terminal, not the ceremony.

**Hackathon compliance preserved:**
- Builder track submission.
- OKX skill suite used and named in README (OnchainOS `signal`, `trenches`, `security`, `swap`, plus OKX CEX SDK and OKX Wallet connect).
- Public GitHub link.
- One-line description above.
- Submitted via `xagent-plugin submit`.
- Bonus: 1–3 minute README demo video, X post with `#XAgentHackathon`.

**Non-goals:** withdrawal-permissioned keys, mainnet broadcast of any DEX swap, full auth/multi-tenant, regulated trading posture, novel cryptography, marketing landing pages.

---

## 2. Scope

### Will build
- Persistent backend (Neon Postgres + Drizzle + Inngest).
- Live scanner ingest from OnchainOS skills + Dexscreener + GoPlus + CryptoPanic, streaming to UI via SSE.
- Agent loop: deterministic ranker + one LLM call per highlighted ticket for reasoning text (fallback template if LLM fails).
- Pro terminal UX: three-pane shell, radar, ticket detail drawer, order ticket modal, blotter, positions/PnL, evidence drawer, status bar with trust badge, keyboard map, cmdk palette.
- OKX CEX paper/demo execution adapter (`okx-api` SDK with `x-simulated-trading: 1`).
- OKX DEX `/quote` + `/swap` calldata adapter — display only, never broadcast.
- OKX Wallet connect (browser extension via standard EIP-1193) → show address/chain → sign a Black Box receipt payload → optional X Layer testnet anchor transaction.
- Black Box: Postgres-backed hash chain, `verifyChain` gate as precondition for any side-effecting call, replay drawer.
- X Layer testnet anchor of session digest with deterministic fallback (Anvil fork, cached tx hash).
- Kill switches: global halt, cap breach, allowlist, trace integrity, quote expiry, stale scanner.
- README, demo video, X post draft.

### Will NOT build
- DEX mainnet broadcast (calldata only).
- OKX live capped trading **unless** Gate G2 confirms IP-bound live keys exist; default is paper.
- Withdrawal-permissioned keys (forbidden).
- Auth pages, multi-user, multi-workspace UI (seed one user).
- Theme switcher, light theme, mobile responsiveness.
- TradingView Advanced embed, AG Grid, Recharts, Framer Motion.
- Twitter API, Arkham, Dune SQL, Nansen, Telegram scrape, The Graph subgraphs.
- ZK proofs, sparse Merkle trees, novel cryptography.
- Onboarding tour, marketing landing pages.

---

## 3. Milestones (Hard-Gated)

Each gate is **blocking**: the loop does not advance past a failing gate. **CC** = Claude Code (server/data/contracts). **CX** = Codex (UI/UX/components). Joint = both.

### G1 — Baseline lock + README framing update
- **Goal:** Freeze working prototype, install The-Desk framing in README so judges who land on GitHub immediately see the new product.
- **Scope:** Tag `v0-baseline`. Rewrite README first paragraph to the one-liner from §1. Replace "Agentic Wallet Ops Center" headline with "The Desk." Move cryptography/Black Box content to a "Trust layer" subsection. Keep submission/hackathon metadata at top. Add architecture diagram link placeholder.
- **Pass criteria:** Fresh clone shows current prototype running. README opens with The-Desk one-liner. No reference to "ceremony" in first 200 words.
- **Review checks:** Diff of README; tag exists; current demo still runs.
- **Hard stop / cut:** N/A. Non-negotiable.
- **Owners:** CC = tag + repo hygiene. CX = README rewrite + diagram placeholder.
- **Demo impact:** Foundational. Without framing, judges see "same as last week."

### G2 — OKX skill / hackathon compliance check + secrets provisioning
- **Goal:** Confirm hackathon submission won't fail on policy, and every key/env var the build needs is loaded.
- **Scope:** Verify Builder-track eligibility. Confirm `xagent-plugin submit` flow. Provision: OKX CEX **demo** key (mandatory), OnchainOS project key, X Layer testnet wallet (0.2 OKB), OKLink API key, Etherscan key, CryptoPanic token. Load via Doppler or `.env.local`. Add `gitleaks` pre-commit. Run `grep -r NEXT_PUBLIC_` check. Build `/api/health` route that returns 200 only when every required env is present + each provider returns 200 on a read call.
- **Pass criteria:** `pnpm run health` returns all green from a clean clone. `xagent-plugin submit --dry-run` (or equivalent) shows no missing fields. No secret in git history (`gitleaks detect`).
- **Review checks:** Doppler/env list matches research §3. `health` route output captured to `docs/checks/health.txt`. `xagent-plugin` doctor/preflight output captured.
- **Hard stop / cut:** Any leaked key → rotate immediately. If OnchainOS approval is delayed, fall back to documented sandbox-shared key; do NOT advance scanner gate until this is unblocked.
- **Owners:** CC = adapters, health route, signing test. CX = `.env.example`, README "Setup" section.
- **Demo impact:** Indirect but blocking. Failed credentials at demo = no demo.

### G3 — Persistent backend + Black Box core
- **Goal:** Replace in-memory state with durable Postgres + hash-chained event log.
- **Scope:** Provision Neon. Push Drizzle schema for `users`, `workspaces`, `policies`, `sessions`, `blackbox_events`, `agent_runs`, `scans`, `opportunities`, `tickets`, `orders`, `fills`, `positions`, `alerts`, `secrets_metadata`, `audit_logs`. Implement `lib/blackbox.ts` with `canonicalize`, `hashEvent`, `appendEvent`, `verifyChain`. Server actions: `proposeTicket`, `confirmOrder`, `verifyChain`, `anchorSession`, `getSession`. Seed one user + one workspace + one policy.
- **Pass criteria:** Insert 10 events → corrupt one row → `verifyChain` returns `{ok:false, brokenAt:N}` → undo corruption → `{ok:true}`. Race-condition test on `UNIQUE(sessionId, seq)` passes.
- **Review checks:** Unit tests for hash chain. `drizzle-kit push` clean. Seed runs idempotently.
- **Hard stop / cut:** None for chain core. Defer `agent_runs` table if time short.
- **Owners:** CC = schema, blackbox lib, server actions, seed. CX = none (waits on contract).
- **Demo impact:** Invisible to judges but unlocks every later demoable behavior.

### G4 — Live scanner + agent scoring/reasoning
- **Goal:** The radar is alive. Real rows arrive within 90s of `pnpm dev`. Selecting one shows agent-written reasoning.
- **Scope:** Adapters with 1.5s timeout + fallback for OnchainOS `signal`, `trenches`, `security`, Dexscreener, GoPlus, CryptoPanic. Inngest cron `scan-radar` (every 60s) writes to `opportunities`. `lib/agents/{scanner,reasoner,policy,router}.ts` — reasoner is deterministic ranker plus **one Claude/LLM call per selected ticket** for reasoning text, cached by opportunity id, falls back to template on failure or timeout. SSE endpoint `/api/stream/[sessionId]` emits new opportunities.
- **Pass criteria:** Within 90s of cold start, radar has ≥5 real rows from ≥3 sources. Selecting a row populates a reasoning paragraph in ≤2s (or template fallback ≤200ms). Killing the LLM endpoint still renders template text.
- **Review checks:** Source attribution badge on each row. Trace shows `scanner.fetched` and `reasoner.completed` events. Manual test with one adapter forced to throw still produces a populated radar.
- **Hard stop / cut:** If 4+ adapters fail to integrate by hour 8, ship with mandatory four (OnchainOS `signal` + `trenches` + `security`, Dexscreener) and document the cut.
- **Owners:** CC = adapters, Inngest, agent loop, LLM call. CX = radar table, source badges, reasoning panel inside ticket drawer.
- **Demo impact:** **Largest single demo impact.** This is the "Bloomberg for agents" claim made visible.

### G5 — OKX Wallet connect/sign user path
- **Goal:** A judge can click "Connect Wallet," see their OKX Wallet address + chain in the status bar, and sign a Black Box receipt payload that lands in the trace.
- **Scope:** EIP-1193 detection (`window.okxwallet` first, `window.ethereum` fallback). Connect button → request accounts → write `wallet.connected` Black Box event with `{address, chainId}`. "Sign receipt" action: serializes the current session tip digest into an EIP-191 personal-sign message, requests signature, stores `{address, sig, digest}` as a `wallet.receipt.signed` event. If chain is X Layer testnet, optionally invoke `SessionAnchor.commit(digest, sessionId)` via the connected wallet (user-pays gas, no server key).
- **Pass criteria:** Connect works with OKX Wallet extension installed. Sign produces a recoverable signature (verified server-side with viem `recoverMessageAddress`). Trace contains both events. If extension not installed, UI shows fallback CTA + install link, does not crash.
- **Review checks:** Manual run with OKX Wallet in Chrome. Server-side signature verification unit test. Network throttled test → user sees pending state, no double-signs.
- **Hard stop / cut:** If on-chain anchor via user wallet is flaky, cut it; keep connect + sign. Server-side anchor via deployer key (G9) remains the demoable path.
- **Owners:** CC = signature verification, server actions. CX = connect button, wallet status pill in status bar, sign flow modal, install-fallback CTA.
- **Demo impact:** **High.** This is the moment a judge realizes "I can use this with my own wallet."

### G6 — Order ticket + execution blotter + positions/PnL
- **Goal:** Pro trader UX — propose a trade, confirm with `Enter`, watch it flow through states, see it land in a blotter and update PnL.
- **Scope:** Order ticket modal: side toggle, qty, type (limit/post-only only, no market), TIF, live quote ticker, est. cost/fees/slippage, policy preflight block, evidence summary. Blotter table with 7 states (`proposed → staged → quoted → confirmed → submitted → filled/canceled/failed`) as color-coded badges. Positions table reading from `fills`. Single equity line via Lightweight Charts. Keyboard map: `n` new ticket, `Enter` confirm, `Esc` cancel, `b/s` side, `m/l` type, `j/k` row nav, `g r/b/p/x` nav, `?` help, `⌘K` palette.
- **Pass criteria:** Press `n` on a radar row → modal pre-filled. `Enter` triggers server action and emits `order.confirmed` Black Box event. Blotter row appears within 500ms. Equity line updates after first fill.
- **Review checks:** Backward state transitions rejected. Idempotent `clOrdId` test (re-submitting same ticket id → no duplicate). Keyboard map test from `?` modal.
- **Hard stop / cut:** Drop equity chart first if time short; positions table second; keep blotter + ticket + keymap.
- **Owners:** CC = order state machine, server actions, state guards. CX = ticket modal, blotter, positions, equity chart, keymap hook.
- **Demo impact:** **High.** This is the "it actually trades" beat.

### G7 — OKX CEX paper/demo execution adapter
- **Goal:** Pressing `Enter` on an order in `cex_paper` mode results in a real OKX demo-trading fill in <10s.
- **Scope:** `lib/adapters/okx-cex.ts` using `okx-api` SDK with `x-simulated-trading: 1` header. `Trader` wrapper enforces `INSTRUMENT_ALLOWLIST`, `MAX_NOTIONAL_USD`, no market orders. REST polling on `GET /api/v5/trade/order` until terminal (1–2s interval, 30s timeout). Each state transition writes a Black Box event. Order pipeline emits `cex.order.placed`, `cex.order.filled`, `cex.order.canceled`, `cex.order.failed`.
- **Pass criteria:** In `EXECUTION_MODE=cex_paper`, place→fill round-trip on `BTC-USDT` demo completes in <10s with blotter live-updating. Cap-breach unit test: requesting $500 with $200 cap → rejected with `risk.cap.breached` event.
- **Review checks:** Idempotency: re-submitting same ticket → OKX returns `clOrdId` duplicate error → handled gracefully. Allowlist denial test.
- **Hard stop / cut:** If live capped mode is requested but IP binding fails, lock mode to `cex_paper`. Document in README.
- **Owners:** CC = adapter, trader wrapper, polling loop, tests. CX = none (consumes via server actions).
- **Demo impact:** **Critical.** Without this, the "it trades" claim is hollow.

### G8 — OKX DEX quote/calldata adapter (review-only)
- **Goal:** A user can request a DEX swap quote for an allowed pair and see the constructed calldata + tx envelope; mainnet broadcast is structurally impossible.
- **Scope:** `lib/adapters/okx-dex.ts` calls `/api/v5/dex/aggregator/quote` for display, then `/swap` to build calldata, returns `{tx: {to, data, value, gas}, broadcast: false}`. UI shows quote, route, calldata hex preview, "Sign with wallet (testnet only)" button visible only when wallet is connected to X Layer testnet. CI grep test asserts `sendRawTransaction` / `sendTransaction` are absent from `lib/adapters/okx-dex.ts`.
- **Pass criteria:** Quote returns within 2s for `ETH→USDC` on X Layer testnet. Calldata renders. CI grep passes. Mainnet calldata view shows `MAINNET CALLDATA` label and the testnet-sign button is disabled.
- **Review checks:** Slippage cap enforced. Allowlist enforced. Calldata sanity check unit test.
- **Hard stop / cut:** If `/swap` endpoint requires extra approval flow we don't have time for, ship `/quote`-only and document calldata as "next."
- **Owners:** CC = adapter, CI grep, tests. CX = calldata viewer, route diagram, mode badge.
- **Demo impact:** Medium — proves the on-chain story without risking funds.

### G9 — Black Box enforcement + X Layer anchor or honest fallback
- **Goal:** Every execution adapter refuses to run if `verifyChain` fails. Each closed session is anchored on X Layer testnet with a visible explorer link.
- **Scope:** Wire `verifyChain(currentSession).ok` as precondition in `lib/guard.ts`; failure flips to halt state and writes `trace.integrity.failed` event. Deploy `SessionAnchor.sol` to X Layer testnet via Foundry; verify on OKLink. `lib/adapters/xlayer-anchor.ts` posts `commitDigest(rootDigest, sessionId)` with deployer key. `anchorSession` server action writes `sessions.anchorTxHash` and `session.anchored` event. Replay drawer with verify button + tip hash + anchor link.
- **Pass criteria:** End-to-end: open session → propose → confirm → CEX paper fill → close → anchor → OKLink shows tx within 60s. Tampering with a row → `verifyChain` red → next execution attempt blocked with visible reason.
- **Review checks:** Contract verified on OKLink (manual check). Anchor tx hash captured to `docs/checks/anchor.txt`.
- **Hard stop / cut:** If X Layer testnet RPC is unreachable at demo time, switch to local Anvil fork with `chainId=1952`, deploy same bytecode, anchor against fork; surface a banner in UI honestly disclosing fork mode. Cached anchor tx hash from earlier rehearsal is acceptable evidence.
- **Owners:** CC = contract deploy, anchor adapter, guard, integrity test. CX = replay drawer, verify button, anchor link button.
- **Demo impact:** **High** — the trust-layer payoff. Also the safety story when judges ask "what stops bad actions?"

### G10 — Pro terminal UX cleanup + keyboard flow + status bar
- **Goal:** The interface looks and feels like a terminal — Bloomberg + Linear + `htop` — not a SaaS dashboard.
- **Scope:** Lock dark-only palette (bg `#0A0B0D`, fg `#E6E7EA`, borders `#1F2227`, green `#19C37D`, red `#E5484D`, amber `#F5A524`). Geist Mono, `tabular-nums`, right-aligned numbers, `rounded-md` max. Three-pane shell + 24px status bar with: session id short, agent count, current tip hash (clickable → opens replay), wallet pill, mode badge, last-action latency. cmdk palette with all nav + actions. `?` keymap modal. Sonner toasts for kill-switch trips and anchor confirmations.
- **Pass criteria:** Every demo state reachable in ≤2 keystrokes. Status bar updates within 500ms of any state change. Visual diff against research §4 dark-only spec.
- **Review checks:** Screenshot at 1440p included in PR. Keymap modal lists every binding. Tab order sensible.
- **Hard stop / cut:** Drop Sonner toast styling polish; drop cmdk command icons; never cut the status bar.
- **Owners:** CC = telemetry endpoints for status bar. CX = full UI polish, palette, keymap modal, status bar wiring.
- **Demo impact:** Medium-high — the perceptual lift that makes the product feel "real."

### G11 — Demo package + submission readiness
- **Goal:** Fresh-clone rehearsal passes. README, video, X post, and `xagent-plugin submit` are ready.
- **Scope:** Fresh git clone on a clean machine. `pnpm install && doppler run -- pnpm dev`. Run the 90s demo arc from §9 twice; time each run. README final pass: hero one-liner, what it is, OKX skill list with links, architecture diagram, run-locally instructions, security posture (verbatim from research §6), wedge sentence, license. Record 1–3 minute demo video; commit as `docs/demo/the-desk.mp4` and embed in README. Draft X post text (saved to `docs/demo/x-post.md`) with `#XAgentHackathon`. Dry-run `xagent-plugin submit`. Capture artifact in `docs/checks/submit-dry-run.txt`.
- **Pass criteria:** Both rehearsal runs land in 85–95s, blotter never shows `failed`, anchor link opens, verifyChain green. `xagent-plugin submit --dry-run` clean. README contains all hackathon-required fields.
- **Review checks:** Video plays end-to-end. X post under 280 chars including hashtag. README renders correctly on github.com.
- **Hard stop / cut:** Cut order (only if forced): live capped CEX → paper. Live X Layer anchor → cached + Anvil fork. Live scanner → fixture replay (1 source at minimum stays live).
- **Owners:** CC = submission preflight, fresh-clone health check. CX = README polish, video record, X post.
- **Demo impact:** This **is** the submission.

---

## 4. 15-Hour Timeline (Priority Order + Cut Lines)

Times are notional, treat as ~1h units. **Cut line A** is what ships if we hit 12h. **Cut line B** is what ships if we hit 10h.

| Hour | Block | Gate | Owner |
|---|---|---|---|
| 0.0–1.0 | Baseline lock + README framing | G1 | CC + CX |
| 1.0–2.5 | Secrets + hackathon preflight + health route | G2 | CC + CX |
| 2.5–4.0 | Persistent backend + Black Box chain | G3 | CC |
| 2.5–4.0 | Repo + design system + shell scaffold (parallel) | G10 prep | CX |
| 4.0–6.0 | Live scanner adapters + agent loop + SSE | G4 | CC |
| 4.0–6.0 | Radar table + ticket drawer + reasoning panel (parallel) | G4 / G6 prep | CX |
| 6.0–7.0 | OKX Wallet connect + sign receipt | G5 | CC + CX |
| 7.0–8.5 | Order ticket modal + blotter + state machine | G6 | CC + CX |
| 8.5–10.0 | OKX CEX paper adapter + round-trip test | G7 | CC |
| 10.0–11.0 | OKX DEX quote/calldata + viewer | G8 | CC + CX |
| 11.0–12.5 | X Layer anchor + Black Box enforcement gate | G9 | CC + CX |
| 12.5–13.5 | UX polish, status bar, keymap, cmdk, toasts | G10 | CX |
| 13.5–14.5 | Fresh-clone rehearsal ×2, README final, video, X post | G11 | Joint |
| 14.5–15.0 | Submission preflight + `xagent-plugin submit` dry-run + buffer | G11 | Joint |

**Cut Line A (12h reached, 3h left):** Skip G8 calldata viewer polish (ship `/quote` only). Skip equity chart in G6. Keep everything else; lean into G11.
**Cut Line B (10h reached, 5h left):** Cut G8 entirely. Cut positions table from G6. Demo arc swaps DEX-calldata beat for a second scanner-driven trade. Black Box and anchor still ship.
**Cut Line C (emergency, 7h reached):** Cut G5 wallet connect (judges sign nothing; trust badge becomes server-anchored only). Pitch shifts to "agents + execution + receipts," wallet connect demoed via screenshot only. Avoid this if at all possible — G5 is the WOW moment.

---

## 5. Env / API / Key Checklist Leon Must Provide Before Implementation

Each line is **blocking unless marked OPTIONAL**. Use exactly these variable names.

```
# --- OKX CEX (subaccount, read+trade ONLY, no withdraw) ---
OKX_API_KEY=                # demo key first, live later (OPTIONAL for live)
OKX_API_SECRET=
OKX_PASSPHRASE=
OKX_SUBACCOUNT_NAME=hh-agent-demo
OKX_API_BASE=https://www.okx.com    # or app.okx.com / eea.okx.com per jurisdiction
OKX_DEMO=1                  # 1 = simulated trading header on; default for sprint

# --- OKX OnchainOS (Web3 / DEX Aggregator) ---  BLOCKING
OKX_DEX_API_KEY=
OKX_DEX_API_SECRET=
OKX_DEX_PASSPHRASE=
OKX_DEX_PROJECT_ID=

# --- X Layer testnet ---  BLOCKING (deployer); OPTIONAL (OKLink)
X_LAYER_TESTNET_RPC=https://testrpc.xlayer.tech/terigon
X_LAYER_TESTNET_CHAIN_ID=1952        # verify with `cast chain-id`
X_LAYER_DEPLOYER_PK=                 # ≤0.2 OKB at all times; never reused on mainnet
X_LAYER_SESSION_ANCHOR_ADDR=         # filled after G9 deploy
OKLINK_API_KEY=                      # OPTIONAL — verify-on-OKLink only

# --- Scanners ---  BLOCKING (Etherscan); OPTIONAL (CryptoPanic)
ETHERSCAN_API_KEY=
CRYPTOPANIC_TOKEN=

# --- Database ---  BLOCKING
DATABASE_URL=                        # Neon serverless Postgres

# --- LLM for reasoning ---  BLOCKING
ANTHROPIC_API_KEY=                   # for live reasoning paragraph; template fallback if missing

# --- Execution gates (server-only) ---  BLOCKING
EXECUTION_MODE=fixture               # fixture|live_read|calldata|xlayer_testnet|cex_paper|cex_live_capped|dex_mainnet_capped
MAX_NOTIONAL_USD=200
DAILY_NOTIONAL_CAP_USD=1000
MAX_ORDERS_PER_DAY=20
INSTRUMENT_ALLOWLIST=BTC-USDT,ETH-USDT,SOL-USDT,USDC-USDT
KILL_SWITCH_GLOBAL=false
LIVE_BROADCAST_CONFIRM=              # leave EMPTY; "I_UNDERSTAND_RISKS" required to enable broadcast
```

**Pre-sprint decisions Leon must commit to (block start of G2):**
1. Jurisdiction → which OKX entity (global / US / EEA)? Affects whether live capped CEX is even possible.
2. Live CEX appetite → $50–$200 real or paper-only? Recommendation: paper.
3. OKX Wallet extension installed on demo machine? (required for G5 live demo)
4. Anthropic key or fallback to template-only reasoning?
5. Static-IP path for OKX live key (Fly.io/Railway) — only needed if (2) = real.

---

## 6. Test Protocol

**Commands:**
- `pnpm test` — unit (blackbox hash, trader caps, signature recovery, calldata sanity, allowlist).
- `pnpm test:integration` — Inngest functions, scanner round-trip with mocks.
- `pnpm test:e2e` — Playwright: connect-wallet flow (mocked provider), order ticket → blotter, replay drawer verify.
- `pnpm run health` — provider preflight; must be green before any demo.
- `grep -r "sendRawTransaction\|sendTransaction\|eth_sendUserOperation" lib/adapters/okx-dex.ts` → must be empty.
- `gitleaks detect --source . --no-banner` → must be clean.
- `cast chain-id --rpc-url $X_LAYER_TESTNET_RPC` → must return 1952.

**Manual checks per gate:**
- **G1:** Fresh clone runs prototype; README first paragraph = new one-liner.
- **G2:** `pnpm run health` all green; `xagent-plugin submit --dry-run` clean.
- **G3:** Hash-chain corruption demo runs.
- **G4:** Cold start → radar populated within 90s with attribution badges.
- **G5:** Connect with OKX Wallet → address pill appears → sign receipt → trace shows event.
- **G6:** Press `n` → modal → `Enter` → blotter row in <500ms.
- **G7:** `cex_paper` round-trip <10s on `BTC-USDT`.
- **G8:** Quote in <2s; calldata viewer renders; mainnet-sign button disabled.
- **G9:** Anchor tx visible on OKLink within 60s; corruption blocks next execution attempt.
- **G10:** Demo state reachable in ≤2 keystrokes from any pane.
- **G11:** Two rehearsals in 85–95s with no `failed` state.

**Fallback acceptance:**
- **OKX rate limit / region block:** swap to `cex_paper` immediately; UI banner.
- **X Layer testnet RPC down:** Anvil fork with `chainId=1952` + cached anchor tx hash. Banner discloses fork.
- **LLM reasoning call fails:** template renders within 200ms; no error toast.
- **OnchainOS skill 5xx:** documented fallback per skill (Dexscreener, GeckoTerminal, GoPlus alts).
- **OKX Wallet extension missing on demo machine:** show install CTA + screenshot of completed flow in evidence drawer.

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OKX live key withdrawal-permission leak | Low if disciplined | Catastrophic | Disable withdraw at creation, subaccount only, $200 cap, IP allowlist, gitleaks pre-commit. Default to paper. |
| Region/quota blocks OKX CEX on demo IP | Medium | Demo-stop on live | Default to paper; rehearse on demo network beforehand. |
| OKX Wallet extension missing on judge's machine | Medium | G5 demoability | Demo from Leon's laptop with extension pre-installed; install CTA fallback. |
| OnchainOS approval delayed | Medium | Blocks G4 | Sandbox-shared key fallback documented; do not advance G4 without one. |
| X Layer testnet RPC flaky | Medium | G9 visual | Anvil fork prepared; cached anchor tx hash from rehearsal usable. |
| Vercel dynamic egress IPs break OKX IP allowlist | High if live | Demo-stop | Run OKX adapter on Fly.io with static IP; or accept paper-only. |
| Overbuilding auth | Medium (temptation) | Time sink | Seed one user, no login UI, no roles. Do not pull in Clerk/Auth.js. |
| Overbuilding backend abstractions | Medium | Time sink | Drizzle direct, no repo pattern. Server actions, not tRPC. |
| Prompt injection in agent output causes off-policy proposal | Medium | Caught by gate | Policy is enforcement-of-record; agent output is *input* to policy, never bypasses. |
| Order modal double-submit on Enter chord | Medium | Funds risk on live | `clOrdId` derived from `ticketId+seq`; OKX rejects duplicate. |
| `NEXT_PUBLIC_*` leaks secret to bundle | Low | High | CI grep; `import "server-only"` on every adapter. |
| README contradicts demo reality | Medium | VC follow-up dings | Security-posture section pinned verbatim from research; pitch language pre-written. |
| Forced ceremony interstitial repeats old framing | High if not vigilant | Pitch flat | Trust badge in status bar, **never** auto-modal. Demo arc enforced in §9. |
| Submission tooling breaks at deadline | Low-medium | Submission miss | `xagent-plugin submit --dry-run` captured by hour 13.5; live submit by hour 14.5. |

---

## 8. Final 90-Second Demo Script (The Desk framing)

**Setup (off-camera, pre-roll):** session already running, scanner warm, OKX Wallet extension visible in toolbar, paper-trading subaccount funded with virtual USDT.

> **0:00–0:15 (scanner)** Open The Desk. Radar streams with new rows pulsing in.
> **"The Desk is a Bloomberg-style terminal for AI trading agents. Right now, six live feeds are streaming into the radar — OnchainOS signal, DEX trenches, GoPlus security checks, on-chain flow."**

> **0:15–0:35 (reasoning + execution prep)** Click a high-score row. Ticket drawer slides in with agent reasoning paragraph + evidence tabs.
> **"The agent ranked this opportunity, pulled the supporting evidence, and wrote its thesis in plain English. Let's act on it."**
> Press `n` → order ticket modal pre-fills.

> **0:35–0:55 (live execution)** Press `Enter`. Blotter row appears: SUBMITTED → FILLED on real OKX paper trading.
> **"That's a real fill on OKX — paper mode, capped, real market data. The agent didn't just suggest; it executed."**

> **0:55–1:15 (Black Box trust beat)** Click the tip hash in the status bar → Black Box replay slides in → press `v` → green chain. Click **Anchor TX ↗ X Layer** → OKLink opens.
> **"Every action ships with a tamper-evident receipt — anchored on X Layer. That's why you can let an agent touch a wallet."**

> **1:15–1:30 (closer)** Hover the wallet pill: OKX Wallet address visible.
> **"Connect your OKX Wallet, sign your own receipt. Anyone can build an agent. We built the cockpit that lets you trust one with your wallet. That's The Desk."**

**Time allocation lock:** 55s scanner + execution / 20s Black Box + anchor / 15s closer. Memorize, rehearse cold, never improvise on stage.

---

## 9. Status & Next Step

**This plan is for REVIEW ONLY.** No code has been written. No Codex tasks have been dispatched. No autonomous loop is running. The next action is Leon reviewing this plan and explicitly authorizing the sprint start (e.g., "approved, start the loop"). Until that happens, implementation does not begin.
