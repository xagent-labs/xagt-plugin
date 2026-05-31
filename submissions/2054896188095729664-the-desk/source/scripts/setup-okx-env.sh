#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$repo_root/.env"

printf "This writes OKX credentials to %s, which is ignored by git.\\n" "$env_file"
printf "Use a newly rotated key. Do not reuse credentials pasted into chat.\\n\\n"

read -r -s -p "OKX API key: " okx_api_key
printf "\n"
read -r -s -p "OKX secret key: " okx_secret_key
printf "\\n"
read -r -s -p "OKX API passphrase: " okx_api_passphrase
printf "\\n"

umask 077
cat > "$env_file" <<ENV
OKX_API_KEY=$okx_api_key
OKX_SECRET_KEY=$okx_secret_key
OKX_API_PASSPHRASE=$okx_api_passphrase
OKX_PASSPHRASE=$okx_api_passphrase
ENV

printf "\\nWrote %s with restricted permissions.\\n" "$env_file"
