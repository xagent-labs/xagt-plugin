# Claude Repo, Product, and UX Review

Reviewer: Claude Code (product/architecture lead role)
Repo: `/Users/leonliu/Documents/Codex/2026-05-14/X agent hackathon`
Date: 2026-05-17
Companion artifact: `docs/reviews/CODEX_AUDIT_CAPTURE.md`

## 1. Executive Verdict

**This is a polished hackathon demo with one investor-grade idea trapped inside it.**

What works today: a working live OKX scanner (Solana smart-money + hot tokens + trenches + quote), an append-only hash-chained event log, a policy gate that blocks the canonical CLI demo until confirmation, a tamper-demo, a sanitized canary, and a mission-control UI with a real refresh API. `npm run submit:check` runs clean (14/14 tests, demo trace, chain verify, web build).

What is theater: the **central trust claim ("Black Box proves policy, risk, sizing, quote, confirmation, trace integrity before any OKX signing path")** is not actually enforced where it must be — the browser fabricates `execution.signed_or_simulated` events in client state and never round-trips through `validateExecutionGate`. The verifier itself accepts unordered histories (a later approval overrides an earlier veto; an execution event before confirmation is "allowed" once a later confirmation arrives). The scanner reports `policy: allowed` for an opportunity whose proposed slippage (250 bps) already exceeds policy max (100 bps).

Verdict: **hackathon-demo grade today, prototype-grade with one focused sprint, production-grade is at least 6–8 weeks away** (real signing, durable storage, signed anchor, schema validation, multi-chain). For the submission deadline, the right move is to harden the *trust narrative* and cut the *mode-list* claims that aren't actually wired.

## 2. Product Thesis

### What is strong

- **The framing**: "agents propose; the Black Box decides; OKX Wallet only signs after." That is a real category — *policy-gated wallet authority* — and it is not the same product as a token scanner, copy-trade bot, or dashboard.
- **The artifact**: a hash-chained, ticket-scoped event log with required-events-before-execution gating is the right primitive. The fact that there's a `tamper-demo.ts` that visibly breaks verification is a strong judge moment.
- **The OKX skill surface coverage**: scanner uses signal + hot tokens + trenches + swap quote in one pass; canary uses security token-scan. That's a credible "we actually integrate" story rather than name-dropping.
- **Mission Control as a single Opportunity Radar with Stage / Confirm + simulate buttons** is the right top-level UX; tickets/policy/replay/digest as modals is the right shape.

### What is unclear (or claimed but not true)

- "Six-seat trading desk" — five real seats (Yield Manager is a stub at `src/okx/skill-adapter.ts:204`). Reporter is also passive (writes digest only).
- "Execution Modes" table in README lists fixture / live-read / calldata / xlayer-testnet / mainnet-capped. Only `fixture` is implemented end-to-end. `live-read` is partial (read-only adapters). The others are UI dropdown values with no behavior behind them (`web/src/main.tsx:1127`).
- "Default execution is simulated" — true for the CLI demo, but the *browser* path emits a `simulated` execution event that the canonical verifier never sees. The trust claim and the implementation are out of sync.
- "Tamper-evident" — the chain detects naive edits, but events are written to a local file (`blackbox/events.jsonl`) with no signing/anchoring (`src/blackbox-core.ts:44`). Someone who can edit one line can rewrite the whole file and recompute hashes.
- "Live OKX evidence is bound to wallet decisions" — the scanner attaches OKX raw evidence to opportunities, but the opportunity → ticket → execution chain re-encodes a fixture-shaped payload (`web/src/main.tsx:1234`). The actual OKX response hash is not carried into the execution event.

### What should be cut

- `mainnet-capped` mode from the policy panel dropdown until there is real-funds wiring + cap enforcement + a separate, signed approval surface. Today it is a UI footgun.
- Yield Manager seat from the agent grid (or label it `stubbed for v1` in the README too, not only in the seat).
- The "Run safe simulation" one-shot button in TradeConsole, unless it goes through the canonical verifier — currently it skips ahead by previewing a projected gate (`web/src/main.tsx:946`), which is the same shape as the browser-fabricated execution bug.
- Solana `豆豆` and other non-ASCII symbol passthrough on the Opportunity Radar table until you decide whether judges will see meme-token unicode well in screen-share.

## 3. Architecture Map

