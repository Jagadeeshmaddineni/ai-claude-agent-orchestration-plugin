---
name: init-plugin
description: Single entry-point wizard -- discover, select, and configure plugins for your team and domain. Health-checks CLAUDE.md, discovers plugins from catalog, configures orchestration layer, and sets up hierarchical CLAUDE.md. Usage: /agent-orch:init-plugin
---

# Init Plugin Wizard

A single entry-point skill that health-checks your CLAUDE.md hierarchy, discovers what plugin(s) you need, configures the orchestration layer for your team and domain, and sets up the CLAUDE.md hierarchy for optimal agent context loading.

## Design Principles

- **Orchestration is the product; opinions are plugins.** The agent coordination engine (spec-driven builds, verification gates, multi-agent teams) is the invariant. Everything else is swappable.
- **Per-repo, not per-user.** Plugin configuration lives in the repository/directory so different repos get different agent behaviors.
- **Discovery-first.** Don't make users memorize plugin names. Let them describe what they need and find it.
- **Wizard, not wall-of-text.** One question at a time, with smart defaults and recommendations.
- **Healthy CLAUDE.md is a precondition.** Both `/init-plugin` and `/upgrade-plugin` run `setup-claude-md` as a health check before doing anything, and again at the end.
- **Upgrade-aware from day one.** Every structure created by `/init-plugin` is designed so `/upgrade-plugin` can maintain it.

---

## Layered Plugin Model

```
┌─────────────────────────────────────────────────────┐
│  Invariant Core (agent-orch)                        │
│  /build, /implement, multi-agent coordination,      │
│  verification gates, two-stage review, TDD, sessions│
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  Domain Plugin Layer (swappable)                    │
│  Persona, Conventions, Rules, Hooks, MCP, Governance│
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  Per-Repo Configuration                             │
│  CLAUDE.md, .claude/rules/, .claude/plugins.json    │
└─────────────────────────────────────────────────────┘
```

### What's Core vs. What's Pluggable

| Concern | Core (always present) | Pluggable (per-team) |
|---------|----------------------|---------------------|
| **Workflow** | /build, /implement, spec-driven | Skill customizations, domain-specific steps |
| **Agents** | Architect, Builder, Validator, Scribe, Debugger, Spec Reviewer, Quality Reviewer | Specialist agents (Security, DevOps, DB, API, UI/UX, etc.) |
| **Verification** | Evidence-based gates, no claims accepted | What constitutes "evidence" per domain |
| **Review** | Two-stage (spec compliance + quality) | Review criteria, quality standards |
| **TDD** | RED-GREEN-REFACTOR cycle | What "test" means (unit test? contract review? compliance check?) |
| **Persona** | Base professional standards | Domain expertise (ISC2, legal bar, sales methodology) |
| **Conventions** | None by default | Language/framework/domain conventions |
| **Rules** | None by default | Security, compliance, data handling, etc. |
| **Hooks** | AI code governance (Co-authored-by) | Domain-specific validation hooks |
| **MCP** | None by default | Jira, Confluence, Salesforce, TestRail, etc. |

---

## Process

### Phase 0: Health Check (run setup-claude-md first)

Before anything else, run `setup-claude-md` in **validation mode** to ensure the CLAUDE.md hierarchy is healthy.

**Steps:**

1. Check if `.claude/` directory exists
2. Check if `.claude/rules/` exists
3. Check if `CLAUDE.md` exists and whether it's monolithic (>100 lines) or lean
4. Check if `.claude/plugins.json` exists (indicates previous init)

**Present results:**

```
Running CLAUDE.md health check...

  [ok] .claude/ directory exists
  [ok] .claude/rules/ exists (or will be created)
  [--] No CLAUDE.md found (will be created during Phase 5)
  [--] No .claude/plugins.json found (first-time init)
```

**If issues are found:**

```
Found 2 issues:
  [!!] CLAUDE.md is monolithic (312 lines, ~24k tokens)
  [!!] No .claude/rules/ directory

Fix these before continuing? (yes / skip / details)
```

