---
description: Automatically fix issues found during validation. Addresses build errors, lint issues, and pattern compliance problems. Re-run validation after fixes.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The input may contain additional context.

## Prerequisites

**Read the connector context first:**

1. Check if `specs/connector-context.md` exists
2. Read it to get the service name and internal name

```
🔍 Loading connector context...

[If specs/connector-context.md exists]
Service: [Service Name]
Internal Name: [service-name]

[If not exists]
❌ No connector context found.
Please run /workflows-connectors-generate first to set up the connector.
```

**Then read validation results and artifacts:**
- Validation results: `specs/[service-name]-validation-results.md`
- API Reference: `specs/[service-name]-api-reference.md` (for C0 fixes)
- Specification: `specs/[service-name]-specification.md` (for selected actions/triggers)

If validation results not found, instruct user to run `/speckit.validate` first.

## Outline

This command automatically fixes issues found during validation and prepares the connector for completion.

### 1. Load Validation Results

Using the internal name from context:

```
🔧 Loading validation results...

Connector: [service-name]
```

Read validation results from: `specs/[service-name]-validation-results.md`

```
📋 Validation Results Summary:

Build:    [✅ Pass / ❌ [N] errors]
Lint:     [✅ Pass / ⚠️ [N] warnings / ❌ [N] errors]
Patterns: [X]/9 passing
OAuth2:   [✅ / ⚠️ / N/A]

Issues to fix: [total count]
```

**If no issues found:**
```
✅ No issues to fix! Connector is ready.

→ Next: Run /speckit.complete
```

### 2. Fix Lint Issues (Auto-fixable)

```
[1/4] Fixing lint issues...

Running: nx lint connectors-[connector-name] --fix
```

**If auto-fix succeeds:**
```
  ✅ [N] lint issues auto-fixed
```

**If some issues remain:**
```
  ⚠️ [N] issues auto-fixed, [M] require manual attention

Remaining issues:
1. [file:line] - [rule] - [message]
2. [file:line] - [rule] - [message]

These will be addressed in subsequent steps.
```

### 3. Fix Build Errors

```
[2/4] Analyzing build errors...
```

**For each error type, apply auto-fix strategy:**

#### Missing Imports
```
🔧 Fixing: Missing import for '[symbol]'

File: [file-path]
Adding: import { [symbol] } from '[package]';

✅ Fixed
```

#### Type Errors
```
🔧 Fixing: Type error at [file:line]

Error: [error message]
Strategy: [explanation of fix]

[Show code change]

✅ Fixed
```

#### Missing Exports
```
🔧 Fixing: Missing export in [file]

Adding export for: [symbol]

✅ Fixed
```

#### Cannot Auto-fix
```
⚠️ Cannot auto-fix: [error description]

File: [file:line]
Error: [full error message]

Suggested manual fix:
[suggestion based on error type]

Marking for manual review.
```

**After all build fixes:**
```
Build error fixes complete:
  ✅ Auto-fixed: [N]
  ⚠️ Manual review: [M]
```

### 4. Fix Pattern Compliance

```
[3/4] Fixing pattern compliance issues...

Reference: ~/.claude/skills/workflows-connectors-generate/policies/constitution.md
Reference: ~/.claude/skills/workflows-connectors-generate/policies/code-style.md
Reference: specs/[service-name]-api-reference.md (for C0 fixes)
```

**For each failing pattern:**

#### C0: API Reference Compliance
```
🔧 Fixing C0: API Reference Compliance

Issue: Generated code doesn't match api-reference artifact
Source: specs/[service-name]-api-reference.md

Checking:
  - Base URL in constants.ts vs API Reference → Base URL
  - Auth configuration in auth.ts vs API Reference → Authentication
  - Endpoints in actions/*.ts vs API Reference → API Landscape
  - Webhook events in triggers/*.ts vs API Reference → Webhooks

Fixes applied:
  - constants.ts: Updated BASE_URL from '/api/v1' to '/api/v2'
  - auth.ts: Updated token URL to match api-reference
  - create-record.ts: Fixed endpoint path

✅ C0 Fixed - Code now matches api-reference
```

