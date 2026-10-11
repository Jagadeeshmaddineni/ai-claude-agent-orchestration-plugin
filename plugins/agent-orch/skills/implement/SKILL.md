---
name: implement
description: Multi-agent implementation for GitHub spec-kit. Enhances /speckit.implement with parallel agents including specialists for security, performance, DevOps, database, API design, UI/UX, refactoring, and migrations. Includes iterative code review. Usage: /agent-orch:implement [feature-name|JIRA-ID] (auto-detects from .specify/ if omitted)
---

## Agent Teams Support

This skill supports both **subagent mode** (traditional) and **Agent Teams mode** (native) for coordination.

**Agent Teams** use Anthropic's native coordination tools:
- `TeamCreate` / `TeamDelete` for team lifecycle
- `Agent` tool with `team_name` parameter for spawning teammates
- `SendMessage` for direct inter-agent messaging
- `TaskCreate` / `TaskUpdate` for shared task management
- `mode: "plan"` parameter for requiring plan approval before implementation
- `TeammateIdle` / `TaskCompleted` hooks for quality gate enforcement

**Enable agent teams** by setting:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**See Phase 0c below** for automatic detection of when agent teams provide benefit.

# Spec-Kit Multi-Agent Implementation

You are orchestrating a multi-agent implementation that ENHANCES GitHub spec-kit's `/speckit.implement` workflow using spec-kit's native `.specify/` structure.

## How This Works

1. Reads spec-kit artifacts from `.specify/` (auto-detects active feature)
2. Spawns core agents (Architect, Builder, Validator, Scribe)
3. Architect activates relevant specialists in parallel
4. **Two-Stage Code Review**:
   - Stage 1: Spec Compliance Review (does code match spec exactly?)
   - Stage 2: Code Quality Review (does code meet quality standards?)
5. Iterative refinement until code passes BOTH review stages
6. **All coordination happens through `.specify/`** - no separate tracking files

---

## How to Launch Agents

**CRITICAL**: You MUST use the **Task tool** to launch agents. Each agent has a `subagent_type` that must be specified.

**Pattern for launching an agent:**
```
Task tool call:
  subagent_type: "agent-orch:orchestrate-<agent-name>"
  prompt: "<the prompt for the agent>"
  description: "<short 3-5 word description>"
```

**For parallel execution**: Send a SINGLE message with MULTIPLE Task tool calls. Do NOT send them sequentially.

**Available agents** (use these exact subagent_type values):
- `agent-orch:orchestrate-architect` - Planning and coordination
- `agent-orch:orchestrate-builder` - Implementation
- `agent-orch:orchestrate-validator` - Testing
- `agent-orch:orchestrate-scribe` - Documentation
- `agent-orch:orchestrate-spec-reviewer` - Stage 1 review
- `agent-orch:orchestrate-quality-reviewer` - Stage 2 review
- `agent-orch:orchestrate-debugger` - Debugging
- `agent-orch:orchestrate-security` - Security audit
- `agent-orch:orchestrate-performance` - Performance analysis
- `agent-orch:orchestrate-devops` - CI/CD, Docker, K8s
- `agent-orch:orchestrate-telemetry` - Observability, OTel, dashboards
- `agent-orch:orchestrate-database` - Schema, migrations
- `agent-orch:orchestrate-api` - API design
- `agent-orch:orchestrate-uiux` - UI/UX, design system
- `agent-orch:orchestrate-refactorer` - Code improvements
- `agent-orch:orchestrate-migration` - Upgrades, migrations
- `agent-orch:orchestrate-c4-scribe` - C4 architecture docs
- `agent-orch:orchestrate-enforcer` - Enforcement rule generation
- `agent-orch:orchestrate-advocate` - Architecture challenge, cross-team impact, Jira tickets

## Spec-Kit Structure Used

```
.specify/
├── memory/              # Constitution, guidelines (agents read this)
├── specs/
│   └── [feature]/
│       ├── spec.md      # Feature specification
│       ├── plan.md      # Implementation plan
│       ├── tasks.md     # Task list (agents update this)
│       └── status.md    # Progress tracking (agents update this)
├── orchestration/       # Agent coordination (created if needed)
│   └── [feature]/
│       └── agents.md    # Who's working on what
└── templates/
```

## Available Agents

### Core Team (Always Active)
| Agent | Role |
|-------|------|
| **orchestrate-architect** | Planning, coordination, decisions |
| **orchestrate-builder** | Implementation (with verification gate) |
| **orchestrate-validator** | Testing, QA (with verification gate) |
| **orchestrate-scribe** | Documentation |

### Review Team (Two-Stage Quality Gate)
| Agent | Role |
|-------|------|
| **orchestrate-spec-reviewer** | Stage 1: Spec compliance - verifies implementation matches spec exactly |
| **orchestrate-quality-reviewer** | Stage 2: Code quality - validates patterns, constitution, best practices |

### Support Agents (When Needed)
| Agent | Role |
|-------|------|
| **orchestrate-debugger** | Systematic debugging when tests fail or issues arise |

### Specialists (Activated When Relevant)
| Agent | Activated When |
|-------|----------------|
| **orchestrate-security** | Auth, user input, APIs, sensitive data |
| **orchestrate-performance** | DB queries, loops, caching, real-time |
| **orchestrate-devops** | CI/CD, Docker, K8s, deployment |
| **orchestrate-telemetry** | Observability, monitoring, tracing, metrics, logging, dashboards |
| **orchestrate-database** | Schema changes, migrations, queries |
| **orchestrate-api** | New endpoints, API contracts |
| **orchestrate-uiux** | React/frontend, design system, accessibility |
| **orchestrate-refactorer** | Touching legacy/complex code |
| **orchestrate-migration** | Upgrades, breaking changes |
| **orchestrate-c4-scribe** | Architecture changes, new services, system boundary changes |

---

## Conventions Ownership

The Architect agent owns `.specify/memory/conventions.md` generation during Phase 2. After Phase 2 completes, the orchestrator MUST verify the file exists; if missing, print a one-line warning to the session's status.md ("Architect did not generate conventions.md — proceeding without stack-specific rules") but continue. Some sessions don't need stack-specific conventions (e.g. pure prose changes).

---

## Phase 0: Auto-Detect Mode

**Goal**: Determine if spec-kit is available

**Actions**:
1. Check if `.specify/` directory exists
2. **If `.specify/` exists**: Proceed to Phase 1 (spec-kit mode)
3. **If `.specify/` does NOT exist**: Present options to user:

```
No .specify/ directory found. Choose an option:

(a) Use standalone mode - Gather requirements through conversation,
    use PLAN.md/STATUS.md (run /agent-orch:build)

(b) Bootstrap spec-kit - Create .specify/ structure from conversation,
    then proceed with full spec-kit integration

(c) Exit - Set up spec-kit first with: specify init
```

If user chooses (a): Redirect to `/agent-orch:build`
If user chooses (b): Proceed to Phase 0b (Bootstrap)
If user chooses (c): Exit with instructions

### Phase 0b: Bootstrap .specify/ (if chosen)

Create spec-kit structure through conversation:

1. **Gather requirements** (ask one question at a time):
   - What feature are you building?
   - What are the key requirements?
   - Any constraints (security, performance, etc.)?

2. **Create .specify/ structure**:
   ```
   .specify/
   ├── memory/
   │   └── constitution.md    # Copy from CLAUDE.md or create minimal
   └── specs/[feature]/
       ├── spec.md            # Generated from conversation
       ├── plan.md            # Generated from analysis
       └── tasks.md           # Generated with agent assignments
   ```