- **yes**: Run `setup-claude-md` in migration/repair mode. Wait for completion before proceeding.
- **skip**: Continue with a warning that agent context loading may be suboptimal.
- **details**: Show what's expected vs. what's present, then ask again.

**If `.claude/plugins.json` already exists:**

```
This repo already has plugins configured:
  - agent-orch v2.12.0 (orchestrator, installed 2026-03-15)
  - ssc-devops v0.2.0 (overlay, installed 2026-03-20)

Options:
(a) Add another plugin to this repo
(b) Reconfigure from scratch (will back up existing config)
(c) Cancel -- use /upgrade-plugin to update existing plugins
```

- **(a)**: Skip to Phase 2 (plugin selection), preserve existing config.
- **(b)**: Back up `.claude/plugins.json` to `.claude/plugins.json.bak`, then start fresh.
- **(c)**: Exit.

---

### Phase 1: Detect Context (automatic, no user interaction)

Before asking the user anything, silently gather:

1. **Tech stack detection** -- scan for:
   - `pom.xml` → Java
   - `package.json` / `tsconfig.json` → TypeScript/JavaScript
   - `requirements.txt` / `pyproject.toml` → Python
   - `go.mod` → Go
   - `*.tf` → Terraform
   - `Cargo.toml` → Rust
   - `*.sln` / `*.csproj` → C#
   - `build.gradle` / `build.gradle.kts` → Java/Kotlin
   - Detect framework (Next.js, Express, FastAPI, Django, Spring Boot, etc.)

2. **Existing configuration** -- check for:
   - `CLAUDE.md` (root)
   - `.claude/rules/` directory and contents
   - `.claude/plugins.json`
   - `.gids/` or other governance directories
   - `.conventions/convention.md`

3. **Git remote** -- detect org/team from remote URL for catalog filtering:
   ```bash
   git remote get-url origin 2>/dev/null
   ```
   Parse the remote to extract org/group (e.g., `code.ssnc.dev/globeop/portfolio-ui` → `globeop`)

4. **Installed plugins** -- read `.claude-plugin/marketplace.json` if it exists to detect if this repo IS a plugin

**Present a one-line summary:**

```
Detected: TypeScript/React project, no existing CLAUDE.md, git remote: code.ssnc.dev/globeop/portfolio-ui
```

---

### Phase 2: Plugin Selection (interactive wizard)

**CRITICAL**: Ask questions ONE AT A TIME. Never present multiple questions simultaneously.

**Question 1: What kind of work?**

```
What kind of work does this repository support?

(a) Software engineering (code, APIs, infrastructure) -- use agent-orch defaults
(b) I know the plugin I want -- enter name or URL
(c) Help me find the right plugin -- describe what you need
(d) Browse the plugin catalog
```

#### Path (a): Agent-orch defaults

Skip plugin discovery entirely. Apply the current agent-orch opinions (ISC2 persona, engineering conventions, security rules) as-is.

This is the fast path for engineering teams that just want multi-agent orchestration with sensible defaults.

**Actions:**
1. Set the plugin list to just `agent-orch` (the core orchestrator)
2. Skip Phase 3 (plugin configuration)
3. Jump directly to Phase 4 (store upstream snapshot)

#### Path (b): Direct plugin entry

```
Enter the plugin name or git URL:
>
```

**If it looks like a git URL** (contains `git@`, `https://`, or `.git`):
1. Clone to temp directory: `git clone --depth 1 <url> /tmp/init-plugin-direct-${TIMESTAMP}`
2. Validate it has `.claude-plugin/` structure with `marketplace.json` or `plugin.json`
3. Read plugin metadata (name, version, description, capabilities)
4. If valid: present confirmation (Phase 2 Step: Confirm)
5. If invalid: "This doesn't look like a Claude Code plugin (no .claude-plugin/ directory). Check the URL and try again."
6. Clean up temp directory

