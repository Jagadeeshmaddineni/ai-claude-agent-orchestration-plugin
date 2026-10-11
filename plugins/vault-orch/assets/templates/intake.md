---
type: requirement
status: idea
jira: []
wiki: []
created: {{date:YYYY-MM-DD}}
owner:
---

# {{title}}

> **Business requirement intake.** Write the *thinking* here — the problem, who
> it's for, and what "done" looks like. This note is the durable home for the
> requirement. When it's ready, `team-work:work-prep` / `team-work:work-plan`
> turn it into Jira issues and write the keys back into the `jira:` property
> above; `/make` then builds against it and links its session back to this note.
>
> Keep Jira *state* (status, sprint, assignee) in Jira. This note stores the
> relationship and the rationale, not the live status.

## Problem / Opportunity

_What's broken or missing today? Why does it matter, and to whom?_

## Desired Outcome

_What does success look like in business terms? Avoid prescribing implementation._

## Scope

- **In scope:**
  -
- **Out of scope (for now):**
  -

## Acceptance Criteria

_Bullet the conditions that must be true for this to be considered done._

- [ ]
- [ ]

## Open Questions

-

## Notes & Context

_Links to discussions, screenshots, related requirements (`[[other-intake]]`)._

## Related wiki knowledge

_If the team-work wiki already has a requirement/decision/entity page on this
topic, link it here so this intake note and the wiki page share a graph node.
Add the same link to the `wiki:` property above (e.g.
`wiki: ["[[requirements/multi-currency-invoicing]]"]`). The wiki is owned by
`team-work` — link to its pages, don't edit them._

-

---

### Lifecycle

| Stage | How it advances |
|-------|-----------------|
| `idea` | You're still shaping the requirement here. |
| `planned` | `team-work:work-plan` created Jira issue(s); keys are in `jira:` above. |
| `in-progress` | `/make` or `/build` is implementing; the session links back to `[[{{title}}]]`. |
| `shipped` | Work merged. Jira owns the authoritative status — check the Tickets dashboard. |

> After `work-plan` runs, set `status: planned` and confirm the `jira:` list is
> populated (e.g. `jira: ["[[RCONAI-427]]"]`). The wikilink makes this note and
> the ticket share a graph edge, so the Tickets dashboard and the ticket's
> backlinks pane will surface this requirement automatically.