3. **Proceed to Phase 1** with the generated structure

---

## Phase 0c: Determine Coordination Mode

**CRITICAL**: After Phase 1 reads specs, analyze feature complexity to choose between subagents and agent teams.

### Detection Logic

**Use Agent Teams if ANY of:**
1. Feature requires >3 specialists simultaneously
2. Tight integration between layers (API + DB + Frontend + Tests)
3. Expected review iterations >2 rounds
4. Multiple interdependent tasks requiring back-and-forth

**Use Subagents if ALL of:**
1. Feature is well-defined with clear spec
2. <3 specialists needed
3. Single domain
4. Expected <2 review rounds

### Complexity Score

After architect analysis in Phase 2:
```
Score = specialists + (cross_layer ? 2 : 0) + iterations + dependencies

Score >= 6: Use agent teams (estimated ~3-5x token cost vs subagents)
Score 4-5: Recommend agent teams, ask user (~2-3x token cost)
Score 2-3: Use subagents
Score 0-1: Use subagents
```

---

## Phase 0.5: Detect JIRA-ID Argument

**Goal**: If the user provided a Jira issue key (e.g., `PROJ-123`), pull requirements from Jira and enrich the spec-kit workflow.

**Detection**: Check if `$ARGUMENTS` matches the pattern `[A-Z]+-\d+` (e.g., `PROJ-123`, `AUTH-42`).

**If JIRA-ID detected**:

1. Read `.claude/rules/jira.md` to verify Jira context exists
   - If no jira.md: "Jira context not found. Run `/agent-orch:jira` first, then retry." Exit.

2. Fetch the issue:
   ```
   mcp__jira__jira_getIssue with:
     issueKey: "[JIRA-ID]"
   ```

3. Extract summary, description, acceptance criteria, type, priority, labels, linked issues, and recent comments (same as /build Phase 0.5).

4. Check label governance:
   - If issue lacks `claude-code-agent-harness` label: ask user to add it or proceed without
   - If issue has `human-review-required`: confirm human has reviewed it

5. Present requirements and confirm with user (same flow as /build Phase 0.5 step 5).

6. **Map to spec-kit**: Use the Jira issue summary as the feature name for `.specify/specs/[feature-slug]/`.
   - If the feature spec already exists in `.specify/specs/`: use the existing spec, link the Jira issue
   - If the feature spec doesn't exist: the Jira description becomes the starting point for spec creation (user may want to run `/speckit.spec` first or proceed directly)

7. Set session tracking in the spec-kit status file:
   ```markdown
   ## Coordination
   Mode: Jira
   Session Ticket: [JIRA-ID]
   Label: claude-code-agent-harness
   Source: /implement JIRA-ID
   ```

8. Transition issue to In Progress and post session start comment (same as /build Phase 0.5 steps 7-8).

**If NO JIRA-ID detected**: Continue to Phase 1 as normal.

---

## Phase 1: Read Spec-Kit Artifacts

**Goal**: Understand what spec-kit has defined

**Prerequisite**: `.specify/` directory exists (from spec-kit or Phase 0b bootstrap)

**Actions**:
1. Create todo list for all phases
2. Verify `.specify/` directory exists
3. **Determine the feature to implement**:
   - If JIRA-ID was processed in Phase 0.5, use the mapped feature name
   - If `$ARGUMENTS` provided (non-JIRA-ID), use that feature name
   - If no argument, auto-detect by:
     - Reading `specs/` to find feature directories
     - Check for incomplete tasks in `tasks.md` files
     - If multiple features exist, show list and ask user to confirm
     - If single feature, proceed with that one
4. Read:
   - `.specify/memory/constitution.md` for project standards
   - `specs/[feature]/spec.md` for the feature spec
   - `specs/[feature]/plan.md` for the implementation plan
   - `specs/[feature]/tasks.md` for task list (from `/speckit.tasks`)

---

## Phase 1.5: Advocate Review (Hard-Gated)

**Goal**: Challenge assumptions in the spec before the Architect creates task assignments

**When to run (Hard Gate Triggers)**:

**Mandatory** when ANY of:
- Spec mentions: 'infra', 'infrastructure', 'security', 'auth', 'cross-team', 'multi-service', 'breaking change'
- Existing tasks.md has >5 tasks estimated (indicates complexity)
- User explicitly requests advocate review

**Bypass** only via `ADVOCATE_ENFORCE: false` in `.claude/rules/build-overrides.md` or `.specify/memory/constitution.md`. Bypass MUST log a single warning line to status.md:
```
## Advocate Gate Bypassed
ADVOCATE_ENFORCE: false override detected. Proceeding without Advocate review.
```

**Skipped automatically** for trivial changes:
- Spec/plan.md indicates simple change (e.g., "bug fix", "typo", "minor UI tweak") AND
- No infra/security/cross-team keywords detected AND
- User did not request advocate review

**Actions**:

### Step 1: Launch Advocate Agent

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-advocate`
- **description**: "Challenge architecture and find alternatives"
- **prompt**:
  ```
  Read specs/[feature]/spec.md for the feature specification.
  Read specs/[feature]/plan.md for the proposed implementation approach.
  Read .specify/memory/constitution.md for project standards.
  Check ADVOCATE_ENFORCE setting in constitution.md or CLAUDE.md. If not found,
  ask the user which mode they prefer (advisory with hard-block for CRITICAL vs fully advisory).

  TEAM COORDINATION (run your full Jira Coordination Protocol):
  Check .claude/rules/jira.md — if it exists, use Jira mode. If not, ask
  the user whether to set up Jira, use local markdown board
  (ssnc-agent-orch/TEAM-BOARD.md), or skip coordination for this session.
  Do NOT hardcode any project key or assignee.
  Phase A: Check what the team is currently building (Jira: search
  claude-code-agent-harness label; Markdown: read TEAM-BOARD.md).
  Phase B: Check for conflicts with in-progress work. If conflicts found,
  BLOCK and present to user. In Jira mode, comment on the conflicting issue.
  Phase C: Ensure this session is tracked (Jira: create/link ticket
  with claude-code-agent-harness label; Markdown: add row to TEAM-BOARD.md).
  Phase D: Write lifecycle instructions into advocate-review.md so the
  orchestrator knows how to update tracking on completion, abort, or scope changes.

  Scan codebase for existing patterns that could be reused.
  Check ../totalis/ for existing platform components (if available).
  Run your full Challenge Checklist against the proposed approach.
  Write findings to specs/[feature]/advocate-review.md.
  Present decision points directly -- the user needs to see and respond to these.
  If cross-team work is identified and Jira is available, prepare ticket
  proposals with the claude-code-agent-harness label. Otherwise note
  dependencies in advocate-review.md for manual tracking.
  ```

### Step 2: User Reviews Decision Points

The Advocate presents its findings directly to the user. Wait for the user to respond to each decision point.

- **If CRITICAL findings with ADVOCATE_ENFORCE=true**: Advocate blocks until user acknowledges
- **If user accepts recommendations**: Note for Architect to incorporate
- **If user overrides recommendations**: Note the decisions in advocate-review.md and proceed

### Step 3: Feed into Architect

After user decisions are recorded:
1. `specs/[feature]/advocate-review.md` is available for the Architect
2. The Phase 2 Architect prompt includes instructions to read and incorporate it

---

## Phase 2: Architect Planning & Specialist Selection

**Goal**: Analyse spec and determine which specialists are needed

**Actions**:

### Step 0: Advocate Gate Verification (Hard Gate)

**CRITICAL**: Before launching the Architect, check if Phase 1.5 Advocate gate was mandatory:

1. Scan spec.md and plan.md for infra/security/cross-team keywords
2. Check tasks.md for complexity (>5 tasks)
3. Determine if gate was triggered

**If gate was triggered**:
- Check if `specs/[feature]/advocate-review.md` exists
- Check if `ADVOCATE_ENFORCE: false` is set in `.claude/rules/build-overrides.md` or constitution.md

**Gate enforcement logic**:
```
IF gate_triggered AND advocate-review.md does NOT exist AND ADVOCATE_ENFORCE != false:
  STOP with this message:
  
  [advocate-gate] Phase 1.5 Advocate review was required but advocate-review.md
  does not exist. Aborting before Architect to avoid making decisions without cross-team /
  risk review.
  
  Complexity indicators:
  - Keywords detected: [list]
  - Tasks estimated: [N]
  
  Fix options:
  (a) Re-run /implement - Phase 1.5 will run automatically
  (b) Set ADVOCATE_ENFORCE: false in .claude/rules/build-overrides.md or constitution.md to bypass with audit logging
  
  Exit immediately. Do NOT launch Architect.
