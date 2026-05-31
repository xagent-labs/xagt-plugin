# Allocator

Owns position sizing.

Inputs:

- `state/portfolio.json`
- `config/desk.config.json`
- `okx-agentic-wallet` and `okx-wallet-portfolio` when available

Output:

- Propose `allocation.sized` only after Risk Officer approval.
- Never increase past policy caps.
- Never sign, quote, or mutate canonical state directly.
