---
name: work-recap
description: Generate a time-windowed recap of Jira activity, git commits, and agent-orch sessions as a Markdown report AND a Bluestone light-mode PowerPoint deck. Every Jira entry is enriched with its full description, last comment (with total comment count), attachments, and metadata (components, fix versions, due date, story points, epic link) so stakeholders can read the recap without clicking into Jira. Prompts for start/end time, cross-references Jira issues with the commits that reference them, writes both outputs to the parent directory (`../`) of the repo. Useful for PM status updates or for engineers catching up after time away. Usage: /team-work:work-recap [start] [end]
---

# Work Recap: Time-Window Activity Report (Markdown + PPTX)

Produce two artifacts for a user-specified time window:

1. **`../work-recap-<start>-<end>.md`** — a Markdown recap
2. **`../work-recap-<start>-<end>.pptx`** — a PowerPoint deck styled with Bluestone design system **light-mode** tokens

Both cover, for the window:

- **Jira activity** in the cached project(s): issues created, assignment changes, status transitions (To Do → In Progress → Under Review → Done / On Hold)
- **Git commits** in the current repo with per-commit file statistics
- **Agent-orch session artifacts** (`ssnc-agent-orch/*/PLAN.md`, `STATUS.md`, `COORDINATION.md`, `ADVOCATE-REVIEW.md`) created or updated in the window, plus spec-kit equivalents (`.specify/**/spec.md`, `plan.md`)

**Jiras are recapped first.** When a commit references a Jira key in its subject/body or branch name, the commit summary is stitched into that Jira entry. Commits that don't match any Jira key appear in an "Orphan commits" section.

**Every Jira entry is self-contained.** For each Jira in the recap (created, transitioned, or commit-referenced), the report includes the issue description, the most recent comment with a total comment count (e.g., "Last comment (3 of 12)"), a list of attached files with sizes and links, and the full set of Jira metadata fields (components, fix versions, due date, story points, epic link). The goal: a PM or stakeholder can read the Markdown or PPTX end-to-end without needing to open Jira.

## Prerequisites

- A git repository (`git rev-parse --is-inside-work-tree` succeeds)
- `.claude/rules/jira.md` must exist (run `/agent-orch:jira` first)
- MCP server running with Jira access (`/agent-orch:mcp-start`)
- Python 3.8+ on PATH (for PPTX generation)
- `python-pptx` available (auto-installed if missing — see Phase 5)

Works in or outside a worktree. Does NOT create a worktree. Does NOT commit or push — this skill is read-only against git history and writes artifacts to `../`.

## Usage

```
/team-work:work-recap                          # Will prompt for start and end
/team-work:work-recap 2026-04-20 2026-04-30
/team-work:work-recap "7 days ago" now
/team-work:work-recap 2026-04-01T00:00:00Z 2026-04-30T23:59:59Z
```

Positional arguments: `[start]` and `[end]`. If omitted, the skill prompts interactively.

## Process

### Phase 0: Resolve the Time Window

**Goal**: Produce concrete UTC timestamps for `start` and `end`.

1. **Collect inputs.** If start/end are passed as arguments, use them. Otherwise prompt:
   ```
   Start of recap window? (ISO-8601, YYYY-MM-DD, or phrase like "7 days ago")
   ```
   Then:
   ```
   End of recap window? (ISO-8601, YYYY-MM-DD, "now", or phrase)
   ```

2. **Parse accepted formats:**

   | Input | Interpretation |
   |-------|----------------|
   | `2026-04-20` | `2026-04-20T00:00:00Z` |
   | `2026-04-20T14:30:00Z` | Exact UTC timestamp |
   | `2026-04-20T14:30:00-05:00` | Converted to UTC |
   | `now` | Current UTC time |
   | `today` | Start: today 00:00 local. End: today 23:59:59 local. Convert to UTC. |
   | `yesterday` | Yesterday 00:00 → 23:59:59 local |
   | `N days ago` | Now minus N days, keeping current time-of-day |
   | `last Monday`, `last week` | Resolve in local TZ, then convert to UTC |

   Resolve using `python3 -c` with `datetime` + `zoneinfo`, or (if available) `dateparser`. Always work in UTC internally; display local in the report header.

3. **Validate.** Require `end > start` and `end <= now + 1 minute`. If invalid, explain and re-prompt.

4. **Format the window identifier** used in file names and headings:
   ```
   WINDOW_START = 2026-04-20T00:00:00Z
   WINDOW_END   = 2026-04-30T23:59:59Z
   WINDOW_SLUG  = 20260420-20260430      # YYYYMMDD-YYYYMMDD
   ```

5. **Resolve target Jira projects.** Read `.claude/rules/jira.md` and extract all `## Project: [KEY]` headers. If multiple projects are cached, ask:
   ```
   Recap Jira activity for which project(s)?
   (a) All cached projects ([KEY1], [KEY2], ...)
   (b) Just [KEY1]
   (c) Specify a comma-separated list
   ```

### Phase 1: Collect Jira Activity

**Goal**: Find every Jira issue that was created, reassigned, or transitioned within the window.

For each target project, run these queries. Use `mcp__jira__jira_searchIssues` directly from the MCP server (the skill does NOT shell out to the Jira REST API).

1. **Issues created in the window:**
   ```
   jql: project IN (KEY1, KEY2) AND created >= "START_JQL" AND created <= "END_JQL" ORDER BY created DESC
   fields: ["key", "summary", "status", "assignee", "reporter", "priority", "created", "issuetype", "labels"]
   maxResults: 100
   ```
   JQL date format is `"yyyy-MM-dd HH:mm"` (no timezone — Jira interprets in server time; UTC is safe). Paginate with `startAt` if `total > maxResults`.

