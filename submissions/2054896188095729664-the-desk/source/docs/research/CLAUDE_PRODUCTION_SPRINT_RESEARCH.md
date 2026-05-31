# Agentic Wallet Ops Center / The Desk — 3-Day Sprint Research Report

## 1. Executive recommendation

**Build this:** A Next.js 15 + Postgres (Neon) + Drizzle + Inngest + shadcn/TanStack Table/Lightweight Charts terminal. Wire OKX OnchainOS skills as read-only scanners, OKX CEX (`okx-api` SDK) in **demo trading mode** with a $200 hard cap as the live-execution headline, and OKX DEX Aggregator's `/swap` endpoint in **calldata-only** mode for the mainnet story. Deploy `SessionAnchor.sol` once to X Layer testnet (chainId **1952**, `https://testrpc.xlayer.tech/terigon`) via Foundry, verify on OKLink, commit the Black Box session digest after every demo session. Lead the pitch with the cryptographic ceremony, not the radar.

**Do not build:** real mainnet broadcast, OKX withdrawal-permissioned keys, server-side signing for any chain, X (Twitter) API, Dune SQL custom queries, Arkham (gated approval), Telegram scrape, AG Grid, full TradingView embed, theme switcher, multi-workspace, auth pages.

**Default demo path (90 seconds, locked):**
1. Open The Desk with a session already running — radar streams via SSE, bottom status bar shows `session 7b3f… · 4 agents · tip 9a02b1c4 · 38ms`.
2. Click a high-score row → ticket detail drawer shows OnchainOS-skill evidence + agent reasoning + policy badge.
3. Press `n` → order ticket modal → press `Enter`.
4. **Black Box interstitial (1.5s, deliberate):** three hash-chained events slide in — `policy.checked`, `quote.snapshot`, `order.confirmed`.
5. Blotter row goes `SUBMITTED → FILLED` (OKX demo trading, real fill, no chain latency).
6. Press `g x` → Black Box replay → press `v` → verify chain → green check → click **Anchor TX ↗ X Layer** → OKLink testnet tab opens showing the live commit tx.
7. Close: *"Agents are commoditizing. Agent authority isn't. This is the gate."*

The wedge sentence to memorize: **"Agents are commoditizing. Agent authority isn't. The Desk is the agent-authority layer — a Bloomberg-style terminal where every AI decision is gated by a cryptographic Black Box and anchored to X Layer."**

---

## 2. Provider matrix

| Provider / API / skill | Purpose | Setup | Cost | Reliability risk | 3-day score | Fallback |
|---|---|---|---|---|---|---|
| **OKX CEX REST + WS** (`okx-api` npm) | Live execution headline, demo trading, balances | Demo key in 5 min; live key needs $100+ AUM, IP allowlist | Free | Low (Tier-1 uptime); 14-day inactivity revoke on un-bound keys | **5** | Binance public ticker for price-only fallback |
| **OKX OnchainOS — `okx-dex-signal`** | "Alpha radar" smart-money / KOL flow | OnchainOS project key | Free tier (~5 rps) | Low | **5** | Dexscreener token-boosts |
| **OnchainOS — `okx-dex-trenches`** | New-launch / meme scanner with dev-rep + sniper detection | Same key | Free tier | Low | **5** | Dexscreener `/token-profiles/latest/v1` |
| **OnchainOS — `okx-security`** | Pre-trade honeypot + token risk | Same key | Free tier | Low | **5** | GoPlus + Honeypot.is |
| **OnchainOS — `okx-dex-token`** | Token search, holders, metadata | Same key | Free tier | Low | **4** | GeckoTerminal `/tokens` |
| **OnchainOS — `okx-dex-market`** | Prices, OHLCV K-lines, wallet PnL | Same key | Free tier | Low | **4** | GeckoTerminal OHLCV |
| **OnchainOS — `okx-wallet-portfolio`** | Multichain balances for any address | Same key | Free tier | Low | **4** | Covalent / Alchemy `getAssetTransfers` |
| **OnchainOS — `okx-dex-swap` (quote+build)** | DEX-aggregator quote → calldata, 500+ DEXs, 20+ chains incl. X Layer | Same key + project id | Free tier | Low | **5** (the headline DEX integration) | 1inch quote-only |
| **Dexscreener** | Hot DEX discovery, no key | Just hit URL | Free | Low | **5** | GeckoTerminal `/networks/{n}/pools` |
| **GeckoTerminal** | DEX OHLCV (the only free source) | None | Free, 30 rpm | Low | **5** | Dexscreener pairs |
| **GoPlus Security** | Honeypot/risk on every proposed action; anonymous calls work | None | Free | Low | **5** | Honeypot.is + RugCheck |
| **CryptoPanic** | News ticker | Free token | Free | Low | **4** | Direct RSS (CoinDesk/Block/Decrypt) |
| **Etherscan v2 multichain** | Verified source / ABI / tx history across 50+ EVM chains, one key | One key | Free 5 rps / 100k/day | Low | **4** | OKLink multichain |
| **DefiLlama coins/yields** | Free oracle prices + TVL context | None | Free | Low | **3** | CoinGecko Demo |
| **OKLink (verify + explorer)** | Verify `SessionAnchor`, read anchor receipts | Wallet-signed account + API key | Free | Indexing ~30–90s lag | **4** | Direct `eth_getTransactionReceipt` on X Layer RPC |
| **X Layer testnet RPC** (`testrpc.xlayer.tech/terigon`) | Anchor session digests | Faucet 0.2 OKB/day | Free | 100 rps/IP cap; faucet bot-blocks | **5** | Local Anvil with chainId=1952 + same bytecode |
| **Neon Postgres** | Persistent backend | One-click | Free tier ample | Low | **5** | Railway Postgres |
| **Inngest** | Cron + durable jobs | Mount `/api/inngest` route | Free 50k execs/mo | Low | **5** | BullMQ + Upstash Redis |
| **Vercel** | Deploy | `vercel link` | Pro trial recommended for demo week | No WebSockets (use SSE); 60s Hobby cap | **5** | Railway Node service |
| **Doppler** (or Infisical self-hosted) | Secret management | 10 min | Free for solo | Low | **4** | `.env.local` only + gitleaks pre-commit |
| **X (Twitter) API** | News/social | Pay-per-call, no free tier | $0.005/read | Auth + billing setup | **1** — skip | Farcaster via Neynar (free starter) |
| **Arkham / Nansen / Dune** | Smart-money flow | Approval or paid | $$ | High setup | **1–2** — skip; fake "smart money" with curated whale list + Alchemy `getAssetTransfers` | DIY |

