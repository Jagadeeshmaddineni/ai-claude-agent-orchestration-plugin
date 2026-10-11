---
name: groom
description: Interactive agentic backlog grooming on an isolated worktree with Jira lifecycle tracking. Browse issues by Epic, surface items needing attention (overdue, unassigned, missing dates, open questions), batch-assign and transition in groups, sync planning markdown with Jira, and set Epic-level timelines. Produces a self-contained Markdown + Bluestone PDF report for every groomed issue (description, last comment, comment count, attachments, metadata) so stakeholders don't need to click into Jira. Opens a PR with the planning/ changes and the report, then transitions the tracking Jira to Done. Usage: /team-work:groom [JIRA-ID] [Epic key or project key]
---

# Groom: Agentic Backlog Grooming

Interactive backlog grooming reimagined for the "humans on the loop" model. Instead of a scrum master walking through tickets one by one in a meeting, `/groom` surfaces what needs attention, groups it by Epic, and lets you make batch decisions. The agent handles the Jira ceremony — transitions, assignments, comments, dates — while you focus on the decisions that matter.

Inspired by Martin Fowler's guidance: *"The right place for us humans is to build and manage the working loop rather than either leaving the agents to it or micromanaging what they produce."* In grooming, that means: you decide what matters, who owns it, and when it's due. The agent updates Jira, syncs the markdown, and moves on.

Every grooming session runs on an isolated worktree with a tracking Jira issue, and finishes by opening a PR for the `planning/` changes — the same lifecycle pattern as `/agent-orch:make`, so groom commits go through review instead of straight to main.

## What Gets Groomed

Not everything needs grooming. `/groom` focuses on items that need a human decision:

| Status | Groomable? | Why |
|--------|-----------|-----|
| **To Do** (no dates) | Yes | Needs target dates or should be deprioritized |
| **To Do** (past due) | Yes | Overdue — needs rescheduling, reassignment, or scope cut |
| **To Do** (approaching) | Yes | Coming up — confirm readiness, assignment, dependencies |
| **To Do** (future, >N weeks) | Skip | Not due yet — don't waste time on it this session |
| **In Review** (unassigned reviewer) | Yes | Needs someone assigned to review |
| **In Review** (assigned) | Skip | In motion, nothing to groom |
| **In Progress** | Skip | Active work, not groomable (use /work-pop for this) |
| **Done** | Skip | Complete |
| **Open Questions** (from plans) | Yes | First-class groomable items — need resolution |
| **Ideas** (from plans) | Optional | Can promote to work items during grooming |

## Prerequisites

- Must be in a git repository
- Must NOT already be in a worktree
- `gh` CLI must be authenticated (`gh auth status`)
- A remote named `origin` must exist
- `.claude/rules/jira.md` must exist (run `/agent-orch:jira` first)
- MCP server running with Jira access (`/agent-orch:mcp-start`)
- For planning markdown sync: `planning/*.md` files with Jira links

## Process

### Phase 0: Jira Mode Configuration

**Goal**: Determine whether this project uses Jira tracking with `/groom`.

`/groom` shares `.make-config.md` with `/agent-orch:make` — one file, one answer per repo. If you already configured `/make`, `/groom` uses the same setting.

1. **Check for `.make-config.md` in repo root:**

   **If file exists**: Read the `jira_mode` value and proceed to Phase 0.5.

   **If file does NOT exist** (first time):
   ```
   One-time setup question:

   How should /groom handle Jira tracking for grooming sessions?

   (a) Yes -- always require a Jira tracking issue (recommended for teams)
       Every /groom session will be tracked in Jira. You can still opt out per-session.
   (b) No -- never use Jira for session tracking
       /groom still grooms Jira-linked items, but won't create a tracking issue for the session itself.
   (c) Ask me -- prompt each time

   This is stored in .make-config.md and can be changed anytime. It also applies to /agent-orch:make.
   ```

   Create `.make-config.md` based on the user's choice (same format as /make).

### Phase 0.5: Resolve Jira Tracking Issue

**Goal**: Find, search, or create the Jira tracking issue for this grooming session.

> **Note**: This is the *tracking* issue for the session (e.g., "Sprint 42 grooming"). It is separate from the Jira issues you will be grooming in Phase 4+. Use this issue to scope the work: which Epic(s) did you review, what decisions were made, what PR was opened.

**Read `jira_mode` from `.make-config.md`.**

**If `jira_mode: no`**: Skip to Phase 1. No session tracking — existing grooming flow still uses Jira for the items being groomed.

**If `jira_mode: yes` or `jira_mode: ask-me`**:

#### Step 1: Check Jira Prerequisites

