# One Comment, Every Reviewer: Consolidated PR Review with `/make-review` (v2.36.0)

You have more than one way to review a pull request. That's the problem.

Claude Code ships `/code-review`. `/security-review` looks for OWASP-style vulnerabilities. `/review` does a general pass. The `codebase-graph-analyzer` plugin adds `/review-pr`, which traces the blast radius of a change through a knowledge graph. Each one is good at its job. None of them know the others exist.

So you run them one at a time, and your PR collects a pile of separate comments -- one per skill, each with its own format, its own severity scale, and its own duplicate of the same finding three other skills already flagged. Reviewers scroll. Authors lose track of which comment is authoritative. The signal drowns in ceremony.

v2.36.0 fixes this with `/agent-orch:make-review`: it runs every review skill you have installed, merges their findings into **one** consolidated comment, posts that single comment to the PR, and shows it to you in the session.

## The Problem: More Reviewers, More Noise

The review skills multiplied faster than the workflow around them. Each new one was a net good in isolation -- but in practice they competed for attention on the same PR.

Three failure modes showed up repeatedly:

- **Duplicate findings.** `/code-review` and `/security-review` both flag the same unvalidated input at `auth.ts:42`. Now there are two comments for one bug, and a reviewer has to read both to confirm they're the same.
- **Inconsistent severity.** One skill calls something "High", another "Medium", a third doesn't rank at all. There's no single ranked list to triage against.
- **Skill sprawl.** Did anyone run the security pass? The graph review? With separate comments, "what got checked" is something you reconstruct by reading the comment history.

The skills were never designed to coordinate. Someone had to own the aggregation.

## The Solution: One Skill That Orchestrates the Rest

```bash
/agent-orch:make-review
```

That's it. From a feature branch with an open PR, `/make-review` runs the full review suite and produces a single consolidated comment.

It orchestrates five skills in order:

| Order | Skill | Source | Required? |
|-------|-------|--------|-----------|
| 1 | `/code-review` | built-in | yes |
| 2 | `/security-review` | built-in | yes |
| 3 | `/review` | built-in | yes |
| 4 | `/build-graph` | codebase-graph-analyzer | optional |
| 5 | `/review-pr` | codebase-graph-analyzer | optional |

The built-in three always run. The two graph-backed skills run only if the `codebase-graph-analyzer` plugin and its MCP server are available -- and if they're not, those steps are skipped gracefully, with the consolidated comment noting them as "not run". You never get a hard failure because an optional plugin isn't installed.

## How It Works

`/make-review` runs in six phases.

**Phase 1 -- Validate.** Confirms you're on a feature branch (not `main`), that `gh` is authenticated, and that an open PR exists for the branch. If the PR is merged or closed, it asks whether to review anyway. No surprises -- it tells you what's wrong and how to fix it before doing anything.

**Phase 2 -- Detect available skills.** Before running anything, it checks which optional skills are installed and reports the plan up front:

```
/make-review will run these review skills against PR #128:

Built-in (always):
  1. /code-review      — correctness bugs in the diff
  2. /security-review  — OWASP-style vulnerabilities
  3. /review           — general PR review

Graph-backed (codebase-graph-analyzer):
  4. /build-graph      — available
  5. /review-pr        — available

Each runs in sequence; findings are merged into ONE comment on the PR.
Proceed? (yes / no / selective)
```

You can run everything, cancel, or selectively pick which skills run.

**Phase 3 -- Run sequentially.** Each skill runs in turn behind a one-line status banner (`→ make-review 2/5: /security-review …`). Crucially, no individual skill posts its own comment -- `/make-review` owns the single consolidated comment, so each skill returns its findings to be aggregated. If one skill errors, it's recorded as `Not run: <reason>` and the review continues. One failure never aborts the whole pass.

**Phase 4 -- Aggregate.** This is the part that makes the noise go away:

- **Deduplicate.** If multiple skills flag the same `file:line`, they merge into a single entry that notes which skills raised it -- e.g. `_(found by: /code-review, /security-review)_`.
- **Group by severity.** One ranked list across all skills: Critical → High → Medium → Low → Nits/Info. Within a severity, entries stay grouped by source skill for traceability.

**Phase 5 -- Post one comment.** The aggregated markdown goes to the PR as a single `gh pr comment`. If posting fails (permissions, say), it falls back to displaying the review in-session rather than losing the work.

**Phase 6 -- Display.** The full consolidated review prints in the session, with a summary line and next steps pointing at `/make-validate` (to fix what was found) and `/make-clean` (to merge when ready).

## What the Comment Looks Like

```markdown
## Consolidated Review — PR #128

_Generated by `/agent-orch:make-review` on 2026-06-01T14:22Z._
_Skills run: /code-review, /security-review, /review, /build-graph, /review-pr._
_Skipped: none._

### Summary
- Critical: 1  |  High: 2  |  Medium: 3  |  Low: 1  |  Nits: 4
- One critical injection risk in the auth path; otherwise solid.

### Critical
- **auth.ts:42** — unvalidated user input flows into the query builder
  _(found by: /code-review, /security-review)_

### High
- ...

### Per-skill notes
- **/code-review**: 4 findings
- **/security-review**: 2 findings
- **/review**: 3 findings
- **/build-graph**: ran
- **/review-pr**: 2 findings
```

One comment. One severity scale. Every reviewer's findings, deduplicated, with attribution. And an explicit record of what ran and what was skipped, so "did anyone check security?" is never a question again.

## Where It Fits in the Make Lifecycle

`/make-review` slots cleanly into the worktree feature lifecycle introduced in [v2.15.0](blog-2.15.0.md):

```bash
/agent-orch:make Add JWT auth     # worktree + build + commit + push + PR
/agent-orch:make-review            # run all reviewers → one consolidated comment
/agent-orch:make-validate          # fix CI failures + review comments via /build
/agent-orch:make-clean             # merge PR, clean up, back to main
```

Build the feature, get one honest review covering correctness, security, general quality, and structural blast radius, fix what it finds, merge. The reviewers stopped competing for attention -- now they collaborate on a single verdict.

---

**v2.36.0** -- adds `/agent-orch:make-review`: runs `/code-review`, `/security-review`, `/review`, and (when installed) the codebase-graph-analyzer's `/build-graph` + `/review-pr` against the current PR, deduplicates and severity-ranks the findings, and posts ONE consolidated comment via the `gh` CLI. Optional graph-backed skills degrade gracefully when their plugin isn't present.
