---
name: work-ingest
description: The core BA tool. Take a call transcript, requirements doc, or postmortem → classify it → save the verbatim original categorized under sources/<type>/<client>/<date> as an immutable audit trail / OKF citations store (converting PDF/xlsx/docx to markdown while preserving the original binary) → extract attendees and speaker attribution → integrate claims into requirement/entity/concept/decision/incident pages with OKF-conformant frontmatter (required `type`, plus description/timestamp) where every claim cites its source via a standard relative markdown link → flag contradictions → update README.md, each touched directory's OKF index.md, and log.md → re-index qmd. Pages cross-link with relative markdown links that work on GitHub and Obsidian (OKF v0.1 bundle). Honors a repo-wide pr|local ingest mode. Usage: /team-work:work-ingest [path-or-paste] [--wiki <path>]
---

# Work Ingest: Integrate a Source into the Wiki

The **Ingest** operation of the LLM Wiki pattern, and the business analyst's primary tool. A BA finishes a client call or receives a requirements document and runs `/work-ingest`. The agent does all the bookkeeping: it archives the source with a full audit trail, extracts who said what, and *integrates* the new knowledge into the existing wiki — enriching requirement pages, updating entity pages, flagging contradictions — so the corpus compounds rather than fragmenting.

This is the heavy, persistent counterpart to `/work-prep`. `/work-prep` is unchanged and remains the lightweight, one-shot planning path. The wiki *front-runs* planning: a BA accumulates many sources here, then seeds a `/work-prep` session from the requirement pages when a body of work is ready.

## Key Principles

1. **Integrate, don't append.** A new source enriches existing pages. A second transcript about billing updates the billing requirement page — it does not create a parallel note. Knowledge is compiled once and kept current.
2. **Sources are immutable and cited.** The verbatim original is saved under `sources/` and never edited. Every generated claim links back to it with speaker + timestamp, so any requirement traces to the call it came from.
3. **Classify, don't flatten.** Extracted content splits into requirements (functional/NFR), entities, concepts, decisions, incidents — not one undifferentiated dump.
4. **Wizard, not wall-of-text.** Discuss takeaways with the user; don't print 15 pages of generated markdown and ask "looks good?".
5. **Flag contradictions.** When a new source disagrees with an existing page, surface it explicitly rather than silently overwriting.

## Prerequisites

- A wiki must exist (run `/team-work:work-wiki` first). If `.team-work/wiki-config.md` is missing, offer to run `/work-wiki`.
- Must be in a git repository.
- `gh` CLI authenticated **only if** `ingest_mode: pr` (PR-per-ingest).
- **Conversion shim** (optional, for non-markdown sources): `pandoc`, `markitdown`, or `textutil` (macOS). Degrades gracefully with a warning if none present.

## Phase Map (what the user sees)

`/work-ingest` has 8 phases. Print a banner at the start of each:

```
═══════════════════════════════════════════════════════
/work-ingest phase <N>/8: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name                  | What happens                                                       |
|---|-----------------------------|--------------------------------------------------------------------|
| 1 | Resolve wiki + ingest mode  | Read config; ask pr-vs-local the first time, store it              |
| 2 | Accept + classify source    | Take paste/file/URL; classify type; identify client/project       |
| 3 | Archive source (audit trail)| Skip cleanly if already ingested; else save verbatim under sources/; convert non-md; preserve binary |
| 4 | Extract attendees + claims  | Attendees, speaker attribution, dates, categorized claims          |
| 5 | Discuss takeaways           | Wizard: confirm/reclassify key extractions with the user           |
| 6 | Integrate into pages        | Create/update pages with per-claim citations; flag contradictions  |
| 7 | Update index + log + qmd    | Refresh README.md + per-dir OKF index.md, append to log, re-index qmd |
| 8 | Commit (pr or local) + summary | Honor ingest_mode; report touched pages + source location       |

## Process

### Phase 1: Resolve Wiki Root and Ingest Mode

**Goal**: Know where to write and how to commit.

1. **Resolve the wiki root** in this order: `--wiki <path>` argument → `wiki_root` in `.team-work/wiki-config.md` → ask. If no config exists at all:
   ```
   No wiki found. Run /team-work:work-wiki first to create one.

   (a) Run /work-wiki now (I'll initialize, then continue ingesting)
   (b) I'll point you at an existing wiki path
   ```

2. **Resolve `ingest_mode`** from `.team-work/wiki-config.md`:

   **If `ingest_mode: unset` (first ingest ever):** ask once, then store for the whole repo:
   ```
   How should wiki changes be committed? (asked once — stored for this repo)

   (a) Local — commit wiki changes on the current branch. Fast, solo/trusted workflow.
       PR optional, you can push when you like.
   (b) PR — every ingest opens a PR for review. Adds a review gate for teams.

   I'll remember your choice in .team-work/wiki-config.md. Change it any time
   by editing that file.
   ```
   Write the choice back to `.team-work/wiki-config.md` (`ingest_mode: local` or `ingest_mode: pr`).

   **If `ingest_mode` is already `pr` or `local`:** honor it silently. Do not re-ask.

3. **If `ingest_mode: pr`**, verify `gh auth status`. If not authenticated, warn and offer to fall back to local for this run.

### Phase 2: Accept and Classify the Source

**Goal**: Get the source and decide what kind of thing it is.

1. **Accept the source.** The argument may be a file path, inline pasted text, or a URL. If empty, ask:
   ```
   What are you ingesting?

   (a) Paste a transcript or notes inline
   (b) A file path (transcript, PDF, docx, xlsx, email export)
   (c) A URL to fetch
   ```

2. **Classify the source type** by inspecting content and filename:
   - **transcript** — call/meeting with speaker labels, timestamps, attendee block.
   - **requirements-doc** — RFP, spec, data dictionary, contract addendum.
   - **incident** — postmortem call or write-up (root cause, impact, timeline).
   - **email** — email thread/export.
   - **misc** — anything else.

   Present your classification and let the user correct:
   ```
   I classified this as: transcript (discovery call).
   Client/project: Acme Corp.

   (a) Correct
   (b) Different type — I'll pick
   (c) Different client/project
   ```

3. **Identify the client/project slug** (for the `sources/<type>/<client>/` subfolder). Derive from the content or ask. Slugify (lowercase, hyphens).

### Phase 3: Archive the Source (Audit Trail)

**Goal**: Save the verbatim original immutably, with conversion for non-markdown.

1. **Compute the destination:**
   ```
   <WIKI_ROOT>/sources/<type>/<client-slug>/<YYYY-MM-DD>-<slug>.<ext>
   ```
   Use the source's own date (from the transcript/doc) when known; else today. Slugify a short descriptive title.

1a. **Already-ingested check (idempotency).** Before writing anything, if a file
   already exists at the destination, compare its content against the incoming
   source (a digest comparison — normalize trailing whitespace so a stray
   newline is not treated as a difference):

   ```bash
   [ -f "$DEST" ] && shasum -a 256 "$DEST" | cut -d' ' -f1
   ```

   | Condition | Behavior |
   |---|---|
   | Destination exists, content **matches** | **Already ingested.** Report it, skip Phases 3–7, and go straight to the Phase 8 summary noting no changes. Do **not** prompt. |
   | Destination exists, content **differs** | Genuinely different content under the same date+slug — ask: overwrite (rare), pick a new slug, or treat as a re-ingest. |
   | Destination does not exist | Normal archive; continue. |

   For the matching case, report and stop cleanly:
   ```
   Already ingested: sources/transcripts/acme/2026-06-04-discovery-call.md
   Content is identical — nothing to re-archive. The wiki already reflects this source.
   ```

   **Why this matters:** other skills delegate to `/work-ingest` as a step in a
   larger workflow. An interactive prompt here would stall them mid-run, and
   silently choosing a new slug would duplicate an immutable source and corrupt
   the audit trail every citation depends on. Making the identical-content case
   a clean no-op is what lets a caller invoke ingest unconditionally without
   knowing whether the user already ingested the source.

2. **For markdown / plain text sources:** save the verbatim content directly to that path as `.md`.

3. **For non-markdown sources (PDF, docx, xlsx, pptx):** run the **convert-to-markdown shim** to produce a markdown rendering for the wiki body, AND preserve the original binary verbatim alongside it.

   - Preserve the original binary first:
     ```
     <WIKI_ROOT>/sources/<type>/<client>/<YYYY-MM-DD>-<slug>.<original-ext>
     ```
   - Produce a markdown rendering at the same basename `.md`:
     ```
     <WIKI_ROOT>/sources/<type>/<client>/<YYYY-MM-DD>-<slug>.md
     ```
   - **Conversion tool order** (use the first available):
     ```bash
     which markitdown 2>/dev/null   # markitdown <in> -o <out.md>
     which pandoc 2>/dev/null       # pandoc <in> -o <out.md>
     which textutil 2>/dev/null     # macOS: textutil -convert txt <in> -output <out.md> (doc/docx/rtf)
     ```
     - `markitdown` (preferred — handles PDF/xlsx/docx/pptx): `markitdown "<in>" > "<out.md>"`
     - `pandoc` (docx/html/rtf → md): `pandoc "<in>" -o "<out.md>"`
     - `textutil` (macOS, doc/docx/rtf): `textutil -convert txt "<in>" -output "<out.md>"`
   - **Graceful fallback if no converter is present:**
     ```
     No markdown converter found (markitdown/pandoc/textutil). I preserved the
     original binary under sources/ but could not auto-extract its text. The
     wiki body for this source will be a stub pointing at the binary.

     To enable conversion: pip install markitdown  (or brew install pandoc)
     ```
     Save a stub `.md` with frontmatter + a note that the binary needs manual review, and continue. The audit trail (the binary) is preserved either way.

4. **Confirm archive location** to the user (briefly):
   ```
   Archived: sources/transcripts/acme/2026-06-04-discovery-call-acme-billing.md
   (verbatim — this file is immutable and is what every wiki claim will cite)
   ```

### Phase 4: Extract Attendees, Attribution, and Claims

**Goal**: Pull structured knowledge from the source.

From the (possibly converted) source text, extract:

1. **Attendees / participants** (for calls): explicit attendee blocks ("Attendees:", "Present:", "On the call:"), speaker labels (`^[A-Z][a-z]+( [A-Z][a-z]+)?:`), `@mentions`. De-duplicate; capture roles if stated.
2. **Speaker attribution per claim** and **timestamps** where present (e.g., `Maria Chen, 00:42:18`).
3. **Date and provenance.**
4. **Categorized claims** — sort each substantive statement into:
   - **Functional requirement** — what the system should do.
   - **Non-functional requirement** — performance, security, scale, reliability constraints.
   - **Entity** — a client, system, person, product worth a page.
   - **Concept** — a domain term worth glossary treatment.
   - **Decision** — something explicitly agreed.
   - **Incident detail** — for postmortems: root cause, impact, timeline, follow-ups.

### Phase 5: Discuss Takeaways (Wizard)

**Goal**: Confirm the important extractions with the user before writing many files.

Present a concise categorized summary (not the full generated markdown):

```
From this source I extracted:

Attendees (3): Maria Chen (Acme, Product), Sam Lee (Acme, Eng), Joe Stein (us)

Functional requirements (2):
  1. Invoices must render in the customer's billing currency (Maria, 00:42:18)
  2. Support net-30 and net-60 payment terms (Sam, 00:51:04)
NFRs (1):
  1. Invoice generation must complete < 5s for 10k line items (Sam, 00:55:10)
Entities (2): Acme Corp, Billing Service
Decisions (1): Multi-currency is in scope for phase 1 (Maria, 00:43:30)

⚠ Possible contradiction:
  New: "multi-currency in phase 1" (Maria)
  Existing page requirements/billing-invoice-generation.md says: "currency
  deferred to phase 2" (from 2026-05-20 call).

What did I get wrong, and how should I resolve the contradiction?
```

Let the user reclassify, drop, add, or resolve contradictions before integration.

### Phase 6: Integrate into Pages

**Goal**: Create or update generated pages so knowledge compounds. Every claim carries a citation.

For each confirmed claim:

1. **Find the target page** (search `README.md` / qmd for an existing page on the topic). Prefer updating an existing page over creating a new one.

2. **Create or update** the page using the wiki's `CLAUDE.md` conventions:
   - **OKF-conformant frontmatter** — **`type` is required** (`requirement`/
     `entity`/`concept`/`decision`/`incident`/`plan`); plus `title`,
     `description` (one-liner, feeds `index.md`/search), `tags`, `timestamp`
     (ISO 8601), and the wiki extensions `status` + `updated`. Set `resource`
     for entities bound to a real system/URL. Never write a concept page without
     a `type` — that breaks OKF conformance (§9.2).
   - **Links are standard relative markdown links, not `[[wikilinks]]`** — compute
     the relative path from the page you're writing to the target `.md` file
     (include the `.md` extension and the right number of `../` hops) so links
     resolve on GitHub and in Obsidian. A page in `requirements/` links to an
     entity as `[Acme Corp](../entities/acme-corp.md)`; the source citation, also
     relative, points back into `../sources/...`.
   - Each claim under a heading with a **citation block** (source link relative to this page):
     ```markdown
     ## Invoice generation must support multi-currency

     > Source: [Acme discovery call, 2026-06-04](../sources/transcripts/acme/2026-06-04-discovery-call-acme-billing.md) — Maria Chen, 00:42:18
     > Status: confirmed requirement

     Acme requires invoices rendered in the customer's billing currency...
     ```
   - Cross-link related pages with relative markdown links (e.g., link a requirement to `[Acme Corp](../entities/acme-corp.md)` and `[Billing Service](../entities/billing-service.md)`).

3. **Handle contradictions** per the user's Phase 5 resolution:
   - If the new claim supersedes the old: mark the old claim `status: superseded`, add a note linking to the new source, and record the change.
   - If unresolved: leave both, add a `> ⚠ Contradiction:` note on the page linking both sources, and add it to the page's open questions. `/work-lint` will keep surfacing it.

4. **Entities and concepts**: ensure every named client/system/person/product referenced has (or gets) an entity page; every domain term gets a concept page if substantive.

5. **Incidents**: for postmortem sources, write/update a page under `incidents/` synthesizing root cause, impact, timeline, follow-ups — cross-linked to affected `entities/`. (This is what `/agent-orch:create-rfo --wiki` also feeds.)

### Phase 7: Update README.md, log.md, and qmd

1. **`README.md`**: add new pages under their category as a one-line **relative markdown link** with a short summary (e.g. `- [Billing invoice generation](requirements/billing-invoice-generation.md) — multi-currency invoicing`); add the archived source under the Sources section, also as a relative link, with its date and type.

1a. **OKF `index.md`** (per directory): for each directory where you created a
   new concept page, add a matching entry to that directory's `index.md` (the
   OKF §6 navigation file) — `* [Title](page.md) - <description from frontmatter>`.
   Keep `index.md` and `README.md` in lockstep. If the directory has no
   `index.md` yet (older wiki), create the stub (no frontmatter) before adding
   the entry. Don't touch the bundle-root `index.md` frontmatter (`okf_version`).

2. **`log.md`**: append an entry:
   ```markdown
   ## [2026-06-04] ingest — Acme discovery call (billing)
   Source: sources/transcripts/acme/2026-06-04-discovery-call-acme-billing.md
   Touched: requirements/billing-invoice-generation (updated), entities/acme-corp (new),
            entities/billing-service (new), decisions/billing-multicurrency-phase1 (new)
   Contradictions flagged: 1 (currency phasing — resolved: superseded 2026-05-20 claim)
   ```

3. **Re-index qmd** (if `qmd: yes` in config):
   ```bash
   qmd index "${WIKI_ROOT}" --db "${WIKI_ROOT}/.qmd"
   ```
   (Adapt flags to the installed version; the `.qmd/` index is gitignored.)

### Phase 8: Commit (pr or local) + Summary

**Honor `ingest_mode`:**

**If `ingest_mode: local`:**
```bash
git add "${WIKI_ROOT}" .team-work/wiki-config.md
git commit -m "wiki: ingest <source title> (<type>, <client>)

- Archived source under sources/<type>/<client>/
- Touched N pages (M new), K contradictions flagged"
```
Do not push automatically. Tell the user they can push when ready.

**If `ingest_mode: pr`:**
- If on the default branch, create a branch `wiki/ingest-<date>-<slug>`:
  ```bash
  git checkout -b "wiki/ingest-<date>-<slug>"
  ```
  (If already on a wiki branch, stay on it.)
- Commit as above, push, and open a PR:
  ```bash
  git push -u origin "wiki/ingest-<date>-<slug>"
  gh pr create --title "Wiki ingest: <source title>" --body "$(cat <<'EOF'
  ## Wiki Ingest

  Integrated a new source into the wiki via `/team-work:work-ingest`.

  - **Source**: sources/<type>/<client>/<date>-<slug> (verbatim, immutable)
  - **Touched**: N pages (M new)
  - **Contradictions flagged**: K

  ### Review
  - Verify claims are correctly attributed to the source.
  - Check contradiction resolutions.
  EOF
  )"
  ```

**Summary (both modes):**
```
Ingest complete.

  Source archived: sources/<type>/<client>/<date>-<slug>  (immutable)
  Touched N pages, M new, K contradictions flagged.
  README.md + log.md updated. qmd re-indexed (or skipped).
  Commit mode: <local|pr>  [PR: <url> if pr]

