---
name: mcp-start
description: Start the local MCP server for Jira, Confluence, TestRail, Azure DevOps, Playwright, SonarQube, SS&C Cloud, and ServiceNow. Usage: /agent-orch:mcp-start
---

# Start Local MCP Server

Start the bundled MCP server for integrations (Jira, Confluence, TestRail, Azure DevOps, Playwright, SonarQube, SS&C Cloud, ServiceNow).

## Actions

### Step 1: Resolve the plugin directory

Read `~/.claude/plugins/installed_plugins.json` with the Read tool and extract the `installPath` for the `agent-orch@ssnc-agent-orch` entry. This is the authoritative source — it's the version Claude Code has actually loaded in this session, not an mtime guess.

If the file or the entry is missing, respond with:
```
MCP not available.

Plugin agent-orch@ssnc-agent-orch is not installed. Run: /plugin install agent-orch@ssnc-agent-orch
```

Normalize the Windows path to a POSIX path for bash (e.g., `C:\Users\ryusifov\.claude\plugins\cache\ssnc-agent-orch\agent-orch\2.23.1` → `/c/Users/ryusifov/.claude/plugins/cache/ssnc-agent-orch/agent-orch/2.23.1`) on Windows/Git Bash. On macOS/Linux the path is already POSIX.

### Step 2: Run the start command

Invoke with the resolved path:

```bash
"<resolved PLUGIN_DIR>/mcp/bin/mcp-ctl" start
```

If the resolved path does not contain `mcp/bin/mcp-ctl`, respond:
```
MCP server binary missing from installed plugin. Reinstall with: /plugin install agent-orch@ssnc-agent-orch
```

### Step 3: Handle the result

The script outputs JSON. Parse it and respond accordingly.

IMPORTANT: Output messages EXACTLY as shown below, including all emojis (📋 and ℹ️).

**Success (`"success":true`):**

After success, check for port mismatch:
1. Read `~/.claude.json` and extract port from any mcpServers URL (e.g., `http://localhost:13999/sse/jira` → 13999)
2. Compare with the port from the JSON response
3. If different, include the warning block below

```
MCP Server Started

Port: {port}
Health: http://localhost:{port}/health

⚠️ Port Mismatch
~/.claude.json has URLs with port {claudeJsonPort}, but server is on {port}.
Run /agent-orch:mcp-setup to update URLs.

📋 Next Steps:
1. Run /mcp to open the MCP panel
2. Enable the services you need (jira, confluence, testrail, azuredevops, playwright, sonarqube, ssccloud, servicenow)

ℹ️ Note:
• Services not visible? Start a new session or restart Claude Code
• Shows "needs authentication"? Toggle the service off and on in /mcp
```

If ports match, omit the "⚠️ Port Mismatch" section entirely.

**Already running (`"alreadyRunning":true`):**

Also check for port mismatch (same logic as success case above).

```
MCP Server Already Running

Port: {port}
Health: http://localhost:{port}/health

⚠️ Port Mismatch
~/.claude.json has URLs with port {claudeJsonPort}, but server is on {port}.
Run /agent-orch:mcp-setup to update URLs.

ℹ️ Note:
• Services not visible? Start a new session or restart Claude Code
• Shows "needs authentication"? Toggle the service off and on in /mcp
```

If ports match, omit the "⚠️ Port Mismatch" section entirely.

**Error: no_setup:**
```
MCP not configured.

Run /agent-orch:mcp-setup to configure MCP servers in Claude Code.
```

**Error: no_config:**
```
Credentials not found.

Run /agent-orch:mcp-setup to create ~/.claude/mcp-config.json
```

**Error: port_in_use:**
```
Port {port} is in use by another process.

Suggested: Use port {suggestedPort} instead.
Update ~/.claude/mcp-config.json with the new port, then run /agent-orch:mcp-setup to update Claude Code config.
```

**Error: bun_not_installed:**

Bun is required but not installed. Show the install command and ask user:

```
Bun Required

The MCP server requires Bun to run. Install it with:

{installCmd}

Would you like me to install Bun now? (yes/no)
```

If user says yes, run the install command via Bash, then retry starting the server.
If user says no, exit with the manual installation instructions.

**Error: other:**
```
Failed to start MCP server.

Error: {error}
Hint: {hint}
```

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.mcp-start:` entry. If the file is absent, has no
entry for this skill, or the entry is empty, **run exactly as documented above — no
behaviour change.** This is the default and most common case.

If an entry exists, this skill exposes these hook points:
- `before` — targets run before the skill's main work
- `after` — targets run after the skill's main work

Run any listed targets in order, following the shared resolver in
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline).
Tell the user when you run an extension target. A failing target is surfaced but does
NOT abort the skill unless the user aborts. Full contract:
`plugins/agent-orch/rules/extensibility.md`.