**If it's a name** (no URL markers):
1. Search the discovery catalog (see [Catalog Search](#catalog-search) below)
2. If single exact match: present confirmation
3. If multiple matches: present list for selection
4. If no matches: "No plugin found matching '[name]'. Try (c) to describe what you need, or (d) to browse."

**If multiple matches found:**

```
Found 3 plugins matching "devops":

1. ssc-devops (GlobeOp/Infrastructure)
   Deploy, monitor, and secure SS&C Cloud workloads
   Stack: Python, Ansible, Terraform | 5 skills, 0 agents

2. platform-devops (Technology/Platform)
   Kubernetes and Helm deployment orchestration
   Stack: Go, Terraform, Helm | 3 skills, 2 agents

3. agent-orch (Technology/AI Governance)
   Multi-agent orchestration with 25 specialist agents
   Stack: All languages | 16 skills, 25 agents

Select a plugin (1-3), or (s) search again:
```

#### Path (c): Conversational search

```
Describe what your team does and what you need help with:
>
```

Use the discovery catalog's weighted scoring algorithm (see [Catalog Search](#catalog-search)).

Augment with the detected tech stack from Phase 1 for implicit stack matching.

Present top 5 results conversationally with recommendations:

```
Based on what you described, I'd recommend:

1. **ssc-devops** (best match - 12 points)
   Built for infrastructure teams managing SS&C Cloud deployments.
   Has skills for deploy, monitor, security scanning, and CI/CD.
   Your Terraform files align with its stack.

2. **agent-orch** (good match - 8 points)
   General-purpose multi-agent orchestration.
   Has 25 specialist agents including DevOps, Security, and Database.
   More agents but less infrastructure-specific.

Would you like to:
(a) Select one of these (enter number)
(b) See more details about a specific plugin
(c) Search with different terms
(d) Browse the full catalog instead
```

#### Path (d): Browse catalog

Hierarchical drill-down through the discovery catalog's directory structure:

```
catalog/
├── technology/
│   ├── ai-governance/ (2 plugins)
│   ├── platform/ (3 plugins)
│   └── data-engineering/ (1 plugin)
├── operations/
│   ├── globeop/ (4 plugins)
│   └── fund-admin/ (2 plugins)
├── legal/
│   └── compliance/ (1 plugin)
└── sales/
    └── client-onboarding/ (1 plugin)

Enter a division to browse, or (a) show all plugins:
```

When the user selects a division, show plugins in that division:

```
operations/globeop/ (4 plugins):

1. ssc-devops v0.2.0
   Deploy, monitor, and secure SS&C Cloud workloads
   Stack: Python, Ansible, Terraform

2. portfolio-ops v1.0.0
   Portfolio operations automation
   Stack: Python, SQL

3. nav-tooling v0.3.0
   NAV calculation and reconciliation tools
   Stack: Python, C#

4. client-reporting v0.1.0
   Client report generation and distribution
   Stack: TypeScript, React

Select a plugin (1-4), (b) go back, or (s) search:
```

#### Confirm Plugin Selection

After a plugin is selected from any path:

```
Plugin: ssc-devops v0.2.0
By: GlobeOp Infrastructure Team

Capabilities:
  5 skills (deploy, monitor, security, cicd, troubleshoot)
  3 rules (infra-standards, naming-conventions, cost-tagging)
  2 hooks (terraform-plan-gate, secret-detection)
  1 MCP integration (Confluence for architecture docs)
  2 conventions (python, terraform)
  0 custom agents (uses agent-orch core agents)

Proceed with this plugin?
(a) Yes -- configure it
(b) Browse more
(c) Search again
(d) Cancel
```

- **(a)**: Continue to Phase 3.
- **(b)**: Return to browse.
- **(c)**: Return to conversational search.
- **(d)**: Exit.

---

### Catalog Search

The wizard uses the SS&C Plugin Discovery service at `git@code.ssnc.dev:ai/code-plugin-discovery.git` as its catalog backend.

#### Clone Catalog

```bash
TIMESTAMP=$(date +%s)
CATALOG_DIR="/tmp/init-plugin-catalog-${TIMESTAMP}"
git clone --depth 1 git@code.ssnc.dev:ai/code-plugin-discovery.git ${CATALOG_DIR}
```

**If clone fails** (no SSH access, repo not found):

```
Could not access the plugin catalog at code.ssnc.dev.

Options:
(a) Enter a plugin git URL directly
(b) Use agent-orch defaults (software engineering)
(c) Cancel

Troubleshooting:
- Ensure SSH key is loaded: ssh-add -l
- Test access: ssh -T git@code.ssnc.dev
```

#### Catalog Structure

```
code-plugin-discovery/
└── catalog/
    └── [division]/
        └── [business-unit]/
            └── [team]/
                └── [plugin-name]/
                    └── plugin.md    # YAML frontmatter + markdown body
```

#### Plugin Manifest Schema (plugin.md)

Each plugin in the catalog has YAML frontmatter:

```yaml
name: plugin-name
display_name: "Human Readable Name"
description: "What it does"
repo: git@code.ssnc.dev:group/repo.git
version: "1.2.3"
owner: "Team <email>"
tags: [orchestration, security, aws]
stack:
  languages: [typescript, python]
  frameworks: [react, fastapi]
  cloud: [aws]
  infrastructure: [terraform, kubernetes]
capabilities:
  agents:
    - name: security-auditor
      description: Reviews for OWASP vulnerabilities
  skills:
    - name: deploy
      description: Deploy to staging or production
  rules:
    - name: no-secrets.md
      description: Prevents hardcoded secrets
  hooks:
    - event: PreToolUse
      description: Validates terraform commands
  mcp:
    - name: jira-server
      description: Jira integration
```

#### Search Algorithm

Index all `plugin.md` files in the catalog. For each query term, score against:

| Signal | Weight | Example |
|--------|--------|---------|
| Tag match | 3 | User searches "security", plugin tagged "security" |
| Capability name match | 3 | User searches "deploy", plugin has skill named "deploy" |
| Description match | 2 | User searches "terraform", description mentions "Terraform" |
| Capability type match | 2 | User wants "agents", plugin has agents |
| Tech stack match | 1 | User's repo has `package.json`, plugin supports TypeScript |
| Body content match | 1 | Keyword found in markdown body |

Sum all scores across query terms. Sort plugins by total score descending. Present top 5.

#### Cleanup

After catalog operations are complete:

```bash
rm -rf ${CATALOG_DIR}
```

Always clean up the temp catalog directory, even on error.

---

### Phase 3: Plugin Configuration (interactive, plugin-driven)

Once a plugin is selected, this phase adapts based on what the plugin provides.

**CRITICAL**: Ask questions ONE AT A TIME.

#### Step 1: Clone Selected Plugin

If the plugin hasn't been cloned yet (came from catalog search, not direct URL):

```bash
PLUGIN_DIR="/tmp/init-plugin-source-${TIMESTAMP}"
git clone --depth 1 <plugin-repo-url> ${PLUGIN_DIR}
```

Read the plugin's structure:
- `.claude-plugin/marketplace.json` or `.claude-plugin/plugin.json` for metadata
- `plugins/*/agents/` for agent definitions
- `plugins/*/skills/` for skill definitions
- `plugins/*/rules/` for rule files
- `plugins/*/conventions/` for convention files
- `plugins/*/hooks/` for hook definitions
- `plugins/*/mcp/` for MCP configuration

#### Step 2: Show What the Plugin Will Set Up

```
Plugin: ssc-devops v0.2.0
By: GlobeOp Infrastructure Team

This plugin will configure:
  [x] 5 skills (deploy, monitor, security, cicd, troubleshoot)
  [x] 3 rules (infra-standards, naming-conventions, cost-tagging)
  [x] 2 hooks (terraform-plan-gate, secret-detection)
  [x] 1 MCP integration (Confluence for architecture docs)
  [x] 2 conventions (python, terraform)
  [ ] 0 agents (uses agent-orch core agents)

It will also create:
  .ssc-devops/              -- department governance files
  .claude/rules/            -- always-loaded standards
  CLAUDE.md                 -- project constitution

Proceed? (yes / customize / details / cancel)
```

- **yes**: Accept all defaults, proceed to Step 5.
- **customize**: Walk through each component (Steps 3-4).
- **details**: Show file-by-file list of what will be created, then ask again.
- **cancel**: Exit.

#### Step 3: Configure Governance Layer (if plugin has one)

Some plugins include department-specific instruction files (like `.gids/` for GIDS). If the selected plugin has a governance directory:

```
This plugin includes department governance files.
These tell agents when and how to follow your team's standards.

Configuring governance for: .ssc-devops/

  [x] coding-standards.md -- language-aware coding conventions
  [x] infra-standards.md -- infrastructure provisioning rules
  [x] compliance-check.md -- validates against team policies
  [ ] confluence-pages.md -- Confluence page registry (requires MCP auth)

Keep all, or customize? (keep / customize)
```

**If customize:**

Walk through each file ONE AT A TIME:

```
[1/4] coding-standards.md
  Purpose: Language-aware coding conventions for Python and Terraform
  Loaded by: Builder, Quality Reviewer
  Size: ~120 lines

Include this file? (yes / no / view)
```

#### Step 4: Configure MCP Integrations (if plugin has them)

```
This plugin uses Confluence for architecture documentation.

Configure MCP now?
(a) Yes -- set up .mcp.json (you'll need to authenticate after)
(b) Skip -- I'll configure MCP later
(c) I already have MCP configured
```

**If (a):**
1. Check if `.mcp.json` or `~/.claude/mcp-config.json` already exists
2. If exists: merge the plugin's MCP config with existing (don't overwrite)
3. If not exists: create from plugin's MCP template
4. Show authentication instructions at the end

**If (c):**
1. Check if the required MCP services are already configured
2. If yes: note "MCP already configured, skipping"
3. If no: warn "Expected [service] MCP config not found. Run /agent-orch:mcp-setup later."

#### Step 5: Plugin-Specific Questions (if plugin defines them)

Some plugins need additional context. Check the plugin's source for `settings.json` or `SKILL.md` files that define required configuration:

```
The ssc-devops plugin needs some configuration:

What SS&C Cloud environment do you deploy to? (dev/staging/prod):
>

What's your team's Confluence space key? (e.g., INFRA):
>
```

Store answers in `.claude-plugin/settings.json` in the project root:

```json
{
  "plugin": "ssc-devops",
  "settings": {
    "environment": "staging",
    "confluenceSpace": "INFRA"
  }
}
```

---

### Generate `.agent-orch-models.json`

After writing plugin metadata, generate the central model + commit-attribution config at the project root. This file is consumed by both Claude Code and OpenCode.

Write `.agent-orch-models.json` (see `.agent-orch-models.example.json` in the plugin repo for a template — or run `/agent-orch:config` for a guided setup that picks models from a list):

```json
{
  "$schema": "https://opencode.ai/agent-orch-models.schema.json",
  "commit_attribution": {
    "harness": "claude-code",
    "trailer_format": "Co-authored-by: {gh_user} + {harness}/{models} <{gh_user}@users.noreply.github.com>"
  },
  "aliases": {
    "thinking": "opus",
    "instruct": "sonnet"
  },
  "agents": {
    "orchestrate-advocate": "thinking",
    "orchestrate-architect": "thinking",
    "orchestrate-debugger": "thinking",
    "orchestrate-incident-responder": "thinking",
    "orchestrate-legacy-modernizer": "thinking",
    "orchestrate-quality-reviewer": "thinking",
    "orchestrate-spec-reviewer": "thinking",
    "orchestrate-api": "instruct",
    "orchestrate-builder": "instruct",
    "orchestrate-c4-scribe": "instruct",
    "orchestrate-content-specialist": "instruct",
    "orchestrate-data-engineer": "instruct",
    "orchestrate-database": "instruct",
    "orchestrate-devops": "instruct",
    "orchestrate-jira-triage": "instruct",
    "orchestrate-migration": "instruct",
    "orchestrate-ml-engineer": "instruct",
    "orchestrate-observability": "instruct",
    "orchestrate-performance": "instruct",
    "orchestrate-private-cloud": "instruct",
    "orchestrate-refactorer": "instruct",
    "orchestrate-scribe": "instruct",
    "orchestrate-security": "instruct",
    "orchestrate-telemetry": "instruct",
    "orchestrate-uiux": "instruct",
    "orchestrate-validator": "instruct"
  }
}
```

If the user is on OpenCode, recommend running `/agent-orch:config` instead — it presents a numbered picker of available models (via `opencode models`) and writes the config automatically. If they prefer to edit by hand, set the `aliases` to their full model IDs (e.g., `ssnc-gateway/zai-org/GLM-5.2-FP8`) and set `commit_attribution.harness` to `"opencode"`.

---

### Phase 4: Store Upstream Snapshot (for future upgrades)

Before applying the plugin configuration, store a pristine copy of the upstream plugin files. This snapshot becomes the **base** for three-way merges during `/upgrade-plugin`.

**CRITICAL**: This step is required for `/upgrade-plugin` to work. Do not skip.

#### Step 1: Create Snapshot Directories

For the core orchestrator (always):

```bash
mkdir -p .claude/plugins/agent-orch@<current-version>/
```

For the selected domain plugin (if any):

```bash
mkdir -p .claude/plugins/<plugin-name>@<plugin-version>/
```

#### Step 2: Copy Upstream Files

Copy the relevant files from the plugin source into the snapshot directory. Preserve the directory structure:

**For agent-orch:**

```
.claude/plugins/agent-orch@2.12.0/
├── agents/core/           (7 core agent files)
├── agents/specialists/    (specialist agent files)
├── rules/core/            (core rules only)
└── conventions/           (empty -- populated by domain plugin)
```

**For a domain plugin:**

```
.claude/plugins/ssc-devops@0.2.0/
├── rules/                 (plugin rule files)
├── conventions/           (plugin convention files)
└── hooks/                 (plugin hook files)
```

#### Step 3: Create plugins.json

Create or update `.claude/plugins.json`:

```json
{
  "schemaVersion": "1.0",
  "plugins": [
    {
      "name": "agent-orch",
      "source": "git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git",
      "version": "<current-agent-orch-version>",
      "role": "orchestrator",
      "installedAt": "<ISO-8601-timestamp>"
    }
  ]
}
```

If a domain plugin was selected, add it:

```json
{
  "schemaVersion": "1.0",
  "plugins": [
    {
      "name": "agent-orch",
      "source": "git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git",
      "version": "<current-agent-orch-version>",
      "role": "orchestrator",
      "installedAt": "<ISO-8601-timestamp>"
    },
    {
      "name": "<plugin-name>",
      "source": "<plugin-repo-url>",
      "version": "<plugin-version>",
      "role": "overlay",
      "installedAt": "<ISO-8601-timestamp>"
    }
  ]
}
```

**Present confirmation:**

```
Storing upstream snapshot for future upgrades...

  .claude/plugins/agent-orch@2.12.0/
  ├── agents/core/           (7 files)
  ├── agents/specialists/    (17 files)
  ├── rules/core/            (1 file)
  └── conventions/           (0 files)

  .claude/plugins/ssc-devops@0.2.0/
  ├── rules/                 (3 files)
  ├── conventions/           (2 files)
  └── hooks/                 (2 files)

  .claude/plugins.json updated with installed versions.
```

#### Step 4: Cleanup

Remove temp directories:

```bash
rm -rf /tmp/init-plugin-catalog-*
rm -rf /tmp/init-plugin-source-*
rm -rf /tmp/init-plugin-direct-*
```

---

### Phase 5: Run setup-claude-md (apply plugin context)

The final phase runs `setup-claude-md` again, this time **informed by the plugin selection**.

**CRITICAL**: Pass plugin context to setup-claude-md so it generates the right hierarchy.

#### Step 1: Determine Plugin Context

Build the plugin context object from the selected plugin(s):

| Parameter | Source | Example |
|-----------|--------|---------|
| `persona` | Plugin's persona file, or ISC2 default for engineering | `ISC2-certified Staff SWE` |
| `rules` | Plugin's rule files to install in `.claude/rules/` | `security-baseline.md`, `infra-standards.md` |
| `conventions` | Plugin's conventions + detected tech stack | `typescript.md`, `terraform.md` |
| `governance_dir` | Plugin's governance directory name | `.ssc-devops/` |
| `governance_files` | Files to create in governance directory | `coding-standards.md`, `infra-standards.md` |
| `mcp_config` | MCP services to reference | `Confluence` |

#### Step 2: Run setup-claude-md with Plugin Context

Invoke `setup-claude-md` with the plugin context. The skill should:

1. **Root CLAUDE.md** -- include references to the plugin's governance directory
2. **`.claude/rules/`** -- include the plugin's rules files, not just engineering defaults
3. **Subdirectory CLAUDE.md files** -- generate based on detected project structure AND the plugin's conventions
4. **Persona** -- set from the plugin, not hardcoded to ISC2

#### Step 3: Copy Plugin Files into Project

1. Copy plugin rule files to `.claude/rules/`:
   - Only copy files that don't already exist (don't overwrite user customizations)
   - If a file already exists, skip it and note "Skipped [file] (already exists)"

