# meta-orch — Meta-Orchestration for Huge, Multi-Session Work

`meta-orch` is a plugin that sits **above** `/agent-orch:make` and coordinates
**many parallel Claude Code sessions** — run by many engineers — against work
too big for one session: anywhere from 5 PRs under a single epic to 1,000+
stories across 35 epics. It uses **GitHub Issues on `code.ssnc.dev`** as the
shared state store and **never modifies the `agent-orch` plugin** — it wraps it.

> One coordinator session + N worker sessions. Each worker claims one story,
> hands it to `/agent-orch:make`, and reports state through GitHub. The
> coordinator loops and shows the whole picture.

---

## The mental model

```
                     ┌───────────────────────────────────────────────┐
                     │  GitHub Issues (code.ssnc.dev) = shared state   │
                     │  epics · stories · tranches · gates · locks ·   │
                     │  heartbeats · epic roll-ups                     │
                     └───────────────────────────────────────────────┘
                          ▲            ▲                     ▲
   design pipeline        │ create     │ read/write state    │ read state
 ┌──────────────────┐     │            │                     │
 │ /design-tech-spec│──┐  │      ┌─────────────┐       ┌───────────────────┐
 │  (grill me →     │  │  │      │ /make-session│  ...  │ /coordinate-session│
 │   000N spec)     │  │  │      │  worker #1   │       │  loop every 5m     │
 └──────────────────┘  ▼  │      └─────┬───────┘       └───────────────────┘
 ┌──────────────────┐ docs/│              │ wraps
 │ /design-tech-plan│──────┘              ▼
 │  spec → epics/    │            ┌──────────────────┐
 │  stories + issues │            │ /agent-orch:make │  (unchanged)
 └──────────────────┘            │  worktree→build→PR│
                                  └──────────────────┘
```

The four skills form a pipeline:

| Skill | Input | Output |
|-------|-------|--------|
| `/meta-orch:design-tech-spec` | a HUGE idea (1+ epics) | `docs/tech-specs/000N-name.md` (staff-level spec) |
| `/meta-orch:design-tech-plan` | an approved spec | `docs/tech-plan/000N-name.md` + **all GitHub epics/stories** |
| `/meta-orch:make-session` | the GitHub queue | loops per story: claim → `/make` → `/make-review` → `/make-validate` → `/make-clean` (merged) → next story |
| `/meta-orch:coordinate-session` | GitHub + worktrees | a looping fleet status report |

---

## Core concepts

- **Epic** — a GitHub issue (`meta:epic`) containing stories and, optionally,
  sub-epics (**epic-of-epics** — a parent epic completes only when its children
  do). Tracks aggregate progress.
- **Story** — a GitHub issue (`meta:story`). One story = one `/make-session` =
  one PR. Its body carries a self-contained, ready-to-run `/make-session` prompt
  between `<!-- make-session-prompt:start/end -->` markers.
- **Tranche** — a set of stories in an epic that may run **in parallel** because
  they don't conflict. Encoded as `meta:tranche:<epic>:<N>`. Tranche N+1's gate
  opens only when tranche N is merged.
- **Gate** — `meta:gate-open` (runnable) vs `meta:gate-blocked` (waiting on a
  dependency). Gates are how meta-orch keeps parallel sessions from stepping on
  each other: work that would merge-conflict is put in a later, gated tranche.
- **Lock** — an atomic claim (`meta:locked`) so exactly one session works a
  story. Serialized through a GitHub Actions concurrency workflow.
- **Heartbeat** — a rolling `meta:hb:<UTC_MINUTE>` label plus a pointer comment,
  proving a session is alive and pointing the coordinator at its `STATUS.md`.

All label names are configurable in `.meta-orch/config.md`.

---

## Setup

1. **Install the plugin** (marketplace). On the first meta-orch skill run in a
   repo, two files are auto-provisioned from the plugin's assets:
   - `.meta-orch/config.md` — session count (default 5), loop interval (default
     5m), heartbeat staleness, label names, lock settings, paths.
   - `.meta-orch/session-guardrails.md` — the operating contract every
     `/make-session` pulls into context (find work · lock · heartbeat · roll up ·
     release). Edit these to fit your team; both are safe to commit.
2. **Authenticate `gh` for the Enterprise host** (once per machine):
   ```bash
   GH_HOST=code.ssnc.dev gh auth login   # GitHub Enterprise Server, host code.ssnc.dev
   ```
3. **`/design-tech-plan` installs** `.github/workflows/meta-orch-lock.yml`.
   Commit & push it to the default branch so the **atomic Actions lock** is live.
   Until then (or if Actions are disabled), sessions use an optimistic
   label-based lock fallback.

---

## Configuration (`.meta-orch/config.md`)

| Key | Default | Meaning |
|-----|---------|---------|
| `session_count` | `5` | How many parallel worker sessions the team intends to run. A target, not a hard cap. |
| `min_ready_backlog` | `3` | Coordinator warns if fewer runnable stories than this. |
| `loop_interval` | `5m` | How often `/coordinate-session` re-polls. |
| `heartbeat_stale_after` | `20m` | A session with an older heartbeat is flagged as possibly dead. |
| `max_cycles` | `0` | Coordinator cycles before pausing (0 = until stopped). |
| `auto_open_next_tranche` | `false` | Auto-open the next gate when a tranche fully merges (else human-on-the-loop). |
| label names | `meta:*` | Full label vocabulary; rename to avoid collisions. |
| `lock_workflow` | `meta-orch-lock.yml` | The Actions concurrency lock. |
| `lock_fallback` | `optimistic-label` | Used when Actions are unavailable. |

