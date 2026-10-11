---
type: dashboard
dashboard: wiki
---

# 📚 Team-Work Wiki (surfaced)

> **The wiki is owned by the `team-work` skills — vault-orch only surfaces it.**
> The team-work LLM wiki lives under `wiki/` in this repo and is created and
> maintained by `/team-work:work-wiki`, `/team-work:work-ingest`, and
> `/team-work:wiki-source`. vault-orch **reads and displays** it here; it never
> rewrites a wiki page, stamps frontmatter on it, injects `jira:` into it, or
> runs `/vault-orch:backfill` over it. To add or change knowledge, use
> `/team-work:work-ingest`.
>
> Every query below is scoped `FROM "wiki"` so the wiki's `requirement` pages
> stay distinct from vault-orch `intake` notes (which also use
> `type: requirement` but live under `vault/intake`). Requires the **Dataview**
> community plugin.

## Requirements

```dataview
TABLE WITHOUT ID
  link(file.link, title) AS "Requirement",
  status AS "Status",
  tags AS "Tags",
  updated AS "Updated"
FROM "wiki"
WHERE type = "requirement"
SORT status ASC, updated DESC
```

## Decisions

```dataview
TABLE WITHOUT ID
  link(file.link, title) AS "Decision",
  status AS "Status",
  updated AS "Updated"
FROM "wiki"
WHERE type = "decision"
SORT updated DESC
```

## Incidents

```dataview
TABLE WITHOUT ID
  link(file.link, title) AS "Incident",
  status AS "Status",
  updated AS "Updated"
FROM "wiki"
WHERE type = "incident"
SORT updated DESC
```

## Entities & Concepts

```dataview
TABLE WITHOUT ID
  link(file.link, title) AS "Page",
  type AS "Type",
  status AS "Status"
FROM "wiki"
WHERE type = "entity" OR type = "concept"
SORT type ASC, title ASC
```

## Plans

```dataview
TABLE WITHOUT ID
  link(file.link, title) AS "Plan",
  status AS "Status",
  updated AS "Updated"
FROM "wiki"
WHERE type = "plan"
SORT updated DESC
```

## Wiki coverage (catalog cross-check)

> One row per page type — a quick "what does the wiki cover" view, computed live.

```dataview
TABLE WITHOUT ID
  type AS "Type",
  length(rows) AS "Pages"
FROM "wiki"
WHERE type AND type != "dashboard"
GROUP BY type
SORT length(rows) DESC
```

## Intake notes that bridge into the wiki

> vault-orch `intake` notes that link a wiki page via their `wiki:` property —
> the explicit hinge between the agent-orch graph (sessions ↔ tickets ↔ intake)
> and the wiki graph. See `/vault-orch:intake`.

```dataview
TABLE WITHOUT ID
  link(file.link, file.name) AS "Intake note",
  wiki AS "Linked wiki pages",
  jira AS "Tickets"
FROM "vault/intake"
WHERE wiki AND length(wiki) > 0
SORT file.name ASC
```

---

## Where the wiki and the agent-orch graph meet

Wiki pages don't carry a `jira:` property, so there is **no shared-field table
join** between wiki pages and tickets — the bridge is the **graph**:

1. A `/vault-orch:intake` note can link a wiki requirement page via a
   `[[requirements/<slug>]]` wikilink in its `wiki:` property (see the
   "Intake notes that bridge into the wiki" table above). That makes the intake
   note and the wiki page the **same neighbourhood** in Graph view.
2. Any `[[RCONAI-NNN]]` ticket node referenced from both a session and (if a
   wiki page happens to mention it in prose) the wiki is the **same phantom
   node** — open its **Backlinks** pane to see both layers at once.
3. Open the **Graph view** and filter to `path:wiki` + `path:ssnc-agent-orch`
   to see the two knowledge layers side by side.

> Want to ask the wiki a question directly? Use `/team-work:work-ask` — it runs
> hybrid search over the wiki and returns a cited answer.
