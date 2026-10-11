---
name: mcp-stop
description: Stop the running local MCP server. Usage: /agent-orch:mcp-stop
---

# Stop Local MCP Server

Stop the running MCP server.

## Actions

### Step 1: Resolve the plugin directory

Read `~/.claude/plugins/installed_plugins.json` with the Read tool and extract the `installPath` for the `agent-orch@ssnc-agent-orch` entry. This is the authoritative source — it's the version Claude Code has actually loaded in this session, not an mtime guess.

If the file or the entry is missing, respond with:
```
MCP not available.

Plugin agent-orch@ssnc-agent-orch is not installed.
```

Normalize the Windows path to a POSIX path for bash (e.g., `C:\Users\ryusifov\.claude\plugins\cache\ssnc-agent-orch\agent-orch\2.23.1` → `/c/Users/ryusifov/.claude/plugins/cache/ssnc-agent-orch/agent-orch/2.23.1`) on Windows/Git Bash. On macOS/Linux the path is already POSIX.

### Step 2: Run the stop command

Invoke with the resolved path:

```bash
"<resolved PLUGIN_DIR>/mcp/bin/mcp-ctl" stop
```

### Step 3: Handle the result

The script outputs JSON. Parse it and respond accordingly:

**Success:**
```
MCP Server Stopped

Port {port} is now free.
```

**Not running:**
```
MCP Server Not Running

No server was running on port {port}.
```

**Error:**
```
Failed to stop MCP server.

Error: {error}
Hint: {hint}
```

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.mcp-stop:` entry. If the file is absent, has no
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
