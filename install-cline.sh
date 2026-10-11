#!/usr/bin/env bash
# Claude Agent Orchestration - Cline Installer
# Usage: ./install-cline.sh [target-repo-path]
#
# Installs the agent orchestration pack for Cline (VS Code extension).
# This creates the same capabilities as the Claude plugin but for Cline users.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR/plugins/agent-orch"
TARGET_REPO="${1:-$(pwd)}"
INCLUDE_MCP="${INCLUDE_MCP:-false}"
FORCE="${FORCE:-false}"

echo "========================================"
echo "  Agent Orchestration - Cline Installer"
echo "========================================"
echo ""

# Verify plugin source exists
if [ ! -d "$PLUGIN_DIR" ]; then
    echo "Error: Plugin source not found at: $PLUGIN_DIR" >&2
    echo "Make sure you're running from the claude-agent-orchestration-plugin directory."
    exit 1
fi

# Verify target repo
if [ ! -d "$TARGET_REPO" ]; then
    echo "Error: Target repo not found: $TARGET_REPO" >&2
    exit 1
fi

echo "Source:  $PLUGIN_DIR"
echo "Target:  $TARGET_REPO"
echo ""

# Check if already installed
CLINERULES="$TARGET_REPO/.clinerules"
if [ -d "$CLINERULES" ] && [ "$FORCE" != "true" ]; then
    echo "Found existing .clinerules/ folder."
    read -p "Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

echo "Installing agent orchestration for Cline..."
echo ""

# Create directory structure
mkdir -p "$CLINERULES"
mkdir -p "$CLINERULES/workflows"
mkdir -p "$CLINERULES/skills"
mkdir -p "$CLINERULES/hooks"

# ============================================
# 1. Copy skills -> workflows (flat files)
# ============================================
echo "Creating workflows (user-invokable commands)..."

SKILLS_DIR="$PLUGIN_DIR/skills"
WORKFLOWS_DIR="$CLINERULES/workflows"

