# OKX Skills State

Inspection date: 2026-05-17

Source checked: `.agents/skills/*/SKILL.md`. No skill files were modified.

## Present OKX Skill Directories

- `okx-a2a-payment`
- `okx-agent-payments-protocol`
- `okx-agentic-wallet`
- `okx-audit-log`
- `okx-dapp-discovery`
- `okx-defi-invest`
- `okx-defi-portfolio`
- `okx-dex-bridge`
- `okx-dex-market`
- `okx-dex-signal`
- `okx-dex-strategy`
- `okx-dex-swap`
- `okx-dex-token`
- `okx-dex-trenches`
- `okx-dex-ws`
- `okx-growth-competition`
- `okx-how-to-play`
- `okx-onchain-gateway`
- `okx-security`
- `okx-wallet-portfolio`
- `okx-x402-payment`

## Startup-Invalid SKILL.md Files

Codex startup exposed 20 local OKX skills and omitted these 6 local OKX / plugin-store skill files, matching the startup report that 6 skill files were invalid:

- `.agents/skills/okx-agent-payments-protocol/SKILL.md`
- `.agents/skills/okx-dapp-discovery/SKILL.md`
- `.agents/skills/okx-defi-invest/SKILL.md`
- `.agents/skills/okx-dex-market/SKILL.md`
- `.agents/skills/okx-dex-swap/SKILL.md`
- `.agents/skills/plugin-store/SKILL.md`

Observed pattern: all six files exist and contain frontmatter, but they were not made available to Codex as usable skills in this session. This task only reports the state; it does not repair or rewrite the skill files.

## README Required Skill List

README includes the required hackathon skill names:

- `okx-dex-signal`
- `okx-dex-trenches`
- `okx-security`
- `okx-dex-swap`
- `okx-wallet-portfolio`
