---
name: author
description: "Guided, one-question-at-a-time Socratic wizard that walks a developer through producing ONE schema-valid Scout playbook — metadata (incl. kind: investigation|procedure|toolbox) + triggers, audience tiers, inputs, ordered steps (each a schema step-kind with a safety classification), conclusions with confidence, and redaction — runs an advisory guardrail preflight, validates it against playbook.schema.json, writes it to .claude/scout/playbooks/ (a kind: toolbox playbook to playbooks/toolbox/), then registers it in the playbook INDEX. Can also MAINTAIN the manifest's ambient investigation_toolbox (/scout:author toolbox) instead of writing a playbook, and offers a draft-from-a-rich-source-doc fast path. Declarative data, no code; steps reference abstract capability names, not endpoints. Usage: /scout:author [topic or playbook id | toolbox] (optional)"
---

# Scout Author — write ONE schema-valid playbook, one question at a time

> STATUS: **v0.4.** This skill produces a single declarative **playbook** that validates
> against [`../../schema/playbook.schema.json`](../../schema/playbook.schema.json). It writes
> data, never code. The playbook it produces is projected onto delivery surfaces by later
> Scout skills — you author ONCE, never per-surface. See
> [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md).

## What this is (read this first)

A **playbook** captures ONE support investigation as declarative YAML. This skill is a
Socratic wizard (borrowing the one-question-at-a-time interrogation style of
[`../../../agent-orch/skills/brainstorm/SKILL.md`](../../../agent-orch/skills/brainstorm/SKILL.md))
that elicits every field the schema requires, assembles the YAML, **validates it against the
frozen JSON Schema**, and only then writes it to the repo's playbook store.

**Who runs this:** a **developer or support engineer with repo access** — authoring happens
in the repo. Authoring is *declarative* (you answer questions; the wizard writes YAML — you
never write code), but it is **not** a business-user activity. Business users only *consume*
the resulting investigations, through a surface, and never touch this skill.

## Hard invariants (every Scout skill obeys these)

- **INV-1 Repo-agnostic core.** No app-specific logic in Scout. The playbook you author may
  describe a repo's domain, but this skill itself hardcodes nothing app-, account-, or
  vendor-specific.
- **INV-2 Knowledge separate from delivery.** You author ONE playbook. Never author a
  per-surface variant — the projector compiles surfaces from the single artifact.
- **INV-3 Declarative authoring.** The wizard produces **data (YAML), not code**.
- **INV-5 Secrets never seen, only used.** Capability params may reference `${env.FOO}`; a
  playbook never embeds a secret value, connection string, or token.
- **INV-7 Safe-command contract.** Every executable step you author carries a `safety`
  classification. Free-form queries against a prod store are `forbidden` by definition.

## The schema is the gate (non-negotiable)

The single source of truth is [`../../schema/playbook.schema.md`](../../schema/playbook.schema.md)
(normative prose) and [`../../schema/playbook.schema.json`](../../schema/playbook.schema.json)
(machine validation, JSON Schema draft 2020-12). **The schema is FROZEN — never edit it.**
Everything you author must validate against it before it is written. Study
[`../../playbooks/examples/file-fetch-miss.playbook.yaml`](../../playbooks/examples/file-fetch-miss.playbook.yaml)
as the reference shape.

Non-negotiable authoring rules that fall out of the schema:

- Output is **YAML data**, not code. No scripts, no logic — just declarative fields.
- **Dates are QUOTED strings** (`last_verified: "2026-07-16"`, `type: date` inputs). An
  unquoted `YYYY-MM-DD` parses as a native YAML date and fails validation (JSON has no date
  type). Always quote.
- Steps reference **abstract capability names** (e.g. `run-status`, `fetch-inventory`) — NOT
  endpoints, URLs, hosts, or connection strings. `/scout:setup`'s **Capability Manifest**
  (`.claude/scout/capability-manifest.md`) binds each name to a real endpoint/proc/command +
  the env var that authenticates it. A playbook that names a capability the repo lacks is
  *valid but inert*, not broken.
- A `skill-call` step invokes the team's **EXISTING** investigators (e.g. `sentry:investigate`
  or a custom skill) and folds their output in as evidence — complement, don't replace.

## Phase Map

At the start of every phase, print a banner:

```
═══════════════════════════════════════════════════════
/scout:author phase <label>: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| Label | Phase name                                             |
|-------|--------------------------------------------------------|
| 0     | Intake + read the schema + read the Capability Manifest + pick the path (wizard vs draft-from-doc vs toolbox-maintenance) |
| 1     | Metadata + triggers (identity + routing; incl. `metadata.kind` — investigation \| procedure \| toolbox) |
| 2     | Audience tiers                                         |
| 3     | Inputs (the input contract)                            |
| 4     | Steps (ordered; kind + safety per step; ambient toolbox tools surfaced) |
| 5     | Conclusions (verdicts + confidence)                    |
| 6     | Redaction                                              |
| 7     | Assemble + VALIDATE against the JSON Schema (gate)     |
| 7.5   | Guardrail preflight — advisory static checks (no live data) |
| 8     | Write + report                                         |
| 9     | Register in the playbook INDEX                         |

> **Toolbox-maintenance branch (`/scout:author toolbox`).** When the user wants to maintain the
> repo's ambient **investigation toolbox** (the manifest's `investigation_toolbox` section) rather
> than write a playbook, Phase 0 routes to the **Toolbox-maintenance sub-phase** (below) — the SAME
> one-question-at-a-time wizard, but it reads/merges/writes toolbox tool entries in the manifest
> and does NOT run Phases 1–9. See [Toolbox-maintenance sub-phase](#toolbox-maintenance-sub-phase-scoutauthor-toolbox).

**CRITICAL interrogation rule (borrowed from `/agent-orch:brainstorm`): ask ONE question at a
time. Prefer multiple-choice when the option space is fixed (step kinds, safety, confidence,
tiers). Integrate each answer, then ask the next most important question. Do not batch. Do not
proceed to assembly until every REQUIRED field has an answer.**

---

## Phase 0: Intake + read the contract

**Print phase banner.**

1. **Read the schema** — [`../../schema/playbook.schema.md`](../../schema/playbook.schema.md)
   and `../../schema/playbook.schema.json`. This is the field list you must fill and the gate
   you must pass. Never edit it.
2. **Read the reference example** —
   [`../../playbooks/examples/file-fetch-miss.playbook.yaml`](../../playbooks/examples/file-fetch-miss.playbook.yaml)
   for the exact YAML shape.
3. **Read the Capability Manifest if present** — `.claude/scout/capability-manifest.md` in the
   target repo (written by `/scout:setup`). It lists the capability names available (both the
   playbook-declared `capabilities[]` AND the v0.4 ambient `investigation_toolbox[]`), the
   existing investigation skills for `skill-call`, and the `governance.role_map`. Offer these
   as the menu when eliciting steps and audience — and mark the `investigation_toolbox[]` tools
   as **ambient** (Phase 4).
   - If the manifest is **absent**, say so plainly and continue. Authoring still works: the
     author names capabilities the repo *should* provide, and the playbook is inert until
     `/scout:setup` maps them. Do not block on it.
   - **Stale manifest → suggest `/scout:setup` (v0.4).** The manifest is a snapshot from the last
     setup. If MCP tools are visible in this session (e.g. `mcp__<server>__*`) whose surface the
     manifest doesn't bind (not in `surfaces.mcp` / `capabilities[]` / `investigation_toolbox[]`),
     tell the author: *"New MCP tools are available that the manifest doesn't bind yet — run
     `/scout:setup` so steps you author against them actually execute instead of running inert."*
     Likewise, if while eliciting steps (Phase 4) the author names a capability that isn't in the
     manifest, note it will be inert until bound and point them at `/scout:setup` (or
     `/scout:author toolbox` if it's a common investigation tool). Suggestion, never a block.
4. **Seed the topic.** Use `$ARGUMENTS` (a topic or a proposed playbook id) as the starting
   context. If none, ask: "In one sentence, what support scenario should this playbook
   investigate?"
5. **Pick the path — toolbox-maintenance vs full wizard vs draft-from-a-rich-source-doc.**
   - **Toolbox-maintenance FIRST:** if `$ARGUMENTS` is (or begins with) the literal word
     `toolbox`, or the user's intent is clearly "update/refine the common-tools / investigation
     toolbox / the ambient tools every investigation can reach" (NOT "write a playbook"), route
     to the **[Toolbox-maintenance sub-phase](#toolbox-maintenance-sub-phase-scoutauthor-toolbox)**
     and do NOT run Phases 1–9. That sub-phase maintains the manifest's `investigation_toolbox`
     section, not a playbook. (Distinguish this from authoring a `kind: toolbox` *playbook* — a
     how-to-use-a-tool playbook — which DOES run the full wizard with `metadata.kind: toolbox`,
     Phase 1.3 below. Toolbox-maintenance edits the manifest tool registry; a toolbox playbook is
     a normal playbook. If the ask is ambiguous, ask which they mean.)
   If the user points at a
   **rich source doc** — a methodology doc, a runbook, an SOP, a design/postmortem — that ALREADY
   answers most of the schema fields (it has a symptom/when-to-use section, ordered steps, and a
   resolution/outcome), take the **fast path** instead of the full one-question-at-a-time wizard:
   - **Read the doc**, then **draft the whole playbook from it in one pass** (same field mapping
     `/scout:harvest` uses: symptoms/"if you see X" → `triggers.keywords`; ordered steps →
     `steps` with a `kind` + `safety` each; resolution/"this means…" → `conclusions`; infer
     `metadata.kind` from the doc — troubleshooting/diagnosis → `investigation`, a
     promote/deploy/sync/refresh procedure → `procedure`). Substitute **abstract capability names**
     for any concrete endpoint/host/connection string the doc contains (INV-5).
   - Then **REVIEW the draft WITH the user field-by-field** — present each assembled section and
     ask them to confirm or correct it (this is the "review" that replaces the wizard's
     interrogation). Any field the doc did NOT answer falls back to the wizard question for that
     field only. Then continue to Phase 7 (VALIDATE) exactly as the wizard does.
   - Distinguish this from `/scout:harvest`: harvest **auto-drafts in bulk** across a repo's whole
     doc set and marks drafts `status: draft` for later review; the author fast path drafts **ONE**
     playbook from **ONE** user-nominated doc and reviews it interactively **now**. If the user
     really wants bulk harvesting, point them at `/scout:harvest` instead.
   - **Otherwise (from scratch, no rich doc):** take the **full wizard** — Phases 1–6, one question
     at a time, as specified below. This is the default when `$ARGUMENTS` is just a topic/id.

## Phase 1: Metadata + triggers

**Print phase banner.** Elicit, ONE question at a time:

1. **`metadata.id`** — propose a kebab-case id from the topic (must match
   `^[a-z0-9]+(-[a-z0-9]+)*$`); confirm or let them override. Check it doesn't collide with an
   existing file in `.claude/scout/playbooks/`.
2. **`metadata.title`** — a human-readable one-liner.
3. **`metadata.kind`** (ask EARLY — it determines which runner picks up this playbook, where it is
   written, and how its steps are gated). Multiple-choice (the schema's fixed set,
   [`../../schema/playbook.schema.md`](../../schema/playbook.schema.md) "`metadata.kind`"):
   > "Is this playbook an **investigation**, a **procedure**, or a **toolbox** playbook?
   > (a) investigation — diagnose a symptom to a confidence-gated verdict; run by `/scout:investigate`.
   > (b) procedure — an ordered operational runbook (promote, sync, refresh, deploy) executed
   > step-by-step; run by `/scout:runbook`; mutating steps lean on `needs-approval`.
   > (c) toolbox — a how-to-USE / how-to-interpret-a-tool playbook (e.g. 'how to read the DB
   > per-run, not windowed', 'how to interpret a service's logs', 'how to run a trace query'):
   > composed as a **sub-procedure** by other playbooks (or a freewheel agent), and **NEVER routed
   > to by a symptom**."
   Default `investigation` if unsure. Record `metadata.kind`. This value flows to the INDEX entry's
   `kind` (Phase 9), so a runner routes only its own class. (It also shapes later phases: a
   `procedure` typically has mutating `needs-approval` steps and its `conclusions` act as terminal
   outcomes / verify results; `incident:` is investigation-only.)
   - **`toolbox` (v0.4).** A toolbox playbook captures how to USE or INTERPRET one specific tool —
     it is a reusable sub-procedure, not a symptom router. Because it is never a routing target,
     its `metadata.triggers.keywords` describe the TOOL/technique it teaches (so a composing
     playbook or agent can find it), not a symptom. A toolbox playbook is written to
     **`.claude/scout/playbooks/toolbox/<id>.playbook.yaml`** (the subdir `/scout:setup` scaffolds),
     NOT the store root (Phase 8), and is INDEX-registered with `kind: toolbox` (Phase 9) so
     `/scout:investigate` / `/scout:runbook` never route a symptom to it. It shares the exact
     playbook shape (still schema-valid, still rails-gated). Do NOT confuse it with the manifest's
     `investigation_toolbox` registry — that is maintained by the separate Toolbox-maintenance
     sub-phase, not authored as a playbook.
4. **`metadata.summary`** — one paragraph: what this investigates/does and when it applies.
5. **`metadata.owner`** — team or person who maintains it.
6. **`metadata.tags`** (optional) — a few routing/discovery tags.
7. **`metadata.triggers.keywords`** (REQUIRED, ≥1) — the phrases an incoming ticket would
   contain. Push for **specific** keywords that won't collide with other playbooks. Prompt:
   "What words or phrases appear in a ticket/alert that should route to THIS playbook? (These
   must be specific enough not to collide with your other playbooks.)" These keywords become the
   INDEX entry's routing `keywords` (Phase 9), so a runner matches a natural-language request
   against them — the sharper they are, the cleaner the routing.
8. **`metadata.triggers.signals`** (optional) — structured `source` + `matches` pairs (e.g. a
   failing stage name). Ask: "Is there a structured signal — a failing step name, a status
   string — that reliably indicates this scenario? (source + the text it matches)."
9. **`metadata.last_verified`** (optional) — if they want the staleness clock started, capture
   today as a **quoted** `"YYYY-MM-DD"` string.

## Phase 2: Audience tiers

**Print phase banner.**

Ask (multiple-choice; canonical v0.2 vocabulary is fixed — `developer`, `support`, `business`,
`admin`):

> "Which audience tiers may invoke this playbook at all? Individual steps and conclusions can
> NARROW this later but never widen it.
> (a) developer + support + business  (b) developer + support  (c) developer only  (d) custom"

Explain the tiers from the schema: `developer` (repo + env access, may run needs-approval with
confirmation), `support` (read-only + guided-human + scoped reads), `business` (interpretation
+ scoped read-only, always redacted + confidence-gated), `admin` (authoring/config + all of
developer). Record `audience: [...]`.

## Phase 3: Inputs (the input contract)

**Print phase banner.**

Elicit each input the playbook needs before it can run, ONE at a time. For each:

- **`name`** (matches `^[a-z0-9_]+$`), **`type`** (multiple-choice: `string`, `number`,
  `date`, `enum`, `boolean` — for `enum` also capture `values: [...]`), **`required`**
  (true/false), **`description`**, and optional **`example`**.
- Reminder: a `date`-typed input's example must be a **quoted** string.

Prompt after each: "Any other input this playbook needs? (name / type / required / what it is)"
Stop when they say no. (An empty `inputs: []` is schema-valid but rare — most investigations
need at least one identifier.)

## Phase 4: Steps (ordered investigation)

**Print phase banner.**

This is the core. Elicit steps IN ORDER, ONE at a time. For each step, walk this sub-sequence:

1. **Pick the kind** (multiple-choice — the schema's fixed set):
   | kind | executable? | use it when |
   |------|-------------|-------------|
   | `api-read` | yes | read data from a repo capability (never mutates) |
   | `query` | yes | run an **allowlisted parameterized** query/stored proc (never free-form) |
   | `shell-read` | yes | run a read-only shell command via the operator's own env |
   | `skill-call` | yes | invoke an EXISTING team investigator and use its output as evidence |
   | `guided-human` | no | instruct a person to do what Scout shouldn't automate (e.g. breakglass) |
   | `time-travel` | yes | compare state as-of run-time vs now (wraps an api-read/query) |
   | `note` | no | author commentary / reasoning aid shown during the investigation |

2. **`id`** (kebab-case), **`title`** (what this step establishes), **`audience`** (a subset of
   the playbook audience — never wider).

3. **Fill the kind-specific body:**
   - `api-read` / `query` / `shell-read` / `time-travel`: a `request.capability` = an **abstract
     capability name** (offer the manifest's list if present), plus `request.params` that may
     reference `${inputs.x}` or `${env.FOO}`. **Never** a raw endpoint, URL, host, or connection
     string.
     - **Ambient toolbox tools (v0.4).** When you present the capability menu, list the manifest's
       `investigation_toolbox[]` tools (e.g. `app-logs`, `db-read`, `traces`, `mcp`, plus any the
       repo added) in a distinct group marked **"ambient — already available to every step; you
       don't need to add a step for it unless you want to PIN it."** These tools resolve
       *ambiently* (`capabilities[]`-first, then `investigation_toolbox[]`, per
       [`../../rails/RAILS.md`](../../rails/RAILS.md) §4.1), so an investigation can read logs / db
       / traces without the playbook enumerating them. The author only names one explicitly here
       when they want to pin a specific ambient read as an ordered, `expect`-diffed step. Naming an
       ambient tool is fully valid — its resolution, gating, and DecisionRecord are identical to a
       declared capability; a toolbox `db-read` is still a named allowlisted proc, never free-form.
     - **Compose a `kind: toolbox` playbook as a sub-procedure.** If a matching `kind: toolbox`
       playbook exists in `.claude/scout/playbooks/toolbox/` (INDEX `kind: toolbox`) for a tool
       this step uses — e.g. a "how to read the DB per-run, not windowed" toolbox playbook when
       this step queries that DB — offer to reference it as a reusable **sub-procedure** (a `note`
       step pointing at it, or its steps folded in) rather than re-deriving the technique. A
       runner never *routes* a symptom to a toolbox playbook; it is only ever pulled in this way.
       (If no toolbox playbook exists for a tool whose correct use is non-obvious, suggest the user
       later author one via `/scout:author` with `metadata.kind: toolbox`.)
   - **Offer to capture an `expect` (golden snapshot) for this step** — see 3a below.
   - For a **`time-travel`** step specifically, explain what it does before eliciting the body — see
     3b below.
   - `skill-call`: `request.skill` (e.g. `"sentry:investigate"`) + `request.args`. Remind the
     author this must be a skill the team ALREADY has; a call to a missing skill is inert, not
     an error. Prefer this over re-implementing something the team already built.
   - `guided-human`: `instructions` (what the person should do). No `request`.
   - `note`: a `note` field with the commentary.

   **3a. `expect` — the golden snapshot (OPTIONAL, offer it for every read step).**
   Ask: *"What does GOOD look like for this step? Capturing an `expect` lets the investigation diff
   observed-vs-expected and report the delta (e.g. 'expected 5 files, observed 4') instead of a raw
   dump — and it feeds the confidence rubric. Skip it if the step has no meaningful baseline."*
   Offer the shapes (multiple-choice); a step may combine keys:
   | shape | example | use when |
   |-------|---------|----------|
   | **count** | `expect: { count: 5 }` | a fixed/expected number of items |
   | **set of names** | `expect: { names: [a, b, c] }` | a known set the result should contain |
   | **status value** | `expect: { status: succeeded }` | the result carries a status you expect |
   | **semantic description** | `expect: { description: "a run object with a per-stage list" }` | no mechanical key — describe the shape/meaning to check |
   Leaving `expect` off is fully valid — the feature is optional and the step still runs.

   **3b. `time-travel` — compare state as-of run time vs now.** Explain: *"A `time-travel` step
   wraps an underlying read (its `request.capability`) and runs it for TWO points — as-of the
   incident/run time and now — then reports a delta. This is what turns a false alarm into a
   self-resolve: 'absent at run time, present now → data landed late → re-run', vs 'absent both →
   genuinely missing', vs 'present both → not a data-availability issue'. Use it when the scenario
   could be a late-landing / timing artifact."* It carries a `request.capability` and `safety` like
   any read; the confidence should reflect that its delta is decisive evidence.

4. **Classify safety** (multiple-choice — REQUIRED for every executable kind, and for the
   command a `guided-human` step suggests):
   > "(a) read-only — cannot mutate or exfiltrate  (b) needs-approval — sensitive; a human
   > must confirm  (c) forbidden — must never run"
   Enforce the hard rules: a free-form query against a prod store is `forbidden` by definition;
   authoring a `forbidden` executable step is an error — steer them to a safe alternative.

5. **`on_error`** (optional; multiple-choice `continue` / `halt` / `escalate`).

Prompt after each step: "Next step, or are the steps complete?" Keep them ordered. (Schema
requires **≥1** step.)

## Phase 5: Conclusions (verdicts + confidence)

**Print phase banner.**

Elicit each possible verdict, ONE at a time. For each:

- **`id`** (kebab-case), **`when`** (the plain-language guard — the evidence pattern that
  selects this verdict), **`verdict`** (the finding), **`guidance`** (what to do about it),
  optional **`audience`**.
- **`confidence`** (multiple-choice — the schema's fixed set):
  > "(a) confirmed — state as fact  (b) likely — must be phrased 'likely, verify'  (c) unknown
  > — must escalate, never presented as an answer"

Explain how confidence behaves at investigation time so the author sets it honestly:
- The authored `confidence` is a **ceiling**, not a promise. At run time `/scout:investigate`
  derives an **achieved** confidence from the evidence and may only **hold or downgrade** it, never
  raise it. Roughly: `when` fully satisfied + all golden `expect` diffs match + any `time-travel`
  delta decisive → **confirmed**; partial/indirect evidence (a golden diff only partially matches, a
  key step was inert) → **likely — verify**; insufficient or contradictory evidence → **unknown →
  escalate**. So authoring `confirmed` promises the strongest evidence pattern; if a verdict can
  only ever be inferred, author it **`likely`**.
- A **business-tier answer may never upgrade** a conclusion's confidence — the framework (rails
  Gate D) enforces this. Pick the confidence honestly.

Prompt after each: "Another possible verdict, or complete?" (Schema requires **≥1** conclusion.)

## Phase 6: Redaction

**Print phase banner.**

Redaction is **required**. Elicit:

- **`never_return`** (optional list) — values/fields that must never appear in output (e.g.
  "connection strings", "credentials / tokens", specific PII fields).
- **`mask`** (optional list) — `field` + `strategy` (multiple-choice `last4` / `hash` /
  `full-mask`) for values shown partially.
- **`default`** (REQUIRED; multiple-choice) — `safe` (recommended: redact anything not
  explicitly allowed for the caller's tier) or `permissive`.

Default to `safe` and explain: with `safe`, authors opt fields *in* to visibility, not out.

## Phase 7: Assemble + VALIDATE (the gate)

**Print phase banner.**

1. **Assemble** the answers into a single YAML document with the fixed top-level shape:
   `apiVersion: scout/v0.3`, `kind: Playbook`, then `metadata` (including `metadata.kind` from
   Phase 1), `audience`, `inputs`, `steps`, `conclusions`, `redaction`, and optional `surfaces`.
   Ensure **all dates are quoted strings**.
2. **Validate against the JSON Schema — this is a hard gate. Do not write an invalid file.**
   Prefer running the machine validator (draft 2020-12) if a Python environment with
   `jsonschema` + `pyyaml` is available:

   ```bash
   python - "$PLAYBOOK_YAML_PATH" "plugins/scout/schema/playbook.schema.json" <<'PY'
   import sys, json, yaml, jsonschema
   doc = yaml.safe_load(open(sys.argv[1]))
   schema = json.load(open(sys.argv[2]))
   jsonschema.Draft202012Validator(schema).validate(doc)
   print("VALID")
   PY
   ```

   If `jsonschema`/`pyyaml` are unavailable, validate by hand against
   `../../schema/playbook.schema.json`, checking at minimum:
   - required top-level keys present; `apiVersion` == `scout/v0.3`; `kind` == `Playbook`.
   - `metadata` has `id` (kebab), `title`, `summary`, `owner`, `triggers.keywords` (≥1); if
     `metadata.kind` is present it is `investigation`, `procedure`, or `toolbox`.
   - every executable step (`api-read`/`query`/`shell-read`/`skill-call`/`time-travel`) has a
     `safety` from the enum; every step has `id`/`kind`/`title`/`audience`.
   - `steps` ≥1; `conclusions` ≥1 (each with `id`/`when`/`verdict`/`confidence`).
   - `redaction.default` is `safe` or `permissive`.
   - **all dates are quoted strings.**
3. **On any validation error, DO NOT WRITE.** Report the exact failure, return to the relevant
   phase, fix the answer, and re-validate. Loop until it validates clean.

## Phase 7.5: Guardrail preflight (advisory static checks, no live data)

**Print phase banner.**

After the playbook assembles and passes the JSON Schema (Phase 7) but BEFORE it is written
(Phase 8), run a **static guardrail preflight** — three checks with **NO live data** that catch a
"dead-on-arrival" playbook the schema alone can't: one that validates perfectly yet runs inert,
gets rejected at a rails gate, or presents a verdict the rails will always downgrade. These mirror
the store-wide guardrail preflight in [`../lint/SKILL.md`](../lint/SKILL.md) (the persistent home
for the same checks) and the runtime §6.2 liveness guardrail.

> **ADVISORY, never a hard block.** Unlike the Phase 7 schema gate, these checks **do NOT block a
> schema-valid playbook from being written** — they report **loudly**, then let the author fix the
> finding or proceed as-is (a deliberately-portable playbook may name capabilities THIS repo lacks;
> that is valid-but-inert here, not a bug). Mirror `/scout:lint`'s posture: suggest, surface, never
> force. Present the findings, ask the author whether to fix now or proceed, then go to Phase 8.

Run these three checks against the just-assembled playbook + the Capability Manifest (from Phase 0;
if the manifest is **absent**, say the checks that need it "cannot evaluate — run `/scout:setup`",
exactly as lint does, and run only what doesn't need it):

1. **Unmapped capability / toolbox tool → would run inert.** For every executable step
   (`api-read`/`query`/`diagnostic-query`/`shell-read`/`time-travel` → `request.capability`;
   `skill-call` → `request.skill`; `agent-investigate` → `request.role`), check the referenced name
   resolves to a manifest **`capabilities[]`** entry **OR** an **`investigation_toolbox[]`** entry
   (the ambient tools — union scan, capabilities-first, per RAILS.md §4.1) — or, for a skill/role,
   to `skills[]` / `investigators:`. If it resolves to **neither**, warn: *"step `<id>` references
   `<name>`, which is in neither `capabilities[]` nor `investigation_toolbox[]` — it will run
   **inert** on this repo (Gate B, RAILS.md §4/§4.1)."*
2. **`query` / `diagnostic-query` bound free-form → would REJECT at Gate A.1.** For every `query` /
   `diagnostic-query` step, inspect the binding it would resolve to: warn if the step carries inline
   SQL (`request.sql` / `query` / `query_text` / `statement`), OR the resolved capability's
   `endpoint` contains free-form markers (SQL keywords `SELECT`/`INSERT`/`UPDATE`/`DELETE`, `${…}`,
   `raw connection`, `connection string`, literal `free-form`), OR the endpoint is **empty**. Any of
   these would be **rejected** by the rails as forbidden-free-form-query
   ([`../../rails/RAILS.md`](../../rails/RAILS.md) §2.A.1) — the query MUST name an allowlisted proc
   (`proc:<...>`). Warn: *"step `<id>` would be **rejected at Gate A.1** (free-form query) — bind it
   to a named allowlisted proc."* (This applies identically to a toolbox `db-read`, which is always
   a named-proc placeholder.)
3. **`confirmed` conclusion that can't reach an owning-env step → would ALWAYS downgrade.** For
   every conclusion authored `confidence: confirmed`, check its `from_steps`: if **none** of those
   step ids resolves to a step whose capability carries an owning-environment marker
   (`production: true`, or an explicit env), the rails' §6.1 (confirmed-verdict-requires-owning-env)
   and §6.2 (liveness) guardrails will **always downgrade it to `likely — verify`** at run time.
   Warn: *"conclusion `<id>` is authored `confirmed` but its `from_steps` cannot reach an owning-env
   step — it will **always present as `likely — verify`** ([`../../rails/RAILS.md`](../../rails/RAILS.md)
   §6.1/§6.2). Either lower it to `likely`, or bind it to a step resolving to an owning-env
   capability."* (A conclusion with no `from_steps` at all can't demonstrate owning-env evidence —
   flag it the same way.)

**Report** the findings as a short, loud punch-list (or "guardrail preflight: clean — no inert
steps, no free-form queries, no un-anchored confirmed verdicts"). Then ask: fix now (return to the
relevant phase) or proceed to write as-is? Never silently drop a finding, and never block the write
on one.

## Phase 8: Write + report

**Print phase banner.**

1. **Only after a clean validation** (Phase 7) **and the advisory guardrail preflight** (Phase 7.5;
   findings reported, author chose fix-or-proceed), write the playbook. The path depends on
   `metadata.kind`:
   - `investigation` / `procedure` → `.claude/scout/playbooks/<metadata.id>.playbook.yaml` (the
     store root). Create `.claude/scout/playbooks/` if it doesn't exist.
   - **`toolbox` (v0.4) → `.claude/scout/playbooks/toolbox/<metadata.id>.playbook.yaml`** (the
     `toolbox/` subdir `/scout:setup` scaffolds). Create `.claude/scout/playbooks/toolbox/` if it
     doesn't exist. This is what keeps how-to-use-a-tool playbooks out of the symptom-routing set —
     the runners never route to `toolbox/`, they only compose from it.

   If a file with that id already exists (in the applicable location), ask before overwriting.
2. **Report** to the user: the path written, the id/title/kind, the capabilities and skills it
   references (flagging any NOT yet in the Capability Manifest as "inert until `/scout:setup`
   maps them"), and what to run next:
   - for a `kind: investigation` playbook, `/scout:investigate <ticket|symptom>` to route to and
     run it; for a `kind: procedure` playbook, `/scout:runbook <what you want to do>` — both route
     via the INDEX (Phase 9), so the user never types the id;
   - for a **`kind: toolbox`** playbook, there is NO symptom route — say so: it is composed as a
     **sub-procedure** by an investigation/procedure playbook (or a freewheel agent) that uses the
     underlying tool. Point the author at composing it from a step's capability (Phase 4) and note
     it will appear in the toolbox-playbook menu when authoring future playbooks that touch that
     tool, or
   - `/scout:author` again for another scenario (or `/scout:author toolbox` to maintain the ambient
     investigation toolbox), or `/scout:harvest` to auto-draft from existing docs.

## Phase 9: Register in the playbook INDEX

**Print phase banner.**

After the playbook is written (never before — the file must exist and have validated), APPEND (or
UPDATE) its entry in the per-repo playbook INDEX at `.claude/scout/playbooks/INDEX.md`. This is the
routing backbone `/scout:investigate` and `/scout:runbook` read FIRST to route a natural-language
request to the right playbook by matching `keywords`/`when_to_use` filtered by `kind`, then open
only the matched file. The structured data MUST validate against
[`../../schema/index.schema.json`](../../schema/index.schema.json) (prose spec:
[`../../schema/index.schema.md`](../../schema/index.schema.md)).

1. **Create the INDEX if missing.** If `.claude/scout/playbooks/INDEX.md` does not exist (e.g.
   `/scout:setup` was never run), create it as an empty scaffold first: `apiVersion: scout/v0.3`,
   `kind: PlaybookIndex`, `generated_by: /scout:author`, `generated_at: "<today, quoted>"`,
   `playbooks: []`.
2. **Build this playbook's entry** — exactly the six INDEX fields, drawn from the metadata you
   just authored (route, DON'T duplicate — no steps/inputs/conclusions/redaction ever go here):
   - `id` ← `metadata.id`
   - `title` ← `metadata.title`
   - `kind` ← `metadata.kind` (default `investigation` if unset; `procedure` or **`toolbox`** where
     authored). A `kind: toolbox` entry tells the runners this is a **sub-procedure only — never a
     symptom route** (index.schema: a `toolbox` entry is never routed to by an incoming symptom).
   - `keywords` ← `metadata.triggers.keywords` (the routing triggers; for a `toolbox` playbook these
     describe the tool/technique, so a composing playbook or agent can find it — not a symptom)
   - `when_to_use` ← a ONE-LINE disambiguation drawn from `metadata.summary` (so a runner can pick
     between playbooks whose keywords overlap; for a `toolbox` playbook, say which tool it teaches)
   - `path` ← the playbook file path **relative to the store** (`.claude/scout/playbooks/`), e.g.
     `<id>.playbook.yaml` for investigation/procedure, and **`toolbox/<id>.playbook.yaml`** for a
     `kind: toolbox` playbook written to the `toolbox/` subdir (Phase 8)
3. **Idempotent write.** If an entry with this `id` already exists (re-author of the same
   playbook), **UPDATE it in place** (overwrite title/kind/keywords/when_to_use/path from the new
   metadata) — do not create a duplicate. Otherwise APPEND a new entry. Refresh `generated_by`/
   `generated_at`.
4. **Validate the INDEX** — machine-check against `index.schema.json` if a Python env with
   `pyyaml` + `jsonschema` is available; otherwise hand-check (required keys `apiVersion`/`kind`/
   `playbooks`; each entry has all six fields; `id` kebab-case and matches the playbook's
   `metadata.id`; `keywords` non-empty; `kind` in {investigation, procedure, toolbox};
   `generated_at` quoted). If the INDEX would not validate, report the failure and fix the entry —
   never leave a malformed INDEX.
5. **Report** that the playbook was registered in the INDEX (id → kind) so the user knows the
   runner can now route to it by natural language. (For a `kind: toolbox` playbook, remind the user
   it is registered as a **sub-procedure only** — the runners will compose it, never route a symptom
   to it.)

---

## Toolbox-maintenance sub-phase (`/scout:author toolbox`)

**Print a phase banner** (`/scout:author phase T: toolbox-maintenance — maintain the ambient
investigation toolbox`). This is the "use `/scout:author` to update the common-tools doc" path
Phase 0 routes to. It is the **SAME guided, one-question-at-a-time wizard**, but instead of writing
a playbook it maintains the Capability Manifest's **`investigation_toolbox`** section — the ambient
shared capability layer every investigation and every step/agent can reach WITHOUT re-declaring it
(RAILS.md §4.1). It does NOT run Phases 1–9 and writes NO playbook.

**What it maintains.** `investigation_toolbox[]` is an array of capability items with the SAME
shape as `capabilities[]` (shared `$defs/capabilityItem` in
[`../../schema/capability-manifest.schema.json`](../../schema/capability-manifest.schema.json)) plus
the optional `ambient` flag (default-interpreted `true` inside the toolbox). Each tool entry has:
`name`, `kind` (`api-read` | `query` | `shell-read`), `endpoint`, `auth_env` **or**
`auth: {style, env?}` (`caller-token` | `env` | `tenant-config`), `audience` (tiers, mapped onto
the repo's OWN roles — never widened, INV-8), `safety: read-only`, optional `production`, optional
`ambient: true`, optional `source`.

Run it as a small merge wizard:

1. **Read the manifest.** Load `.claude/scout/capability-manifest.md` and its current
   `investigation_toolbox[]` (if any). If the **manifest is absent**, say `/scout:setup` has not run
   and STOP — this sub-phase edits the manifest `/scout:setup` owns; it does not create one from
   scratch. (Point the user at `/scout:setup`, which scaffolds the five canonical stubs.)
2. **Offer the slots.** Present the **five canonical tool slots** — `app-logs`, `db-read`, `traces`,
   `mcp`, `other` (the same set `/scout:setup` scaffolds) — PLUS any additional tools already in the
   manifest's `investigation_toolbox[]`. Ask which ONE the user wants to add or refine (one at a
   time). For a slot that is an unfilled stub, "add"; for a filled tool, "refine".
3. **Elicit the entry, one question at a time** (multiple-choice where the option space is fixed):
   `name` → `kind` → `endpoint` → auth (`auth_env` NAME, or `auth: {style, env?}`) → `audience`
   tiers → `production` (if it touches a prod store) → confirm `ambient: true`. Env var **NAMES
   only**, never values (INV-5).
   - **`db-read` is special — named allowlisted proc ONLY.** A `kind: query` toolbox tool's
     `endpoint` MUST be a **named allowlisted proc** (`proc:<your-allowlisted-read-proc>`), never
     free-form SQL and never a raw connection string. If the user tries to enter inline SQL, a
     `SELECT …`, a `${…}` template, or a connection string, **reject and steer**: explain the rails
     forbid a free-form query by definition (Gate A.1,
     [`../../rails/RAILS.md`](../../rails/RAILS.md) §2.A.1) — the toolbox is exactly where a repo
     declares its read-only procs ONCE for all playbooks, so it must name a proc. Leave it as a
     `proc:<...>` placeholder until they have a real allowlisted proc name.
4. **Merge, preserving hand-edits.** Apply the SAME preserve-hand-edits rule `/scout:setup`
   re-probe uses: keep every existing hand-filled entry and manual edit verbatim; only ADD the new
   tool or UPDATE the specific fields the user just changed. Never clobber an entry the user didn't
   touch, and never drop the `source`/provenance of an entry you're not editing.
5. **Validate + write back.** Assemble the merged `investigation_toolbox[]` and validate each entry
   against `$defs/capabilityItem` (machine-check with `jsonschema`+`pyyaml` if available; else
   hand-check the required keys `name`/`kind`/`endpoint`/`audience`/`safety`, `name` kebab-case,
   `audience` non-empty, `safety: read-only`, a `query` endpoint is a `proc:<...>` not free-form).
   Write the merged section back into the manifest **in place** — touch only
   `investigation_toolbox`, leave `capabilities`/`governance`/`skills`/`investigators` untouched.
6. **Report** which tool(s) were added/refined, that hand-edits were preserved (merge, not clobber),
   and remind the user these tools are now **ambient** — available to every investigation and step
   without a playbook re-declaring them — and that any `db-read` proc must be a real allowlisted
   proc before it stops being an inert placeholder. Suggest `/scout:lint` to see which toolbox tools
   still lack a how-to-use `kind: toolbox` playbook.

## Verification before completion

Do not claim a playbook was authored until the file exists on disk AND validated clean against
`../../schema/playbook.schema.json`, AND its INDEX entry exists in
`.claude/scout/playbooks/INDEX.md` and the INDEX validates against
`../../schema/index.schema.json` (Phase 9). Read both files back to confirm. See the
[verification-before-completion policy](../../../agent-orch/policies/verification-before-completion.md).

## What this skill does NOT do

- It does not modify the schema (frozen). It does not touch the Capability Manifest's
  `capabilities`/`governance`/`skills`/`investigators` (that's `/scout:setup`) — the ONE exception
  is the Toolbox-maintenance sub-phase (`/scout:author toolbox`), which maintains ONLY the manifest's
  `investigation_toolbox` section (add/refine an ambient tool entry), preserving hand-edits and
  never touching the rest of the manifest.
- The Phase 7.5 guardrail preflight is **advisory** — it never blocks a schema-valid playbook from
  being written (it reports, loudly; the author fixes or proceeds).
- It does not project the playbook onto surfaces or run it (that's the projector /
  `/scout:investigate` / `/scout:runbook`); it never routes a symptom to a `kind: toolbox` playbook.
- It does not write code — only declarative YAML (the playbook + its minimal INDEX entry, or a
  merged `investigation_toolbox` section).

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running, check
that file for a `skills.scout-author:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points:
- `before` — targets run before intake begins (e.g. inject a house style for triggers/tiers).
- `after` — targets run after the playbook validates and is written (e.g. a lint/review pass or
  auto-registration).

Run any listed targets in order per the shared resolver
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline). Tell the
user when you run an extension target; a failing target is surfaced but does not abort the
skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
