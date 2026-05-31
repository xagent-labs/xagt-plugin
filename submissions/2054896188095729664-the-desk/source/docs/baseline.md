# Baseline Snapshot

Date: 2026-05-17

This directory is not a git repository, so G1 could not create the best-effort `v0-baseline` tag and did not run `git init`.

Baseline working prototype state:

- Stack: Vite + TypeScript + React 19 frontend in `web/`, Node-side TypeScript in `src/`, local API and Vite launcher in `scripts/dev-app.mjs`.
- Package workflow: `npm install`, `npm run app`, `npm run demo`, `npm test`, `npm run submit:check`, `npm run blackbox:verify-chain`, `npm run xagt:doctor`, and `npm run okx:install:skills`.
- Demo artifacts: canonical trace in `blackbox/events.jsonl`, replay in `demo/replay.md`, digest in `digest/latest.md`, dashboard data in `web/public/data/`, and scanner evidence in `docs/evidence/opportunity-scan.md`.
- Execution posture: fixture-backed by default, no mainnet broadcast in the G1/G2 sprint scope, X Layer anchor remains optional testnet / cached evidence.
- Product framing baseline: README now leads with The Desk and moves the Black Box details into a later trust-layer section.
