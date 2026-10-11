#!/bin/bash
# Build-Orch Workflows-Connectors - Command Cleanup Script
# Restores original commands and constitution after connector generation
# NOTE: Only runs in Final Completion Mode (no pending sub-scopes)

set -e

# Target is current working directory
TARGET_DIR="$(pwd)"

echo "Cleaning up build-orch:workflows-connectors commands..."

# Step 1: Restore commands to their committed state using git
# - git restore: restores modified/deleted tracked files
# - git clean: removes untracked files added by the skill
if [ -d "$TARGET_DIR/.claude/commands" ]; then
    git restore "$TARGET_DIR/.claude/commands" 2>/dev/null || true
    git clean -fd "$TARGET_DIR/.claude/commands" 2>/dev/null || true
    echo "  Restored .claude/commands/ to committed state"
fi

# Step 2: Clean up .claude/scripts/ (fetch-docs.py added by install)
if [ -d "$TARGET_DIR/.claude/scripts" ]; then
    git restore "$TARGET_DIR/.claude/scripts" 2>/dev/null || true
    git clean -fd "$TARGET_DIR/.claude/scripts" 2>/dev/null || true
    echo "  Cleaned .claude/scripts/"
fi

# Step 3: Restore CLAUDE.md to committed state (or remove if created by us)
if [ -f "$TARGET_DIR/CLAUDE.md" ]; then
    git restore "$TARGET_DIR/CLAUDE.md" 2>/dev/null || git clean -f "$TARGET_DIR/CLAUDE.md" 2>/dev/null || true
    echo "  Restored CLAUDE.md to committed state (or removed if new)"
fi

# Step 4: Restore constitution to committed state (or remove if created by us)
if [ -f "$TARGET_DIR/.specify/memory/constitution.md" ]; then
    git restore "$TARGET_DIR/.specify/memory/constitution.md" 2>/dev/null || git clean -f "$TARGET_DIR/.specify/memory/constitution.md" 2>/dev/null || true
    echo "  Restored constitution.md to committed state (or removed if new)"
fi

# Clean up any backup file from old mechanism
rm -f "$TARGET_DIR/.specify/memory/constitution.md.backup"

# Step 4b: Remove conventions symlink and conventions.md
if [ -L "$TARGET_DIR/.specify/conventions" ] || [ -d "$TARGET_DIR/.specify/conventions" ]; then
    rm -rf "$TARGET_DIR/.specify/conventions"
    echo "  Removed conventions symlink"
fi
if [ -f "$TARGET_DIR/.specify/memory/conventions.md" ]; then
    git restore "$TARGET_DIR/.specify/memory/conventions.md" 2>/dev/null || git clean -f "$TARGET_DIR/.specify/memory/conventions.md" 2>/dev/null || true
    echo "  Restored conventions.md to committed state (or removed if new)"
fi

# Step 5: Clean up agent-orch orchestration artifacts (if exists)
if [ -d "$TARGET_DIR/.specify/orchestration" ]; then
    git restore "$TARGET_DIR/.specify/orchestration" 2>/dev/null || true
    git clean -fd "$TARGET_DIR/.specify/orchestration" 2>/dev/null || true
    echo "  Cleaned .specify/orchestration/"
fi

echo ""
echo "Cleanup complete!"
echo "  Original speckit commands restored"
echo "  Original constitution restored"
echo ""
echo "  Build-orch agents will now use standard project constitution."
