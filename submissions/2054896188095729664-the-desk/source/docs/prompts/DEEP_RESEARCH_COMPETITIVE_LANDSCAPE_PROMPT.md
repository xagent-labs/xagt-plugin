# Deep Research Prompt: Agentic Wallet Ops Center Competitive Landscape

*Paste this entire prompt into Claude Deep Research. Today's date is May 17,
2026. Treat the May-2026 timeframe as current.*

---

## Context for the research

I am building a hackathon product called **Agentic Wallet Ops Center**, with
**The Desk** as the first app. Submission deadline is in the next 48–72 hours
from May 17, 2026.

### Core claim

AI agents can scan markets and propose wallet actions, but **OKX Agentic
Wallet only signs after a tamper-evident Black Box proves the action passed
policy, risk, sizing, quote, confirmation, and trace-integrity gates**.
Default execution is simulated / testnet-safe; mainnet signing is gated
behind explicit caps that are not enabled by default.

### Where the product is today (May 17, 2026)

- **Live Opportunity Radar** using OKX / OnchainOS read-only surfaces:
  smart-money signals (`okx-dex-signal`), hot-token tape (`okx-dex-token`),
  trenches / new launches (`okx-dex-trenches`), and DEX route quotes
  (`okx-dex-swap`).
- **Agent seats** (six framed; five live): Scout, Risk Officer, Allocator,
  Executor, Reporter, plus a stubbed Yield Manager.
- **Black Box event trace**: append-only JSONL with hash-chained
  `prev_event_hash` / `event_hash`, a session hash, and a `tamper-demo`
  script that visibly fails verification when one event is rewritten.
- **Policy gate**: allowed chains, max position pct, max slippage bps,
  signing mode, real-funds cap, required user confirmation, required trace
  integrity. JSON-defined and edit-able from a UI panel (today,
  client-side only).
- **Mission Control UI**: Opportunity Radar + ticket review modal + policy
  modal + Black Box replay + Reporter digest + OKX evidence; a local API
  on 127.0.0.1:4181 triggers fresh scans.

### Internal review findings (Phase 1–3 of this brief, completed today)

The product is currently **hackathon-demo grade**, not yet trustworthy as a
wallet ops product. Internal Claude review plus an independent Codex audit
identified three structural bugs that the sprint MUST fix regardless of
research findings:

1. The browser fabricates `execution.signed_or_simulated` events in client
   state, bypassing the canonical server-side verifier.
2. The verifier uses "latest event of type" semantics — so a later
   `risk.approved` overrides an earlier `risk.veto`, and an execution
   event can appear *before* `user.confirmed` and still validate as
   "allowed" once confirmation arrives.
3. The scanner labels opportunities `policy: allowed` for proposed orders
   whose slippage already exceeds the policy cap — scanner and verifier
   use divergent policy logic.

The sprint theme is **"Prove the Black Box."** Research output should
inform the *narrative*, the *cuts*, and the *demo moment*, but not move
the spine of the sprint away from those three fixes.

## Research goal

Produce an investor-grade and hackathon-winning **product strategy and demo
narrative** for the next 48–72 hours of implementation. Output must be
**concrete, shippable, and specific to where this product is today.**

## What to research (current as of May 2026)

1. **Agentic trading terminals and AI trading copilots** — both crypto
   (e.g., on-chain agent stacks, Bittensor subnets for trading, OKX /
   Binance / Coinbase agent kits, Virtuals, ai16z-style agents, autonomous
   meme traders) and tradfi-style copilots (e.g., Bloomberg AI features,
   institutional copilot startups).
2. **Crypto token scanners and DEX intelligence tools** — DexScreener,
   Birdeye, GMGN, Photon, BullX, Trojan, Padre, GeckoTerminal, Dune
   intelligence dashboards, and any 2026-vintage entrants.
3. **Wallet automation, smart wallet, account abstraction, policy-gated
   signing, and transaction simulation products** — Safe (smart accounts +
   modules), Privy, Turnkey, Fireblocks, Dynamic, Magic, Coinbase Smart
   Wallet, Lit Protocol, Lit Actions / PKP signing, Tenderly simulation,
   Blockaid, Pocket Universe, Wallet Guard.
4. **Copy-trading, smart-money alerts, whale / KOL tracking, and DEX
   signal products** — same vendors as #2 plus Nansen, Arkham, Cielo,
   Cookie3, Lookonchain, Solana-native trenches tools, and any new 2025–
   2026 entrants.
5. **Institutional trading / risk terminals** as UX analogs —
   Bloomberg Terminal, Tradeweb, ION trading, FlexTrade, Talos, FalconX,
   FalconX Edge, Anchorage Digital terminal — focus on what their
   pre-trade compliance, audit, and approval UX looks like.
6. **User and operator pain points** when trusting autonomous or
   semi-autonomous wallet actions. What stops a serious user (treasury,
   fund, DAO, prop trader, institutional desk, sophisticated retail) from
   delegating signing authority to an agent today?