2. Copy plugin convention files:
   - If `.conventions/` directory exists in plugin: copy to project
   - Convention files are referenced by agents during build sessions

3. Create governance directory (if plugin has one):
   - Create the governance directory (e.g., `.ssc-devops/`, `.gids/`, `.legal/`)
   - Copy governance files from plugin source
   - These files are referenced by CLAUDE.md and loaded by agents

4. Copy plugin hook files:
   - Merge into existing `.claude/settings.json` hooks if present
   - Create hooks configuration if not present

#### Step 4: Present Final Summary

```
=== INIT-PLUGIN COMPLETE ===

Plugin: ssc-devops v0.2.0 (overlay) + agent-orch v2.12.0 (orchestrator)

Files created:
  CLAUDE.md                              -- lean root (47 lines)
  .claude/rules/infra-standards.md       -- infrastructure provisioning rules
  .claude/rules/naming-conventions.md    -- naming standards
  .claude/rules/cost-tagging.md          -- cost allocation tags
  .claude/plugins.json                   -- installed plugin metadata
  .claude/plugins/agent-orch@2.12.0/     -- upstream snapshot (25 files)
  .claude/plugins/ssc-devops@0.2.0/      -- upstream snapshot (7 files)
  .ssc-devops/                           -- department governance layer (4 files)

CLAUDE.md hierarchy:
  Root CLAUDE.md        -- ~2k tokens (lean)
  .claude/rules/        -- ~4k tokens (always loaded)
  Per-agent average     -- ~7,500 tokens

Ready for:
  /agent-orch:build           -- start building with configured agents
  /agent-orch:upgrade-plugin  -- check for plugin updates later
  /agent-orch:mcp-setup       -- configure MCP integrations (if skipped)

Next: Run /agent-orch:build to start your first implementation.
```