```
                      ┌────────────────────────────────────────┐
                      │ onchainos CLI  (OKX/OnchainOS skills)  │
                      │ signal | hot-tokens | trenches | swap  │
                      │ security | wallet                       │
                      └──────────────┬─────────────────────────┘
                                     │ JSON over stdout
              ┌──────────────────────┼──────────────────────────┐
              │                      │                          │
        scoutCandidates,        opportunity-scanner       okx-canary
        riskCheck, quote        (live aggregation +       (read-only
        (skill-adapter.ts)      preliminary scoring)      evidence file)
              │                      │
              ▼                      ▼
       runDemoFlow            scan opportunities ─────► web/public/data/
       (orchestrator.ts) ──┐                           opportunities.json
                           │                           docs/evidence/
                           ▼                           opportunity-scan.md
                  blackbox/events.jsonl ◄──── appendEvent
                  (hash-chained, local file)
                           │
                           ▼
                  validateExecutionGate ─── loadPolicy(blackbox/policies.json)
                  verifyEventChain
                           │
                           ▼
                  renderDigest, renderReplay → digest/latest.md, demo/replay.md
                                                                 │
                                                                 ▼
                                                       exportDashboardData
                                                       → web/public/data/*
                                                            │
              ┌─────────────────────────────────────────────┘
              ▼
   scripts/dev-app.mjs  (POST /api/scan triggers `npm run scan`)
              │
              ▼
   vite preview @ 4173  ──► web/src/main.tsx
                            ├─ Opportunity Radar (renders /data/opportunities.json)
                            ├─ TradeConsole (manual intent stepper)
                            ├─ Policy modal (mutates client policy state)
                            └─ Black Box / Digest / Evidence modals (read-only)
```

Execution modes claimed:

| Mode | Where it lives | Actually implemented? |
| --- | --- | --- |
| `fixture` | CLI demo + browser drafts | Yes (sole supported path) |
| `live-read` | scanner + skill-adapter | Partial — reads, but doesn't feed an execution event |
| `calldata` | policy dropdown only | No |
| `xlayer-testnet` | policy dropdown only | No |
| `mainnet-capped` | policy + verifier check | No (cap exists in code; signing path absent) |

Key seams:

- **Trust seam #1**: scanner → browser opportunity → drafted events. Browser builds and hashes events with `window.crypto.subtle` (`web/src/main.tsx:1457`). These never round-trip through `validateExecutionGate` server-side before being treated as "Black Box" entries.
- **Trust seam #2**: `blackbox/events.jsonl` is the only authority. There's no separate signed/anchored artifact; the file is overwritable in place (`writeEvents` truncates, `src/blackbox-core.ts:44`).
- **Trust seam #3**: policy.json is loaded once at boot for the CLI demo and on each scan; the *browser* edits policy in local React state (`PolicyPanel`), so policy edits in the demo UI never persist and never affect the next CLI verify.

## 4. Hard Risks

### Security

- **Browser-fabricated execution events** (`web/src/main.tsx:1380`, `1396`, `253–266`). The `simulateOpportunity` path constructs a complete `candidate.created → … → execution.signed_or_simulated → receipt.verified` sequence in client state and appends to React state, bypassing the local API and the canonical verifier. If a judge clicks "Confirm + simulate" the UI shows a "signed via OKX Agentic Wallet (simulated)" event hash with no server-side validation. Independent finding by Codex (CODEX_AUDIT_CAPTURE.md §4).
- **Unauthenticated local command runner** (`scripts/dev-app.mjs:35`). `POST /api/scan` runs `npm run scan` with the inherited environment (which loads `.env` via `src/env.ts`) and writes repo artifacts. CORS is restricted to `127.0.0.1:4173`, but any process on the local machine can hit it. Acceptable for a dev demo, not acceptable inside the product framing. There is no nonce, no auth, no rate limit.
- **Policy is client-mutable in a panel that also displays "Executor may proceed"** (`web/src/main.tsx:1083`). Toggling off `requiresUserConfirmation` or `requiresTraceIntegrity` flips the banner to "allowed" without re-running the canonical verifier or recording an audit event. A demo viewer could mistakenly read this as "policy approved this action."
- **`onchainos.ts` sanitize regex** redacts 32+ char hex and likely-secret kv patterns, but it allows full `tokenContractAddress` strings through (40+ hex). For Solana base58 addresses that's fine; for EVM addresses, an attacker bouncing data through a logged failure path could exfiltrate addresses anyway. Lower priority.

