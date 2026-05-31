# RugWatch — Production MVP

Autonomous rug pull detection and exit agent on OKX OnchainOS.

---

## What It Does

Monitors on-chain signals for watched tokens, computes a composite RugScore (0–1), and exits positions autonomously when the threshold is crossed. No human approval. No delay.

```
token added → monitoring loop (every 60s)
                ↓
         5 signals fetched in parallel
         - dev wallet movement      (weight 0.30)
         - smart money exit         (weight 0.25)
         - holder concentration     (weight 0.20)
         - liquidity withdrawal     (weight 0.15)
         - trade flow toxicity      (weight 0.10)
                ↓
         RugScore = Σ(signal × weight)
                ↓
         ≥ 0.65 → warning
         ≥ 0.80 → auto-exit → USDC
```

All signal data from OKX OnchainOS. Exit routes across 500+ liquidity sources via the OKX DEX aggregator.

---

## Architecture

```
                    Vercel
                    ┌──────────────────────┐
  /demo (static) ──►│  Next.js 14          │
  / (dashboard)  ──►│  Rewrites /api/* ────┼──► Backend VPS (Fly.io)
                    └──────────────────────┘    ┌─────────────────────┐
                                                │  FastAPI + uvicorn  │
                                                │  SQLite (persisted) │
                                                │  onchainos CLI      │
                                                │  Monitoring loops   │
                                                └─────────────────────┘
```

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Python, FastAPI, asyncio, aiosqlite |
| On-chain data | OKX OnchainOS (`onchainos` CLI) |
| Exit execution | `onchainos swap execute` (OKX DEX aggregator) |
| Wallet | OKX Agentic Wallet (email OTP login) |
| Chain | X Layer (zero gas) |
| Hosting | Vercel (frontend) + Fly.io (backend) |

---

## MVP Features

### Core Detection Engine
- 5 parallel signal fetchers via onchainos CLI
- Weighted composite RugScore (0–1)
- Per-token monitoring loops (configurable interval)
- Warning at 0.65, auto-exit at 0.80 (configurable per token)

### Auto-Exit with Safety Rails
- Full autonomous swap to USDC when exit threshold crossed
- **Kill switch** — instant toggle to block all exits
- **Dry run mode** — logs what would execute without swapping
- **Slippage guard** — default 0.5% max slippage on exit swaps
- Structured logging of every exit attempt and result

### Wallet Auth
- OKX Agentic Wallet login IS the authentication (no separate accounts)
- Email OTP → session token → Bearer auth on protected endpoints
- Session stored in sessionStorage (cleared on tab close)

### Persistence
- SQLite database (survives backend restarts)
- Tokens, signals, score history, and events persisted
- Monitoring loops resume automatically on startup

### Concurrency Safety
- All shared state behind asyncio.Lock
- No race conditions between monitoring tasks and API handlers

### Production Frontend
- Error boundaries with retry
- Loading skeletons on first load
- Responsive layout (mobile-friendly)
- Accessible SVG gauges and labeled inputs
- SEO metadata (OpenGraph, Twitter cards)

### Public Demo Page (`/demo`)
- Self-contained — zero backend dependency
- Animated walkthrough: Safe → Warning → Danger → Exit
- Reuses real dashboard components with simulated data
- Shareable URL for investors/judges
- Works on Vercel with no config

---

