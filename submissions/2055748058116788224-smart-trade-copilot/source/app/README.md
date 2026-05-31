# 🛡️ Smart Trade Copilot

> Ask **"should I buy this token?"** — get one evidence-backed
> **🟢 BUY / 🟡 CAUTION / 🔴 AVOID** verdict, then execute the swap
> only after you explicitly confirm.
>
> A real CLI product that chains the **OKX onchainOS** skill suite into a
> single disciplined decision pipeline. Built for the **Build X-Agent
> Hackathon** (OKX Web3, May 2026) — Builder Track.

---

## Why

Deciding whether to ape into a token means juggling six checks — honeypot?
tax? holder concentration? is smart money buying or dumping? serial-rug dev?
Most people skip half and lose money. OKX's `onchainos` engine has a skill
for each, but nobody runs all of them, in the right order, with disciplined
risk gating, *before* clicking buy. This tool does.

## What it does

```
$ smart-trade-copilot analyze BONK --chain solana
```

```
   ╔═══════════════════════════════════════════════════════════╗
   ║   SMART TRADE COPILOT  ·  powered by OKX onchainOS        ║
   ╚═══════════════════════════════════════════════════════════╝
   ✔ Security scan (honeypot / rug / tax)
   ✔ Fundamentals & price
   ✔ Holder cluster risk
   ✔ Smart-money signals
   ✔ Launchpad / meme risk
   ◌ DeFi yield alternatives  (skipped: no venue indexed)

   ────────────────────────────────────────────────────────────
     🟢  VERDICT: BUY   ·   BONK on solana
   ────────────────────────────────────────────────────────────
   Biggest risk: MEDIUM RISK — security scan returned MEDIUM, noted.
   Supporting:
     + Liquidity ~$5.4M.
     + Smart money is freshly accumulating.
   OKX skills run: security, fundamentals, clusters, signals, meme
```

| Stage | OKX onchainos skill | Answers |
|---|---|---|
| 1 Security | `security token-scan` | Honeypot? rug? high tax? **(can hard-veto)** |
| 2 Fundamentals | `token report` | Liquidity, mcap, dev rug history, age |
| 3 Holder clusters | `token cluster-overview` | Is the float a trap? |
| 4 Smart money | `token top-trader`, `signal list` | Smart wallets buying or dumping? |
| 5 Launchpad/meme | `memepump token-bundle-info` | Bundler / sniper risk |
| 6 DeFi context | `defi search` | Safer yield alternative? |
| 7 Verdict | *(deterministic engine)* | 🟢/🟡/🔴 + the single biggest risk |
| 8 Execute | `wallet`, `swap quote`, `swap execute` | Buy — **only after explicit "yes"** |

## Safety by design

- **Security can hard-veto.** Honeypot or CRITICAL → AVOID, full stop.
- **A scan that doesn't complete is NOT a pass** — it degrades to CAUTION,
  never silently to "safe". (Verified: see the live-run behavior under a
  throttled key — it refuses to fabricate.)
- **Asymmetric scoring**: negatives downgrade, positives only enrich the
  explanation. On the buy side, caution is cheap; being wrong is permanent.
- **Every fund-moving action is gated** behind an explicit interactive `yes`,
  always re-quoting immediately before execution.
- Deterministic verdict engine — **unit-tested, 7/7** edge cases (honeypot,
  CRITICAL, HIGH-floor, failed-scan, stacked-downgrade…).

## Install

```bash
git clone https://github.com/victorjayeoba/Smart-Trade-Copilot
cd Smart-Trade-Copilot/app
npm install
```

Requires Node ≥ 18.17. Live mode also needs the OKX `onchainos` CLI
(auto-resolved from `~/.local/bin`, or set `ONCHAINOS_BIN`) —
install: <https://github.com/okx/onchainos-skills>.

## How to test it

### ① Fastest — demo mode (no key, no onchainos, ~5 seconds)

```bash
node src/index.js --demo analyze BONK --chain solana
```

Runs the full pipeline + verdict engine + UI on bundled sample data.
This is the quickest way to see exactly what the product does.

### ② Verify the decision engine (unit tests, no network)

```bash
node --test 2>/dev/null || node tests/verdict.test.mjs
```

7/7 cases: honeypot & CRITICAL hard-veto to AVOID, HIGH floors to
CAUTION, a failed scan is **never** treated as a pass.

### ③ Fully live (real OKX data)

```bash
cp .env.example .env      # add an OKX key (see below)
node src/index.js analyze PEPE --chain ethereum
```

Every stage hits the real OKX `onchainos` backend. Get a key at the
[OKX Developer Portal](https://web3.okx.com/onchain-os/dev-portal).

> **Note on API tiers:** OKX *Trial* keys cap the `security` and `market`
> endpoints. When an endpoint is unavailable the tool **does not fabricate a
> "safe" result** — it marks that stage *unverified* and downgrades the
> verdict to CAUTION. That fail-safe is intentional and is itself a feature.
> A standard/internal key (what evaluators use) runs all stages live.

### Optionally test the gated buy flow

```bash
onchainos wallet login your@email.com   # OTP login to OKX Agentic Wallet
onchainos wallet verify <otp>
node src/index.js analyze PEPE --chain ethereum --buy 0.001 --pay eth
```

The tool analyzes, shows the verdict, **quotes**, then **asks you to type
`yes`** before broadcasting. Decline at the prompt to test it spending nothing.
`.env` is gitignored.

## Architecture

```
src/
  index.js      CLI, arg parsing, token resolution, gated execution flow
  onchainos.js  defensive wrapper: spawn + JSON parse + quota/auth handling
  pipeline.js   runs the OKX skill suite in order, normalizes responses
  verdict.js    deterministic BUY/CAUTION/AVOID engine (unit-tested)
  swap.js       confirmation-gated quote + execute, MEV thresholds
  ui.js         terminal report-card presentation
```

Also ships as a **Plugin Store skill** (`/skills/smart-trade-copilot/`) — the
same pipeline as a SKILL.md an AI agent can run directly.

## License

MIT
