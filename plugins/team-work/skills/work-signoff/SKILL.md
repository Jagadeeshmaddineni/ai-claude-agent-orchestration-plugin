---
name: work-signoff
description: Turn the transcript of a requirements review meeting into the concise, agreed statement of what a release delivers — the document stakeholders actually sign, in place of a line-by-line reconciliation of a requirements doc that no longer matches reality. Ingests the transcript, reconciles what was decided against the prior analysis and the wiki, supersedes any earlier sign-off with a "what changed since" section, and separates still-open items into blocking vs non-blocking so the build can start honestly. Usage: /team-work:work-signoff <path-to-transcript> [--wiki <path>]
---

# Work Signoff: Transcript → Agreed Scope Statement

The **second shift-left gate**. A requirements review meeting happened — probably
working through the pushback from `/team-work:work-analyze` — and it produced an
hour of decisions, agreements, reversals, and fresh questions. All of it matters.
None of it is organized.

This is normally where things rot: someone has to turn a long transcript into
something a business audience can approve, and that takes days, if it happens at
all. Meanwhile scope quietly re-litigates itself because nobody wrote down what
was agreed.

The output is deliberately **short**. Not a specification — a one-page statement
of what this release delivers, in plain language, that a stakeholder can put
their name to, with links down to the authoritative technical detail for anyone
who wants it.

Shared behaviors live in
[`../../rules/shift-left-common.md`](../../rules/shift-left-common.md). Read it —
the phases reference its sections.

## Key Principles

1. **Concise beats complete.** This document replaces line-by-line reconciliation
   of a requirements document that has drifted from reality. If it grows into a
   specification, it has failed — link to the detail instead of restating it.
2. **Only what was actually agreed.** Every deliverable traces to something said
   in the meeting or previously settled and unchallenged. Do not fill gaps with
   what you assume was meant; unresolved items go in "still to confirm."
3. **Blocking vs non-blocking is the load-bearing distinction.** It is what lets
   the lead say "we can start building now" honestly while items remain open.
4. **Supersede, never overwrite.** Sign-off is iterative. An earlier sign-off
   stays citable as a historical baseline; the new one opens with what changed.
5. **Business register throughout.** The reader is approving scope, not reviewing
   an implementation. Technical precision belongs in the linked design.
6. **Contradictions surface, they don't resolve themselves.** If the meeting
   contradicts a recorded decision, flag it for a human.

## Prerequisites

- A team-work wiki (rules §1 — **hard-fail** if absent).
- A transcript of the review meeting (path or pasted text).
- Ideally a prior analysis document from `/team-work:work-analyze` — the skill
  works without one, but reconciliation is thinner.

## Phase Map (what the user sees)

`/work-signoff` has 6 phases. Print a banner at the start of each:

```
═══════════════════════════════════════════════════════
/work-signoff phase <N>/6: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name                | What happens                                                      |
|---|---------------------------|-------------------------------------------------------------------|
| 1 | Resolve wiki + ingest     | Resolve wiki (hard-fail); delegate transcript to `/work-ingest`   |
| 2 | Reconcile decisions       | Diff meeting outcomes against the prior analysis and the wiki     |
| 3 | Supersession check        | Find any earlier sign-off; derive "what changed since"            |
| 4 | Confirm scope with user   | Deliverable list + open items, before writing                     |
| 5 | Assemble the document     | Business-register scope statement with detail links               |
| 6 | Write, catalog, commit    | Into the wiki; honor `ingest_mode`                                |

## Process

### Phase 1: Resolve Wiki and Ingest the Transcript

**Goal**: Get the meeting into the wiki, with attribution intact.

1. **Resolve the wiki root** and `ingest_mode` per rules §1. Hard-fail with no
   wiki.
2. **Delegate the transcript to `/team-work:work-ingest`**, unconditionally
   (rules §3). Call it even if you think the user already ingested it — ingest
   detects identical content and returns cleanly, so there is no branch to
   manage and no way to strand the user.

   Ingest performs work this skill depends on and must not duplicate:
   - archives the verbatim transcript under `sources/transcripts/<project>/`,
   - extracts **attendees** and **per-claim speaker attribution with
     timestamps**,
   - writes decision pages for what was explicitly agreed,
   - updates the open-questions register,
   - flags contradictions against existing pages.

3. **Capture the meeting's identity** — date, attendees, and which document the
   meeting was reviewing. The sign-off states whose agreement it represents;
   that comes from the attendee list, not from assumption.

### Phase 2: Reconcile What Was Decided

**Goal**: Establish what actually changed, against what was previously believed.

1. **Locate the prior analysis** in the wiki (the `/work-analyze` output for this
   work), plus the relevant design and decision pages. Use
   `/team-work:work-ask` — don't reimplement search.
2. **Diff the meeting against it**, producing four buckets:

   | Bucket | Meaning |
   |---|---|
   | **Accepted** | A recommendation or verdict the meeting agreed to. |
   | **Overturned** | Something the meeting decided *against* engineering's recommendation, or reversed from a previous decision. |
   | **Closed** | An open question the meeting answered — record the answer and who gave it. |
   | **Newly raised** | Questions or requirements that surfaced in the meeting itself. |

3. **Attribute every outcome** — who agreed, at what timestamp. An "agreement"
   with no speaker behind it is not an agreement.
4. **Distinguish a decision from a discussion.** Transcripts are full of
   thinking-aloud. Only record as decided what was actually concluded; if a
   thread trailed off unresolved, it is an open item, not a deliverable.
5. **Surface contradictions rather than resolving them.** If the meeting
   contradicts a recorded decision, present both with citations and ask the user
   which stands — then reflect that as a supersession, not a silent edit.

### Phase 3: Supersession Check

**Goal**: Preserve the baseline; state what moved.

1. **Search the wiki for an existing sign-off** for this release.
2. **If one exists:**
   - **Keep it.** Do not overwrite or delete it — it is the citable record of
     what was agreed at that point, and later questions ("when did we agree to
     that?") depend on it.
   - **Mark the old one superseded**, linking forward to the new one.
   - **Open the new document with a "What changed since \<date\>" section**,
     listing only the deltas. If exactly one thing changed, say so explicitly
     and state that nothing else moved — that sentence is what makes a
     re-approval cheap for the reader.
   - **Link back** to the superseded version as the historical baseline.
3. **If none exists**, this is the first sign-off; skip the "what changed"
   section and include a short **"why this document"** section instead — why the
   team is signing off on this statement rather than reconciling the original
   requirements document line by line.

### Phase 4: Confirm Scope With the User

**Goal**: Agree the content before writing.

Present the reconciliation compactly — not the document:

```
From the 2026-07-08 review (5 attendees), reconciled against the analysis:

  Accepted     7  (including the global-configuration recommendation)
  Overturned   1  (partner requires delete-then-insert, not update — closes
                   the blocker that was gating core development)
  Closed       4 open questions
  Newly raised 2  (one blocking, one not)

