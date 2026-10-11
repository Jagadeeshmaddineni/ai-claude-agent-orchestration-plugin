# Configuration Reference

This guide provides a complete reference for configuring the Claude Agent Orchestration plugin, including environment variables, project standards, agent settings, and advanced customizations.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Project Standards (Hierarchical Structure)](#project-standards-hierarchical-structure)
3. [CLAUDE.md vs constitution.md vs .claude/rules/](#claudemd-vs-constitutionmd-vs-clauderules)
4. [Agent Model Selection](#agent-model-selection)
5. [Agent Tool Access](#agent-tool-access)
6. [Component Library Configuration](#component-library-configuration)
7. [Team Distribution Settings](#team-distribution-settings)
8. [Disabling Specific Agents](#disabling-specific-agents)
9. [Debug Mode](#debug-mode)
10. [Advanced: Custom Agent Prompts](#advanced-custom-agent-prompts)

---

## Environment Variables

### Required for Private Repositories

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GITHUB_TOKEN` | Yes (for private repos) | Personal access token with `repo` scope | `ghp_xxxxxxxxxxxxxxxxxxxx` |
| `GH_TOKEN` | Alternative | Alternative to `GITHUB_TOKEN` - Claude Code checks both | `ghp_xxxxxxxxxxxxxxxxxxxx` |
| `GITLAB_TOKEN` | For GitLab | Token for GitLab repositories | `glpat-xxxxxxxxxxxxxxxxxxxx` |

### Setting Up Environment Variables

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, or `~/.bash_profile`):

```bash
# GitHub (choose one)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
# OR
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# GitLab (if using GitLab)
export GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

Reload your shell:
```bash
source ~/.zshrc  # or ~/.bashrc
```

Verify:
```bash
echo $GITHUB_TOKEN
```

### Token Requirements

**GitHub Token:**
- Must have `repo` scope (full control of private repositories)
- For GitHub Enterprise, create token on your enterprise instance
- GitHub.com tokens only work for github.com
- GitHub Enterprise tokens only work for that instance

**GitLab Token:**
- Must have `read_api` and `read_repository` scopes
- For self-hosted GitLab, token must be from that instance

### Testing Token Access

```bash
# Test GitHub token
git clone https://$GITHUB_TOKEN@github.yourcompany.com/org/repo.git /tmp/test-clone

# Test GitLab token
git clone https://oauth2:$GITLAB_TOKEN@gitlab.yourcompany.com/org/repo.git /tmp/test-clone
```

---

## Project Standards (Hierarchical Structure)

Project standards are distributed across multiple files for optimal token efficiency. The ISC2-certified Staff SWE persona is loaded automatically via the plugin's built-in `rules/persona.md`.

### Structure

```
project-root/
+-- CLAUDE.md                          # Lean: project overview, git workflow, env vars, agent notes
+-- .claude/rules/
|   +-- security-baseline.md           # Always loaded: OWASP, auth, encryption
|   +-- code-standards.md              # Always loaded: language/style, naming, error handling
|   +-- testing-standards.md           # Always loaded: coverage, patterns, commands
+-- [api-dir]/CLAUDE.md                # Loaded when working on API code
+-- [db-dir]/CLAUDE.md                 # Loaded when working on database code
+-- [frontend-dir]/CLAUDE.md           # Loaded when working on frontend code
```

**With Spec-Kit** (additionally):
```
.specify/memory/constitution.md        # Spec-kit-specific standards
```

Run `/agent-orch:setup-claude-md` to auto-detect your project structure and create the appropriate files. This reduces agent context by 70-85% compared to a monolithic CLAUDE.md.

### Legacy Location (deprecated)

**Without Spec-Kit (Standalone Mode):**
```
CLAUDE.md (monolithic, in project root) -- still supported but not recommended
```

### Structure

```markdown
# Project Constitution

## Code Quality Standards

### TypeScript
- Strict mode required (`strict: true` in tsconfig.json)
- No `any` types - use `unknown` or specific types
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public APIs

### Linting & Formatting
- ESLint with Airbnb config
- Prettier with 2-space indentation
- Run lint before commit (`npm run lint`)

## Testing Standards

### Coverage Requirements
- Minimum 80% code coverage
- 100% coverage for business logic
- Test file naming: `*.test.ts` or `*.spec.ts`

### Test Framework
- Jest for unit tests
- React Testing Library for component tests
- Supertest for API tests

### Test Structure
- Arrange-Act-Assert pattern
- One assertion per test preferred
- Use descriptive test names

## Security Standards

### Input Validation
- All user input must be validated
- Use Zod or Joi for schema validation
- Sanitize HTML inputs

### Database Access
- Use parameterized queries only
- No string concatenation in SQL
- Use ORMs with prepared statements

### Authentication
- JWT tokens with 15-minute expiry
- Refresh tokens with 7-day expiry
- bcrypt for password hashing (rounds=12)

## Performance Standards

### API Response Times
- P95 < 200ms for read operations
- P95 < 500ms for write operations
- Use caching for expensive queries

### Database
- Add indexes for foreign keys
- Limit result sets (max 1000 rows)
- Use pagination for lists

## Documentation Standards

### Code Comments
- JSDoc for all exported functions
- Explain "why" not "what"
- Update comments when code changes

### README Requirements
- Installation instructions
- Usage examples
- API documentation (if applicable)
- Environment variables table

## Git Workflow

### Commit Messages
- Conventional commits format
- Format: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore

### Branch Naming
- Feature: `feature/short-description`
- Fix: `fix/issue-number-description`
- No direct commits to main

### Pull Requests
- Link to issue/ticket
- Include test evidence
- Request review from 2 team members
```

### What Agents Use This For

| Agent | Uses Constitution For |
|-------|----------------------|
| **Architect** | Understanding project constraints, selecting appropriate specialists |
| **Builder** | Following coding standards, naming conventions, patterns |
| **Validator** | Test coverage requirements, test structure standards |
| **Scribe** | Documentation format and requirements |
| **Quality Reviewer** | Primary reference for code quality validation |
| **Security Auditor** | Security requirements and standards |
| **Performance Analyst** | Performance targets and requirements |

---

## CLAUDE.md vs constitution.md vs .claude/rules/

### Standards Hierarchy

Standards are now distributed across three locations:

| Location | Loading | Content | Token cost |
|----------|---------|---------|-----------|
| **Plugin `rules/persona.md`** | Always (plugin) | ISC2 Staff SWE persona | ~200 |
| **`.claude/rules/*.md`** | Always (project) | Security baseline, code standards, testing | ~3-4k |
| **Root `CLAUDE.md`** | Always (root) | Project overview, git workflow, env vars | ~2k |
| **Subdirectory `CLAUDE.md`** | Per-directory | API, DB, frontend standards | ~1.5k each |
| **`.specify/memory/constitution.md`** | Spec-kit mode | Spec-kit-specific standards | varies |

### Precedence

1. `.claude/rules/` -- always loaded, universal baseline
2. Root `CLAUDE.md` -- always loaded, project context
3. Subdirectory `CLAUDE.md` -- loaded when working in that directory
4. `.specify/memory/constitution.md` -- loaded in spec-kit mode, supplements the above

### Recommended Setup

**All projects** (run once):
```bash
/agent-orch:setup-claude-md
```

This creates the hierarchical structure. `.claude/rules/` provides the baseline that used to bloat the monolithic CLAUDE.md.

**Spec-kit projects** (additionally):
```bash
/agent-orch:setup-constitution
```

The constitution can be leaner now since `.claude/rules/` handles universal standards.

### Migration from Monolithic CLAUDE.md

If you have an existing monolithic `CLAUDE.md` (>100 lines), run `/agent-orch:setup-claude-md`. It will:
1. Detect your monolithic structure
2. Propose a split into the hierarchical format
3. Back up your original as `CLAUDE.md.bak`
4. Create all the new files with your existing content distributed appropriately

---

## Agent Model Selection

Each agent can use different Claude models based on the complexity of their tasks.

### Available Models

| Model | Speed | Cost | Best For |
|-------|-------|------|----------|
| `haiku` | Fastest | Lowest | Simple, repetitive tasks |
| `sonnet` | Balanced | Medium | Most general tasks (default) |
| `opus` | Slowest | Highest | Complex reasoning, critical decisions |

### Default Configuration

All agents default to `sonnet` for balanced performance and cost.

### Customizing Agent Models

Edit agent files in `plugins/agent-orch/agents/`:

**Current configuration (orchestrate-architect.md):**
```yaml
---
name: orchestrate-architect
description: Research & Planning agent
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, Task, Edit, Write
model: sonnet
---
```

**Change to opus for better reasoning:**
```yaml
---
name: orchestrate-architect
description: Research & Planning agent
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, Task, Edit, Write
model: opus
---
```

**Change to haiku for faster execution:**
```yaml
---
name: orchestrate-architect
description: Research & Planning agent
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, Task, Edit, Write
model: haiku
---
```

### Recommended Model Assignments

| Agent | Recommended Model | Reasoning |
|-------|------------------|-----------|
| **orchestrate-architect** | `opus` | Complex planning, critical decisions |
| **orchestrate-builder** | `sonnet` | Balanced - needs reasoning + speed |
| **orchestrate-validator** | `sonnet` | Test writing requires good reasoning |
| **orchestrate-scribe** | `haiku` | Documentation is straightforward |
| **orchestrate-spec-reviewer** | `opus` | Critical - must catch all spec gaps |
| **orchestrate-quality-reviewer** | `sonnet` | Pattern detection, code quality |
| **orchestrate-debugger** | `opus` | Root cause analysis is complex |
| **orchestrate-security** | `opus` | Security is critical |
| **orchestrate-performance** | `sonnet` | Performance analysis |
| **orchestrate-devops** | `haiku` | Config generation is straightforward |
| **orchestrate-database** | `sonnet` | Schema design needs reasoning |
| **orchestrate-api** | `sonnet` | API design needs consistency |
| **orchestrate-uiux** | `sonnet` | Design compliance checking |
| **orchestrate-refactorer** | `sonnet` | Pattern recognition |
| **orchestrate-migration** | `opus` | Complex compatibility analysis |

### Cost Optimization Strategy

**Budget-conscious:**
- Set all agents to `haiku` except Architect and Spec Reviewer to `opus`

**Balanced (default):**
- Keep all agents on `sonnet`

**Quality-focused:**
- Set Architect, Spec Reviewer, Debugger, Security to `opus`
- Keep others on `sonnet`

**Maximum performance:**
- Set all agents to `opus` (expensive but highest quality)

---

## Agent Tool Access

Each agent has specific tools available for their role. This defines what actions they can perform.

### Available Tools

| Tool | Purpose | Examples |
|------|---------|----------|
| `Glob` | Find files by pattern | `**/*.ts`, `src/**/*.test.js` |
| `Grep` | Search file contents | Find function definitions, search for patterns |
| `LS` | List directory contents | Explore directory structure |
| `Read` | Read file contents | Read source code, configs, documentation |
| `NotebookRead` | Read Jupyter notebooks | Analyze data science code |
| `WebFetch` | Fetch web content | Read online documentation |
| `WebSearch` | Search the web | Find solutions, research libraries |
| `TodoWrite` | Manage task lists | Track progress within agent |
| `Task` | Spawn sub-agents | Delegate to other agents |
| `Edit` | Modify existing files | Update code, fix bugs |
| `Write` | Create new files | Generate code, create configs |
| `Bash` | Execute shell commands | Run tests, build, deploy |

### Current Tool Assignments

| Agent | Tools | Rationale |
|-------|-------|-----------|
| **orchestrate-architect** | Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, Task, Edit, Write | Full research + coordination powers, no bash (doesn't implement) |
| **orchestrate-builder** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task | Implementation tools + test execution |
| **orchestrate-validator** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task | Test creation + execution |
| **orchestrate-scribe** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, TodoWrite, Task | Documentation creation |
| **orchestrate-spec-reviewer** | Glob, Grep, LS, Read, NotebookRead, TodoWrite, Task | Read-only verification tools |
| **orchestrate-quality-reviewer** | Glob, Grep, LS, Read, NotebookRead, TodoWrite, Edit, Write, Task | Code reading + feedback writing |
| **orchestrate-debugger** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task | Full debugging powers |
| **orchestrate-security** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task | Security analysis + fixes |
| **orchestrate-performance** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task | Performance analysis + optimizations |
| **orchestrate-devops** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task | Config creation + deployment |
| **orchestrate-database** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task | Schema + migration creation |
| **orchestrate-api** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task | API design + spec generation |
| **orchestrate-uiux** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task | Component analysis + fixes |
| **orchestrate-refactorer** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task | Code analysis + refactoring |
| **orchestrate-migration** | Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task | Migration planning + execution |

### Customizing Tool Access

Edit agent files to add or remove tools:

**Example: Remove Bash access from Builder (safety):**
```yaml
---
name: orchestrate-builder
description: Implementation agent
tools: Glob, Grep, LS, Read, NotebookRead, Edit, Write, TodoWrite, Task
model: sonnet
---
```

**Example: Add WebSearch to Security Auditor:**
```yaml
---
name: orchestrate-security
description: Security auditing specialist
tools: Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task, WebSearch
model: opus
---
```

### Security Considerations

**High-risk tools:**
- `Bash`: Can execute any shell command
- `Write`: Can create new files anywhere
- `Edit`: Can modify any existing file

**Recommendations:**
- Limit `Bash` to agents that need test execution
- Read-only agents (Spec Reviewer) should not have `Edit` or `Write`
- Consider removing `Bash` from all agents if working with sensitive systems

---

## Component Library Configuration

The UI/UX Designer agent requires configuration to work with your design system.

### Configuration Location

**With Spec-Kit:**
```
.specify/memory/constitution.md
```

**Standalone Mode:**
```
CLAUDE.md (in project root)
```

### Full Configuration Template

Add this section to your constitution.md or CLAUDE.md:

```markdown
## Component Library

### Required Paths

COMPONENT_LIBRARY_ROOT: /Users/yourname/dev/Component-Library
DOCS_ROOT: ${COMPONENT_LIBRARY_ROOT}/packages/ui-docs/src

### Optional Paths

PACKAGE_DOCS: ${DOCS_ROOT}/<package-name>
COMPONENT_DOCS: ${DOCS_ROOT}/<package-name>/<ComponentName>/<ComponentName>.mdx
COMPONENT_STORIES: ${DOCS_ROOT}/<package-name>/<ComponentName>/<ComponentName>.stories.tsx
MATERIALS: ${DOCS_ROOT}/materials

### Materials (Design Tokens)

Design token documentation locations:

- Borders: ${MATERIALS}/Borders.mdx
- Colours: ${MATERIALS}/Colours.mdx
- Spacing: ${MATERIALS}/Spacing.mdx
- Typography: ${MATERIALS}/Typography.mdx
- Shadows: ${MATERIALS}/Shadows.mdx
- Breakpoints: ${MATERIALS}/Breakpoints.mdx

### Core Packages

Core design system packages:

| Package | Purpose | Key Components |
|---------|---------|----------------|
| @yourorg/bsds-core | Foundation | Button, Spinner, Layout, Stack, Cluster, Box |
| @yourorg/bsds-forms | Form controls | Input, Checkbox, Radio, Select, Form |
| @yourorg/bsds-icons | Icon system | Icon component + SVG library |
| @yourorg/bsds-table | Data tables | Table, TableRow, TableCell |

### UI Pattern Packages

Higher-level UI patterns:

| Package | Purpose | Key Components |
|---------|---------|----------------|
| @yourorg/ui-modal | Modal dialogs | Modal, ModalHeader, ModalBody, ModalFooter |
| @yourorg/ui-toast | Notifications | Toast, ToastProvider, useToast |
| @yourorg/ui-drawer | Slide-out panels | Drawer, DrawerHeader, DrawerBody |
| @yourorg/ui-dropdown | Dropdowns | Dropdown, DropdownMenu, DropdownItem |
| @yourorg/ui-tabs | Tab navigation | Tabs, TabList, Tab, TabPanel |

### Component Discovery Rules

Before creating any custom component:

1. Check if component exists in design system
2. Read component MDX documentation at ${COMPONENT_DOCS}
3. Review Storybook story examples at ${COMPONENT_STORIES}
4. If suitable component exists, use it
5. Only create custom if nothing suitable exists

### Design Token Rules

All UI code must follow these rules:

- No hardcoded colors - use theme tokens
- No hardcoded spacing - use spacing scale (50, 100, 200, etc.)
- No hardcoded typography - use typography tokens
- Prefer modern color functions (oklch) over hex
- Use layout components (Stack, Cluster) for spacing

### Accessibility Requirements

All components must meet:

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- ARIA attributes where needed

### Example Usage References

For this project, reference these stories:

- Buttons: ${DOCS_ROOT}/bsds-core/Button/Button.stories.tsx
- Forms: ${DOCS_ROOT}/bsds-forms/Form/Form.stories.tsx
- Modals: ${DOCS_ROOT}/ui-modal/Modal/Modal.stories.tsx
- Tables: ${DOCS_ROOT}/bsds-table/Table/Table.stories.tsx
```

### Minimal Configuration

If you want basic validation without a full component library:

```markdown
## Component Library

### Design Token Rules

- No hardcoded colors - use CSS variables
- No hardcoded spacing - use spacing scale (4px, 8px, 16px, 24px, 32px)
- No hardcoded typography - use CSS classes

### Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation support
- ARIA attributes where needed
```

### What UI/UX Designer Does With This

With configuration present:
1. Checks if design system components exist before creating custom ones
2. Reads MDX documentation for component APIs
3. Uses .stories.tsx files as canonical examples
4. Validates no hardcoded colors, spacing, or typography
5. Checks WCAG 2.1 AA accessibility compliance

Without configuration:
- UI/UX Designer will prompt user to add configuration
- Will still check for basic accessibility
- Cannot validate design system compliance

---

## Team Distribution Settings

Distribute the plugin to your entire team automatically using project settings.

### Configuration File

Create `.claude/settings.json` in your project root:

```json
{
  "extraKnownMarketplaces": {
    "ssnc": {
      "source": {
        "source": "url",
        "url": "https://code.ssnc.dev/jjones5/claude-agent-orchestration-plugin.git"
      }
    }
  },
  "enabledPlugins": {
    "agent-orch@ssnc": true
  }
}
```

### Configuration Breakdown

**Marketplace definition:**
```json
"extraKnownMarketplaces": {
  "ssnc": {                    // Marketplace ID (can be any name)
    "source": {
      "source": "url",          // Source type: "url" or "owner/repo"
      "url": "https://..."      // Full Git URL
    }
  }
}
```

**Plugin enablement:**
```json
"enabledPlugins": {
  "agent-orch@ssnc": true      // Format: plugin-name@marketplace-id
}
```

### Multiple Marketplaces

```json
{
  "extraKnownMarketplaces": {
    "ssnc": {
      "source": {
        "source": "url",
        "url": "https://code.ssnc.dev/jjones5/claude-agent-orchestration-plugin.git"
      }
    },
    "company-plugins": {
      "source": {
        "source": "url",
        "url": "https://github.yourcompany.com/plugins/claude-plugins.git"
      }
    }
  },
  "enabledPlugins": {
    "agent-orch@ssnc": true,
    "other-plugin@company-plugins": true
  }
}
```

### Public GitHub Repositories

For public GitHub.com repositories, use shorthand:

```json
{
  "extraKnownMarketplaces": {
    "public": {
      "source": {
        "source": "github",
        "owner": "your-username",
        "repo": "claude-agent-orchestration-plugin"
      }
    }
  },
  "enabledPlugins": {
    "agent-orch@public": true
  }
}
```

### Team Rollout Process

1. **Add settings to project:**
   ```bash
   mkdir -p .claude
   # Create settings.json with marketplace + plugin config
   git add .claude/settings.json
   git commit -m "Add Claude agent orchestration plugin"
   git push
   ```

2. **Team members pull and setup:**
   ```bash
   git pull
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx  # Add to shell profile
   claude  # Plugin auto-loads
   ```

3. **Verify installation:**
   ```
   /plugin
   # Should show agent-orch@ssnc as installed
   ```

### Updating the Plugin

When you push updates to the plugin repository:

1. Team members get updates automatically on next Claude Code start
2. Or force update: `/plugin update agent-orch@ssnc`

### Benefits of Team Distribution

- One-time setup per team member (just set GITHUB_TOKEN)
- Plugin auto-loads when opening project
- Updates automatically when you push changes
- Consistent plugin version across team
- No manual installation steps

---

## Disabling Specific Agents

You can exclude agents from orchestration if you don't want them to run.

### Method 1: Skip Specialist Approval

When the Architect recommends specialists:

```
Recommended Specialists:
- Security Auditor (auth code present)
- Database Architect (schema changes)
- API Designer (new endpoints)

Approve this plan? (y/n/edit)
```

Type `edit` and remove unwanted agents from the plan before approval.

### Method 2: Modify Architect's Recommendations

Edit `plugins/agent-orch/agents/orchestrate-architect.md` to never recommend certain specialists:

**Current:**
```markdown
## Select Specialists

Based on the task, recommend activating:
- orchestrate-security: auth, user input, APIs
- orchestrate-performance: DB queries, loops, caching
- orchestrate-devops: CI/CD, Docker, K8s
- orchestrate-database: schema changes, migrations
- orchestrate-api: new endpoints, contracts
- orchestrate-uiux: React/frontend, design system
- orchestrate-refactorer: legacy code
- orchestrate-migration: upgrades, breaking changes
```

**Modified (disable DevOps and Migration):**
```markdown
## Select Specialists

Based on the task, recommend activating:
- orchestrate-security: auth, user input, APIs
- orchestrate-performance: DB queries, loops, caching
- orchestrate-database: schema changes, migrations
- orchestrate-api: new endpoints, contracts
- orchestrate-uiux: React/frontend, design system
- orchestrate-refactorer: legacy code

DO NOT recommend:
- orchestrate-devops (team manages manually)
- orchestrate-migration (requires manual planning)
```

### Method 3: Remove Agent Files

For permanent removal, delete the agent file:

```bash
cd plugins/agent-orch/agents
rm orchestrate-devops.md
rm orchestrate-migration.md
```

**Warning:** This prevents the agent from being used at all, even if needed.

### Method 4: Disable Two-Stage Review

To skip one of the review stages, modify the implement skill.

**Disable Stage 1 (Spec Compliance Review):**

Edit `plugins/agent-orch/skills/implement/SKILL.md` and comment out the spec reviewer section:

```markdown
## Phase 4: Two-Stage Code Review

### Stage 1: Spec Compliance Review
<!-- DISABLED
**orchestrate-spec-reviewer**:
...
-->

### Stage 2: Code Quality Review
(continues normally)
```

**Disable Stage 2 (Code Quality Review):**

Similar approach - comment out the quality reviewer section.

**Warning:** Disabling reviews reduces quality validation. Only do this for prototypes or trusted implementations.

### Method 5: Skip Entire Review Phase

For fastest execution (not recommended for production):

Edit `plugins/agent-orch/skills/implement/SKILL.md` and skip Phase 4 entirely:

```markdown
## Phase 3: Parallel Implementation
(agents work)

## Phase 4: Two-Stage Code Review
<!-- DISABLED - SKIP TO PHASE 5 -->

## Phase 5: Finalize
(continue with finalization)
```

### Recommended Approach

For most use cases, use **Method 1** (skip at approval time):
- Flexible - decide per feature
- No code changes required
- Can re-enable later
- Team members can make their own choices

---

## Debug Mode

Enable debug output to troubleshoot plugin issues.

### Enabling Debug Mode

**Method 1: Command Line Flag**
```bash
claude --debug
```

**Method 2: Environment Variable**
```bash
export CLAUDE_DEBUG=1
claude
```

**Method 3: For Single Session**
```bash
CLAUDE_DEBUG=1 claude
```

### What Debug Mode Shows

Debug mode provides detailed logging:

1. **Plugin Loading:**
   ```
   [DEBUG] Loading plugin: agent-orch@ssnc
   [DEBUG] Plugin path: ~/.claude/plugins/marketplace/ssnc/agent-orch
   [DEBUG] Loading agents from: plugins/agents/
   [DEBUG] Loaded agent: orchestrate-architect
   [DEBUG] Loaded agent: orchestrate-builder
   ...
   ```

2. **Agent Execution:**
   ```
   [DEBUG] Spawning agent: orchestrate-architect
   [DEBUG] Agent model: sonnet
   [DEBUG] Agent tools: Glob, Grep, LS, Read, ...
   [DEBUG] Agent prompt: You are Agent 1 - The Architect...
   ```

3. **File Operations:**
   ```
   [DEBUG] Reading file: specs/feature/spec.md
   [DEBUG] Writing file: specs/feature/status.md
   [DEBUG] Grep search: pattern="function.*auth" path="src/"
   ```

4. **Task Spawning:**
   ```
   [DEBUG] Task spawned: orchestrate-builder
   [DEBUG] Task prompt: Read specs/...
   [DEBUG] Task completed: orchestrate-builder (45.2s)
   ```

5. **Error Messages:**
   ```
   [ERROR] Failed to read file: .specify/memory/constitution.md
   [ERROR] File not found: /path/to/constitution.md
   [ERROR] Agent orchestrate-builder failed with error: ...
   ```

### Debugging Common Issues

**Issue: Skills not appearing**

Debug output to check:
```
[DEBUG] Loading skills from: plugins/skills/
[DEBUG] Loaded skill: implement
[DEBUG] Loaded skill: build
[DEBUG] Loaded skill: analyse
```

If missing, plugin isn't loaded. Check:
```
[DEBUG] Checking marketplace: ssnc
[DEBUG] Marketplace URL: https://...
```

**Issue: Agents not finding files**

Debug output shows file operations:
```
[DEBUG] Agent orchestrate-architect reading: .specify/memory/constitution.md
[ERROR] File not found: .specify/memory/constitution.md
```

Solution: Create the missing file.

**Issue: Authentication failures**

Debug output shows git operations:
```
[DEBUG] Cloning marketplace: https://code.ssnc.dev/...
[ERROR] Authentication failed
[ERROR] Token: ghp_xxxx... (redacted)
```

Check that `GITHUB_TOKEN` is set and has correct scope.

**Issue: Agent execution stalls**

Debug output shows what agent is doing:
```
[DEBUG] Agent orchestrate-builder: Reading src/auth.ts
[DEBUG] Agent orchestrate-builder: Executing Grep(pattern="class Auth")
(stalled - no more output)
```

Agent may be stuck on expensive operation. Ctrl+C and retry.

### Logging to File

Capture debug output for analysis:

```bash
claude --debug 2>&1 | tee claude-debug.log
```

This writes both to screen and `claude-debug.log` file.

### Debug Mode Performance Impact

Debug mode adds overhead:
- Extra logging I/O
- Detailed message formatting
- File operation tracking

For production use, run without debug mode.

### Reporting Issues

When reporting bugs, include:
1. Debug output: `claude --debug`
2. Plugin version: `/plugin` command output
3. Environment: OS, shell, Claude Code version
4. Steps to reproduce

---

## Advanced: Custom Agent Prompts

Customize agent behavior by modifying their prompt instructions.

### Agent File Structure

Each agent is defined in `plugins/agent-orch/agents/orchestrate-{name}.md`:

```yaml
---
name: orchestrate-architect
description: Research & Planning agent
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, Task, Edit, Write
model: sonnet
---

[MARKDOWN CONTENT - This is the system prompt]
```

### Anatomy of an Agent Prompt

**Front Matter (YAML):**
- `name`: Agent identifier (must match filename)
- `description`: Brief description
- `tools`: Comma-separated list of available tools
- `model`: Claude model to use (haiku/sonnet/opus)

**Prompt Body (Markdown):**
- Agent's role and identity
- Primary responsibilities
- Working protocol
- Output requirements
- Quality standards

### Customization Examples

#### Example 1: Make Builder More Cautious

Edit `plugins/agent-orch/agents/orchestrate-builder.md`:

```markdown
## Additional Requirements (CUSTOM)

Before making any changes:
1. Create a backup branch
2. Run existing tests to ensure they pass
3. Read related code for context
4. Ask Architect if approach is unclear

Before marking any task complete:
1. Run all tests (must show output)
2. Check for console errors
3. Verify no linting errors
4. Test edge cases manually
```

#### Example 2: Make Validator Require Higher Coverage

Edit `plugins/agent-orch/agents/orchestrate-validator.md`:

```markdown
## Test Coverage Requirements (CUSTOM)

Minimum coverage targets:
- Overall: 90% (not 80%)
- Critical paths: 100%
- New code: 100%

If coverage is below target:
- Flag as Critical severity
- Block completion until coverage improved
- Suggest specific tests to add
```

#### Example 3: Add Custom Security Checks

Edit `plugins/agent-orch/agents/orchestrate-security.md`:

```markdown
## Company-Specific Security Rules (CUSTOM)

In addition to OWASP Top 10, check for:

1. **PII Handling**
   - No PII in logs
   - PII must be encrypted at rest
   - PII access must be audited

2. **API Security**
   - All endpoints require authentication
   - Rate limiting on public endpoints
   - API keys rotated every 90 days

3. **Third-Party Libraries**
   - Check npm audit for vulnerabilities
   - No GPL licenses allowed
   - Document all third-party API calls
```

#### Example 4: Customize Scribe Documentation Style

Edit `plugins/agent-orch/agents/orchestrate-scribe.md`:

```markdown
## Documentation Standards (CUSTOM)

All documentation must include:

1. **Purpose** - What it does in 1 sentence
2. **Prerequisites** - What's needed to use it
3. **Quick Start** - Simplest possible example
4. **Examples** - 3-5 real-world examples
5. **API Reference** - All parameters and return values
6. **Troubleshooting** - Common issues and solutions

Use this template for all API documentation:

\`\`\`markdown
# {Component/Function Name}

## Purpose
{One sentence}

## Quick Start
\`\`\`typescript
// Simplest example
\`\`\`

## Examples

### Example 1: {Common Use Case}
\`\`\`typescript
// Code
\`\`\`

## API Reference

### Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|

### Returns
{Description}

## Troubleshooting

### Issue: {Common Problem}
**Solution:** {How to fix}
\`\`\`
```

#### Example 5: Add Industry-Specific Checks

For healthcare applications, edit `plugins/agent-orch/agents/orchestrate-security.md`:

```markdown
## HIPAA Compliance Checks (CUSTOM)

Verify all code meets HIPAA requirements:

1. **PHI Protection**
   - PHI encrypted in transit (TLS 1.2+)
   - PHI encrypted at rest (AES-256)
   - Access logs retained for 6 years
   - Audit trail for all PHI access

2. **Authentication**
   - Two-factor authentication required
   - Session timeout after 15 minutes
   - Password complexity enforced
   - Account lockout after 3 failed attempts

3. **Data Retention**
   - PHI retained for 6 years minimum
   - Secure deletion process for expired data
   - Backup encryption verified
```

#### Example 6: Add Project-Specific Tools

If you have custom tooling, reference it in agent prompts:

Edit `plugins/agent-orch/agents/orchestrate-builder.md`:

```markdown
## Project-Specific Tools (CUSTOM)

After implementation, run these custom tools:

1. **Schema Validator**
   \`\`\`bash
   npm run validate:schema
   \`\`\`
   Ensures database schema matches ORM models

2. **API Contract Checker**
   \`\`\`bash
   npm run check:api-contracts
   \`\`\`
   Verifies API responses match OpenAPI spec

3. **Security Scan**
   \`\`\`bash
   npm run security:scan
   \`\`\`
   Runs custom security checks

Document results in status.md
```

### Testing Custom Prompts

After modifying agent prompts:

1. **Test with simple task:**
   ```bash
   claude
   > /agent-orch:build
   # Give it a simple task to verify changes work
   ```

2. **Check debug output:**
   ```bash
   claude --debug
   # Verify your custom instructions appear in agent execution
   ```

3. **Validate behavior:**
   - Does agent follow new instructions?
   - Are requirements being enforced?
   - Check agent's output in status.md

### Best Practices for Custom Prompts

1. **Be Specific:**
   - Bad: "Write good tests"
   - Good: "Write tests with 90% coverage, including edge cases"

2. **Provide Examples:**
   - Show exactly what you want
   - Include code snippets
   - Reference existing files

3. **Set Clear Standards:**
   - Define "done" explicitly
   - Specify quality metrics
   - List blocking issues

4. **Use Sections:**
   - Markdown headers for organization
   - Bullet lists for requirements
   - Tables for standards

5. **Test Incrementally:**
   - Change one thing at a time
   - Verify it works before next change
   - Keep backup of working version

### Sharing Custom Agents

If you've created valuable customizations:

1. **Fork the repository:**
   ```bash
   git clone https://code.ssnc.dev/jjones5/claude-agent-orchestration-plugin.git
   cd claude-agent-orchestration-plugin
   # Make your changes
   git add plugins/agent-orch/agents/
   git commit -m "Customize agents for our team"
   git push origin main
   ```

2. **Update team's .claude/settings.json:**
   ```json
   {
     "extraKnownMarketplaces": {
       "ourteam": {
         "source": {
           "source": "url",
           "url": "https://code.yourcompany.com/team/claude-agent-orchestration-plugin.git"
         }
       }
     },
     "enabledPlugins": {
       "agent-orch@ourteam": true
     }
   }
   ```

3. **Document your changes:**
   - Add `CUSTOMIZATIONS.md` to your fork
   - Explain what you changed and why
   - Provide examples

---

## Related Documentation

- [Installation Guide](INSTALLATION.md) - How to install the plugin
- [User Guide](USER_GUIDE.md) - How to use the plugin
- [Spec-Kit Integration](SPECKIT_INTEGRATION.md) - Working with spec-kit
- [Example Workflow](../examples/EXAMPLE_WORKFLOW.md) - Step-by-step example

---

## Support

For issues or questions:
1. Check debug output: `claude --debug`
2. Review this configuration guide
3. Check existing documentation
4. Open an issue in the repository

---

**Last Updated:** 2026-01-17
