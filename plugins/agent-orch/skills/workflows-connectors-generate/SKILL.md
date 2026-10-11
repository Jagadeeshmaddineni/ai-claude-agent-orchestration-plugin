---
name: workflows-connectors-generate
description: Multi-agent connector generation for workflows-connectors repository. Combines connector-generator's constitution (C0-C9), policies, guides, and custom speckit commands with build-orch's 23 specialized agents. Supports full and incremental modes. Usage: /agent-orch:workflows-connectors-generate [service-name]
---

# Workflows Connectors Multi-Agent Generation

You are the Connector Generator for the workflows-connectors repository. Your purpose is to help users generate complete, production-ready connector modules following established patterns.

This skill combines:
- **Connector-generator's** domain expertise (C0-C9 constitution, policies, guides, templates)
- **Build-orch's** agent orchestration (15 agents, verification gates, two-stage review)

## Overview

This skill provides **entry point setup only**. The user drives the workflow by running commands manually.

### Full Mode (Small Connectors)

For connectors with ≤3 actions AND ≤2 triggers:

```
/workflows-connectors-generate  →  Setup & Pre-flight (THIS SKILL)
        ↓
/speckit.docs         →  Gather API documentation
        ↓
/speckit.scope        →  Configure auth, actions, triggers
        ↓
/speckit.specify      →  Generate spec-kit specification
        ↓
/speckit.plan         →  Create implementation plan
        ↓
/speckit.tasks        →  Break down into tasks
        ↓
/speckit.implement    →  Generate connector code
        ↓
/speckit.validate     →  Run build, lint, pattern checks
        ↓
/speckit.refactor     →  Fix any issues (if needed)
        ↓
/speckit.complete     →  Complete and finalize
```

### Incremental Mode (Large Connectors)

For connectors with >3 actions OR >2 triggers:

```
/workflows-connectors-generate  →  Setup & Pre-flight (THIS SKILL)
        ↓
/speckit.docs         →  Gather API documentation
        ↓
/speckit.scope        →  Configure + PR breakdown negotiation
        ↓
┌───────────────────────────────────────────────────────────┐
│  Repeat for each sub-scope (MVP → Actions → Triggers):    │
│                                                           │
│  /speckit.specify                                         │
│  /speckit.plan                                            │
│  /speckit.tasks                                           │
│  /speckit.implement                                       │
│  /speckit.validate                                        │
│  (Create PR, get review, merge)                           │
│  /speckit.complete → Advance to next sub-scope            │
│                                                           │
└───────────────────────────────────────────────────────────┘
        ↓
/speckit.complete     →  Finalize (after all sub-scopes done)
```

---

## Skill Execution

When this skill is invoked, execute **ONLY** the steps in this section, then **STOP**.

### Step 1: Check for Existing Context (Resume Detection)

**First, check if there's an in-progress connector to resume:**

1. Check `specs/*/connector-context.md` files
2. If found with incomplete status, offer to resume
3. If resuming, run install script and skip to "Output Ready Message"

**If resuming:**
```bash
bash [SKILL_DIR]/scripts/install-commands.sh
```

Then output ready message and **STOP**.

---

### Step 2: Confirm Service

```
🔌 Connector Generator (Multi-Agent)

What service would you like to create a connector for?
> _______

[If service in user message]
Service detected: [service-name]
Is this correct? (Y/n):
```

Use AskUserQuestion to confirm.

---

### Step 3: Pre-flight Checks

```
🔍 Running pre-flight checks...

[1/7] Verifying workflows-connectors repository...
  ✅ Found packages/connectors/ directory

[2/7] Checking for existing connector...
  ✅ Connector name available

[3/7] Verifying nx workspace...
  ✅ nx workspace detected

[4/7] Creating specs directory...
  ✅ Created specs/ for artifacts

[5/7] Installing connector-generator commands...
  [Run install script - see below]

[6/7] Swapping constitution for connector generation...
  ✅ Installed C0-C9 constitution

[7/7] Generating code conventions...
  ✅ Created conventions.md (TypeScript)
```

**Step 5 & 6 - Run Install Script:**

```bash
bash [SKILL_DIR]/scripts/install-commands.sh
```

Where `[SKILL_DIR]` is the directory containing this SKILL.md file.

