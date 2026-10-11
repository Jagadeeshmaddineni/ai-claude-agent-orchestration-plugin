#!/bin/bash
# Build-Orch Workflows-Connectors - Command Installation Script
# Copies speckit commands and swaps constitution for connector generation

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

# Target is current working directory (should be workflows-connectors repo)
TARGET_DIR="$(pwd)"

echo "Installing build-orch:workflows-connectors commands..."

# Step 1: Create .claude/commands/ if it doesn't exist
mkdir -p "$TARGET_DIR/.claude/commands"

# Step 2: Copy connector-specific speckit commands
# (git restore will handle restoring originals during cleanup)
cp "$SKILL_DIR/commands/speckit.whereami.md" "$TARGET_DIR/.claude/commands/"
cp "$SKILL_DIR/commands/speckit.docs.md" "$TARGET_DIR/.claude/commands/"
cp "$SKILL_DIR/commands/speckit.scope.md" "$TARGET_DIR/.claude/commands/"
cp "$SKILL_DIR/commands/speckit.specify.md" "$TARGET_DIR/.claude/commands/"
cp "$SKILL_DIR/commands/speckit.implement.md" "$TARGET_DIR/.claude/commands/"
cp "$SKILL_DIR/commands/speckit.validate.md" "$TARGET_DIR/.claude/commands/"
cp "$SKILL_DIR/commands/speckit.refactor.md" "$TARGET_DIR/.claude/commands/"
cp "$SKILL_DIR/commands/speckit.complete.md" "$TARGET_DIR/.claude/commands/"

echo "  Copied speckit commands to .claude/commands/"

# Step 3: Copy scripts for Playwright fallback and cleanup
mkdir -p "$TARGET_DIR/.claude/scripts"
cp "$SKILL_DIR/scripts/fetch-docs.py" "$TARGET_DIR/.claude/scripts/"
cp "$SKILL_DIR/scripts/cleanup-commands.sh" "$TARGET_DIR/.claude/scripts/"
echo "  Copied fetch-docs.py to .claude/scripts/"
echo "  Copied cleanup-commands.sh to .claude/scripts/"

# Step 4: Create .specify/memory/ if it doesn't exist
mkdir -p "$TARGET_DIR/.specify/memory"

# Step 5: Copy connector-generation constitution (C0-C9 patterns)
# (git restore will handle restoring original during cleanup)
cp "$SKILL_DIR/constitution/constitution.md" "$TARGET_DIR/.specify/memory/constitution.md"
echo "  Installed C0-C9 constitution"

# Step 6: Create symlink to plugin's conventions folder
# This allows agents to read conventions without hardcoding version-specific paths
PLUGIN_INSTALL_PATH=$(cat ~/.claude/plugins/installed_plugins.json 2>/dev/null | python -c "import json,sys; data=json.load(sys.stdin); print(data['plugins']['agent-orch@ssnc-plugins'][0]['installPath'])" 2>/dev/null)

if [ -n "$PLUGIN_INSTALL_PATH" ] && [ -d "$PLUGIN_INSTALL_PATH/conventions" ]; then
    rm -rf "$TARGET_DIR/.specify/conventions" 2>/dev/null
    ln -s "$PLUGIN_INSTALL_PATH/conventions" "$TARGET_DIR/.specify/conventions"
    echo "  Created symlink: .specify/conventions/ -> plugin conventions"
else
    echo "  Warning: Could not create conventions symlink (plugin path not found)"
fi

echo ""
echo "Installation complete!"
echo "  Installed commands:"
echo "    - /speckit.whereami (show workflow progress)"
echo "    - /speckit.docs"
echo "    - /speckit.scope"
echo "    - /speckit.specify (with sub-branch handling)"
echo "    - /speckit.implement (wrapper with next step)"
echo "    - /speckit.validate (C0-C9 pattern checks)"
echo "    - /speckit.refactor"
echo "    - /speckit.complete (dual completion modes)"
echo ""
echo "  Constitution: .specify/memory/constitution.md (C0-C9 patterns)"
echo ""
echo "  Build-orch agents will now read C0-C9 patterns automatically."
