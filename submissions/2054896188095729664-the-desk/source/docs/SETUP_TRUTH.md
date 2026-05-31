# Setup Truth

Last checked: 2026-05-14.

## X-Agent

`npx @xagt/agent-plugin@latest setup --target all` completed successfully.

Registered participant:

```text
2054896188095729664
```

`npx @xagt/agent-plugin@latest doctor` returned:

```text
Node: 22.5.1
npm: 10.8.2
HOME: /Users/leonliu
Backend: https://api.xerpaai.com
Frontend: https://www.xerpaai.com
Login: 2054896188095729664 (729d remaining)
```

Installed XAgent setup skills for Cursor project, Claude Code user, Codex CLI user, OpenCode user, and AgentSkills-compatible user paths.

## OKX Skills

XAgent setup installed all 21 `okx/onchainos-skills` skills into the project, including:

- `okx-agentic-wallet`
- `okx-audit-log`
- `okx-defi-invest`
- `okx-dex-signal`
- `okx-dex-swap`
- `okx-dex-token`
- `okx-dex-trenches`
- `okx-security`
- `okx-wallet-portfolio`

It also installed `plugin-store`. `skills-lock.json` pins the full installed set.

Restore command:

```bash
npm run okx:install:skills
```

The runtime adapter in `src/okx/skill-adapter.ts` maps canonical OKX skills to the desk flow and falls back to deterministic fixtures when live OKX/OnchainOS credentials, quota, region, or binaries are unavailable.
