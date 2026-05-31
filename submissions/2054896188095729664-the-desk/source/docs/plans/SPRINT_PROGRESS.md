# The Desk — Sprint Progress

**Sprint started:** 2026-05-17
**Orchestrator:** Claude Code (tmux window 0)
**Implementer/auditor:** Codex (tmux window 1, YOLO)
**Plan:** `docs/plans/THE_DESK_PRODUCTION_SPRINT_PLAN.md` (Vite/npm amendment at top)
**Direction memo:** `docs/research/CLAUDE_DIRECTION_FEEDBACK.md`

## Status Legend
`PENDING` not started · `IN PROGRESS` active · `BLOCKED` waiting · `PASS` checks green · `CUT` deferred · `FAIL` needs fix

## Gate Checklist

| Gate | Title | Status | Owner | Last check | Blocker / note |
|---|---|---|---|---|---|
| G1 | Baseline lock + README framing | PASS | Codex (impl) + CC (review) | 2026-05-17 Codex G1 | Repo is not a git repo, so `docs/baseline.md` records the baseline instead of `v0-baseline` |
| G2 | Hackathon compliance + secrets state | PASS | Codex (impl) + CC (review) | 2026-05-17 Codex G2 | Outputs captured in `docs/checks/`; `sprint:audit` has later-gate blockers |
| G3 | Durable demo state (tickets/orders/fills/positions + BB events) | PASS | CC primary | 2026-05-17 G3 PASS | `src/state/store.ts` + `tests/state.test.ts` (7 cases) + dev-app handlers `GET /api/blotter`, `POST /api/tickets`, `POST /api/orders`, `POST /api/fills`; trace-integrity gate enforced before every write |
| G4 | Live scanner + agent scoring/reasoning | PASS | CC (server) + Codex (UI) | 2026-05-17 G4 PASS | `src/agents/reasoner.ts` + `POST /api/reason` + template fallback; tests/reasoner.test.ts. UI radar + reasoning panel + LLM/TEMPLATE pill landed by Codex. Smoke: `/api/reason` returns template (no Anthropic key). |
| G5 | OKX Wallet connect/sign user path | PASS (impl); LIVE pending wallet | Codex (UI) + CC (server) | 2026-05-17 G5 PASS | Connect button + EIP-1193 detection (window.okxwallet → window.ethereum) + sign-receipt + disabled-CTA fallback in web/src/main.tsx. Live signature exercise requires OKX Wallet extension on demo machine. |
| G6 | Order ticket + blotter + positions/PnL | PASS | Codex (UI) + CC (state) | 2026-05-17 G6 PASS | Order ticket modal (limit/post_only only), blotter polling /api/blotter, positions, keyboard map. Server gated by `requireValidTrace`. Note: live meme symbols are outside allowlist — modal correctly shows preflight rejection. |
| G7 | OKX CEX paper/demo execution adapter | PASS | CC | 2026-05-17 G7 PASS | `src/okx/cex.ts` with HMAC signing + simulated-trading header + caps + degraded-no-creds fallback; tests/cex-adapter.test.ts (4 cases) |
| G8 | OKX DEX quote/calldata adapter (review-only) | PASS | CC | 2026-05-17 G8 PASS | `src/okx/dex.ts` returns `{tx, broadcast:false}`; CI grep guard test asserts no broadcast call sites; degraded fixture mode; tests/dex-adapter.test.ts (4 cases) |
| G9 | Black Box enforcement + X Layer anchor (or fork fallback) | PASS (impl); LIVE pending creds | CC | 2026-05-17 G9 PASS | `requireValidTrace()` precondition wired into all dev-app mutation endpoints; existing `src/anchor/xlayer-anchor.ts` handles not-configured / external-tx / Anvil-fork fallbacks. Live anchor needs `X_LAYER_DEPLOYER_PK` + `X_LAYER_SESSION_ANCHOR_ADDRESS`. |
| G10 | Pro terminal UX cleanup + keyboard + status bar | PASS | Codex | 2026-05-17 G10 PASS | Status bar with session id + tip hash + wallet pill + mode badge (PAPER-FALLBACK when fixture); keyboard map; `?` keymap modal; dark palette preserved. |
| G11 | Demo package + submission readiness | PASS (impl); LIVE pending Leon | Joint | 2026-05-17 G11 impl PASS | `npm run submit:check` green (test 44/44 + demo + verify-chain + web:build). `demo/screenplay-the-desk.md` + `docs/demo/x-post.md` drafted. Sprint audit M7/M8 hard gates require: real X Layer tx, `demo/recording.mp4`, populated submission manifest — all need Leon. |

## Active Blockers (LEON ACTION ONLY)
All implementation + integration gates are PASS. Three of the four live-credential paths are now wired and verified end-to-end:
- **DEX quote/calldata: LIVE** (project `6b757f…320f`, smoke `OkxDexAdapter.quote` returned `mode=live, degraded=false`).
- **X Layer testnet anchor: LIVE** — `SessionAnchor` deployed at `0x52f65ceDF8D3308D856607E82524228B9E3e5bF6` from wallet `0x6BaF5EF72A16EcFEE628CB8d83201775CC2BD3F3`. Demo anchor tx `0x090b21b2d87b45026a1089ca7c262909ffa6e562c1dd15a9c4b05bc09b7f272b` mined in block 30568340. Explorer link live.
- **Anthropic reasoning: LIVE** — model `claude-haiku-4-5-20251001`, smoke returned a non-template paragraph.
- **OKX CEX: intentionally OFF** per Leon — on-chain only demo. Adapter remains in PAPER-FALLBACK by design.

Remaining items Leon must complete (sprint audit M8 hard gates):
1. **`demo/recording.mp4`** — 1–3 minute capture per `demo/screenplay-the-desk.md`.
2. **`docs/submission-manifest.json` — populate:** `repoUrl`, `demoVideoUrl`, `backupRecordingUrl`, `submissionTimestamp`, and 3 `coldViewerChecks` with `correct: true`.
3. **OKX Wallet browser extension** on demo machine for the live G5 sign-receipt beat.
4. **`xagent-plugin submit`** — Leon executes when artifacts above are ready (login valid 727 d per G2).

## Cut Decisions (so far)
- Postgres / Neon / Drizzle / Inngest — explicitly cut from blocking path per amendment.
- Doppler / Fly.io static IP — cut; `.env` only.
- Next.js migration — cut; Vite stack preserved.

## Last Check Output
- `npm run xagt:doctor` → PASS (G2).
- `npm test` → **44/44 PASS**.
- `npm run submit:check` → green.
- `npm run demo` → real on-chain anchor written (chain.commitment carries tx `0x090b…272b`).
- `DESK_SPRINT_AUDIT_NETWORK=1 npm run sprint:audit` → **9 PASS / 2 FAIL** (M7 hard gate now PASS with `manifestTxMatches=true, explorerLive=ok, anchorRpc=mined block 30568340`; remaining 2 FAILs need video + manifest URLs).
- Live DEX smoke → `OkxDexAdapter.quote` mode=live, degraded=false.
- Live Anthropic smoke → source=llm, model=claude-haiku-4-5-20251001.

## Demo Arc (locked)
55s scanner + reasoning + ticket + execution/blotter → 20s trust badge + replay + anchor link → 15s closer. No forced ceremony interstitial.