The session count can **grow or shrink at any time** — engineers join or leave
an epic freely, and multiple epics can be worked at once (e.g. a team of 5 on 3
epics, each engineer running 3–7 sessions). meta-orch doesn't care how many
sessions exist; the lock guarantees no two claim the same story.

---

## The race-condition protocol (why sessions start one at a time)

Workers start in separate windows and would otherwise race for the same story.
`/make-session` resolves this with a strict **RED → lock → GREEN** sequence:

1. 🔴 On start it prints a big **RED warning**: *do not start another
   `/make-session` yet.*
2. It finds eligible stories (open · gate-open · unlocked), scoped to an epic if
   you passed one, else across all epics, and asks you to **confirm the pick**.
3. The instant you confirm, it **atomically locks** the issue (Actions
   concurrency workflow; optimistic fallback otherwise). If someone beat it to
   the story, the lock fails and it picks the next one — still no green light.
4. 🟢 Once the lock is held it prints a **GREEN all-clear**: *you may start the
   next `/make-session` now.* The claim window is a few seconds, so throughput
   stays high while claims stay safe.

Then it pulls `session-guardrails.md` + the story's embedded prompt and drives
the **full `/make-*` pipeline** — it does not stop at the PR:

```
find + lock story
  → /agent-orch:make          worktree → build → PR (Closes #N)
  → /agent-orch:make-review   per-skill: one PR comment per review skill
  → /agent-orch:make-validate loop until CI is green (max 3 rounds)
  → /agent-orch:make-clean    merge (squash), close story, free the lock
  → open the next tranche's gate + epic roll-up
  → LOOP back to find the next story
```

`/make-session` owns all GitHub state and the heartbeat throughout, and is the
sole driver of the pipeline — the `/make-*` skills themselves stay
tracker-agnostic and untouched.

---

## How a team runs it

```
# One engineer — the coordinator (loops every 5m):
/meta-orch:coordinate-session
#   or, more durable across a closed laptop:
/loop 5m /meta-orch:coordinate-session once

# Up to session_count engineers — the workers. Start ONE AT A TIME,
# waiting for each one's 🟢 GREEN all-clear before starting the next:
/meta-orch:make-session              # auto-pick a story across epics
/meta-orch:make-session #123         # scope to epic #123 (and its sub-epics)
```

Each worker **loops through the whole `/make-*` pipeline per story and then picks
up the next one automatically** — the engineer does not re-invoke it between
stories. Per story: `/make` (→ PR with `Closes #<N>`), `/make-review` in
per-skill mode (one PR comment per review skill — typically 3, plus `/review-pr`
when the graph plugin is installed), `/make-validate` looped until CI is green,
then `/make-clean` to merge. The story stays **locked until the PR merges** (so a
story only "in review" isn't re-claimed), then the lock frees and the next
tranche's gate opens (automatically if `auto_open_next_tranche: true`, else the
coordinator recommends it). The loop ends when no eligible story remains or the
engineer stops it. If CI can't go green in 3 validate rounds, that story pauses
for the human and the loop does not advance past it.

---

## Heartbeat & status — without touching agent-orch

meta-orch must observe live sessions **without modifying `agent-orch`**. It does
this with signals `/make-session` owns:

- **Rolling label** `meta:hb:<UTC_MINUTE>` on the story — readable by the
  coordinator from the label set alone, no clone needed.
- **Pointer comment** `🧭 session=… branch=… worktree=…` — tells the coordinator
  where the worktree is so it can read the `STATUS.md` that `/agent-orch:build`
  *already* writes under `ssnc-agent-orch/<YYYY>/<MM>/<DD>/<slug>/`.

The coordinator reads those, compares heartbeat age to `heartbeat_stale_after`,
reads `STATUS.md` for sessions whose branch it can see locally (and falls back to
GitHub-only status for other engineers' machines), and reports: per-epic
progress, who's working on what and how it's going, what's in review, what's
**ready to run now**, and what's still gated. Stale sessions are flagged; their
locks are reclaimable (with confirmation).

---

## Design principles

1. **agent-orch is never modified.** meta-orch wraps `/make` and reads its
   `STATUS.md`; all coordination is GitHub labels/comments/Actions.
2. **State lives in GitHub, not on disk.** Worktrees are ephemeral; the issue is
   the record.
3. **One session per story, always.** The lock is acquired before any build
   work; GREEN only fires once the claim is atomic.
4. **Gates prevent conflicts by construction.** Parallel-safe stories share a
   tranche; conflicting work is serialized into a later gated tranche.
5. **Human-on-the-loop.** Only `claude-code-agent-harness` stories are
   auto-pickable; gate-opening and stale-lock release default to human
   confirmation.

---

## Relationship to the other plugins

- **agent-orch** — provides `/make`, `/build`, worktrees, and `STATUS.md`.
  meta-orch orchestrates many of these; it does not change them.
- **team-work** — if a `/wiki` is initialized (`.team-work/wiki-config.md`),
  `/design-tech-spec` consults it for domain rules while grilling.
- **GitHub Issues backend** — meta-orch's state model mirrors agent-orch's
  `/github-issues` governance (`claude-code-agent-harness`, `status:*`), so the
  two are consistent on `code.ssnc.dev`.

See the [README](../README.md) and [CHEAT-SHEET](../CHEAT-SHEET.md) for the
command-level reference.
