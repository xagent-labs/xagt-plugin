# TaxBot

> The AI agent that fills your crypto taxes while you sleep.

[![OKX Agent Trade Kit](https://img.shields.io/badge/OKX-Agent%20Trade%20Kit-blue)](https://github.com/okx/agent-trade-kit)
[![X Layer](https://img.shields.io/badge/X%20Layer-Audit%20Trail-purple)](https://www.okx.com/okb)
[![Builder Track](https://img.shields.io/badge/Hackathon-Builder%20Track-green)](https://xagt.ai)

TaxBot is an autonomous AI agent that connects to your OKX wallet, fetches every transaction across spot trades, Web3 swaps, Earn staking, and external wallets, classifies each for tax purposes, calculates gains/losses using optimized cost-basis methods, and auto-generates IRS-ready **Form 8949**, **Schedule D**, and **Schedule 1** PDFs.

## The Problem

Form 1099-DA launched in 2026. The IRS now receives direct reports of every crypto sale from every US exchange, but **cost basis is missing**. If you bought BTC on Kraken for $30K, moved it to a hardware wallet, then sold on Coinbase for $95K, Coinbase reports $95K gain with $0 basis. The IRS sees 100% profit. TaxBot recovers the missing basis.

## Demo

```
$ node src/cli.js generate --demo

  TaxBot - Crypto Tax Agent
  The AI agent that fills your crypto taxes while you sleep

  Running in DEMO mode

  OKX connected - 14 transactions loaded
  Classified 14 transactions - 7 taxable events - 3 income events
  Optimal method: HIFO - saves $12,710.00 vs FIFO

  Tax Summary
  Short-term gains:   $17,190.00
  Long-term gains:    $0.00
  Net capital gains:  $17,190.00
  Ordinary income:    $470.00
  Total taxable:      $17,660.00

  1099-DA Reconciliation Alert
  Coinbase reports: $32,500.00 gain, $0.00 basis
  TaxBot calculates: $11,500.00 gain, $21,000.00 basis
  Recovered $21,000.00 in missing cost basis, auto-adjusted on Form 8949

  Tax-Loss Harvest: Sell 30 SOL, realize $600 loss, save ~$180

  Form 8949    output/form_8949_2025.pdf
  Schedule D   output/schedule_d_2025.pdf
  Schedule 1   output/schedule_1_2025.pdf
  Audit trail  X Layer tx hash published

  Tax package ready in output/
```

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Tasfia-17/Taxbot
cd Taxbot
npm install

# 2. Configure (or skip for demo mode)
cp .env.example .env
# Edit .env with your OKX read-only API key

# 3. Run demo (no API key needed)
node src/cli.js generate --demo

# 4. Run with real OKX data
node src/cli.js generate --year 2025 --method AUTO

# 5. Open web dashboard
cd web && npm install && npm run dev
# Visit http://localhost:3000
```

## OKX Integration

TaxBot uses the **OKX Agent Trade Kit** (`okx-trade-mcp`) in read-only mode:

| OKX API | What TaxBot fetches |
|---|---|
| `GET /api/v5/trade/orders-history-archive` | Spot buy/sell history |
| `GET /api/v5/asset/deposit-history` | Incoming transfers |
| `GET /api/v5/asset/withdrawal-history` | Outgoing transfers |
| `GET /api/v5/asset/convert/history` | Crypto-to-crypto swaps |
| `GET /api/v5/finance/savings/lending-history` | Staking/earn rewards |
| `GET /api/v5/account/balance` | Current holdings for harvesting scan |

MCP config (`.mcp.json`) is included. Drop it into Claude Code or Cursor and TaxBot tools are available via natural language.

## X Layer Audit Trail

TaxBot writes a SHA-256 hash of your complete tax ledger to **X Layer** (Chain ID 196, OKB gas token). This creates a tamper-proof, timestamped record for IRS audit defense, verifiable at `https://www.okx.com/explorer/xlayer/tx/{hash}`.

Cost: ~$0.0005 per filing. Set `XLAYER_PRIVATE_KEY` in `.env` to enable.

## Tax Engine

- **FIFO / LIFO / HIFO** - tests all three, picks the one that minimizes your tax bill
- **Lot tracking** - follows each coin across wallets, never loses cost basis
- **Short vs long-term** - automatically determines holding period per lot
- **1099-DA reconciliation** - flags every mismatch between broker reports and on-chain reality
- **Tax-loss harvesting** - scans live portfolio for unrealized losses (no wash-sale rule for crypto)

## Output Files

| File | Contents |
|---|---|
| `form_8949_2025.pdf` | Every disposal with correct cost basis |
| `schedule_d_2025.pdf` | Capital gains summary |
| `schedule_1_2025.pdf` | Ordinary income (staking, rewards) |
| `taxbot_ledger_2025.json` | Full machine-readable ledger |

## Architecture

```
OKX API v5 (read-only)
    |
fetcher.js          - pulls spot, earn, convert, deposit/withdrawal history
    |
classifier.js       - tags each TX: CAPITAL_GAIN | ORDINARY_INCOME | TRANSFER | NON_TAXABLE
    |
cost-basis.js       - FIFO/LIFO/HIFO lot engine, finds optimal method
    |
harvester.js        - scans live balances for tax-loss opportunities
    |
pdf-generator.js    - Form 8949, Schedule D, Schedule 1 via pdf-lib
    |
audit-trail.js      - SHA-256 ledger hash to X Layer (Chain ID 196)
```

## Web Dashboard

A Next.js companion app lives in `web/`. It provides a browser UI to connect your OKX API key, watch the analysis run in real time, and download all three tax forms.

```bash
cd web
npm install
npm run dev
```

## Project Structure

```
taxbot/
  src/
    cli.js            - entry point and orchestrator
    fetcher.js        - OKX API v5 client
    classifier.js     - transaction type tagger
    cost-basis.js     - FIFO/LIFO/HIFO lot engine
    harvester.js      - tax-loss harvest scanner
    pdf-generator.js  - IRS form PDF builder
    audit-trail.js    - X Layer on-chain hash writer
    okx-client.js     - OKX REST wrapper
    demo-data.js      - demo transaction set
  web/
    app/
      page.tsx        - landing page
      dashboard/
        page.tsx      - app UI (connect, process, results)
    components/       - navbar, hero, features, how-it-works, cta
  output/             - generated PDFs and ledger JSON
  .env.example        - required environment variables
  .mcp.json           - MCP config for Claude Code / Cursor
```

## Built With

- [OKX Agent Trade Kit](https://github.com/okx/agent-trade-kit) - `okx-trade-mcp` for transaction data
- [X Layer](https://www.okx.com/okb) - immutable audit trail (zkEVM L2, Chain ID 196)
- [Next.js](https://nextjs.org/) - web dashboard
- [pdf-lib](https://pdf-lib.js.org/) - PDF generation
- [ethers.js](https://ethers.org/) - X Layer interaction

---

Built for the [Build X-Agent Hackathon](https://xagt.ai) - Builder Track - May 2026
