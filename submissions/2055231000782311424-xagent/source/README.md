# ArgosX — Autonomous DeFi Agent

> **An autonomous AI agent that watches your DeFi portfolio 24/7, detects risks before they happen, simulates trades before you make them, and executes swaps in plain English — powered by OKX Agentic Wallet + Groq LLaMA.**

**Live Demo: https://xagent-theta.vercel.app/**

**Demo Video: https://www.youtube.com/watch?v=801dVSauaRw**

**X Post: https://x.com/jmadhan143/status/2056254247801692420**

**🏆 Built for: Build X-Agent Hackathon (Builder Track) · May 15–18, 2026**

---

## 🧠 The Problem

DeFi users lose money not from bad intentions — but from **information overload and slow reaction time**.

```
❌ You're asleep when ETH drops 15% and wipes your leveraged position
❌ You hold 80% of your portfolio in one asset without realizing the risk
❌ You guess "should I swap now?" with no data to back the decision
❌ You miss a +9% ARB signal because you weren't watching
❌ You execute a swap blind — with no idea what it does to your risk profile
```

**There is no tool that watches, warns, simulates, AND executes — all in one place.**

Until now.

---

## ✅ The Solution

**ArgosX** is an always-on autonomous AI agent that:

```
✅ Monitors your wallet every 60 seconds across ETH, BNB, Polygon
✅ Detects concentration risk, low liquidity, missing stablecoins
✅ Surfaces live OKX market signals — bullish surges, bearish drops
✅ Lets you simulate "what if I move 50% to ETH?" BEFORE executing
✅ Executes swaps from plain English via OKX DEX aggregator
✅ Runs a persistent AI advisor that knows your exact portfolio
✅ Exports a professional PDF risk report in one click
```

---

## 🎬 How It Works — Full Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE (React)                         │
│                                                                     │
│  💼 Portfolio  🤖 Auto-Pilot  📡 Signals  🔔 Alerts                │
│  🔮 What-If   ⚡ Swap         🧠 Oracle AI                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │  HTTP / REST
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (Python)                         │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ OKX Skills  │  │ Risk Engine  │  │  AutoPilot │  │  Oracle  │ │
│  │             │  │              │  │  Agent     │  │  AI Chat │ │
│  │ • Wallet    │  │ • Score 0-100│  │  60s loop  │  │  Memory  │ │
│  │ • DEX Swap  │  │ • 4 checks   │  │  Rules     │  │  Context │ │
│  │ • Gas Price │  │ • Alerts     │  │  Strategies│  │  LLaMA   │ │
│  │ • Signals   │  │              │  │            │  │          │ │
│  └──────┬──────┘  └──────────────┘  └────────────┘  └──────────┘ │
│         │                                                           │
└─────────┼───────────────────────────────────────────────────────────┘
          │  HMAC-SHA256 Signed API Calls
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     OKX AGENTIC WALLET API                          │
│                                                                     │
│  /api/v5/wallet/asset/token-balances   → Real wallet balances       │
│  /api/v5/market/ticker                 → Live prices (8 pairs)      │
│  /api/v5/dex/aggregator/swap           → Execute DEX swaps          │
│  /api/v5/dex/aggregator/gas-price      → Live gas data              │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     GROQ (LLaMA 3 70B)                              │
│                                                                     │
│  • NL Swap Parsing  ("swap 10 USDT to ETH if gas < 20 gwei")       │
│  • What-If Simulation  (projects risk + value change)               │
│  • Oracle AI Chat  (persistent memory, portfolio-aware)             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 5 Features That Make This Unique

### 1. 🤖 Auto-Pilot — Fully Autonomous Agent

The agent runs a background loop **every 60 seconds** without any human input.

```
TICK #1  →  Fetch portfolio  →  Score risk  →  Check signals
              ↓                    ↓               ↓
         $11,980 total      72/100 HIGH      ARB +8.9% BULLISH
              ↓
         [CRITICAL RULE TRIGGERED]
              ↓
         Execute: swap 25% ETH → USDT (emergency rebalance)
              ↓
         Log: "Emergency rebalance: executed | Score now 45/100"
```

**Strategy Templates:**
| Strategy | Trigger | Action |
|---|---|---|
| 🛡️ Conservative | Risk > 70 | Sell volatile → USDT |
| ⚡ Momentum | Signal > +5% bullish | Buy surging asset |
| 💰 Yield Max | Top signal detected | Rotate into winner |

**Custom Rules:** Build your own: `IF ETH bullish > 5% THEN swap 50 USDT to ETH`

---

### 2. 🔮 What-If Simulator — Simulate Before You Execute

```
User types:  "go all-in on ETH"
                    ↓
            LLaMA 3 70B analyzes:
            • Current: ETH 79%, USDT 13%, MATIC 4%, BNB 4%
            • Proposed: ETH ~100%
            • Market: MATIC -6.3% BEARISH, ARB +8.9% BULLISH
                    ↓
            Result:
            ❌ BAD MOVE
            Risk: LOW → CRITICAL (score 45 → 95)
            Projected change: -2.3%
            Key Risks: ["Single-asset exposure", "No stablecoin buffer"]
            Key Benefits: ["Max ETH upside if bull run"]
```

