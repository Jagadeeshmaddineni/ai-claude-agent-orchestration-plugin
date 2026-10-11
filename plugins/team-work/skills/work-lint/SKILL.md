---
name: work-lint
description: Health-check the wiki. Scans for contradictions between pages, stale claims superseded by newer sources, orphan pages (no inbound links), requirements mentioned but lacking their own page, missing cross-references, broken/dangling relative links and lingering Obsidian [[wikilinks]] or legacy catalog index.md references, OKF (Open Knowledge Format v0.1) conformance gaps (concept pages missing a required `type`, directories missing an index.md nav file, bundle root missing okf_version), and source gaps fillable by web search. Produces a prioritized punch list and suggested next questions/sources. Read-only by default; offers to apply fixes. Usage: /team-work:work-lint [--wiki <path>] [--fix]
---

# Work Lint: Wiki Health-Check

The **Lint** operation of the LLM Wiki pattern. Humans abandon wikis because maintenance outpaces value — cross-references rot, summaries drift, a new call quietly contradicts an old requirement. `/work-lint` is the agent doing that maintenance: it reads the whole wiki, finds the rot, and hands back a prioritized punch list (and, on request, fixes it).

Run it periodically, and especially before seeding a `/work-prep` session from the wiki — you want the requirement pages clean before they become a plan.

## Key Principles

1. **Read-only by default.** Lint reports. It only edits when the user opts in (`--fix` or confirming per-item).
2. **Prioritize.** Contradictions and stale requirements outrank a missing cross-link. The punch list leads with what matters.
3. **Actionable.** Every finding names the page(s), the evidence, and a concrete suggested fix.
4. **Suggest, don't invent.** For source gaps, suggest what to ingest or search — don't fabricate the missing knowledge.

## Prerequisites

- A wiki must exist (run `/team-work:work-wiki`, then `/work-ingest` to have content worth linting).
- **qmd** (optional): speeds up relatedness/duplicate detection. Falls back to `README.md` + page scans.

## Phase Map (what the user sees)

`/work-lint` has 4 phases. Print a banner at the start of each:

