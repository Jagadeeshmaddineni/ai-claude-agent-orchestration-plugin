---
type: plan
title: "Scout mutation plan — <procedure title> — <short-id>"
description: "<one-line what-this-procedure-WOULD-change; nothing executed, nothing mutated; redacted, no secret>"
scout_playbook_id: <procedure-id>
scout_playbook_kind: procedure
scout_playbook_version: scout/v0.3
caller_tier: <developer|support|business|admin>
executed: false
timestamp: "<ISO-8601>"
---

<!--
  Scout MUTATION-PLAN PREVIEW artifact — the "here is exactly what this procedure WOULD change"
  plan a /scout:runbook --dry-run pass emits. It is the trust-unlock surface for an operator: it
  lists every step that WOULD run (in order), the resolved target, the params, the rails decision
  that WOULD apply, and the redaction that WOULD be applied — and executes NOTHING, MUTATES NOTHING.
  No capability is called; no ${env.*} value is read. It is the safe, shareable "the mutation plan"
  doc — attach it to a ticket / change request for approval BEFORE a real run.

  This is a TEMPLATE + SPEC; /scout:runbook --dry-run fills every <placeholder> from the planned
  run and writes the result into the TARGET repo at:
    .claude/scout/previews/<date>-<procedure-id>-<short-id>.md

  The YAML frontmatter block ABOVE must be the very first bytes of the file (no comment, blank
  line, or BOM before it). Keep every key on its own line. Quote every string value that contains
  a colon or is a date. `executed: false` is INVARIANT for this artifact — a preview never records
  an execution, and a mutation plan never mutates.

  RULES this artifact must always obey (the same rails invariants as a run doc, plus RAILS.md §10):
  - It reflects the rails `decide()` outcome for each step; it NEVER re-decides differently and
    NEVER implies a `forbidden`/`reject` step could run (INV-9, INV-7). A MUTATING step is shown as
    `needs-approval` — it WOULD require a confirmation by an approval tier before running.
  - Env vars appear as their NAME only — `${env.NAME}` — never a value (INV-5). Resolved targets are
    shown by capability NAME + resolved endpoint/command; a secret in a connection is NAME-only.
  - The "redaction WOULD apply" column names what the redaction pass would do (fields
    removed/masked/blocked); it never contains a sensitive value (INV-6).
  - Nothing was executed and nothing mutated. Every entry is hypothetical ("would call…").
-->

# Scout Mutation Plan — <procedure title>

> ⚠️ **NOTHING WAS EXECUTED. NOTHING MUTATED.** This is a plan-only preview emitted by
> `/scout:runbook … --dry-run` on `<date>`. No capability was called, no mutation ran, no command
> executed, and no `${env.*}` value was read. It shows exactly what a *real* run WOULD change so it
> can be reviewed/approved first. Run without `--dry-run` to execute — each executable step still
> passes the rails at run time, and every **mutating** step still requires a confirmed preview by an
> approval tier (`developer`/`admin`, per the manifest `approval_tiers`; never `business`).

## 1. What would be run (planned inputs)

- **Request:** `<the natural-language request as given>`
- **Selected procedure:** `<procedure-id>` — "<procedure title>" (`apiVersion: scout/v0.3`,
  `metadata.kind: procedure`)
- **Why this routed here:** <matched INDEX keyword(s) / `when_to_use`, filtered to kind: procedure,
  + one-line score rationale>
- **Caller tier:** `<developer|support|business|admin>` (surface: `<claude-code|chat|mcp>`) —
  <state whether this tier CAN confirm a mutation: developer/admin yes, support/business no>
- **Bound / to-be-bound inputs** (redacted):

  | input | value (redacted) | status |
  |-------|------------------|--------|
  | `<name>` | `<value-or-masked>` | `<bound | would-prompt (required, missing)>` |

## 2. Planned steps — every step that WOULD run, in order (nothing executed)

One row per `steps[]` entry, in authored order. `WOULD-decide` is the rails outcome the preview
REFLECTS from `decide()` — it is not a fresh/looser decision. A **mutating** step WOULD be
`needs-approval`. A `reject`/`forbidden`/`inert` row shows the step would NOT run and why.

