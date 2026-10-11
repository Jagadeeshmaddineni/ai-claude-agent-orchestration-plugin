---
description: Complete current sub-scope and advance to next, or finalize connector if all sub-scopes done.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The input may contain additional context.

## Prerequisites

**Read the connector context first:**

1. Check `specs/*/connector-context.md` for the most recently modified folder
2. Read it to get the service name, internal name, and feature branch
3. Verify validation step is complete

```
🔍 Loading connector context...

[If specs/[feature-branch-name]/connector-context.md exists]
Service: [Service Name]
Internal Name: [service-name]
Feature Branch: [feature-branch-name]
Artifacts: specs/[feature-branch-name]/

[If not exists]
❌ No connector context found.
Please run /workflows-connectors-generate first to set up the connector.
```

**Additional requirements:**
1. Connector code must be generated (via speckit workflow)
2. All validations must pass (`/speckit.validate` shows no errors)

---

## Mode Detection

**Check for breakdown.md:**

Read `specs/[feature-branch-name]/breakdown.md` if it exists.

### If breakdown.md exists:

Parse sub-scopes and their statuses:
- Count sub-scopes marked `[completed]`
- Find sub-scope marked `[current]`
- Count sub-scopes marked `[pending]`

**If there are `[pending]` sub-scopes remaining:**
→ Execute **Sub-Scope Completion Mode** (advance to next sub-scope)

**If NO `[pending]` sub-scopes remaining (all done or current is last):**
→ Execute **Final Completion Mode** (finalize connector)

### If breakdown.md does NOT exist:
→ Execute **Final Completion Mode** (finalize connector)

---

## Sub-Scope Completion Mode

When there are more sub-scopes to implement after the current one.

### 1. Validate Current Sub-Scope

```
🔍 Validating current sub-scope...

Current: Sub-Scope [N]: [Name]
```

Run quick validation:
- `nx build connectors-[connector-name]` must pass
- `nx lint connectors-[connector-name]` must pass (warnings OK)

**If validation fails:**
```
❌ Validation failed - cannot complete sub-scope

Please run /speckit.validate to see details, then /speckit.refactor to fix.
```
**Stop here.**

### 2. Confirm Sub-Scope Completion

```
✅ Sub-Scope [N]: [Name] validated successfully

This sub-scope is ready to be marked complete.

Recommended next steps before advancing:
1. Create PR for this sub-scope
2. Get code review
3. Address feedback
4. Merge PR

Advance to next sub-scope now?
```

Use AskUserQuestion:
```
Question: "Mark this sub-scope complete and advance to next?"
Header: "Advance"

Options:
1. Label: "Yes, advance to next sub-scope"
   Description: "Mark current complete, continue to next"

2. Label: "No, stay on current"
   Description: "Keep working on this sub-scope"
```

**If user chooses to stay:** Stop here.

### 3. Update Breakdown File

Update `specs/[feature-branch-name]/breakdown.md`:

1. Find sub-scope with `[current]` → change to `[completed]`
2. Find first sub-scope with `[pending]` → change to `[current]`

### 4. Reset Context File for Next Sub-Scope

Update `specs/[feature-branch-name]/connector-context.md` status to return flow to specify:

```markdown
## Status

- [x] Pre-flight complete
- [x] API documentation gathered
- [x] Connector configured  ← Keep checked
- [ ] Code generated        ← RESET TO UNCHECKED
- [ ] Validation passed     ← RESET TO UNCHECKED
- [ ] Finalized
```

### 5. Run Cleanup

Run the cleanup script to restore commands, constitution, and CLAUDE.md to their committed state:

```bash
bash .claude/scripts/cleanup-commands.sh
```

This ensures the PR only contains connector code changes, not connector-generator artifacts.

### 6. Output Sub-Scope Advancement

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Sub-Scope Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Completed: Sub-Scope [N]: [Previous Name]
Advanced to: Sub-Scope [N+1]: [Next Name]

📦 Progress: [completed]/[total] sub-scopes

