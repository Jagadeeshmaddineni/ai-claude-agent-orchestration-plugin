---
name: plugin-feedback
description: Submit structured plugin feedback as a Jira ticket in AITOOLS. Walks through a wizard collecting rating, likes, pain points, and suggestions. Assigns to Christopher Nicholson.
---

# Plugin Feedback Wizard

Collect structured feedback about any Claude Code plugin and create a Jira ticket in the AITOOLS project, assigned to Christopher Nicholson (PM).

**CRITICAL**: Ask questions ONE AT A TIME. Never present multiple questions simultaneously. Wait for the user's response before proceeding to the next step.

---

## Step 1: Check Jira MCP Availability

Call `mcp__jira__jira_getCurrentUser` to verify the Jira MCP server is connected.

- If it fails: "Jira MCP server not available. Run `/agent-orch:mcp-start`, then restart your session and retry."
- If it succeeds: Note the current user's display name (used as "Submitted by" in the ticket). Continue.

---

## Step 2: Ensure AITOOLS Project Context

Read `.claude/rules/jira.md`.

- If the file does not exist: "Run `/agent-orch:jira` first to set up Jira project context, then retry."
- If the file exists but does NOT contain `## Project: AITOOLS`: Run `Skill(skill: "agent-orch:jira", args: "add AITOOLS")` to cache the AITOOLS project metadata, then re-read the file.
- Once AITOOLS is cached: Extract the **Task** issue type ID from the Issue Types table.

---

## Step 3: Which Plugin?

```
Which plugin are you providing feedback on?

(a) agent-orch (multi-agent orchestration)
(b) codebase-graph-analyzer (knowledge graph & code review)
(c) team-work (work planning & reporting)
(d) Other — I'll type the name
```

Wait for response. Store the plugin name.

---

## Step 4: Rating

```
How would you rate your experience with <plugin>? (1-5)

(a) 1 — Didn't work / frustrated
(b) 2 — Mostly painful
(c) 3 — Mixed / okay
(d) 4 — Good, minor issues
(e) 5 — Excellent, delightful
```

Wait for response. Store the rating number.

---

## Step 5: What Worked Well?

```
What worked well? (a sentence, a few bullets, or "skip")
```

Wait for response. Store the answer (or "N/A" if skipped).

---

## Step 6: Pain Points

```
What was frustrating or didn't work? (a sentence, a few bullets, or "skip")
```

Wait for response. Store the answer (or "N/A" if skipped).

---

## Step 7: Additional Feedback

```
Any other feedback, feature requests, or suggestions? (or "skip")
```

Wait for response. Store the answer (or "N/A" if skipped).

---

## Step 8: Confirm

Show the user a preview:

```
Ready to create this feedback ticket:

  Project:  AITOOLS
  Type:     Task
  Summary:  [Feedback] <plugin> — <rating>/5
  Assignee: Christopher Nicholson
  Labels:   plugin-feedback, <plugin-name>

  Description:
    Rating: <N>/5
    Plugin: <plugin-name>
    What worked: <step 5 answer>
    Pain points: <step 6 answer>
    Additional: <step 7 answer>
    Submitted by: <current user display name>

Create this ticket?
(a) Yes, create it
(b) Let me edit something first
(c) Cancel
```

Wait for response.

- **(a)**: Continue to Step 9.
- **(b)**: Ask which field to change, update it, and re-show the preview.
- **(c)**: Exit with "Cancelled. No ticket created."

---

## Step 9: Create the Jira Issue

Build the description in Jira wiki markup:

```
h3. Plugin Feedback

||Field||Value||
|Plugin|<plugin-name>|
|Rating|<N>/5|
|Submitted by|<current user>|

h3. What Worked Well
<step 5 answer>

h3. Pain Points
<step 6 answer>

h3. Additional Feedback
<step 7 answer>
```

Create the issue:

```
mcp__jira__jira_createIssue with:
  projectKey: "AITOOLS"
  summary: "[Feedback] <plugin-name> — <rating>/5"
  issueTypeId: "<Task ID from jira.md>"
  description: "<formatted description above>"
```

If labels can be set via customFields, include them:
```
  customFields: { "labels": ["plugin-feedback", "<plugin-name>"] }
```

---

## Step 10: Assign to Christopher Nicholson

Look up the assignee's account:

```
mcp__jira__jira_searchUsers with:
  query: "Christopher Nicholson"
```

From the results, pick the user matching "Christopher Nicholson". Then:

```
mcp__jira__jira_assignIssue with:
  issueKey: "<created issue key>"
  assignee: "<Christopher Nicholson's username or accountId>"
```

If the search returns no results or multiple ambiguous matches, show the options and ask the user to pick.

---

## Step 11: Confirm Success

```
Created <ISSUE-KEY>: [Feedback] <plugin> — <rating>/5
Assigned to: Christopher Nicholson
URL: <issue URL if available from the create response>

Thanks for the feedback!
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Jira MCP not available | Exit with clear message to start MCP |
| AITOOLS project not cached | Auto-cache via `/agent-orch:jira add AITOOLS` |
| jira.md missing entirely | Exit with message to run `/agent-orch:jira` |
| Issue creation fails | Show error, suggest checking permissions on AITOOLS |
| Christopher Nicholson not found in user search | Ask user to type the assignee name manually |
| Assignment fails | Warn but report the ticket was created successfully (unassigned) |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.plugin-feedback:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
