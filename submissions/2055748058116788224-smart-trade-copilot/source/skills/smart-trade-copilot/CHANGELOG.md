# Changelog

## 1.0.0 — 2026-05-17

Initial release for the Build X-Agent Hackathon (OKX Web3).

- Multi-stage "should I buy this token?" decision pipeline (security → fundamentals →
  holder clusters → smart-money signals → meme/launchpad → DeFi context → verdict).
- Deterministic BUY / CAUTION / AVOID verdict logic with a non-overridable security gate.
- Confirmation-gated swap execution through the OKX Agentic Wallet, with MEV-protection
  threshold rules and full error-handling.
- Checksum-pinned `onchainos` pre-flight.
- Orchestrates the OKX `onchainos` skill suite: `security`, `token`, `market`, `signal`,
  `memepump`, `defi`, `portfolio`, `swap`, `wallet`.
