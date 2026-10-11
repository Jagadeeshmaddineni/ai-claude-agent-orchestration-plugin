---
type: incident
title: "Scout findings — <playbook title> — <short-id>"
description: "<one-line what-was-found; redacted, no secret>"
scout_playbook_id: <playbook-id>
scout_playbook_version: scout/v0.2
caller_tier: <developer|support|business|admin>
verdict_confidence: <confirmed|likely|unknown>
timestamp: "<ISO-8601>"
---

<!--
  Scout findings artifact — the structured markdown every /scout:investigate run emits.
  This is a TEMPLATE + SPEC; /scout:investigate fills every <placeholder> from the run and
  writes the result into the TARGET repo at:
    .claude/scout/findings/<date>-<playbook-id>-<short-id>.md

  The YAML frontmatter block ABOVE must be the very first bytes of the emitted file (no
  comment, blank line, or BOM before it) or renderers/ingesters will not parse it as
  frontmatter. Keep every key on its own line. Quote every string value that contains a
  colon or is a date (a bare YYYY-MM-DD parses as a native YAML date).

  RULES this artifact must always obey (enforced upstream by the rails, restated here):
  - Contains NO secret and NO redaction.never_return value. Everything below already passed
    the rails redaction pass (Gate F). An ${env.NAME} value NEVER appears — only the NAME.
  - Capabilities and skills are cited BY NAME, never by resolved endpoint/host/connection string.
  - Every step records its rails DECISION (allow | needs-approval | reject | inert) + reason.
  - Confidence is rendered exactly as authored (business tier may never upgrade it).
  - Safe to attach to a ticket and, when a team-work wiki exists, to ingest via
    /team-work:work-ingest as an incident.
-->

# Scout Findings — <playbook title>

> Emitted by `/scout:investigate` on `<date>`. All evidence below is post-redaction; no secret
> or `never_return` value appears. Capabilities/skills are cited by name only.

## 1. What was investigated (inputs)

- **Intake:** `<ticket|run-id|free-text as given>`
- **Selected playbook:** `<playbook-id>` — "<playbook title>" (`apiVersion: scout/v0.2`)
- **Why this playbook routed here:** <matched trigger(s): the signal and/or keyword(s) that won,
  and a one-line score rationale. If "no playbook matched — generic guided investigation", say so.>
- **Caller tier:** `<developer|support|business|admin>` (surface: `<claude-code|chat|mcp|runbook>`)
- **Bound inputs** (redacted):

  | input | value (redacted) |
  |-------|------------------|
  | `<name>` | `<value-or-masked>` |
  | `...` | `...` |

## 2. Evidence — per step, what ran and the rails decision

One row per `steps[]` entry, in the order executed. `decision` is the rails outcome; `reason`
is the engine's reason (e.g. gate that decided it). Evidence is the **redacted** result.

| # | step id | kind | safety | rails decision | gate · reason | evidence (redacted) | golden / time-travel |
|---|---------|------|--------|----------------|---------------|---------------------|----------------------|
| 1 | `<id>` | `<kind>` | `<read-only\|needs-approval\|forbidden>` | `<allow\|needs-approval\|reject\|inert>` | `<gate · reason>` | `<redacted result, or "—" if not run>` | `<diff/delta, or "—">` |
| 2 | ... | ... | ... | ... | ... | ... | ... |

Notes to fill per decision type:
- **allow** — show the redacted result. If the step had an `expect`, put the **golden diff** in the
  last column as observed-vs-expected + its outcome (`match` / `partial` / `mismatch` /
  `indeterminate`), e.g. `expected 5, observed 4 — missing <segment> (partial)` — NOT the raw dump.
  For a `time-travel` step, put the **delta** there (`absent-then, present-now → landed late`,
  `absent both → genuinely missing`, `present both → not a data-availability issue`, etc.).
- **needs-approval** — note whether it was confirmed (by which tier) and then ran, or stayed
  blocked. Show the dry-run preview summary (endpoint/command shown as name only; `${env.NAME}`
  as the name).
