# Worktree / Branch Context Enforcement

> This rule is ALWAYS loaded for every agent-orch skill and subagent. It is the
> single source of truth for which working tree the orchestration is operating
> against.

## Why this rule exists

`/agent-orch:make` can set up work in one of two modes:

- **Worktree mode** — an isolated checkout inside `.claude/worktrees/<name>/` on
  a dedicated branch. Multiple features can run in parallel.
- **Feature-branch mode** — a new branch created in place in the main checkout.
  One feature at a time.

Once a mode is chosen for a session, **every** downstream action — `/build`, its
orchestrated subagents, specialist agents, edits, git commands, and file I/O —
MUST stay inside the selected working tree. In the past, agents have silently
drifted to the main checkout (e.g., by editing files at an absolute path that
resolves to the primary worktree). That produces changes in the wrong branch,
empty worktree PRs, and a very confused user.

This rule makes the contract machine-enforceable.

## The session state file (v2 — per-Claude, parallel-safe)

`/agent-orch:make` writes a session state file the moment it creates a worktree
or a feature branch. Each Claude session writes its OWN file, named by UTC
timestamp + process id, so multiple Claudes running `/make` in parallel on the
same repo never collide.

**Path**: `<repo-root>/.claude/.make-session-<UTC_TIMESTAMP>-<PID>.json`

- `<UTC_TIMESTAMP>` format: `YYYYMMDDTHHMMSSZ` (e.g., `20260526T191749Z`)
- `<PID>` is the spawning Claude's process id (or `$$` of the shell `/make`
  runs in — any value that uniquely identifies this Claude on this host)

Examples:

```
.claude/.make-session-20260526T191749Z-26169.json   ← Claude #1 on AITOOLS-71
.claude/.make-session-20260526T191803Z-27044.json   ← Claude #2 on AITOOLS-46
```

**Schema** (v2):

```json
{
  "version": 2,
  "session_id": "<UTC_TIMESTAMP>-<PID>",
  "mode": "worktree | branch",
  "branch": "<branch name>",
  "worktree_path": "<absolute path of the tree the session is working in>",
  "repo_root": "<absolute path of the primary checkout>",
  "jira_key": "AITOOLS-47 | null",
  "started_at": "2026-05-26T19:17:49Z",
  "invoking_skill": "/agent-orch:make",
  "claude_pid": 26169
}
```

- `session_id` is the unique handle for this Claude's session. It MUST match
  the timestamp+pid embedded in the filename.
- `worktree_path` is the **only** path orchestrated work is allowed to touch.
  - In worktree mode it's the `.claude/worktrees/<name>/` path.
  - In feature-branch mode it's the primary repo root itself — because the
    branch was created in-place.
- All `.make-session-*.json` files are gitignored (pattern: `.claude/.make-session*.json`)
  so they never land in a commit.
- A file is removed by `/agent-orch:make-clean` only when its `branch`
  (or `session_id`, if known) matches the session being cleaned. Other Claudes'
  session files are left alone.

### Mechanical enforcement (the hard gate)

> **This is the part that actually stops drift.** Everything else in this rule
> is instruction the orchestrator and subagents are *asked* to follow. The
> guard hook is the only layer a model cannot ignore.

A `PreToolUse` hook — `plugins/agent-orch/hooks/guard-worktree-writes.sh`
(logic in `guard-worktree-writes.py`) — is registered in
`plugins/agent-orch/hooks/hooks.json` against
`Write | Edit | MultiEdit | NotebookEdit | Bash`. On every such tool call it:

1. Runs `git worktree list --porcelain` to find the primary checkout and all
   worktrees.
2. Reads every `<primary>/.claude/.make-session-*.json` and collects the
   `worktree_path` of each session whose `mode` is `worktree`.
3. If no worktree-mode session is active, it is a **no-op** (exit 0). Branch
   mode is also a no-op — in-place edits are legitimate there.
