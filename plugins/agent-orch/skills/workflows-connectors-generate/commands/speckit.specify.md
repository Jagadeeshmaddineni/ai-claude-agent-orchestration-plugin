---
description: Generate spec-kit specification for connector (wrapper with sub-branch handling for incremental mode)
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The input should point to the specify-instructions.md file.

## Prerequisites

**Read the connector context first:**

1. Check `specs/*/connector-context.md` for the most recently modified folder
2. Read it to get:
   - Service Name
   - Internal Name (kebab-case)
   - Jira Ticket
   - Feature Branch name

```
Loading connector context...

[If specs/[feature-branch-name]/connector-context.md exists]
Service: [Service Name]
Internal Name: [service-name]
Jira Ticket: [JIRA_TICKET]
Feature Branch: [feature-branch-name]
Artifacts: specs/[feature-branch-name]/

[If not exists]
No connector context found.
Please run /workflows-connectors-generate first to set up the connector.
```

**Stop here if context doesn't exist.**

---

## Sub-Branch Handling (Incremental Mode)

### 1. Check for Breakdown File

Look for `specs/[feature-branch-name]/breakdown.md`.

**If breakdown.md does NOT exist:**
- Skip to "Proceed with Specification" section
- This is Full Mode (single PR)

**If breakdown.md exists:**
- Parse the sub-scopes
- Find the sub-scope marked with `[current]`
- Extract the sub-scope name (text after the colon)

### 2. Derive Sub-Branch Suffix

From the current sub-scope name, create a branch suffix:

**Rules:**
1. Take text after "Sub-Scope N: " (e.g., "MVP", "Remaining Actions", "Triggers")
2. Convert to lowercase
3. Replace spaces with hyphens
4. Remove special characters
5. Keep it short (2-3 words max)

**Examples:**
| Sub-Scope Name | Suffix |
|----------------|--------|
| MVP | mvp |
| Remaining Actions | remaining-actions |
| Triggers | triggers |
| Additional Triggers | additional-triggers |

### 3. Create Sub-Branch

```
Creating sub-branch for current sub-scope...

Current Sub-Scope: [Sub-Scope N: Name]
```

Run (using feature branch name from context.md):
```bash
git checkout -b [feature-branch-name]-[suffix]
```

**Example:**
If feature branch is `feat/CONN-123-servicenow-connector` and suffix is `mvp`:
```bash
git checkout -b feat/CONN-123-servicenow-connector-mvp
```

**Output:**
```
Created sub-branch: [feature-branch-name]-[suffix]
  From: [current-branch]
```

**If branch already exists:**
- Just check out to it: `git checkout [feature-branch-name]-[suffix]`
- Output: `Switched to existing sub-branch: [feature-branch-name]-[suffix]`

---

## Proceed with Specification

### 4. Read Instructions File

The user input (`$ARGUMENTS`) should reference the instructions file:
- Expected: `@specs/[feature-branch-name]/specify-instructions.md`

**If arguments empty or don't reference the instructions file:**
```
Please provide the instructions file:

→ /speckit.specify @specs/[feature-branch-name]/specify-instructions.md
```
**Stop here.**

**If arguments provided:**
- Read the referenced file (e.g., `specs/[feature-branch-name]/specify-instructions.md`)
- Extract the specification scope from the instructions

### 5. Load Specify Instructions

Read `specs/[feature-branch-name]/specify-instructions.md` to understand:
- **Mode:** Full or Current Sub-Scope
- **In-Scope items:** What to include in this specification
- **Out-of-Scope items:** What to defer to later sub-scopes

### 6. Gather Context Files

Read the following context files from the feature branch folder:
- `specs/[feature-branch-name]/api-reference.md` - API documentation
- `specs/[feature-branch-name]/scope.md` - Scope decisions from Q1-Q6

### 7. Generate Specification

Using the spec-kit specification format, generate the connector specification.

**For Full Mode:**
- Include ALL configured actions and triggers

**For Incremental Mode (current sub-scope):**
- Include ONLY items listed in "In-Scope" from instructions
- Reference "Out-of-Scope" items as future work

**Specification should include:**

1. **Overview**
   - Service name and description
   - Authentication method
   - Base URL pattern

2. **Authentication Configuration**
   - Auth type details (OAuth2/SecretText/CustomAuth)
   - Required fields
   - Token refresh strategy (if OAuth2)

3. **Actions** (only in-scope ones for incremental)
   - For each action:
     - Name and description
     - Input properties with types
     - Output schema
     - API endpoint and method
     - Error handling

4. **Triggers** (only in-scope ones for incremental)
   - For each trigger:
     - Name and description
     - Type (WEBHOOK or POLLING)
     - Configuration properties
     - Event payload schema
     - Deduplication strategy

5. **Common Types**
   - Shared data structures
   - Enums and constants

### 8. Write Specification

Write to: `specs/[sub-branch-name]/spec.md`

(The sub-branch folder is created by spec-kit and named after the current git branch)

### 9. Update Context

Update `specs/[feature-branch-name]/connector-context.md`:

```markdown
## Status

- [x] Pre-flight complete
- [x] API documentation gathered
- [x] Connector configured
- [ ] Code generated        ← Still unchecked (specify is part of "code generation" milestone)
- [ ] Validation passed
- [ ] Finalized
```

### 10. Output Summary

**For Full Mode:**
```
Specification Complete

Service: [Service Name]
Mode: Full (single PR)

Specification: specs/[feature-branch-name]/spec.md

Contents:
  - Authentication: [type]
  - Actions: [N] actions defined
  - Triggers: [N] triggers defined

→ Next: Run /speckit.plan
```

**For Incremental Mode:**
```
Specification Complete

Service: [Service Name]
Mode: Incremental
Current Sub-Scope: [Sub-Scope N: Name]
Sub-Branch: [feature-branch-name]-[suffix]

Specification: specs/[sub-branch-name]/spec.md

This sub-scope includes:
  - [List in-scope items]

Deferred to later sub-scopes:
  - [List out-of-scope items]

→ Next: Run /speckit.plan
```

---

## Key Rules

1. **Always read context.md first** - contains critical info (ticket, branch, service name)
2. **Check breakdown.md** before creating branches
3. **Create sub-branch only in incremental mode** with `[current]` sub-scope
4. **Require instructions file** - don't proceed without it
5. **Scope specification correctly** - only include in-scope items for incremental mode
6. **Reference guides:**
   - `~/.claude/skills/workflows-connectors-generate/policies/constitution.md`
   - `~/.claude/skills/workflows-connectors-generate/policies/code-style.md`
   - `~/.claude/skills/workflows-connectors-generate/policies/authentication.md`