### Correctness

- **Veto is not final**. `validateExecutionGate` uses `latestEvent(...)` for risk verdict (`src/blackbox-core.ts:181`). Codex empirically verified a chain `risk.verdict=veto → risk.verdict=approved` returns `allowed: true`. The same flaw applies to ordering: an `execution.signed_or_simulated` written before `user.confirmed` becomes "allowed" once a confirmation is appended later.
- **Malformed payloads throw** (`src/blackbox-core.ts:258`). `allocation.sized` without `sizeUsd` throws inside `numberPayload`, not "blocked." A real agent emitting a bad payload would crash the verifier instead of failing closed.
- **Scanner / Black Box policy parity is broken**. `evaluatePolicy` (`src/opportunity-scanner.ts:361`) ignores slippage, yet the proposed order it emits uses `slippageBps: 250` for medium-risk candidates (line 327). The policy in `blackbox/policies.json` caps slippage at `100`. The radar can therefore mark an opportunity `policy: allowed` for an order that the Black Box verifier would reject.
- **Mode is overstated**. `scan.mode` is set to `live` whenever the scanner returned *any* opportunities (`src/opportunity-scanner.ts:135`). A scan that pulled signal data but failed the quote step is still labeled live.
- **`src/opportunity-scanner.ts:275`** uses `candidate.chain.toLowerCase().replace(/\s+/g, "")` to derive a CLI chain flag — for any non-Solana chain this will pass `"xlayer"`, `"base"`, `"ethereum"`, which happens to match `cliChain()` in skill-adapter but is duplicated logic; non-Solana scans aren't actually attempted (only `--chain solana` is invoked in `collectLiveSources`). Solana-only path is a soft contradiction with the multi-chain claim in `chainNames`.

### Privacy / Secrets

- `.env` exists and is loaded by `src/env.ts` (read-only inspection avoided per safety rules). Local API inherits the full environment into spawned `npm run scan`. Acceptable; flag for hardening.
- `runOnchainJson` sanitize pass is present. No evidence of secrets in `docs/evidence/`. The visible `docs/evidence/okx-canary.md` shows truncated JSON at line ~185 — cosmetic but degrades trust optics for judges who scroll.

### Live-data reliability

- The canary is dated `2026-05-14T13:21:51`; if the demo is run on a different day the file will look stale (Codex noted this). Refresh on demo day.
- Scanner relies entirely on `onchainos` CLI; if quota/region/login blocks it, the *demo* falls back to a single fixture opportunity (`fallbackOpportunities`) — silently, except for `mode: "fixture-fallback"`. There is no UI-level alarm.

### Wallet execution claims

- README and X-post draft both say "OKX Agentic Wallet only signs after a tamper-evident Black Box proves…" Today *no signing actually happens*. The simulated signature is a string like `sim_okx_wallet_xlayer_0001`. This is fine if labeled "simulated." It is misleading if a judge reads "signs after" as describing what happens in this repo. Codex flagged the same risk.

## 5. UX Review

### First 10 seconds

- Sidebar "Radar" is active by default and the workspace headline is `Opportunity Radar`. Good. The session card shows trace status + scanner mode + a short session hash. Good.
- The radar table renders fine but uses chain names + unicode symbols (`豆豆`, `SkibidiRizz`) that confuse the demo's "trustworthy ops center" tone. Even at the meme-token cohort, this is jarring for institutional judges.
- No onboarding overlay or "what am I looking at?" callout. A judge dropped into the page has no immediate visual that ties radar → ticket → Black Box → digest.

### Scanner workflow

- Refresh button (`Refresh OKX scan`) hits the local API and re-renders. UX is honest about loading state. Good.
- `refreshError` shows the raw error string if the API is down (e.g., if `npm run app` wasn't used and they're on the static `web:preview`). This is acceptable, but the error format is technical (`Live refresh API unavailable: …`). Soft signal that this is a dev tool.

### Ticket review

- Selecting a row populates the right-hand `OpportunitySummaryCard`. Stage and Confirm + simulate buttons appear. Disabled states are clear (`isStaged`, `isSimulated`).
- The card doesn't surface that "Confirm + simulate" writes events into local React state only. To a user this looks like "you just signed." This is the trust-claim collision again — solvable with a one-line label *"Simulating locally — no Black Box append yet"*, but better solved by actually routing through the API.

