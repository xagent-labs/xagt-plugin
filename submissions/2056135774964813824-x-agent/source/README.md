# X-Agent

> Autonomous AI crypto intelligence — one API token, all public data, fully self-hostable.

X-Agent is a "Perplexity for crypto" research surface with a Bloomberg-terminal feel.
It clusters live narratives from public RSS, pulls real prices from CoinGecko,
on-chain TVL from DefiLlama, and routes every LLM call through **OpenRouter** so a
single key unlocks the entire model catalog.

**Hard constraints baked into the product:**

- OpenRouter is the **only** API token. No OpenAI-direct, no Anthropic-direct, no per-vendor keys.
- **No** Twitter API, **no** Reddit API, **no** paid feeds.
- **Real data only.** No mock arrays, no synthetic sparklines, no simulated signals.
  Where a number is not available from a public source, the UI hides the tile
  rather than fabricate it.

---

## Demo

<div align="center">
  <a href="https://github.com/Dairus01/X-Agent/releases/download/readme-demo/demo.mp4">
    <img src="docs/demo.gif" width="800" alt="X-Agent demo walkthrough" />
  </a>
</div>

Walkthrough of the landing page, research chat, market dashboard, narratives, and watchlist.  
▶ [Watch full demo with audio](https://github.com/Dairus01/X-Agent/releases/download/readme-demo/demo.mp4)  
🎥 [Watch the clearer video on Google Drive](https://drive.google.com/file/d/1TMU0Sz0rzlUBhNxzpDa4Ip0ImAAwXxwg/view?usp=sharing)

---

## Table of contents

1. [Quick start](#quick-start)
2. [Environment](#environment)
3. [What's in the box](#whats-in-the-box)
4. [System architecture](#system-architecture)
5. [Request flow — research chat (SSE)](#request-flow--research-chat-sse)
6. [Data pipeline — narratives](#data-pipeline--narratives)
7. [Module dependency graph](#module-dependency-graph)
8. [State & persistence model](#state--persistence-model)
9. [Caching strategy](#caching-strategy)
10. [Core concepts explained](#core-concepts-explained)
11. [API reference](#api-reference)
12. [Project structure](#project-structure)
13. [Scripts](#scripts)
14. [Self-hosting checklist](#self-hosting-checklist)
15. [Extending X-Agent](#extending-x-agent)
16. [License](#license)

---

## Quick start

```bash
# 1. Clone & install
npm install

# 2. Set your single token
cp .env.example .env.local
#   → edit .env.local and set OPENROUTER_API_KEY

# 3. Run
npm run dev      # http://localhost:3000
```

That's the whole setup. No auth, no accounts, no database, no settings page.

### Production

```bash
npm run build
npm start
```

Deploys cleanly to Vercel, Fly, Railway, or any Node host. Set
`OPENROUTER_API_KEY` in the host's env panel — that is the only required variable.

---

## Environment

| Variable | Required | Default | What |
|---|---|---|---|
| `OPENROUTER_API_KEY` | yes | — | Single LLM credential. Get one at openrouter.ai |
| `OPENROUTER_MODEL` | no | `google/gemini-2.0-flash-001` | Default model id (any OpenRouter slug) |
| `OPENROUTER_REFERER` | no | `https://x-agent.local` | App attribution on OpenRouter |
| `OPENROUTER_TITLE` | no | `X-Agent` | App attribution on OpenRouter |

Everything else (prices, narratives, news, TVL) hits public endpoints and needs
no key.

---

## What's in the box

| Surface | Source | Endpoint |
|---|---|---|
| `/research` | OpenRouter SSE stream | `POST /api/chat` |
| `/market` | CoinGecko public REST | `GET /api/market` |
| `/narratives` | RSS clustered server-side | `GET /api/narratives` |
| `/sources` | RSS aggregator | `GET /api/news` |
| `/watchlist` | localStorage + CoinGecko | `GET /api/market?ids=…` |
| `/signals` | Derived from market + RSS | `GET /api/signals` |
| `/agents` | Static config | `src/lib/agents.ts` |
| TVL widget | DefiLlama public REST | `GET /api/tvl` |

---

## System architecture

X-Agent is a single Next.js 15 application. Browser code is React Server
Components + client islands; server code lives in route handlers under
`src/app/api`. There is **no separate backend**, **no database**, and **no
job queue** — the runtime is whatever Node host you point at it.

```
                            ┌───────────────────────────┐
                            │          Browser          │
                            │  (Next.js App Router UI)  │
                            │                           │
                            │  /research  /market       │
                            │  /narratives /watchlist   │
                            │  /sources   /agents       │
                            └───────────────┬───────────┘
                                            │  HTTPS  (SSE for /api/chat)
                                            ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                Next.js Route Handlers  (Node runtime)            │
   │                                                                  │
   │   /api/chat       /api/market       /api/narratives              │
   │   /api/news       /api/tvl          /api/signals   /api/research │
   │                                                                  │
   │   • SYSTEM_PROMPT injection      • Hand-rolled schema guards     │
   │   • SSE pass-through proxy       • 5-min revalidate cache        │
   └───────┬───────────────┬───────────────┬───────────────┬──────────┘
           │               │               │               │
           ▼               ▼               ▼               ▼
   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌──────────────┐
   │ OpenRouter │   │ CoinGecko  │   │ DefiLlama  │   │  Public RSS  │
   │   (LLMs)   │   │  (prices)  │   │   (TVL)    │   │  feeds (×N)  │
   └────────────┘   └────────────┘   └────────────┘   └──────────────┘
```

**Key properties of this layout:**

- The browser never talks to OpenRouter directly. The route handler is a thin
  proxy that injects the system prompt and forwards the SSE stream unchanged.
  The OpenRouter key never leaves the server.
- All third-party data sources are **public REST or RSS**. No webhook
  callbacks, no OAuth dance, no Twitter/Reddit gates.
- Every numeric tile in the UI is a live fetch from one of the four boxes
  above. Sparklines, momentum, sentiment — derived deterministically from real
  payloads.

---

## Request flow — research chat (SSE)

The chat experience streams tokens to the browser as they arrive from
OpenRouter. The route handler does not buffer; it forwards `Response.body`
directly.

```
   Browser                Route /api/chat              OpenRouter
      │                          │                           │
      │ POST {messages, model}   │                           │
      ├─────────────────────────►│                           │
      │                          │ parse + guard schema      │
      │                          │ inject system prompt      │
      │                          │ assertOpenRouter()        │
      │                          │                           │
      │                          │ POST chat/completions     │
      │                          │ stream:true               │
      │                          ├──────────────────────────►│
      │                          │                           │
      │                          │   SSE: data: {...}        │
      │                          │◄──────────────────────────┤
      │   SSE: data: {...}       │                           │
      │◄─────────────────────────┤  (raw body pass-through)  │
      │                          │                           │
      │   ...token by token...   │   ...token by token...    │
      │                          │                           │
      │   SSE: [DONE]            │                           │
      │◄─────────────────────────┤◄──────────────────────────┤
```

Why this matters:

- **First-token latency** is bounded by the OpenRouter upstream, not by your
  server, because nothing is collected before forwarding.
- **Backpressure** is handled by the underlying `ReadableStream` — if the
  browser closes the connection, `req.signal` aborts the upstream fetch.
- **Cancellation** is one source of truth: the browser closing the tab cancels
  the OpenRouter call, which stops the meter on OpenRouter's side.

Relevant files:

- `src/app/api/chat/route.ts` — handler, system-prompt injection
- `src/lib/openrouter.ts` — upstream client (`openrouterStream` and `openrouterComplete`)
- `src/lib/use-chat-stream.ts` — browser-side SSE consumer with abort
- `src/lib/api/chat-messages.ts` — message-array schema guard

---

## Data pipeline — narratives

`/narratives` is the most "intelligent" non-LLM surface. It clusters live RSS
items into a fixed taxonomy (AI, RWA, DeFi, L2s, infra, gaming/NFT,
stablecoins, memes) and emits, per category:

- a **24h sparkline** (hourly mention counts)
- a **momentum score** (exponentially-decayed mention count, normalized 0–100)
- a **sentiment ratio** (bullish vs bearish keyword frequency, in `[0,1]`)
- a **mention count**

```
   Public RSS feeds (CoinDesk, The Block, Decrypt, Bankless, …)
            │
            ▼
   ┌────────────────────────┐
   │ src/lib/sources/rss.ts │   tolerant RSS 2.0 / Atom parser
   │  fetchFeed × N feeds   │   (no heavy XML dependency)
   │  next: { revalidate }  │   5-minute edge cache
   └──────────┬─────────────┘
              │  RSSItem[]
              ▼
   ┌──────────────────────────────────────────────┐
   │  src/lib/sources/narratives.ts               │
   │  aggregateNarratives(items)                  │
   │                                              │
   │  for each category in NARRATIVE_CATEGORIES:  │
   │    matches  = items whose (title+summary)    │
   │               contain ANY category.keyword   │
   │    ages_h   = age of each matched item       │
   │    decayed  = Σ  0.5 ^ (age_h / 12)          │
   │    momentum = min(100, round(decayed × 12))  │
   │                                              │
   │    bull / bear = keyword counts on matches   │
   │    sentiment   = (bull - bear)/(bull+bear)   │
   │                  mapped from [-1,1] → [0,1]  │
   │                                              │
   │    spark[24]   = hourly bucket of mentions   │
   └──────────────────────┬───────────────────────┘
                          │  Narrative[]
                          ▼
              Rendered by NarrativeCard on /narratives
```

The clusterer is deterministic — the same input feed produces the same
output. There is no LLM in this path on purpose: the narrative tiles must be
reproducible and free from hallucinated tokens.

If a category has zero matches, its tile renders with a flat sparkline rather
than fabricated noise. If `volume24h` cannot be sourced (it cannot, from RSS
alone), the tile hides that field entirely — see the comment in
`src/lib/sources/narratives.ts` for the explicit rationale.

---

## Module dependency graph

A high-level view of who imports whom. Arrows point from caller to callee.

```
                       ┌──────────────────┐
                       │   src/app/(app)  │  ← UI pages (RSC + client islands)
                       │   src/app/api    │  ← Route handlers
                       └─────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────────┐
              ▼                  ▼                      ▼
   ┌─────────────────┐  ┌───────────────────┐   ┌────────────────┐
   │ src/components  │  │   src/lib/api     │   │   src/lib      │
   │  (UI pieces)    │  │  http, chat-msgs  │   │ (domain logic) │
   └─────────────────┘  └─────────┬─────────┘   └────────┬───────┘
                                  │                       │
                                  ▼                       ▼
                       ┌────────────────────┐   ┌─────────────────────┐
                       │ src/lib/openrouter │   │  src/lib/sources/*  │
                       │  (single LLM gw)   │   │  rss, coingecko,    │
                       │                    │   │  defillama,         │
                       │                    │   │  narratives         │
                       └─────────┬──────────┘   └──────────┬──────────┘
                                 │                          │
                                 ▼                          ▼
                          openrouter.ai             Public REST / RSS
```

**Rules of dependency that the codebase enforces by convention:**

- `src/app/api/*` may import from `src/lib/*` but **never** vice versa. Route
  handlers are the only place network entry is allowed.
- `src/lib/sources/*` are pure data-fetchers — they don't know about Next.js
  or React. They are unit-testable in isolation.
- `src/lib/openrouter.ts` is the **only** module that holds the API key. The
  key is read once in `src/lib/env.ts` and never re-exported.
- `src/components/*` may import client-side stores (`src/lib/stores/*`) but
  must not import server-only modules.

---

## State & persistence model

Two kinds of state live in the client. Server state is **stateless** — it
holds nothing between requests.

```
   ┌─────────────────────────── Client ─────────────────────────────┐
   │                                                                │
   │  zustand store (in-memory)        │  localStorage (persisted)  │
   │  ──────────────────────────       │  ─────────────────────     │
   │  • UI state (sidebar, theme)      │  xagent.watchlist          │
   │  • current research session       │  xagent.research-history   │
   │  • streamed tokens (transient)    │  xagent.theme              │
   │                                   │                            │
   └─────────────────────┬─────────────┴────────────────────────────┘
                         │ on mount, hydrates from localStorage
                         │ on change,  writes via zustand/persist
                         ▼
   ┌─────────────────────────── Server ─────────────────────────────┐
   │                                                                │
   │   Stateless route handlers.                                    │
   │   No DB, no Redis, no session cookies, no user table.          │
   │   Each request fans out to a public source and returns.        │
   │                                                                │
   └────────────────────────────────────────────────────────────────┘
```

**Why "no DB" is a feature, not a limitation:**

- The deployment surface is one process. `git pull && npm run build && npm
  start` is the entire upgrade path.
- Privacy: your watchlist and research history never leave the browser.
- Cost: no managed Postgres, no Redis bill.

If you want to add a DB later, add it. The store interfaces in
`src/lib/stores/*` are intentionally small and would map cleanly onto any
key-value backend.

---

## Caching strategy

X-Agent is built to run inside CoinGecko / DefiLlama / RSS public rate limits.
All upstream fetches go through Next.js's `fetch` with `next.revalidate`:

```
   Route handler  ──►  fetch(url, { next: { revalidate: 300 } })
                                                      │
                                                      ▼
                            ┌────────────────────────────────────┐
                            │  Next.js Data Cache (per-host)     │
                            │   key   = (url, headers, method)   │
                            │   TTL   = 300 s (5 min)            │
                            │   scope = per-deployment           │
                            └────────────────────────────────────┘
```

- The CoinGecko and DefiLlama routes set `revalidate: 300`. That ceiling-binds
  outbound RPS regardless of how many users hit `/market`.
- The chat route uses `dynamic = "force-dynamic"` and `Cache-Control:
  no-cache, no-transform` — SSE must never be cached.
- The RSS aggregator caches per-feed for 5 minutes. A page refresh on
  `/narratives` does not re-fetch the same feed twice.

On Vercel, this maps to the ISR Data Cache. On a plain Node host, it maps to
in-memory caching for the lifetime of the process. Both work; the latter just
forgets on restart.

---

## Core concepts explained

### 1. The single-key principle

OpenRouter is a unified gateway to model providers (Anthropic, OpenAI, Google,
Meta, Mistral, etc.). X-Agent uses it as the **only** LLM credential so users
never need to:

- juggle keys per vendor,
- switch SDKs when changing models,
- pay distinct subscriptions to evaluate providers.

The cost of this choice is one extra hop (browser → X-Agent → OpenRouter →
provider). The benefit is that the agent catalogue in `src/lib/agents.ts` can
mention models from any provider — the runtime just picks the slug.

### 2. Source-backed answers

The system prompt in `src/app/api/chat/route.ts` instructs the model to
**cite sources**, **refuse to fabricate prices / TVL**, and **be concise**.
This is a behavioural guardrail, not a hard filter — combine it with a model
that respects instructions (Sonnet / Gemini-Pro-class) for best results.

### 3. Narrative clustering math

For each category `c`:

```
   decayed(c)  = Σ   0.5 ^ ( age_hours_i / 12 )         over matched items i
   momentum(c) = min(100, round( decayed(c) × 12 ))
   sentiment(c)= ((bull(c) - bear(c)) / (bull(c)+bear(c)) + 1) / 2
```

A half-life of 12 hours means a 12h-old article counts half as much as a
fresh one, and a 24h-old article counts a quarter. The `× 12` and `min(100)`
together give a curve that comfortably saturates at "many recent mentions"
without making a single old article look hot.

Sentiment is intentionally lexical, not LLM-derived: the goal is a deterministic
signal that does not flicker between page loads.

### 4. Hide-rather-than-fake

When a public source cannot supply a number — for example, per-narrative
24-hour token volume from RSS alone — the UI hides that field. Search the
codebase for `volume24h === 0` to see the explicit checks. This is the cleanest
expression of the "real data only" rule.

### 5. Stateless routes, stateful client

Every server route is a pure function of its inputs. All durable user
preferences (watchlist, research history) live in `localStorage` via
`zustand/persist`. This makes the server horizontally scalable for free and
makes the client privacy-preserving for free.

---

## API reference

All endpoints are under `src/app/api`. They are designed to be callable from
your own scripts, not just the X-Agent UI.

### `POST /api/chat`

Streaming chat against OpenRouter.

Request:

```json
{
  "messages": [
    { "role": "user", "content": "What is the BTC dominance trend?" }
  ],
  "model":   "anthropic/claude-sonnet-4",
  "temperature": 0.35
}
```

Response: `text/event-stream`. Tokens arrive as OpenRouter's native SSE chunks.
The handler injects a system prompt if you don't supply one.

### `GET /api/market?ids=bitcoin,ethereum`

CoinGecko market data, proxied with a 5-minute cache. Without `ids`, returns
top-50 by market cap.

### `GET /api/narratives`

Returns the clustered narrative array (see "Data pipeline" above).

### `GET /api/news`

Aggregated RSS items, normalized to `{ id, title, url, source, publishedAt, summary }`.

### `GET /api/tvl`

DefiLlama protocol TVL, used by the dashboard TVL widget.

### `GET /api/signals`

Derived trading signals — generated server-side from the data above. See
`src/lib/signals/generate.ts`. Pure function of public data; no LLM call.

### `POST /api/research`

Non-streaming research endpoint that returns a structured JSON answer (used
for the research timeline view). See `src/lib/research/context.ts`.

---

## Project structure

```
src/
├── app/
│   ├── (app)/               ← app shell: sidebar, command bar, activity panel
│   │   ├── dashboard        ← live counts + RSS top-5
│   │   ├── research         ← SSE chat against OpenRouter
│   │   ├── market           ← CoinGecko table, pin → watchlist
│   │   ├── narratives       ← live RSS clustering
│   │   ├── watchlist        ← persisted picks resolved against CoinGecko
│   │   ├── sources          ← raw RSS feed
│   │   ├── signals          ← derived trade signals
│   │   ├── reports          ← saved research outputs
│   │   ├── skills           ← skill catalogue
│   │   └── agents           ← static agent catalogue
│   ├── api/
│   │   ├── chat             ← OpenRouter SSE proxy
│   │   ├── market           ← CoinGecko proxy + cache
│   │   ├── tvl              ← DefiLlama proxy + cache
│   │   ├── news             ← RSS aggregator
│   │   ├── narratives       ← RSS → clustered narratives
│   │   ├── signals          ← derived signals
│   │   └── research         ← structured research JSON
│   ├── layout.tsx
│   └── page.tsx             ← landing page
├── components/              ← UI: cards, charts, layout
└── lib/
    ├── openrouter.ts        ← single LLM gateway (stream + complete)
    ├── env.ts               ← env-var reader and guards
    ├── narratives.ts        ← NARRATIVE_CATEGORIES taxonomy
    ├── agents.ts            ← static agent catalogue
    ├── skills.ts            ← skill catalogue
    ├── types.ts             ← shared types
    ├── api/                 ← http helpers, schema guards
    ├── sources/             ← rss, coingecko, defillama, narratives
    ├── research/            ← research-context assembly
    ├── signals/             ← signal generation
    ├── stores/              ← zustand stores (ui, theme, watchlist, research)
    └── use-chat-stream.ts   ← browser SSE consumer
```

---

## Scripts

```bash
npm run dev         # local dev server with HMR
npm run build       # production build
npm start           # serve production build
npm run lint        # Next.js + ESLint
npm run typecheck   # tsc --noEmit
npm run check       # lint + typecheck (CI gate)
```

---

## Self-hosting checklist

- [ ] `OPENROUTER_API_KEY` set in the deploy environment
- [ ] No other secrets needed
- [ ] `.env.local` is gitignored (verify before pushing)
- [ ] Public RSS feeds reachable from the host network
- [ ] CoinGecko / DefiLlama reachable (no allowlist needed — they're public CDN)
- [ ] Outbound HTTPS allowed on port 443
- [ ] Node 18.18+ (Next.js 15 requirement)

---

## Extending X-Agent

Common modifications and where to make them:

| Want to… | Edit |
|---|---|
| Add a new RSS feed | `DEFAULT_FEEDS` in `src/lib/sources/rss.ts` |
| Add a new narrative category | `NARRATIVE_CATEGORIES` in `src/lib/narratives.ts` |
| Change the default model | `OPENROUTER_MODEL` env var, or `env.ts` default |
| Tune the system prompt | `SYSTEM_PROMPT` in `src/app/api/chat/route.ts` |
| Add a new market source | new file under `src/lib/sources/`, new route under `src/app/api/` |
| Tune the narrative half-life | `HALF_LIFE_HOURS` in `src/lib/sources/narratives.ts` |
| Adjust cache TTL | `next.revalidate` value in each source module |

The codebase is intentionally small (you can read every server file in an
afternoon). Forks are encouraged.

---

## License

MIT. Clone it, fork it, swap models, add feeds, ship your own variant.
