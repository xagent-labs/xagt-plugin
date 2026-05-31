# PhylaX — AI Execution Firewall for OKX X Layer

<div align="center">
  <img src="public/hero.jpg" alt="PhylaX - Before users sign, PhylaX checks the trade." width="100%" />
</div>

> 🛡️ **PhylaX is an AI execution firewall for OKX X Layer.**
> *Before users sign, PhylaX checks the trade.*

<div align="center">
  <b>Built for the Build X-Agent Hackathon</b> <br/>
  Participant ID: <code>2054917885347762176</code>
</div>

<br/>

---

## What It Does

You type: *"Swap 50 USDC to OKB on X Layer"*

PhylaX does:
1. **Parses your intent** via AI agent planning
2. **Scans both tokens** for honeypots & rug risks (OKX Security skill)
3. **Fetches optimal quote** across 500+ DEX routes (OKX DEX Swap skill)
4. **Checks allowance** and generates approval tx if needed
5. **Builds unsigned transaction** — server never broadcasts, you sign
6. **Confirms on-chain** after your wallet submits

> **Note:** For this hackathon, **X Layer is the only active executable chain.** PhylaX is not a multi-chain live product yet, and features like OKX Agentic Wallet or x402 are future extensions, not part of current demo scope.

---

## OKX Skills Integration

| Skill | What PhylaX Uses It For | CLI Command |
|---|---|---|
| `okx-dex-signal` | Discover trending tokens on X Layer | `onchainos signal list` |
| `okx-security` | Dual token risk scan before every trade | `onchainos security token-scan` |
| `okx-dex-swap` | Get quotes + build swap transactions | `onchainos swap quote` |
| `okx-dex-token` | Resolve token addresses by symbol | `onchainos token search` |
| `okx-wallet-portfolio` | Check wallet balances before execution | `onchainos portfolio token-balances` |
| `okx-onchain-gateway` | Gas estimation + transaction simulation | `onchainos gateway gas`, `gateway simulate` |
| `okx-agentic-wallet` | Wallet status and account info | `onchainos wallet status` |
| `okx-audit-log` | Audit log path for troubleshooting | Local path resolution |

The codebase integrates directly with the OKX Onchain OS through `lib/okx.ts` at runtime, which serves as the core integration boundary between PhylaX and the OKX X-Agent execution capabilities.

---

## Why PhylaX Is Different

- **Agentic Proactive UX** — instead of a passive prompt-box, the agent proactively asks clarifying questions to guide users through swap intent formation.
- **DeepSeek & Claude Fallback** — built-in dual-LLM provider abstraction. Uses Anthropic Claude as primary, with automatic zero-downtime fallback to DeepSeek V4 if credits exhaust.
- **Dual token scan** — scans both `fromToken` AND `toToken` before any quote. Most agents scan only once.
- **Robust Token Resolution** — hardcoded shortcuts and decimal fallbacks for major assets (USDC, USDT, WETH) to prevent CLI ambiguity and execution failures.
- **No-broadcast guarantee** — `/api/execute` returns only unsigned `txData`. Server never touches your funds.
- **Approval replay prevention** — each approval ID is one-time use, expires in 5 minutes, consumed atomically via Redis.
- **Onchain tx verification** — verifies approval tx `from`, `to`, and method selector before proceeding to execution.
- **Kill switch** — operator can pause all live execution instantly via Redis flag `phylax:execution:paused`.
- **Hard cap enforced server-side** — `MAX_TRADE_USD_HARD_CAP` cannot be bypassed by the client.

---

## Demo Flow

```
User: "Swap 50 USDC to OKB on X Layer"

[Agent Plan]
  → parse intent: swap | USDC → OKB | X Layer | $50
  → scan fromToken: USDC ✅ LOW RISK
  → scan toToken: OKB ✅ LOW RISK  
  → quote: 50 USDC → 12.4 OKB | slippage 0.3% | gas ~$0.02
  → approval check: allowance sufficient ✅
  → build unsigned tx

[User]
  → reviews quote in UI
  → clicks confirm
  → wallet signs & broadcasts
  → PhylaX confirms on-chain ✅
```

---

## Architecture

```
User Intent (chat)
      ↓
AI Agent (Claude) — parseThesis + orchestrate()
      ↓
OKX Skills via onchainos CLI
  ├── okx-security    → dual token scan
  ├── okx-dex-signal  → token discovery  
  ├── okx-dex-swap    → quote + tx build
  ├── okx-dex-token   → symbol resolution
  └── okx-wallet-portfolio → balance check
      ↓
Approval Store (Redis) — one-time use, 5min expiry
      ↓
Risk Policy — slippage, hard cap, chain allowlist, kill switch
      ↓
Unsigned TX → returned to client
      ↓
User Wallet Signs & Broadcasts (Privy / MetaMask)
      ↓
/api/confirm — onchain verification
```

---

## Safety Model

| Guarantee | How |
|---|---|
| Server never signs/broadcasts | `/api/execute` returns unsigned `txData` only |
| No replay attacks | Approval IDs consumed atomically in Redis, one-time use |
| Honeypots blocked | OKX security scan, executionAllowed=false blocks trade |
| Budget protected | `MAX_TRADE_USD_HARD_CAP` enforced server-side |
| Quote freshness | Quotes expire after 2 minutes |
| Emergency stop | Redis kill switch pauses all execution instantly |
| Wallet binding | Approval tx sender verified on-chain before execution |

---

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/phylax-okx-agent
cd phylax-okx-agent
npm install
cp .env.example .env.local
# Fill in: OKX_API_KEY, PRIVY credentials, DATABASE_URL, REDIS_URL
npm run dev
```

Open: http://localhost:3000

- OKX credentials: https://web3.okx.com/onchain-os/dev-portal
- Privy credentials: https://dashboard.privy.io

---

## Known Limitations

- **X Layer Only**: Execution is strictly restricted to OKX X Layer for the demo.
- **Provider Data Quality**: Market intelligence features depend entirely on upstream provider data quality.
- **UI Extensions**: Historical charting is planned but not currently available.
- **Future Integrations**: Agentic Wallet and x402 products are future extensions and are not within the current demo scope.
- **No Financial Advice**: PhylaX does not provide financial advice, guaranteed safe trading, or fully autonomous bot execution.
- **Human-in-the-Loop**: The user remains the final authorized signer for all transactions.

---

## Tech Stack

- **Next.js 16** — App Router, API routes, SSE streaming
- **Anthropic Claude & DeepSeek V4** — intent parsing, agent planning, tool orchestration with auto-fallback
- **OKX Onchain OS** — DEX routing, security scanning, signals
- **Privy** — embedded wallet + auth
- **Drizzle + Postgres** — audit log, sessions, approvals
- **Redis** — approval store, rate limiting, kill switch
- **Zod** — runtime schema validation

---

## Submission

The submission is generated and managed using the OKX CLI: `xagent-plugin submit`

**Participant ID:** `2054917885347762176`  
**Track:** Builder (code)  
**OKX Skills used:** `okx-dex-signal`, `okx-security`, `okx-dex-swap`, `okx-dex-token`, `okx-wallet-portfolio`, `okx-onchain-gateway`, `okx-agentic-wallet`, `okx-audit-log`  
**Demo Video:** (https://youtu.be/JUhkzV5E6Tg) 