```

**If gate bypassed** (ADVOCATE_ENFORCE: false):
- Log warning to status.md (as shown in Phase 1.5)
- Continue to Step 1

**If gate not triggered** (trivial change):
- Continue to Step 1

### Step 1: Launch Architect Agent

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-architect`
- **description**: "Analyse spec and plan"
- **prompt**:
  ```
  Read `.specify/memory/` and `specs/[feature]/`.
  If `specs/[feature]/advocate-review.md` exists, read it and incorporate accepted
  recommendations. The user has already reviewed and decided on the Advocate's
  decision points -- respect those decisions. Note any overridden recommendations
  and proceed with the user's chosen approach.
  Analyse the specification and codebase.
  Update `specs/[feature]/tasks.md` with agent assignments.
  Create `.specify/orchestration/[feature]/agents.md` listing:
  - Which specialists to activate based on the task
  - Task assignments for each agent
  Return 10-15 most important files to understand.
  ```

### Step 2: Review Architect Output

Wait for architect agent to complete, then:
1. Read files identified by Architect
2. Review `specs/[feature]/tasks.md`
3. Review specialist recommendations in `.specify/orchestration/[feature]/agents.md`

### Step 3: User Approval

**Ask user to approve plan and specialist selection** before proceeding to Phase 3.

---

## Pre-Phase 3: Enforcement Rule Injection

**Goal**: Inject project-level enforcement rules into agent prompts before launching.

**CRITICAL**: This step runs BEFORE launching any implementation agents.

### Step 1: Check for Enforcement Rules

Check if `.claude/enforce/rules.json` exists in the project root.

- **If not exists**: Skip to Phase 3 (no enforcement rules configured)
- **If exists**: Read the registry and proceed to Step 2

### Step 2: Build Enforcement Prompt Sections

For EACH agent about to be launched:

1. Get the agent's role name (e.g., `builder`, `uiux`, `security`, `validator`, `scribe`)
2. Filter rules from `rules.json` where:
   - `enabled` is `true`
   - The `agents` array includes this agent's role name
3. For each matching rule:
   - Read `.claude/enforce/prompts/[rule-id].md`
   - Collect into an enforcement section

4. Build the enforcement block to append to the agent's spawn prompt:

```markdown
## Enforcement Rules

The following rules MUST be followed. Violations will be caught by automated
linting and will block task completion.

### [rule-id]: [description]
[contents of prompts/[rule-id].md]

### [rule-id-2]: [description-2]
[contents of prompts/[rule-id-2].md]
```

5. Append this block to the agent's spawn prompt (after the existing prompt content)

### Step 3: Plan Post-Implementation Check

After ALL agents complete in Phase 3 (before Phase 4 review):

1. Run `.claude/enforce/hooks/enforce-check.sh` against changed files
2. If violations found:
   - Report violations to the user
   - Launch Builder agent to fix violations
   - Re-run enforcement check until clean
3. Only proceed to Phase 4 (review) when enforcement checks pass

---

## Phase 3: Parallel Implementation

**Goal**: Build, test, document, and review simultaneously

**CRITICAL**: Launch ALL approved agents IN PARALLEL using a SINGLE message with MULTIPLE Task tool calls.

### Core Team (Always Launch These 3 Agents in Parallel)

**Agent 1 - Builder**
- **subagent_type**: `agent-orch:orchestrate-builder`
- **description**: "Implement assigned tasks"
- **prompt**:
  ```
  Implement the tasks assigned to Builder in specs/[feature]/tasks.md.
  Read specs/[feature]/spec.md for requirements.
  Read .specify/memory/conventions.md for code conventions.
  Check CLAUDE.md for quality target overrides (COVERAGE_TARGET, TDD_MODE, etc).

  MANDATORY: Follow TDD (RED-GREEN-REFACTOR) unless TDD_MODE is "optional".
  For each feature: write failing test FIRST, then implement until it passes.
  Report RED→GREEN→REFACTOR status for each task.

  MANDATORY: NO SCAFFOLDING. Every feature must be fully functional.
  No TODOs, no stubs, no placeholders, no "coming soon" pages.
  Full error handling, loading states, validation, and edge cases.

  After each task: update status.md with TDD evidence, then move to next task.
  Verify your work with tests before marking tasks complete.
  ```

**Agent 2 - Validator**
- **subagent_type**: `agent-orch:orchestrate-validator`
- **description**: "Write and run tests"
- **prompt**:
  ```
  Read `specs/[feature]/` for requirements.
  Read .specify/memory/conventions.md for code conventions.
  Check CLAUDE.md for quality target overrides.

  QUALITY TARGETS (defaults, check CLAUDE.md for overrides):
  - Coverage: 100% (or COVERAGE_TARGET)
  - Pass Rate: 100% (or PASS_RATE_TARGET)

  Write COMPREHENSIVE tests: happy path, error paths, edge cases, boundary
  conditions, negative tests, integration points.
  DO NOT write rudimentary tests. Cover ALL code paths.

  If feature includes UI: write Playwright e2e tests covering user flows,
  error states, loading states, and accessibility (axe-core).

  Run coverage report. If below target, write MORE tests until target met.

  PROGRESS: Update `specs/[feature]/status.md` BEFORE each test run
  ("Validator: Running tests for [area]") and AFTER
  ("Validator: [N] passed, [N] failed, [N]% coverage").
  VERIFICATION GATE: Show actual test output with pass/fail counts AND coverage %.
  ```

**Agent 3 - Scribe**
- **subagent_type**: `agent-orch:orchestrate-scribe`
- **description**: "Document features"
- **prompt**:
  ```
  Read `specs/[feature]/` for requirements.
  Document completed features.
  Update `.specify/` docs as needed.
  Create usage examples.
  PROGRESS: Update `specs/[feature]/status.md` when starting and completing
  each document ("Scribe: Writing [doc]", "Scribe: Completed [doc]").
  ```

### Specialists (Add to Parallel Launch If Approved)

Include these Task tool calls in the SAME message as the core team if they were approved in Phase 2.

**Security** (if approved)
- **subagent_type**: `agent-orch:orchestrate-security`
- **description**: "Security audit"
- **prompt**: `Read specs/[feature]/. Review code for OWASP vulnerabilities. Report in status.md.`

