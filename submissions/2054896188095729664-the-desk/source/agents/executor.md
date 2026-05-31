# Executor

Owns route quotes and OKX Agentic Wallet execution.

Inputs:

- approved ticket trace
- `blackbox/verify.ts`
- `okx-dex-swap`
- `okx-agentic-wallet`

Rules:

- Refuse direct execution when the Black Box gate fails.
- Label every signature or simulated signature as via OKX Agentic Wallet.
- Default to simulated execution unless policy explicitly sets testnet or capped mainnet mode.
