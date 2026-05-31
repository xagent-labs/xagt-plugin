#!/usr/bin/env bash
set -euo pipefail

SESSION="${AGENT_TMUX_SESSION:-x-agent-hackathon}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DETACH="${AGENT_TMUX_DETACH:-0}"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  if [[ "$DETACH" == "1" ]]; then
    echo "tmux session already running: $SESSION"
    echo "attach with: tmux attach -t $SESSION"
    exit 0
  fi
  tmux attach-session -t "$SESSION"
  exit 0
fi

tmux new-session -d -s "$SESSION" -n agents -c "$PROJECT_DIR"
tmux rename-window -t "$SESSION:agents" claude
tmux send-keys -t "$SESSION:claude.0" "cd '$PROJECT_DIR' && claude" C-m

tmux new-window -t "$SESSION" -n codex -c "$PROJECT_DIR"
tmux send-keys -t "$SESSION:codex.0" "cd '$PROJECT_DIR' && codex" C-m

tmux new-window -t "$SESSION" -n control -c "$PROJECT_DIR"
tmux send-keys -t "$SESSION:control.0" "cd '$PROJECT_DIR' && printf 'Agent tmux session ready.\\n\\nWindows:\\n  1 claude  - Claude Code\\n  2 codex   - Codex CLI\\n  3 control - shell helpers\\n\\nClaude can message Codex with:\\n  scripts/tmux-send-codex.sh \"message\"\\n\\nClaude can read Codex with:\\n  scripts/tmux-capture-codex.sh\\n\\nAttach from another terminal with:\\n  tmux attach -t $SESSION\\n\\n' && exec \"\$SHELL\"" C-m

tmux select-window -t "$SESSION:claude"

if [[ "$DETACH" == "1" ]]; then
  echo "tmux session started: $SESSION"
  echo "attach with: tmux attach -t $SESSION"
  exit 0
fi

tmux attach-session -t "$SESSION"
