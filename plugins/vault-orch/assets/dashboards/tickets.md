---
type: dashboard
dashboard: tickets
---

# 🎫 Tickets (derived hub)

> **This is the ticket layer — and nothing here is stored.** There are no
> per-ticket notes in this vault. Each Jira key is a *phantom graph node*
> created by `jira:` wikilinks in session/requirement frontmatter, and the
> tables below are *live Dataview queries* computed when you open this note.
>
> Jira still owns mutable state (status, assignee, sprint). The vault owns the
> **relationship**: which sessions and requirements reference each ticket. For
> live status, click through to Jira, or install the optional Jira community
> plugin for inline status chips (per-user token, stores nothing in git).

## Sessions grouped by ticket

> One row per (ticket → session) edge. The ticket "node" is the `jira` wikilink;
> Obsidian's graph + the backlinks pane on any phantom `RCONAI-NNN` node give
> you the same hub view interactively.

```dataview
TABLE WITHOUT ID
  ticket AS "Ticket",
  link(file.link, session) AS "Session",
  date AS "Date",
  status AS "Session status"
FROM "ssnc-agent-orch"
FLATTEN jira AS ticket
WHERE ticket
SORT ticket DESC, date DESC
```

## Tickets by reference count

> How many session docs touch each ticket — a cheap "where did the work land"
> view, computed live. Still no stored ticket state.

```dataview
TABLE WITHOUT ID
  ticket AS "Ticket",
  length(rows) AS "Docs referencing"
FROM "ssnc-agent-orch"
FLATTEN jira AS ticket
WHERE ticket
GROUP BY ticket
SORT length(rows) DESC
```

## Requirements linked to tickets

> Intake notes whose `work-plan` run wrote Jira keys back into `jira:`.

```dataview
TABLE WITHOUT ID
  link(file.link, file.name) AS "Requirement",
  status AS "Status",
  jira AS "Tickets"
FROM "vault/intake"
WHERE type = "requirement" AND jira AND length(jira) > 0
SORT status ASC, file.name ASC
```

## How to read a single ticket's hub

1. Open the **Graph view** — every `RCONAI-NNN` is a node; its neighbours are
   the docs that reference it.
2. Or click any ticket wikilink, then open the **Backlinks** pane: every
   session/requirement that links it is listed. That *is* the ticket hub — no
   note needed.
3. For live status, follow the ticket to Jira (or use the optional Jira plugin).