**Locked scanner stack (under 5 hours of integration):** OKX OnchainOS `signal` + `trenches` + `security` + `swap` + Dexscreener + GeckoTerminal + GoPlus + CryptoPanic. Four are keyless. All have explicit fallbacks.

---

## 3. API setup checklist

**OKX CEX (jurisdiction-correct entity — pick one based on your residency).**

1. Sign up on `www.okx.com` (global), `app.okx.com` (US), or `eea.okx.com` (EEA). **Do not VPN around geo-blocks** — frozen account is a demo-killer.
2. Complete identity verification on the main account.
3. **Create a Demo Trading API key first**: Login → Trade → Demo Trading → Personal Center → Demo Trading API → Create. This works regardless of geography. Save key, secret, passphrase. Demo keys do not expire and use real market data. **Build the entire flow against demo on day 1.**
4. **For live trading**, create a subaccount named `hh-agent-demo` and fund it with **$100 USDT max** (OKX requires >$100 AUM before issuing a key). Main account has zero keys, ever.
5. In the subaccount, create a V5 API key. Permissions checkboxes: **Read ✓, Trade ✓, Withdraw ✗** (Withdraw must be off — there is no per-tx approval at API level; one prompt-injection = total loss).
6. Bind an **IP allowlist**. Vercel egress IPs are dynamic, so either (a) run the OKX-calling code on Fly.io/Railway with a static IP and call it from Vercel, or (b) use a static-IP proxy like QuotaGuard. **Unbound keys with trade permission auto-delete after 14 days of inactivity** — bind one.
7. Name keys explicitly: `hh-agent-v1-demo`, `hh-agent-v1-live`. Never reuse across environments (OKX returns error 50114).

**OKX OnchainOS (Web3 / DEX Aggregator).**

1. Apply at `https://web3.okx.com/onchainos/dev-portal`. You get a project ID, key, secret, and passphrase — five required headers per request: `OK-ACCESS-PROJECT`, `OK-ACCESS-KEY`, `OK-ACCESS-SIGN`, `OK-ACCESS-PASSPHRASE`, `OK-ACCESS-TIMESTAMP`.
2. Same HMAC-SHA256 signing scheme as CEX, but tied to the Web3 project (different account namespace).

**X Layer testnet.**

1. Open `https://www.okx.com/xlayer/faucet`. Connect OKX Web3 wallet, solve CAPTCHA, claim 0.2 OKB. **Pre-fund the day before the demo** — faucet bot-blocks under load.
2. Verify chain ID at the shell: `cast chain-id --rpc-url https://testrpc.xlayer.tech/terigon`. OKX docs say **1952**; some aggregators still show the deprecated **195**. Use what the RPC returns.
3. Create an OKLink account, sign a verification, generate `OKLINK_API_KEY`.
4. Deploy `SessionAnchor.sol` with Foundry: `forge create --rpc-url $X_LAYER_TESTNET_RPC --private-key $X_LAYER_DEPLOYER_PK src/SessionAnchor.sol:SessionAnchor`. Wait 60s. Verify: `forge verify-contract <ADDR> src/SessionAnchor.sol:SessionAnchor --verifier oklink --verifier-url https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER_TESTNET --api-key $OKLINK_API_KEY --watch`.

**Free / no-key scanner endpoints — verify reachability and store base URLs only:**
- `https://api.dexscreener.com`
- `https://api.geckoterminal.com/api/v2`
- `https://api.gopluslabs.io/api/v1`
- `https://api.honeypot.is/v2`
- `https://coins.llama.fi`

**Single keyed endpoint to set up:** Etherscan v2 (one key covers 50+ EVM chains) + CryptoPanic free token.

**Disable / rotate / scrub.**
- Disable any existing OKX key with Withdraw permission today.
- Rotate any key that was ever pasted into Cursor/Claude Code chat history.
- Run `gitleaks detect --source . --log-level info` over full history before pushing to a public repo.
- Add pre-commit hook: gitleaks. Add `.env*` to `.gitignore` except `.env.example`.

**Environment variable names (use exactly these — referenced from code, README, Doppler, and Vercel):**

```
# --- OKX CEX (subaccount with read+trade ONLY, no withdraw) ---
OKX_API_KEY=
OKX_API_SECRET=
OKX_PASSPHRASE=
OKX_SUBACCOUNT_NAME=hh-agent-demo
OKX_API_BASE=https://www.okx.com         # or app.okx.com / eea.okx.com
OKX_DEMO=1                               # adds x-simulated-trading header

# --- OKX OnchainOS (Web3 / DEX Aggregator) ---
OKX_DEX_API_KEY=
OKX_DEX_API_SECRET=
OKX_DEX_PASSPHRASE=
OKX_DEX_PROJECT_ID=

# --- X Layer testnet ---
X_LAYER_TESTNET_RPC=https://testrpc.xlayer.tech/terigon
X_LAYER_TESTNET_CHAIN_ID=1952
X_LAYER_DEPLOYER_PK=                     # ≤0.2 OKB at all times; never reused on mainnet
X_LAYER_SESSION_ANCHOR_ADDR=
OKLINK_API_KEY=

# --- Scanners ---
ETHERSCAN_API_KEY=
CRYPTOPANIC_TOKEN=

# --- Database ---
DATABASE_URL=

# --- Execution gates (read by server-only code, never NEXT_PUBLIC_) ---
EXECUTION_MODE=fixture                   # fixture|live_read|calldata|xlayer_testnet|cex_paper|cex_live_capped|dex_mainnet_capped
MAX_NOTIONAL_USD=200
DAILY_NOTIONAL_CAP_USD=1000
MAX_ORDERS_PER_DAY=20
INSTRUMENT_ALLOWLIST=BTC-USDT,ETH-USDT,SOL-USDT,USDC-USDT
KILL_SWITCH_GLOBAL=false
LIVE_BROADCAST_CONFIRM=                  # must equal "I_UNDERSTAND_RISKS" to enable broadcast — leave EMPTY
```

