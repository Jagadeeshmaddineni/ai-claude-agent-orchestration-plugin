---
name: work-wiki
description: Bootstrap or repair an LLM-maintained SDLC knowledge wiki at a configurable path — creates the CLAUDE.md schema, README.md catalog, OKF-conformant per-directory index.md navigation, log.md, immutable sources/ tree, and generated page directories (requirements, entities, concepts, decisions, incidents, plans). The wiki is an Open Knowledge Format (OKF v0.1) bundle: every generated concept page carries YAML frontmatter with a required `type`, the bundle root declares okf_version, and pages cross-link with standard relative markdown links that render and navigate on both GitHub and Obsidian (OKF §5.2). Detects and wires qmd search, gitignores the .qmd/ index, and records the wiki root in .team-work/wiki-config.md. When it finishes it offers to publish the wiki as a hosted MkDocs site on GitHub Pages (code.ssnc.dev), handing off to /team-work:work-publish. Idempotent — re-run to repair or upgrade. To upgrade an older wiki (index.md → README.md, [[wikilinks]] → markdown links, OKF conformance), run /team-work:work-upgrade. Usage: /team-work:work-wiki [path]
---

# Work Wiki: Initialize / Repair the SDLC Knowledge Base

Creates a persistent, compounding knowledge repository — the upstream layer of the SDLC that sits *before* `/work-prep` → `/work-plan` → `/work-pop` → `/agent-orch:make`. The wiki is where a business analyst accumulates knowledge from client calls, requirement docs, and postmortems into living, cross-referenced markdown pages with a full audit trail back to the source.

This skill is the **(init)** operation of the LLM Wiki pattern. `/work-ingest` does the writing, `/work-ask` does the querying, `/work-lint` does the health-checking, `/work-publish` hosts it on GitHub Pages. Run `/work-wiki` once to create the structure (or any time to repair/upgrade it). When it finishes it always offers to publish the wiki as a hosted site (on `code.ssnc.dev` repos).

**The LLM writes the wiki; the human reads it.** Pages are plain markdown with frontmatter and **standard relative links** (`[text](path/to/page.md)`), so they render and navigate correctly on GitHub *and* in Obsidian — a BA can browse the wiki right in the GitHub UI or in Obsidian while the agent edits. The catalog page is `README.md`, so GitHub shows it automatically when you open the wiki directory.

## Key Principles