---

## Handling Multiple Plugins Per Repo

A repo can compose multiple plugins. Running `/init-plugin` when plugins already exist offers option (a) "Add another plugin."

When adding a second plugin:

1. Clone and configure as normal (Phases 2-3)
2. When storing the snapshot (Phase 4), append to existing `.claude/plugins.json`
3. When running setup-claude-md (Phase 5), merge rules from all plugins

**Merge strategy** is recorded in `.claude/plugins.json`:

```json
{
  "schemaVersion": "1.0",
  "mergeStrategy": "overlay",
  "plugins": [...]
}
```

| Strategy | Behavior |
|----------|----------|
| `overlay` (default) | Last plugin wins on conflict. Rules from all plugins are loaded. |
| `strict` | Error on conflict. User must resolve manually. |

If two plugins provide a rule with the same filename:

```
Conflict: Both agent-orch and ssc-devops provide a rule named
"naming-conventions.md".

(a) Keep agent-orch's version
(b) Keep ssc-devops's version
(c) Keep both (rename one: naming-conventions-devops.md)
(d) Show both and let me decide
```

---

## Examples: Same Orchestrator, Different Domains

### Engineering Team (current default, path a)

```
/agent-orch:init-plugin
> (a) Software engineering

Result:
  CLAUDE.md         -- references .claude/rules/ with ISC2 persona
  .claude/rules/    -- security-baseline, code-standards, testing-standards
  conventions/      -- typescript.md, python.md (detected from project)
  25 agents active  -- all specialists available
```