**Hard rules.** Never prefix any of these with `NEXT_PUBLIC_`. Touch them only from files starting with `import "server-only";`. Never log `process.env`, never log full request headers. Never write a secret value into a Black Box event payload — only `secretRef: "okx:hh-agent-demo"` labels.

---

## 4. Architecture decisions

**Stack (opinionated, single repo).**

- **Framework:** Next.js 15 App Router + TypeScript + React 19 + Tailwind v4. Single repo, no Hono split. Two coding agents share typed server actions as the RPC contract.
- **Database:** Neon serverless Postgres (HTTP driver, works in Edge). Not Turso/SQLite — Postgres `jsonb`, transactional `UNIQUE(sessionId, seq)`, `LISTEN/NOTIFY` matter for the Black Box. Not Supabase — its free projects pause after 7 days idle; that bites the day of the demo.
- **ORM:** Drizzle ORM 0.44+ with `drizzle-orm/neon-http`. Schema lives in TypeScript so Claude Code and Codex can both reason about it. Use `drizzle-kit push` during the sprint; migration files post-demo.
- **Job queue:** Inngest. Mount at `/api/inngest`. Free 50k executions/month is infinite for a hackathon. Step functions match the Black Box semantics — each `step.run` is an audit-grade unit with built-in retry and replay. Crons: `scan-radar` 60s, `refresh-quotes` 30s, `refresh-risk` 5m. Event-driven: `poll-orders` reschedules itself with `step.sleep(5s)` until terminal.
- **API design:** Hybrid. Server actions for every user mutation (`proposeTicket`, `confirmOrder`, `verifyChain`, `anchorSession`). Route handlers for the Inngest webhook and **SSE stream** at `/api/stream/[sessionId]` (Vercel has no WebSocket server). Native `EventSource` on the client. Zero deps.
- **Deployment:** Vercel Pro trial primary (only Pro escapes the 60s function cap and allows commercial use). Railway as fallback — keep `railway.json` checked in but don't deploy unless Vercel breaks.
- **Secrets:** Doppler synced to Vercel + local `doppler run -- next dev`. Infisical self-hosted on Fly.io as the no-third-party alternative.

**Event model — the Black Box.**

Append-only `blackbox_events(sessionId, seq, type, payload jsonb, prevHash, hash)` with `UNIQUE(sessionId, seq)` — that unique constraint is load-bearing: it makes the chain unforkable inside a session even under concurrent writes. Hash = SHA-256 over RFC 8785-style canonicalized JSON of `{sessionId, seq, type, payload, prevHash}`. Helper `verifyChain(sessionId)` walks the rows and recomputes every hash. The session tip hash gets anchored to X Layer testnet via `SessionAnchor.commit(bytes32 digest, bytes32 sessionId)`. Pitch line: "Sigstore Rekor-style transparency log, EVM-anchored." Don't actually build a sparse Merkle tree — linear chain is a Merkle list and is enough.

**Execution adapters (server-only modules, gated by `EXECUTION_MODE` env).**

- `lib/adapters/okx-cex.ts` — uses `okx-api` npm SDK. Wraps SDK in a `Trader` class that enforces `INSTRUMENT_ALLOWLIST`, `MAX_NOTIONAL_USD`, `ordType ∈ {limit, post_only}` (no market — too much slippage on thin pairs at hackathon notional). REST polling on `GET /api/v5/trade/order` for status (1–2s for ~30s window).
- `lib/adapters/okx-dex.ts` — calls `GET /api/v5/dex/aggregator/quote` for display, then `/swap` to build calldata. **Never invokes `eth_sendRawTransaction`.** Returns `{tx: {to, data, value, gas}, broadcast: false}` to the UI. The "calldata-only" mode IS just stopping after `/swap`.
- `lib/adapters/xlayer-anchor.ts` — single function `commitDigest(bytes32)` that posts a tx via ethers/viem to `SessionAnchor` on X Layer testnet. The only place a private key is loaded.
- `lib/adapters/scanners/` — Dexscreener, GeckoTerminal, GoPlus, OnchainOS skills, each behind a `try/timeout/fallback` wrapper.

**Schema (Drizzle, abbreviated; full DDL in research output):** `users`, `workspaces`, `policies(rules jsonb)`, `sessions(rootDigest, anchorTxHash, anchorBlock)`, `blackbox_events(sessionId, seq, type, payload, prevHash, hash)`, `agent_runs`, `scans`, `opportunities`, `tickets(state, policyResult)`, `orders(venueType, externalId, calldata, quote, state)`, `fills`, `positions`, `alerts`, `secrets_metadata(label, kind)` — never values, `audit_logs`.

**UI surfaces (locked):** Radar, Ticket Detail drawer, Order Modal, Blotter, Portfolio/Positions, Risk Console, Policy Console, Black Box Replay, Agent Activity timeline, Alerts panel, Evidence drawer, Modes & Caps panel, Status Bar.

