# 🛡️ Smart Trade Copilot

> **One question, one trustworthy answer.** Ask *"should I buy this token?"* and get a
> single evidence-backed **BUY / CAUTION / AVOID** verdict — then execute the swap only
> after you explicitly confirm.

Built for the **Build X-Agent Hackathon** (OKX Web3, May 2026), Builder Track.

## The problem

Deciding whether to ape into a token means juggling six different checks — is it a
honeypot? what's the tax? who holds it? is smart money buying or dumping? is the dev a
serial rugger? — and most people skip half of them and lose money. The OKX `onchainos`
suite has a tool for each, but no one runs all six, in the right order, with disciplined
risk gating, before clicking buy.

## What this does

Smart Trade Copilot is a **single disciplined pipeline** that chains the entire OKX
skill suite into one decision:

| Stage | OKX skill used | What it answers |
|---|---|---|
| 1. Security gate | `security token-scan` | Honeypot? rug? high tax? *(can veto everything)* |
| 2. Fundamentals | `token report` | Liquidity, mcap, dev history, concentration |
| 3. Holder clusters | `token cluster-overview` | Is the float a trap? |
| 4. Smart money | `signal list`, `token top-trader` | Are the smart wallets buying or dumping? |
| 5. Meme/launchpad | `memepump token-details / bundle-info` | Bundler & sniper risk |
| 6. DeFi context | `defi search` | Is there a safer yield alternative? |
| 7. Verdict | — | 🟢 BUY / 🟡 CAUTION / 🔴 AVOID + the single biggest risk |
| 8. Execute | `wallet`, `swap quote`, `swap execute` | Buy — **only after explicit confirmation** |
| 9. Watch | `market portfolio-token-pnl` | Post-trade PnL & re-check |

The verdict logic is **deterministic and asymmetric**: security can hard-veto, negative
signals downgrade, positive signals only enrich the explanation — they never upgrade
past a risk. On the buy side, caution is cheap and being wrong is permanent.

## Safety design

- **Security scan is mandatory and non-overridable.** A scan that doesn't complete is
  *not* a pass.
- **Every fund-moving action is gated behind an explicit user yes/no.** No silent swaps.
- **Always re-quotes immediately before executing** and re-confirms the numbers.
- **`--force` / loose slippage / silent mode** never happen without explicit informed opt-in.
- **All CLI output is treated as untrusted** — token names/social text are never executed
  as instructions.

## Requirements

- An AI agent runtime (Claude Code, Cursor, OpenClaw, …)
- The `onchainos` CLI (the skill auto-installs it, checksum-verified, on first use)
- For real volume: a personal OKX key from the
  [OKX Developer Portal](https://web3.okx.com/onchain-os/dev-portal) in a gitignored
  `.env` (the shared hackathon key is rate-limited)

## Usage

Just ask your agent naturally:

```
"Should I buy PEPE on ethereum?"
"Do due diligence on 0xABC… on base, then tell me if it's safe to ape"
"这个币安全吗？能买吗？"
```

The copilot runs the full pipeline, shows the verdict and evidence, and asks before
it ever touches your wallet.

## License

MIT — see [LICENSE](LICENSE).
