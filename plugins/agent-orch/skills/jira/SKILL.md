---
name: jira
description: Jira integration with project context caching. Auto-discovers project metadata for fast, accurate MCP calls. Usage: /agent-orch:jira [refresh|status|help]
---

# Jira Project Context Manager

Discover and cache your Jira project's metadata so every MCP call uses correct IDs without redundant lookups. The cached context lives in `.claude/rules/jira.md` -- a rules file that's automatically loaded into every conversation.

## Usage

```
/agent-orch:jira              # Discover project(s), cache context
/agent-orch:jira PROJ         # Cache a specific project by key
/agent-orch:jira add PROJ     # Add another project to existing context
/agent-orch:jira refresh      # Re-fetch all cached project metadata
/agent-orch:jira status       # Show what's cached without fetching
```

---

## Process

### Step 1: Parse arguments

Extract the subcommand and optional project key from arguments:
- No arguments → **default mode** (discover and confirm project, cache context)
- `[PROJECT_KEY]` (uppercase letters, looks like a Jira key) → **default mode targeting that specific project**
- `add [PROJECT_KEY]` → **add mode** (add another project to existing context without replacing)
- `refresh` → **refresh mode** (re-fetch all currently cached projects)
- `status` → **status mode** (read-only, show cached data)

### Step 2: Check MCP availability

Call `mcp__jira__jira_getCurrentUser` to verify the Jira MCP server is running and authenticated.

If the call fails:

```
Jira MCP server is not available.

Run /agent-orch:mcp-start to start the MCP server.
If already running, check /mcp to ensure the jira service is enabled.
```

Exit. Do not proceed without a working Jira connection.

If the call succeeds, you may show the current user (display name, account ID)
for confirmation, but **do NOT persist it into `jira.md`**. User identity is
always resolved live via `mcp__jira__jira_getCurrentUser` at the point of use —
caching it leads to mis-assignment when a different person later runs `/make`,
`/groom`, etc. Only durable project metadata (keys, IDs, field IDs) is cached.

### Step 3: Check for existing context

Read `.claude/rules/jira.md` if it exists.

**If status mode**: Show a summary of what's cached and exit:

```
Jira Context Status

File: .claude/rules/jira.md
[If file exists and has project section]:
  Project: [KEY] - [name]
  Last updated: [timestamp from file]
  Cached: [N] issue types, [N] priorities, [N] statuses, [N] components, [N] versions, [N] custom fields

  Run /agent-orch:jira refresh to update.

[If file exists but no project section]:
  File exists but no project context cached.
  Run /agent-orch:jira to discover and cache your project.

[If file doesn't exist]:
  No context file found.
  Run /agent-orch:jira to create it.
```

Exit after showing status.

**If add mode**: Continue to Step 4 with the specified project key. The new project will be appended to the existing file alongside any already-cached projects.

**If default mode and file exists with a `## Project:` section**:

If a specific project key was provided as an argument:
- If that key is already cached → show confirmation and exit
- If that key is NOT cached → continue to Step 4 to add it (same as add mode)

If no specific key was provided:
- List the currently cached project(s):

```
Jira context loaded (last updated: [timestamp]):
  - [KEY1] - [project name]
  - [KEY2] - [project name]

Is this correct, or do you need to add/change a project?
(a) This is correct -- nothing to do
(b) Add another project
(c) Refresh all cached projects
(d) Start over with a different project
```

Wait for response.
- **(a)**: Exit. Context is good.
- **(b)**: Ask "What project key?" then continue to Step 4 in add mode
- **(c)**: Continue to Step 5 (refresh all cached projects)
- **(d)**: Delete the existing `.claude/rules/jira.md` and continue to Step 4 fresh

**If refresh mode**: Continue to Step 5 directly (re-fetch all cached projects, skip discovery).

**If no cached context**: Continue to Step 4.

### Step 4: Discover the Jira project