**Components:** shadcn/ui + TanStack Table v8 (the shadcn Data Table block) + TradingView Lightweight Charts v5 (Apache 2.0, ~35 kB, **one** chart for equity curve only) + cmdk command palette (`⌘K`) + Sonner toasts + Geist Mono + Lucide. **No Framer Motion**, no AG Grid, no Recharts, no theme switcher. Dark only: bg `#0A0B0D`, fg `#E6E7EA`, borders `#1F2227`, green `#19C37D`, red `#E5484D`, amber `#F5A524`. Numbers right-aligned, `font-variant-numeric: tabular-nums`. `rounded-md` max. The aesthetic reference is Bloomberg + Linear + `htop`, not Stripe Dashboard.

**Order state machine (enforced in app code, persisted in `orders.state`):** `proposed → staged → quoted → confirmed → submitted → (filled | canceled | failed)`. Backward transitions disallowed. Each transition writes a Black Box event.

**Keyboard map:** `g r/b/p/x/a` for nav, `⌘K` palette, `?` help, `/` search, `j/k` row nav, `o` open detail, `n` new ticket, `Enter` confirm, `Esc` cancel, `b/s` side, `m/l` type, `v` verify chain, `a` anchor session.

**Parallelization between coding agents.** Single shared file is `db/schema.ts` (Claude Code owns writes; Codex reads). Handshake is typed server actions.

- **Claude Code (server/execution thread):** schema, Drizzle, `lib/blackbox.ts` (hash, verifyChain, canonicalize), `lib/adapters/{okx-cex,okx-dex,xlayer-anchor,scanners}.ts`, `lib/agents/{scanner,reasoner,policy,router}.ts`, Inngest functions, `app/api/inngest/route.ts`, `app/api/stream/[sessionId]/route.ts`, `app/actions/*.ts`, the `SessionAnchor.sol` contract + Foundry config.
- **Codex (UI thread):** shadcn scaffold, `components/radar/`, `components/blotter/`, `components/ticket/`, `components/order-modal/`, `components/blackbox/replay`, `components/agents/timeline`, `components/status-bar/`, `components/evidence-drawer/`, the Lightweight Charts equity panel, the cmdk command palette, the `useKeymap` hook, the `useSessionStream` SSE consumer.

---

## 5. Execution modes and kill switches

**Seven modes, rigorously defined (single env var `EXECUTION_MODE` flips between them; mode also stamped into every Black Box event).**

| Mode | Allowed | Blocked | Required prior Black Box events | Human confirm | Max notional | Secrets needed | UI label | Tests | Demo reliability |
|---|---|---|---|---|---|---|---|---|---|
| **fixture** | Replay seeded scan data, render full UI, simulate ceremony | Any network call to OKX, RPC, scanner | `session.opened` | No (per-action) | $0 | None | `FIXTURE` (gray) | Snapshot of full session timeline; verifyChain green | **5/5** — bullet-proof |
| **live_read** | All read-only scanner calls (OnchainOS, Dexscreener, Gecko, GoPlus, balances) | Any write/sign/tx | `session.opened`, `scanner.fetched` | No | $0 | OKX read keys, OnchainOS, Etherscan | `LIVE READ` | Mocked transport contract tests; integrity verify | **5/5** |
| **calldata** | Build OKX DEX `/swap` calldata, display, hash | `eth_sendRawTransaction`, OKX `/trade/order` | `policy.checked`, `quote.snapshot`, `order.confirmed` | Yes (Enter on order modal) | $200 simulated | OKX DEX project key | `CALLDATA` (amber) | Calldata sanity check, no broadcast assertion in test | **5/5** |
| **xlayer_testnet** | All live_read + `SessionAnchor.commit` on X Layer testnet | Mainnet broadcast of any kind | All from calldata + `session.tip.computed` | Yes (one explicit "Anchor now") | $0 funds, ≤0.2 OKB test gas | + `X_LAYER_DEPLOYER_PK` | `XLAYER TESTNET` (cyan) | Anchor receipt assertion; OKLink fetch | **4/5** — RPC + faucet risk |
| **cex_paper** | OKX demo trading orders via `x-simulated-trading: 1` | Live key path | All from calldata + `cex.order.placed` | Yes | $200 virtual | OKX demo key trio | `PAPER` (blue) | Place→cancel→status round-trip on demo | **5/5** |
| **cex_live_capped** | Real OKX subaccount, real $50–200, real fill | Withdraw, market orders, instruments not in allowlist | All from cex_paper + `risk.check.passed` | Yes, every single order | $200/order, $1000/day, 20 orders/day | OKX live key trio (read+trade, IP-bound) | `LIVE CAPPED` (green) | E2E with $5 order; chaos test cap breach rejected | **3/5** — depends on jurisdiction, IP binding |
| **dex_mainnet_capped** | Build calldata on Ethereum/Base/Arbitrum/X Layer mainnet, **no broadcast** | `eth_sendRawTransaction` everywhere | All from calldata + `mainnet.calldata.built` | Yes | $200 max notional check before build | OKX DEX project key only — **no signing key** | `MAINNET CALLDATA` (purple) | grep -r `sendRawTransaction` returns empty; cap breach rejected | **5/5** — safest "real" mainnet posture |

**Hard rule: `EXECUTION_MODE=live` is not a value the system accepts.** The "live" path is split into `cex_live_capped` (CEX-only, real money but capped) and `dex_mainnet_capped` (mainnet route built, never broadcast). There is no code path that signs a mainnet swap. To enable one, you would need two env flags and a code change — by design.

**Trace integrity gate.** Any mode above `fixture` requires `verifyChain(currentSession).ok === true` *immediately before* any side-effecting call. If integrity fails, the system flips to a halt state and refuses to execute until the session is closed and a new one opened. This is the "trace integrity halt" kill switch.

**Kill switch design.** Implement each as a server-side check in `lib/guard.ts`, evaluated before every execution path. Each returns `{ok, reason}` and on failure writes a `killswitch.tripped` Black Box event.

