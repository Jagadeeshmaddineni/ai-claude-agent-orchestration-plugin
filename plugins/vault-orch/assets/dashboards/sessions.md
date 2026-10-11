---
type: dashboard
dashboard: sessions
---

# 🗂️ Sessions

> Every agent-orch session in this repo, newest first. Populated by
> `/vault-orch:backfill` (one-time) and kept current by the Stop hook after
> each `/make` / `/build`. Requires the **Dataview** community plugin.

## All sessions

```dataview
TABLE WITHOUT ID
  link(file.link, session) AS "Session",
  date AS "Date",
  type AS "Doc",
  jira AS "Tickets",
  status AS "Status"
FROM "ssnc-agent-orch"
WHERE type AND startswith(type, "session-")
SORT date DESC, session ASC
```

## In progress

```dataview
TABLE WITHOUT ID
  link(file.link, session) AS "Session",
  date AS "Date",
  jira AS "Tickets"
FROM "ssnc-agent-orch"
WHERE status = "in-progress"
SORT date DESC
```

## Sessions with no ticket link

> Candidates for a backfill re-run or a missing Jira reference.

```dataview
TABLE WITHOUT ID
  link(file.link, session) AS "Session",
  date AS "Date",
  type AS "Doc"
FROM "ssnc-agent-orch"
WHERE type = "session-plan" AND (!jira OR length(jira) = 0)
SORT date DESC
```

## Recent activity (last 30 days)

```dataview
TABLE WITHOUT ID
  link(file.link, session) AS "Session",
  date AS "Date",
  jira AS "Tickets"
FROM "ssnc-agent-orch"
WHERE date AND date(date) >= date(today) - dur(30 days)
SORT date DESC
```