```
═══════════════════════════════════════════════════════
/work-lint phase <N>/4: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name              | What happens                                                  |
|---|-------------------------|---------------------------------------------------------------|
| 1 | Resolve + inventory     | Find wiki root; build a page/source/link inventory            |
| 2 | Run the checks          | Contradictions, stale, orphans, missing pages/refs, gaps      |
| 3 | Prioritized punch list  | Report findings ranked by severity, with suggested fixes      |
| 4 | Apply fixes (opt-in)    | With consent, fix the safe items; commit honoring ingest_mode |

## Process

### Phase 1: Resolve and Inventory

**Goal**: Build a map of the wiki to check against.

1. **Resolve the wiki root**: `--wiki <path>` → `wiki_root` in `.team-work/wiki-config.md` → ask.

2. **Inventory:**
   - List all generated pages (`requirements/`, `entities/`, `concepts/`, `decisions/`, `incidents/`, `plans/`).
   - List all sources under `sources/`.
   - Build the link graph: parse every **relative markdown link** (`[text](path.md)`)
     in each page, resolve it relative to the page's own directory, and record
     inbound + outbound edges. Also note any lingering Obsidian `[[wikilinks]]`
     (these are legacy and should be flagged for migration — see check 10).
   - Parse each concept page's frontmatter and record its `type` (or note its
     absence) for the OKF check (check 11). Note which directories have an
     `index.md` and whether the bundle-root `index.md` declares `okf_version`.
   - Read `README.md`, the per-directory `index.md` nav files, and `log.md`.

### Phase 2: Run the Checks

Run each check and collect findings with page references and evidence.

1. **Contradictions** — claims across pages that conflict (e.g., one page says "multi-currency phase 1", another "currency deferred to phase 2"). Also surface unresolved `> ⚠ Contradiction:` notes left by `/work-ingest`. **Highest priority.**

2. **Stale claims** — a claim whose cited source predates a newer source on the same topic, where the page wasn't updated to reflect the newer source. Cross-check citation dates against `log.md`. Flag claims that should likely be `superseded`.

3. **Orphan pages** — pages with no inbound links from any other page and not listed in `README.md`. Either link them in or archive them.

4. **Missing requirement pages** — requirements *mentioned* in other pages (or in `sources/`) that lack their own page in `requirements/`. These should be promoted to first-class pages.

5. **Missing cross-references** — pages that clearly relate (share an entity, client tag, or topic) but don't link to each other. Suggest the links.

6. **Source gaps** — claims marked `TBD`, `unknown`, or flagged as needing follow-up; questions in pages with no answering source. For each, suggest either a source to ingest or (clearly labeled) a web search that could fill it.

7. **Citation integrity** — claims with no citation block, or citations pointing to a `sources/` file that doesn't exist (broken provenance). High priority — provenance is the point of the wiki.

8. **Index drift** — pages that exist on disk but aren't in `README.md`, or `README.md` entries pointing at pages that no longer exist.

9. **Broken / dangling links** — relative markdown links whose target file does not exist on disk. Resolve each link relative to the linking page's directory (accounting for `../` hops) and check the path. **High priority** — broken links are the most visible form of rot and defeat GitHub navigation. Distinguish:
   - *Broken* — wrong path or `.md` extension missing, but a matching page exists elsewhere → fix the path.
   - *Dangling* — points at a page that was intentionally not created yet (a TODO) → leave it, but list it so the user knows what's outstanding.

10. **Legacy link/catalog syntax** — any remaining Obsidian `[[wikilinks]]` in page bodies, or a legacy **catalog** `index.md` (section headings, many pages) used instead of `README.md`. These don't render on GitHub. Flag them and recommend `/team-work:work-upgrade` (or fix inline with `--fix`). (Do **not** flag an OKF *nav* `index.md` — short per-directory listing — as legacy; that's expected and checked separately in check 11.)

11. **OKF conformance** (Open Knowledge Format v0.1) — only when the wiki is meant to be OKF (config `okf: yes`, or a bundle-root `index.md` with `okf_version`, or simply to assess readiness). Check, over concept directories only (`requirements/`, `entities/`, `concepts/`, `decisions/`, `incidents/`, `plans/` — never `sources/`):
    - **Missing `type`** (OKF §9.2, the one hard requirement) — concept pages whose frontmatter lacks a non-empty `type`, or which have no frontmatter at all. **High priority** — untyped pages are non-conformant and consumers may drop them.
    - **Missing/stale `index.md`** (OKF §6) — a concept directory with pages but no `index.md` nav file, or an `index.md` whose listing is out of sync with the pages on disk (missing entries / entries for deleted pages).
    - **Missing root `okf_version`** (OKF §11) — bundle-root `index.md` absent or lacking `okf_version`.
    - **Reserved-filename misuse** (OKF §3.1) — an `index.md` or `log.md` being used as a concept page (has a concept `type`, body is concept content).
    Report these and recommend `/team-work:work-upgrade` for a full OKF pass, or fix the safe ones inline with `--fix` (see Phase 4).

### Phase 3: Prioritized Punch List

Report findings ranked by severity:

```
Wiki health: <WIKI_ROOT>
Scanned N pages, M sources.

🔴 High — fix before planning
  1. Contradiction: requirements/billing-invoice-generation.md says currency is
     phase 1 (2026-06-04, Maria) but decisions/billing-scope-v0.md says phase 2
     (2026-05-20). → Resolve: mark the 2026-05-20 claim superseded.
  2. Broken provenance: requirements/sso-authentication.md cites
     sources/transcripts/acme/2026-05-30-... which does not exist. → Re-link or re-ingest.
  3. Broken link: requirements/billing-invoice-generation.md links to
     ../entities/acme.md but the file is entities/acme-corp.md. → Fix the path.
  4. OKF: 3 concept pages have no `type` in frontmatter
     (concepts/netting.md, entities/swift.md, plans/q3-rollout.md). → Non-conformant
     (OKF §9.2). Run /team-work:work-upgrade to backfill, or --fix here.