This script:
1. Copies custom speckit commands to `.claude/commands/`
2. Copies C0-C9 constitution to `.specify/memory/constitution.md`
3. Copies cleanup script to `.claude/scripts/`

**Step 7 - Generate Conventions:**

Create `.specify/memory/conventions.md`:

```markdown
# Code Conventions

This file references project code conventions that all agents MUST follow.

## Tech Stack Detected
TypeScript (workflows-connectors is a TypeScript monorepo)

## Convention Source

**Primary**: Read and follow the conventions from:
`.specify/conventions/typescript.md`

(This is a symlink to the plugin's conventions folder, created by the install script)

## Project Overrides

If `.conventions/convention.md` exists in project root, those rules take precedence.

## Agent Instructions

1. READ the convention file before writing any code
2. APPLY all applicable rules
3. DOCUMENT which conventions you applied in status.md
```

---

### Step 4: Ask for Jira Ticket

```
📋 Jira Ticket

What is the Jira ticket for this connector?
(e.g., CONN-123)
> _______
```

Use AskUserQuestion to get the ticket.

---

### Step 5: Create Feature Branch and Context

```bash
git checkout -b feat/[jira_ticket]-[service-name]-connector
mkdir -p specs/feat-[jira_ticket]-[service-name]-connector
```

Create `specs/[feature-branch]/connector-context.md`:

```markdown
# Connector Generation Context

**Service Name:** [Service Name]
**Internal Name:** [service-name]
**Jira Ticket:** [jira_ticket]
**Feature Branch:** feat/[jira_ticket]-[service-name]-connector
**Target Directory:** packages/connectors/[service-name]/

## Status
- [x] Pre-flight complete
- [ ] API documentation gathered
- [ ] Connector configured
- [ ] Code generated
- [ ] Validation passed
- [ ] Finalized
```

---

### Step 6: Output Ready Message

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pre-flight Complete!

Service: [Service Name]
Jira:    [jira_ticket]
Branch:  feat/[jira_ticket]-[service-name]-connector
Target:  packages/connectors/[service-name]/

Build-orch agents will use C0-C9 constitution automatically.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

→ Next: Run /speckit.docs to gather API documentation

💡 Tip: Run /speckit.whereami anytime to see your progress
```

---

## ⛔ STOP HERE

**DO NOT proceed to any further phases.**

The user will manually run each command in sequence:
1. `/speckit.docs`
2. `/speckit.scope`
3. `/speckit.specify`
4. etc.

Each command has its own instructions. This skill only handles initial setup.

---

# Reference Documentation

The sections below are **reference material only** - do NOT execute them automatically.
They describe what each phase does when the user runs the corresponding command.

---

## Reference: Build-Orch Agents

When the user reaches implementation phases, they can optionally use build-orch agents.

**How to Launch Agents** (when user requests):

Use the **Task tool** with:
```
Task tool call:
  subagent_type: "agent-orch:orchestrate-<agent-name>"
  prompt: "<the prompt for the agent>"
  description: "<short 3-5 word description>"
