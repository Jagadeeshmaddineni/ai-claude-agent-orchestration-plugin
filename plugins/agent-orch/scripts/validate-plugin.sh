#!/usr/bin/env bash
# validate-plugin.sh - Validate agent-orch plugin integrity
# Usage: ./plugins/agent-orch/scripts/validate-plugin.sh

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0
WARNINGS=0

echo "=== Agent Orchestration Plugin Validator ==="
echo "Plugin root: $PLUGIN_ROOT"
echo ""

# 1. Check all agent files have required frontmatter
echo "--- Checking agent definitions ---"
for agent_file in "$PLUGIN_ROOT"/agents/orchestrate-*.md; do
    filename=$(basename "$agent_file")

    # Check frontmatter exists
    if ! head -1 "$agent_file" | grep -q '^---$'; then
        echo "ERROR: $filename missing frontmatter (---)"
        ((ERRORS++))
        continue
    fi

    # Check required fields
    for field in name description tools model; do
        if ! grep -q "^${field}:" "$agent_file"; then
            echo "ERROR: $filename missing '$field' in frontmatter"
            ((ERRORS++))
        fi
    done

    echo "  OK: $filename"
done

# 2. Check all skills have SKILL.md
echo ""
echo "--- Checking skills ---"
for skill_dir in "$PLUGIN_ROOT"/skills/*/; do
    skill_name=$(basename "$skill_dir")
    if [ ! -f "$skill_dir/SKILL.md" ]; then
        echo "ERROR: Skill '$skill_name' missing SKILL.md"
        ((ERRORS++))
    else
        # Check frontmatter
        if ! head -1 "$skill_dir/SKILL.md" | grep -q '^---$'; then
            echo "ERROR: $skill_name/SKILL.md missing frontmatter"
            ((ERRORS++))
        else
            echo "  OK: $skill_name"
        fi
    fi
done

# 3. Check convention files exist for common languages
echo ""
echo "--- Checking conventions ---"
for lang in typescript javascript python go java csharp rust; do
    if [ -f "$PLUGIN_ROOT/conventions/$lang.md" ]; then
        echo "  OK: $lang.md"
    else
        echo "WARN: Missing convention file: $lang.md"
        ((WARNINGS++))
    fi
done

# 4. Check plugin.json exists and has required fields
echo ""
echo "--- Checking plugin.json ---"
PLUGIN_JSON="$PLUGIN_ROOT/.claude-plugin/plugin.json"
if [ ! -f "$PLUGIN_JSON" ]; then
    echo "ERROR: Missing .claude-plugin/plugin.json"
    ((ERRORS++))
else
    for field in name description version; do
        if ! grep -q "\"$field\"" "$PLUGIN_JSON"; then
            echo "ERROR: plugin.json missing '$field'"
            ((ERRORS++))
        fi
    done
    echo "  OK: plugin.json"
fi

# 5. Check marketplace.json exists
echo ""
echo "--- Checking marketplace.json ---"
MARKETPLACE_JSON="$(dirname "$PLUGIN_ROOT")/../.claude-plugin/marketplace.json"
if [ -f "$MARKETPLACE_JSON" ]; then
    # Check version sync
    PLUGIN_VERSION=$(grep '"version"' "$PLUGIN_JSON" | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
    MARKETPLACE_VERSION=$(grep '"version"' "$MARKETPLACE_JSON" | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
    if [ "$PLUGIN_VERSION" != "$MARKETPLACE_VERSION" ]; then
        echo "WARN: Version mismatch - plugin.json: $PLUGIN_VERSION, marketplace.json: $MARKETPLACE_VERSION"
        ((WARNINGS++))
    else
        echo "  OK: Versions in sync ($PLUGIN_VERSION)"
    fi
else
    echo "WARN: marketplace.json not found at expected path"
    ((WARNINGS++))
fi

# 6. Check hooks are valid shell scripts
echo ""
echo "--- Checking hooks ---"
HOOKS_DIR="$(dirname "$PLUGIN_ROOT")/../.claude/hooks"
if [ -d "$HOOKS_DIR" ]; then
    shopt -s nullglob
    found_hooks=0
    # Check for hook scripts in subdirectories (e.g., TaskCompleted/, TeammateIdle/)
    for hook_dir in "$HOOKS_DIR"/*/; do
        [ -d "$hook_dir" ] || continue
        hook_name=$(basename "$hook_dir")
        for script in "$hook_dir"*; do
            [ -f "$script" ] || continue
            ((found_hooks++))
            # Check if file is a shell script (has shebang or .sh extension)
            if head -1 "$script" | grep -q '^#!' || [[ "$script" == *.sh ]]; then
                if bash -n "$script" 2>/dev/null; then
                    echo "  OK: $hook_name/$(basename "$script")"
                else
                    echo "ERROR: $hook_name/$(basename "$script") has syntax errors"
                    ((ERRORS++))
                fi
            else
                echo "  OK: $hook_name/$(basename "$script") (non-shell hook)"
            fi
        done
    done
    shopt -u nullglob
    if [ "$found_hooks" -eq 0 ]; then
        echo "  No hook scripts found"
    fi
else
    echo "WARN: No hooks directory found"
    ((WARNINGS++))
fi

# 7. Cross-reference: agents mentioned in skills exist
echo ""
echo "--- Cross-referencing agents in skills ---"
AGENT_NAMES=""
for agent_file in "$PLUGIN_ROOT"/agents/orchestrate-*.md; do
    name=$(basename "$agent_file" .md)
    AGENT_NAMES="$AGENT_NAMES $name"
done

for skill_file in "$PLUGIN_ROOT"/skills/*/SKILL.md; do
    skill_name=$(basename "$(dirname "$skill_file")")
    refs=$(grep -o 'orchestrate-[a-z-]*' "$skill_file" 2>/dev/null | sort -u || true)
    for ref in $refs; do
        if ! echo "$AGENT_NAMES" | grep -q "$ref"; then
            echo "WARN: $skill_name references '$ref' but no agent file found"
            ((WARNINGS++))
        fi
    done
done
echo "  Done"

# Summary
echo ""
echo "=== Summary ==="
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo "FAILED - Fix errors before publishing"
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo ""
    echo "PASSED with warnings"
    exit 0
else
    echo ""
    echo "ALL CHECKS PASSED"
    exit 0
fi
