#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

BASE_URL="${SANDBOXED_SH_DEV_URL:-}"
TOKEN="${SANDBOXED_SH_TOKEN:-}"
WORKSPACE_ID="${SANDBOXED_SH_WORKSPACE_ID:-}"
PROXY_SECRET="${SANDBOXED_PROXY_SECRET:-}"
PROXY_MODEL="builtin/smart"
TIMEOUT="180"

SKIP_PROXY=0
SKIP_MISSION=0
NON_STREAMING=0
ALLOW_NO_THINKING=0
ALLOW_MISSING_MODEL=0
VERBOSE=0

BACKENDS=()
MODEL_OVERRIDES=()
EXPECT_MODELS=()

usage() {
  cat <<USAGE
Usage:
  scripts/smoke_harnesses_dev.sh [options]

Runs two smoke suites against a dev deployment:
1) OpenAI-compatible proxy smoke (/v1/models + /v1/chat/completions)
2) Mission streaming smoke (claudecode/opencode/codex by default)

Options:
  --base-url URL             Backend base URL (env: SANDBOXED_SH_DEV_URL)
  --token TOKEN              Control API bearer token (env: SANDBOXED_SH_TOKEN)
  --workspace-id UUID        Workspace ID for mission smoke (env: SANDBOXED_SH_WORKSPACE_ID)
  --proxy-secret TOKEN       Proxy bearer token (env: SANDBOXED_PROXY_SECRET)
  --proxy-model MODEL        Proxy model/chain to test (default: builtin/smart)
  --backend ID               Backend to test (repeatable)
  --model-override B=M       Backend model override (repeatable, e.g. opencode=builtin/smart)
  --expect-model B=S         Expect resolved model substring (repeatable, e.g. opencode=glm-5)
  --timeout SECONDS          Mission timeout per backend (default: 180)
  --non-streaming            Include non-streaming proxy test
  --allow-no-thinking        Mission smoke: do not require thinking events
  --allow-missing-model      Mission smoke: do not require assistant model metadata
  --skip-proxy               Skip proxy smoke
  --skip-mission             Skip mission smoke
  --verbose                  Verbose event/chunk output
  -h, --help                 Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --token)
      TOKEN="${2:-}"
      shift 2
      ;;
    --workspace-id)
      WORKSPACE_ID="${2:-}"
      shift 2
      ;;
    --proxy-secret)
      PROXY_SECRET="${2:-}"
      shift 2
      ;;
    --proxy-model)
      PROXY_MODEL="${2:-}"
      shift 2
      ;;
    --backend)
      BACKENDS+=("${2:-}")
      shift 2
      ;;
    --model-override)
      MODEL_OVERRIDES+=("${2:-}")
      shift 2
      ;;
    --expect-model)
      EXPECT_MODELS+=("${2:-}")
      shift 2
      ;;
    --timeout)
      TIMEOUT="${2:-}"
      shift 2
      ;;
    --non-streaming)
      NON_STREAMING=1
      shift
      ;;
    --allow-no-thinking)
      ALLOW_NO_THINKING=1
      shift
      ;;
    --allow-missing-model)
      ALLOW_MISSING_MODEL=1
      shift
      ;;
    --skip-proxy)
      SKIP_PROXY=1
      shift
      ;;
    --skip-mission)
      SKIP_MISSION=1
      shift
      ;;
    --verbose)
      VERBOSE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$SKIP_PROXY" -eq 1 && "$SKIP_MISSION" -eq 1 ]]; then
  echo "Nothing to run: both --skip-proxy and --skip-mission are set." >&2
  exit 1
fi

if [[ -z "$BASE_URL" ]]; then
  echo "Missing --base-url or SANDBOXED_SH_DEV_URL" >&2
  exit 1
fi

if [[ "$SKIP_PROXY" -eq 0 ]]; then
  if [[ -z "$PROXY_SECRET" ]]; then
    echo "Missing --proxy-secret or SANDBOXED_PROXY_SECRET" >&2
    exit 1
  fi

  proxy_cmd=(
    python3 "$ROOT_DIR/scripts/proxy_smoke.py"
    --base-url "$BASE_URL"
    --proxy-secret "$PROXY_SECRET"
    --model "$PROXY_MODEL"
    --timeout "$TIMEOUT"
  )
  [[ "$NON_STREAMING" -eq 1 ]] && proxy_cmd+=(--non-streaming)
  [[ "$VERBOSE" -eq 1 ]] && proxy_cmd+=(--verbose)

  echo ""
  echo "== Running proxy smoke =="
  "${proxy_cmd[@]}"
fi

if [[ "$SKIP_MISSION" -eq 0 ]]; then
  if [[ -z "$TOKEN" ]]; then
    echo "Missing --token or SANDBOXED_SH_TOKEN" >&2
    exit 1
  fi
  if [[ -z "$WORKSPACE_ID" ]]; then
    echo "Missing --workspace-id or SANDBOXED_SH_WORKSPACE_ID" >&2
    exit 1
  fi

  mission_cmd=(
    python3 "$ROOT_DIR/scripts/mission_stream_smoke.py"
    --base-url "$BASE_URL"
    --token "$TOKEN"
    --workspace-id "$WORKSPACE_ID"
    --timeout "$TIMEOUT"
  )

  for backend in "${BACKENDS[@]}"; do
    mission_cmd+=(--backend "$backend")
  done
  for override in "${MODEL_OVERRIDES[@]}"; do
    mission_cmd+=(--model-override "$override")
  done
  for expected in "${EXPECT_MODELS[@]}"; do
    mission_cmd+=(--expect-model "$expected")
  done

  [[ "$ALLOW_NO_THINKING" -eq 1 ]] && mission_cmd+=(--allow-no-thinking)
  [[ "$ALLOW_MISSING_MODEL" -eq 1 ]] && mission_cmd+=(--allow-missing-model)
  [[ "$VERBOSE" -eq 1 ]] && mission_cmd+=(--verbose)

  echo ""
  echo "== Running mission stream smoke =="
  "${mission_cmd[@]}"
fi

echo ""
echo "Smoke suites completed successfully."
