# meta-orch Session Guardrails

> **This file is the operating contract for a coordinated `/make-session`.**
> `/meta-orch:make-session` pulls this ENTIRE file into context and forwards it
> to `/agent-orch:make` alongside the story prompt. It is the single source of
> truth for how a session claims work, records state, heartbeats, and hands off
> — using GitHub Issues on `code.ssnc.dev` as shared state.
>
> It was provisioned from the plugin's asset on first run. Edit it to fit your
> team; every session reads the copy in `.meta-orch/`. Companion:
> [`.meta-orch/config.md`](config.md) (labels, intervals, session count).
>
> **Design constraint:** meta-orch coordinates *around* `/agent-orch:make` and
> `/agent-orch:build` without modifying them. Everything here is implemented by
> `/make-session` and this document — not by changing agent-orch. Heartbeat and
> state come from GitHub labels/comments plus the session's own worktree
> `STATUS.md` that `/agent-orch:build` already writes.

---

## 0. Vocabulary

| Term | Meaning |
|------|---------|
| **Epic** | A GitHub issue labelled `meta:epic`. A container for stories and, optionally, sub-epics (epic-of-epics). Tracks aggregate progress. |
| **Story** | A GitHub issue labelled `meta:story`. One unit of `/make-session` work → one PR. Carries an embedded `/make-session` prompt in its body. |
| **Tranche** | A set of stories in one epic that may run in parallel without conflicting. Encoded as `meta:tranche:<epic>:<N>`. Tranche N+1's gate opens when tranche N is merged. |
| **Gate** | Whether a story is eligible to be worked. `meta:gate-open` ⇒ runnable; `meta:gate-blocked` ⇒ waiting on a dependency. |
| **Lock** | A short-lived, atomic claim on a story so only one session works it. Enforced by a GitHub Actions concurrency workflow (§4). |
| **Heartbeat** | A rolling label + comment proving a session is alive and showing where it is (§5). |

All label NAMES are read from `.meta-orch/config.md`. This document uses the
default names for illustration.

---

## 1. Environment

Every `gh` and `git` command runs against the Enterprise host:

```bash
export GH_HOST=code.ssnc.dev
```

Identity is resolved **live** with the literal `@me` — never cached. Use the
issue NUMBER only; the local `origin` remote already points at the right repo.

---

## 2. The one-at-a-time start protocol (race-condition guard)

Multiple engineers spin up `/make-session` in separate Claude Code windows.
If two start at the same instant they can race for the same story. meta-orch
serialises the *claim*, not the *work*:

1. **RED WARNING first.** `/make-session` prints a large red banner: *do NOT
   start another `/make-session` until this one has locked its story.*
2. **Discover candidates** (§3) — open, gate-open, unlocked stories.
3. **User confirms** the pick (or picks from a short list).
4. **Lock immediately** (§4) — the atomic claim happens the instant the user
   confirms, before any build work.
5. **GREEN ALL-CLEAR.** Once the lock is held, `/make-session` prints a green
   banner: *you may now start the next `/make-session` in another window.*
6. Only then does it pull this file + the story prompt and invoke
   `/agent-orch:make`.

The window between RED and GREEN is a few seconds (a discovery query + a lock
call), so throughput stays high while the claim stays safe.

---

## 3. Finding work

Scope depends on how `/make-session` was invoked:

- `/meta-orch:make-session <epic-issue-number>` → only stories **under that
  epic** (and, transitively, its sub-epics).
- `/meta-orch:make-session` (no arg) → stories **across all epics**.

A story is **eligible** when ALL hold:

- labelled `meta:story` AND `claude-code-agent-harness`
- state `open`
- labelled `meta:gate-open` and NOT `meta:gate-blocked`
- NOT labelled `meta:locked`
- not already assigned to another active session (no fresh heartbeat from
  someone else — see §5)

Discovery query (epic-scoped variant adds the epic linkage filter):

```bash
GH_HOST=code.ssnc.dev gh issue list --state open \
  --label meta:story --label meta:gate-open --label claude-code-agent-harness \
  --json number,title,labels,assignees,body,url --limit 100
```

Then drop any carrying `meta:locked` or `meta:gate-blocked`, and (epic-scoped)
keep only those whose body references the target epic (`Epic: #<n>`) or a
sub-epic of it. **Ordering:** lowest tranche number first, then lowest issue
number, so tranches drain in order.

Present up to ~7 candidates to the user with number, title, epic, tranche.
Recommend the top one. The user confirms or picks another before any lock.

---

## 4. Locking (atomic claim)

### Primary: GitHub Actions concurrency lock

