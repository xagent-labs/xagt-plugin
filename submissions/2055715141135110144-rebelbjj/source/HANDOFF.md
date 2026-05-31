# Rebel BJJ Handoff

Use this file to continue the project from a new Codex or ChatGPT account.

## Project Links

- GitHub repo: https://github.com/kathyyxu/rebelbjj
- Live app: https://phantom-thief-s-mat-main.vercel.app/
- Demo video: https://www.youtube.com/watch?v=hhNkXFIhmZ8&t=63s
- Hackathon submission PR: https://github.com/xerpa-ai/xagt-plugin/pull/7
- Participant ID: `2055715141135110144`

## One-Liner

Rebel BJJ is an OKX wallet-integrated BJJ training platform for private training logs, Solana milestone proofs, and coach-certified belt promotion moments.

## Current State

- React + Vite frontend is implemented in `src/`.
- Rust + Anchor Solana program elements live in `anchor/`.
- Auxiliary Rust/backend demo code lives in `backend/`, `api/`, and `rust-api/`.
- OKX wallet login button is implemented in the wallet identity panel.
- OKX login uses the browser extension injected provider: `window.okxwallet.solana.connect()`.
- Phantom is still used for the existing Solana Devnet milestone proof signing flow.
- Training milestones, coach verification messaging, README, demo video link, GitHub push, Vercel deployment, and XAgent submission PR are complete.

## Important Behavior

- In the Codex in-app browser, the OKX Chrome extension is not available, so OKX login will not pop the extension there.
- To test OKX wallet login, open the live site or `http://127.0.0.1:5173/` in Google Chrome with the OKX Wallet extension installed.
- If OKX is not detected, the app shows a browser-extension warning instead of staying stuck on "connecting".
- Milestone Devnet proof claims still require Phantom because the existing proof transaction signer uses Phantom.

## Local Commands

```bash
npm install
npm run dev
npm run build
```

## Deployment

The Vercel project is already linked and deployed.

```bash
npx vercel --prod --yes
```

Production alias:

```text
https://phantom-thief-s-mat-main.vercel.app/
```

## Migration Checklist For A New Account

1. Clone or open `https://github.com/kathyyxu/rebelbjj`.
2. Read `README.md` and this `HANDOFF.md`.
3. Run `npm install` and `npm run build`.
4. Log in again to GitHub/Vercel if the new environment needs push or deploy access.
5. Use Chrome, not the Codex in-app browser, when testing OKX extension login.
6. Continue from the current `main` branch unless a newer branch is created.

## Suggested Next Work

- Add a clearer OKX/Phantom explanation inside the wallet panel for judges.
- Decide whether to extend Devnet proof signing to OKX, or keep Phantom as the proof signer for the hackathon demo.
- Add screenshots or a short GIF to the GitHub README if there is time.
- Clean up package dependencies if OKX universal-provider is no longer needed.
