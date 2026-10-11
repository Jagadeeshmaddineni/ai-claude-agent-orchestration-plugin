# Vault Orchestration Guide

[< Back to Documentation Index](README.md) | [< Back to README](../README.md)

---

`vault-orch` is a sibling plugin in this marketplace that layers an
[Obsidian](https://obsidian.md) vault over any repo using the agent-orch
workflow. It turns the flat pile of `ssnc-agent-orch/` session markdown, the
business-requirement notes, and the Jira tickets they reference into a single
**navigable knowledge graph** — and produces weekly executive summaries as
graph-native, Mermaid-charted notes.

It is a doc/markdown/shell/node plugin: two dependency-free Node scripts, one
defensive Bash hook, a set of Obsidian config + template + dashboard assets, and
four skills that wrap them. No application code, no database, no service.

## Install

```bash
/plugin install vault-orch@ssnc-agent-orch

# then, in a repo that already uses agent-orch (/make, /build):
/vault-orch:init
/vault-orch:backfill --keys RCONAI --apply
```

One-time, in Obsidian: open the repo folder as a vault → **Settings → Community
plugins → enable** → install + enable **Dataview**. (Obsidian downloads the
Dataview binary itself; it cannot be shipped in git.) The three dashboards under
`vault/dashboards/` light up once Dataview is on.

---

## The one principle: store relationships, never state

Everything in vault-orch follows from a single rule:

> **The vault owns immutable facts and the requirement thinking. Jira keeps
> owning mutable state.**

- The vault stores *which sessions and requirements reference which ticket*, and
  the intake notes themselves.
- It does **not** store Jira status, assignee, or sprint.

That means the **ticket layer is derived, not stored**:

- A ticket appears as a **phantom graph node** the moment a session or
  requirement links it via a `jira:` frontmatter wikilink.
- The "ticket hub" is a **live Dataview query** (computed when you open the
  Tickets dashboard) plus Obsidian's backlinks pane — never a saved
  `vault/jira/RCONAI-427.md` note, and never a Jira→markdown sync script.

There is intentionally **no per-ticket note and no sync**. Both were considered
and rejected: Jira changes too often, and replicating it into git would just be
a stale mirror. The graph edge is the durable, valuable part; live status is one
click away in Jira.

---

## The four commands

| Command | What it does |
|---------|--------------|
| `/vault-orch:init` | Provision `.obsidian/` (Dataview enabled, **`userIgnoreFilters` baked into `app.json`** for multi-GB repos), templates, three Dataview dashboards, and `.gitignore` hygiene. Refuses if the repo has no `ssnc-agent-orch/`. Idempotent. |
| `/vault-orch:backfill` | Stamp **variant-B** frontmatter onto existing session markdown so the graph + dashboards populate. Header-only diff, skips code/links, generic project-key regex, idempotent, **dry-run by default**. Lands as one mechanical PR. |
| `/vault-orch:intake <topic>` | Scaffold a business-requirement note (`vault/intake/<topic>.md`) that flows into `team-work:work-prep` / `work-plan` (→ Jira) and then `/make`. |
| `/vault-orch:exec-update [start] [end]` | Exec-altitude weekly summary written **into the vault** as a dated, Dataview-indexed, **Mermaid-charted** node. |

Plus a **Stop hook** that keeps the vault current automatically (see below).

### `/vault-orch:init`

Provisions the vault and is safe to re-run (it only fills gaps):

- Copies `.obsidian/{app.json,core-plugins.json,community-plugins.json}`. The
  **`userIgnoreFilters`** in `app.json` (excluding `node_modules/`,
  `**/node_modules/`, `.next/`, `dist/`, `build/`, `coverage/`, …) is the hard
  prerequisite — target repos can be multi-GB, and without these exclusions
  Obsidian's file watcher indexes every dependency file and thrashes.
- Enables the Dataview community plugin (binary installed once by the user).
- Drops the templates into `vault/templates/` and the three dashboards into
  `vault/dashboards/`.
- Appends `.gitignore` hygiene (see [git hygiene](#what-gets-committed-vs-gitignored)).
- Offers to install the Stop hook into `.claude/settings.json`.
- **Refuses** if the repo has no `ssnc-agent-orch/` — vault-orch only makes
  sense in a repo that uses the agent-orch workflow.

### `/vault-orch:backfill`

The one-time migration that brings existing sessions into the graph. See
[Variant-B frontmatter](#variant-b-frontmatter) for the schema and guarantees.
Dry-run is the default; pass `--apply` to write. `--keys RCONAI,AITOOLS`
anchors the ticket regex to specific project keys (omit for the generic
matcher).

### `/vault-orch:intake`

Scaffolds a requirement note and hands off to the existing `team-work` skills:

```
/vault-orch:intake  ──►  vault/intake/<topic>.md   (type: requirement, status: idea, jira: [])
        │
        ▼
team-work:work-prep / team-work:work-plan          (create Jira issue(s), write keys back into jira:)
        │
        ▼
/agent-orch:make  (or /build)                       (builds it; prompt.md links back to [[intake/<topic>]])
        │
        ▼
Stop hook stamps the session → it shows up against the same ticket(s) in the
Tickets dashboard. Loop closed.
```

vault-orch deliberately does **not** call Jira itself — `team-work:work-plan`
owns the Jira write path. vault-orch scaffolds the relationship and the
thinking.

### `/vault-orch:exec-update`

Writes an exec-altitude summary **into the vault** as
`vault/exec-updates/<date>-<period>.md` — a new dated file each run, never
overwritten. Body: a KPI strip, then **Mermaid** charts (throughput
`xychart-beta`, delivery-status `pie`, epic progress), then a narrative grouped
by theme/epic, then `[[session]]` and `[[TICKET]]` wikilinks to what drove the
work. See [exec-update vs work-recap](#exec-update-vs-team-workwork-recap).

> **State nuance:** exec-update *may* embed a point-in-time Jira-status pie in
> its dated file. That's allowed — the file is an explicitly **frozen report**,
> not a living mirror, and the dated filename makes that clear. The vault's
> relationship layer still stores no Jira state.

---

## Variant-B frontmatter

`backfill` and the Stop hook stamp a small YAML header onto each
`ssnc-agent-orch/**` markdown file:

```yaml
---
type: session-plan        # PLAN.md→session-plan, STATUS.md→session-status,
                          # prompt.md→session-prompt, conventions.md→
                          # session-conventions, else session-doc
session: 2026-05-31-recon-pipeline-cob-carryforward-matching
date: 2026-05-31
jira: ["[[RCONAI-427]]", "[[RCONAI-635]]"]   # one wikilink per ticket in prose
status: in-progress       # idea|planned|in-progress|shipped — only if inferable
skill: build              # only if discoverable from prompt.md
---
```

**Why frontmatter wikilinks and not rewritten bodies?** Obsidian Properties
(v1.4+) treat a wikilink in a frontmatter property as a **real graph edge +
backlink** — identical graph payoff to inline links, but the diff is
**header-only**. Bodies are never touched.

Guarantees of the stamper (`scripts/backfill-frontmatter.mjs`):

| Guarantee | Detail |
|-----------|--------|
| **Header-only** | Frontmatter is added/merged; the body is byte-for-byte unchanged. |
| **Skips non-prose** | Ticket refs inside ``` fenced blocks, `inline code`, `[md](links)`, and bare URLs are ignored — only prose refs populate `jira`. |
| **Both layouts** | Flat `ssnc-agent-orch/YYYY-MM-DD-slug/` and date-tree `ssnc-agent-orch/YYYY/MM/DD/slug/`. |
| **Idempotent** | Existing frontmatter is merged (jira deduped, unknown keys preserved); a no-op re-run produces no diff. |
| **Generic keys** | `--keys` accepts any comma-separated project prefixes; omit for the universal `[A-Z]{2,}-\d+` matcher. |
| **Conservative** | `status` is never invented (only preserved if present); `skill` is set only when discoverable from a sibling `prompt.md`. |

Because the diff is header-only and idempotent, the whole backfill is designed
to land as **one mechanical, easily-reviewed PR**.

---

## The Stop hook — "part of Make's world"

`hooks/frontmatter-on-session.sh` runs on session `Stop`. After a `/make` or
`/build` session ends, it finds that session's `prompt.md` (which the agent-orch
skills already populate with a `## Metadata` block: Session / Started / Invoking
skill / Branch / Jira) and promotes it to frontmatter + `jira:` wikilinks on the
session's files — the same variant-B stamp `backfill` does, scoped to the
just-finished session. So the vault stays current with **zero forking** of the
agent-orch skills.

It is **opt-in** (installed by `/vault-orch:init`, or wired manually via the
plugin's `hooks/hooks.json`) and **defensive by contract** — it:

- no-ops cleanly when not in an agent-orch repo, when the vault isn't
  initialised (`.obsidian/app.json` absent), or when no session dir is found;
- only ever touches that one session's frontmatter headers;
- **never blocks or fails a session** — an `EXIT` trap forces a 0 exit code, and
  the stamper is invoked without an empty bash array (which would otherwise abort
  under `set -u` on macOS's bash 3.2).

---

## Dashboards

`/vault-orch:init` installs these Dataview notes under `vault/dashboards/`:

| Dashboard | What it shows |
|-----------|---------------|
| `sessions.md` | Every agent-orch session (newest first), in-progress sessions, sessions missing a ticket link, recent activity. |
| `tickets.md` | The **derived ticket hub** — sessions grouped by ticket (one row per edge), tickets by reference count, requirements linked to tickets. All live queries; no stored ticket notes. |
| `exec-updates.md` | Every exec-update node, newest first, plus the latest one. |
| `wiki.md` | The **team-work wiki surfaced** — wiki requirement/decision/incident/entity/concept/plan pages by type & status, plus intake notes that bridge into the wiki. Read-only; every query scoped `FROM "wiki"` so it stays distinct from vault intake notes. **Created only when a team-work wiki is in-repo.** |

These render only after the user enables the Dataview community plugin in
Obsidian.

---

## exec-update vs `team-work:work-recap`

`team-work:work-recap` already covers Jira + commits + sessions in this
marketplace. `vault-orch:exec-update` is **not** a duplicate — it differs on
every axis, and the two share `scripts/gather-activity.mjs` as a reusable gather
seam (today work-recap still uses its own inline `git log`; the seam exists so it
can converge later):

| Axis | `vault-orch:exec-update` | `team-work:work-recap` |
|------|---------------------------|------------------------|
| Audience | Execs / sponsors | PMs / engineers |
| Altitude | Themes, outcomes, KPIs, trend | Per-Jira + per-commit detail |
| Surface | Written **into the vault** as a dated graph node | Sibling-dir (`../`) artifact |
| Charts | **Mermaid** (no viewer deps) | Bluestone PPTX |
| Cadence | Weekly / schedulable | Ad-hoc catch-up |

Want a detailed PM deck? Use `work-recap`. Want a graph-native exec trend? Use
`exec-update`.

---

## Pulling in the team-work wiki

If the repo has a `team-work` LLM wiki (the OKF knowledge base created by
`/team-work:work-wiki`, `/team-work:work-ingest`, `/team-work:wiki-source`),
`/vault-orch:init` **surfaces** it into the same Obsidian graph — read-only.

**Ownership boundary.** The wiki is owned by the `team-work` skills. vault-orch
never rewrites a wiki page, stamps frontmatter on it, injects `jira:` into it,
or runs `/vault-orch:backfill` over it. It only reads and displays it.

**Detection (four cases).** `init` reads `wiki_root` from
`.team-work/wiki-config.md`:

| Case | Behaviour |
|------|-----------|
| No wiki configured | Skip; suggest `/team-work:work-wiki`. |
| In-repo at default `wiki/` | Install `vault/dashboards/wiki.md` as-is. |
| In-repo at a custom path | Install it, substituting `FROM "wiki"` → `FROM "<custom>"`. |
| Outside the repo | Skip — Obsidian, rooted at the repo root, can't index a wiki outside it. |

No `userIgnoreFilters` change is needed (no exclusion glob matches `wiki/` or
`docs/wiki/`).

**The graph bridge.** Wiki pages carry no `jira:` field, so the connection is
**graph-level**, not a shared-field join: a `/vault-orch:intake` note can link a
wiki page via its optional `wiki: ["[[requirements/<slug>]]"]` property, sharing
a node in Obsidian's graph. The `wiki.md` dashboard lists wiki pages by
type/status and the intake notes that bridge into them. Query the wiki content
directly with `/team-work:work-ask`.

---

## Weekly automation

vault-orch does **not** bake in a scheduler. To run the exec update weekly,
register a Claude Code **scheduled task** (harness), e.g. Mondays 08:00 local:

```
/vault-orch:exec-update "7 days ago" now
```

Each run writes a fresh dated file (`vault/exec-updates/<date>-weekly.md`) — a
frozen point-in-time report — and the exec-updates dashboard lists them newest
first.

---

## What gets committed vs gitignored

`/vault-orch:init` appends git hygiene so per-user and token-bearing files stay
out of git:

| Committed (shared, identical for all teammates) | Gitignored (per-user / secrets) |
|---|---|
| `.obsidian/app.json`, `core-plugins.json`, `community-plugins.json` | `.obsidian/workspace.json`, `workspace-mobile.json` |
| `vault/templates/`, `vault/dashboards/` | `.obsidian/plugins/*/data.json` (holds tokens) |
| `vault/intake/`, `vault/exec-updates/` content | `.obsidian/cache`, `*.json.bak` |

---

## Requirements

- A repo that uses agent-orch (has an `ssnc-agent-orch/` tree).
- [Obsidian](https://obsidian.md) with the **Dataview** community plugin (enabled
  by config; binary installed once by the user).
- Node.js (for the two scripts and the Stop hook).
- For `exec-update` Jira enrichment: the agent-orch MCP Jira tools
  (`/agent-orch:mcp-start` + `/agent-orch:jira`). Optional — it degrades
  gracefully to git + session data if Jira is unreachable.

## See Also

- [`plugins/vault-orch/README.md`](../plugins/vault-orch/README.md) -- the plugin's own README
- [Jira Integration Guide](JIRA_INTEGRATION.md) -- the Jira layer vault-orch references but never mirrors
- [Worktrees](WORKTREES.md) -- the `/make` worktree model that produces the sessions vault-orch indexes
- [The Team-Work Wiki](team-work-wiki.md) -- the LLM wiki vault-orch surfaces (owned by `/team-work:work-wiki` / `work-ingest` / `work-ask`)

---

[< Back to Documentation Index](README.md) | [< Back to README](../README.md)
