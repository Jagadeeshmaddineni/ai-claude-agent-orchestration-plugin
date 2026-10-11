---
name: work-analyze
description: Deeply analyze a requirements document against the actual codebase and the wiki, then produce a stakeholder-facing analysis that pushes back where the requirements don't fit reality. Gives every requirement an explicit verdict (BUILD AS WRITTEN / BUILD WITH CHANGES / RECOMMEND AGAINST / DEFER / NEEDS DECISION) backed by file:line code evidence or a cited prior decision, proposes alternatives for anything it recommends against, routes open questions to named owners by audience, and surfaces risks plus implicit scope the document never asked for. The pushback gate before design and build. Usage: /team-work:work-analyze <path-to-requirements-doc> [--wiki <path>]
---

# Work Analyze: Requirements Document → Analysis with Verdicts

The **first shift-left gate**: a requirements document arrives, and before anyone
designs or builds, someone has to answer *"is what they asked for what we should
actually build?"* This skill answers that question with evidence — from the real
codebase and from what the wiki already knows — and produces a document you can
hand to stakeholders.

The output is not a critique. It is a **negotiating document**: here is what we
can build as asked, here is what we can't and why in your language, here is what
we recommend instead, here is what we need you to decide, and here is what this
work quietly commits us to that nobody wrote down.

Shared behaviors (wiki resolution, codebase resolution, ingest delegation,
audience routing, output/commit) live in
[`../../rules/shift-left-common.md`](../../rules/shift-left-common.md). Read it —
the phases below reference its sections.

## Key Principles

1. **Every requirement gets a verdict.** Silence is ambiguous: a reader can't
   distinguish "reviewed and fine" from "never looked at." An enumerated list
   with one verdict each removes that ambiguity.
2. **Evidence or it doesn't count.** A verdict cites code (`file:line`), a prior
   decision in the wiki, or a stated external constraint. Never assert that
   something is hard, impossible, or already built without showing why.
3. **"Build as written" is a real answer.** Most requirements in a decent
   document are fine. Do not manufacture conflict to appear useful — a document
   that objects to everything gets ignored, and rightly.
4. **Pushback without an alternative is obstruction.** Every RECOMMEND AGAINST
   must say what to do instead, and where the original framing *does*
   legitimately apply (often a later release).
5. **Translate, don't omit.** Engineering reasoning gets rendered into business
   consequence — cost, risk, what breaks. Never hide the reasoning, and never
   dump jargon on a business reader.
6. **Quote before you argue.** Each requirement carries the document's own words
   verbatim. A disagreement is only legible next to what was actually asked.

## Prerequisites

- A team-work wiki (see rules §1 — **hard-fail** if absent).
- A requirements document: path to markdown/PDF/docx/xlsx, or pasted text.
- Access to the codebase (see rules §2 — auto-resolved from sibling repos, or
  supplied).

## Phase Map (what the user sees)

`/work-analyze` has 7 phases. Print a banner at the start of each:

