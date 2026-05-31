---
name: wallet-whisperer
description: "Reverse-engineer ANY wallet's trading personality from on-chain history, narrate their best & worst trades like a sports broadcast, then mirror their verified style with risk-managed automation. Triggers: 'whisper this wallet', 'analyze trader 0x...', 'who is this wallet', 'what is this wallet's style', 'profile this address', 'show me this trader's personality', 'persona for {address}', 'replay this wallet's trades', 'show me their best trades', 'highlights reel for 0x...', 'narrate their trades', 'mirror this wallet', 'copy this trader's style', 'follow {address} with style filter', 'pause mirror', 'stop mirroring', 'mirror status', 're-profile {address}'. Do NOT trigger on bare 'check balance' (use okx-wallet-portfolio), bare 'swap X for Y' (use okx-dex-swap), or bare 'show smart money signals' (use okx-dex-signal — Whisperer is wallet-specific deep-analysis, not the global signal feed)."
version: "1.0.0"
author: "Temitope Akinsunmade"
license: MIT
tags:
  - wallet-analysis
  - copy-trading
  - smart-money
  - trading-persona
  - behavioral-finance
  - signal-mirror
metadata:
  homepage: "https://github.com/Temitope15/wallet-whisperer"
---

# Wallet Whisperer

> Paste a wallet → 15 seconds later you know that trader's *style*, *discipline*, *biggest wins and worst blow-ups*, and you can mirror them with the safety rails they themselves don't use.

## Overview

Wallet Whisperer is a three-mode analytics + execution skill:

1. **READ** — Reverse-engineer a wallet's trading personality (style, hold time, sizing, sector tilt, behavioral tells, edge metrics). Returns a one-page Persona Card.
2. **REPLAY** — Narrate the wallet's 3 best and 3 worst trades like a sports broadcast (entry, exit, drawdown, missed top, what-they-did-right / what-they-did-wrong).
3. **MIRROR** — Subscribe to the wallet via tracker + websocket. Each new trade is scored against the persona; only **in-character** trades are mirrored (out-of-character trades usually mean hack/rug/wallet drainer). Apply user's portfolio cap + mandatory security scan + persona-derived stop-loss.

The novel insight: traditional copy-trading mirrors *every* trade blindly. Whisperer first *learns* a persona, then uses that persona as a filter. A momentum trader who suddenly market-sells everything mid-day is signaling distress or compromise — Whisperer skips that trade and pauses the mirror until the user re-confirms.

> All on-chain write operations (swaps, mirror executions) MUST use the onchainos CLI. Read-only analysis is freely composed from the okx-dex-market / okx-tracker / okx-signal data plane.

## Instruction Priority

Tagged blocks indicate rule severity (higher wins on conflict):

1. **`<NEVER>`** — Absolute prohibition.
2. **`<MUST>`** — Mandatory step. Skipping breaks the flow.
3. **`<SHOULD>`** — Best practice.

## Pre-flight Checks

<MUST>
Run these checks on the FIRST trigger of this skill in a session. Do not echo routine output unless something fails.

1. **onchainos CLI installed** — verify with `onchainos --version`. If missing, ask the user to install per the official onchainos-skills README; do not auto-install.
2. **Login status** — required for free quota on the Market API.
   ```bash
   onchainos wallet status
   ```
   If `loggedIn: false`, tell the user:
   > Wallet Whisperer needs you to log in to OKX so the Market API returns data on the free tier. Run `onchainos wallet login your@email.com` then `onchainos wallet verify <code>`. Once you're back, paste the address again and I'll whisper it.
3. **Chain support** — for the READ/REPLAY mode, supported chains are returned by `onchainos market portfolio-supported-chains`. Cache the list for the session.
</MUST>

## Address & Chain Resolution

When the user pastes an address:

- `0x...` (40-hex) → EVM family. Default chain: `ethereum`. If the address has no Ethereum activity (zero trades from the overview), fall back to `base`, then `bsc`, then `arbitrum`, then `polygon`, in that order.
- Base58 string, 32–44 chars, no `0x` → Solana.
- The user MAY pin the chain by saying e.g. "analyze 0x... on Base" — honor that and skip auto-detection.

