#!/bin/sh
set -e

# Two ways to provide the demo onchainos session at boot:
#
#   1. ONCHAINOS_SESSION_B64 env var (recommended on Render)
#      Base64-encoded gzipped tar of ~/.onchainos. Pasting binary into the
#      Render dashboard's "Secret Files" textarea silently corrupts it, but
#      a base64 string in an env var survives intact.
#
#   2. /etc/secrets/onchainos-session.tar.gz  (Render Secret File, UPLOADED
#      via the file picker — NOT pasted into the textarea)
#
# Either populates $HOME/.onchainos so the web server can authenticate to the
# OKX Market API without an interactive login. If neither is present, the
# server still starts but every API call will fail with NOT_LOGGED_IN.

SESSION_TAR_FILE="/etc/secrets/onchainos-session.tar.gz"
TARGET="$HOME/.onchainos"
TMP_TAR=""

extract_tar () {
  src="$1"
  mkdir -p "$TARGET"
  # Try with --strip-components first (matches tarball with .onchainos/ prefix).
  # If that fails, extract directly into $HOME.
  if ! tar -xzf "$src" -C "$TARGET" --strip-components=1 2>/dev/null; then
    tar -xzf "$src" -C "$HOME"
  fi
  chmod 700 "$TARGET"
  [ -f "$TARGET/keyring.enc" ]      && chmod 600 "$TARGET/keyring.enc"
  [ -f "$TARGET/machine-identity" ] && chmod 600 "$TARGET/machine-identity"
}

if [ -n "$ONCHAINOS_SESSION_B64" ]; then
  echo "[entrypoint] Loading onchainos session from ONCHAINOS_SESSION_B64 env var"
  TMP_TAR=$(mktemp)
  # tr -d ' \n' makes us tolerant of accidental whitespace in the env value.
  printf '%s' "$ONCHAINOS_SESSION_B64" | tr -d ' \n' | base64 -d > "$TMP_TAR" || {
    echo "[entrypoint] ERROR: ONCHAINOS_SESSION_B64 is not valid base64"
    rm -f "$TMP_TAR"; exit 2;
  }
  extract_tar "$TMP_TAR"
  rm -f "$TMP_TAR"
  echo "[entrypoint] session installed: $(ls $TARGET | wc -l) files"
elif [ -f "$SESSION_TAR_FILE" ]; then
  echo "[entrypoint] Mounting onchainos session from $SESSION_TAR_FILE"
  extract_tar "$SESSION_TAR_FILE"
  echo "[entrypoint] session installed: $(ls $TARGET | wc -l) files"
else
  echo "[entrypoint] WARNING: no session provided — set ONCHAINOS_SESSION_B64 env var or upload Secret File"
fi

exec "$@"
