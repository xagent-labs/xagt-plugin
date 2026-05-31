# Wallet Whisperer

> Reverse-engineer a wallet's trading personality from on-chain history. Narrate its best and worst trades. Mirror its style with explicit per-trade confirmation.

**Live demo** → **[wallet-whisperer.onrender.com](https://wallet-whisperer.onrender.com)** · Paste any wallet address (try the sample chip on the page) and watch the OKX skills fire in real time.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Node](https://img.shields.io/badge/node-%E2%89%A518-43853d.svg)](https://nodejs.org) [![OKX OnchainOS](https://img.shields.io/badge/OKX-OnchainOS-2563eb.svg)](https://web3.okx.com/onchainos) [![Deploy: Render](https://img.shields.io/badge/deploy-Render-46e3b7.svg)](https://wallet-whisperer.onrender.com)

Wallet Whisperer takes any on-chain wallet address and reduces 90 days of DEX activity to a one-screen "trading persona". Style, sizing, sector tilt, behavioural tells, edge metrics, a verdict, and the trades they wish you didn't see. Then it lets you mirror their *in-character* trades on your own wallet — but only after passing every candidate through a security scan, sizing it to your portfolio caps, and waiting for your explicit confirmation.

The same engine powers three surfaces: a web app, a terminal CLI, and an agent skill that runs inside Claude Code, Cursor, Codex, Gemini CLI, OpenCode, and Windsurf.

---

## Table of contents

- [The problem](#the-problem)
- [What it does](#what-it-does)
- [Try it now](#try-it-now)
- [OKX skills used](#okx-skills-used)
- [Three surfaces, one engine](#three-surfaces-one-engine)
- [Quick start](#quick-start)
- [Architecture](#architecture)
- [How persona inference works](#how-persona-inference-works)
- [How mirroring works](#how-mirroring-works)
- [Project structure](#project-structure)
- [Development](#development)
- [License](#license)

---

## The problem

Copy-trading on-chain is broken. You spot a smart wallet, click "mirror," and you start blindly cloning every trade — the rug pull, the compromised-key panic sell, the revenge trade after a loss. The hit rate of naive copy-trade bots is depressing for exactly that reason: they mirror *trades*, not *strategies*.

## What it does

- **Reads** any wallet's 90-day DEX history through the OKX Market API
- **Infers** a six-dimensional trading persona: style (scalper / day trader / swing / position / hodl), directional bias, sizing pattern, sector tilt, behavioural tells, edge metrics — all computed deterministically, not by an LLM
- **Narrates** the three best and three worst closed trades with prices, hold durations, and timing
- **Filters** every new candidate trade against the inferred persona — trades that don't fit get skipped (the rug pull, the compromised-key sell, the revenge trade)
- **Scans** every candidate token with OKX Security (honeypot, mintable, washtrade, low liquidity, etc.) before any execution
- **Surfaces** each candidate as a confirmation card and waits for the user to type `execute` — no auto-broadcast, ever
- **Re-profiles** the source wallet every seven days and auto-pauses if the style drifts or the persona score drops below the safety threshold

## Try it now

| | |
|---|---|
| **Hosted web app** | **[wallet-whisperer.onrender.com](https://wallet-whisperer.onrender.com)** — no signup, no wallet connect. Paste any address and watch the OKX skills fire live on the left. |
| **Demo video** | **[link](https://www.youtube.com/shorts/OcbDnziLYkE)** |
| **Run locally** | `git clone https://github.com/Temitope15/wallet-whisperer && cd wallet-whisperer/cli && npm install && npm run web` then open `http://localhost:4444` |

The hosted version uses a shared dedicated OKX account on the server side, so visitors get the magic 9-second whisper without any onboarding. Per-IP rate limits keep the demo's 1M-call / month free tier comfortable for everyone. For unlimited use, install the CLI (`npm install -g .`) and run it against your own onchainos login.

## OKX skills used

| Skill | Operation | Used for |
|---|---|---|
| `okx-agentic-wallet` | `wallet status` | Pre-flight: confirm the local session is logged in |
| `okx-dex-market` | `portfolio-overview` | Win rate, realised PnL, buy / sell counts, market-cap tilt |
| `okx-dex-market` | `portfolio-recent-pnl` | Per-token PnL, hold times, best / worst trade selection |
| `okx-dex-market` | `portfolio-dex-history` | (Skill mode) Pagination of raw DEX history for FIFO inventory |
| `okx-tracker` | `activities` | Mirror mode: live poll of the source wallet's new buys |
| `okx-security` | `token-scan` | Mandatory honeypot / mint / washtrade check on every mirror candidate |
| `okx-wallet-portfolio` | `total-value` | Mirror mode: size each candidate against the user's portfolio cap |
| `okx-dex-swap` | `swap` | Mirror mode: execute the swap after the user types `execute` |
| `okx-strategy` | `create-limit` | Mirror mode: auto stop-loss when the source persona has `Stop-Loss Disciplined` |

All on-chain writes go through the user's TEE-managed Agentic Wallet via `onchainos swap swap`. All reads use the documented Market API on the user's free 1M-call / month tier. No third-party data sources, no API keys to manage.

## Three surfaces, one engine

| Surface | When to use | How to install | Mirror support |
|---|---|---|---|
| **Web app** (`/whisper`) | One-shot lookups, sharing a wallet profile via URL, demos | `npm run web` (port 4444) | Setup wizard + preview poll; hands off the prompt to the agent host |
| **Terminal CLI** (`wallet-whisperer`) | Scripts, CI, scheduled checks, terminal-native devs | `npm install -g .` | `mirror` subcommand prints handoff instructions |
| **Agent skill** (Claude Code, Cursor, Codex, OpenCode, Windsurf) | Live mirroring with per-trade confirmation inside the agent host | `wallet-whisperer init <host>` | Full mirror loop with `okx-security` scanning + `execute` confirm per candidate |

The web app and CLI share the same persona-inference Node module. The agent skill follows the same heuristics, declared as instructions in [`skills/wallet-whisperer/SKILL.md`](skills/wallet-whisperer/SKILL.md).

## Quick start

### Prerequisites

- Node.js ≥ 18
- macOS or Linux
- A free OKX OnchainOS account (email signup, no funding required)

### 1. Install the onchainos CLI

```bash
curl -sSL https://raw.githubusercontent.com/okx/onchainos-skills/main/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
onchainos --version
```

### 2. Log in (free 1M API calls / month)

```bash
onchainos wallet login [EMAIL_ADDRESS]   # check inbox for the OTP
onchainos wallet verify 123456 # enter the otp given in your emial inbox
onchainos wallet status                  # should show "loggedIn": true
```

### 3. Pick a surface

**Web app:**

```bash
git clone https://github.com/Temitope15/wallet-whisperer
cd wallet-whisperer/cli
npm install
npm run web
# open http://localhost:4444
```

**Terminal CLI:**

```bash
cd wallet-whisperer/cli
npm install -g .
wallet-whisperer whisper 21czpZj3BxT75dVbzmUJtE5QznJrLrYHHaF5pT4CpWM1
```

**Agent skill — one-line install into any supported host:**

```bash
cd wallet-whisperer/cli && npm install -g .
wallet-whisperer init claude        # or: cursor · codex · opencode · windsurf · agents
```

Then open the host and trigger:

```bash
claude
# > whisper this wallet 21czpZj3BxT75dVbzmUJtE5QznJrLrYHHaF5pT4CpWM1
```

The `init` command resolves the host's skills directory, copies the skill (idempotent — pass `--force` to overwrite), and prints the trigger phrase. Run `wallet-whisperer init --help` for the full host list and flags. If you don't have the repo cloned, the command falls back to downloading the skill files from GitHub.

## Architecture

```
                         ┌───────────────────────────┐
                         │   onchainos CLI (OKX)     │
                         │  market · tracker ·       │
                         │  security · swap · etc.   │
                         └─────────────┬─────────────┘
                                       │
                          ┌────────────┴────────────┐
                          │   cli/lib/onchainos.js  │
                          │   thin command wrapper  │
                          └────────────┬────────────┘
                                       │
                       ┌───────────────┴───────────────┐
                       │     cli/lib/persona.js        │
                       │  deterministic persona infer  │
                       │  (style, sizing, tells, edge) │
                       └───────────────┬───────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            │                          │                          │
            ▼                          ▼                          ▼
   ┌─────────────────┐       ┌───────────────────┐      ┌──────────────────┐
   │   Terminal CLI  │       │  Web server (SSE) │      │   Agent skill    │
   │ cli/bin/whisper │       │   cli/web/...     │      │ skills/SKILL.md  │
   │  + lib/render   │       │ live skills view  │      │  triggered by    │
   │                 │       │ Web app at :4444  │      │  natural language│
   └─────────────────┘       └───────────────────┘      └──────────────────┘
```

The persona engine is one module. The three surfaces are presentation layers. Adding a new surface (mobile app, Telegram bot, Discord bot) means writing a new presenter against the same `persona.js` exports.

## How persona inference works

All scoring is deterministic — same input, same output. The LLM never invents numbers. The full spec lives in [`skills/wallet-whisperer/SKILL.md`](skills/wallet-whisperer/SKILL.md); the JS implementation is in [`cli/lib/persona.js`](cli/lib/persona.js). Six dimensions:

| Dimension | How it's computed |
|---|---|
| **Style** | Median closed-position hold time → `Scalper` (< 4h), `Day Trader` (4–48h), `Swing Trader` (2–14d), `Position Trader` (14–60d), `HODL Investor` (> 60d) |
| **Sizing** | Inter-quartile-range ratio of buy-USD over the closed-trade window → `Flat`, `Variable`, or `Highly Variable Sizing` |
| **Sector tilt** | Bucket every traded token's market cap into 5 ranges, top 3 buckets become the tilt |
| **Behavioural tells** | Heuristic boolean flags: `Top-Catcher`, `Tactical Re-entry`, `Capitulator`, `Revenge Trader`, `FOMO Sizer`, `Stop-Loss Disciplined` |
| **Edge metrics** | Win rate, profit factor, expectancy (gross win + gross loss) / trade count |
| **Persona score** | `clamp(profitFactor × 2 + (winRate − 0.5) × 4, 0, 10)` — calibrated so 4 is the minimum mirrorable, 6+ is "worth mirroring" |

The LLM's *only* freedom is the one-sentence verdict at the bottom of the persona card.

## How mirroring works

```
┌─ source wallet ─┐                                                ┌─ user wallet ─┐
│  smart-money    │                                                │  caps, prefs  │
└────────┬────────┘                                                └───────┬───────┘
         │ poll: okx-tracker activities (every cycle)                      │
         ▼                                                                 │
   ┌─────────────┐ in-style?      ┌────────────────┐  pass?    ┌─────────┐ │ proposed
   │ new BUY     │───────────────▶│ persona filter │──────────▶│ okx-    │─┤ size
   └──────┬──────┘                └────────┬───────┘  fail     │ security│ │ within
          │                                ▼ skip + log        │ scan    │ │ caps?
          ▼                                                    └────┬────┘ │
   ┌──────────────────┐                                             │ pass │
   │ render candidate │◀────────────────────────────────────────────┴──────┘
   │ card for user    │
   └──────┬───────────┘
          │  user types "execute"
          ▼
    ┌─────────────────┐
    │ okx-dex-swap    │  ── optional okx-strategy stop-loss
    └─────────────────┘
```

Five safety properties, all enforced:

1. **Style-gated.** Out-of-character trades are skipped. (Re-profile detects style drift weekly and auto-pauses.)
2. **Security-scanned.** No swap proceeds without `okx-security token-scan` returning `LOW` or `MEDIUM` risk.
3. **Cap-bounded.** Position size is `min(per_trade_cap × user_portfolio, remaining_overall_cap)`. Both caps are user-set.
4. **Confirmation-gated.** The skill never broadcasts a swap without the user typing `execute`. There is no auto mode, no batching.
5. **Threshold-gated.** Sources with persona score < 4 cannot arm a mirror in the first place.

## Project structure

```
wallet-whisperer/
├── README.md                                 ← you are here
├── CHANGELOG.md
├── LICENSE                                   ← MIT
├── plugin.yaml                               ← OKX plugin-store manifest
│
├── skills/wallet-whisperer/                  ← the agent skill (declarative)
│   ├── SKILL.md                              ← agent instructions: triggers, templates, rules (537 LoC)
│   └── references/
│       ├── cli-reference.md                  ← every onchainos call this skill makes
│       └── examples.md                       ← rendered example outputs per mode (real data)
│
└── cli/                                      ← Node 18+ package
    ├── package.json                          ← bin: wallet-whisperer · script: web
    ├── bin/wallet-whisperer.js               ← terminal entry: whisper · replay · mirror
    ├── lib/
    │   ├── onchainos.js                      ← thin async wrapper around the onchainos CLI
    │   ├── persona.js                        ← deterministic persona inference (212 LoC)
    │   ├── render.js                         ← terminal renderers (Persona Card, Replay)
    │   └── style.js                          ← zero-dep ANSI + box drawing
    └── web/
        ├── server.js                         ← zero-dep Node http server + SSE
        └── public/
            ├── index.html                    ← landing
            ├── setup.html                    ← install walkthrough
            └── whisper.html                  ← the app (sidebar nav + live engine)
```

Total: ~3,800 lines, zero npm dependencies in the web server, two transitive deps for the CLI (none for the core library).

## Development

```bash
git clone https://github.com/Temitope15/wallet-whisperer
cd wallet-whisperer

# Plugin lint (must pass before submission to OKX plugin-store)
plugin-store lint ./

# Run the CLI from source
node cli/bin/wallet-whisperer.js whisper <address>

# Run the web UI from source
node cli/web/server.js
# PORT=8080 node cli/web/server.js   # override port

# Syntax check
node --check cli/bin/wallet-whisperer.js
node --check cli/lib/*.js
node --check cli/web/server.js
```

### Adding a new agent host

1. Add the host's skills directory to `cli/web/public/setup.html` host tabs and `cli/web/public/whisper.html` mirror wizard tabs.
2. Add a row to the install matrix in [`/setup`](http://localhost:4444/setup).
3. Test by copying the skill into that host's skills dir and running the trigger phrase.

### Tweaking persona heuristics

Edit `cli/lib/persona.js`. The web app and CLI pick up changes immediately. The agent skill follows the spec in `skills/wallet-whisperer/SKILL.md` — keep the two in sync.

## License

MIT — see [LICENSE](LICENSE).

Built for the OKX Build X-Agent Hackathon, May 2026. Pull requests and issues welcome.
