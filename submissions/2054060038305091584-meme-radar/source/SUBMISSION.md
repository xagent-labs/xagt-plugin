# Build X-Agent Hackathon Submission

## Project

Meme Radar

## Track

Builder Track / OKX Web3 Developer Challenge

## One-line description

An AI on-chain radar that finds fresh meme tokens and ranks them by smart-money signal, holder structure, and rug risk.

## Public link

GitHub repository: https://github.com/MoKangMedical/meme-radar

Deploy URL: https://mokangmedical.github.io/meme-radar/

Official xagt-plugin PR: https://github.com/xerpa-ai/xagt-plugin/pull/3

## What was built

Meme Radar is a read-only X-Agent style research console for meme-token launches. It scans launchpads, ranks tokens by signal and risk, plots candidates on a momentum-vs-safety radar, and explains why a token is watchlist-worthy, research-only, or blocked.

## OKX Skills Used

- `okx-dex-trenches`: launchpad discovery, new token scanning, dev info, bundle/sniper checks.
- `okx-dex-token`: token metadata, price/liquidity enrichment, holder and advanced info.
- `okx-dex-signal`: smart-money / KOL / whale signal layer.
- `okx-security`: token safety verdict before any trading consideration.

## Demo Video

README demo video: `docs/demo/meme-radar-demo.mp4`

## X Post

```text
Built Meme Radar for #XAgentHackathon at MuShanghai: an X-Agent + OKX skills dashboard that helps users screen fresh meme tokens by smart-money signal, holder structure, and rug risk.
```

## Local Review Commands

```bash
npm install
npm run app
npm run submit:check
```

Open `http://localhost:4173`.

## Submit Command

Run this after the GitHub repository is public and this file has the public URL:

```bash
PUBLIC_REPO_URL="https://github.com/MoKangMedical/meme-radar" PUBLIC_DEPLOY_URL="https://mokangmedical.github.io/meme-radar/" npm run submit
```

Equivalent direct command:

```bash
npx @xagt/agent-plugin@latest submit \
  --name "Meme Radar" \
  --intro "An AI on-chain radar that finds fresh meme tokens and ranks them by smart-money signal, holder structure, and rug risk." \
  --repo "https://github.com/MoKangMedical/meme-radar" \
  --deploy "https://mokangmedical.github.io/meme-radar/"
```