**CRITICAL**: Always confirm the project with the user before caching. Never silently auto-detect and proceed.

**If a specific project key was provided** (via argument or add mode):

Verify the key by calling `mcp__jira__jira_getProject` with the key. If valid, confirm with user:

```
Found project: [KEY] - [full project name]
Lead: [lead name]
Description: [description, first line]

Cache this project? (yes/no)
```

Wait for response. If yes, continue to Step 5. If no, ask for the correct key.

If the key is invalid, show error and ask for the correct key (see Edge Cases).

**If no specific key was provided**, discover candidates:

**Strategy 1: Check existing references in the repo**

Search for Jira issue key patterns (e.g., `PROJ-123`) in:
- `.claude/CLAUDE.md` or `CLAUDE.md` (project instructions often mention Jira)
- Recent git commit messages: `git log --oneline -20`
- `.specify/` directory files (if spec-kit is used)
- `README.md`

Extract unique project key prefixes (the part before the dash). If found, these are candidates.

**Strategy 2: Check git remote for hints**

```bash
git remote get-url origin 2>/dev/null
```

The repo name or org name might match a Jira project key.

**Strategy 3: Verify candidate keys**

For each candidate project key found:
- Call `mcp__jira__jira_getProject` with the key
- If it returns successfully, it's a valid project

**After discovery, ALWAYS confirm with the user:**

**If one candidate found:**

```
I detected Jira project [KEY] - [full project name] from [where it was found: "git commit history" / "CLAUDE.md" / etc.].

Is this the right project for this repo?
(a) Yes, cache [KEY]
(b) No, let me pick a different project
(c) Yes, and also add another project
```

Wait for response.
- **(a)**: Continue to Step 5 with this project
- **(b)**: Fall through to "no candidates" flow below
- **(c)**: Cache this project, then ask "What other project key?" and loop back to verify that key too

**If multiple candidates found:**

```
I found references to multiple Jira projects in this repo:
  1. [KEY1] - [name] ([N] references, found in: [sources])
  2. [KEY2] - [name] ([N] references, found in: [sources])
  ...

Which project(s) should I cache?
(enter numbers comma-separated, "all", or type a different project key)
```

Wait for response. Cache all selected projects.

**If no candidates found:**

Call `mcp__jira__jira_getAllProjects` to get the list of available projects. Present them:

```
I couldn't auto-detect a Jira project for this repo.

Available projects:
  1. [KEY1] - [project name]
  2. [KEY2] - [project name]
  3. [KEY3] - [project name]
  ...

Which project is this repo associated with?
(enter number, project key, or comma-separated for multiple)
```

Wait for response.

### Step 5: Fetch project metadata

For each confirmed project, make these MCP calls. Make independent calls in parallel for speed.

**If in add mode or adding to existing context**: Only fetch metadata for the NEW project(s). Existing cached projects are left untouched.

**If in refresh mode**: Re-fetch metadata for ALL projects currently in the `.claude/rules/jira.md` file. Parse the existing file to get the list of project keys, then fetch fresh data for each.

**Batch 1 (parallel, no dependencies):**
- `mcp__jira__jira_getProject` with `projectKeyOrId: "[KEY]"` → project details
- `mcp__jira__jira_getIssueTypes` with `projectKey: "[KEY]"` → issue types for this project
- `mcp__jira__jira_getPriorities` → priority scheme (global, not per-project)
- `mcp__jira__jira_getComponents` with `projectKey: "[KEY]"` → components
- `mcp__jira__jira_getVersions` with `projectKey: "[KEY]"` → versions/releases
- `mcp__jira__jira_getAllBoards` → filter results to boards for this project

**Batch 2 (parallel, no dependencies):**
- `mcp__jira__jira_getCustomFields` → custom field definitions
- For each issue type found: `mcp__jira__jira_getRequiredFields` with `projectKey: "[KEY]"` and `issueTypeId: "[id]"` → required fields per type