| # | step id | kind | safety | MUTATES? | resolved target (NAME → endpoint/command) | params (secrets as `${env.NAME}`) | WOULD-decide (rails) | gate · reason | redaction WOULD apply |
|---|---------|------|--------|----------|-------------------------------------------|-----------------------------------|----------------------|---------------|-----------------------|
| 1 | `<id>` | `<kind>` | `<read-only\|needs-approval\|forbidden>` | `<yes\|no>` | `<capability-name → resolved endpoint/command; ${env.NAME} name-only>` | `<param: ${inputs.x} / ${env.NAME}>` | `<allow\|needs-approval\|reject\|inert>` | `<gate · reason>` | `<fields removed/masked/blocked, by NAME>` |
| 2 | ... | ... | ... | ... | ... | ... | ... | ... | ... |

Per WOULD-decide type (fill only what applies):
- **allow** — a provably `read-only` step (a pre-flight check or the verify step) that WOULD execute
  at run time; still redacted (name the redaction). For `developer`/`admin` this would auto-proceed.
- **needs-approval (MUTATION)** — the step WOULD BLOCK pending confirmation by an approval tier
  (`approval_tiers`). Show the full mutation preview content (resolved target, params, redaction) —
  the same preview a normal run renders before the mutation. Note who could confirm; **there is no
  auto-proceed for a mutation.**
- **reject** — the step WOULD NOT run: state the gate + reason (`forbidden` safety, free-form
  production query, tier not in step audience, step audience widens playbook audience). NEVER imply
  it could run with confirmation.
- **inert** — the step WOULD be skipped with the engine's reason (`capability '<name>' not bound in
  this repo's manifest` / `skill '<name>' not available` / kind mismatch). Normal for a portable
  playbook — but flag it: **a skipped mutation in a procedure can leave a partial operation.**

## 3. Verify step (planned — would run after the mutations)

- **Verify step:** `<step id>` — `<read-only | diagnostic-query>` — <what end state it would confirm>
- **Expected end state (`expect`, if any):** <the `expect` shape the verify step would diff against>
- Nothing is run; this is the check a real run WOULD perform after the mutations to confirm success.

## 4. Rollback guidance (informational — NOT run)

- **Rollback path from the playbook:** <the `guided-human` rollback step's instructions, or a named
  `needs-approval` rollback step. If the procedure carries none, say so — the plan flags a missing
  rollback as a review concern.>
- This would only be surfaced by a real run **if the verify step failed**; it is shown here so the
  approver sees the undo path before authorizing.

## 5. Confirmation required before a real run

- **Mutating (`needs-approval`) steps above:** `<count>` — each requires confirmation by a tier in
  the manifest `governance.approval_tiers` (default `[developer, admin]`; never `business`). A
  `support`/`business` caller may READ this plan but cannot confirm any mutation.
- **`forbidden`/`reject` steps above:** `<count>` — these will NOT run under any confirmation.
- **To execute:** re-run without `--dry-run`. Steps run strictly in order (halt-on-failure by
  default); each `read-only` step for `developer`/`admin` proceeds (with redaction), and every
  mutating step re-renders this preview inline and waits for an authorized confirm.

## 6. Provenance

- **Procedure:** `<procedure-id>` — `[<procedure-id>](../playbooks/<path-from-index>)` ·
  `apiVersion: scout/v0.3` · `metadata.kind: procedure` · owner `<metadata.owner>`
- **Capabilities that WOULD be used (by NAME only):** `<capability-name>`, … (resolved
  endpoints/commands live in the Capability Manifest; NOT reproduced here.)
- **Skills that WOULD be invoked (by NAME only):** `<plugin:skill>` … (or "none")
- **Capability Manifest:** `../capability-manifest.md`
- **Rails contract:** each WOULD-decide above REFLECTS the ordered decision algorithm (RAILS.md §1)
  and the procedure-execution semantics (RAILS.md §10); the preview never re-decides and never
  surfaces a secret.
- **Planned at:** `<ISO-8601 timestamp>` · **by tier:** `<caller_tier>` · **executed:** `false`

<!-- Provenance links use relative markdown so they resolve on GitHub and Obsidian; the ../ hops
     assume this file lives at .claude/scout/previews/. This artifact is safe to attach to a ticket
     or change request for approval — it is post-redaction, cites by NAME only, and executed and
     mutated nothing. -->
