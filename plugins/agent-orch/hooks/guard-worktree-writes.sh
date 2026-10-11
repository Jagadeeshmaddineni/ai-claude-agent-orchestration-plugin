#!/usr/bin/env bash
# Hook: PreToolUse (Write | Edit | MultiEdit | NotebookEdit | Bash)
# Purpose: HARD-BLOCK any file write that lands in the PRIMARY repo tree while a
#          worktree-mode /make session is active. Mechanical enforcement layer
#          behind plugins/agent-orch/rules/worktree-context.md.
#
# This is a thin wrapper: all logic lives in guard-worktree-writes.py so the
# JSON parsing and path-containment checks are robust (no bash quoting traps).
# Fails OPEN (exit 0) when python3 is unavailable so it never wedges a host.
#
# Exit codes: 0 = allow, 2 = block (stderr feedback surfaced to the agent).

set -uo pipefail

if ! command -v python3 >/dev/null 2>&1; then
    # Degrade to the pre-existing instruction-only behaviour on hosts without
    # python3 rather than blocking everything.
    cat >/dev/null
    exit 0
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "${DIR}/guard-worktree-writes.py"