### Legal Team

```
/agent-orch:init-plugin
> (c) Help me find one
> "contract review and compliance checking for legal documents"

Result:
  CLAUDE.md         -- references .legal/ governance layer
  .claude/rules/    -- data-handling, PII-protection, retention-policy
  .legal/           -- contract-templates, review-gates, compliance-check
  conventions/      -- contract-review.md, regulatory-citation.md
  9 agents active   -- core 7 + content-specialist + quality-reviewer
  MCP: DocuSign     -- contract signing integration
```

### Infrastructure Team

```
/agent-orch:init-plugin
> (d) Browse catalog
> operations > globeop > infrastructure > ssc-devops

Result:
  CLAUDE.md         -- references .ssc-devops/ governance layer
  .claude/rules/    -- infra-standards, cost-tagging, naming-conventions
  .ssc-devops/      -- deploy-gates, monitoring-standards, runbook-templates
  conventions/      -- terraform.md, ansible.md, python.md
  12 agents active  -- core 7 + devops + security + database + observability + telemetry
  MCP: Confluence   -- architecture docs
```

---

## Edge Cases

### No SSH access to catalog

If `git clone` fails for the discovery catalog:
- Offer direct URL entry (path b)
- Offer agent-orch defaults (path a)
- Show SSH troubleshooting tips

