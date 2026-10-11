# Wiki Schema & Conventions

This is an LLM-maintained SDLC knowledge base. The agent does the bookkeeping
(summarizing, cross-referencing, filing, citing); the human curates sources,
directs analysis, and asks questions.

## The compounding rule

This wiki is a **compounding artifact, not a query cache.** Every ingest
*integrates* a new source into existing pages — it does not start a new
isolated note. New claims enrich, contradict, or supersede existing claims.

## Directory layout

- `index.md`       — content catalog: every page, one-line summary, by category.
- `log.md`         — append-only chronological record of ingest/query/lint ops.
- `sources/`       — IMMUTABLE, categorized audit trail. Never edit files here.
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

- Obsidian-compatible: frontmatter + `[[wikilinks]]`.
- Every page starts with frontmatter:
  ```
  ---
  title: <human title>
  type: requirement | entity | concept | decision | incident | plan
  status: draft | confirmed | superseded | parked
  tags: [client/<name>, ...]
  updated: <YYYY-MM-DD>
  ---
  ```
- **Every claim cites its source.** Use a citation block immediately under the
  claim heading:
  ```
  > Source: [[sources/transcripts/acme/2026-06-04-discovery-call-acme-billing]] — Maria Chen, 00:42:18
  > Status: confirmed requirement
  ```
- Cross-link liberally with `[[page-name]]`. An unresolved link marks a page
  worth creating later — that's fine, not an error.

## The three operations

- **Ingest** (`/work-ingest`): classify source → save verbatim under `sources/`
  → extract attendees + speaker attribution → integrate into pages with
  citations → update `index.md` + `log.md` → re-index qmd.
- **Query** (`/work-ask`): qmd hybrid search (fallback: read `index.md`) →
  synthesize a cited answer → optionally file the answer back as a new page.
- **Lint** (`/work-lint`): find contradictions, stale claims, orphans, missing
  requirement pages, missing cross-refs, source gaps. Propose fixes.

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
