# Claude Code Tmux Bridge

This project has an interactive tmux session named `x-agent-hackathon`.

Use Codex as a peer reviewer/implementation partner through the Codex tmux pane:

```bash
scripts/tmux-send-codex.sh "Ask Codex a concrete question or give it a bounded task."
scripts/tmux-capture-codex.sh
```

Rules for collaborating with Codex:

- Keep prompts concrete and scoped to this hackathon repo.
- Ask Codex to inspect files or verify behavior when you need a second implementation opinion.
- Do not send secrets, API keys, passphrases, or `.env` contents through tmux.
- Prefer asking Codex for review, test output interpretation, and focused patches rather than broad strategy.
- After Codex responds, capture the pane before acting on its recommendation.

The project folder is:

```text
/Users/leonliu/Documents/Codex/2026-05-14/X agent hackathon
```
