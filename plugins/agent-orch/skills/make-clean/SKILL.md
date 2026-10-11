---
name: make-clean
description: Merge PR, delete remote branch, remove worktree, return to main. Usage: /agent-orch:make-clean
---

# Make Clean: Merge PR and Clean Up Worktree

Verifies CI is green, merges the PR, deletes the remote branch, exits and removes the worktree, switches back to main, and pulls latest. Transitions the Jira issue to Done if tracked. Gets you ready for the next `/agent-orch:make`.

**Branch preservation rule**: Branches matching `release/*` (created by `/agent-orch:release-me` or `/team-work:create-release`) are NEVER deleted by `/make-clean`. The PR is still merged and the worktree directory is still removed, but the local and remote branches stay intact for future patch releases on the same release line. All other branches — including `rfo/*` — are cleaned up normally.

## Prerequisites

- Should be on a feature branch (not main/master)
- `gh` CLI must be authenticated

## Phase Map (what the user sees)

`/make-clean` has 5 user-visible phases. At the START of every phase, print a
banner:

```
═══════════════════════════════════════════════════════
/make-clean phase <N>/5: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name                 | What happens                                         |
|---|----------------------------|------------------------------------------------------|
| 1 | Validate environment       | Check uncommitted changes and unpushed commits       |
| 2 | Check PR status            | Merge state, CI checks, review decision              |
| 3 | Merge PR                   | `gh pr merge --squash` (with `--delete-branch` unless `release/*`), Jira Done |
| 4 | Clean up worktree + state  | ExitWorktree (`remove` for normal, `keep` for `release/*`), delete THIS Claude's per-session state file (leave other Claudes' files alone) |
| 5 | Final report               | Summary                                              |

## Process

### Phase 1: Validate Environment

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make-clean phase 1/5: Validate environment
Checking for uncommitted changes and unpushed commits on the current branch.
═══════════════════════════════════════════════════════
```


1. **Get current branch:**
   ```bash
   BRANCH=$(git branch --show-current)
   ```

2. **Check for uncommitted changes:**
   ```bash
   git status --porcelain
   ```
   If there are uncommitted changes:
   ```
   You have uncommitted changes in this worktree:
   <list of changed files>

   (a) Commit and push before cleaning up
   (b) Discard changes and clean up anyway
   (c) Cancel -- I'll handle these first
   ```
   - **(a)**: Stage all, commit with message "chore: final changes before merge", push, then continue.
   - **(b)**: Continue (will use `discard_changes: true` later).
   - **(c)**: Exit.

3. **Check for unpushed commits:**
   ```bash
   git log origin/<branch-name>..<branch-name> --oneline 2>/dev/null
   ```
   If there are unpushed commits:
   ```
   You have unpushed commits:
   <list of commits>

   (a) Push before cleaning up
   (b) Discard and clean up anyway
   (c) Cancel
   ```
   - **(a)**: `git push`, then continue.
   - **(b)**: Continue with discard.
   - **(c)**: Exit.

### Phase 1.5: Detect Jira Issue

**Goal**: Find the Jira issue associated with this session so we can update it on merge.

1. **Check for PLAN.md in the worktree's session directory:**
   ```bash
   # Look for PLAN.md in either the date-tree layout (ssnc-agent-orch/YYYY/MM/DD/slug/)
   # or the legacy flat layout (ssnc-agent-orch/YYYY-MM-DD-slug/). Most recent first.
   find ssnc-agent-orch -type f -name PLAN.md 2>/dev/null \
     | xargs -I{} stat -f "%m %N" {} 2>/dev/null \
     | sort -rn | head -1 | awk '{print $2}'
   ```
   If found, read it and look for:
   ```
   ## Coordination
   Session Ticket: <JIRA-ID>
   ```

2. **Check the branch name for a Jira key pattern** (`[A-Z]+-\d+`):
   Extract from branch name if present (e.g., `proj-123-add-auth` → `PROJ-123`).

3. **Check PR body for Jira reference:**
   ```bash
   gh pr view --json body --jq '.body' | grep -oE '[A-Z]+-[0-9]+' | head -1
   ```

4. **Set JIRA_ISSUE:**
   - If found from any source: `JIRA_ISSUE=<key>`
   - If not found: `JIRA_ISSUE=none`

5. **Verify Jira context exists** (if JIRA_ISSUE is set):
   - Check `.claude/rules/jira.md` exists
   - If not: warn but continue (Jira updates will be skipped)

### Phase 2: Check PR Status

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make-clean phase 2/5: Check PR status
Looking at merge state, CI checks, and review decision on the PR.
═══════════════════════════════════════════════════════
```


1. **Find the PR:**
   ```bash
   gh pr view --json number,title,url,state,mergeStateStatus,reviewDecision --jq '{number,title,url,state,mergeStateStatus,reviewDecision}'
   ```

   **If no PR exists:**
   ```
   No PR found for branch <branch-name>.

   (a) Clean up worktree anyway (delete branch, remove worktree)
   (b) Create a PR first
   (c) Cancel
   ```
   - **(a)**: Skip to Phase 4 (no merge needed).
   - **(b)**: Run `gh pr create`, then re-check.
   - **(c)**: Exit.

   **If PR is already merged:**
   ```
   PR #<number> is already merged. Cleaning up worktree...
   ```
   Skip to Phase 3.5 (Jira Done) then Phase 4.

   **If PR is closed (not merged):**
   ```
   PR #<number> is closed without merging.

   (a) Clean up worktree (discard work)
   (b) Reopen PR first
   (c) Cancel
   ```

2. **Check CI status:**
   ```bash
   gh pr checks --json name,state,conclusion --jq '.[] | {name,state,conclusion}'
   ```

   **If any checks failed:**
   ```
   CI is not green. Failed checks:
   <list of failed checks>

   (a) Merge anyway (not recommended)
   (b) Run /agent-orch:make-validate to fix failures first
   (c) Cancel
   ```

   **If checks are still running:**
   ```
   CI checks are still running:
   <list of pending checks>

   (a) Wait and check again in 30 seconds
   (b) Merge anyway (CI not complete)
   (c) Cancel
   ```

   **If all checks pass:** Continue.

3. **Check review status:**
   If `reviewDecision` is `CHANGES_REQUESTED`:
   ```
   Changes requested by reviewers. Address reviews before merging.

   (a) Merge anyway (override review)
   (b) Run /agent-orch:make-validate to address reviews
   (c) Cancel
   ```

### Phase 3: Merge PR

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make-clean phase 3/5: Merge PR
Merging with --squash, deleting the remote branch, transitioning Jira to Done.
═══════════════════════════════════════════════════════
```


1. **Determine merge method:**
   ```bash
   gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed --jq '{mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed}'
   ```
   Prefer squash merge if available (cleaner history), otherwise merge commit.

2. **Merge:**

   **Branch preservation check** — if `BRANCH` matches `release/*`, do NOT pass `--delete-branch`. The release branch must be preserved for future patch releases on the same line.

   ```bash
   if [[ "${BRANCH}" == release/* ]]; then
     # Preserve release branches — merge but keep the remote branch
     gh pr merge <pr-number> --squash
     echo "Preserved release branch: ${BRANCH}"
   else
     # Normal cleanup — merge AND delete the remote branch
     gh pr merge <pr-number> --squash --delete-branch
   fi
   ```

   **If merge fails** (e.g., merge conflicts, branch protection):
   ```
   Merge failed: <error>

   (a) Try rebase merge instead
   (b) Cancel -- I'll resolve conflicts manually
   ```

3. **Confirm merge:**
   ```
   PR #<number> merged.
   <if release branch>: Remote branch ${BRANCH} preserved (release branches are never deleted).
   <otherwise>: Remote branch ${BRANCH} deleted.
   ```

4. **Capture PR URL for Jira comment:**
   ```bash
   PR_URL=$(gh pr view <pr-number> --json url --jq '.url')
   ```

### Phase 3.5: Tracker Done Transition

**If the active tracker is `github`** (per `plugins/agent-orch/rules/tracker-provider.md`
§1) and a GitHub issue is associated: apply `set_status(issue, done)` via the §3b/§4
GitHub mapping — by default `gh issue close <N>` (status_model `labels`), or the
Projects v2 field if `github-workflow.yaml` sets `status_model: project`. Run with
`GH_HOST=code.ssnc.dev`. If the PR body already contained `Closes #<N>`, the merge
will have closed it — verify and skip if already closed. Then skip the Jira steps below.

**If the active tracker is `jira`** (the default) and JIRA_ISSUE is not "none" and
`.claude/rules/jira.md` exists:

**Pluggable Jira workflow**: If `.claude/ssnc-agent-orch/jira-workflow.yaml` exists and `jira.enabled` is set, use its `transitions.done` value and `fields.end_date` (or other overrides) in place of the hard-coded IDs from `jira.md`. If it defines `lifecycle.on_done` targets, run them here per `plugins/agent-orch/rules/extension-resolver.md`. If absent, use `jira.md` values and the current flow. Zero behaviour change by default.

1. **Transition to Done:**
   ```
   mcp__jira__jira_transitionIssue with:
     issueKey: "<JIRA_ISSUE>"
     transitionId: "[Done transition ID from jira.md or jira-workflow.yaml]"
   ```
   If transition fails (e.g., issue already Done, or workflow requires intermediate steps), report but continue.

2. **Set end date:**
   ```
   mcp__jira__jira_updateIssue with:
     issueKey: "<JIRA_ISSUE>"
     fields: { "customfield_XXXXX": "<today YYYY-MM-DD>" }
   ```
   Use the end/due date field ID from jira.md. If not available, skip with a note.

3. **Ensure version fields are set** (in case they weren't set by /make):

   ```bash
   LAST_TAG=$(git tag --sort=-v:refname | head -1)
   # Next minor: e.g., 2.15.2 → 2.16.0
   ```

   Fetch the issue to check current versions:
   ```
   mcp__jira__jira_getIssue with issueKey
   ```
   If `versions` (affects version) is empty:
   ```
   mcp__jira__jira_updateIssue with:
     issueKey: "<JIRA_ISSUE>"
     fields: { "versions": [{"name": "<LAST_TAG>"}] }
   ```
   If `fixVersions` is empty:
   ```
   mcp__jira__jira_updateIssue with:
     issueKey: "<JIRA_ISSUE>"
     fields: { "fixVersions": [{"name": "<NEXT_MINOR>"}] }
   ```
   If versions don't exist in Jira, skip with a warning.

4. **Ensure `claude-code-agent-harness` label exists:**
   If label not present, add it (same as /make Phase 0.5 Step 5).

5. **Post completion comment:**
   ```
   mcp__jira__jira_postIssueComment with:
     issueKey: "<JIRA_ISSUE>"
     body: "Issue completed and merged.
     
     PR: <PR_URL>
     Branch: <branch-name> (deleted)
     
     Merged via /agent-orch:make-clean."
   ```

### Phase 3.6: Work Plan Update

**If JIRA_ISSUE is not "none":**

Check if the Jira issue appears in any work plan markdown:

```bash
grep -rl "$JIRA_ISSUE" planning/*.md 2>/dev/null
```

**If a work plan file contains the JIRA_ISSUE key:**

1. **Update the item's status** in the work plan table to `done`:
   - Find the table row containing the Jira issue link (e.g., `[RCONAI-259](...)`)
   - Change the Status column value to `done`
   - Use the Edit tool to make this change

2. **Add changelog entry:**
   ```
   - <YYYY-MM-DD>: <JIRA_ISSUE> completed (merged via /make-clean)
   ```

3. **Commit the plan update:**
   ```bash
   git add planning/
   git commit -m "planning: mark <JIRA_ISSUE> as done"
   git push
   ```

   If not on the plan branch, skip with a note. The plan will be synced next time `/team-work:work-pop` refreshes from Jira.

### Phase 4: Clean Up Worktree

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make-clean phase 4/5: Clean up worktree + state
Removing the worktree, deleting the local branch, and erasing the /make session state file.
═══════════════════════════════════════════════════════
```

1. **Exit the worktree** using the `ExitWorktree` tool:

   **Branch preservation check** — if `BRANCH` matches `release/*`, use `action: "keep"` so the worktree directory is left on disk and the local branch remains. For all other branches (including `rfo/*`), use `action: "remove"` to delete both.

   **If `BRANCH` matches `release/*`:**
   ```
   ExitWorktree:
     action: "keep"
   ```
   The worktree directory is left on disk and the local branch is preserved. (The remote branch was also preserved in Phase 3.) After ExitWorktree, the user may delete the worktree directory manually if desired, but the branch stays.

   **Otherwise:**
   ```
   ExitWorktree:
     action: "remove"
     discard_changes: true
   ```
   This removes the worktree directory and local branch, and returns the session to the original working directory.

   **Note**: `discard_changes: true` is safe here because changes are already merged (or user chose to discard in Phase 1).

   **If NOT in a worktree** (user created the branch manually):
   Skip ExitWorktree and instead:
   ```bash
   DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')
   git checkout $DEFAULT_BRANCH
   if [[ "${BRANCH}" == release/* ]]; then
     echo "Preserving local release branch: ${BRANCH}"
   else
     git branch -d "${BRANCH}"
   fi
   ```

2. **Ensure we are on the default branch and pull latest:**
   ```bash
   DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')
   git checkout $DEFAULT_BRANCH
   git pull
   ```

3. **Remove THIS Claude's session state file:**

   `/make` wrote a per-Claude session file
   `.claude/.make-session-<UTC_TS>-<PID>.json` at the primary repo root when
   the session started, and exported its path via `$MAKE_SESSION_FILE`.
   Clean up ONLY that file — leave any other Claudes' session files alone
   (they belong to parallel /make sessions running on other branches). See
   `plugins/agent-orch/rules/worktree-context.md` for context.

   ```bash
   REPO_ROOT=$(git rev-parse --show-toplevel)

   # 1. Prefer the env var that /make exported
   if [ -n "$MAKE_SESSION_FILE" ] && [ -f "$MAKE_SESSION_FILE" ]; then
     SESSION_FILE="$MAKE_SESSION_FILE"
   else
     # 2. Find the v2 file whose branch matches the one we just merged
     SESSION_FILE=""
     for f in "$REPO_ROOT"/.claude/.make-session-*.json; do
       [ -f "$f" ] || continue
       f_branch=$(python3 -c "import json,sys; print(json.load(open('$f')).get('branch',''))" 2>/dev/null)
       if [ "$f_branch" = "$BRANCH" ]; then
         SESSION_FILE="$f"
         break
       fi
     done
     # 3. Legacy fallback (v1 single-file path)
     if [ -z "$SESSION_FILE" ] && [ -f "$REPO_ROOT/.claude/.make-session.json" ]; then
       SESSION_FILE="$REPO_ROOT/.claude/.make-session.json"
     fi
   fi

   if [ -n "$SESSION_FILE" ] && [ -f "$SESSION_FILE" ]; then
     rm "$SESSION_FILE"
     echo "Removed session state: $SESSION_FILE"
   else
     echo "No session state file found for branch $BRANCH (already cleaned, or none was written)."
   fi

   # Inform user about other live sessions, if any (informational only)
   OTHER_FILES=$(ls "$REPO_ROOT"/.claude/.make-session-*.json 2>/dev/null | wc -l | tr -d ' ')
   if [ "$OTHER_FILES" -gt 0 ]; then
     echo "Note: $OTHER_FILES other per-Claude session file(s) remain (parallel /make sessions). Leaving them alone."
   fi
   ```

   If the resolved session file references a branch DIFFERENT from the one
   we just merged, warn the user — it means a prior /make session was
   abandoned without cleanup, and they may want to investigate before a new
   /make starts. Do NOT delete that file in that case.

4. **Verify clean state:**
   ```bash
   git status
   ```

### Phase 5: Final Report

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make-clean phase 5/5: Final report
Done. Here's the summary.
═══════════════════════════════════════════════════════
```


```
Clean up complete.

  PR #<number>: <title>
  Status: Merged
  Branch: <branch-name> <(deleted) | (preserved — release branch)>
  Worktree: <removed | kept (release branch)>
  [If Jira]: Jira: <JIRA_ISSUE> (Done)

  Now on: <default-branch> (up to date)

Ready for the next feature. Run /agent-orch:make <prompt> to start.
```

**Note on release branches**: When `BRANCH` matches `release/*`, both the local and remote branches are preserved so future patch releases can be cut from the same line. The PR is still merged, but the worktree directory and the branch itself both stay (the user can remove the worktree directory manually later if desired). This rule applies whether you used a worktree or worked in-place. RFO branches (`rfo/*`) and all other branches are cleaned up normally.

## Error Handling

| Scenario | Action |
|----------|--------|
| Uncommitted changes | Offer to commit+push, discard, or cancel |
| Unpushed commits | Offer to push, discard, or cancel |
| No PR exists | Offer to clean up worktree without merging |
| CI not green | Offer merge-anyway, `/make-validate`, or cancel |
| Changes requested | Offer override, `/make-validate`, or cancel |
| Merge conflicts | Offer rebase or manual resolution |
| Merge fails (branch protection) | Report error, suggest manual merge via GitHub UI |
| ExitWorktree fails | Report error, show manual cleanup commands |
| PR already merged | Skip merge, do Jira Done + cleanup |
| Not in a worktree | Use git checkout + branch delete instead of ExitWorktree |
| Jira transition fails | Warn but continue with cleanup |
| Jira context missing | Skip all Jira updates, warn user |
| No Jira issue found | Skip Jira updates silently |
| Version not in Jira | Skip version fields with warning |
| Branch matches `release/*` | Skip `--delete-branch` on merge; use `ExitWorktree action: "keep"`; preserve local branch |

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. If that file is
absent, has no `skills.make-clean:` entry, or the entry is empty, **`/make-clean` runs
exactly as documented above — no behaviour change.** This is the default and most common case.

`/make-clean` exposes two hook points:

| Hook point | When it runs |
|------------|--------------|
| `before_merge` | Phase 3, before `gh pr merge` (e.g. final checks) |
| `after_merge` | After merge + cleanup, before the final report |

At each hook point, read `.claude/ssnc-agent-orch/skills.yaml`; if `skills.make-clean.<hook>`
lists targets, run them in order per `plugins/agent-orch/rules/extension-resolver.md`. Tell the
user when you run an extension target.

**Pluggable Jira workflow**: `/make-clean` first checks `.claude/ssnc-agent-orch/jira-workflow.yaml`.
If present and `jira.enabled` is set, it uses that file's `transitions.done` / `fields.end_date`
(and other overrides) in place of the hard-coded IDs, and runs `lifecycle.on_done` targets at the
Done transition. If absent, the current Jira flow (read `.claude/rules/jira.md`) is unchanged.

Full contract: `plugins/agent-orch/rules/extensibility.md`.