**Performance** (if approved)
- **subagent_type**: `agent-orch:orchestrate-performance`
- **description**: "Performance analysis"
- **prompt**: `Read specs/[feature]/. Analyse for bottlenecks. Report in status.md.`

**DevOps** (if approved)
- **subagent_type**: `agent-orch:orchestrate-devops`
- **description**: "CI/CD configuration"
- **prompt**: `Read specs/[feature]/. Create/update CI/CD, Docker configs. Report in status.md.`

**Telemetry** (if approved)
- **subagent_type**: `agent-orch:orchestrate-telemetry`
- **description**: "Observability setup"
- **prompt**: `Read specs/[feature]/. Set up observability stack: OTel Collector config, Docker Compose services (Prometheus, Loki, Tempo, Grafana), Grafana dashboards, and instrumentation. Use environment variables for all endpoints. Report in status.md.`

**Database** (if approved)
- **subagent_type**: `agent-orch:orchestrate-database`
- **description**: "Database schema design"
- **prompt**: `Read specs/[feature]/. Design schema, create migrations. Report in status.md.`

**API** (if approved)
- **subagent_type**: `agent-orch:orchestrate-api`
- **description**: "API contract design"
- **prompt**: `Read specs/[feature]/. Design API contracts, OpenAPI specs. Report in status.md.`

**UI/UX** (if approved)
- **subagent_type**: `agent-orch:orchestrate-uiux`
- **description**: "UI/UX compliance check"
- **prompt**: `Read specs/[feature]/. Ensure design system compliance, check accessibility, validate component library usage. Report in status.md.`

**Refactorer** (if approved)
- **subagent_type**: `agent-orch:orchestrate-refactorer`
- **description**: "Code improvement analysis"
- **prompt**: `Read specs/[feature]/. Identify improvements, flag debt. Report in status.md.`

**Migration** (if approved)
- **subagent_type**: `agent-orch:orchestrate-migration`
- **description**: "Migration planning"
- **prompt**: `Read specs/[feature]/. Plan migration, ensure compatibility. Report in status.md.`

**C4 Scribe** (if approved)
- **subagent_type**: `agent-orch:orchestrate-c4-scribe`
- **description**: "C4 architecture docs"
- **prompt**: `Read specs/[feature]/. Create or update docs/c4/ with C4 model diagrams (System Context, Container, Component) using Mermaid. Include navigation. Report in status.md.`

### Wait for All Agents & Report Progress

After launching subagents, **report each agent's results to the user as they complete**. Do NOT wait silently for all agents to finish. See [Progress Reporting](#progress-reporting-mandatory).

### Agent Team Mode Launch (Alternative)

If coordination mode is AGENT_TEAMS, use native tools instead of subagents:

**Pre-launch: Reduce Permission Friction**

Before spawning teammates, recommend the user pre-approve common operations. Teammate permission requests bubble up to the lead, which creates friction:
```
Tip: To reduce permission prompts that can stall agents, consider running
with broader permissions or pre-approving common file operations in your
permission settings before we start.
```

**Step 1: Create Team**

Use the `TeamCreate` tool:
```
TeamCreate:
  name: "implement-[feature-name]"
```

**Step 2: Spawn Teammates**

Use the `Agent` tool with `team_name` parameter for each agent.

**NOTE**: Use `isolation: "worktree"` for implementation agents to prevent file conflicts. Worktrees provide each agent an isolated copy of the repository.

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-builder"
  team_name: "implement-[feature-name]"
  isolation: "worktree"
  prompt: "Implement the tasks assigned to Builder in specs/[feature]/tasks.md.
           Read specs/[feature]/spec.md for requirements.
           Read .specify/memory/conventions.md for code conventions.
           Check CLAUDE.md for quality target overrides.
           MANDATORY TDD: Write failing test FIRST, then implement (RED-GREEN-REFACTOR).
           Report RED→GREEN→REFACTOR evidence for each task.
           MANDATORY NO SCAFFOLDING: Every feature fully functional. No TODOs,
           stubs, placeholders. Full error handling, loading states, validation.
           After each task: update status.md with TDD evidence, SendMessage @lead
           with what you built, SendMessage @validator when ready for testing.
           Verify with tests before marking complete.
           Do NOT go idle while tasks remain - check tasks.md for next task."
  description: "Implement assigned tasks"

Agent tool call:
  subagent_type: "agent-orch:orchestrate-validator"
  team_name: "implement-[feature-name]"
  mode: "plan"
  isolation: "worktree"
  prompt: "Read specs/[feature]/ for requirements.
           Read .specify/memory/conventions.md for code conventions.
           Check CLAUDE.md for quality target overrides.
           TARGETS: 100% coverage, 100% pass rate (or overrides from CLAUDE.md).
           Write COMPREHENSIVE tests: happy path, error paths, edge cases,
           boundary conditions, negative tests. NO rudimentary tests.
           If UI feature: write Playwright e2e tests with accessibility checks.
           Run coverage report. If below target, write MORE tests.
           Use SendMessage to message @builder with test failures.
           Use TaskUpdate to mark tasks complete. VERIFICATION GATE required.
           PROGRESS: Update specs/[feature]/status.md BEFORE each test run
           and AFTER with results including coverage %. Use SendMessage to @lead
           after each test run with pass/fail counts and coverage.
           LIFECYCLE: Do NOT go idle while you have incomplete tasks in tasks.md.
           After each task, check tasks.md for next task AND check your inbox.
           Only go idle when ALL your assigned tasks are complete.
           If blocked, SendMessage to @lead explaining what you need."
  description: "Write and run tests"

Agent tool call:
  subagent_type: "agent-orch:orchestrate-scribe"
  team_name: "implement-[feature-name]"
  prompt: "Read specs/[feature]/ for requirements. Document features.
           Use SendMessage to coordinate with @builder and @validator.
           PROGRESS: Update specs/[feature]/status.md when starting and
           completing each doc. Use SendMessage to @lead when done.
           LIFECYCLE: Do NOT go idle while you have incomplete tasks in tasks.md.
           After each task, check tasks.md for next task AND check your inbox.
           Only go idle when ALL your assigned tasks are complete."
  description: "Document features"
```

**Step 3: Add Specialists as Teammates**

For each approved specialist, add to the same team:
```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-security"
  team_name: "implement-[feature-name]"
  prompt: "Review code for vulnerabilities. Use SendMessage to message @builder
           directly with findings. Use TaskUpdate for task progress.
           PROGRESS: Use SendMessage to @lead with audit summary when complete."
  description: "Security audit"

Agent tool call:
  subagent_type: "agent-orch:orchestrate-telemetry"
  team_name: "implement-[feature-name]"
  prompt: "Set up observability stack and instrumentation. Use SendMessage to
           @devops for Docker Compose changes, @builder for app instrumentation.
           Use environment variables for all endpoints. Use TaskUpdate for progress.
           PROGRESS: Use SendMessage to @lead with setup summary when complete."
  description: "Observability setup"

Agent tool call:
  subagent_type: "agent-orch:orchestrate-c4-scribe"
  team_name: "implement-[feature-name]"
  prompt: "Create or update docs/c4/ with C4 model architecture documentation.
           Use Mermaid diagrams. Include navigation on all pages.
           Use SendMessage to @architect for boundary questions, @builder for
           implementation details. Use TaskUpdate for progress.
           PROGRESS: Use SendMessage to @lead with C4 docs summary when complete."
  description: "C4 architecture docs"
