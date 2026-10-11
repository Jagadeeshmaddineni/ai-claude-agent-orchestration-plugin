---
name: make-validate
description: Check PR for CI failures and review comments, fix via /build, commit and push. Usage: /agent-orch:make-validate
---

# Make Validate: Repair CI Failures and Address Review Comments

Detects the PR associated with the current branch, gathers CI failures and review comments, then passes them as context to `/agent-orch:build` for fixing. After the build completes, commits and pushes the fixes.

## Prerequisites

- Must be on a feature branch (not main/master)
- Current branch must have an open PR
- `gh` CLI must be authenticated

## Process

### Phase 1: Validate Environment

1. **Verify we are on a feature branch with a PR:**
   ```bash
   BRANCH=$(git branch --show-current)
   ```
   If branch is `main` or `master`:
   ```
   You are on the main branch. Use /agent-orch:make to start a new feature.
   ```

2. **Find the PR for this branch:**
   ```bash
   gh pr view --json number,title,url,state --jq '{number,title,url,state}'
   ```
   If no PR found:
   ```
   No PR found for branch <branch-name>.
   Create one with: gh pr create
   Or use /agent-orch:make to start a new feature workflow.
   ```
   If PR is merged or closed:
   ```
   PR #<number> is <state>. Use /agent-orch:make-clean to clean up,
   or /agent-orch:make to start a new feature.
   ```

### Phase 1.5: Sync with Main

**CRITICAL**: Before checking CI or fixing anything, bring the branch up to date with main. This prevents merge conflicts later and catches issues caused by upstream changes.

1. **Fetch latest from remote:**
   ```bash
   git fetch origin
   ```

2. **Determine the default branch:**
   ```bash
   DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main")
   ```

3. **Merge main into the feature branch:**
   ```bash
   git merge origin/$DEFAULT_BRANCH
   ```

   **If merge conflicts occur:**
   ```
   Merge conflicts detected:
   <list of conflicting files>

   Resolving conflicts...
   ```

   For each conflicting file:
   - Read the file to understand both sides of the conflict
   - Resolve the conflict by keeping the intent of both changes
   - If a conflict is ambiguous (both sides changed the same logic), present it to the user:
     ```
     Conflict in <file>:<lines> -- both sides modified this logic:

     <<< main (incoming)
     <their changes>
     ===
     <our changes>
     >>> <branch-name>

     (a) Keep ours
     (b) Keep theirs
     (c) Let me resolve manually
     ```
   - After resolving all conflicts:
     ```bash
     git add <resolved-files>
     git commit --no-edit
     ```

   **If merge is clean:**
   ```
   Merged origin/<default-branch> into <branch-name> -- no conflicts.
   ```

4. **Push the merge commit** so the PR reflects the latest state:
   ```bash
   git push
   ```

### Phase 2: Gather Issues

Collect all problems from two sources: CI and reviews.

#### Step 1: Check CI Status

```bash
gh pr checks --json name,state,conclusion,detailsUrl --jq '.[] | select(.conclusion != "SUCCESS" and .conclusion != "SKIPPED" and .conclusion != "")'
```

Check for pending/in-progress checks:
```bash
gh pr checks --json name,state --jq '.[] | select(.state == "PENDING" or .state == "IN_PROGRESS")'
```

If checks are still running:
```
CI checks are still running:
<list of pending checks>

(a) Wait and check again in 30 seconds
(b) Proceed with review comments only (ignore CI for now)
(c) Cancel
```

For failed checks, get logs:
```bash
gh run list --branch <branch-name> --status failure --json databaseId,name --jq '.[0]'
gh run view <run-id> --log-failed 2>/dev/null | tail -100
```

#### Step 2: Check Review Comments

Get PR review status:
```bash
gh pr view --json reviews,reviewDecision --jq '{reviews,reviewDecision}'
```

Get inline code review comments:
```bash
gh api repos/{owner}/{repo}/pulls/<pr-number>/comments --jq '.[] | {path,line,body,user: .user.login,created_at}'
```

Get general PR comments:
```bash
gh api repos/{owner}/{repo}/issues/<pr-number>/comments --jq '.[] | {body,user: .user.login,created_at}'
```

Filter out bot comments and stale comments (already addressed in previous pushes).

### Phase 3: Present Summary

Present all findings to the user:

```
PR #<number>: <title>
Branch: <branch-name>

## CI Failures (<count>)

1. <check-name>: FAILED
   <relevant error output, truncated to key lines>

## Review Comments (<count>)

1. @<reviewer> on <file>:<line>:
   "<comment body>"

2. @<reviewer> (general):
   "<comment body>"

---
Fix all <total> issues via /build? (yes / no / selective)
```

- **yes**: Proceed to Phase 4 with all issues
- **no**: Exit
- **selective**: Let user pick which issues to address

If no issues found:
```
All CI checks pass and no review comments to address. Nothing to fix.
```
Stop here.

### Phase 4: Fix via Build

Construct a prompt for `/agent-orch:build` that includes the issues:

```
Skill tool call:
  skill: "agent-orch:build"
  args: "Fix the following issues on PR #<number> (<title>):

        CI FAILURES:
        <formatted CI failure details with log output>

        REVIEW COMMENTS:
        <formatted review comments with file locations>

        Focus on fixing these specific issues. Do not add new features
        or refactor unrelated code."
```

Wait for `/agent-orch:build` to complete.

### Phase 5: Local Verification

**CRITICAL**: Always verify fixes locally before pushing. Remote CI can take a long time -- catch failures here first.

1. **Check for changes:**
   ```bash
   git status --porcelain
   ```
   If no changes, report and stop.

2. **Run the build locally:**
   ```bash
   # Detect build system and run appropriate command
   # npm/yarn/pnpm: npm run build / yarn build / pnpm build
   # go: go build ./...
   # rust: cargo build
   # python: python -m py_compile or similar
   ```
   If the build fails, fix the issue before proceeding. Do NOT push broken code.

3. **Run tests locally:**
   ```bash
   # npm/yarn/pnpm: npm test / yarn test / pnpm test
   # go: go test ./...
   # rust: cargo test
   # python: pytest
   ```
   If tests fail:
   ```
   Local tests failed:
   <test output>

   Fixing locally before pushing...
   ```
   Fix the failures (run `/agent-orch:build` again if needed with the specific test failures as context), then re-run tests until they pass.

4. **Run linter/type checker if available:**
   ```bash
   # TypeScript: npx tsc --noEmit
   # ESLint: npx eslint .
   # Python: ruff check . / mypy .
   # Go: go vet ./...
   ```
   Fix any issues before proceeding.

5. **Confirm local verification passed:**
   ```
   Local verification passed:
   - Build: OK
   - Tests: <N> passed, 0 failed
   - Lint: OK (if applicable)

   Proceeding to commit and push.
   ```

### Phase 6: Commit and Push

1. **Stage all changes:**
   ```bash
   git add -A
   ```

2. **Generate commit message:**
   ```
   fix: address PR feedback

   - <summary of CI fixes>
   - <summary of review comment fixes>

   Verified locally: build, tests, lint all pass.
   Fixes for PR #<number>
   ```

3. **Commit and push:**
   ```bash
   git commit -m "<message>"
   git push
   ```

4. **Report to user:**
   ```
   Fixes verified locally and pushed to <branch-name>.
   PR #<number> updated: <pr-url>

   Local verification: build OK, tests OK, lint OK
   CI will re-run on remote. Check status with:
     gh pr checks

   Next steps:
   - Run /agent-orch:make-validate again if more issues appear
   - Run /agent-orch:make-clean to merge when CI is green
   ```

## Error Handling

| Scenario | Action |
|----------|--------|
| Not on a feature branch | Tell user to use `/make` |
| No PR for this branch | Suggest `gh pr create` or `/make` |
| PR is merged/closed | Suggest `/make-clean` or `/make` |
| CI still running | Offer to wait, proceed with reviews only, or cancel |
| No issues found | Report clean state, nothing to fix |
| Build produces no changes | Report, suggest manual investigation |
| Push fails | Changes committed locally, show manual fix |

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. If that file is
absent, has no `skills.make-validate:` entry, or the entry is empty, **`/make-validate`
runs exactly as documented above — no behaviour change.** This is the default and most
common case.

`/make-validate` exposes two hook points:

| Hook point | When it runs |
|------------|--------------|
| `before_validate` | Before validation begins (e.g. environment prep) |
| `after_validate` | After validation completes (e.g. upload coverage) |

At each hook point, read `.claude/ssnc-agent-orch/skills.yaml`; if
`skills.make-validate.<hook>` lists targets, run them in order per
`plugins/agent-orch/rules/extension-resolver.md`. Tell the user when you run an extension
target; a failing target is surfaced but does not abort validation unless the user aborts.

Full contract: `plugins/agent-orch/rules/extensibility.md`.

