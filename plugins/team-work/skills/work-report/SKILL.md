---
name: work-report
description: Sync Jira status across all planning markdown, then generate a unified Bluestone-styled HTML report. Top of the report shows a project-wide Jira breakdown (Open / In Progress / In Review / Done / Blocked / Total / % Done) counted across ALL Jira issues, not just plan-linked items, plus a Recently Shipped panel. Also covers business readiness, tech deliverables, dependencies, and cross-plan alignment. Opens for PDF save, commits, pushes, and creates a PR. Usage: /team-work:work-report [path-to-planning-dir]
---

# Work Report: Jira Sync & Unified HTML Report

Scans all work plans in `planning/`, syncs each item's status and assignment from Jira, updates the markdown, then generates a single unified HTML report styled with Bluestone design system light-mode tokens.

**Top-of-report priority**: the report leads with a project-wide Jira status breakdown — Open, In Progress, In Review, Done, Blocked, Total, % Done — counted across ALL issues in the referenced Jira project(s), not only those linked from planning markdown. A "Recently Shipped" panel lists Done issues resolved in the last 14 days. Business readiness, tech deliverables, dependencies, and cross-plan alignment follow. Opens the HTML for the user to save as PDF, then commits everything, pushes, and opens a PR.

## Prerequisites

- A git repository with `planning/*.md` files (created by `/work-prep` + `/work-plan`)
- `.claude/rules/jira.md` must exist (run `/agent-orch:jira` first)
- MCP server running with Jira access (`/agent-orch:mcp-start`)
- `gh` CLI authenticated
- Must NOT already be in a worktree

## Process

### Phase 0: Validate and Enter Worktree

**Goal**: Ensure we're in the right state and create an isolated worktree for the report.

1. **Verify not in a worktree:**
   ```bash
   git worktree list
   ```
   If already in a worktree, stop:
   ```
   Already in a worktree. Exit the worktree first, then run /work-report.
   ```

2. **Check for planning files:**
   ```bash
   find planning/ -name "*.md" -type f 2>/dev/null
   ```
   If no plans found:
   ```
   No work plans found in planning/. Run /team-work:work-prep to create one.
   ```
   Exit.

3. **Create worktree:**
   ```
   EnterWorktree:
     name: "work-report-<YYYY-MM-DD>"
   ```

4. **Create reports directory:**
   ```bash
   mkdir -p planning/reports
   ```

### Phase 1: Scan and Sync Plans

**Goal**: Read every plan, check Jira for current status, update the markdown.

1. **Discover all plans:**
   ```bash
   find planning/ -maxdepth 2 -name "*.md" -not -path "planning/reports/*" -type f
   ```

2. **For each plan file**, parse the work items table(s):
   - Extract rows with Jira links (pattern: `[PROJ-NNN](url)`)
   - For each Jira-linked item:

     a. **Fetch current Jira status:**
        ```
        mcp__jira__jira_getIssue with issueKey: "PROJ-NNN"
        ```
     b. **Extract from Jira**: status, assignee, priority, resolution
     c. **Compare with plan**: If Jira status differs from the plan's Status column, update the plan:
        - Jira "To Do" → plan `todo`
        - Jira "In progress" → plan `in-progress`
        - Jira "Under Review" → plan `in-review`
        - Jira "Done" → plan `done`
        - Jira "On Hold" → plan `blocked`
     d. **Update owner** if assignee changed in Jira and plan shows different owner or TBD.

3. **Report sync results:**
   ```
   Synced 3 plans, 18 items:
     planning/q2-pipeline.md: 8 items (2 status changes, 1 assignment change)
     planning/auth-migration.md: 6 items (no changes)
     planning/monitoring.md: 4 items (1 status change)
   ```

4. **Commit sync changes:**
   ```bash
   git add planning/
   git commit -m "planning: sync Jira status across all work plans"
   ```
   If no changes, skip the commit.

### Phase 2: Aggregate Cross-Plan Data

**Goal**: Build a unified view across all plans for the report.

1. **Collect from all plans:**
   - All work items with current status, owner, label, Jira link
   - All North Star & Milestones sections
   - All Ideas & Hypotheses (non-parked)
   - All Decisions
   - All Open Questions
   - All Dependencies (within and across plans)
   - All Context & Status items

