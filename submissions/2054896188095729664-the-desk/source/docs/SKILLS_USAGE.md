# OKX Skill Usage

| Desk component | Skill | Installed package | Demo behavior | Live behavior |
| --- | --- | --- | --- | --- |
| Scout | `okx-dex-signal` | `okx/onchainos-skills` | seeded KOL/smart-money signal | `onchainos signal list --chain solana --limit 5` |
| Scout | `okx-dex-trenches` | `okx/onchainos-skills` | seeded fresh-token candidate | `onchainos memepump tokens --chain xlayer --stage NEW` |
| Risk Officer | `okx-security` | `okx/onchainos-skills` | seeded veto/approval verdicts | `onchainos security token-scan --chain <chain> --address <token>` |
| Allocator | `okx-agentic-wallet` / `okx-wallet-portfolio` | `okx/onchainos-skills` | seeded book value | `onchainos wallet status`; portfolio reads for provided addresses |
| Executor | `okx-dex-swap` | `okx/onchainos-skills` | seeded X Layer quote | `onchainos swap quote --chain xlayer --from USDC --to <token> --readable-amount <amount>` |
| Executor | `okx-agentic-wallet` | `okx/onchainos-skills` | simulated signature label | user-confirmed signing / wallet execution path |
| Yield Manager | `okx-defi-invest` | `okx/onchainos-skills` | stub only | discover lend/stake/LP rotations |

The deterministic demo is intentionally reviewable without private credentials. Live mode must preserve the same event types, trace integrity, and verifier gate.

Implementation lives in `src/okx/skill-adapter.ts`. Set `DESK_OKX_MODE=live` to try live command surfaces first. Any missing CLI, credentials, region block, or non-zero command result falls back to deterministic fixtures and records the mode in the Black Box event payload.

Live read-only evidence is generated with:

```bash
npm run okx:canary
```
