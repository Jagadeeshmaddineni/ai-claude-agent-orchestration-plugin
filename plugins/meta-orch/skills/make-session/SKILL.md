---
name: make-session
description: The ONLY meta-orch worker skill — a self-driving loop over the whole /make-* pipeline. Finds an open + gate-open story on GitHub (scoped to an epic if one is passed, else across epics), prints a HUGE RED "do not start another /make-session yet" warning, asks the user to confirm the pick, ATOMICALLY locks the issue the instant they confirm, flips to a GREEN "you may start another /make-session now", pulls .meta-orch/session-guardrails.md into context, and hands prompt + guardrails to /agent-orch:make. Then drives /agent-orch:make-review (per-skill PR comments), /agent-orch:make-validate until CI is green, and /agent-orch:make-clean to merge — then frees the lock, opens the next gate, and loops back to find the next story. Owns all GitHub story/epic state + heartbeat; never modifies agent-orch. Usage: /meta-orch:make-session [epic-issue-number]
---

# Make Session — a coordinated worker that drives the full /make-* loop

You are ONE worker in a fleet of parallel Claude Code sessions. Your job is to
**claim a story from GitHub and drive it all the way through the `/make-*`
pipeline to a merged PR — then pick up the next story and do it again**, while
owning all of each story's coordination state (lock, status, heartbeat, epic
roll-up) per `.meta-orch/session-guardrails.md`.

One story's full lifecycle inside this skill:

```
find + lock story  →  /agent-orch:make (worktree → build → PR)
   →  /agent-orch:make-review  (post per-skill review comments on the PR)
   →  /agent-orch:make-validate  (repeat until CI is GREEN)
   →  /agent-orch:make-clean  (merge, close story, free lock)
   →  open the next tranche's gate + epic roll-up
   →  LOOP: find the next story (RED → confirm → lock → GREEN → …)
```

The loop keeps running through all the `/make-*` steps until there is no more
eligible work or the user stops it.

You are the **only** meta-orch skill that mutates story/epic state for a session.
`/agent-orch:make`, `/build`, `/make-review`, `/make-validate`, and `/make-clean`
stay tracker-agnostic and are never modified — this skill wraps them.

