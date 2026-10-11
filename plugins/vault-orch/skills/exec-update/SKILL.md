---
name: exec-update
description: Generate an exec-altitude weekly summary written INTO the vault as a dated, Dataview-indexed node (vault/exec-updates/<date>-<period>.md). KPI strip + Mermaid charts (throughput, status, epic progress) + narrative grouped by theme/epic + [[session]]/[[TICKET]] wikilinks. Uses gather-activity.mjs as its data layer (a reusable seam work-recap can later adopt); differentiated from team-work:work-recap (exec vs PM altitude, Mermaid vs PPTX, into-vault vs sibling-dir). Usage: /vault-orch:exec-update [start] [end]
---

# vault-orch: exec-update

Produce an **executive-altitude** summary of a time window and write it **into
the vault** as a frozen, dated, Dataview-indexed node. Themes and outcomes, not
per-commit detail. Charts are **Mermaid-native** so they render in Obsidian, on
GitHub, and in most Markdown viewers with zero viewer-side plugins.

Output: `vault/exec-updates/<YYYY-MM-DD>-<period>.md` (e.g.
`2026-06-01-weekly.md`) — a new dated file each run, never overwritten. The
`exec-updates` dashboard lists them automatically.

## ⚠️ This is NOT team-work:work-recap — read this first

`team-work:work-recap` already exists in this monorepo and covers the same raw
material (Jira + commits + agent-orch sessions). **Do not duplicate it.**
exec-update differs on every axis:

| Axis | `vault-orch:exec-update` (this skill) | `team-work:work-recap` |
|------|----------------------------------------|------------------------|
| **Audience** | Execs / sponsors | PMs / engineers |
| **Altitude** | Themes, outcomes, KPIs, trend | Per-Jira + per-commit detail |
| **Surface** | Written **into the vault** as a dated Dataview-indexed graph node | Sibling-dir (`../`) artifact |
| **Charts** | **Mermaid** (renders everywhere, no deps) | PPTX slides (Bluestone) |
| **Cadence** | Weekly / schedulable | Ad-hoc catch-up |

exec-update's deterministic data layer is factored into
`scripts/gather-activity.mjs`, written as a **reusable gather seam** so that
`work-recap` can migrate onto it later and the two stay aligned. (Today
work-recap still uses its own inline `git log` + MCP queries; the shared
gatherer is wired into exec-update only.) If a user wants a detailed PM deck,
point them at `work-recap`.

## State nuance (important)

exec-update **may** bake a point-in-time Jira-status chart into its dated file.
That's allowed: the file is an explicitly **frozen report**, not a living mirror,
and the dated filename makes that obvious. The vault's relationship layer still
stores no Jira state — only this dated report embeds a snapshot, by design.

## Usage

```
/vault-orch:exec-update                       # prompts for window; default last 7 days
/vault-orch:exec-update "7 days ago" now
/vault-orch:exec-update 2026-05-26 2026-06-01
/vault-orch:exec-update 2026-05-26 2026-06-01 --period weekly
```

## Process

### Phase 0: Resolve the window + period label

1. Accept `[start] [end]` positionally; default to `"7 days ago" now` if omitted
   (confirm with the user).
2. Derive `period` (`weekly` default; allow `--period`), `period_start`,
   `period_end` (ISO dates), and `generated` (`date -u +%Y-%m-%dT%H:%M:%SZ`).
3. Output filename: `vault/exec-updates/<period_end-date>-<period>.md`.

### Phase 1: Gather activity (deterministic, read-only)

Run the gatherer — this is exec-update's **single source of truth** for git +
session + referenced-ticket data, and the reusable seam `work-recap` is intended
to adopt:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/gather-activity.mjs \
  --since "<start>" --until "<end>" --root "$REPO_ROOT" --keys "$KEYS" --pretty
```

It returns JSON: `summary` (commits, contributors, sessions, netLoc, …),
`commits[]` (each with `jiraKeys`, `netLoc`), `sessions[]` (feature, status,
`jiraKeys`, lastUpdate), and `jiraKeys[]` (the union — relationship layer, keys
only, no state). Parse this; it drives everything below.

### Phase 2: Live Jira enrichment (optional, graceful)

The gatherer deliberately does **not** call Jira. Here, *if* the MCP Jira tools
are available, enrich `jiraKeys` for the frozen status chart and epic grouping:

- For each key, `mcp__jira__jira_getIssue` with fields
  `["summary","status","issuetype","customfield_10005" (Epic Link)]`.
- Build: a status histogram (To Do / In Progress / In Review / Done / Blocked),
  and an epic→tickets grouping for the themes section.
- **Degrade gracefully:** if Jira is unreachable or `.claude/rules/jira.md` is
  absent, skip enrichment. Render the status chart from session `status` +
  "tickets advanced" counts instead, and note in the file that Jira was not
  queried. The exec-update must still render from git+session data alone.

### Phase 3: Compute KPIs

From the gathered data:

- **Sessions shipped** — sessions in window with `status` shipped/done, else
  sessions touched in window.
- **PRs merged** — if `gh` is available, `gh pr list --state merged --search
  "merged:<start>..<end>"` count; else omit or derive from commit→PR refs.
- **Tickets advanced** — distinct `jiraKeys` referenced in window (or, with Jira
  enrichment, those that changed status).
- **Net LOC** — `summary.netLoc`.

### Phase 4: Build the Mermaid charts

Use the recipes in **`exec-update-reference.md`** (bundled next to this skill).
At minimum:

1. **Throughput** — `xychart-beta` bar of commits per day over the window.
2. **Delivery status** — `pie showData` of ticket status (frozen snapshot).
3. **Epic / theme progress** — a second bar or `gantt` if epic data is available.

All charts are Mermaid fenced blocks (```` ```mermaid ````). No images, no
PPTX, no plugins required to view.

### Phase 5: Write the dated node

Start from `vault/templates/exec-update.md` (or the shipped asset) and fill it
in. Required frontmatter (so the dashboard auto-lists it):

```yaml
---
type: exec-update
period_start: <ISO date>
period_end: <ISO date>
generated: <ISO timestamp>
---
```

Body order: KPI strip → Mermaid charts → **narrative grouped by THEME/EPIC**
(not per-commit) → `[[session]]` and `[[TICKET]]` wikilinks to what drove the
work. Write to `vault/exec-updates/<period_end>-<period>.md`. **Never overwrite**
an existing dated file — if it exists, append a `-v2` suffix or bump the time.

### Phase 6: Report

```
Executive update written: vault/exec-updates/<file>.md
  Window:   <start> → <end>
  KPIs:     <S> sessions · <P> PRs · <T> tickets advanced · <±LOC> net
  Charts:   throughput, delivery status[, epic progress]  (Mermaid)
  Jira:     enriched | not queried (degraded gracefully)

It appears in vault/dashboards/exec-updates.md automatically.
Schedule it weekly — see the README "Weekly automation" note.
```

## Weekly automation

vault-orch does **not** bake in a scheduler. To run this weekly, register a
Claude Code scheduled task (harness), e.g. Mondays 08:00 local running
`/vault-orch:exec-update "7 days ago" now`. See the plugin README.

## Notes

- Read-only against git/Jira. The only write is the dated vault file.
- Mermaid is the hard requirement for charts — never emit an image or a
  viewer-specific embed. See `exec-update-reference.md` for exact syntax,
  including how to escape labels and keep `xychart-beta` axes valid.