```

**Step 4: Monitor Team & Report Progress**

As lead, you MUST actively report progress to the user. **DO NOT go silent** while agents work.

See [Progress Reporting](#progress-reporting-mandatory) for the mandatory polling loop.

After launching all agents, run the progress reporting loop until ALL complete before proceeding to Phase 4.

---

## Phase 3.5: Integration Verification

**Goal**: Verify the full system works before code review

**CRITICAL**: This phase runs AFTER Phase 3 (implementation) and BEFORE Phase 4 (review). Do NOT skip this phase.

**Check CLAUDE.md for `INTEGRATION_VERIFICATION: optional` to skip this phase.**

### When to Run

Run this phase when ANY of these are true:
- Database migrations were created or modified
- Significant code changes were made (new features, refactors)
- Build configuration changed
- Dependencies were added or updated

### Subagent Mode

Launch DevOps agent for integration verification:

- **subagent_type**: `agent-orch:orchestrate-devops`
- **description**: "Run integration verification"
- **prompt**:
  ```
  Run Post-Implementation Integration Verification.
  Read specs/[feature]/status.md to understand what was built.

  Verify IN ORDER (stop on first failure):
  1. FULL BUILD: Run build command. Zero errors required.
  2. DB MIGRATIONS: Run all pending migrations. Must complete without error.
  3. DB SEEDS: Run seeds if they exist. Must complete without error.
  4. APP STARTUP: Start app, verify it boots and responds to health check.
  5. LINT & TYPE CHECK: Run linter and type checker. Zero errors.

  Write verification report to specs/[feature]/status.md.
  If ANY check fails: report failure with full error output.
  ```

### Agent Team Mode

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-devops"
  team_name: "implement-[feature-name]"
  prompt: "Run Post-Implementation Integration Verification.
           Read specs/[feature]/status.md for what was built.
           Verify: build, migrations, seeds, app startup, lint.
           Write report to status.md.
           SendMessage @lead with PASSED/FAILED and details.
           If FAILED: SendMessage @builder or @database with specific fix needed."
  description: "Integration verification"
```

### Verification Gate

**Only proceed to Phase 4 when integration verification PASSES.**

If verification FAILS:
1. Report failure to user with specific errors
2. Launch Builder/Database agent to fix issues
3. Re-run integration verification
4. Maximum 3 attempts before escalating to user

---

## Phase 4: Two-Stage Code Review & Iterative Refinement

**Goal**: Validate all code through two sequential review stages

**CRITICAL**: Stage 1 and Stage 2 are SEQUENTIAL, not parallel. Stage 2 cannot start until Stage 1 passes.

### Stage 1: Spec Compliance Review

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-spec-reviewer`
- **description**: "Verify spec compliance"
- **prompt**:
  ```
  Read `specs/[feature]/spec.md` as your PRIMARY reference.
  DISTRUST the implementer's claims - verify independently by reading actual code.
  For EACH requirement in the spec:
    - Locate the actual implementation code
    - Verify it exists and is correct
    - Note file path and line numbers as evidence
  Check for scope creep (unrequested additions).
  If ALL requirements verified:
    - Document 'Spec Compliance Review - PASSED' in `status.md`
    - Proceed to Stage 2
  If gaps found:
    - Document specific missing requirements with evidence
    - Create refinement tasks in `tasks.md`
    - DO NOT proceed to Stage 2
  ```

**If Stage 1 FAILS**:
1. Read spec-reviewer's findings from `status.md`
2. Launch `agent-orch:orchestrate-builder` to fix gaps
3. Launch `agent-orch:orchestrate-debugger` if tests are failing
4. After fixes, **re-run Stage 1**

### Stage 2: Code Quality Review

**PREREQUISITE**: Stage 1 must show "PASSED" in `status.md`

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-quality-reviewer`
- **description**: "Review code quality"
- **prompt**:
  ```
  Verify Stage 1 passed before proceeding.
  Read `.specify/memory/constitution.md` for project standards.
  Review ALL code for:
    - Constitution compliance
    - Code quality (patterns, naming, structure)
    - Test quality and coverage
    - Documentation completeness
  Categorize issues by severity (CRITICAL/HIGH/MEDIUM/LOW).
  If all HIGH+ issues resolved:
    - Document 'Code Quality Review - APPROVED' in `status.md`
    - Ready for finalization
  If issues found:
    - Document findings with file:line evidence
    - Create refinement tasks in `tasks.md`
  ```

**If Stage 2 FAILS**:
1. Read quality-reviewer's findings from `status.md`
2. Launch appropriate agents IN PARALLEL to fix issues:
   - `agent-orch:orchestrate-builder` for code fixes
   - `agent-orch:orchestrate-validator` for test gaps
   - `agent-orch:orchestrate-scribe` for documentation issues
3. After fixes, **re-run Stage 2** (Stage 1 status preserved)

### Agent Team Mode Review (Alternative)

If using agent teams, spawn reviewers as teammates who iterate directly with builder:

**Stage 1: Spec Reviewer Teammate**

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-spec-reviewer"
  team_name: "implement-[feature-name]"
  prompt: "Read specs/[feature]/spec.md as PRIMARY reference. DISTRUST claims.
           Verify each requirement by reading code. If gaps found, use SendMessage
           to message @builder directly with file locations. @builder fixes and
           notifies you. Re-verify without lead mediation.
           PROGRESS: Use SendMessage to @lead after checking each requirement
           (e.g. 'Verified 3/8 requirements. 2 gaps found, sent to Builder.').
           Use SendMessage to @lead when PASSED or when iteration round completes."
  description: "Verify spec compliance"
```

Reviewer-Builder iteration happens automatically via SendMessage:
1. Spec Reviewer finds gap -> SendMessage to @builder
2. Builder fixes -> SendMessage to @spec-reviewer
3. Repeat until PASSED -> SendMessage to @lead

**Stage 2: Quality Reviewer Teammate** (only after Stage 1 PASSED)

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-quality-reviewer"
  team_name: "implement-[feature-name]"
  prompt: "Verify Stage 1 PASSED. Read constitution.md for standards.
           Review code quality. Use SendMessage to message @builder, @validator,
           @scribe directly with issues. They fix and notify you. Re-verify
           without lead mediation.
           PROGRESS: Use SendMessage to @lead with issue counts as you find them
           (e.g. 'Reviewed 4/7 files. Found 2 issues so far, sent to Builder.').
           Use SendMessage to @lead when APPROVED or when iteration round completes."
  description: "Review code quality"
```

**Debugger Teammate** (when needed)

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-debugger"
  team_name: "implement-[feature-name]"
  prompt: "Read status.md for issue details. NO FIXES WITHOUT ROOT CAUSE.
           Use SendMessage to @builder with findings. Use SendMessage to @lead
           when resolved or if architectural change needed."
  description: "Debug failing tests"
```

### Refinement Loop Limits

- Maximum 3 rounds per stage
- If still failing after 3 rounds, present remaining issues to user for decision
- User can: force approve, continue refining, or abort

### Debugger (When Needed)

Launch when tests fail or issues persist.

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-debugger`
- **description**: "Debug failing tests"
- **prompt**:
  ```
  Investigate the failing tests/issues systematically.
  NO FIXES WITHOUT ROOT CAUSE INVESTIGATION.
  Follow 4-phase methodology: Root Cause -> Pattern Analysis -> Hypothesis -> Implementation.
  After 3 failed fix attempts, stop and assess architecture.
  ```

---

## Phase 5: Resolve Specialist Issues

**Goal**: Address any findings from specialist agents

**Actions**:

### Step 1: Review Specialist Findings

Read `specs/[feature]/status.md` for findings from:
- Security agent
- Performance agent
- Database agent
- API agent
- UI/UX agent
- Other specialists

### Step 2: Fix Issues (If Any)

If issues found, launch agents IN PARALLEL:

**Builder** (for code fixes)
- **subagent_type**: `agent-orch:orchestrate-builder`
- **description**: "Fix specialist issues"
- **prompt**: `Read status.md for specialist findings. Implement required fixes. Update status.md with progress.`

**Validator** (for verification)
- **subagent_type**: `agent-orch:orchestrate-validator`
- **description**: "Verify fixes"
- **prompt**: `Verify Builder's fixes address specialist findings. Run tests. Update status.md.`

### Step 3: Re-Review If Needed

If significant changes were made, re-run the appropriate specialist agent to verify the fix.

---

## Phase 6: Finalize

**Goal**: Complete the implementation

**Actions**:

### Step 1: Verify Reviews Passed

Read `specs/[feature]/status.md` and confirm:
- "Spec Compliance Review - PASSED"
- "Code Quality Review - APPROVED"

### Step 1.5: Session Tracking — Mark Done

Check `specs/[feature]/advocate-review.md` for `## Jira Session Ticket` or `## Coordination`.

**Jira Mode** (session ticket is a Jira issue key):
1. Transition to Done:
   ```
   mcp__jira__jira_transitionIssue with:
     issueKey: "[session ticket]"
     transitionId: "[Done transition ID from .claude/rules/jira.md]"
   ```
2. Add completion comment:
   ```
   mcp__jira__jira_postIssueComment with:
     issueKey: "[session ticket]"
     body: "🤖 Implement session completed.
     [summary, files modified, test results]
     Spec: specs/[feature]/spec.md"
   ```

**Markdown Mode**:
1. Move session row from `## Active Sessions` to `## Completed Sessions` in `ssnc-agent-orch/TEAM-BOARD.md`
2. Update status to "Done", add completion date

**No coordination / no session ticket**: Skip this step.

### Step 1b: Team Cleanup (Agent Team Mode Only)

If using agent teams:

1. Ask teammates to shut down:
```
SendMessage to each teammate: "Please shut down gracefully"
```

2. After all teammates have stopped, clean up:
```
TeamDelete:
  name: "implement-[feature-name]"
```

**IMPORTANT**: Only the lead should run TeamDelete. Never let teammates clean up.

### Step 2: Final Architect Review

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-architect`
- **description**: "Finalize implementation"
- **prompt**:
  ```
  Review `specs/[feature]/status.md`.
  Verify Code Reviewer has approved.
  Mark all tasks complete in `tasks.md`.
  Update `status.md` with final summary.
  ```

### Step 3: Present Summary

Present to user:
- What was implemented (referencing spec)
- Files created/modified
- Tests added
- Documentation created
- Code review rounds completed
- Constitution compliance confirmed

### Step 4: Next Steps

Suggest running `/speckit.checklist` for final validation.

**If user chooses to abort**, check coordination mode in advocate-review.md:

**Jira Mode**: Comment on session ticket noting abort. Do NOT transition to Done — leave In Progress or use "Cancelled" if available.
**Markdown Mode**: Update session row in TEAM-BOARD.md status to "Aborted".
**No coordination**: No action needed.

**Out-of-scope work discovered during Phases 2-5**:
- **Jira Mode**: Create backlog issue with `claude-code-agent-harness` label, link to session ticket, comment on session ticket.
- **Markdown Mode**: Add row to `## Backlog` in TEAM-BOARD.md.
- **No coordination**: Note in status.md only.

---

## Agent Model Selection

Default models are configured per agent in `.agent-orch-models.json` (repo root). Each agent maps to a vendor-neutral alias:

| Agent | Alias | Plan Mode | Rationale |
|-------|-------|-----------|-----------|
| Architect | `thinking` | N/A | Complex planning and coordination |
| Spec Reviewer | `thinking` | Yes | Deep verification reasoning |
| Quality Reviewer | `thinking` | Yes | Constitution compliance analysis |
| Debugger | `thinking` | N/A | Root cause investigation |
| Builder | `instruct` | **NO** | Must start coding immediately. Architect already planned. |
| Validator | `instruct` | Yes | Test plan approval before execution |
| All others | `instruct` | No | Implementation within clear specs |

The bootstrap resolves each alias to a concrete model via `aliases.thinking` and `aliases.instruct` in the config. Shipped defaults: `thinking` → `opus`, `instruct` → `sonnet` (Claude Code). OpenCode users set these to their full model IDs (e.g., `ssnc-gateway/zai-org/GLM-5.2-FP8`).

### Override Per Session

Add model overrides to `.specify/memory/constitution.md`:

```markdown
## Agent Model Overrides
- orchestrate-builder: opus
```

Overrides stack on top of `.agent-orch-models.json` (the config is the base layer).

---

## Progress Reporting (MANDATORY)

**CRITICAL**: You MUST report progress to the user at regular intervals during agent execution. **NEVER go silent** while agents are working. The user cannot see agent activity - YOU are their only window into what is happening.

### status.md is the Single Source of Truth

**CRITICAL**: You MUST only report what is actually written in status.md or received via SendMessage. **NEVER fabricate, infer, or guess agent status.**

- If status.md says Builder completed 2 tasks, report 2 - not "Builder is probably on task 3"
- If status.md hasn't been updated recently, say so: "status.md last updated at [time]. Checking with agents."
- If an agent hasn't written to status.md, report: "[Agent] has not reported progress yet" - do NOT invent what they might be doing
- **Never say "slightly outdated"** and then make up current status. If the file is outdated, that IS the problem to report.

### Agent status.md Update Requirements

All agents MUST update status.md at these points:
1. **Before starting a task**: Write "[Agent]: Starting [task name]"
2. **After completing a task**: Write "[Agent]: Completed [task name] - [brief result]"
3. **When blocked**: Write "[Agent]: BLOCKED on [reason]"
4. **When waiting for permission**: Write "[Agent]: WAITING_PERMISSION - [what action needs approval] - blocking [downstream tasks/agents]"
5. **When messaging another agent**: Write "[Agent] -> [Other]: [brief message summary]"

This is enforced through agent spawn prompts (see PROGRESS instructions in each prompt).

### Permission Requests & Approval Blockers

**CRITICAL**: When agents need user permission (file writes, shell commands, tool calls requiring approval), the orchestrator MUST immediately surface these to the user. Pending permissions are the #1 cause of silent stalls.

**Rules:**
1. **Proactively check for pending permissions** during every polling cycle
2. **Immediately tell the user** when an agent is blocked on approval - do NOT wait for the user to ask
3. **Explain what the permission is for** and why it's blocking progress
4. **Show the dependency chain** - which agents are waiting on the blocked agent

**Format for surfacing permission blockers:**
```
### Action Required: Permission Requests Pending

**[Agent]** needs approval to proceed:
- [What tool/action needs permission] - [why it's needed]
- **Blocking**: [Agent] cannot continue, which blocks [downstream agents]

Please approve or deny in the [Agent] terminal/pane to unblock the pipeline.
```

**If no progress AND no status.md updates**: The most likely cause is a pending permission. Say so:
```
No progress detected. This usually means agents are waiting for permission
approval. Check agent panes for pending permission prompts.
```

### Reporting Rules

