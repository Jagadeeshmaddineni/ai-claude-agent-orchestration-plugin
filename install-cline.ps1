# Claude Agent Orchestration - Cline Installer
# Usage: .\install-cline.ps1 [-TargetRepo <path>]
#
# Installs the agent orchestration pack for Cline (VS Code extension).
# This creates the same capabilities as the Claude plugin but for Cline users.

param(
    [string]$TargetRepo = (Get-Location).Path,
    [switch]$IncludeMcp,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginDir = Join-Path $ScriptDir "plugins\agent-orch"

Write-Host "========================================"
Write-Host "  Agent Orchestration - Cline Installer"
Write-Host "========================================"
Write-Host ""

# Verify plugin source exists
if (-not (Test-Path $PluginDir)) {
    Write-Host "Error: Plugin source not found at: $PluginDir" -ForegroundColor Red
    Write-Host "Make sure you're running from the claude-agent-orchestration-plugin directory."
    exit 1
}

# Verify target repo
if (-not (Test-Path $TargetRepo)) {
    Write-Host "Error: Target repo not found: $TargetRepo" -ForegroundColor Red
    exit 1
}

Write-Host "Source:  $PluginDir"
Write-Host "Target:  $TargetRepo"
Write-Host ""

# Check if already installed
$clinerules = Join-Path $TargetRepo ".clinerules"
if ((Test-Path $clinerules) -and -not $Force) {
    Write-Host "Found existing .clinerules/ folder." -ForegroundColor Yellow
    $response = Read-Host "Overwrite? (y/n)"
    if ($response -ne "y") {
        Write-Host "Cancelled."
        exit 0
    }
}

Write-Host "Installing agent orchestration for Cline..."
Write-Host ""

# Create directory structure
$dirs = @(
    ".clinerules",
    ".clinerules\workflows",
    ".clinerules\skills",
    ".clinerules\hooks"
)

foreach ($dir in $dirs) {
    $path = Join-Path $TargetRepo $dir
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
    }
}

# ============================================
# 1. Copy skills -> workflows (flat files)
#    These are the user-invokable entry points
# ============================================
Write-Host "Creating workflows (user-invokable commands)..."

$skillsDir = Join-Path $PluginDir "skills"
$workflowsDir = Join-Path $TargetRepo ".clinerules\workflows"

if (Test-Path $skillsDir) {
    $skillFolders = Get-ChildItem -Path $skillsDir -Directory
    foreach ($folder in $skillFolders) {
        $skillFile = Join-Path $folder.FullName "SKILL.md"
        if (Test-Path $skillFile) {
            $destFile = Join-Path $workflowsDir "$($folder.Name).md"
            Copy-Item $skillFile $destFile -Force
            Write-Host "  + workflows/$($folder.Name).md"
        }
    }
}

# ============================================
# 2. Copy agents -> skills (folder structure)
#    These are the specialized worker agents
# ============================================
Write-Host ""
Write-Host "Creating skills (specialized agents)..."

$agentsDir = Join-Path $PluginDir "agents"
$clineSkillsDir = Join-Path $TargetRepo ".clinerules\skills"

if (Test-Path $agentsDir) {
    $agentFiles = Get-ChildItem -Path $agentsDir -Filter "*.md"
    foreach ($agent in $agentFiles) {
        # Create folder structure for each agent (Cline skill format)
        $skillName = $agent.BaseName
        $skillFolder = Join-Path $clineSkillsDir $skillName
        New-Item -ItemType Directory -Force -Path $skillFolder | Out-Null

        $destFile = Join-Path $skillFolder "SKILL.md"
        Copy-Item $agent.FullName $destFile -Force
        Write-Host "  + skills/$skillName/SKILL.md"
    }
}

# ============================================
# 3. Copy conventions -> rules (root)
#    Language-specific coding standards
# ============================================
Write-Host ""
Write-Host "Creating rules (conventions, policies)..."

$conventionsDir = Join-Path $PluginDir "conventions"
if (Test-Path $conventionsDir) {
    $convFiles = Get-ChildItem -Path $conventionsDir -Filter "*.md"
    foreach ($conv in $convFiles) {
        $destFile = Join-Path $clinerules "convention-$($conv.Name)"
        Copy-Item $conv.FullName $destFile -Force
        Write-Host "  + convention-$($conv.Name)"
    }
}

# ============================================
# 4. Copy rules -> rules (root)
#    Always-loaded rules like persona
# ============================================
$rulesDir = Join-Path $PluginDir "rules"
if (Test-Path $rulesDir) {
    $ruleFiles = Get-ChildItem -Path $rulesDir -Filter "*.md"
    foreach ($rule in $ruleFiles) {
        $destFile = Join-Path $clinerules $rule.Name
        Copy-Item $rule.FullName $destFile -Force
        Write-Host "  + $($rule.Name)"
    }
}