### Modals

- `AppModal` is a single rendering primitive — good. Click-outside-to-close (mouseDown on backdrop) is correct. Escape key handling is **missing**, focus trap is **missing**, `aria-modal` is set but no focus return.
- Black Box / Digest / Evidence modals render raw `<pre>` text. Useful for a developer; not great for a judge. The replay is the *most demo-relevant* artifact and it's the least styled.
- TicketModal grid is information-dense and works on a 13"+ screen; cramped below ~1100px.

### Policy editing

- Edits in `PolicyPanel` mutate React state and immediately update the gate banner. The verifier consequence is shown ("Executor may proceed" / "Executor is blocked") via `evaluateGate`.
- Three concerns: (a) edits are *not* persisted as Black Box events, so a viewer can't see who toggled what; (b) `requiresUserConfirmation` and `requiresTraceIntegrity` can be disabled in the same surface that shows the safety verdict, and that screenshot is dangerous if shared; (c) `executionMode` dropdown exposes modes that don't exist.

### Empty / loading / error

- Initial `Promise.all` in `useEffect` (`web/src/main.tsx:170`) has no `.catch`. A missing `/data/opportunities.json` (e.g., if someone runs `vite preview` without `npm run scan` first) leaves the page in "Loading Agentic Wallet Ops Center…" forever (Codex same finding).
- Empty opportunity list has no "no live opportunities — try refresh" state.
- Source-health failure is shown only inside the `OpportunityCard` modal, not on the main radar.

### Mobile / narrow viewport

- `.app-shell` uses `grid-template-columns: 244px minmax(0, 1fr)` with no responsive breakpoint visible in the first 120 lines of styles.css. The 244px sidebar at < 600px viewports likely steals most of the screen. Not a hackathon blocker.

### Judge demo clarity

- Best path right now: open the app, click Refresh, point at the source-health pills, click a ready opportunity, click Stage, click Confirm + simulate, open Black Box modal, scroll to bottom, open Replay, point at "Trace integrity: valid". That story is real and convincing.
- Worst risk: a judge clicks Confirm + simulate twice or on a non-ready ticket and sees blocked-but-also-staged behavior, then opens TradeConsole modal and finds a parallel manual stepper that looks like an entirely different product. The two surfaces don't share state visibly; cut or unify.

## 6. Competitive Differentiation

This product collides with multiple categories. Brief positioning vs each:

| Category | Examples (May 2026) | Where we lose | Where we can win |
| --- | --- | --- | --- |
| Token scanners | DexScreener, Birdeye, GMGN | They have richer data, deeper history, copy-trade graphs | We don't *just* scan — we gate. A scanner with a built-in execution policy and a signed audit trail is a different artifact. |
| Wallet dashboards | Zerion, DeBank, Rabby | Better portfolio depth, established users | We're a *control plane* for agent-driven actions, not a viewer for human-driven actions. |
| Smart-money copy-trade bots | Trojan, BullX, Photon | Faster fills, real signing, large user base | Those products *do not show* their decision logic. Ours does — and that's the moat for institutions, treasuries, and DAOs that need an audit trail. |
| Agentic trading copilots | A growing pack of GPT-wrappers | Conversational UX, broader knowledge | They typically can't *prove* what they did. The Black Box trace is a hard differentiator if we actually anchor and sign it. |
| Risk / compliance terminals | Chainalysis, TRM, Elliptic for crypto; Bloomberg AIM for tradfi UX | Brand, distribution, depth | Those are post-hoc audit. We are *pre-execution* policy enforcement. Closer to a tradfi pre-trade compliance gateway than a forensics tool. |
| Account abstraction / policy signing | Safe (smart accounts), Privy, Turnkey, Fireblocks | Real signing infra | We layer *agentic decision provenance* on top — *why* did the agent propose this — which these products don't address. |

**The one defensible wedge:** *the verifiable, signed agent-decision log that wallet signing infrastructure can require before signing.* Everything else in the repo is supporting evidence for that wedge.

## 7. Top 15 Prioritized Improvements

