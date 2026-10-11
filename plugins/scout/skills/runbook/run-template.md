---
type: procedure-run
title: "Scout runbook run — <procedure title> — <short-id>"
description: "<one-line what-ran-and-the-verify-outcome; redacted, no secret>"
scout_playbook_id: <procedure-id>
scout_playbook_kind: procedure
scout_playbook_version: scout/v0.3
caller_tier: <developer|support|business|admin>
verify_outcome: <success|failed|partial|blocked|not-run>
verify_confidence: <confirmed|likely|unknown>
executed: true
timestamp: "<ISO-8601>"
---

<!--
  Scout runbook RUN artifact — the structured markdown every /scout:runbook run emits. This is a
  TEMPLATE + SPEC; /scout:runbook fills every <placeholder> from the run and writes the result into
  the TARGET repo at:
    .claude/scout/runs/<date>-<procedure-id>-<short-id>.md

  The YAML frontmatter block ABOVE must be the very first bytes of the emitted file (no comment,
  blank line, or BOM before it) or renderers/ingesters will not parse it as frontmatter. Keep every
  key on its own line. Quote every string value that contains a colon or is a date (a bare
  YYYY-MM-DD parses as a native YAML date).

  RULES this artifact must always obey (enforced upstream by the rails, restated here):
  - Contains NO secret and NO redaction.never_return value. Everything below already passed the
    rails redaction pass (Gate F). An ${env.NAME} value NEVER appears — only the NAME. A procedure
    never echoes a secret it used to authenticate a mutation (RAILS.md §10 P4).
  - Capabilities and skills are cited BY NAME, never by resolved endpoint/host/connection string.
  - Every step records its rails DECISION (allow | needs-approval | reject | inert) + reason. For a
    confirmed mutation, it records WHICH APPROVAL TIER confirmed it.
  - No mutation ran without a confirmed preview by an authorized tier.
  - Safe to attach to a ticket / change request and, when a team-work wiki exists, to ingest via
    /team-work:work-ingest.
-->

# Scout Runbook Run — <procedure title>

> Emitted by `/scout:runbook` on `<date>`. All output below is post-redaction; no secret or
> `never_return` value appears. Capabilities/skills are cited by name only. No mutation ran without
> a confirmed preview by an approval tier.

## 1. What was run (inputs)

- **Request:** `<the natural-language request as given>`
- **Selected procedure:** `<procedure-id>` — "<procedure title>" (`apiVersion: scout/v0.3`,
  `metadata.kind: procedure`)
- **Why this procedure routed here:** <matched INDEX keyword(s) / `when_to_use`, filtered to
  kind: procedure, + a one-line score rationale. If the caller picked from ranked candidates, say so.>
- **Caller tier:** `<developer|support|business|admin>` (surface: `<claude-code|chat|mcp>`)
- **Bound inputs** (redacted):

  | input | value (redacted) |
  |-------|------------------|
  | `<name>` | `<value-or-masked>` |
  | `...` | `...` |

## 2. Execution — per step, what ran and the rails decision

One row per `steps[]` entry, in the order executed. `decision` is the rails outcome; `reason` is the
engine's reason (the gate that decided it). Output is the **redacted** result.

| # | step id | kind | safety | MUTATES? | rails decision | gate · reason | confirmed by | result (redacted) |
|---|---------|------|--------|----------|----------------|---------------|--------------|-------------------|
| 1 | `<id>` | `<kind>` | `<read-only\|needs-approval\|forbidden>` | `<yes\|no>` | `<allow\|needs-approval\|reject\|inert>` | `<gate · reason>` | `<tier, or "—">` | `<redacted result, or "—" if not run>` |
| 2 | ... | ... | ... | ... | ... | ... | ... | ... |

Notes to fill per decision type:
- **allow** — a provably `read-only` step (pre-flight or verify). Show the redacted result; if it
  had an `expect`, put the diff as observed-vs-expected + outcome (`match`/`partial`/`mismatch`/
  `indeterminate`).
- **needs-approval (MUTATION)** — record whether it was **confirmed** (by which approval tier) and
  then ran, or **stayed blocked** (an unauthorized tier / a decline). Show the mutation preview
  summary (endpoint/command NAME only; `${env.NAME}` as the name). A blocked mutation halts the
  procedure — say so.
