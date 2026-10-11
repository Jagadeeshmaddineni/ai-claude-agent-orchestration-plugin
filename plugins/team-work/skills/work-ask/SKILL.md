---
name: work-ask
description: Ask a question against the wiki and get a cited answer. Runs qmd hybrid search (BM25/vector + LLM re-rank) with a README.md fallback, reads the relevant pages, and synthesizes an answer with source provenance (page + originating call/doc + speaker/date) using standard relative markdown links. Offers to file good answers back as a new wiki page so explorations compound. Usage: /team-work:work-ask <question> [--wiki <path>]
---

# Work Ask: Query the Wiki (and Compound the Answer)

The **Query** operation of the LLM Wiki pattern. Unlike query-time RAG that re-derives an answer from raw sources every time, `/work-ask` reads the *compiled* knowledge in the wiki — requirement pages, entity pages, decisions — and synthesizes a cited answer fast. Because the wiki carries an audit trail, every answer can point not just to a page but back to the call or document (and the speaker and timestamp) the claim came from.

The compounding twist: a good answer can be filed back into the wiki as a new page (a comparison, an analysis, a synthesis), so the next person who asks gets the compiled answer instead of re-deriving it.

## Key Principles

1. **Answer from compiled knowledge.** Read the wiki's pages, not the raw `sources/` tree, unless a citation needs verifying. The pages are the point.
2. **Always cite.** Every claim in the answer links to its wiki page and, through that page, to the originating source (call/doc + speaker/date).
3. **Compound when valuable.** Offer to save substantive answers back as a wiki page so explorations accumulate.
4. **Be honest about gaps.** If the wiki doesn't contain the answer, say so and suggest what to ingest or which web search would fill the gap — don't fabricate.

## Prerequisites

- A wiki must exist with content (run `/team-work:work-wiki` then `/work-ingest`).
- **qmd** (optional): enables hybrid search. Without it, the skill falls back to `README.md` navigation.

## Phase Map (what the user sees)

`/work-ask` has 4 phases. Print a banner at the start of each:

```
═══════════════════════════════════════════════════════
/work-ask phase <N>/4: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name             | What happens                                                   |
|---|------------------------|----------------------------------------------------------------|
| 1 | Resolve wiki + search  | Find wiki root; run qmd search or README.md fallback           |
| 2 | Read candidate pages   | Open the top-ranked pages, follow relative links as needed     |
| 3 | Synthesize cited answer| Compose the answer with page + source provenance               |
| 4 | Offer to compound      | File the answer back as a new wiki page if the user wants      |

## Process

### Phase 1: Resolve Wiki and Search

**Goal**: Locate the wiki and find relevant pages.

1. **Resolve the wiki root**: `--wiki <path>` → `wiki_root` in `.team-work/wiki-config.md` → ask. If no wiki exists, point the user to `/work-wiki`.

2. **Get the question.** If none was passed as an argument, ask: "What do you want to know?"

3. **Search:**

   **If `qmd: yes` in config** — run hybrid search:
   ```bash
   qmd search "<question>" --db "${WIKI_ROOT}/.qmd" --limit 10
   ```
   If a qmd **MCP server** is configured (`qmd_mcp: yes`), prefer the native qmd MCP search tool over shelling out, for richer results.

   (Adapt flags to the installed qmd version via `qmd --help`. The intent: hybrid BM25/vector retrieval with LLM re-rank, returning the most relevant pages.)

   **If `qmd: no`** — fall back to `README.md`:
   - Read `<WIKI_ROOT>/README.md`.
   - Match the question against page titles and one-line summaries.
   - Pick the most relevant candidate pages to read in Phase 2.

### Phase 2: Read Candidate Pages

**Goal**: Gather the evidence.

1. Read the top-ranked pages from Phase 1.
2. **Follow relative markdown links** when a page references another that's relevant (e.g., a requirement links to an entity or a decision).
3. If a claim is load-bearing for the answer and its accuracy matters, optionally open the cited `sources/` file to verify attribution (who/when).
4. Stop when you have enough to answer, or when you've confirmed the wiki doesn't cover it.

### Phase 3: Synthesize a Cited Answer

**Goal**: Compose a clear, attributed answer.

Write the answer in prose, with citations. Each substantive claim cites its wiki page; where provenance matters, also surface the original source and speaker/date:

```
Multi-currency invoicing is in scope for phase 1.

- Acme requires invoices in the customer's billing currency
  ([billing invoice generation](requirements/billing-invoice-generation.md) — originally
  from the 2026-06-04 discovery call, Maria Chen 00:42:18).
- This was an explicit decision
  ([billing multi-currency phase 1](decisions/billing-multicurrency-phase1.md),
  decided by Maria Chen, 2026-06-04). It supersedes an earlier 2026-05-20 note
  that had deferred currency to phase 2.

Sources: [Acme discovery call, 2026-06-04](sources/transcripts/acme/2026-06-04-discovery-call-acme-billing.md)
```
(The links above are written relative to the wiki root, as you'd see them in
`README.md`; when a link sits inside a subdirectory page, add the right `../` hops.)

If the wiki **doesn't** contain the answer:
```
The wiki doesn't cover this yet. Closest related pages:
  - [Acme Corp](entities/acme-corp.md)
To answer this, consider:
  (a) Ingesting the relevant call/doc with /work-ingest
  (b) Letting me web-search for general background (won't be wiki-cited)
```

Output forms on request: prose (default), a comparison table, or a structured analysis. (Decks/charts only if the user explicitly asks.)

### Phase 4: Offer to Compound

**Goal**: Turn a good exploration into a durable page.

If the answer is substantive (a synthesis, comparison, or analysis worth keeping), offer:

```
Want to save this answer to the wiki so it compounds?

(a) Yes — file it as a new page (I'll suggest a title and category)
(b) No — this was just a one-off question
```

If yes:
- Suggest a page + category (usually `concepts/` for syntheses, `decisions/` if it records a decision, or a new analysis page).
- Write the page using the wiki's `CLAUDE.md` conventions (frontmatter + citation blocks + relative markdown links to the pages it drew from).
- Update `README.md` (add the new page as a relative link) and append a `query` entry to `log.md`:
  ```markdown
  ## [2026-06-04] query — "is multi-currency in phase 1?" → filed concepts/billing-currency-scope
  ```
- Re-index qmd if available.
- Commit honoring `ingest_mode` (local commit, or PR if `ingest_mode: pr`), same as `/work-ingest`.

If no, leave the wiki unchanged (optionally still append a lightweight `query` line to `log.md` for traceability).

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No wiki config | Point user to `/work-wiki`; accept `--wiki` path |
| Empty wiki (no pages) | Say so; suggest `/work-ingest` first |
| qmd not available | Fall back to `README.md` navigation |
| qmd search returns nothing | Fall back to `README.md`; broaden terms; ask user to rephrase |
| Answer not in wiki | State the gap honestly; suggest ingest or offer (clearly-labeled) web search |
| Filing answer back, push/PR fails (pr mode) | Commit preserved locally; show manual commands |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-ask:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