# ============================================
# 5. Copy policies -> rules (root)
#    Policy documents
# ============================================
$policiesDir = Join-Path $PluginDir "policies"
if (Test-Path $policiesDir) {
    $policyFiles = Get-ChildItem -Path $policiesDir -Filter "*.md"
    foreach ($policy in $policyFiles) {
        $destFile = Join-Path $clinerules "policy-$($policy.Name)"
        Copy-Item $policy.FullName $destFile -Force
        Write-Host "  + policy-$($policy.Name)"
    }
}

# ============================================
# 6. Create hooks (Cline format)
#    PreToolUse hook for commit validation (governance)
# ============================================
Write-Host ""
Write-Host "Creating hooks..."

$hooksDir = Join-Path $TargetRepo ".clinerules\hooks"

# PreToolUse hook - validates git commits have Co-authored-by trailer
# NOTE: Cline calls this for EVERY tool, so we exit silently for non-git-commit tools
$preToolUseContent = @(
    '# Agent Orchestration - PreToolUse Hook'
    '# Validates that git commits include the Co-authored-by trailer'
    '# This enforces AI code governance policy'
    '#'
    '# NOTE: This hook runs for ALL tool calls in Cline (no tool-type filtering).'
    '# We exit silently for non-git-commit tools to avoid noisy output.'
    ''
    'param([Parameter(ValueFromPipeline)]$inputJson)'
    ''
    'try {'
    '    $input = $inputJson | ConvertFrom-Json -ErrorAction Stop'
    '} catch {'
    '    # Invalid JSON - allow through silently'
    '    exit 0'
    '}'
    ''
    '# Get the tool name and command'
    '$toolName = $input.tool'
    '$command = $input.input.command'
    ''
    '# Only check execute_command tool with git commit - exit silently otherwise'
    'if ($toolName -ne "execute_command" -or -not $command -or $command -notmatch "git commit") {'
    '    # Exit silently - Cline interprets exit 0 with no output as "allow"'
    '    exit 0'
    '}'
    ''
    '# Skip amend commits'
    'if ($command -match "--amend") {'
    '    exit 0'
    '}'
    ''
    '# Check for Co-authored-by trailer'
    'if ($command -notmatch "Co-authored-by:") {'
    '    # Only output JSON when we need to BLOCK the action'
    '    @{'
    '        cancel = $true'
    '        errorMessage = "AI Code Governance: Commits must include Co-authored-by trailer. Add to commit message: Co-authored-by: Claude <noreply@anthropic.com>"'
    '    } | ConvertTo-Json'
    '    exit 1'
    '}'
    ''
    '# Trailer present - allow commit silently'
    'exit 0'
)

$preToolUsePath = Join-Path $hooksDir "PreToolUse.ps1"
$preToolUseContent | Out-File -FilePath $preToolUsePath -Encoding utf8 -Force
Write-Host "  + hooks/PreToolUse.ps1 (commit validation)"

# ============================================
# 7. Create AGENTS.md (plugin overview)
# ============================================
Write-Host ""
Write-Host "Creating AGENTS.md..."

