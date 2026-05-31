# ChainScribe

> Wallets, transactions, and markets — translated. Ask anything onchain in plain language.

[![Live Demo](https://img.shields.io/badge/Live-Demo-6366f1?style=for-the-badge)](https://chain-translator-app.vercel.app)
[![XAgent × OKX Hackathon](https://img.shields.io/badge/XAgent_×_OKX-Hackathon_2026-000000?style=for-the-badge)](https://xagt.ai/hackathon)

ChainScribe is a chat-first companion that turns crypto questions — **markets, wallets, transactions** — into precise plain-language answers backed by live data. No wallet to connect, no API key to paste, no dashboards to read. Just ask.

![demo](./media/demo.gif)

## What it does

You type a question in your own words. The agent picks the right tool (or chains several together), fetches fresh data, and writes a tight human-readable answer.

**Market lookups:**
- *"SOL 现在多少钱？24h 走势？"* → live OKX price + 24h high/low/change
- *"What are the top 5 gainers on OKX in the last 24h?"* → ranked list with %, price, volume
- *"BONK 现在还能买吗？市值多少？历史最高什么时候？"* → market cap, ATH, multi-period change
- *"BTC dominance right now?"* → global crypto market overview

**Wallet translation** (new):
- *"vitalik.eth `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` 在主流链上分别有多少？"* → native balance across **Ethereum + Base + Arbitrum + Polygon + BNB Chain** in parallel, with explorer links
- *"What's in the Solana wallet `3JZ7uyDPM3k6gqL2wH8MPALU5DZ91aXBdN5oXxELjvjm`?"* → SOL balance + every SPL token holding with amounts
- *"Recent activity of this Solana address?"* → last N signatures with timestamps and success status

**Transaction translation** (new):
- *"Decode this Ethereum tx: 0x88df0164...944b"* → human-readable summary: from/to, value moved, gas spent, status, **ERC-20 Transfer events auto-detected**
- *"What did this Solana signature do?"* → signers, programs invoked, SOL balance deltas, SPL token movements

The agent shows you which tool it called as a small chip above each answer, so you can audit the source. Every number is fetched live at the moment of the question.

## Why it might matter

Block explorers and trading terminals were designed for traders who already speak the language. ChainScribe is for the **90% of people who don't** — the curious newcomer who wants to understand what BTC dominance means, the dev who needs to triage a wallet without opening five tabs, the analyst who wants a tx hash decoded into one sentence instead of scrolling through event logs.

The bet: **AI-native chat × live onchain feeds** beats yet-another-dashboard for the long tail of lookup tasks.

## Data sources

### OKX skills (primary market layer)

| OKX endpoint | Used by tool | Purpose |
|---|---|---|
| `GET /api/v5/market/ticker` | `okx_ticker`, `okx_multi_ticker` | Live spot price + 24h stats for any pair |
| `GET /api/v5/market/candles` | `okx_candles` | OHLC history for trend questions |
| `GET /api/v5/market/tickers` | `okx_top_movers` | Top gainers / losers across all USDT pairs |

### CoinGecko (context layer)

`cg_search_coin`, `cg_coin_info`, `cg_trending`, `cg_global_market` — for what the exchange feed alone can't carry: market cap, supply, ATH, multi-period % change, project description, social links.

### Solana RPC (mainnet-beta, public, no key)

`sol_wallet_overview` (SOL balance + SPL tokens via `getTokenAccountsByOwner`), `sol_recent_txs` (`getSignaturesForAddress`), `sol_tx_decode` (`getTransaction` with `jsonParsed` encoding — extracts signers, programs, SOL/SPL balance deltas).

### EVM RPC (PublicNode, 5 chains, no key)

`evm_wallet_overview` and `evm_wallet_multi_chain` (native balance + nonce via `eth_getBalance` / `eth_getTransactionCount`), `evm_tx_decode` (`eth_getTransactionByHash` + `eth_getTransactionReceipt`, with **automatic ERC-20 Transfer event detection** from log topic hash).

### One smart helper

`detect_address` — called first whenever the user pastes an unfamiliar long string. Returns `evm_address` / `evm_tx_hash` / `solana_address` / `solana_signature` so the agent picks the right downstream tool without guessing.

## Architecture

```
┌──────────────────────────────┐
│   Single-page Chat UI        │  Next.js 16 App Router + Tailwind v4
│   useChat() + streaming      │  glass UI, dark theme, example prompts
└─────────────┬────────────────┘
              │ POST /api/chat
              ▼
┌──────────────────────────────┐
│   AI Route (Node runtime)    │  Vercel Serverless
│   AI SDK v6 streamText       │  multi-step tool calling (stopWhen: 8)
└─────────────┬────────────────┘
              │
              ├──► DeepSeek V4 (chat mode, OpenAI-compatible)
              │       routes between tools, composes the answer
              ▼
┌──────────────────────────────┐
│   Tool layer                 │  15 typed tools across two files
│   src/lib/tools.ts           │  8 market tools (OKX + CoinGecko)
│   src/lib/chain-tools.ts     │  7 chain tools (Solana + 5 EVM)
└──────────────────────────────┘
```

Key design decisions:

- **Tool calling, not RAG.** Every answer is grounded in a fresh API hit at request time, not a stale embedding.
- **Multi-step loop.** One user turn may trigger detect → resolve → fetch → answer (max 8 steps, configurable).
- **No wallet connection, no signing.** Read-only by design. Users get accurate intel without exposing keys. Take the insight to whatever wallet they already trust.
- **No paid keys required to run.** OKX V5 SPOT, CoinGecko free tier, Solana mainnet-beta RPC, PublicNode EVM RPCs — all keyless and free. Only DeepSeek needs a key (for the LLM itself).
- **Streamed responses + visible tool chips.** UI shows which tools the agent invoked as small badges so reasoning is auditable.

## Quick start (local)

```bash
git clone https://github.com/Infinity-light/chain-translator
cd chain-translator
npm install
cp .env.example .env.local
# Edit .env.local with your DEEPSEEK_API_KEY
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

```ini
DEEPSEEK_API_KEY=sk-...           # from platform.deepseek.com
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

No OKX, CoinGecko, Solana, or EVM RPC keys needed — everything backing the chain/market tools is keyless public infrastructure.

## Roadmap

The `/api/chat` tool registry is built to accept OKX OnchainOS MCP tools (with a paid API key from <https://web3.okx.com/build/dev-portal>) side-by-side with the current public-feed tools. The upgrade is additive — no rewrite. With OKX OnchainOS unlocked you also get:

- KOL / Smart Money / Whale wallet labels on every onchain trade
- Meme pump bundle/sniper detection
- Developer rugpull history per token
- Cross-chain wallet portfolio with PnL labeling
- ERC-20 holdings + USD value per wallet (currently only native shown on EVM)

Other planned moves:

- **Persona presets** — `degen mode` / `analyst mode` / `noob explainer mode` shape the LLM tone
- **Saved watchlists** — sign in via XAgent, persist tokens & wallets, get "how's my list?" digest
- **Daily brief** — opt-in cron sends a morning summary to email / Telegram
- **More chains** — Aptos, Sui, TON via their public RPCs
- **NFT lookups** — collection floor / holder counts via OpenSea or Reservoir

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **AI SDK**: ai v6 + @ai-sdk/openai (OpenAI-compatible adapter → DeepSeek)
- **LLM**: DeepSeek V4 (chat mode, supports tool calls)
- **Market data**: OKX V5 SPOT + CoinGecko v3 free tier
- **Onchain reads**: Solana mainnet-beta RPC + PublicNode (Ethereum, Base, Arbitrum, Polygon, BNB Chain)
- **UI**: Tailwind v4, Geist font, custom glass + radial-gradient theme
- **Deploy**: Vercel (zero-config, serverless functions)

## Submission

Built for the [XAgent × OKX Hackathon](https://xagt.ai/hackathon). XAgent participant ID: `2056019848412008448`.

PR: [xerpa-ai/xagt-plugin#10](https://github.com/xerpa-ai/xagt-plugin/pull/10)

## License

UNLICENSED — hackathon submission. Reach out if you want to fork or extend commercially.
