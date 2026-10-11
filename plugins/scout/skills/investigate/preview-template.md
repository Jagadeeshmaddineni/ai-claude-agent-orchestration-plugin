---
type: plan
title: "Scout dry-run preview — <playbook title or symptom> — <short-id>"
description: "<one-line what-this-run-WOULD-do; nothing executed; redacted, no secret>"
scout_playbook_id: <playbook-id-or-symptom-slug>
scout_playbook_version: scout/v0.2
caller_tier: <developer|support|business|admin>
mode: <linear|orchestrated|freewheel>
executed: false
timestamp: "<ISO-8601>"
---

<!--
  Scout DRY-RUN PREVIEW artifact — the "here is exactly what I WOULD do" plan a
  /scout:investigate --dry-run pass emits. It is the trust-unlock surface: it lists every
  step that WOULD run, the resolved target, the params, the rails decision that WOULD apply,
  and the redaction that WOULD be applied — and executes NOTHING. No capability is called; no
  ${env.*} value is read. It is the safe, shareable "the plan" doc — attach it to a ticket for
  approval BEFORE a real run.

  This is a TEMPLATE + SPEC; /scout:investigate --dry-run fills every <placeholder> from the
  planned run and writes the result into the TARGET repo at:
    .claude/scout/previews/<date>-<playbook-id-or-symptom-slug>-<short-id>.md

  The YAML frontmatter block ABOVE must be the very first bytes of the file (no comment, blank
  line, or BOM before it). Keep every key on its own line. Quote every string value that
  contains a colon or is a date. `executed: false` is INVARIANT for this artifact — a preview
  never records an execution.

  RULES this artifact must always obey (the same rails invariants as a findings doc):
  - It reflects the rails `decide()` outcome for each step; it NEVER re-decides differently and
    NEVER implies a `forbidden`/`reject` step could run (INV-9, INV-7).
  - Env vars appear as their NAME only — `${env.NAME}` — never a value (INV-5). Resolved
    targets are shown by capability NAME + resolved endpoint/command; a secret embedded in a
    connection is shown NAME-only.
  - The "redaction WOULD apply" column names what the redaction pass would do (fields
    removed/masked/blocked); it never contains a sensitive value (INV-6).
  - Nothing was executed. Every "evidence" is hypothetical ("would call…"), never a result.
-->

# Scout Dry-Run Preview — <playbook title or symptom>

> ⚠️ **NOTHING WAS EXECUTED.** This is a plan-only preview emitted by
> `/scout:investigate … --dry-run` on `<date>`. No capability was called, no query ran, no
> command executed, and no `${env.*}` value was read. It shows exactly what a *real* run
> WOULD do so it can be reviewed/approved first. Run without `--dry-run` to execute (each
> executable step still passes the rails at run time; `needs-approval` steps still require
> confirmation).

## 1. What would be investigated (planned inputs)

- **Intake:** `<ticket|run-id|free-text as given>`
- **Selected playbook(s):** `<playbook-id>` — "<playbook title>" (`apiVersion: scout/v0.2`)
  <in Mode 2, list every matching playbook; in Mode 3, "no playbook matched — freewheel plan">
- **Why this routed here:** <matched trigger(s) + one-line score rationale>
- **Caller tier:** `<developer|support|business|admin>` (surface: `<claude-code|chat|mcp|runbook>`)
- **Mode + effort tier (would-be):** `<Mode 1 Linear | Mode 2 Orchestrated | Mode 3 Freewheel>`
  — <match count + severity + rationale>
- **Bound / to-be-bound inputs** (redacted):

  | input | value (redacted) | status |
  |-------|------------------|--------|
  | `<name>` | `<value-or-masked>` | `<bound | would-prompt (required, missing)>` |

## 2. Planned actions — every step that WOULD run (nothing executed)

One row per `steps[]` entry, in authored order, across ALL selected playbooks (Mode 2) or the
freewheel hypothesis probes (Mode 3). `WOULD-decide` is the rails outcome the preview REFLECTS
from `decide()` — it is not a fresh/looser decision. A `reject`/`forbidden`/`inert` row shows
that the step would NOT run and why.