$agentsMdContent = @(
    '# Agent Orchestration for Cline'
    ''
    'Multi-agent orchestration with 25 specialized agents, TDD enforcement, comprehensive test coverage, two-stage code review, verification gates, and systematic debugging.'
    ''
    '## Quick Start'
    ''
    'Type `/` in Cline chat to see available workflows:'
    ''
    '| Workflow | Description |'
    '|----------|-------------|'
    '| `/build.md` | Multi-agent implementation WITHOUT spec-kit |'
    '| `/implement.md` | Multi-agent implementation WITH spec-kit |'
    '| `/analyse.md` | Multi-agent codebase analysis |'
    '| `/c4.md` | Generate C4 architecture documentation |'
    '| `/olly.md` | Add OpenTelemetry observability |'
    '| `/jira.md` | Jira issue operations |'
    '| `/jira-work.md` | Find and work on Jira issues |'
    '| `/simplify.md` | Code simplification review |'
    '| `/mcp-setup.md` | Configure MCP server credentials |'
    '| `/mcp-start.md` | Start the MCP server |'
    '| `/setup-cline-rules.md` | Set up hierarchical rules structure |'
    ''
    '## Available Agents (Skills)'
    ''
    '### Core Agents'
    '| Agent | Role |'
    '|-------|------|'
    '| `orchestrate-architect` | Research & Planning |'
    '| `orchestrate-builder` | Core Implementation (TDD) |'
    '| `orchestrate-validator` | Comprehensive Testing |'
    '| `orchestrate-debugger` | Systematic Debugging |'
    ''
    '### Review Agents'
    '| Agent | Role |'
    '|-------|------|'
    '| `orchestrate-quality-reviewer` | Code Quality Review |'
    '| `orchestrate-spec-reviewer` | Spec Compliance Review |'
    '| `orchestrate-security` | Security Review |'
    ''
    '### Documentation Agents'
    '| Agent | Role |'
    '|-------|------|'
    '| `orchestrate-scribe` | Documentation |'
    '| `orchestrate-c4-scribe` | C4 Architecture Docs |'
    '| `orchestrate-content-specialist` | Content Creation |'
    ''
    '### Specialist Agents'
    '| Agent | Role |'
    '|-------|------|'
    '| `orchestrate-api` | API Design |'
    '| `orchestrate-database` | Database Operations |'
    '| `orchestrate-devops` | CI/CD & Infrastructure |'
    '| `orchestrate-performance` | Performance Optimization |'
    '| `orchestrate-refactorer` | Code Refactoring |'
    '| `orchestrate-migration` | Upgrades & Migrations |'
    '| `orchestrate-uiux` | UI/UX Implementation |'
    '| `orchestrate-telemetry` | Observability |'
    '| `orchestrate-observability` | Monitoring & Alerts |'
    '| `orchestrate-data-engineer` | Data Pipelines |'
    '| `orchestrate-ml-engineer` | ML/AI Implementation |'
    '| `orchestrate-legacy-modernizer` | Legacy Code Updates |'
    '| `orchestrate-incident-responder` | Incident Management |'
    '| `orchestrate-jira-triage` | Jira Issue Triage |'
    '| `orchestrate-advocate` | Developer Advocacy |'
    ''
    '## MCP Services'
    ''
    'Run `/mcp-setup.md` to configure: Jira, Confluence, TestRail, Azure DevOps, Playwright, SonarQube'
    ''
    '## Conventions'
    ''
    'Language-specific standards loaded automatically: csharp, typescript, python, go, rust, java, javascript'
    ''
    '---'
    ''
    '**Version:** 2.12.0 (Cline port)'
    '**Source:** https://code.ssnc.dev/ai/claude-agent-orchestration-plugin'
)

$agentsMdPath = Join-Path $TargetRepo "AGENTS.md"
$agentsMdContent | Out-File -FilePath $agentsMdPath -Encoding utf8 -Force
Write-Host "  + AGENTS.md"

# ============================================
# 8. Create setup-cline-rules workflow (full version)
# ============================================
Write-Host ""
Write-Host "Creating setup-cline-rules workflow..."

$setupRulesTemplate = Join-Path $ScriptDir "cline-templates\setup-cline-rules.md"
$setupRulesPath = Join-Path $workflowsDir "setup-cline-rules.md"

if (Test-Path $setupRulesTemplate) {
    Copy-Item $setupRulesTemplate $setupRulesPath -Force
    Write-Host "  + workflows/setup-cline-rules.md (full template)"
} else {
    # Fallback to minimal version if template not found
    $setupRulesContent = @(
        '---'
        'name: setup-cline-rules'
        'description: Sets up a hierarchical .clinerules structure. Usage: /setup-cline-rules.md'
        '---'
        ''
        '# Setup Hierarchical Rules for Cline'
        ''
        'Run this workflow to set up optimized rules structure for your project.'
        'See the full documentation in the plugin repository.'
    )
    $setupRulesContent | Out-File -FilePath $setupRulesPath -Encoding utf8 -Force
    Write-Host "  + workflows/setup-cline-rules.md (minimal)"
}