The plan setup installs `.github/workflows/meta-orch-lock.yml`. It uses a
`concurrency` group keyed to the story so GitHub runs **one lock attempt at a
time** per story. `/make-session` triggers it and waits for success:

```bash
GH_HOST=code.ssnc.dev gh workflow run meta-orch-lock.yml \
  -f issue=<N> -f actor="$(GH_HOST=code.ssnc.dev gh api user --jq .login 2>/dev/null || echo me)" \
  -f session_id="<SESSION_ID>"
# then poll the most recent run for this issue until conclusion
GH_HOST=code.ssnc.dev gh run list --workflow meta-orch-lock.yml --limit 1 \
  --json databaseId,status,conclusion
```

The workflow (see the shipped file) re-reads the issue, and only if it is still
unlocked does it add `meta:locked`, assign `@me` (the triggering actor), and
comment the claim. If the issue is already locked, the workflow **fails** — and
`/make-session` treats a failed lock as "someone beat me to it", returns to §3,
and picks the next candidate.

### Fallback: optimistic label lock (Actions unavailable)

If Actions are disabled or the workflow is absent (`config.md` →
`lock_fallback: optimistic-label`):

```bash
# 1. add the lock label
GH_HOST=code.ssnc.dev gh issue edit <N> --add-label meta:locked --add-assignee @me
# 2. RE-READ to confirm WE hold it (last-writer check)
GH_HOST=code.ssnc.dev gh issue view <N> --json assignees,labels
```

If the re-read shows another assignee ordered before us or a conflicting claim
comment with an earlier timestamp, **release** (remove our label) and pick the
next story. This is best-effort; the Actions lock is the real guarantee.

### On successful lock

```bash
GH_HOST=code.ssnc.dev gh issue edit <N> \
  --add-label status:in-progress --remove-label meta:gate-open
GH_HOST=code.ssnc.dev gh issue comment <N> --body \
  "🔒 Locked by session <SESSION_ID> (@me) at <UTC>. Starting /agent-orch:make."
```

Then print the GREEN all-clear (§2 step 5).

---

## 5. Heartbeat (no agent-orch changes)

The coordinator needs to know a session is alive and roughly where it is,
**without** modifying agent-orch. Two signals, both owned by `/make-session`:

### 5a. Rolling heartbeat label (cheap, read without cloning)

On lock, and then at least once per meaningful step (and whenever
`/make-session` regains control between `/make` phases), update a minute-stamped
label so the newest beat is always visible in the issue's label set:

```bash
NOW=$(date -u +%Y%m%dT%H%MZ)          # e.g. 20260705T1432Z
NEW="meta:hb:${NOW}"
# add the new beat, remove any prior meta:hb:* on this issue
OLD=$(GH_HOST=code.ssnc.dev gh issue view <N> --json labels \
  --jq '.labels[].name | select(startswith("meta:hb:"))')
GH_HOST=code.ssnc.dev gh issue edit <N> --add-label "$NEW"
for l in $OLD; do [ "$l" != "$NEW" ] && \
  GH_HOST=code.ssnc.dev gh issue edit <N> --remove-label "$l"; done
```

The coordinator reads `meta:hb:<ts>` and compares `<ts>` against
`heartbeat_stale_after` from `config.md`. A stale heartbeat ⇒ the session may
have died; the coordinator flags it for a human.

### 5b. Session pointer comment (where the worktree is)

Once, right after `/agent-orch:make` creates the worktree/branch, post a comment
recording where the live status lives so the coordinator can read `STATUS.md`:

```bash
GH_HOST=code.ssnc.dev gh issue comment <N> --body \
  "🧭 session=<SESSION_ID> branch=<branch> worktree=<worktree_path> host=$(hostname)"
```

`/agent-orch:build` already writes `STATUS.md` under
`ssnc-agent-orch/<YYYY>/<MM>/<DD>/<slug>/` in that worktree/branch. The
coordinator uses the branch from this comment to read that file (§ coordinator
in `/coordinate-session`). meta-orch never asks agent-orch to emit anything new
— it just points at what agent-orch already produces.

---

## 6. Working the story (the full /make-* pipeline)

After GREEN all-clear, `/make-session` drives the story ALL THE WAY to a merged
PR by running the `/make-*` skills in sequence — it does not stop at the PR:

1. Extracts the embedded `/make-session` prompt from the story body (the block
   between `<!-- make-session-prompt:start -->` and `<!-- ...:end -->` that
   `/design-tech-plan` wrote).
2. Concatenates: **this guardrails file** + the story prompt + the story/epic
   numbers.