Next:
  /team-work:work-ask     # query what you now know
  /team-work:work-ingest  # add the next source
  /team-work:work-lint    # health-check before seeding /work-prep
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No wiki config | Offer to run `/work-wiki` first, or take a `--wiki` path |
| `ingest_mode: unset` | Ask once (local vs pr), store in `.team-work/wiki-config.md`, honor thereafter |
| No source provided | Ask: paste / file path / URL |
| Non-markdown source, no converter | Preserve binary, write stub `.md`, warn, continue (audit trail intact) |
| Conversion produces garbage | Keep binary as source of truth; note the conversion is low-fidelity; let user paste cleaner text |
| New claim contradicts existing page | Flag in Phase 5; resolve per user (supersede vs keep-both with ⚠ note) |
| qmd not available | Skip re-index; README.md remains the catalog |
| `ingest_mode: pr` but `gh` not authed | Warn, offer to fall back to local for this run |
| Push/PR fails | Commit is preserved locally; show manual `git push` / `gh pr create` |
| Source already archived, **identical content** | No-op: report "already ingested", skip to the summary, exit success. Never prompt — callers depend on this (Phase 3, step 1a) |
| Source already archived, **different content** | Ask: overwrite (rare), pick a new slug, or treat as re-ingest of the same source |
| Wiki lacks OKF bits (no per-dir `index.md`, pages without `type`) | Create the `index.md` stub before adding entries; always write `type` on new pages. For backfilling `type` across many existing pages, suggest `/work-upgrade`'s OKF pass |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-ingest:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
