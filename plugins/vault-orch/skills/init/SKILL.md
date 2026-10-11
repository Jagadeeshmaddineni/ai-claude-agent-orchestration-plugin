---
name: init
description: Provision an Obsidian vault into an agent-orch repo so sessions, requirements, and Jira tickets cross-link as a navigable knowledge graph. Copies .obsidian/ config (with userIgnoreFilters baked in for large repos), enables Dataview, installs templates + 3 dashboards, and appends git hygiene. Idempotent; refuses if the repo has no ssnc-agent-orch/. Usage: /vault-orch:init
---

# vault-orch: init

Provision an Obsidian vault over the current agent-orch repo. After this runs,
agent-orch markdown sessions, business-requirement intake notes, and Jira
tickets all cross-link as a navigable graph, and the three Dataview dashboards
light up. **Idempotent** — safe to re-run; it only fills gaps.

## Guiding principle

**Store the relationships, never the state.** This vault stores immutable facts
(which sessions/requirements reference ticket X) and the requirement thinking —
never Jira's mutable status. The ticket layer is *derived*: a phantom graph node
plus a live Dataview query, never a saved per-ticket note. Keep this in mind for
everything below.

## Prerequisite (hard gate)

This skill **refuses to run** if the repo has no `ssnc-agent-orch/` directory —
vault-orch only makes sense in a repo that uses the agent-orch `/make` / `/build`
workflow. If it's missing, stop and tell the user:

```
This repo has no ssnc-agent-orch/ directory, so there are no agent-orch
sessions to build a vault over. Run a /agent-orch:build session first, or
run vault-orch:init in a repo that already uses agent-orch.
```

## Process

### Phase 0: Preconditions

1. Confirm a git repo: `git rev-parse --show-toplevel`. Capture as `REPO_ROOT`.
2. **Gate:** `test -d "$REPO_ROOT/ssnc-agent-orch"`. If absent, refuse (message above).
3. Resolve the plugin asset dir: `${CLAUDE_PLUGIN_ROOT}/assets`.
4. Note whether `.obsidian/` already exists (re-run vs first-run) so messaging is accurate.

### Phase 0.5: Detect a team-work wiki (optional, read-only)

vault-orch can **surface** a team-work LLM wiki if one exists in this repo (it
is created/owned by `/team-work:work-wiki` and friends). This detection is
purely additive — it never blocks init, and vault-orch never modifies the wiki.

Read the wiki root from team-work's config:

```bash
WIKI_ROOT=""
if [ -f "$REPO_ROOT/.team-work/wiki-config.md" ]; then
  WIKI_ROOT="$(grep -E '^wiki_root:' "$REPO_ROOT/.team-work/wiki-config.md" \
    | head -1 | sed 's/^wiki_root:[[:space:]]*//' | tr -d '[:space:]')"
fi
```

Classify into `WIKI_HAS` (this drives Phase 3.5):

| Condition | `WIKI_HAS` | `WIKI_REL` |
|-----------|-----------|-----------|
| No `.team-work/wiki-config.md`, or `wiki_root` empty | `none` | — |
| `wiki_root` resolves **inside** `REPO_ROOT` and that dir exists | `in-repo` | the path relative to `REPO_ROOT` (e.g. `wiki` or `docs/knowledge`) |
| `wiki_root` is absolute-outside-repo or starts with `../` | `external` | — |

**In-repo vs external heuristic:** treat `wiki_root` as relative-to-repo unless
it is absolute (starts with `/`) or contains `../`. For an absolute path,
compare against `$REPO_ROOT` — if it is a prefix, it's `in-repo` with
`WIKI_REL` = the remainder; otherwise `external`. Obsidian is rooted at the
repo root, so it can only index a wiki that lives **inside** the repo — an
external/sibling wiki is detected but cannot be surfaced as a dashboard.

> **No `userIgnoreFilters` change is needed.** None of the globs in
> `app.json` (`node_modules/`, `**/node_modules/`, `.next/`, `dist/`, `build/`,
> `coverage/`, `out/`, `target/`, `.venv/`, `.turbo/`, `.git/`) match `wiki/`
> or `docs/wiki/`, so Obsidian indexes the wiki out of the box.

