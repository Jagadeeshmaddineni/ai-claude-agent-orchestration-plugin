# meta-orch Configuration

> This file was provisioned by the **meta-orch** plugin the first time a
> meta-orch skill ran in this repo. It is safe to edit and safe to commit — it
> holds no secrets. Every meta-orch skill reads it on startup. If a value is
> missing, the documented default is used.
>
> Companion file: [`.meta-orch/session-guardrails.md`](session-guardrails.md) —
> the operating contract every `/make-session` pulls into context.

---

## Sessions

<!-- How many parallel /make-session worker sessions the team INTENDS to run.
     This is a coordination target, not a hard limit — the real cap is enforced
     by the one-at-a-time lock in session-guardrails.md. Grow or shrink freely as
     engineers join or leave an epic. -->
session_count: 5

<!-- Minimum number of open, gate-open stories the coordinator wants available
     before it recommends spinning up more sessions. -->
min_ready_backlog: 3

---

## Coordinator Loop

<!-- How often /coordinate-session re-polls GitHub and reports status.
     Accepts a duration: 30s, 5m, 15m, 1h. Default 5m. -->
loop_interval: 5m

<!-- Consider a session STALE if its heartbeat label is older than this.
     Should be a few multiples of loop_interval so a slow story does not
     look dead. Default 20m. -->
heartbeat_stale_after: 20m

<!-- Max coordinator cycles before /coordinate-session exits and asks whether to
     continue. 0 = run until the user stops it. Default 0. -->
max_cycles: 0

---

## Tracker Backend

<!-- meta-orch stores ALL epic/story/gate/lock/heartbeat state in GitHub Issues
     on the SS&C Enterprise host. This is fixed for meta-orch; the switchable
     tracker: selector in .make-config.md governs /agent-orch:make, not this. -->
provider: github
host: code.ssnc.dev

<!-- OWNER/REPO for issue state. Empty ⇒ derive from `git remote get-url origin`. -->
repo:

---

## Labels

<!-- The label vocabulary meta-orch uses on GitHub Issues. Change the names here
     if they collide with existing repo labels; every skill reads them from this
     file. Missing labels are auto-created on first use (see session-guardrails). -->

# Marks an issue as a meta-orch EPIC (a container of stories / sub-epics).
label_epic: meta:epic

# Marks an issue as a meta-orch STORY (a unit of /make-session work).
label_story: meta:story

# A story whose gate is OPEN and is therefore eligible to be picked up.
# (Absence of any blocking gate + this label ⇒ runnable.)
label_gate_open: meta:gate-open

# A story still blocked by an un-merged dependency (gate closed).
label_gate_blocked: meta:gate-blocked

# A story currently LOCKED by a session (claimed, not yet done).
label_locked: meta:locked

# Applied by /make-session while a session actively works the story.
label_in_progress: status:in-progress

# Applied when a PR is open for the story.
label_in_review: status:in-review

# Heartbeat label prefix. /make-session maintains a label of the form
# `meta:hb:<UTC_MINUTE>` (e.g. meta:hb:20260705T1432Z) and removes the previous
# one on each beat, so the newest heartbeat is always readable from the label
# set without cloning the worktree. See session-guardrails.md → Heartbeat.
label_heartbeat_prefix: meta:hb:

# Governance: only issues carrying this label may be auto-picked by a session
# (human-on-the-loop gate; shared with agent-orch's github-issues backend).
label_harness: claude-code-agent-harness

---

## Tranche Model

<!-- A "tranche" is a group of stories that may run in parallel because they do
     not conflict. Tranche N+1's gate opens only when tranche N is merged.
     meta-orch encodes a story's tranche as a label `meta:tranche:<epic>:<N>`
     and its gate dependencies in the issue body (see session-guardrails.md). -->
tranche_label_prefix: meta:tranche:

<!-- If true, /coordinate-session will auto-open the next tranche's gate
     (flip gate-blocked → gate-open) once every story in the prior tranche of
     the same epic is closed. If false, a human flips the gate. Default false
     (human-on-the-loop). -->
auto_open_next_tranche: false

---

## Locking

<!-- meta-orch serialises story claims through a GitHub Actions workflow so two
     sessions starting at the same instant cannot claim the same story. The
     workflow uses `concurrency:` to guarantee one-at-a-time execution.
     Name of the workflow file shipped into .github/workflows/ on setup. -->
lock_workflow: meta-orch-lock.yml

<!-- Fallback when the Actions lock is unavailable (e.g. Actions disabled):
     optimistic label-based lock with a re-read confirmation. See
     session-guardrails.md → Locking → Fallback. -->
lock_fallback: optimistic-label

---

## Paths

tech_specs_dir: docs/tech-specs
tech_plans_dir: docs/tech-plan