Read `.claude/rules/jira.md`:
- If not found: "Jira context not found. Run `/agent-orch:jira` first." Exit.
- Extract: project key, issue type IDs, transition IDs, custom field IDs.

> **Current user is resolved LIVE, never from `jira.md`.** Any operation that needs
> "who am I" (assignee, engineer attribution) MUST call `mcp__jira__jira_getCurrentUser`
> at runtime and use its `accountId` / `displayName`. The user/email in `jira.md`
> reflects whoever last ran `/agent-orch:jira` and may not be the person running
> `/groom` now. Cache the live result once per session and reuse it.

#### Step 2: Detect JIRA-ID in Arguments

Check if the user's arguments contain a pattern matching `[A-Z]+-\d+` (e.g., `PROJ-123`).

**If JIRA-ID found in arguments:**
- Extract the JIRA-ID
- The remaining text is treated as the grooming scope (Epic key or project key, if any)
- Fetch the issue with `mcp__jira__jira_getIssue`
- If issue not found: report error and ask user to verify
- Proceed to Step 3 (Prepare Issue)

**If NO JIRA-ID found:**

**If `jira_mode: ask-me`**: Present options including skip:
```
No Jira tracking issue detected in your arguments.

(a) I have a Jira issue key -- let me type it
(b) Search Jira for an existing grooming issue
(c) Create a new Jira issue for this grooming session
(d) Skip Jira tracking for this session
```

**If `jira_mode: yes`**: Same options but WITHOUT option (d).

**Option (a)**: Ask for the key, fetch with `mcp__jira__jira_getIssue`.

**Option (b)**: Search by common grooming keywords:
```
mcp__jira__jira_searchIssues with:
  jql: "project = [KEY] AND (summary ~ \"groom\" OR summary ~ \"backlog\") AND status != Done ORDER BY updated DESC"
  maxResults: 10
```
Present results, user picks or falls through to create-new.

**Option (c)**: Create a new Jira tracking issue:

1. **Find or search for parent Epic** (same flow as /make):
   - Search Epics in project
   - Or accept Epic key directly
   - Or skip Epic (standalone Story)

2. **Generate issue summary:**
   - Default: `Grooming session — <YYYY-MM-DD>`
   - If scope was provided (e.g., `/groom PROJ-42`): `Grooming session for <Epic name> — <YYYY-MM-DD>`
   - Ask user to confirm or edit

3. **Create the issue:**
   ```
   mcp__jira__jira_createIssue with:
     projectKey: "[KEY from jira.md]"
     summary: "<confirmed summary>"
     issueTypeId: "[Story type ID from jira.md]"
     description: "Created by /team-work:groom\n\nScope: <Epic key or project key or 'all open Epics'>\nHorizon: will be set in Phase 3"
     customFields: { "labels": ["claude-code-agent-harness", "grooming-session"] }
   ```

4. **Link to Epic (if selected):** `mcp__jira__jira_linkIssues` with `Relates` link type (or whatever the project uses for Story-Epic links).

**Option (d)**: Set `GROOM_JIRA_ISSUE=none`, skip to Phase 1.

#### Step 3: Prepare Jira Issue for Session

Once we have a tracking issue, do the standard /make lifecycle prep:

1. **Ensure `claude-code-agent-harness` label exists** — add if missing.
2. **Assign to current user** via `mcp__jira__jira_assignIssue` — resolve identity live with `mcp__jira__jira_getCurrentUser` first; never use a user cached in `jira.md`.
3. **Set start date** (custom field from `jira.md`, if available).
4. **Set version fields** (affects = last tag, fix = next minor; skip with warning if versions don't exist in the Jira project).
5. **Transition to In Progress** via `mcp__jira__jira_transitionIssue`.
6. **Post session start comment** summarising scope and horizon.
7. **Store `GROOM_JIRA_ISSUE=<key>`** for later phases.

### Phase 1: Validate Environment

1. **Not already in a worktree:**
   ```bash
   git worktree list
   ```
   If current directory is inside `.claude/worktrees/`, stop:
   ```
   You are already in a worktree. Exit first (or use /agent-orch:make-clean), then run /groom again.
   ```

2. **`gh` is authenticated:**
   ```bash
   gh auth status
   ```

3. **`.claude/rules/jira.md` exists** (re-check if you skipped Phase 0.5).

### Phase 1.5: Sync Main

1. **Checkout default branch:**
   ```bash
   DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main")
   git checkout $DEFAULT_BRANCH
   ```

2. **Pull latest:**
   ```bash
   git pull --ff-only
   ```

### Phase 2: Create Worktree

1. **Derive a branch name:**

   **If `GROOM_JIRA_ISSUE` is set**: Use the Jira key + summary:
   - `AITOOLS-43-grooming-session-2026-04-30` (truncated to ~50 chars)

   **If no tracking issue**: Use date + scope:
   - `grooming-2026-04-30` or `grooming-proj-42-2026-04-30`

2. **Confirm the branch name with the user** (offer (a) use this, (b) let me type).

3. **Create and enter the worktree** via `EnterWorktree`:
   ```
   EnterWorktree:
     name: "<branch-name>"
   ```

4. **Confirm to user:**
   ```
   Worktree created and entered.
   Branch: <branch-name>
   [If Jira]: Jira: <GROOM_JIRA_ISSUE> - <summary> (In Progress)

   Starting grooming session...
   ```

### Phase 3: Context & Scope

**Goal**: Determine what to groom — whole project, specific Epic, or specific plan.

1. **Read Jira context** from `.claude/rules/jira.md`:
   - Extract project key, current user, issue types, transitions, custom fields
   - If not found (shouldn't happen if Phase 0.5 ran): "Run `/agent-orch:jira` first." Exit.

2. **Determine scope from arguments** (the non-JIRA-ID portion):

   **If Epic key provided** (e.g., `/groom PROJ-42` or `/groom AITOOLS-43 PROJ-42`):
   - Fetch the Epic and its children
   - Scope = that Epic only

   **If project key provided** (e.g., `/groom PROJ`):
   - Scope = all Epics in the project

   **If no scope arguments**:
   ```
   What do you want to groom?

   (a) All open Epics in <project key> — full project grooming
   (b) A specific Epic — I'll search or type the key
   (c) My assigned items only — personal backlog grooming
   (d) Open questions from planning markdown — resolve what's blocking plans
   ```

3. **Set grooming horizon:**
   ```
   How far ahead should we look?

   (a) 2 weeks (sprint-focused)
   (b) 4 weeks (monthly planning)
   (c) 8 weeks (quarterly view)
   (d) Everything (no date filter)

   Items beyond this horizon will be skipped unless overdue.
   ```

   Store as `GROOM_HORIZON_DAYS`.

### Phase 4: Fetch and Analyse

**Goal**: Pull all relevant issues from Jira and planning markdown, classify what needs grooming.

#### Step 1: Fetch Epics

```
mcp__jira__jira_searchIssues with:
  jql: "project = <KEY> AND issuetype = Epic AND status != Done ORDER BY priority DESC, updated DESC"
```

For each Epic, fetch children:
```
mcp__jira__jira_searchIssues with:
  jql: "project = <KEY> AND 'Epic Link' = <EPIC-KEY> AND status != Done ORDER BY priority DESC"
  fields: ["summary", "status", "assignee", "priority", "labels", "duedate", "components", "issuetype", "issuelinks", "fixVersions"]
```

If scope is "my items only":
```
mcp__jira__jira_searchIssues with:
  jql: "project = <KEY> AND assignee = currentUser() AND status != Done ORDER BY priority DESC"
  fields: ["summary", "status", "assignee", "priority", "labels", "duedate", "components", "issuetype", "issuelinks", "fixVersions"]
```

> **Note**: The search response intentionally omits `description`, `comment`, and `attachment` — those are heavy. They're fetched lazily per-issue in Phase 7.5 for items that get groomed (i.e., items that end up in the report). This keeps the search step fast for large backlogs.

#### Step 2: Classify Each Issue

For each issue, determine groomability:

1. **Check status**: In Progress or Done → skip
2. **Check dates**:
   - Has start/due date? If not → groomable (needs dates)
   - Past due date? → groomable (overdue)
   - Due within `GROOM_HORIZON_DAYS`? → groomable (approaching)
   - Due beyond horizon? → skip (future, not yet relevant)
3. **Check assignment**:
   - To Do + unassigned → groomable
   - In Review + no reviewer → groomable
4. **Check for open questions**: Cross-reference with `planning/*.md` Open Questions

#### Step 3: Scan Planning Markdown

```bash
find planning/ -name "*.md" -not -path "planning/reports/*" -type f 2>/dev/null
```

For each plan:
- Extract Open Questions (unchecked `- [ ]` items)
- Extract Ideas with status `open` or `exploring`
- Cross-reference Jira-linked items with fetched issues for status sync

#### Step 4: Build Grooming Summary

Organize findings by Epic:

```
GROOMING SUMMARY — <Project Name>
Horizon: <N> weeks from today (<date range>)

EPIC: Data Ingestion (PROJ-42) — 12 items, 4 done, 3 groomable
  ⚠  2 overdue (past target date)
  📋 1 needs dates
  ❓ 2 open questions from planning

EPIC: Auth Migration (PROJ-55) — 8 items, 6 done, 1 groomable
  📋 1 needs assignment for review

EPIC: SOC 2 Compliance (PROJ-60) — 15 items, 0 done, 0 groomable
  ⏳ All items beyond horizon (target: 6 weeks out) — skipping

UNLINKED TO DO (no Epic): 3 items
  📋 3 need Epic assignment and dates

OPEN QUESTIONS (from planning markdown): 4 unresolved
  📋 2 from q2-pipeline.md
  📋 2 from auth-migration.md

Total groomable: 11 items across 2 Epics + 3 unlinked + 4 open questions
```

### Phase 5: Interactive Grooming by Epic

**Goal**: Walk through each Epic's groomable items, make batch decisions.

```
Which Epic do you want to groom first?

(a) Data Ingestion (PROJ-42) — 3 groomable items + 2 open questions
(b) Auth Migration (PROJ-55) — 1 groomable item
(c) Unlinked items — 3 items need Epic assignment
(d) Open Questions — 4 from planning markdown
(e) Groom all (walk through everything in order)
(f) Done — finish grooming session
```

For each selected Epic, present its groomable items:

#### Grooming View: Epic Detail

```
EPIC: Data Ingestion (PROJ-42)
Progress: 4/12 done (33%) | Target: 2026-05-14

OVERDUE:
  1. [PROJ-101] Configure Kafka retention policies
     Status: To Do | Owner: -- | Due: 2026-04-20 (9 days overdue)
     
  2. [PROJ-103] Set up dead letter queue
     Status: To Do | Owner: Joe | Due: 2026-04-25 (4 days overdue)

NEEDS DATES:
  3. [PROJ-108] Write integration tests for connector
     Status: To Do | Owner: Philip | Due: --

OPEN QUESTIONS (from planning/q2-pipeline.md):
  Q1. How to handle promotion from dev to UAT? (unresolved from 2026-04-27)
  Q2. Should connector support batch AND streaming? (unresolved from 2026-04-27)

What do you want to do?

(a) Groom items one by one
(b) Batch action — select multiple items
(c) Set Epic-level timeline (dates for all stories)
(d) Resolve open questions
(e) Skip this Epic
```

#### Option (a): One by One

For each item:

```
[PROJ-101] Configure Kafka retention policies
Status: To Do | Owner: -- | Due: 2026-04-20 (9 days overdue)

Actions:
(a) Reassign and reschedule
(b) Move to In Review — assign reviewer(s)
(c) Add a comment / set next steps
(d) Deprioritize — push out date
(e) Cut — remove from scope
(f) Skip — nothing to do right now
```

**Option (a): Reassign and reschedule**
```
Assign to: (type name, or pick from team)
  1. Joe Stein
  2. Philip Ricciardi
  3. Someone else — I'll type the name

New target date: (YYYY-MM-DD or relative like "+2 weeks")
```

Execute:
```
mcp__jira__jira_assignIssue with issueKey, assignee
mcp__jira__jira_updateIssue with issueKey, fields: { "duedate": "<date>" }
mcp__jira__jira_postIssueComment with issueKey, comment: "Groomed: reassigned to <name>, rescheduled to <date>. Previous due: <old date>."
```

**Option (b): Move to In Review — assign reviewer(s)**
```
Assign reviewers (comma-separated names or numbers):
  1. Joe Stein
  2. Philip Ricciardi
  3. Someone else

This will:
- Transition to In Review
- Assign the first reviewer
- Comment tagging all reviewers
```

Execute:
```
mcp__jira__jira_transitionIssue with issueKey, transitionId: "<In Review ID>"
mcp__jira__jira_assignIssue with issueKey, assignee: "<first reviewer>"
mcp__jira__jira_postIssueComment with issueKey, comment: "Moved to In Review. Reviewers: <list>. Please review and provide feedback."
```

**Option (c): Comment / next steps**
```
Type your comment or next steps for this issue:
```

Execute:
```
mcp__jira__jira_postIssueComment with issueKey, comment: "<user's text>"
```

**Option (d): Deprioritize**
```
Push to when? (YYYY-MM-DD or relative)
```

Execute: Update due date, add comment explaining deprioritization.

**Option (e): Cut**
```
Are you sure? This will:
- Add a comment explaining it was cut during grooming
- Transition to Done with resolution "Won't Do" (if workflow supports it)

Or would you rather just remove the due date and leave it in backlog?
(a) Cut — mark as Won't Do
(b) Backlog — remove date, keep open
```

#### Option (b): Batch Action

```
Select items for batch action (comma-separated numbers, or "all"):
Items:
  1. [PROJ-101] Configure Kafka retention policies (To Do, overdue)
  2. [PROJ-103] Set up dead letter queue (To Do, overdue)
  3. [PROJ-108] Write integration tests (To Do, no date)

Selection:
```

Then:
```
Batch action for selected items:

(a) Assign all to one person
(b) Set the same due date for all
(c) Move all to In Review
(d) Add the same comment to all
(e) Deprioritize all (push dates)
```

Execute the chosen action for all selected items in a loop, reporting progress:
```
[1/3] PROJ-101: Assigned to Philip, due 2026-05-10 ✓
[2/3] PROJ-103: Assigned to Philip, due 2026-05-10 ✓
[3/3] PROJ-108: Assigned to Philip, due 2026-05-10 ✓

All 3 items updated.
```

#### Option (c): Epic-Level Timeline

```
EPIC: Data Ingestion (PROJ-42)
Current Epic target: 2026-05-14

Stories without dates:
  - PROJ-108: Write integration tests
  - PROJ-110: Configure monitoring alerts
  - PROJ-112: Write runbook

Set dates for these stories relative to Epic target?

Suggested timeline (working backward from 2026-05-14):
  PROJ-108: 2026-05-01 (2 weeks before Epic target)
  PROJ-110: 2026-05-07 (1 week before)
  PROJ-112: 2026-05-12 (2 days before)

(a) Apply suggested dates
(b) I'll set dates manually for each
(c) Set all to the same date
(d) Skip
```

Execute date updates for each story.

#### Option (d): Resolve Open Questions

```
OPEN QUESTIONS for Data Ingestion (from planning/q2-pipeline.md):

Q1. How to handle promotion from dev to UAT?
    Source: Joe & Philip call, 2026-04-27
    
    (a) Resolve — I have an answer
    (b) Assign to someone — they need to answer this
    (c) Convert to Jira issue — this needs its own ticket
    (d) Defer — not ready to answer yet
    (e) Skip

Q2. Should connector support batch AND streaming?
    Source: Joe & Philip call, 2026-04-27
    
    (a) Resolve  (b) Assign  (c) Convert to issue  (d) Defer  (e) Skip
```

**Option (a): Resolve**
```
What's the answer/decision?
```
- Check the `- [ ]` checkbox in the planning markdown: `- [x] <question> — Resolved: <answer> (<date>)`
- Add to the Decisions section if it exists
- Comment on related Jira issues if any

**Option (b): Assign**
```
Who should answer this?
```
- Add a comment on the related Epic: "Open question needs resolution: <question>. Assigned to <name>."
- Leave the checkbox unchecked but add a note: `- [ ] <question> — Assigned to <name> (<date>)`

**Option (c): Convert to issue**
- Create a Jira Task with the question as the summary
- Link to the Epic
- Update the plan: `- [ ] <question> — See PROJ-NNN`

### Phase 6: Sync Planning Markdown

**Goal**: Update planning markdown to reflect all grooming changes.

After all grooming decisions:

1. **For each plan with Jira-linked items:**
   - Update Status column for any items that changed status
   - Update Owner column for any reassignments
   - Check/update Open Questions based on resolutions
   - Add changelog entry: `- <YYYY-MM-DD>: Groomed by <user> via /groom — <summary of changes>`

2. **For resolved open questions:**
   - Check the checkbox in the plan
   - Add the resolution to the Decisions section

### Phase 7: Generate Grooming Report (Markdown + PDF)

**Goal**: Produce a self-contained summary readers can consume without clicking through to Jira. Written to `planning/reports/groom-<YYYY-MM-DD>.md` and `groom-<YYYY-MM-DD>.pdf`.

The report covers every issue that was groomed in Phase 5 (touched by any action — reassign, reschedule, transition, comment, or an Epic-level date set). For each issue it pulls the full Jira context so a reader sees everything without opening Jira.

#### Step 1: Fetch Enriched Jira Context

For every groomed issue key, pull the full detail view including description, comments, and attachments:

```
mcp__jira__jira_getIssue with:
  issueKey: "<KEY>"
  expand: "renderedFields"
```

Extract:
- **Description** (`fields.description`) — render inline in the report; empty → "(no description)"
- **Comments** (`fields.comment.comments` or via `mcp__jira__jira_getIssueComments` if the issue has many comments)
  - Take the **total count** from `fields.comment.total`
  - Take the **last comment** (highest `created` timestamp) — author name, timestamp, body. If there are zero comments, say so.
- **Attachments** (`fields.attachment[]`) — filename, size (human-readable), mime type, author, and the Jira browse URL. If zero, say "(no attachments)".
- **Metadata**:
  - Status (`fields.status.name`)
  - Assignee display name (`fields.assignee.displayName`) or "Unassigned"
  - Reporter (`fields.reporter.displayName`)
  - Priority (`fields.priority.name`)
  - Labels (`fields.labels[]`)
  - Components (`fields.components[*].name`)
  - Fix versions (`fields.fixVersions[*].name`)
  - Due date (`fields.duedate`)
  - Created / updated timestamps
  - Issue type (`fields.issuetype.name`)
  - Linked issues (`fields.issuelinks[]`) — inward/outward type + key + summary
  - Parent Epic (from `customfield_10005` / Epic Link)
- **Browse URL**: `<JIRA_BASE_URL>/browse/<KEY>` — take `JIRA_BASE_URL` from `.claude/rules/jira.md`

Also fetch the same context for the tracking Jira issue (`GROOM_JIRA_ISSUE`) so it can be included at the top of the report.

#### Step 2: Write the Markdown Report

Write `planning/reports/groom-<YYYY-MM-DD>.md`. Use this skeleton:

```markdown
# Grooming Session Report — <YYYY-MM-DD>

**Tracking issue:** [<GROOM_JIRA_ISSUE>](<browse-url>) — <summary> (<status>)
**Scope:** <Epic name> / <project key> / "all open Epics"
**Horizon:** <N> weeks (<date range>)
**Engineer:** <displayName from mcp__jira__jira_getCurrentUser — resolved live, never from jira.md>
**Generated:** <timestamp>

## Tracking Issue

**Status:** <status> | **Assignee:** <assignee> | **Priority:** <priority>
**Labels:** <csv> | **Components:** <csv> | **Fix versions:** <csv>

### Description

<tracking issue description, or "(no description)">

### Comments (<total>)

**Last comment** — <author>, <timestamp>:

> <last comment body, blockquoted>

### Attachments (<count>)

- `<filename>` (<size>, <mime>) — uploaded by <author> — [view](<url>)

### Linked Issues

- **Relates to** [EPIC-KEY](<url>) — <summary> (<status>)

---

## Actions Taken

- 5 items reassigned
- 3 items rescheduled
- 2 items moved to In Review
- 2 open questions resolved
- 1 open question converted to PROJ-115

---

## Items Groomed

### PROJ-101 — Configure Kafka retention policies

**Type:** <type> | **Status:** <status> | **Assignee:** <name>
**Priority:** <priority> | **Due:** <date>
**Labels:** <csv> | **Components:** <csv> | **Epic:** [<EPIC-KEY>](<url>)

**Actions this session:** Reassigned to Philip, rescheduled to 2026-05-10

**Description:**

> <description body, blockquoted>

**Comments (<total>)** — Last comment by <author>, <timestamp>:

> <last comment, blockquoted>

**Attachments (<count>):**

- `retention-policy.yaml` (2 KB, application/yaml) — uploaded by Joe Stein — [view](<jira-attachment-url>)

**Linked Issues:**

- **Blocks** [PROJ-104](<url>) — Connector release (To Do)

**Jira link:** <browse-url>

---

<repeat the block above for every groomed issue>

## Open Questions Resolved

- **Q1: How to handle promotion from dev to UAT?** (from `planning/q2-pipeline.md`)
  - *Resolution:* Use a manual gate in CD pipeline; UAT sign-off required before prod.

## Open Questions Deferred / Converted

- **Q3: Should connector support batch AND streaming?** — Converted to PROJ-115

## Planning Markdown Changes

- `planning/q2-pipeline.md` (3 status changes, 2 questions resolved)
- `planning/auth-migration.md` (1 assignment change)
```

Rules:
- Every issue key in the report MUST link to `<JIRA_BASE_URL>/browse/<KEY>`.
- Every attachment row MUST link to the Jira attachment URL so the reader can open it in Jira if they want — but the filename, size, author, and mime type are visible in the report itself.
- Never embed raw attachment bytes. The report stays text-only.
- If a field is empty (no description, no comments, no attachments, no linked issues), print a placeholder like "(no description)" or "(no attachments)" — never omit the section.

#### Step 3: Render the PDF

Use the same Bluestone light-mode PDF pipeline as `work-report` / `work-recap`. Write `planning/reports/groom-<YYYY-MM-DD>.pdf` alongside the Markdown.

1. **Check `reportlab` is available:**
   ```bash
   python3 -c "import reportlab" 2>/dev/null
   ```
2. **If missing**, install with the same fallback order as Phase 5 of `/team-work:work-recap`:
   - `python3 -m pip install --user reportlab`
   - `pipx run --spec reportlab ...`
   - `uv pip install --system reportlab`
3. **Generator script**: parse the Markdown from Step 2 and emit a Bluestone-styled PDF. Use:
   - Palette: `PRIMARY #1F6681`, `SECONDARY #0D9DDB`, `SUBTLE_BG #EEF4F8`, `LIGHT_BG #F6FDFF`
   - Cover page with "Grooming Session Report" title, tracking issue key + summary, date
   - Body with header/footer chrome (project name · "Grooming Session" · page number)
   - Tables for metadata (`BaseDocTemplate` with two `PageTemplate`s — cover + body)
4. **If install fails**, keep the Markdown report and emit the PDF step as a warning, not an error:
   ```
   reportlab not available — Markdown report written, PDF skipped.
   Install reportlab and run the generator manually to produce the PDF.
   ```

Both files go in the Phase 8 commit so the PR includes them.

### Phase 8: Commit, Push, and PR

**Goal**: Commit the worktree's `planning/` changes (plan files + the new report) and open a PR. Mirrors /make's Phase 4-5.

1. **Check for changes:**
   ```bash
   git status --porcelain
   ```
   If no changes at all (no planning markdown edits AND the report generation was skipped):
   ```
   Grooming made Jira updates but produced no local changes. Nothing to commit or push.
   Worktree is unchanged — safe to exit. Use ExitWorktree to clean up.
   ```
   Skip to Phase 9 (still post Jira summary comment if `GROOM_JIRA_ISSUE` is set).

2. **Stage and commit:**
   ```bash
   git add planning/
   git commit -m "planning: groom session <YYYY-MM-DD> — <N> items updated, <M> questions resolved

   [If Jira]: <GROOM_JIRA_ISSUE>
   Groomed with /team-work:groom"
   ```

3. **Push:**
   ```bash
   git push -u origin <branch-name>
   ```
   If push fails, report the error and stop here; changes remain committed locally.

4. **Create PR** (only if there were changes):
   ```bash
   DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')
   gh pr create --base "$DEFAULT_BRANCH" \
     --title "[<GROOM_JIRA_ISSUE>] Grooming session <YYYY-MM-DD>" \
     --body "<summary of what was groomed>"
   ```
   PR body includes: scope, horizon, counts (reassigned, rescheduled, moved to In Review, questions resolved, issues created), a link to the grooming report (`planning/reports/groom-<YYYY-MM-DD>.md` / `.pdf`), and links to every affected planning file.

5. **Transition tracking Jira to Done** (if set):
   ```
   mcp__jira__jira_transitionIssue with:
     issueKey: "<GROOM_JIRA_ISSUE>"
     transitionId: "<Done transition ID from jira.md>"
   ```
   Rationale: grooming is the deliverable — the PR is the record. Unlike /make (where the tracking issue transitions to Under Review because code still needs review), /groom's output is the planning changes and the report, both of which are captured in the PR. Marking the tracking issue Done when the PR is open reflects "the grooming session is complete."

   If the Done transition is not available from the current status (unusual), fall back to Under Review (id `41`) with a note in the Jira comment.

6. **Comment on tracking Jira with PR link + report links:**
   ```
   mcp__jira__jira_postIssueComment with:
     issueKey: "<GROOM_JIRA_ISSUE>"
     comment: "Grooming session complete.\n\nPR: <PR_URL>\nReport: planning/reports/groom-<YYYY-MM-DD>.md (and .pdf)\nBranch: <branch-name>\n\nActions taken: <N> items reassigned, <M> rescheduled, <K> moved to In Review, <J> questions resolved.\n\nStatus: Done"
   ```

### Phase 9: Session Summary

**Goal**: Show what was accomplished in this grooming session.

```
GROOMING SESSION COMPLETE — <date>

Actions taken:
  ✓ 5 items reassigned
  ✓ 3 items rescheduled
  ✓ 2 items moved to In Review
  ✓ 2 open questions resolved
  ✓ 1 open question converted to PROJ-115
  ✓ Epic timeline set for Data Ingestion (3 stories dated)

Remaining groomable items: 4
  - 3 unlinked items still need Epic assignment
  - 1 open question deferred

Grooming report:
  - planning/reports/groom-<YYYY-MM-DD>.md (self-contained — includes description, last comment + comment count, attachments, and metadata for every groomed issue)
  - planning/reports/groom-<YYYY-MM-DD>.pdf (Bluestone-styled)

Planning markdown updated:
  - planning/q2-pipeline.md (3 status changes, 2 questions resolved)
  - planning/auth-migration.md (1 assignment change)

[If Jira tracking]:
  Tracking issue: <GROOM_JIRA_ISSUE> (Done)
  Pull request: <PR_URL>
  Branch: <branch-name>

Next steps:
- Review and merge the PR with /agent-orch:make-clean (from inside the worktree) or gh pr merge
- Share the PDF with PMs / leads who want the grooming output without opening Jira
- Run /groom again for the next cycle
- Run /team-work:work-report for a unified status view
```

---

## Integration with Other team-work Skills

| Skill | How /groom Relates |
|-------|--------------------|
| `/work-prep` | Open questions created in /work-prep are first-class groomable items in /groom |
| `/work-plan` | Issues created by /work-plan get groomed when they need dates, assignments, or review |
| `/work-pop` | After grooming sets dates and assignments, /work-pop picks up the next ready item |
| `/work-report` | /work-report reflects grooming changes in the next HTML report |
| `/agent-orch:make` | /groom shares `.make-config.md` and the worktree/PR lifecycle pattern |
| `/agent-orch:make-clean` | After PR merge, run /make-clean from inside the worktree to tidy up |

## Workflow: The Agentic SDLC Loop

```
/work-prep    → Capture requirements, ideas, open questions from stakeholder calls
/work-plan    → Convert agreed plan to Jira with dependencies
/groom        → Keep the backlog healthy: dates, assignments, open questions, priorities (on a worktree, opens PR)
/work-pop     → Pick your next item and launch /make
/make-clean   → Merge, mark done, plan syncs
/work-report  → Generate unified status report
/groom        → Next grooming cycle...
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Already in a worktree | Tell user to exit first, then re-run |
| `gh` not authenticated | Tell user to run `gh auth login` |
| No `.make-config.md` | First-time setup prompt (Phase 0) |
| No `.claude/rules/jira.md` | "Run `/agent-orch:jira` first." Exit |
| No Epics found | Show ungrouped To Do items, suggest creating Epics |
| MCP server not running | Warn, offer to run /agent-orch:mcp-start |
| Transition not available | Report which transitions are available, let user choose |
| Assignment fails | Report error, continue with other items |
| No groomable items | "Backlog is clean. Nothing to groom." — still opens PR only if planning changed |
| Planning files not found | Groom from Jira only, skip markdown sync and PR |
| Batch operation partial failure | Report which items succeeded and which failed |
| No planning changes after grooming | Skip commit/push/PR, still post Jira summary |
| Push fails | Keep changes committed locally, show manual fix |
| PR creation fails | Branch is pushed, show `gh pr create` command |
| Version not found in Jira | Skip version fields with warning |

---

## Design Decisions

**Epic-first, not flat list.** A principal engineer grooming a project wants to see "How is Data Ingestion going?" not a flat list of 50 tickets. Epics are the natural grouping for strategic grooming. Flat lists are for /work-pop (tactical picking).

**Date-aware skipping.** If SOC 2 work isn't due for 6 weeks, don't surface it. Grooming time is expensive — spend it on what's approaching, not what's distant. The horizon is configurable per session.

**Batch over one-at-a-time.** Traditional grooming walks through tickets sequentially. That's slow. If 5 items all need the same reviewer, assign them all at once. If 3 items are overdue and need the same date push, push them together.

**Open questions are groomable.** The biggest grooming gap isn't tickets — it's the open questions sitting in planning markdown that nobody's resolving. /groom surfaces them alongside Jira issues because they block progress just as much as a missing assignment does.

**In Review = handoff.** Moving to In Review means "this is ready for someone else to look at." /groom makes that handoff explicit: assign the reviewer(s), transition, and comment — all in one action. No silent status changes.

**Skip what's in motion.** In Progress items are being worked on. Done items are done. Neither needs grooming. This isn't a status meeting — it's decision-making time for items that are stuck, approaching, or unclear.

**Sync is bidirectional.** Grooming changes in Jira (status, assignment, dates) flow back to planning markdown. Open question resolutions in markdown flow to Jira comments. The plan and the board stay aligned.

**Worktree + PR for planning changes.** Grooming changes to `planning/*.md` used to go directly to whatever branch the user was on — including main. Running /groom on a worktree with a PR means those changes get review, CI, and an audit trail. The Jira side (status, assignments, comments) still applies immediately because that's the point of grooming — but the *documentation* of what was decided follows the same review gate as code.

**Shared config with /make.** `.make-config.md` is the single knob for "does this repo track agent sessions in Jira." /groom and /make both read it. One file, one answer, consistent behaviour.

**Tracking Jira transitions to Done, not Under Review.** /make transitions to Under Review when it opens a PR because the *code* still needs review. /groom transitions to Done because the grooming *session* is complete — the PR is just the record. The report and the plan changes are the deliverable, not something to be judged for correctness before the issue can close.

**Self-contained report, not a Jira pointer.** The Markdown + PDF include the full description, the last comment (with comment count), and every attachment reference for every groomed issue. A PM reading the PDF should not need to click into Jira to understand what was discussed, what decisions were made, or what artifacts were produced. Jira remains the source of truth; the report is the snapshot.

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.groom:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
