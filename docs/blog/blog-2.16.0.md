# Jira Wired Into the Worktree Lifecycle (v2.16.0)

v2.15.0 gave us `/make`, `/make-validate`, and `/make-clean` -- a git lifecycle that wraps `/build` so you never manually branch, commit, push, or merge again. The git ceremony disappeared.

The Jira ceremony didn't.

Every feature still required a parallel track of Jira busywork: find or create the issue, assign yourself, move it to In Progress, link the PR, move it to In Review, set the fix version, move it to Done, set the end date. It's the same problem we solved for git -- repetitive lifecycle management that adds no value but carries real cost when skipped.

v2.16.0 wires Jira into the make lifecycle. One command now handles both tracks.

## The Gap

Before this release, `/build` already had Jira integration -- pass `PROJ-123` and it pulls requirements from the issue, transitions to In Progress, posts a session comment. But `/make` didn't participate. It created the worktree, called `/build`, committed, pushed, opened a PR, and never touched Jira. The PR and the issue existed in parallel universes.

`/make-clean` was worse. It merged the PR, deleted the branch, cleaned up the worktree, and left the Jira issue sitting in whatever state it was in. No Done transition. No end date. No comment saying the work shipped. You had to remember to go back and close it manually.

The result: Jira boards that didn't reflect reality. Issues stuck In Progress after code shipped. Fix versions never set. Sprint reports that required manual reconciliation.

## How It Works Now

### First Run: Choose Your Mode

The first time you run `/make` in a repository, it asks a one-time configuration question:

```
Welcome to /agent-orch:make! One-time setup question:

How should /make handle Jira integration?

(a) Yes -- always require a Jira issue (recommended for teams)
(b) No -- never use Jira
(c) Ask me -- prompt each time
```

Your answer is stored in `.make-config.md` at the repo root. It's a single line -- `jira_mode: yes`, `jira_mode: no`, or `jira_mode: ask-me` -- and you can change it anytime by editing the file. Commit it to the repo and everyone on the team gets the same default.

### Starting a Feature: `/make`

With Jira mode active, `/make` now resolves a Jira issue before doing anything else.

**If you already have the key:**

```
/agent-orch:make PROJ-123
/agent-orch:make PROJ-123 Add JWT auth with refresh tokens
```

The JIRA-ID is detected from the prompt. The issue is fetched, and its summary becomes the branch name: `proj-123-add-jwt-auth`. The remaining text becomes the build prompt.

**If you don't have the key:**

```
/agent-orch:make Add user authentication with JWT tokens
```

No JIRA-ID detected. You're presented with options:

```
(a) I have a Jira issue key -- let me type it
(b) Search Jira using my prompt: "Add user authentication with JWT"
(c) Search Jira with different criteria
(d) Create a new Jira issue for this work
```

In `ask-me` mode, there's also option (e): skip Jira for this session.

**Search** runs a JQL query against your project filtered by the prompt keywords. Results come back as a numbered list with key, summary, status, and assignee. Pick one, or refine the search, or create new.

**Create new** walks you through it -- suggests a summary from your prompt, optionally links to an Epic (searchable the same way), and creates the Story with the `claude-code-agent-harness` label.

### What Happens to the Issue

Once a Jira issue is resolved (detected, found via search, or created), `/make` prepares it for the session:

1. **Adds `claude-code-agent-harness` label** if not already present -- this is the governance label that marks agent-ready work
2. **Assigns to the current user** from the cached Jira context
3. **Sets the start date** to today
4. **Sets version fields** -- affects version from the latest git tag, fix version from the next minor bump
5. **Transitions to In Progress**
6. **Posts a session start comment** with the engineer name and build prompt

Then the normal `/make` flow proceeds: worktree, build, commit, push, PR.

### After the PR Opens

When `/make` creates the PR, it doesn't stop at GitHub:

1. **PR title includes the JIRA-ID**: `[PROJ-123] Add JWT authentication`
2. **PR body includes a Jira link**: clickable reference back to the issue
3. **Issue transitions to In Review**
4. **A comment is posted** on the Jira issue with the PR URL and next-step instructions

The Jira board now reflects that this work has a PR open and is waiting for review. Without anyone opening Jira.

### Merging: `/make-clean`

This is where the lifecycle completes. `/make-clean` already handled the git side -- verify CI, merge PR, delete branch, remove worktree, pull main. Now it also handles the Jira side.