<NEVER>
Never invent or "fix" a malformed address. If the input does not match either format above, ask the user to re-paste it. Address fingerprints determine which on-chain calls are made; a wrong address silently analyzes the wrong wallet.
</NEVER>

---

# MODE 1 — READ (Persona Card)

Triggered by: "whisper this wallet", "analyze trader 0x...", "who is this wallet", "profile this address", or a bare address followed by no verb.

## Data Pull

<MUST>
Run these four calls in parallel — they are independent. **All four are required**. If any returns null/empty, mark the corresponding section of the Persona Card as `INSUFFICIENT_DATA` rather than fabricating.
</MUST>

```bash
onchainos market portfolio-overview --address <addr> --chain <chain> --time-frame 4        # 30d window
onchainos market portfolio-overview --address <addr> --chain <chain> --time-frame 5        # 3m window
onchainos market portfolio-recent-pnl --address <addr> --chain <chain> --limit 100
onchainos market portfolio-dex-history --address <addr> --chain <chain> --begin <ms_90d_ago> --end <ms_now> --limit 100
```

`<ms_90d_ago>` = `now_ms - 90 * 86400 * 1000`. `<ms_now>` = `Date.now()`.

## Deterministic Persona Inference

<MUST>
Do NOT use the LLM to "feel out" the persona. Compute every dimension deterministically from the API response per the rules below. This makes the result reproducible — two runs on the same data MUST produce the same card. The LLM's only job here is to phrase the verdict line at the end naturally; everything else is mechanical.
</MUST>

### Dimension 1 — Style

Compute median holding period of *closed* positions in the 90d history (entry timestamp → corresponding sell timestamp for FIFO inventory).

| Median hold | Style |
|---|---|
| < 4 hours | `Scalper` |
| 4h – 48h | `Day Trader` |
| 2 – 14 days | `Swing Trader` |
| 14 – 60 days | `Position Trader` |
| > 60 days | `HODL Investor` |

If `< 5 closed positions in 90d`, label `Insufficient Trade History` and skip Dimensions 4–6.

### Dimension 2 — Directional Bias

For each closed position, classify its entry context using `market kline` (1h candle 24h before entry):

- Entry on a candle whose close is **above** the 24h SMA → **momentum entry**
- Entry **below** SMA → **mean-reversion entry**

Style flag:

| Momentum entries | Bias |
|---|---|
| > 65% | `Momentum` |
| 35 – 65% | `Tactical` |
| < 35% | `Mean-Reversion` |

To save calls, only sample kline for the largest 20 entries by USD size; extrapolate the ratio.

### Dimension 3 — Sizing Pattern

From `portfolio-recent-pnl` and `portfolio-dex-history`, compute per-entry USD size as `entryUsd = tokenAmount * priceAtEntry`. Then:

- `medianSize` = median entry USD
- `sizeStdRatio` = std(entryUsd) / median(entryUsd)
- `pyramidRatio` = mean ratio of size_i / size_{i-1} for consecutive same-token buys (NaN if no pyramiding)

Classification:

| Condition | Label |
|---|---|
| `sizeStdRatio < 0.3` | `Flat Sizing` |
| `sizeStdRatio >= 0.3` AND `pyramidRatio > 1.2` | `Pyramid Up (Confidence Builder)` |
| `sizeStdRatio >= 0.3` AND `pyramidRatio < 0.8` | `Average Down` |
| else | `Variable Sizing` |

### Dimension 4 — Sector Tilt

Bucket every traded token via `onchainos token info <addr>` `category` field. Buckets: `Memes`, `L1`, `L2`, `DeFi`, `Stables`, `AI`, `RWA`, `NFTfi`, `Other`. Tilt = % of USD volume per bucket; top 3 buckets become the tilt.

> Cache `token info` lookups for the session — same token doesn't need to be re-classified.

### Dimension 5 — Behavioral Tells