Try `"convert 30% to USDT"` instead → `✅ GOOD MOVE · Risk: HIGH → MEDIUM`

---

### 3. ⚡ Natural Language Swap — Powered by OKX DEX

```
You type:  "swap 10 USDT to ETH if gas is below 20 gwei"
                    ↓
           LLaMA 3 parses intent:
           { from: USDT, to: ETH, amount: 10, condition: "gas < 20" }
                    ↓
           Check live gas (OKX Gas API):
           Standard: 15 gwei ✅  (below threshold)
                    ↓
           Execute via OKX DEX Aggregator:
           Best route found → swap confirmed
                    ↓
           ✅ Swapped 10 USDT → ETH
```

**Condition examples:**
- `"swap 0.5 ETH to USDC if gas < 20 gwei"`
- `"buy 100 USDT worth of BNB"`
- `"swap all my MATIC to ETH"`

---

### 4. 🧠 Oracle AI — Memory-Enabled Portfolio Advisor

Unlike a generic chatbot, Oracle **knows your exact portfolio** and **remembers your conversation**.

```
Session memory (last 10 messages preserved per session)
         +
Live context injected every message:
  • Portfolio value: $11,980
  • Risk: HIGH (72/100)
  • Top signal: ARB +8.9% BULLISH
  • Auto-Pilot: RUNNING
         +
LLaMA 3 70B response (concise, actionable, no hedging)
```

**Sample Q&A:**
```
You:     "What's my biggest risk right now?"
Oracle:  "ETH is 79% of your $11,980 portfolio — 
          well above the 50% safe threshold. 
          Swap ~$2,000 ETH to USDC to bring it 
          to a safer 62% concentration."

You:     "OK what's the best signal right now?"
Oracle:  "ARB is up +8.9% in 24h — strongest 
          bullish signal. Consider: swap 50 USDT to ARB."
```

---

### 5. 📊 Risk Engine — 4-Dimensional Portfolio Scoring

```
PORTFOLIO SCORE = Concentration (40pts) + Diversification (20pts)
                + Portfolio Size (20pts) + Stablecoin Buffer (20pts)

Example: ETH 79%, USDT 13%, MATIC 4%, BNB 4%

  Concentration:   ETH = 79% → 28/40 pts (HIGH risk)
  Diversification: 4 assets  →  5/20 pts (OK)
  Portfolio size:  $11,980   →  0/20 pts (good)
  Stablecoin:      13% USDT  → 10/20 pts (low but present)
                              ────────────
  TOTAL RISK SCORE:           43/100 → MEDIUM
```

**Alerts generated automatically:**
- `[HIGH] CONCENTRATION — ETH makes up 79.3% of your portfolio`
- `[MEDIUM] PRICE_MOVEMENT — ARB surged +8.9% in 24h`
- `[MEDIUM] PRICE_MOVEMENT — MATIC dropped -6.3% in 24h`

---

## 📡 OKX Skill Suite Integration

| OKX API Endpoint | Used For | Code Location |
|---|---|---|
| `/api/v5/wallet/asset/token-balances` | Read real wallet balances across ETH/BSC/Polygon | `agent/okx_skills.py` |
| `/api/v5/market/ticker` | Live prices + 24h change for 8 pairs | `agent/signal_engine.py` |
| `/api/v5/dex/aggregator/swap` | Execute token swaps via DEX aggregator | `agent/okx_skills.py` |
| `/api/v5/dex/aggregator/gas-price` | Live gas price (standard/fast/instant) | `agent/okx_skills.py` |

All calls use **HMAC-SHA256 signing** with your OKX API key, secret, and passphrase.

---

## 🗂 Project Structure

```
okx-defi-command-center/
│
├── backend/
│   ├── main.py                  ← FastAPI server · 20+ endpoints
│   ├── requirements.txt
│   │
│   ├── agent/
│   │   ├── okx_skills.py        ← OKX API integration (wallet, swap, gas, prices)
│   │   ├── autopilot.py         ← Autonomous 60s monitoring loop
│   │   ├── risk_engine.py       ← Portfolio risk scoring (0-100)
│   │   ├── signal_engine.py     ← Live OKX market signal processing
│   │   └── swap_agent.py        ← NL → swap (LLaMA parsing + OKX execution)
│   │
│   └── models/
│       ├── portfolio.py         ← Pydantic models
│       └── alerts.py            ← Alert + swap request models
│
└── frontend/
    └── src/
        └── App.jsx              ← React dashboard · 7 tabs · MetaMask connect
```

---

