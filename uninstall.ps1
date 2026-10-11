# Claude Agent Orchestration Plugin Uninstaller
# Usage: .\uninstall.ps1

$ErrorActionPreference = "Stop"

$MarketplaceName = "ssnc-agent-orch"
$PluginName = "agent-orch"

Write-Host "========================================"
Write-Host "  Claude Agent Orchestration Plugin"
Write-Host "  Uninstaller"
Write-Host "========================================"
Write-Host ""

# Check if Claude Code is installed
$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claudeCmd) {
    Write-Host "Error: Claude Code CLI not found." -ForegroundColor Red
    exit 1
}

Write-Host "Uninstall options:"
Write-Host ""
Write-Host "  1) Uninstall plugin only (keep marketplace)"
Write-Host "  2) Uninstall plugin AND remove marketplace"
Write-Host "  3) Cancel"
Write-Host ""

$choice = Read-Host "Choose option (1/2/3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Uninstalling plugin..."
        & claude plugin uninstall "$PluginName@$MarketplaceName" 2>$null
        Write-Host ""
        Write-Host "Plugin uninstalled. Marketplace '$MarketplaceName' is still registered."
    }
    "2" {
        Write-Host ""
        Write-Host "Uninstalling plugin..."
        & claude plugin uninstall "$PluginName@$MarketplaceName" 2>$null
        Write-Host ""
        Write-Host "Removing marketplace..."
        & claude plugin marketplace remove $MarketplaceName 2>$null
        Write-Host ""
        Write-Host "Plugin and marketplace removed."
    }
    "3" {
        Write-Host "Cancelled."
        exit 0
    }
    default {
        Write-Host "Invalid option." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Uninstall Complete" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Restart Claude Code for changes to take effect." -ForegroundColor Yellow
Write-Host ""
