#!/bin/bash
#
# Sandboxed.sh Production Deployment Script
# Usage: ./scripts/deploy.sh [version]
# Example: ./scripts/deploy.sh v0.7.8
#

set -e

VERSION=${1:-v0.7.8}
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${REPO_DIR}/logs"
PID_FILE="${REPO_DIR}/sandboxed.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create logs directory
mkdir -p "${LOG_DIR}"

log_info "Starting deployment of sandboxed.sh ${VERSION}"

# Check if git repo
if [ ! -d "${REPO_DIR}/.git" ]; then
    log_error "Not a git repository: ${REPO_DIR}"
    exit 1
fi

# Change to repo directory
cd "${REPO_DIR}"

# Fetch latest changes
log_info "Fetching latest changes..."
git fetch origin

# Checkout version
log_info "Checking out ${VERSION}..."
git checkout "${VERSION}"

# Check if cargo is available
if ! command -v cargo &> /dev/null; then
    log_error "cargo not found. Please install Rust: https://rustup.rs/"
    exit 1
fi

# Build release
log_info "Building release version (this may take a few minutes)..."
cargo build --release

if [ $? -ne 0 ]; then
    log_error "Build failed"
    exit 1
fi

# Stop current instance if running
if [ -f "${PID_FILE}" ]; then
    OLD_PID=$(cat "${PID_FILE}")
    if ps -p "${OLD_PID}" > /dev/null 2>&1; then
        log_info "Stopping old instance (PID: ${OLD_PID})..."
        kill "${OLD_PID}"

        # Wait for graceful shutdown (max 10 seconds)
        for i in {1..10}; do
            if ! ps -p "${OLD_PID}" > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done

        # Force kill if still running
        if ps -p "${OLD_PID}" > /dev/null 2>&1; then
            log_warn "Force killing old instance..."
            kill -9 "${OLD_PID}"
        fi
    fi
fi

# Start new instance with nohup
LOG_FILE="${LOG_DIR}/sandboxed_$(date +%Y%m%d_%H%M%S).log"
log_info "Starting new instance with nohup..."
log_info "Logs: ${LOG_FILE}"

nohup "${REPO_DIR}/target/release/sandboxed_sh" > "${LOG_FILE}" 2>&1 &
NEW_PID=$!

# Save PID
echo "${NEW_PID}" > "${PID_FILE}"

# Wait a moment and verify it's running
sleep 2

if ps -p "${NEW_PID}" > /dev/null 2>&1; then
    log_info "✅ Deployment successful!"
    log_info "Process ID: ${NEW_PID}"
    log_info "Version: ${VERSION}"
    log_info "Log file: ${LOG_FILE}"
    echo ""
    log_info "Check logs with: tail -f ${LOG_FILE}"
    log_info "Stop with: kill ${NEW_PID}"
else
    log_error "Process failed to start. Check logs: ${LOG_FILE}"
    exit 1
fi

# Display recent logs
echo ""
log_info "Recent logs:"
echo "─────────────────────────────────────────────────────────"
tail -n 20 "${LOG_FILE}"
echo "─────────────────────────────────────────────────────────"

exit 0
