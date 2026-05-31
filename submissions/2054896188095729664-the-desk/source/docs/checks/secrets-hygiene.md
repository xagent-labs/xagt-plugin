# Secrets Hygiene

Inspection date: 2026-05-17

- `.env.example` now documents the sprint blocking, stretch, and forbidden environment variables without secret values.
- The actual `.env` file was not read or modified in this task.
- No new dependencies were installed.
- Recommendation: run `gitleaks detect` before submission from an environment where gitleaks is already installed, or add it in a later approved gate. It was not installed during G1/G2.
- Forbidden state remains: no OKX key with withdraw permission, no real funds, no mainnet broadcast, and `LIVE_BROADCAST_CONFIRM` left empty.