3. **`/agent-orch:make`** with that combined context, Jira turned off (this
   repo's coordination tracker is GitHub, via meta-orch). `/make` runs its own
   worktree→build→PR lifecycle unchanged. Ensure the PR body has `Closes #<N>`.
4. **`/agent-orch:make-review` in per-skill mode** (`args: "post review as
   comment on PR for each of the skills"`) so each review skill's findings are
   posted as its own comment on the PR — typically 3 comments (`/code-review`,
   `/security-review`, `/review`), plus `/review-pr` if the graph plugin is
   present. Verify the comments actually landed on the PR; post them yourself if
   `/make-review` only printed them.
5. **`/agent-orch:make-validate`, looped until CI is green** (fixes CI failures
   and review comments via `/build`). Cap at 3 rounds; if still red, stop and
   surface to the user, leaving the story locked + in-review.
6. **`/agent-orch:make-clean`** to merge (squash), delete the branch, and clean
   the worktree. `Closes #<N>` closes the story on merge.
7. Then release the lock, advance the gate (§7), and loop to the next story.

Refresh the heartbeat (§5a) whenever control returns between these steps.

`/make-session` is the ONLY place GitHub story/epic state is mutated for a
session, and the ONLY driver of the `/make-*` pipeline. `/agent-orch:make`,
`/build`, `/make-review`, `/make-validate`, and `/make-clean` remain
tracker-agnostic and untouched — meta-orch orchestrates them.

---

## 7. Epic roll-up

When a story transitions, `/make-session` also nudges its epic so the epic issue
reflects live progress (a human or the coordinator reads the epic to see the
whole picture):

- On lock: comment on the epic `▶ story #<N> started (tranche <t>) by <SESSION_ID>`.
- On PR open: `/make` moves the story to `status:in-review`; `/make-session`
  comments the PR link on the epic.
- On merge (done): the story issue closes (via `Closes #<N>` in the PR). A human
  or the coordinator, seeing all of a tranche closed, opens the next tranche's
  gate (`meta:gate-blocked` → `meta:gate-open`) — automatically if
  `auto_open_next_tranche: true` in `config.md`.

Epic completion = all its stories closed AND all sub-epics complete.

---

## 8. Finishing / releasing the lock

- **Normal finish:** the PR is open (`/make` did this). Leave `meta:locked` on
  until the PR merges (it stops other sessions re-claiming a story that is only
  "in review"). `/agent-orch:make-clean` merges and closes; `/make-session`
  then removes `meta:locked` and refreshes the epic roll-up. The `Closes #<N>`
  in the PR body closes the story on merge.
- **Abort / crash:** if a session dies, its heartbeat goes stale. The
  coordinator flags it. A human (or `/coordinate-session` with confirmation)
  releases the stale lock:
  ```bash
  GH_HOST=code.ssnc.dev gh issue edit <N> \
    --remove-label meta:locked --add-label meta:gate-open
  GH_HOST=code.ssnc.dev gh issue comment <N> --body \
    "♻️ Stale lock released (heartbeat expired). Story returned to the queue."
  ```

---

## 9. Label bootstrap

On first use, if any meta-orch label is missing, create it (idempotent):

```bash
GH_HOST=code.ssnc.dev gh label create meta:epic        --color 5319e7 --description "meta-orch epic"       2>/dev/null || true
GH_HOST=code.ssnc.dev gh label create meta:story       --color 1d76db --description "meta-orch story"      2>/dev/null || true
GH_HOST=code.ssnc.dev gh label create meta:gate-open   --color 0e8a16 --description "gate open — runnable" 2>/dev/null || true
GH_HOST=code.ssnc.dev gh label create meta:gate-blocked --color b60205 --description "gate blocked"        2>/dev/null || true
GH_HOST=code.ssnc.dev gh label create meta:locked      --color d93f0b --description "locked by a session"  2>/dev/null || true
GH_HOST=code.ssnc.dev gh label create claude-code-agent-harness --color 1d76db --description "Agent-ready" 2>/dev/null || true
# status:* and meta:tranche:* / meta:hb:* are created on demand.
```

---

## 10. Invariants (never violate)

1. **One session per story.** The lock (§4) is acquired before any build work.
2. **GREEN only after the lock is held** — never tell the user to start another
   session before the claim is atomic.
3. **agent-orch is never modified.** All coordination is labels, comments,
   Actions, and reading agent-orch's own `STATUS.md`.
4. **State lives in GitHub, not on disk.** The worktree is ephemeral; the issue
   is the record.
5. **Heartbeat or die.** A session with no fresh heartbeat is assumed dead and
   its lock is reclaimable.
