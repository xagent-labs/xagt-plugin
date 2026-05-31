# Radar After G8

Generated at: 2026-05-17T20:27:33.864Z
Mode: live
Source mode: live-scout
Default cluster count: 7
Default READY count: 0
Repeated default symbols: NONE
SPCX in default: 0

## Source Health

| Provider | OK | Cached | Error |
|---|---|---|---|
| DexScreener | True |  |  |
| GeckoTerminal | True |  |  |
| DexPaprika | True |  |  |
| OKX OnchainOS enrichment | False |  | payment/grace quota gate |

## Default Radar After G8

| # | Symbol | Chain | Status | Score | quoteStatus | OKX-evid | riskVerdict | notReadyReasons | cross_chain_siblings |
|---:|---|---|---|---:|---|---|---|---|---|
| 1 | AWF | Ethereum | watch | 60 | not-quoted | NO | allow | missing OKX or wallet evidence; quote status is not-quoted | NONE |
| 2 | DELU | Base | watch | 60 | not-quoted | NO | allow | missing OKX or wallet evidence; quote status is not-quoted | NONE |
| 3 | ETHY | Base | watch | 60 | not-quoted | NO | allow | missing OKX or wallet evidence; quote status is not-quoted | NONE |
| 4 | LIQ | Base | watch | 60 | not-quoted | NO | allow | missing OKX or wallet evidence; quote status is not-quoted | NONE |
| 5 | MCCHICKEN | Ethereum | watch | 60 | not-quoted | NO | allow | missing OKX or wallet evidence; quote status is not-quoted | NONE |
| 6 | NOVA | Ethereum | watch | 60 | not-quoted | NO | allow | missing OKX or wallet evidence; quote status is not-quoted | NONE |
| 7 | RVAULT | Base | watch | 60 | not-quoted | NO | allow | missing OKX or wallet evidence; quote status is not-quoted | NONE |

## Before / After Delta

- BEFORE: docs/checks/radar-before-g8.md showed 7/7 default rows spuriously READY/99/low risk with missing quote and no OKX/wallet evidence.
- AFTER: 0/7 default rows are READY; every non-ready row carries notReadyReasons and score cap.

## Gate Answers

1. Default Radar has no repeated symbols even across chains? YES
2. READY only when quoted + execution-ready (7 conditions)? YES
3. NOT ACTIONABLE rows can never be READY/99/low-risk? YES
4. Non-ready row modal hides/disables Prepare ticket + Start wallet ceremony? YES
5. Server POST /api/tickets and POST /api/orders reject non-ready attempts with structured 409? YES
6. Source truth (sourceMode + OKX-gated state) currently visible? YES
