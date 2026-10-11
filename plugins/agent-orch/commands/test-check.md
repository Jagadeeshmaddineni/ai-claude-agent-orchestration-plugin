# Quick Test Check

Run tests and report coverage/results without launching a full validator agent.

## What This Does

This lightweight command runs your test suite and provides a concise report:
- Test pass/fail counts
- Coverage metrics (line, branch)
- Failed test details
- Coverage gaps (if below target)
- Test execution time

**This is NOT a replacement for the full validator agent**. Use this for:
- Quick pre-commit test verification
- CI/CD pipeline checks
- Verifying tests pass before pushing
- Quick coverage check

## When to Use

- Before committing code
- After making changes, verify tests still pass
- Check coverage meets targets
- Quick sanity check before PR
- Verify test suite health

## How It Works

1. Detects test framework (Jest, Vitest, pytest, etc.)
2. Runs test suite with coverage enabled
3. Parses test results and coverage report
4. Compares against targets from CLAUDE.md/PLAN.md
5. Generates concise report

## Output Format

```markdown
# Test Check Report

**Test Framework**: [Jest/Vitest/pytest/etc.]
**Run Time**: [execution time]
**Timestamp**: [when tests ran]

## Test Results
| Metric | Value | Status |
|--------|-------|--------|
| Tests Run | [N] | |
| Passed | [N] | ✅ |
| Failed | [N] | ❌ / ✅ |
| Skipped | [N] | |

## Coverage
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Lines | [90%] | [92%] | ✅ |
| Branches | [90%] | [88%] | ⚠️ |
| Functions | [90%] | [95%] | ✅ |
| Statements | [90%] | [93%] | ✅ |

## Failed Tests
[If any tests failed, list them with file:line and error message]

## Coverage Gaps
[If coverage is below target, list files/lines with low coverage]

## Summary
- **Overall**: PASS / FAIL
- **Ready to commit**: YES / NO (if coverage/tests meet targets)
```

## Example Usage

```bash
# Run all tests
/agent-orch:test-check

# Run specific test file
/agent-orch:test-check --file="src/auth.test.ts"

# Run tests matching pattern
/agent-orch:test-check --pattern="auth"

# Check coverage only (don't run tests)
/agent-orch:test-check --coverage-only
```

## Coverage Targets

Reads targets from CLAUDE.md or PLAN.md:
- `COVERAGE_TARGET` (default: 100%)
- `BRANCH_COVERAGE_TARGET` (default: 100%)
- `PASS_RATE_TARGET` (default: 100%)

If no targets specified, uses 100% for all metrics.

## Comparison: Quick Check vs Full Validator

| Feature | Test Check | Full Validator |
|---------|-----------|----------------|
| **Time** | 1-5 minutes | 10-30 minutes |
| **Scope** | Run existing tests | Write new tests + run all |
| **Coverage** | Report gaps | Fill gaps until target met |
| **Agents** | No agents (command) | Validator agent |
| **Use Case** | Verify tests pass | Comprehensive test development |
| **Output** | Pass/fail report | Test code + coverage + report |

## No Agent Overhead

This is a **command**, not a skill:
- No agent spawning
- No test writing (runs existing tests only)
- Fast execution
- Concise report

For comprehensive test development and gap-filling, use `/agent-orch:build` with validator agent.

## CI/CD Integration

This command is perfect for CI/CD pipelines:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: claude code "/agent-orch:test-check" --non-interactive

- name: Check result
  run: |
    if grep -q "Ready to commit: NO" test-report.md; then
      exit 1
    fi
```
