---
description: Display connector-generator workflow status and available commands
---

## Connector Generator Workflow Status

Display the current workflow progress. Output the status DIRECTLY in your response text (do NOT use Bash for output - it gets collapsed).

### 1. Check for Context File

Check `specs/*/connector-context.md` for the most recently modified folder.

**If NOT exists**, output this directly:

```
⚠️ No active connector generation session.

Run /workflows-connectors-generate to start a new connector.
```

Stop here.

**If exists:** Read it and extract the Service Name, Feature Branch, and Status checklist.

### 2. Check for Breakdown File

Check if `specs/[feature-branch-name]/breakdown.md` exists.

**If exists:**
- Parse the sub-scopes and their statuses (`[current]`, `[pending]`, `[completed]`)
- Count total sub-scopes and completed sub-scopes
- Identify current sub-scope name
- Set `has_breakdown = true`

**If NOT exists:**
- Set `has_breakdown = false`

### 3. Determine Current Step

Parse the Status section checkboxes:

| Checklist Item              | Next Command         |
|-----------------------------|----------------------|
| Pre-flight complete         | /speckit.docs        |
| API documentation gathered  | /speckit.scope       |
| Connector configured        | /speckit.specify     |
| Code generated              | /speckit.validate    |
| Validation passed           | /speckit.complete    |
| Finalized                   | (done)               |

Find the LAST checked `[x]` item → commands up to that point are complete.
The NEXT unchecked `[ ]` item → that's the current step.

### 4. Output Status Directly

#### If NO Breakdown (Small Connector or Full Mode):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Connector Generator - Where Am I?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Service: [SERVICE NAME]
Mode: Full (single PR)

🟢 /workflows-connectors-generate    Setup & pre-flight checks
🟢 /speckit.docs           Gather API documentation
🟡 /speckit.scope          Configure auth, actions, triggers
⚪ /speckit.specify        Generate spec-kit specification
⚪ /speckit.plan           Create implementation plan
⚪ /speckit.tasks          Break down into tasks
⚪ /speckit.implement      Generate connector code
⚪ /speckit.validate       Run build, lint, pattern checks
⚪ /speckit.refactor       Fix issues (if needed)
⚪ /speckit.complete       Complete and finalize

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ Next: Run /speckit.scope
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### If HAS Breakdown (Incremental Mode):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Connector Generator - Where Am I?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Service: [SERVICE NAME]
Mode: Incremental ([completed]/[total] sub-scopes)

📦 Sub-Scope Progress:
┌─────────────────────────────────────────────────────────┐
│ 🟢 Sub-Scope 1: MVP                          [completed]│
│ 🟡 Sub-Scope 2: Actions                        [current]│
│ ⚪ Sub-Scope 3: Triggers                       [pending]│
└─────────────────────────────────────────────────────────┘

Current Sub-Scope: [SUB-SCOPE NAME]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 /workflows-connectors-generate    Setup & pre-flight checks
🟢 /speckit.docs           Gather API documentation
🟢 /speckit.scope          Configure auth, actions, triggers
🟡 /speckit.specify        Generate spec (current sub-scope)
⚪ /speckit.plan           Create implementation plan
⚪ /speckit.tasks          Break down into tasks
⚪ /speckit.implement      Generate connector code
⚪ /speckit.validate       Run build, lint, pattern checks
⚪ /speckit.refactor       Fix issues (if needed)
⚪ /speckit.complete       Complete current work and prepare for PR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ Next: Run /speckit.specify @specs/[feature-branch-name]/specify-instructions.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5. Next Command with Arguments

When the next step is `/speckit.specify`:

**Always show:** `/speckit.specify @specs/[feature-branch-name]/specify-instructions.md`

**IMPORTANT:** Replace `[feature-branch-name]` with the actual feature branch name from connector-context.md.

Example: `→ Next: Run /speckit.specify @specs/feat-CONN-123-servicenow-connector/specify-instructions.md`

For all other commands, just show the command name.

### 6. Visual Indicators

Use these emoji prefixes:

| State | Emoji | Meaning |
|-------|-------|---------|
| 🟢 | Completed | This step is done |
| 🟡 | Current | This is the next step to run |
| ⚪ | Future | Not yet reached |

For sub-scopes:
| State | Emoji | Meaning |
|-------|-------|---------|
| 🟢 | Completed | Sub-scope merged |
| 🟡 | Current | Working on this sub-scope |
| ⚪ | Pending | Not yet started |

### 7. Command Descriptions

| Command | Description |
|---------|-------------|
| /workflows-connectors-generate | Setup & pre-flight checks |
| /speckit.docs | Gather API documentation |
| /speckit.scope | Configure auth, actions, triggers |
| /speckit.specify | Generate spec-kit specification |
| /speckit.plan | Create implementation plan |
| /speckit.tasks | Break down into tasks |
| /speckit.implement | Generate connector code |
| /speckit.validate | Run build, lint, pattern checks |
| /speckit.refactor | Fix issues (if needed) |
| /speckit.complete | Complete current work and prepare for PR |

### 8. Milestone Mapping

The context checklist tracks milestones, not individual commands:

| Context Checklist           | Commands Marked Complete |
|-----------------------------|--------------------------|
| Pre-flight complete         | /workflows-connectors-generate |
| API documentation gathered  | /speckit.docs |
| Connector configured        | /speckit.scope |
| Code generated              | /speckit.specify, /speckit.plan, /speckit.tasks, /speckit.implement |
| Validation passed           | /speckit.validate, /speckit.refactor |
| Finalized                   | /speckit.complete |

**Note:** In incremental mode, the specify→implement cycle repeats for each sub-scope. After `/speckit.complete`, commit your changes and create a PR. When ready for the next sub-scope, re-run `/workflows-connectors-generate` to resume.

### 9. All Complete

#### No Breakdown:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Connector Generator - Where Am I?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Service: [SERVICE NAME]
Mode: Full (single PR)

🟢 /workflows-connectors-generate    Setup & pre-flight checks
🟢 /speckit.docs           Gather API documentation
🟢 /speckit.scope          Configure auth, actions, triggers
🟢 /speckit.specify        Generate spec-kit specification
🟢 /speckit.plan           Create implementation plan
🟢 /speckit.tasks          Break down into tasks
🟢 /speckit.implement      Generate connector code
🟢 /speckit.validate       Run build, lint, pattern checks
🟢 /speckit.refactor       Fix issues (if needed)
🟢 /speckit.complete       Complete current work and prepare for PR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Connector generation complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### With Breakdown (All Sub-Scopes Complete):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Connector Generator - Where Am I?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Service: [SERVICE NAME]
Mode: Incremental (3/3 sub-scopes)

📦 Sub-Scope Progress:
┌─────────────────────────────────────────────────────────┐
│ 🟢 Sub-Scope 1: MVP                          [completed]│
│ 🟢 Sub-Scope 2: Actions                      [completed]│
│ 🟢 Sub-Scope 3: Triggers                     [completed]│
└─────────────────────────────────────────────────────────┘

🟢 All workflow steps complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All sub-scopes complete! Ready to merge feature branch.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
