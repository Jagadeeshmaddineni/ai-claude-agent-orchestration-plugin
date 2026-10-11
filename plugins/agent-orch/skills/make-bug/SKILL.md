---
name: make-bug
description: Create worktree or feature branch, run /bugfix to diagnose and repair, commit, push, and open PR. The bug-fix analogue of /make. Usage: /agent-orch:make-bug [bug description|JIRA-ID|issue-URL]
---

# Make Bug: Bug-Fix Workflow (Worktree or Branch)

Creates an isolated worktree **or** a feature branch in the current working tree (user's choice), runs `/agent-orch:bugfix` to diagnose the root cause and repair it, then commits all changes, pushes the branch, and opens a GitHub PR. Integrates with Jira for full lifecycle tracking.

**`/make-bug` is to `/bugfix` what `/make` is to `/build`.** It is the same git + issue-tracker + PR lifecycle wrapper, with one substitution: the implementation phase runs `/agent-orch:bugfix` (root-cause diagnosis → source-level fix → verification) instead of `/agent-orch:build`. A bug fix rides whatever release is next, so — unlike `/make` — `/make-bug` computes **no** version bump and sets **no** Jira fix version.

## Separation of concerns (why this skill is thin)

`/make-bug` is a **git + issue-tracker + extensibility** wrapper around `/agent-orch:bugfix`.
It MUST NOT create or modify **auditable code-domain repo content** — source code,
documentation, configuration, or version files. The **diagnosis and the fix** are delegated to
`/agent-orch:bugfix`, which runs the Debugger → Builder → Validator under the
[verification-before-completion policy](../../policies/verification-before-completion.md)
(4-phase root cause, failing-regression-test-before-fix, 3-attempts-then-question-the-architecture).

`/make-bug` owns only:

- **Git**: worktree/branch creation, staging, commits, pushes, PRs.
- **Issue tracker**: Jira/GitHub lifecycle (assign, transition, comment). **No** fixVersion —
  a bug fix rides the next release; version fields are out of scope here.
- **Bookkeeping**: work-plan status/changelog in `planning/*.md`, invoking the wiki sync
  (`/team-work:wiki-source-branch`), and — because `/bugfix` (unlike `/build`) does **not**
  create its own session tree — **scaffolding the session artifact directory and an empty
  STATUS.md sink** for the Debugger/Builder/Validator to write into (see Phase 3). These are
  tracking/knowledge/session-scaffold files, not code-domain content, so they stay
  `/make-bug`-owned.
- **Extensibility**: the `before_commit` / `before_pr` / `after_pr` hooks.

Concretely: `/make-bug` performs **no edits** to source, docs, config, or version files. It
scaffolds the STATUS.md sink, hands off to `/bugfix`, then commits and pushes what `/bugfix`
produces (Phase 4). When in doubt: if a step writes to a file that lands in a code review as a
source/docs/config/version change, it belongs in `/bugfix`, not here.

## Relationship to the /make family

`/make-bug` writes the **exact same per-Claude session state file** as `/make`
(`<primary-repo>/.claude/.make-session-<UTC_TS>-<PID>.json`, version 2), differing only in the
`invoking_skill` value (`/agent-orch:make-bug`). Because that file is the anchor every downstream
skill reads:

- `/agent-orch:bugfix`'s Phase pre anchor pre-flight resolves it (by branch) and pins the
  Debugger/Builder/Validator to the fix branch — **zero new code needed**.
- `/agent-orch:make-validate` operates on the fix branch unchanged (it works off `gh pr view`
  for the current branch).
- `/agent-orch:make-clean` auto-detects the branch and cleans it up normally, like any feature
  branch — the branch name carries **no** special prefix (no `fix/`, no `release/`), so it is
  deleted on merge like any other.

> **Known interaction**: `/make-clean`, unchanged, may still set a Jira `fixVersion` at merge
> time (its Phase 3.5 "Ensure version fields are set" step). That is `/make-clean`'s own
> behaviour and is out of scope for `/make-bug` — `/make-bug` itself never sets a version.

## Prerequisites

- Must be in a git repository
- Must NOT already be in a worktree from a previous session
- If on a non-default branch, must have a clean working tree (branch mode creates a new branch from the default branch)
- `gh` CLI must be authenticated (`gh auth status`)
- A remote named `origin` must exist
- For Jira integration: `.claude/rules/jira.md` must exist (run `/agent-orch:jira` first)

## Phase Map (what the user sees)

`/make-bug` has 6 user-visible phases. At the START of every phase, print a banner
to the user so they always know where we are. Use this exact format:

```
═══════════════════════════════════════════════════════
/make-bug phase <N>/6: <phase name>
<one-line description of what happens in this phase>
═══════════════════════════════════════════════════════
```

Phase names (in order):

| N | Phase name                         | What happens                                              |
|---|------------------------------------|-----------------------------------------------------------|
| 0 | Jira mode + resolve issue          | Read `.make-config.md`, find/create the Jira issue        |
| 1 | Validate environment + sync main   | Checks, `git pull`, prepare base                          |
| 2 | Create worktree or feature branch  | Ask mode, create branch, write session state file         |
| 3 | Run /bugfix                        | Scaffold STATUS.md sink, hand off to `/agent-orch:bugfix` |
| 4 | Commit and push                    | Stage, commit (`fix:`), sync wiki from source (if any), push |
| 5 | Create PR + update Jira            | `gh pr create`, transition Jira to In Review              |
| 6 | Summary                            | Present final result to user                              |

Within a phase, if a step takes noticeable time or is non-obvious, print a
short single-line status update before it runs (e.g., "Syncing with origin…",
"Writing session state…"). Never stay silent for more than one tool call.

## Process

### Phase 0: Jira Mode Configuration

**Print phase banner** (see Phase Map):
```
═══════════════════════════════════════════════════════
/make-bug phase 0/6: Jira mode + resolve issue
Reading .make-config.md and finding or creating the Jira issue for this bug fix.
═══════════════════════════════════════════════════════
```

**Goal**: Determine whether this project uses Jira with `/make-bug`.

`/make-bug` shares `.make-config.md` with `/make` — the same `jira_mode` setting drives both.

1. **Check for `.make-config.md` in repo root:**

   **If file exists**: Read the `jira_mode` value and proceed to Phase 0.5.

   **If file does NOT exist** (first time):
   ```
   Welcome to /agent-orch:make-bug! One-time setup question:

   How should the /make family handle Jira integration?

   (a) Yes -- always require a Jira issue (recommended for teams)
       Every session will be tracked in Jira. You can still opt out per-session.
   (b) No -- never use Jira
       /make-bug works purely with git/GitHub, no Jira tracking.
   (c) Ask me -- prompt each time
       Each session asks whether to use Jira. Includes "skip Jira" option.

   This is stored in .make-config.md and can be changed anytime.
   ```

   Create `.make-config.md` based on the user's choice:

   ```markdown
   # Make Configuration
   
   ## Jira Integration
   
   <!-- Change this value to: yes, no, or ask-me -->
   jira_mode: [yes|no|ask-me]
   
   ## How to Change
   
   Edit the `jira_mode` line above:
   - `yes` -- always require a Jira issue (you can opt out per-session)
   - `no` -- never use Jira
   - `ask-me` -- prompt each time (includes "skip Jira" option)
   
   ## Jira Prerequisites
   
   When jira_mode is `yes` or `ask-me`, ensure:
   1. MCP server is running: `/agent-orch:mcp-start`
   2. Jira context is cached: `/agent-orch:jira`
   3. `.claude/rules/jira.md` exists with project metadata
   ```

### Phase 0.5: Resolve Tracker Issue

**Goal**: Find, search, or create the tracker issue for this bug fix.

**Resolve the active tracker** per `plugins/agent-orch/rules/tracker-provider.md` §1:
`.claude/ssnc-agent-orch/tracker.yaml` → `.make-config.md` `tracker:` → `jira_mode:`
back-compat → default `jira`.

- **If tracker is `none`** (or `jira_mode: no`): Skip to Phase 1. No tracker integration.
- **If tracker is `github`**: Use the GitHub backend. Require `.claude/rules/github.md`
  (else: "GitHub context not found. Run `/agent-orch:github-issues` first." Exit). Run the
  SAME find/search/create flow below, but substitute the normalized verbs (`get_issue`,
  `list_agent_ready`, `create_issue`, `assign`, `set_status`, `link`) with their `gh`
  mappings from `tracker-provider.md` §3b (run with `GH_HOST=code.ssnc.dev`). Issue IDs are
  `#123`, not `PROJ-123`. Status moves use the `labels` model (§4) unless
  `github-workflow.yaml` overrides it. When creating a new issue, apply the `bug` label /
  issue-type per the GitHub backend. Everything else in this phase is unchanged.
- **If tracker is `jira`** (the default): continue exactly as below.

**Read `jira_mode` from `.make-config.md`** (applies when tracker is `jira`).

**If `jira_mode: no`**: Skip to Phase 1. No Jira integration.

**If `jira_mode: yes` or `jira_mode: ask-me`**:

#### Step 1: Check Jira Prerequisites

Read `.claude/rules/jira.md`:
- If not found: "Jira context not found. Run `/agent-orch:jira` first." Exit.
- Extract: project key, issue type IDs (including the **Bug** type ID), transition IDs, custom field IDs.

**Pluggable Jira workflow (optional)**: If `.claude/ssnc-agent-orch/jira-workflow.yaml` exists and `jira.enabled` is set, use its `transitions`/`fields`/`lifecycle` values in place of the hard-coded IDs from `jira.md` (falling back to `jira.md` for any key it doesn't specify). When lifecycle hooks (`on_start`/`on_review`/`on_done`) are defined, run their targets at the matching lifecycle events per `plugins/agent-orch/rules/extension-resolver.md`. If absent, use the current flow (read `jira.md` values). Zero behaviour change by default. See `plugins/agent-orch/rules/extensibility.md` §4 for full protocol.

> **Current user is resolved LIVE, never from `jira.md`.** Any operation that
> needs "who am I" (assignee, engineer attribution) MUST call
> `mcp__jira__jira_getCurrentUser` at runtime and use its `accountId` /
> `displayName`. Do NOT read a cached user/email out of `jira.md` — that value
> reflects whoever last ran `/agent-orch:jira`, which may not be the person
> running `/make-bug` now. Cache the live result once per session and reuse it.

#### Step 2: Detect JIRA-ID in Arguments

Check if `$ARGUMENTS` contains a pattern matching `[A-Z]+-\d+` (e.g., `PROJ-123`).

**If JIRA-ID found in arguments:**
- Extract the JIRA-ID
- Extract the remaining text as the bug description (if any)
- Fetch the issue: `mcp__jira__jira_getIssue` with issueKey
- If issue not found: report error and ask user to verify
- Present the issue summary and proceed to Step 5

**If NO JIRA-ID found in arguments:**

**If `jira_mode: ask-me`**: Present options including skip:
```
No Jira issue detected in your bug report.

(a) I have a Jira issue key -- let me type it
(b) Search Jira using my description: "<first 60 chars of $ARGUMENTS>"
(c) Search Jira with different criteria
(d) Create a new Jira Bug for this fix
(e) Skip Jira for this session -- no tracking
```

**If `jira_mode: yes`**: Same options but WITHOUT option (e):
```
No Jira issue detected in your bug report.
(Jira mode is "yes" -- every session needs a Jira issue. Edit .make-config.md to change.)

(a) I have a Jira issue key -- let me type it
(b) Search Jira using my description: "<first 60 chars of $ARGUMENTS>"
(c) Search Jira with different criteria
(d) Create a new Jira Bug for this fix
```

**Option (a): User provides key**
- Ask for the key, fetch with `mcp__jira__jira_getIssue`
- If not found, ask again

**Option (b): Search by description**
```
mcp__jira__jira_searchIssues with:
  jql: "project = [KEY] AND text ~ \"<keywords from description>\" AND status != Done ORDER BY updated DESC"
  maxResults: 10
```
- Present results as numbered list with key, summary, status, assignee
- User picks one, or: "None of these -- try different search" / "Create new"
- If "try different search": go to Option (c)
- If "Create new": go to Option (d)

**Option (c): Custom search**
- Ask user for search terms or JQL criteria
- Run search, present results
- Loop until user picks one or chooses to create new

**Option (d): Create new Jira Bug**
See [Create New Jira Bug](#create-new-jira-bug) below.

**Option (e): Skip Jira (ask-me mode only)**
- Set `JIRA_ISSUE=none`
- Skip to Phase 1

#### Step 3: Create New Jira Bug

When user chooses to create a new Jira issue:

1. **Find or search for parent Epic (optional):**
   ```
   New issues can be linked to an Epic. How do you want to find it?

   (a) Search Epics by description: "<keywords from $ARGUMENTS>"
   (b) Search Epics with different criteria
   (c) I have an Epic key -- let me type it
   (d) Skip Epic -- create a standalone Bug
   ```

   **Search Epics:**
   ```
   mcp__jira__jira_searchIssues with:
     jql: "project = [KEY] AND issuetype = Epic AND status != Done AND text ~ \"<keywords>\" ORDER BY updated DESC"
     maxResults: 10
   ```
   Present results, user picks or skips. Epic linkage is optional for a bug — skipping is fine.

2. **Generate issue summary from the bug report:**
   - Take `$ARGUMENTS` (minus any JIRA-ID if present)
   - Suggest a concise summary (under 80 chars) describing the defect
   - Ask user to confirm or edit

3. **Create the issue as a Bug:**
   ```
   mcp__jira__jira_createIssue with:
     projectKey: "[KEY from jira.md]"
     summary: "<confirmed summary>"
     issueType: "[Bug type ID from jira.md]"
     description: "Created by /agent-orch:make-bug\n\nBug report: <$ARGUMENTS>"
     customFields: { "labels": ["claude-code-agent-harness"] }
   ```
   **Issue type is Bug**, not Story. If the project has no Bug type, fall back to the closest
   defect type available in `jira.md` (e.g. Defect) and note the substitution.

4. **Link to Epic (only if one was selected):**
   ```
   mcp__jira__jira_linkIssues with:
     inwardIssueKey: "<new-issue-key>"
     outwardIssueKey: "<epic-key>"
     linkType: "Epic-Story" or the appropriate link type from jira.md
   ```

5. **Report:**
   ```
   Created: <NEW-KEY> - <summary> (Bug)
   Epic: <EPIC-KEY> (or "standalone")
   ```

#### Step 4: (skipped -- folded into Step 2 flow)

#### Step 5: Prepare Jira Issue for Session

Once we have a JIRA-ID (from detection, search, or creation):

1. **Ensure `claude-code-agent-harness` label exists:**
   ```
   mcp__jira__jira_getIssue with issueKey
   ```
   If label not present:
   ```
   mcp__jira__jira_updateIssue with:
     issueKey: "<JIRA-ID>"
     fields: { "labels": [<existing-labels>, "claude-code-agent-harness"] }
   ```

2. **Assign to the current user (resolved live):**

   First resolve who is running `/make-bug` right now — do NOT use any user/email
   cached in `jira.md`:
   ```
   mcp__jira__jira_getCurrentUser   # → { accountId, displayName, emailAddress }
   ```
   Cache `CURRENT_USER_ACCOUNT_ID` and `CURRENT_USER_DISPLAY_NAME` from the
   result for the rest of this session. Then assign:
   ```
   mcp__jira__jira_assignIssue with:
     issueKey: "<JIRA-ID>"
     accountId: "<CURRENT_USER_ACCOUNT_ID from getCurrentUser>"
   ```

3. **Set start date:**
   ```
   mcp__jira__jira_updateIssue with:
     issueKey: "<JIRA-ID>"
     fields: { "customfield_XXXXX": "<today YYYY-MM-DD>" }
   ```
   Use the start date field ID from jira.md. If not available, skip with a note.

   > **No version fields.** Unlike `/make`, `/make-bug` does **not** set `versions`
   > (affects version) or `fixVersions`. A bug fix rides whatever release is next; it does
   > not pin a fix version at diagnosis time. Skip that step entirely. (If your workflow
   > needs a fix version recorded, `/make-clean` sets one at merge time — see the Known
   > interaction note above.)

4. **Transition to In Progress:**
   ```
   mcp__jira__jira_transitionIssue with:
     issueKey: "<JIRA-ID>"
     transitionId: "[In Progress transition ID from jira.md]"
   ```

5. **Post session start comment:**
   ```
   mcp__jira__jira_postIssueComment with:
     issueKey: "<JIRA-ID>"
     body: "Agent-assisted /make-bug session started.
     
     Engineer: <CURRENT_USER_DISPLAY_NAME from getCurrentUser>
     Bug report: <$ARGUMENTS>
     
     Root-cause diagnosis and fix in progress. Progress will be tracked here."
   ```

6. **Store for later phases:**
   Set `JIRA_ISSUE=<JIRA-ID>` for use in Phase 3 and Phase 5.

### Phase 1: Validate Environment

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make-bug phase 1/6: Validate environment + sync main
Checking git repo, gh auth, worktree state, then pulling latest on the default branch.
═══════════════════════════════════════════════════════
```

1. Verify not already in a worktree:
   ```bash
   git worktree list
   ```
   If current directory is inside `.claude/worktrees/`, stop:
   ```
   You are already in a worktree. Use /agent-orch:bugfix to iterate here,
   or /agent-orch:make-clean to finish and return to main.
   ```

2. Verify `gh` is authenticated:
   ```bash
   gh auth status
   ```
   If not authenticated:
   ```
   GitHub CLI is not authenticated. Run `gh auth login` first.
   ```

3. Verify `$ARGUMENTS` is not empty. If empty:
   ```
   Usage: /agent-orch:make-bug <bug description|JIRA-ID|issue-URL>

   Examples:
     /agent-orch:make-bug Login fails with 500 when the email contains a plus sign
     /agent-orch:make-bug PROJ-123
     /agent-orch:make-bug PROJ-123 Timezone off by one on the daily summary export

   The argument describes the bug (symptom / repro). It will be passed to /agent-orch:bugfix.
   ```

### Phase 1.5: Sync Main

1. **Ensure we are on the default branch:**
   ```bash
   DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main")
   CURRENT_BRANCH=$(git branch --show-current)
   ```
   If not on the default branch:
   ```bash
   git checkout $DEFAULT_BRANCH
   ```

2. **Pull latest from remote:**
   ```bash
   git pull
   ```
   This ensures the worktree is based on the latest main, not a stale local copy.

### Phase 2: Create Branch (Worktree or Feature Branch)

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make-bug phase 2/6: Create worktree or feature branch
Picking isolation mode, creating the branch, and writing the session state file
that every orchestrated agent reads to stay anchored.
═══════════════════════════════════════════════════════
```

1. **Ask the user which mode to use:**
   ```
   How should I set up this bug fix?

   (a) Worktree -- isolated checkout in .claude/worktrees/ (multiple fixes in parallel)
   (b) Feature branch -- new branch in the current working tree (simpler, one fix at a time)
   ```

   Capture the choice as `BRANCH_MODE` (`worktree` or `branch`).

2. **Derive a branch name** (identical scheme to `/make` — no special prefix):

   **If JIRA issue resolved**: Use the Jira summary:
   - Prefix with issue key: `PROJ-123-login-500-on-plus-in-email`
   - Slugify the summary, truncate to 50 chars

   **If no Jira**: Slugify `$ARGUMENTS`:
   - Take the first 5-8 significant words (drop articles, prepositions)
   - Convert to lowercase, replace spaces with hyphens
   - Remove special characters except hyphens
   - Truncate to 50 characters max

   > **No `fix/` (or any) prefix.** The branch is named exactly like a `/make` feature branch
   > so that `/make-clean` treats it as an ordinary branch and deletes it on merge. Do NOT add
   > `fix/`, `bug/`, or `release/`.

3. **Confirm with user:**
   ```
   Branch name: proj-123-login-500-on-plus-in-email

   (a) Use this name
   (b) Let me type a different name
   ```

4. **Create the branch based on `BRANCH_MODE`:**

   **If `BRANCH_MODE == worktree`:**
   Use the `EnterWorktree` tool:
   ```
   EnterWorktree:
     name: "<branch-name>"
   ```

   **If `BRANCH_MODE == branch`:**
   Check for uncommitted changes first:
   ```bash
   git status --porcelain
   ```
   If there are uncommitted changes:
   ```
   You have uncommitted changes on the default branch:
   <list of changed files>

   Feature-branch mode requires a clean tree. Options:
   (a) Stash changes and continue (git stash)
   (b) Cancel -- I'll handle these first
   (c) Switch to worktree mode instead (keeps your changes untouched)
   ```
   Then create and switch to the new branch:
   ```bash
   git checkout -b <branch-name>
   ```

5. **Write the per-Claude session state file** (REQUIRED — this is what
   enforces worktree/branch context for every downstream agent, per
   `plugins/agent-orch/rules/worktree-context.md`):

   This is the **exact same session-state format `/make` writes** (version 2). The only
   difference is `invoking_skill`. Because `/bugfix`'s Phase pre anchor pre-flight,
   `/make-validate`, and `/make-clean` all resolve `.make-session-*.json` by branch, writing
   it here means those skills anchor to the fix branch with **zero new code**.

   Each Claude session writes its OWN session file, named by UTC timestamp +
   process id, so multiple Claudes running `/make` / `/make-bug` in parallel on the same
   repo never collide. (Earlier versions used a single shared file at
   `.claude/.make-session.json` — that's the v1 layout this scheme replaces.)

   Tell the user: "Writing per-Claude session state so /bugfix and all agents stay anchored here…"

   Resolve the paths and identifiers:
   ```bash
   REPO_ROOT=$(git rev-parse --show-toplevel)
   # In worktree mode, the worktree was just created by EnterWorktree and the
   # session's cwd is already inside it; capture that path:
   WORKTREE_PATH=$(pwd)
   # In feature-branch mode, the branch was created in place:
   # WORKTREE_PATH == REPO_ROOT

   # Session uniqueness: UTC timestamp (compact) + process id
   UTC_TS=$(date -u +"%Y%m%dT%H%M%SZ")
   PID=$$
   SESSION_ID="${UTC_TS}-${PID}"
   SESSION_FILE="${REPO_ROOT}/.claude/.make-session-${SESSION_ID}.json"
   ```

   The primary repo root is the value returned by `git rev-parse --show-toplevel`
   run from the primary checkout before the worktree was entered, OR the
   `repo_root` read from `git worktree list` (the first entry is always the
   primary). The session file MUST live at the PRIMARY repo's `.claude/`
   directory (not inside the worktree's `.claude/`).

   Write `${SESSION_FILE}` using the Write tool with this exact JSON shape (v2 — identical to
   `/make`, except `invoking_skill`):
   ```json
   {
     "version": 2,
     "session_id": "<SESSION_ID>",
     "mode": "<worktree|branch>",
     "branch": "<branch-name>",
     "worktree_path": "<WORKTREE_PATH>",
     "repo_root": "<REPO_ROOT>",
     "jira_key": "<JIRA-ID or null>",
     "started_at": "<UTC ISO-8601 timestamp, e.g., 2026-05-26T19:17:49Z>",
     "invoking_skill": "/agent-orch:make-bug",
     "claude_pid": <PID as integer>
   }
   ```

   **Export the session-file path as a same-session hint:**
   ```bash
   export MAKE_SESSION_FILE="${SESSION_FILE}"
   ```
   This is a convenience hint for later steps in THIS Claude session only.

   > **Do NOT rely on this env var to anchor subagents.** An `export` in one
   > Bash tool call does not survive into later Bash calls (each runs in a
   > fresh shell) and is NOT inherited by spawned Task/Agent subagents (they
   > are separate processes). The real anchoring happens two ways, neither of
   > which depends on inherited env:
   >
   > 1. **Mechanical (hard gate):** the `guard-worktree-writes` PreToolUse hook
   >    discovers the active worktree session from disk on every Write/Edit/Bash
   >    and hard-blocks (exit 2) any write that lands in the primary tree. See
   >    `plugins/agent-orch/rules/worktree-context.md` → "Mechanical enforcement".
   > 2. **Instructional:** `/bugfix` reads the session file from disk (env-var
   >    hint → branch discovery → legacy → cwd) and prepends an explicit
   >    `[worktree-context]` block to every subagent prompt.
   >
   > The per-Claude session FILE on disk — not the env var — is what keeps each
   > Claude pinned to its own session when multiple `/make` / `/make-bug` runs share a repo.

   **Concurrency check** — list any existing session files in `<REPO_ROOT>/.claude/`:
   ```bash
   ls "${REPO_ROOT}/.claude/.make-session-"*.json 2>/dev/null
   ```
   This is informational only; presence of other Claudes' session files is
   normal and EXPECTED — that's the whole point of per-Claude files. Do NOT
   warn or prompt the user about them.

   **Legacy file cleanup** — if `<REPO_ROOT>/.claude/.make-session.json` (the
   v1 single-file path) exists, leave it alone (it may belong to an older
   session that hasn't been cleaned). It will be ignored by v2 readers when a
   v2 file matches the current branch.

   Confirm to user:
   ```
   Session state written: <SESSION_FILE>
   Session ID: <SESSION_ID>
   All orchestrated agents will anchor to: <WORKTREE_PATH>
   Enforcement: guard-worktree-writes hook will hard-block any write to the
   primary tree while this worktree session is active.
   ```

6. **Confirm to user:**

   **If worktree:**
   ```
   Worktree created and entered.
   Branch: <branch-name>
   Mode: worktree
   [If Jira]: Jira: <JIRA-ID> - <summary> (In Progress)

   Starting diagnosis...
   ```

   **If branch:**
   ```
   Feature branch created and checked out.
   Branch: <branch-name>
   Mode: branch (in-place)
   [If Jira]: Jira: <JIRA-ID> - <summary> (In Progress)

   Starting diagnosis...
   ```

### Phase 3: Run Bugfix

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make-bug phase 3/6: Run /bugfix
Scaffolding the session STATUS.md sink, then handing off to /agent-orch:bugfix.
/bugfix runs its own phases (pre through 4) and stays anchored to this worktree.
═══════════════════════════════════════════════════════
```

> **No version bump.** Unlike `/make` Phase 3, `/make-bug` does **not** compute a next minor
> version and does **not** pass any version-bump instruction to the implementation phase. A bug
> fix rides whatever release is next. There is no `NEXT_MINOR` here — skip that step entirely.

#### Step 1: Scaffold the session artifact directory and STATUS.md sink

**CRITICAL — this is the gap `/make-bug` fills that `/make` doesn't.** When `/make` runs
`/build`, `/build` creates the date-tree session directory and its `STATUS.md`. But `/make-bug`
runs `/bugfix`, and **`/bugfix` does NOT create that session tree itself** — its Debugger,
Builder, and Validator all "append to the session STATUS.md" and assume it already exists. So
`/make-bug` MUST create the session artifact directory and an empty `STATUS.md` sink here,
**before** invoking `/bugfix`, mirroring `/build`'s convention, and pass the STATUS.md path into
the `/bugfix` invocation.

Tell the user: "Scaffolding the bug-fix session directory and STATUS.md sink for the Debugger/Builder/Validator…"

1. **Ensure the `ssnc-agent-orch/` root exists** (create it and its `README.md` once, exactly as
   `/build` does):
   ```bash
   mkdir -p ssnc-agent-orch
   ```
   If `ssnc-agent-orch/README.md` does **not** yet exist, **Write** it now using the exact
   template `/build` uses — see `/agent-orch:build` SKILL.md, the "README.md template (created
   once)" block under "File Structure Used". Do not leave this as a comment; write the file so the
   `ssnc-agent-orch/` root carries the same README `/build` guarantees. If it already exists, leave
   it untouched.

2. **Create the date-tree session directory** (v2 layout, identical to `/build`). Reuse the
   Phase 2 branch slug as the session name so the branch and the artifacts line up:
   ```bash
   YYYY=$(date +%Y); MM=$(date +%m); DD=$(date +%d)
   SLUG="<branch slug from Phase 2, minus any leading JIRA-key prefix>"
   SESSION_DIR="ssnc-agent-orch/${YYYY}/${MM}/${DD}/${SLUG}"
   # If it already exists, append -2, -3, … just like /build
   mkdir -p "${SESSION_DIR}"
   ```

3. **Write the empty `STATUS.md` sink** at `${SESSION_DIR}/STATUS.md` using the Write tool. This
   is the single sink the Debugger/Builder/Validator append to under their own
   `## <Agent> Findings` headers (per `/bugfix` "Single sink"):
   ```markdown
   # Bug Fix Status

   - **Session**: <SESSION_DIR>
   - **Bug**: <one-line bug statement from $ARGUMENTS>
   - **Jira**: <JIRA-ID or "(none)">
   - **Started**: <UTC ISO-8601 timestamp>
   - **Invoked via**: /agent-orch:make-bug → /agent-orch:bugfix

   <!-- Single sink. /bugfix's agents append below, each under its own header:
        "## Debugger Findings", "## Builder Findings", "## Validator Findings".
        No side-files. -->
   ```

4. **Write the provenance `prompt.md`** at `${SESSION_DIR}/prompt.md` — replicate the minimal
   provenance `/build` writes (see `/agent-orch:build` SKILL.md Phase 1 Step 5.5) so the session
   is auditable. `/make-bug` writes it here because `/bugfix` won't:
   ```markdown
   # Session Provenance

   ## Metadata
   - **Session**: <SESSION_DIR name>
   - **Started**: <UTC ISO-8601 timestamp>
   - **Invoking skill**: /agent-orch:make-bug → /agent-orch:bugfix
   - **Branch**: <branch-name>
   - **Worktree**: <absolute WORKTREE_PATH>
   - **Jira**: <JIRA-ID or "(none)">

   ## Original Bug Report

   Verbatim arguments passed to /make-bug (minus any extracted JIRA-ID):

   ```
   <$ARGUMENTS>
   ```

   [If Phase 0.5 resolved a Jira issue, append a "### Jira Context (<JIRA-ID>)" block here
    with summary, type, priority, status-at-start, labels, and the verbatim description —
    same shape as /build Step 5.5a.]

   ## Diagnosis & Fix

   Recorded by /agent-orch:bugfix in STATUS.md under the Debugger / Builder / Validator
   Findings headers. See STATUS.md for the confirmed root cause, the source-level fix, and
   the regression-test evidence.
   ```

   Confirm to user:
   ```
   Session scaffolded: <SESSION_DIR>
     STATUS.md  — single sink for Debugger/Builder/Validator findings
     prompt.md  — provenance (bug report + Jira context)
   ```

#### Step 2: Invoke `/agent-orch:bugfix` with the bug report and the STATUS.md sink

Use the **Skill tool**. Pass the JIRA-ID (if any) + the bug description, and — critically —
the STATUS.md path so the Debugger/Builder/Validator have their sink. Do **NOT** append any
version-bump instruction.

**If JIRA issue resolved**: Pass the JIRA-ID so `/bugfix`'s Phase 0 uses it for context — but tell
it the issue is **already prepped** so it does not re-transition or double-comment:
```
Skill tool call:
  skill: "agent-orch:bugfix"
  args: "<JIRA-ID> <remaining bug description text>. The Jira issue has already been assigned, transitioned to In Progress, and commented by /make-bug — use it for context only; do NOT re-transition it or post another session-start comment. Write all Debugger, Builder, and Validator findings to the session STATUS.md at <SESSION_DIR>/STATUS.md (create the ## <Agent> Findings sections there — the file already exists)."
```

**If no Jira**: Pass the original bug report:
```
Skill tool call:
  skill: "agent-orch:bugfix"
  args: "<the original $ARGUMENTS minus any JIRA-ID already extracted>. Write all Debugger, Builder, and Validator findings to the session STATUS.md at <SESSION_DIR>/STATUS.md (create the ## <Agent> Findings sections there — the file already exists)."
```

`/bugfix` runs its own phases — **pre** (worktree/branch anchor pre-flight, which resolves the
same `.make-session-*.json` we wrote in Phase 2 by branch), **0** (intake), **1** (Debugger root
cause + failing regression test), **2** (Builder source-level fix), **3** (Validator
verification), **4** (finalize). Its Phase 4 is written to **hand back** the PR lifecycle when
invoked under `/make` — but do not depend on it detecting the caller: `/make-bug` owns commit,
push, and PR regardless (see the CRITICAL note below).

Wait for `/agent-orch:bugfix` to complete its full lifecycle.

**CRITICAL** (mirror `/make`): When `/bugfix` reaches its Phase 4 (Finalize), it offers an
*optional commit* and a "what next" hand-off. **Do NOT let the user pick from `/bugfix`'s own
end menu, and do NOT accept its optional-commit offer** — `/make-bug` takes over for commit,
push, and PR. Proceed directly to Phase 4 below.

Tell the user:
```
Diagnosis and fix complete. Now committing, pushing, and creating PR...
```

**If `/bugfix` could not finish** — surface it, do **not** force a PR:
- **Debugger cannot reproduce or find a root cause**: `/bugfix` Phase 1 surfaces this instead of
  guessing a fix. Relay it to the user and stop — there is nothing to commit. Do not open a PR.
- **3 fix attempts failed**: `/bugfix` Phase 2 escalates to the Architect for a design review and
  pauses for direction. Relay the escalation and pause — do not loop, do not open a PR.

### Phase 4: Commit and Push

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make-bug phase 4/6: Commit and push
Staging, committing (fix:), syncing the wiki from source (if one exists), then pushing to origin.
═══════════════════════════════════════════════════════
```

**Extensibility hook: `before_commit`**

Before staging any changes, check `.claude/ssnc-agent-orch/skills.yaml` for `skills.make-bug.before_commit` targets. If present, run each target per `plugins/agent-orch/rules/extension-resolver.md` (scripts, markdown, `/loop` refs, or skills). These run after `/bugfix` completes but before `git add` in step 2 below. If absent, continue normally. Zero behaviour change by default.

1. **Check for changes:**
   ```bash
   git status --porcelain
   ```
   If no changes:
   ```
   No changes were produced by the fix. Nothing to commit or push.

   You can run /agent-orch:bugfix again to iterate, or /agent-orch:make-clean to clean up.
   ```
   Stop here.

2. **Stage all changes:**
   ```bash
   git add -A
   ```

3. **Generate a fix-flavoured commit message** from the `/bugfix` findings (source it from the
   session `STATUS.md`, NOT a PLAN.md — a bug fix has no feature plan):
   - **Resolve the findings sink.** The handoff to `/bugfix` is best-effort (the path is passed in
     the Skill args, but `/bugfix` has no formal step that binds it), so verify the sink actually
     received content and fall back if not:
     ```bash
     STATUS="${SESSION_DIR}/STATUS.md"
     # If our scaffolded sink is missing or has no agent Findings, fall back to the
     # newest STATUS.md anywhere under ssnc-agent-orch/ (where /bugfix may have written).
     if [ ! -s "$STATUS" ] || ! grep -q "## .* Findings" "$STATUS" 2>/dev/null; then
       ALT=$(ls -t ssnc-agent-orch/**/STATUS.md ssnc-agent-orch/*/STATUS.md 2>/dev/null | head -1)
       [ -n "$ALT" ] && grep -q "## .* Findings" "$ALT" 2>/dev/null && STATUS="$ALT"
     fi
     ```
     If neither has agent Findings, generate the message from what `/bugfix` reported to you in
     conversation (root cause + fix + test) rather than an empty file, and note the sink was empty.
   - Read `${STATUS}` `## Debugger Findings` for the root cause
   - Read `## Builder Findings` for the fix (file:line) and `## Validator Findings` for the
     regression test + verification evidence
   - Create a conventional **`fix:`** commit message (not `feat:`):
     ```
     fix: <short description of the defect / root cause>

     - Root cause: <one line from Debugger Findings>
     - Fix: <one line from Builder Findings — where and why at the source>
     - Regression test: <path from Validator Findings> (was RED, now GREEN)

     [If Jira]: <JIRA-ID>
     Fixed with /agent-orch:make-bug
     ```

4. **Commit:**
   ```bash
   git commit -m "<generated message>"
   ```

   > **AI-commit governance**: if this repo enforces the `validate-ai-commit.sh` hook, the fix
   > commit must carry the `Co-authored-by: Claude ...` trailer and stay separate from
   > human-authored changes, per the
   > [ai-code-governance policy](../../policies/ai-code-governance.md). `/bugfix` follows the same
   > rule when it makes its own optional commit — but here `/make-bug` owns the commit.

4.5. **Sync the wiki from source (only if a wiki is initialized):**

   After the fix is committed, keep the team-work knowledge wiki in
   lockstep with the code. This runs **only** when a wiki exists, and it commits
   onto the branch we're already on (no worktree, no separate PR) before we push.

   - **Gate**: check for `.team-work/wiki-config.md`.
     ```bash
     test -f .team-work/wiki-config.md && echo "wiki present" || echo "no wiki"
     ```
     If absent, **skip this step silently** and go to step 5. The wiki sync is
     purely additive — never block or fail the `/make-bug` run because there's no wiki.

   - **If present**, invoke `/team-work:wiki-source-branch` via the **Skill tool**.
     It generates/updates `docs/c4/`, writes `docs/wiki/domain/` +
     `docs/wiki/technical/`, and ingests the repo's markdown into the wiki —
     all over the whole repo, committed in place on this branch:
     ```
     Skill tool call:
       skill: "team-work:wiki-source-branch"
       args: ""
     ```
     (`/wiki-source-branch` no-ops cleanly if anything is missing, so this is
     safe to call unconditionally once the gate passes. It commits the generated
     docs itself and returns control here.)

   - **After it returns**, stage and commit anything it left uncommitted (defensive —
     it normally commits its own docs, but the code-side commit message should own
     any stragglers), guarding against an empty commit:
     ```bash
     git add -A
     git diff --cached --quiet || git commit -m "docs: sync wiki from source (/wiki-source-branch)"
     ```
     Tell the user: "Wiki synced from source and committed; continuing to push…"

   - **On any wiki-sync error**, do **not** abort `/make-bug` — report it and continue
     to step 5 with the fix commit intact:
     ```
     Wiki sync hit a problem: <error>. The fix commit is safe; continuing to push.
     Re-run /team-work:wiki-source-branch later to sync the wiki.
     ```

5. **Push branch to origin:**
   ```bash
   git push -u origin <branch-name>
   ```

   **If push fails** (e.g., no push access, remote issues):
   ```
   Push failed: <error>

   Changes are committed locally on branch <branch-name>.
   Fix the issue and run: git push -u origin <branch-name>
   Then create a PR with: gh pr create
   ```
   Stop here.

**Extensibility hook: `before_pr`**

After `git push` completes and before running `gh pr create` in Phase 5 below, check `.claude/ssnc-agent-orch/skills.yaml` for `skills.make-bug.before_pr` targets. If present, run each target per `plugins/agent-orch/rules/extension-resolver.md`. Loops, markdown, and skills can run before the PR, and commits/pushes can happen here (after the main push in step 5, before the `gh pr create` in Phase 5). If absent, continue normally. Zero behaviour change by default.

**Git workflow offload (optional)**: If `.claude/ssnc-agent-orch/git-workflow.yaml` exists and defines `git.steps.before_pr`, shallow-clone `source@ref` to `.claude/ssnc-agent-orch/.cache/<repo>@<ref>/` (reusing cache if already cloned this session) and run those steps from the cache. Ask the user to confirm the source/ref and step list before the first clone in a session (unless auto-approved permission mode). See `plugins/agent-orch/rules/extensibility.md` §5 for full clone-and-run protocol. If absent, continue with the inline hook check above.

### Phase 5: Create PR

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make-bug phase 5/6: Create PR + update Jira
Opening the pull request and transitioning the Jira issue to In Review.
═══════════════════════════════════════════════════════
```

1. **Determine the default branch:**
   ```bash
   gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
   ```

2. **Generate PR title and body** from the `/bugfix` findings in the sink resolved in Phase 4
   (`${STATUS}` — the scaffolded `${SESSION_DIR}/STATUS.md`, or the glob fallback if that was
   empty), covering root cause / fix / regression test — NOT a feature plan:
   - **Title**: `[JIRA-ID] fix: <short summary>` (under 70 characters) or just `fix: <short summary>` if no Jira
   - **Body**: Structured summary using this fix-flavoured format:

   ```markdown
   ## Summary
   <1-2 sentences: what was broken and the source-level fix, from STATUS.md>

   [If Jira]:
   ## Jira
   [<JIRA-ID>](<jira-browse-url>/<JIRA-ID>)

   ## Root Cause
   <from ## Debugger Findings — the real cause, not the symptom>

   ## Fix
   <from ## Builder Findings — key files/lines changed and why it's at the source>

   ## Regression Test
   <from ## Validator Findings — test path, RED→GREEN evidence, pass/fail counts>

   ---
   Fixed with `/agent-orch:make-bug` using multi-agent root-cause diagnosis.
   ```

3. **Create the PR:**
   ```bash
   gh pr create --base <default-branch> --title "<title>" --body "<body>"
   ```

4. **Capture the PR URL:**
   ```bash
   PR_URL=$(gh pr view --json url --jq '.url')
   ```

**Extensibility hook: `after_pr`**

After the PR is created (step 3 above), check `.claude/ssnc-agent-orch/skills.yaml` for `skills.make-bug.after_pr` targets. If present, run each target per `plugins/agent-orch/rules/extension-resolver.md`. If absent, continue normally. Zero behaviour change by default.

**Git workflow offload (optional)**: If `.claude/ssnc-agent-orch/git-workflow.yaml` exists and defines `git.steps.after_pr`, run those steps from the clone cache (same clone protocol as `before_pr` above). If absent, continue with the inline hook check above.

### Phase 5.5: Work Plan Update

**If JIRA_ISSUE is set (not "none"):**

Check if the Jira issue appears in any work plan markdown:

```bash
grep -rl "$JIRA_ISSUE" planning/*.md 2>/dev/null
```

**If a work plan file contains the JIRA_ISSUE key:**

1. **Update the item's status** in the work plan table from `todo` or `in-progress` to `in-review`:
   - Find the table row containing the Jira issue link (e.g., `[RCONAI-259](...)`)
   - Change the Status column value to `in-review`
   - Use the Edit tool to make this change

2. **Add changelog entry:**
   ```
   - <YYYY-MM-DD>: <JIRA_ISSUE> moved to in-review (fix PR created via /make-bug)
   ```

3. **Commit and push the plan update** (included in the Phase 4 commit, or as a follow-up):
   ```bash
   git add planning/
   git commit -m "planning: update <JIRA_ISSUE> status to in-review"
   git push
   ```

   If not on the plan branch (work plans live on their own branch), skip the commit with a note:
   ```
   Work plan updated locally. Push to the plan branch to sync.
   ```

### Phase 5.6: Jira Post-PR Updates

**If JIRA_ISSUE is set (not "none"):**

**Pluggable Jira workflow**: If `.claude/ssnc-agent-orch/jira-workflow.yaml` exists, use its `transitions.in_review` value (or other overrides) in place of the hard-coded ID. If it defines `lifecycle.on_review` targets, run them here per `plugins/agent-orch/rules/extension-resolver.md`. If absent, use `jira.md` values and the current flow. Zero behaviour change by default.

1. **Transition to In Review:**
   ```
   mcp__jira__jira_transitionIssue with:
     issueKey: "<JIRA_ISSUE>"
     transitionId: "[In Review transition ID from jira.md or jira-workflow.yaml]"
   ```
   If "In Review" transition is not available (not all workflows have it), try "Code Review" or similar. If none match, skip with a note:
   ```
   No "In Review" transition found. Issue remains "In Progress".
   ```

2. **Comment with PR link:**
   ```
   mcp__jira__jira_postIssueComment with:
     issueKey: "<JIRA_ISSUE>"
     body: "Fix pull request created:
     
     <PR_URL>
     
     Branch: <branch-name>
     Status: Ready for review
     
     Run /agent-orch:make-validate to fix CI failures or review comments.
     Run /agent-orch:make-clean to merge when ready."
   ```

### Phase 6: Present Result

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make-bug phase 6/6: Summary
All done. Here's what happened and what's next.
═══════════════════════════════════════════════════════
```

```
Fix PR created: <PR URL>

Branch: <branch-name>
Mode: <worktree|branch>
[If Jira]: Jira: <JIRA-ID> (In Review)

Root cause: <one line from STATUS.md Debugger Findings>
Regression test: <path> (RED→GREEN)

Next steps:
- Run /agent-orch:bugfix to iterate on this branch
- Run /agent-orch:make-validate to fix CI failures or review comments
- Run /agent-orch:make-clean to merge and clean up when ready
```

> `/make-clean` auto-detects the mode: it calls `ExitWorktree` for worktree sessions, or falls back to `git checkout <default-branch>` + `git branch -d` for feature-branch sessions. The fix branch has no special prefix, so it is deleted on merge like any feature branch.

## Create New Jira Bug

See Phase 0.5 Step 3 above for the full creation flow including the Bug issue type and optional Epic linking.

## Error Handling

| Scenario | Action |
|----------|--------|
| Already in a worktree | Tell user to use `/bugfix` or `/make-clean` |
| Uncommitted changes (branch mode) | Offer stash, cancel, or switch to worktree mode |
| `gh` not authenticated | Tell user to run `gh auth login` |
| No arguments provided | Show usage with example |
| No `.make-config.md` | First-time setup prompt (Phase 0) |
| No `.claude/rules/jira.md` | Tell user to run `/agent-orch:jira` |
| Jira issue not found | Ask user to verify the key |
| Jira search returns no results | Offer to refine search or create new Bug |
| Project has no Bug issue type | Fall back to closest defect type in `jira.md`, note the substitution |
| "In Review" transition not found | Skip transition with note |
| Debugger cannot reproduce / find root cause | Surface it (`/bugfix` Phase 1 stops rather than guessing); do NOT force a PR |
| 3 fix attempts failed | `/bugfix` escalates to the Architect for design review and pauses; relay and pause — do NOT loop or open a PR |
| Fix produces no changes | Report, suggest `/bugfix` again or `/make-clean` |
| Push fails | Changes stay committed locally, show manual fix |
| PR creation fails | Branch is pushed, show `gh pr create` command |
| `/bugfix` fails or user aborts | Changes remain in worktree uncommitted; user can `/bugfix` again |

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. If that file is
absent, has no `skills.make-bug:` entry, or the entry is empty, **`/make-bug` runs exactly as
documented above — no behaviour change.** This is the default and most common case.

`/make-bug` exposes three hook points (wired into the phase map above):

| Hook point | When it runs |
|------------|--------------|
| `before_commit` | Start of Phase 4, after `/bugfix` completes, before staging + commit |
| `before_pr` | Phase 5, after `git push`, **before** `gh pr create` (commits and pushes have already happened) |
| `after_pr` | Phase 5/6, after the PR is created |

`before_pr` is the key hook: loops, markdown checklists, or other skills can run, and
commits/pushes can occur, **before** the PR is opened. Example:

```yaml
skills:
  make-bug:
    before_pr:
      - .loop-library/pre-pr-review.yaml
      - docs/checklists/pr-ready.md
```

At each hook point, read `.claude/ssnc-agent-orch/skills.yaml`; if `skills.make-bug.<hook>`
lists targets, run them in order per `plugins/agent-orch/rules/extension-resolver.md`
(scripts execute, `.md` files are read-and-acted, `.loop-library/*.yaml` run as loops,
`/skill` refs invoke inline). Tell the user when you run an extension target.

**Pluggable Jira workflow**: `/make-bug` first checks `.claude/ssnc-agent-orch/jira-workflow.yaml`.
If present and `jira.enabled` is set, it uses that file's `transitions`/`fields`/`lifecycle`
values in place of the hard-coded IDs (falling back to `.claude/rules/jira.md` for anything
omitted) and runs `lifecycle.on_start`/`on_review` targets at the matching events. If absent,
the current Jira flow is unchanged. (`/make-bug` never sets version fields, so any `fixVersion`
override in the workflow file is not applied here — that is `/make-clean`'s domain.)

**Pluggable git workflow**: `before_pr`/`after_pr` git steps can be offloaded to an external
repo via `.claude/ssnc-agent-orch/git-workflow.yaml` (clone-and-run). When present, shallow-clone
`source@ref` to `.claude/ssnc-agent-orch/.cache/`, show the user the `source`/`ref` and step list
and confirm before the first run in a session (unless in an auto-approved permission mode), then
run `git.steps.<hook>` targets from the cache. Absent file → no clone, current git flow.

The **implementation phase** `/make-bug` runs — `/agent-orch:bugfix` — is itself extensible
(`skills.bugfix.before`/`after`) and the **agents** it launches (Debugger, Builder, Validator,
Architect) honour their own `.claude/ssnc-agent-orch/agents.yaml` entries. Those are `/bugfix`'s
hooks, not `/make-bug`'s; `/make-bug` does not need to re-run them.

Full contract: `plugins/agent-orch/rules/extensibility.md` (§3 hooks, §4 Jira, §5 git).
