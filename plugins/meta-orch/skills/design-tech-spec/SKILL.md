---
name: design-tech-spec
description: Staff/principal-level technical-specification design for something HUGE (1→35 epics, 5→1000+ stories). Runs /deep-research when available and a relentless grill-me-style Socratic interrogation (one question at a time, recommended answer supplied, explore-the-codebase-over-asking), considers the existing codebase + all source + a team-work /wiki if initialized, and writes docs/tech-specs/000N-name.md. Step 1 of the meta-orch pipeline. Usage: /meta-orch:design-tech-spec [huge idea | epic description]
---

# Design Tech Spec — the front door of meta-orch

You are producing a **technical specification a staff engineer / principal
architect would be proud to present** for something HUGE — one or more epics
that may fan out into anywhere from 5 PRs to 1,000+ stories across dozens of
epics. This is step 1 of the meta-orch pipeline:

```
/meta-orch:design-tech-spec   →  docs/tech-specs/000N-name.md   (THIS SKILL)
/meta-orch:design-tech-plan   →  docs/tech-plan/000N-name.md + GitHub epics/stories
/meta-orch:make-session       →  workers pick up stories, delegate to /agent-orch:make
/meta-orch:coordinate-session →  coordinator loop reports status
```

> **Attribution.** The interrogation method is adapted from Matt Pocock's
> `grill-me` / `grilling` skill (relentless one-question-at-a-time interview
> until shared understanding, with a recommended answer for every question and
> a bias to explore the codebase over asking). It is combined with the
> `/agent-orch:brainstorm` per-section approval discipline.

## What makes this different from /brainstorm

`/brainstorm` designs ONE feature. `/design-tech-spec` designs a **program** —
something big enough that it must later be decomposed into epics, tranches, and
hundreds of coordinated stories. The output is a spec dense enough that
`/design-tech-plan` can mechanically derive that decomposition.

## The Hard Gate

**No code, no GitHub issues, no plan.** This skill produces exactly one
artifact: `docs/tech-specs/000N-name.md`. Decomposition into epics/stories and
issue creation is `/design-tech-plan`'s job. If you feel the urge to start
planning tranches, stop — capture it as spec content and move on.

---

## Phase Map

Print a banner at the start of every phase:

```
═══════════════════════════════════════════════════════
/design-tech-spec phase <N>: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name                                            |
|---|-------------------------------------------------------|
| 0 | Setup: config, next spec number, existing-spec check  |
| 1 | Context: codebase + source + wiki + prior specs       |
| 2 | Deep research (optional, /deep-research if available) |
| 3 | The Grilling (relentless Socratic interrogation)      |
| 4 | Spec sections (staff-level, per-section approval)     |
| 5 | Write docs/tech-specs/000N-name.md + self-review      |
| 6 | Handoff to /design-tech-plan                          |

---

## Phase 0: Setup

**Print phase banner.**

1. **Ensure meta-orch is provisioned.** If `.meta-orch/config.md` is absent,
   provision it (and `session-guardrails.md`) from the plugin assets:
   ```bash
   mkdir -p .meta-orch
   cp "${CLAUDE_PLUGIN_ROOT}/assets/config.md" .meta-orch/config.md
   cp "${CLAUDE_PLUGIN_ROOT}/assets/session-guardrails.md" .meta-orch/session-guardrails.md
   ```
   Tell the user you created them. If they already exist, leave them untouched.
   Read `.meta-orch/config.md` for `tech_specs_dir` (default `docs/tech-specs`).

2. **Determine the next spec number.** List existing specs and pick the next
   zero-padded 4-digit ordinal:
   ```bash
   ls docs/tech-specs/[0-9]*.md 2>/dev/null | sed 's#.*/##' | sort | tail -1
   ```
   First spec is `0001`. Next after `0003-...` is `0004`.

3. **Existing-spec check.** If `$ARGUMENTS` clearly matches an existing spec
   under `docs/tech-specs/`, offer to refine it instead of starting fresh:
   ```
   Found an existing spec: docs/tech-specs/0002-billing-overhaul.md
   (a) Refine / extend it
   (b) Start a new spec (0004)
   ```

4. Use `$ARGUMENTS` as the seed. If empty, ask the user for the big idea in one
   or two sentences before proceeding.

## Phase 1: Context

**Print phase banner.** Read before you ask — grill-me principle: explore the
codebase instead of asking anything the code can answer.

1. Read `CLAUDE.md` and any `.claude/rules/*.md` for standards.
2. **Survey the existing codebase (if any).** Map the top-level structure,
   languages, services, and the areas the idea would touch. For a large or
   unfamiliar codebase, launch the Architect read-only to surface reusable
   patterns and likely-affected components:
   ```
   Task tool call:
     subagent_type: "agent-orch:orchestrate-architect"
     description: "Surface architecture for tech spec"
     prompt: "READ-ONLY. Do not write files. Program under design: <seed>.
              Read CLAUDE.md and scan the codebase. Report: existing services/
              modules/patterns to reuse; components and layers this program would
              touch; seams where it could be decomposed into independently
              shippable pieces; constraints and risks. Concise findings only —
              no plan, no implementation."
   ```
   Greenfield repo (no source yet) is fine — note that and design from scratch.
3. **Team-work wiki (if initialized).** If `.team-work/wiki-config.md` exists,
   read its `wiki_root`, then consult the wiki for domain rules and prior
   decisions relevant to the idea — prefer `/team-work:work-ask "<question>"`
   when the team-work plugin is available, else read the wiki pages directly.
   Fold domain constraints into your grilling.
4. Read prior specs in `docs/tech-specs/` so this one is consistent with, and
   references, decisions already made.

## Phase 2: Deep Research (optional)

**Print phase banner.**

If the program has meaningful unknowns (new technology, external systems,
compliance, scale/perf questions, build-vs-buy), run deep research:

- If a `deep-research` skill is available (check the skill list), invoke it via
  the Skill tool with a focused question derived from the seed, e.g.
  `deep-research` args: *"<the specific unknown to resolve, with scope>"*.
- Otherwise fall back to `WebSearch`/`WebFetch` for the same questions.

Summarize findings as **decision inputs** (options + trade-offs + a
recommendation), and carry them into the grilling. If the program is purely
internal and well-understood, say so and skip — don't research for its own sake.

## Phase 3: The Grilling

**Print phase banner.**

> Interview the user **relentlessly**, ONE question at a time, until you reach a
> shared understanding of the program. This is the heart of the skill.

Rules (from grill-me/grilling):

1. **One question at a time.** Never batch — batching is bewildering. Wait for
   the answer before the next question.
2. **Always supply your recommended answer** and a one-line rationale, so the
   user can just confirm when you're right. Prefer multiple choice when the
   option space is known.
3. **Explore over ask.** If a question is answerable from the codebase, the
   wiki, or research, go find the answer instead of asking.
4. **Walk the design tree depth-first**, resolving dependencies between
   decisions one at a time — a later question often depends on an earlier
   answer, so order matters.
5. **Challenge assumptions.** Push back on scope creep (YAGNI), on hand-wavy
   non-functionals, and on anything that would make decomposition impossible.

Cover, as the program demands:

- **Problem & success.** What breaks today; what "done" looks like; measurable
  success criteria.
- **Scope & non-goals.** What is explicitly OUT. For something this size, be
  ruthless — every non-goal shrinks the plan.
- **Users & workflows.** Who, doing what, before/after.
- **Architecture & boundaries.** Major components (reuse vs new), the seams
  along which the program can be split into independently shippable epics.
- **Data & interfaces.** Schemas, contracts, migrations, backward-compat.
- **Non-functionals.** Scale, performance, security, compliance, availability.
- **Rollout & risk.** Phasing, feature flags, migration/backfill, blast radius,
  rollback. **This directly shapes the tranche/gate model in the next skill.**
- **Decomposition seams.** Explicitly: which parts can change in parallel
  without conflicting, and which parts MUST be serialized (shared files, schema
  migrations, API contracts). Capture this — it becomes tranches and gates.

Stop grilling when you have enough to write a spec that leaves no
decomposition-blocking ambiguity. Don't interrogate for its own sake.

## Phase 4: Spec Sections

**Print phase banner.**

Present the spec in **~200-400 word sections**, and after EACH ask:

> "Does this look right? Anything to change before I continue?"

Do not proceed past a section the user hasn't accepted. Sections (adapt to the
program):

- Summary & goals (with measurable success criteria)
- Background & current state
- Scope & explicit non-goals
- Architecture (components: REUSED path vs NEW; the boundaries/seams)
- Data model & interfaces (contracts, migrations, compat)
- Non-functional requirements
- Rollout, risk & mitigation
- **Decomposition seams & parallelism** — the parallel-safe vs must-serialize
  analysis, phrased so `/design-tech-plan` can turn it into tranches + gates
- Alternatives considered (and why rejected)
- Open questions / assumptions

## Phase 5: Write the spec

**Print phase banner.**

Write `docs/tech-specs/000N-<slug>.md` (slug = 3-6 kebab-case words):

```markdown
# Tech Spec 000N: <Title>

## Status
DRAFT | APPROVED — <UTC timestamp>

## Summary & Goals
<what, why, and measurable success criteria>

## Background & Current State
<what exists today; findings from the codebase/wiki survey>

## Scope
### In scope
- ...
### Non-goals (explicit)
- ...

## Architecture
<components; each marked REUSED (path) or NEW; the boundaries/seams. Diagram
in Mermaid where it clarifies.>

## Data Model & Interfaces
<schemas, contracts, migrations, backward-compat>

## Non-Functional Requirements
<scale, perf, security, compliance, availability>

## Rollout, Risk & Mitigation
<phasing, flags, migration/backfill, blast radius, rollback>

## Decomposition Seams & Parallelism
<THE key section for the next skill. Enumerate the natural epics, and for each
the parts that can change in PARALLEL vs the parts that MUST be SERIALIZED
(shared files, schema migrations, API contracts). This is the raw material for
tranches and gates in /design-tech-plan.>

## Alternatives Considered
- <option> — rejected because <reason>

## Research Notes
<key findings + sources from Phase 2, or "n/a">

## Open Questions / Assumptions
- ...

## Provenance
- Seed: <verbatim $ARGUMENTS or "(interactive)">
- Wiki consulted: <yes: wiki_root | no>
- Deep research: <yes | no>
- Created by: /meta-orch:design-tech-spec
- Date: <UTC>
```

**Self-review** before presenting: no unresolved TBDs (convert to Open
Questions), no internal contradictions, non-goals populated, and the
Decomposition Seams section is concrete enough to plan against. Fix, then
present for approval. On approval, set `## Status` to `APPROVED — <UTC>`.

## Phase 6: Handoff

**Print phase banner.** Do not plan or create issues here.

```
Tech spec written: docs/tech-specs/000N-<slug>.md  (Status: APPROVED)

Next step — turn it into a coordinated plan + GitHub epics/stories:
  /meta-orch:design-tech-plan docs/tech-specs/000N-<slug>.md

That skill will decompose this into epics → tranches → gated stories, create
every GitHub issue with an embedded /make-session prompt, and write
docs/tech-plan/000N-<slug>.md.
```

---

## Verification Before Completion

Read the spec file back before claiming success; confirm `## Status` reflects
approval and the Decomposition Seams section is present and concrete. See
`plugins/agent-orch/policies/verification-before-completion.md`.

## What This Skill Does NOT Do

- No code, tests, or scaffolding.
- No epic/story decomposition, no GitHub issues (that's `/design-tech-plan`).
- No worktrees, branches, or PRs.
