---
name: work-upgrade
description: Upgrade an existing team-work wiki to the current conventions so the other wiki skills run cleanly against it. Migrates index.md → README.md (preserving git history), rewrites Obsidian [[wikilinks]] into standard relative markdown links that render and navigate on GitHub and Obsidian, verifies every link resolves (reporting broken vs. dangling), refreshes the wiki CLAUDE.md schema, and runs an Open Knowledge Format (OKF v0.1) conformance pass — backfills a required `type` into every concept page's frontmatter, generates per-directory OKF index.md navigation files, adds okf_version to the bundle-root index.md, and reports a conformance summary. Idempotent and safe to re-run. Usage: /team-work:work-upgrade [--wiki <path>] [--dry-run]
---

# Work Upgrade: Migrate an Existing Wiki to Current Conventions

A maintenance/migration pass for wikis created by an earlier `/team-work:work-wiki`. Older wikis used `index.md` as the catalog and Obsidian-style `[[wikilinks]]` for cross-references — neither of which renders or navigates in the GitHub UI (the links show up as literal `[[...]]` text). `/work-upgrade` brings such a wiki up to the current convention: `README.md` as the catalog (so GitHub shows it as the directory landing page) and **standard relative markdown links** everywhere (so navigation works on GitHub *and* in Obsidian).

Run it once against an existing wiki. It is **idempotent** — re-running on an already-upgraded wiki finds nothing to do and reports clean. After upgrading, `/work-ingest`, `/work-ask`, and `/work-lint` all operate against the new structure without surprises.

It also brings the wiki up to **Open Knowledge Format (OKF v0.1)** conformance
(see [OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)):
every concept page gets a required `type`, each directory gets an OKF `index.md`
navigation file, and the bundle root declares `okf_version`.

