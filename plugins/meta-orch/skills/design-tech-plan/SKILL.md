---
name: design-tech-plan
description: Decompose an approved tech spec into epics → tranches → gated stories, CREATE every GitHub epic/story issue via gh on code.ssnc.dev (epics can be epics-of-epics), embed a ready-to-run /make-session prompt in each story issue, install the meta-orch lock workflow + labels, and record the whole plan in docs/tech-plan/000N-name.md. Step 2 of the meta-orch pipeline. Usage: /meta-orch:design-tech-plan <path-to-tech-spec | 000N>
---

# Design Tech Plan — spec → coordinated GitHub work

You are turning an **approved** `docs/tech-specs/000N-name.md` into an
executable, coordinated plan for many parallel Claude Code sessions. This is
step 2 of the meta-orch pipeline. You will:

1. Decompose the spec into **epics** (which can nest — epic-of-epics) and
   **stories** (one story = one `/make-session` = one PR).
2. Organize stories into **tranches + gates**: what can run in PARALLEL vs what
   must be SERIALIZED to avoid merge conflicts.
3. **Create every GitHub epic/story issue** on `code.ssnc.dev` via `gh`, each
   story carrying an embedded, ready-to-run `/make-session` prompt.
4. Install the meta-orch lock workflow and labels.
5. Write `docs/tech-plan/000N-name.md` recording every issue, tranche, gate, and
   per-tranche prompts.

> All coordination state lives in **GitHub Issues** — see
> `.meta-orch/session-guardrails.md`. This skill and `/make-session` are the two
> places that mutate it; `/agent-orch:make` stays tracker-agnostic.

## Hard prerequisite

An **APPROVED** tech spec must exist. If the referenced spec's `## Status` is
not `APPROVED`, stop and tell the user to finish `/meta-orch:design-tech-spec`
first.

---

## Phase Map

Print a banner at the start of every phase.

| N | Phase name                                                  |
|---|-------------------------------------------------------------|
| 0 | Setup: config, resolve spec, gh auth, plan number           |
| 1 | Decompose: epics (nesting), stories, per-story prompts       |
| 2 | Tranches & gates: parallel-safe vs must-serialize            |
| 3 | Review the decomposition WITH the user (approval gate)       |
| 4 | Bootstrap GitHub: labels + lock workflow                     |
| 5 | Create issues: epics first, then stories (embed prompts)     |
| 6 | Write docs/tech-plan/000N-name.md                            |
| 7 | Handoff to /make-session + /coordinate-session               |

---

## Phase 0: Setup

**Print phase banner.**

1. Read `.meta-orch/config.md` (labels, `tech_plans_dir`, `lock_workflow`,
   `tranche_label_prefix`, repo/host). If it's absent, provision it and
   `session-guardrails.md` from `${CLAUDE_PLUGIN_ROOT}/assets/` (same as
   `/design-tech-spec` Phase 0) and tell the user.
2. **Resolve the spec.** `$ARGUMENTS` is a path or a 4-digit ordinal. Read it.
   Verify `## Status: APPROVED`. Extract especially the **Decomposition Seams &
   Parallelism** section — it is the raw material for tranches/gates.
3. **GitHub auth** (Enterprise host):
   ```bash
   GH_HOST=code.ssnc.dev gh auth status
   ```
   If not authed: `GH_HOST=code.ssnc.dev gh auth login` (Enterprise Server,
   host `code.ssnc.dev`). Resolve the repo: `config.md` `repo:` or
   `git remote get-url origin`.
4. **Plan number** matches the spec ordinal (spec `0004` → plan `0004`). Read
   `tech_plans_dir` (default `docs/tech-plan`).

## Phase 1: Decompose

**Print phase banner.**

From the spec, produce a hierarchy. Think like a staff engineer breaking a
program into shippable units.

- **Epics.** Each independently valuable slice from the spec's architecture/seams
  becomes an epic. Epics MAY nest: if the program is large, model parent epics
  containing child epics (epic-of-epics). Record parent↔child links.
- **Stories.** Each epic breaks into stories where **one story = one focused PR
  = one `/make-session`**. Right-size: a story should be completable by a single
  `/agent-orch:make` run. Split anything that would touch too much.
