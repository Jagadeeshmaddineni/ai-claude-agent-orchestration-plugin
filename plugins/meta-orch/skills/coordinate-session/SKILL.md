---
name: coordinate-session
description: The meta-orch coordinator. Loops every N minutes (configurable in .meta-orch/config.md, default 5) reading in-progress GitHub issues + heartbeat labels, checking out each active session's worktree to read its STATUS.md, and reporting per-epic/per-story status — who is working on what, how it's going, and what's open-gated to run. Flags stale sessions and (optionally) opens the next tranche's gate. Step 4 of the meta-orch pipeline. Usage: /meta-orch:coordinate-session [once] [epic-issue-number]
---

# Coordinate Session — the fleet coordinator

You are the **single coordinator** watching a fleet of parallel `/make-session`
workers. You do NOT do build work. Every cycle you read GitHub state + each
active session's worktree `STATUS.md`, then present a live picture: which epics
and stories exist, who is working on what, how each session is doing (from its
heartbeat + STATUS.md), and what is open-gated and ready to be claimed.

> All state comes from GitHub Issues + agent-orch's own `STATUS.md` files, per
> `.meta-orch/session-guardrails.md`. This skill READS that state and reports;
> it never modifies `/agent-orch:*`. The only writes it may make (with
> confirmation) are gate/lock housekeeping described in Phase 4.

## Modes

- `/meta-orch:coordinate-session` — **loop** every `loop_interval` (config,
  default 5m) until `max_cycles` or the user stops it.
- `/meta-orch:coordinate-session once` — a **single** status report, then exit.
- `/meta-orch:coordinate-session #<E>` — scope the report to one epic (and its
  sub-epics). Combine with `once` freely.

> **Durability note.** This skill drives its own loop (Phase 3) using the
> interval from config. For a coordinator that survives this Claude session
> ending, you can instead run the single-pass form under the built-in loop:
> `/loop 5m /meta-orch:coordinate-session once`. Both are supported; the
> built-in `/loop` is the more durable option for long-running watches.

---

## Phase Map

| N | Phase name                                             |
|---|--------------------------------------------------------|
| 0 | Setup: config, guardrails, gh auth, mode, interval     |
| 1 | Gather: epics, stories, sessions, heartbeats           |
| 2 | Inspect: read each active session's worktree STATUS.md |
| 3 | Report a cycle + (loop mode) wait and repeat           |
| 4 | Housekeeping: flag stale, optionally open next gate    |

---

## Phase 0: Setup

**Print a one-time header** (not per cycle):

```
═══════════════════════════════════════════════════════
/meta-orch:coordinate-session — fleet coordinator
Interval: <loop_interval>   Stale after: <heartbeat_stale_after>   Mode: <loop|once>
═══════════════════════════════════════════════════════
```

1. **Gate:** `.meta-orch/config.md` + `session-guardrails.md` must exist (else
   tell the user to run `/meta-orch:design-tech-plan` first). Read both.
2. From `config.md`: `loop_interval`, `heartbeat_stale_after`, `max_cycles`,
   `auto_open_next_tranche`, all label names, repo/host, `tranche_label_prefix`.
3. **GitHub auth:** `GH_HOST=code.ssnc.dev gh auth status`.
4. Parse mode (`once`?) and epic scope (issue number?) from `$ARGUMENTS`.

## Phase 1: Gather (per cycle)

**Print a cycle banner** with a UTC timestamp so successive cycles are legible:

```
──────── cycle <k> · <UTC> ────────
```

Query GitHub (epic-scoped filters applied if scoped):

```bash
# Epics
GH_HOST=code.ssnc.dev gh issue list --state open --label meta:epic \
  --json number,title,labels,body --limit 100
# All stories (state open) with their coordination labels
GH_HOST=code.ssnc.dev gh issue list --state open --label meta:story \
  --json number,title,labels,assignees,body,url --limit 400
# In-progress / locked stories specifically
GH_HOST=code.ssnc.dev gh issue list --state open --label meta:locked \
  --json number,title,labels,assignees,body,url --limit 100
```

For each story, classify from its labels:
- **active** — `meta:locked` (+ usually `status:in-progress`)
- **in-review** — `status:in-review`
- **runnable** — `meta:gate-open`, not locked
- **blocked** — `meta:gate-blocked`
- **done** — closed (query closed separately if you want a completion count)

**Heartbeat.** For each active story, read its newest `meta:hb:<UTC_MINUTE>`
label. Parse `<UTC_MINUTE>` and compare to now against `heartbeat_stale_after`.
Mark **fresh** or **STALE**.