2. **Issues updated in the window** (candidate set for assignment/status changes):
   ```
   jql: project IN (KEY1, KEY2) AND updated >= "START_JQL" AND updated <= "END_JQL" ORDER BY updated DESC
   fields: ["key"]
   maxResults: 200
   ```

3. **Fetch changelog for each updated issue** to pinpoint transitions that happened in the window:
   ```
   mcp__jira__jira_getIssue with:
     issueKey: "KEY-NNN"
     expand: "changelog"
   ```

   Parse `changelog.histories[*]`:
   - `history.created` must fall inside the window.
   - For each `history.items[]`:
     - If `item.field == "status"` → record a status transition `fromString → toString` with the timestamp.
     - If `item.field == "assignee"` → record an assignment change (`fromString → toString`).

4. **Deduplicate and stitch:** Every issue (whether created, transitioned, or reassigned in the window) becomes one entry keyed by issue key. An entry accumulates the list of events that happened within the window.

5. **Classify events** by type for counting: `created`, `assigned`, `status-changed`. An issue may have multiple event types.

6. **Short-circuit on empty:** If Jira returns zero events for the window, continue — the recap will still have git and agent-orch sections.

### Phase 1.5: Enrich Each Jira Entry (description, last comment, attachments, metadata)

**Goal**: Make each Jira entry self-contained so the recap doesn't require clicking into Jira.

For every Jira key that will appear in the recap (Phase 1 created, Phase 1 transitioned, AND Phase 3 commit-referenced), pull the full issue payload exactly once:

```
mcp__jira__jira_getIssue with:
  issueKey: "KEY-NNN"
  fields: ["summary", "description", "status", "assignee", "reporter", "priority",
           "created", "updated", "duedate", "issuetype", "labels",
           "components", "fixVersions", "versions",
           "customfield_10002",  // Story Points
           "customfield_10004",  // Epic Name
           "customfield_10005",  // Epic Link
           "attachment", "comment"]
```

Extract into the entry:

- **`description`** — plain-text (or Jira wiki) body of the issue. If null/empty, record `"(no description)"`.
- **`comments_total`** — `comment.total` or `len(comment.comments)`.
- **`last_comment`** — the most recent comment (highest `created` timestamp). Record `{author, created, body}`. If no comments, leave null.
- **`attachments`** — list of `{filename, size_bytes, mime_type, author, created, url}` from `attachment[]`. If none, empty list.
- **`metadata`** — a flat dict of non-null values for:
  - `components` (comma-joined names)
  - `fix_versions` / `affects_versions`
  - `due_date`
  - `story_points`
  - `epic_link` (the Epic this issue belongs to, if any) and, if present, fetch the Epic summary for display
  - `labels`
  - `created_at`, `updated_at`

**Fetch caching rule:** keep a local dict keyed by issue key so the same issue is never fetched twice even if it appears in both Phase 1 and Phase 3.

**Truncation for rendering:**
- Description: include full text in Markdown. For PPTX, truncate to 900 chars with an ellipsis (noted visibly), and spill overflow to a "description continued" slide if the truncated text would be longer than 2000 chars.
- Last comment body: full in Markdown; truncated to 600 chars in PPTX with ellipsis.

**Epic enrichment:** if `epic_link` is set, fetch the Epic's summary once (cached) so the recap shows `"Epic: EPIC-KEY — Epic Summary"` instead of just a bare key.

**Rendering label for last comment:** always format as `"Last comment (N of M)"` where N is the position of the displayed comment (latest = `M`) and M is `comments_total`. When only one comment exists, render `"Last comment (1 of 1)"`. When there are none, render `"No comments"`.

### Phase 2: Collect Git Activity

**Goal**: Enumerate commits in the current repo within the window.

1. **Format window for `git log`:**
   ```bash
   GIT_SINCE="2026-04-20T00:00:00Z"
   GIT_UNTIL="2026-04-30T23:59:59Z"
   ```

2. **Commit list with stats:**
   ```bash
   git log \
     --since="$GIT_SINCE" --until="$GIT_UNTIL" \
     --date=iso-strict \
     --pretty=format:'%H%x09%an%x09%ad%x09%s' \
     --no-merges
   ```
   Parse into records: `{sha, author, date_iso, subject}`.

3. **Per-commit file stats** — for each SHA, a follow-up:
   ```bash
   git show --stat --format='' <SHA> | tail -n 1
   # e.g., " 12 files changed, 340 insertions(+), 22 deletions(-)"
   ```
   (Avoid the full diff; the summary line is sufficient.)

4. **Branch context:**
   ```bash
   CURRENT_BRANCH=$(git branch --show-current)
   REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
   ORIGIN=$(git remote get-url origin 2>/dev/null || echo "")
   ```

5. **Optional — PR associations.** If `gh` is authenticated, for each SHA try:
   ```bash
   gh pr list --search "$SHA" --state all --json number,title,url --limit 1 2>/dev/null
   ```
   Attach `pr_url`/`pr_title` to the commit record. Skip silently if `gh` is not available.

### Phase 3: Cross-Reference Jira ↔ Commits

**Goal**: Attach commits to the Jira issue they reference.

1. **Extract Jira keys from commit messages.** For each commit:
   ```
   regex: \b([A-Z][A-Z0-9]+-\d+)\b
   ```
   Apply to the commit subject AND the full body (`git show -s --format=%B <SHA>`). Filter out matches that aren't one of the target projects from Phase 0.

2. **Extract Jira keys from branch name.** If the current branch (or the commit's originating branch, discoverable via `git branch --contains <SHA>`) contains a Jira key, attach that key to the commit as a *weaker* association (marked `(via branch)`).

3. **Build the link map:**
   ```
   jira_entry[key].commits += [commit]
   commit.linked_jira_keys += [key]
   ```

4. **Orphan commits** are commits whose `linked_jira_keys` is empty.

5. **For every Jira key referenced by a commit but NOT present in Phase 1's event set**, fetch the issue summary so the recap can still mention it briefly (the issue wasn't *created/updated* in the window, but code landed for it):
   ```
   mcp__jira__jira_getIssue with issueKey: "KEY-NNN", fields: ["summary", "status", "assignee"]
   ```
   Add to a "Commits referencing other Jiras" list.

