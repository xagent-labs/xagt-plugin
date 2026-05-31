#!/bin/bash
# Memory monitoring script for sandboxed-sh containers
# Can be run from host or inside container

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to convert bytes to human-readable format
bytes_to_human() {
    local bytes=$1

    # Handle non-numeric or empty input
    if [ -z "$bytes" ] || ! [[ "$bytes" =~ ^[0-9]+$ ]]; then
        echo "N/A"
        return
    fi

    if [ "$bytes" -eq 0 ]; then
        echo "0 B"
    elif [ "$bytes" -lt 1024 ]; then
        echo "${bytes} B"
    elif [ "$bytes" -lt 1048576 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1024}") KB"
    elif [ "$bytes" -lt 1073741824 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1024/1024}") MB"
    else
        echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1024/1024/1024}") GB"
    fi
}

# Check if running on host or in container
if [ -f /.dockerenv ] || [ -f /run/.containerenv ]; then
    echo "Running inside container"
    IN_CONTAINER=true
else
    IN_CONTAINER=false
fi

if [ "$IN_CONTAINER" = true ]; then
    # Inside container: show container's memory view
    echo "=== Container Memory Usage ==="
    echo ""

    # Try to read cgroup v2 memory stats
    if [ -f /sys/fs/cgroup/memory.current ]; then
        CURRENT=$(cat /sys/fs/cgroup/memory.current 2>/dev/null || echo "0")
        LIMIT=$(cat /sys/fs/cgroup/memory.max 2>/dev/null || echo "max")

        echo "Current Memory: $(bytes_to_human $CURRENT)"

        if [ "$LIMIT" = "max" ]; then
            echo -e "${YELLOW}Memory Limit: unlimited${NC}"
        else
            echo "Memory Limit: $(bytes_to_human $LIMIT)"
            PERCENT=$(awk "BEGIN {printf \"%.1f\", ($CURRENT/$LIMIT)*100}")
            if (( $(echo "$PERCENT > 80" | bc -l) )); then
                echo -e "${RED}Usage: ${PERCENT}% (HIGH!)${NC}"
            elif (( $(echo "$PERCENT > 50" | bc -l) )); then
                echo -e "${YELLOW}Usage: ${PERCENT}%${NC}"
            else
                echo -e "${GREEN}Usage: ${PERCENT}%${NC}"
            fi
        fi

        if [ -f /sys/fs/cgroup/memory.peak ]; then
            PEAK=$(cat /sys/fs/cgroup/memory.peak 2>/dev/null || echo "0")
            echo "Peak Memory: $(bytes_to_human $PEAK)"
        fi
    else
        echo "cgroup v2 memory stats not available"
    fi

    echo ""
    echo "=== Process Memory (via ps) ==="
    ps aux --sort=-%mem | head -10
else
    # On host: show all container memory stats
    echo "=== All Container Memory Stats ==="
    echo ""

    # List all running containers
    CONTAINERS=$(machinectl list --no-legend 2>/dev/null | awk '{print $1}' || echo "")

    if [ -z "$CONTAINERS" ]; then
        echo "No containers currently running"
        exit 0
    fi

    printf "%-30s %-15s %-15s %-15s %-10s\n" "CONTAINER" "CURRENT" "PEAK" "LIMIT" "USAGE %"
    printf "%-30s %-15s %-15s %-15s %-10s\n" "----------" "-------" "----" "-----" "--------"

    for container in $CONTAINERS; do
        SCOPE="machine-${container}.scope"

        # Get memory stats from systemd
        STATS=$(systemctl show "$SCOPE" 2>/dev/null | grep -E "^Memory(Current|Peak|Max|Available)=" || echo "")

        if [ -z "$STATS" ]; then
            printf "%-30s %-15s\n" "$container" "Not running"
            continue
        fi

        CURRENT=$(echo "$STATS" | grep "^MemoryCurrent=" | cut -d= -f2)
        PEAK=$(echo "$STATS" | grep "^MemoryPeak=" | cut -d= -f2)
        MAX=$(echo "$STATS" | grep "^MemoryMax=" | cut -d= -f2)

        CURRENT_H=$(bytes_to_human ${CURRENT:-0})
        PEAK_H=$(bytes_to_human ${PEAK:-0})

        if [ "$MAX" = "infinity" ] || [ -z "$MAX" ]; then
            LIMIT_H="unlimited"
            USAGE="N/A"
        else
            LIMIT_H=$(bytes_to_human $MAX)
            USAGE=$(awk "BEGIN {printf \"%.1f\", (${CURRENT:-0}/$MAX)*100}")
        fi

        printf "%-30s %-15s %-15s %-15s %-10s\n" "$container" "$CURRENT_H" "$PEAK_H" "$LIMIT_H" "$USAGE"
    done

    echo ""
    echo "=== System-wide Memory ==="
    free -h

    echo ""
    echo "To see details for a specific container, run:"
    echo "  systemctl show machine-<container-name>.scope | grep Memory"
fi
