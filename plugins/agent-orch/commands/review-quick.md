# Quick Code Review

Perform a single-pass code review without launching the full two-stage review process.

## What This Does

This lightweight command provides a rapid code review focusing on:
- Critical issues (security, data loss, correctness bugs)
- Constitution/CLAUDE.md compliance violations
- Test coverage gaps
- Common anti-patterns
- Quick wins for improvement

**This is NOT a replacement for the full two-stage review** (spec compliance + quality review). Use this for:
- Quick pre-commit checks
- Draft PR feedback
- Sanity checks before detailed review
- Spotting obvious issues fast

## When to Use

- Before committing code
- Quick sanity check on implementation
- Pre-PR self-review
- Identify critical issues before full review
- When you don't need exhaustive review

## How It Works

1. Identifies changed files (git diff or specified files)
2. Reviews code for HIGH-severity issues only:
   - Security vulnerabilities (SQL injection, XSS, etc.)
   - Constitution violations from CLAUDE.md
   - Missing error handling on critical paths
   - Test coverage for changed code
3. Skips exhaustive quality checks (naming, style, refactoring suggestions)
4. Generates quick findings report

## Output Format

```markdown
# Quick Code Review Report

**Files Reviewed**: [N files]
**Review Time**: [timestamp]

## Critical Issues (Fix Immediately)
- [File:line] - [Issue description]
- [File:line] - [Issue description]

## High-Priority Issues (Address Before Merge)
- [File:line] - [Issue description]

## Test Coverage Gaps
- [File] - [Missing test scenarios]

## Constitution Violations
- [File:line] - [Standard violated]

## Summary
- Critical issues: [N]
- High-priority: [N]
- Test gaps: [N]
- Overall assessment: READY / NEEDS WORK / BLOCKED
```

## Example Usage

```bash
# Review all changed files
/agent-orch:review-quick

# Review specific files
/agent-orch:review-quick --files="src/auth.ts,src/api/users.ts"

# Review changes in specific branch
/agent-orch:review-quick --since=main
```

## Comparison: Quick vs Full Review

| Feature | Quick Review | Full Review |
|---------|-------------|-------------|
| **Time** | 1-2 minutes | 10-30 minutes |
| **Depth** | Critical issues only | Exhaustive quality check |
| **Stages** | Single-pass | Two-stage (spec + quality) |
| **Agents** | No agents (command) | Spec reviewer + Quality reviewer |
| **Use Case** | Pre-commit, draft PR | Final review before merge |
| **Coverage** | Security, tests, critical bugs | + Code quality, patterns, style |

## No Agent Overhead

This is a **command**, not a skill:
- No agent spawning
- No multi-turn iteration
- Single-pass analysis
- Fast results (1-2 minutes)

For comprehensive review before merging, use the full two-stage review process with `/agent-orch:build`.
