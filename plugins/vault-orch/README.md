# vault-orch

Provision an [Obsidian](https://obsidian.md) vault into any repo that uses the
SS&C agent-orch workflow (`/make`, `/build`, and the `ssnc-agent-orch/`
session-artifact tree). The vault makes agent-orch markdown sessions,
business-requirement notes, and Jira tickets cross-link as a **navigable
knowledge graph**, and produces weekly executive summaries.

---

## The one principle behind everything: store relationships, never state

The vault owns two things:

1. **Immutable facts** — *which sessions and requirements reference which ticket*.
2. **The requirement thinking itself** — the intake notes.

It deliberately does **not** own Jira's mutable state (status, assignee,
sprint). Jira keeps owning that.

That means **the ticket layer is derived, not stored**:

- A ticket shows up as a **phantom graph node** the moment a session or
  requirement links it via a `jira:` frontmatter wikilink.
- The "ticket hub" is a **live Dataview query** (computed when you open the
  Tickets dashboard) plus Obsidian's backlinks pane — never a saved
  `vault/jira/RCONAI-427.md` note, and never a sync script.

There is intentionally **no per-ticket note and no Jira→markdown sync**. Both
were considered and rejected: Jira changes too often, and replicating it into
git would just be a stale mirror. The graph edge is the durable, valuable part;
the live status is one click away in Jira.

---

## The four commands

| Command | What it does |
|---------|--------------|
| `/vault-orch:init` | Provision `.obsidian/` (Dataview enabled, **`userIgnoreFilters` baked into `app.json`** for multi-GB repos), templates, Dataview dashboards (+ a wiki dashboard if a team-work wiki is in-repo), and `.gitignore` hygiene. Refuses if the repo has no `ssnc-agent-orch/`. Idempotent. |
| `/vault-orch:backfill` | Stamp **variant-B** YAML frontmatter onto existing session markdown so the graph + dashboards populate. Header-only diff, skips code/links, generic project-key regex, idempotent, **dry-run by default**. Lands as one mechanical PR. |
| `/vault-orch:intake` | Scaffold a business-requirement note (`vault/intake/<topic>.md`) that flows into `team-work:work-prep` / `work-plan` (→ Jira) and then `/make`. |
| `/vault-orch:exec-update` | Exec-altitude weekly summary written **into the vault** as a dated, Dataview-indexed, **Mermaid-charted** node. |

Plus a **Stop hook** that keeps the vault current automatically (below).

---

## Quick start

```bash
# In a repo that already uses agent-orch (/make, /build):
/vault-orch:init            # provision the vault; refuses if no ssnc-agent-orch/
/vault-orch:backfill        # dry-run: see what frontmatter it would stamp
/vault-orch:backfill --keys RCONAI --apply   # stamp for real (one mechanical PR)
```

Then, one-time, in Obsidian: open the folder as a vault → **Settings → Community
plugins → enable** → install + enable **Dataview**. (Obsidian downloads the
Dataview binary itself; it can't be shipped in git.) The three dashboards under
`vault/dashboards/` light up once Dataview is on.

```bash
/vault-orch:intake reconciliation-trigger-modal   # start a requirement
/vault-orch:exec-update "7 days ago" now           # weekly exec summary
```

---

## Variant-B frontmatter (what `backfill` and the hook stamp)

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

Why frontmatter wikilinks and not rewritten bodies? Obsidian Properties (v1.4+)
treat a wikilink in a frontmatter property as a **real graph edge + backlink** —
identical graph payoff to inline links, but the diff is **header-only**. Bodies
are never touched. Ticket refs inside fenced code, inline code, markdown links,
and URLs are skipped — only prose references count. The stamp is **idempotent**:
re-running produces no diff.

---

## The Stop hook — "part of Make's world"

`hooks/frontmatter-on-session.sh` runs on session `Stop`. After a `/make` or
`/build` session ends, it finds that session's `prompt.md` (which the agent-orch
skills already populate with a `## Metadata` block: Session / Started / Invoking
skill / Branch / Jira) and promotes it to frontmatter + `jira:` wikilinks on the
session's files — the same variant-B stamp `backfill` does, scoped to the
just-finished session. So the vault stays current with **zero forking** of the
agent-orch skills.

It is **opt-in** and **defensive by contract** — it:

- no-ops cleanly when not in an agent-orch repo, when the vault isn't
  initialised (`.obsidian/app.json` absent), or when no session dir is found;
- only ever touches that one session's frontmatter headers;
- **never blocks or fails a session** (always exits 0).

Install it via `/vault-orch:init` (offers to add it to `.claude/settings.json`),
or wire `hooks/hooks.json` at the plugin level.

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

## exec-update vs `team-work:work-recap` (deliberately different)

`team-work:work-recap` already covers Jira + commits + sessions in this
monorepo. vault-orch:exec-update is **not** a duplicate — it differs on every
axis. exec-update's data layer is factored into `scripts/gather-activity.mjs` as
a reusable seam `work-recap` can adopt later so the two stay aligned (today
work-recap still uses its own inline `git log`):