1. **After launching agents**: Immediately tell the user what was launched and what to expect
2. **While agents work**: Report progress every time an agent completes or you check status
3. **Never say "working autonomously" and go silent** - this makes the user think the system crashed
4. **Show concrete progress** - file names, task counts, test results - not vague "still working" messages
5. **Only report verified information** - read status.md or agent messages, never guess
6. **Surface permission blockers immediately** - pending approvals are the most common cause of silent stalls

### Subagent Mode Reporting

After launching subagents, you will receive their results as they complete. **Report each result to the user immediately**:

```
**Architect** completed - identified 12 key files, assigned 8 tasks across 3 phases.

**Builder** completed - implemented 3 features:
- auth.ts (new, 145 lines)
- middleware.ts (modified, added token validation)
- routes.ts (modified, 2 new endpoints)

**Validator** still running...
```

### Agent Team Mode Reporting

After spawning teammates, you MUST run an active polling loop:

In Agent Teams mode, messages from teammates arrive **automatically** - the lead does NOT need to poll. The platform delivers `SendMessage` messages and idle notifications to the lead natively.

**Lead Event Loop (message-driven, not polling):**
```
WAIT for incoming events (messages arrive automatically):

  On teammate SendMessage to @lead:
    1. Report the message content to the user immediately
    2. If message contains WAITING_PERMISSION or BLOCKED:
       - Surface to user with what approval is needed
       - Show dependency chain
    3. If message is a task completion report:
       - Report what was accomplished (files, results)
       - Check task list for remaining work

  On teammate idle notification:
    1. Check tasks.md for incomplete tasks assigned to that teammate
    2. If tasks remain → Idle Agent Recovery (re-spawn, see below)
    3. If all tasks done → Report: "[Agent] completed all tasks and is idle."
    4. Check if ALL teammates are idle + all tasks done → phase complete

  On permission request bubbling up from teammate:
    1. IMMEDIATELY tell user: "ACTION REQUIRED: [Agent] needs approval for [action]"
    2. Show what's blocked downstream
    3. Teammate permission requests bubble up to the lead automatically

  On prolonged silence (no events received):
    1. This likely means agents are blocked on permissions
    2. Tell user: "No agent activity. Check for pending permission prompts in agent panes."
    3. Read specs/[feature]/status.md as fallback to check last known state
```

**CRITICAL**: "All agents idle" does NOT mean "all work complete". Always check tasks.md for incomplete tasks before concluding a phase is done.

**Pre-approve common operations**: To reduce permission friction, recommend users pre-approve common tool calls in their permission settings before spawning teammates.

**Progress update format:**
```
### Progress Update

| Agent | Status | Current Task |
|-------|--------|-------------|
| Builder | Working | Implementing auth middleware (3/8 tasks) |
| Validator | Waiting | Ready to test when Builder completes auth |
| Security | Complete | Found 1 MEDIUM issue, sent to Builder |

**Recent activity:**
- Security messaged Builder about input validation gap
- Builder completed database schema (task 2/8)

**Next milestone:** Builder completing auth middleware, then Validator begins testing.
```

**After each agent completes**: Report what it accomplished with specifics.

**When all agents complete**: Full summary before moving to next phase.

### What to Report

| Event | Report |
|-------|--------|
| Agent launched | "Launched [Agent] to [task description]" |
| Agent completed | "**[Agent]** completed: [specific results]" |
| Agent messaged another | "[Agent] sent [issue] to [Agent]: [brief]" |
| Agent blocked | "[Agent] blocked on [reason]. [Action taken]" |
| **Permission needed** | **"ACTION REQUIRED: [Agent] needs approval for [action]. Blocking [downstream]. Check agent pane."** |
| **Stall detected** | **"No progress for [duration]. Likely cause: pending permission. Check agent panes."** |
| Phase transition | "Phase [N] complete. Moving to Phase [N+1]." |
| Review pass/fail | "Stage [N] [PASSED/FAILED]: [details]" |
| No activity | "Agents still working. [State summary]. [N] tasks remaining." |

### Anti-Patterns (NEVER DO THESE)

- "The team is now working autonomously." then silence - **NO**
- "Let me check..." followed by nothing - **NO**
- Going silent while agents work - **NO**
- "Agents are coordinating, no intervention needed." - **NO**, the user still needs visibility
- "status.md is slightly outdated. Here's the actual status: [made-up info]" - **NO**, if stale then agents aren't reporting - flag that, don't fabricate
- Claiming to know agent status without reading status.md or a SendMessage - **NO**
- "Builder is probably..." or "Validator should be..." - **NO**, only confirmed status
- Agents blocked on permissions without telling the user - **NO**, surface permission blockers IMMEDIATELY
- "These permission requests are why it looks quiet!" - **NO**, you should have told the user the moment they appeared

---

## Idle Agent Recovery (Agent Teams Mode)

**CRITICAL**: In-process teammates can go idle (stop running) even when tasks remain incomplete. Messages sent to idle agents sit unread in their inbox. This is the most common cause of long stalls.

### Detection

An agent is "idle with pending work" when:
1. Agent has not updated status.md or sent messages recently
2. tasks.md still has incomplete tasks assigned to that agent
3. Agent received a TeammateIdle notification OR you received an idle notification about them

### Recovery Protocol

When you detect an idle agent with incomplete tasks:

**Step 1: Tell the user immediately**
```
**[Agent] has gone idle but still has [N] incomplete tasks.**
Spawning replacement now.
```

**Step 2: Spawn a replacement teammate**

**IMPORTANT**: In-process teammates cannot be resumed after going idle (`/resume` does not restore in-process teammates - this is a known platform limitation). Spawn a fresh replacement:

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-[role]"
  team_name: "implement-[feature-name]"
  prompt: "Previous [role] agent went idle with incomplete tasks.
           Read specs/[feature]/status.md for current state.
           Read specs/[feature]/tasks.md for incomplete tasks assigned to [role].
           Check your inbox for messages from other agents.
           Pick up where they left off. Do NOT go idle while tasks remain."
  description: "Replace idle [role]"
```

**Step 3: Report to user**
```
**[Agent] replacement spawned** and picking up remaining tasks:
- [Task 1] (incomplete)
- [Task 2] (incomplete)
```

### Prevention

1. **Agent spawn prompts must include**: "Do NOT go idle while you have incomplete tasks. If blocked, SendMessage to @lead."
2. **Use TeammateIdle hook**: `check-teammate-tasks.sh` returns exit code 2 to keep agents working
3. **Agent prompts must include**: "After completing a task, check tasks.md for next task and check your inbox."

### Stall Diagnosis Flowchart

```
No status.md updates for 2+ cycles
  │
  ├── Check: Are agents still running?
  │     ├── YES → Check for WAITING_PERMISSION
  │     │          └── Surface permission blockers to user
  │     └── NO (agents idle) → Check: Are there incomplete tasks?
  │           ├── YES → Re-spawn agents (Idle Agent Recovery)
  │           └── NO → Phase complete, proceed
  │
  └── Tell user what you found and what action you're taking
```

**NEVER**: Assume "agents idle" means "work is done". ALWAYS cross-reference with tasks.md.

---

## Two-Stage Review Integration

The review process has TWO sequential stages - Stage 2 cannot start until Stage 1 passes:

```
+----------------------------------------------------------+
|                    Phase 3: Build                         |
|  Builder + Validator + Scribe + Specialists (parallel)    |
+----------------------------------------------------------+
                           |
                           v
