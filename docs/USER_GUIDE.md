# User Guide

This guide covers how to effectively use the Claude Agent Orchestration plugin for multi-agent development workflows.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [The 23 Agents](#the-23-agents)
3. [Available Skills](#available-skills)
4. [Lightweight Commands](#lightweight-commands)
5. [Understanding Verification Gates](#understanding-verification-gates)
6. [Two-Stage Review Process](#two-stage-review-process)
7. [Agent Activation & Overrides](#agent-activation--overrides)
8. [Workflow Examples](#workflow-examples)
9. [Best Practices](#best-practices)
10. [Customizing Agent Behavior](#customizing-agent-behavior)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Quick Test (No Installation)

Test the plugin immediately:

```bash
git clone https://code.ssnc.dev/jjones5/claude-agent-orchestration-plugin.git
cd claude-agent-orchestration-plugin
claude --plugin-dir ./plugins/agent-orch
```

Then try `/agent-orch:build` to test standalone mode.

### After Installation

Once installed via marketplace (see [Installation Guide](INSTALLATION.md)), use the plugin in any project:

**With Spec-Kit:**
```bash
cd your-project          # Has .specify/ directory
claude

# Standard spec-kit workflow first
> /speckit.specify       # Write specification
> /speckit.plan          # Create plan
> /speckit.tasks         # Generate tasks

# Then enhanced implementation
> /agent-orch:implement
```

**Without Spec-Kit (Standalone Mode):**
```bash
cd your-project          # Any project
claude
> /agent-orch:build     # Gathers requirements through conversation
```

The plugin will:
1. Auto-detect the feature from `specs/`
2. Launch the Architect agent to analyse and plan
3. Recommend which specialist agents to activate
4. Ask for your approval on the plan + specialists
5. Launch all approved agents in parallel
6. Track progress in `specs/[feature]/status.md`
7. Present consolidated results

### Using with Cline (VS Code)

For Cline users, install with the dedicated Cline installer (see [Installation Guide](INSTALLATION.md#cline-installation-vs-code)):

```bash
.\install-cline.ps1 -TargetRepo "C:\path\to\your-project"
```

Then type `/` in Cline to see available workflows:
- `/build.md` - Multi-agent implementation (standalone)
- `/implement.md` - Multi-agent implementation (with spec-kit)
- `/analyse.md` - Multi-agent codebase analysis

For MCP integrations (Jira, Confluence, TestRail, Azure DevOps), see the [MCP Integration for Cline](../README.md#mcp-integration-for-cline) section.

---

## The 23 Agents

### Core Team (Always Active)

These 4 agents run on every implementation:

#### Architect (Planning & Coordination)
- Reads `specs/` and `.specify/memory/`
- Analyses codebase patterns
- Assigns tasks to other agents
- Selects which specialists to activate
- Resolves design conflicts
- Acts as decision-maker

#### Builder (Implementation)
- Implements features according to specification
- Follows codebase patterns
- Updates progress in `tasks.md` and `status.md`
- Notifies Validator when features are ready

#### Validator (Testing & QA)
- Writes tests based on spec requirements
- Validates implementation against `specs/`
- Reports spec compliance issues
- Ensures edge cases are covered

#### Scribe (Documentation)
- Documents completed features
- Creates usage examples
- Updates `.specify/` when implementation deviates
- Maintains API documentation

### Review Team (Two-Stage Quality Gate)

These 2 agents provide sequential quality validation:

#### Spec Reviewer (Stage 1: Spec Compliance)
- Verifies implementation matches spec **exactly** - nothing more, nothing less
- Distrusts implementer claims, requires independent code verification
- Must PASS before Stage 2 can begin
- Creates refinement tasks for missing requirements

#### Quality Reviewer (Stage 2: Code Quality)
- Reviews code against constitution for patterns, consistency, test coverage
- Only runs after Stage 1 passes
- Has authority to request refinements
- Must APPROVE before finalization proceeds

### Support Team (When Needed)

#### Debugger (Systematic Problem Solving)
- Launched when tests fail or issues persist
- Uses 4-phase methodology: Root Cause Investigation → Pattern Analysis → Hypothesis Testing → Implementation
- **NO FIXES WITHOUT ROOT CAUSE**
- Stops after 3 failed attempts for architectural review

---

### Specialist Agents (Activated When Relevant)

These 14 agents are activated by the Architect based on the task:

#### Security Auditor
**Activated when**: Auth code, user input, API endpoints, sensitive data
- Reviews code for OWASP Top 10 vulnerabilities
- Checks authentication/authorization
- Validates input handling
- Identifies injection risks

#### Performance Analyst
**Activated when**: Database queries, loops, caching, real-time features
- Identifies N+1 queries
- Detects bottlenecks
- Finds memory leaks
- Recommends caching strategies

#### DevOps Engineer
**Activated when**: New services, env var changes, Docker/K8s updates
- Creates/updates CI/CD pipelines
- Manages Docker configurations
- Handles Kubernetes manifests
- Documents environment variables

#### Database Architect
**Activated when**: Schema changes, new tables, migrations
- Designs database schemas
- Creates migration scripts
- Optimizes queries
- Recommends indexes

#### API Designer
**Activated when**: New API endpoints, API modifications
- Designs RESTful endpoints
- Creates OpenAPI/Swagger specs
- Ensures API consistency
- Defines request/response schemas

#### UI/UX Designer
**Activated when**: React/frontend, design system, accessibility
- Ensures design system component usage
- Validates accessibility (WCAG 2.1 AA)
- Checks design token compliance
- Reviews component library usage

#### Refactorer
**Activated when**: Modifying legacy code, complex functions
- Identifies code smells
- Flags technical debt
- Suggests extraction opportunities
- Recommends pattern improvements

#### Migration Specialist
**Activated when**: Framework upgrades, breaking changes
- Plans migration paths
- Ensures backward compatibility
- Designs deprecation strategies
- Creates upgrade guides

#### Observability Engineer
**Activated when**: Production monitoring, SRE practices, alerting
- End-to-end observability strategy
- SLO/SLI definition and tracking
- Alert tuning and on-call runbooks
- Incident response preparation

#### Data Engineer
**Activated when**: ETL pipelines, data transformations, analytics
- Data pipeline architecture
- Transformation logic and quality checks
- Batch and stream processing
- Data validation and governance

#### ML Engineer
**Activated when**: ML models, training pipelines, inference
- Model architecture design
- Training loops and hyperparameter tuning
- Evaluation metrics and validation
- Serving infrastructure and optimization

#### Legacy Modernizer
**Activated when**: Legacy system upgrades, technical debt reduction
- Modernization strategy and roadmap
- Incremental migration planning
- Strangler fig pattern implementation
- Risk mitigation and rollback planning

#### Content Specialist
**Activated when**: Documentation needs, user guides, training materials
- Technical writing and API documentation
- User guides and tutorials
- Training materials and onboarding docs
- Documentation quality and clarity

#### Incident Responder
**Activated when**: Production incidents, outages, critical bugs
- Incident triage and severity assessment
- Root cause analysis
- Mitigation steps and workarounds
- Postmortem reports and prevention

---

## Available Skills

### `/agent-orch:implement`

Full multi-agent implementation workflow. Auto-detects feature from `.specify/`.

```
> /agent-orch:implement
```

**Phases:**
1. **Read Artifacts** - Read from `specs/` (auto-detect feature)
2. **Architect Planning** - Analyse and recommend specialists
3. **User Approval** - You review plan + specialist selection
4. **Parallel Implementation** - All approved agents work simultaneously
5. **Two-Stage Code Review** - Spec Compliance (Stage 1) → Code Quality (Stage 2)
6. **Issue Resolution** - Fix any problems found (iterative refinement loops)
7. **Finalization** - Summary and completion (after Quality Reviewer approval)

---

### `/agent-orch:build`

Standalone mode - no spec-kit required. Gathers requirements through conversation.

```
> /agent-orch:build
```

**Use this when:**
- You don't have spec-kit set up
- Quick prototyping without formal specs
- Working on smaller features

Creates `PLAN.md` and `STATUS.md` in project root instead of using `.specify/`.

---

### `/agent-orch:analyse`

Multi-agent codebase analysis without implementation.

```
> /agent-orch:analyse
```

**Use this when:**
- Understanding code before writing specifications
- Preparing for `/speckit.specify`
- Onboarding to a new codebase

---


### `/agent-orch:simplify`

Post-implementation code simplification and optimization.

```
> /agent-orch:simplify
```

**Use this when:**
- Feature is complete and tests pass
- Code is ready for PR
- Want to improve code quality before merge
- Looking for reuse opportunities

**What it does:**
- Identifies duplicated logic worth extracting
- Finds over-engineered solutions
- Detects performance inefficiencies
- Suggests quality improvements
- User approves changes before applying

**Confidence levels:**
- HIGH: Safe to apply automatically
- MEDIUM: Review carefully before applying
- LOW: User discretion advised

---



1. **Run the actual command** (test, build, lint, etc.)
2. **Capture real output** (not hypothetical results)
3. **Document evidence** in `status.md`

### Evidence Requirements

Agents must provide:

| Element | Description | Example |
|---------|-------------|---------|
| **Command** | Exact command executed | `npm test -- --grep "registration"` |
| **Output** | Full or relevant output | `PASS src/api/auth/register.test.ts` |
| **Exit Code** | Success/failure indicator | `Exit code: 0` |
| **File Location** | Where code was created/modified | `src/api/auth/register.ts:45-67` |

### Example Verification Report

```markdown
### Verification: User Registration Endpoint

#### Command
```bash
npm test -- --grep "registration"
```

#### Evidence
```
PASS src/api/auth/register.test.ts
  ✓ creates new user with valid data (45ms)
  ✓ rejects duplicate email (23ms)
  ✓ validates password requirements (18ms)

Tests: 3 passed
```

#### Files Modified
- `src/api/auth/register.ts:45-67` - Registration endpoint

## Lightweight Commands

Fast, single-pass commands without agent overhead. Results in seconds, not minutes.

### `/agent-orch:status-check`

Quick project status summary.

```
> /agent-orch:status-check
```

**Shows:**
- Current work in progress
- Recent activity
- Blockers or issues
- Next steps
- Uncommitted changes

**Use before:** Standups, planning next task, after pulling changes

---

### `/agent-orch:review-quick`

Fast code review for critical issues only.

```
> /agent-orch:review-quick
```

**Checks:**
- Critical security vulnerabilities
- Constitution violations
- Missing error handling
- Test coverage gaps

**Does NOT check:** Style, naming, refactoring suggestions (use full review for that)

**Use for:** Pre-commit checks, draft PR feedback, quick sanity checks

---

### `/agent-orch:test-check`

Verify tests pass and coverage meets targets.

```
> /agent-orch:test-check
```

---

### `/agent-orch:plan-review`

Validate PLAN.md completeness and feasibility.

```
> /agent-orch:plan-review
```

---

### `/agent-orch:enforce-check`

Run enforcement rules without full verification.

```
> /agent-orch:enforce-check
```

---

### `/agent-orch:db-migration-check`

Verify migrations are safe and reversible.

```
> /agent-orch:db-migration-check
```

---

### `/agent-orch:security-quick`

Fast security scan for common vulnerabilities.

```
> /agent-orch:security-quick
```

---

### `/agent-orch:docs-sync`

Check documentation matches implementation.

```
> /agent-orch:docs-sync
```

---

## Understanding Verification Gates

Builder and Validator agents have **mandatory verification gates** - they cannot claim task completion without providing evidence.

### What is a Verification Gate?

A verification gate is a checkpoint that prevents agents from marking tasks complete based on assumptions. The agent must:

1. **Run the actual command** (test, build, lint, etc.)
2. **Capture real output** (not hypothetical results)
3. **Document evidence** in `status.md`

### Evidence Requirements

Agents must provide:

| Element | Description | Example |
|---------|-------------|---------|
| **Command** | Exact command executed | `npm test -- --grep "registration"` |
| **Output** | Full or relevant output | `PASS src/api/auth/register.test.ts` |
| **Exit Code** | Success/failure indicator | `Exit code: 0` |
| **File Location** | Where code was created/modified | `src/api/auth/register.ts:45-67` |

### Example Verification Report

```markdown
### Verification: User Registration Endpoint

#### Command
```bash
npm test -- --grep "registration"
```

#### Evidence
```
PASS src/api/auth/register.test.ts
  ✓ creates new user with valid data (45ms)
  ✓ rejects duplicate email (23ms)
  ✓ validates password requirements (18ms)

Tests: 3 passed
```

#### Files Modified
- `src/api/auth/register.ts:45-67` - Registration endpoint
- `src/api/auth/register.test.ts:1-89` - Test suite
```

### Prohibited Language

These phrases are **not acceptable** as evidence:

- "Should work as expected"
- "Tests should pass"
- "Implementation complete"
- "Ready for review"

Without actual evidence, the task remains incomplete.

---

## Two-Stage Review Process

The review process has two sequential stages. Stage 2 **cannot begin** until Stage 1 passes.

### Visual Flow

```
┌─────────────────────────────────────────┐
│          Implementation Complete         │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  STAGE 1: Spec Compliance Review        │
│  (orchestrate-spec-reviewer)            │
│                                         │
│  Does code match spec exactly?          │
│  - Verify each requirement with code    │
│  - Detect missing features              │
│  - Detect scope creep                   │
└────────────────────┬────────────────────┘
          │                    │
       PASSED               FAILED
          │                    │
          │         ┌──────────▼──────────┐
          │         │   Refinement Loop   │
          │         │   (max 3 rounds)    │
          │         └──────────┬──────────┘
          │                    │
          ◄────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  STAGE 2: Code Quality Review           │
│  (orchestrate-quality-reviewer)         │
│                                         │
│  Does code meet quality standards?      │
│  - Constitution compliance              │
│  - Patterns and naming                  │
│  - Test coverage                        │
│  - Documentation                        │
└────────────────────┬────────────────────┘
          │                    │
       APPROVED             ISSUES
          │                    │
          │         ┌──────────▼──────────┐
          │         │   Refinement Loop   │
          │         │   (max 3 rounds)    │
          │         └──────────┬──────────┘
          │                    │
          ◄────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│              Finalization               │
└─────────────────────────────────────────┘
```

### Frequently Asked Questions

**Can I skip Stage 1?**
No. Spec compliance must be verified before code quality review. This prevents reviewing code quality for features that don't match requirements.

**Can I skip Stage 2?**
Yes, during the approval phase you can choose to skip code quality review. However, this is not recommended for production code.

**What if Stage 2 finds spec violations?**
Stage 2 should not find spec violations - that's Stage 1's job. If Quality Reviewer finds missing requirements, they'll flag it and loop back to Spec Reviewer.

**What's the maximum refinement rounds?**
3 rounds per stage. After 3 failed rounds, the orchestrator presents remaining issues for your decision: force approve, continue refining, or abort.

**Can I force approve with issues?**
Yes, you can override and approve with known issues. The issues will be documented in `status.md`.

### Stage 1: Spec Compliance Review Details

The Spec Reviewer:
1. Reads `spec.md` as the **primary source of truth**
2. **Distrusts** implementer claims - verifies code independently
3. Creates a checklist of ALL requirements
4. For each requirement:
   - Locates actual implementation code
   - Verifies it exists and is correct
   - Notes file path and line numbers
5. Checks for scope creep (unrequested additions)

**Pass criteria**: ALL requirements verified with code evidence, no scope creep.

### Stage 2: Code Quality Review Details

The Quality Reviewer:
1. **Only runs after Stage 1 passes**
2. Reads `constitution.md` for project standards
3. Reviews code for:
   - Pattern compliance
   - Naming conventions
   - Test coverage
   - Documentation completeness
4. Categorizes issues by severity (CRITICAL/HIGH/MEDIUM/LOW)

**Pass criteria**: No CRITICAL/HIGH issues remaining.

---

## Agent Activation & Overrides

### How Specialists Are Activated

The Architect agent analyzes the task and **recommends** which specialists to activate:

| Trigger | Specialist Activated |
|---------|---------------------|
| Auth code, user input, APIs | Security Auditor |
| Database queries, loops, caching | Performance Analyst |
| CI/CD, Docker, K8s changes | DevOps Engineer |
| Schema changes, migrations | Database Architect |
| New API endpoints | API Designer |
| React/frontend, design system | UI/UX Designer |
| Legacy code modifications | Refactorer |
| Framework upgrades | Migration Specialist |

### Override Options

You have full control during the approval phase:

#### Add a Specialist Not Recommended
```
Architect recommends: Security Auditor, API Designer

You: "Also include Performance Analyst"

[3 specialists will be activated]
```

#### Remove a Recommended Specialist
```
Architect recommends: Security Auditor, Performance Analyst, UI/UX Designer

You: "Skip UI/UX Designer for this task"

[2 specialists will be activated]
```

#### Reject All Specialists
```
Architect recommends: Security Auditor, Database Architect

You: "No specialists needed, just core team"

[Only 4 core agents will run]
```

### Manually Invoking an Agent

You can invoke any agent directly without full orchestration:

```bash
# Launch specific agent
> Launch the orchestrate-security agent to review the auth module

# Launch debugger for specific issue
> Launch the orchestrate-debugger agent to investigate the failing test

# Launch analyst for performance issue
> Launch the orchestrate-performance agent to analyze the database queries
```

### Disabling Agents Permanently

To permanently disable an agent, see [CONFIGURATION.md](CONFIGURATION.md#disabling-specific-agents).

---

## Workflow Examples

### Example 1: Implementing User Authentication

```
# First, use standard spec-kit
> /speckit.specify      # Write auth specification
> /speckit.plan         # Create implementation plan
> /speckit.tasks        # Generate task list

# Then, enhanced implementation
> /agent-orch:implement

[Architect reads specs/user-auth/...]
[Recommends specialists: Security Auditor, Database Architect, API Designer]

[You approve plan + specialists]

[6 agents launch in parallel:]
  - Builder: Implementing auth endpoints...
  - Validator: Writing test cases...
  - Scribe: Documenting auth API...
  - Security Auditor: Reviewing for OWASP vulnerabilities...
  - Database Architect: Creating user schema migration...
  - API Designer: Writing OpenAPI spec...

[Progress tracked in specs/user-auth/status.md]

[Two-Stage Code Review:]
  - Spec Reviewer (Stage 1): Verifying each requirement against code...
  - Spec Reviewer: All 8 requirements verified - PASSED
  - Quality Reviewer (Stage 2): Checking code against constitution...
  - Quality Reviewer: Found 2 issues - missing error handling, inconsistent naming
  - Quality Reviewer: Created refinement tasks for Builder
  - Builder: Fixing issues...
  - Quality Reviewer: Re-reviewing... APPROVED

[Results consolidated]
```

### Example 2: Adding Frontend Feature

```
> /agent-orch:implement

[Architect detects UI implementation needed]
[Recommends specialists: UI/UX Designer, Performance Analyst]

[You approve]

[5 agents launch in parallel:]
  - Builder: Creating React components...
  - Validator: Writing component tests...
  - Scribe: Documenting component API...
  - UI/UX Designer: Checking design system compliance...
  - Performance Analyst: Analyzing render performance...

[Two-Stage Code Review:]
  - Spec Reviewer: Verifying requirements... PASSED
  - Quality Reviewer: Validating against constitution... APPROVED
```

### Example 3: Database Migration

```
> /agent-orch:implement

[Architect detects schema changes]
[Recommends specialists: Database Architect, Migration Specialist]

[4 agents + 2 specialists work together]
```

---

## Best Practices

### 1. Use Standard Spec-Kit First

Always run the spec-kit workflow before orchestrated implementation:
```
> /speckit.specify       # Define what to build
> /speckit.plan          # Plan how to build it
> /speckit.tasks         # Break into tasks
> /agent-orch:implement   # Build with agents
```

### 2. Review Specialist Selection

The Architect recommends specialists. Review them:
- Are the right specialists selected for this task?
- Are any unnecessary specialists included?
- Are any needed specialists missing?

### 3. Configure Project Standards

Run `/agent-orch:setup-claude-md` to create a **hierarchical standards structure**:

- **`.claude/rules/`** -- universal standards (security, code, testing) always loaded
- **Root `CLAUDE.md`** -- lean project overview
- **Subdirectory `CLAUDE.md`** -- domain-specific standards (API, DB, frontend)

For spec-kit projects, also run `/agent-orch:setup-constitution` to create `.specify/memory/constitution.md`. This can be leaner since `.claude/rules/` handles universal standards.

All agents automatically operate under the **Staff Software Engineer with ISC2 certifications (CISSP, CCSP, CSSLP)** persona via the plugin's built-in rule.

### 4. Monitor Progress

Check `specs/[feature]/status.md` for:
- What each agent is working on
- Issues found
- Overall progress

### 5. Use Analysis for Complex Areas

For unfamiliar code:
```
> /agent-orch:analyse
```
Then:
```
> /speckit.specify
```

---

## Customizing Agent Behavior

### Agent Files Location

If using `--plugin-dir`:
```
./plugins/agent-orch/agents/
```

If installed via marketplace, agents are in the cached plugin directory. To customize:
1. Fork the repository
2. Modify agents in `plugins/agent-orch/agents/`
3. Push to your fork
4. Add your fork as a marketplace and install from there

### Modifying an Agent

Edit any agent file to customize:
- Available tools
- Model (sonnet/opus/haiku)
- Prompt instructions
- Focus areas

### Example: Making Validator More Strict

Edit `orchestrate-validator.md`:
```markdown
## Additional Requirements
- All code must have 80% test coverage minimum
- Security vulnerabilities are Critical severity
- Performance regressions must be flagged
```

### Component Library Configuration (Required for UI/UX Designer)

The UI/UX Designer agent requires configuration to work with your design system. Add to `.specify/memory/constitution.md`:

```markdown
## Component Library

### Paths (Required)
COMPONENT_LIBRARY_ROOT: /path/to/your/Component-Library
DOCS_ROOT: ${COMPONENT_LIBRARY_ROOT}/packages/ui-docs/src

### Optional Paths
PACKAGE_DOCS: ${DOCS_ROOT}/<package-name>
COMPONENT_DOCS: ${DOCS_ROOT}/<package-name>/<ComponentName>/<ComponentName>.mdx
COMPONENT_STORIES: ${DOCS_ROOT}/<package-name>/<ComponentName>/<ComponentName>.stories.tsx
MATERIALS: ${DOCS_ROOT}/materials

### Materials (Design Tokens)
- Borders: ${MATERIALS}/Borders.mdx
- Colours: ${MATERIALS}/Colours.mdx
- Spacing: ${MATERIALS}/Spacing.mdx
- Typography: ${MATERIALS}/Typography.mdx

### Core Packages
| Package | Purpose |
|---------|---------|
| @org/bsds-core | Button, Spinner, Layout, Stack, Cluster |
| @org/bsds-forms | Form controls and validation |
| @org/bsds-icons | Icon system |

### UI Pattern Packages
| Package | Purpose |
|---------|---------|
| @org/ui-modal | Modal dialogs |
| @org/ui-toast | Toast notifications |
| @org/ui-drawer | Slide-out panels |
```

With this configuration, the UI/UX Designer will:
- Verify design system components exist before custom implementations
- Read MDX documentation for component APIs
- Use `.stories.tsx` files as canonical examples
- Validate no hardcoded colors, spacing, or typography
- Check WCAG 2.1 AA accessibility compliance

---

## Mainframe Analyzer (moved to gids-ai-marketplace)

> **This plugin has moved.** The former `mainframe-analyzer` plugin now lives in its own
> repository, **`gids-mainframe-analyzer`**, maintained by the RS Architecture & Platform team
> and distributed via the **gids-ai-marketplace** catalog. It is no longer shipped from this
> repository.
> **Plugin repo:** [code.ssnc.dev/FS/gids-mainframe-analyzer-plugin](https://code.ssnc.dev/FS/gids-mainframe-analyzer-plugin)

`gids-mainframe-analyzer` analyzes mainframe COBOL/JCL/PROC code via the SmartTSXL API.

### Install

```bash
# Register the gids-ai-marketplace catalog (one-time)
/plugin marketplace add git@code.ssnc.dev:FS/gids-ai-marketplace.git

# Install the plugin, then reload
/plugin install gids-mainframe-analyzer@gids-ai-marketplace
/reload-plugins

# Install the SmartTSXL MCP server it depends on (via the gids-mcp-catalog plugin)
/gids-mcp-catalog:mcp-smarttsxl
```

The plugin declares a dependency on `gids-mcp-catalog`; `/gids-mcp-catalog:mcp-smarttsxl` clones,
configures, and registers the SmartTSXL MCP server (credentials + connectivity).

### Skills

| Command | Purpose |
|---------|---------|
| `/gids-mainframe-analyzer:change-impact-analysis` | Trace the full blast radius of a proposed change (DB2 table/column, copybook, or shared program) before editing — risk-banded, evidence-backed, with a change-board-ready report and `impact.json` |
| `/gids-mainframe-analyzer:mips-hotspot-audit` | Audit a subsystem for MIPS/CPU hotspots, diagnose *why* they burn CPU, and prescribe risk-assessed COBOL/DB2 remediation with per-hotspot change packets |

See the [plugin README](https://code.ssnc.dev/FS/gids-mainframe-analyzer-plugin) for full usage.

---

## Troubleshooting

### Feature Not Auto-Detected

If the plugin can't find the feature:
1. Ensure `specs/` has feature directories
2. Check that `tasks.md` exists with incomplete tasks
3. Specify the feature manually if multiple exist

### Agents Not Finding Standards

If agents ignore your standards:
1. Run `/agent-orch:setup-claude-md` to verify the hierarchical structure
2. Check `.claude/rules/` exists with security-baseline.md, code-standards.md, testing-standards.md
3. For spec-kit: verify `.specify/memory/constitution.md` exists
4. Verify subdirectory `CLAUDE.md` files are in the correct directories
5. Ensure markdown is valid in all files

### One Agent Taking Too Long

If an agent seems stuck:
1. Check `specs/[feature]/status.md` for blockers
2. Look for dependency issues between tasks
3. The agent may be waiting for another agent's output

### Want Single-Agent Mode

For simpler tasks, invoke agents directly:
```
> Launch the orchestrate-builder agent to implement [small task]
```

This bypasses full orchestration.

---

## Native Spec-Kit Integration

All coordination happens through `.specify/`:

```
.specify/
├── memory/
│   └── constitution.md    # Project standards (agents read)
├── specs/[feature]/
│   ├── spec.md            # Requirements (from /speckit.specify)
│   ├── plan.md            # Approach (from /speckit.plan)
│   ├── tasks.md           # Tasks (agents update)
│   └── status.md          # Progress (agents update)
└── orchestration/
    └── [feature]/
        └── agents.md      # Specialist coordination
```

**No separate tracking files** - everything uses spec-kit's native structure.