```

**For parallel execution**: Send a SINGLE message with MULTIPLE Task tool calls.

**Available agents**:
- `agent-orch:orchestrate-architect` - Planning and coordination
- `agent-orch:orchestrate-builder` - Implementation
- `agent-orch:orchestrate-validator` - Testing
- `agent-orch:orchestrate-scribe` - Documentation
- `agent-orch:orchestrate-spec-reviewer` - Stage 1 review
- `agent-orch:orchestrate-quality-reviewer` - Stage 2 review
- `agent-orch:orchestrate-debugger` - Debugging
- `agent-orch:orchestrate-security` - Security audit
- `agent-orch:orchestrate-api` - API design validation

---

## Reference: Phase Descriptions

### Phase 1: API Documentation

**User runs**: `/speckit.docs`

This custom command:
- Uses phased discovery (5 phases)
- Official sources only (no third-party)
- Creates `api-reference.md` artifact

**Output**: `specs/[feature-branch]/api-reference.md`

---

### Phase 2: Connector Configuration

**User runs**: `/speckit.scope`

This custom command asks 7 mandatory questions:
1. Integration Approach (SDK vs HTTP)
2. Authentication type
3. Webhook support
4. Actions selection
5. Triggers selection
6. Uncertainties resolution
7. PR Breakdown (determines full vs incremental mode)

**Output**:
- `specs/[feature-branch]/scope.md`
- `specs/[feature-branch]/breakdown.md` (if incremental)

---

### Phase 3: Specification & Planning

**User runs**:
- `/speckit.specify`
- `/speckit.plan`
- `/speckit.tasks`

These are standard spec-kit commands enhanced with connector context.

---

### Phase 4: Implementation

**User runs**: `/speckit.implement`

Optionally, user can request build-orch agents for parallel implementation:
- Builder agent for code
- Validator agent for tests
- Scribe agent for documentation
- Security agent for auth audit
- API agent for compliance

---

### Phase 5: Validation

**User runs**: `/speckit.validate`

This custom command checks:
1. TypeScript build: `nx build connectors-[service-name]`
2. ESLint: `nx lint connectors-[service-name]`
3. C0-C9 pattern compliance
4. A1-A5 additional checks (authors, naming, factory patterns)

---

### Phase 6: Refinement (if needed)

**User runs**: `/speckit.refactor`

This fixes:
- Lint issues (`nx lint --fix`)
- Build errors
- Some pattern compliance issues

---

### Phase 7: Completion

**User runs**: `/speckit.complete`

For **incremental mode** with pending sub-scopes:
- Marks current sub-scope complete
- Runs cleanup script
- Advances to next sub-scope

For **final completion**:
- Archives artifacts
- Runs cleanup script
- Restores original speckit commands
- Restores original constitution

---

## Reference: Agent Prompts

These prompts are provided for reference when launching agents manually.

### Architect Agent Prompt

```
You are planning a connector implementation for workflows-connectors.

Read these files:
- .specify/memory/constitution.md (C0-C9 patterns - CRITICAL)
- specs/[feature]/spec.md
- specs/[feature]/plan.md
- specs/[feature]/tasks.md
- specs/[feature-branch]/api-reference.md
- specs/[feature-branch]/scope.md

When assigning connector tasks, use this implementation order:
1. auth.ts first (C4 pattern)
2. lib/common/constants.ts (C2 pattern)
3. lib/common/client.ts (C1 pattern)
4. lib/common/types.ts
5. Actions (grouped by resource type)
6. Triggers last
7. index.ts last

Update specs/[feature]/tasks.md with:
- Detailed task assignments for Builder
- Test requirements for Validator
- Documentation tasks for Scribe

Recommend which specialists to activate:
- orchestrate-security: ALWAYS for connectors (auth code)
- orchestrate-api: ALWAYS for connectors (API compliance)
- Others as needed

Return 10-15 most important files to understand.
```

### Builder Agent Prompt

```
You are implementing a connector for workflows-connectors.

Read these files first:
- .specify/memory/constitution.md (C0-C9 patterns - MUST FOLLOW)
- specs/[feature]/spec.md
- specs/[feature]/tasks.md (your assignments)

For trigger implementation, also read:
- [SKILL_DIR]/guides/TRIGGER_FACTORY_PATTERN.md
- [SKILL_DIR]/templates/POLLING_TRIGGER.md or WEBHOOK_TRIGGER.md

For auth implementation, also read:
- [SKILL_DIR]/guides/AUTHENTICATION_PATTERNS.md

Implementation order (CRITICAL):
1. auth.ts first
2. lib/common/constants.ts
3. lib/common/client.ts
4. Actions
5. Triggers
6. index.ts

VERIFICATION: Run these commands before marking tasks complete:
- nx build connectors-[service-name]
- nx lint connectors-[service-name]

Update specs/[feature]/status.md with progress.
```

### Security Agent Prompt

```
Audit the connector's authentication implementation.

Read:
- .specify/memory/constitution.md (C4 pattern)
- [SKILL_DIR]/policies/authentication.md
- [SKILL_DIR]/guides/AUTHENTICATION_PATTERNS.md

Check:
- OAuth2 patterns (AUTHORIZATION_CODE, CLIENT_CREDENTIALS)
- API Key / SecretText patterns
- OAuth2 scope minimization
- No hardcoded credentials

Report findings in specs/[feature]/status.md.
```

### Spec Reviewer Prompt

```
Verify the connector implementation matches the specification exactly.

