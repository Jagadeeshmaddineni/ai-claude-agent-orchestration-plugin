# Claude Agent Orchestration Plugin Installer
# Usage: .\install.ps1

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MarketplaceName = "ssnc-agent-orch"
$PluginName = "agent-orch"
$GitUrl = "git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git"

Write-Host "========================================"
Write-Host "  Claude Agent Orchestration Plugin"
Write-Host "========================================"
Write-Host ""

# Check if Claude Code is installed
$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claudeCmd) {
    Write-Host "Error: Claude Code CLI not found." -ForegroundColor Red
    Write-Host "Please install Claude Code first: https://claude.ai/code"
    exit 1
}

Write-Host "This installer registers the agent-orch marketplace and installs the plugin."
Write-Host ""
Write-Host "Repository: $GitUrl"
Write-Host ""

Write-Host "How would you like to install?"
Write-Host ""
Write-Host "  1) Quick test (session only)"
Write-Host "     Loads plugin for this session only"
Write-Host ""
Write-Host "  2) Marketplace installation (recommended)"
Write-Host "     Registers the git repo as a marketplace"
Write-Host "     Plugin available in all future Claude sessions"
Write-Host ""

$choice = Read-Host "Choose option (1/2)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Starting Claude Code with plugin loaded..."
        Write-Host ""
        & claude --plugin-dir "$ScriptDir\plugins\agent-orch"
    }
    "2" {
        Write-Host ""
        Write-Host "Installing via marketplace..."
        Write-Host ""

        Write-Host "Registering marketplace from git..."
        & claude plugin marketplace add $GitUrl

        Write-Host ""
        Write-Host "Installing plugin..."
        & claude plugin install "$PluginName@$MarketplaceName"

        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "  Installation Complete!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Marketplace: $MarketplaceName"
        Write-Host "Plugin:      $PluginName"
        Write-Host ""
        Write-Host "Available skills:"
        Write-Host ""
        Write-Host "  /agent-orch:build             Standalone mode (no spec-kit required)"
        Write-Host "  /agent-orch:implement         Multi-agent implementation (with spec-kit)"
        Write-Host "  /agent-orch:analyse           Multi-agent codebase analysis"
        Write-Host "  /agent-orch:setup-claude-md   Configure CLAUDE.md for standalone projects"
        Write-Host "  /agent-orch:setup-constitution Configure constitution.md for spec-kit"
        Write-Host ""
        Write-Host "IMPORTANT: Restart Claude Code for changes to take effect." -ForegroundColor Yellow
        Write-Host ""
    }
    default {
        Write-Host "Invalid option. Please run the script again." -ForegroundColor Red
        exit 1
    }
}
