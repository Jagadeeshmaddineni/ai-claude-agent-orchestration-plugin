---
description: Validate generated connector code. Runs build, lint, and pattern compliance checks. Outputs validation results and suggests next steps.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The input may contain additional context.

## Prerequisites

**Read the connector context and artifacts:**

1. Check `specs/*/connector-context.md` for the most recently modified folder
2. Read it to get the service name, internal name, and feature branch
3. Read `specs/[feature-branch-name]/api-reference.md` (for C0 validation)
4. Read `specs/[feature-branch-name]/scope.md` (for selected actions/triggers)
5. Verify code generation step is complete

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

## Outline

This command validates the generated connector code and produces a validation report.

### 1. Verify Connector Exists

Using the internal name from context:

```
🔍 Verifying connector...

Connector: [service-name]
Location: packages/connectors/[service-name]/
```

Verify connector exists at: `packages/connectors/[service-name]/`

If not found, instruct user to complete the spec-kit workflow first (`/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`).

### 2. Run Build Check

```
🔨 Validating Generated Code...

[1/5] Running TypeScript build check...
  Command: nx build connectors-[connector-name]

  ⏳ Building... (this may take a moment)
```

**If build succeeds:**
```
  ✅ Build successful! No type errors found.
```

**If build fails:**
```
  ❌ Build failed with [N] errors

Errors found:
1. [file:line] - [error description]
2. [file:line] - [error description]
...
```

Record all errors for validation report.

### 3. Run Lint Check

```
[2/5] Running ESLint...
  Command: nx lint connectors-[connector-name]
```

**If lint succeeds:**
```
  ✅ Lint passed! No issues found.
```

**If lint fails:**
```
  ⚠️ Lint found [N] issues

Issues:
1. [file:line] - [rule] - [message]
2. [file:line] - [rule] - [message]
...

[If auto-fixable]
  [X] issues are auto-fixable with: nx lint connectors-[connector-name] --fix
```

Record all lint issues for validation report.

### 4. Pattern Compliance Check

```
[3/5] Checking C0-C9 pattern compliance...

Reference: ~/.claude/skills/workflows-connectors-generate/policies/constitution.md
Reference: specs/[feature-branch-name]/api-reference.md (for C0)
```

**Check each pattern:**

| Pattern | Description | Check |
|---------|-------------|-------|
| C0 | API Reference Compliance | Endpoints, auth, webhooks match api-reference artifact |
| C1 | HTTP Client Abstraction | `lib/common/client.ts` exists with makeRequest functions |
| C2 | Constants Extraction | `lib/common/constants.ts` exists with API paths |
| C3 | Validation Schemas | `lib/common/validators.ts` exists with Zod schemas |
| C4 | Index Re-exports | Each directory has `index.ts` exporting all modules |
| C5 | Action Structure | Actions follow standard pattern with run function |
| C6 | Trigger Structure | Triggers follow webhook/polling patterns |
| C7 | Auth Configuration | `auth.ts` follows authentication patterns |
| C8 | Error Messages | Errors include context (endpoint, method, status) |
| C9 | Type Safety | No `any` types (except where documented) |

**C0 Validation Details:**

Compare generated code against `specs/[feature-branch-name]/api-reference.md`:

| Check | Source | Generated |
|-------|--------|-----------|
| Base URL | API Reference → Base URL | constants.ts |
| Auth Type | API Reference → Authentication | auth.ts |
| Endpoints | API Reference → API Landscape | actions/*.ts |
| Webhook Events | API Reference → Webhooks | triggers/*.ts |

**Output:**
```
Pattern Compliance:
  ✅ C0: API Reference Compliance - Endpoints and auth match artifact
  ✅ C1: HTTP Client Abstraction - client.ts found with standard helpers
  ✅ C2: Constants Extraction - constants.ts found
  ⚠️ C3: Validation Schemas - validators.ts missing
  ✅ C4: Index Re-exports - All directories have index.ts
  ✅ C5: Action Structure - [N] actions follow standard pattern
  ✅ C6: Trigger Structure - [N] triggers follow pattern
  ✅ C7: Auth Configuration - [AuthType] configured correctly
  ⚠️ C8: Error Messages - 2 errors missing context
  ✅ C9: Type Safety - No untyped 'any' found

Score: 8/10 patterns passing
```

### 5. Additional Checks

```
[4/5] Running additional checks...

Reference: ~/.claude/skills/workflows-connectors-generate/policies/code-style.md
Reference: ~/.claude/skills/workflows-connectors-generate/guides/TRIGGER_FACTORY_PATTERN.md
Reference: ~/.claude/skills/workflows-connectors-generate/guides/CODE_REUSE_PATTERNS.md
Reference: ~/.claude/skills/workflows-connectors-generate/guides/AUTHENTICATION_PATTERNS.md
```

**Check each rule:**

| Check | Source | Description |
|-------|--------|-------------|
| A1 | code-style.md §7 | Authors must be `['SS&C Blue Prism']` |
| A2 | code-style.md §2 | Action files follow `verb-noun.ts` naming |
| A3 | AUTHENTICATION_PATTERNS.md | CLIENT_CREDENTIALS has `authUrl: ''` and `scope: []` |
| A4 | TRIGGER_FACTORY_PATTERN.md | 2+ polling triggers should use factory pattern |
| A5 | CODE_REUSE_PATTERNS.md | Actions use client.ts instead of direct httpClient |

**A1: Authors Check**

Read `src/index.ts` and verify the `authors` field:
```
✅ A1: Authors - Correctly set to ['SS&C Blue Prism']
❌ A1: Authors - Found ['activepieces'], expected ['SS&C Blue Prism']
```

**A2: Action File Naming**

Check files in `src/lib/actions/` match `verb-noun.ts` pattern:
- Common verbs: create, update, delete, get, list, send, fetch, add, remove
```
✅ A2: File Naming - All action files follow verb-noun.ts pattern
⚠️ A2: File Naming - Non-standard names found:
   - rowCreate.ts → should be create-row.ts
   - getUser.ts → should be get-user.ts
```

**A3: CLIENT_CREDENTIALS Config (If Applicable)**

Skip if not OAuth2 CLIENT_CREDENTIALS. If CLIENT_CREDENTIALS, check `auth.ts`:
```
✅ A3: CLIENT_CREDENTIALS - authUrl is empty string, scope is empty array
❌ A3: CLIENT_CREDENTIALS - authUrl should be '' but found 'https://...'
❌ A3: CLIENT_CREDENTIALS - scope should be [] but found ['read', 'write']
⏭️ A3: Skipped - Not using CLIENT_CREDENTIALS grant type
```

**A4: Trigger Factory Pattern**

Count polling triggers and check for factory:
```
✅ A4: Trigger Factory - Using polling-trigger-helper.ts with 3 polling triggers
✅ A4: Trigger Factory - Only 1 polling trigger, factory not needed
⚠️ A4: Trigger Factory - Found 3 polling triggers but no polling-trigger-helper.ts
   Recommendation: Extract common polling logic to lib/triggers/polling-trigger-helper.ts
```

**A5: Client Abstraction Usage**

Check that actions import from client.ts rather than using httpClient directly:
```
✅ A5: Client Usage - All actions use client.ts helpers
⚠️ A5: Client Usage - Direct httpClient.sendRequest found in:
   - create-record.ts:25
   - update-record.ts:30
   Recommendation: Use makePostRequest/makePatchRequest from client.ts
```

**Output:**
```
Additional Checks:
  ✅ A1: Authors - Correctly set to ['SS&C Blue Prism']
  ✅ A2: File Naming - All action files follow verb-noun.ts pattern
  ⏭️ A3: CLIENT_CREDENTIALS - Skipped (not applicable)
  ⚠️ A4: Trigger Factory - 3 polling triggers without factory
  ✅ A5: Client Usage - All actions use client.ts helpers

Score: 4/5 checks passing (1 warning)
```

### 6. OAuth2 Scope Check (If Applicable)

```
[5/5] OAuth2 Scope Verification...
```

**Skip if not OAuth2:**
```
  ⏭️ Skipped - Connector uses [API Key / Custom Auth]
```

**If OAuth2:**
```
Analyzing API endpoints called across all actions/triggers...

Actions implemented:
  - create-row: POST /sheets/{id}/rows
  - update-row: PATCH /sheets/{id}/rows/{rowId}

Triggers implemented:
  - new-row: GET /sheets/{id}/rows (polling)

Current scopes in index.ts:
  scopes: ['spreadsheets.write', 'spreadsheets.read']

[If properly scoped]
✅ Scopes are minimized - no unnecessary permissions

[If over-scoped]
⚠️ Scope Issue: 'spreadsheets.admin' requested but not needed
   Recommendation: Remove unused scope
```

### 7. Generate Validation Report

Create validation results file at: `specs/[feature-branch-name]/validation-results.md`

**Structure:**
```markdown
# Validation Results: [Connector Name]

**Generated:** [timestamp]
**Connector:** packages/connectors/[connector-name]

## Summary

| Check | Status | Details |
|-------|--------|---------|
| Build | ✅ Pass / ❌ Fail | [N] errors |
| Lint | ✅ Pass / ⚠️ Warnings / ❌ Fail | [N] issues |
| Patterns | [X]/10 | C0-C9 compliance |
| Additional | [X]/5 | A1-A5 checks |
| OAuth2 Scopes | ✅ / ⚠️ / N/A | [details] |

**Overall:** ✅ Ready / ⚠️ Needs Refactoring

## Build Results

[If errors]
### Errors ([N])

1. **[file]:[line]**
   ```
   [error message]
   ```
   Suggested fix: [suggestion]

[If no errors]
No build errors found.

## Lint Results

[If issues]
### Issues ([N])

1. **[file]:[line]** - [rule]
   [message]
   Auto-fixable: Yes/No

[If no issues]
No lint issues found.

## Pattern Compliance

### Passing ([X])
- C0: API Reference Compliance
- C1: HTTP Client Abstraction
- C2: Constants Extraction
...

### Failing ([Y])
- C0: API Reference Compliance
  Issue: Endpoint mismatch - action uses /api/v1/records but api-reference says /api/v2/records
  Fix: Update endpoint in create-record.ts to match api-reference
- C3: Validation Schemas
  Issue: validators.ts not found
  Fix: Create lib/common/validators.ts with Zod schemas
...

## Additional Checks

### Passing ([X])
- A1: Authors - Correctly set to ['SS&C Blue Prism']
- A2: File Naming - All action files follow verb-noun.ts pattern
...

### Failing/Warnings ([Y])
- A4: Trigger Factory
  Issue: Found 3 polling triggers but no polling-trigger-helper.ts
  Fix: Extract common polling logic to lib/triggers/polling-trigger-helper.ts
- A5: Client Usage
  Issue: Direct httpClient.sendRequest found in create-record.ts:25
  Fix: Use makePostRequest from client.ts
...

## OAuth2 Scope Analysis

[If applicable]
Current scopes: [list]
Required scopes: [list]
Recommendation: [if any]

## Recommendations

[List specific actions needed to fix issues]

1. Create validators.ts file with Zod schemas
2. Add error context to httpClient calls in [files]
3. Run lint --fix to resolve auto-fixable issues
```

### 8. Report and Next Step

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Validation Complete!

Build:      [✅ Pass / ❌ [N] errors]
Lint:       [✅ Pass / ⚠️ [N] warnings / ❌ [N] errors]
Patterns:   [X]/10 passing (C0-C9)
Additional: [X]/5 passing (A1-A5)
OAuth2:     [✅ / ⚠️ / N/A]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Validation report: specs/[feature-branch-name]/validation-results.md
```

**If all checks pass:**
```
✅ All validations passed!

→ Next: Run /speckit.complete
```

**If issues found:**
```
⚠️ Issues found that need attention.

→ Next: Run /speckit.refactor to automatically fix issues

Once satisfied with fixes, run /speckit.complete
```

---

## Key Rules

- Always run all 5 checks (build, lint, patterns, additional, OAuth2)
- **C0 check requires api-reference artifact** - verify code matches `specs/[feature-branch-name]/api-reference.md`
- Generate validation report even if checks fail
- Save report to `specs/[feature-branch-name]/validation-results.md`
- Suggest `/speckit.complete` only if all checks pass
- Suggest `/speckit.refactor` if issues found
- Reference artifacts:
  - `specs/[feature-branch-name]/api-reference.md` (source of truth for API details)
  - `specs/[feature-branch-name]/scope.md` (selected actions/triggers)
- Reference guides:
  - `~/.claude/skills/workflows-connectors-generate/guides/VALIDATION_COMMANDS.md`
  - `~/.claude/skills/workflows-connectors-generate/guides/ERROR_RECOVERY.md`
  - `~/.claude/skills/workflows-connectors-generate/policies/constitution.md` (C0-C9)
  - `~/.claude/skills/workflows-connectors-generate/policies/code-style.md` (A1, A2)
  - `~/.claude/skills/workflows-connectors-generate/policies/authentication.md`
  - `~/.claude/skills/workflows-connectors-generate/guides/AUTHENTICATION_PATTERNS.md` (A3)
  - `~/.claude/skills/workflows-connectors-generate/guides/TRIGGER_FACTORY_PATTERN.md` (A4)
  - `~/.claude/skills/workflows-connectors-generate/guides/CODE_REUSE_PATTERNS.md` (A5)