Read:
- specs/[feature]/spec.md (PRIMARY reference)
- specs/[feature-branch]/scope.md
- specs/[feature-branch]/api-reference.md

DISTRUST the implementer's claims - verify by reading actual code.

For EACH requirement:
- Locate the implementation code
- Verify it exists and is correct
- Note file:line as evidence

Check for scope creep (unrequested additions).

If ALL requirements verified:
- Document 'Spec Compliance Review - PASSED' in status.md

If gaps found:
- Document specific missing requirements
- Create refinement tasks
- DO NOT proceed to Stage 2
```

### Quality Reviewer Prompt

```
Review connector code quality against C0-C9 constitution.

Read:
- .specify/memory/constitution.md (C0-C9 patterns)
- specs/[feature-branch]/validation-results.md

Review ALL code for:
- C0: API reference compliance
- C1: HTTP client abstraction (client.ts)
- C2: Constants extraction (constants.ts)
- C3: Validation schemas (Zod)
- C4: Separate auth definition (auth.ts)
- C5: Trigger strategy (WEBHOOK vs POLLING)
- C6: Property type inference
- C7: Property description enhancement
- C8: Error message context
- C9: Function parameter deconstruction

Categorize issues by severity (CRITICAL/HIGH/MEDIUM/LOW).

If all HIGH+ resolved:
- Document 'Code Quality Review - APPROVED' in status.md

If issues found:
- Document with file:line evidence
- Create refinement tasks
```

---

## Reference Files

### Constitution (C0-C9 Patterns)
- `constitution/constitution.md` - Installed to `.specify/memory/`

### Policies
- `policies/authentication.md` - Auth standards
- `policies/code-style.md` - Code conventions

### Guides
- `guides/AUTHENTICATION_PATTERNS.md` - Auth implementation examples
- `guides/CODE_REUSE_PATTERNS.md` - Common utility patterns
- `guides/TRIGGER_FACTORY_PATTERN.md` - Polling trigger factory
- `guides/ERROR_RECOVERY.md` - Error handling
- `guides/VALIDATION_COMMANDS.md` - Build and lint commands
- `guides/scope/q1-q7` - Scope question templates

### Templates
- `templates/POLLING_TRIGGER.md` - Polling trigger code template
- `templates/WEBHOOK_TRIGGER.md` - Webhook trigger code template
- `templates/API_REFERENCE_ARTIFACT.md` - API reference structure

### Custom Commands
- `commands/speckit.docs.md` - API documentation gathering
- `commands/speckit.scope.md` - Connector configuration
- `commands/speckit.specify.md` - Specification (with sub-branch handling)
- `commands/speckit.validate.md` - Validation (C0-C9 checks)
- `commands/speckit.refactor.md` - Auto-fix issues
- `commands/speckit.complete.md` - Completion (dual modes)
- `commands/speckit.whereami.md` - Progress display

---

## Command Reference

| Command | Purpose |
|---------|---------|
| `/speckit.whereami` | Show workflow progress |
| `/speckit.docs` | Gather API documentation |
| `/speckit.scope` | Configure auth, actions, triggers |
| `/speckit.specify` | Generate specification (+ sub-branch handling) |
| `/speckit.plan` | Create implementation plan (standard) |
| `/speckit.tasks` | Break down into tasks (standard) |
| `/speckit.implement` | Run spec-kit implement |
| `/speckit.validate` | Run C0-C9 pattern checks |
| `/speckit.refactor` | Auto-fix issues |
| `/speckit.complete` | Complete (sub-scope or final) |

---

## Success Criteria

A successfully generated connector:
- Compiles without TypeScript errors
- Passes ESLint
- Follows C0-C9 patterns from constitution
- Has proper authentication configuration
- Has at least 1 action or 1 trigger
- Authors field is `['SS&C Blue Prism']`
- Contains README with setup instructions

---

## Important Notes

1. **User drives the workflow** - each command is run manually
2. **One connector = One auth method**
3. **Create from scratch only** (no editing existing connectors)
4. **Follow C1-C9 patterns** as defined in constitution.md
5. **Graceful error recovery** at each step

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.workflows-connectors-generate:` entry. If the file is absent, has no
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

---

Let's generate a connector!
