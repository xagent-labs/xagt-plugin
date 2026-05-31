# Submission: submit: 2054407797725990912

- **Original PR**: [xagent-labs/xagt-plugin#4](https://github.com/xagent-labs/xagt-plugin/pull/4)
- **State**: OPEN
- **Author**: @Th0rgal
- **Participant ID**: `2054407797725990912`
- **Submitted**: 2026-05-14T03:24:26Z
- **Fork branch**: `Th0rgal/xagt-plugin` head `65b44ccf3e5a`
- **Project repo**: https://github.com/Th0rgal/sandboxed.sh
- **Source clone**: cloned from https://github.com/Th0rgal/sandboxed.sh
- **LICENSE**: no LICENSE file in upstream repo — original author retains rights

## Layout

- `pr-submission/` — files added to `xagent-labs/xagt-plugin` by the original PR (canonical hackathon README + assets)
- `source/` — shallow clone of the project repo at archive time

## Redactions

- `source/src/api/ai_providers.rs:251` — `GOOGLE_CLIENT_SECRET` literal scrubbed to satisfy GitHub secret-scanning push protection. The value is a public well-known Gemini CLI constant; see upstream repo for the live value.

## Original PR body (verbatim)

```
Submission for Build with XAgent x OKX.

Project: sandboxed.sh
Repo: https://github.com/Th0rgal/sandboxed.sh
Featured hackathon work: https://github.com/Th0rgal/sandboxed.sh/pull/431

One-liner: sandboxed.sh is the safe runtime for autonomous on-chain AI agents.

Why it fits: this is an existing shipped product with a focused read-only OKX security integration. The OKX skill runs inside isolated sandboxed.sh mission workspaces so autonomous agents can produce token, dApp, transaction, signature, and approval risk reports without signing, broadcasting, or exposing wallet secrets.

```
