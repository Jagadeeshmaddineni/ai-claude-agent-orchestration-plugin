---
name: make-review
description: Autonomously run all available review skills against the current PR and POST the findings to the PR via gh CLI, then display them. Default mode aggregates into ONE consolidated review; "per-skill" mode posts one PR comment per review skill. Runs end-to-end without stopping. Usage: /agent-orch:make-review [per-skill | post review as comment on PR for each of the skills]
---

# Make Review: Multi-Skill PR Review

Runs every available code-review skill against the current branch/PR and **posts
the findings back to the PR with the `gh` CLI** — then displays them in the
session. Two posting modes:

- **Consolidated (default)** — aggregate all findings into a **single** review
  and post it once via `gh pr review`.
- **Per-skill** — post **one PR comment per review skill** that produced findings
  (via `gh pr comment`), so each skill's findings are a distinct, self-labelled
  comment on the PR. Selected by argument (see Phase 0).

> **Posting is the point.** The sub-skills (`/code-review`, `/security-review`,
> `/review`, `/review-pr`) run in *display-only* mode here — they print findings
> and do NOT post to GitHub themselves. This skill is the one that actually
> writes to the PR. In **either** mode you MUST land the findings on the PR with
> `gh` (a review or comments), not merely print them to the session. Only a hard
> failure of every `gh` posting path (reported to the user) is an acceptable
> reason not to have posted.

## Autonomy Contract

**CRITICAL**: This skill runs **end-to-end without stopping for user input**.
Once invoked, you orchestrate the entire pipeline — validate, run every
available review skill, aggregate, and post the consolidated review — and only
return control to the user when the review is posted (or when a hard
prerequisite makes posting impossible).

- **Do NOT** ask "Proceed?" before running the skills. Just run them.
- **Do NOT** prompt the user to choose which skills to run. Run every available
  skill; skip unavailable ones automatically and note them.
- **Do NOT** pause between phases waiting for acknowledgement.
- The ONLY conditions that stop the run early are the hard prerequisites in
  Phase 1 that make a review impossible: on `main`/`master`, `gh` not
  authenticated, or no PR exists. Everything else degrades gracefully and the
  run continues to completion.

Print one-line status banners as you go so the user can watch progress, but
never block on a question.

The review skills it orchestrates:

| Order | Skill | Source | Required? |
|-------|-------|--------|-----------|
| 1 | `/code-review` | built-in | yes |
| 2 | `/security-review` | built-in | yes |
| 3 | `/review` | built-in | yes |
| 4 | `/build-graph` | codebase-graph-analyzer plugin | optional |
| 5 | `/review-pr` | codebase-graph-analyzer plugin | optional |

`/build-graph` and `/review-pr` depend on the **codebase-graph-analyzer** plugin
and its MCP server. If that plugin or server is unavailable, those steps are
skipped gracefully and the consolidated review notes them as "not run".

## Prerequisites

- Must be on a feature branch (not `main`/`master`)
- Current branch must have an open PR
- `gh` CLI must be authenticated (`gh auth status`)

## Process

### Phase 0: Select Posting Mode

Parse `$ARGUMENTS` to choose how findings land on the PR:

- If it contains `per-skill`, `per skill`, `each of the skills`, `each skill`, or
  `comment on PR for each` → **per-skill mode** (one `gh pr comment` per review
  skill that produced findings).
- Otherwise → **consolidated mode** (default; one `gh pr review`).

State the chosen mode in one line, then continue:
```
make-review mode: <consolidated | per-skill>. Posting findings to the PR with gh.
```

Both modes run the SAME skills (Phases 1–3). They differ only in how findings are
posted (Phase 5). Consolidated mode uses Phase 4 + Phase 5a; per-skill mode skips
straight to Phase 5b.

### Phase 1: Validate Environment

1. **Verify we are on a feature branch:**
   ```bash
   BRANCH=$(git branch --show-current)
   ```
   If branch is `main` or `master`:
   ```
   You are on the main branch. Use /agent-orch:make to start a new feature,
   then run /agent-orch:make-review once a PR exists.
   ```
   Stop here.

2. **Verify `gh` is authenticated:**
   ```bash
   gh auth status
   ```
   If not authenticated:
   ```
   GitHub CLI is not authenticated. Run `gh auth login` first.
   ```
   Stop here.

3. **Find the PR for this branch:**
   ```bash
   gh pr view --json number,title,url,state --jq '{number,title,url,state}'
   ```
   If no PR found:
   ```
   No PR found for branch <branch-name>.
   Create one with: gh pr create
   Or use /agent-orch:make to start a new feature workflow.
   ```
   Stop here.

   If PR is merged or closed, do NOT stop — note the state and continue. A
   review will still post (most useful on open PRs, but harmless on others):
   ```
   PR #<number> is <state>. Proceeding with review anyway (it will still post).
   ```

### Phase 2: Detect Available Review Skills

Determine which optional skills are installed before running anything, so the
user knows up front what will run.