┌─────────────────────────────────────────────────────────┐
│ 🟢 Sub-Scope 1: MVP                          [completed]│
│ 🟢 Sub-Scope 2: Actions                      [completed]│
│ 🟡 Sub-Scope 3: Triggers                       [current]│
└─────────────────────────────────────────────────────────┘

Next sub-scope includes:
[List items from the new current sub-scope]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Next Steps:
1. Commit your connector changes
2. Create PR to feature branch
3. Get code review and approval
4. Merge PR

When ready for next sub-scope, re-run:
→ /workflows-connectors-generate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Stop here** - do not proceed to Final Completion Mode.

---

## Final Completion Mode

When all sub-scopes are done (or no breakdown exists). This is the original complete behavior.

## Outline

This command finalizes the connector generation process, performs final checks, and prepares for PR creation.

### 1. Verify Connector

Using the internal name from context:

```
🏁 Finalizing connector...

Service: [Service Name]
Connector: [service-name]
```

Verify connector exists at: `packages/connectors/[service-name]/`

### 2. Final Validation Check

```
[1/5] Running final validation...

Build:  ⏳ Checking...
```

Run: `nx build connectors-[connector-name]`

**If build fails:**
```
❌ Build failed - cannot complete

Errors found: [N]

Please run /speckit.validate to see details, then /speckit.refactor to fix.
```
**Stop here if build fails.**

**If build passes:**
```
Build:  ✅ Pass
Lint:   ⏳ Checking...
```

Run: `nx lint connectors-[connector-name]`

**If lint fails with errors:**
```
❌ Lint failed - cannot complete

Errors found: [N]

Please run /speckit.refactor to fix lint issues.
```
**Stop here if lint has errors.**

**If lint passes (warnings OK):**
```
Lint:   ✅ Pass [⚠️ [N] warnings - acceptable]
```

### 3. Verify File Structure

```
[2/5] Verifying file structure...

packages/connectors/[connector-name]/
├── src/
│   ├── index.ts         ✅
│   ├── auth.ts          ✅
│   └── lib/
│       ├── actions/
│       │   ├── [action files]  ✅ [N] actions
│       │   └── index.ts        ✅
│       ├── triggers/
│       │   ├── [trigger files] ✅ [N] triggers
│       │   └── index.ts        ✅
│       └── common/
│           ├── constants.ts    ✅
│           └── index.ts        ✅
├── package.json         ✅
├── project.json         ✅
├── tsconfig.json        ✅
├── tsconfig.lib.json    ✅
├── .eslintrc.json       ✅
└── README.md            ✅

File structure: ✅ Complete
```

**If files missing:**
```
⚠️ Missing files detected:
- [file1]
- [file2]

These files are required. Please check the generation output.
```

### 4. Review Generated Code Summary

```
[3/5] Generating code summary...

📊 Connector Statistics:

Service: [Service Name] ([service-name])
Category: [PieceCategory]

Authentication:
  Type: [OAuth2 / SecretText / CustomAuth]
  [If OAuth2] Grant: [CLIENT_CREDENTIALS / AUTHORIZATION_CODE]
  Validation: [Yes / No]

Actions ([N]):
  - [action-1]: [brief description]
  - [action-2]: [brief description]
  ...

Triggers ([N]):
  - [trigger-1]: [WEBHOOK/POLLING] - [brief description]
  - [trigger-2]: [WEBHOOK/POLLING] - [brief description]
  ...

Code Quality:
  - Lines of code: ~[estimate]
  - Pattern compliance: 9/9
  - Type safety: ✅ No 'any' types
```

### 5. Clean Up Artifacts

```
[4/5] Cleaning up generation artifacts...
```

**Files to archive (move to `specs/[feature-branch-name]/archive/`):**
```
Moving to archive/:
  ✓ api-reference.md
  ✓ scope.md
  ✓ validation-results.md
  ✓ refactor-report.md (if exists)
```

**Keep the specification file reference in a summary:**
```
Creating: specs/[feature-branch-name]/summary.md
```

### 5b. Clean Up Commands and Restore Constitution

```
[5/5] Cleaning up connector-generator artifacts...
```

