---
name: github-issues
description: GitHub Issues integration (code.ssnc.dev via gh CLI) with repo context caching. The GitHub backend of the tracker-provider contract — a drop-in alternative to /agent-orch:jira. Usage: /agent-orch:github-issues [refresh|status|work|triage|help]
---

# GitHub Issues Context Manager

Discover and cache your GitHub repository's issue-tracking metadata so every `gh`
call uses the right repo, labels, and status model without redundant lookups. The
cached context lives in `.claude/rules/github.md` — a rules file automatically
loaded into every conversation.

This skill is the **GitHub backend** of the backend-neutral tracker contract in
`plugins/agent-orch/rules/tracker-provider.md`. It is the structural twin of
`/agent-orch:jira`: same governance labels, same normalized verbs, same work-queue
behaviour — only the backend is GitHub Issues on `code.ssnc.dev` instead of Jira.

> **Use this when** your repo sets `tracker: github` in `.make-config.md`. To use
> Jira instead, run `/agent-orch:jira`. The two are interchangeable; a repo picks
> one with the `tracker:` selector and the rest of the workflow is identical.

## Usage

```
/agent-orch:github-issues            # Discover repo, cache context
/agent-orch:github-issues refresh    # Re-fetch labels/milestones/templates
/agent-orch:github-issues status     # Show what's cached without fetching
/agent-orch:github-issues work       # Work queue (agent-ready issues) — like /jira-work
/agent-orch:github-issues triage     # Classify unlabeled issues for agent work
/agent-orch:github-issues OWNER/REPO # Cache a specific repo (defaults to origin)
```

---

## Prerequisites

GitHub Issues uses the **`gh` CLI against GitHub Enterprise Server** at
`code.ssnc.dev`. Every `gh`/`git` call in this skill runs with:

```bash
export GH_HOST=code.ssnc.dev
```

(and the `GH_ENTERPRISE_TOKEN` / `GH_TOKEN` already configured for the repo).

The MCP server is **not** required for this backend — `gh` is the transport.

---

## Process

### Step 1: Parse arguments

- No arguments → **default mode** (discover origin repo, cache context).
- `OWNER/REPO` → **default mode targeting that specific repo**.
- `refresh` → re-fetch labels/milestones/templates for the cached repo.
- `status` → read-only, show cached data.
- `work` → jump to the **Work Queue** section (browse agent-ready issues).
- `triage` → jump to the **Triage** section (classify unlabeled issues).

### Step 2: Check `gh` availability and host

```bash
GH_HOST=code.ssnc.dev gh auth status
```

If `gh` is not installed or not authenticated for `code.ssnc.dev`:

```
GitHub CLI is not authenticated for code.ssnc.dev.

Run:  GH_HOST=code.ssnc.dev gh auth login
(choose "GitHub Enterprise Server", host code.ssnc.dev)

If gh is not installed, install it first: https://cli.github.com
```

Exit. Do not proceed without a working GitHub connection.

