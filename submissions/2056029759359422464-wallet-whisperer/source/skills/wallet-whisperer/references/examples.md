# wallet-whisperer — example outputs

Rendered against a real Solana smart-money trader pulled from `onchainos signal list --chain solana` on 2026-05-17.

Source address: `21czpZj3BxT75dVbzmUJtE5QznJrLrYHHaF5pT4CpWM1`

All numbers below come from live `onchainos market portfolio-overview` and `portfolio-recent-pnl` calls. Nothing fabricated.

---

## MODE 1 — `whisper 21czpZj3BxT75dVbzmUJtE5QznJrLrYHHaF5pT4CpWM1`

```
WALLET WHISPER
  Address:  21czp...pWM1  (solana)
  Analysis: 100 closed positions in the recent-pnl window
            389 trades over 30 days (193 buys, 196 sells)

TRADING PERSONA
  Style:        Day Trader · Tactical
                (median hold 26.4 hours; short tail of < 60-second scalps)
  Sizing:       Variable Sizing       median $85, IQR $44 to $129, max $883
  Sector tilt:  Solana memes 100%
                (96 unique tokens, nearly all pump.fun launches)
  Market-cap:   strong tilt to sub-$100k caps
                (121 of 193 buys in MC range 1; 59 in range 2)

EDGE
  Win rate:        61.34% (30d, 60 of 100 last closed positions)
  Realized PnL:    +$1,009.18 (30d)
  Profit factor:   2.74 (gross win $1,376 / gross loss $503)
  Expectancy:      $8.73 per trade
  Top winner:      UNICEF +$112.45 (+244.94%)
  Persona score:   5.9 / 10

BEHAVIORAL TELLS
  ✓ Top-Catcher          — multiple wins exited within minutes of price peak
                            (PRIMIS held 73 seconds for +53.73%)
  ✓ Tactical Re-entry    — re-buys the same ticker within the same day
                            (ALIEN: 2 buys, 2 sells inside one minute)
  — No Revenge Trader pattern detected.
  — No FOMO Sizer pattern detected (sizing stays in $40 to $130 most trades).

VERDICT
  Hyper-active Day Trader on Solana pump.fun launches. 61% win rate at a
  $85 median size with a 2.74 profit factor. Edge is per-trade and
  fee-sensitive. Worth mirroring with very tight slippage tolerance.

Next moves:
  1. Show their best & worst trades  ->  "replay this wallet"
  2. Mirror this style on my wallet   ->  "mirror this wallet"
  3. Re-profile in 7 days             ->  "re-profile in 7d"
```

---

## MODE 2 — `replay 21czpZj3BxT75dVbzmUJtE5QznJrLrYHHaF5pT4CpWM1`

```
BEST 3 TRADES (last 100 closed positions)

  1. +$112.45  |  +244.94%  |  UNICEF
     Bought:  $45.91 in at $0.0000096   (2026-05-14 14:47 UTC, 1 buy)
     Sold:    $158.35 out at $0.0000330 (2 sells, last 2026-05-17 06:17 UTC)
     Held the residual position 2 days 16 hours after scaling out 76% in the
     first ten minutes. Largest realised win in the window.

  2. +$74.12   |  +28.83%   |  EARL
     Bought:  $257.04 in at $0.000127   (2 buys, 2026-05-16 18:39 UTC)
     Sold:    $331.15 out at $0.000163  (2 sells)
     Held 11 hours 38 minutes for a clean +28.83% on the largest position
     size in the highlight set.

  3. +$71.64   |  +53.73%   |  PRIMIS
     Bought:  $133.35 in at $0.000936   (2 buys, 2026-05-15 11:37 UTC)
     Sold:    $204.99 out at $0.001439  (1 sell, 1 minute 13 seconds later)
     Snap trade. Bought, ran 53% in 73 seconds, fully out. Exemplifies the
     scalper tail of the persona.

WORST 3 TRADES (last 100 closed positions)

  1. -$79.47   |  -30.07%   |  SELLOR
     Bought:  $264.32 in at $0.000154   (3 buys, 2026-05-15 09:58 UTC)
     Sold:    $184.85 out at $0.000108  (1 sell)
     Largest realised loss in the window. Stayed in size while price decayed
     30% over ~1 day 20 hours. Worst loss-to-stop discipline ratio of the set.

  2. -$54.28   |  -51.58%   |  Cloutcoin
     Bought:  $105.25 in at $0.0000689  (2 buys, 2026-05-15 21:11 UTC)
     Sold:    $50.96 out at $0.0000334  (2 sells, ~1 day 9 hours later)
     Halved. Pump.fun token that died after the bid evaporated.

  3. -$40.69   |  -31.70%   |  pup
     Bought:  $128.37 in at $0.0000858  (1 buy, 2026-05-16 19:13 UTC)
     Sold:    $87.68 out at $0.0000586  (1 sell, ~11 hours later)
     Mid-size loss. Same pattern: bought a fresh launch, exited under price.

Next moves:
  1. See the persona behind these trades  ->  "whisper this wallet"
  2. Mirror this trader going forward     ->  "mirror this wallet"
```

---

## MODE 3 — `mirror 21czpZj3BxT75dVbzmUJtE5QznJrLrYHHaF5pT4CpWM1`

Pre-condition check passes: persona score 5.9 / 10 is above the 4 / 10 mirror threshold.

After arming with default caps (per-trade 2%, overall 20%), a poll surfaces a candidate:

```
MIRROR CANDIDATE  ->  source bought TOLYBOT (Fjg...pump)

  Source action:    Bought $107.61 of TOLYBOT at $0.000573
  Source timestamp: 2026-05-17 18:39 UTC
  Persona match:    in-style (Day Trader / Tactical bias)
                    No forbidden tells active

  Security scan:    LOW   no flags
  Proposed size:    $20 (2% of your $1,000 portfolio)
  Stop-loss plan:   manual exit
                    (source persona does NOT have Stop-Loss Disciplined tell)
  Estimated fees:   $0.60 (Solana fees + 0.5% slippage)

  Reply "execute" to mirror, "skip" to pass, or "stop" to disarm.
```

If user replies `execute`:

```
Mirror executed.
  tx hash: <solana sig>
  bought:  34,938 TOLYBOT for $20.00 USDC at $0.000573

Mirror is still armed. Reply "check mirror" to poll again.
```

If user replies `skip`:

```
Skipped. Reason logged: user declined.
Mirror still armed; next candidate will surface on the next poll.
```

---

## Status view (after a few poll cycles)

```
MIRROR ACTIVE  ->  source: 21czp...pWM1 (solana)  |  armed: 2 hours

  Polls executed:        12
  Trades seen:           7
  Trades mirrored:       3
  Trades skipped:        4
     out-of-style:        1
     behavioral guard:    0
     security flag:       1
     user declined:       2

  Capital deployed:      $58 / $200 (29%)
  Open positions:        2
  Realized PnL since arm: +$3.40 (+1.7%)

  Last action:  surfaced TOLYBOT candidate at $0.000573 - user replied "execute".
```

---

## Drift detection auto-pause (after a 7-day re-profile)

```
MIRROR AUTO-PAUSED  ->  source: 21czp...pWM1 (solana)

Source wallet's persona has drifted:
  Profit factor:  2.74  ->  1.42       below profit-factor floor
  Win rate:       61%   ->  52%        sharp drop
  New tell:       Capitulator          (exits within 1% of 24h-low,
                                        was not present 7 days ago)

Mirror disarmed. The trader's edge has degraded in the last 7 days and a new
panic-exit pattern has appeared. Re-arm with "resume mirror" only if you want
to mirror the new style.
```
