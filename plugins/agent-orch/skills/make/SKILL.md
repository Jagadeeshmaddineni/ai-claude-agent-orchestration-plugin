---
name: make
description: Create worktree or feature branch, run /build, commit, push, and open PR. Usage: /agent-orch:make <prompt>
---

# Make: Feature Workflow (Worktree or Branch)

Creates an isolated worktree **or** a feature branch in the current working tree (user's choice), runs `/agent-orch:build` to implement the feature, then commits all changes, pushes the branch, and opens a GitHub PR. Integrates with Jira for full lifecycle tracking.

## Separation of concerns (why this skill is thin)

`/make` is a **git + issue-tracker + extensibility** wrapper around `/agent-orch:build`.
It MUST NOT create or modify **auditable BUILD-domain repo content** — source code,
documentation, configuration, or version files. Every such change is delegated to
`/agent-orch:build`, which runs under review (Architect → Builder → two-stage review).

`/make` owns only:

- **Git**: worktree/branch creation, staging, commits, pushes, PRs.
- **Issue tracker**: Jira/GitHub lifecycle (assign, transition, comment, fixVersion).
- **Bookkeeping**: work-plan status/changelog in `planning/*.md`, and invoking the
  wiki sync (`/team-work:wiki-source-branch`) — both are tracking/knowledge sync, not
  BUILD-domain code, so they remain `/make`-owned.
- **Extensibility**: the `before_commit` / `before_pr` / `after_pr` hooks.

Concretely: **computing** a version string (reading the last git tag) is a git/release
concern `/make` owns; **editing** version files to that string is a code change, so it
is delegated to `/build` (see Phase 3). When in doubt: if a step writes to a file that
lands in a code review as a source/docs/config/version change, it belongs in `/build`.

## Prerequisites

- Must be in a git repository
- Must NOT already be in a worktree from a previous session
- If on a non-default branch, must have a clean working tree (branch mode creates a new branch from the default branch)
- `gh` CLI must be authenticated (`gh auth status`)
- A remote named `origin` must exist
- For Jira integration: `.claude/rules/jira.md` must exist (run `/agent-orch:jira` first)

## Phase Map (what the user sees)

`/make` has 6 user-visible phases. At the START of every phase, print a banner
to the user so they always know where we are. Use this exact format:

```
═══════════════════════════════════════════════════════
/make phase <N>/6: <phase name>
<one-line description of what happens in this phase>
═══════════════════════════════════════════════════════
```

Phase names (in order):

| N | Phase name                         | What happens                                              |
|---|------------------------------------|-----------------------------------------------------------|
| 0 | Jira mode + resolve issue          | Read `.make-config.md`, find/create the Jira issue        |
| 1 | Validate environment + sync main   | Checks, `git pull`, prepare base                          |
| 2 | Create worktree or feature branch  | Ask mode, create branch, write session state file         |
| 3 | Run /build                         | Hand off to `/agent-orch:build` (which has its own phases)|
| 4 | Commit and push                    | Stage, commit, sync wiki from source (if any), push       |
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
/make phase 0/6: Jira mode + resolve issue
Reading .make-config.md and finding or creating the Jira issue for this session.
═══════════════════════════════════════════════════════
```

**Goal**: Determine whether this project uses Jira with `/make`.

1. **Check for `.make-config.md` in repo root:**

   **If file exists**: Read the `jira_mode` value and proceed to Phase 0.5.

   **If file does NOT exist** (first time):
   ```
   Welcome to /agent-orch:make! One-time setup question:

   How should /make handle Jira integration?

   (a) Yes -- always require a Jira issue (recommended for teams)
       Every /make session will be tracked in Jira. You can still opt out per-session.
   (b) No -- never use Jira
       /make works purely with git/GitHub, no Jira tracking.
   (c) Ask me -- prompt each time
       Each /make session asks whether to use Jira. Includes "skip Jira" option.

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

**Goal**: Find, search, or create the tracker issue for this session.

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
  `github-workflow.yaml` overrides it. Everything else in this phase is unchanged.
- **If tracker is `jira`** (the default): continue exactly as below.

**Read `jira_mode` from `.make-config.md`** (applies when tracker is `jira`).

**If `jira_mode: no`**: Skip to Phase 1. No Jira integration.

**If `jira_mode: yes` or `jira_mode: ask-me`**:

#### Step 1: Check Jira Prerequisites

Read `.claude/rules/jira.md`:
- If not found: "Jira context not found. Run `/agent-orch:jira` first." Exit.
- Extract: project key, issue type IDs, transition IDs, custom field IDs.

**Pluggable Jira workflow (optional)**: If `.claude/ssnc-agent-orch/jira-workflow.yaml` exists and `jira.enabled` is set, use its `transitions`/`fields`/`lifecycle` values in place of the hard-coded IDs from `jira.md` (falling back to `jira.md` for any key it doesn't specify). When lifecycle hooks (`on_start`/`on_review`/`on_done`) are defined, run their targets at the matching lifecycle events per `plugins/agent-orch/rules/extension-resolver.md`. If absent, use the current flow (read `jira.md` values). Zero behaviour change by default. See `plugins/agent-orch/rules/extensibility.md` §4 for full protocol.

> **Current user is resolved LIVE, never from `jira.md`.** Any operation that
> needs "who am I" (assignee, engineer attribution) MUST call
> `mcp__jira__jira_getCurrentUser` at runtime and use its `accountId` /
> `displayName`. Do NOT read a cached user/email out of `jira.md` — that value
> reflects whoever last ran `/agent-orch:jira`, which may not be the person
> running `/make` now. Cache the live result once per session and reuse it.

#### Step 2: Detect JIRA-ID in Arguments

Check if `$ARGUMENTS` contains a pattern matching `[A-Z]+-\d+` (e.g., `PROJ-123`).

**If JIRA-ID found in arguments:**
- Extract the JIRA-ID
- Extract the remaining text as the prompt (if any)
- Fetch the issue: `mcp__jira__jira_getIssue` with issueKey
- If issue not found: report error and ask user to verify
- Present the issue summary and proceed to Step 5

**If NO JIRA-ID found in arguments:**

**If `jira_mode: ask-me`**: Present options including skip:
```
No Jira issue detected in your prompt.

(a) I have a Jira issue key -- let me type it
(b) Search Jira using my prompt: "<first 60 chars of $ARGUMENTS>"
(c) Search Jira with different criteria
(d) Create a new Jira issue for this work
(e) Skip Jira for this session -- no tracking
```

**If `jira_mode: yes`**: Same options but WITHOUT option (e):
```
No Jira issue detected in your prompt.
(Jira mode is "yes" -- every session needs a Jira issue. Edit .make-config.md to change.)

(a) I have a Jira issue key -- let me type it
(b) Search Jira using my prompt: "<first 60 chars of $ARGUMENTS>"
(c) Search Jira with different criteria
(d) Create a new Jira issue for this work
```

**Option (a): User provides key**
- Ask for the key, fetch with `mcp__jira__jira_getIssue`
- If not found, ask again

**Option (b): Search by prompt**
```
mcp__jira__jira_searchIssues with:
  jql: "project = [KEY] AND text ~ \"<keywords from prompt>\" AND status != Done ORDER BY updated DESC"
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

**Option (d): Create new Jira issue**
See [Create New Jira Issue](#create-new-jira-issue) below.

**Option (e): Skip Jira (ask-me mode only)**
- Set `JIRA_ISSUE=none`
- Skip to Phase 1

#### Step 3: Create New Jira Issue

When user chooses to create a new Jira issue:

1. **Find or search for parent Epic:**
   ```
   New issues should be linked to an Epic. How do you want to find it?

   (a) Search Epics by prompt: "<keywords from $ARGUMENTS>"
   (b) Search Epics with different criteria
   (c) I have an Epic key -- let me type it
   (d) Skip Epic -- create standalone Story
   ```

   **Search Epics:**
   ```
   mcp__jira__jira_searchIssues with:
     jql: "project = [KEY] AND issuetype = Epic AND status != Done AND text ~ \"<keywords>\" ORDER BY updated DESC"
     maxResults: 10
   ```
   Present results, user picks or skips.

2. **Generate issue summary from prompt:**
   - Take `$ARGUMENTS` (minus any JIRA-ID if present)
   - Suggest a concise summary (under 80 chars)
   - Ask user to confirm or edit

3. **Create the issue:**
   ```
   mcp__jira__jira_createIssue with:
     projectKey: "[KEY from jira.md]"
     summary: "<confirmed summary>"
     issueType: "[Story type ID from jira.md]"
     description: "Created by /agent-orch:make\n\nPrompt: <$ARGUMENTS>"
     customFields: { "labels": ["claude-code-agent-harness"] }
   ```

4. **Link to Epic (if selected):**
   ```
   mcp__jira__jira_linkIssues with:
     inwardIssueKey: "<new-issue-key>"
     outwardIssueKey: "<epic-key>"
     linkType: "Epic-Story" or the appropriate link type from jira.md
   ```

5. **Report:**
   ```
   Created: <NEW-KEY> - <summary>
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

   First resolve who is running `/make` right now — do NOT use any user/email
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

4. **Set version fields:**

   Determine versions from git tags:
   ```bash
   # Affects version = last tag (current release)
   LAST_TAG=$(git tag --sort=-v:refname | head -1)
   # Fix version = next minor (bump minor of last tag)
   # e.g., 2.15.2 → 2.16.0
   ```
   Calculate next minor: take LAST_TAG, increment minor, reset patch to 0.

   **Note**: This is the SAME `NEXT_MINOR` value that will later be passed to
   `/build` in Phase 3. Compute it once here and reuse it in both places (Jira
   fixVersion here, and the version-bump instruction to `/build` there) so they
   never diverge.

   ```
   mcp__jira__jira_updateIssue with:
     issueKey: "<JIRA-ID>"
     fields: {
       "versions": [{"name": "<LAST_TAG>"}],
       "fixVersions": [{"name": "<NEXT_MINOR>"}]
     }
   ```
   If versions don't exist in Jira, skip with a warning:
   ```
   Version "<NEXT_MINOR>" not found in Jira. Skipping fix version.
   You can create it in Jira project settings or skip this.
   ```

5. **Transition to In Progress:**
   ```
   mcp__jira__jira_transitionIssue with:
     issueKey: "<JIRA-ID>"
     transitionId: "[In Progress transition ID from jira.md]"
   ```

6. **Post session start comment:**
   ```
   mcp__jira__jira_postIssueComment with:
     issueKey: "<JIRA-ID>"
     body: "Agent-assisted /make session started.
     
     Engineer: <CURRENT_USER_DISPLAY_NAME from getCurrentUser>
     Prompt: <$ARGUMENTS>
     
     Progress will be tracked here."
   ```

7. **Store for later phases:**
   Set `JIRA_ISSUE=<JIRA-ID>` for use in Phase 3 and Phase 5.

### Phase 1: Validate Environment

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make phase 1/6: Validate environment + sync main
Checking git repo, gh auth, worktree state, then pulling latest on the default branch.
═══════════════════════════════════════════════════════
```

1. Verify not already in a worktree:
   ```bash
   git worktree list
   ```
   If current directory is inside `.claude/worktrees/`, stop:
   ```
   You are already in a worktree. Use /agent-orch:build to iterate here,
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
   Usage: /agent-orch:make <prompt>

   Examples:
     /agent-orch:make Add user authentication with JWT tokens
     /agent-orch:make PROJ-123
     /agent-orch:make PROJ-123 Add JWT auth with refresh tokens

   The prompt describes what to build. It will be passed to /agent-orch:build.
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
/make phase 2/6: Create worktree or feature branch
Picking isolation mode, creating the branch, and writing the session state file
that every orchestrated agent reads to stay anchored.
═══════════════════════════════════════════════════════
```

1. **Ask the user which mode to use:**
   ```
   How should I set up this feature?

   (a) Worktree -- isolated checkout in .claude/worktrees/ (multiple features in parallel)
   (b) Feature branch -- new branch in the current working tree (simpler, one feature at a time)
   ```

   Capture the choice as `BRANCH_MODE` (`worktree` or `branch`).

2. **Derive a branch name:**

   **If JIRA issue resolved**: Use the Jira summary:
   - Prefix with issue key: `PROJ-123-add-user-authentication`
   - Slugify the summary, truncate to 50 chars

   **If no Jira**: Slugify `$ARGUMENTS`:
   - Take the first 5-8 significant words (drop articles, prepositions)
   - Convert to lowercase, replace spaces with hyphens
   - Remove special characters except hyphens
   - Truncate to 50 characters max

3. **Confirm with user:**
   ```
   Branch name: proj-123-add-user-authentication

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

   Each Claude session writes its OWN session file, named by UTC timestamp +
   process id, so multiple Claudes running `/make` in parallel on the same
   repo never collide. (Earlier versions used a single shared file at
   `.claude/.make-session.json` — that's the v1 layout this scheme replaces.)

   Tell the user: "Writing per-Claude session state so /build and all agents stay anchored here…"

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

   Write `${SESSION_FILE}` using the Write tool with this exact JSON shape (v2):
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
     "invoking_skill": "/agent-orch:make",
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
   > 2. **Instructional:** `/build` reads the session file from disk (env-var
   >    hint → branch discovery → legacy → cwd) and prepends an explicit
   >    `[worktree-context]` block to every subagent prompt.
   >
   > The per-Claude session FILE on disk — not the env var — is what keeps each
   > Claude pinned to its own session when multiple `/make` runs share a repo.

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

   Starting build...
   ```

   **If branch:**
   ```
   Feature branch created and checked out.
   Branch: <branch-name>
   Mode: branch (in-place)
   [If Jira]: Jira: <JIRA-ID> - <summary> (In Progress)

   Starting build...
   ```

### Phase 3: Run Build

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make phase 3/6: Run /build
Handing off to /agent-orch:build. /build has its own phase banners (0 through 5)
and will stay anchored to this worktree via $MAKE_SESSION_FILE (per-Claude session state).
═══════════════════════════════════════════════════════
```

#### Compute the next minor version

Before invoking `/build`, compute the next minor version from the last git tag:

```bash
LAST_TAG=$(git tag --sort=-v:refname | head -1)
```

If `LAST_TAG` is empty (no tags exist in the repo):
- Set `NEXT_MINOR=""` (empty)
- Note: version-bump instruction will be skipped in the `/build` invocation below
- Tell the user: "No git tags found — skipping version bump instruction."

If `LAST_TAG` exists:
- Parse the tag to increment the minor version and reset patch to 0
  - Example: `2.15.2` → `2.16.0`
  - Example: `v2.15.2` → `v2.16.0` (preserve the `v` prefix if present)
- Set `NEXT_MINOR` to the computed value
- Tell the user: "Computed next minor version: `<NEXT_MINOR>` (from last tag `<LAST_TAG>`)"

**Key principle**: The last git **tag** is the source of truth for the release version,
even if `plugin.json` or other version files differ. Computing this version string
is a git/release concern that `/make` owns. **Editing version files** to apply that
version is a code change, so it is delegated to `/build` (see invocation below).

`/make` itself performs **no edits** to version files. It only commits and pushes
what `/build` produces (Phase 4).

#### Invoke `/agent-orch:build` with the user's prompt

Use the **Skill tool**:

**If JIRA issue resolved**: Pass the JIRA-ID so /build's Phase 0.5 activates:
```
Skill tool call:
  skill: "agent-orch:build"
  args: "<JIRA-ID> <remaining prompt text> Also bump the plugin version to <NEXT_MINOR> in the appropriate version files (.claude-plugin/*.json, plugins/*/.claude-plugin/plugin.json, and any documented version/count references), as part of your file changes."
```

Note: The `<NEXT_MINOR>` placeholder is substituted with the computed value at runtime.
If `NEXT_MINOR` is empty (no tags exist), omit the version-bump instruction entirely.

**If no Jira**: Pass the original prompt:
```
Skill tool call:
  skill: "agent-orch:build"
  args: "<the original $ARGUMENTS minus any JIRA-ID already extracted> Also bump the plugin version to <NEXT_MINOR> in the appropriate version files (.claude-plugin/*.json, plugins/*/.claude-plugin/plugin.json, and any documented version/count references), as part of your file changes."
```

Note: The `<NEXT_MINOR>` placeholder is substituted with the computed value at runtime.
If `NEXT_MINOR` is empty (no tags exist), omit the version-bump instruction entirely.

Wait for `/agent-orch:build` to complete its full lifecycle.

**Note on provenance (`prompt.md`)**: `/build` automatically writes a
`prompt.md` file into the session directory that captures the prompt
string `/make` forwarded here (plus any Jira context when JIRA-ID is
passed, and the clarifying Q&A that happens inside `/build`'s Phase 1).
`/make` does not need to write anything — just ensure the prompt passed
to `/build` above is the verbatim user request so the provenance record
is accurate. See `/agent-orch:build` SKILL.md Phase 1 Step 5.5 for the
`prompt.md` format.

**CRITICAL**: Do NOT proceed to Phase 4 until `/agent-orch:build` has fully completed and presented its summary to the user. When `/agent-orch:build` reaches Phase 5 Step 5 (Next Steps), `/make` takes over -- do NOT let the user choose from build's menu. Instead, proceed directly to Phase 4.

Tell the user:
```
Build complete. Now committing, pushing, and creating PR...
```

### Phase 4: Commit and Push

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make phase 4/6: Commit and push
Staging, committing, syncing the wiki from source (if one exists), then pushing the branch to origin.
═══════════════════════════════════════════════════════
```

**Extensibility hook: `before_commit`**

Before staging any changes, check `.claude/ssnc-agent-orch/skills.yaml` for `skills.make.before_commit` targets. If present, run each target per `plugins/agent-orch/rules/extension-resolver.md` (scripts, markdown, `/loop` refs, or skills). These run after `/build` completes but before `git add` in step 2 below. If absent, continue normally. Zero behaviour change by default.

1. **Check for changes:**
   ```bash
   git status --porcelain
   ```
   If no changes:
   ```
   No changes were produced by the build. Nothing to commit or push.

   You can run /agent-orch:build again to iterate, or /agent-orch:make-clean to clean up.
   ```
   Stop here.

2. **Stage all changes:**
   ```bash
   git add -A
   ```

3. **Generate a commit message** from what was built:
   - Read `ssnc-agent-orch/*/PLAN.md` in the worktree for the feature name and goal
   - Read `ssnc-agent-orch/*/STATUS.md` for what was accomplished
   - Create a conventional commit message:
     ```
     feat: <short description from PLAN.md goal>

     <2-3 bullet summary of what was implemented from STATUS.md>

     [If Jira]: <JIRA-ID>
     Built with /agent-orch:make
     ```

4. **Commit:**
   ```bash
   git commit -m "<generated message>"
   ```

4.5. **Sync the wiki from source (only if a wiki is initialized):**

   After the code changes are committed, keep the team-work knowledge wiki in
   lockstep with the code. This runs **only** when a wiki exists, and it commits
   onto the branch we're already on (no worktree, no separate PR) before we push.

   - **Gate**: check for `.team-work/wiki-config.md`.
     ```bash
     test -f .team-work/wiki-config.md && echo "wiki present" || echo "no wiki"
     ```
     If absent, **skip this step silently** and go to step 5. The wiki sync is
     purely additive — never block or fail the `/make` run because there's no wiki.

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

   - **On any wiki-sync error**, do **not** abort `/make` — report it and continue
     to step 5 with the code commit intact:
     ```
     Wiki sync hit a problem: <error>. The code commit is safe; continuing to push.
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

After `git push` completes and before running `gh pr create` in Phase 5 below, check `.claude/ssnc-agent-orch/skills.yaml` for `skills.make.before_pr` targets. If present, run each target per `plugins/agent-orch/rules/extension-resolver.md`. **User requirement**: loops, markdown, and skills can run before the PR, and commits/pushes can happen here (after the main push in step 5, before the `gh pr create` in Phase 5). If absent, continue normally. Zero behaviour change by default.

**Git workflow offload (optional)**: If `.claude/ssnc-agent-orch/git-workflow.yaml` exists and defines `git.steps.before_pr`, shallow-clone `source@ref` to `.claude/ssnc-agent-orch/.cache/<repo>@<ref>/` (reusing cache if already cloned this session) and run those steps from the cache. Ask the user to confirm the source/ref and step list before the first clone in a session (unless auto-approved permission mode). See `plugins/agent-orch/rules/extensibility.md` §5 for full clone-and-run protocol. If absent, continue with the inline hook check above.

### Phase 5: Create PR

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/make phase 5/6: Create PR + update Jira
Opening the pull request and transitioning the Jira issue to In Review.
═══════════════════════════════════════════════════════
```

1. **Determine the default branch:**
   ```bash
   gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
   ```

2. **Generate PR title and body** from build artifacts:
   - **Title**: `[JIRA-ID] <short summary>` (under 70 characters) or just `<short summary>` if no Jira
   - **Body**: Structured summary using this format:

   ```markdown
   ## Summary
   <2-3 bullet points from PLAN.md requirements and STATUS.md results>

   [If Jira]:
   ## Jira
   [<JIRA-ID>](<jira-browse-url>/<JIRA-ID>)

   ## Changes
   <List of key files created/modified>

   ## Test Plan
   <From STATUS.md validator results -- test counts, coverage>

   ---
   Built with `/agent-orch:make` using multi-agent orchestration.
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

After the PR is created (step 3 above), check `.claude/ssnc-agent-orch/skills.yaml` for `skills.make.after_pr` targets. If present, run each target per `plugins/agent-orch/rules/extension-resolver.md`. If absent, continue normally. Zero behaviour change by default.

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
   - <YYYY-MM-DD>: <JIRA_ISSUE> moved to in-review (PR created via /make)
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
     body: "Pull request created:
     
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
/make phase 6/6: Summary
All done. Here's what happened and what's next.
═══════════════════════════════════════════════════════
```

```
PR created: <PR URL>

Branch: <branch-name>
Mode: <worktree|branch>
[If Jira]: Jira: <JIRA-ID> (In Review)

Next steps:
- Run /agent-orch:build to iterate on this branch
- Run /agent-orch:make-validate to fix CI failures or review comments
- Run /agent-orch:make-clean to merge and clean up when ready
```

> `/make-clean` auto-detects the mode: it calls `ExitWorktree` for worktree sessions, or falls back to `git checkout <default-branch>` + `git branch -d` for feature-branch sessions.

## Create New Jira Issue

See Phase 0.5 Step 3 above for the full creation flow including Epic search and linking.

## Error Handling

| Scenario | Action |
|----------|--------|
| Already in a worktree | Tell user to use `/build` or `/make-clean` |
| Uncommitted changes (branch mode) | Offer stash, cancel, or switch to worktree mode |
| `gh` not authenticated | Tell user to run `gh auth login` |
| No arguments provided | Show usage with example |
| No `.make-config.md` | First-time setup prompt (Phase 0) |
| No `.claude/rules/jira.md` | Tell user to run `/agent-orch:jira` |
| Jira issue not found | Ask user to verify the key |
| Jira search returns no results | Offer to refine search or create new |
| Version not found in Jira | Skip version fields with warning |
| "In Review" transition not found | Skip transition with note |
| Build produces no changes | Report, suggest `/build` again or `/make-clean` |
| Push fails | Changes stay committed locally, show manual fix |
| PR creation fails | Branch is pushed, show `gh pr create` command |
| Build fails or user aborts | Changes remain in worktree uncommitted; user can `/build` again |

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. If that file is
absent, has no `skills.make:` entry, or the entry is empty, **`/make` runs exactly as
documented above — no behaviour change.** This is the default and most common case.

`/make` exposes three hook points (wired into the phase map above):

| Hook point | When it runs |
|------------|--------------|
| `before_commit` | Start of Phase 4, after `/build` completes, before staging + commit |
| `before_pr` | Phase 5, after `git push`, **before** `gh pr create` (commits and pushes have already happened) |
| `after_pr` | Phase 5/6, after the PR is created |

`before_pr` is the key hook: loops, markdown checklists, or other skills can run, and
commits/pushes can occur, **before** the PR is opened. Example:

```yaml
skills:
  make:
    before_pr:
      - .loop-library/pre-pr-review.yaml
      - docs/checklists/pr-ready.md
```

At each hook point, read `.claude/ssnc-agent-orch/skills.yaml`; if `skills.make.<hook>`
lists targets, run them in order per `plugins/agent-orch/rules/extension-resolver.md`
(scripts execute, `.md` files are read-and-acted, `.loop-library/*.yaml` run as loops,
`/skill` refs invoke inline). Tell the user when you run an extension target.

**Pluggable Jira workflow**: `/make` first checks `.claude/ssnc-agent-orch/jira-workflow.yaml`.
If present and `jira.enabled` is set, it uses that file's `transitions`/`fields`/`lifecycle`
values in place of the hard-coded IDs (falling back to `.claude/rules/jira.md` for anything
omitted) and runs `lifecycle.on_start`/`on_review` targets at the matching events. If absent,
the current Jira flow is unchanged.

**Pluggable git workflow**: `before_pr`/`after_pr` git steps can be offloaded to an external
repo via `.claude/ssnc-agent-orch/git-workflow.yaml` (clone-and-run). When present, shallow-clone
`source@ref` to `.claude/ssnc-agent-orch/.cache/`, show the user the `source`/`ref` and step list
and confirm before the first run in a session (unless in an auto-approved permission mode), then
run `git.steps.<hook>` targets from the cache. Absent file → no clone, current git flow.

Full contract: `plugins/agent-orch/rules/extensibility.md` (§3 hooks, §4 Jira, §5 git).

