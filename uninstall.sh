#!/bin/bash

# Claude Agent Orchestration Plugin Uninstaller
# Usage: ./uninstall.sh

set -e

MARKETPLACE_NAME="ssnc-agent-orch"
PLUGIN_NAME="agent-orch"

echo "========================================"
echo "  Claude Agent Orchestration Plugin"
echo "  Uninstaller"
echo "========================================"
echo ""

# Check if Claude Code is installed
if ! command -v claude &> /dev/null; then
    echo "Error: Claude Code CLI not found."
    exit 1
fi

echo "Uninstall options:"
echo ""
echo "  1) Uninstall plugin only (keep marketplace)"
echo "  2) Uninstall plugin AND remove marketplace"
echo "  3) Cancel"
echo ""

read -p "Choose option (1/2/3): " -n 1 -r
echo ""
echo ""

case $REPLY in
    1)
        echo "Uninstalling plugin..."
        claude plugin uninstall "$PLUGIN_NAME@$MARKETPLACE_NAME" 2>/dev/null || echo "Plugin may not be installed via marketplace"
        echo ""
        echo "Plugin uninstalled. Marketplace '$MARKETPLACE_NAME' is still registered."
        echo ""
        ;;
    2)
        echo "Uninstalling plugin..."
        claude plugin uninstall "$PLUGIN_NAME@$MARKETPLACE_NAME" 2>/dev/null || echo "Plugin may not be installed via marketplace"
        echo ""
        echo "Removing marketplace..."
        claude plugin marketplace remove "$MARKETPLACE_NAME" 2>/dev/null || echo "Marketplace may not be registered"
        echo ""
        echo "Plugin and marketplace removed."
        echo ""
        ;;
    3)
        echo "Cancelled."
        exit 0
        ;;
    *)
        echo "Invalid option."
        exit 1
        ;;
esac

echo "=========================================="
echo "  Uninstall Complete"
echo "=========================================="
echo ""
echo "Restart Claude Code for changes to take effect."
echo ""
