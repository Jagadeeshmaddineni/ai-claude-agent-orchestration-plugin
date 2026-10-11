# Enforcement Rules Check

Run enforcement rules without launching the full enforcement pipeline.

## What This Does

This lightweight command runs existing enforcement rules from `plugins/agent-orch/rules/` against your codebase and reports violations:
- Pattern-based rules (regex, AST checks)
- File naming conventions
- Directory structure requirements
- Required file presence
- Prohibited patterns
- Custom project-specific rules

**This is NOT a replacement for `/agent-orch:enforce` skill**. Use this for:
- Quick pre-commit checks
- Verify rules pass before PR
- CI/CD enforcement validation
- Spot-check after refactoring

## When to Use

- Before committing code
- After making structural changes
- Quick validation of conventions
- CI/CD gate before merge
- Verify no prohibited patterns introduced

## How It Works

1. Reads enforcement rules from `plugins/agent-orch/rules/*.md`
2. Applies rules to changed files (or all files if specified)
3. Reports violations with file:line details
4. Exits with error code if violations found (useful for CI/CD)

## Output Format

```markdown
# Enforcement Rules Check Report

**Rules Applied**: [N rules]
**Files Checked**: [N files]
**Run Time**: [timestamp]

## Violations Found

### CRITICAL Violations (Must Fix)
- **Rule**: no-any-types
  **File**: src/utils.ts:45
  **Issue**: TypeScript `any` type used
  **Fix**: Replace with proper type annotation

- **Rule**: no-console-log
  **File**: src/api/users.ts:123
  **Issue**: console.log() in production code
  **Fix**: Use logger.info() instead

### HIGH Priority Violations
- **Rule**: naming-conventions
  **File**: src/UserController.ts
  **Issue**: File should use kebab-case: user-controller.ts
  **Fix**: Rename file

### MEDIUM Priority Violations
- **Rule**: file-header-required
  **File**: src/new-feature.ts
  **Issue**: Missing copyright header
  **Fix**: Add header as specified in CLAUDE.md

## Passed Rules
- ✅ no-sql-string-concatenation (0 violations)
- ✅ required-error-handling (0 violations)
- ✅ test-file-naming (0 violations)

## Summary
- **Total Violations**: [N]
- **Critical**: [N]
- **High**: [N]
- **Medium**: [N]
- **Status**: PASS / FAIL
```

## Example Usage

```bash
# Check all changed files
/agent-orch:enforce-check

# Check specific files
/agent-orch:enforce-check --files="src/**/*.ts"

# Check against specific rule set
/agent-orch:enforce-check --rules="typescript,security"

# Strict mode (fail on any violation, including LOW)
/agent-orch:enforce-check --strict
```

## Available Rule Sets

Rules are organized by category in `plugins/agent-orch/rules/`:

- `typescript.md` - TypeScript conventions
- `security.md` - Security rules (SQL injection, XSS, etc.)
- `testing.md` - Test file conventions
- `naming.md` - File and variable naming
- `structure.md` - Directory structure requirements
- `custom.md` - Project-specific rules

## Rule Configuration

Rules can be configured in CLAUDE.md:

```markdown
# Enforcement Rules

ENFORCE_RULES: typescript,security,naming
ENFORCE_LEVEL: HIGH  # Only fail on CRITICAL and HIGH violations
ENFORCE_EXCEPTIONS:
  - src/legacy/**  # Skip enforcement in legacy code
  - src/generated/**  # Skip in generated files
```

## CI/CD Integration

Perfect for CI/CD pipelines:

```yaml
# .github/workflows/enforce.yml
- name: Run enforcement checks
  run: claude code "/agent-orch:enforce-check --strict" --non-interactive

- name: Fail build on violations
  run: exit $?
```

## Comparison: Enforce Check vs Enforce Skill

| Feature | Enforce Check | Enforce Skill |
|---------|--------------|---------------|
| **Time** | < 1 minute | 5-15 minutes |
| **Scope** | Run existing rules | Generate + run rules |
| **Output** | Violation report | Rules + report |
| **Agents** | No agents (command) | Enforcer agent |
| **Use Case** | Validate compliance | Create new rules |
| **Rule Creation** | No | Yes (from patterns) |

## Creating New Rules

This command only RUNS existing rules. To create new enforcement rules from recurring issues, use:

```bash
/agent-orch:enforce "I keep seeing SQL string concatenation, make this a rule"
```

The `/agent-orch:enforce` skill will:
1. Analyze the pattern
2. Generate an enforcement rule
3. Add it to `plugins/agent-orch/rules/`
4. Run it against the codebase
5. Report findings

Then this command can run that rule quickly in the future.

## No Agent Overhead

This is a **command**, not a skill:
- No agent spawning
- No rule generation
- Fast execution (< 1 minute)
- Runs existing rules only

For rule creation and pattern analysis, use `/agent-orch:enforce` skill.