## Phase 2: Inspect worktrees (active sessions)

For each **active** story, find its session pointer comment (guardrails §5b):
`🧭 session=… branch=… worktree=… host=…`. Read the most recent one:

```bash
GH_HOST=code.ssnc.dev gh issue view <N> --json comments \
  --jq '.comments[].body' | grep '^🧭' | tail -1
```

Then read that session's `STATUS.md` to see how the build is going — **read-only,
without disturbing the worker**:

- **Same host & branch checked out somewhere you can read:** locate the worktree
  path from the comment and read
  `<worktree>/ssnc-agent-orch/**/STATUS.md` (newest). `/agent-orch:build`
  maintains this file; it tells you the phase, what's done, and what's pending.
- **Branch not locally available (another engineer's machine):** you can't read
  their local worktree. Fall back to the heartbeat + issue comments + PR status
  for that story, and label it "remote session — status from GitHub only". Do
  NOT check out or mutate their branch.

> Never `cd` into or modify a worker's worktree. Reading `STATUS.md` is fine;
> anything else risks corrupting an in-flight session. If reading requires a
> checkout you don't already have, prefer the GitHub-only fallback.

## Phase 3: Report + loop

**Print the cycle report:**

```
FLEET STATUS · cycle <k> · <UTC>

Epics
  #E1 <title>   stories: <done>/<total> done · <active> active · <runnable> ready · <blocked> blocked
    ...

Active sessions (who's working on what)
  #S1 <title>   epic #E1 t0   session <id>   ♥ <hb age> (fresh)   phase: <from STATUS.md>
      → <one-line progress from STATUS.md>   PR: <url or "—">
  #S7 <title>   epic #E2 t1   session <id>   ♥ 34m (STALE ⚠)      remote session — GitHub only

In review
  #S3 <title>   PR <url>   (locked until merge)

Ready to run now (open gate, unlocked)
  #S2 (epic #E1 t0),  #S9 (epic #E3 t0)   ← next /make-session will pick from here

Blocked (waiting on a gate)
  #S4 (epic #E1 t1) ← unblocked when t0 merges (#S1, #S2)

Backlog health: <ready count> ready vs target <session_count> sessions.
<if ready < min_ready_backlog: "⚠ low ready backlog — consider opening the next
tranche's gate or planning more stories.">
```

Then run **Phase 4 housekeeping**, then:

- **`once` mode:** exit after this single report.
- **loop mode:** wait `loop_interval`, increment the cycle counter, and repeat
  from Phase 1. Convert the interval to seconds and sleep:
  ```bash
  # loop_interval like 5m / 30s / 1h → seconds
  sleep <seconds>
  ```
  Stop when `max_cycles` (if > 0) is reached, then ask whether to continue for
  another `max_cycles` cycles or exit. The user can interrupt at any time.

## Phase 4: Housekeeping (each cycle)

1. **Flag stale sessions.** For every active story whose heartbeat is STALE,
   surface it prominently and offer (with explicit confirmation — never
   automatic) to release the lock per guardrails §8:
   ```bash
   GH_HOST=code.ssnc.dev gh issue edit <N> \
     --remove-label meta:locked --add-label meta:gate-open
   GH_HOST=code.ssnc.dev gh issue comment <N> --body \
     "♻️ Stale lock released by coordinator (heartbeat expired at <ts>). Returned to queue."
   ```
   Do this only after the user confirms — a "stale" session might just be on a
   long build.

2. **Open the next tranche's gate.** When every story in tranche N of an epic is
   CLOSED, tranche N+1 can open. If `auto_open_next_tranche: true`, do it
   automatically; otherwise recommend it and act on confirmation:
   ```bash
   # for each tranche N+1 story of that epic:
   GH_HOST=code.ssnc.dev gh issue edit <M> \
     --remove-label meta:gate-blocked --add-label meta:gate-open
   ```
   Comment on the epic that tranche N+1 is now open.

3. **Epic completion.** When all of an epic's stories are closed AND its
   sub-epics are complete, note it and (with confirmation) close the epic issue.

---

## Verification Before Completion

In `once` mode, before finishing confirm the report reflects a real query (not
stale in-memory data) and that any gate/lock change you made is actually present
on the issue when you read it back. See
`plugins/agent-orch/policies/verification-before-completion.md`.

## What This Skill Does NOT Do

- No build work, no claiming stories (that's `/make-session`).
- No modifying agent-orch or worker worktrees — it only reads `STATUS.md`.
- It does not create epics/stories (that's `/design-tech-plan`).