**Batch 3 (depends on Batch 1 results):**
- `mcp__jira__jira_searchIssues` with `jql: "project = [KEY] ORDER BY updated DESC"`, `maxResults: 1` → get a recent issue for transition discovery
- If an issue is found: `mcp__jira__jira_getTransitions` with `issueKey: "[ISSUE-KEY]"` → available transitions

**For transition coverage across workflows**: If the project has multiple issue types with potentially different workflows, sample one issue per issue type:
- For each issue type, search: `jql: "project = [KEY] AND issuetype = [type] ORDER BY updated DESC"`, `maxResults: 1`
- Get transitions for each sample issue
- Deduplicate transitions and note which are type-specific

If any call fails, log a warning but continue with what succeeded. Don't block the entire flow on one failed lookup.

### Step 6: Write `.claude/rules/jira.md`

First, ensure the `.claude/rules/` directory exists:

```bash
mkdir -p .claude/rules
```

Write the context file. The format is designed to be:
- **Lean**: Only lookup data, no issue content
- **Structured**: Tables for machine readability, Claude can parse these efficiently
- **Actionable**: Usage guide tells Claude exactly how to use the IDs
- **Self-documenting**: Timestamp and refresh instructions included

**If add mode**: Read the existing `.claude/rules/jira.md`, keep all existing project sections intact, and append the new project section(s) before the `---` separator and Quick Reference. Update the `Last updated` timestamp and `Projects` list in the header.

**If refresh mode**: Regenerate the entire file with fresh data for all cached projects.

**If default mode (first time)**: Write the complete file from scratch.

**File content:**

```markdown
# Jira Project Context

> Auto-generated by /agent-orch:jira. Do not edit manually -- run `/agent-orch:jira refresh` to update.
> Last updated: [YYYY-MM-DDTHH:MM:SS timestamp]
> Projects cached: [KEY1][, KEY2, KEY3...]
>
> NOTE: The current user / assignee is intentionally NOT cached here. Resolve it
> live via `mcp__jira__jira_getCurrentUser` at the point of use. Caching identity
> leads to mis-assignment when a different person later runs `/make`, `/groom`, etc.

## Tracker Contract

> Normalized header read by tracker-neutral skills (`/make`, `/build`, `/make-clean`,
> the work queue). See `plugins/agent-orch/rules/tracker-provider.md`. The GitHub
> backend (`.claude/rules/github.md`) emits the same header with `provider: github`.

- provider: jira
- id_shape: `[A-Z][A-Z0-9]+-\d+` (e.g. PROJ-123)
- current_user: `mcp__jira__jira_getCurrentUser` (live, never cached)
- harness_label: claude-code-agent-harness
- review_label: human-review-required
- projects: [KEY1][, KEY2...]
- status: transition IDs from the Statuses & Transitions table(s) below
  (overridable via `.claude/ssnc-agent-orch/jira-workflow.yaml`)

## Auto-Execution Rule

When the user asks to perform ANY Jira operation (create issue, search, transition, comment, assign, link, etc.):

1. If this file does not yet have a `## Project:` section populated below, you MUST run `/agent-orch:jira` first to discover and cache the project context before proceeding.

2. If the user references a project key that is NOT cached in this file (e.g., they say "create a NEWPROJ bug" but only PROJ is cached), run `/agent-orch:jira add NEWPROJ` to cache that project's metadata before proceeding.

3. If multiple projects are cached, determine which project the user means from context (the issue key prefix, or ask if ambiguous).

When performing Jira MCP calls, ALWAYS use the IDs from the tables in this file instead of making separate lookup calls. The IDs in this file are the source of truth for cached projects. Do NOT call `jira_getIssueTypes`, `jira_getPriorities`, `jira_getComponents`, `jira_getVersions`, or `jira_getTransitions` if the data is already cached here for that project.

