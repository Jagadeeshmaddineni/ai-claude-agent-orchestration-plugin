---
name: jira-work
description: Jira-driven work queue for Claude Code. Browse agent-ready issues, triage backlogs, and hand off to /build or /implement. Human-on-the-loop governance via labels. Usage: /agent-orch:jira-work [triage|my|open|ISSUE-KEY]
---

# Jira Work Queue

Browse, triage, and pick up Jira issues for agent-assisted implementation. Uses label-based governance so humans design the harness (which issues are agent-ready) and agents operate autonomously within it.

## Governance Model: Human on the Loop

This skill implements **human-on-the-loop** governance (per Martin Fowler's framework). Instead of humans reviewing every agent output, humans control _which work_ agents can pick up:

- **`claude-code-agent-harness`** — This issue is agent-ready. Claude Code can pick it up and work autonomously via `/build` or `/implement`.
- **`human-review-required`** — A human must review and approve this issue before any agent work begins. The agent will NOT pick up issues with only this label.
- **Unlabeled issues** — Unknown status. Use `/jira-work triage` to classify them.

The labels are the harness. The human designs the harness; the agent operates within it.

## Usage

```
/agent-orch:jira-work              # Interactive wizard (default)
/agent-orch:jira-work my           # My agent-ready issues (assigned to me)
/agent-orch:jira-work open         # All agent-ready open issues
/agent-orch:jira-work triage       # Triage unlabeled issues (add labels interactively)
/agent-orch:jira-work PROJ-123     # Jump straight to working on a specific issue
```

---

## Process

### Step 0: Tracker check (GitHub redirect)

This skill is the **Jira** work queue. If the repo's active tracker is `github`
(per `plugins/agent-orch/rules/tracker-provider.md` §1 — `.make-config.md`
`tracker: github` or `tracker.yaml`), the equivalent queue lives in the GitHub
backend. Tell the user:

```
This repo uses the GitHub Issues tracker. Run /agent-orch:github-issues work for
the agent-ready queue (same governance labels, GitHub backend).
```

Then exit. Otherwise (tracker `jira` or unset), continue below — the governance
model and queue behaviour are identical across both backends.

### Step 1: Ensure Jira Context Exists

Read `.claude/rules/jira.md`.

**If file does not exist or has no `## Project:` section:**

```
No Jira project context found. I need to set up Jira integration first.

This will discover your project, cache metadata, and enable the work queue.

Ready to set up?
(a) Yes -- run /agent-orch:jira now
(b) No -- exit
```

- If **(a)**: Tell the user to run `/agent-orch:jira` and then re-run `/agent-orch:jira-work`. Exit.
- If **(b)**: Exit.

**If file exists with project context**: Continue to Step 2.

### Step 2: Determine Mode from Arguments

Parse arguments:

| Argument | Mode |
|----------|------|
| (none) | **Interactive wizard** -- ask what to view |
| `my` | **My issues** -- skip to Step 4 with filter=assigned-to-me |
| `open` | **Open issues** -- skip to Step 4 with filter=all-open |
| `triage` | **Triage mode** -- skip to Step 6 |
| `PROJ-123` (matches `[A-Z]+-\d+`) | **Direct pickup** -- skip to Step 7 with that issue key |

### Step 3: Select Project (if multiple cached)

Read `.claude/rules/jira.md` and extract all `## Project: [KEY]` sections.

**If one project cached**: Use it automatically. Continue to Step 3b.

**If multiple projects cached**:

```
Multiple Jira projects are configured:

  1. [KEY1] - [project name]
  2. [KEY2] - [project name]
  ...

Which project do you want to work from?
(enter number, project key, or "all" to search across projects)
```

Wait for response. Store selected project key(s).

### Step 3b: Choose View (Interactive Wizard Mode Only)

**Skip this step** if mode was set from arguments in Step 2.

```
What would you like to do?

(a) My Issues -- agent-ready issues assigned to me
(b) Open Issues -- all agent-ready open issues in [KEY]
(c) Both -- my issues first, then other open issues
(d) Triage -- classify unlabeled issues for agent work
(e) Pick a specific issue -- enter an issue key
```

Wait for response.

- **(a)**: Set filter=assigned-to-me, continue to Step 4
- **(b)**: Set filter=all-open, continue to Step 4
- **(c)**: Set filter=both, continue to Step 4
- **(d)**: Continue to Step 6 (triage mode)
- **(e)**: Ask "Enter the issue key (e.g., PROJ-123):", then continue to Step 7

### Step 4: Query Agent-Ready Issues

Build JQL queries based on the selected filter. Use project key(s) from `.claude/rules/jira.md`. For "my issues" use the JQL `currentUser()` function (or resolve identity live via `mcp__jira__jira_getCurrentUser`) — never a user/email cached in `jira.md`.

**CRITICAL**: Only show issues with the `claude-code-agent-harness` label. This is the governance gate — unlabeled issues are not agent-ready.

**Also exclude** issues that ONLY have `human-review-required` (those need human approval first). Issues with BOTH `claude-code-agent-harness` AND `human-review-required` are shown but flagged.

#### Filter: assigned-to-me

```
mcp__jira__jira_searchIssues with:
  jql: "project = [KEY] AND labels = claude-code-agent-harness AND assignee = currentUser() AND status != Done AND status != Closed ORDER BY priority DESC, updated DESC"
  maxResults: 25
```

#### Filter: all-open

```
mcp__jira__jira_searchIssues with:
  jql: "project = [KEY] AND labels = claude-code-agent-harness AND status != Done AND status != Closed ORDER BY priority DESC, updated DESC"
  maxResults: 25
```

#### Filter: both

Run both queries above. Present "My Issues" section first, then "Other Open Issues" (excluding my issues from the second set).

#### Filter: all projects (if user chose "all")

Replace `project = [KEY]` with `project in ([KEY1], [KEY2], ...)`.

### Step 5: Present Issues and Pick One

**If no issues found:**

```
No agent-ready issues found in [KEY] matching your filter.

This means no issues have the `claude-code-agent-harness` label yet.

Options:
(a) Triage open issues -- classify them for agent work
(b) Search all open issues (without label filter)
(c) Exit
```

- **(a)**: Continue to Step 6
- **(b)**: Re-run query without the label filter, show results, but note they aren't agent-ready yet
- **(c)**: Exit

**If issues found, present them:**

For filter=both, show two sections. Otherwise show one table.

```
## My Agent-Ready Issues ([N] found)

| # | Key | Type | Priority | Summary | Status | Labels |
|---|-----|------|----------|---------|--------|--------|
| 1 | [KEY-123] | Story | High | [summary truncated to ~60 chars] | In Progress | agent-harness |
| 2 | [KEY-456] | Bug | Critical | [summary] | Open | agent-harness, human-review |
| 3 | [KEY-789] | Task | Medium | [summary] | To Do | agent-harness |

## Other Open Agent-Ready Issues ([N] found)

| # | Key | Type | Priority | Summary | Status | Assignee | Labels |
|---|-----|------|----------|---------|--------|----------|--------|
| 4 | [KEY-101] | Story | High | [summary] | Open | Alice | agent-harness |
| 5 | [KEY-202] | Task | Low | [summary] | Open | unassigned | agent-harness |
```

**Flag issues needing human review:**

If an issue has BOTH `claude-code-agent-harness` AND `human-review-required`:
- Show it in the table with a marker in the Labels column
- When selected, warn: "This issue is marked `human-review-required`. Has a human reviewed and approved it for agent work?"
  - If yes: proceed
  - If no: skip this issue, suggest removing `human-review-required` label after review

**Ask user to pick:**

```
Pick an issue to work on (enter number or issue key), or:
(r) Refresh the list
(t) Switch to triage mode
(q) Quit

```

Wait for response.

- **Number or issue key**: Continue to Step 7 with that issue
- **(r)**: Re-run Step 4
- **(t)**: Continue to Step 6
- **(q)**: Exit

### Step 6: Triage Mode

Triage mode helps classify unlabeled issues for agent work. This can run as an interactive wizard or launch the `orchestrate-jira-triage` agent for batch analysis.

#### Step 6a: Query Unlabeled Issues

Find open issues that do NOT have `claude-code-agent-harness`:

```
mcp__jira__jira_searchIssues with:
  jql: "project = [KEY] AND status != Done AND status != Closed AND (labels IS EMPTY OR labels NOT IN (claude-code-agent-harness)) ORDER BY priority DESC, updated DESC"
  maxResults: 30
```

**If no issues found**: "All open issues are already classified. Nothing to triage."

#### Step 6b: Choose Triage Method

```
Found [N] open issues without the `claude-code-agent-harness` label.

How would you like to triage them?

(a) Interactive -- I'll show each issue and you decide (best for small batches)
(b) Agent-assisted -- the triage agent analyzes issues and suggests labels,
    you confirm each suggestion (best for large backlogs)
(c) Quick filter -- just show me the list and I'll pick which ones to label
```

- **(a)**: Continue to Step 6c (interactive)
- **(b)**: Continue to Step 6d (agent-assisted)
- **(c)**: Continue to Step 6e (quick filter)

#### Step 6c: Interactive Triage

For each unlabeled issue (one at a time):

1. Fetch the full issue: `mcp__jira__jira_getIssue` with the issue key
2. Present it:

```
Issue [N] of [total]: [KEY-NNN]

Type: [type] | Priority: [priority] | Status: [status]
Summary: [full summary]
Description:
  [description, first 500 chars]
[If acceptance criteria present]:
Acceptance Criteria:
  [criteria]

Current Labels: [labels or "none"]
Assignee: [name or "unassigned"]
```

3. Ask:

```
Is this issue suitable for Claude Code agent work?

(a) Yes -- add `claude-code-agent-harness` label (agent can pick this up)
(b) Needs human review first -- add `human-review-required` label
(c) Both -- add both labels (agent-ready but flag for human review)
(d) Skip -- not code work or not for this repo
(e) Let me see more details first
(q) Stop triaging
```

4. Apply the chosen labels:

```
mcp__jira__jira_updateIssue with:
  issueKey: "[KEY-NNN]"
  update: { "labels": { "add": ["claude-code-agent-harness"] } }
```

For `human-review-required`:
```
mcp__jira__jira_updateIssue with:
  issueKey: "[KEY-NNN]"
  update: { "labels": { "add": ["human-review-required"] } }
```

5. Show confirmation and move to next issue.

**After all issues triaged** (or user quits):

```
Triage complete.

  [N] issues labeled `claude-code-agent-harness` (agent-ready)
  [N] issues labeled `human-review-required` (needs human review)
  [N] issues skipped
  [N] issues remaining (unlabeled)

Would you like to view agent-ready issues now?
(a) Yes -- show my agent-ready issues
(b) Yes -- show all agent-ready issues
(c) No -- exit
```

#### Step 6d: Agent-Assisted Triage

Launch the `orchestrate-jira-triage` agent for batch analysis.

Use the **Agent tool** with:
- **subagent_type**: `agent-orch:orchestrate-jira-triage`
- **description**: "Analyse and classify Jira issues"
- **prompt**:
  ```
  Read .claude/rules/jira.md for project context.

  Analyse the following Jira issues and classify each one.
  For each issue, determine:
  1. Is this code/repo work that Claude Code can do? (bug fix, feature, refactor, test, docs)
  2. Does it match the current repository? (check file references, tech stack, component names)
  3. Is it well-specified enough for autonomous agent work, or does it need human clarification first?

  Classification rules:
  - `claude-code-agent-harness`: Issue is code work, matches this repo, and is well-specified
  - `human-review-required`: Issue is code work but needs human clarification, or is sensitive/risky
  - `skip`: Not code work (process, meeting, manual task), or belongs to a different repo

  Analyse the codebase (file structure, tech stack, package.json/pyproject.toml) to determine
  what kind of work this repo handles.

  Issues to analyse:
  [Insert issue summaries and descriptions here]

  Output a structured classification for each issue with:
  - Issue key
  - Recommended label
  - Confidence (HIGH/MEDIUM/LOW)
  - Reasoning (1-2 sentences)
  ```

After the agent returns, present results to the user for confirmation:

```
Agent triage results for [N] issues:

| # | Key | Summary | Suggested Label | Confidence | Reason |
|---|-----|---------|-----------------|------------|--------|
| 1 | KEY-123 | Fix auth bug | agent-harness | HIGH | Bug fix in auth module, matches src/auth/ |
| 2 | KEY-456 | Update onboarding docs | human-review | MEDIUM | Docs work, but scope unclear |
| 3 | KEY-789 | Schedule team retro | skip | HIGH | Not code work |

Apply these labels?
(a) Apply all suggestions
(b) Review one by one (I'll confirm each)
(c) Apply only HIGH confidence suggestions
(d) Cancel -- don't apply any
```

- **(a)**: Apply all via `mcp__jira__jira_updateIssue` for each
- **(b)**: Walk through each, let user override
- **(c)**: Only apply where confidence=HIGH
- **(d)**: Exit

#### Step 6e: Quick Filter

Show a compact table of all unlabeled issues:

```
Open issues without agent labels:

| # | Key | Type | Priority | Summary |
|---|-----|------|----------|---------|
| 1 | KEY-123 | Bug | High | Fix auth timeout |
| 2 | KEY-456 | Story | Medium | Add export feature |
...

Enter numbers to label as `claude-code-agent-harness` (comma-separated):
Example: 1,3,5 or "all" or "none"
```

Then ask:

```
Any of these need `human-review-required` instead? (enter numbers or "none")
```

Apply labels accordingly.

### Step 7: Work on Selected Issue

Once the user has selected an issue (from Step 5 or via direct argument):

#### Step 7a: Fetch Full Issue Details

```
mcp__jira__jira_getIssue with:
  issueKey: "[KEY-NNN]"
```

Read the issue and extract:
- **Summary**: issue title
- **Description**: full description (this becomes the requirements)
- **Acceptance Criteria**: if present in description (look for "Acceptance Criteria", "AC:", "Given/When/Then" patterns)
- **Type**: Bug, Story, Task, etc.
- **Priority**: Critical, High, Medium, Low
- **Labels**: current labels
- **Linked Issues**: any blocks/is-blocked-by relationships
- **Comments**: recent comments (last 5) that might contain additional context
- **Attachments**: note if any exist (screenshots, specs)

#### Step 7b: Check Label Governance

**If issue does NOT have `claude-code-agent-harness` label:**

```
This issue ([KEY-NNN]) does not have the `claude-code-agent-harness` label.

This means it hasn't been classified as agent-ready yet.

After reviewing, would you like to:
(a) Add the label and proceed -- this issue is suitable for agent work
(b) Add both `claude-code-agent-harness` and `human-review-required` -- proceed but flag for review
(c) Don't add the label -- I'll work on it manually
(d) Cancel -- pick a different issue
```

If **(a)** or **(b)**: add the label(s) via `mcp__jira__jira_updateIssue`, then continue.
If **(c)**: continue without adding label (user is opting in manually).
If **(d)**: return to Step 5 or exit.

**If issue has `human-review-required` without evidence of human approval:**

```
This issue is marked `human-review-required`.

Has a human reviewed and approved this for agent work?
(a) Yes -- I've reviewed it, proceed
(b) No -- let me review the details first (show full issue)
(c) Cancel -- pick a different issue
```

If **(b)**: show full issue details, then re-ask.
If **(a)**: continue.

#### Step 7c: Present Issue and Choose Workflow

```
Ready to work on:

[KEY-NNN]: [summary]
Type: [type] | Priority: [priority]

Description:
  [full description]

[If acceptance criteria found]:
Acceptance Criteria:
  [criteria]

[If linked issues]:
Related Issues:
  - Blocks: [list]
  - Blocked by: [list]
  - Related: [list]
```

Then ask:

```
How do you want to work on this?

(a) /build [KEY-NNN] -- standalone implementation (no spec-kit required)
(b) /implement [KEY-NNN] -- spec-kit mode (requires .specify/ directory)
(c) Just assign it to me and add to backlog
(d) View more details (comments, attachments)
(e) Back to issue list
```

- **(a)**: Tell the user to run `/agent-orch:build [KEY-NNN]`. The /build skill will detect the Jira ID argument, fetch the issue, and use it as requirements. Exit this skill.
- **(b)**: Tell the user to run `/agent-orch:implement [KEY-NNN]`. Same flow. Exit.
- **(c)**: Assign the issue to the current user. Resolve identity live — do NOT use any user/email cached in `jira.md`:
  ```
  mcp__jira__jira_getCurrentUser   # → { accountId, displayName }
  mcp__jira__jira_assignIssue with:
    issueKey: "[KEY-NNN]"
    accountId: "<accountId from getCurrentUser>"
  ```
  Then exit.
- **(d)**: Fetch comments and show more details, then re-ask.
- **(e)**: Return to Step 5.

---

## Label Governance Reference

### Labels Used by the Agent Harness

| Label | Meaning | Who Sets It | Effect |
|-------|---------|-------------|--------|
| `claude-code-agent-harness` | Agent-ready work | Human (via triage) or Advocate agent | Issue appears in `/jira-work` queue, can be picked up by `/build` or `/implement` |
| `human-review-required` | Needs human approval before agent work | Human (via triage) or Advocate agent | Issue appears in queue but with a warning gate; agent won't auto-start |

### Governance Flow

```
New Jira Issue Created
        |
        v
  [Unlabeled -- not visible to agent queue]
        |
        v
  /jira-work triage (human or agent-assisted)
        |
        +-- "Yes, agent-ready" --> add `claude-code-agent-harness`
        |                              |
        |                              v
        |                    [Visible in /jira-work queue]
        |                              |
        |                              v
        |                    User picks it --> /build PROJ-123
        |
        +-- "Needs review" --> add `human-review-required`
        |                          |
        |                          v
        |                  [Human reviews and approves]
        |                          |
        |                          v
        |                  Add `claude-code-agent-harness` --> queue
        |
        +-- "Not code work" --> skip (no label added)
```

### When /build or /implement Complete

After a successful build session:
1. The orchestrator transitions the Jira issue to Done
2. Posts a completion comment with summary of changes
3. The `claude-code-agent-harness` label remains (for audit trail / reporting)

### When the Advocate Creates Issues

The Advocate agent (Phase 1.5 of /build and /implement) creates Jira issues for:
- Cross-team dependencies
- Out-of-scope work discovered during implementation
- Backlog items

All Advocate-created issues automatically get the `claude-code-agent-harness` label (after user approval), making them visible in the `/jira-work` queue for future sessions.

---

## Edge Cases

**MCP server not running:**
```
Jira MCP server is not available.
Run /agent-orch:mcp-start to start it.
```
Exit.

**Jira labels field not writable:**
Some Jira configurations restrict label editing. If `updateIssue` fails when adding labels:
```
Could not add label to [KEY-NNN]. Your Jira project may restrict label editing.

Options:
(a) Proceed without labeling (I'll track it in the session only)
(b) Try adding via a different field (custom field for labels)
(c) Exit
```

**Issue already in progress by another agent session:**
Check if the issue has a recent comment starting with "Agent-assisted build session started". If so:
```
This issue appears to have an active agent session:
  [comment summary with engineer name and date]

Options:
(a) Proceed anyway (I know what I'm doing)
(b) Pick a different issue
```

**Issue is in a "Done" or "Closed" status:**
```
This issue ([KEY-NNN]) is already [status].

Options:
(a) Reopen and work on it
(b) Pick a different issue
```

**Issue belongs to a project not cached in jira.md:**
```
Issue [KEY-NNN] belongs to project [KEY] which is not cached.

Options:
(a) Add project [KEY] to Jira context (runs /agent-orch:jira add [KEY])
(b) Cancel
```

---

## Security Notes

- Labels are metadata, not access control. The `claude-code-agent-harness` label is a governance signal, not a security boundary.
- The triage agent reads issue summaries and descriptions but does NOT modify issues without user confirmation.
- All label changes are logged in the Jira issue history for audit trail.
- The skill never auto-starts work on an issue -- the user always makes the final "go" decision.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.jira-work:` entry. If the file is absent, has no
entry for this skill, or the entry is empty, **run exactly as documented above — no
behaviour change.** This is the default and most common case.

If an entry exists, this skill exposes these hook points:
- `before` — targets run before the skill's main work
- `after` — targets run after the skill's main work

Run any listed targets in order, following the shared resolver in
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline).
Tell the user when you run an extension target. A failing target is surfaced but does
NOT abort the skill unless the user aborts. Full contract:
`plugins/agent-orch/rules/extensibility.md`.