1. **Global trading disable** — `KILL_SWITCH_GLOBAL=true` env, redeploy in ~90s, or hot toggle via a single server action behind an admin token.
2. **Per-chain disable** — `DISABLED_CHAINS=ethereum,base` env, checked in `okx-dex` adapter.
3. **Per-asset blocklist** — separate from the allowlist; allowlist is positive, blocklist is the kill list (e.g., a token GoPlus just flagged honeypot).
4. **Daily notional cap** — `SUM(orders.qty*px WHERE submittedAt > today00:00 UTC) >= DAILY_NOTIONAL_CAP_USD` → reject.
5. **Daily loss cap** — `SUM(positions.realizedPnlUsd today) <= -DAILY_LOSS_CAP_USD` → reject.
6. **Consecutive-failure halt** — 3 consecutive `failed` orders in 10 minutes → mode forced to `live_read` and alert raised.
7. **Quote expiry** — every quote carries `quoteExpiresAt = now + 15s`; an order in `quoted` state for > 15s requires re-quote before `confirmed`.
8. **Stale scanner halt** — if any active scanner hasn't returned successfully in 5 minutes → no new tickets can be `proposed`; existing ones can be canceled.
9. **Trace integrity halt** — `verifyChain` failure → see above.

Every kill switch trip writes a Black Box event and a `crit`-severity alert. The status bar turns red. The UI shows a banner with the reason. This is also the demo's contingency safety net: if anything goes wrong on stage, the gate visibly catches it — which arguably strengthens the pitch.

---

## 6. Risk register

| Risk | Category | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| OKX API key with withdraw permission leaks | Security / funds | Low if disciplined | Catastrophic | Withdraw flag off at creation; subaccount only; $200 cap; IP allowlist; gitleaks pre-commit |
| Vercel dynamic egress IPs break OKX IP allowlist | Reliability | High | Demo-stop | Run OKX adapter on Fly.io static IP + Vercel calls it; or QuotaGuard proxy; or accept 14-day unbound expiry + rotate weekly |
| Demo trading key works locally, fails in deploy (env not synced) | Demo | Medium | Demo-stop | Doppler→Vercel sync verified before rehearsal; `health` route asserts env present at boot |
| `NEXT_PUBLIC_*` accidental prefix leaks secret to browser bundle | Security | Low | High | Forbid in code review; `grep -r NEXT_PUBLIC_ src/` in CI; `import "server-only"` on every adapter file |
| X Layer testnet RPC down on demo day | Reliability | Medium | Pitch dings the X Layer story | Anvil fork with chainId=1952 + same `SessionAnchor` bytecode pre-loaded; cached anchor txhash from the prior day; explorer link works either way |
| Faucet bot-blocks day-of | Reliability | Medium | Can't redeploy | Pre-fund 24h ahead; thirdweb 0.01 OKB/day backup faucet; ask in X Layer Builder Hub Telegram if blocked |
| OKLink indexing lag (~30–90s) after anchor commit | Demo | High | UX hiccup | Pre-anchor a "demo" session before stage time; in demo, anchor live but reveal the cached pre-anchor link from earlier in the session |
| Polygon CDK / X Layer chain ID drift (195 vs 1952) | Integration | Medium | Tx signature mismatch | `cast chain-id` before deploy; pin in README; configure wallet manually, never via chainlist.org |
| OKX rate limits during scanner storm | Reliability | Low at our volume | Cosmetic | 200ms internal throttle; only 4–6 scanner endpoints; respect 60/2s on trade endpoint |
| Inngest free tier exhausts | Reliability | Very low | Job pauses | 50k execs/month is ~17/min; we use ~5/min. Cron `*/1 * * * *` not `* * * * *` |
| `okx-api` npm package is community-maintained, not first-party | Supply chain | Low | Could lag breaking changes | Pin to exact version; have raw fetch signer ready as drop-in |
| AI agent prompt-injection causes off-policy proposal | Security | Medium | Caught by gate | Policy gate is enforcement of record, not the LLM; agent output is *input* to policy, never bypasses it |
| Order ticket modal accidentally re-submits on Enter chord | Demo / funds | Medium | Double order | Idempotency: every order gets `clOrdId` derived from `ticketId+seq`; OKX rejects duplicate `clOrdId` |
| Demo network on stage is throttled / blocks WebSocket | Demo | Medium | UI freezes | SSE only, plus a "demo mode" toggle that swaps to fixture transport in one click; rehearse on hotspot |
| Mobile audience (judges on phones) sees broken layout | Demo | High if remote | Pitch quality | Demo from your laptop on big display; README screenshot for those who view later |
| README contradicts demo reality | Trust | Medium | VC follow-up dings | Lock the "Security posture — not production" section verbatim from research; pin claims in pitch deck |
| Claim "MPC / HSM / formally verified / production custody" | Reputation | Self-inflicted | Pitch debunk | The pitch language is pre-written in §7; rehearse it |
| Code includes any path that could broadcast | Funds | Low | Catastrophic | `grep -r "sendRawTransaction\|sendTransaction\|broadcast\|relay" src/` returns empty (except `xlayer-anchor.ts` which is testnet); add as CI check |
| OKX subaccount geo-blocked at demo venue IP | Demo | Low | Live CEX fails | Fallback to `cex_paper` mode; pre-rehearsed |

---

## 7. Prioritized 3-day sprint plan

Two threads run in parallel almost always. **CC** = Claude Code (server/execution). **CX** = Codex (UI/UX). When a gate requires both, the rendezvous is marked. Hour blocks are notional; treat as ~3h units, not literal clock hours.

### Day 0 (evening, 1–2h, pre-sprint)

- **GATE 0 — Baseline lock.** Tag current commit as `v0-baseline`. Snapshot working Live Opportunity Radar UI, simulated ceremony, hash-chain trace, replay, digest, local API to `docs/baseline.md`. Define "what already works" so nothing regresses.
- **Pass criteria:** clean clone runs demo of current state.
- **Cut if blocked:** N/A. This is non-negotiable.

### Day 1

**Morning — Gates 1, 2 in parallel.**