7. **OKX Agentic Wallet / X Layer / X-Agent hackathon judging criteria**:
   what have past OKX-sponsored hackathon winners optimized for, and what
   does the May-2026 round of judges appear to reward? (Use any public
   judging rubrics, sponsor blog posts, or finalist roundups you can find.)

## Required output

Structure the response with these exact sections.

### 1. Competitive map

A table with columns:

- **Category** (one of: agentic-terminal / token-scanner / wallet-policy /
  copy-trade / risk-terminal / signing-infra / simulation-or-guardian).
- **Representative products** (3–6 names, with one-line capability
  summaries).
- **What users hire them for** (job-to-be-done, not features).
- **Strengths**.
- **Weaknesses**.
- **Where Agentic Wallet Ops Center can credibly differentiate** in
  48–72 hours of build time *given the current state described above*.

### 2. Pain-point taxonomy

For each of these six pain-point classes, give 2–4 concrete examples drawn
from real user complaints, audit reports, post-mortems, or product
positioning — **not generic platitudes**:

- Discovery pain.
- Trust / safety pain.
- Execution pain.
- Risk-management pain.
- Audit / compliance pain.
- UX / operator pain.

Bias toward pains where *a signed, policy-gated, agent-decision audit
trail* is the actual fix.

### 3. Wedge analysis

- The **best narrow product wedge** for a 48–72 hour sprint that builds on
  this specific repo (Black Box trace + Opportunity Radar + OKX skill
  surface).
- Why it is **not just another token scanner** (DexScreener, Birdeye,
  GMGN, etc. all exist and are better-resourced).
- Why it is **not just another wallet dashboard** (Zerion, DeBank, Rabby,
  etc.).
- Why it is **not just a Safe module** (Safe + policies + Tenderly already
  exist; what does an agentic provenance layer add?).
- Why it **could become a real company** — what is the 12-month roadmap
  beyond the hackathon if the wedge lands?

### 4. Product narrative

- One-sentence investor pitch.
- One-sentence judge pitch (different from the investor pitch; assumes a
  judge has seen ten agent-trading demos already).
- 30-second demo narrative (with explicit click-by-click beats and the
  on-screen moment that proves the central claim).
- 90-second demo narrative (extended version that names the OKX skills
  hit, the Black Box artifact, and the failure case).

### 5. Feature recommendations

Three lists. Each feature must include: **user value**, **implementation
complexity (low / medium / high)**, **demo impact (low / medium / high)**,
and **which Claude/Codex owner makes most sense**.

- **Must ship before submission** (must be compatible with the
  already-decided sprint spine: server-side gate enforcement, ordered /
  veto-final verifier, scanner-policy parity).
- **Should ship if time allows**.
- **Explicitly cut** — and why (with a one-line rationale per cut so a
  judge or teammate cannot re-add it without thinking).

### 6. UX recommendations

For each touchpoint, give one specific design move (no platitudes):

- First 10 seconds on the page.
- Opportunity review flow.
- Trust and trace visualization (the Black Box modal is currently raw
  `<pre>`; what should it look like?).
- Policy console (today it lets users disable confirmation /
  trace-integrity from the same screen that displays "Executor may
  proceed").
- Confirmation / signing moment (today this is one button that fabricates
  client-side events — what should the moment feel like once it goes
  through the server?).
- Failure and fallback states (e.g., wallet logged out, OKX CLI quota
  hit, scan returns zero opportunities, integrity verification fails).

### 7. Implementation sprint recommendation

5–8 milestones, each with:

- **Goal** (one sentence).
- **Hard review gate** (specific pass/fail check — not "looks good").
- **What Claude Code should review at the gate** (product / UX / claims
  alignment).
- **What Codex should implement or verify at the gate** (code / tests /
  policy enforcement).

The recommendation must **align with or override** the current sprint
spine (server-side gate enforcement, ordered / veto-final verifier,
scanner-policy parity, narrow execution-mode claims, fix loading-forever,
sign the session hash). If your research suggests a different spine, say
so explicitly and justify with citations.

## Style and constraints

- **Be blunt.** Prefer specific, shippable recommendations over broad
  strategy. If a claim is generic ("users want trust"), discard it.
- **Cite specifics.** Where you reference a competitor's feature, name the
  feature and link if possible. Where you reference a pain point, point to
  a real user complaint, audit, blog, or post-mortem rather than
  speculating.
- **Respect the time budget.** Recommendations must be feasible inside 48–
  72 hours for two collaborators (Claude Code and Codex) plus a human
  reviewer.
- **Do not undo the existing spine** unless you have a concrete, defensible
  reason. The three structural bugs above will be fixed regardless.
- **Do not propose features that require real-funds signing.** Default is
  simulated; the next sprint does not add mainnet.
- **No fluff sections.** No executive summary, no "in conclusion," no
  generic crypto-trends paragraph. Go straight to the required output
  structure.