> **Two different `index.md` roles — don't confuse them.** Older wikis used
> `index.md` as the *catalog* (the thing GitHub didn't render); Phase 2 migrates
> that to `README.md`. OKF's `index.md` is a *per-directory navigation* file with
> a different job, generated fresh in the OKF pass (Phase 5.5). So this skill
> first moves the legacy catalog out of `index.md`, then later creates new,
> spec-shaped `index.md` nav files. The migration and the OKF generation never
> fight over the same file because they run in that order.

## Key Principles

1. **Idempotent and safe.** Re-running never double-converts. A wiki already on `README.md` + relative links is reported clean. Pass `--dry-run` to preview every change without writing.
2. **Preserve git history.** `index.md` → `README.md` uses `git mv` so the file's history follows it.
3. **Convert, don't lose.** Every `[[wikilink]]` becomes the equivalent relative markdown link. Links whose target can't be resolved are still rewritten to a best-effort relative path **and** reported, so nothing silently vanishes.
4. **Verify after rewriting.** The upgrade ends with a link-integrity pass: every relative link is resolved against disk and classified as OK, broken (target missing but a near-match exists), or dangling (intentional TODO page that was never created).
5. **Honor the repo's commit mode.** Commit locally or open a PR per `ingest_mode` in `.team-work/wiki-config.md`, exactly like `/work-ingest`.
6. **OKF conformance is part of "current conventions."** Bringing a wiki up to date now includes making it a conformant OKF v0.1 bundle: a `type` on every concept page, an `index.md` nav file per directory, and `okf_version` at the bundle root. This pass is additive and idempotent — it never rewrites page bodies, only backfills missing frontmatter keys and generates missing nav files.

## Prerequisites

- A wiki must exist with a `.team-work/wiki-config.md` (or pass `--wiki <path>`). If neither, point the user at `/team-work:work-wiki`.
- Must be in a git repository (for `git mv` and commit).
- `gh` CLI authenticated **only if** `ingest_mode: pr`.

## Phase Map (what the user sees)

`/work-upgrade` has 7 phases. Print a banner at the start of each:

```
═══════════════════════════════════════════════════════
/work-upgrade phase <N>/7: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name                  | What happens                                                       |
|---|-----------------------------|--------------------------------------------------------------------|
| 1 | Resolve wiki + assess       | Find wiki root; detect what's out of date (incl. OKF gaps); report the plan |
| 2 | Migrate index.md → README.md| `git mv` the catalog; rewrite its internal links                   |
| 3 | Rewrite links in all pages  | `[[wikilinks]]` → relative markdown links across every page        |
| 4 | Verify link integrity       | Resolve every link on disk; classify OK / broken / dangling        |
| 5 | Refresh schema + config     | Update wiki `CLAUDE.md` to current schema; touch config/log        |
| 5.5 | OKF conformance pass      | Backfill `type` frontmatter; generate per-dir `index.md`; add root `okf_version`; report conformance |
| 6 | Commit (pr or local) + summary | Honor ingest_mode; report what changed and any leftover issues  |

## Process

### Phase 1: Resolve Wiki and Assess

**Goal**: Find the wiki and decide what (if anything) needs upgrading.

1. **Resolve the wiki root**: `--wiki <path>` → `wiki_root` in `.team-work/wiki-config.md` → ask. If no config and no argument:
   ```
   No wiki found. If you haven't created one yet, run /team-work:work-wiki.
   Otherwise tell me the wiki path with --wiki <path>.
   ```

2. **Assess the wiki against current conventions.** Detect each of:
   - **Catalog file**: does `index.md` exist? does `README.md` exist? (both, neither, or one)
   - **Legacy links**: count `[[wikilink]]` occurrences across all `.md` pages (excluding the immutable `sources/` tree — see note below).
   - **Schema drift**: does the wiki's `CLAUDE.md` still describe `index.md` / `[[wikilinks]]`?
   - **OKF gaps** (for the Phase 5.5 pass):
     - concept pages (non-`sources/`, non-reserved `.md`) **missing a `type`** in frontmatter, or missing frontmatter entirely;
     - directories with concept pages but **no `index.md`** nav file;
     - bundle-root `index.md` **missing `okf_version`**.

   ```bash
   # Catalog — distinguish a legacy CATALOG index.md (has section headings like
   # "## Requirements", lists many pages) from an OKF NAV index.md (per-dir,
   # short listing). Only a root-level catalog index.md needs migrating.
   ls "${WIKI_ROOT}/index.md" "${WIKI_ROOT}/README.md" 2>/dev/null
   # Legacy wikilinks (page bodies, not sources/)
   grep -rIn --include='*.md' -e '\[\[' "${WIKI_ROOT}" | grep -v "/sources/" | wc -l
   # OKF: concept pages lacking a `type:` in their first frontmatter block
   #   (scan requirements/ entities/ concepts/ decisions/ incidents/ plans/)
   # OKF: directories missing an index.md
   for d in requirements entities concepts decisions incidents plans; do
     [ -d "${WIKI_ROOT}/$d" ] && [ ! -f "${WIKI_ROOT}/$d/index.md" ] && echo "missing index.md: $d"
   done
   # OKF: root index.md missing okf_version
   grep -q 'okf_version' "${WIKI_ROOT}/index.md" 2>/dev/null || echo "root index.md missing okf_version"
   ```

3. **Report the plan and confirm** (skip the prompt if `--dry-run` — just print the plan):
   ```
   Wiki: <WIKI_ROOT>
   Assessment:
     - Catalog: index.md present, README.md missing  → will migrate
     - Legacy [[wikilinks]]: 37 across 12 pages       → will rewrite to relative links
     - CLAUDE.md schema: references index.md           → will refresh
     - OKF: 9 pages missing `type`, 6 dirs missing index.md, root lacks okf_version → will make conformant

   This will: git mv index.md → README.md, rewrite links in 13 files, refresh
   CLAUDE.md, and run the OKF conformance pass (backfill type, generate index.md, add okf_version).
   Proceed? (a) Yes  (b) Dry-run first  (c) Cancel
   ```

   **If the wiki is already current** (README.md present, no legacy catalog `index.md`, zero `[[wikilinks]]`, schema current, AND OKF-conformant — every concept typed, per-dir `index.md` present, root `okf_version` set):
   ```
   Wiki is already on the current convention (README.md + relative links + OKF v0.1 conformant). Nothing to upgrade.
   ```
   Stop here.

> **Note — `sources/` is immutable.** Never rewrite links inside `sources/`. Those
> files are the verbatim audit trail. They may contain `[[ ]]` as part of the
> original captured text; leave them exactly as-is. All rewriting in this skill
> targets only generated pages (`requirements/`, `entities/`, `concepts/`,
> `decisions/`, `incidents/`, `plans/`) and the catalog.

### Phase 2: Migrate index.md → README.md

**Goal**: Make the catalog GitHub's landing page, preserving history.

1. **If `index.md` exists and `README.md` does not:**
   ```bash
   git -C "${WIKI_ROOT}" mv index.md README.md
   ```
   (If the wiki root isn't a git repo subdir that supports `-C`, run `git mv` from the repo root with full paths.)

2. **If both `index.md` and `README.md` exist** (rare — someone created a README later): present the conflict, don't clobber:
   ```
   Both index.md and README.md exist. Which is the real catalog?
   (a) README.md is canonical — archive index.md to sources/misc/ and keep README.md
   (b) index.md is canonical — merge its entries into README.md, then remove index.md
   (c) Let me look and decide manually
   ```

3. **If only `README.md` exists**: nothing to migrate; continue.

4. **Update the catalog's own heading/intro** if it still says "Wiki Index" or references itself as `index.md`. The catalog's link entries are rewritten in Phase 3 like any other page.

### Phase 3: Rewrite Links in All Pages

**Goal**: Convert every `[[wikilink]]` to a standard relative markdown link.

For each generated page and the catalog (NOT `sources/`):

1. **Find every `[[...]]`.** Wikilinks come in a few shapes:
   - `[[entities/acme-corp]]` — path is **relative to the wiki root**, no extension.
   - `[[entities/acme-corp|Acme Corp]]` — Obsidian alias form (`|` separates target and display text).
   - `[[acme-corp]]` — bare page name (Obsidian resolves by basename anywhere in the vault).

2. **Resolve the target to a wiki-root-relative `.md` path:**
   - For `path/name` forms: target is `<path>/<name>.md` under the wiki root.
   - For bare-name forms: search the wiki for a page whose basename matches (`<name>.md`). If exactly one match, use it. If multiple, pick by closest directory or ask; if none, treat as **dangling** (keep a best-effort path `<name>.md` next to the current page) and record it for Phase 4.

3. **Compute the link relative to the page being edited**, then replace:
   - Determine the linking page's directory relative to the wiki root.
   - Build the relative path from that directory to the target `.md` (correct number of `../` hops).
   - Display text: the alias if one was given (`|Acme Corp`), else a humanized version of the page basename (`acme-corp` → "Acme Corp"), else the path.
   - Replacement: `[<display text>](<relative-path-with-.md>)`

   Examples (linking page → wikilink → result):
   ```
   requirements/billing.md : [[entities/acme-corp]]            → [Acme Corp](../entities/acme-corp.md)
   requirements/billing.md : [[entities/acme-corp|Acme]]       → [Acme](../entities/acme-corp.md)
   README.md               : [[requirements/billing]]          → [billing](requirements/billing.md)
   entities/acme-corp.md   : [[requirements/billing|Billing]]  → [Billing](../requirements/billing.md)
   ```

4. **Citation blocks** (`> Source: [[sources/...]] — speaker, ts`) are rewritten the same way — the `sources/` *target* path stays, only the link **syntax** changes (we're editing the citing page, not the source file):
   ```
   > Source: [[sources/transcripts/acme/2026-06-04-...]] — Maria, 00:42
   →
   > Source: [Acme call, 2026-06-04](../sources/transcripts/acme/2026-06-04-...md) — Maria, 00:42
   ```
   (Add the `.md` extension; pick human link text from the source's date/title.)

5. **Idempotency**: if a link is already a standard markdown link (`[x](y.md)`), leave it untouched. Only `[[ ]]` forms are converted.

6. **`--dry-run`**: print a per-file diff summary (counts + a few example conversions) and make no writes.

### Phase 4: Verify Link Integrity

**Goal**: Confirm the rewrite produced links that actually resolve, and surface anything that doesn't.

1. For every relative markdown link in every generated page and the catalog, resolve the target against disk relative to the linking page's directory.

2. Classify each:
   - **OK** — target file exists.
   - **Broken** — target missing, but a near-match page exists (e.g. linked `entities/acme.md`, found `entities/acme-corp.md`). Offer to fix the path.
   - **Dangling** — target missing and intentionally not yet created (a TODO page). List it; don't invent it.

3. Also re-scan for any **leftover `[[wikilinks]]`** outside `sources/` (there should be none after Phase 3) and any **lingering `index.md`** references in page text.

4. Report:
   ```
   Link integrity after upgrade:
     OK: 41
     Broken (target missing, near-match found): 2
       - requirements/billing.md → ../entities/acme.md  (did you mean entities/acme-corp.md?)
     Dangling (TODO pages not yet created): 3
       - entities/billing-service.md → ../requirements/audit-logging.md
     Leftover [[wikilinks]]: 0
   ```
   With `--fix` or on confirmation, repair the unambiguous **broken** links. Leave dangling links (they're intentional TODOs) and never fabricate target pages.

### Phase 5: Refresh Schema + Config

**Goal**: Make the wiki's own operating manual match the new conventions.

1. **Refresh the wiki `CLAUDE.md`**: update its "Directory layout", "Page conventions", and "three operations" sections so they describe `README.md` as the catalog, OKF `index.md` as per-directory navigation, OKF-conformant frontmatter (required `type`), and relative markdown links (not `[[wikilinks]]`). Add the OKF Conformance section if missing. Preserve any human-authored sections — only update the convention text. If the file has a `## Schema upgrades` section, note the migration date there.

2. **Config**: in `.team-work/wiki-config.md`, verify `wiki_root` still points where you operated, and set `okf: yes` + `okf_version: 0.1` (the OKF pass in Phase 5.5 makes this true). Leave `ingest_mode`, `qmd*`, and `publish*` untouched.

3. **Re-index qmd** if `qmd: yes` (paths changed; the index should be rebuilt):
   ```bash
   qmd index "${WIKI_ROOT}" --db "${WIKI_ROOT}/.qmd"
   ```

### Phase 5.5: OKF Conformance Pass

**Goal**: Make the wiki a conformant [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) bundle. Additive and idempotent — backfill missing frontmatter keys and generate missing nav files; **never rewrite page bodies**. Under `--dry-run`, report what would change and write nothing.

> Operate only on concept directories (`requirements/`, `entities/`, `concepts/`, `decisions/`, `incidents/`, `plans/`) and the bundle root. **Never touch `sources/`** — it's the OKF citations store, exempt from frontmatter rules.

1. **Backfill `type` (OKF §9.2 — the one hard requirement).** For every concept page lacking a `type`:
   - If the page has a frontmatter block, add `type:` inferred from its directory (`requirements/` → `requirement`, `entities/` → `entity`, `concepts/` → `concept`, `decisions/` → `decision`, `incidents/` → `incident`, `plans/` → `plan`).
   - If the page has **no** frontmatter at all, prepend a minimal block: `type` (from dir), `title` (from the H1 or humanized filename), and `timestamp` (file mtime or today). Do not alter the body.
   - Leave existing `type` values as-is. Preserve all other keys.

2. **Add OKF-recommended keys where trivially derivable** (optional, non-destructive): `description` from the first sentence/summary if absent; `timestamp` (ISO 8601) from `updated` or file mtime if absent. Skip anything ambiguous — don't guess.

3. **Generate per-directory `index.md` nav files** (OKF §6) where missing. Each is a progressive-disclosure listing of that directory's concept pages: `* [Title](page.md) - <description>` (title/description from each page's frontmatter). **No frontmatter** in subdirectory `index.md`. If a directory already has an `index.md` (e.g. created by a newer `/work-ingest`), refresh its entries rather than clobbering it.

