# Verification Before Completion Policy

This policy applies to every agent and skill in this orchestration plugin. It is the shared
honesty gate that complements the structural verification gates (Validator, two-stage review,
integration verification, `verify-task-evidence.sh` hook). Those gates check the *work*; this
policy governs what an agent is allowed to *claim*.

> **Attribution**: The "evidence before claims" gate and the lying-vs-verifying framing are
> derived from the [superpowers plugin](https://github.com/obra/superpowers) by Jesse Vincent
> (MIT License), `verification-before-completion` skill.

## The Iron Law

**No completion claim without fresh verification evidence.**

If you did not run the verifying command in your current turn, you may not say the work passes.
"It should pass", "this probably works", "the tests look green" are not claims you are permitted
to make. Run the command, read the output, then state the result.

Skipping verification and claiming success anyway is not optimism — it is reporting something
you have not confirmed to be true. Treat it as such.

## The Gate Function (run before any status claim)

Before you tell the user (or another agent) that something is done, working, passing, fixed, or
complete:

1. **Identify the command that proves the claim.** Tests passing → the test command. Build clean
   → the build command. Bug fixed → the failing-case reproduction. Requirement met → the specific
   check for that requirement.
2. **Run it fresh, this turn.** Not cached output, not "I ran it earlier", not a subagent's
   report. Run it now.
3. **Read the complete output.** Check the exit code. Count the failures. Do not skim the last
   line and assume.
4. **Confirm the output actually proves the claim.** A green run of the wrong tests proves
   nothing. A build that skipped the changed module proves nothing.
5. **Only then make the claim** — and quote the evidence (counts, coverage %, exit code,
   file:line) alongside it.

## Red Flags (stop and verify)

If you catch yourself doing any of these, stop and run the gate function:

- Hedging words: "should", "probably", "I think", "looks like", "ought to".
- Premature satisfaction: writing "Done!", "Great!", "All set!" before running anything.
- Committing or marking a task complete without a verification command in the same turn.
- Trusting a subagent's self-report. **Verify the diff independently.** A subagent saying
  "implemented and tested" is an input to verification, not a substitute for it.
- Rationalizing a skip: "this change is trivial", "just this once", "it's obviously fine".

## Verifying Delegated Work

When you delegate to a subagent and it reports success, the report is a claim to be checked, not
a fact to be relayed. Read the actual diff, run the actual tests, and confirm the change does what
the subagent said. Multi-agent orchestration's most common failure mode is a confident
self-report that does not survive an independent look — this gate exists to catch exactly that.

## Per-Type Verification

| Claim | Proof required |
|-------|----------------|
| "Tests pass" | Fresh run of the test command; all green; pass/fail counts shown |
| "Bug fixed" | Full red→green: the regression test fails before the fix and passes after |
| "Build works" | Build command exits 0 with no errors |
| "Coverage met" | Fresh coverage report; actual % shown against target |
| "Requirement done" | The specific requirement located in code (file:line) and exercised |
| "Lint clean" | Linter/type-checker run; zero errors shown |

## Relationship to the Hooks

`verify-task-evidence.sh` (TaskCompleted) and `check-teammate-tasks.sh` (TeammateIdle) enforce
this policy mechanically in Agent Teams mode — a task cannot be marked complete without evidence
in STATUS.md. In subagent mode and for the orchestrator itself, this policy is the standard you
hold yourself to. The hooks are the backstop; the discipline is yours.