- **GATE 1 (CC) — Secrets, keys, infrastructure provisioned.**
  - Doppler project created, env vars from §3 loaded, synced to Vercel.
  - OKX demo key created + test signed request succeeds.
  - OKX live subaccount created, funded $50 (not yet $200), live key created with Read+Trade, IP-bound to a Fly.io static IP machine (or QuotaGuard).
  - OnchainOS project key created.
  - Etherscan + CryptoPanic keys obtained.
  - X Layer testnet wallet pre-funded with 0.2 OKB.
  - OKLink account + verification key.
  - gitleaks pre-commit hook live; full-history scan clean.
  - **Pass:** `pnpm run health` prints all green from a fresh clone with Doppler injection.
  - **Hard stop:** any key leak detected → rotate immediately, do not proceed.
  - **Tests:** `health` route hits 1 read endpoint per provider, returns 200.
  - **Cut if blocked:** if OKX live key can't be IP-bound by EOD, defer `cex_live_capped`; demo proceeds on `cex_paper` only.

- **GATE 2 (CX) — Repo + design system locked.**
  - `create-next-app@latest` with App Router + Tailwind v4 + React 19.
  - shadcn init, dark theme tokens loaded, Geist Mono wired, Lucide imported.
  - Three-pane Bloomberg shell + 24px status bar skeleton rendering with placeholder data.
  - cmdk palette mounted (empty commands array).
  - `useKeymap` hook + `?` keymap modal.
  - Sonner toaster mounted.
  - **Pass:** screenshot looks like a terminal at 14" 1440p.
  - **Cut if blocked:** drop status bar polish; everything else is critical.

**Afternoon — Gates 3, 4 in parallel.**

- **GATE 3 (CC) — Persistent backend live.**
  - Neon DB provisioned, Drizzle schema from §4 pushed.
  - `lib/blackbox.ts` with `canonicalize`, `hashEvent`, `appendEvent`, `verifyChain`.
  - Seed script: one user, one workspace, one policy with sensible defaults.
  - Server actions: `proposeTicket`, `confirmOrder`, `verifyChain`, `anchorSession` (stubs OK), `getSession`.
  - **Pass:** insert 10 events with deliberate corruption test → `verifyChain` returns `{ok:false, brokenAt:5}`; remove corruption → `{ok:true}`.
  - **Tests:** unit test the hash chain with fixtures; race-condition test on `UNIQUE(seq)`.

- **GATE 4 (CX) — Radar + status bar talking to the backend.**
  - SSE consumer `useSessionStream` hooked to `/api/stream/[sessionId]` (still returning fixture data).
  - Radar table via shadcn Data Table block + TanStack Table, sorts by score, row pulse animation on insert.
  - Click row → ticket detail drawer (empty tabs OK).
  - **Pass:** opening the app shows live fixture rows streaming in.

**Rendezvous (end of Day 1).** Status bar reads `session live · 4 agents · tip <hex> · <ms>`. SSE works. DB works. Black Box chain verifiable. All keys provisioned.

### Day 2

**Morning — Gates 5, 6 in parallel.**

- **GATE 5 (CC) — Live scanner expansion + agent loop.**
  - `lib/adapters/scanners/{okx-onchainos,dexscreener,geckoterminal,goplus,cryptopanic}.ts` each with `try/timeout 1.5s/fallback`.
  - Inngest `scan-radar` cron (`*/1 * * * *`) writes to `opportunities` table.
  - `lib/agents/{scanner,reasoner,policy,router}.ts` — the reasoner can be a simple deterministic ranker for the demo plus one LLM call for the "reasoning" text on the selected ticket.
  - `lib/guard.ts` with all kill switches from §5.
  - **Pass:** radar shows real Dexscreener + OnchainOS rows within 90 seconds of `pnpm dev`. Kill switch unit test: set `KILL_SWITCH_GLOBAL=true` → `proposeTicket` throws.
  - **Cut if blocked:** drop CryptoPanic + 2 of 6 OnchainOS skills. Mandatory: `okx-dex-signal`, `okx-dex-trenches`, `okx-security`, `okx-dex-swap`.

- **GATE 6 (CX) — Order ticket modal + blotter.**
  - Order modal: side toggle, qty, type, TIF, est cost/fees/slippage, live quote ticker, policy preflight block.
  - Blotter table with all 7 states from §4 as color-coded badges.
  - Evidence drawer tabs scaffold (Scan, Reasoning, Policy, Quote, Anchor).
  - Keyboard map fully wired.
  - **Pass:** press `n` on a radar row → modal opens with values pre-filled. Press `Esc` → modal closes. Press `Enter` → server action called.

**Afternoon — Gates 7, 8 in parallel.**

- **GATE 7 (CC) — CEX execution adapter + DEX calldata adapter.**
  - `lib/adapters/okx-cex.ts` using `okx-api` SDK with `Trader` wrapper enforcing caps, allowlist, no-market-orders. REST polling on order status until terminal.
  - `lib/adapters/okx-dex.ts` calling `/quote` then `/swap`, returns `{tx, broadcast:false}`. `grep` test in CI for `sendRawTransaction`.
  - Order pipeline: `proposed → staged → quoted → confirmed → submitted → filled/canceled/failed`, every transition emits a Black Box event.
  - Modes: at this point `fixture`, `live_read`, `calldata`, `cex_paper` all work. `cex_live_capped` works if Gate 1 IP binding succeeded.
  - **Pass:** in `cex_paper` mode, place→fill round-trip on demo trading completes in <10s, blotter updates live.
  - **Tests:** cap-breach rejection unit test; allowlist test; idempotent `clOrdId` test.

- **GATE 8 (CX) — Black Box replay + agent timeline + evidence drawer content.**
  - Replay panel: vertical timeline, hover for payload, `[Verify]` button calls `verifyChain` action → green check + tip hash.
  - Agent activity timeline: horizontal swimlanes.
  - Evidence drawer tabs populated with real data.
  - Lightweight Charts equity panel (single line, fed from `positions` realized PnL).
  - **Pass:** demo session of 30 events scrolls smoothly, verify in <100ms.