## API

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/status` | GET | No | All token states + global events |
| `/api/health` | GET | No | Health check |
| `/api/events` | GET | No | SSE stream of real-time events |
| `/api/wallet/status` | GET | No | Wallet connection state |
| `/api/wallet/login` | POST | No | Send OTP to email |
| `/api/wallet/verify` | POST | No | Verify OTP, returns session token |
| `/api/wallet/logout` | POST | Yes | End session |
| `/api/wallet/balance` | GET | Yes | Wallet balance + assets |
| `/api/wallet/buy` | POST | Yes | Buy token with USDC |
| `/api/watch` | POST | Yes | Add token to watchlist |
| `/api/watch/:address` | DELETE | Yes | Remove token |
| `/api/simulate-rug` | POST | Yes | Inject signals for demo |
| `/api/kill-switch` | GET | Yes | Kill switch state |
| `/api/kill-switch` | POST | Yes | Toggle kill switch |

---

## Signal Sources

| Signal | Weight | OKX Skill | CLI Command |
|---|---|---|---|
| Dev wallet movement | 0.30 | `okx-dex-signal` | `onchainos tracker activities --tracker-type multi_address` |
| Smart money exit | 0.25 | `okx-dex-signal` | `onchainos tracker activities --tracker-type smart_money` |
| Holder concentration | 0.20 | `okx-dex-token` | `onchainos token cluster-overview` |
| Liquidity withdrawal | 0.15 | `okx-dex-market` | `onchainos token liquidity` |
| Trade flow toxicity | 0.10 | `okx-dex-market` | `onchainos token trades` |

---

## Project Structure

```
rugwatch/
├── backend/
│   ├── main.py              # FastAPI app, routes, lifespan
│   ├── config.py            # Pydantic Settings from .env
│   ├── db.py                # SQLite persistence (aiosqlite)
│   ├── app_state.py         # Thread-safe state with asyncio.Lock
│   ├── auth.py              # Wallet session → Bearer token auth
│   ├── monitor.py           # Async monitoring loop per token
│   ├── signals.py           # 5 signal calculators (onchainos CLI)
│   ├── scorer.py            # Weighted RugScore aggregation
│   ├── exit.py              # Auto-exit with safety rails
│   ├── wallet.py            # OKX Agentic Wallet wrapper
│   ├── state.py             # TokenState / SignalSnapshot dataclasses
│   ├── logging_config.py    # Structured logging setup
│   ├── Dockerfile           # Production container
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Dashboard entry
│   │   ├── dashboard.tsx    # Main dashboard (responsive)
│   │   ├── layout.tsx       # Global layout + SEO metadata
│   │   └── demo/
│   │       ├── page.tsx     # Demo route entry
│   │       └── demo-view.tsx # Self-contained animated demo
│   ├── components/
│   │   ├── RiskGauge.tsx    # SVG score gauge
│   │   ├── SignalPanel.tsx  # 5 signal bars
│   │   ├── ScoreChart.tsx   # Score history sparkline
│   │   ├── WatchList.tsx    # Token list sidebar
│   │   ├── EventLog.tsx     # Real-time event feed
│   │   ├── AddTokenForm.tsx # Add token form
│   │   ├── WalletPanel.tsx  # Wallet login/status
│   │   ├── BuyPosition.tsx  # Buy token with USDC
│   │   └── ErrorBoundary.tsx # Error boundary wrapper
│   └── lib/
│       ├── types.ts         # TypeScript interfaces
│       ├── api.ts           # API helpers + session token
│       └── demo-data.ts     # Pre-computed demo snapshots
└── README.md
```

---

## Setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Configure .env (API keys, frontend URL, etc.)
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set BACKEND_URL if not using localhost
npm run dev
```

### Demo (no setup needed)

Open `http://localhost:3000/demo` — works with backend stopped.

---

## Deploy

### Frontend → Vercel

1. Push repo to GitHub
2. Import in Vercel dashboard
3. Set root directory to `frontend`
4. Add env var: `BACKEND_URL=https://your-backend.fly.dev`
5. Deploy

### Backend → Fly.io

```bash
cd backend
fly launch
fly volumes create data --size 1
# Set secrets:
fly secrets set FRONTEND_URL=https://rugwatch.vercel.app
fly secrets set OKX_API_KEY=... OKX_SECRET_KEY=... OKX_API_PASSPHRASE=...
fly deploy
```

---

## What's Cut (not MVP)

- WebSockets (polling + SSE is fine)
- Rate limiting (single-user behind wallet auth)
- Postgres (SQLite on persistent volume)
- Automated tests
- CI/CD pipeline
- Multi-wallet support
- Email/Telegram notifications
- Admin panel
- Token price charts