Deliverables for this release: 9

Still to confirm: 1
  - Partner pickup times + folder names — NON-BLOCKING (configuration values,
    settled before go-live, no rework)

An earlier sign-off exists (2026-07-09). Only one thing changed since:
times display in 24-hour format. Everything else is unchanged.

(a) Assemble the sign-off
(b) Fix something first
```

Ask explicitly about anything where "agreed" is ambiguous in the transcript.

### Phase 5: Assemble the Document

**Goal**: Short, plain, approvable.

Structure (adapt headings to the project's language):

- **Header block** — purpose in two sentences, who prepared it, date, **who is
  being asked to sign off** (named), and what it supersedes.
- **What changed since \<date\>** (supersession only) — the deltas, nothing else.
- **Why this document** (first sign-off only) — why this statement rather than
  reconciling the original requirements document.
- **What this release delivers** — the core of the document. **Numbered items**,
  each:
  - a short plain-language heading a stakeholder recognizes,
  - one or two sentences of what it means for them — *not* how it's built,
  - explicit callouts of anything counter-intuitive, especially where a word
    means something narrower than it sounds (if "sent" means "delivered to the
    partner" and not "confirmed loaded," say so — that distinction prevents a
    dispute later),
  - a **detail link** down to the authoritative design section,
  - **tracker keys** for the work items that deliver it.
- **Explicitly not in this release** — a table: the excluded item, and where it
  goes instead (later release, separate work, deliberately never). A stakeholder
  reading this should not have to ask "what about X?"
- **Still to confirm** — each item flagged **blocking** or **non-blocking** for
  the build, with *why*. For non-blocking items, state what makes them cheap to
  absorb (a configuration value, a mechanical edit) and when they must land.
  Then state plainly whether development is authorized to proceed.
- **Sign-off block** — what agreeing to this page means, and the reminder that
  the linked design remains the implementation source of truth.
- **Footer** — preparation date, what it supersedes, and links to the design,
  decision records, and open-questions register.

Register discipline (rules §4): plain language, no jargon, no mention of how the
document was produced. Where a compromise was struck, briefly state *why* both
sides needed it — that is what stops it being re-opened.

### Phase 6: Write, Catalog, and Commit

Per rules §5:

1. Write the sign-off into the wiki, OKF frontmatter, relative markdown links.
2. **Cite claims** to the archived transcript with speaker and timestamp, and to
   the decision pages ingest created.
3. Mark any superseded sign-off `status: superseded` with a forward link.
4. Ensure closed open questions are marked closed in the register, with the
   answer and who gave it; newly raised ones are added with owners.
5. Update `README.md`, the directory's OKF `index.md`, and `log.md`. Re-index qmd.
6. Commit per `ingest_mode`.

**Summary:**

```
Sign-off document ready.

  Document: <wiki-relative path>
  Source:   <transcript> (N attendees, archived under sources/)
  Supersedes: <prior sign-off or "none — first sign-off">
  Deliverables: N  ·  Excluded: N  ·  Still to confirm: N (N blocking)
  Open questions closed: N  ·  newly raised: N
  Development authorized: <yes | no — blocked on X>
  Commit mode: <local|pr>  [PR: <url>]

Next:
  Circulate for sign-off.
  /team-work:work-prep     # turn the agreed scope into a coordination plan
  /team-work:work-plan     # then into linked tracker issues
  /team-work:work-handoff  # then the developer onboarding guide
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No wiki | **Hard-fail** with the `/work-wiki` pointer (rules §1). |
| Transcript already ingested | Expected — ingest no-ops (rules §3). Continue to reconciliation. |
| No prior analysis document in the wiki | Proceed; reconciliation covers the wiki's decisions and the transcript alone. Note the thinner baseline in the summary. |
| Transcript has no speaker labels | Ingest still archives it. Attribute to the meeting rather than individuals, and say so — do not invent speakers. |
| Meeting reached no decisions | Say so and stop. There is nothing to sign off; suggest what the next meeting needs to resolve. |
| Meeting contradicts a recorded decision | Present both with citations; ask which stands; reflect as a supersession, never a silent edit. |
| Attendees insufficient to constitute sign-off | Flag it: name who is missing whose agreement the document claims to represent. |
| Existing sign-off found | Supersede it (Phase 3) — never overwrite or delete. |
| Everything is still open | Produce the document with an empty deliverables set and a populated "still to confirm", and state plainly that development is not yet authorized. |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-signoff:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points. Run listed targets
in order per the shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work
skills also read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when
present. Tell the user when you run an extension target; a failing target is surfaced but
does not abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
