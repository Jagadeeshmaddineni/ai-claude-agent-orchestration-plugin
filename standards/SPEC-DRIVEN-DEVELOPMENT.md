# Spec-Driven Development with Agents

How specification-driven development works in the SS&C agentic platform, why it matters, and how teams should adopt it.

---

## The Core Idea

Every feature starts with a specification, not code. The specification is the contract between humans and agents. Agents implement what the spec says - nothing more, nothing less. A two-stage review process (critic system) enforces this contract.

```
Human Intent  -->  Specification  -->  Agent Implementation  -->  Two-Stage Review  -->  Verified Code
                       ^                                              |
                       |                                              |
                       +------------ Refinement Loop -----------------+
```

## Two Paths to the Same Outcome

### Path 1: `/build` - Conversational Spec

For teams without spec-kit or for ad-hoc work. The orchestrator gathers requirements through conversation, creates `PLAN.md`, and launches agents.

```
/agent-orch:build
  1. Requirements gathering (conversation)
  2. Advocate review (optional - challenges assumptions)
  3. Architect analysis (codebase + plan creation)
  4. Parallel implementation (Builder + Validator + Scribe + specialists)
  5. Integration verification
  6. Two-stage review (spec compliance -> code quality)
  7. Finalize
```

**Best for**: Quick features, bug fixes, spikes, teams new to agentic development.

### Path 2: `/implement` - Formal Spec (spec-kit)

For teams using GitHub spec-kit (`.specify/` directory). Reads existing specifications and coordinates agents against them.

```
/agent-orch:implement
  1. Detect spec-kit (.specify/) or bootstrap from conversation
  2. Read spec artifacts (spec.md, plan.md, tasks.md)
  3. Advocate review (optional)
  4. Architect planning + specialist selection
  5. Parallel implementation with Agent Teams
  6. Integration verification
  7. Two-stage review (iterative refinement)
  8. Specialist issue resolution
  9. Finalize
```

**Best for**: Complex features, multi-sprint work, teams with mature processes.

---

## The Two-Stage Critic System

This is the quality enforcement mechanism. It is sequential - Stage 2 cannot start until Stage 1 passes.

### Stage 1: Spec Compliance Review (`orchestrate-spec-reviewer`)

**Persona**: Skeptical Quality Auditor. Does NOT trust what agents report - independently verifies everything.

What it checks:
- Every requirement in the spec maps to actual code (file:line evidence)
- No scope creep (code not in the spec)
- No scaffolding (TODOs, stubs, placeholder content)
- All acceptance criteria met with evidence

Output: `BLOCKED` (requirements not met - creates refinement tasks) or `PASSED` (proceed to Stage 2)

### Stage 2: Code Quality Review (`orchestrate-quality-reviewer`)

**Persona**: Senior Code Reviewer / Tech Lead.

What it checks:
- Constitution compliance (CLAUDE.md, `.specify/memory/constitution.md`)
- Language conventions (TypeScript, Python, Go, etc.)
- Code quality (patterns, naming, structure, maintainability)
- Test quality and coverage targets (default 100%)
- No scaffolding or placeholder code

Output: `NEEDS WORK` (creates refinement tasks for Builder/Validator/Scribe) or `APPROVED`

### Why Two Stages?

A single review conflates "did we build the right thing?" with "did we build it well?" These are different questions with different failure modes:

- Stage 1 failures mean the spec wasn't followed - the feature is incomplete or wrong
- Stage 2 failures mean the code works but isn't production-ready

Separating them prevents code quality polish from masking missing functionality, and prevents functional completeness from excusing poor code.

---

## TDD Enforcement

The Builder agent follows Red-Green-Refactor by default:

1. **RED**: Write a failing test that describes the desired behavior
2. **GREEN**: Write the minimum code to make the test pass
3. **REFACTOR**: Clean up while keeping tests green

This is mandatory unless overridden in `.claude/rules/build-overrides.md`:

```markdown
TDD_MODE: optional
```

### Coverage Targets

Default: 100% line + branch coverage. Override with:

```markdown
COVERAGE_TARGET: 80
BRANCH_COVERAGE_TARGET: 75
```

---

## What Teams Should Adopt Regardless of Their Dev Agent

Even if a team has their own DevSoc agent, build pipeline, or custom orchestration, these fundamentals from the base plugin should be part of their workflow:

### 1. The Two-Stage Review (Non-Negotiable)

The `spec-reviewer` and `quality-reviewer` agents are the most valuable components. Any team running agents against their codebase MUST have review gates:

- Without spec review: Agents build what they think you want, not what you specified
- Without quality review: Agents produce code that works but accumulates technical debt

**Recommendation**: Every team's `/build` equivalent should include these two agents, even if everything else is custom.

### 2. The Advocate Agent (Strongly Recommended)

The `orchestrate-advocate` challenges architectural decisions before implementation begins. It:

- Discovers existing platform services you might be duplicating
- Finds deployment infrastructure (Helm, Kustomize, Terraform) already in place
- Creates Jira tickets for cross-team dependencies
- Presents recommendations before agents write code

Without it, agents will happily build things that already exist elsewhere in the org.

### 3. Integration Verification

Before review, the system verifies:
- Build succeeds
- Migrations run
- Seeds execute
- Application starts
- Linter passes

This catches integration failures before they reach review.

### 4. No Scaffolding Policy

All agents are instructed: no TODOs, no stubs, no placeholder content, no mock data in production code. Everything must be fully functional. The reviewers enforce this.

---

## Adapting for Your Team

### GIDS, WIT, Intralinks, GlobeOp, Private Cloud - Different Flavors, Same Ingredients

Each business unit has different:
- **Tech stacks** (Java/Spring Boot, .NET, React, Angular)
- **Infrastructure** (private cloud VMs, Kubernetes, hybrid)
- **Compliance requirements** (SOC 2, financial regulations, data sovereignty)
- **Domain knowledge** (fund accounting, wealth management, document management)

But they should all share:
- **Two-stage review** (spec compliance + code quality)
- **TDD enforcement** (or at minimum, test-before-merge)
- **Integration verification** (build + start + lint)
- **No scaffolding** (fully functional code only)
- **Advocate review** (prevent duplication, discover platform services)

### How to Customize

```
Base Plugin (/agent-orch)
    |
    +-- /inherit-plugin --> Your Team's Plugin
    |       |
    |       +-- Custom agents (domain experts)
    |       +-- Custom skills (team workflows)
    |       +-- Custom rules (compliance requirements)
    |       +-- Custom conventions (language/framework standards)
    |       +-- Custom hooks (lifecycle gates)
    |
    +-- Override in .claude/rules/build-overrides.md:
            - TDD_MODE
            - COVERAGE_TARGET
            - ADVOCATE_REVIEW (enable/disable)
            - SPECIALIST_AGENTS (which to activate)
```

---

## Maturity Model

| Level | Description | Tools |
|-------|-------------|-------|
| **1. Getting Started** | Use `/build` conversationally, let agents figure it out | `/agent-orch:build` |
| **2. Structured** | Write specs first, use `/implement` | `/agent-orch:implement` + spec-kit |
| **3. Customized** | Inherit plugin, add domain agents and rules | `/inherit-plugin` + custom agents |
| **4. Integrated** | Jira-driven work queue, automated triage | `/jira-work` + label governance |
| **5. Platform** | Your team contributes plugins back to the catalog | `/contribute-plugin-marketplace` |

Most teams should start at Level 1 and grow. The platform supports every level without requiring you to jump ahead.
