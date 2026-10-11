# Contributing Guide

This guide explains how to develop, customize, and contribute to the Claude Agent Orchestration plugin.

---

## Table of Contents

1. [Plugin Structure](#plugin-structure)
2. [Agent File Format](#agent-file-format)
3. [Creating New Agents](#creating-new-agents)
4. [Modifying Existing Agents](#modifying-existing-agents)
5. [Creating New Skills](#creating-new-skills)
6. [Tool Access Configuration](#tool-access-configuration)
7. [Model Selection Guide](#model-selection-guide)
8. [Testing Your Changes](#testing-your-changes)
9. [Submitting Changes](#submitting-changes)

---

## Plugin Structure

The plugin follows Claude Code's marketplace plugin structure:

```
claude-agent-orchestration-plugin/
├── .claude-plugin/
│   └── marketplace.json             # Marketplace definition
├── plugins/
│   └── agent-orch/                  # The plugin
│       ├── .claude-plugin/
│       │   └── plugin.json          # Plugin metadata
│       ├── agents/
│       │   ├── orchestrate-architect.md
│       │   ├── orchestrate-builder.md
│       │   ├── orchestrate-validator.md
│       │   ├── orchestrate-scribe.md
│       │   ├── orchestrate-spec-reviewer.md
│       │   ├── orchestrate-quality-reviewer.md
│       │   ├── orchestrate-debugger.md
│       │   ├── orchestrate-security.md
│       │   ├── orchestrate-performance.md
│       │   ├── orchestrate-devops.md
│       │   ├── orchestrate-database.md
│       │   ├── orchestrate-api.md
│       │   ├── orchestrate-uiux.md
│       │   ├── orchestrate-refactorer.md
│       │   └── orchestrate-migration.md
│       ├── skills/
│       │   ├── implement/
│       │   │   └── SKILL.md         # /agent-orch:implement skill
│       │   ├── build/
│       │   │   └── SKILL.md         # /agent-orch:build skill
│       │   ├── analyse/
│       │   │   └── SKILL.md         # /agent-orch:analyse skill
│       │   └── complib-guide/
│       │       └── SKILL.md         # Component library helper
│       ├── mcp/                     # Local MCP server
│       │   ├── README.md            # Overview + developer's guide
│       │   ├── src/                 # Server source (Bun/TypeScript)
│       │   │   ├── index.ts         # Main entry point
│       │   │   ├── services/        # Jira, Confluence, TestRail, Azure DevOps, Playwright, SonarQube, SS&C Cloud, ServiceNow
│       │   │   └── shared/          # HTTP client, utilities
│       │   └── docs/
│       │       ├── README.md        # Setup & configuration hub
│       │       └── services/        # Per-service tool catalogs (8 files)
│       └── README.md
├── docs/
│   ├── INSTALLATION.md
│   ├── USER_GUIDE.md
│   ├── SPECKIT_INTEGRATION.md
│   └── CONTRIBUTING.md              # This file
├── examples/
│   └── EXAMPLE_WORKFLOW.md
├── README.md
├── install.sh
└── uninstall.sh
```

### Directory Structure Explained

| Directory/File | Purpose |
|----------------|---------|
| `.claude-plugin/marketplace.json` | Marketplace definition |
| `plugins/agent-orch/` | The plugin directory |
| `plugins/agent-orch/.claude-plugin/plugin.json` | Plugin metadata |
| `plugins/agent-orch/agents/` | Agent definition files (23 specialized agents) |
| `plugins/agent-orch/skills/` | Skill definition files (orchestration workflows) |
| `plugins/agent-orch/mcp/` | Local MCP server (Jira, Confluence, TestRail, Azure DevOps, SonarQube) |
| `docs/` | User and developer documentation |
| `examples/` | Usage examples and workflow demonstrations |
| `install.sh` / `uninstall.sh` | Installation and cleanup scripts |

---

## Agent File Format

Agent files use YAML frontmatter followed by markdown instructions.

### Frontmatter Structure

```yaml
---
name: agent-name                    # Required: Unique identifier
description: Agent purpose          # Required: Brief description
tools: Glob, Grep, Read, Edit       # Required: Comma-separated tool list
model: sonnet                       # Required: sonnet, opus, or haiku
---
```

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | string | Unique agent identifier | `orchestrate-builder` |
| `description` | string | Brief agent purpose | `Core Implementation agent for spec-kit workflows` |
| `tools` | string | Comma-separated tool names | `Glob, Grep, LS, Read, Edit, Write` |
| `model` | string | Claude model tier | `sonnet`, `opus`, or `haiku` |

### Available Tools

See [Tool Access Configuration](#tool-access-configuration) for details on each tool.

### Instructions Section

After the frontmatter, write markdown instructions defining:

1. **Role** - Agent identity and purpose
2. **Spec-Kit Integration** - How it interacts with `.specify/`
3. **Primary Responsibilities** - What the agent does
4. **Working Protocol** - Step-by-step workflow
5. **Quality Standards** - Rules and constraints

### Example: Minimal Agent Template

```markdown
---
name: orchestrate-example
description: Example agent for demonstration
tools: Glob, Grep, Read, Edit
model: sonnet
---

You are **Example Agent** - demonstrating agent structure.

## Role
"I am the Example Agent - I demonstrate proper agent structure"

## Spec-Kit Integration

You work within spec-kit's `.specify/` structure:

```
specs/[feature]/
├── spec.md      # Read: requirements
├── tasks.md     # Read: your assignments
└── status.md    # Write: your progress
```

## Primary Responsibilities

1. **Read Tasks**
   - `specs/[feature]/tasks.md` for assignments

2. **Execute Work**
   - Implement your assigned tasks

3. **Report Progress**
   - Update `specs/[feature]/status.md`

## Working Protocol

1. Read spec and tasks
2. Execute work
3. Update status
```

---

## Creating New Agents

Follow these steps to create a new agent for the orchestration system:

### Step 1: Determine Agent Type

Decide which category your agent belongs to:

- **Core Agent** - Always active (Architect, Builder, Validator, Scribe)
- **Review Agent** - Quality gates (Spec Reviewer, Quality Reviewer)
- **Support Agent** - Problem solving (Debugger)
- **Specialist Agent** - Domain-specific (Security, Performance, etc.)

### Step 2: Create Agent File

Create `plugins/agent-orch/agents/orchestrate-[name].md`:

```bash
cd plugins/agent-orch/agents
touch orchestrate-[name].md
```

### Step 3: Add Frontmatter

Start with YAML frontmatter:

```yaml
---
name: orchestrate-[name]
description: [Brief description of purpose]
tools: [Required tools - see Tool Access Configuration]
model: [sonnet/opus/haiku - see Model Selection Guide]
---
```

### Step 4: Write Instructions

Structure your instructions:

```markdown
You are **[Agent Name]** - [role description].

## Role
"I am the [Agent Name] - [brief purpose]"

## Spec-Kit Integration

Define how the agent interacts with `.specify/`:

```
specs/[feature]/
├── spec.md      # Read: [what to read]
├── tasks.md     # Read/Write: [what to track]
└── status.md    # Write: [what to report]
```

## Primary Responsibilities

1. **[Responsibility 1]**
   - [Details]

2. **[Responsibility 2]**
   - [Details]

## Working Protocol

### Step 1: [First Step]
[Details]

### Step 2: [Second Step]
[Details]

## Output Format

Define expected output format in `status.md`:

```markdown
## [Agent Name] Report

[Structure for status updates]
```

## Quality Standards
- [Rule 1]
- [Rule 2]
```

### Step 5: Reference Existing Agents

Look at similar agents for consistency:

- **For specialist agents**: See `orchestrate-security.md` or `orchestrate-performance.md`
- **For review agents**: See `orchestrate-spec-reviewer.md` or `orchestrate-quality-reviewer.md`
- **For core agents**: See `orchestrate-builder.md` or `orchestrate-validator.md`

### Example: Creating a Documentation Linter Agent

```markdown
---
name: orchestrate-doc-linter
description: Documentation quality specialist. Reviews docs for consistency, clarity, and completeness.
tools: Glob, Grep, Read, Edit, Write
model: haiku
---

You are **Documentation Linter** - a specialist activated for documentation review.

## Role
"I am the Documentation Linter - I ensure documentation quality"

## Spec-Kit Integration

Report findings in `specs/[feature]/status.md`.

## When Activated
- New documentation added
- API documentation changes
- README updates

## Primary Responsibilities

1. **Review Documentation**
   - Check for spelling and grammar
   - Verify code examples work
   - Ensure consistent formatting
   - Validate links

2. **Report Issues**
   - List findings by severity
   - Suggest improvements

## Report Format

Update `specs/[feature]/status.md`:

```markdown
## Documentation Lint Report

### Issues Found
| Severity | Issue | File:Line | Fix |
|----------|-------|-----------|-----|
| HIGH | Broken link | README.md:45 | Update URL |
| MEDIUM | Inconsistent heading | API.md:12 | Use Title Case |

### Passed Checks
- [x] All code examples valid
- [x] No spelling errors
- [x] Consistent formatting
```

## Severity
- **HIGH**: Broken functionality (dead links, invalid code)
- **MEDIUM**: Inconsistencies
- **LOW**: Style suggestions
```

---

## Modifying Existing Agents

### When to Modify Agents

Modify agents when:
- Adjusting tool access needs
- Changing quality standards
- Adding new capabilities
- Refining instructions
- Fixing workflow issues

### Modification Workflow

#### Step 1: Identify the Agent

Find the agent file in `plugins/agent-orch/agents/`:

```bash
ls plugins/agent-orch/agents/
```

#### Step 2: Test Current Behavior

Before modifying, test current behavior:

```bash
cd your-test-project
claude --plugin-dir /path/to/plugins/agent-orch

# Then launch the agent
> Launch the orchestrate-[name] agent to [test task]
```

#### Step 3: Make Changes

Edit the agent file:

```bash
# Edit in your preferred editor
vim plugins/agent-orch/agents/orchestrate-[name].md
# or
code plugins/agent-orch/agents/orchestrate-[name].md
```

#### Step 4: Test Modified Agent

Test with `--plugin-dir`:

```bash
claude --plugin-dir /path/to/plugins/agent-orch
> Launch the orchestrate-[name] agent to [test task]
```

### Common Modifications

#### Adding Tools

Add tools to the frontmatter:

```yaml
---
name: orchestrate-builder
tools: Glob, Grep, LS, Read, Edit, Write, Bash, TodoWrite, Task
# Add WebFetch if needed:
tools: Glob, Grep, LS, Read, Edit, Write, Bash, TodoWrite, Task, WebFetch
---
```

#### Changing Model Tier

Update the model field:

```yaml
---
model: sonnet  # Change to opus for complex reasoning
# or
model: haiku   # Change to haiku for simple tasks
---
```

#### Adding Quality Standards

Add to the instructions section:

```markdown
## Quality Standards
- Never deviate from spec without Architect approval
- Follow existing codebase patterns
- Update `.specify/` after every significant change
- Provide evidence for all completion claims
```

#### Customizing Report Format

Modify the status.md format section:

```markdown
## Report Format

Update `specs/[feature]/status.md`:

```markdown
## [Agent Name] Progress

### Completed
- [x] Task 1: file.ts (verified with tests)
- [x] Task 2: file2.ts (approved by Quality Reviewer)

### In Progress
- [ ] Task 3: file3.ts (80% complete)

### Blocked
- [ ] Task 4: waiting for API spec
```
```

### Example: Making Validator More Strict

Edit `plugins/agent-orch/agents/orchestrate-validator.md`:

```markdown
## Quality Standards
- All code must have 80% test coverage minimum (up from default)
- Security vulnerabilities are Critical severity (up from High)
- Performance regressions must be flagged (new requirement)
- All edge cases must have explicit tests (new requirement)

## Verification Gate (Enhanced)

Before marking ANY task complete, you MUST:

1. Run full test suite with coverage report
2. Verify coverage meets 80% threshold
3. Check for security vulnerabilities in dependencies
4. Profile performance-critical code paths
5. Document all test scenarios
```

---

## Creating New Skills

Skills orchestrate agents for specific workflows. Skills are the commands users invoke (like `/agent-orch:implement`).

### Skill File Structure

Skills are markdown files in `plugins/agent-orch/skills/[skill-name]/SKILL.md`:

```
plugins/agent-orch/skills/
└── [skill-name]/
    └── SKILL.md
```

### SKILL.md Format

```markdown
---
name: skill-name
description: Skill purpose and usage. Usage: /agent-orch:skill-name [args]
---

# Skill Title

Instructions for orchestrating agents to achieve a goal.

## Phase 1: [First Phase]
[Instructions]

## Phase 2: [Second Phase]
[Instructions]
```

### Frontmatter Structure

```yaml
---
name: skill-name                            # Required: Unique identifier (used in command)
description: Brief description. Usage: ...  # Required: Include usage pattern
---
```

### Skill Instructions

Skills define multi-phase workflows:

1. **Phase definitions** - Clear sequential phases
2. **Agent launch instructions** - How to spawn agents with Task tool
3. **Coordination logic** - How agents interact
4. **Exit conditions** - When the skill completes

### Example: Creating a Code Audit Skill

Create `plugins/agent-orch/skills/audit/SKILL.md`:

```markdown
---
name: audit
description: Multi-agent code audit without changes. Launches Security, Performance, and Quality agents to review code. Usage: /agent-orch:audit [directory]
---

# Code Audit Skill

You are orchestrating a multi-agent code audit WITHOUT making changes.

## Phase 1: Setup

**Goal**: Identify audit scope

**Actions**:
1. If `$ARGUMENTS` provided, use as directory to audit
2. If no arguments, audit entire project
3. Check for `.specify/memory/constitution.md` for standards
4. Create `AUDIT_REPORT.md` in project root

---

## Phase 2: Parallel Audits

**Goal**: Run specialist audits simultaneously

**CRITICAL**: Launch ALL agents IN PARALLEL

**orchestrate-security**:
> "Audit [directory] for security vulnerabilities.
> Report findings in AUDIT_REPORT.md under ## Security Audit section.
> Use OWASP Top 10 as framework.
> Do NOT modify code."

**orchestrate-performance**:
> "Audit [directory] for performance issues.
> Report findings in AUDIT_REPORT.md under ## Performance Audit section.
> Focus on N+1 queries, memory leaks, bottlenecks.
> Do NOT modify code."

**orchestrate-quality-reviewer**:
> "Audit [directory] for code quality.
> Report findings in AUDIT_REPORT.md under ## Code Quality Audit section.
> Check patterns, naming, complexity, duplication.
> Do NOT modify code."

---

## Phase 3: Consolidate

**Goal**: Present unified audit report

**Actions**:
1. Read `AUDIT_REPORT.md`
2. Summarize total findings by severity
3. Present:
   - Critical issues (must fix)
   - High issues (should fix)
   - Medium issues (consider fixing)
   - Low issues (nice to have)
4. Ask if user wants to:
   - Fix issues automatically
   - Generate GitHub issues
   - Export report

---

## Report Format

The `AUDIT_REPORT.md` structure:

```markdown
# Code Audit Report

**Date**: [timestamp]
**Scope**: [directory]

## Summary
| Severity | Count |
|----------|-------|
| Critical | X |
| High | X |
| Medium | X |
| Low | X |

## Security Audit
[Security agent findings]

## Performance Audit
[Performance agent findings]

## Code Quality Audit
[Quality agent findings]
```
```

### Registering the Skill

Skills are automatically discovered from `plugins/agent-orch/skills/*/SKILL.md`. The skill name in frontmatter becomes the command:

```yaml
name: audit
# Creates: /agent-orch:audit
```

---

## Tool Access Configuration

Tools define what actions agents can perform. Configure in agent frontmatter.

### Available Tools

| Tool | Purpose | Read | Write | Search | Execute |
|------|---------|------|-------|--------|---------|
| **Glob** | Find files by pattern | | | ✓ | |
| **Grep** | Search file contents | | | ✓ | |
| **LS** | List directory contents | ✓ | | | |
| **Read** | Read file contents | ✓ | | | |
| **NotebookRead** | Read Jupyter notebooks | ✓ | | | |
| **Edit** | Modify existing files | ✓ | ✓ | | |
| **Write** | Create/overwrite files | | ✓ | | |
| **Bash** | Execute shell commands | | | | ✓ |
| **TodoWrite** | Manage task lists | | ✓ | | |
| **Task** | Spawn other agents | | | | ✓ |
| **WebFetch** | Fetch web content | ✓ | | | |
| **WebSearch** | Search the web | | | ✓ | |

### Tool Selection Guidelines

#### Read-Only Agents (Analysis)

For agents that analyze without modifying:

```yaml
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, Task
```

Examples: Architect, Spec Reviewer

#### Implementation Agents

For agents that write code:

```yaml
tools: Glob, Grep, LS, Read, Edit, Write, Bash, TodoWrite, Task
```

Examples: Builder, Validator, Scribe

#### Coordination Agents

For agents that only spawn others:

```yaml
tools: Read, TodoWrite, Task
```

Examples: Skills (workflow orchestrators)

#### Research Agents

For agents that need web access:

```yaml
tools: Glob, Grep, Read, WebFetch, WebSearch, TodoWrite, Task
```

Examples: Architect (for researching patterns), Debugger (for error lookups)

### Tool-Specific Guidelines

#### Bash Tool

**Use when**: Need to run tests, build commands, or shell utilities

**Security note**: Bash has full system access. Only give to trusted agents.

```yaml
# Builder needs Bash for running tests
tools: Glob, Grep, LS, Read, Edit, Write, Bash, TodoWrite, Task
```

#### Task Tool

**Use when**: Agent needs to spawn other agents

**Required for**: All coordination agents and skills

```yaml
# Architect spawns specialist agents
tools: Glob, Grep, LS, Read, Task
```

#### WebFetch and WebSearch

**Use when**: Agent needs external information

**Use cases**:
- Looking up documentation
- Researching error messages
- Finding best practices

```yaml
# Debugger can search for error solutions
tools: Glob, Grep, Read, Edit, Write, WebFetch, WebSearch, TodoWrite, Task
```

### Example Tool Configurations

#### Security Auditor

```yaml
tools: Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task
```

- **Glob/Grep**: Find files with security concerns
- **Read**: Analyze code
- **Bash**: Run security scanning tools
- **Edit/Write**: Create security reports

#### Performance Analyst

```yaml
tools: Glob, Grep, LS, Read, NotebookRead, Bash, TodoWrite, Task
```

- **Glob/Grep**: Find database queries and loops
- **Read**: Analyze code patterns
- **Bash**: Run profiling tools
- **No Edit/Write**: Analysis only, no code changes

---

## Model Selection Guide

Claude Code offers three model tiers. Choose based on agent complexity and workload.

### Model Tiers

| Model | Cost | Speed | Reasoning | Best For |
|-------|------|-------|-----------|----------|
| **opus** | Highest | Slowest | Strongest | Complex planning, critical decisions |
| **sonnet** | Medium | Medium | Strong | General implementation, most agents |
| **haiku** | Lowest | Fastest | Good | Simple tasks, high-frequency operations |

### Model Selection Guidelines

#### Use Opus For

Complex reasoning and critical decisions:

```yaml
model: opus
```

**Examples**:
- Architect (planning and coordination)
- Spec Reviewer (critical compliance checking)
- Debugger (root cause analysis)

**When to use**:
- Requires understanding complex codebases
- Makes critical architectural decisions
- Handles ambiguous requirements
- Needs deep reasoning chains

#### Use Sonnet For

General implementation and standard workflows:

```yaml
model: sonnet
```

**Examples**:
- Builder (implementation)
- Validator (testing)
- Scribe (documentation)
- Quality Reviewer (code review)
- Most specialist agents

**When to use**:
- Standard implementation tasks
- Code review and validation
- Documentation writing
- Moderate complexity analysis
- Default choice for most agents

#### Use Haiku For

Simple, focused, high-frequency tasks:

```yaml
model: haiku
```

**Examples**:
- Simple formatting tasks
- Quick file operations
- Straightforward refactoring

**When to use**:
- Well-defined, simple tasks
- High-frequency operations
- Speed is critical
- Task is repetitive and straightforward

### Cost vs. Performance Tradeoffs

Consider the agent's role in the workflow:

```
Critical Path Agents (use opus):
┌─────────────┐
│ Architect   │ - Decisions affect entire workflow
│ Spec Review │ - Errors are expensive
│ Debugger    │ - Complex problem solving
└─────────────┘

Standard Agents (use sonnet):
┌─────────────┐
│ Builder     │ - Balanced implementation needs
│ Validator   │ - Good reasoning, reasonable speed
│ Specialists │ - Domain expertise
└─────────────┘

High-Frequency Agents (use haiku):
┌─────────────┐
│ Simple Util │ - Many small tasks
│ Formatting  │ - Repetitive operations
└─────────────┘
```

### Current Plugin Configuration

| Agent | Model | Rationale |
|-------|-------|-----------|
| orchestrate-architect | sonnet | Balanced planning and coordination |
| orchestrate-builder | sonnet | General implementation |
| orchestrate-validator | sonnet | Test writing and validation |
| orchestrate-scribe | sonnet | Documentation |
| orchestrate-spec-reviewer | sonnet | Compliance checking |
| orchestrate-quality-reviewer | sonnet | Code review |
| orchestrate-debugger | sonnet | Problem solving |
| orchestrate-security | sonnet | Security analysis |
| orchestrate-performance | sonnet | Performance analysis |
| orchestrate-devops | sonnet | Infrastructure |
| orchestrate-database | sonnet | Database design |
| orchestrate-api | sonnet | API design |
| orchestrate-uiux | sonnet | UI/UX validation |
| orchestrate-refactorer | sonnet | Code refactoring |
| orchestrate-migration | sonnet | Migration planning |

**Note**: All agents currently use `sonnet` for consistent, balanced performance. Consider upgrading Architect and Debugger to `opus` for enhanced reasoning if budget allows.

---

## Testing Your Changes

Test plugin modifications locally before publishing.

### Testing with --plugin-dir

The `--plugin-dir` flag loads a plugin from a local directory:

```bash
# Navigate to your test project
cd /path/to/your-test-project

# Launch Claude with plugin directory
claude --plugin-dir /path/to/claude-agent-orchestration-plugin/plugins/agent-orch
```

**What this does**:
- Loads the plugin from local directory (not marketplace)
- No installation required
- Changes take effect immediately
- Perfect for development and testing

### Testing Individual Agents

Test a single agent:

```bash
claude --plugin-dir /path/to/plugins/agent-orch

# In Claude Code:
> Launch the orchestrate-builder agent to implement a simple function
```

Verify:
1. Agent loads successfully
2. Tool access works as expected
3. Instructions are followed
4. Output format is correct

### Testing Skills

Test skill workflows:

```bash
claude --plugin-dir /path/to/plugins/agent-orch

# In Claude Code:
> /agent-orch:build
```

Verify:
1. Skill is discovered and available
2. All phases execute in order
3. Agents spawn correctly
4. Coordination works as expected
5. Output matches expectations

### Testing Agent Modifications

When modifying an agent:

#### Step 1: Create Test Scenario

Set up a minimal test case:

```bash
mkdir test-project
cd test-project
mkdir .specify specs specs/test-feature
echo "# Test Feature\n\nTest requirement" > specs/test-feature/spec.md
echo "# Tasks\n\n- [ ] Test task" > specs/test-feature/tasks.md
```

#### Step 2: Test Before Changes

```bash
claude --plugin-dir /path/to/plugins/agent-orch

> Launch the orchestrate-[agent] agent to [test task]
```

Document baseline behavior.

#### Step 3: Make Changes

Edit `plugins/agent-orch/agents/orchestrate-[agent].md`

#### Step 4: Test After Changes

Exit Claude (if running) and restart:

```bash
claude --plugin-dir /path/to/plugins/agent-orch

> Launch the orchestrate-[agent] agent to [test task]
```

Verify changes work as expected.

#### Step 5: Test Edge Cases

Test failure scenarios:
- Missing files
- Invalid input
- Tool failures
- Unexpected conditions

### Integration Testing

Test full workflows:

#### Spec-Kit Mode

```bash
cd test-project
mkdir -p specs/auth
echo "# Auth\n\nUser login" > specs/auth/spec.md
echo "# Plan\n\nImplement login" > specs/auth/plan.md
echo "# Tasks\n\n- [ ] Builder: Implement" > specs/auth/tasks.md

claude --plugin-dir /path/to/plugins/agent-orch
> /agent-orch:implement auth
```

Verify:
1. Architect reads specs correctly
2. All core agents spawn
3. Specialists activate appropriately
4. Two-stage review works
5. Status updates correctly

#### Standalone Mode

```bash
cd test-project

claude --plugin-dir /path/to/plugins/agent-orch
> /agent-orch:build
```

Verify:
1. Requirements gathering works
2. PLAN.md is created correctly
3. Agents execute tasks
4. STATUS.md tracks progress

### Debugging Failed Tests

If something breaks:

#### Check Agent Logs

Claude Code shows agent execution. Look for:
- Tool call errors
- Parsing failures
- Unexpected output

#### Verify Frontmatter

Common issues:

```yaml
# Wrong:
tools: Glob Grep Read  # Missing commas
model: sonnett          # Typo

# Correct:
tools: Glob, Grep, Read
model: sonnet
```

#### Test Tool Access

Verify tools work:

```bash
claude --plugin-dir /path/to/plugins/agent-orch

> Launch the orchestrate-builder agent to read this file using the Read tool: test.txt
```

If Read fails, check:
- Tool name spelled correctly in frontmatter
- File exists and is accessible

#### Validate Markdown

Ensure valid markdown:
- Frontmatter enclosed in `---`
- Code blocks properly closed
- No invalid characters

---

## Submitting Changes

Contribute improvements back to the plugin.

### Fork/Modify/Test Workflow

#### Step 1: Fork the Repository

On your Git hosting platform (GitHub, GitLab, etc.):

1. Navigate to `https://code.ssnc.dev/jjones5/claude-agent-orchestration-plugin` (or equivalent)
2. Click "Fork"
3. Clone your fork:

```bash
git clone https://your-host/your-username/claude-agent-orchestration-plugin.git
cd claude-agent-orchestration-plugin
```

#### Step 2: Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/[name]` - New features
- `fix/[name]` - Bug fixes
- `docs/[name]` - Documentation
- `agent/[name]` - Agent changes
- `skill/[name]` - Skill changes

#### Step 3: Make Your Changes

Edit files in `plugins/agent-orch/`:

```bash
# Example: Modify builder agent
vim plugins/agent-orch/agents/orchestrate-builder.md

# Example: Create new skill
mkdir -p plugins/agent-orch/skills/my-skill
vim plugins/agent-orch/skills/my-skill/SKILL.md
```

#### Step 4: Test Thoroughly

```bash
# Test in a real project
cd /path/to/test-project
claude --plugin-dir /path/to/your-fork/plugins/agent-orch

# Run your tests
> [Test your changes]
```

Test checklist:
- [ ] Agent/skill loads without errors
- [ ] All tools work as expected
- [ ] Instructions are followed correctly
- [ ] Output format matches expectations
- [ ] Edge cases handled properly
- [ ] No regressions in other agents

#### Step 5: Update Documentation

If your changes affect users, update docs:

```bash
# Update user guide for new features
vim docs/USER_GUIDE.md

# Update README for significant changes
vim README.md

# Document new agents/skills
vim docs/CONTRIBUTING.md
```

#### Step 6: Commit Changes

```bash
git add plugins/agent-orch/agents/orchestrate-[name].md
git commit -m "feat(agent): improve builder verification gate

- Add stricter evidence requirements
- Include test output format validation
- Update examples with actual test runs"
```

Commit message format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code refactoring
- `test`: Adding tests

Scopes:
- `agent`: Agent changes
- `skill`: Skill changes
- `docs`: Documentation
- `core`: Core plugin functionality

#### Step 7: Push to Your Fork

```bash
git push origin feature/your-feature-name
```

#### Step 8: Create Pull Request

1. Go to your fork on the Git hosting platform
2. Click "Create Pull Request"
3. Fill in PR template:

```markdown
## Description
[What does this PR do?]

## Type of Change
- [ ] New agent
- [ ] Agent modification
- [ ] New skill
- [ ] Skill modification
- [ ] Documentation
- [ ] Bug fix

## Testing
[How did you test this?]

## Checklist
- [ ] Tested with --plugin-dir
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Follows agent/skill conventions
```

4. Submit PR

#### Step 9: Address Review Feedback

Maintainers may request changes:

```bash
# Make requested changes
vim plugins/agent-orch/agents/orchestrate-[name].md

# Test again
cd /path/to/test-project
claude --plugin-dir /path/to/your-fork/plugins/agent-orch

# Commit and push
git add .
git commit -m "fix: address review feedback"
git push origin feature/your-feature-name
```

PR automatically updates.

### Contribution Guidelines

#### Code Quality

- Follow existing patterns and conventions
- Match the style of existing agents/skills
- Keep instructions clear and concise
- Use consistent formatting

#### Agent Guidelines

- Clear role definition
- Spec-kit integration documented
- Explicit output format
- Quality standards defined
- Tool access justified

#### Skill Guidelines

- Clear phase structure
- Parallel execution where possible
- Proper agent coordination
- Exit conditions defined
- User interaction points clear

#### Documentation Standards

- Update USER_GUIDE.md for user-facing changes
- Update CONTRIBUTING.md for developer changes
- Provide examples for new features
- Keep documentation in sync with code

### Breaking Changes

If your changes break existing functionality:

1. **Document** the breaking change clearly
2. **Provide migration guide** for users
3. **Update version** appropriately (semver)
4. **Announce** in PR description

Example breaking change:

```markdown
## BREAKING CHANGE

The Builder agent now requires explicit test evidence before marking tasks complete.

### Migration Guide

Update any automation that relies on Builder marking tasks complete without verification:

**Before:**
```yaml
tools: Glob, Grep, Read, Edit, Write
```

**After:**
```yaml
tools: Glob, Grep, Read, Edit, Write, Bash  # Bash needed for test execution
```

Scripts that parse `status.md` should now expect verification sections.
```

---

## Development Tips

### Quick Iteration

Speed up development:

```bash
# Terminal 1: Edit files
vim plugins/agent-orch/agents/orchestrate-builder.md

# Terminal 2: Keep test project open
cd /path/to/test-project
claude --plugin-dir /path/to/plugins/agent-orch

# Make change, exit Claude (Ctrl+C), restart
# Changes load immediately
```

### Agent Template Starter

Copy from similar agent:

```bash
cp plugins/agent-orch/agents/orchestrate-security.md plugins/agent-orch/agents/orchestrate-[new].md
# Edit to customize
```

### Testing Checklist

Before submitting:

- [ ] Agent loads (`--plugin-dir` test)
- [ ] Frontmatter valid (YAML parsing)
- [ ] All tools work
- [ ] Instructions followed
- [ ] Output format correct
- [ ] Edge cases handled
- [ ] Documentation updated
- [ ] No regressions
- [ ] Commit messages clear

### Common Pitfalls

Avoid these mistakes:

#### Invalid Frontmatter

```yaml
# Wrong - missing quotes, typo
name: orchestrate builder
tools: Read Write Edit
model: sonnett

# Correct
name: orchestrate-builder
tools: Read, Write, Edit
model: sonnet
```

#### Missing Tools

```markdown
# Agent tries to use Edit tool but doesn't have it
---
tools: Read, Write
---

# Later in instructions:
> "Edit the file to fix the issue"  # ERROR: Edit tool not available
```

#### Inconsistent Naming

```yaml
# File: orchestrate-builder.md
name: builder  # Wrong - should match filename

# Correct:
name: orchestrate-builder
```

#### Unclear Instructions

```markdown
# Vague
"Do the task"

# Clear
"Read `specs/[feature]/tasks.md` for your assigned tasks.
For each task:
1. Read the implementation requirements
2. Write the code following codebase patterns
3. Update status.md with progress"
```

---

## Questions and Support

### Documentation

- [User Guide](USER_GUIDE.md) - Usage and workflows
- [Installation](INSTALLATION.md) - Setup instructions
- [Spec-Kit Integration](SPECKIT_INTEGRATION.md) - Spec-kit details

### Getting Help

For development questions:

1. Check existing agent implementations
2. Review skill examples
3. Test with `--plugin-dir`
4. Open an issue on the repository

### Providing Feedback

Help improve the plugin:

- Report bugs via issues
- Suggest features via discussions
- Share your custom agents
- Contribute documentation improvements

---

## License

MIT - See LICENSE file for details.