When translating natural language to Jira fields:
- Map priority words ("critical", "urgent", "high", "medium", "low", "trivial") to the Priority IDs below
- Map issue type words ("bug", "story", "task", "epic", "subtask", "sub-task") to the Issue Type IDs below
- Map status words ("done", "in progress", "to do", "in review", "closed") to the Transition IDs below
- Map component names to Component IDs below
- Use Required Fields to ensure all mandatory fields are provided when creating issues

[FOR EACH SELECTED PROJECT, generate a project section:]

## Project: [KEY]

- Name: [full project name]
- Key: [KEY]
- Lead: [lead display name]
- Description: [project description, truncated to 1 line if long]
[If board found]:
- Board: [board name] (id: [board_id], type: [scrum|kanban])
[If no board]:
- Board: none detected

## Issue Types

| Name | ID | Subtask | Description |
|------|----|---------|-------------|
[For each issue type, one row:]
| [name] | [id] | [yes/no] | [description, truncated to ~50 chars] |

## Priorities

| Name | ID |
|------|-----|
[For each priority, one row:]
| [name] | [id] |

## Statuses & Transitions

[If transitions were discovered:]

Known statuses (from sampled issues):

| From Status | To Status | Transition Name | Transition ID | Issue Types |
|-------------|-----------|-----------------|---------------|-------------|
[For each unique transition:]
| [from status] | [to status] | [transition name] | [transition id] | [which types, or "all"] |

> Transitions are per-issue-status, not global. These were sampled from recent issues and cover the common workflow paths. If a transition fails, call `mcp__jira__jira_getTransitions` with the specific issue key to get its available transitions.

[If no issues exist to sample transitions from:]

No existing issues found to discover transitions. After the first issue is created, run `/agent-orch:jira refresh` to populate transitions.

## Components

[If components exist:]

| Name | ID | Lead |
|------|----|------|
[For each component:]
| [name] | [id] | [lead display name or "-"] |

[If no components:]

No components configured for this project.

## Versions

[If versions exist:]

| Name | ID | Released | Release Date |
|------|----|----------|-------------|
[For each version:]
| [name] | [id] | [yes/no] | [date or "-"] |

[If no versions:]

No versions configured for this project.

## Custom Fields

