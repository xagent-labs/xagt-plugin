# Production Sprint Deep Research Prompt

You are running a deep research session for a 3-day production sprint on **Agentic Wallet Ops Center**, with **The Desk** as the first app. Do not write code. Do not produce a generic market overview. Produce concrete, implementation-ready research, setup requirements, and sprint recommendations.

## Context

You do **not** have access to the local repo or filesystem. Treat the current implementation summary below as the source of truth. Focus on external research, API requirements, architecture recommendations, risk controls, and sprint planning.

Current codebase: a local hackathon repo for **Agentic Wallet Ops Center / The Desk**.

Current product:

- **Agentic Wallet Ops Center**: a control plane where AI agents can propose wallet actions, but a tamper-evident Black Box must prove the action passed policy, risk, sizing, quote, confirmation, and integrity gates before any signing path is allowed.
- **The Desk**: the first app on the Ops Center, framed as an agentic trading desk.
- Working today:
  - Live Opportunity Radar UI.
  - OKX/OnchainOS scan surfaces for opportunities.
  - Staged opportunities and ticket review.
  - Simulated OKX Agentic Wallet ceremony.
  - Black Box append-only/hash-chained event trace.
  - Policy verification, replay, digest, and local API.
  - X Layer anchor contract/code path exists but needs testnet keys to submit real commitments.
- Missing production capabilities:
  - Real OKX/CEX execution.
  - Real DEX/mainnet or testnet execution.
  - Persistent backend.
  - Production wallet/key management.
  - Live market/news/social/token/wallet scanner layer beyond current OKX surfaces.
  - Pro trader UX: order ticket, blotter, portfolio/PnL, alerts, role-based approvals.
  - Deployment architecture.

The target is not a toy trading bot. The target is an investable/buyable product wedge:

> A Bloomberg-style agent trading terminal where AI agents scan markets and propose actions, but wallet authority is controlled by a cryptographic Black Box and explicit policy gates.

## Research Objective

Research what is required to turn the current hackathon prototype into a production-shaped product in 3 days, without compromising safety.

The output should tell the builder:

- Which APIs/accounts/keys must be set up before implementation.
- Which execution paths are realistic in 3 days.
- Which paths should stay simulated, calldata-only, or testnet-only.
- Which backend architecture is fast enough to build but credible enough for judges/investors.
- Which scanner/data sources produce the strongest product demo.
- Which UX surfaces make it feel like a real trading desk instead of a click-through demo.
- Which risks and compliance constraints must be explicitly stated.
- What to cut if time slips.

## Inputs Leon Must Provide Before Build

List the exact inputs Leon must provide before implementation starts. Include at least:

- **OKX account/API setup**
  - Whether OKX Exchange API access is enabled.
  - Whether a dedicated subaccount can be created.
  - Whether API key permissions can be limited to read + trade only, with withdrawals disabled.
  - Whether IP whitelisting is possible.
  - Whether real spot trading is allowed in the demo, and if so the maximum notional.
  - Whether API keys previously shared in chat have been rotated before real use.

- **OKX Web3 / DEX / Wallet setup**
  - Whether OKX Web3 API credentials are available.
  - Whether the app should use OKX DEX quote/swap APIs, OKX Wallet APIs, OnchainOS skills, or a combination.
  - Whether a connected wallet, embedded wallet, test wallet, or OKX Agentic Wallet path should be the primary signing model.
  - Which chains are allowed for DEX/testnet/mainnet demos.

- **X Layer setup**
  - X Layer testnet private key funded with testnet gas.
  - Deployed `SessionAnchor` contract address, or permission to deploy one.
  - Preferred explorer links and RPC endpoints.
  - Whether X Layer should be used only for Black Box session anchoring or also for trade execution.

- **Risk and execution policy**
  - Default execution mode: fixture, live-read, calldata, xlayer-testnet, or mainnet-capped.
  - Max order size in USD.
  - Max daily notional.
  - Max daily loss.
  - Max slippage.
  - Allowed assets/chains.
  - Confirmation requirements.
  - Kill switch behavior.
  - Whether automated execution is allowed or every order must require human approval.

- **Data provider choices**
  - Which providers Leon already has API credits for.
  - Budget constraints for new API credits.
  - Whether X/Twitter data is required or optional.
  - Whether news/social should be live API, RSS fallback, or deterministic snapshot.
  - Whether wallet intelligence should prioritize OKX/OnchainOS, public RPC/indexers, or paid APIs.