### Repo is itself a plugin

If the repo has `.claude-plugin/marketplace.json`:

```
This repo IS a Claude Code plugin (marketplace: ssc-devops).

You probably want to configure this repo for plugin DEVELOPMENT, not end-user setup.

(a) Set up for plugin development (agent-orch defaults + this plugin's own rules)
(b) Set up as if this were a consumer repo (normal init)
(c) Cancel
```

### No git remote

If `git remote get-url origin` fails:

```
No git remote detected. Catalog filtering by org/team won't be available.
Continuing with full catalog access.
```

### Interrupted init (resume support)

If `.claude/plugins.json` exists but the init appears incomplete (e.g., snapshot exists but CLAUDE.md wasn't updated):

```
It looks like a previous /init-plugin was interrupted.

  .claude/plugins.json exists (agent-orch v2.12.0)
  .claude/plugins/agent-orch@2.12.0/ exists (snapshot)
  CLAUDE.md was NOT updated by setup-claude-md

(a) Resume from where it stopped (run setup-claude-md)
(b) Start fresh (back up existing config)
(c) Cancel
```

---

## Troubleshooting

### "Cannot access plugin catalog"

```
ssh-add -l                          # Check SSH key is loaded
ssh -T git@code.ssnc.dev           # Test SSH access
```

If SSH works but clone fails, the catalog repo may not exist yet. Use path (a) or (b).

### "Plugin has no .claude-plugin/ directory"

The entered URL points to a repo that isn't structured as a Claude Code plugin. Check:
- Is this the right repo URL?
- Does the repo follow the `.claude-plugin/marketplace.json` or `.claude-plugin/plugin.json` convention?

### "CLAUDE.md health check found issues"

Run `/agent-orch:setup-claude-md` standalone to fix issues, then retry `/agent-orch:init-plugin`.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.init-plugin:` entry. If the file is absent, has no
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

### "Plugin conflicts with existing rules"

When adding a second plugin that conflicts with existing rules:
1. The wizard shows the conflict with both versions
2. User chooses which to keep
3. Decision is recorded in `.claude/plugins.json` for future upgrades