**Rendezvous (end of Day 2).** A real OKX demo trade lands; the full Black Box trail (proposal → policy → quote → submission → fill) is hash-chained and verifiable.

### Day 3

**Morning — Gates 9, 10.**

- **GATE 9 (CC) — X Layer anchor live + Black Box enforcement against real execution.**
  - Deploy `SessionAnchor.sol` to X Layer testnet via Foundry. Verify on OKLink.
  - `lib/adapters/xlayer-anchor.ts` posts `commitDigest(rootDigest, sessionId)`.
  - Server action `anchorSession` writes `sessions.anchorTxHash` and a `session.anchored` Black Box event.
  - **Critical:** wire `verifyChain` as a precondition for every execution adapter call. Trace integrity halt is enforced.
  - **Pass:** end-to-end flow: open session → propose → confirm → execute (OKX paper) → close → anchor → OKLink shows tx within 60s.
  - **Hard stop:** if X Layer testnet RPC is unreachable, switch to local Anvil fork with chainId=1952, deploy same bytecode, proceed.

- **GATE 10 (CX) — Polish, status bar telemetry, Modes & Caps panel.**
  - Status bar pulls live values (session id short, agent count, current tip hash short, last action latency).
  - Modes & Caps panel: dropdown for `EXECUTION_MODE`, sliders for caps, allowlist editor. Read-only on the deployed env (changing flips a server action that updates env at runtime via a dev-only path; for prod, doc as redeploy required).
  - Alerts panel slide-in with severity colors.
  - "Anchor TX ↗ X Layer" button on session digest → opens OKLink in new tab.
  - **Pass:** every demo state is visually reachable in ≤2 keystrokes.

**Afternoon — Gates 11, 12.**

- **GATE 11 (joint) — Fresh-clone demo rehearsal.**
  - Fresh git clone on a different laptop (or in a clean container).
  - `pnpm install && doppler run -- pnpm dev`.
  - Run the 90-second demo path from §1 verbatim, twice. Time it.
  - Verify on stage-equivalent network (hotspot OK).
  - **Pass:** both runs land under 90s, blotter never shows `failed`, anchor link opens, verifyChain green.
  - **Hard stop:** if any path fails twice in a row, cut the failing surface for the demo and rehearse the trimmed path.
  - **Cut decisions ranked (cut in this order if needed):** Live CEX execution → `cex_paper` (still real OKX, virtual funds). Live X Layer anchor → cached anchor + Anvil fork. Live scanner → fixture replay. The Black Box gate, ceremony, and replay are never cut.