- **Deployment target**
  - Local-only hackathon demo, Vercel frontend + local backend, Railway/Fly/Render backend, Supabase, Neon, or another stack.
  - Whether persistent user accounts are required for the demo.
  - Whether auth should be real or demo-mode only.

- **Compliance/demo constraints**
  - Jurisdiction assumptions.
  - Whether this is explicitly educational/demo software.
  - Whether real funds are prohibited.
  - What disclaimers must appear in UI/docs.
  - What the demo video is allowed to show.

## Research Questions

### 1. OKX Exchange Trading APIs

Research official OKX exchange API requirements and implementation details for real spot trading:

- How to create keys safely for a hackathon demo.
- Permission model: read, trade, withdrawal, IP whitelist, subaccounts.
- Authentication/signature scheme.
- Endpoints needed for:
  - account balances,
  - instruments/market metadata,
  - tickers/order book,
  - place order,
  - cancel order,
  - order status,
  - fills/trade history.
- Spot trading constraints:
  - minimum order size,
  - precision,
  - fees,
  - rate limits,
  - error codes.
- Whether paper/demo trading exists and is usable.
- Recommended safe implementation path for 3 days.

### 2. OKX Web3 / DEX / Wallet / Agentic Wallet / OnchainOS

Research the official and hackathon-relevant OKX Web3 surfaces:

- OKX DEX quote/swap APIs.
- OKX Wallet APIs or WaaS APIs.
- OKX Agentic Wallet integration path, if documented.
- OnchainOS skill surfaces already used or available:
  - DEX signal,
  - DEX trenches/new launches,
  - token/hot tape,
  - security/risk,
  - swap/quote,
  - wallet portfolio,
  - DeFi/yield.
- Which surfaces are read-only vs wallet-affecting.
- What can be safely used live without exposing funds.
- What requires API keys or wallet signatures.
- What can produce calldata without broadcasting.
- What should be fixture-backed for reliability.
- What exact skill/API names should appear in the final README and demo.

### 3. X Layer Testnet/Mainnet And Session Anchoring

Research:

- X Layer testnet RPC, chain ID, faucet, explorer, deployment process.
- Whether X Layer supports the intended demo paths.
- Best strategy for the existing `SessionAnchor.sol`:
  - deploy once,
  - commit session hash,
  - link explorer transaction,
  - preserve fallback if testnet is down.
- Whether X Layer should be used as:
  - a Black Box proof anchor only,
  - a testnet execution chain,
  - or a real execution route.
- Recommended 3-day implementation scope.

### 4. Secure Key Management

Research production-shaped but hackathon-realistic key management:

- How to store OKX API credentials locally and in deployed environments.
- How to avoid secrets in frontend bundles, logs, traces, screenshots, and event payloads.
- How to rotate keys that were previously exposed.
- How to structure subaccounts and API scopes.
- Whether to use:
  - `.env` only,
  - platform secrets,
  - KMS,
  - encrypted local vault,
  - Privy/embedded wallet,
  - connected wallet signatures,
  - MPC/Multi-party signing.
- How to design “mainnet-capped” safely.
- What should be documented as non-production.

### 5. Live Scanner And Data Sources

Research the best market intelligence stack for a Bloomberg-like agent terminal:

- OKX market data and Web3 signal sources.
- Token activity and DEX data providers:
  - Dexscreener,
  - GeckoTerminal,
  - Birdeye,
  - CoinGecko,
  - CoinMarketCap,
  - DefiLlama,
  - Dune,
  - Covalent,
  - Alchemy/QuickNode/Helius,
  - The Graph,
  - Chainbase,
  - Arkham/Nansen alternatives if accessible.
- News/social sources:
  - CryptoPanic,
  - RSS feeds,
  - X API,
  - Farcaster,
  - Telegram/Discord monitoring if realistic,
  - project announcement feeds.
- Wallet/risk sources:
  - holder concentration,
  - liquidity locks,
  - honeypot checks,
  - contract verification,
  - deployer history,
  - whale/smart-money flows.
- Required API credits, free tiers, likely rate limits, setup difficulty, and fallback strategy.
- Which 2-4 providers are highest leverage for a 3-day sprint.

### 6. Execution Modes And Kill Switches

Research and recommend a strict execution model:

- `fixture`
- `live-read`
- `calldata`
- `xlayer-testnet`
- `cex-paper`
- `cex-live-capped`
- `dex-mainnet-capped`

For each mode, define:

- what is allowed,
- what is blocked,
- required prior Black Box events,
- required human confirmation,
- max notional constraints,
- required secrets,
- expected UI labels,
- tests needed,
- demo reliability.

Also research kill switch design:

- global disable trading,
- per-chain disable,
- per-asset blocklist,
- daily notional cap,
- daily loss cap,
- consecutive failure halt,
- quote expiry,
- stale scanner halt,
- trace integrity halt.

### 7. Backend Architecture

Research the fastest credible backend architecture:

- Local-first SQLite vs Postgres/Supabase/Neon.
- Event sourcing for Black Box events.
- Append-only event table with hash-chain verification.
- Tables for:
  - users,
  - workspaces,
  - policies,
  - agent runs,
  - scans,
  - opportunities,
  - tickets,
  - orders,
  - positions,
  - fills,
  - alerts,
  - secrets metadata,
  - audit logs.
- Job queues:
  - scans,
  - order status polling,
  - digest/report generation,
  - risk refresh,
  - quote refresh.
- API design:
  - REST vs tRPC vs server actions.
  - streaming/SSE for agent activity.
- Deployment choices:
  - Vercel + serverless constraints,
  - Railway/Fly/Render,
  - Supabase Edge Functions,
  - local demo fallback.
- Recommended architecture that can be built in 3 days.

### 8. Pro Trading UX

Research UX requirements for making this feel like a real terminal:

- Radar/watchlist.
- Ticket detail.
- Order ticket modal.
- Execution blotter.
- Portfolio/book.
- Positions/PnL.
- Risk console.
- Policy console.
- Black Box replay.
- Agent activity timeline.
- Alerts.
- Evidence drawer.
- Keyboard shortcuts.
- Dense table layouts.
- State labels for proposed/staged/quoted/confirmed/submitted/filled/canceled/failed.

Recommend the minimum UI surface that will convince judges/investors in 90 seconds.

### 9. Competitive Landscape And Product Wedge

Research competition and positioning:

- AI trading bots.
- Wallet automation tools.
- Trading terminals.
- On-chain analytics dashboards.
- Agent frameworks.
- Copy-trading/social-trading tools.
- Risk/compliance/audit products.

Answer:

- What do they lack?
- Where does “agentic wallet authority with Black Box proof” win?
- What should the demo emphasize to avoid looking like another token scanner?
- What would make OKX/X-Agent judges care?
- What would make an investor or acquirer care?

### 10. 3-Day Sprint Milestone Criteria

Research should produce criteria for a milestone plan with hard gates.

The later sprint plan should include gates for:

- Baseline lock.
- Secrets/key rotation/setup.
- Persistent backend.
- Live account read.
- Real scanner expansion.
- CEX or DEX execution adapter.
- Order ticket and blotter.
- Black Box enforcement against real execution.
- X Layer anchor.
- UX polish.
- Fresh clone/demo rehearsal.

For each gate, define:

- pass criteria,
- hard stop,
- tests,
- demo proof,
- what to cut if blocked.

## Required Output Format

Return the research as a structured report with these sections:

1. **Executive Recommendation**
   - What to build in the next 3 days.
   - What not to build.
   - What mode should be the default demo path.

2. **Provider Matrix**
   - Provider/API/skill.
   - Purpose.
   - Setup required.
   - Free/paid/API credit expectation.
   - Reliability risk.
   - 3-day usefulness.
   - Fallback.

3. **API Setup Checklist**
   - Exact accounts/keys Leon must create.
   - Required permissions.
   - What must be disabled.
   - What must be rotated.
   - Environment variable names to use.

4. **Architecture Decisions**
   - Backend.
   - Database.
   - Event model.
   - Job queue.
   - Deployment.
   - Secrets.
   - Execution adapters.
   - UI surfaces.

5. **Risk Register**
   - Security risks.
   - Funds risks.
   - API reliability risks.
   - Compliance risks.
   - Demo risks.
   - Mitigations.

6. **Prioritized 3-Day Sprint Plan**
   - Milestones.
   - Hard gates.
   - Tests.
   - Review criteria.
   - Fallback/cut decisions.

7. **What To Cut**
   - Scope that is tempting but not worth it.
   - Features to explicitly avoid.
   - Claims that should not appear in the pitch unless proven.

8. **Open Questions For Leon**
   - All questions that must be answered before implementation starts.

## Constraints

- Do not recommend any path that can accidentally spend mainnet funds.
- Do not recommend API keys with withdrawal permissions.
- Do not recommend storing secrets in frontend code or Black Box events.
- Every real or simulated wallet-affecting action must remain gated by the Black Box.
- Human confirmation should remain required unless the research can defend a safer mode.
- Trace integrity must be required for any execution mode above `fixture`.
- Any live integration must have deterministic fallback.
- The final product should feel like a pro trading terminal, not a marketing dashboard.