4. Otherwise it resolves the write target (the `file_path` for Write/Edit, or a
   redirect / `tee` / `mkdir` / `touch` target for Bash) and **blocks with
   exit 2** if the target lands inside the primary repo tree but outside the
   active worktree path.

Writes that land inside the worktree, outside the primary repo entirely (`../`,
`/tmp`, `$HOME` — used legitimately by `/release-me` and `/work-recap`), or
under `<primary>/.claude/` and `<primary>/.git/` are always allowed. The hook
fails **open** (exit 0) on any internal error or when `python3` is unavailable,
so it can never wedge a host — it degrades to the instruction-only behaviour
described below.

This is what makes the drift documented in "Why this rule exists" *impossible*
rather than merely discouraged: an agent that tries to write `packages/db/...`
to the primary checkout while anchored to a worktree gets a hard rejection with
a message telling it the correct in-worktree path.

### Anchor lookup order (instruction layer)

`/make` records its session in `.make-session-<UTC_TIMESTAMP>-<PID>.json` and,
within its own Claude session, sets `MAKE_SESSION_FILE` to that file's path so
later steps in the **same** session can find it quickly.

> **Important — env vars do NOT cross tool/agent boundaries.** Each Bash tool
> call runs in a fresh shell, and spawned Task/Agent subagents are separate
> processes. An `export` in one Bash call is **not** visible to later Bash
> calls or to subagents. So `$MAKE_SESSION_FILE` must NOT be relied on as the
> primary anchoring mechanism — it is a best-effort hint only. The guard hook
> above does not depend on it (it discovers sessions from disk every time), and
> subagents receive the anchor via the explicit `[worktree-context]` block in
> their prompt (see rule 6 below), not via inherited env.

When a skill or agent needs to resolve the anchor itself, use this order:

1. `$MAKE_SESSION_FILE` if set AND the file exists (same-session hint).
2. Otherwise the discovery procedure in the next section.

### Discovery procedure (when env var is absent)

When `$MAKE_SESSION_FILE` is not set, agents discover the right session file
this way:

1. List candidates: `ls -t <repo-root>/.claude/.make-session-*.json` (most
   recent first).
2. Read each candidate's `branch` field. Pick the file whose `branch` matches
   `git branch --show-current` from the agent's cwd.
3. If no v2 file matches, check for the **legacy** path
   `<repo-root>/.claude/.make-session.json` (v1). If present, treat it as the
   anchor (read-side compatibility for sessions started before this scheme).
4. If still no match, the skill was invoked directly (plain `/build` without
   `/make`). Treat cwd as the anchor.

## Rules every orchestrated agent MUST follow

When a subagent or specialist runs as part of `/build`, `/make`, `/implement`,
`/make-validate`, or any skill that spawns agents:

1. **Pre-flight anchor check.** Before the first file edit or shell command,
   resolve the session state file:
   - First try `$MAKE_SESSION_FILE`.
   - Otherwise run the discovery procedure above.

   If a file is found:
   - Set `WORKTREE_ROOT = worktree_path` from the file.
   - Confirm `pwd` is inside `WORKTREE_ROOT`. If it is not, `cd` into
     `WORKTREE_ROOT` immediately and surface a one-line banner to the user:

     ```
     [worktree-context] Anchoring to <mode> tree: <branch> at <worktree_path>
     ```

   - Verify `git rev-parse --show-toplevel` resolves to `WORKTREE_ROOT`. If it
     does not, refuse to continue and surface the drift to the user.

2. **All file paths stay inside `WORKTREE_ROOT`.** Reads, writes, edits,
   greps, and file listings must use paths under `WORKTREE_ROOT`. Absolute
   paths that resolve outside of it are a drift — stop and flag.

3. **Do not `cd` out of the tree.** Do not change directory to a parent repo,
   sibling worktree, or unrelated path for convenience. If external inspection
   is genuinely required (e.g., reading a reference in another repo), do it
   with an explicit absolute path and come straight back — never carry the
   cwd change across commands.