### Phase 1: Obsidian config (the large-repo prerequisite)

Copy the shipped config into `$REPO_ROOT/.obsidian/`, creating the dir if needed:

- `assets/obsidian/app.json` → `.obsidian/app.json`
- `assets/obsidian/core-plugins.json` → `.obsidian/core-plugins.json`
- `assets/obsidian/community-plugins.json` → `.obsidian/community-plugins.json`

**Why `app.json` matters most.** It ships `userIgnoreFilters` excluding
`node_modules/`, `**/node_modules/`, `.next/`, `dist/`, `build/`, `coverage/`
(and more). This is the **hard prerequisite**: target repos can be multi-GB, and
without these exclusions Obsidian's file watcher indexes every dependency file
and thrashes (the recon-ai repo that motivated this is ~5.9 GB). Never write an
`app.json` without `userIgnoreFilters`.

**Idempotency rule:** if `.obsidian/app.json` already exists, do **not** clobber a
user-customised file. Instead read it, and if `userIgnoreFilters` is missing or
is missing any of the required entries, merge the required entries in and write
back. Leave any extra user filters intact. For `core-plugins.json` /
`community-plugins.json`, merge so `dataview` is present in community plugins
without dropping anything the user added.

### Phase 2: Dataview

`community-plugins.json` lists `dataview`, which tells Obsidian the plugin is
*enabled*. Obsidian still has to *download the plugin binary* on first open —
that cannot be shipped in git. Tell the user clearly (see final message).

### Phase 3: Templates + dashboards

Create the vault content dirs under `$REPO_ROOT/vault/` and copy:

- `assets/templates/intake.md` → `vault/templates/intake.md`
- `assets/templates/exec-update.md` → `vault/templates/exec-update.md`
- `assets/dashboards/sessions.md` → `vault/dashboards/sessions.md`
- `assets/dashboards/tickets.md` → `vault/dashboards/tickets.md`
- `assets/dashboards/exec-updates.md` → `vault/dashboards/exec-updates.md`

Also create empty `vault/intake/` and `vault/exec-updates/` dirs (drop a
`.gitkeep` in each) so the dashboards' `FROM "vault/intake"` /
`FROM "vault/exec-updates"` sources resolve. **Idempotent:** never overwrite an
existing dashboard/template the user may have edited — skip with a note.

### Phase 3.5: Wiki dashboard (conditional on Phase 0.5)

Surface a team-work wiki **only when one is in-repo** (`WIKI_HAS=in-repo`):

- **`WIKI_HAS=in-repo`:** copy `assets/dashboards/wiki.md` →
  `vault/dashboards/wiki.md`. If `WIKI_REL` is not `wiki`, substitute the folder
  token on the **copied file only** (never the shipped asset):
  ```bash
  # only when WIKI_REL != "wiki"
  sed -i '' "s#FROM \"wiki\"#FROM \"$WIKI_REL\"#g" "$REPO_ROOT/vault/dashboards/wiki.md"
  ```
  (Use the portable form on Linux: `sed -i "s#...#...#g"`.) The dashboard's
  queries are all scoped `FROM "wiki"` precisely so this single substitution
  re-points every query at a custom root.
  **Idempotent:** if `vault/dashboards/wiki.md` already exists, do NOT
  overwrite (the user may have edited it) — skip with a note.

- **`WIKI_HAS=none`:** skip. Note: *"No team-work wiki detected
  (`.team-work/wiki-config.md` absent or empty) — skipping the wiki dashboard.
  Run `/team-work:work-wiki` to create one, then re-run `/vault-orch:init`."*

- **`WIKI_HAS=external`:** skip. Note: *"A team-work wiki is configured at
  `<wiki_root>`, which is outside this repo. Obsidian is rooted at the repo root
  and can only index a wiki that lives inside it, so no wiki dashboard was
  created. Move the wiki in-repo (or browse it separately) to surface it here."*

