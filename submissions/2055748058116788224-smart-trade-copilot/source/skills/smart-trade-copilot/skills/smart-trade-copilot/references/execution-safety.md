# Execution Safety — rules for any fund-moving command

These apply to Stage 8. They are non-negotiable. The cost of a wrong broadcast is
permanent; the cost of asking again is a few seconds.

## Hard gates (every one requires an explicit user yes/no)

| Flag / action | Why it is dangerous | Required gate |
|---|---|---|
| `swap execute` at all | Signs and broadcasts a real transaction | Explicit "yes" after the user has seen the quote numbers |
| `--wallet <addr>` | Chooses which wallet's funds move | Must come from `wallet status` or be typed by the user; multi-account → ask which |
| `--slippage <pct>` | Looser slippage = bigger possible loss | Default to autoSlippage; only override when the user explicitly states a value |
| `--force` | Bypasses backend risk warning 81362 (possible honeypot / poisoned contract) | Only after explicitly telling the user "this risks fund loss" and getting an explicit yes |
| `--mev-protection` / `--tips` | Cost/behaviour change | Auto-set by the chain threshold rule below; user may override |
| Silent / automated mode | Skips per-step confirmation | Requires prior explicit opt-in; BLOCK-level risk still halts |

## Mandatory sequence

1. `onchainos wallet status` — confirm a logged-in account. Not logged in →
   `onchainos wallet login`. Multiple accounts → list and ask the user to choose.
2. **Always quote immediately before executing:**
   `onchainos swap quote --from <pay> --to <token> --readable-amount <amt> --chain <chain>`
   (Never pass `--slippage` to `quote`.) Re-check `isHoneyPot`, `taxRate`, price impact,
   routing. Honeypot on buy → BLOCK (back to AVOID). Price impact > 5% → warn prominently.
3. If > 10 seconds pass between quote and execute, **re-quote**. If the price moved by
   ≥ the slippage value, warn and re-confirm.
4. Execute only after the user re-confirms the quoted output amount:
   `onchainos swap execute --from <pay> --to <token> --readable-amount <amt> --chain <chain> --wallet <addr> [--slippage <pct>] [--gas-level <level>] [--mev-protection]`

## MEV protection thresholds (auto-enable)

Enable MEV protection if **either** is true:
- `toAmount × toPrice × slippage ≥ $50`, or
- `fromAmount × fromPrice ≥` the chain threshold below.

If a price is unavailable/0 → enable by default.

| Chain | Enable how | Threshold |
|---|---|---|
| Ethereum | `--mev-protection` | $2,000 |
| Solana | `--tips <sol>` (CLI applies Jito) | $1,000 |
| BNB Chain | `--mev-protection` | $200 |
| Base | `--mev-protection` | $200 |
| Others | — | — |

## Error handling on execute

| Error | Action |
|---|---|
| Pending-approval style failure | Wait per chain block time (ETH ~15s, BSC ~5s, Arb/Base/XLayer ~3s, other EVM ~10s), inform the user, retry once |
| 81362 (risk flagged) | Do NOT auto-retry. State "potential fund loss" explicitly. Only re-run with `--force` after an explicit informed yes |
| 82000 / 51006 (dead / no liquidity) | Token likely rugged or illiquid. Do not retry past 5 attempts for the same (wallet, from, to). Run `token advanced-info` and warn |
| Any other error | Retry once; if it still fails, surface the raw error to the user — do not mask it |

## Reporting

Report success as **"Swap broadcast — final on-chain result pending"**. Never say
"swap complete / successful / confirmed". Always give the explorer link for the
returned tx hash and tell the user to verify final status there. Then offer Stage 9
(post-trade PnL watch).