# ============================================
# 9. Optional: MCP configuration (SSE-based)
# ============================================
if ($IncludeMcp) {
    Write-Host ""
    Write-Host "Configuring MCP (SSE transport)..."

    # Default port
    $mcpPort = 13999

    # Cline settings directory (same location as cline_mcp_settings.json)
    $clineSettingsDir = Join-Path $env:APPDATA "Code\User\globalStorage\saoudrizwan.claude-dev\settings"

    # Ensure directory exists
    if (-not (Test-Path $clineSettingsDir)) {
        New-Item -ItemType Directory -Force -Path $clineSettingsDir | Out-Null
    }

    # --- Step 1: Create credentials template in Cline's settings directory ---
    $mcpConfigPath = Join-Path $clineSettingsDir "mcp-config.json"
    if (-not (Test-Path $mcpConfigPath)) {
        # Write clean JSON without PowerShell's weird formatting
        $jsonContent = @"
{
  "port": $mcpPort,
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
"@
        [System.IO.File]::WriteAllText($mcpConfigPath, $jsonContent)
        Write-Host "  + $clineSettingsDir\mcp-config.json (credentials)"
    } else {
        Write-Host "  ~ mcp-config.json (already exists, preserving)"
        # Read existing port if available
        try {
            $existingConfig = Get-Content $mcpConfigPath -Raw | ConvertFrom-Json
            if ($existingConfig.port) {
                $mcpPort = $existingConfig.port
            }
        } catch {}
    }

    # --- Step 2: Register SSE servers in Cline's global settings ---
    $clineSettingsPath = Join-Path $clineSettingsDir "cline_mcp_settings.json"

    # Load existing settings or create new
    $clineSettings = @{ mcpServers = @{} }
    if (Test-Path $clineSettingsPath) {
        try {
            $clineSettings = Get-Content $clineSettingsPath -Raw | ConvertFrom-Json -AsHashtable
            if (-not $clineSettings.mcpServers) {
                $clineSettings.mcpServers = @{}
            }
        } catch {
            $clineSettings = @{ mcpServers = @{} }
        }
    }

    # Add SSE servers (preserving existing entries)
    $sseServers = @{
        "jira" = @{
            type = "sse"
            url = "http://localhost:$mcpPort/sse/jira"
        }
        "confluence" = @{
            type = "sse"
            url = "http://localhost:$mcpPort/sse/confluence"
        }
        "testrail" = @{
            type = "sse"
            url = "http://localhost:$mcpPort/sse/testrail"
        }
        "azuredevops" = @{
            type = "sse"
            url = "http://localhost:$mcpPort/sse/azuredevops"
        }
        "playwright" = @{
            type = "sse"
            url = "http://localhost:$mcpPort/sse/playwright"
        }
        "sonarqube" = @{
            type = "sse"
            url = "http://localhost:$mcpPort/sse/sonarqube"
        }
    }

    foreach ($server in $sseServers.GetEnumerator()) {
        $clineSettings.mcpServers[$server.Key] = $server.Value
        Write-Host "  + MCP server: $($server.Key) (SSE on port $mcpPort)"
    }

    # Write updated settings (UTF-8 without BOM for JSON compatibility)
    $jsonContent = $clineSettings | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($clineSettingsPath, $jsonContent)
    Write-Host "  + Cline MCP settings updated"

    # --- Step 3: Copy MCP workflows to target repo ---
    $mcpWorkflows = @("mcp-start.md", "mcp-setup.md")
    foreach ($workflow in $mcpWorkflows) {
        $srcPath = Join-Path $ScriptDir "cline-templates\$workflow"
        $destPath = Join-Path $workflowsDir $workflow
        if (Test-Path $srcPath) {
            Copy-Item $srcPath $destPath -Force
            Write-Host "  + workflows/$workflow"
        }
    }

    # --- Step 4: Record plugin path for mcp-start to find the server ---
    $pluginPathFile = Join-Path $clineSettingsDir "mcp-plugin-path.txt"
    $pluginMcpDir = Join-Path $ScriptDir "plugins\agent-orch\mcp"
    if (Test-Path $pluginMcpDir) {
        [System.IO.File]::WriteAllText($pluginPathFile, $pluginMcpDir)
        Write-Host "  + MCP server path recorded"
    }
}

# ============================================
# Summary
# ============================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installed to: $TargetRepo"
Write-Host ""
Write-Host "Structure:"
Write-Host "  .clinerules/"
Write-Host "  |- *.md           (rules)"
Write-Host "  |- workflows/     (commands)"
Write-Host "  |- skills/        (agents)"
Write-Host "  |- hooks/"
Write-Host "  AGENTS.md"
Write-Host ""
Write-Host "Workflows: /build.md, /implement.md, /analyse.md"
Write-Host ""
if ($IncludeMcp) {
    Write-Host "MCP Configuration:" -ForegroundColor Yellow
    Write-Host "  Credentials: %APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\mcp-config.json"
    Write-Host ""
    Write-Host "  1. Edit mcp-config.json with your API tokens"
    Write-Host "  2. Set 'enabled: true' for services you want to use"
    Write-Host "  3. Start the MCP server (see README for instructions)"
    Write-Host "  4. Restart Cline to connect via SSE"
    Write-Host ""
    Write-Host "  Token guides:"
    Write-Host "    Jira/Confluence: https://id.atlassian.com/manage-profile/security/api-tokens"
    Write-Host "    TestRail: My Settings > API Keys"
    Write-Host "    Azure DevOps: https://dev.azure.com/{org}/_usersSettings/tokens"
    Write-Host ""
}
Write-Host "Next: Open VS Code with Cline and type /build.md" -ForegroundColor Cyan
Write-Host ""
