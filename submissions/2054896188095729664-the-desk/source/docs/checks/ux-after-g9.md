# UX Check — After G9

Captured: 2026-05-18 against running app on API 4181 and Vite 4173.

## DOM Regression Counts

Headless DOM dump: `/tmp/g9-after-dom.html`.

| Pattern set | Before | After |
|---|---:|---:|
| `PAPER-FALLBACK|DEMO PREVIEW|RUGCAT|CLEAN[^>]*|fixture-fallback|sha256:[a-f0-9]{40,}|wallet offline|Connect [Ww]allet|Order blotter|Positions|New order ticket` | 8+ | 0 |

Wallet control scope check:

```text
grep -nE "Connect Wallet|wallet pill|Switch to X Layer|Sign receipt" web/src/main.tsx
1761: Connect Wallet
1767: Switch to X Layer testnet 1952
1778: Sign receipt
```

All remaining matches are inside the Review Order modal flow.

## First Viewport

Default first viewport now contains:

- Live Scout Radar with 5 compact columns.
- Selected Ticket card with the 3-bullet agent thesis.
- Compact Black Box proof card.
- Compact OKX/quote execution status line.
- Top controls limited to Book, Demo, and Settings.

Orders, positions, manual order, wallet connection, signing, and the technical Black Box trace are behind modal flows.

## Compact Radar Rows

Source mode: `live-scout`.

Source health:

- DexScreener: ok
- GeckoTerminal: ok
- DexPaprika: ok
- OKX OnchainOS enrichment: gated, payment/grace quota gate

| Token | Move | Liquidity | Risk | Agent Action |
|---|---:|---:|---|---|
| AWF (Ethereum) | 305.5% | $192.6K | WATCH | Watch AWF |
| BABYRAGE (Solana) | -55.0% | $23.8K | WATCH | Watch BABYRAGE |
| BABYTROLL (Solana) | -25.6% | $122.2K | WATCH | Watch BABYTROLL |
| COAR (Solana) | 30.6% | $269.0K | WATCH | Watch COAR |
| K9 (Ethereum) | 13.3% | $34.3K | WATCH | Watch K9 |
| MEMENALD (Ethereum) | 1027.8% | $17.8K | WATCH | Watch MEMENALD |
| MOONSHOT (Solana) | 27.1% | $16.6K | WATCH | Watch MOONSHOT |

## Guard Smoke

POST `/api/tickets` with the first default WATCH cluster:

```json
{
  "status": 409,
  "code": "cluster_not_executable",
  "cluster_id": "cluster:ethereum:awf"
}
```

## YES/NO

1. First viewport only radar + selected ticket + proof/execution status? YES
2. Orders/positions not in first viewport? YES
3. Bottom dock gone in default mode? YES
4. Wallet controls only in review flow? YES
5. Radar columns reduced to Token/Move/Liquidity/Risk/Agent Action? YES
6. Selected ticket uses three thesis bullets? YES
7. Black Box full trace hidden behind Show technical trace? YES
8. Raw hashes hidden by default? YES
9. Fixture/PAPER/RUGCAT/CLEAN hidden from default first viewport? YES
10. G8 server/state-machine protections still pass? YES