2. **Pull ALL Jira issues across referenced projects** (not just plan-linked items):

   For each Jira project key referenced across plans, run a full status breakdown:
   ```
   mcp__jira__jira_searchIssues with:
     jql: "project = [KEY] ORDER BY updated DESC"
     fields: "summary,status,assignee,issuetype,priority,resolution,updated"
     maxResults: 1000
   ```
   Bucket every issue by status category:
   - **Open / To Do**: statusCategory = "To Do"
   - **In Progress**: statusCategory = "In Progress"
   - **In Review / Code Review / Under Review**: status name contains "review" (and not Done)
   - **Done**: statusCategory = "Done"
   - **Blocked / On Hold**: status name in ("Blocked", "On Hold")

   This gives a project-wide count, independent of what's in planning markdown.

3. **Classify items by business vs. tech:**
   - **Business readiness**: Items tied to milestones, north star goals, external dependencies, stakeholder deliverables
   - **Tech deliverables**: Implementation items (agent-harness, human-review)
   - **Ideas in flight**: Ideas with status `open` or `exploring`

4. **Build dependency graph across plans:**
   - Cross-reference items that share Jira Epic parents
   - Detect cross-plan dependencies (item in plan A blocks item in plan B)
   - Calculate completion percentage per milestone, per Epic, per plan

5. **Calculate summary stats (TOP-OF-REPORT — always show these first):**

   Primary Jira status counters (across all referenced Jira projects, ALL issues):
   - **Open / To Do** count
   - **In Progress** count
   - **In Review** count
   - **Done** count
   - **Blocked / On Hold** count
   - **Total** issues
   - **% Done** (done / total)

   Plan-level stats (from planning markdown):
   - Total plan items, done, in-progress, in-review, blocked, todo
   - Completion % overall and per plan
   - Items at risk (blocked, overdue milestones)
   - Unassigned items
   - Open questions count
   - Ideas count by status

   **Done this period** (last 14 days): list Jira issues where `resolution != EMPTY` AND `resolutiondate >= -14d` — show as a "Recently Shipped" panel.

### Phase 3: Generate HTML Report

**Goal**: Create a single self-contained HTML file styled with Bluestone light-mode tokens.

Generate `planning/reports/YYYYMMDD_HHMMSS_work-report.html` using these Bluestone light-mode design tokens:

```
Bluestone Light Mode Palette:
  Page background:    #F6FDFF
  Card surface:       #FFFFFF
  Card border:        #C2D0DB (Neutral A20)
  Header bar:         #EDF3F8
  Primary text:       #070D20 (Background 01)
  Body text:          #3D5167 (Neutral A70)
  Muted text:         #7B89A3 (Neutral A60)
  Primary accent:     #0D9DDB (Secondary A50)
  Success:            #00A86B
  Warning:            #FFA800
  Error:              #FF3B30
  Tint blue:          #E0F0FB
  Tint teal:          #DFF5ED
  Tint warn:          #FFF3D9
  Tint red:           #FFE5E3
  Font:               Inter, -apple-system, BlinkMacSystemFont, sans-serif
```

**Report structure (in this order):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Work Report — <date></title>
  <style>
    /* Bluestone light mode tokens inlined */
    /* Print-friendly: @media print rules for clean PDF export */
  </style>
</head>
<body>

  <!-- 1. Header -->
  Report title, date, generated by, repo name

  <!-- 2. Jira Status Summary (TOP PRIORITY — ALWAYS FIRST) -->
  A strip of big-number KPI cards at the very top, one per status:
    [ Open ]  [ In Progress ]  [ In Review ]  [ Done ]  [ Blocked ]  [ Total ]  [ % Done ]
  Each card: large colored number + status label + % of total.
  Color-coded using Bluestone tokens:
    Open = Muted gray, In Progress = Primary blue, In Review = Warning amber,
    Done = Success green, Blocked = Error red, Total = Primary text, % Done = Success
  Scoped to the Jira project(s) referenced by the plans.
  Immediately below: a horizontal stacked bar showing the status distribution.

  <!-- 3. Recently Shipped (last 14 days) -->
  Compact table of Done issues with resolution date >= -14d.
  Columns: Key, Summary, Assignee, Resolved, Epic/Plan
  Sorted by resolution date DESC. Collapsible if > 20 items.

  <!-- 4. Executive Summary -->
  Total plans, total items, completion %, items at risk, open questions
  Visual progress bars per plan using Bluestone accent colors

  <!-- 5. Business Readiness & Expectations -->
  North star goals from all plans
  Milestone tracking table: milestone, target date, progress %, items, status (on-track/at-risk/overdue)
  Items tied to milestones, ordered by milestone date

  <!-- 6. Decisions Log -->
  All decisions across plans, date-ordered

  <!-- 7. Open Questions -->
  All unresolved questions across plans, grouped by plan

  <!-- 8. Tech Deliverables -->
  Work items grouped by plan, then by area/workstream
  Each item shows: #, description, owner, label, status (color-coded badge), Jira link
  Status badges: done=Success green, in-progress=Primary blue, in-review=Warning amber, blocked=Error red, todo=Muted gray

  <!-- 9. Dependencies -->
  Cross-plan dependency map (HTML table or visual)
  Within-plan dependencies per plan

  <!-- 10. Ideas & Hypotheses -->
  All non-parked ideas across plans
  Grouped by status: exploring first, then open

  <!-- 11. Context & Status -->
  Informational items from all plans

  <!-- 12. Per-Plan Detail -->
  Expandable/collapsible sections with full plan content for reference