## 🌐 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server status + OKX connection |
| `GET` | `/portfolio/{wallet}` | Full portfolio + risk score |
| `GET` | `/signals` | Live signals for 8 major pairs |
| `GET` | `/risk/{wallet}` | Detailed risk report |
| `GET` | `/alerts/{wallet}` | Combined risk + signal alerts |
| `POST` | `/swap/nl` | Natural language swap execution |
| `POST` | `/autopilot/start` | Start autonomous agent |
| `POST` | `/autopilot/stop` | Stop autonomous agent |
| `GET` | `/autopilot/logs` | Live agent log feed |
| `POST` | `/autopilot/rule` | Add custom auto-execution rule |
| `GET` | `/strategies` | Get strategy templates |
| `POST` | `/strategies/{name}/activate` | Load a strategy into Auto-Pilot |
| `POST` | `/simulate` | What-If portfolio simulation |
| `POST` | `/ai/chat` | Oracle AI chat with memory |
| `DELETE` | `/ai/chat/{session_id}` | Clear conversation memory |
| `GET` | `/report/{wallet}` | Generate PDF-ready HTML report |

---

## ⚡ Quick Start

### 1. Clone & install backend

```bash
git clone https://github.com/YOUR_USERNAME/okx-defi-command-center
cd okx-defi-command-center

pip install -r requirements.txt

cd backend
python main.py
# → Running at http://localhost:8000
```

### 2. Start frontend

```bash
cd frontend
npm install
npm run dev
# → Dashboard at http://localhost:5173
```

### 3. Configure `.env`

```env
# OKX API (get from https://www.okx.com/account/my-api)
OKX_API_KEY=your_key
OKX_SECRET_KEY=your_secret
OKX_PASSPHRASE=your_passphrase

# Groq (get from https://console.groq.com)
GROQ_API_KEY=your_groq_key

PORT=8000
```

> **Demo Mode:** Without API keys, the app runs fully with realistic mock data. All 7 features are demonstrable instantly.

---

## 🔄 Auto-Pilot Lifecycle

```
User clicks START
      │
      ▼
autopilot.start(wallet_address)
      │
      └─── Every 60 seconds:
               │
               ├─ 1. Fetch portfolio (OKX Wallet API or mock)
               ├─ 2. Score risk (RiskEngine)
               ├─ 3. Fetch signals (OKX Market API)
               │
               ├─ Built-in checks:
               │      ├─ risk_score >= 80 → emergency rebalance swap
               │      ├─ signal BULLISH > +7% → log alert
               │      └─ signal BEARISH < -7% → log alert
               │
               └─ User-defined rules:
                      └─ Execute action if condition matches
```

---

## 🔐 Security

- All OKX API calls signed with HMAC-SHA256 (timestamp + method + path + body)
- API keys stored in `.env`, never committed to git (`.gitignore` covers this)
- Frontend uses MetaMask `eth_requestAccounts` — no private keys ever touched
- CORS configured for local development (`*` in demo, restrict in production)

---

## 🧩 Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12+, FastAPI, Uvicorn, HTTPX, Pydantic v2 |
| AI / NLP | Groq API (LLaMA 3 70B) — swap parsing, simulation, Oracle chat |
| Blockchain | OKX Web3 API — multi-chain (ETH, BSC, Polygon) |
| Frontend | React 18, Vite 5, Axios |
| Auth | MetaMask (EIP-1193 `window.ethereum`) |
| Styling | Pure inline CSS — no Tailwind dependency |

---

## 📈 What Makes This a Hackathon Winner

| Criterion | How We Score |
|---|---|
| **OKX Skill Integration** | 4 OKX API endpoints used (wallet, market, DEX swap, gas) |
| **Autonomous Agent** | Auto-Pilot runs unsupervised every 60s with real actions |
| **AI Innovation** | LLaMA 3 powers NL swap, simulation, and memory-enabled chat |
| **Real-World Problem** | Solves actual DeFi pain: 24/7 monitoring, blind trading |
| **Demo-ability** | Works in demo mode instantly, no setup required to try |
| **Code Quality** | Clean FastAPI structure, Pydantic models, async throughout |

---

## 📹 Demo Video

**Watch the full demo: https://www.youtube.com/watch?v=801dVSauaRw**

```
0:00 – 0:20   The problem: DeFi users fly blind
0:20 – 0:50   Portfolio tab: wallet load, risk score 72/100, ETH concentration alert
0:50 – 1:20   Auto-Pilot: START → live log feed → strategy activated
1:20 – 1:50   What-If: "go all-in on ETH" → BAD MOVE (risk 45 to 95)
1:50 – 2:20   Swap: "swap 10 USDT to ETH if gas below 20 gwei" → executed via OKX DEX
2:20 – 2:50   Oracle AI: "What's my biggest risk?" → specific, data-driven answer
2:50 – 3:00   Export PDF report → Ctrl+P → done
```

---

## 📜 License

MIT — built with ❤️ for the Build X-Agent Hackathon 2026.

*Powered by X-Agent · OKX Agentic Wallet Skill Suite · Groq LLaMA 3*
