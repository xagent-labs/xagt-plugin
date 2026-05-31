# Meme Radar

An AI on-chain radar that finds fresh meme tokens and ranks them by smart-money signal, holder structure, and rug risk.

## Hackathon Fit

- Built for **Build X-Agent Hackathon · OKX Web3 Developer Challenge**.
- Builder Track: code project with a public GitHub link.
- Event window: **May 11-18, 2026**.
- Prize pool: **6,000 USDT** total, with **3,000 USDT** for the Builder Track.
- Uses OKX skills: `okx-dex-trenches`, `okx-dex-token`, `okx-dex-signal`, and `okx-security`.
- Public deliverable: [GitHub repository](https://github.com/MoKangMedical/meme-radar) and [GitHub Pages demo](https://mokangmedical.github.io/meme-radar/).
- Official submission PR: [xerpa-ai/xagt-plugin#3](https://github.com/xerpa-ai/xagt-plugin/pull/3).
- One-line description: "An AI on-chain radar that finds fresh meme tokens and ranks them by smart-money signal, holder structure, and rug risk."
- Submit with the hackathon submission form or the plugin submit command.

## What It Does

Meme Radar is a read-only research console for new meme-token launches. It combines launchpad discovery, holder structure, developer reputation, smart-money signal, and security verdicts into one ranked dashboard. The app is intentionally not an auto-trader: the strongest demo is that it explains why a token is a watchlist candidate, research-only, or a hard block.

## Demo Video

[Watch the 60-second demo video](docs/demo/meme-radar-demo.mp4).

## Features

- Live screening queue with search, risk filters, stage filters, and chain filters.
- Radar map that plots token momentum against relative safety.
- Token inspector with security verdict, risk breakdown, flags, and recommended next checks.
- Local refresh API that can trigger the OKX Onchain OS CLI from the UI.
- Demo snapshot fallback so the public GitHub project stays reviewable without private API credentials.
- Submission pack with one-line description, X post copy, and `xagt-plugin submit` command.

## OKX Skill Pipeline

The intended live pipeline is:

1. `okx-dex-trenches`: discover fresh launchpad tokens with `onchainos memepump chains` and `onchainos memepump tokens`.
2. `okx-dex-token`: enrich candidates with token-level details, holder concentration, and advanced risk metadata.
3. `okx-dex-signal`: bring in smart-money/KOL/whale activity for ranking.
4. `okx-security`: run final token and transaction safety checks before any user action.

The checked-in `public/data/radar-snapshot.json` is a demo snapshot so reviewers can open the app without API credentials. If the `onchainos` CLI is configured with OKX Onchain OS credentials, run:

```bash
npm run okx:snapshot
```

That command rewrites the snapshot with live OKX data. If the CLI is missing credentials or the endpoint is unavailable in the current region, it keeps the demo snapshot instead of breaking the app.

For the full local app with a refresh API:

```bash
npm run app
```

Open `http://localhost:4173`, then click **Refresh snapshot**. The button calls `POST /api/snapshot/refresh`, which attempts the OKX CLI pipeline and returns to demo fallback if credentials are unavailable.

## Run Locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Check the full submission package:

```bash
npm run submit:check
```

## Demo Script

1. Open the dashboard and show the ranked screening queue.
2. Filter by `HIGH` or `CRITICAL` risk and show that dangerous tokens are separated from opportunity candidates.
3. Select a token on the radar map and walk through the inspector: security verdict, holder concentration, developer history, and recommended next checks.
4. Run `npm run app`, click **Refresh snapshot**, and show the live/fallback status banner.
5. Show the Submission Pack and copy the one-line description or submit command.

## Submission Notes

Checklist from the hackathon page:

- At least one OKX skill: covered by the OKX skill pipeline above.
- Public link: publish this repository on GitHub.
- One-line description: included above and in the in-app Submission Pack.
- Submit: use the form on the hackathon page or run the plugin submit command.
- Bonus: add a 1-3 minute demo video to this README and post on X with `#XAgentHackathon`.

Plugin submit command:

```bash
PUBLIC_REPO_URL="https://github.com/MoKangMedical/meme-radar" PUBLIC_DEPLOY_URL="https://mokangmedical.github.io/meme-radar/" npm run submit
```

If your local setup exposes the shorter binary name from the installer, this direct form also works:

```bash
xagt-plugin submit \
  --name "Meme Radar" \
  --intro "An AI on-chain radar that finds fresh meme tokens and ranks them by smart-money signal, holder structure, and rug risk." \
  --repo "https://github.com/MoKangMedical/meme-radar" \
  --deploy "https://mokangmedical.github.io/meme-radar/"
```

Recommended README demo video: 1-3 minutes showing the screening queue, radar map, inspector, refresh/fallback status, and the OKX snapshot command.

Recommended X post:

```text
Built Meme Radar for #XAgentHackathon: an OKX-powered AI dashboard that ranks fresh meme tokens by smart-money signal, holder structure, and rug risk.
```