4. **Bundle-root `index.md`** (OKF §11): create it if missing (or add frontmatter if present without it) so it declares the version, then list the concept directories:
   ```yaml
   ---
   okf_version: "0.1"
   ---
   ```
   Note: this root `index.md` is the OKF *navigation/version* file — distinct from `README.md` (the human catalog) created in Phase 2. Both coexist. (If Phase 2 just migrated a legacy catalog *out* of `index.md` into `README.md`, the path is now free for this fresh OKF root index — no conflict.)

5. **Verify and report conformance:**
   ```
   OKF conformance pass:
     type backfilled:        9 pages   (requirements: 4, entities: 3, concepts: 2)
     index.md generated:     6 dirs
     root okf_version:       added (0.1)
     pages still untyped:    0
     Result: CONFORMANT (OKF v0.1)
   ```
   Anything that can't be made conformant automatically (e.g. a page whose directory is ambiguous) is listed for the user rather than guessed.

### Phase 6: Commit (pr or local) + Summary

**Honor `ingest_mode`** from `.team-work/wiki-config.md`, exactly like `/work-ingest`.

1. **Append a `log.md` entry:**
   ```markdown
   ## [<YYYY-MM-DD>] upgrade — migrated to README.md + relative links + OKF v0.1
   index.md → README.md (git mv). Rewrote N [[wikilinks]] across M pages.
   Link integrity: K OK, B broken (fixed), D dangling (left as TODO).
   Refreshed CLAUDE.md schema.
   OKF: backfilled `type` on T pages, generated index.md in D dirs, added root okf_version.
   ```

