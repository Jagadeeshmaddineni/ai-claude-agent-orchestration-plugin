# Make, Validate, Clean: A Git Lifecycle for Agent-Built Features (v2.15.0)

The build agents are powerful. The git workflow around them was not.

Every `/agent-orch:build` session ends the same way: Claude finishes, you review the code, and then you manually create a branch, stage files, write a commit message, push, open a PR, wait for CI, fix failures, push again, merge, delete the branch, and clean up. The agents did the hard part. You did the tedious part.

v2.15.0 eliminates the tedious part with three skills that wrap `/build` in a complete git lifecycle.

## The Problem: Build Ends Where Work Begins

`/agent-orch:build` is good at building. It gathers requirements, plans architecture, launches parallel agents, runs TDD, does two-stage code review, and produces working code. But it stops at the code. Everything after that -- branching, committing, pushing, PR creation, CI monitoring, fixing failures, merging, cleanup -- was manual.

This meant every feature required two modes of work: agent-assisted implementation (fast, parallel, reviewed) and manual git operations (slow, sequential, error-prone). The context switch was jarring. Worse, it discouraged the iterative loop that makes agent builds most effective: build, push, check CI, fix, push again, merge.

## The Solution: Three Skills, One Lifecycle

```
/agent-orch:make Add JWT auth     # worktree + build + commit + push + PR
/agent-orch:build                  # iterate (as many times as needed)
/agent-orch:make-validate          # check CI + reviews, fix via build, push
/agent-orch:make-clean             # merge PR, remove worktree, back to main
```

### `/agent-orch:make <prompt>`

The entry point. Give it the same prompt you'd give `/build`, and it handles everything:

1. **Creates a git worktree** with a branch name derived from your prompt. The branch name is slugified from the first few significant words -- "Add JWT authentication to the API" becomes `add-jwt-authentication-api`. You confirm or rename before it proceeds.

2. **Enters the worktree** using Claude Code's native `EnterWorktree` tool. Your session moves into the isolated copy. Main stays clean.

3. **Runs `/agent-orch:build`** with your prompt. Full agent orchestration: Architect, Builder (TDD), Validator, Scribe, specialists, two-stage review. Nothing changes about how build works.

4. **Commits and pushes** when build completes. The commit message is generated from the build session's PLAN.md and STATUS.md -- it knows what was built because the agents wrote it down.

5. **Opens a PR** via `gh pr create` with a structured body: summary from requirements, list of changed files, test results from the Validator.

You start on main, run one command, and end with an open PR on an isolated branch. Ready for CI.

### `/agent-orch:build` (unchanged)

Between `/make` and `/make-validate`, you can run `/build` as many times as you want on the worktree branch. This is the iterative loop -- tweak requirements, add features, refactor. Each `/build` session works exactly as before. The worktree is just a branch; `/build` doesn't know or care that it was created by `/make`.

### `/agent-orch:make-validate`

The fix loop. Checks what went wrong and fixes it:

1. **Finds the PR** for the current branch via `gh pr view`.

2. **Gathers CI failures** from `gh pr checks` and `gh run view --log-failed`. Gets the actual error output, not just "failed".

3. **Gathers review comments** from the GitHub API -- both inline code comments and general PR comments. Filters out bot noise.

4. **Presents everything** to you: CI failures with log output, review comments with file locations. You choose to fix all, fix selectively, or cancel.

5. **Runs `/agent-orch:build`** with the failures as context. The build prompt includes the specific CI errors and reviewer feedback, so agents fix exactly what's broken rather than guessing.

6. **Commits and pushes** the fixes. The PR updates automatically.

Run `/make-validate` as many times as needed. Each pass gathers fresh CI results and new review comments.

### `/agent-orch:make-clean`

The exit. When CI is green and reviews are approved:

1. **Checks for loose ends** -- uncommitted changes, unpushed commits. Offers to commit+push, discard, or cancel.

2. **Verifies CI status.** If checks are failing, it offers three paths: merge anyway (not recommended), run `/make-validate` to fix, or cancel.

3. **Squash-merges the PR** via `gh pr merge --squash --delete-branch`. Squash keeps the main branch history clean -- all the build iterations collapse into one commit.

4. **Removes the worktree** via `ExitWorktree`. The session returns to your original directory.

5. **Pulls main.** You're back where you started, with the feature merged and the branch gone.

Ready for the next `/make`.

## Why Worktrees, Not Branches

Branches share a working directory. If you're mid-feature on one branch and want to start another, you have to stash, switch, and remember where you were. Worktrees give each feature its own directory -- its own copy of the repo. You can have multiple `/make` sessions in progress simultaneously without any juggling.

Claude Code's `EnterWorktree` tool handles the plumbing: creating the worktree in `.claude/worktrees/`, setting up the branch, switching the session's working directory. `ExitWorktree` cleans up. The skills just orchestrate when these tools get called.

## What Didn't Change

`/agent-orch:build` is untouched. It doesn't know about `/make` and doesn't need to. The make skills wrap it, not modify it.

All 26 agents work exactly as before. The two-stage review pipeline, TDD enforcement, verification gates, Advocate review -- all unchanged. The make skills only add git operations before and after the build.

`/make-validate` and `/make-clean` work on any branch with a PR, not just branches created by `/make`. If you created a branch manually and opened a PR, these skills still work.

## The Full Loop

```bash
# Session 1: Build the feature
/agent-orch:make Add user settings page with theme preferences

# Session 2: CI failed, reviewer left comments
/agent-orch:make-validate

# Session 3: Everything green, merge and clean up
/agent-orch:make-clean

# Session 4: Next feature
/agent-orch:make Add email notification preferences
```

Each session is self-contained. Each starts and ends on main (except the build iterations in between). The worktree handles isolation. The skills handle ceremony.

---

**v2.15.0** -- 21 skills, 26 agents. Worktree feature lifecycle via `/make`, `/make-validate`, `/make-clean`. Isolated worktree-based development with automatic commit, push, PR creation, CI failure detection, review comment gathering, and squash-merge cleanup.
