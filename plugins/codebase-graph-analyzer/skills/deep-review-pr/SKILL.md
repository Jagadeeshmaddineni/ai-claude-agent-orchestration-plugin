---
name: deep-review-pr
description: Deep PR review combining structural graph analysis with multi-agent functional review. Posts findings as a GitHub PR comment.
argument-hint: "[PR number or branch]"
---

# Deep PR Review

Two-phase review combining the knowledge graph's **structural insight** (blast radius, cross-service risks, scope bundling) with the built-in `/review` skill's **functional depth** (correctness bugs in unchanged code, CLAUDE.md compliance, confidence scoring). Issues found by both methods are flagged as **corroborated** — highest priority.

---

## Phase 1: Graph Structural Review

1. **Invoke `/codebase-graph-analyzer:review-pr`** using the Skill tool:
   ```
   Skill(skill: "codebase-graph-analyzer:review-pr", args: "<PR number or branch if provided>")
   ```
   This performs: graph update, risk-scored change detection, blast radius analysis, test coverage gap identification, and file-by-file structural review.

2. **Collect structural findings** from its output — risk assessment, blast radius, missing tests, and recommendations.

3. **Enrich with signals `review-pr` doesn't cover** — call these MCP tools directly:
   - `get_affected_flows_tool(base="main")` — which critical execution paths (user-facing flows) are hit by this change? Flag any flow with criticality > 0.7.
   - `get_surprising_connections_tool()` — are there unexpected cross-community edges involving changed files?
   - **Scope bundling check**: Note how many communities the changed files span. Only flag scope bundling when the PR spans ≥ 3 communities AND at least one community's changes have severity ≥ medium (blast radius, untested hotspot, or affects a critical flow). If all changes are low-severity or in the same risk tier, do not flag.

4. **Noise filters** — apply before passing structural findings to synthesis:
   - **Discard INJECTED edges**: Remove surprising connections where `confidence_tier = "INJECTED"` or `edge_kind = "DOCUMENTS"`. These are documentation-to-code links, not architectural coupling.
   - **Functional dependents only**: When computing blast radius, count only CALLS, IMPORTS_FROM, INHERITS, and IMPLEMENTS edges. Subtract DOCUMENTS/INJECTED edges — they indicate documentation coverage, not functional dependency.
   - **Severity gate**: Only retain structural findings rated **high** or **medium** severity. If all findings are low-severity, report "No significant structural concerns" in one line instead of a table.

---

## Phase 2: Deep Functional Review

5. **Invoke the built-in `/review` skill** using the Skill tool:
   ```
   Skill(skill: "review")
   ```
   This runs the multi-agent review (5 parallel Sonnet agents covering CLAUDE.md compliance, shallow bugs, git-blame context bugs, recurring comments, and code comment accuracy). Each issue is confidence-scored 0–100; only issues ≥ 80 survive.

6. **Collect functional findings** from its output — file, line range, issue description, confidence score, code links.

   If the `/review` skill is unavailable, skip Phase 2 and note "functional review unavailable — structural review only" in the output.

---

## Phase 3: Synthesis

7. **Classify PR risk tier** (determines output format):
   - **High**: changes production service code, touches ≥ 1 critical flow, blast radius > 10 functional dependents
   - **Medium**: changes shared libraries, CI that gates deploys, or config that affects runtime
   - **Low**: changes only test scripts, docs, or isolated tooling with no downstream consumers

8. **Filter findings** — apply these rules before rendering:
   - **Drop self-refuting findings**: If a finding concludes "not a bug", "no concern", "this is correct", or equivalent, remove it. Findings that investigate and clear an issue are useful during analysis but must not appear in output.
   - **Drop confirmatory findings**: Remove entries that are purely praise ("this fix is good"). The review surfaces problems, not validations.
   - **Drop cosmetics on low-risk PRs**: For Low-risk PRs, suppress purely cosmetic findings (whitespace, formatting, trailing newlines) unless they indicate a systematic tooling issue. Mention at most as a single bullet in Recommendations.
   - **Deduplicate Issues vs Recommendations**: If a finding directly implies a single clear action, list it ONLY in Recommendations (with file reference inline). Issues tables are for findings that need explanation or where the fix isn't obvious. Never state the same point in both.

9. **Deduplicate and correlate** across both phases:
   - For each structural finding, check if a functional finding references the same file AND a related concern
   - Mark matches as `[corroborated]` — two independent methods found the same problem
   - Remaining structural findings: `[structural]`
   - Remaining functional findings: `[functional]`

10. **Render output** based on risk tier:

### Low-risk PRs (compact format)

```markdown
## Deep PR Review: <title>
**Risk**: Low — <one-line reason (e.g., "test-only changes, no production code affected")>

### Findings
1. <actionable item with file reference>
2. <actionable item>

### Recommendations
- <optional cleanup suggestions>
```

### Medium and High-risk PRs (full format)

```markdown
## Deep PR Review: <PR title or branch name>

### Summary
<what the PR does> | Risk: <medium/high> | Blast radius: <N functional dependents> | <N untested changed functions>

### Corroborated Issues
> Found independently by both graph analysis AND functional review — highest confidence.

| # | File | Issue | Structural Signal | Functional Signal |
|---|------|-------|-------------------|-------------------|
| 1 | path/file.ts | <description> | <blast radius / coupling> | <bug / violation> (confidence: N) |

### Structural Issues
| # | Severity | Category | File | Issue |
|---|----------|----------|------|-------|
| 1 | high | blast-radius | path/file.ts | 12 functional consumers depend on changed interface |
| 2 | medium | untested-hotspot | path/other.ts | No test coverage for security-relevant function |

### Functional Issues
| # | Confidence | File | Issue |
|---|-----------|------|-------|
| 1 | 95 | path/file.ts:L42-L50 | Null dereference when input is empty |

### Recommendations
1. <actionable, prioritized>
```

**Output rules**:
- Omit any section that would be empty — no empty tables, no "None" placeholders
- Blast radius reports functional dependents only (not DOCUMENTS edges)
- Critical flows and untested hotspots are mentioned in Summary line, not a separate section
- If a finding maps to a clear action, put it in Recommendations only

---

## Phase 4: Post to GitHub PR

11. **Post the review as a PR comment** if the PR is accessible:
    - Determine the PR number: from the argument, or from `gh pr view --json number` on the current branch
    - Post the rendered review output as a comment using:
      ```bash
      gh pr comment <number> --body "<rendered review markdown>"
      ```
    - If `gh` is not available or the PR is not accessible (e.g., no remote, auth failure), skip this step and display the review locally only. Do not error — the local output is still valuable.
    - Prefix the comment body with `<!-- deep-review-pr -->` so subsequent runs can identify and update the existing comment instead of posting duplicates.

---

## When to Use

- **Default PR review** — use this for thorough reviews where you want both structural and functional coverage
- **Quick review** — use `/codebase-graph-analyzer:review-delta` for fast, token-efficient structural-only reviews
- **Graph-only** — use `/codebase-graph-analyzer:review-pr` when you only need blast radius and dependency analysis

## Notes

- Phase 1 delegates to `/codebase-graph-analyzer:review-pr` + 2-3 enrichment calls (~5 seconds)
- Phase 2 delegates to `/review` which spawns 5 parallel agents (30-60 seconds)
- Total review time: ~1-2 minutes for a typical PR
- Low-risk PRs produce ~20 lines of output; high-risk PRs get the full structured format
- The PR comment uses an HTML marker (`<!-- deep-review-pr -->`) to enable update-in-place on re-runs