if [ -d "$SKILLS_DIR" ]; then
    for folder in "$SKILLS_DIR"/*/; do
        if [ -d "$folder" ]; then
            skill_name=$(basename "$folder")
            skill_file="$folder/SKILL.md"
            if [ -f "$skill_file" ]; then
                cp "$skill_file" "$WORKFLOWS_DIR/$skill_name.md"
                echo "  + workflows/$skill_name.md"
            fi
        fi
    done
fi

# ============================================
# 2. Copy agents -> skills (folder structure)
# ============================================
echo ""
echo "Creating skills (specialized agents)..."

AGENTS_DIR="$PLUGIN_DIR/agents"
CLINE_SKILLS_DIR="$CLINERULES/skills"

if [ -d "$AGENTS_DIR" ]; then
    for agent_file in "$AGENTS_DIR"/*.md; do
        if [ -f "$agent_file" ]; then
            skill_name=$(basename "$agent_file" .md)
            skill_folder="$CLINE_SKILLS_DIR/$skill_name"
            mkdir -p "$skill_folder"
            cp "$agent_file" "$skill_folder/SKILL.md"
            echo "  + skills/$skill_name/SKILL.md"
        fi
    done
fi

# ============================================
# 3. Copy conventions -> rules (root)
# ============================================
echo ""
echo "Creating rules (conventions, policies)..."

CONVENTIONS_DIR="$PLUGIN_DIR/conventions"
if [ -d "$CONVENTIONS_DIR" ]; then
    for conv_file in "$CONVENTIONS_DIR"/*.md; do
        if [ -f "$conv_file" ]; then
            filename=$(basename "$conv_file")
            cp "$conv_file" "$CLINERULES/convention-$filename"
            echo "  + convention-$filename"
        fi
    done
fi

# ============================================
# 4. Copy rules -> rules (root)
# ============================================
RULES_DIR="$PLUGIN_DIR/rules"
if [ -d "$RULES_DIR" ]; then
    for rule_file in "$RULES_DIR"/*.md; do
        if [ -f "$rule_file" ]; then
            filename=$(basename "$rule_file")
            cp "$rule_file" "$CLINERULES/$filename"
            echo "  + $filename"
        fi
    done
fi

# ============================================
# 5. Copy policies -> rules (root)
# ============================================
POLICIES_DIR="$PLUGIN_DIR/policies"
if [ -d "$POLICIES_DIR" ]; then
    for policy_file in "$POLICIES_DIR"/*.md; do
        if [ -f "$policy_file" ]; then
            filename=$(basename "$policy_file")
            cp "$policy_file" "$CLINERULES/policy-$filename"
            echo "  + policy-$filename"
        fi
    done
fi

# ============================================
# 6. Create hooks (Cline format - Unix executable)
#    PreToolUse hook for commit validation (governance)
# ============================================
echo ""
echo "Creating hooks..."

HOOKS_DIR="$CLINERULES/hooks"

# PreToolUse hook - validates git commits have Co-authored-by trailer
# NOTE: Cline calls this for EVERY tool, so we exit silently for non-git-commit tools
cat > "$HOOKS_DIR/PreToolUse" << 'EOF'
#!/usr/bin/env bash
# Agent Orchestration - PreToolUse Hook
# Validates that git commits include the Co-authored-by trailer
# This enforces AI code governance policy
#
# NOTE: This hook runs for ALL tool calls in Cline (no tool-type filtering).
# We exit silently for non-git-commit tools to avoid noisy output.

# Read JSON input from stdin
INPUT=$(cat)

# Extract tool name and command
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool":"[^"]*"' | head -1 | sed 's/"tool":"//;s/"$//' 2>/dev/null || true)
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"$//' 2>/dev/null || true)

# Only check execute_command tool with git commit - exit silently otherwise
# Cline interprets exit 0 with no output as "allow"
if [ "$TOOL_NAME" != "execute_command" ] || [ -z "$COMMAND" ]; then
    exit 0
fi

if ! echo "$COMMAND" | grep -q "git commit"; then
    exit 0
fi

# Skip amend commits
if echo "$COMMAND" | grep -q "\-\-amend"; then
    exit 0
fi

# Check for Co-authored-by trailer
if ! echo "$COMMAND" | grep -qi "Co-authored-by:"; then
    # Only output JSON when we need to BLOCK the action
    echo '{"cancel": true, "errorMessage": "AI Code Governance: Commits must include Co-authored-by trailer. Add to commit message: Co-authored-by: Claude <noreply@anthropic.com>"}'
    exit 1
fi

# Trailer present - allow commit silently
exit 0
EOF

chmod +x "$HOOKS_DIR/PreToolUse"
echo "  + hooks/PreToolUse (commit validation)"

# ============================================
# 7. Create AGENTS.md
# ============================================
echo ""
echo "Creating AGENTS.md..."

cat > "$TARGET_REPO/AGENTS.md" << 'EOF'
# Agent Orchestration for Cline

Multi-agent orchestration with 25 specialized agents, TDD enforcement, comprehensive test coverage, two-stage code review, verification gates, and systematic debugging.

## Quick Start

Type `/` in Cline chat to see available workflows:

| Workflow | Description |
|----------|-------------|
| `/build.md` | Multi-agent implementation WITHOUT spec-kit |
| `/implement.md` | Multi-agent implementation WITH spec-kit |
| `/analyse.md` | Multi-agent codebase analysis |
| `/c4.md` | Generate C4 architecture documentation |
| `/olly.md` | Add OpenTelemetry observability |
| `/jira.md` | Jira issue operations |
| `/jira-work.md` | Find and work on Jira issues |
| `/simplify.md` | Code simplification review |
| `/mcp-setup.md` | Configure MCP server credentials |
| `/mcp-start.md` | Start the MCP server |
| `/setup-cline-rules.md` | Set up hierarchical rules structure |

## Available Agents (Skills)

### Core Agents
| Agent | Role |
|-------|------|
| `orchestrate-architect` | Research & Planning |
| `orchestrate-builder` | Core Implementation (TDD) |
| `orchestrate-validator` | Comprehensive Testing |
| `orchestrate-debugger` | Systematic Debugging |

### Review Agents
| Agent | Role |
|-------|------|
| `orchestrate-quality-reviewer` | Code Quality Review |
| `orchestrate-spec-reviewer` | Spec Compliance Review |
| `orchestrate-security` | Security Review |

### Documentation Agents
| Agent | Role |
|-------|------|
| `orchestrate-scribe` | Documentation |
| `orchestrate-c4-scribe` | C4 Architecture Docs |
| `orchestrate-content-specialist` | Content Creation |

### Specialist Agents
| Agent | Role |
|-------|------|
| `orchestrate-api` | API Design |
| `orchestrate-database` | Database Operations |
| `orchestrate-devops` | CI/CD & Infrastructure |
| `orchestrate-performance` | Performance Optimization |
| `orchestrate-refactorer` | Code Refactoring |
| `orchestrate-migration` | Upgrades & Migrations |
| `orchestrate-uiux` | UI/UX Implementation |
| `orchestrate-telemetry` | Observability |
| `orchestrate-observability` | Monitoring & Alerts |
| `orchestrate-data-engineer` | Data Pipelines |
| `orchestrate-ml-engineer` | ML/AI Implementation |
| `orchestrate-legacy-modernizer` | Legacy Code Updates |
| `orchestrate-incident-responder` | Incident Management |
| `orchestrate-jira-triage` | Jira Issue Triage |
| `orchestrate-advocate` | Developer Advocacy |

## MCP Services

Run `/mcp-setup.md` to configure: Jira, Confluence, TestRail, Azure DevOps, Playwright, SonarQube

## Conventions

Language-specific standards loaded automatically: csharp, typescript, python, go, rust, java, javascript

## How It Works

1. Invoke a workflow (e.g., `/build.md`)
2. Describe what you want to build
3. The Architect agent analyzes and creates a plan
4. You approve the plan
5. Agents work in parallel (Builder, Validator, specialists)
6. Two-stage review ensures quality
7. Final summary with all changes

## Setup

This pack was installed with `install-cline.sh`. Structure:

```
.clinerules/
├── *.md                    # Rules (conventions, policies, persona)
├── workflows/              # User-invokable workflows
│   ├── build.md
│   ├── implement.md
│   └── ...
├── skills/                 # Specialized agent skills
│   ├── orchestrate-architect/
│   ├── orchestrate-builder/
│   └── ...
└── hooks/                  # Cline hooks
    └── PreToolUse
```

---

**Version:** 2.12.0 (Cline port)
**Source:** https://code.ssnc.dev/ai/claude-agent-orchestration-plugin
EOF

echo "  + AGENTS.md"

# ============================================
# 8. Create setup-cline-rules workflow (full version)
# ============================================
echo ""
echo "Creating setup-cline-rules workflow..."

SETUP_RULES_TEMPLATE="$SCRIPT_DIR/cline-templates/setup-cline-rules.md"

if [ -f "$SETUP_RULES_TEMPLATE" ]; then
    cp "$SETUP_RULES_TEMPLATE" "$WORKFLOWS_DIR/setup-cline-rules.md"
    echo "  + workflows/setup-cline-rules.md (full template)"
else
    # Fallback to minimal version if template not found
    cat > "$WORKFLOWS_DIR/setup-cline-rules.md" << 'EOF'
---
name: setup-cline-rules
description: Sets up a hierarchical .clinerules structure. Usage: /setup-cline-rules.md
---

# Setup Hierarchical Rules for Cline

Run this workflow to set up optimized rules structure for your project.
See the full documentation in the plugin repository.
EOF
    echo "  + workflows/setup-cline-rules.md (minimal)"
fi

# ============================================
# 9. Optional: MCP configuration (SSE-based)
# ============================================
if [ "$INCLUDE_MCP" = "true" ]; then
    echo ""
    echo "Configuring MCP (SSE transport)..."

    # Default port
    MCP_PORT=13999

    # Detect OS and set Cline settings path
    case "$(uname -s)" in
        Darwin)
            CLINE_SETTINGS_DIR="$HOME/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings"
            ;;
        Linux)
            CLINE_SETTINGS_DIR="$HOME/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            CLINE_SETTINGS_DIR="$APPDATA/Code/User/globalStorage/saoudrizwan.claude-dev/settings"
            ;;
        *)
            CLINE_SETTINGS_DIR="$HOME/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings"
            ;;
    esac

    mkdir -p "$CLINE_SETTINGS_DIR"

    # --- Step 1: Create credentials template in Cline's settings directory ---
    MCP_CONFIG_PATH="$CLINE_SETTINGS_DIR/mcp-config.json"

    if [ ! -f "$MCP_CONFIG_PATH" ]; then
        cat > "$MCP_CONFIG_PATH" << 'MCPEOF'
{
  "port": 13999,
  "jira": {
    "enabled": false,
    "host": "jira.example.com",
    "token": "",
    "scope": "write"
  },
  "confluence": {
    "enabled": false,
    "host": "confluence.example.com",
    "token": "",
    "scope": "write"
  },
  "testrail": {
    "enabled": false,
    "url": "https://your-instance.testrail.io",
    "email": "",
    "apiKey": "",
    "scope": "write"
  },
  "azureDevOps": {
    "enabled": false,
    "baseUrl": "https://dev.azure.com",
    "organizations": {},
    "scope": "write"
  },
  "playwright": {
    "enabled": false,
    "headless": true,
    "browserType": "chromium",
    "defaultTimeout": 30000,
    "screenshotDir": "./screenshots",
    "scope": "write"
  },
  "sonarqube": {
    "enabled": false,
    "url": "https://sonarcloud.io",
    "token": "",
    "organization": "",
    "scope": "read"
  }
}
MCPEOF
        echo "  + $CLINE_SETTINGS_DIR/mcp-config.json (credentials)"
    else
        echo "  ~ mcp-config.json (already exists, preserving)"
        # Read existing port if available
        EXISTING_PORT=$(grep -o '"port"[[:space:]]*:[[:space:]]*[0-9]*' "$MCP_CONFIG_PATH" 2>/dev/null | grep -o '[0-9]*' | head -1)
        if [ -n "$EXISTING_PORT" ]; then
            MCP_PORT="$EXISTING_PORT"
        fi
    fi

    # --- Step 2: Register SSE servers in Cline's global settings ---
    CLINE_SETTINGS_PATH="$CLINE_SETTINGS_DIR/cline_mcp_settings.json"

    # Create or update Cline MCP settings
    # We use a simple approach: if file exists, merge; if not, create new
    if [ -f "$CLINE_SETTINGS_PATH" ]; then
        # File exists - we need to merge. Using a simple jq-free approach.
        # Create a temp file with new servers, then merge manually
        echo "  ~ Updating existing Cline MCP settings..."

        # Check if jq is available for proper merging
        if command -v jq &>/dev/null; then
            # Use jq for proper JSON merging
            jq --arg port "$MCP_PORT" '.mcpServers.jira = {"type": "sse", "url": "http://localhost:\($port)/sse/jira"} |
                .mcpServers.confluence = {"type": "sse", "url": "http://localhost:\($port)/sse/confluence"} |
                .mcpServers.testrail = {"type": "sse", "url": "http://localhost:\($port)/sse/testrail"} |
                .mcpServers.azuredevops = {"type": "sse", "url": "http://localhost:\($port)/sse/azuredevops"} |
                .mcpServers.playwright = {"type": "sse", "url": "http://localhost:\($port)/sse/playwright"} |
                .mcpServers.sonarqube = {"type": "sse", "url": "http://localhost:\($port)/sse/sonarqube"}' \
                "$CLINE_SETTINGS_PATH" > "$CLINE_SETTINGS_PATH.tmp" && mv "$CLINE_SETTINGS_PATH.tmp" "$CLINE_SETTINGS_PATH"
        else
            # No jq - backup and recreate (preserving is hard without jq)
            cp "$CLINE_SETTINGS_PATH" "$CLINE_SETTINGS_PATH.bak"
            echo "  ! jq not found - backed up existing settings to cline_mcp_settings.json.bak"
            cat > "$CLINE_SETTINGS_PATH" << SSEEOF
{
  "mcpServers": {
    "jira": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/jira" },
    "confluence": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/confluence" },
    "testrail": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/testrail" },
    "azuredevops": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/azuredevops" },
    "playwright": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/playwright" },
    "sonarqube": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/sonarqube" }
  }
}
SSEEOF
        fi
    else
        # Create new settings file
        cat > "$CLINE_SETTINGS_PATH" << SSEEOF
{
  "mcpServers": {
    "jira": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/jira" },
    "confluence": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/confluence" },
    "testrail": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/testrail" },
    "azuredevops": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/azuredevops" },
    "playwright": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/playwright" },
    "sonarqube": { "type": "sse", "url": "http://localhost:$MCP_PORT/sse/sonarqube" }
  }
}
SSEEOF
    fi

    echo "  + MCP servers registered (SSE on port $MCP_PORT):"
    echo "      jira, confluence, testrail, azuredevops, playwright, sonarqube"
    echo "  + Cline MCP settings: $CLINE_SETTINGS_PATH"

    # --- Step 3: Copy MCP workflows to target repo ---
    for workflow in mcp-start.md mcp-setup.md; do
        src_path="$SCRIPT_DIR/cline-templates/$workflow"
        dest_path="$WORKFLOWS_DIR/$workflow"
        if [ -f "$src_path" ]; then
            cp "$src_path" "$dest_path"
            echo "  + workflows/$workflow"
        fi
    done

    # --- Step 4: Record plugin path for mcp-start to find the server ---
    PLUGIN_MCP_DIR="$SCRIPT_DIR/plugins/agent-orch/mcp"
    if [ -d "$PLUGIN_MCP_DIR" ]; then
        echo "$PLUGIN_MCP_DIR" > "$CLINE_SETTINGS_DIR/mcp-plugin-path.txt"
        echo "  + MCP server path recorded"
    fi
fi

# ============================================
# Summary
# ============================================
echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "Installed to: $TARGET_REPO"
echo ""
echo "Structure created:"
echo "  .clinerules/"
echo "  ├── *.md              (rules: conventions, policies)"
echo "  ├── workflows/        (user-invokable commands)"
echo "  ├── skills/           (specialized agents)"
echo "  └── hooks/            (Cline hooks)"
echo "  AGENTS.md             (overview)"
echo ""
echo "Available workflows (type / in Cline):"
echo "  /build.md             Multi-agent implementation"
echo "  /implement.md         Spec-kit implementation"
echo "  /analyse.md           Codebase analysis"
echo "  /setup-cline-rules.md Set up hierarchical rules"
echo ""
if [ "$INCLUDE_MCP" = "true" ]; then
    echo "MCP Configuration:"
    echo "  Credentials: (Cline settings)/mcp-config.json"
    echo ""
    echo "  1. Edit mcp-config.json with your API tokens"
    echo "  2. Set 'enabled: true' for services you want to use"
    echo "  3. Start the MCP server (see README for instructions)"
    echo "  4. Restart Cline to connect via SSE"
    echo ""
    echo "  Token guides:"
    echo "    Jira/Confluence: https://id.atlassian.com/manage-profile/security/api-tokens"
    echo "    TestRail: My Settings > API Keys"
    echo "    Azure DevOps: https://dev.azure.com/{org}/_usersSettings/tokens"
    echo ""
fi
echo "Next: Open VS Code with Cline and type /build.md to start!"
echo ""
