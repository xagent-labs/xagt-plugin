# Claude Code Review Brief

You are Claude Code acting as product/architecture lead for this hackathon repo.

Repo:

```text
/Users/leonliu/Documents/Codex/2026-05-14/X agent hackathon
```

Current product:

Agentic Wallet Ops Center, with The Desk as the first app. The core claim is that agents scan live OKX opportunity surfaces and propose wallet actions, but the Black Box must prove policy, risk, sizing, quote, confirmation, and trace-integrity gates before any OKX Agentic Wallet signing path is allowed. Default execution is simulated.

Your job is not to implement a new sprint yet. Your job is to run a rigorous review, task Codex with an independent audit, synthesize product and UX findings, and produce a deep research prompt that will be used for competitive landscape and sprint planning.

## Safety Rules

- Do not print, inspect, transmit, or summarize `.env` contents.
- Do not ask Codex to print secrets.
- Do not run real mainnet execution.
- Keep live OKX interactions read-only unless the repo already routes them through simulated/testnet-safe code.
- Do not rewrite large chunks of code during this review unless a blocker prevents the review itself.

## Phase 1: Repo Review

Inspect the repo deeply enough to understand the product and implementation:

- `README.md`
- `package.json`
- `src/opportunity-scanner.ts`
- `src/blackbox-core.ts`
- `src/orchestrator.ts`
- `web/src/main.tsx`
- `web/src/styles.css`
- `blackbox/policies.json`
- `docs/evidence/*`
- `CLAUDE.md`

Run:

```bash
npm run submit:check
```

If a check fails, capture the exact failure and decide whether it is review-blocking or just a finding.

## Phase 2: Task Codex With Independent Audit

Ask Codex for an independent audit using the prepared prompt:

```bash
scripts/tmux-send-codex.sh "$(cat docs/prompts/CODEX_AUDIT_PROMPT.md)"
```

Give Codex time to respond. Capture its output:

```bash
scripts/tmux-capture-codex.sh 400 > docs/reviews/CODEX_AUDIT_CAPTURE.md
```

If Codex output is still in progress, wait and capture again. Do not treat an incomplete answer as final.

## Phase 3: Product, Architecture, And UX Review

Write:

```text
docs/reviews/CLAUDE_REPO_UX_REVIEW.md
```

Required sections:

1. Executive verdict: is this currently a hackathon demo, prototype, or production-grade product?
2. Product thesis: what is strong, what is unclear, what should be cut.
3. Architecture map: scanner, Black Box, policy, UI, local API, OKX evidence, execution modes.
4. Hard risks: security, correctness, privacy/secrets, live data reliability, wallet execution claims.
5. UX review: first 10 seconds, scanner workflow, ticket review, modals, policy editing, empty/loading/error states, mobile/narrow viewport, judge demo clarity.
6. Competitive differentiation: what makes this meaningfully different from token scanners, wallets, copy-trading bots, and dashboards.
7. Top 15 prioritized improvements with severity, user impact, implementation complexity, and suggested owner: Claude, Codex, or research.
8. Codex audit synthesis: where you agree, disagree, or need further verification.
9. Recommended next sprint theme.

Use concrete file references where possible. Be blunt and practical.

## Phase 4: Architecture Decision Context

Update or create:

```text
docs/ARCHITECTURE_DECISION_CONTEXT.md
```

Include:

- Decisions already made.
- Invariants that should not be broken.
- Open decisions before the next sprint.
- Suggested review gates for Claude Code and Codex.

## Phase 5: Deep Research Prompt

Produce:

```text
docs/prompts/DEEP_RESEARCH_COMPETITIVE_LANDSCAPE_PROMPT.md
```

This prompt must be ready for the user to paste into Claude Deep Research. It should ask for current research on:

- Agentic trading terminals.
- Crypto token scanners and DEX intelligence tools.
- Wallet automation, smart wallet, account abstraction, policy-gated signing, and transaction simulation products.
- Copy-trading and smart-money alert products.
- Institutional trading/risk terminals as UX analogs.
- User pain points in trusting agentic wallet actions.
- Gaps this project can exploit in 48-72 hours.

The output requested from Deep Research should include a competitive matrix, pain-point taxonomy, wedge opportunities, judge/investor narrative, and a concrete sprint recommendation.

## Phase 6: Stop Point

After producing the review files and deep research prompt, stop. Do not implement the sprint plan yet. The user will feed the prompt into Deep Research and then ask you to convert the research into a milestone-based production plan for Codex `/goal`.

