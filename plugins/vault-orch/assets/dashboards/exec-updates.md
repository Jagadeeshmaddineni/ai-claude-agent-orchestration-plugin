---
type: dashboard
dashboard: exec-updates
---

# 📈 Executive Updates

> Every exec-altitude summary produced by `/vault-orch:exec-update`, newest
> first. Each is a frozen, dated point-in-time report — open one to see the
> KPI strip, Mermaid charts, and the themes that drove the period.

## All updates

```dataview
TABLE WITHOUT ID
  link(file.link, file.name) AS "Update",
  period_start AS "From",
  period_end AS "To",
  generated AS "Generated"
FROM "vault/exec-updates"
WHERE type = "exec-update"
SORT period_end DESC
```

## Latest update

```dataview
TABLE WITHOUT ID
  link(file.link, file.name) AS "Most recent",
  period_start AS "From",
  period_end AS "To"
FROM "vault/exec-updates"
WHERE type = "exec-update"
SORT period_end DESC
LIMIT 1
```

---

> **Cadence:** schedule `/vault-orch:exec-update "7 days ago" now` via the
> Claude Code scheduled-tasks harness (e.g. Mondays 08:00 local). vault-orch
> does not bake in a scheduler — see the plugin README.