- **reject** — state the gate + reason (`forbidden` safety, `tier not in step audience`, free-form
  production query). Nothing executed; the procedure halted if the step was load-bearing.
- **inert** — state the engine's reason (`capability '<name>' not bound…` / `skill '<name>' not
  available` / kind mismatch). **Flag prominently for a procedure** (RAILS.md §10 P3): a skipped
  mutation can leave a partial operation — state what did NOT happen.

<!-- OPTIONAL: include the raw rails DecisionRecord chain (RAILS.md §8) verbatim for full audit. It
     is safe to include — it holds names/outcomes/reasons/resolved_env only, never a secret or a
     never_return value.
```yaml
- step_id: <id>
  kind: <kind>
  caller_tier: <tier>
  outcome: <allow|needs-approval|reject|inert>
  gate: <A-safety|B-capability|C-audience|D-confidence|F-redaction|null>
  reason: "<secret-free explanation>"
  capability: <name-or-null>
  resolved_env: <production|non-production|<env-name>|null>
  redactions: [ { field: <name>, action: <removed|masked|blocked>, why: <...> } ]
  requires_confirmation_by: [<tiers>]   # only for needs-approval
  timestamp: "<ISO-8601>"
```
-->

## 3. Verify + rollback (RAILS.md §10 P4)

- **Verify step:** `<step id>` — <what end state it confirmed>
- **Verify outcome:** `<success | failed | partial | blocked | not-run>` — <the redacted verify
  evidence; if the step had an `expect`, the diff as observed-vs-expected + `match`/`partial`/
  `mismatch`/`indeterminate`>
- **Terminal conclusion (verify result):** <the selected `conclusions[]` verdict, phrased per its
  confidence> — **confidence** `<confirmed|likely|unknown>` (`confirmed` -> fact · `likely` ->
  "likely — verify" · `unknown` -> escalate; a business-tier answer is never upgraded).
- **Rollback:** <if verify FAILED or the run was halted/partial: the rollback guidance surfaced from
  the playbook (the `guided-human` rollback instructions, or the named `needs-approval` rollback
  step which itself requires a confirmed preview). State which mutations completed and which did
  not. If verify SUCCEEDED, "not needed".> **A rollback mutation is never auto-run** — it is
  `needs-approval` like any mutation.

## 4. Recommended next step

<Exactly one primary recommendation, drawn from the verify outcome, e.g.:>
- **Verify failed / partial** — follow the surfaced rollback guidance for `<component>`, then re-run
  the verify step. <or>
- **Blocked on a mutation this tier could not confirm** — an approval tier (`developer`/`admin`, per
  the manifest `approval_tiers`) must re-run to confirm; attach this run doc (and/or the `--dry-run`
  mutation plan) to a change request for that approval. <or>
- **Completed & verified** — no further action; attach this run doc to the change record. <or>
- **Attach this run doc to the originating ticket / change request** as-is.

## 5. Citations / provenance

- **Procedure:** `<procedure-id>` — link relative to this run doc, e.g.
  `[<procedure-id>](../playbooks/<path-from-index>)` · `apiVersion: scout/v0.3` ·
  `metadata.kind: procedure` · owner `<metadata.owner>` · `last_verified: "<date-if-present>"`
- **Capabilities used (by NAME only):** `<capability-name>`, `<capability-name>` … (resolved
  endpoints/commands live in the Capability Manifest; they are NOT reproduced here.)
- **Skills invoked (by NAME only):** `<plugin:skill>` … (or "none")
- **Capability Manifest:** `../capability-manifest.md` (link relative to this run doc)
- **Rails contract applied:** every step above was gated by the ordered decision algorithm
  (RAILS.md §1) and the procedure-execution semantics (RAILS.md §10); redaction ran before this file
  was written; no mutation ran without a confirmed preview.
- **Run at:** `<ISO-8601 timestamp>` · **by tier:** `<caller_tier>` · **executed:** `true`

<!-- Provenance links use relative markdown so they resolve on GitHub and Obsidian. The ../ hops
     assume this file lives at .claude/scout/runs/. When ingested into a team-work wiki, the wiki
     keeps these as standard relative markdown links. -->