2. **Commit:**

   **If `ingest_mode: local`:**
   ```bash
   git add "${WIKI_ROOT}"
   git commit -m "wiki: upgrade to README.md catalog + relative links + OKF v0.1

   - index.md → README.md (history preserved via git mv)
   - rewrote N [[wikilinks]] → relative links across M pages
   - refreshed wiki CLAUDE.md schema; B broken links fixed, D dangling left as TODO
   - OKF conformance: backfilled type on T pages, generated index.md in D dirs, added okf_version"
   ```
   Don't push automatically.

   **If `ingest_mode: pr`:**
   ```bash
   git checkout -b "wiki/upgrade-<YYYY-MM-DD>"
   # commit as above
   git push -u origin "wiki/upgrade-<YYYY-MM-DD>"
   gh pr create --title "Wiki upgrade: README.md + relative links + OKF v0.1" --body "$(cat <<'EOF'
   ## Wiki Upgrade

   Migrated the wiki to the current convention via `/team-work:work-upgrade`.

   - **Catalog**: index.md → README.md (GitHub now renders it as the landing page)
   - **Links**: rewrote [[wikilinks]] → standard relative markdown links (render + navigate on GitHub and Obsidian)
   - **Integrity**: fixed B broken links; D dangling TODO links listed below
   - **OKF v0.1**: backfilled required `type` on T concept pages, generated per-directory `index.md` nav files, added `okf_version` at the bundle root — the wiki is now a conformant Open Knowledge Format bundle

   ### Review
   - Spot-check a few pages render and navigate in the GitHub UI.
   - Confirm dangling links are genuine TODOs, not mistakes.
   - Confirm backfilled `type` values match each page's intent.
   EOF
   )"
   ```

