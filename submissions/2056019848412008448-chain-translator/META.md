# Submission: submit: 2056019848412008448: ChainScribe — onchain in plain language

- **Original PR**: [xagent-labs/xagt-plugin#10](https://github.com/xagent-labs/xagt-plugin/pull/10)
- **State**: OPEN
- **Author**: @Infinity-light
- **Participant ID**: `2056019848412008448`
- **Submitted**: 2026-05-17T15:19:12Z
- **Fork branch**: `Infinity-light/xagt-plugin` head `281d630aa9eb`
- **Project repo**: https://github.com/Infinity-light/chain-translator
- **Source clone**: cloned from https://github.com/Infinity-light/chain-translator
- **LICENSE**: no LICENSE file in upstream repo — original author retains rights

## Layout

- `pr-submission/` — files added to `xagent-labs/xagt-plugin` by the original PR (canonical hackathon README + assets)
- `source/` — shallow clone of the project repo at archive time

## Original PR body (verbatim)

```
## ChainScribe — onchain in plain language

A chat-first companion that turns crypto market questions into precise answers backed by **live exchange data**. No wallet to connect, no API key to paste, no dashboards to read — just ask.

The bet: AI-native chat × live market feeds beats yet-another-dashboard for most lookup tasks, especially for the 90% of people who don't speak block-explorer language yet.

## Live Demo
https://chain-translator-blz45wctr-infinity-lights-projects.vercel.app/

## Demo Video
https://github.com/Infinity-light/chain-translator/raw/main/media/demo.mp4

(GIF preview embedded in repo README)

## GitHub Repo
https://github.com/Infinity-light/chain-translator

## OKX Skills Used
- `/api/v5/market/ticker` — live SPOT price + 24h stats for any pair (used by `okx_ticker`, `okx_multi_ticker`)
- `/api/v5/market/candles` — OHLC history for trend / chart questions (`okx_candles`)
- `/api/v5/market/tickers` — top gainers / losers across all USDT pairs (`okx_top_movers`)

Augmented with CoinGecko (trending, search, coin info, global market stats) so the agent can answer "what's the ATH?", "how is BTC dominance moving?", "is this coin new or old?" — context the exchange feed alone doesn't carry.

## Key Features
- **Zero-config UX** — public URL, click an example prompt, get an answer in seconds. No wallet, no signup, no keys.
- **Multi-step tool calling** — agent searches → resolves → fetches → answers in one turn (max 8 steps via AI SDK v6 stopWhen)
- **Visible reasoning** — tool-use chips activate in the UI as each tool fires; you can audit which data source backs each number
- **Live streaming** — DeepSeek V4 chat mode streams tokens through `useChat()` for a snappy feel
- **CN + EN** — agent matches user's language; tested with Chinese and English queries
- **Read-only by design** — never asks for keys or signatures; the insight goes to whatever wallet you already trust

## Stack
- Next.js 16 (App Router, Turbopack) on Vercel
- AI SDK v6 (`ai` + `@ai-sdk/openai`) → DeepSeek V4 chat mode (OpenAI-compatible, supports tool calls)
- 8 typed tools (4× OKX V5 SPOT public + 4× CoinGecko free tier)
- Tailwind v4, custom glass + radial-gradient dark theme

## Roadmap
The `/api/chat` tool registry is built to accept OKX OnchainOS MCP tools (with a paid API key from web3.okx.com/build/dev-portal) side-by-side with the current public-feed tools — additive, no rewrite. That unlocks OKX-exclusive signals: KOL / Smart Money / Whale labels on every on-chain trade, meme pump bundle/sniper detection, developer rugpull history per token, cross-chain wallet PnL.

## Track
Builder Track — Build with XAgent × OKX Hackathon, May 2026
```