4. **Git commands run from `WORKTREE_ROOT`.** Every `git` invocation uses the
   worktree's cwd, so it reads/writes the worktree's branch, not the primary
   branch. Never run `git -C <primary-repo-root> …` from an agent spawned
   inside a session.

5. **Session files live under `WORKTREE_ROOT`.** `ssnc-agent-orch/<YYYY>/<MM>/<DD>/<feature-slug>/`
   is always created relative to the worktree root, not the primary repo.

6. **Propagate the anchor into spawned children.** When the orchestrator
   launches a Task/Agent subagent, it MUST pass the following into the prompt
   explicitly:

   ```
   [worktree-context]
   mode: <worktree | branch>
   branch: <branch>
   worktree_path: <absolute path>
   session_id: <session_id>
   session_file: <absolute path of .make-session-<...>.json>
   ```

   Subagents re-run the pre-flight anchor check using these values. They do
   not re-guess from cwd alone.

7. **Fail loud, not silent.** If drift is detected (pwd outside the anchor,
   session file missing when one was expected, mismatched branch), the agent
   must stop and report, not auto-repair in a way the user can't see.

> **Backstop:** even if an agent ignores all seven rules above, the
> `guard-worktree-writes` PreToolUse hook (see "Mechanical enforcement")
> hard-blocks any Write/Edit/Bash write that would land in the primary tree
> while a worktree session is active. The rules keep agents well-behaved; the
> hook makes a violation impossible. If you see a `[worktree-guard] BLOCKED`
> message, you drifted — rewrite the path under the worktree.

## Session directory layout (v2 — date-tree)

Markdown artifacts produced by `/build` (PLAN.md, STATUS.md, prompt.md, etc.)
go under a date-organised tree:

**Path**: `ssnc-agent-orch/<YYYY>/<MM>/<DD>/<feature-slug>/`

Examples:

```
ssnc-agent-orch/2026/05/26/per-claude-session-state-and-date-tree/PLAN.md
ssnc-agent-orch/2026/05/26/per-claude-session-state-and-date-tree/STATUS.md
ssnc-agent-orch/2026/05/26/per-claude-session-state-and-date-tree/prompt.md
ssnc-agent-orch/2026/05/27/auth-jwt-rotation/PLAN.md
```

**Why**: The legacy flat layout (`ssnc-agent-orch/<YYYY-MM-DD>-<slug>/`) piles
up at the top level over time. Grouping by year/month/day keeps the directory
listing scannable and makes "show me sessions from this week" a simple `ls`.

### Read-side compatibility

Existing flat session dirs (`ssnc-agent-orch/<YYYY-MM-DD>-<slug>/`) keep
working. Agents reading session artifacts MUST use a recursive glob
(`ssnc-agent-orch/**/PLAN.md`) rather than the old single-level glob
(`ssnc-agent-orch/*/PLAN.md`) so both layouts are covered. Only NEW sessions
use the date-tree layout.

## When the session file is absent

If no `.make-session-*.json` is found AND `$MAKE_SESSION_FILE` is not set, the
skill was invoked directly (plain `/build` without `/make`). In that case:

- Treat the current working directory as the anchor.
- All the "stay inside the anchor" rules above still apply, just with cwd as
  the anchor instead of `worktree_path`.
- Do not create a session file from inside `/build` — only `/make` owns that
  file's lifecycle.

## Cleanup

`/agent-orch:make-clean` removes the session file matching its branch (or
`session_id`, if propagated through `$MAKE_SESSION_FILE`) as part of Phase 4.
Other Claudes' session files are left alone — that's the whole point of the
per-Claude scheme.

If cleanup is aborted, the file stays, which is the correct behaviour — a
future `/build` on that branch will pick up the same anchor via the discovery
procedure.

If `/make` itself is aborted between Phase 2 and Phase 3 (worktree created
but build never ran), the user can delete the file manually or re-run
`/make-clean` to reset. The legacy `.make-session.json` (v1) at the same path
is also cleaned up if encountered.