| # | Improvement | Severity | User impact | Complexity | Owner |
| --- | --- | --- | --- | --- | --- |
| 1 | Route browser "Confirm + simulate" through `POST /api/append` that runs `validateExecutionGate` server-side and rejects fabricated execution events. | Critical | Restores the central trust claim end-to-end. | Medium (new API endpoint; refactor `appendDrafts` to call it). | Codex |
| 2 | Verifier hardening: veto-finality (any prior `verdict:veto` in the chain blocks regardless of later events), ordered prefix check (required events must precede `execution.signed_or_simulated`), schema-validate payloads and convert errors to gate errors. | Critical | Closes Codex finding #3 / #11 and a class of "looks valid but isn't" bugs. | Medium (refactor `validateExecutionGate`; add ordered-prefix walk). | Codex |
| 3 | Scanner ↔ policy parity: `evaluatePolicy` calls the same shared policy module used by the verifier, including slippage and chain. Remove the divergent `opp_*` ticket that displays `policy: allowed` while proposing 250 bps. | Critical | Eliminates the "scanner says allowed, verifier says no" mismatch. | Medium (extract a shared policy helper; refactor scanner). | Codex |
| 4 | Cut `mainnet-capped` and `xlayer-testnet` from the policy dropdown and from the README modes table until each has a real path. Keep `fixture` and `live-read`; clearly label both as simulated. | High | Removes the biggest source of "claims > implementation" risk for judges. | Low (UI + README edit). | Claude |
| 5 | Add a single "what is this?" hero overlay on Radar that names the 3 trust moves: Scan → Gate → Sign. Dismissible, persists in localStorage. | High | First-10-second clarity; judge demo lift. | Low (one component + CSS). | Claude |
| 6 | Sign the session hash with a per-session ephemeral keypair (e.g., a Node `crypto.generateKeyPairSync('ed25519')`) and embed `policy_hash`, `evidence_hashes`, `signer_pubkey` into the last event. Publish the pubkey alongside `web/public/data/integrity.json`. | High | Turns "tamper-evident" from a local-file hash into a verifiable signature. | Medium. | Codex |
| 7 | Persist policy edits as Black Box events (`policy.updated` type) with a delta payload. Show "edits since session start" badge in the policy panel. Currently policy edits are silent client state. | High | Removes the "toggle off → screenshot 'allowed' → mislead" failure mode. | Medium. | Codex |
| 8 | Fix the `useEffect` Promise.all error path so a missing `/data/*` file shows a recovery state instead of permanent "Loading…". | High | Stops the worst hidden demo-day failure. | Low. | Claude |
| 9 | Refresh `docs/evidence/okx-canary.md` on demo day and fix the truncated meme-trenches JSON block. Bind canary timestamp to the visible session card. | High | Removes "is this stale?" judge question. | Low. | research / DevRel |
| 10 | Black Box modal: replace the raw `<pre>` replay with a structured timeline (ticket → seat → event → hash + status pill). Replay is the central proof artifact; it should look like proof. | Medium | UX lift on the most-judged surface. | Medium. | Claude |
| 11 | Split `submit:check` into `verify:ci` (no generation) and `build:demo` (regenerates artifacts). Today the "check" rewrites the trace, digest, and public data, which is not a verification. | Medium | Cleaner story when a judge runs the check themselves. | Low. | Codex |
| 12 | Hide or relabel the TradeConsole "Run safe simulation" button — it preview-projects a gate result inside the browser and then writes drafts. Either route through #1 or remove. | Medium | Removes a parallel "looks signed" surface. | Low. | Claude |
| 13 | Add adversarial tests: veto-then-approve, execution-before-confirmation, malformed payload, scanner-policy-mismatch. | Medium | Demonstrable proof of the hardening from #2/#3. | Medium. | Codex |
| 14 | Yield Manager seat: relabel everywhere as `coming soon` and remove from the seat grid for the demo, or wire one trivial passive-rotation suggestion to make it real. Today it confuses the "six seats" pitch. | Low | Honesty + simpler narrative. | Low. | Claude |
| 15 | Add a 60-second screen-share path in `demo/screenplay.md` that explicitly walks Radar → Ticket → Black Box → Replay → Digest, with timing marks. Today the screenplay starts with the Wallet Action Console, which contradicts README's "first panel is the Radar." | Low | Demo discipline. | Low. | Claude |

## 8. Codex Audit Synthesis

Where Claude and Codex **agree** (high-confidence findings, both arrived at independently):

