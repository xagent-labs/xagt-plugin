# Submission: submit: 2056103185629581312

- **Original PR**: [xagent-labs/xagt-plugin#12](https://github.com/xagent-labs/xagt-plugin/pull/12)
- **State**: OPEN
- **Author**: @Tasfia-17
- **Participant ID**: `2056103185629581312`
- **Submitted**: 2026-05-17T20:27:25Z
- **Fork branch**: `Tasfia-17/xagt-plugin` head `81d6cc7cd657`
- **Project repo**: https://github.com/Tasfia-17/Taxbot
- **Source clone**: cloned from https://github.com/Tasfia-17/Taxbot
- **LICENSE**: no LICENSE file in upstream repo — original author retains rights

## Layout

- `pr-submission/` — files added to `xagent-labs/xagt-plugin` by the original PR (canonical hackathon README + assets)
- `source/` — shallow clone of the project repo at archive time

## Original PR body (verbatim)

```
# TaxBot

**Participant ID:** `2056103185629581312`
**Track:** Builder (Developer)
**Repo:** https://github.com/Tasfia-17/Taxbot
**Demo:** https://taxbot-swyj.vercel.app
**Hackathon:** Build X-Agent x OKX, May 2026

## What it does

TaxBot is an autonomous AI agent that connects to your OKX wallet via read-only API, fetches your complete transaction history, and auto-generates IRS-ready tax forms while you sleep.

- Pulls all OKX transactions: spot trades, earn rewards, converts, deposits, withdrawals
- Classifies every transaction: capital gain, ordinary income, transfer, or non-taxable
- Runs FIFO, LIFO, and HIFO cost-basis methods and picks the one that minimizes your tax bill
- Recovers missing cost basis for 1099-DA reconciliation (the IRS gets $0 basis by default)
- Scans live portfolio for tax-loss harvesting opportunities
- Generates IRS Form 8949, Schedule D, and Schedule 1 as PDFs
- Publishes a SHA-256 ledger hash to X Layer (Chain ID 196) for tamper-proof audit defense

## OKX Skills Used

| Skill | Usage |
|---|---|
| OKX API v5 trade history | Spot buy/sell transaction data |
| OKX API v5 asset history | Deposits, withdrawals, converts |
| OKX API v5 earn/savings | Staking and reward income |
| OKX API v5 account balance | Live portfolio for harvest scanning |
| X Layer (Chain ID 196) | On-chain SHA-256 audit trail via ethers.js |
| MCP config (.mcp.json) | Natural language access via Claude Code / Cursor / Kiro |

## How to Run

bash
# CLI (demo mode, no API key needed)
npm install
node src/cli.js generate --demo

# Web dashboard
cd web && npm install && npm run dev
# Visit http://localhost:3000

## Architecture


OKX API v5 (read-only)
   |
fetcher.js       - pulls all transaction history
   |
classifier.js    - tags each TX: CAPITAL_GAIN | ORDINARY_INCOME | TRANSFER | 
NON_TAXABLE
   |
cost-basis.js    - FIFO/LIFO/HIFO lot engine, auto-selects optimal method
   |
harvester.js     - scans live balances for tax-loss opportunities
   |
pdf-generator.js - builds Form 8949, Schedule D, Schedule 1
   |
audit-trail.js   - SHA-256 hash published to X Layer (Chain ID 196)

## Stack

- Node.js CLI + Next.js web dashboard
- OKX Agent Trade Kit (okx-trade-mcp)
- X Layer zkEVM L2 via ethers.js
- pdf-lib for IRS form generation
```
