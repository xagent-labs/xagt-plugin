#!/usr/bin/env bash
set -euo pipefail

SESSION="${AGENT_TMUX_SESSION:-x-agent-hackathon}"
WINDOW="${AGENT_TMUX_WINDOW:-codex}"
LINES="${1:-240}"

TARGET="$SESSION:$WINDOW.0"
if ! tmux has-session -t "$SESSION" 2>/dev/null || ! tmux list-windows -t "$SESSION" -F '#{window_name}' | grep -qx "$WINDOW"; then
  echo "Codex window not found: $SESSION:$WINDOW" >&2
  exit 1
fi

tmux capture-pane -t "$TARGET" -p -S "-$LINES"
