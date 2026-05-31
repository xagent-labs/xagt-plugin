# Wallet Whisperer — onchainos CLI Reference

Every command this skill issues, with the exact flags used and why.

## MODE 1 — READ (Persona Card)

### portfolio-overview (run twice in parallel)

```bash
onchainos market portfolio-overview --address <addr> --chain <chain> --time-frame 4   # 30d
onchainos market portfolio-overview --address <addr> --chain <chain> --time-frame 5   # 3m
```

| Field used | Used for |
|---|---|
| `winRate` | Edge metrics row |
| `realizedPnl` | Edge metrics row |
| `unrealizedPnl` | Sanity check |
| `tradeCount` | Header line + behavioral-tells confidence flag |
| `tokenCount` | Sector tilt sanity check |

### portfolio-recent-pnl

```bash
onchainos market portfolio-recent-pnl --address <addr> --chain <chain> --limit 100
```

| Field used | Used for |
|---|---|
| `tokenAddress`, `tokenSymbol`, `category` | Sector tilt bucketing |
| `entryPrice`, `exitPrice`, `pnl`, `pnlPct` | Trade Replay highlight selection |
| `entryTimeMs`, `exitTimeMs` | Median holding period (Dimension 1: Style) |
| `entryUsd` | Sizing pattern (Dimension 3) |

### portfolio-dex-history

```bash
onchainos market portfolio-dex-history \
    --address <addr> --chain <chain> \
    --begin <ms_90d_ago> --end <ms_now> --limit 100
```

| Field used | Used for |
|---|---|
| `txType` (1=BUY / 2=SELL) | FIFO inventory pairing for closed-position computation |
| `tokenAddress` | Cross-reference with `portfolio-recent-pnl` |
| `txTimestamp` | Time-to-entry analysis (Late Rotator tell) |

Paginate via `--cursor` until either the cursor is empty or 100 rows total reached.

### market kline (sampled, top trades only)

```bash
onchainos market kline --address <token_addr> --chain <chain> \
    --bar 1h --start <entry_ms> --end <exit_ms>
```

Sampling rule: only the top 20 entries by USD size (for Directional Bias) and the 6 highlight trades (for MFE/MAE in Trade Replay). Hard cap: 26 kline calls per profile.

### token info (cached per session)

```bash
onchainos token info --address <token_addr> --chain <chain>
```

| Field used | Used for |
|---|---|
| `category` | Sector tilt bucketing |
| `tags` | Bucket fallback when `category` is empty |
| `verified` | Sanity check — unverified tokens slightly de-rank a wallet's persona score |

---

## MODE 2 — REPLAY (Trade Highlights Reel)

Reuses `portfolio-recent-pnl` + `portfolio-dex-history` from MODE 1 (cached within the session).
Adds 6 targeted `kline` calls (top 3 winners + bottom 3 losers) for MFE / MAE / "missed top" / "dodged drawdown" computation.

---

## MODE 3 — MIRROR (One-Tap Confirm)

### tracker activities (poll cycle)

```bash
onchainos tracker activities --tracker-type multi_address \
    --wallet-address <source> --chain <chain>
```

Filter trades by `txTimestamp > last_poll_ts`. The agent calls this once per "check mirror" invocation; it does NOT run in the background.

### security token-scan (per candidate, mandatory)

```bash
onchainos security token-scan --address <token_addr> --chain <chain>
```

Skip the candidate if `risk_level >= "high"`. Surface the reason to the user.

### portfolio total-value (per candidate, sizing)

```bash
onchainos portfolio total-value --address <user_addr> --chain <chain>
```

### swap swap (only after explicit user confirmation)

```bash
onchainos swap swap --from USDC --to <token_addr> --amount-usd <size_usd> --chain <chain>
```

**Confirmation rule:** the agent renders a Candidate Card to the user and waits for an affirmative reply ("execute" / "mirror this" / "yes go") before issuing this command. Any other reply = skip.

### strategy create-limit (optional auto stop-loss)

```bash
onchainos strategy create-limit --token <token_addr> --side sell \
    --trigger-price <entry_price * 0.92>
```

Only fired if the source wallet's persona has the `Stop-Loss Disciplined` tell — the skill inherits that discipline mechanically.

---

## Free-tier / x402 quota

All `market` calls share the user's free quota. If the API returns `MARKET_API_OLD_USER_POST_GRACE_OVER_QUOTA`:

1. Surface the quota state to the user verbatim (translated to their language).
2. Offer two paths:
   - Log in via `onchainos wallet login <email>` to refresh the free tier
   - Authorize a single auto-pay session via `onchainos payment pay`
3. Never silently auto-pay.

See `okx-x402-payment` skill for the payment authorization flow.

---

## Per-profile call budget (typical)

| Mode | Calls | Notes |
|---|---|---|
| READ (Persona Card) | 4 portfolio + 1 token info per unique token (cached) + ~20 kline (bias sampling) | ~30-40 calls for a wallet with 100 trades and 20 unique tokens |
| REPLAY (Highlights Reel) | 0 net new portfolio + 6 kline | Reuses MODE 1 cache; only +6 calls if invoked back-to-back |
| MIRROR (per poll cycle) | 1 tracker + 1 security per candidate + 1 total-value per execution | A poll with 0 new trades = 1 call |

Within the 1M-call free tier, a heavy user (5 profiles + 100 mirror polls/day) consumes < 500 calls/day.