- **Per-story `/make-session` prompt.** For each story, draft the prompt that
  will be embedded in its GitHub issue and later handed to `/agent-orch:make`.
  It must be self-contained (a fresh session with no chat history runs it):
  - what to build (crisp, testable)
  - acceptance criteria
  - files/areas likely touched (from the spec)
  - explicit non-goals / "do not touch" (this is how gates prevent conflicts)
  - links: spec path, epic issue (filled in Phase 5), sibling stories to avoid
    colliding with

The count is whatever the spec demands — could be 5 stories under 1 epic, or
1,000 stories under 35 epics. Do not artificially cap it.

## Phase 2: Tranches & Gates

**Print phase banner.**

Using the spec's parallel-safe vs must-serialize analysis, assign every story to
a **tranche** within its epic:

- **Tranche 0** = stories that can start immediately (no unmet dependency).
- **Tranche N+1** = stories that must wait until tranche N is MERGED (they share
  files, depend on a migration/contract landed earlier, or would otherwise
  merge-conflict).
- Stories **within the same tranche run in PARALLEL** — they are, by
  construction, mutually non-conflicting.

Encode:
- Tranche → label `meta:tranche:<epic>:<N>` (prefix from config).
- Tranche 0 stories → `meta:gate-open`. Later tranches → `meta:gate-blocked`.
- Cross-story/epic dependencies → an explicit `Depends on: #a, #b` /
  `Blocks: #c` block in each story body, so the gate rationale is legible.
- Epic-of-epics: a parent epic's gate opens only when its child epics complete.

Sanity checks: no story appears in two tranches; no dependency cycle; every
`meta:gate-blocked` story names what unblocks it.

## Phase 3: Review With The User (approval gate)

**Print phase banner.**

Before creating ANY GitHub issue, present the full decomposition and get
explicit approval — issue creation at scale is expensive to undo:

```
Plan preview for spec 000N: <title>

Epics: <count>   Stories: <count>   Tranches (max depth): <n>

<tree>
Epic #E1 <title>  [epic-of-epics: children E2, E3]
  Tranche 0 (parallel, gate-open):
    - S1 <title>   touches: <areas>
    - S2 <title>   touches: <areas>
  Tranche 1 (gate-blocked until T0 merged):
    - S3 <title>   depends on: S1
...

Proceed to create these <count> GitHub issues on <OWNER/REPO>? (yes / edit / abort)
```

Incorporate edits and re-present until approved. **Only then** create issues.

## Phase 4: Bootstrap GitHub

**Print phase banner.**

1. **Labels** — create any missing meta-orch labels (idempotent), per
   `session-guardrails.md` §9 and the names in `config.md`.
2. **Lock workflow** — install the concurrency lock so `/make-session` claims
   are atomic:
   ```bash
   mkdir -p .github/workflows
   cp "${CLAUDE_PLUGIN_ROOT}/assets/workflows/meta-orch-lock.yml" \
      .github/workflows/meta-orch-lock.yml
   ```
   Tell the user this workflow was added and must be committed & pushed to the
   default branch before the Actions lock is usable (until then `/make-session`
   uses the optimistic-label fallback). If the repo has Actions disabled, note
   that meta-orch will use the fallback lock.

## Phase 5: Create Issues

**Print phase banner.** Order matters so links resolve.

1. **Create epics first** (parents before children so child bodies can link the
   parent). For each epic:
   ```bash
   GH_HOST=code.ssnc.dev gh issue create \
     --title "[EPIC] <title>" \
     --label meta:epic --label claude-code-agent-harness \
     --body "<epic body>"
   ```
   Epic body includes: goal, link to the spec, the tranche map (filled with
   story numbers after step 2), parent/child epic links, and a live checklist of
   its stories. Capture each returned issue number.
2. **Create stories** under each epic. For each:
   ```bash
   GH_HOST=code.ssnc.dev gh issue create \
     --title "<story title>" \
     --label meta:story --label claude-code-agent-harness \
     --label "meta:tranche:<epic>:<N>" \
     --label <meta:gate-open | meta:gate-blocked> \
     --body "<story body>"
   ```
   **Story body template** (the embedded prompt is what `/make-session` extracts):
   ```markdown
   Epic: #<epic-number>
   Spec: docs/tech-specs/000N-name.md
   Tranche: <N>
   Depends on: #<a>, #<b>   (or "none")
   Blocks: #<c>             (or "none")

   ## Acceptance Criteria
   - ...

   <!-- make-session-prompt:start -->
   <the self-contained /agent-orch:make prompt from Phase 1: what to build,
   acceptance criteria, files/areas, explicit do-not-touch, links>
   <!-- make-session-prompt:end -->
   ```
