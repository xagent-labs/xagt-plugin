# Execution Modes

Agentic Wallet Ops Center separates product review, live evidence, unsigned transaction construction, testnet signing, and capped mainnet execution.

| Mode | Description | Broadcasts funds |
| --- | --- | --- |
| `fixture` | Deterministic review path. Uses seeded candidates, seeded risk verdicts, seeded quote, and simulated OKX Agentic Wallet signature. | No |
| `live-read` | Attempts live read-only OKX/OnchainOS surfaces, then falls back to fixtures if unavailable. | No |
| `calldata` | Intended for quote and unsigned transaction preview. Broadcast remains disabled. | No |
| `xlayer-testnet` | Intended for a future X Layer testnet signing path. | No mainnet funds |
| `mainnet-capped` | Explicitly capped real-funds mode. Requires human confirmation and policy cap. | Disabled by default |

Default policy is `fixture`. The required hackathon demo does not use mainnet funds.

Executor behavior is constrained by two gates:

- Trace integrity must pass when `requiresTraceIntegrity` is true.
- Policy gate must pass for risk, allocation, route, chain, slippage, confirmation, and real-funds cap.