### Phase 4: Collect Agent-Orch Session Artifacts

**Goal**: List agent-orch / spec-kit artifacts active in the window.

1. **Find candidate directories:**
   ```bash
   find ssnc-agent-orch -maxdepth 2 -type d 2>/dev/null
   find .specify/specs -maxdepth 2 -type d 2>/dev/null
   ```

2. **For each directory, check mtimes of key files:**
   ```bash
   stat -f '%Sm %N' -t '%Y-%m-%dT%H:%M:%SZ' \
     ssnc-agent-orch/*/PLAN.md \
     ssnc-agent-orch/*/STATUS.md \
     ssnc-agent-orch/*/COORDINATION.md \
     ssnc-agent-orch/*/ADVOCATE-REVIEW.md \
     .specify/specs/*/spec.md \
     .specify/specs/*/plan.md \
     2>/dev/null
   ```
   (`stat -f` is macOS; use `stat -c '%y %n'` on Linux — detect and pick.)

3. **Keep entries** where the mtime is inside the window. For each kept session, pull:
   - Session directory name
   - The "## Feature" or "## Goal" line from `PLAN.md`
   - A short 2-3 bullet summary from `STATUS.md` (first "Agent Progress" section)
   - Whether `COORDINATION.md` exists (indicates team mode)

### Phase 5: Ensure python-pptx Is Available

**Goal**: Make sure the PPTX step can run before we build the report.

1. **Check:**
   ```bash
   python3 -c "import pptx" 2>/dev/null
   ```

2. **If missing**, try in order (ask the user which one to use if ambiguous):

   **Option A — user site install (fast, no sudo):**
   ```bash
   python3 -m pip install --user python-pptx
   ```

   **Option B — pipx run (isolated):**
   ```bash
   pipx run --spec python-pptx python3 -c "import pptx; print(pptx.__version__)"
   ```
   If chosen, the generator script is later invoked via `pipx run --spec python-pptx python3 /tmp/build-recap.py ...`.

   **Option C — uv (if available):**
   ```bash
   uv pip install --system python-pptx
   ```

3. **If no install path works**, tell the user and stop before generating artifacts:
   ```
   Could not install python-pptx automatically.
   Install it manually (`pip install python-pptx` or `brew install python-pptx`) and rerun.
   The Markdown recap has NOT been written so you can restart cleanly.
   ```

### Phase 6: Write the Markdown Recap

**Goal**: Emit `../work-recap-<WINDOW_SLUG>.md` with Jiras-first ordering.

Template (fill in per run):

```markdown
# Work Recap: <WINDOW_START> → <WINDOW_END>

**Repo:** <REPO_NAME> (`<ORIGIN>`)
**Current branch:** <CURRENT_BRANCH>
**Generated:** <NOW_LOCAL> (<NOW_UTC>)
**Jira project(s):** <KEY1>, <KEY2>

## Summary

| Metric | Count |
|--------|-------|
| Jira issues created | N |
| Status transitions | N |
| Assignment changes | N |
| Commits | N |
| Contributors | N |
| Agent-orch sessions | N |

## Jira Activity

### Created in Window

For each created issue (newest first):

#### [KEY-NNN](https://jira.ssnc-corp.cloud/browse/KEY-NNN) — Summary

- **Type:** Story | **Priority:** Medium | **Status (now):** In progress
- **Reporter:** <name> → **Assignee:** <name>
- **Created:** <ts> | **Updated:** <ts> | **Due:** <due or "—">
- **Story Points:** 3 | **Epic:** [EPIC-99](url) — Epic Summary
- **Components:** Backend, Auth | **Fix Versions:** 2.20.0
- **Labels:** claude-code-agent-harness

**Description:**

> <full issue description here, preserved verbatim — wraps across lines>
> <continuation if multi-paragraph>

**Status transitions in window:**
- 2026-04-22T14:12Z: To Do → In progress
- 2026-04-28T09:01Z: In progress → Under Review

**Last comment (3 of 12)** — _Joe Stein, 2026-04-29T10:04Z_:

> <full body of the most recent comment>

**Attachments (2):**
- [screenshot.png](<url>) — 245 KB — image/png — uploaded by Joe Stein on 2026-04-23
- [design.pdf](<url>) — 1.2 MB — application/pdf — uploaded by Sarah on 2026-04-25

**Linked commits (in window):**
- `a1b2c3d` 2026-04-22 feat: add X — 3 files, +120/-10 — [PR #42](<url>)
- `e5f6a7b` 2026-04-28 fix: handle Y — 1 file, +18/-2

> If a field is absent (no description, no attachments, no comments, no epic), render `"(none)"` or `"No comments"` / `"No attachments"` as appropriate rather than omitting the block entirely — readers should know it's deliberately empty, not missing.

### Reassigned / Transitioned (existing issues)

Same layout as above — including the Description, Last comment, Attachments, and Metadata blocks — but without the "created" framing. List only issues that already existed before the window and had events inside it.

### Commits Referencing Other Jiras

Issues NOT in the above sections but referenced by commits in the window. **Even these get enriched** (description, last comment, attachments, metadata) so the recap remains self-contained:

#### [KEY-NNN](url) — <summary>

- **Type / Priority / Status:** ... | **Assignee:** ...
- **Epic / Components / Fix Versions / Labels:** ...

**Description:**
> <description body>

**Last comment (1 of 4)** — _<author>, <ts>_:
> <body>

**Attachments:** <list or "No attachments">

**Linked commits (in window):**
- `sha` <subject>
- `sha` <subject>

## Orphan Commits (no Jira reference)

| SHA | Date | Author | Subject | Files | +/- |
|-----|------|--------|---------|-------|-----|
| a1b2c3d | 2026-04-21 | Joe | chore: bump deps | 4 | +22/-18 |
| ... |

## Agent-Orch Sessions Active in Window

### ssnc-agent-orch/2026-04-22-auth-feature
- **Feature:** Add JWT auth
- **Artifacts updated:** PLAN.md (2026-04-22), STATUS.md (2026-04-28)
- **Mode:** agent teams (COORDINATION.md present)
- **Snapshot from STATUS.md:**
  - Builder: 8/8 tasks complete
  - Validator: 92% coverage

---

Generated by `/team-work:work-recap`.
```