3. **Backfill links.** Update each epic body's checklist/tranche map with the
   real story numbers, and each story's `Depends on/Blocks` with real numbers.
4. Report a running tally so the user sees progress on large batches
   (e.g. "Created 40/240 stories…").

> **Scale note.** For hundreds of issues, create them in batches and keep a
> local map (title → issue number) as you go so link backfill is reliable. If
> `gh` rate-limits, pause and resume; never silently drop a story — the plan
> file (Phase 6) must list every intended issue with its real number.

## Phase 6: Write the plan file

**Print phase banner.**

Write `docs/tech-plan/000N-<slug>.md`:

```markdown
# Tech Plan 000N: <Title>

## Source
- Spec: docs/tech-specs/000N-<slug>.md
- Repo: OWNER/REPO on code.ssnc.dev
- Created by: /meta-orch:design-tech-plan on <UTC>

## Coordination
- Sessions target: <config session_count>
- Lock: GitHub Actions (.github/workflows/meta-orch-lock.yml) + optimistic fallback
- Guardrails: .meta-orch/session-guardrails.md

## Epic Tree
- Epic #E1 — <title>  (children: #E2, #E3)
  - ...

## Tranches & Gates (per epic)
### Epic #E1 — <title>
| Tranche | Gate | Stories | Runs in parallel with | Unblocked by |
|---------|------|---------|-----------------------|--------------|
| 0 | open | #S1, #S2 | each other | — |
| 1 | blocked | #S3 | — | T0 merged (#S1) |

## Stories (every issue)
| # | Title | Epic | Tranche | Gate | Depends on |
|---|-------|------|---------|------|------------|
| #S1 | ... | #E1 | 0 | open | none |

## Per-tranche /make-session prompts
> Copy-ready. Each session runs ONE of these (or lets /make-session auto-pick).

### Epic #E1 · Tranche 0 (parallel)
- **#S1 — <title>**
  ```
  /meta-orch:make-session <E1>
  ```
  (the session auto-picks an open, gate-open story in epic E1; to force this one,
  confirm #S1 when prompted.) Embedded prompt lives in issue #S1.
...

## How to run
1. One engineer starts /meta-orch:coordinate-session (the loop).
2. Up to <session_count> engineers each start /meta-orch:make-session [<epic>]
   ONE AT A TIME (wait for the green all-clear between starts). Each session then
   loops on its own through the full /make-* pipeline per story
   (/make → /make-review → /make-validate → /make-clean) and picks up the next
   story automatically — no re-invocation needed.
```

## Phase 7: Handoff

**Print phase banner.**

```
Plan created: docs/tech-plan/000N-<slug>.md
GitHub: <E> epics, <S> stories created on OWNER/REPO.

Start work:
  # 1 coordinator (loops every <interval> from .meta-orch/config.md):
  /meta-orch:coordinate-session

  # N workers — start ONE AT A TIME, wait for the green all-clear. Each then
  # loops through /make → /make-review → /make-validate → /make-clean per story
  # and auto-advances to the next story:
  /meta-orch:make-session            # auto-pick across epics
  /meta-orch:make-session #<E1>      # scope to one epic

Reminder: commit & push .github/workflows/meta-orch-lock.yml to the default
branch so the atomic Actions lock is active (fallback lock works meanwhile).
```

---

## Verification Before Completion

Before claiming success: confirm the plan file exists and lists every created
issue with its REAL number; spot-check that a couple of created issues actually
exist (`gh issue view <N>`) and contain the `make-session-prompt` block; confirm
labels and the lock workflow file are present. Never report issues as created
without verifying. See `plugins/agent-orch/policies/verification-before-completion.md`.

## What This Skill Does NOT Do

- No code changes (only issue creation + the lock workflow + the plan doc).
- It does not run `/make-session` or start builds — it sets the table for them.
