---
name: brainstorm
description: Socratic design refinement BEFORE implementation. Turns a rough idea into an approved DESIGN.md through one-question-at-a-time dialogue. Hard gate - no code until the design is approved. Output feeds /agent-orch:build. Usage: /agent-orch:brainstorm [topic or JIRA-ID] (optional)
---

# Brainstorm — Design Before Code

You are running a **structured discovery and design** session. The goal is to turn a rough idea
into an approved, written design — **before any implementation begins**. The output is a
`DESIGN.md` that `/agent-orch:build` can consume directly (it skips its own requirements phase
when a DESIGN.md is present).

> **Attribution**: This skill's Socratic refinement (one question at a time, multiple-choice
> preferred, YAGNI ruthlessly, 200-300 word design sections with incremental approval) and the
> hard pre-implementation gate are derived from the [superpowers plugin](https://github.com/obra/superpowers)
> brainstorming pattern by Jesse Vincent (MIT License).

## When to Use

- You have an idea but the requirements, scope, or approach are not yet pinned down.
- The work is non-trivial enough that jumping straight to `/build` risks building the wrong thing.
- You want a durable, reviewable design artifact before committing agents (and tokens) to a build.

For a fully-specified change (clear scope, known approach), skip this and go straight to
`/agent-orch:build` or `/agent-orch:make`.

## The Hard Gate (Rigid — do not adapt away)

**No implementation, scaffolding, file edits, or "let me just start" until a design is presented
and the user approves it.** This applies to *every* topic, including ones that look simple —
"simple" projects are where unexamined assumptions cause the most wasted work. If you feel the
urge to start coding, that is the signal to slow down and finish the design first.

This skill does NOT write production code. Its only output is `DESIGN.md`.

## Key Principles

1. **One question at a time.** Never batch. Prefer multiple-choice when the option space is known.
2. **YAGNI ruthlessly.** Challenge every "nice to have". Push out-of-scope items into an explicit
   "Out of Scope" list rather than designing for them.
3. **Explore alternatives.** Offer 2-3 approaches with honest trade-offs; recommend one.
4. **Incremental validation.** Present the design in 200-300 word sections and get approval per
   section — don't dump a whole design and ask "ok?".
5. **Evidence over assumption.** Read the codebase before proposing; don't invent constraints.

---

## Phase Map

At the start of every phase, print a banner so the user knows where we are:

```
═══════════════════════════════════════════════════════
/brainstorm phase <label>: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| Label | Phase name                                   |
|-------|----------------------------------------------|
| 0     | Detect existing design / Jira intake         |
| 1     | Context (read codebase, optional Architect)  |
| 2     | Socratic refinement (one question at a time) |
| 3     | Approaches + design sections (per-section approval) |
| 4     | Write DESIGN.md + self-review                |
| 5     | Transition to /build                         |

---

## Phase 0: Detect Existing Design / Intake

**Print phase banner.**

1. **Existing design check.** Look for a recent `DESIGN.md` under the session tree
   (`ssnc-agent-orch/**/DESIGN.md`, newest first). If one exists and is relevant to `$ARGUMENTS`,
   ask:
   ```
   Found an existing design: <path>
   (a) Refine / extend it
   (b) Start a fresh design
   ```
   If (a), load it as the working draft and continue at Phase 2 with its open questions.

2. **JIRA-ID intake.** If `$ARGUMENTS` matches `[A-Z]+-\d+`, read `.claude/rules/jira.md`; if Jira
   context exists, fetch the issue (`mcp__jira__jira_getIssue`) and use its summary/description/AC
   as the starting context for Phase 2 (this is input to refine, not a finished design).

3. Otherwise, use `$ARGUMENTS` (if any) as the seed idea and continue.

## Phase 1: Context

**Print phase banner.**

1. Read `CLAUDE.md` (project standards) if present.
2. Examine the existing codebase structure relevant to the idea — look for existing patterns,
   utilities, and services you should reuse rather than rebuild.
3. **Optional Architect pass (non-trivial topics only).** For anything touching multiple
   components or unfamiliar areas, launch the Architect read-only to surface existing patterns
   and reuse opportunities. Keep this lightweight — it informs your questions, it does not design.

   ```
   Task tool call:
     subagent_type: "agent-orch:orchestrate-architect"
     description: "Surface patterns for design"
     prompt: "READ-ONLY. Do not write any files or code.
              Topic under design: <seed idea / Jira summary>.
              Read CLAUDE.md and scan the codebase. Report:
              - Existing patterns/utilities/services relevant to this idea that should be reused
              - Components/layers this would likely touch
              - Constraints or risks worth raising in design
              Return a concise findings list — no plan, no implementation."
   ```

   Use the findings to ask sharper questions. Do not skip straight to a plan.

## Phase 2: Socratic Refinement

**Print phase banner.**

**CRITICAL: ask questions ONE AT A TIME. Prefer multiple choice.**

Work through, as needed:

1. **What** — what exactly is being built? What's the smallest version that delivers value?
2. **Why** — what problem does it solve? What does success look like?
3. **Who** — who uses it? What's their workflow?
4. **Constraints** — performance, security, compatibility, deadlines, existing systems.
5. **Scope boundaries** — what is explicitly NOT part of this?

**Scope assessment.** If the request is large enough to be several projects, say so and propose
decomposing it into sub-projects. Pick the first one to design now; list the rest as follow-ups.

After each answer, integrate it and ask the next most important question. Stop asking when you
have enough to design — don't interrogate for its own sake.

## Phase 3: Approaches + Design Sections

**Print phase banner.**

1. **Approaches.** Present 2-3 viable approaches with trade-offs (complexity, risk, time, reuse).
   Recommend one and say why. Get the user's pick.

2. **Design in sections.** Present the design in **200-300 word sections**, and after EACH section
   ask:
   > "Does this look right so far? Any changes before I continue?"

   Suggested sections (adapt to the topic):
   - Overview & goal
   - Architecture / components touched (note reused vs new)
   - Data model / interfaces (Consumes / Produces where relevant)
   - Key decisions & trade-offs (with the rejected alternatives)
   - Out of scope (explicit)
   - Open questions / risks
   - Rough phasing (high-level milestones — NOT a task breakdown; that's `/build`'s job)

   Incorporate feedback before moving to the next section. Do not proceed past a section the user
   hasn't accepted.

## Phase 4: Write DESIGN.md + Self-Review

**Print phase banner.**

1. **Determine the session directory** using the same date-tree convention as `/build`:
   ```
   ssnc-agent-orch/<YYYY>/<MM>/<DD>/<feature-slug>/
   ```
   Slugify a 2-4 word feature name from the conversation (lowercase, hyphens). If the dir exists,
   append `-2`, `-3`. Create `ssnc-agent-orch/README.md` once if it doesn't exist (same template
   as `/build`).

2. **Write `${SESSION_DIR}/DESIGN.md`:**

   ```markdown
   # Design: [Feature Name]

   ## Status
   APPROVED — [UTC timestamp]   (set once the user approves; until then: DRAFT)

   ## Problem & Goal
   [What problem, why now, what success looks like]

   ## Users / Context
   [Who uses this and how]

   ## Approach
   [The chosen approach and a one-line note on why, over the alternatives considered]

   ## Architecture
   [Components touched. Mark each as REUSED (path) or NEW. Note key interfaces:
   Consumes / Produces signatures where they matter.]

   ## Key Decisions
   - [Decision] — chose X over Y because Z

   ## Out of Scope
   - [Explicitly excluded item]

   ## Open Questions / Risks
   - [Anything unresolved — flag for /build to confirm]

   ## Rough Phasing
   - [High-level milestone 1]
   - [High-level milestone 2]

   ## Provenance
   - Seed prompt: [verbatim $ARGUMENTS or "(interactive)"]
   - Jira: [JIRA-ID or "(none)"]
   - Created by: /agent-orch:brainstorm
   ```

3. **Self-review before presenting.** Re-read the draft and check:
   - No placeholders or "TBD" left unresolved (turn them into Open Questions instead).
   - Internal consistency (no section contradicts another).
   - Scope is bounded (Out of Scope is populated).
   - No ambiguity that would block a builder.

   Fix issues, then present the final design to the user for approval. On approval, set
   `## Status` to `APPROVED` with the timestamp.

## Phase 5: Transition to Build

**Print phase banner.**

Do **not** start implementing. Hand off:

```
Design approved and saved: ${SESSION_DIR}/DESIGN.md

Next step — build it:
  /agent-orch:build ${SESSION_DIR}/DESIGN.md      (standalone)
  /agent-orch:make  ${SESSION_DIR}/DESIGN.md      (full feature lifecycle: worktree/branch + PR)

/build will detect this design, confirm scope with you, and skip straight to planning —
no need to re-gather requirements.
```

If the user explicitly asks to proceed now, you may invoke `/agent-orch:build` with the DESIGN.md
path as the argument — but the design must be approved first.

---

## Verification Before Completion

Before telling the user the design is ready, confirm `DESIGN.md` was actually written (read it
back) and that `## Status` reflects approval. Don't claim "design saved" without the file on disk.
See [verification-before-completion policy](../../policies/verification-before-completion.md).

## What This Skill Does NOT Do

- It does not write production code, tests, or scaffolding.
- It does not create PLAN.md or launch Builder/Validator (that's `/build`).
- It does not open worktrees, branches, or PRs (that's `/make`).

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.brainstorm:` entry. If the file is absent, has no
entry for this skill, or the entry is empty, **run exactly as documented above — no
behaviour change.** This is the default and most common case.

If an entry exists, this skill exposes these hook points:
- `before` — targets run before discovery begins (e.g. inject domain context to inform questions)
- `after` — targets run after `DESIGN.md` is approved (e.g. a design-review checklist before handoff)

Run any listed targets in order, following the shared resolver in
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline).
Tell the user when you run an extension target. A failing target is surfaced but does
NOT abort the skill unless the user aborts. Full contract:
`plugins/agent-orch/rules/extensibility.md`.
