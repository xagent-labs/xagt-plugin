# Radar Baseline — Before G8

Captured: 2026-05-18 (before G8). Fresh scan triggered via POST /api/scan.
sourceMode: `live-scout`
mode (legacy): `live`
opportunity count: 22
cluster count: 20
defaultClusterIds: 7

## Source health

| Provider | OK | Cached | Error |
|---|---|---|---|
| DexScreener | True |  |  |
| GeckoTerminal | True |  |  |
| DexPaprika | True |  |  |
| OKX OnchainOS enrichment | False |  | payment/grace quota gate |

## Default Radar — top 7 clusters

| # | Symbol | Chain | Status | Score | Category | Risk | Quote | OKX-evid | Pools | Contracts | Risk reasons |
|---|---|---|---|---:|---|---|---|---|---:|---:|---|
| 1 | AWF | Ethereum | ready | 99 | trending | allow/low | ? | False | 1 | 1 | price, liquidity, volume, and tx-flow cleared emerging-token preflight |
| 2 | BABYTROLL | Solana | ready | 99 | trending | allow/low | ? | False | 1 | 1 | price, liquidity, volume, and tx-flow cleared emerging-token preflight |
| 3 | BONK | Base | ready | 99 | new-launch | allow/low | ? | False | 1 | 1 | price, liquidity, volume, and tx-flow cleared emerging-token preflight |
| 4 | COAR | Solana | ready | 99 | trending | allow/low | ? | False | 1 | 1 | price, liquidity, volume, and tx-flow cleared emerging-token preflight |
| 5 | MEMENALD | Base | ready | 99 | new-launch | allow/low | ? | False | 1 | 1 | price, liquidity, volume, and tx-flow cleared emerging-token preflight |
| 6 | SPCX | Ethereum | ready | 99 | trending | allow/low | ? | False | 1 | 1 | price, liquidity, volume, and tx-flow cleared emerging-token preflight |
| 7 | SPCX | Solana | ready | 99 | trending | allow/low | ? | False | 1 | 1 | price, liquidity, volume, and tx-flow cleared emerging-token preflight |

## Critical bug diagnostics

### 1. Cross-chain symbol duplicates in default
- Detected: {'SPCX': ['Solana', 'Ethereum']}

### 2. READY/score>=80 contradictions
- READY/score>=80 rows that should NOT be READY: 7
  - AWF (Ethereum) score=99: ['quoteStatus=?', 'no OKX/wallet evidence']
  - BABYTROLL (Solana) score=99: ['quoteStatus=?', 'no OKX/wallet evidence']
  - BONK (Base) score=99: ['quoteStatus=?', 'no OKX/wallet evidence']
  - COAR (Solana) score=99: ['quoteStatus=?', 'no OKX/wallet evidence']
  - MEMENALD (Base) score=99: ['quoteStatus=?', 'no OKX/wallet evidence']
  - SPCX (Ethereum) score=99: ['quoteStatus=?', 'no OKX/wallet evidence']
  - SPCX (Solana) score=99: ['quoteStatus=?', 'no OKX/wallet evidence']

Top complaint from Leon: AWF (or similar) shows READY/99/low risk but quote is not-quoted and OKX enrichment is gated → modal still exposes Prepare Black Box ticket + Start wallet ceremony. This is the G8 problem statement.