**Finding the issue:** `/make-clean` doesn't require you to tell it the Jira key. It looks in three places:

1. The session's `PLAN.md` -- `/make` writes a `## Coordination` section with the session ticket
2. The branch name -- if it starts with a JIRA-ID pattern like `proj-123-add-auth`
3. The PR body -- where `/make` embedded the Jira link

If any source yields a key, Jira updates proceed. If none do (because the feature was built without Jira), they're silently skipped.

**What it does on merge:**

1. **Transitions to Done** using the transition ID from the cached Jira context
2. **Sets the end date** to today
3. **Ensures version fields** are populated -- affects version and fix version, in case they weren't set during `/make` (handles the case where someone used `/build` directly without `/make`)
4. **Ensures the `claude-code-agent-harness` label** is present
5. **Posts a completion comment** with the merged PR URL and branch name

The issue is closed, dated, versioned, labeled, and commented. Sprint reports write themselves.

## The Full Lifecycle, Traced Through Jira

```
/agent-orch:make PROJ-123 Add JWT auth
  Jira: PROJ-123 assigned, start date set, In Progress
  Worktree: proj-123-add-jwt-auth
  Build: full agent orchestration
  PR #42 created
  Jira: PROJ-123 → In Review, PR link commented

/agent-orch:build                    # iterate as needed
/agent-orch:make-validate            # fix CI, address reviews

/agent-orch:make-clean
  PR #42 merged (squash)
  Jira: PROJ-123 → Done, end date set, versions confirmed
  Worktree removed, back on main
```

Four Jira transitions, two date fields, version tracking, three comments, label governance -- all automatic. The engineer types three commands and writes zero Jira updates.

## Configuration

### `.make-config.md`

```markdown
# Make Configuration

## Jira Integration

jira_mode: yes

## How to Change

Edit the jira_mode line above:
- yes  -- always require a Jira issue (you can opt out per-session)
- no   -- never use Jira
- ask-me -- prompt each time (includes "skip Jira" option)
```

Commit this file to share the setting across the team. Change it anytime.

### Prerequisites

Jira integration requires two things:

1. **MCP server running**: `/agent-orch:mcp-start` (provides the Jira API tools)
2. **Jira context cached**: `/agent-orch:jira` (discovers project metadata and writes `.claude/rules/jira.md`)

Without these, `/make` tells you what's missing and exits. If Jira context disappears mid-session (unlikely but possible), the skills warn and continue without Jira updates -- the git lifecycle never breaks because of Jira.

## What Didn't Change

`/make-validate` is unchanged. It calls `/build`, which already inherits Jira context from the session's PLAN.md. No new Jira logic was needed there.

`/build` is unchanged. When `/make` passes `PROJ-123` in the build args, `/build`'s existing Phase 0.5 activates and pulls requirements from Jira. That flow was already built in v2.11.0.

The Advocate agent's Jira coordination (Phase 1.5 conflict detection, session ticket management) works the same way -- `/make` just ensures the issue is properly set up before the Advocate sees it.

All 26 agents, the two-stage review pipeline, TDD enforcement, verification gates -- untouched. This release is purely lifecycle plumbing between the git and Jira systems.

## Design Decisions

**Fail-open on Jira.** Every Jira operation has a fallback. Transition not available? Skip with a note. Version doesn't exist in Jira? Skip with a warning. MCP server down? Warn and continue the git lifecycle. Jira should never block shipping code.

**Three sources for issue detection in `/make-clean`.** We can't assume every session started with `/make`. Someone might have created a branch manually, run `/build PROJ-123`, and opened a PR by hand. Checking PLAN.md, branch name, and PR body covers all paths.

**Version fields from git tags.** Affects version is the latest tag (current release). Fix version is the next minor bump (tag `2.15.2` yields fix version `2.16.0`). This is a convention, not a requirement -- if the calculated version doesn't exist in Jira, the field is skipped with a warning rather than failing.

**`.make-config.md` in repo root, not `.claude/`.** This is a team-level decision (do we use Jira?), not a personal preference. It belongs in the repo where it can be committed, reviewed, and shared. One line to read, one line to change.

---

**v2.16.0** -- 21 skills, 26 agents. Deep Jira integration for the `/make` worktree lifecycle. `.make-config.md` configuration (yes/no/ask-me). Issue detection, search, and creation with Epic linking. Full lifecycle tracking: In Progress, In Review, Done. Automatic assignment, dates, versions, labels, and PR-linked comments.
