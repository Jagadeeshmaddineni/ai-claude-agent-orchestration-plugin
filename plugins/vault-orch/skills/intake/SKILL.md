---
name: intake
description: Scaffold a business-requirement note in the vault (vault/intake/<topic>.md) with requirement frontmatter, so non-engineers can write requirements that flow into team-work:work-prep / work-plan (which create Jira issues and write keys back), then into /make or /build. Closes the loop by linking the generated session back to the intake note. Usage: /vault-orch:intake <topic>
---

# vault-orch: intake

Scaffold a **business-requirement note** in the vault. This is the front door of
the requirement → Jira → build loop: a non-engineer writes the requirement
thinking here, and the existing `team-work` skills turn it into Jira issues and
feed `/make` / `/build`.

## Where it sits in the loop

```
/vault-orch:intake  ──►  vault/intake/<topic>.md   (type: requirement, status: idea, jira: [])
        │
        ▼
team-work:work-prep / team-work:work-plan
        │   parse the requirement note → create Jira issue(s)
        │   → write the keys back into the note's `jira:` frontmatter
        ▼
/agent-orch:make  (or /build)  ──►  builds the feature
        │   the session's prompt.md links back to  [[intake/<topic>]]
        ▼
Stop hook stamps the session → it shows up against the same ticket(s)
in the Tickets dashboard. Loop closed.
```

The vault stores the **requirement and the relationships**; Jira owns status.

## Usage

```
/vault-orch:intake reconciliation-trigger-modal
/vault-orch:intake "carry-forward matching"      # spaces → slugified topic
```

## Process

### Phase 0: Preconditions

1. Git repo + (recommended) an initialised vault. If `vault/templates/intake.md`
   is missing, suggest running `/vault-orch:init` first, but you can still
   scaffold from the plugin's shipped template at
   `${CLAUDE_PLUGIN_ROOT}/assets/templates/intake.md`.
2. Require a topic argument. If absent, ask:
   `What's the requirement about? (a short topic — becomes the note name)`

### Phase 1: Resolve the note path

1. Slugify the topic: lowercase, spaces/underscores → hyphens, strip anything
   non `[a-z0-9-]`. e.g. `"Carry-forward matching"` → `carry-forward-matching`.
2. Target: `vault/intake/<slug>.md`.
3. If it already exists, do **not** overwrite. Offer to open it or pick a new
   topic.

### Phase 2: Create from template

1. Read the template (`vault/templates/intake.md`, else the shipped asset).
2. Substitute placeholders:
   - `{{title}}` → a human-readable title (Title Case of the topic)
   - `{{date:YYYY-MM-DD}}` → today (`date +%Y-%m-%d`)
3. Ensure the frontmatter is exactly:
   ```yaml
   type: requirement
   status: idea
   jira: []
   wiki: []
   created: <today>
   owner:
   ```
4. Write to `vault/intake/<slug>.md`.

### Phase 3: Offer to fill it in

The note has sections for Problem, Desired Outcome, Scope, Acceptance Criteria,
Open Questions. Offer to interview the user to draft these now, or leave it for
them to fill in. Keep it business-level — do not prescribe implementation.

### Phase 3.5: Link a wiki page (optional graph bridge)

If a team-work wiki exists (`.team-work/wiki-config.md` present), offer to link
an existing wiki requirement/decision/entity page that covers this topic:

1. Optionally search the wiki (or run `/team-work:work-ask`) for a matching page.
2. If the user picks one, add its wikilink to **both** the `wiki:` frontmatter
   property (e.g. `wiki: ["[[requirements/<slug>]]"]`) and the "Related wiki
   knowledge" section of the note.

This is the explicit graph bridge between the intake note and the team-work
wiki: the wikilink makes them share a node in Obsidian's graph, and the intake
note surfaces in the wiki dashboard's "Intake notes that bridge into the wiki"
table. **vault-orch never edits the wiki page itself** — it only links to it.
Skip this phase silently if no wiki is configured.

### Phase 4: Hand off

Tell the user the path and the next step:

```
Created requirement note: vault/intake/<slug>.md  (type: requirement, status: idea)

Next in the loop:
  • team-work:work-prep / team-work:work-plan
      → turns this into Jira issue(s) and writes the keys back into the
        `jira:` property here (then set status: planned).
  • /agent-orch:make  (or /build)
      → builds it; the session links back to [[intake/<slug>]] and the
        Stop hook stamps the session against the same ticket(s).

Open it in Obsidian to flesh out the Problem / Outcome / Acceptance Criteria.
```

## Notes

- `team-work:work-plan` is the component that creates Jira issues and writes keys
  back — `intake` deliberately does **not** call Jira itself. This keeps a clean
  separation: vault-orch scaffolds the relationship/thinking; team-work owns the
  Jira write path.
- Once `jira:` is populated with `["[[KEY-NNN]]"]`, the note becomes a node in
  the graph and appears in the Tickets dashboard's "Requirements linked to
  tickets" query automatically — no per-ticket note needed.
- When you later run `/make` against this requirement, reference the note path so
  the generated `prompt.md` records `[[intake/<slug>]]` and closes the loop.
- The optional `wiki:` link is a **graph-level** bridge, not a `jira:`-style
  field join: team-work wiki pages don't carry a `jira:` property, so the
  connection is a shared Obsidian graph node (the `[[requirements/<slug>]]`
  wikilink), surfaced in the wiki dashboard. Linking is read-only — the wiki
  stays owned by the `team-work` skills.