1. **Check for the codebase-graph-analyzer skills** (`/build-graph`, `/review-pr`):
   - These are available only if the `codebase-graph-analyzer` plugin is
     installed AND its MCP server is reachable.
   - Detect by checking whether `build-graph` and `review-pr` appear in the
     available skills list for this session. If you cannot confirm they are
     present, treat them as unavailable.

2. **Announce the plan to the user (informational — do NOT wait for a reply):**
   ```
   /make-review is running these review skills against PR #<number>:

   Built-in (always):
     1. /code-review      — correctness bugs in the diff
     2. /security-review  — OWASP-style vulnerabilities
     3. /review           — general PR review

   Graph-backed (codebase-graph-analyzer):
     4. /build-graph      — [available | NOT INSTALLED — will skip]
     5. /review-pr        — [available | NOT INSTALLED — will skip]

   Each runs in sequence. Posting mode: <consolidated — ONE review | per-skill —
   one comment per skill>. Findings are posted to the PR with gh.
   Running now…
   ```
   Immediately proceed to Phase 3. Run every available skill; skip unavailable
   ones automatically. Do NOT ask the user to confirm or select skills.

### Phase 3: Run the Review Skills (sequentially)

Run each selected skill in order. After each one, **capture its findings
verbatim** into a per-skill buffer (used for consolidated aggregation in Phase 4
OR for per-skill posting in Phase 5b). Do NOT let any single skill post its own
PR comment or review — `/make-review` owns all posting to the PR. Run each
sub-skill in **display-only / no-post mode**: if it supports such a flag, use it;
otherwise instruct it in the Skill call to RETURN its findings to you and NOT
call `gh` itself. This is deliberate — the sub-skills only print; `/make-review`
is what writes to the PR.

For each skill, print a one-line status banner before running:
```
→ make-review 1/5: /code-review …
```

1. **`/code-review`** — run via the Skill tool. Use a high-but-bounded effort
   level appropriate to the diff size. Capture findings (file:line, severity,
   description).

2. **`/security-review`** — run via the Skill tool. Capture vulnerability
   findings with severity and location.

3. **`/review`** — run via the Skill tool. Capture general review findings.

4. **`/build-graph`** (only if available) — run via the Skill tool to ensure the
   knowledge graph is current before the graph-backed review. This produces no
   findings itself; record only whether it succeeded.

5. **`/review-pr`** (only if available) — run via the Skill tool. Capture
   blast-radius / structural findings.

**Graceful degradation**: if an optional skill is unavailable or errors, record
that in its buffer as `Not run: <reason>` and continue. A single skill failing
must NOT abort the whole review — collect what you can.

### Phase 4: Aggregate Findings (consolidated mode only)

> **Per-skill mode skips this phase** — go straight to Phase 5b.

Synthesize all per-skill buffers into ONE consolidated markdown review body.

1. **Deduplicate**: if multiple skills flag the same file:line issue, merge into
   a single entry and note which skills raised it.

2. **Group by severity** across all skills: Critical → High → Medium → Low →
   Nits/Info. Within a severity, keep entries grouped by source skill for
   traceability.

3. **Determine the review verdict** from aggregated severity counts:
   - If `Critical + High > 0` → verdict is **REQUEST_CHANGES**
   - Otherwise → verdict is **COMMENT**

   This verdict drives the `gh pr review` event in Phase 5.

4. **Build the consolidated review body** using this template:
   ```markdown
   ## Consolidated Review — PR #<number>

   _Generated by `/agent-orch:make-review` on <UTC timestamp>._
   _Skills run: <list of skills that actually ran>._
   _Skipped: <list of skills skipped + reason, or "none">._
   _Verdict: <REQUEST_CHANGES | COMMENT>._

   ### Summary
   - Critical: <N>  |  High: <N>  |  Medium: <N>  |  Low: <N>  |  Nits: <N>
   - <1-2 sentence overall assessment>

   ### Critical
   - **<file>:<line>** — <issue> _(found by: /code-review, /security-review)_

   ### High
   - ...

   ### Medium
   - ...

   ### Low
   - ...

   ### Nits / Info
   - ...

   ### Per-skill notes
   - **/code-review**: <one-line outcome, e.g. "3 findings">
   - **/security-review**: <outcome>
   - **/review**: <outcome>
   - **/build-graph**: <ran | skipped: reason>
   - **/review-pr**: <outcome | skipped: reason>

   ---
   🤖 Generated with `/agent-orch:make-review`
   ```

   If no issues were found by any skill, still post a review (verdict COMMENT)
   stating the PR is clean, listing which skills ran.

### Phase 5a: Post One Consolidated Review (consolidated mode)

Post the aggregated markdown as a **single** PR review via the `gh` CLI, using
the verdict from Phase 4 Step 3. Use a HEREDOC to preserve formatting.

**If verdict is REQUEST_CHANGES** (Critical or High findings exist):
```bash
gh pr review <number> --request-changes --body "$(cat <<'EOF'
<consolidated markdown review body>
EOF
)"
```

**If verdict is COMMENT** (no Critical/High findings):
```bash
gh pr review <number> --comment --body "$(cat <<'EOF'
<consolidated markdown review body>
EOF
)"
```