#### C1: HTTP Client Abstraction
```
🔧 Fixing C1: HTTP Client Abstraction

Issue: client.ts missing or incomplete
Fix: Creating/updating lib/common/client.ts

[Generate client.ts with standard helpers]

✅ C1 Fixed
```

#### C2: Constants Extraction
```
🔧 Fixing C2: Constants Extraction

Issue: Inline strings found in API calls
Fix: Extracting to lib/common/constants.ts

Files affected:
- [file1]: Extracted [N] constants
- [file2]: Extracted [M] constants

✅ C2 Fixed
```

#### C3: Validation Schemas
```
🔧 Fixing C3: Validation Schemas

Issue: validators.ts missing
Fix: Creating lib/common/validators.ts with Zod schemas

Schemas created for:
- [schema1]
- [schema2]

✅ C3 Fixed
```

#### C4: Index Re-exports
```
🔧 Fixing C4: Index Re-exports

Issue: Missing index.ts in [directories]
Fix: Creating index.ts files with proper exports

Created:
- lib/actions/index.ts
- lib/triggers/index.ts
- lib/common/index.ts

✅ C4 Fixed
```

#### C5: Action Structure
```
🔧 Fixing C5: Action Structure

Issue: Actions not following standard pattern
Fix: Restructuring action files

Actions updated:
- [action1]: [change description]
- [action2]: [change description]

✅ C5 Fixed
```

#### C6: Trigger Structure
```
🔧 Fixing C6: Trigger Structure

Issue: Triggers not following webhook/polling patterns
Fix: Applying correct trigger patterns

Reference: ~/.claude/skills/workflows-connectors-generate/templates/POLLING_TRIGGER.md
Reference: ~/.claude/skills/workflows-connectors-generate/templates/WEBHOOK_TRIGGER.md

Triggers updated:
- [trigger1]: [change description]
- [trigger2]: [change description]

✅ C6 Fixed
```

#### C7: Auth Configuration
```
🔧 Fixing C7: Auth Configuration

Issue: [specific auth issue]
Fix: Updating auth.ts

Reference: ~/.claude/skills/workflows-connectors-generate/policies/authentication.md

✅ C7 Fixed
```

#### C8: Error Messages
```
🔧 Fixing C8: Error Messages

Issue: Errors missing context
Fix: Adding operation context to error messages

Files updated:
- [file1:line] - Added context: [description]
- [file2:line] - Added context: [description]

✅ C8 Fixed
```

#### C9: Type Safety
```
🔧 Fixing C9: Type Safety

Issue: Untyped 'any' found
Fix: Adding proper type definitions

Types added:
- [file1]: [type description]
- [file2]: [type description]

✅ C9 Fixed
```

### 5. Fix OAuth2 Scope Issues (If Applicable)

```
[4/4] Fixing OAuth2 scope issues...
```

**Skip if not OAuth2:**
```
  ⏭️ Skipped - Connector uses [API Key / Custom Auth]
```

**If over-scoped:**
```
🔧 Fixing OAuth2 scopes

Issue: Unnecessary scopes requested
Current: ['scope1', 'scope2', 'scope3']
Required: ['scope1', 'scope2']

Removing: 'scope3'

Updating index.ts scopes array...

✅ OAuth2 scopes minimized
```

### 6. Re-run Validation

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Refactoring Complete - Running Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running: nx build connectors-[connector-name]
Running: nx lint connectors-[connector-name]
```

### 7. Generate Refactor Report

Update or create report at: `specs/[connector-name]-refactor-report.md`

**Structure:**
```markdown
# Refactor Report: [Connector Name]

**Generated:** [timestamp]
**Connector:** packages/connectors/[connector-name]

## Summary

| Category | Fixed | Remaining |
|----------|-------|-----------|
| Build Errors | [N] | [M] |
| Lint Issues | [N] | [M] |
| Pattern Compliance | [N] | [M] |
| OAuth2 Scopes | [N] | [M] |

## Changes Made

### Build Fixes
- [file]: [description]
- [file]: [description]