</body>
</html>
```

**Styling requirements:**
- Self-contained: all CSS inlined, no external dependencies
- Print-friendly: `@media print` rules that hide navigation, adjust margins, avoid page breaks inside cards
- Responsive: readable on screen at any width
- Cards with subtle borders (#C2D0DB) and white backgrounds
- **Jira KPI strip must be visually dominant at the top** — 7 cards in a row, each at least 120px tall, big bold numerals (≥ 42px), fixed above the fold
- Accent-colored left borders on status cards (blue=in-progress, amber=in-review, green=done, red=blocked, orange=at-risk, gray=open)
- Status-distribution horizontal stacked bar directly under the KPI strip
- Progress bars using Bluestone gradients
- Tables with alternating row backgrounds (#F6FDFF / #FFFFFF)
- Status badges as inline pills with Bluestone colors
- Clickable Jira links

### Phase 4: Open and Commit

**Goal**: Let the user review the report, then commit and push.

1. **Open the HTML report for the user:**
   ```bash
   open planning/reports/YYYYMMDD_HHMMSS_work-report.html
   ```
   (macOS `open` command opens in default browser)

2. **Tell the user:**
   ```
   Report opened in your browser.

   To save as PDF: File → Print → Save as PDF

   The report covers:
   - X plans, Y total items (Z% complete)
   - N milestones tracked
   - M open questions
   - K ideas in flight

   Committing and pushing...
   ```

3. **Commit the report:**
   ```bash
   git add planning/reports/
   git commit -m "planning: add work report <YYYY-MM-DD>

   - Synced Jira status across N plans (M items updated)
   - Generated unified HTML report with Bluestone styling
   - Coverage: X items, Y% complete, Z at risk"
   ```

4. **Push:**
   ```bash
   git push -u origin <branch-name>
   ```

5. **Create PR:**
   ```bash
   gh pr create --title "Work Report: <YYYY-MM-DD>" --body "$(cat <<'EOF'
   ## Work Report

   Generated unified work report across all planning markdown.

   ### What This PR Contains
   - **Jira sync**: Updated item statuses and assignments from Jira
   - **HTML report**: `planning/reports/YYYYMMDD_HHMMSS_work-report.html`
     - Business readiness and milestone tracking
     - Tech deliverables with dependency mapping
     - Open questions and decisions log
     - Bluestone design system light-mode styling

   ### Summary
   - Plans: N
   - Items: X total (Y% complete)
   - At risk: Z items
   - Open questions: M

   ---
   Generated with `/team-work:work-report`
   EOF
   )"
   ```

6. **Report to user:**
   ```
   PR created: <PR URL>
   Branch: <branch-name>

   Report: planning/reports/YYYYMMDD_HHMMSS_work-report.html
   - Saved in browser for PDF export
   - Committed to the PR for team reference

   Next steps:
   - Save as PDF from your browser if needed
   - /agent-orch:make-clean to merge the report into main
   ```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No planning files found | Suggest running /work-prep |
| No Jira links in plans | Generate report from markdown data only, skip Jira sync |
| Jira fetch fails for an item | Use plan data, mark as "Jira unavailable" in report |
| MCP server not running | Warn, generate report from markdown only |
| No `.claude/rules/jira.md` | Warn, generate report from markdown only |
| Already in worktree | Tell user to exit first |
| Push fails | Report committed locally, show manual push command |
| PR creation fails | Branch pushed, show `gh pr create` command |
| `open` command not available | Show file path, suggest user open manually |
| No items to report | Generate a minimal report showing all plans complete |

---

## Notes

- Reports are additive — each run creates a new timestamped file, preserving history
- The Jira sync phase updates planning markdown as a side effect, keeping plans current
- Reports are self-contained HTML with no external dependencies (safe to email, share, archive)
- Print CSS is included for clean PDF export via browser Print → Save as PDF
- The report does NOT modify Jira — it only reads from Jira to update the local markdown

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-report:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
