# Installation Guide

This guide covers all methods to install the Claude Agent Orchestration plugin for Claude Code.

## Prerequisites

- [Claude Code CLI](https://claude.ai/code) installed and working
- GitHub spec-kit installed (optional): `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git`

Verify Claude Code is installed:
```bash
claude --version
```

**Note**: This plugin works **with or without** spec-kit. Use `/agent-orch:build` for standalone mode.

---

## Quick Start (Recommended)

### Step 1: Clone the Repository

```bash
git clone https://code.ssnc.dev/jjones5/claude-agent-orchestration-plugin.git
cd claude-agent-orchestration-plugin
```

### Step 2: Run the Installer

```bash
./install.sh
```

Choose option **2** for marketplace installation.

### Step 3: Restart and Verify

Restart Claude Code, then test:
```
/agent-orch:build
```

---

## Installation Options

### Option 1: Marketplace Installation (Recommended)

Registers this repo as a marketplace - available in all future Claude sessions.

```bash
./install.sh
# Choose option 2
```

Or manually:
```bash
claude plugin marketplace add /path/to/claude-agent-orchestration-plugin
claude plugin install agent-orch@ssnc-plugins
```

**What it does:**
- Registers the repo as a marketplace (`ssnc-plugins`)
- Installs `agent-orch` plugin from that marketplace
- Works from any directory
- Survives Claude Code updates

### Option 2: Quick Test (Session Only)

Loads plugin for current session only - good for testing before full install.

```bash
./install.sh
# Choose option 1
```

Or directly:
```bash
claude --plugin-dir ./plugins/agent-orch
```

**Note**: Plugin only available while using `--plugin-dir` flag.

---

## Manual Installation

If you prefer not to use the installer script:

```bash
# Clone the repo
git clone https://code.ssnc.dev/jjones5/claude-agent-orchestration-plugin.git

# Add as marketplace
claude plugin marketplace add /path/to/claude-agent-orchestration-plugin

# Install the plugin
claude plugin install agent-orch@ssnc-plugins

# Verify
claude plugin list | grep agent-orch
```

---

## Team Distribution

For team-wide installation, each team member should:

### Option A: Clone and Install (Recommended)

```bash
git clone https://code.ssnc.dev/jjones5/claude-agent-orchestration-plugin.git
cd claude-agent-orchestration-plugin
./install.sh
# Choose option 2
```

### Option B: Project-Level Plugin Directory

Add to your project's `.claude/settings.json`:

```json
{
  "pluginDirs": ["/path/to/claude-agent-orchestration-plugin/plugins/agent-orch"]
}
```

Team members get the plugin automatically when working on the project.

---

## Updating the Plugin

To update to the latest version:

```bash
cd claude-agent-orchestration-plugin
git pull
claude plugin marketplace update ssnc-plugins
```

---

## Uninstalling

### Using the Uninstaller

```bash
./uninstall.sh
```

### Manual Removal

```bash
claude plugin uninstall agent-orch@ssnc-plugins
claude plugin marketplace remove ssnc-plugins
```

---

## Verifying Installation

After installation, these skills should be available:

| Skill | Description |
|-------|-------------|
| `/agent-orch:implement` | Multi-agent implementation (requires `.specify/` from spec-kit) |
| `/agent-orch:build` | Standalone mode - no spec-kit required |
| `/agent-orch:analyse` | Multi-agent codebase analysis |

Test with:
```
/agent-orch:build
```

Check installed plugins:
```bash
claude plugin list
```

---

## Troubleshooting

### Skills Not Available

1. **Restart Claude Code** - Close and reopen after installation
2. **Check marketplace is registered**:
   ```bash
   cat ~/.claude/plugins/known_marketplaces.json | grep ssnc
   ```
3. **Check plugin is installed**:
   ```bash
   claude plugin list | grep agent-orch
   ```

### Permission Denied

```bash
chmod +x install.sh uninstall.sh
```

### Plugin Conflicts

If you have old local plugin installations, clean them up:
```bash
./uninstall.sh
# This will detect and remove old local installations
```

---

## Plugin Structure

The repository structure:

```
claude-agent-orchestration-plugin/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace definition
├── plugins/
│   └── agent-orch/               # The plugin
│       ├── .claude-plugin/
│       │   └── plugin.json       # Plugin manifest
│       ├── agents/               # 15 agent definitions
│       │   ├── orchestrate-architect.md
│       │   ├── orchestrate-builder.md
│       │   └── ... (13 more)
│       ├── skills/               # User-invokable skills
│       │   ├── implement/SKILL.md
│       │   ├── build/SKILL.md
│       │   ├── analyse/SKILL.md
│       │   └── complib-guide/SKILL.md
│       └── README.md
├── docs/                         # Documentation
├── install.sh
└── uninstall.sh
```

---

## Windows Installation

For Windows users using Git Bash or WSL:

```bash
git clone https://code.ssnc.dev/jjones5/claude-agent-orchestration-plugin.git
cd claude-agent-orchestration-plugin
./install.sh
```

For PowerShell, use manual installation:

```powershell
# Clone the repo
git clone https://code.ssnc.dev/jjones5/claude-agent-orchestration-plugin.git

# In Claude Code, add marketplace and install
# claude plugin marketplace add C:\path\to\claude-agent-orchestration-plugin
# claude plugin install agent-orch@ssnc-plugins
```

---

## Cline Installation (VS Code)

For users of [Cline](https://github.com/cline/cline) (VS Code extension), use the dedicated Cline installer.

### Quick Install

```bash
git clone https://code.ssnc.dev/ai/claude-agent-orchestration-plugin.git
cd claude-agent-orchestration-plugin

# PowerShell
.\install-cline.ps1 -TargetRepo "C:\path\to\your-project"

# Bash
./install-cline.sh /path/to/your-project
```

### With MCP Integration

To include Jira, Confluence, TestRail, and Azure DevOps integrations:

```powershell
# PowerShell
.\install-cline.ps1 -TargetRepo "C:\path\to\project" -IncludeMcp

# Bash
./install-cline.sh /path/to/project --include-mcp
```

### What Gets Installed

The installer creates `.clinerules/` in your project with:
- Workflows (`/build.md`, `/implement.md`, `/analyse.md`)
- Skills (specialized agents)
- Hooks (AI code governance)
- Conventions (language-specific rules)

### MCP Server Setup (Optional)

If you installed with `-IncludeMcp`:

1. **Configure credentials**: Edit `mcp-config.json` in Cline's settings directory
2. **Start the server** in a separate terminal:
   ```powershell
   cd "<plugin-path>\plugins\agent-orch\mcp"
   bun run src/index.ts
   ```
3. **Toggle services** in Cline's MCP panel

See [README.md](../README.md#mcp-integration-for-cline) for detailed MCP setup instructions.

### Cline Workflows

After installation, type `/` in Cline to see available workflows:

| Workflow | Description |
|----------|-------------|
| `/build.md` | Multi-agent implementation (standalone) |
| `/implement.md` | Multi-agent implementation (with spec-kit) |
| `/analyse.md` | Multi-agent codebase analysis |
| `/mcp-setup.md` | Configure MCP credentials |
| `/mcp-start.md` | Start MCP server |