Write to the **parent directory of the repo root**:
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
OUT_MD="$(dirname "$REPO_ROOT")/work-recap-<WINDOW_SLUG>.md"
```

### Phase 7: Generate the PowerPoint

**Goal**: Emit `../work-recap-<WINDOW_SLUG>.pptx` in Bluestone light-mode.

1. **Write a temporary Python generator** to `/tmp/build-recap-<WINDOW_SLUG>.py`. The script receives the report data as a JSON file (easier than inlining — avoids quoting headaches for commit messages with special chars).

2. **Write the payload to `/tmp/recap-<WINDOW_SLUG>.json`** containing:
   - `meta`: window, repo, branch, generated_at, projects
   - `summary`: counts for the summary slide
   - `jira_created`: list of created issues (each with events, linked commits, **and the Phase 1.5 enrichment fields: `description`, `last_comment`, `comments_total`, `attachments`, `metadata`**)
   - `jira_transitioned`: same shape as `jira_created`
   - `jira_referenced`: issues referenced by commits but not in events — also enriched
   - `orphan_commits`: list
   - `sessions`: list of agent-orch sessions

   Each Jira entry has this shape:
   ```json
   {
     "key": "AITOOLS-45",
     "summary": "...",
     "type": "Story",
     "priority": "Medium",
     "status": "In progress",
     "reporter": "...",
     "assignee": "...",
     "labels": ["claude-code-agent-harness"],
     "description": "<full issue description, plain text>",
     "comments_total": 12,
     "last_comment": {
       "author": "Joe Stein",
       "created": "2026-04-29T10:04Z",
       "body": "<comment body>"
     },
     "attachments": [
       {"filename": "screenshot.png", "size_human": "245 KB",
        "mime_type": "image/png", "author": "Joe Stein",
        "created": "2026-04-23", "url": "https://..."}
     ],
     "metadata": {
       "created_at": "2026-04-20T09:00Z",
       "updated_at": "2026-04-29T10:04Z",
       "due_date": "2026-05-15",
       "story_points": 3,
       "epic_key": "AITOOLS-37",
       "epic_summary": "Agent Harness",
       "components": ["Backend", "Auth"],
       "fix_versions": ["2.20.0"],
       "affects_versions": []
     },
     "events": [...],
     "commits": [...]
   }
   ```

3. **Run the script:**
   ```bash
   python3 /tmp/build-recap-<WINDOW_SLUG>.py /tmp/recap-<WINDOW_SLUG>.json "$OUT_PPTX"
   ```
   (or `pipx run --spec python-pptx python3 /tmp/build-recap-...py ...` if Option B from Phase 5 was selected.)

4. **Clean up** `/tmp/build-recap-*.py` and `/tmp/recap-*.json` after success.

### Bluestone Light-Mode Palette (embedded in the generator)

The same palette used by `/team-work:work-report`, so reports across the family look consistent:

| Token | Hex | Usage |
|-------|-----|-------|
| Page background | `#F6FDFF` | Slide background |
| Card surface | `#FFFFFF` | Content boxes |
| Card border | `#C2D0DB` | Dividers, 1pt borders |
| Header bar | `#EDF3F8` | Top band on content slides |
| Primary text | `#070D20` | Titles, body |
| Body text | `#3D5167` | Secondary copy |
| Muted text | `#7B89A3` | Captions, timestamps |
| Primary accent | `#0D9DDB` | Accent line on title slide, link color |
| Success | `#00A86B` | "Done" status pills, positive deltas |
| Warning | `#FFA800` | "Under Review" / "In Progress" pills |
| Error | `#FF3B30` | "Blocked" / "On Hold" pills, negative deltas |
| Tint blue | `#E0F0FB` | Info callout backgrounds |
| Tint teal | `#DFF5ED` | Success callout backgrounds |
| Tint warn | `#FFF3D9` | Warning callout backgrounds |
| Tint red | `#FFE5E3` | Error callout backgrounds |

Font family: `Inter` primary, `Calibri` as system fallback (python-pptx can reference a font by name — if Inter isn't installed on the viewer's machine it falls back automatically).

### Deck Structure

1. **Title slide** — "Work Recap" + window + repo + generated timestamp. Primary-accent horizontal rule.
2. **Summary slide** — KPI strip (Created / Transitions / Assignments / Commits / Contributors / Sessions).
3. **Section divider — "Jira Activity"**
4. **One or more slides per Jira issue, in this order**:
   - Issues created in window (newest first)
   - Issues transitioned/reassigned (existing, newest event first)
   - Issues referenced by commits but not in events
   
   Each issue gets at minimum an **overview slide**:
   - Key + summary as title
   - Type / Priority / Current Status pill
   - Reporter / Assignee
   - Metadata line: Epic, Components, Fix Versions, Story Points, Due, Labels
   - **Description** (truncated to ~900 chars with ellipsis; full body on overflow slide)
   - **Last comment (N of M)** with author + timestamp + body (truncated to ~600 chars; full body on overflow slide)
   - Events in window (bulleted)
   - Two side-by-side columns at the bottom: **Attachments** (filename, size, MIME) and **Linked commits** (SHA, date, subject)
   
   Emit additional slides as needed:
   - **Overflow slide** when description > 900 chars OR last-comment body > 600 chars (full text)
   - **Commits detail slide** when linked commits > 4 (full list)
   
   It's fine for a single issue to span 2-3 slides.