| # | step id | kind | safety | resolved target (NAME → endpoint/command) | params (secrets as `${env.NAME}`) | WOULD-decide (rails) | gate · reason | redaction WOULD apply |
|---|---------|------|--------|-------------------------------------------|-----------------------------------|----------------------|---------------|-----------------------|
| 1 | `<id>` | `<kind>` | `<read-only\|needs-approval\|forbidden>` | `<capability-name → resolved endpoint/command; ${env.NAME} name-only>` | `<param: ${inputs.x} / ${env.NAME}>` | `<allow\|needs-approval\|reject\|inert>` | `<gate · reason>` | `<fields that would be removed/masked/blocked, by NAME>` |
| 2 | ... | ... | ... | ... | ... | ... | ... | ... |

Per WOULD-decide type (fill only what applies):
- **allow** — the step WOULD execute at run time; still redacted (name the redaction). For a
  `developer`/`support` `read-only` step this is what would auto-proceed in a normal run.
- **needs-approval** — the step WOULD BLOCK pending confirmation from an authorized tier
  (`approval_tiers`). Show the full dry-run preview content (resolved target, params, redaction)
  — this is the same preview a normal run renders before the step. Note who could confirm.
- **reject** — the step WOULD NOT run: state the gate + reason (`forbidden` safety, free-form
  production query, tier not in step audience, step audience widens playbook audience). NEVER
  imply it could run with confirmation.
- **inert** — the step WOULD be skipped with the engine's reason (`capability '<name>' not bound
  in this repo's manifest` / `skill '<name>' not available` / kind mismatch). Normal, expected.

## 3. Agents & budgets that WOULD be spawned (Mode 2/3 only)

Omit this section for Mode 1 (Linear). For Mode 2/3, list each investigator role, the agent it
resolves to via the manifest `investigators:` map, and the per-agent tool-call budget — or
`inert` for a role with no available agent. Nothing is spawned; this is the plan only.

| role | resolves to (agent) | per-agent budget | assigned playbook / objective | status |
|------|---------------------|------------------|-------------------------------|--------|
| `<infra\|data\|app\|security\|observability\|incident\|generic>` | `<agent-orch:orchestrate-<role> / manifest-named / — >` | `<~N tool calls>` | `<playbook-id or hypothesis>` | `<would-spawn \| inert: role '<role>' has no agent bound>` |

- **Effort cap (would-be):** lead + up to ~5 sub-agents (HARD). State the count.

## 4. Confirmation required before a real run

- **`needs-approval` steps above:** `<count>` — each requires confirmation by a tier in the
  manifest `governance.approval_tiers` (default `[developer, admin]`; never `business`). A
  `support`/`business` caller may READ this preview but cannot confirm those steps.
- **`forbidden`/`reject` steps above:** `<count>` — these will NOT run under any confirmation.
- **To execute:** re-run without `--dry-run`. Each executable step is re-gated through the rails
  at run time; `read-only` steps for `developer`/`support` proceed (with redaction), and every
  `needs-approval` step re-renders this preview inline and waits for an authorized confirm.

## 5. Provenance

- **Playbook(s):** `<playbook-id>` — `[<playbook-id>](../playbooks/<playbook-id>.playbook.yaml)`
  · `apiVersion: scout/v0.2` · owner `<metadata.owner>`
- **Capabilities that WOULD be used (by NAME only):** `<capability-name>`, … (resolved
  endpoints/commands live in the Capability Manifest; NOT reproduced here.)
- **Skills that WOULD be invoked (by NAME only):** `<plugin:skill>` … (or "none")
- **Capability Manifest:** `../capability-manifest.md`
- **Rails contract:** each WOULD-decide above REFLECTS the ordered decision algorithm in the
  Scout rails engine (RAILS.md §1); the preview never re-decides and never surfaces a secret.
- **Planned at:** `<ISO-8601 timestamp>` · **by tier:** `<caller_tier>` · **executed:** `false`

<!-- Provenance links use relative markdown so they resolve on GitHub and Obsidian; the ../ hops
     assume this file lives at .claude/scout/previews/. This artifact is safe to attach to a
     ticket for approval — it is post-redaction, cites by NAME only, and executed nothing. -->
