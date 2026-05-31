# Radar Baseline — Before G7

Captured: 2026-05-18 (before G7).
Top-level mode: `live-degraded`
Opportunity count: 20

## Note on degraded fallback
OKX OnchainOS skill path: gated (payment/grace quota). DexScreener TCP 443 blocked from this machine. GeckoTerminal TLS cert hijacked on this network (returns `*.facebook.com` cert). The only working live provider is DexPaprika top pools — current Radar is therefore a degraded pool-fallback view masquerading as a New Launches feed. **This is the G7 problem statement.**

## Source health

| Provider | OK | Cached | Error |
|---|---|---|---|
| DexScreener | False |  | timeout after 5000ms |
| GeckoTerminal | False |  | timeout after 5000ms |
| DexPaprika | True |  |  |
| OKX OnchainOS enrichment | False |  | payment/grace quota gate |

## Default Radar — top 12

| # | Symbol | Chain | Category | Status | Score | Liquidity | Volume | Risk reasons | Source(skills) |
|---|---|---|---|---|---:|---:|---:|---|---|
| 1 | SpaceX | Base | trending | watch | 60 | $2,388,224 | $27,911,026 | price, liquidity, volume, and tx-flow cleared emerging-token preflight; duplicat | dexpaprika-pools |
| 2 | Base | Base | trending | watch | 60 | $737,095 | $15,266,246 | muted 24h price movement | dexpaprika-pools |
| 3 | SpaceX | Base | trending | watch | 60 | $1,559,386 | $14,689,232 | muted 24h price movement; duplicate symbol, separate address | dexpaprika-pools |
| 4 | VVV | Base | trending | watch | 47 | $3,377,698 | $5,771,294 | muted 24h price movement | dexpaprika-pools |
| 5 | GDOR | Solana | blocked-risk | blocked | 25 | $335,072 | $41,379,635 | extreme volume-to-liquidity ratio; duplicate symbol, separate address | dexpaprika-pools |
| 6 | GITLAWB | Base | blocked-risk | blocked | 25 | $290,936 | $25,758,528 | extreme volume-to-liquidity ratio | dexpaprika-pools |
| 7 | BUGZ | Base | blocked-risk | blocked | 25 | $131,035 | $4,119,204 | extreme volume-to-liquidity ratio | dexpaprika-pools |
| 8 | GDOR | Solana | blocked-risk | blocked | 19 | $0 | $38,386,718 | missing or near-zero liquidity; extreme volume-to-liquidity ratio; duplicate sym | dexpaprika-pools |
| 9 | GDOR | Solana | blocked-risk | blocked | 19 | $0 | $36,786,698 | missing or near-zero liquidity; extreme volume-to-liquidity ratio; duplicate sym | dexpaprika-pools |
| 10 | COAR | Solana | blocked-risk | blocked | 19 | $0 | $36,389,259 | missing or near-zero liquidity; extreme volume-to-liquidity ratio; duplicate sym | dexpaprika-pools |
| 11 | GDOR | Solana | blocked-risk | blocked | 19 | $0 | $35,481,070 | missing or near-zero liquidity; extreme volume-to-liquidity ratio; duplicate sym | dexpaprika-pools |
| 12 | miravo | Solana | blocked-risk | blocked | 19 | $5,203 | $35,005,066 | extreme volume-to-liquidity ratio | dexpaprika-pools |

## Symbol repetition diagnostic
- Distinct symbols in top 12: 8
- Repeated symbols: [('SpaceX', 2), ('GDOR', 4)]
