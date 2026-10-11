#!/usr/bin/env bash
# Hook: PreToolUse (Bash)
# Purpose: Validate that git commits from Claude Code include the Co-authored-by trailer
# Exit 0 = allow, Exit 2 = reject with feedback (feedback goes to stderr)
#
# This hook intercepts Bash tool calls that contain "git commit" and ensures
# the commit message includes the required Co-authored-by trailer.

set -uo pipefail

INPUT=$(cat)

# Extract the command using jq when available (correct JSON parser),
# otherwise fall back to a tolerant sed-based extractor that handles
# escaped quotes inside commit messages (e.g. heredocs with \" inside).
extract_command() {
    if command -v jq >/dev/null 2>&1; then
        printf '%s' "$1" | jq -r '.tool_input.command // .command // empty' 2>/dev/null
        return
    fi

    # Fallback: python is available on every Claude Code host we target.
    if command -v python3 >/dev/null 2>&1; then
        printf '%s' "$1" | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
cmd = (data.get("tool_input") or {}).get("command") or data.get("command") or ""
sys.stdout.write(cmd)
' 2>/dev/null
        return
    fi

    # Last-resort fallback: strip to tool_input.command with awk, accepting
    # escaped quotes. Correctness here matters less than not crashing.
    printf '%s' "$1" | awk '
        match($0, /"command"[[:space:]]*:[[:space:]]*"/) {
            s = substr($0, RSTART + RLENGTH)
            out = ""
            i = 1
            n = length(s)
            while (i <= n) {
                c = substr(s, i, 1)
                if (c == "\\" && i < n) {
                    nc = substr(s, i + 1, 1)
                    if (nc == "\"") { out = out "\""; i += 2; continue }
                    if (nc == "\\") { out = out "\\"; i += 2; continue }
                    if (nc == "n")  { out = out "\n"; i += 2; continue }
                    if (nc == "t")  { out = out "\t"; i += 2; continue }
                    out = out nc; i += 2; continue
                }
                if (c == "\"") { print out; exit }
                out = out c; i++
            }
            print out
        }
    '
}


# Extract the harness field from the stdin JSON payload (passed by the
# OpenCode adapter). Empty when invoked by Claude Code's native hook.
extract_harness() {
    if command -v jq >/dev/null 2>&1; then
        printf '%s' "$1" | jq -r '.harness // empty' 2>/dev/null
        return
    fi
    if command -v python3 >/dev/null 2>&1; then
        printf '%s' "$1" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('harness', ''))
except Exception:
    pass
" 2>/dev/null
        return
    fi
    printf ''
}


