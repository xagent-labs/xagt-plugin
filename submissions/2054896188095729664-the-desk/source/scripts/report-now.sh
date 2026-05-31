#!/usr/bin/env bash
set -euo pipefail

npm run replay > demo/replay.md
printf 'Replay refreshed at demo/replay.md\n'