**Self-PR fallback (handle automatically — do NOT stop)**: GitHub forbids
`--request-changes` and `--approve` on your own PR. If `gh pr review` fails
because the author is reviewing their own PR (error mentions "Can not request
changes on your own pull request" or similar), automatically retry as a plain
comment so the findings still land on the PR:
```bash
gh pr comment <number> --body "$(cat <<'EOF'
<consolidated markdown review body>
EOF
)"
```
Note in the Phase 6 output that the verdict was downgraded to a comment because
the run author owns the PR.

Capture the review (or comment) URL from the command output.

If posting fails for any other reason (e.g., permissions), report the error and
fall back to displaying the consolidated review to the user only (Phase 6 still
runs). Never abort silently.

### Phase 5b: Post One Comment Per Skill (per-skill mode)

Post **one `gh pr comment` per review skill that produced findings** — this is
what the user means by "post review as comment on PR for each of the skills".
The graph builder (`/build-graph`) never has findings of its own, so it is not
posted; note it in the run summary only.

For each skill in order (`/code-review`, `/security-review`, `/review`,
`/review-pr`), build a self-labelled comment body from that skill's Phase 3
buffer:

```markdown
## <skill> review — PR #<number>

_Posted by `/agent-orch:make-review` (per-skill mode) on <UTC timestamp>._
_Findings: Critical <N>, High <N>, Medium <N>, Low <N>, Nits <N>._

### Critical
- **<file>:<line>** — <issue>

### High
- ...

### Medium / Low / Nits
- ...

---
🤖 Generated with `/agent-orch:make-review`
```

Post it:
```bash
gh pr comment <number> --body "$(cat <<'EOF'
<per-skill comment body>
EOF
)"
```

Rules for per-skill mode:
- **Post a comment for every skill that RAN and found something.** If a skill ran
  and found nothing, post a short "no findings" comment for it too (so the PR
  shows the skill ran) OR fold it into the summary — prefer posting so the record
  is explicit. Skills that were **skipped/unavailable** are NOT posted; list them
  in the Phase 6 summary.
- Capture each comment URL.
- If a single `gh pr comment` fails, record the error, keep going with the other
  skills, and report failures in Phase 6. Do not abort the whole run because one
  comment failed.
- `gh pr comment` works on your own PR, so there is no self-PR restriction here
  (unlike `gh pr review --request-changes`).

Expected result: a handful of comments on the PR — typically 3 (code-review,
security-review, review) plus `/review-pr` when the graph plugin is installed.

### Phase 6: Display to User

Print the findings to the user in the session, then a summary.

**Consolidated mode:**
```
Consolidated review posted to PR #<number>: <review-url>

Verdict:    <REQUEST_CHANGES | COMMENT | COMMENT (downgraded — author owns PR)>
Skills run: <list>
Skipped:    <list or "none">
Findings:   Critical <N>, High <N>, Medium <N>, Low <N>, Nits <N>

Next steps:
- Run /agent-orch:make-validate to address CI failures or review comments via /build
- Run /agent-orch:make-clean to merge when ready
```

**Per-skill mode:**
```
Per-skill review comments posted to PR #<number>:
- /code-review      → <comment-url>  (Critical <N>, High <N>, …)
- /security-review  → <comment-url>  (…)
- /review           → <comment-url>  (…)
- /review-pr        → <comment-url | skipped: reason>
- /build-graph      → <ran | skipped: reason> (no findings of its own)

Comments posted: <N>   Failed: <N or 0>
Skipped skills:  <list or "none">
Total findings:  Critical <N>, High <N>, Medium <N>, Low <N>, Nits <N>

Next steps:
- Run /agent-orch:make-validate to address CI failures or review comments via /build
- Run /agent-orch:make-clean to merge when ready
```

## Error Handling

| Scenario | Action |
|----------|--------|
| On `main`/`master` | Tell user to use `/make` first |
| `gh` not authenticated | Tell user to run `gh auth login` |
| No PR for branch | Suggest `gh pr create` or `/make` |
| PR merged/closed | Note state, continue automatically (review still posts) |
| codebase-graph-analyzer not installed | Skip `/build-graph` + `/review-pr`, note in review |
| A single review skill errors | Record `Not run: <reason>`, continue with the rest |
| `gh pr review` rejected (author owns PR) | Auto-retry as `gh pr comment`, note downgrade (consolidated mode) |
| `gh pr review` fails (other) | Report error, still display consolidated review to user |
| Per-skill: a single `gh pr comment` fails | Record error, continue with other skills, report failures in Phase 6 |
| No findings from any skill | Consolidated: post a "clean" review (COMMENT). Per-skill: post a short "no findings" comment per skill that ran (or note in summary), listing skills |

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.make-review:` entry. If the file is absent, has no
entry for this skill, or the entry is empty, **run exactly as documented above — no
behaviour change.** This is the default and most common case.

If an entry exists, this skill exposes these hook points:
- `before` — targets run before the skill's main work
- `after` — targets run after the skill's main work

Run any listed targets in order, following the shared resolver in
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline).
Tell the user when you run an extension target. A failing target is surfaced but does
NOT abort the skill unless the user aborts. Full contract:
`plugins/agent-orch/rules/extensibility.md`.
