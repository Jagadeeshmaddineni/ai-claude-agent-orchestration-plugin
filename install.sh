#!/bin/bash

# Claude Agent Orchestration Plugin Installer
# Usage: ./install.sh

set -e

MARKETPLACE_NAME="ssnc-agent-orch"
PLUGIN_NAME="agent-orch"
GRAPH_PLUGIN_NAME="codebase-graph-analyzer"
GIT_URL="git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "========================================"
echo "  Claude Agent Orchestration Plugin"
echo "========================================"
echo ""

# Check if Claude Code is installed
if ! command -v claude &> /dev/null; then
    echo "Error: Claude Code CLI not found."
    echo "Please install Claude Code first: https://claude.ai/code"
    exit 1
fi

echo "This installer registers the agent-orch marketplace and installs the plugin."
echo ""
echo "Repository: $GIT_URL"
echo ""

# Check SSH key is loaded
if ! ssh-add -l &>/dev/null 2>&1; then
    echo "WARNING: No SSH identities found."
    echo "Run: ssh-add ~/.ssh/id_ed25519"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "How would you like to install?"
echo ""
echo "  1) Quick test (session only)"
echo "     Loads plugin for this session only"
echo ""
echo "  2) Marketplace installation (recommended)"
echo "     Registers the git repo as a marketplace"
echo "     Plugin available in all future Claude sessions"
echo ""

read -p "Choose option (1/2): " -n 1 -r
echo ""
echo ""

case $REPLY in
    1)
        echo "Starting Claude Code with plugin loaded..."
        echo ""
        echo "Running: claude --plugin-dir \"$SCRIPT_DIR/plugins/agent-orch\""
        echo ""
        exec claude --plugin-dir "$SCRIPT_DIR/plugins/agent-orch"
        ;;
    2)
        echo "Installing via marketplace..."
        echo ""

        # Register marketplace from git URL
        echo "Registering marketplace from git..."
        echo "Running: claude plugin marketplace add $GIT_URL"
        echo ""
        claude plugin marketplace add "$GIT_URL"

        echo ""
        echo "Installing agent-orch plugin..."
        echo "Running: claude plugin install $PLUGIN_NAME@$MARKETPLACE_NAME"
        echo ""
        claude plugin install "$PLUGIN_NAME@$MARKETPLACE_NAME"

        echo ""
        echo "Installing codebase-graph-analyzer plugin..."
        echo "Running: claude plugin install $GRAPH_PLUGIN_NAME@$MARKETPLACE_NAME"
        echo ""
        claude plugin install "$GRAPH_PLUGIN_NAME@$MARKETPLACE_NAME"

        # Install Python backend for codebase-graph-analyzer
        echo ""
        echo "Installing code-review-graph backend (required for codebase-graph-analyzer)..."
        pip install code-review-graph

        echo ""
        echo "=========================================="
        echo "  Installation Complete!"
        echo "=========================================="
        echo ""
        echo "Marketplace: $MARKETPLACE_NAME"
        echo "Plugins:     $PLUGIN_NAME, $GRAPH_PLUGIN_NAME"
        echo ""
        echo "agent-orch skills:"
        echo ""
        echo "  /agent-orch:build             Standalone mode (no spec-kit required)"
        echo "  /agent-orch:implement         Multi-agent implementation (with spec-kit)"
        echo "  /agent-orch:analyse           Multi-agent codebase analysis"
        echo "  /agent-orch:setup-claude-md   Configure CLAUDE.md for standalone projects"
        echo "  /agent-orch:setup-constitution Configure constitution.md for spec-kit"
        echo ""
        echo "codebase-graph-analyzer skills:"
        echo ""
        echo "  /codebase-graph-analyzer:build-graph     Build the knowledge graph"
        echo "  /codebase-graph-analyzer:review-changes  Risk-scored code review"
        echo "  /codebase-graph-analyzer:review-delta    Token-efficient delta review"
        echo "  /codebase-graph-analyzer:review-pr       Full PR review"
        echo "  /codebase-graph-analyzer:explore-codebase Navigate codebase structure"
        echo "  /codebase-graph-analyzer:debug-issue     Trace bugs via call chains"
        echo "  /codebase-graph-analyzer:refactor-safely Safe refactoring with impact preview"
        echo ""
        echo "IMPORTANT: Restart Claude Code for changes to take effect."
        echo ""
        ;;
    *)
        echo "Invalid option. Please run the script again."
        exit 1
        ;;
esac