> **Read `.meta-orch/session-guardrails.md` NOW, in full.** It is the operating
> contract: how to find work, lock atomically, heartbeat, roll up the epic, and
> release. This SKILL.md is the flow; the guardrails file is the law. If they
> ever disagree, follow the guardrails file (it's the copy the team edits).

## The invariant that governs everything

**Only one `/make-session` may be in its "claim" window at a time.** Sessions
start in separate Claude Code windows and would otherwise race for the same
story. You resolve this with a strict RED → lock → GREEN sequence (Phase 2–4):
the user must NOT start another session until you flash GREEN, which you only do
once your lock is atomically held.

---

## Phase Map

Print a banner at the start of every phase. Phases 1–11 form one story's
iteration; Phase 11 loops back to Phase 1 for the next story.

| N  | Phase name                                                          |
|----|---------------------------------------------------------------------|
| 0  | Setup: config, guardrails, gh auth, scope (once per session)        |
| 1  | 🔴 RED WARNING — no other session may start yet                     |
| 2  | Find eligible work + user confirms the pick                         |
| 3  | 🔒 Atomic lock (the claim)                                          |
| 4  | 🟢 GREEN ALL-CLEAR — next session may start now                    |
| 5  | Heartbeat setup + epic roll-up                                      |
| 6  | Delegate to /agent-orch:make (prompt + guardrails) → PR             |
| 7  | /agent-orch:make-review — post per-skill review comments on the PR  |
| 8  | /agent-orch:make-validate — loop until CI is GREEN                  |
| 9  | /agent-orch:make-clean — merge, close story, free the lock          |
| 10 | Post-merge: open next gate + epic roll-up                           |
| 11 | 🔁 Loop: look for the next story (→ Phase 1) or stop                |

---

## Phase 0: Setup

**Print phase banner.**

1. **Gate:** `.meta-orch/config.md` and `.meta-orch/session-guardrails.md` must
   exist. If not, this repo hasn't been planned with meta-orch:
   ```
   No .meta-orch/ found. Run /meta-orch:design-tech-plan first (which is driven
   by /meta-orch:design-tech-spec). meta-orch needs its config + guardrails and
   the GitHub epics/stories before a session can pick up work.
   ```
   Stop.
2. **Read both files fully.** Cache all label names, `loop`/`lock` settings, and
   the repo/host from `config.md`. Load `session-guardrails.md` into context —
   you will forward it to `/make` in Phase 6.
3. **GitHub auth:** `GH_HOST=code.ssnc.dev gh auth status`. If not authed, tell
   the user to `GH_HOST=code.ssnc.dev gh auth login` and stop.
4. **Generate this session's id** (matches the agent-orch scheme):
   ```bash
   SESSION_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
   ```
5. **Scope.** If `$ARGUMENTS` contains an issue number (e.g. `#123` or `123`),
   this session is **epic-scoped** to that epic (and its sub-epics). Verify it is
   labelled `meta:epic`. Otherwise the session picks **across all epics**.

> **Phase 0 runs ONCE per session.** Everything from Phase 1 onward is the
> per-story loop; Phase 11 returns to Phase 1 with the same config, scope, and
> `gh` auth already resolved. Generate a **fresh `SESSION_ID` at the top of each
> loop iteration** (re-run the command in step 4) so each story's lock, heartbeat,
> and pointer comment are attributable to that iteration.

## Phase 1: 🔴 RED WARNING (top of the per-story loop)

**Print phase banner, then this banner — make it impossible to miss:**

```
🔴🔴🔴  STOP — DO NOT START ANOTHER /make-session YET  🔴🔴🔴

This session is about to CLAIM a story. If you start another /make-session
in another window right now, both could grab the same story.

WAIT for the 🟢 GREEN ALL-CLEAR from THIS session (a few seconds away).
Only then start the next /make-session.
🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴
```

## Phase 2: Find work + confirm

**Print phase banner.**

Discover eligible stories per `session-guardrails.md` §3 (open, `meta:story`,
`meta:gate-open`, `claude-code-agent-harness`, NOT `meta:locked`/`meta:gate-blocked`,
no fresh foreign heartbeat). Epic-scoped runs filter to stories whose body
references the target epic or its sub-epics.

```bash
GH_HOST=code.ssnc.dev gh issue list --state open \
  --label meta:story --label meta:gate-open --label claude-code-agent-harness \
  --json number,title,labels,assignees,body,url --limit 100
```

Filter out `meta:locked` / `meta:gate-blocked`. Order by tranche then issue
number. Present up to ~7 with number, title, epic, tranche, and recommend the
top one:

```
Eligible stories (across epics | in epic #<E>):
  1) #S1  <title>   epic #E1  tranche 0    ← recommended (lowest open tranche)
  2) #S2  <title>   epic #E1  tranche 0
  ...

Which should this session claim? (number, or 'refresh' to re-query, or 'abort')
```

If none are eligible:
```
No open, gate-open, unlocked stories available <in epic #E | across epics>.
Possible reasons: all claimed, or the next tranche's gate is still blocked.
Check /meta-orch:coordinate-session for the fleet status.
```
Stop (nothing to claim → nothing to warn about; the RED warning is moot, so tell
the user it's safe to try elsewhere).

**Wait for the user's explicit confirmation of a specific story before Phase 3.**

## Phase 3: 🔒 Atomic lock

**Print phase banner.** Lock the confirmed story **immediately** — this is the
claim, and it happens before any build work so the GREEN all-clear can fire fast.

Follow `session-guardrails.md` §4:

- **Primary — Actions concurrency lock** (if `meta-orch-lock.yml` is present on
  the default branch): trigger it and poll for success.
  ```bash
  GH_HOST=code.ssnc.dev gh workflow run meta-orch-lock.yml \
    -f issue=<N> -f actor="$(GH_HOST=code.ssnc.dev gh api user --jq .login 2>/dev/null || echo me)" \
    -f session_id="$SESSION_ID"
  ```
  Poll the latest run; **success ⇒ lock held**, **failure ⇒ someone beat you to
  it** → go back to Phase 2 and pick the next candidate (re-print the eligible
  list; do NOT green-light yet).
- **Fallback — optimistic label lock** (Actions unavailable): add `meta:locked`
  + assign `@me`, then RE-READ to confirm you hold it; if not, release and retry
  the next story.

On a confirmed lock, set status and comment (guardrails §4 "On successful lock"):
```bash
GH_HOST=code.ssnc.dev gh issue edit <N> \
  --add-label status:in-progress --remove-label meta:gate-open
GH_HOST=code.ssnc.dev gh issue comment <N> --body \
  "🔒 Locked by session $SESSION_ID (@me) at $(date -u +%Y-%m-%dT%H:%M:%SZ). Starting /agent-orch:make."
```

## Phase 4: 🟢 GREEN ALL-CLEAR

**Print phase banner, then this banner:**

```
🟢🟢🟢  ALL CLEAR — you may start the NEXT /make-session now  🟢🟢🟢

This session has LOCKED story #<N> — "<title>" (epic #<E>, tranche <t>).
No other session can claim it.

Go ahead and start the next /make-session in another window.
🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢
```

This is the moment the user is cleared to spin up another engineer's session.

## Phase 5: Heartbeat + epic roll-up

**Print phase banner.**

1. **First heartbeat** — set the rolling label (guardrails §5a):
   ```bash
   GH_HOST=code.ssnc.dev gh issue edit <N> --add-label "meta:hb:$(date -u +%Y%m%dT%H%MZ)"
   ```
2. **Epic roll-up** — comment on the epic (guardrails §7):
   ```bash
   GH_HOST=code.ssnc.dev gh issue comment <E> --body \
     "▶ story #<N> started (tranche <t>) by session $SESSION_ID."
   ```
   Refresh the epic's story checklist if it tracks one.

Refresh the heartbeat (§5a) at each subsequent phase boundary and whenever you
regain control between `/make` phases. The session pointer comment (§5b) is
posted in Phase 6 once the worktree exists.

## Phase 6: Delegate to /agent-orch:make

**Print phase banner.**

1. **Extract the embedded prompt** from the story body — the text between
   `<!-- make-session-prompt:start -->` and `<!-- make-session-prompt:end -->`.
2. **Assemble the combined context** to forward: the FULL contents of
   `.meta-orch/session-guardrails.md`, then the extracted story prompt, then the
   story/epic numbers and the spec path. This is exactly what the user's original
   design asks for: *prompt + session-guardrails.md → /make*.
3. **Invoke `/agent-orch:make`** via the Skill tool with that combined text as
   the argument. meta-orch's tracker is GitHub (handled by THIS skill), so if
   `/make` asks about Jira, choose skip — do not double-track. `/make` runs its
   own 6-phase worktree → build → PR lifecycle unchanged.
4. **After `/make` creates the worktree**, post the session pointer comment
   (guardrails §5b) so the coordinator can find the live `STATUS.md`:
   ```bash
   GH_HOST=code.ssnc.dev gh issue comment <N> --body \
     "🧭 session=$SESSION_ID branch=<branch> worktree=<worktree_path> host=$(hostname)"
   ```
5. `/make` opens a PR and moves the story to `status:in-review` (its Phase 5).
   Capture the **PR number/URL** and the branch. Refresh the heartbeat. Verify
   the PR body contains `Closes #<N>` (so the merge closes the story); if `/make`
   didn't add it, append it now:
   ```bash
   GH_HOST=code.ssnc.dev gh pr edit <PR> --body "$(GH_HOST=code.ssnc.dev gh pr view <PR> --json body --jq .body)

   Closes #<N>"
   ```
   Comment the PR link on the EPIC (roll-up). **Keep `meta:locked` on** — it stays
   until the PR actually merges (Phase 9), so no other session re-claims a story
   that is only "in review" (guardrails §8). Then continue to Phase 7 — do NOT
   stop here; this skill drives the rest of the pipeline itself.

## Phase 7: Review the PR (/agent-orch:make-review, per-skill)

**Print phase banner.** Refresh heartbeat.

Drive `/agent-orch:make-review` in **per-skill mode** so every review skill's
findings are posted as its own comment on the PR — the user's explicit
requirement ("post review as comment on PR for each of the skills"). `/make-review`
runs the sub-skills in display-only mode and does the posting itself; this step
is what guarantees the findings actually land on the PR, not just print.

Invoke via the Skill tool:
```
Skill tool call:
  skill: "agent-orch:make-review"
  args: "post review as comment on PR for each of the skills"
```

This posts one PR comment per review skill that produced findings — typically
**3** (`/code-review`, `/security-review`, `/review`), plus `/review-pr` when the
codebase-graph-analyzer plugin is installed. After it returns:

- **Verify the comments actually posted.** Read the PR's comments back and
  confirm one comment per skill that ran:
  ```bash
  GH_HOST=code.ssnc.dev gh pr view <PR> --json comments \
    --jq '[.comments[] | select(.body | startswith("## ")) | .body[0:40]]'
  ```
  If the expected per-skill comments are NOT present (e.g. `/make-review` only
  printed them), post them yourself with `gh pr comment <PR> --body "…"` — one
  per skill — so the "3 postings (if findings)" requirement is met. Do not leave
  a story whose review findings were only printed to the session.
- Comment a one-line review summary on the EPIC (roll-up).

## Phase 8: Validate until CI is green (/agent-orch:make-validate)

**Print phase banner.** Refresh heartbeat.

Loop `/agent-orch:make-validate` until CI on the PR is **green** (it fixes CI
failures and review comments via `/build`, then commits & pushes):

1. Invoke via the Skill tool:
   ```
   Skill tool call:
     skill: "agent-orch:make-validate"
     args: ""
   ```
2. After it returns, re-check CI status:
   ```bash
   GH_HOST=code.ssnc.dev gh pr checks <PR> 2>/dev/null | cat
   ```
   - **All checks pass (or none configured):** CI is green → go to Phase 9.
   - **Failures remain:** run `/agent-orch:make-validate` again. Repeat.
   - **Checks still pending:** wait briefly, re-check, then decide.
3. **Bound the loop:** cap at **3** validate rounds. If CI is still red after 3
   rounds, STOP the pipeline for this story, surface the failing checks to the
   user, leave the story `meta:locked` + `status:in-review`, and comment the
   blockage on the story and epic. Ask the user how to proceed (fix manually,
   force-merge, or skip). Do NOT loop to a new story with this one wedged.

Refresh the heartbeat at each round so the coordinator sees the session is alive.

## Phase 9: Merge and clean up (/agent-orch:make-clean)

**Print phase banner.** Refresh heartbeat.

With CI green, merge and clean up via the Skill tool:
```
Skill tool call:
  skill: "agent-orch:make-clean"
  args: ""
```
`/make-clean` merges the PR (`--squash`), deletes the branch, removes the
worktree / returns to the default branch, and deletes THIS Claude's per-session
state file. Because the PR body has `Closes #<N>`, the merge **closes the story
issue**.

After it returns, **free the lock and finalize story state** (guardrails §8):
```bash
GH_HOST=code.ssnc.dev gh issue view <N> --json state,labels --jq '{state,labels:[.labels[].name]}'
# story should now be CLOSED via Closes #<N>. If for any reason still open, close it:
GH_HOST=code.ssnc.dev gh issue close <N> 2>/dev/null || true
# remove the lock + in-review labels and any stale heartbeat:
GH_HOST=code.ssnc.dev gh issue edit <N> \
  --remove-label meta:locked --remove-label status:in-review 2>/dev/null || true
```
Comment `✅ story #<N> merged & closed by session $SESSION_ID` on the EPIC.

## Phase 10: Post-merge — open the next gate + roll up

**Print phase banner.**

Now that a story merged, advance the tranche gates (guardrails §7):

1. Determine the merged story's epic and tranche (from its labels/body).
2. If **every** story in that tranche is now CLOSED, the next tranche can open.
   Read `auto_open_next_tranche` from `.meta-orch/config.md`:
   - `true` → flip each next-tranche story `meta:gate-blocked` → `meta:gate-open`:
     ```bash
     GH_HOST=code.ssnc.dev gh issue edit <M> \
       --remove-label meta:gate-blocked --add-label meta:gate-open
     ```
     Comment on the epic that tranche N+1 is now open.
   - `false` → do NOT flip automatically; note in the epic roll-up that tranche N
     is complete and tranche N+1 is ready for a human to open (or the coordinator).
3. If all of the epic's stories are closed AND its sub-epics complete, note epic
   completion in the roll-up (closing the epic is a human/coordinator action).

## Phase 11: 🔁 Loop — find the next story

**Print phase banner.**

The story is done end-to-end. Now loop back and pick up the next one — this is
the "keep running through all the `/make-*` steps" behaviour:

1. **Re-check eligibility** using the SAME scope as Phase 0 (epic-scoped or across
   epics), exactly like Phase 2's discovery query.
2. **If eligible stories remain:**
   ```
   ✅ Story #<N> shipped. Looking for the next story…
   ```
   Generate a fresh `SESSION_ID` (Phase 0 step 4) and go to **Phase 1** (the RED
   warning fires again — each claim still serialises correctly). The user does
   NOT need to re-invoke `/make-session`; the loop continues automatically.
3. **If NO eligible stories remain** (queue drained, or everything left is gated
   behind un-merged tranches / locked by other sessions):
   ```
   🎉 No more eligible stories <in epic #E | across epics> right now.

   Shipped this session: #<a>, #<b>, #<c> (N stories merged).
   Still gated/blocked: <list or "none">  Locked by others: <list or "none">

   This session's loop is complete. Re-run /meta-orch:make-session when more
   work opens up, or watch /meta-orch:coordinate-session for the fleet status.
   ```
   Stop the loop.
4. **User interrupt:** the user can stop the loop at any time between stories. If
   they do, leave all shipped stories closed and any in-flight story in its
   current (locked) state for the coordinator to see.

> **On abort/crash mid-story:** if this session dies partway through Phases 6–9,
> its heartbeat goes stale and the coordinator flags it; a human (or
> `/coordinate-session`) releases the stale lock per guardrails §8. Do not try to
> self-heal silently.

---

## Verification Before Completion

At each story's key transitions, read state back before claiming success — never
report a step done without verifying:
- **After lock (Phase 3):** the `meta:locked` label is present and status flipped
  to in-progress.
- **After /make (Phase 6):** the PR exists and its body contains `Closes #<N>`.
- **After review (Phase 7):** the expected per-skill comments are actually on the
  PR (post them yourself if `/make-review` only printed them).
- **After validate (Phase 8):** `gh pr checks` shows green before merging.
- **After clean (Phase 9):** the story issue is CLOSED and the lock label removed.

See `plugins/agent-orch/policies/verification-before-completion.md`.

## What This Skill Does NOT Do

- It does not create epics/stories (that's `/design-tech-plan`).
- It does not modify `/agent-orch:make`, `/build`, `/make-review`,
  `/make-validate`, or `/make-clean` — it drives them in sequence.
- It does not run the coordinator loop (that's `/coordinate-session`).