### Lint Fixes
- Auto-fixed [N] issues via nx lint --fix

### Pattern Fixes
- C0: [description] (api-reference compliance)
- C1: [description]
- C2: [description]
...

### OAuth2 Fixes
- [description or N/A]

## Remaining Issues

[If any remain]
### Requires Manual Attention
1. **[file:line]**
   Issue: [description]
   Suggested fix: [suggestion]

[If none remain]
No remaining issues - connector is ready!

## Validation Results (Post-Refactor)

| Check | Status |
|-------|--------|
| Build | ✅ Pass / ❌ Fail |
| Lint | ✅ Pass / ⚠️ Warnings |
| Patterns | [X]/10 (C0-C9) |
| OAuth2 | ✅ / N/A |
```

### 8. Report and Next Step

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Refactoring Complete!

Fixed:
  Build errors:  [N]
  Lint issues:   [N]
  Patterns:      [N]
  OAuth2:        [N/A or N]

Remaining:      [M] (manual review needed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Refactor report: specs/[connector-name]-refactor-report.md
```

**If all issues fixed:**
```
✅ All issues resolved!

Post-refactor validation:
  Build:    ✅ Pass
  Lint:     ✅ Pass
  Patterns: 10/10 (C0-C9)

→ Next: Run /speckit.complete
```

**If issues remain:**
```
⚠️ Some issues require manual attention.

Remaining issues: [M]
See refactor report for details.

Options:
1. Fix issues manually, then run /speckit.validate
2. Run /speckit.refactor again after manual fixes
3. Proceed anyway with /speckit.complete (not recommended)

→ Recommended: Fix remaining issues, then /speckit.validate
```

---

## Auto-Fix Strategies

### Build Errors

| Error Type | Detection | Auto-Fix Strategy |
|------------|-----------|-------------------|
| Missing import | `Cannot find name 'X'` | Add import from framework or local module |
| Missing module | `Cannot find module 'X'` | Check if file exists, create if needed |
| Type mismatch | `Type 'X' is not assignable to type 'Y'` | Add type assertion or fix type definition |
| Missing property | `Property 'X' does not exist` | Add property to interface or check spelling |
| Missing export | `Module has no exported member` | Add export to source file |

### Lint Errors

| Rule | Auto-Fix Strategy |
|------|-------------------|
| `@typescript-eslint/no-explicit-any` | Add proper type definition |
| `@typescript-eslint/no-unused-vars` | Remove unused variable or add `_` prefix |
| `prefer-const` | Change `let` to `const` |
| `no-console` | Remove console.log or replace with logger |
| `import/order` | Reorder imports |
| `quotes` | Fix quote style |
| `semi` | Add/remove semicolons |

### Code Style Fixes

Reference: `~/.claude/skills/workflows-connectors-generate/policies/code-style.md`

| Issue | Auto-Fix Strategy |
|-------|-------------------|
| Inline query params | Extract to constants |
| Dot notation params | Convert to destructuring |
| Excessive comments | Remove unnecessary comments |
| Poor field names | Improve displayName clarity |
| Upfront validation | Move validation into functions |

---

## Key Rules

- Always read validation results before attempting fixes
- **C0 fixes require api-reference artifact** - use `specs/[service-name]-api-reference.md` as source of truth
- Apply auto-fixes in order: lint → build → patterns (including C0) → OAuth2
- Re-run validation after all fixes
- Generate refactor report for tracking
- Document any issues that couldn't be auto-fixed
- Suggest `/speckit.complete` only if all issues resolved
- Reference artifacts:
  - `specs/[service-name]-api-reference.md` (source of truth for API details)
  - `specs/[service-name]-specification.md` (selected actions/triggers)
- Reference guides:
  - `~/.claude/skills/workflows-connectors-generate/guides/ERROR_RECOVERY.md`
  - `~/.claude/skills/workflows-connectors-generate/policies/code-style.md`
  - `~/.claude/skills/workflows-connectors-generate/policies/constitution.md`
  - `~/.claude/skills/workflows-connectors-generate/policies/authentication.md`