5. **Section divider — "Orphan Commits"**
6. **One or more commit slides** — table of orphan commits (one slide per 12 rows).
7. **Section divider — "Agent-Orch Sessions"**
8. **One slide per session** — feature name, artifacts updated, mode, snapshot.
9. **Closing slide** — "Generated by /team-work:work-recap" + how to regenerate.

### Generator Script Template

Write this file to `/tmp/build-recap-<WINDOW_SLUG>.py`. The skill substitutes no code here — the script reads everything from the JSON payload so it stays data-driven:

```python
#!/usr/bin/env python3
"""Build a Bluestone light-mode PPTX recap from a JSON payload.

Usage: build-recap.py <payload.json> <output.pptx>
"""
import json
import sys
from datetime import datetime
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

# --- Bluestone light-mode palette -------------------------------------------
BG_PAGE        = RGBColor(0xF6, 0xFD, 0xFF)
BG_CARD        = RGBColor(0xFF, 0xFF, 0xFF)
BORDER_CARD    = RGBColor(0xC2, 0xD0, 0xDB)
HEADER_BAR     = RGBColor(0xED, 0xF3, 0xF8)
TEXT_PRIMARY   = RGBColor(0x07, 0x0D, 0x20)
TEXT_BODY      = RGBColor(0x3D, 0x51, 0x67)
TEXT_MUTED     = RGBColor(0x7B, 0x89, 0xA3)
ACCENT         = RGBColor(0x0D, 0x9D, 0xDB)
SUCCESS        = RGBColor(0x00, 0xA8, 0x6B)
WARNING        = RGBColor(0xFF, 0xA8, 0x00)
ERROR          = RGBColor(0xFF, 0x3B, 0x30)
TINT_BLUE      = RGBColor(0xE0, 0xF0, 0xFB)
TINT_TEAL      = RGBColor(0xDF, 0xF5, 0xED)
TINT_WARN      = RGBColor(0xFF, 0xF3, 0xD9)
TINT_RED       = RGBColor(0xFF, 0xE5, 0xE3)

FONT = "Inter"

STATUS_COLOR = {
    "Done":          (SUCCESS, TINT_TEAL),
    "In progress":   (ACCENT,  TINT_BLUE),
    "Under Review":  (WARNING, TINT_WARN),
    "To Do":         (TEXT_MUTED, BG_CARD),
    "On Hold":       (ERROR,   TINT_RED),
    "Blocked":       (ERROR,   TINT_RED),
}

SLIDE_W, SLIDE_H = Inches(13.333), Inches(7.5)  # 16:9

# --- Helpers ---------------------------------------------------------------

def set_background(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_text(slide, left, top, width, height, text, *, size=14, bold=False,
             color=TEXT_BODY, align=PP_ALIGN.LEFT, font=FONT):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return tb

def add_rule(slide, left, top, width, color=ACCENT, thickness=Pt(3)):
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, thickness)
    line.line.fill.background()
    line.fill.solid()
    line.fill.fore_color.rgb = color
    return line

def add_card(slide, left, top, width, height, *, fill=BG_CARD, border=BORDER_CARD):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.adjustments[0] = 0.04
    card.fill.solid()
    card.fill.fore_color.rgb = fill
    card.line.color.rgb = border
    card.line.width = Pt(0.75)
    return card

def add_status_pill(slide, left, top, status):
    fg, bg = STATUS_COLOR.get(status, (TEXT_MUTED, BG_CARD))
    pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(1.3), Inches(0.28))
    pill.adjustments[0] = 0.5
    pill.fill.solid()
    pill.fill.fore_color.rgb = bg
    pill.line.color.rgb = fg
    pill.line.width = Pt(0.75)
    tf = pill.text_frame
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = status
    r.font.name = FONT
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = fg

def add_content_slide_header(slide, section_label, slide_title):
    # Top header bar
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, Inches(0.6))
    bar.line.fill.background()
    bar.fill.solid()
    bar.fill.fore_color.rgb = HEADER_BAR
    add_text(slide, Inches(0.5), Inches(0.12), Inches(8), Inches(0.3),
             section_label, size=10, bold=True, color=TEXT_MUTED)
    add_text(slide, Inches(0.5), Inches(0.55), Inches(12), Inches(0.5),
             slide_title, size=22, bold=True, color=TEXT_PRIMARY)
    add_rule(slide, Inches(0.5), Inches(1.05), Inches(1.5))

# --- Slide builders --------------------------------------------------------

def build_title(pres, meta):
    slide = pres.slides.add_slide(pres.slide_layouts[6])  # blank
    set_background(slide, BG_PAGE)
    add_text(slide, Inches(0.75), Inches(2.0), Inches(11), Inches(0.6),
             "Work Recap", size=44, bold=True, color=TEXT_PRIMARY)
    add_rule(slide, Inches(0.75), Inches(2.9), Inches(3))
    add_text(slide, Inches(0.75), Inches(3.1), Inches(11), Inches(0.5),
             f"{meta['window_start']}  →  {meta['window_end']}",
             size=22, color=TEXT_BODY)
    add_text(slide, Inches(0.75), Inches(4.0), Inches(11), Inches(0.4),
             f"Repo: {meta['repo']}    •    Branch: {meta['branch']}",
             size=14, color=TEXT_BODY)
    add_text(slide, Inches(0.75), Inches(4.5), Inches(11), Inches(0.4),
             f"Jira projects: {', '.join(meta['projects'])}",
             size=14, color=TEXT_BODY)
    add_text(slide, Inches(0.75), Inches(6.7), Inches(11), Inches(0.3),
             f"Generated {meta['generated_at']} by /team-work:work-recap",
             size=10, color=TEXT_MUTED)

def build_summary(pres, summary):
    slide = pres.slides.add_slide(pres.slide_layouts[6])
    set_background(slide, BG_PAGE)
    add_content_slide_header(slide, "OVERVIEW", "Summary")
    cards = [
        ("Jira issues created", summary["created"], ACCENT),
        ("Status transitions",  summary["transitions"], WARNING),
        ("Assignment changes",  summary["assignments"], TEXT_BODY),
        ("Commits",             summary["commits"], TEXT_PRIMARY),
        ("Contributors",        summary["contributors"], TEXT_BODY),
        ("Agent-orch sessions", summary["sessions"], SUCCESS),
    ]
    card_w, card_h, gap = Inches(2.0), Inches(1.6), Inches(0.2)
    left0 = Inches(0.5)
    top = Inches(1.8)
    for i, (label, value, color) in enumerate(cards):
        left = left0 + (card_w + gap) * i
        add_card(slide, left, top, card_w, card_h)
        add_text(slide, left + Inches(0.2), top + Inches(0.15), card_w - Inches(0.4), Inches(0.4),
                 label, size=10, bold=True, color=TEXT_MUTED)
        add_text(slide, left + Inches(0.2), top + Inches(0.5), card_w - Inches(0.4), Inches(0.9),
                 str(value), size=36, bold=True, color=color)

def build_section_divider(pres, title, subtitle=""):
    slide = pres.slides.add_slide(pres.slide_layouts[6])
    set_background(slide, BG_PAGE)
    add_text(slide, Inches(0.75), Inches(3.0), Inches(11), Inches(0.8),
             title, size=40, bold=True, color=TEXT_PRIMARY)
    add_rule(slide, Inches(0.75), Inches(3.9), Inches(2.5))
    if subtitle:
        add_text(slide, Inches(0.75), Inches(4.1), Inches(11), Inches(0.5),
                 subtitle, size=16, color=TEXT_BODY)

def _truncate(text, limit):
    if text is None:
        return ""
    text = str(text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"

def _format_meta_line(issue):
    m = issue.get("metadata") or {}
    bits = []
    if m.get("epic_key"):
        bits.append(f"Epic: {m['epic_key']} — {m.get('epic_summary','')}".rstrip(' —'))
    if m.get("components"):
        bits.append("Components: " + ", ".join(m["components"]))
    if m.get("fix_versions"):
        bits.append("Fix: " + ", ".join(m["fix_versions"]))
    if m.get("story_points") is not None:
        bits.append(f"SP: {m['story_points']}")
    if m.get("due_date"):
        bits.append(f"Due: {m['due_date']}")
    if issue.get("labels"):
        bits.append("Labels: " + ", ".join(issue["labels"]))
    return "   •   ".join(bits) if bits else "(no metadata)"

def build_jira_overview(pres, issue, section_label):
    slide = pres.slides.add_slide(pres.slide_layouts[6])
    set_background(slide, BG_PAGE)
    add_content_slide_header(slide, section_label,
                             f"{issue['key']} — {issue['summary']}")
    # Line 1: Type / Priority / Reporter→Assignee
    meta = f"{issue.get('type','—')}   •   {issue.get('priority','—')}   •   " \
           f"{issue.get('reporter','—')} → {issue.get('assignee','—')}"
    add_text(slide, Inches(0.5), Inches(1.25), Inches(10), Inches(0.3),
             meta, size=12, color=TEXT_BODY)
    add_status_pill(slide, Inches(11.3), Inches(1.2), issue.get("status", "To Do"))
    # Line 2: rich metadata
    add_text(slide, Inches(0.5), Inches(1.55), Inches(12), Inches(0.3),
             _format_meta_line(issue), size=10, color=TEXT_MUTED)

    # Description block (truncated for slide, full body spills to overflow slide)
    y = Inches(1.95)
    add_text(slide, Inches(0.5), y, Inches(12), Inches(0.3),
             "Description", size=11, bold=True, color=TEXT_MUTED)
    y += Inches(0.3)
    desc = issue.get("description") or "(no description)"
    desc_short = _truncate(desc, 900)
    add_text(slide, Inches(0.6), y, Inches(12), Inches(1.3),
             desc_short, size=11, color=TEXT_BODY)
    y += Inches(1.35)

    # Last comment block
    total = issue.get("comments_total", 0) or 0
    lc = issue.get("last_comment")
    if total == 0 or lc is None:
        add_text(slide, Inches(0.5), y, Inches(12), Inches(0.3),
                 "No comments", size=11, bold=True, color=TEXT_MUTED)
        y += Inches(0.3)
    else:
        header = f"Last comment ({total} of {total}) — {lc.get('author','')} · {lc.get('created','')}"
        add_text(slide, Inches(0.5), y, Inches(12), Inches(0.3),
                 header, size=11, bold=True, color=TEXT_MUTED)
        y += Inches(0.3)
        add_text(slide, Inches(0.6), y, Inches(12), Inches(0.9),
                 _truncate(lc.get("body",""), 600), size=11, color=TEXT_BODY)
        y += Inches(0.95)

    # Events / transitions
    add_text(slide, Inches(0.5), y, Inches(12), Inches(0.3),
             "Events in window", size=11, bold=True, color=TEXT_MUTED)
    y += Inches(0.3)
    events = issue.get("events", [])
    if not events:
        add_text(slide, Inches(0.6), y, Inches(12), Inches(0.3),
                 "— no events in window (linked by commit reference)",
                 size=11, color=TEXT_MUTED)
        y += Inches(0.3)
    else:
        for ev in events[:4]:
            add_text(slide, Inches(0.6), y, Inches(12), Inches(0.3),
                     f"• {ev['timestamp']}   {ev['description']}",
                     size=11, color=TEXT_BODY)
            y += Inches(0.26)

    # Attachments + commits stacked at the bottom
    y = max(y, Inches(5.6))
    attachments = issue.get("attachments") or []
    add_text(slide, Inches(0.5), y, Inches(5.5), Inches(0.3),
             f"Attachments ({len(attachments)})",
             size=11, bold=True, color=TEXT_MUTED)
    commits = issue.get("commits", [])
    add_text(slide, Inches(6.7), y, Inches(6.5), Inches(0.3),
             f"Linked commits ({len(commits)})",
             size=11, bold=True, color=TEXT_MUTED)
    y += Inches(0.3)
    # Attachments column
    ay = y
    if not attachments:
        add_text(slide, Inches(0.6), ay, Inches(5.5), Inches(0.3),
                 "No attachments", size=10, color=TEXT_MUTED)
    else:
        for a in attachments[:5]:
            line = f"• {a.get('filename','?')} ({a.get('size_human','?')}, {a.get('mime_type','')})"
            add_text(slide, Inches(0.6), ay, Inches(5.8), Inches(0.3),
                     line, size=10, color=TEXT_BODY)
            ay += Inches(0.24)
        if len(attachments) > 5:
            add_text(slide, Inches(0.6), ay, Inches(5.8), Inches(0.3),
                     f"(+ {len(attachments) - 5} more)",
                     size=9, color=TEXT_MUTED)
    # Commits column
    cy = y
    shown = commits[:4]
    for c in shown:
        line = f"{c['sha'][:7]}  {c['date']}  {_truncate(c['subject'], 48)}"
        add_text(slide, Inches(6.7), cy, Inches(6.5), Inches(0.3),
                 line, size=10, color=TEXT_BODY, font="Fira Code")
        cy += Inches(0.24)
    if len(commits) > 4:
        add_text(slide, Inches(6.7), cy, Inches(6.5), Inches(0.3),
                 f"(+ {len(commits) - 4} more — see next slide)",
                 size=9, color=TEXT_MUTED)

def build_jira_overflow(pres, issue):
    """Emit a follow-up slide when description or last-comment body was truncated."""
    desc = issue.get("description") or ""
    lc = (issue.get("last_comment") or {}).get("body") or ""
    needs_desc = len(desc) > 900
    needs_comment = len(lc) > 600
    if not (needs_desc or needs_comment):
        return
    slide = pres.slides.add_slide(pres.slide_layouts[6])
    set_background(slide, BG_PAGE)
    add_content_slide_header(slide, "JIRA DETAIL",
                             f"{issue['key']} — full description / comment")
    y = Inches(1.3)
    if needs_desc:
        add_text(slide, Inches(0.5), y, Inches(12), Inches(0.3),
                 "Full description", size=11, bold=True, color=TEXT_MUTED)
        y += Inches(0.3)
        add_text(slide, Inches(0.6), y, Inches(12), Inches(3.0),
                 _truncate(desc, 2500), size=11, color=TEXT_BODY)
        y += Inches(3.1)
    if needs_comment:
        total = issue.get("comments_total", 0) or 0
        add_text(slide, Inches(0.5), y, Inches(12), Inches(0.3),
                 f"Full last comment ({total} of {total})",
                 size=11, bold=True, color=TEXT_MUTED)
        y += Inches(0.3)
        add_text(slide, Inches(0.6), y, Inches(12), Inches(2.5),
                 _truncate(lc, 2000), size=11, color=TEXT_BODY)

def build_jira_commits_detail(pres, issue):
    slide = pres.slides.add_slide(pres.slide_layouts[6])
    set_background(slide, BG_PAGE)
    add_content_slide_header(slide, "JIRA ACTIVITY",
                             f"{issue['key']} — all linked commits")
    y = Inches(1.3)
    for c in issue["commits"]:
        line = f"{c['sha'][:7]}  {c['date']}  {c['author']}  {c['subject']}"
        add_text(slide, Inches(0.5), y, Inches(12), Inches(0.3),
                 line, size=11, color=TEXT_BODY, font="Fira Code")
        y += Inches(0.24)
        if y > Inches(7.0):
            break

def build_orphan_commits(pres, orphans):
    if not orphans:
        return
    per_slide = 14
    for i in range(0, len(orphans), per_slide):
        chunk = orphans[i:i+per_slide]
        slide = pres.slides.add_slide(pres.slide_layouts[6])
        set_background(slide, BG_PAGE)
        add_content_slide_header(slide, "ORPHAN COMMITS",
                                 f"Commits without a Jira reference ({i+1}-{i+len(chunk)} of {len(orphans)})")
        y = Inches(1.3)
        for c in chunk:
            line = f"{c['sha'][:7]}  {c['date']}  {c['author']}  {c['subject']}"
            add_text(slide, Inches(0.5), y, Inches(12), Inches(0.3),
                     line, size=10, color=TEXT_BODY, font="Fira Code")
            y += Inches(0.28)

def build_session_slide(pres, session):
    slide = pres.slides.add_slide(pres.slide_layouts[6])
    set_background(slide, BG_PAGE)
    add_content_slide_header(slide, "AGENT-ORCH SESSION",
                             session.get("feature", session["dir"]))
    add_text(slide, Inches(0.5), Inches(1.3), Inches(12), Inches(0.3),
             session["dir"], size=12, color=TEXT_MUTED, font="Fira Code")
    add_text(slide, Inches(0.5), Inches(1.7), Inches(12), Inches(0.3),
             f"Mode: {session.get('mode','subagents')}   •   "
             f"Updated: {session.get('last_update','—')}",
             size=12, color=TEXT_BODY)
    add_text(slide, Inches(0.5), Inches(2.2), Inches(12), Inches(0.3),
             "Snapshot", size=11, bold=True, color=TEXT_MUTED)
    y = Inches(2.55)
    for bullet in session.get("highlights", [])[:10]:
        add_text(slide, Inches(0.6), y, Inches(12), Inches(0.3),
                 f"• {bullet}", size=12, color=TEXT_BODY)
        y += Inches(0.3)

def build_closing(pres, meta):
    slide = pres.slides.add_slide(pres.slide_layouts[6])
    set_background(slide, BG_PAGE)
    add_text(slide, Inches(0.75), Inches(3.0), Inches(11), Inches(0.8),
             "End of recap", size=40, bold=True, color=TEXT_PRIMARY)
    add_rule(slide, Inches(0.75), Inches(3.9), Inches(2.5))
    add_text(slide, Inches(0.75), Inches(4.1), Inches(11), Inches(0.4),
             "Regenerate any time with:", size=14, color=TEXT_BODY)
    add_text(slide, Inches(0.75), Inches(4.5), Inches(11), Inches(0.4),
             f"/team-work:work-recap \"{meta['window_start']}\" \"{meta['window_end']}\"",
             size=14, color=TEXT_PRIMARY, font="Fira Code")

# --- Main ------------------------------------------------------------------

def main(argv):
    if len(argv) != 3:
        print("usage: build-recap.py <payload.json> <output.pptx>", file=sys.stderr)
        return 2
    with open(argv[1]) as f:
        data = json.load(f)

    pres = Presentation()
    pres.slide_width  = SLIDE_W
    pres.slide_height = SLIDE_H

    build_title(pres, data["meta"])
    build_summary(pres, data["summary"])

    if data["jira_created"] or data["jira_transitioned"] or data["jira_referenced"]:
        build_section_divider(pres, "Jira Activity",
                              f"{len(data['jira_created'])} created, "
                              f"{len(data['jira_transitioned'])} transitioned, "
                              f"{len(data['jira_referenced'])} referenced by commits")

    for issue in data["jira_created"]:
        build_jira_overview(pres, issue, "CREATED IN WINDOW")
        build_jira_overflow(pres, issue)
        if len(issue.get("commits", [])) > 4:
            build_jira_commits_detail(pres, issue)

    for issue in data["jira_transitioned"]:
        build_jira_overview(pres, issue, "TRANSITIONED IN WINDOW")
        build_jira_overflow(pres, issue)
        if len(issue.get("commits", [])) > 4:
            build_jira_commits_detail(pres, issue)

    for issue in data["jira_referenced"]:
        build_jira_overview(pres, issue, "REFERENCED BY COMMITS")
        build_jira_overflow(pres, issue)
        if len(issue.get("commits", [])) > 4:
            build_jira_commits_detail(pres, issue)

    if data["orphan_commits"]:
        build_section_divider(pres, "Orphan Commits",
                              f"{len(data['orphan_commits'])} commits not linked to a Jira issue")
        build_orphan_commits(pres, data["orphan_commits"])

    if data["sessions"]:
        build_section_divider(pres, "Agent-Orch Sessions",
                              f"{len(data['sessions'])} session(s) active in window")
        for session in data["sessions"]:
            build_session_slide(pres, session)

    build_closing(pres, data["meta"])

    pres.save(argv[2])
    print(f"wrote {argv[2]} ({len(pres.slides)} slides)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

### Phase 8: Open the Outputs and Present Summary

1. **Announce file locations:**
   ```
   Work recap ready:

     Markdown:   ../work-recap-<WINDOW_SLUG>.md
     PowerPoint: ../work-recap-<WINDOW_SLUG>.pptx

   Window:  <WINDOW_START> → <WINDOW_END>
   Jira:    <N> created, <N> transitioned, <N> referenced by commits
   Commits: <N> total (<N> linked to Jira, <N> orphan)
   Sessions: <N> agent-orch sessions active
   ```

2. **Optionally offer to open:**
   ```
   Open the Markdown and PPTX now? (macOS: `open`, Linux: `xdg-open`)
   (a) Yes, open both
   (b) Just the Markdown
   (c) Just the PPTX
   (d) Leave them closed
   ```

3. **Do not commit, do not push.** Outputs live in `../` and are intentionally outside the repo — they are ephemeral PM artifacts, not source.

## Error Handling

| Scenario | Action |
|----------|--------|
| Not in a git repo | Stop: "This skill must run inside a git repository." |
| `.claude/rules/jira.md` missing | Tell user to run `/agent-orch:jira` first. |
| Jira MCP not responding | Warn and continue WITHOUT Jira data; note in report header that Jira was skipped. |
| `python3` missing | Stop before writing Markdown. Tell user to install Python 3.8+. |
| `python-pptx` install fails | Stop before writing Markdown. Show all tried commands. |
| Empty window (0 events, 0 commits, 0 sessions) | Still write a valid report and deck with a "Nothing happened in this window" note — useful negative-confirmation artifact. |
| `git log` fails | Report the error verbatim and stop. |
| Commit with no stats line (empty commit, merge commit) | Record as `0 files, +0/-0`. |
| PPTX file already exists at target path | Prompt: overwrite, versioned suffix (`-v2`), or cancel. |

## Notes for Implementers

- The skill does NOT touch `git`, `gh`, or Jira via the Bash tool beyond read-only queries. Writes go only to the two output files in `../` and to `/tmp/build-recap-*.{py,json}` (cleaned up on success).
- No secrets are written to the Markdown or PPTX. Jira URLs are composed from `https://jira.ssnc-corp.cloud/browse/<key>` using the base URL in `.claude/rules/jira.md`.
- The PPTX is self-contained — no external images, no embedded fonts. Inter falls back gracefully.
- The Markdown is plain CommonMark — renders correctly in GitHub, VS Code preview, and any editor.

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-recap:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