```
═══════════════════════════════════════════════════════
/work-analyze phase <N>/7: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name              | What happens                                                        |
|---|-------------------------|---------------------------------------------------------------------|
| 1 | Resolve wiki + intake   | Resolve wiki (hard-fail); delegate the document to `/work-ingest`    |
| 2 | Extract requirements    | Enumerate discrete requirements, each with a verbatim quote          |
| 3 | Resolve + read codebase | Sibling-repo walk, confirm, dispatch read-only explorers            |
| 4 | Ground against the wiki | `/work-ask` for prior decisions, constraints, commitments           |
| 5 | Verdict pass            | One verdict per requirement, each with evidence and an alternative  |
| 6 | Assemble the document   | Audience-routed sections; confirm the shape with the user           |
| 7 | Write, catalog, commit  | Into the wiki; honor `ingest_mode`                                  |

## Process

### Phase 1: Resolve Wiki and Intake the Document

**Goal**: Know where knowledge lives, and get the document into the audit trail.

1. **Resolve the wiki root** per rules §1. **Hard-fail if there is no wiki.**
2. **Resolve `ingest_mode`** (needed in Phase 7).
3. **Delegate the requirements document to `/team-work:work-ingest`**,
   unconditionally (rules §3). Ingest archives the verbatim original under
   `sources/requirements-docs/<project>/`, converts PDF/docx/xlsx while
   preserving the binary, and returns cleanly if it was already ingested.

   This matters for more than tidiness: **the analysis cites requirement text
   back to an immutable archived source**, so months later a reader can see
   exactly which version of the document a verdict was rendered against.
4. **Note the document's identity** — title, date, author/owner, and revision if
   stated. Requirements documents get revised; the analysis must say which
   revision it analyzed.

### Phase 2: Extract the Requirements

**Goal**: Turn prose into an enumerated, addressable list.

1. **Decompose the document into discrete requirements.** One testable ask per
   entry. Split compound requirements ("add the settings icon and make
   credentials per-entity" is two).
2. **Give each an ID** (`R-1`, `R-2`, …) and record:
   - **Verbatim quote** of what the document asks for — the document's own
     words, in quotation marks. Do not paraphrase at this stage.
   - **Where it came from** (section/page number).
   - **Implied surface** — UI, API, data model, schedule, infrastructure,
     reference data.
3. **Flag internal inconsistencies in the document itself** — a count that
   doesn't match its list, a term used two ways, a requirement that contradicts
   another. These are findings, not errors to silently fix.
4. **Show the user the enumerated list** before spending tokens on analysis:

   ```
   I extracted 14 discrete requirements from the document.

     R-1  Per-entity credentials and a settings icon on the detail screen
     R-2  "Reports in scope" multi-select
     ...
     R-14 New optional identifier field on two reference screens

   ⚠ Two things to note about the document itself:
     - R-5 says "two new fields" then lists three.
     - R-9 and R-11 both describe the same control differently.

   (a) Looks right — analyze these
   (b) Merge/split some — I'll tell you which
   (c) I'll add something the document implies but doesn't state
   ```

### Phase 3: Resolve and Read the Codebase

**Goal**: Ground every requirement in how the system actually works.

1. **Resolve the codebase** per rules §2 — sibling-repo walk, present findings,
   confirm. Fall back to asking for paths.
2. **Dispatch read-only explorer subagents**, scoped by area rather than one per
   requirement (a UI explorer, a data-model explorer, etc., matched to the
   surfaces found in Phase 2). Instruct each to write nothing and to return
   `file:line` evidence.
3. **For each requirement, establish:**
   - **Does this already exist?** Partially? Under a different name? (A
     surprising number of "new" requirements are already built, or already
     built *differently*.)
   - **Does it contradict how the system actually works?** This is where the
     strongest pushback comes from.
   - **What does it touch?** Which components, how many call sites.
   - **What does it cost?** Relative effort, and whether it forces a change to
     something load-bearing.
   - **Does it conflict with another requirement** once you see the code?
4. **Record the evidence per requirement.** A verdict with no evidence line is
   not finished.

### Phase 4: Ground Against the Wiki

**Goal**: Catch what the codebase can't tell you — history, constraints,
commitments.

Use `/team-work:work-ask` (do not reimplement search) to answer, per requirement
or per theme:

- **Have we already decided something about this?** A requirement that
  re-litigates a settled decision needs that decision cited, not re-argued.
- **Does an external constraint apply?** Partner-imposed formats, protocols,
  windows, or limits recorded from earlier calls.
- **Did we already commit to something incompatible?** Who said it, when.
- **Is there an open question that gates this?** If so, it belongs in the
  document's open-questions section rather than being answered speculatively.

Anything the document asks for that contradicts a cited wiki decision is a
**strong** RECOMMEND AGAINST — you have provenance, not opinion.

### Phase 5: The Verdict Pass

**Goal**: Take a position on every requirement.

Assign each requirement **exactly one** verdict:

| Verdict | Meaning | Must supply |
|---|---|---|
| **BUILD AS WRITTEN** | Buildable as asked, fits the system, no material concern. | Nothing beyond the evidence that it fits. |
| **BUILD WITH CHANGES** | The intent is right; the specifics need to change. | What changes, and why the intent is preserved. |
| **RECOMMEND AGAINST** | Should not be built as written. | Why (evidence), **what to do instead**, and where the original framing *does* apply. |
| **DEFER** | Legitimate, but not for this release. | Why it doesn't belong now, and where it goes. |
| **NEEDS DECISION** | Can't be resolved by engineering — needs a business or partner call. | The precise question, the options, the consequence of each, and a named owner. |

Rules for this pass:

- **Do not pad the RECOMMEND AGAINST list.** If a requirement is fine, say
  BUILD AS WRITTEN and move on. Credibility is the document's currency.
- **Prefer BUILD WITH CHANGES over RECOMMEND AGAINST** where the underlying
  business intent is sound and only the prescribed mechanism is wrong. This is
  usually the honest reading — stakeholders describe a solution when they mean a
  problem.
- **NEEDS DECISION is not a way to avoid an opinion.** State your
  recommendation alongside the question.
- **Mark criticality.** Which items gate the release, and which gate merely
  themselves.

Then derive, across the whole set:

- **Risks** — technical and stakeholder-side. Include ones you're not asking for
  action on, for visibility.
- **Implicit scope additions** — work this project commits to that the document
  never asks for (a pre-existing gap the new feature will expose, a data
  backfill, a new operational discipline). **Surfacing these early is one of the
  highest-value parts of the document**; they are what turn into surprises during
  acceptance testing.
- **Explicitly not delivering** — the scope boundary, stated plainly, with where
  each excluded item goes instead.

### Phase 6: Assemble the Document

**Goal**: A document the audience can act on, in their register.

1. **Establish audiences and owners** per rules §4.
2. **Confirm the shape with the user** — verdict counts and the headline
   pushback, not the full markdown:

   ```
   Verdicts across 14 requirements:
     BUILD AS WRITTEN      6
     BUILD WITH CHANGES    3
     RECOMMEND AGAINST     3
     DEFER                 1
     NEEDS DECISION        1

   Headline pushback: the document specifies per-entity configuration
   throughout, but the downstream system accepts a single consolidated
   destination — so that configuration surface has exactly one valid value.
   Recommending a global setting for this release, with the per-entity
   framing moving to the multi-destination work later.

   3 open questions for the business, 4 for the partner tech team.
   2 implicit scope additions found (one pre-existing gap this exposes).

   (a) Assemble the document
   (b) Revisit a verdict first
   ```

3. **Structure** (adapt headings to the project's language):

   - **Header block** — audience, named decision owners, purpose, which document
     revision was analyzed, engineering owner, date.
   - **Executive summary** — one paragraph: what we plan to build, and the single
     biggest departure from what was asked. A stakeholder who reads only this
     should know the shape of the disagreement.
   - **What we're recommending against** — one subsection per item: what the
     document asks (verbatim), why it's wrong *here* (business consequence, with
     the engineering reason translated), what we recommend instead, where the
     original framing legitimately applies, and what we need the audience to
     acknowledge or confirm.
   - **Open questions, grouped by owning audience** — business questions with
     named owners and the consequence of each answer; partner/external technical
     questions stated precisely enough to be answered in one reply. Mark the
     critical ones.
   - **Risks** — what it is, impact on this work, mitigation, and whether it's
     tracked elsewhere.
   - **Implicit scope additions** — work committed to that the document doesn't
     name.
   - **What this release will not deliver** — grouped, each with its destination.
   - **Decisions requested** — a numbered, priority-ordered list of what you need
     from the audience, each with a named owner. This is the document's call to
     action; keep it short enough to act on.
   - **Status** — where design, breakdown, and implementation stand, and what
     external dependencies exist.

4. **Register discipline** per rules §4: business sections carry no jargon;
   partner-technical sections are precise; never state how the document was
   produced.

### Phase 7: Write, Catalog, and Commit

Per rules §5:

1. Write the analysis into the wiki (typically `requirements/`), with
   OKF-conformant frontmatter and relative markdown links.
2. **Cite every claim** — requirement quotes to the archived source document;
   prior decisions to their decision pages; code findings by repo and
   `file:line`.
3. **File the open questions into the wiki's open-questions register** so they
   are tracked beyond this document, each with its owner and status.
4. Update `README.md`, the directory's OKF `index.md`, and `log.md`. Re-index
   qmd if configured.
5. Commit per `ingest_mode`.

**Summary:**

```
Analysis complete.

  Document: <wiki-relative path>
  Analyzed: <source doc> (revision <X>, archived under sources/)
  Verdicts: N as-written · N with-changes · N against · N deferred · N needs-decision
  Open questions filed: N (by owner)  ·  Risks: N  ·  Implicit scope: N
  Commit mode: <local|pr>  [PR: <url>]