| Axis | `vault-orch:exec-update` | `team-work:work-recap` |
|------|---------------------------|------------------------|
| Audience | Execs / sponsors | PMs / engineers |
| Altitude | Themes, outcomes, KPIs, trend | Per-Jira + per-commit detail |
| Surface | Written **into the vault** as a dated graph node | Sibling-dir (`../`) artifact |
| Charts | **Mermaid** (no viewer deps) | Bluestone PPTX |
| Cadence | Weekly / schedulable | Ad-hoc catch-up |

Want a detailed PM deck? Use `work-recap`. Want a graph-native exec trend? Use
this.

> **State nuance:** exec-update *may* embed a point-in-time Jira-status pie in
> its dated file. That's fine — the file is an explicitly **frozen report**, not
> a living mirror, and the dated filename makes that clear. The vault's
> relationship layer still stores no Jira state.

---

## Pulling in the team-work wiki

If the repo also has a `team-work` LLM wiki (the OKF knowledge base created
by `/team-work:work-wiki`, `/team-work:work-ingest`, and `/team-work:wiki-source`),
vault-orch **surfaces** it into the same Obsidian graph — read-only.

**Ownership boundary (non-negotiable).** The wiki is owned by the `team-work`
skills. vault-orch only reads and displays it: it **never** rewrites a wiki
page, stamps frontmatter on it, injects `jira:` into it, or runs
`/vault-orch:backfill` over it. To add or change knowledge, use
`/team-work:work-ingest`.

**What `init` does.** It reads `wiki_root` from `.team-work/wiki-config.md` and:

| Case | Behaviour |
|------|-----------|
| No wiki configured | Skips; suggests `/team-work:work-wiki`. |
| Wiki in-repo at default `wiki/` | Installs `vault/dashboards/wiki.md` as-is. |
| Wiki in-repo at a custom path | Installs `wiki.md`, substituting `FROM "wiki"` → `FROM "<custom>"`. |
| Wiki outside the repo | Skips — Obsidian (rooted at the repo root) can't index a wiki outside it. |

No `userIgnoreFilters` change is needed — none of the exclusion globs match
`wiki/` or `docs/wiki/`, so Obsidian indexes the wiki out of the box.

**The dashboard.** `vault/dashboards/wiki.md` lists wiki pages by `type`
(requirement / decision / incident / entity / concept / plan) and `status`,
every query scoped `FROM "wiki"` so wiki `requirement` pages stay distinct from
vault-orch `intake` notes (which also use `type: requirement` but live under
`vault/intake`).

**The graph bridge.** Wiki pages don't carry a `jira:` field, so the join is
**graph-level**, not a shared-field table join: a `/vault-orch:intake` note can
link a wiki page via its optional `wiki: ["[[requirements/<slug>]]"]` property,
making the intake note and the wiki page share a node in Obsidian's graph. Those
bridged intake notes appear in the wiki dashboard's "Intake notes that bridge
into the wiki" table. To query the wiki directly, use `/team-work:work-ask`.

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

## Layout

```
plugins/vault-orch/
├── .claude-plugin/plugin.json
├── README.md                              # this file
├── skills/
│   ├── init/SKILL.md
│   ├── backfill/SKILL.md
│   ├── intake/SKILL.md
│   └── exec-update/
│       ├── SKILL.md
│       └── exec-update-reference.md        # KPI defs, Mermaid recipes, layout
├── hooks/
│   ├── hooks.json                          # Stop hook registration
│   └── frontmatter-on-session.sh           # defensive auto-stamper
├── assets/
│   ├── obsidian/{app.json,core-plugins.json,community-plugins.json}
│   ├── templates/{intake.md,exec-update.md}
│   ├── dashboards/{sessions.md,tickets.md,exec-updates.md,wiki.md}
│   └── gitignore-snippet.txt
└── scripts/
    ├── backfill-frontmatter.mjs            # idempotent variant-B stamper
    └── gather-activity.mjs                 # shared git+session+ticket gatherer
```

Both scripts are Node stdlib only (no dependencies) and read-only except for the
backfill's `--apply` writes (frontmatter headers) and exec-update's single dated
output file.

---

## Requirements

- A repo that uses agent-orch (has an `ssnc-agent-orch/` tree).
- [Obsidian](https://obsidian.md) with the **Dataview** community plugin (enabled
  by config; binary installed once by the user).
- Node.js (for the two scripts and the Stop hook).
- For `exec-update` Jira enrichment: the agent-orch MCP Jira tools
  (`/agent-orch:mcp-start` + `/agent-orch:jira`). Optional — it degrades
  gracefully to git + session data if Jira is unreachable.

## Team contact

- **Slack:** #ai-agent-orchestration
- **Email:** ai-governance@ssnc.com