3. **Summary (both modes):**
   ```
   Upgrade complete.

     Catalog: index.md → README.md
     Links rewritten: N [[wikilinks]] → relative markdown across M pages
     Integrity: K OK, B broken (fixed), D dangling (left as TODO)
     Schema: CLAUDE.md refreshed
     OKF v0.1: T pages typed, D index.md generated, root okf_version added → CONFORMANT
     Commit mode: <local|pr>  [PR: <url> if pr]

   Next:
     /team-work:work-lint    # confirm the wiki is clean (incl. OKF conformance)
     /team-work:work-ask     # everything navigates on GitHub now
   ```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No wiki config and no `--wiki` | Point user to `/team-work:work-wiki`, or ask for the path |
| Wiki already current | Report "nothing to upgrade" (incl. OKF-conformant); stop |
| Both a legacy **catalog** `index.md` and `README.md` exist | Don't clobber; ask which is canonical (archive/merge/manual). A *catalog* index.md has section headings (`## Requirements` etc.) and lists many pages — distinct from an OKF *nav* index.md (short per-dir listing), which is expected to coexist with README.md and is NOT a conflict |
| Root `index.md` is an OKF nav file (has `okf_version` / short listing), README.md present | Not a conflict — this is the conformant steady state. Refresh the nav listing; leave README.md as the catalog |
| `git mv` fails (file untracked) | Fall back to a plain rename + `git add`; note history won't carry over |
| Bare-name `[[wikilink]]` matches multiple pages | Pick by closest directory, else ask; never guess silently |
| `[[wikilink]]` target doesn't exist | Rewrite to best-effort relative path, classify **dangling**, report it |
| Broken link, ambiguous near-match | Report it; don't auto-fix without a confident single match |
| `[[ ]]` appears inside `sources/` | Leave untouched — sources are the immutable audit trail / OKF citations store |
| Concept page has no frontmatter at all (OKF pass) | Prepend a minimal block (`type` from dir, `title` from H1/filename, `timestamp`); never edit the body |
| Page directory ambiguous for `type` inference | Don't guess — list the page for the user to type manually; leave it untyped with a note |
| OKF pass on an already-conformant wiki | Idempotent: every concept already typed, index.md present, root `okf_version` set → report "OKF: already conformant", change nothing |
| `--dry-run` | Print the full plan and per-file conversion + OKF preview; write nothing |
| qmd not available | Skip re-index; README.md remains the catalog |
| `ingest_mode: pr` but `gh` not authed | Warn, offer to fall back to local for this run |
| Push/PR fails | Commit preserved locally; show manual `git push` / `gh pr create` |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-upgrade:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