Next:
  Share the analysis; hold the review meeting.
  /team-work:work-signoff <transcript>   # turn that meeting into an agreed scope statement
  /team-work:work-ask                    # interrogate any verdict's evidence
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No wiki | **Hard-fail** with the `/work-wiki` pointer (rules §1). Do not degrade. |
| No requirements document given | Ask: file path / paste / URL. |
| Document already ingested | Expected and fine — ingest no-ops (rules §3); continue. |
| Sibling-repo walk finds nothing | Ask for explicit paths. Never guess. |
| No codebase available at all | Warn clearly that verdicts will rest on the wiki and stated constraints only, mark affected verdicts as unverified against code, and offer to stop instead. |
| Document too vague to enumerate requirements | Say so plainly and stop: the finding *is* that the document isn't yet analyzable. List what's missing — that list is the useful output. |
| A requirement's verdict genuinely can't be determined | NEEDS DECISION with the precise blocking question — never a guess dressed as a verdict. |
| Codebase too large for a full scan | Scope explorers to the surfaces the requirements touch; state the scope limit in the document. |
| Wiki contradicts itself on a relevant decision | Surface both with citations as an open question; don't silently pick one. |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-analyze:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points. Run listed targets
in order per the shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work
skills also read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when
present. Tell the user when you run an extension target; a failing target is surfaced but
does not abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