+----------------------------------------------------------+
|           Phase 3.5: Integration Verification             |
|                                                           |
|  DevOps agent verifies (stops on first failure):          |
|  1. Full build (zero errors)                              |
|  2. DB migrations (all pending applied)                   |
|  3. DB seeds (data created)                               |
|  4. App startup (boots + health check)                    |
|  5. Lint & type check (zero errors)                       |
|                                                           |
|  FAIL --> Fix --> Re-run (max 3 attempts)                 |
+----------------------------------------------------------+
                           |
                           v PASS
+----------------------------------------------------------+
|         Phase 4: Two-Stage Code Review                    |
|                                                           |
|  +----------------------------------------------------+  |
|  |  STAGE 1: Spec Compliance (orchestrate-spec-reviewer) |  |
|  |                                                    |  |
|  |  Does implementation match spec exactly?           |  |
|  |  - Verify each requirement with code evidence      |  |
|  |  - Detect missing features                         |  |
|  |  - Detect scope creep                              |  |
|  +----------------------------------------------------+  |
|        |                                                  |
|        +-- FAIL --> Refinement --> Re-run Stage 1        |
|        |                                                  |
|        v PASS                                             |
|  +----------------------------------------------------+  |
|  |  STAGE 2: Code Quality (orchestrate-quality-reviewer) |  |
|  |                                                    |  |
|  |  Does code meet quality standards?                 |  |
|  |  - Constitution compliance                         |  |
|  |  - Patterns, naming, structure                     |  |
|  |  - Test coverage                                   |  |
|  |  - Documentation                                   |  |
|  +----------------------------------------------------+  |
|        |                                                  |
|        +-- FAIL --> Refinement --> Re-run Stage 2        |
|        |                                                  |
|        v PASS                                             |
|  +-------------+                                          |
|  |  APPROVED   |                                          |
|  +-------------+                                          |
+----------------------------------------------------------+
                           |
                           v
+----------------------------------------------------------+
|                   Phase 6: Finalize                       |
+----------------------------------------------------------+

+----------------------------------------------------------+
|              Support: orchestrate-debugger                |
|                                                           |
|  Launched when tests fail or issues persist:              |
|  1. Root Cause Investigation (no fixes without this)      |
|  2. Pattern Analysis (find working examples)              |
|  3. Hypothesis & Testing (isolated changes)               |
|  4. Implementation (failing test first)                   |
|                                                           |
|  Stop signal: 3 failed attempts = architectural review    |
+----------------------------------------------------------+
```

---

## Spec-Kit Native Integration

This command uses spec-kit's existing structure:
- **No separate tracking files** - everything in `.specify/`
- Reads specs from `/speckit.specify`
- Reads plans from `/speckit.plan`
- Reads tasks from `/speckit.tasks`
- Updates status within `specs/[feature]/`
- Refinement tasks added to existing `tasks.md`
- Compatible with any spec-kit version

---

## Observability & Diagnostics

### Agent Activity Tracking

**CRITICAL**: After EACH phase, update `specs/[feature]/status.md` with an agent activity log.

### Phase Completion Checklist

After each phase, add to status.md:

```markdown
## Phase [N] Completion

### Agents Launched
| Agent | subagent_type | Status | Duration |
|-------|---------------|--------|----------|
| Architect | agent-orch:orchestrate-architect | ✅ Completed | - |
| Builder | agent-orch:orchestrate-builder | ✅ Completed | - |
| Validator | agent-orch:orchestrate-validator | ✅ Completed | - |
| Scribe | agent-orch:orchestrate-scribe | ✅ Completed | - |
| Security | agent-orch:orchestrate-security | ✅ Completed | - |
| Performance | agent-orch:orchestrate-performance | ⏭️ Skipped (not approved) | - |

### Agent Outputs Received
- [x] Architect: Updated tasks.md with assignments
- [x] Builder: Implemented 3 features, updated status.md
- [x] Validator: Wrote 8 tests, all passing
- [x] Scribe: Created API documentation
- [x] Security: Found 1 MEDIUM issue, documented in status.md
```

### Individual Agent Completion Markers

Each agent MUST write a completion marker to status.md when done:

```markdown
---
## Agent Completion: Builder
**Timestamp**: [ISO timestamp]
**Status**: ✅ COMPLETED
**Tasks Completed**: 3/3
**Files Modified**: 5
**Evidence**: Test output showing all tests pass
---
```

### Final Summary Section

At the end of Phase 6, add a comprehensive summary to status.md:

```markdown
## Implementation Summary

### Agent Participation
| Agent | Launched | Completed | Findings |
|-------|----------|-----------|----------|
| orchestrate-architect | ✅ | ✅ | Planned 8 tasks |
| orchestrate-builder | ✅ | ✅ | Implemented 3 features |
| orchestrate-validator | ✅ | ✅ | 12 tests, 100% pass |
| orchestrate-scribe | ✅ | ✅ | 2 docs created |
| orchestrate-spec-reviewer | ✅ | ✅ | Stage 1 PASSED |
| orchestrate-quality-reviewer | ✅ | ✅ | Stage 2 APPROVED (2 rounds) |
| orchestrate-security | ✅ | ✅ | 1 issue found, fixed |
| orchestrate-performance | ⏭️ | - | Not activated |
| orchestrate-devops | ⏭️ | - | Not activated |
| orchestrate-telemetry | ⏭️ | - | Not activated |
| orchestrate-database | ⏭️ | - | Not activated |
| orchestrate-api | ✅ | ✅ | OpenAPI spec created |
| orchestrate-uiux | ⏭️ | - | Not activated |
| orchestrate-refactorer | ⏭️ | - | Not activated |
| orchestrate-migration | ⏭️ | - | Not activated |
| orchestrate-c4-scribe | ⏭️ | - | Not activated |
| orchestrate-debugger | ⏭️ | - | Not needed |

### Total Agents
- **Activated**: 7/17
- **Completed Successfully**: 7/7
- **Review Rounds**: 2

### Quality Gates Passed
- [x] Verification Gate (Builder) - Evidence provided
- [x] Verification Gate (Validator) - Test output shown
- [x] Stage 1: Spec Compliance - PASSED
- [x] Stage 2: Code Quality - APPROVED
```

### Troubleshooting Agent Issues

If an agent doesn't appear to run:
1. Check status.md for completion marker
2. Verify Task tool was called with correct subagent_type
3. Check if agent returned an error
4. Look for agent output in conversation

If agent output is missing:
1. Agent may have failed silently
2. Re-launch the specific agent
3. Check prompts match expected format

---

## Quality Gate Hooks (Agent Teams)

Use Claude Code hooks to enforce quality gates when using agent teams:

### TeammateIdle Hook

Runs when a teammate is about to go idle. Exit with code 2 to send feedback:

```json
{
  "hooks": {
    "TeammateIdle": [{
      "command": "check-teammate-tasks.sh",
      "description": "Verify teammate completed all assigned tasks before going idle"
    }]
  }
}
```

### TaskCompleted Hook

Runs when a task is marked complete. Exit with code 2 to prevent completion:

```json
{
  "hooks": {
    "TaskCompleted": [{
      "command": "verify-task-evidence.sh",
      "description": "Ensure verification gate evidence exists before marking task complete"
    }]
  }
}
```

These hooks map directly to the plugin's verification gates - automatically enforcing
that agents provide evidence before claiming completion.

---

## Display Mode

For Agent Teams, configure split-pane display in settings.json:

```json
{
  "teammateMode": "tmux"
}
```

Or use `--teammate-mode in-process` for in-process mode. Use `Shift+Down` to cycle between teammates.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.implement:` entry. If the file is absent, has no
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