# Resolve the harness for commit trailer validation. Four-tier fallback:
# 1. Project config: <cwd>/.agent-orch-models.json
# 2. Global config: ~/.config/agent-orch-models.json
# 3. Stdin harness field (passed by the OpenCode adapter)
# 4. Hardcoded default: "claude-code"
# Returns the harness string. Also echoes the resolved config file path
# (empty if none found) on a second line for use by the caller.
resolve_trailer_check() {
    local cwd="$1"
    local stdin_harness="$2"
    local global_cfg="${HOME:-}/.config/agent-orch-models.json"

    for cfg_file in "${cwd}/.agent-orch-models.json" "${global_cfg}"; do
        if [ -f "$cfg_file" ]; then
            if command -v jq >/dev/null 2>&1; then
                local h
                h=$(jq -r '.commit_attribution.harness // empty' "$cfg_file" 2>/dev/null)
                if [ -n "$h" ]; then printf '%s\n%s\n' "$h" "$cfg_file"; return; fi
            elif command -v python3 >/dev/null 2>&1; then
                local h
                h=$(python3 -c "
import json, sys
try:
    cfg = json.load(open(sys.argv[1]))
    h = cfg.get('commit_attribution', {}).get('harness', '')
    print(h)
except Exception:
    pass
" "$cfg_file" 2>/dev/null)
                if [ -n "$h" ]; then printf '%s\n%s\n' "$h" "$cfg_file"; return; fi
            fi
        fi
    done

    # No config found — use stdin harness or hardcoded default.
    if [ -n "$stdin_harness" ]; then
        printf '%s\n\n' "$stdin_harness"
    else
        printf '%s\n\n' "claude-code"
    fi
}

# Read git config user.name for the GitHub username in the trailer.
git_user_name() {
    git -C "$1" config user.name 2>/dev/null | tr -d '\n'
}

# Resolve the model IDs for the commit trailer. When no config exists
# and the harness is claude-code, read ANTHROPIC_DEFAULT_OPUS_MODEL and
# ANTHROPIC_DEFAULT_SONNET_MODEL env vars. Falls back to literal
# opus/sonnet alias names if the env vars are unset.
resolve_default_models() {
    local harness="$1"
    local cfg_file="$2"
    if [ -n "$cfg_file" ] && [ -f "$cfg_file" ]; then
        # Config exists — extract distinct model IDs from the aliases.
        if command -v jq >/dev/null 2>&1; then
            local t i
            t=$(jq -r '.aliases.thinking // empty' "$cfg_file" 2>/dev/null)
            i=$(jq -r '.aliases.instruct // empty' "$cfg_file" 2>/dev/null)
            if [ -n "$t" ] && [ -n "$i" ]; then
                printf '%s,%s' "$t" "$i"
                return
            fi
        elif command -v python3 >/dev/null 2>&1; then
            python3 -c "
import json, sys
try:
    cfg = json.load(open(sys.argv[1]))
    t = cfg.get('aliases', {}).get('thinking', '')
    i = cfg.get('aliases', {}).get('instruct', '')
    if t and i:
        print(f'{t},{i}')
except Exception:
    pass
" "$cfg_file" 2>/dev/null
            return
        fi
    fi
    # No config — use env vars (claude-code) or sentinels.
    if [ "$harness" = "claude-code" ]; then
        local t="${ANTHROPIC_DEFAULT_OPUS_MODEL:-opus}"
        local i="${ANTHROPIC_DEFAULT_SONNET_MODEL:-sonnet}"
        printf '%s,%s' "$t" "$i"
    else
        printf '%s,%s' "thinking" "instruct"
    fi
}

COMMAND=$(extract_command "$INPUT")

# If no command found, or not a git commit, allow through
if [ -z "$COMMAND" ]; then
    exit 0
fi

# Check if this is a git commit command
if ! printf '%s' "$COMMAND" | grep -q "git commit"; then
    exit 0
fi

# Skip if it's git commit --amend (user may be amending their own commit)
# or other non-message commits
if printf '%s' "$COMMAND" | grep -q "\-\-allow-empty-message"; then
    exit 0
fi

# Determine trailer expectation: 4-tier config resolution.
CWD=$(printf '%s' "$INPUT" | { command -v jq >/dev/null 2>&1 && jq -r '.cwd // empty' 2>/dev/null || python3 -c "import json,sys; print(json.load(sys.stdin).get('cwd',''))" 2>/dev/null; })
STDIN_HARNESS=$(extract_harness "$INPUT")
RESOLVED=$(resolve_trailer_check "$CWD" "$STDIN_HARNESS")
CONFIGURED_HARNESS=$(printf '%s' "$RESOLVED" | sed -n '1p')
RESOLVED_CFG_FILE=$(printf '%s' "$RESOLVED" | sed -n '2p')
GH_USER=$(git_user_name "$CWD")

if [ -z "$GH_USER" ]; then
    {
        echo "AI Code Governance Policy Violation: git user.name not set."
        echo ""
        echo "The commit trailer requires the GitHub username (from 'git config user.name')."
        echo "Set it with: git config user.name \"<your-github-username>\""
    } >&2
    exit 2
fi

# Resolve the model IDs for the trailer (from config or env vars).
MODELS_STR=$(resolve_default_models "$CONFIGURED_HARNESS" "$RESOLVED_CFG_FILE")

# Escape regex metacharacters for the trailer regex.
GH_USER_ESC=$(printf '%s' "$GH_USER" | sed 's/[][\\.^$*+?(){}|]/\\&/g')
HARNESS_ESC=$(printf '%s' "$CONFIGURED_HARNESS" | sed 's/[][\\.^$*+?(){}|]/\\&/g')
TRAILER_REGEX="Co-authored-by:[[:space:]]+${GH_USER_ESC}[[:space:]]\+[[:space:]]${HARNESS_ESC}/[^[:space:]]+[[:space:]]<${GH_USER_ESC}@users\.noreply\.github\.com>"

if printf '%s' "$COMMAND" | grep -qiE "$TRAILER_REGEX"; then
    # Configured-format trailer present — allow.
    exit 0
fi

# Legacy accept: when harness is claude-code, accept the old Claude trailer
# for backward compatibility with repos that have existing commits.
if [ "$CONFIGURED_HARNESS" = "claude-code" ]; then
    if printf '%s' "$COMMAND" | grep -qiE "Co-authored-by:[[:space:]]+Claude[^<]*<noreply@anthropic\.com>"; then
        exit 0
    fi
fi

# Trailer missing or malformed — reject with guidance.
{
    echo "AI Code Governance Policy Violation: Missing or malformed Co-authored-by trailer."
    echo ""
    echo "Expected (harness: ${CONFIGURED_HARNESS}):"
    echo "  Co-authored-by: ${GH_USER} + ${CONFIGURED_HARNESS}/${MODELS_STR} <${GH_USER}@users.noreply.github.com>"
    echo ""
    if [ -z "$RESOLVED_CFG_FILE" ]; then
        echo "No .agent-orch-models.json found (project or global). Using ${CONFIGURED_HARNESS} defaults."
        echo "Run /agent-orch:config to configure, or /agent-orch:config --global for all repos."
        echo ""
    fi
    echo "See: plugins/agent-orch/policies/ai-code-governance.md"
} >&2
exit 2
