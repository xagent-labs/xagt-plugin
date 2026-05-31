mode: live-degraded
count: 15

source health:
- FAIL DexScreener - fetch failed
- FAIL GeckoTerminal - timeout after 5000ms
- PASS DexPaprika
- FAIL OKX OnchainOS enrichment - payment/grace quota gate

| # | Symbol | Chain | Category | Status | Score | Liquidity | Volume | Risk reasons | Source(evidence skills) |
|---|---|---|---|---|---:|---:|---:|---|---|
| 1 | SpaceX | Base | trending | watch | 60 | $2,388,370 | $27,910,733 | price, liquidity, volume, and tx-flow cleared emerging-token preflight; duplicate symbol, separate address | dexpaprika-pools |
| 2 | Base | Base | trending | watch | 60 | $737,060 | $15,266,246 | muted 24h price movement | dexpaprika-pools |
| 3 | SpaceX | Base | trending | watch | 60 | $1,559,496 | $14,689,232 | muted 24h price movement; duplicate symbol, separate address | dexpaprika-pools |
| 4 | VVV | Base | trending | watch | 47 | $3,368,414 | $5,760,321 | muted 24h price movement | dexpaprika-pools |
| 5 | GITLAWB | Base | blocked-risk | blocked | 25 | $290,868 | $25,758,528 | extreme volume-to-liquidity ratio | dexpaprika-pools |
| 6 | GDOR | Solana | blocked-risk | blocked | 9 | ? | $38,386,718 | missing or near-zero liquidity; extreme volume-to-liquidity ratio; duplicate symbol, separate address | dexpaprika-pools |
| 7 | GDOR | Solana | blocked-risk | blocked | 9 | ? | $36,786,698 | missing or near-zero liquidity; extreme volume-to-liquidity ratio; duplicate symbol, separate address | dexpaprika-pools |
| 8 | COAR | Solana | blocked-risk | blocked | 9 | ? | $36,389,259 | missing or near-zero liquidity; extreme volume-to-liquidity ratio; duplicate symbol, separate address | dexpaprika-pools |
| 9 | GDOR | Solana | blocked-risk | blocked | 9 | ? | $35,481,070 | missing or near-zero liquidity; extreme volume-to-liquidity ratio; duplicate symbol, separate address | dexpaprika-pools |
| 10 | miravo | Solana | blocked-risk | blocked | 9 | ? | $35,005,066 | missing or near-zero liquidity; extreme volume-to-liquidity ratio | dexpaprika-pools |
| 11 | DAI | Ethereum | blocked-risk | blocked | 1 | ? | $720,166,623 | missing or near-zero liquidity; extreme volume-to-liquidity ratio | dexpaprika-pools |
| 12 | PYUSD | Ethereum | blocked-risk | blocked | 1 | ? | $22,523,277 | missing or near-zero liquidity; extreme volume-to-liquidity ratio | dexpaprika-pools |
