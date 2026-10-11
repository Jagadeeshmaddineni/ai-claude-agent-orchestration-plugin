---
name: mcp-start
description: Start the local MCP server for Jira, Confluence, TestRail, and Azure DevOps (Cline version). Usage: /mcp-start.md
---

# Start MCP Server (Cline)

Start the bundled MCP server for integrations.

## Prerequisites

The MCP server requires **Bun** (a fast JavaScript runtime).

## Actions

### Step 1: Check if Bun is installed

```bash
command -v bun
```

**If Bun is NOT installed**, show this message and ask user:

```
Bun Required

The MCP server requires Bun to run. Install it with:

Windows (PowerShell):
  powershell -c "irm bun.sh/install.ps1 | iex"

macOS/Linux:
  curl -fsSL https://bun.sh/install | bash

Would you like me to install Bun now? (yes/no)
```

If user says yes:
- Windows: Run `powershell -c "irm bun.sh/install.ps1 | iex"`
- macOS/Linux: Run `curl -fsSL https://bun.sh/install | bash`

Then continue to Step 2.

### Step 2: Find the MCP server directory

The MCP server path is recorded during installation. Check in order:

**Windows (PowerShell):**
```powershell
# 1. Check recorded path from installer
$pluginPathFile = "$env:APPDATA\Code\User\globalStorage\saoudrizwan.claude-dev\settings\mcp-plugin-path.txt"
if (Test-Path $pluginPathFile) {
    $MCP_DIR = (Get-Content $pluginPathFile -Raw).Trim()
}

# 2. Fallback: common locations
if (-not $MCP_DIR -or -not (Test-Path "$MCP_DIR\src\index.ts")) {
    $searchPaths = @(
        "$env:USERPROFILE\.claude\plugins\cache\ssnc-agent-orch\agent-orch\*\mcp",
        ".\plugins\agent-orch\mcp"
    )
    foreach ($pattern in $searchPaths) {
        Get-Item $pattern -ErrorAction SilentlyContinue | ForEach-Object {
            if (Test-Path "$($_.FullName)\src\index.ts") {
                $MCP_DIR = $_.FullName
            }
        }
        if ($MCP_DIR) { break }
    }
}
```

**macOS/Linux (Bash):**
```bash
# 1. Check recorded path from installer
case "$(uname)" in
  Darwin) SETTINGS_DIR="$HOME/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings" ;;
  *) SETTINGS_DIR="$HOME/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings" ;;
esac

[ -f "$SETTINGS_DIR/mcp-plugin-path.txt" ] && MCP_DIR=$(cat "$SETTINGS_DIR/mcp-plugin-path.txt")

# 2. Fallback: common locations
if [ -z "$MCP_DIR" ] || [ ! -f "$MCP_DIR/src/index.ts" ]; then
    for dir in "$HOME/.claude/plugins/cache/ssnc-agent-orch/agent-orch"/*/mcp ./plugins/agent-orch/mcp; do
        [ -f "$dir/src/index.ts" ] && MCP_DIR="$dir" && break
    done
fi
```

**If not found**, show:
```
MCP server not found.

The MCP server source should be in the agent-orch plugin directory.
Please provide the path to the plugin, or clone it:

  git clone https://code.ssnc.dev/ai/claude-agent-orchestration-plugin.git
```

### Step 3: Check if server is already running

```bash
curl -s --max-time 2 http://localhost:13999/health
```

**If response contains "agent-orch-mcp"**, the server is already running:

```
MCP Server Already Running

Port: 13999
Health: http://localhost:13999/health

The server is ready. Cline should auto-connect to enabled services.
If services show errors, try toggling them off and on in Cline's MCP panel.
```

### Step 4: Start the server

```bash
cd "$MCP_DIR" && bun run src/index.ts
```

The server will output:
```
[CONFIG] Loaded JSON config from: <path to mcp-config.json>
[MCP] Server started on http://localhost:13999
[MCP] Endpoints:
[MCP]   jira: http://localhost:13999/sse/jira (configured: true/false)
[MCP]   confluence: http://localhost:13999/sse/confluence (configured: true/false)
...
```

**On success**, show:

```
MCP Server Started

Port: 13999
Health: http://localhost:13999/health

Cline should auto-connect to enabled services.
If services show errors, toggle them off and on in Cline's MCP panel.

Note: Keep this terminal open. The server stops when the terminal closes.
For background mode, use: nohup bun run src/index.ts &
```

## Error Handling

**Port in use by another process:**
```
Port 13999 is in use by another process.

Options:
1. Stop the other process using port 13999
2. Change the port in mcp-config.json and restart
```

**Config not found:**
```
MCP credentials not found.

Create or edit the config file at:
  (Cline settings)/mcp-config.json

Or run the installer with -IncludeMcp flag:
  ./install-cline.ps1 -TargetRepo <path> -IncludeMcp
```