🟡 Medium
  5. Missing requirement page: "audit logging" is referenced in
     entities/billing-service.md but has no page in requirements/. → Promote.
  6. Stale: concepts/payment-terms.md last cites 2026-05-20; a 2026-06-04 source
     discusses net-60. → Update.
  7. Legacy syntax: entities/swift.md still uses [[wikilinks]] and a legacy
     catalog index.md exists (not README.md). → Run /team-work:work-upgrade.
  8. OKF: entities/ and decisions/ have no index.md nav file; bundle-root
     index.md lacks okf_version. → Run /team-work:work-upgrade's OKF pass.

🟢 Low
  9. Orphan: concepts/legacy-billing-codes.md has no inbound links. → Link or archive.
 10. Missing cross-ref: requirements/billing-invoice-generation.md and
     entities/acme-corp.md should link to each other.
 11. Index drift: requirements/refunds.md exists but isn't in README.md or
     requirements/index.md. → Add to both.
 12. Dangling link (TODO): entities/billing-service.md links to
     ../requirements/audit-logging.md, which doesn't exist yet. → Create it or drop the link.

Suggested next sources/questions:
  - Ingest the 2026-06-11 requirements walkthrough (referenced but not in sources/).
  - Ask: "what payment terms has Acme actually confirmed?" (/work-ask)
```

### Phase 4: Apply Fixes (Opt-In)

By default, stop after the punch list. If the user passed `--fix`, or confirms, apply the **safe** fixes:

- **Safe to auto-fix** (with consent): add missing cross-references, fix `README.md` drift, repair broken relative links where the intended target unambiguously exists, rewrite lingering `[[wikilinks]]` to relative markdown links, mark clearly-superseded claims as `superseded`, create stub requirement pages for missing-but-referenced requirements, link or flag orphans. **OKF-safe fixes**: backfill a missing `type` where the directory makes it unambiguous (`requirements/`→`requirement`, etc.); generate a missing per-directory `index.md` nav file and sync its entries; add `okf_version` to the bundle-root `index.md`.
- **Never auto-fix**: resolving a genuine contradiction (needs human judgment), inventing missing source content, deleting pages, creating a dangling link's target page from thin air, backfilling a `type` where the directory is ambiguous (leave for the user). For a full legacy migration (catalog `index.md` → `README.md`, plus the OKF pass across many pages), defer to `/team-work:work-upgrade` rather than doing it piecemeal here.

For each fix applied:
- Edit the page(s) per the wiki's `CLAUDE.md` conventions.
- Update `README.md` + the relevant `index.md`, and append a `lint` entry to `log.md`:
  ```markdown
  ## [2026-06-04] lint — fixed 6 items (2 cross-refs, 1 index drift, 1 broken link, 1 supersede, 1 OKF type backfill)
  ```
- Re-index qmd if available.
- Commit honoring `ingest_mode` (local commit, or PR if `ingest_mode: pr`).

Report what was fixed and what still needs human judgment.

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No wiki config | Point user to `/work-wiki`; accept `--wiki` path |
| Empty wiki | Report "nothing to lint yet"; suggest `/work-ingest` |
| qmd not available | Use `README.md` + page scans (slower relatedness detection) |
| Contradiction needs judgment | Report it; never auto-resolve — leave for the user |
| Legacy wiki (catalog `index.md`, `[[wikilinks]]`) | Flag it; recommend `/team-work:work-upgrade` for a full migration rather than piecemeal `--fix` |
| OKF gaps found (untyped pages, missing index.md, no okf_version) | Report under checks 11; `--fix` handles the safe ones (unambiguous `type`, generate index.md, add okf_version); defer bulk backfill to `/work-upgrade` |
| Wiki not intended to be OKF (`okf` absent/`no` in config) | Run check 11 in advisory mode only — report conformance readiness, don't treat gaps as errors |
| `type` backfill ambiguous (page's directory unclear) | Report it; never guess the `type` — leave for the user |
| Broken link, ambiguous target | Report it; don't guess which page was meant — leave for the user |
| `--fix` would touch many files | Show the plan, confirm before applying |
| Push/PR fails (pr mode) | Fixes committed locally; show manual commands |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-lint:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