- **Browser-fabricated execution** is the most important bug to fix and the one most likely to be caught by a judge poking buttons. (Codex finding #2 ↔ Claude Risk §4 / Improvement #1.)
- **Verifier accepts unordered histories and lets a later approval override a prior veto.** Codex empirically verified this with `node --input-type=module`. (Codex finding #1 ↔ Claude Improvement #2.) **High confidence.**
- **Scanner ↔ verifier policy mismatch (slippage 250 bps vs cap 100).** Both reviewers independently spotted the same Strays-style entry. (Codex finding #5 ↔ Claude Improvement #3.) **High confidence.**
- **`submit:check` is generator + verifier conflated** — both flag that this rewrites artifacts on what is supposed to be a check. (Codex finding #8 ↔ Improvement #11.)
- **Live mode is overstated** in `scan.mode` and across the execution-mode table. (Codex findings #4, #6 ↔ Improvement #4.)
- **Skill adapter is fixture-shaped even in live mode** — live mode attaches raw JSON to fixture-named candidates. (Codex finding #4 ↔ Claude §2 "What is claimed but not true.")
- **Local API is unauthenticated and writes repo state.** (Codex finding #7 ↔ Claude §4 Security.)

Where Claude and Codex **disagree or emphasize differently**:

- **Anchoring / signing the session hash.** Codex proposes binding policy + evidence + signer into the final event and signing the session. Claude treats this as Improvement #6 — important but not the *first* thing to fix. Browser-fabrication (#1) and verifier-ordering (#2) should ship before any signing work, because signing a flawed log just makes the flaws durable. Order matters.
- **Scope of OKX integration**. Codex frames "live demo adapter is fixture-shaped" as a category-level problem. Claude agrees, but for the 48–72h window the right move is to *narrow the claim* (Improvement #4) rather than chase real live execution. Disagree on scope, agree on direction.
- **Yield Manager and "six-seat" framing.** Codex says cut. Claude says cut visually but keep a one-line `coming soon` so the narrative still has the future story. Soft disagreement.

Where Claude needs **further verification**:

- Codex's claim that the Promise.all has no catch — confirmed in `web/src/main.tsx:170` directly; no `.catch`. Verified.
- Codex's claim that `web/public/data/opportunities.json` line 468 carries `slippageBps: 250` while marked `policy.allowed: true` — not directly read, but consistent with `src/opportunity-scanner.ts:323-327` (medium-risk paths set 250 bps and `evaluatePolicy` ignores slippage). High confidence pending one read.
- Codex's specific test that `risk.verdict=veto → risk.verdict=approved` returns `allowed:true` — corroborated by reading `latestEvent` (`src/blackbox-core.ts:155`) which returns the *last* match. Confirmed.

**Net synthesis**: Claude and Codex converge on the same three-issue critical pair (browser fabrication, verifier ordering, scanner-policy parity). These should be the spine of the next sprint regardless of the broader research outcome.

## 9. Recommended Next Sprint Theme

**Sprint theme: "Prove the Black Box."**

The product's only durable competitive claim is *verifiable, policy-gated, agent decision provenance*. Today the claim is hand-wavy at the most-clicked surface (the browser). One focused sprint turns it from a demo into a fact:

1. **Spine** (must ship): Improvements 1, 2, 3 — server-side gate enforcement, ordered/veto-final verifier, scanner-policy parity. These three together make the trust claim actually true.
2. **Frame** (should ship): Improvements 4, 5, 8, 11 — cut the modes that aren't real, add a one-screen narrative for judges, fix the loading-forever bug, split submit:check.
3. **Lift** (if time): Improvements 6, 7, 10 — signed session hash, audited policy edits, structured replay UI. Each of these makes the same claim more believable.
4. **Cuts**: Improvements 4 (modes), 12 (TradeConsole one-shot), 14 (Yield Manager visibility).

Out of scope for this sprint: real wallet signing on testnet/mainnet, multi-chain expansion beyond Solana, additional agent seats, conversational UX. Defer until after submission.

The deep research prompt (`docs/prompts/DEEP_RESEARCH_COMPETITIVE_LANDSCAPE_PROMPT.md`) should be used to *confirm or sharpen the wedge framing in §6* and to inform the final demo narrative; it should not produce a different sprint than the one above, because the spine bugs are structural and would need fixing regardless of competitive positioning.