vault-orch never writes into the wiki, never stamps wiki frontmatter, and never
runs `/vault-orch:backfill` over it — the dashboard is a read-only query surface.

### Phase 4: git hygiene

Append the contents of `assets/gitignore-snippet.txt` to `$REPO_ROOT/.gitignore`,
but only the lines not already present (idempotent — never duplicate a line).
This gitignores per-user UI state and per-plugin tokens:

- `.obsidian/workspace.json`, `.obsidian/workspace-mobile.json`
- `.obsidian/plugins/*/data.json` (holds tokens — must never be committed)

The shared config you copied in Phase 1 (`app.json`, `core-plugins.json`,
`community-plugins.json`) and everything under `vault/` **stays committed** so
the vault provisions identically for every teammate.

> **Permission note:** modifying `.gitignore` is fine, but do not `git add`,
> commit, or push as part of this skill unless the user explicitly asks. Leave
> the changes in the working tree for the user (or `/agent-orch:make`) to commit.

### Phase 5: Stop hook (opt-in)

Offer to install the Stop hook that auto-promotes each finished `/make` /
`/build` session's `prompt.md` metadata into frontmatter (so the vault stays
current with no manual backfill). It is **opt-in**. Ask:

```
Install the vault-orch Stop hook? It stamps frontmatter on each finished
agent-orch session automatically (defensive — never blocks a session).
(a) Yes — add it to .claude/settings.json
(b) No — I'll run /vault-orch:backfill manually
```

If yes, add a `Stop` hook entry pointing at
`${CLAUDE_PLUGIN_ROOT}/hooks/frontmatter-on-session.sh` to the repo's
`.claude/settings.json` (merge into any existing hooks; don't clobber). The hook
also ships in `hooks/hooks.json` for plugin-level installation.

### Phase 6: Report

Tell the user exactly what changed and the manual steps that remain:

```
vault-orch initialised in <REPO_ROOT>.

Created / updated:
  .obsidian/app.json              (userIgnoreFilters baked in — large-repo safe)
  .obsidian/core-plugins.json
  .obsidian/community-plugins.json (Dataview enabled)
  vault/templates/{intake,exec-update}.md
  vault/dashboards/{sessions,tickets,exec-updates}.md
  [vault/dashboards/wiki.md        (surfaces the in-repo team-work wiki, read-only) — if one was detected]
  vault/intake/  vault/exec-updates/   (.gitkeep)
  .gitignore                      (+ Obsidian per-user/state hygiene)
  [.claude/settings.json          (Stop hook) — if you chose to install it]

[Wiki line, pick the one that applies:]
  team-work wiki: surfaced at vault/dashboards/wiki.md (root: <WIKI_REL>)
  team-work wiki: none detected — run /team-work:work-wiki to create one
  team-work wiki: configured outside the repo (<wiki_root>) — can't be indexed by Obsidian

Manual steps (one-time, can't be shipped in git):
  1. Open this folder as a vault in Obsidian.
  2. Settings → Community plugins → turn ON community plugins.
  3. Install + enable "Dataview" (browse → Dataview → Install → Enable).
     The dashboards under vault/dashboards/ render once Dataview is on.

Next:
  • /vault-orch:backfill   — stamp existing sessions so dashboards populate
  • /vault-orch:intake     — start a business-requirement note
  • /vault-orch:exec-update — weekly exec summary into the vault
```

## Idempotency summary

| Artifact | Re-run behaviour |
|----------|------------------|
| `.obsidian/app.json` | Merge missing `userIgnoreFilters`; keep user edits |
| `community-plugins.json` | Ensure `dataview` present; keep extras |
| dashboards / templates | Skip if present (never clobber user edits) |
| `vault/dashboards/wiki.md` | Created only when a team-work wiki is in-repo; skip if present |
| `.gitignore` | Append only missing lines |
| Stop hook | Add only if absent |

## Notes

- This skill writes files but does **not** commit. Pair it with
  `/agent-orch:make` or commit manually.
- It never touches files under `ssnc-agent-orch/` — that's `/vault-orch:backfill`'s job.
