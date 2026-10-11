#!/usr/bin/env bash
# Hook: TeammateIdle
# Purpose: Verify teammate completed all assigned tasks before going idle
# Exit 0 = allow idle, Exit 2 = send feedback and keep working

set -euo pipefail

TEAMMATE_NAME="${1:-unknown}"

# Look for status files in common locations
STATUS_FILES=(
    "ssnc-agent-orch/*/STATUS.md"
    ".specify/specs/*/status.md"
)

found_status=false
incomplete_tasks=()

for pattern in "${STATUS_FILES[@]}"; do
    for status_file in $pattern; do
        [ -f "$status_file" ] || continue
        found_status=true

        # Check for incomplete tasks assigned to this teammate
        while IFS= read -r line; do
            if echo "$line" | grep -qi "\- \[ \].*${TEAMMATE_NAME}"; then
                incomplete_tasks+=("$line")
            fi
        done < "$status_file"
    done
done

if [ "$found_status" = false ]; then
    # No status file found - allow idle (might be initial setup)
    exit 0
fi

if [ ${#incomplete_tasks[@]} -gt 0 ]; then
    echo "Teammate ${TEAMMATE_NAME} has ${#incomplete_tasks[@]} incomplete tasks:"
    for task in "${incomplete_tasks[@]}"; do
        echo "  $task"
    done
    echo ""
    echo "Please complete all assigned tasks before going idle."
    exit 2
fi

# All tasks complete - allow idle
exit 0