[Include only fields that are actually used on this project's screens. Filter by checking which custom fields appear in the required fields results.]

| Display Name | Field ID | Type |
|-------------|----------|------|
[For each relevant custom field:]
| [name] | [customfield_NNNNN] | [type: string/number/array/date/user/option] |

## Required Fields by Issue Type

[For each issue type:]
- **[Issue Type Name]**: [comma-separated list of required field names, with field IDs in parentheses for custom fields]

[END OF PROJECT SECTION. Repeat for additional projects if multi-project.]

---

## Agent Harness Labels

The following labels are used by the Claude Code agent harness for governance:

| Label | Meaning | Effect |
|-------|---------|--------|
| `claude-code-agent-harness` | Issue is agent-ready | Visible in `/jira-work` queue, can be picked up by `/build` or `/implement` |
| `human-review-required` | Needs human approval first | Shown in queue with warning gate; agent won't auto-start without human confirmation |

**Search for agent-ready work:**
```
mcp__jira__jira_searchIssues with:
  jql: "project = [KEY] AND labels = claude-code-agent-harness AND status != Done ORDER BY priority DESC"
```

**Search for issues needing human review:**
```
mcp__jira__jira_searchIssues with:
  jql: "project = [KEY] AND labels = human-review-required AND status != Done ORDER BY priority DESC"
```

**Add agent-harness label to an issue:**
```
mcp__jira__jira_updateIssue with:
  issueKey: "[KEY]-NNN"
  update: { "labels": { "add": ["claude-code-agent-harness"] } }
```

**Triage unlabeled issues:**
Run `/agent-orch:jira-work triage` to interactively classify issues.

---

## Quick Reference

**Create an issue:**
```
mcp__jira__jira_createIssue with:
  projectKey: "[KEY]"
  issueType: "[id from Issue Types table]"
  summary: "..."
  priority: "[id from Priorities table]"
  [any required fields from Required Fields section]
```

**Transition an issue:**
```
mcp__jira__jira_transitionIssue with:
  issueKey: "[KEY]-NNN"
  transitionId: "[id from Transitions table]"
```

**Search issues:**
```
mcp__jira__jira_searchIssues with:
  jql: "project = [KEY] AND ..."
```

**Add a comment:**
```
mcp__jira__jira_postIssueComment with:
  issueKey: "[KEY]-NNN"
  body: "..."
```
```

### Step 7: Confirm to user

**For default mode (first-time discovery):**

```
Jira context cached.

[For each project cached]:
  [KEY] - [project name]:
    [N] issue types, [N] priorities, [N] statuses/transitions
    [N] components, [N] versions, [N] custom fields

File: .claude/rules/jira.md (auto-loaded into every conversation)

This context will be used automatically for all Jira operations.
To add another project: /agent-orch:jira add [KEY]
To refresh: /agent-orch:jira refresh
```

**For add mode:**

```
Added project [KEY] ([project name]) to Jira context.

  [N] issue types, [N] priorities, [N] statuses/transitions
  [N] components, [N] versions, [N] custom fields

Projects now cached: [KEY1], [KEY2], ...
File: .claude/rules/jira.md updated.
```

**For refresh mode:**

```
Jira context refreshed for [N] project(s): [KEY1], [KEY2], ...

[For each project]:
  [KEY]:
    [If changes detected]:
    Changes: [N] issue types (+[added]/-[removed]), [N] priorities, ...
    [If no changes]:
    No changes detected.

File: .claude/rules/jira.md updated.
```

---

## Edge Cases

**MCP server not running:**
```
Jira MCP server is not available.
Run /agent-orch:mcp-start to start the MCP server.
```

**MCP server running but Jira not configured:**
```
Jira service is not configured in the MCP server.
Run /agent-orch:mcp-setup and enable Jira.
```

**Project key not found in Jira:**
```
Project "[KEY]" not found in Jira.
This could mean:
  - The project key is incorrect
  - You don't have permission to access this project
  - The project has been archived or deleted

Run /agent-orch:jira to select from available projects.
```

**No projects available:**
```
No Jira projects found.
This could mean:
  - Your Jira account doesn't have access to any projects
  - The Jira instance URL is incorrect

Check your MCP configuration: /agent-orch:mcp-setup
```

**`.claude/rules/` directory doesn't exist:**
- Create it automatically with `mkdir -p .claude/rules`
- This is expected on first run in a new repo

**Existing `.claude/rules/jira.md` with manual edits:**
- On refresh, overwrite the entire file (it says "do not edit manually" at the top)
- If the user has added custom content, it will be lost on refresh
- The auto-generated header makes this clear

**Project with no issues (brand new project):**
- Skip transition discovery (no issues to sample)
- Add note: "No existing issues found. Run /agent-orch:jira refresh after creating the first issue to populate transitions."

**Rate limiting or timeout on MCP calls:**
- If a specific call fails, log the warning and continue
- Show which sections couldn't be populated:
  ```
  Partial cache: Could not fetch [transitions/components/etc].
  Run /agent-orch:jira refresh to retry.
  ```

**Multiple Jira instances (DataCenter + Cloud):**
- The MCP server connects to one instance per config
- The skill works with whichever instance is configured
- If the user needs to switch, they reconfigure via `/agent-orch:mcp-setup`

---

## Security Notes

- The `.claude/rules/jira.md` file contains project metadata (keys, field IDs, user names) but no secrets, tokens, or credentials
- It is safe to commit to git -- it contains the same information visible to any project member in the Jira UI
- If the project is sensitive and the repo is public, add `.claude/rules/jira.md` to `.gitignore`
- The file does NOT cache issue content, comments, attachments, or any PII beyond project lead names

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.jira:` entry. If the file is absent, has no
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