- **reject** — state the gate + reason (e.g. `forbidden` safety, `tier not in step audience`,
  `free-form production query`). Nothing executed.
- **inert** — state the engine's reason (`capability '<name>' not bound in this repo's manifest`,
  `skill '<name>' not available in this repo`, or kind mismatch). Normal, expected skip. A golden /
  time-travel column here reads `indeterminate` (no signal available).

<!-- OPTIONAL: include the raw rails DecisionRecord chain (RAILS.md section 8) verbatim for full
     audit. It is safe to include — it holds names/outcomes/reasons only, never a secret or a
     never_return value.
```yaml
- step_id: <id>
  kind: <kind>
  caller_tier: <tier>
  outcome: <allow|needs-approval|reject|inert>
  gate: <A-safety|B-capability|C-audience|D-confidence|F-redaction|null>
  reason: "<secret-free explanation>"
  capability: <name-or-null>
  redactions: [ { field: <name>, action: <removed|masked|blocked>, why: <...> } ]
  timestamp: "<ISO-8601>"
```
-->

## 3. Conclusion

- **Verdict:** <the selected conclusion's verdict, phrased per its confidence>
- **Confidence:** `<confirmed|likely|unknown>` — the **achieved** level (the lower of the authored
  ceiling and what the evidence supports); confidence is first-class here and in the frontmatter.
  - `confirmed` -> stated as fact · `likely` -> "likely — verify" (say WHAT to verify) · `unknown` -> escalate, not settled.
  - **Why this level (evidence→confidence rubric):** <one line — e.g. "when guard fully satisfied +
    all golden diffs matched + time-travel decisive → confirmed"; or "golden diff partial / key read
    inert → downgraded to likely, verify <X>"; or "evidence insufficient/contradictory → unknown,
    escalated".>
  - (Business-tier answers are rendered at or below the authored confidence — never upgraded.)
- **How the evidence supports it:** <which step results satisfied the conclusion's `when` guard.
  Call out each **golden diff** as observed-vs-expected (e.g. "expected 5 files, observed 4 —
  missing <segment>"), and any **time-travel delta** and what it implies (e.g. "absent at run time,
  present now → data landed late → re-run").>
- **Guidance:** <the conclusion's `guidance`.>

## 4. Recommended next step

<Exactly one primary recommendation, drawn from the verdict, e.g.:>
- **Fix on the spot** — hand off to `/agent-orch:make` with a prompt summarizing the root cause and
  affected area (redacted; no secret). <or>
- **Re-run with corrected parameters** — <what to change>. <or>
- **Escalate to engineering** — <the specific host/component named in the redacted evidence>. <or>
- **Attach this findings doc to the originating ticket** as-is.

## 5. Citations / provenance

- **Playbook:** `<playbook-id>` — link relative to this findings doc, e.g.
  `[<playbook-id>](../playbooks/<playbook-id>.playbook.yaml)` · `apiVersion: scout/v0.2`
  · owner `<metadata.owner>` · `last_verified: "<date-if-present>"`
- **Capabilities used (by NAME only):** `<capability-name>`, `<capability-name>` …
  (resolved endpoints/commands live in the Capability Manifest; they are NOT reproduced here.)
- **Skills invoked (by NAME only):** `<plugin:skill>` … (or "none")
- **Capability Manifest:** `../capability-manifest.md` (link relative to this findings doc)
- **Rails contract applied:** every step above was gated by the ordered decision algorithm in the
  Scout rails engine; redaction ran before this file was written.
- **Investigated at:** `<ISO-8601 timestamp>` · **by tier:** `<caller_tier>`

<!-- Provenance links use relative markdown so they resolve on GitHub and Obsidian. The ../ hops
     assume this file lives at .claude/scout/findings/; adjust the depth if the findings dir
     differs. When ingested into a team-work wiki (type: incident), the wiki keeps these as
     standard relative markdown links. -->
