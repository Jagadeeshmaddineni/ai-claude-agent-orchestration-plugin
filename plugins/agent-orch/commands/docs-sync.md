# Documentation Sync

Synchronize documentation with code changes without launching a full scribe agent.

## What This Does

This lightweight command identifies documentation that needs updating after code changes:
- API signature changes → update API docs
- New endpoints/functions → add to docs
- Removed features → mark deprecated or remove
- Configuration changes → update config docs
- Breaking changes → update migration guides

**This is NOT a replacement for comprehensive documentation work**. Use this for:
- Quick doc sync after code changes
- Identify stale documentation
- Pre-commit doc validation
- CI/CD documentation gate

## When to Use

- After changing API signatures
- After adding/removing endpoints
- After config or schema changes
- Before committing refactored code
- Quick check for doc drift

## How It Works

1. Detects code changes (git diff or specified files)
2. Identifies documented APIs/functions/configs
3. Cross-references with existing docs
4. Detects mismatches:
   - Function signature changed but docs haven't
   - New endpoint added but not documented
   - Deprecated function still in docs
   - Example code outdated
5. Generates sync report with specific files to update

## Output Format

```markdown
# Documentation Sync Report

**Code Changes Detected**: [N files]
**Documentation Files**: [N files]
**Run Time**: [timestamp]

## Outdated Documentation (Update Required)

### API Documentation
- **File**: docs/api/users.md
  **Issue**: Function signature changed
  **Code**: `createUser(name, email, options?)` (added optional `options` param)
  **Docs**: Still shows `createUser(name, email)`
  **Fix**: Update docs/api/users.md lines 45-52

- **File**: docs/api/auth.md
  **Issue**: Endpoint removed
  **Code**: `DELETE /api/v1/sessions/:id` no longer exists (removed in auth.ts)
  **Docs**: Still documented at docs/api/auth.md:78
  **Fix**: Remove section or mark as deprecated

### Missing Documentation
- **Code**: New endpoint `POST /api/v1/users/:id/reset-password`
  **Location**: src/api/users.ts:156
  **Fix**: Add documentation to docs/api/users.md

- **Code**: New config variable `RATE_LIMIT_WINDOW`
  **Location**: src/config/index.ts:23
  **Fix**: Add to docs/configuration.md

### Example Code Outdated
- **File**: docs/examples/authentication.md
  **Issue**: Example uses deprecated method
  **Code**: Example calls `auth.login()` (deprecated in v2.0)
  **Current**: Should use `auth.authenticate()`
  **Fix**: Update example code

### README Updates Needed
- **File**: README.md
  **Issue**: Installation instructions reference old Node version
  **Code**: package.json now requires Node 20+
  **Docs**: README still says Node 18+
  **Fix**: Update README.md line 12

## Up-to-Date Documentation
- ✅ docs/getting-started.md (no changes needed)
- ✅ docs/deployment.md (no changes needed)
- ✅ docs/troubleshooting.md (no changes needed)

## Summary
- **Total Documentation Files**: 15
- **Need Updates**: 4
- **Missing Docs**: 2
- **Outdated Examples**: 1
- **Status**: OUT OF SYNC
- **Estimated Fix Time**: 20-30 minutes
```

## Example Usage

```bash
# Sync docs after code changes
/agent-orch:docs-sync

# Check specific doc file
/agent-orch:docs-sync --doc="docs/api/users.md"

# Check if specific code changes need doc updates
/agent-orch:docs-sync --code-files="src/api/**/*.ts"

# Validation only (exit code 1 if out of sync)
/agent-orch:docs-sync --validate-only
```

## What Gets Checked

### API Documentation
- [ ] Function signatures match code
- [ ] All public endpoints documented
- [ ] Deprecated endpoints marked
- [ ] Request/response examples accurate
- [ ] Error codes documented

### Configuration Documentation
- [ ] All config variables documented
- [ ] Default values correct
- [ ] Environment variables listed
- [ ] Required vs optional marked

### Code Examples
- [ ] Example code runs without errors
- [ ] Imports are correct
- [ ] API calls use current signatures
- [ ] No deprecated methods used

### README & Guides
- [ ] Prerequisites accurate (Node version, etc.)
- [ ] Installation steps current
- [ ] Quick start works
- [ ] Links not broken

## Detection Methods

### Signature Changes
```typescript
// Code changed from:
function createUser(name: string, email: string)

// To:
function createUser(name: string, email: string, options?: UserOptions)

// Tool detects signature mismatch with docs
```

### New Endpoints
```typescript
// New endpoint added:
router.post('/api/v1/users/:id/reset-password', resetPassword);

// Tool scans docs for /reset-password documentation
// If not found, flags as missing documentation
```

### Deprecated Functions
```typescript
// Code marked deprecated:
/** @deprecated Use authenticate() instead */
function login() { }

// Tool checks if docs still reference login()
```

## CI/CD Integration

```yaml
# .github/workflows/docs.yml
- name: Check doc sync
  run: claude code "/agent-orch:docs-sync --validate-only" --non-interactive

- name: Fail if docs outdated
  run: exit $?

- name: Auto-comment on PR
  if: failure()
  run: |
    claude code "/agent-orch:docs-sync" > doc-sync-report.md
    gh pr comment ${{ github.event.pull_request.number }} --body-file doc-sync-report.md
```

## Comparison: Docs Sync vs Scribe/Content Agents

| Feature | Docs Sync | Scribe Agent | Content Specialist |
|---------|-----------|--------------|-------------------|
| **Time** | 1-2 minutes | 10-20 minutes | 15-30 minutes |
| **Scope** | Detect drift | Update project docs | Write user guides |
| **Output** | Sync report | Updated docs | New documentation |
| **Agents** | No agents (command) | Scribe agent | Content agent |
| **Use Case** | Validate sync | Project documentation | User-facing content |
| **Fixes Code** | No | No | No |
| **Writes Docs** | No | Yes | Yes |

## Auto-Fix Mode (Experimental)

```bash
# Attempt to auto-update docs based on code changes
/agent-orch:docs-sync --auto-fix

# Review changes before committing
git diff docs/
```

This will:
- Update function signatures in docs
- Add missing endpoint documentation (basic template)
- Remove deprecated endpoint docs
- Update example code imports

**Note**: Auto-fix is conservative and may not handle complex cases. Always review changes.

## No Agent Overhead

This is a **command**, not a skill:
- No agent spawning
- Fast detection (1-2 minutes)
- Identifies drift only
- Optional auto-fix

For comprehensive documentation writing, use `/agent-orch:build` with scribe or content-specialist agents.
