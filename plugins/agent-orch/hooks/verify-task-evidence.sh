#!/usr/bin/env bash
# Hook: TaskCompleted
# Purpose: Ensure verification gate evidence exists before marking task complete
# Exit 0 = allow completion, Exit 2 = reject with feedback

set -euo pipefail

TASK_ID="${1:-unknown}"

# Look for status files
STATUS_FILES=(
    "ssnc-agent-orch/*/STATUS.md"
    ".specify/specs/*/status.md"
)

# Prohibited completion language (from verification gate rules)
PROHIBITED_PHRASES=(
    "should work"
    "probably passes"
    "seems to be working"
)

found_evidence=false

for pattern in "${STATUS_FILES[@]}"; do
    for status_file in $pattern; do
        [ -f "$status_file" ] || continue

        # Check for completion marker with evidence
        if grep -q "VERIFIED COMPLETE\|Evidence\|Test Command\|Verification Command" "$status_file"; then
            found_evidence=true
        fi

        # Check for prohibited language
        for phrase in "${PROHIBITED_PHRASES[@]}"; do
            if grep -qi "$phrase" "$status_file"; then
                echo "Verification gate violation: Found prohibited phrase '${phrase}' in ${status_file}"
                echo ""
                echo "Tasks require concrete evidence before completion:"
                echo "  1. Run a verification command"
                echo "  2. Include the actual output"
                echo "  3. Show pass/fail counts and file locations"
                echo ""
                echo "See the Verification Gate section in your agent instructions."
                exit 2
            fi
        done
    done
done

if [ "$found_evidence" = false ]; then
    echo "No verification evidence found for task completion."
    echo ""
    echo "Before marking a task complete, you must:"
    echo "  1. IDENTIFY - What command proves this task is done?"
    echo "  2. RUN - Execute the verification command"
    echo "  3. READ - Check full output and exit codes"
    echo "  4. VERIFY - Does output confirm your claim?"
    echo "  5. EVIDENCE - Include proof in STATUS.md"
    exit 2
fi

# Evidence found - allow completion
exit 0