You may show the authenticated login for confirmation, but **do NOT persist it into
`github.md`**. Identity is always resolved live — use the literal `@me` in `gh`
flags at the point of use (it server-resolves the token's user). Caching identity
leads to mis-assignment when a different person later runs `/make`, `/groom`, etc.

> Do **NOT** call `gh api user` for routine work — the token may lack `read:user`
> scope. Prefer `@me`. Only call `gh api user --jq .login` if a human-readable login
> is genuinely needed for display, and tolerate failure.

### Step 3: Check for existing context

Read `.claude/rules/github.md` if it exists.

**If status mode**: Show a summary and exit:

```
GitHub Issues Context Status

File: .claude/rules/github.md
[If file exists]:
  Repo: [OWNER/REPO]
  Host: code.ssnc.dev
  Last updated: [timestamp]
  Cached: [N] labels, [N] milestones, [N] issue templates
  Status model: [labels|project]

  Run /agent-orch:github-issues refresh to update.

[If file doesn't exist]:
  No context file found.
  Run /agent-orch:github-issues to create it.
```

**If default mode and file exists**: Confirm the cached repo, offer refresh, or
start over (mirror `/agent-orch:jira` Step 3 options a–d).

**If refresh mode**: Continue to Step 5 directly.

**If no cached context**: Continue to Step 4.

### Step 4: Discover the GitHub repository

**CRITICAL**: Always confirm the repo with the user before caching.

**If a specific `OWNER/REPO` was provided**: verify it:

```bash
GH_HOST=code.ssnc.dev gh repo view OWNER/REPO --json name,owner,description,url
```

If valid, confirm with the user. If not, ask for the correct one.

**If no repo provided**, detect from the git remote:

```bash
git remote get-url origin 2>/dev/null
```

Parse `OWNER/REPO` from a `code.ssnc.dev` URL (SSH `git@code.ssnc.dev:OWNER/REPO.git`
or HTTPS `https://code.ssnc.dev/OWNER/REPO`). If the remote host is NOT
`code.ssnc.dev`, warn that this backend targets the SS&C Enterprise instance and ask
the user to confirm the host/repo.

Confirm with the user:

```
I detected GitHub repo OWNER/REPO on code.ssnc.dev from the git remote.

Is this the right repo for issue tracking?
(a) Yes, cache OWNER/REPO
(b) No, let me enter a different OWNER/REPO
```

### Step 5: Fetch repository metadata

Run with `GH_HOST=code.ssnc.dev`. Make independent calls in parallel where possible.
Use the issue number / repo from the local remote — do NOT pass `--repo` unless a
non-origin repo was explicitly chosen.

**Batch 1 (parallel):**
- Labels: `gh label list --limit 100 --json name,description,color`
- Milestones: `gh api repos/OWNER/REPO/milestones --jq '.[] | {title,number,state}'`
  (milestones map roughly to Jira versions/sprints)
- Repo details: `gh repo view --json name,owner,description,defaultBranchRef,url`

**Batch 2:**
- Issue templates: list `.github/ISSUE_TEMPLATE/*` in the repo (read the working tree
  if checked out, else `gh api repos/OWNER/REPO/contents/.github/ISSUE_TEMPLATE`).
  These are the GitHub analogue of Jira issue types.

**Governance label check**: verify the two harness labels exist; if missing, note
that they will be auto-created on first use (or offer to create them now):
- `claude-code-agent-harness`
- `human-review-required`

If any call fails, log a warning and continue with what succeeded.

### Step 6: Write `.claude/rules/github.md`

```bash
mkdir -p .claude/rules
```

Write the context file:

```markdown
# GitHub Issues Context

> Auto-generated by /agent-orch:github-issues. Do not edit manually —
> run `/agent-orch:github-issues refresh` to update.
> Last updated: [YYYY-MM-DDTHH:MM:SS]
> Repo: [OWNER/REPO]   Host: code.ssnc.dev
>
> NOTE: The current user / assignee is intentionally NOT cached here. Resolve it
> live with the literal `@me` in gh flags at the point of use. Caching identity
> leads to mis-assignment when a different person later runs /make, /groom, etc.

## Tracker Contract

> This is the normalized header consuming skills read. See
> `plugins/agent-orch/rules/tracker-provider.md`.

- provider: github
- host: code.ssnc.dev
- repo: [OWNER/REPO]
- id_shape: `#<number>` (or `OWNER/REPO#<number>`)
- current_user: `@me` (live, never cached)
- harness_label: claude-code-agent-harness
- review_label: human-review-required
- status_model: labels        # labels | project (from github-workflow.yaml; default labels)
- statuses:
    in_progress: status:in-progress
    in_review:   status:in-review
    done:        close          # `close` ⇒ gh issue close

## Auto-Execution Rule

When the user asks to perform ANY issue operation (create, search, comment,
assign, label, close) and `tracker: github` is active:

1. If this file has no `## Tracker Contract` section, run `/agent-orch:github-issues`
   first to discover and cache the repo.
2. Use the `gh` mappings from `tracker-provider.md` §3b with `GH_HOST=code.ssnc.dev`.
   Use the issue NUMBER only; the local remote already points at the right repo.
3. Resolve "who am I" live via `@me`, never from this file.

## Labels

| Name | Description | Color |
|------|-------------|-------|
[For each label, one row]

## Milestones

| Title | Number | State |
|-------|--------|-------|
[For each milestone, or "No milestones configured."]

## Issue Templates (issue "types")

| Template | File |
|----------|------|
[For each template under .github/ISSUE_TEMPLATE/, or "No issue templates; use --title/--body."]

---

## Agent Harness Labels

| Label | Meaning | Effect |
|-------|---------|--------|
| `claude-code-agent-harness` | Agent-ready | Appears in `/agent-orch:github-issues work` queue |
| `human-review-required` | Needs human approval first | Shown with a warning gate |

**Find agent-ready work:**
```bash
GH_HOST=code.ssnc.dev gh issue list --state open \
  --label claude-code-agent-harness \
  --json number,title,labels,assignees,url --limit 50
```

**Add the harness label:**
```bash
GH_HOST=code.ssnc.dev gh issue edit <N> --add-label claude-code-agent-harness
```

---

## Quick Reference (gh on code.ssnc.dev)

All commands assume `export GH_HOST=code.ssnc.dev` and use the issue NUMBER only.

**Create an issue:**
```bash
gh issue create --title "..." --body "..." [--label bug] [--milestone "..."]
```

**View an issue:**
```bash
gh issue view <N> --json number,title,body,labels,assignees,state,url
```

**Comment:**
```bash
gh issue comment <N> --body "..."
```

**Assign to me:**
```bash
gh issue edit <N> --add-assignee @me
```

**Set status (labels model):**
```bash
# in progress
gh issue edit <N> --add-label status:in-progress --remove-label status:in-review
# in review
gh issue edit <N> --add-label status:in-review --remove-label status:in-progress
# done
gh issue close <N>
```

**Link a PR to an issue:** put `Closes #<N>` in the PR body (auto-closes on merge).
```

### Step 7: Confirm to user

```
GitHub Issues context cached.

  [OWNER/REPO] on code.ssnc.dev:
    [N] labels, [N] milestones, [N] issue templates
    Status model: labels (status:in-progress / status:in-review / close)

File: .claude/rules/github.md (auto-loaded into every conversation)

This context is used automatically when tracker: github is set in .make-config.md.
To switch a repo to this backend: set `tracker: github` in .make-config.md.
To refresh: /agent-orch:github-issues refresh
```

---

## Work Queue (`work` argument)

Mirrors `/agent-orch:jira-work` exactly, using the GitHub verb mappings. The
governance model is identical — only issues labelled `claude-code-agent-harness`
are shown; issues with only `human-review-required` are excluded.

### Filter: assigned to me
```bash
GH_HOST=code.ssnc.dev gh issue list --state open \
  --label claude-code-agent-harness --assignee @me \
  --json number,title,labels,url --limit 25
```

### Filter: all open agent-ready
```bash
GH_HOST=code.ssnc.dev gh issue list --state open \
  --label claude-code-agent-harness \
  --json number,title,labels,assignees,url --limit 25
```

Present the list (number, title, assignee, flags for `human-review-required`), let
the user pick one, then hand off to `/agent-orch:build` or `/agent-orch:implement`
with the issue number as context — the same handoff `/jira-work` performs. Before
starting work, set status to in-progress and assign `@me` via the verbs above.

---

## Triage (`triage` argument)

For each unlabeled open issue, classify it the same way `orchestrate-jira-triage`
does, then apply the governance label via `add_label`:

```bash
# agent-ready
GH_HOST=code.ssnc.dev gh issue edit <N> --add-label claude-code-agent-harness
# needs human review
GH_HOST=code.ssnc.dev gh issue edit <N> --add-label human-review-required
```

List candidates:
```bash
GH_HOST=code.ssnc.dev gh issue list --state open \
  --search "no:label" --json number,title,url --limit 50
```

Present each, recommend a classification, and apply on confirmation. This is the
human-on-the-loop gate: the human approves which work agents may pick up.

---

## Edge Cases

**`gh` not authenticated for code.ssnc.dev:**
```
Run: GH_HOST=code.ssnc.dev gh auth login  (GitHub Enterprise Server, host code.ssnc.dev)
```

**Git remote is not on code.ssnc.dev:**
- Warn: this backend targets the SS&C Enterprise instance.
- Ask the user to confirm `OWNER/REPO` and host before caching.

**Harness labels missing:**
- On first `add_label`/work-queue use, create them automatically:
  ```bash
  GH_HOST=code.ssnc.dev gh label create claude-code-agent-harness \
    --description "Agent-ready (Claude Code harness)" --color 1d76db
  GH_HOST=code.ssnc.dev gh label create human-review-required \
    --description "Needs human approval before agent work" --color d93f0b
  ```
- For `status_model: labels`, also create `status:in-progress` / `status:in-review`
  on first `set_status` if absent.

**Repo has Issues disabled:**
```
This repo has GitHub Issues disabled. Enable Issues in repo settings, or use
tracker: jira instead.
```

**Rate limiting / partial fetch:**
- Log the warning, cache what succeeded, suggest `refresh`.

---

## Security Notes

- `.claude/rules/github.md` contains repo metadata (labels, milestones, template
  names) but no secrets or tokens. Safe to commit — it mirrors what any repo member
  sees in the GitHub UI.
- The file does NOT cache issue content, comments, or identity.
- Tokens come from the `gh`/`GH_TOKEN` environment, never written to the file.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.github-issues:` entry. If absent or empty, **run
exactly as documented above — no behaviour change** (the default, most common case).

If an entry exists, this skill exposes `before` / `after` hook points. Run listed
targets in order per `plugins/agent-orch/rules/extension-resolver.md`. A failing
target is surfaced but does NOT abort the skill unless the user aborts. Full
contract: `plugins/agent-orch/rules/extensibility.md`. The status model is
configured via `.claude/ssnc-agent-orch/github-workflow.yaml` (see extensibility §6).