Run the cleanup script to remove installed commands and restore the original constitution:

```bash
bash .claude/scripts/cleanup-commands.sh
```

This script:
1. Restores `.claude/commands/` to committed state using `git restore`
2. Restores `constitution.md` to committed state (or removes if new)

**Output:**
```
Commands restored/removed:
  ✓ /speckit.whereami
  ✓ /speckit.docs
  ✓ /speckit.scope
  ✓ /speckit.specify
  ✓ /speckit.implement
  ✓ /speckit.validate
  ✓ /speckit.refactor
  ✓ /speckit.complete

Constitution:
  ✅ Restored to committed state (or removed if new)
```

### 6. Generate Completion Report

Create final summary at: `specs/[feature-branch-name]/summary.md`

**Structure:**
```markdown
# Connector Summary: [Service Name]

**Completed:** [timestamp]
**Location:** packages/connectors/[connector-name]

## Overview

| Property | Value |
|----------|-------|
| Service | [Service Name] |
| Internal Name | [connector-name] |
| Category | [PieceCategory] |
| Auth Type | [OAuth2/SecretText/CustomAuth] |

## Components

### Actions ([N])

| Action | Description | Endpoint |
|--------|-------------|----------|
| [action-name] | [description] | [HTTP method + endpoint] |
| ... | ... | ... |

### Triggers ([N])

| Trigger | Type | Description |
|---------|------|-------------|
| [trigger-name] | [WEBHOOK/POLLING] | [description] |
| ... | ... | ... |

## Files Generated

```
packages/connectors/[connector-name]/
├── src/
│   ├── index.ts
│   ├── auth.ts
│   └── lib/
│       ├── actions/
│       │   ├── [list files]
│       │   └── index.ts
│       ├── triggers/
│       │   ├── [list files]
│       │   └── index.ts
│       └── common/
│           ├── constants.ts
│           └── index.ts
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── .eslintrc.json
└── README.md
```

## Validation Status

| Check | Status |
|-------|--------|
| Build | ✅ Pass |
| Lint | ✅ Pass |
| Patterns | 9/9 |
| OAuth2 Scopes | ✅ / N/A |

## Next Steps

1. Review generated code manually
2. Test connector locally if possible
3. Create PR for review

## Generation Artifacts

Archived in: `specs/[feature-branch-name]/archive/`
- api-reference.md
- scope.md
- validation-results.md
```

### 7. Final Report and Next Steps

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Connector Generation Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Connector: [Service Name]
📁 Location:  packages/connectors/[connector-name]/

Components:
  - Authentication: [Type]
  - Actions: [N]
  - Triggers: [N]

Validation:
  - Build: ✅
  - Lint: ✅
  - Patterns: 9/9

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Summary: specs/[feature-branch-name]/summary.md

📋 Next Steps:

1. Review the generated code:
   - Check auth.ts configuration
   - Verify action/trigger logic
   - Review error handling

2. Test locally (if applicable):
   - Run unit tests if available
   - Manual API testing

3. Create Pull Request:
   - Branch: [current-branch]
   - Target: main
   - Include summary from specs/[feature-branch-name]/summary.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Thank you for using the connector generator!

For issues or feedback, contact the platform team.
```

---

## Post-Completion Checklist

Display this checklist for the user:

```
📋 Pre-PR Checklist:

[ ] Generated code reviewed for correctness
[ ] Auth configuration matches API requirements
[ ] Actions have appropriate error handling
[ ] Triggers use correct webhook/polling strategy
[ ] Property descriptions are user-friendly
[ ] README.md has accurate setup instructions
[ ] No hardcoded credentials or test data
[ ] Code follows company style guidelines
```

---

## Key Rules

- Only complete if build AND lint pass
- Archive all generation artifacts
- **Run cleanup script** to restore constitution and remove installed commands: `bash .claude/scripts/cleanup-commands.sh`
- Create comprehensive summary document
- Provide clear next steps for PR creation
- Include pre-PR checklist for manual review
- Reference: Constitution patterns were in `.specify/memory/constitution.md` (now restored to original)
