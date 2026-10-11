---
name: bugfix
description: Focused bug diagnosis and repair. Debugger finds root cause (4-phase, regression-test-first), Builder fixes at the source, Validator verifies. Leaner than /build - no brainstorming, no Advocate gate. Worktree-aware. Usage: /agent-orch:bugfix [bug description|JIRA-ID|issue-URL]
---

# Bugfix — Root-Cause Diagnosis and Repair

You are orchestrating a **focused bug fix**. This is the right entry point when the task is "this
is broken, make it work" rather than "build a new feature". It wraps the systematic
`orchestrate-debugger` (4-phase root cause methodology) with a tight fix → verify loop, and it
stays anchored to the correct worktree/branch.

> **Attribution**: The systematic debugging methodology this skill drives (4-phase root cause,
> failing-regression-test-before-fix, 3-attempts-then-question-the-architecture) is derived from
> the [superpowers plugin](https://github.com/obra/superpowers) `systematic-debugging` skill by
> Jesse Vincent (MIT License).

## When to Use

- A test is failing, behavior is wrong, or something that worked is now broken.
- You want root-cause analysis, not a symptom patch.
- The change is a fix, not a feature — so the full `/build` pipeline (brainstorming, Advocate,
  specialist swarm) is overkill.

For new functionality, use `/agent-orch:build`. For a bug discovered mid-build, the Debugger is
already wired into `/build` Phase 4 — you don't need this skill there.

## Core Principle

**NO FIX WITHOUT ROOT CAUSE INVESTIGATION FIRST.** Symptom-focused patches create new bugs, hide
deeper issues, and erode trust in the codebase. The Debugger must reach a confirmed root cause
before any fix is written, and a **failing regression test must exist before the fix** so the fix
is provably effective.

## Phase Map

At the start of every phase, print a banner:

```
═══════════════════════════════════════════════════════
/bugfix phase <label>: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| Label | Phase name                                    |
|-------|-----------------------------------------------|
| pre   | Worktree/branch anchor pre-flight             |
| 0     | Intake (describe bug / Jira / issue URL)      |
| 1     | Root cause investigation (Debugger)           |
| 2     | Fix at the source (Builder)                   |
| 3     | Verify (Validator)                            |
| 4     | Finalize (summary, optional commit)           |

When spawning any subagent, also print: `→ Launching agent-orch:orchestrate-<name> (<purpose>)…`

---

## Phase pre: Worktree / Branch Anchor Pre-Flight

**CRITICAL**: runs BEFORE Phase 0, exactly as in `/build`. A bugfix must land in the right tree.

**Print phase banner.**

Resolve the `/make` session state file in this order (same contract as `/build`):

1. **Env var** — if `$MAKE_SESSION_FILE` is set and the file exists, use it.
2. **Discovery by branch** — among `<primary-repo-root>/.claude/.make-session-*.json` (newest
   first), pick the one whose `branch` field matches `git branch --show-current`.
3. **Legacy fallback** — `<primary-repo-root>/.claude/.make-session.json` (v1) if present.
4. **No session file** — `/bugfix` was invoked directly. Anchor to the current working directory.

```bash
PRIMARY_REPO_ROOT=$(git worktree list --porcelain | awk '/^worktree / {print $2; exit}')
if [ -n "$MAKE_SESSION_FILE" ] && [ -f "$MAKE_SESSION_FILE" ]; then
  SESSION_FILE="$MAKE_SESSION_FILE"
else
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
  SESSION_FILE=""
  for f in $(ls -t "$PRIMARY_REPO_ROOT/.claude/.make-session-"*.json 2>/dev/null); do
    f_branch=$(python3 -c "import json,sys; print(json.load(open('$f')).get('branch',''))" 2>/dev/null)
    [ "$f_branch" = "$CURRENT_BRANCH" ] && { SESSION_FILE="$f"; break; }
  done
  if [ -z "$SESSION_FILE" ] && [ -f "$PRIMARY_REPO_ROOT/.claude/.make-session.json" ]; then
    SESSION_FILE="$PRIMARY_REPO_ROOT/.claude/.make-session.json"
  fi
fi
```

If a session file resolves, read `mode`, `branch`, `worktree_path`, `repo_root`, `jira_key`,
`session_id`. Verify `pwd` is inside `worktree_path` (cd if not) and that
`git rev-parse --show-toplevel` matches; if it can't be reconciled, STOP and report drift rather
than fixing on the wrong branch. Print the anchor banner, then build `${ANCHOR_BLOCK}` for every
subagent prompt (verbatim):

```
[worktree-context]
mode: <worktree|branch|direct>
branch: <branch>
worktree_path: <absolute path>
jira_key: <key or none>
session_id: <session_id or "none">
session_file: <absolute path or "none">

STRICT RULE: All file reads, writes, edits, and shell commands MUST occur
inside worktree_path. Before your first tool call, verify pwd is inside
worktree_path and that git rev-parse --show-toplevel resolves to it. If not,
cd to worktree_path. If resolution still fails, STOP and report — do not
silently edit files in the wrong tree. See the rule at
plugins/agent-orch/rules/worktree-context.md for full details.
```

Every `Task` prompt below MUST begin with `${ANCHOR_BLOCK}`.

## Phase 0: Intake

**Print phase banner.**

Capture the bug from whichever source the user gave:

- **Free-form description** (`$ARGUMENTS`) — the symptom, when it happens, expected vs actual.
- **JIRA-ID** (`$ARGUMENTS` matches `[A-Z]+-\d+`) — read `.claude/rules/jira.md`; if Jira context
  exists, fetch the issue (`mcp__jira__jira_getIssue`) and use its description + comments as the
  bug report. (Same detection as `/build` Phase 0.5.) Transition the issue to In Progress and add
  a session-start comment if Jira is configured.
- **Issue URL** (GitHub, etc.) — fetch and summarize the report.

If the symptom is unclear, ask **one** focused question to get a reproduction path. Don't run a
full requirements interview — this is a fix.

Record the bug statement and (if any) reproduction steps. You'll pass these to the Debugger.

## Phase 1: Root Cause Investigation (Debugger)

**Print phase banner.**

Launch the Debugger. It runs the 4-phase methodology (Root Cause Investigation → Pattern Analysis
→ Hypothesis & Testing → Implementation) and will not propose a fix until the root cause is
confirmed and a failing regression test exists.

```
Task tool call:
  subagent_type: "agent-orch:orchestrate-debugger"
  description: "Find root cause"
  prompt: "${ANCHOR_BLOCK}

           Bug report:
           <bug statement + reproduction steps + any Jira/issue context>

           Read CLAUDE.md for project standards and conventions.
           Apply your 4-phase methodology. NO FIX WITHOUT ROOT CAUSE.
           Phase 1: reproduce consistently, read the error/stack, review recent
             changes (git log/diff), trace data flow backward to the SOURCE.
           Phase 2: find a working comparable pattern in this codebase; diff it.
           Phase 3: form ONE testable hypothesis; confirm with a minimal diagnostic.
           Phase 4: write a FAILING regression test that proves the bug (RED), then
             stop and report the root cause + the proposed source-level fix.

           Write your investigation (root cause, evidence, failing test, proposed fix)
           to the session STATUS.md under '## Debugger Findings'. Do not over-edit —
           report the root cause and the minimal fix; the Builder will implement it."
```

Read the Debugger's findings and relay the root cause to the user before proceeding. If the
Debugger cannot reproduce or cannot find a root cause, surface that — do not push on to a guessed
fix.

## Phase 2: Fix at the Source (Builder)

**Print phase banner.**

With a confirmed root cause and a failing regression test in hand, launch the Builder to
implement the **minimal source-level fix**.

```
Task tool call:
  subagent_type: "agent-orch:orchestrate-builder"
  description: "Implement the fix"
  prompt: "${ANCHOR_BLOCK}

           Read the '## Debugger Findings' section of the session STATUS.md for the
           confirmed root cause and the failing regression test.
           Read CLAUDE.md and conventions for project standards.

           Implement the MINIMAL fix at the SOURCE of the root cause (not the symptom).
           The failing regression test must now PASS (GREEN). Do not weaken or delete
           the test to make it pass.
           NO SCAFFOLDING. Full error handling on the changed path.
           Run the regression test and the surrounding suite; confirm nothing else broke.
           Report RED→GREEN evidence and files changed under '## Builder Findings' in STATUS.md."
```

### 3-Attempt Escalation

If the fix doesn't hold after **3 attempts**, STOP. The issue is likely architectural, not a
local bug. Escalate to the Architect for a design review before any further attempts:

```
Task tool call:
  subagent_type: "agent-orch:orchestrate-architect"
  description: "Design review after failed fixes"
  prompt: "${ANCHOR_BLOCK}

           3 fix attempts have failed for this bug. Read '## Debugger Findings' and
           '## Builder Findings' in STATUS.md. The root cause may be architectural —
           wrong data-model assumptions, component boundaries, or a spec gap.
           Assess and recommend a design-level path forward. Do not patch."
```

Report the escalation to the user and pause for direction — don't loop indefinitely.

## Phase 3: Verify (Validator)

**Print phase banner.**

Launch the Validator to independently confirm the fix and guard against regressions.

```
Task tool call:
  subagent_type: "agent-orch:orchestrate-validator"
  description: "Verify the fix"
  prompt: "${ANCHOR_BLOCK}

           A bug was fixed. Read '## Debugger Findings' and '## Builder Findings' in STATUS.md.
           VERIFICATION GATE (fresh, not cached):
           1. Run the regression test — it MUST pass.
           2. Run the surrounding/related suite — nothing else may have broken.
           3. Report actual test output (pass/fail counts) and coverage of the changed code.
           Confirm the regression test genuinely covers the reported bug (would fail if the
           fix were reverted). Report under '## Validator Findings' with evidence."
```

Do not declare the bug fixed until the Validator shows the regression test passing and no
collateral failures — per the
[verification-before-completion policy](../../policies/verification-before-completion.md), the
Builder's "fixed" report is a claim to verify independently, not to relay.

## Phase 4: Finalize

**Print phase banner.**

1. **Summary** for the user:
   - Root cause (the real one, not the symptom)
   - Fix applied (file:line) and why it's at the source
   - Regression test added (path) + verification evidence (test output)
   - Anything still open / follow-ups

2. **Jira** (if a JIRA-ID drove this): add a completion comment and transition per
   `.claude/rules/jira.md`. If invoked under `/make`, hand back — `/make` owns the PR lifecycle.

3. **Optional commit.** Offer to commit. If the user agrees, the commit MUST carry the
   configured `Co-authored-by:` trailer (see `.agent-orch-models.json` → `commit_attribution`)
   and stay separate from human-authored changes — the `validate-ai-commit.sh` hook enforces
   this. See [ai-code-governance policy](../../policies/ai-code-governance.md).

---

## Agent Teams (Optional)

For a gnarly bug spanning multiple components, you may run this in Agent Teams mode
(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`): spawn Debugger, Builder, and Validator as teammates so
the Debugger can message the Builder its root-cause findings and the Validator can iterate with the
Builder directly. For most bugs, the sequential subagent flow above is simpler and cheaper —
prefer it unless the bug clearly needs cross-component back-and-forth.

## Notes

- **Models**: Debugger and Architect run on the `thinking` model (root-cause reasoning); Builder
  and Validator on `instruct`. Models are configured per-agent in `.agent-orch-models.json` — no
  per-call model needed.
- **Single sink**: all agents append to the session `STATUS.md` under their `## <Agent> Findings`
  header. No side-files.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.bugfix:` entry. If the file is absent, has no
entry for this skill, or the entry is empty, **run exactly as documented above — no
behaviour change.** This is the default and most common case.

If an entry exists, this skill exposes these hook points:
- `before` — targets run before Phase 1 root-cause investigation (e.g. attach known-issue context)
- `after` — targets run after Phase 3 verification (e.g. a regression-suite or post-fix checklist)

The **agents** this skill launches (Debugger, Builder, Validator, Architect) are independently
extensible via `.claude/ssnc-agent-orch/agents.yaml` (`before`/`replace`/`after` per agent) — each
agent honours its own entry. Run any listed targets in order, following the shared resolver in
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are read-and-acted,
`.loop-library/*.yaml` run as loops, `/skill` refs invoke inline). Tell the user when you run an
extension target. A failing target is surfaced but does NOT abort the skill unless the user aborts.
Full contract: `plugins/agent-orch/rules/extensibility.md`.
