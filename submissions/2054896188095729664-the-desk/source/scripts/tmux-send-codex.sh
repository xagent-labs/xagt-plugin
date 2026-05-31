#!/usr/bin/env bash
set -euo pipefail

SESSION="${AGENT_TMUX_SESSION:-x-agent-hackathon}"
WINDOW="${AGENT_TMUX_WINDOW:-codex}"
MESSAGE="${*:-}"

if [[ -z "$MESSAGE" ]]; then
  echo "usage: scripts/tmux-send-codex.sh \"message to Codex\"" >&2
  exit 64
fi

TARGET="$SESSION:$WINDOW.0"
if ! tmux has-session -t "$SESSION" 2>/dev/null || ! tmux list-windows -t "$SESSION" -F '#{window_name}' | grep -qx "$WINDOW"; then
  echo "Codex window not found: $SESSION:$WINDOW" >&2
  exit 1
fi

BUFFER="codex-message-$$"
tmux set-buffer -b "$BUFFER" "$MESSAGE"
tmux paste-buffer -b "$BUFFER" -t "$TARGET"
tmux delete-buffer -b "$BUFFER" 2>/dev/null || true
sleep 0.3
tmux send-keys -t "$TARGET" Enter
