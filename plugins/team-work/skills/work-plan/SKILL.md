---
name: work-plan
description: Convert an agreed work plan into Jira issues with dependencies, assignments, and labels. Updates the plan markdown with Jira links. Usage: /team-work:work-plan [path-to-plan.md or PR#]
---

# Work Plan: Create Jira Issues from Agreed Plans

Takes a work plan created by `/team-work:work-prep` (after the team has agreed on it) and creates Jira issues for every work item. Links dependencies, sets assignments, applies governance labels, and updates the markdown with Jira URLs so the plan becomes the single source of truth.

## Prerequisites

- Must have an agreed work plan (created by `/work-prep`, reviewed via PR)
- `.claude/rules/jira.md` must exist (run `/agent-orch:jira` first)
- MCP server must be running with Jira access (`/agent-orch:mcp-start`)
- `gh` CLI must be authenticated

## Process

### Phase 0: Locate the Work Plan

**Goal**: Find and validate the work plan markdown.

1. **Check arguments:**

   - If a file path is given: read that file.
   - If a PR number is given: fetch the PR, find the plan file in it.
   - If no arguments: search for `planning/*.md` in the current directory and worktrees.

2. **If no plan found:**
   ```
   No work plan found.

   Run /team-work:work-prep first to create a plan, or provide a path:
     /team-work:work-plan planning/my-plan.md
     /team-work:work-plan #42  (PR number)
   ```
   Exit.

3. **Read and parse the plan:**
   - Extract all work items from the tables (Item, Owner, Label, Status columns)
   - Extract dependencies from the Dependencies section
   - Extract open questions from the Open Questions section

4. **Check for unresolved open questions:**

   If there are unchecked open questions (`- [ ]` items):
   ```
   This plan has N unresolved open questions:

   - [ ] Who owns the ServiceNow ticket for infra provisioning?
   - [ ] Is the Q2 deadline firm or flexible?

   (a) Proceed anyway -- create Jira issues for resolved items only
   (b) Let me resolve these now -- I'll update the plan
   (c) Cancel -- take this back to the team
   ```

   **Option (a)**: Skip items that depend on unresolved questions. Warn for each skipped item.
   **Option (b)**: Walk through each question interactively. Update the plan file. Then proceed.
   **Option (c)**: Exit.

### Phase 1: Jira Configuration

**Goal**: Confirm project settings and map plan fields to Jira.

1. **Read `.claude/rules/jira.md`:**
   - Extract project key, issue type IDs, priority IDs, transition IDs
   - Extract custom field IDs (Epic Link, Sprint, Story Points, etc.)
   - For current user, resolve live via `mcp__jira__jira_getCurrentUser` — never read a cached user/email from `jira.md`

2. **Identify or create parent Epic:**

   ```
   Work plan items need a parent Epic in Jira.

   (a) Search for an existing Epic
   (b) I have an Epic key -- let me type it
   (c) Create a new Epic from the plan's Goal section
   (d) Skip Epic -- create standalone issues
   ```

   **Option (a)**: Search Epics by plan topic keywords.
   **Option (b)**: User provides key, fetch and confirm.
   **Option (c)**: Create Epic with:
   - Summary: plan's Goal (first sentence, under 80 chars)
   - Description: full Goal section
   - Epic Name (customfield_10104): plan topic slug
   **Option (d)**: No Epic linking.

3. **Map owners to Jira users:**

   For each unique owner name in the plan:
   ```
   Mapping plan owners to Jira users:

   "Joe" → Searching... Found: Stein, Joe (joe.stein@sscinc.com) ✓
   "John" → Searching... Found: Jones, John (john.jones@sscinc.com) ✓
   "TBD" → Will leave unassigned

   Correct? (y/n)
   ```

   Use `mcp__jira__jira_searchUsers` to find matches. If ambiguous, ask.

4. **Confirm issue type mapping:**

   ```
   How should plan items map to Jira issue types?

   - claude-code-agent-harness items → Story (default)
   - human-review-required items → Story (default)
   - external items → Task (default)

   (a) Use defaults
   (b) Customize mapping
   ```

### Phase 2: Create Jira Issues

**Goal**: Create all issues, respecting dependency order.

Process items in dependency order (items with no dependencies first):

For each work item:

1. **Create the issue:**
   ```
   mcp__jira__jira_createIssue with:
     projectKey: "<KEY from jira.md>"
     summary: "<item description from plan>"
     issueTypeId: "<mapped type ID>"
     description: "From work plan: <plan file path>
     
     Area: <workstream name>
     
     Definition of Done:
     <definition of done from plan>
     
     Created by /team-work:work-plan"
   ```

2. **Apply label based on classification:**
   - `claude-code-agent-harness` items: add label `claude-code-agent-harness`
   - `human-review-required` items: add label `human-review-required`
   - `external` items: no agent label

3. **Link to Epic (if selected):**
   Update the issue with the Epic Link custom field:
   ```
   mcp__jira__jira_updateIssue with:
     issueKey: "<new-key>"
     customFields: { "customfield_10102": "<epic-key>" }
   ```

4. **Assign (if owner mapped):**
   ```
   mcp__jira__jira_assignIssue with:
     issueKey: "<new-key>"
     assignee: "<jira username>"
   ```

5. **Store the created key** for dependency linking and markdown update.

6. **Report progress:**
   ```
   [3/12] Created RCONAI-261: Build ingestion connector (Story, assigned: Jones, John)
   ```

### Phase 3: Link Dependencies

**Goal**: Create Jira issue links for all dependencies.

For each dependency in the plan:

```
mcp__jira__jira_linkIssues with:
  linkType: "Blocks"
  outwardIssueKey: "<blocking-issue-key>"
  inwardIssueKey: "<blocked-issue-key>"
```

If "Blocks" link type is not available, try "Gantt End to Start" or "Depends". If none work, skip with a warning.

Report:
```
Dependencies linked:
  RCONAI-259 blocks RCONAI-261 (Kafka config → Build connector)
  RCONAI-262 blocks RCONAI-261 (Provision dev → Build connector)
  RCONAI-261 blocks RCONAI-263 (Build connector → Integration tests)
```

### Phase 4: Update Plan Markdown

**Goal**: Write Jira URLs back into the plan so it stays the source of truth.

1. **Update the work item tables:**

   Replace the `Jira` column value `--` with the actual Jira URL for each item:

   Before:
   ```
   | 1 | Set up Kafka topic configuration | Joe | `claude-code-agent-harness` | todo | -- |
   ```

   After:
   ```
   | 1 | Set up Kafka topic configuration | Joe | `claude-code-agent-harness` | todo | [RCONAI-259](https://jira.ssnc-corp.cloud/browse/RCONAI-259) |
   ```

2. **Update the plan status:**
   Change `Status: Under Review` (or `Agreed`) to `Status: In Progress`

3. **Add changelog entry:**
   ```
   - <YYYY-MM-DD>: Jira issues created by /work-plan. Epic: <EPIC-KEY>. N issues across M areas.
   ```

4. **Commit and push:**
   ```bash
   git add planning/
   git commit -m "planning: link Jira issues to work plan

   Created N Jira issues from <plan-file>
   Epic: <EPIC-KEY>
   Items: Z agent-ready, W human-review, V external"

   git push
   ```

### Phase 5: Summary

Present the full results:

```
Jira issues created from work plan.

Epic: <EPIC-KEY> - <epic summary>
Plan: <plan-file-path>

Issues created:
  RCONAI-259: Set up Kafka topic configuration (Joe, agent-ready)
  RCONAI-260: Provision dev environment (Joe, agent-ready)
  RCONAI-261: Build ingestion connector (John, agent-ready)
  RCONAI-262: Write integration tests (John, agent-ready)
  RCONAI-263: Configure monitoring dashboards (TBD, human-review)

Dependencies:
  RCONAI-259 → RCONAI-261
  RCONAI-260 → RCONAI-261
  RCONAI-261 → RCONAI-262

Execution waves:
  Wave 1: RCONAI-259, RCONAI-260 (no blockers)
  Wave 2: RCONAI-261 (after wave 1)
  Wave 3: RCONAI-262, RCONAI-263 (after wave 2)

Plan updated with Jira links and pushed.

Next steps:
- Run /team-work:work-pop to pick up your next item
- Items with claude-code-agent-harness label are ready for /make
- Items with human-review-required need approval before agent work
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No work plan found | Show usage, suggest /work-prep |
| Unresolved open questions | Offer to proceed partially, resolve now, or cancel |
| No `.claude/rules/jira.md` | Tell user to run `/agent-orch:jira` |
| MCP server not running | Tell user to run `/agent-orch:mcp-start` |
| Jira issue creation fails | Report error, continue with remaining items |
| Dependency link fails | Warn, continue (link type may not be available) |
| Owner not found in Jira | Leave unassigned with warning |
| Epic creation fails | Create issues without Epic, warn |
| Push fails | Jira issues exist, markdown updated locally, show manual push command |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-plan:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