Run these heuristics on the closed-position list. Each tell is a boolean; the Persona Card lists tells where the heuristic fires.

| Tell | Heuristic |
|---|---|
| `Revenge Trader` | ≥3 instances of: position closed at < -10% PnL, next position opened within 60 minutes |
| `FOMO Sizer` | After 3 consecutive winning closes, the next entry size > 1.5× median |
| `Capitulator` | ≥40% of losing closes exited within 1% of the 24h-low price |
| `Stop-Loss Disciplined` | ≥60% of losing closes exited between -5% and -12% (tight, consistent stop band) |
| `Top-Catcher` | ≥3 winning closes within 5% of the 24h-high price |
| `Bag Holder` | ≥3 *open* positions held for > 30 days at < -50% unrealized |
| `Late Rotator` | Avg time-to-entry on a token > 72h after its first 10× green candle on the 1h chart |

### Dimension 6 — Edge Metrics

From `portfolio-overview` (both timeframes):

- `winRate` (provided)
- `realizedPnl` (provided)
- `profitFactor` = sum(positive realized) / abs(sum(negative realized))
- `expectancy` = (winRate * avgWin) - ((1 - winRate) * avgLoss)
- `sharpeAdj` (0-10) = clamp( profitFactor * 2 + (winRate - 0.5) * 4, 0, 10 ) — **internal score only**, do NOT call this "Sharpe Ratio" in user-facing output (it's a proxy, not annualized return / vol). Calibration: PF=1, WR=50% → score 2 (no edge); PF=2.5, WR=60% → score ~5.4 (decent); PF=4, WR=70% → score ~8.8 (strong).

## Persona Card Template

<MUST>
Render the card exactly per the template below. Structure is fixed: section ordering, headers, the verdict sentence position. Translate prose into the user's language but keep numeric values, addresses, ticker symbols, and the `score / 10` literal as-is.
</MUST>

```
╭─ WALLET WHISPER ───────────────────────────────────────────╮
│  Address:  {short_addr}  ({chain})
│  Analysis: {trade_count} closed trades over {window} days
╰─────────────────────────────────────────────────────────────╯

🎭  TRADING PERSONA
    Style:        {style_label} · {bias_label}
    Sizing:       {sizing_label}    avg ${median_size}, σ {sizeStdRatio}
    Sector tilt:  {bucket_1} {pct_1}%, {bucket_2} {pct_2}%, {bucket_3} {pct_3}%

⚡  EDGE
    Win rate:        {winRate_30d}% (30d)  |  {winRate_3m}% (3m)
    Realized PnL:    ${realizedPnl_30d} (30d)  |  ${realizedPnl_3m} (3m)
    Profit factor:   {profitFactor}
    Expectancy:      ${expectancy} per trade
    Persona score:   {sharpeAdj} / 10

🚦  BEHAVIORAL TELLS
    {for each fired tell: "✓ {Tell Name} — {one-line evidence: e.g. '12 of 47 losing closes exited within 1% of 24h-low'}" }
    {if no tells fired: "— No notable behavioral signatures detected. Disciplined profile."}

💡  VERDICT
    {one-sentence natural-language synthesis — see Verdict Rules below}

▶  Next moves:
   1. Show their best & worst trades  →  "replay this wallet"
   2. Mirror this style on my wallet   →  "mirror this wallet"
   3. Re-profile in 7 days             →  "re-profile in 7d"
```

### Verdict Rules

The verdict line is the only LLM-written part. Keep it under 30 words. Combine: style + sizing + best edge metric + most-distinctive tell.

Examples (English; localize to user's language):

- `Disciplined Swing Trader with Pyramid sizing on L2 infra; profit factor 2.4 — competent operator with tight stop-loss discipline.`
- `Momentum Scalper on Solana memes; high win-rate but FOMO-sizes after streaks — edge is real but ruin risk elevated.`
- `Position Trader with sector tilt to DeFi blue chips; low turnover, expectancy +$340/trade — patient, low-noise profile worth mirroring.`

<NEVER>
- Never invent metric values. If a field is null in the API response, render `n/a` (not 0, not "low").
- Never compute "Sharpe Ratio" with that exact label — the proxy is `sharpeAdj` (an internal score 0-10). Calling it Sharpe is misleading.
- Never label a wallet "smart money" or "alpha" on your own authority — only relay OKX's `signal` data if the user asks "is this on the smart money list?" (call `onchainos signal list` and check).
- Never display `confirming: true` or raw quota notifications to the user. If the API returns those, handle them per the Quota / x402 section below.
</NEVER>

---

# MODE 2 — REPLAY (Trade Highlights Reel)

Triggered by: "replay this wallet", "show me their best trades", "highlights reel for 0x...", "narrate their trades".

## Data Pull

```bash
onchainos market portfolio-recent-pnl --address <addr> --chain <chain> --limit 100
onchainos market portfolio-dex-history --address <addr> --chain <chain> --begin <ms_90d_ago> --end <ms_now> --limit 100
```

For each closed position, also fetch:

```bash
onchainos market kline --address <token_addr> --chain <chain> --bar 1h --start <entry_ms> --end <exit_ms>
```

(Only for the top 3 winners and bottom 3 losers by realized USD, to save quota — 6 kline calls max per replay.)

## Selection

- **Best 3** = top 3 by realized USD profit
- **Worst 3** = bottom 3 by realized USD loss
- If fewer than 3 in either bucket, render whatever exists with a note like `Only 2 winning closes in the window.`

## Per-Trade Computations

From the kline + history:

- `entryPrice`, `exitPrice`, `entryTimeUtc`, `exitTimeUtc`, `holdDuration` (formatted "47h 12m" or "5d 3h")
- `maxFavorableExcursion` = max kline-high between entry and exit, as % above entry
- `maxAdverseExcursion` = min kline-low between entry and exit, as % below entry
- `missedTop` = if exit was sell, distance from exit to subsequent 7d high (% they left on table)
- `dodgedDrawdown` = if exit was sell, distance from exit to subsequent 7d low (% they avoided)

## Highlights Reel Template

<MUST>
Render exactly two sections in this order: `🏆 BEST 3` then `💀 WORST 3`. Each trade is one block. The narration line at the bottom is one sentence, sports-broadcast tone, factual — no emojis other than the section header.
</MUST>

```
🏆  BEST 3 TRADES (last 90 days)

  1. ${profit}  |  +{pct}%  |  {token_symbol}
     Entered:  {entryTimeUtc} at ${entryPrice}
     Exited:   {exitTimeUtc} at ${exitPrice}  ({holdDuration} held)
     During the hold: peaked +{mfe}%, drew down {mae}%
     Aftermath: token continued to {missedTop}% above exit over next 7d
     ▶ "Bought {token_symbol} at ${entryPrice}, sat through a {mae}% drawdown over {holdDuration}, exited at ${exitPrice} for +{pct}% — left {missedTop}% on the table."

  2. ... (same shape)
  3. ... (same shape)

💀  WORST 3 TRADES (last 90 days)

  1. -${loss}  |  {pct}%  |  {token_symbol}
     Entered:  {entryTimeUtc} at ${entryPrice}
     Exited:   {exitTimeUtc} at ${exitPrice}  ({holdDuration} held)
     During the hold: peaked +{mfe}%, drew down {mae}%
     Aftermath: token bottomed at {dodgedDrawdown}% below exit over next 7d
     ▶ "Caught {token_symbol} at ${entryPrice}, watched {mfe}% gain evaporate, panic-sold at ${exitPrice} for {pct}%. Token dropped another {dodgedDrawdown}% after — exit was on the lows."

  2. ... (same shape)
  3. ... (same shape)

▶  Next moves:
   1. See the persona behind these trades  →  "whisper this wallet"
   2. Mirror this trader going forward     →  "mirror this wallet"
```

### Narration Rules

The `▶` narration line is the one LLM-generated string per trade. Rules:

1. Always start with the verb the trader actually did (Bought / Caught / Flipped / Held).
2. Always include: entry price, hold duration, exit price, realized %.
3. End with the *consequence* of their decision (missed top OR dodged drawdown) — this is what makes the narration feel like analysis, not a stat dump.
4. Tone: factual, slightly dry. **Do not** moralize ("they should have held"). **Do not** add emojis. **Do not** make jokes.

<NEVER>
- Never narrate a trade you can't fully reconstruct. If MFE/MAE is missing (kline unavailable for that window), substitute `— price-action data unavailable for this window —` and skip that trade.
- Never invent a market context ("the market was bearish that week") unless you've actually pulled the BTC/ETH price for that window.
</NEVER>

---

# MODE 3 — MIRROR (Style-Filtered Copy Execution)

Triggered by: "mirror this wallet", "copy this trader", "follow {address} with style filter".

## Pre-conditions

<MUST>
Before any mirror is armed, all of the following MUST be true. If any fail, halt and ask the user to resolve:

1. The Persona Card has been rendered in this session (so the user has seen the profile). If not, run MODE 1 first.
2. The user has explicitly named the source address AND said "mirror" / "copy" / "follow this style" (mirroring is a write operation; no implicit triggers from a profile alone).
3. The user's own wallet is logged in (`onchainos wallet status` → `loggedIn: true`). If not, refuse with the standard login message; do NOT proceed.
4. The user has confirmed a **portfolio cap** (USD or %) per trade and an **overall cap** (max total deployed). Defaults if user says "use defaults": per-trade 2% of wallet USD value; overall 20%.
5. The source wallet's `Persona score` is ≥ 4 / 10. Below 4, refuse with: `Source wallet's persona score is {score}/10 — below the safety threshold of 4. Mirroring an unprofitable or undisciplined wallet typically loses money. Run "whisper {address}" again in 30 days if their edge improves.`
</MUST>

## Setting Up the Mirror

Persist the configuration to a per-session note (do not write secrets):

```yaml
mirror:
  source: <address>
  source_chain: <chain>
  persona_score: <number>
  caps:
    per_trade_pct: <number>
    overall_pct: <number>
  filters:
    style: <persona style label>
    bias: <persona bias label>
    forbidden_tells: [Revenge Trader, FOMO Sizer]   # never mirror trades during these patterns
  user_wallet: <user's evm or sol address from wallet status>
  armed_at: <iso timestamp>
```

## Polling Loop (one-tap-confirm per trade)

The mirror runs as a poller. Each poll cycle = call tracker → filter → **surface candidate to user → wait for explicit YES → execute**. The skill never auto-broadcasts a swap on the user's behalf; every mirrored trade requires the user's one-tap confirmation. This is the load-bearing safety design that distinguishes Whisperer from naive copy-trade bots.

```bash
# Single poll cycle (the agent runs this on demand: "check mirror" / "poll mirror")
new_trades = onchainos tracker activities \
    --tracker-type multi_address \
    --wallet-address <source> \
    --chain <chain> \
    --since <last_poll_ts>

for trade in new_trades:
    # 1. Style filter (skip silently)
    if not trade.matches(mirror.filters.style, mirror.filters.bias):
        log_skip("out-of-style entry"); continue

    # 2. Behavioral guard — refuse mirroring during forbidden behavior
    if classify_recent_pattern(source) in mirror.filters.forbidden_tells:
        log_skip("source is in {pattern} pattern"); continue

    # 3. Mandatory security scan (pure read; no confirmation needed)
    scan = onchainos security token-scan --address <trade.token> --chain <chain>
    if scan.risk_level >= "high":
        log_skip("token-scan flagged {risk_level}: {reason}"); continue

    # 4. Size to user's caps (pure read)
    user_wallet_usd = onchainos portfolio total-value --address <user> --chain <chain>
    size_usd = min(
        user_wallet_usd * mirror.caps.per_trade_pct / 100,
        deployed_capacity_remaining
    )

    # 5. SURFACE CANDIDATE TO USER (do not swap yet)
    render_candidate_card(trade, size_usd, scan_summary, persona_match_score)
```


## Per-Trade Candidate Card (mandatory user confirmation)

<MUST>
Every candidate trade MUST be rendered to the user in the format below, and the agent MUST wait for an explicit affirmative reply (`mirror this` / `yes execute` / `go`) before calling `onchainos swap swap`. A reply of anything else (including silence) = skip. **No mirror trade is ever auto-broadcast.**
</MUST>

```
🎯  MIRROR CANDIDATE  →  source bought {token_symbol} ({short_token_addr})

  Source action:    Bought ${source_size_usd} of {token_symbol} at ${entry_price}
  Source timestamp: {source_ts}
  Persona match:    ✓ in-style ({style_label} · {bias_label})  |  no forbidden tells active

  Security scan:    {risk_level} — {reason or "no flags"}
  Proposed size:    ${size_usd} ({size_pct}% of your portfolio)
  Stop-loss plan:   {if persona has Stop-Loss Disciplined: "auto -8% sell limit"; else: "manual exit"}
  Estimated fees:   ${fees_usd} (gas + slippage)

  ▶  Reply "execute" to mirror this trade, "skip" to pass, or "stop" to disarm the mirror.
```

After explicit user confirmation (`execute` / `mirror this` / `yes go`):

```bash
onchainos swap swap \
    --from USDC --to <trade.token> --amount-usd <size_usd> --chain <chain>

# Optional: persona-derived stop-loss if the source had Stop-Loss Disciplined
onchainos strategy create-limit \
    --token <trade.token> --side sell \
    --trigger-price <entry_price * 0.92>
```

If the user replies "skip" or anything non-affirmative, log the skip and proceed to the next candidate.

> CLI implementation note: this loop is interactive, not background. In a Claude Code session, the agent runs ONE poll cycle on demand ("check mirror") and reports candidates one by one. The skill does NOT spawn background processes and does NOT pre-authorize multi-trade batches.

## Mirror Status Output Template

When the user says "mirror status" or "what's the mirror doing":

```
🪞  MIRROR ACTIVE  →  source: {short_source_addr} ({chain})  |  armed: {duration}

  Polls executed:        {n_polls}
  Trades seen:           {n_total}
  Trades mirrored:       {n_executed}
  Trades skipped:        {n_skipped}
     ↳ out-of-style:      {n_skip_style}
     ↳ behavioral guard:  {n_skip_guard}
     ↳ security flag:     {n_skip_security}
     ↳ cap exceeded:      {n_skip_cap}

  Capital deployed:      ${deployed} / ${cap} ({deployed_pct}%)
  Open positions:        {n_open}
  Realized PnL since arm: ${pnl} ({pnl_pct}%)

▶  Last action:           {timestamp}
   {one-line summary of what happened in the last cycle}
```

## Drift Detection (Auto-Pause)

<MUST>
Every 7 days (or on user request "re-profile"), re-run MODE 1 on the source address. Compare new persona to original:

- If `style_label` changes → auto-pause, ping user: `Source wallet's style shifted from {old} to {new}. Pausing mirror until you re-confirm. Re-arm with "resume mirror".`
- If new `Revenge Trader` or `FOMO Sizer` tell appears that wasn't there before → auto-pause with the same message pattern.
- If `Persona score` drops below 4 → auto-pause with: `Source wallet's persona score dropped from {old} to {new}. Disarming mirror; this is below the safety threshold.`
</MUST>

---

# Quota / x402 Payment Handling

The Market API returns `MARKET_API_OLD_USER_POST_GRACE_OVER_QUOTA` once the free tier is exhausted. Two response shapes:

1. `confirming: true` + a `notifications[]` with payment options → CLI is asking whether to pay per-call.
2. Same notifications but with `confirming` absent → the call already failed; data fields are null.

<MUST>
**Default behavior is to surface the quota state to the user, NOT to silently auto-pay.** Template (translate to user's language):

```
The OKX Market API is past your free tier. To continue I'd need to spend {amount} {symbol} per call on {network}. Reply "yes pay" to authorize a single auto-pay session, or "stop" to cancel. (You can set a default payment asset with `onchainos payment default`.)
```

If the user says "yes pay", run `onchainos payment pay` with the offered `accepts[]` array per the okx-x402-payment skill, then retry the original call.
</MUST>

<NEVER>
- Never auto-pay without explicit user authorization.
- Never recommend the user fund a wallet "just to test the demo" — explain the free tier requires `onchainos wallet login` and that should be the default path.
</NEVER>

---

# Skill Routing

| Intent | Route to |
|---|---|
| "swap X for Y" alone | `okx-dex-swap` (Whisperer only swaps inside Mirror mode, never freeform) |
| "check my balance" | `okx-wallet-portfolio` |
| "what's BTC's price" | `okx-dex-market` |
| "show smart money signals" (global feed) | `okx-dex-signal` |
| "scan this token" alone | `okx-security` |
| "bridge X to chain Y" | `okx-dex-bridge` |
| "best yield for USDC" | `okx-defi-invest` |
| "x402 payment to API" | `okx-x402-payment` |
| "register for trading competition" | `okx-growth-competition` |

Wallet Whisperer composes these primitives but does not replace them. If the user's intent is one of the rows above and does NOT mention a specific wallet to profile / replay / mirror, defer.

---

# Error Handling

| Error / Situation | Response |
|---|---|
| Address malformed | `That doesn't look like an EVM (0x...) or Solana address. Could you paste it again?` |
| `loggedIn: false` | `Wallet Whisperer needs you to log in first so the Market API returns data on the free tier. Run "onchainos wallet login your@email.com" then "onchainos wallet verify <code>", and paste the address again.` |
| `MARKET_API_OLD_USER_POST_GRACE_OVER_QUOTA` | See Quota / x402 section above — surface, do not auto-pay |
| `portfolio-overview` returns null data | `No DEX activity found for {address} on {chain}. Want me to try other chains?` (then iterate base/bsc/arbitrum/polygon) |
| `portfolio-dex-history` returns < 5 closed positions | `Only {n} closed trades in 90d — not enough to infer a stable persona. I'll show what I can but skip the behavioral tells.` |
| Mirror security scan flagged high | `Skipped: token-scan flagged {risk}: {reason}. The source bought it anyway — that's exactly the kind of trade Whisperer is designed to filter out.` |
| Mirror cap exceeded | `Skipped: deploying this trade would exceed your overall cap of {cap_pct}%. Raise the cap with "mirror cap 30%" if you want.` |
| Rate limited (HTTP 429) | Wait 10s, retry once. If still failing: `OKX API is rate-limiting requests right now. Try again in a minute.` |
| Network failure | `Couldn't reach OKX backend. Check connection and retry.` |

---

# Acceptance Criteria

1. **Persona Card renders in < 20 seconds** for an address with 100+ trades on a chain with kline data available. Parallel calls in MODE 1 are required, not sequential.
2. **Trade Replay renders 3 best + 3 worst** with full narration, OR explicitly states which were unavailable and why.
3. **Mirror refuses to arm** when `persona_score < 4`, when the user isn't logged in, or when caps aren't set.
4. **Mirror skips out-of-style trades** and logs the reason every time. The mirror status output reflects skip counts honestly.
5. **No fabricated values.** Every number in user-facing output traces back to an API field or a deterministic computation from one.

---

# Notes / Non-obvious

- The `Persona score` is a proxy (profit factor × win-rate adjustment, clamped 0–10) — useful for relative ranking, not a true Sharpe ratio. Always show the underlying win rate, profit factor, and expectancy alongside it so the user can sanity-check.
- The behavioral tells are most reliable when the wallet has > 30 closed positions in 90d. Below that, label them `(low confidence)` in the card.
- The Mirror mode does NOT background-poll. The agent must be re-invoked ("check mirror" / "poll mirror") for each cycle. This is intentional — the skill stays inside a deterministic interactive loop and cannot run rogue trades while the user is away.
- The Drift Detection re-profile call costs the same as one MODE 1 invocation. Budget accordingly if you're profiling many sources.
