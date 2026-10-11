# Claude Agent Orchestration - Quick Reference

Single-page cheat sheet for fast lookups. For detailed guides, see the main documentation.

---

## Table of Contents
- [All 23 Agents](#all-23-agents)
- [Skills](#skills)
- [Lightweight Commands](#lightweight-commands)
- [Key Commands](#key-commands)
- [File Paths](#file-paths)
- [.specify/ Structure](#specify-structure)
- [Agent Activation Triggers](#agent-activation-triggers)
- [Two-Stage Review Flow](#two-stage-review-flow)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)
- [Environment Variables](#environment-variables)

---

## All 23 Agents

### Core Team (Always Active)

| Agent | Role | When Activated | Model | Tools |
|-------|------|---------------|-------|-------|
| **orchestrate-architect** | Planning & Coordination | Always - First agent launched | Sonnet | Glob, Grep, Read, Edit, Write, TodoWrite, WebFetch, Task |
| **orchestrate-builder** | Implementation + Verification Gate | Always - Implements features | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-validator** | Testing & QA + Verification Gate | Always - Writes and runs tests | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-scribe** | Documentation | Always - Documents features | Sonnet | Glob, Grep, Read, Edit, Write, TodoWrite, Task, WebFetch |

### Review Team (Two-Stage Quality Gate)

| Agent | Role | When Activated | Model | Tools |
|-------|------|---------------|-------|-------|
| **orchestrate-spec-reviewer** | Stage 1: Spec Compliance | After implementation - Verifies spec match | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-quality-reviewer** | Stage 2: Code Quality | After Stage 1 passes - Reviews quality | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |

### Support Team

| Agent | Role | When Activated | Model | Tools |
|-------|------|---------------|-------|-------|
| **orchestrate-debugger** | Systematic Problem Solving | When tests fail or issues persist | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |

### Specialist Agents (Activated When Relevant)

| Agent | When Activated | Model | Tools |
|-------|---------------|-------|-------|
| **orchestrate-security** | Auth, user input, APIs, sensitive data | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-performance** | Database queries, loops, caching, real-time features | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-devops** | CI/CD, Docker, K8s, env vars, deployment | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-telemetry** | OTel, metrics, traces, Grafana | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-observability** | SRE, SLO/SLI, alerts, on-call runbooks | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-database** | Schema changes, migrations, new tables/columns | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-data-engineer** | ETL pipelines, data transformations, analytics | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-api** | New API endpoints, API modifications, contracts | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-uiux** | React/frontend, design system, accessibility | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-refactorer** | Modifying legacy code, complex functions | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-legacy-modernizer** | Legacy system upgrades, tech debt reduction | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-migration** | Framework upgrades, breaking changes, major versions | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task, WebFetch |
| **orchestrate-ml-engineer** | ML models, training, inference serving | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |
| **orchestrate-c4-scribe** | Architecture docs, C4 diagrams | Sonnet | Glob, Grep, Read, Edit, Write, TodoWrite, Task |
| **orchestrate-content-specialist** | Documentation, user guides, training materials | Sonnet | Glob, Grep, Read, Edit, Write, TodoWrite, Task |
| **orchestrate-incident-responder** | Production incidents, outages, critical bugs | Sonnet | Glob, Grep, Read, Edit, Write, Bash, TodoWrite, Task |

---

## Skills

| Skill | Description | Requirements | When to Use |
|-------|-------------|--------------|-------------|
| `/agent-orch:implement` | Multi-agent implementation with spec-kit | Requires `.specify/` directory | Use with GitHub spec-kit workflow |
| `/agent-orch:build` | Standalone implementation mode | No spec-kit required | Use in any project - conversation-based requirements |
| `/agent-orch:simplify` | Post-implementation code simplification | Completed feature with tests passing | Find reuse opportunities, improve quality before merge |
| `/agent-orch:analyse` | Multi-agent codebase analysis | Optional `.specify/` directory | Run before specification to understand codebase |
| `/agent-orch:olly` | Add OpenTelemetry observability | Any codebase | Greenfield observability or migrate from vendor SDKs |
| `/agent-orch:c4` | Generate C4 architecture docs | Any codebase | Document system architecture with Mermaid diagrams |
| `/agent-orch:enforce` | Convert issues to linter rules | Recurring quality issues | Turn patterns into deterministic checks |
| `/agent-orch:complib-guide` | Component library reference | UI/UX work | Reference for design system usage (internal use by UI/UX agent) |

---

## Lightweight Commands

Fast, single-pass commands without agent overhead (seconds, not minutes):

| Command | Description | When to Use |
|---------|-------------|-------------|
| `/agent-orch:status-check` | Quick project status summary | Before standup, after pulling changes, returning to work |
| `/agent-orch:review-quick` | Fast code review for critical issues | Pre-commit check, draft PR feedback, sanity check |
| `/agent-orch:test-check` | Verify tests pass and coverage | Before commit, quick validation |
| `/agent-orch:plan-review` | Validate PLAN.md completeness | After planning, before implementation |
| `/agent-orch:enforce-check` | Run enforcement rules | Before commit, CI/CD gate |
| `/agent-orch:db-migration-check` | Verify migration safety | After writing migration, before merge |
| `/agent-orch:security-quick` | Fast security vulnerability scan | Pre-commit, quick security check |
| `/agent-orch:docs-sync` | Check docs match implementation | After code changes, before merge |

---

## Key Commands

### Installation

```bash
# Quick test (no installation)
git clone https://code.ssnc.dev/jjones5/claude-agent-orchestration-plugin.git
cd claude-agent-orchestration-plugin
claude --plugin-dir ./plugins/agent-orch

# Marketplace installation (recommended)
claude plugin marketplace add /path/to/claude-agent-orchestration-plugin
claude plugin install agent-orch@ssnc-plugins

# Verify installation
claude plugin list
```

### Usage

```bash
# With spec-kit (requires .specify/)
/agent-orch:implement [feature-name]

# Standalone mode (no spec-kit)
/agent-orch:build [description]

# Post-implementation simplification
/agent-orch:simplify

# Analyse codebase
/agent-orch:analyse [area]

# Quick status check
/agent-orch:status-check

# Fast code review
/agent-orch:review-quick
```

### Testing

```bash
# Debug mode
claude --plugin-dir ./plugins/agent-orch --debug

# Test a skill
/agent-orch:build
```

### Uninstall

```bash
# Via command line
claude plugin uninstall agent-orch@ssnc-plugins
claude plugin marketplace remove ssnc-plugins
```

---

## File Paths

### Plugin Structure

```
claude-agent-orchestration-plugin/
├── .claude-plugin/
│   └── marketplace.json              # Marketplace definition
├── plugins/
│   └── agent-orch/                   # The plugin
│       ├── .claude-plugin/
│       │   └── plugin.json           # Plugin manifest
│       ├── agents/                   # 15 agent definitions
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
│       ├── skills/                   # User-invokable skills
│       │   ├── implement/SKILL.md
│       │   ├── build/SKILL.md
│       │   ├── analyse/SKILL.md
│       │   └── complib-guide/SKILL.md
│       └── README.md
├── docs/                             # Documentation
│   ├── INSTALLATION.md
│   ├── USER_GUIDE.md
│   ├── SPECKIT_INTEGRATION.md
│   └── QUICK_REFERENCE.md (this file)
├── install.sh
├── uninstall.sh
└── examples/
    └── EXAMPLE_WORKFLOW.md
```

### Project Files (Spec-Kit Mode)

```
your-project/
├── .specify/                         # Spec-kit structure
│   ├── memory/
│   │   └── constitution.md           # Project standards
│   ├── specs/[feature]/
│   │   ├── spec.md                   # Feature specification
│   │   ├── plan.md                   # Implementation plan
│   │   ├── tasks.md                  # Agent task assignments
│   │   └── status.md                 # Agent progress tracking
│   └── orchestration/[feature]/
│       └── agents.md                 # Specialist activation
└── CLAUDE.md                         # Optional project context
```

### Project Files (Standalone Mode)

```
your-project/
├── CLAUDE.md                         # Project standards (constitution)
├── PLAN.md                           # Requirements + implementation plan (created)
├── STATUS.md                         # Agent progress tracking (created)
└── ... (your code)
```

---

## .specify/ Structure

### Full Directory Layout

```
.specify/
├── memory/                           # Project knowledge base
│   ├── constitution.md               # Code standards, patterns, conventions
│   ├── guidelines.md                 # Development guidelines
│   └── learnings.md                  # Project learnings
│
├── specs/[feature]/                  # Per-feature directories
│   ├── spec.md                       # Feature specification (from /speckit.specify)
│   ├── plan.md                       # Implementation plan (from /speckit.plan)
│   ├── tasks.md                      # Task list with agent assignments
│   └── status.md                     # Agent progress and review results
│
├── orchestration/[feature]/          # Agent coordination (created if needed)
│   └── agents.md                     # Which agents are active
│
└── templates/                        # Reusable templates
    ├── spec-template.md
    └── plan-template.md
```

### Key File Purposes

| File | Purpose | Who Reads | Who Writes |
|------|---------|-----------|------------|
| `memory/constitution.md` | Project standards, quality gates | All agents | Scribe updates with learnings |
| `specs/[feature]/spec.md` | Feature specification | All agents | Scribe (if approved deviations) |
| `specs/[feature]/plan.md` | Implementation approach | Architect, Builder, Validator | Architect updates |
| `specs/[feature]/tasks.md` | Agent task assignments | All agents | Architect assigns, agents update |
| `specs/[feature]/status.md` | Progress, issues, review results | All agents | All agents report progress |
| `orchestration/[feature]/agents.md` | Specialist activation decisions | Architect | Architect |

---

## Agent Activation Triggers

### Core Team (Always Active)

- **Architect**: Every implementation - launched first
- **Builder**: Every implementation - does the coding
- **Validator**: Every implementation - writes tests
- **Scribe**: Every implementation - documents features

### Review Team (After Implementation)

- **Spec Reviewer**: After Builder completes - Stage 1
- **Quality Reviewer**: After Stage 1 passes - Stage 2

### Support Team (When Needed)

- **Debugger**:
  - Tests failing unexpectedly
  - Multiple failed fix attempts
  - Implementation doesn't work as expected
  - Issues persist after refinement rounds

### Specialists (Architect Decides)

| Specialist | Activate When You See |
|------------|----------------------|
| **Security** | Auth code, login, tokens, user input, API endpoints, password handling, file uploads, admin features, database queries with user input |
| **Performance** | Database queries in loops, N+1 queries, large data processing, real-time features, caching opportunities, slow endpoints |
| **DevOps** | New services, new endpoints, environment variables added, Docker/K8s changes, CI/CD pipeline updates, deployment scripts |
| **Database** | New tables, schema changes, new columns, foreign keys, indexes, migrations, data model changes |
| **API** | New REST endpoints, GraphQL changes, API contracts, request/response schemas, OpenAPI/Swagger updates |
| **UI/UX** | React components, frontend work, design system usage, accessibility requirements, new UI features, forms, layouts |
| **Refactorer** | Modifying legacy code (>2 years old), complex functions (>50 lines), high cyclomatic complexity, code duplication |
| **Migration** | Framework upgrades (React, Node, etc.), library major version bumps, breaking API changes, deprecation warnings |
| **Observability** | SRE practices, SLO/SLI definitions, alert tuning, on-call runbooks, incident response preparation |
| **Data Engineer** | ETL pipelines, data transformations, batch/stream processing, data quality checks, analytics workloads |
| **ML Engineer** | ML model development, training pipelines, evaluation metrics, model serving, inference optimization |
| **Legacy Modernizer** | Legacy system modernization, tech debt reduction, incremental migration, strangler fig pattern |
| **Content Specialist** | Technical documentation, API docs, user guides, training materials, onboarding documentation |
| **Incident Responder** | Production incidents, system outages, critical bugs, incident triage, postmortem reports |

---

## Two-Stage Review Flow

### Visual Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  PHASE 3: IMPLEMENTATION                     │
│  Architect → Builder + Validator + Scribe + Specialists      │
│  (All agents work in parallel)                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 4: TWO-STAGE CODE REVIEW                  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  STAGE 1: SPEC COMPLIANCE                             │  │
│  │  (orchestrate-spec-reviewer)                          │  │
│  │                                                        │  │
│  │  ✓ Does code match spec exactly?                      │  │
│  │  ✓ Are all requirements implemented?                  │  │
│  │  ✓ Any missing features?                              │  │
│  │  ✓ Any scope creep?                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│         │                                                     │
│         ├─── FAIL ──► Refinement ──► Re-run Stage 1         │
│         │                                                     │
│         ▼ PASS                                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  STAGE 2: CODE QUALITY                                │  │
│  │  (orchestrate-quality-reviewer)                       │  │
│  │                                                        │  │
│  │  ✓ Constitution compliance?                           │  │
│  │  ✓ Code patterns correct?                             │  │
│  │  ✓ Test coverage adequate?                            │  │
│  │  ✓ Documentation complete?                            │  │
│  └───────────────────────────────────────────────────────┘  │
│         │                                                     │
│         ├─── FAIL ──► Refinement ──► Re-run Stage 2         │
│         │                                                     │
│         ▼ PASS                                                │
│  ┌─────────────┐                                             │
│  │  APPROVED   │                                             │
│  └─────────────┘                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 6: FINALIZE                         │
└─────────────────────────────────────────────────────────────┘
```

### Stage 1: Spec Compliance

**Purpose**: Verify implementation matches specification exactly

**Checks**:
- Every requirement in spec.md is implemented
- No missing features
- No unrequested additions (scope creep)
- Evidence: file paths and line numbers

**Outcomes**:
- PASSED → Proceed to Stage 2
- FAILED → Create refinement tasks, re-run Stage 1 after fixes

**Maximum**: 3 rounds before escalation

### Stage 2: Code Quality

**Purpose**: Validate code meets quality standards

**Prerequisites**: Stage 1 must show PASSED

**Checks**:
- Constitution compliance
- Code patterns, naming, structure
- Test quality and coverage
- Error handling
- Documentation completeness

**Severity Levels**:
- CRITICAL: Blocks release
- HIGH: Must fix before approval
- MEDIUM: Should fix
- LOW: Can defer

**Outcomes**:
- APPROVED → Ready for finalization
- NEEDS WORK → Create refinement tasks, re-run Stage 2 after fixes

**Maximum**: 3 rounds before escalation

### Verification Gates

Both Builder and Validator have **mandatory verification gates**:

**Builder Verification Gate**:
- Must provide test output evidence before marking tasks complete
- No "should work" or "probably passes" language
- Must show actual command output

**Validator Verification Gate**:
- Must show actual test run output
- Must include pass/fail counts and coverage numbers
- No completion claims without fresh test evidence

---

## Common Workflows

### Workflow 1: Spec-Kit Full Implementation

```bash
# 1. Standard spec-kit setup
cd your-project
claude

> /speckit.specify      # Write specification
> /speckit.plan         # Create implementation plan
> /speckit.tasks        # Generate task list

# 2. Multi-agent implementation
> /agent-orch:implement

# Orchestrator will:
# - Auto-detect feature from specs/
# - Architect analyses and recommends specialists
# - You approve the plan
# - All agents execute in parallel
# - Two-stage review with iterative refinement
# - Debugger launches if tests fail

# 3. Final validation
> /speckit.checklist    # Verify all requirements met
```

### Workflow 2: Standalone Mode (No Spec-Kit)

```bash
# 1. Start in any project
cd your-project
claude

# 2. Multi-agent implementation (conversation-based)
> /agent-orch:build

# Orchestrator will:
# - Gather requirements through conversation
# - Create PLAN.md with requirements and tasks
# - Architect recommends specialists
# - You approve the plan
# - All agents execute in parallel
# - Two-stage review with iterative refinement
# - Creates STATUS.md for tracking
```

### Workflow 3: Codebase Analysis Before Specification

```bash
# 1. Analyse before specifying
cd your-project
claude

> /agent-orch:analyse authentication

# Agents will:
# - Architect analyses architecture and patterns
# - Scribe identifies documentation gaps
# - Return 15-20 key files to review

# 2. Then proceed with spec-kit
> /speckit.specify      # Armed with analysis insights
```

### Workflow 4: Debugging Failed Tests

```bash
# During implementation, tests fail:
> /agent-orch:implement feature-name

# If Builder's tests fail after 2-3 attempts:
# - Orchestrator automatically launches orchestrate-debugger
# - Debugger uses 4-phase methodology:
#   1. Root Cause Investigation
#   2. Pattern Analysis (find working examples)
#   3. Hypothesis & Testing
#   4. Implementation (failing test first)
# - After 3 failed attempts, stops for architectural review
```

### Workflow 5: Post-Implementation Simplification

```bash
# After feature is complete:
> /agent-orch:build

# [Feature implemented, tests pass, two-stage review complete]

# Now simplify before merge:
> /agent-orch:simplify

# Review finds:
# - 3 HIGH confidence improvements (duplicated logic, nested conditionals)
# - 2 MEDIUM confidence improvements (extract constants, consolidate errors)

User: yes  # Apply all HIGH confidence changes

# Changes applied, tests re-run automatically
# Code simplified, ready for final PR
```

### Workflow 6: Quick Checks Before Commit

```bash
# Before committing code:

# Quick status check
> /agent-orch:status-check
# Shows: Current work, blockers, uncommitted files

# Fast code review
> /agent-orch:review-quick
# Shows: 1 critical issue (SQL injection risk), 2 test gaps

# Fix issues, then verify
> /agent-orch:test-check
# All tests pass, coverage at 92%

# Ready to commit
git add .
git commit -m "feat: user authentication"
```

---

## Troubleshooting

### Quick Fixes

| Issue | Solution |
|-------|----------|
| "Unknown skill" error | Plugin not loaded. Run: `claude plugin list` to check installation |
| Skills not appearing | Restart Claude Code completely after installation |
| Plugin not updating | Force reinstall: `claude plugin uninstall agent-orch@ssnc-plugins` then `claude plugin install agent-orch@ssnc-plugins` |
| Can't find .specify/ | Use `/agent-orch:build` for standalone mode, or run `/speckit.init` to set up spec-kit |
| Agents not activating | Check debug mode: `claude --debug` to see loading messages |
| Stage 2 blocked | Verify Stage 1 shows "PASSED" in `status.md` |
| Tests failing repeatedly | Debugger auto-launches after 2-3 attempts. Uses 4-phase systematic methodology |

### Common Errors

**"No .specify/ directory found"**
```
Solution: Use standalone mode
> /agent-orch:build
```

**"Stage 1 must pass before Stage 2"**
```
Solution: Check status.md for Stage 1 results
- Fix missing requirements
- Re-run Stage 1 review
- Stage 2 only proceeds after PASSED
```

**"Verification gate failed"**
```
Builder/Validator must provide evidence:
- Run verification command
- Include actual output
- Show test results, coverage, pass/fail counts
- No completion claims without proof
```

### Debug Mode

```bash
# Start with debug output
claude --plugin-dir ./plugins/agent-orch --debug

# Look for:
# - "Loading plugin: agent-orch"
# - "Registered skill: implement"
# - Agent launch messages
```

### Token Issues

```bash
# Verify token
echo $GITHUB_TOKEN

# Token requirements:
# - Must have 'repo' scope
# - For GitHub Enterprise, must be from that instance
# - For github.com, must be github.com token

# Test git access directly
git clone https://$GITHUB_TOKEN@code.ssnc.dev/your-org/repo.git /tmp/test
```

---

## Environment Variables

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `GITHUB_TOKEN` | Yes (private repos) | none | GitHub personal access token with `repo` scope | `ghp_xxxxxxxxxxxxxxxxxxxx` |
| `GH_TOKEN` | Alternative | none | Alternative to `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxxxxxxxxxx` |
| `GITLAB_TOKEN` | For GitLab | none | GitLab personal access token | `glpat-xxxxxxxxxxxx` |

### Setting Environment Variables

**Bash/Zsh** (~/.bashrc or ~/.zshrc):
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

**Fish** (~/.config/fish/config.fish):
```fish
set -x GITHUB_TOKEN ghp_xxxxxxxxxxxxxxxxxxxx
```

**Windows PowerShell**:
```powershell
$env:GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

**Reload shell**:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

---

## Additional Resources

- **Installation Guide**: [docs/INSTALLATION.md](INSTALLATION.md)
- **User Guide**: [docs/USER_GUIDE.md](USER_GUIDE.md)
- **Spec-Kit Integration**: [docs/SPECKIT_INTEGRATION.md](SPECKIT_INTEGRATION.md)
- **Example Workflow**: [examples/EXAMPLE_WORKFLOW.md](../examples/EXAMPLE_WORKFLOW.md)
- **Main README**: [README.md](../README.md)

---

## Feature Summary

| Feature | Count | Details |
|---------|-------|---------|
| **Agents** | 23 | 4 core + 2 review + 1 support + 16 specialists |
| **Skills** | 8 | build, implement, simplify, analyse, olly, c4, enforce, complib-guide |
| **Commands** | 8 | status-check, review-quick, test-check, plan-review, enforce-check, db-migration-check, security-quick, docs-sync |
| **Quality Gates** | 6 | TDD, coverage targets, Playwright e2e, no scaffolding, integration verification, two-stage review |
| **Coordination Modes** | 2 | Subagents (simple) + Agent Teams (complex) |

---

## Version

Plugin Version: 2.7.0
Last Updated: 2026-03-28
