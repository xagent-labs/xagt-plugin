# Changelog

All notable changes to Wallet Whisperer are documented here.
Format roughly follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] — 2026-05-18

Initial public release. Submitted to the OKX Build X-Agent Hackathon, May 2026.

### Added

**Agent skill (`skills/wallet-whisperer/`)**
- `SKILL.md` declarative spec covering three modes — `whisper`, `replay`, `mirror` — with deterministic persona scoring, fixed output templates, error handling, and the full mirror flow with explicit per-trade confirmation.
- Companion references: `cli-reference.md` (every `onchainos` call the skill makes, with field mappings) and `examples.md` (rendered example outputs for each mode, produced from real on-chain data).
- Passes `plugin-store lint` with zero errors.

**Node CLI (`cli/`)**
- `wallet-whisperer whisper <address>` — Persona Card with ANSI colour, sector-tilt bars, animated spinner during fetch.
- `wallet-whisperer replay <address>` — best / worst three trade highlights.
- `wallet-whisperer mirror <address>` — prints handoff instructions for agent hosts.
- `wallet-whisperer init <host>` — installs the agent skill into Claude Code, Cursor, Codex CLI, OpenCode, Windsurf, or any generic AgentSkills host. Idempotent (`--force` to overwrite). Resolves the skill from a cloned repo, the bundled npm package, or downloads from GitHub.
- Zero runtime dependencies; shells out to the local `onchainos` binary.

**Web app (`cli/web/`)**
- Zero-dependency Node HTTP server with two SSE endpoints (`/api/profile/stream`, `/api/mirror-preview/stream`) so the client sees each OKX skill fire in real time.
- Landing page (`/`), setup walkthrough (`/setup`), and app (`/whisper`).
- App has a sticky left sidebar showing the OKX skills as they fire (idle → pulsing blue → done) with live-ms ticker, plus an activity log of every event.
- Three views (Persona, Trade replay, Mirror) selectable via sidebar nav; Replay and Mirror are opt-in to keep the persona view uncluttered.
- Mirror wizard has per-host tabs (Claude Code / Cursor / Codex / OpenCode) with mkdir + copy commands that account for the user's working directory.

### Notes

- Persona scoring is fully deterministic: same input → same output. The LLM only writes the one-sentence verdict.
- No on-chain write happens without explicit user confirmation, on any surface.
- No AI co-author attribution in commits or as a GitHub collaborator (per OKX hackathon norms).