- **GATE 12 (joint) — Pitch script + README + non-production posture doc.**
  - README sections: What it is, OnchainOS skill list (paste-ready block from research), Architecture, Run locally, Security posture (verbatim from research), Wedge.
  - Pitch script under 90 seconds, memorized. Three opener variants rehearsed; pick the strongest day-of.
  - Slide deck: 5 slides max — Hook, Wedge, Demo (just the video/live), Why now (agents commoditize, authority doesn't), Ask.
  - **Pass:** can deliver the pitch cold, in front of a mirror, without notes, in 85–90s.

**Reserve buffer (last 2–3 hours of Day 3):** triage only. No new features.

---

## 8. What to cut

**Cut now (do not start):**

- Any code path that calls `eth_sendRawTransaction`, `sendTransaction`, or a bundler `eth_sendUserOperation` for anything not strictly `xlayer-anchor`. Grep test in CI.
- OKX withdrawal-permissioned keys.
- Full TradingView Advanced Chart embed.
- AG Grid, Recharts, Framer Motion.
- Theme switcher, light theme, mobile responsiveness.
- Auth pages (Clerk/Auth.js); seed a single user.
- Multi-workspace UI; schema is future-proof, UI is not.
- Settings beyond Modes & Caps.
- X (Twitter) API integration — pay-per-call, no free tier in 2026.
- Arkham API — gated approval queue.
- Dune custom queries — SQL authoring is multi-hour.
- Nansen x402 wallet-funded payment loop — 2–3h of plumbing, demo-fragile.
- The Graph subgraphs — too much overhead.
- Telegram scrape via TDLib/Telethon — operational nightmare.
- Birdeye paid tier — GeckoTerminal covers it free.
- Real DEX broadcasting — even on testnet, even with the deployer key.
- ZK proof of the model (Giza-style zkML) — not the wedge.
- Sparse Merkle tree for Black Box — linear chain is enough; do not over-engineer.
- Real-time chart streaming — one equity line, refreshed every 10s, is enough.
- Onboarding tour, empty states with marketing copy, marketing landing page.

**Tempting scope to defer to "v2 / post-demo":**

- Multiple sessions concurrently.
- Multi-user / role-based approvals (research called for it, but a solo demo doesn't need it; mention in the pitch as "next").
- Chainalysis / TRM KYT screening hook on destination address (mention as future moat tile).
- Real session keys / ERC-4337 / ZeroDev integration (mention as the natural pairing).
- Anchoring to X Layer **mainnet** (testnet is the demo; mainnet anchor for a real session is a Day 5 task).
- LP-facing public verifier page where anyone can paste a tip hash and validate.
- Open-sourcing the `SessionAnchor` contract spec as an EIP.

**Claims NOT to make in the pitch (verbatim from research; rehearse the alternatives):**

- ❌ "Production-ready custody" → ✅ "Non-custodial; keys live in the user's smart account. The Desk never holds funds."
- ❌ "MPC / HSM" → ✅ "Policy-gated session keys via standard ERC-4337 account abstraction."
- ❌ "Formally verified" → ✅ "The gate contract is small, open-source, and slated for audit. The trace is the verification surface today."
- ❌ "MiCA / SOC 2 / compliance ready" → ✅ "Compliance hooks are pluggable (Chainalysis / TRM-shaped). No certification claimed at demo stage."
- ❌ "$X traded" / faked numbers → ✅ "Demo mode: capped notional, real X Layer anchor, OKX paper trading. The gate is real code. The trades are training wheels."
- ❌ "Fully autonomous agent" → ✅ "Agent proposes. Humans configure policies. The gate enforces. Nothing executes without a satisfied policy plus a chain anchor."
- ❌ "Outperforms human traders" → ✅ "Alpha is the user's problem. Trust is ours."
- ❌ "Novel cryptography" → ✅ "The primitives are boring on purpose — SHA-256 hash chain + EVM anchor — chosen because they audit cleanly."

The honest demo footer line that defuses 90% of follow-ups: *"Demo mode: testnet/paper wallets, capped notional, mock policy set, real X Layer anchor. The gate is real code. The trades are training wheels."*

---

## 9. Open questions for Leon

Resolve these before keystrokes start. Each blocks a concrete decision.

1. **Jurisdiction.** Which OKX entity will you sign into — global `www.okx.com`, US `app.okx.com`, or EEA `eea.okx.com`? US blocks the global product entirely and has a narrower instrument set. EEA has higher base fees (0.20/0.35% vs 0.08/0.10%). This determines whether `cex_live_capped` is even on the table or whether the demo is `cex_paper` only.

2. **Static IP for OKX.** Will you stand up a Fly.io/Railway box for the OKX-calling adapter (recommended) or use a QuotaGuard-style static-IP proxy? Without a static egress IP, the live OKX key auto-expires after 14 days of inactivity and is significantly more exposed. If neither is feasible by EOD Day 1, drop `cex_live_capped`.

3. **Live trading appetite.** Confirm: are you willing to risk **$50–$200 of real USDT** on the live demo, or is `cex_paper` mode (OKX demo trading with virtual funds, real market data, identical API) acceptable as the headline? Paper is more reliable and almost as compelling — and judges who notice will give you points for being disciplined.

4. **OnchainOS API key acquisition latency.** Have you already applied at `https://web3.okx.com/onchainos/dev-portal` and received a project key, or does that need to happen in Hour 1? If approval is slow, fall back to OKX's published sandbox-shared key (rate-limited but functional for the demo).

5. **X Layer testnet chain ID confirmation.** Run `cast chain-id --rpc-url https://testrpc.xlayer.tech/terigon` and report what it returns. OKX docs say 1952; chainlist.org still shows 195. The RPC is authoritative — use what it returns.

6. **LLM provider for the agent reasoning.** Are you using Anthropic via Claude Code SDK at runtime (token cost + latency), OpenAI, or a deterministic ranker with templated reasoning text for the demo? The deterministic path is more reliable on stage; a single live LLM call for the *reasoning text on the selected ticket only* is the right compromise.

7. **Demo network.** Will the demo run on the venue's WiFi, your phone hotspot, or pre-recorded video as fallback? SSE survives most networks but corporate WiFi sometimes blocks long-lived connections.

8. **Anchor cadence.** Anchor every session at close (recommended for the demo), or anchor every N events (heavier on-chain, more impressive but riskier)? Default: anchor on session close, one tx per session, ~0.00015 OKB.

9. **README publicity.** Is the repo public for judge auto-review (OKX's AI judge agent scans on-chain data + GitHub), or private with a demo video? If public, the security-posture section MUST be in the README before you push.

10. **Pitch audience priority for the live event.** If you have 90 seconds and have to pick *one* of "OKX judges" vs "VCs" to optimize toward, which? The recommended path balances both, but if forced to prioritize, OKX judges (concrete: name 4–6 OnchainOS skills, click the X Layer explorer link visibly). VCs will get the wedge sentence in the closer.

11. **Fallback acceptance.** If X Layer testnet is down at demo time, are you comfortable with Anvil-fork-chainId-1952 + cached anchor txhash as the demo fallback, and willing to disclose that honestly if asked? (Strong recommendation: yes; honesty under pressure is itself a credibility signal.)

12. **Founder-fit story.** Have you written the 30-second personal narrative for the VC closer — why *you* are building this, what scratched-your-own-itch led here? Speedrun-style investors weight this as much as the demo.

---

### Key source URLs

- OKX v5 docs: https://www.okx.com/docs-v5/en/ · API FAQ: https://www.okx.com/en-us/help/api-faq · Agent kit: https://github.com/okx/agent-trade-kit
- `okx-api` Node SDK: https://www.npmjs.com/package/okx-api
- OKX OnchainOS dev portal: https://web3.okx.com/onchainos/dev-portal · DEX swap docs: https://www.okx.com/web3/build/docs/waas/dex-swap · Skills repo: https://github.com/okx/onchainos-skills
- X Layer docs: https://web3.okx.com/xlayer/docs/developer/build-on-xlayer/network-information · Foundry deploy: https://www.okx.com/xlayer/docs/developer/deploy-a-smart-contract/deploy-with-foundry · Faucet: https://www.okx.com/xlayer/faucet · Explorer: https://www.oklink.com/xlayer-test
- X-Agent / Build X Hackathon: https://web3.okx.com/xlayer/build-x-hackathon
- Dexscreener: https://docs.dexscreener.com/api/reference · GeckoTerminal: https://apiguide.geckoterminal.com/ · GoPlus: https://docs.gopluslabs.io/reference/api-overview · DefiLlama: https://api-docs.defillama.com/
- Inngest: https://www.inngest.com/pricing · Vercel limits: https://vercel.com/docs/functions/limitations · Neon: https://neon.tech · Drizzle: https://orm.drizzle.team/
- shadcn/ui: https://ui.shadcn.com · TanStack Table v8: https://tanstack.com/table/v8 · Lightweight Charts v5: https://github.com/tradingview/lightweight-charts
- Doppler: https://www.doppler.com · Infisical: https://infisical.com · gitleaks: https://github.com/gitleaks/gitleaks

Ship the gate. The gate is the product.