1. **Idempotent.** Re-running never destroys content. It creates anything missing and upgrades the schema, leaving existing pages and sources untouched.
2. **Configurable location.** The wiki root is never hardcoded. It can live in-repo (`wiki/`), in a sibling knowledge repo, or any directory. The chosen path is persisted to `.team-work/wiki-config.md`.
3. **Sources are immutable.** The `sources/` tree is an append-only audit trail. This skill creates the tree; it never edits files inside it.
4. **Search from day one.** qmd is wired at init. If qmd is absent, the wiki degrades gracefully to `README.md`-based navigation.
5. **Links that work everywhere.** Cross-links between pages are standard relative markdown links (`[text](../entities/acme-corp.md)`), not Obsidian-only `[[wikilinks]]`. These render and navigate on GitHub and in Obsidian alike. The catalog lives in `README.md` so GitHub renders it as the directory landing page.
6. **OKF-conformant by construction.** The wiki is an [Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) bundle — a directory of markdown concept pages with YAML frontmatter, cross-linked into a graph. Three things make it conformant: (a) every generated concept page has frontmatter with a non-empty **`type`** field; (b) each directory carries an OKF **`index.md`** for progressive disclosure *alongside* the human-facing `README.md` catalog; (c) the bundle root declares **`okf_version: "0.1"`**. The immutable `sources/` tree is treated as OKF **citations/references**, not bundle concepts, so it is exempt from frontmatter requirements. Relative links are the OKF §5.2 link form. See [OKF Conformance](#okf-conformance) below.

## Prerequisites

- Must be in a git repository (for `.team-work/wiki-config.md` and `.gitignore`).
- **qmd** (optional but recommended): on-device hybrid BM25/vector + LLM re-rank markdown search. See [qmd](https://github.com/tobi/qmd). If absent, the skill offers install guidance and degrades to `README.md`-only.

## Phase Map (what the user sees)

`/work-wiki` has 5 phases. Print a banner at the start of each:

```
═══════════════════════════════════════════════════════
/work-wiki phase <N>/5: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name                  | What happens                                              |
|---|-----------------------------|-----------------------------------------------------------|
| 1 | Resolve wiki root           | Read/ask for the wiki path, confirm with user             |
| 2 | Create / repair structure   | Make directories, CLAUDE.md schema, README.md, log.md     |
| 3 | Wire qmd search             | Detect qmd, build initial index, gitignore `.qmd/`        |
| 4 | Persist config              | Write `.team-work/wiki-config.md`                          |
| 5 | Summary + offer publishing  | Report what was created/repaired; offer GitHub Pages hosting via `/work-publish` |

## Process

### Phase 1: Resolve Wiki Root

**Goal**: Determine where the wiki lives.

1. **Check for an existing config:**
   ```bash
   cat .team-work/wiki-config.md 2>/dev/null
   ```
   If it exists and has a `wiki_root:` value, use that as the default and tell the user:
   ```
   Found existing wiki config: wiki_root = <path>
   I'll repair/upgrade the wiki there. (Pass a different path to relocate.)
   ```

2. **If a path was passed as an argument**, use it directly.

3. **If no config and no argument**, ask:
   ```
   Where should the wiki live?

   (a) In this repo at ./wiki/  (versioned alongside code — recommended for single-project teams)
   (b) A sibling knowledge repo or directory  (one cross-project wiki — I'll ask for the path)
   (c) A custom path  (I'll ask)
   ```
   - (a): `WIKI_ROOT=wiki`
   - (b)/(c): ask for an absolute or relative path. Expand `~`.

4. **Confirm the resolved path:**
   ```
   Wiki root: <resolved path>

   (a) Use this
   (b) Pick a different path
   ```

Store as `WIKI_ROOT`.

### Phase 2: Create / Repair Structure

**Goal**: Materialize the canonical layout. Idempotent — only create what's missing.

1. **Create directories:**
   ```bash
   mkdir -p "${WIKI_ROOT}"/{sources/{transcripts,requirements-docs,incidents,emails,misc,assets},requirements,entities,concepts,decisions,incidents,plans}
   ```

2. **Create `CLAUDE.md`** (the wiki's operating manual / "schema") if absent. This is the file the agent reads on every ingest/query/lint to know the conventions. Use the [CLAUDE.md Schema](#wiki-claudemd-schema) template below. If it exists, compare against the current template and **append** any missing sections under a `## Schema upgrades` note rather than overwriting human edits.

3. **Create `README.md`** if absent — the content catalog. Use the [README.md template](#readmemd-template). GitHub renders `README.md` automatically when the wiki directory is opened, so the catalog doubles as the wiki's landing page. (If an older `index.md` was used *as a catalog* from a pre-upgrade wiki, suggest running `/team-work:work-upgrade` to migrate it — note the OKF `index.md` created in step 5 is a *navigation* file, a different role.)

4. **Create `log.md`** if absent — the append-only chronological record. Use the [log.md template](#logmd-template). This doubles as the OKF §7 log file (date-grouped, newest first).

5. **Create OKF `index.md` navigation files** (one per directory, including the bundle root). These satisfy OKF §6 progressive disclosure and sit *alongside* `README.md` — `README.md` is the rich human/GitHub landing page, `index.md` is the spec-conformant directory listing for OKF consumers. Use the [index.md template](#okf-indexmd-template). The **bundle-root** `index.md` is the one place OKF permits frontmatter in an index file — it declares the bundle's OKF version:
   ```yaml
   ---
   okf_version: "0.1"
   ---
   ```
   Subdirectory `index.md` files contain **no** frontmatter (per OKF §6). On a fresh wiki the dirs are empty, so each `index.md` is a stub that `/work-ingest` fills as pages are added. Generate one in: the root, `requirements/`, `entities/`, `concepts/`, `decisions/`, `incidents/`, `plans/`. (Do **not** generate one inside `sources/` — that tree is the citation store, not an OKF concept directory.)

6. **Repair check**: list what exists vs. what was created so the summary in Phase 5 is accurate.

### Phase 3: Wire qmd Search

**Goal**: Enable hybrid search, or degrade gracefully.

1. **Detect qmd:**
   ```bash
   which qmd 2>/dev/null
   ```

2. **If qmd is present**, build the initial index over the wiki root:
   ```bash
   qmd index "${WIKI_ROOT}" --db "${WIKI_ROOT}/.qmd"
   ```
   (If the exact flags differ in the installed qmd version, run `qmd --help` and adapt. The intent: index all markdown under `WIKI_ROOT`, storing the DB at `${WIKI_ROOT}/.qmd`.)

   Detect whether a qmd **MCP server** is configured (so `/work-ask` can prefer native tool use):
   ```bash
   qmd mcp --help 2>/dev/null && echo "qmd MCP available"
   ```
   Note the result in the config (`qmd_mcp: yes|no`).

3. **If qmd is absent**, tell the user how to install and continue without it:
   ```
   qmd not found. The wiki will use README.md-based navigation (fully functional).

   To enable hybrid search later, install qmd:
     https://github.com/tobi/qmd
   Then re-run /work-wiki to build the index.
   ```

4. **Gitignore the derived index.** Ensure `.gitignore` (repo root) contains an entry that ignores the qmd index. If `WIKI_ROOT` is inside the repo, add:
   ```
   # qmd search index (derived from markdown, rebuilt on demand)
   **/.qmd/
   ```
   Only append if not already present. If `WIKI_ROOT` is outside the repo, skip (nothing to ignore in this repo) but mention it.

### Phase 4: Persist Config

**Goal**: Record the wiki root and search settings so other skills default to them.

Write `.team-work/wiki-config.md` (create `.team-work/` if needed). **Do not overwrite an existing `ingest_mode`** — `/work-ingest` owns that value — and **do not overwrite `publish`/`publish_url`/`publish_exclude`** — `/work-publish` owns those. If the file exists, only update `wiki_root`, `qmd`, `qmd_mcp`, `okf`, and `okf_version`, preserving the rest.

```markdown
# Team-Work Wiki Configuration

> Read by /team-work:work-wiki, /work-ingest, /work-ask, /work-lint, /work-publish.
> Edit by hand any time, or re-run /work-wiki to refresh.

wiki_root: <WIKI_ROOT>
qmd: <yes|no>
qmd_mcp: <yes|no>
ingest_mode: <unset|pr|local>
publish: <no|yes>
publish_url: <unset|https://pages.code.ssnc.dev/<org>/<repo>/>
publish_exclude: <empty|comma-separated dirs>
okf: <yes|no>
okf_version: <0.1>

## Field reference

- `wiki_root` — where the wiki lives (in-repo, sibling repo, or custom path).
- `qmd` — whether qmd hybrid search is available.
- `qmd_mcp` — whether a qmd MCP server is configured (native tool use in /work-ask).
- `okf` — whether the wiki conforms to the Open Knowledge Format (OKF). `yes`
  for wikis created or upgraded with OKF support; `no`/absent for older wikis
  (run /work-upgrade to make them conformant).
- `okf_version` — the OKF spec version the bundle targets (currently `0.1`),
  mirrored into the bundle-root `index.md` frontmatter.
- `ingest_mode` — `pr` (every ingest opens a PR for review) or `local`
  (commit locally, PR optional). Set by /work-ingest the first time it runs;
  honored thereafter without re-asking. `unset` until first ingest.
- `publish` — whether GitHub Pages hosting is configured. Set by /work-publish.
- `publish_url` — the live site URL once publishing is configured.
- `publish_exclude` — directories kept out of the published site (e.g. `sources`);
  empty means the whole wiki is published. Owned by /work-publish.
```

If creating fresh, set `ingest_mode: unset`, `publish: no`, `publish_url: unset`, `publish_exclude:` (empty), `okf: yes`, `okf_version: 0.1`.

### Phase 5: Summary + Offer Publishing

Report what happened:

```
Wiki ready at: <WIKI_ROOT>

Created:
  - CLAUDE.md (schema)        [new|already present]
  - README.md (catalog)       [new|already present]
  - index.md (OKF nav, per dir + root okf_version) [new|already present]
  - log.md                    [new|already present]
  - sources/ (audit trail / OKF citations)  [new|already present]
  - requirements/ entities/ concepts/ decisions/ incidents/ plans/

Search: qmd <enabled and indexed | not installed — using README.md>
OKF:    conformant (v0.1) — every concept page typed; index.md per dir; root declares okf_version
Config: .team-work/wiki-config.md (wiki_root, ingest_mode=<value>, okf=yes)
```

**Always offer to publish the wiki as a hosted site.** This is the discoverable
entry point for GitHub Pages hosting. Only offer the actual setup when it can
work here; otherwise mention it without prompting.

1. **Check whether publishing already configured:** if `.team-work/wiki-config.md`
   has `publish: yes`, report the live URL and skip the offer:
   ```
   Hosting: published at <publish_url> (re-run /team-work:work-publish to refresh).
   ```

2. **Otherwise detect the remote host:**
   ```bash
   git remote get-url origin 2>/dev/null
   ```

   - **If the host is `code.ssnc.dev`**, ask:
     ```
     Publish this wiki as a hosted site?
     It can be served at https://pages.code.ssnc.dev/<org>/<repo>/ (MkDocs
     Material, searchable, SS&C Blue Stone style), auto-deployed on push.

     (a) Yes — set up GitHub Pages now   (runs /team-work:work-publish)
     (b) Not now   (run /team-work:work-publish any time later)
     ```
     - (a): hand off to **`/team-work:work-publish`** with the resolved wiki root
       (it owns host detection, the confidentiality notice, scaffolding, and the
       `publish*` config keys — do not duplicate that logic here).
     - (b): continue.

   - **If the host is not `code.ssnc.dev`** (github.com, GitLab, none), don't
     prompt — just mention it:
     ```
     Hosting: GitHub Pages publishing currently supports code.ssnc.dev only
     (this remote is <host>). /team-work:work-publish has the details.
     ```

3. **Then print the next steps:**
   ```
   Next:
     /team-work:work-ingest   # add your first call transcript or requirements doc
     /team-work:work-ask      # ask a question once you have content
     /team-work:work-lint     # health-check the wiki
     /team-work:work-publish  # host the wiki on GitHub Pages (code.ssnc.dev)
   ```

---

## Wiki CLAUDE.md Schema

This is the operating manual written into `<WIKI_ROOT>/CLAUDE.md`. It tells the agent how to behave when ingesting, querying, and linting *this* wiki.

````markdown
# Wiki Schema & Conventions

This is an LLM-maintained SDLC knowledge base. The agent does the bookkeeping
(summarizing, cross-referencing, filing, citing); the human curates sources,
directs analysis, and asks questions.

This wiki is an **Open Knowledge Format (OKF) v0.1 bundle**
(https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf): a
directory of markdown *concept* pages with YAML frontmatter, cross-linked into a
graph. Conformance rules to keep in mind on every operation:
- Every concept page (every non-reserved `.md` outside `sources/`) MUST have
  frontmatter with a non-empty **`type`**.
- `index.md` and `log.md` are OKF **reserved filenames** — never use them as
  concept pages. `index.md` is per-directory navigation (no frontmatter, except
  the bundle root which carries `okf_version: "0.1"`); `log.md` is the update log.
- The `sources/` tree holds OKF **citations/references** (verbatim originals),
  not bundle concepts — it is exempt from the frontmatter requirement.
- Consumers must tolerate unknown `type`s, extra frontmatter keys, and broken
  links (a dangling link is not-yet-written knowledge, not an error).

## The compounding rule

This wiki is a **compounding artifact, not a query cache.** Every ingest
*integrates* a new source into existing pages — it does not start a new
isolated note. New claims enrich, contradict, or supersede existing claims.

## Directory layout

- `README.md`      — content catalog: every page, one-line summary, by category. GitHub renders this as the wiki's landing page.
- `index.md`       — OKF navigation file (one per directory). Progressive-disclosure listing of that directory's concepts. The bundle-root `index.md` also declares `okf_version: "0.1"` in frontmatter (the only index.md permitted frontmatter). Kept alongside `README.md`: README is the rich human/GitHub view, index.md is the spec-conformant listing.
- `log.md`         — append-only chronological record of ingest/query/lint ops (also the OKF §7 update log).
- `sources/`       — IMMUTABLE, categorized audit trail / OKF citations store. Never edit files here. Exempt from OKF frontmatter rules.
    - `transcripts/<client-or-project>/<YYYY-MM-DD>-<slug>.md`
    - `requirements-docs/<client-or-project>/<file>`
    - `incidents/<YYYY-MM-DD>-<slug>.md`
    - `emails/`, `misc/`, `assets/`
- `requirements/`  — GENERATED functional + non-functional requirement pages.
- `entities/`      — clients, systems, people, products.
- `concepts/`      — domain glossary.
- `decisions/`     — ADR-style decision pages.
- `incidents/`     — generated postmortem/RFO synthesis (feeds /create-rfo).
- `plans/`         — thin pages linking a planning/<slug>.md back to requirements.

## Page conventions

- Plain markdown + frontmatter. **Links are standard relative markdown links,
  not Obsidian `[[wikilinks]]`** — so every page renders and navigates on GitHub
  and in Obsidian alike.
- Every page starts with OKF-conformant frontmatter. **`type` is the only
  required field** (OKF §4.1); the rest are recommended or producer extensions:
  ```
  ---
  type: requirement | entity | concept | decision | incident | plan   # REQUIRED (OKF)
  title: <human title>                # recommended
  description: <one-line summary>      # recommended — feeds index.md + search snippets
  resource: <canonical URI>            # optional — for entities bound to a real system/URL
  tags: [client/<name>, ...]           # optional
  timestamp: <ISO 8601 datetime>       # OKF last-modified time, e.g. 2026-06-15T10:00:00Z
  status: draft | confirmed | superseded | parked   # producer extension (wiki-specific)
  updated: <YYYY-MM-DD>                # producer extension (kept for back-compat)
  ---
  ```
  `status` and `updated` are wiki-specific extensions OKF preserves but doesn't
  define; `timestamp` is the OKF-native last-modified field. Keep both `updated`
  and `timestamp` in sync when you touch a page.
- **Link style — relative paths from the current page to the target `.md` file:**
  - From `requirements/billing.md` to an entity:
    `[Acme Corp](../entities/acme-corp.md)`
  - From `README.md` (wiki root) to a requirement:
    `[Billing invoice generation](requirements/billing-invoice-generation.md)`
  - To a source file (audit trail):
    `[discovery call](sources/transcripts/acme/2026-06-04-discovery-call-acme-billing.md)`
  - Always include the `.md` extension and the correct number of `../` hops so
    the link resolves on GitHub. Use the link text for the human-readable title.
- **Every claim cites its source.** Use a citation block immediately under the
  claim heading (the source link is relative to the page being written):
  ```
  > Source: [Acme discovery call, 2026-06-04](../sources/transcripts/acme/2026-06-04-discovery-call-acme-billing.md) — Maria Chen, 00:42:18
  > Status: confirmed requirement
  ```
- Cross-link liberally. If the target page doesn't exist yet, still write the
  relative link to where it *will* live (e.g. `[audit logging](audit-logging.md)`)
  — that marks a page worth creating later. `/work-lint` reports such dangling
  links so they get filled or fixed; a dangling link is a TODO, not an error.

## The three operations

- **Ingest** (`/work-ingest`): classify source → save verbatim under `sources/`
  → extract attendees + speaker attribution → integrate into pages with
  OKF-conformant frontmatter (`type` always set) + citations → update
  `README.md`, each touched directory's `index.md`, and `log.md` → re-index qmd.
- **Query** (`/work-ask`): qmd hybrid search (fallback: read `README.md`) →
  synthesize a cited answer → optionally file the answer back as a new page.
- **Lint** (`/work-lint`): find contradictions, stale claims, orphans, missing
  requirement pages, missing cross-refs, source gaps, and **OKF conformance
  gaps** (untyped pages, missing/stale `index.md`, missing root `okf_version`).
  Propose fixes.
- **Upgrade** (`/work-upgrade`): bring an older wiki up to current conventions,
  including an OKF conformance pass (backfill `type`, generate `index.md`, add
  root `okf_version`).

## Source categorization

On ingest, classify the source as transcript / requirements-doc / incident /
email / misc, then file the verbatim original under the matching
`sources/<type>/<client-or-project>/<YYYY-MM-DD>-<slug>.<ext>`. For
non-markdown sources (PDF/xlsx/docx), convert a markdown rendering for the wiki
body but preserve the original binary verbatim alongside it.

## Audit trail

Because every page claim links to a source file (with attendees, date, and
speaker/timestamp), any requirement can be traced back to the call or document
it came from — months later you can answer "why did we commit to X?" and jump
straight to who said it and when.
````

---

## README.md template

```markdown
# Wiki

> Content catalog. The agent keeps this current on every ingest.
> One line per page, grouped by category. This is the always-present
> fallback when qmd search is unavailable. GitHub renders this file as the
> wiki's landing page. Entries below are standard relative markdown links, e.g.
> `- [Billing invoice generation](requirements/billing-invoice-generation.md) — ...`

_Last updated: <YYYY-MM-DD>_

## Requirements

_(none yet — run /work-ingest)_

## Entities

_(none yet)_

## Concepts

_(none yet)_

## Decisions

_(none yet)_

## Incidents

_(none yet)_

## Plans

_(none yet)_

## Sources

_(none yet — ingested sources are listed here with date and type)_
```

---

## log.md template

```markdown
# Wiki Log

> Append-only chronological record. Newest entries at the bottom.
> Format: ## [YYYY-MM-DD] <ingest|query|lint> — <title>

## [<YYYY-MM-DD>] init — wiki created by /team-work:work-wiki
```

---

## OKF index.md template

OKF §6 navigation file. One per directory. **No frontmatter in subdirectory
`index.md` files**; the **bundle-root** `index.md` is the sole exception and
carries `okf_version`. Body is a progressive-disclosure listing — sections of
relative links with the linked concept's `description`.

**Bundle-root `index.md`** (declares the OKF version):
```markdown
---
okf_version: "0.1"
---
# <Wiki name>

> OKF navigation. Progressive-disclosure listing of this bundle.
> The human-facing catalog with prose is in README.md.

# Concept directories

* [requirements/](requirements/) - functional + non-functional requirements
* [entities/](entities/) - clients, systems, people, products
* [concepts/](concepts/) - domain glossary
* [decisions/](decisions/) - ADR-style decisions
* [incidents/](incidents/) - postmortem / RFO synthesis
* [plans/](plans/) - planning pages linked to requirements
```

**Subdirectory `index.md`** (e.g. `requirements/index.md`, no frontmatter):
```markdown
# Requirements

_(none yet — run /work-ingest)_

<!-- One entry per concept once populated, e.g.: -->
<!-- * [Billing invoice generation](billing-invoice-generation.md) - multi-currency invoicing -->
```

`/work-ingest` adds an entry here (description from the page's frontmatter) each
time it creates a concept in that directory, keeping `index.md` and `README.md`
in lockstep.

---

## OKF Conformance

This wiki targets [Open Knowledge Format v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf).
What conformance means here, and the deliberate choices made:

| OKF rule (v0.1) | How the wiki satisfies it |
|-----------------|---------------------------|
| §9.1 every non-reserved `.md` has parseable YAML frontmatter | Every concept page in `requirements/entities/concepts/decisions/incidents/plans` has frontmatter. `sources/` is the citations store (§8), not concepts — exempt. |
| §9.2 every frontmatter has a non-empty `type` | The wiki's page `type` (`requirement`/`entity`/…) satisfies this. |
| §9.3 reserved `index.md`/`log.md` follow §6/§7 | Per-directory `index.md` is a progressive-disclosure listing; `log.md` is date-grouped history. |
| §3.1 `index.md`/`log.md` reserved | Never used as concept pages. |
| §5 cross-linking | Standard markdown links. The wiki uses **relative** links (§5.2) rather than the recommended absolute bundle-relative form (§5.1), because relative links also navigate in Obsidian and render in GitHub subdirectories. Still fully conformant. |
| §11 version declaration | Bundle-root `index.md` frontmatter carries `okf_version: "0.1"`. |

**Deliberate deviations from OKF's *recommendations* (not its requirements):**
- **`README.md` kept as the human catalog** alongside the OKF `index.md`. OKF
  only reserves `index.md`; `README.md` is a normal file to OKF. We keep it
  because GitHub auto-renders it as the directory landing page. The two are kept
  in sync by `/work-ingest`. (`README.md`, having no `type`, is treated as a
  catalog/navigation artifact, not a concept — consumers ignore it like any
  untyped file.)
- **Relative links over absolute** (see §5 row above).

These are conformant because OKF consumers MUST treat everything beyond §9.1–9.3
as soft guidance (§9).

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Not in a git repository | Warn; still create the wiki, but skip `.gitignore` edit (no repo to ignore in) |
| `WIKI_ROOT` already populated | Repair mode: create only missing pieces, never overwrite content |
| `CLAUDE.md` exists with human edits | Append missing schema sections under `## Schema upgrades`, don't overwrite |
| qmd not installed | Continue catalog-only; print install guidance |
| qmd index build fails | Warn, set `qmd: no` in config, continue (README.md still works) |
| `.team-work/wiki-config.md` exists | Update `wiki_root`/`qmd`/`qmd_mcp`/`okf`/`okf_version` only; preserve `ingest_mode`/`publish*` |
| `WIKI_ROOT` outside the repo | Create structure there; skip repo `.gitignore` edit, mention it |
| Older wiki found (`index.md` used as catalog, `[[wikilinks]]` in pages, no `type`/`okf_version`) | Suggest `/team-work:work-upgrade` — it migrates the catalog, rewrites links, AND runs the OKF conformance pass. Don't auto-migrate from `/work-wiki` |
| Existing wiki missing OKF bits (no per-dir `index.md`, pages lack `type`, no root `okf_version`) | In repair mode, create missing `index.md` nav files and set `okf`/`okf_version` in config; for backfilling `type` across many existing pages, defer to `/work-upgrade`'s OKF pass |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-wiki:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
