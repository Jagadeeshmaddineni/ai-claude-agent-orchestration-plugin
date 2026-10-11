---
name: harvest
description: "Scan a repo for EXISTING support knowledge — docs/runbooks/, README troubleshooting sections, incident/postmortem write-ups, and Makefile targets — and AUTO-DRAFT schema-valid Scout playbooks from them (drafts a human reviews before use). Maps a runbook's steps to playbook steps, its 'if you see X' to triggers, its resolution to conclusions; infers metadata.kind (incl. kind: toolbox for a how-to-use-a-tool doc) and sets last_verified from the source doc's own date. Registers each draft in the playbook INDEX and emits a 'capabilities to add' reconciliation checklist for /scout:setup that ALSO flags investigation_toolbox + toolbox-playbook gaps. When a team-work wiki is present it may ALSO ingest the source docs, but that is optional and degrades gracefully. Complement, don't replace. Usage: /scout:harvest [path-or-glob] (optional)"
---

# Scout Harvest — auto-draft playbooks from existing support knowledge

> STATUS: **v0.4.** This skill mines a repo's *existing* support material and drafts
> declarative **playbooks** that validate against
> [`../../schema/playbook.schema.json`](../../schema/playbook.schema.json). Output is a
> **DRAFT** — a human reviews and edits it (in `/scout:author` or by hand) before it is used.
> Harvest embodies Scout's principle: **complement, don't replace.** It turns knowledge a team
> already wrote into the playbook format instead of asking them to re-author it. See
> [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md).

## What this is (read this first)

Teams already have support knowledge — runbooks, README troubleshooting sections, incident
postmortems, `Makefile` targets. This skill **scans for those sources**, **maps each onto the
playbook fields**, and **auto-drafts schema-valid YAML playbooks** so a human only has to
review, not write from scratch.

**Who runs this:** a **developer or support engineer with repo access** (harvesting happens in
the repo). Drafts are always human-reviewed before use — never treat a harvested playbook as
final. Business users only *consume* the finished investigations, through a surface.

## Hard invariants (every Scout skill obeys these)

- **INV-1 Repo-agnostic core.** No app-specific logic in Scout. This skill hardcodes nothing
  app-, account-, or vendor-specific — it reads whatever the target repo happens to have and
  maps it generically.
- **INV-2 Knowledge separate from delivery.** Each source becomes ONE playbook. Never draft a
  per-surface variant.
- **INV-3 Declarative authoring.** Drafts are **YAML data, not code.**
- **INV-4 Complementary, not a replacement.** Harvest *reuses* existing docs and scripts; a
  harvested `skill-call` step reuses the team's existing investigators.
- **INV-5 Secrets never seen, only used.** If a source doc contains a literal endpoint, host,
  connection string, or token, the draft replaces it with an **abstract capability name** and
  (where relevant) an `${env.FOO}` reference — the secret is never copied into the playbook.
- **INV-7 Safe-command contract.** Every executable step in a draft carries a `safety`
  classification. A destructive or mutating command found in a source is either dropped or,
  if diagnostic, mapped to a `guided-human`/`needs-approval` step — never auto-classified
  `read-only` when it can change state.

## The schema is the gate (non-negotiable)

Every draft must validate against [`../../schema/playbook.schema.json`](../../schema/playbook.schema.json)
(FROZEN — never edit it) before it is written. The normative field spec is
[`../../schema/playbook.schema.md`](../../schema/playbook.schema.md); the reference shape is
[`../../playbooks/examples/file-fetch-miss.playbook.yaml`](../../playbooks/examples/file-fetch-miss.playbook.yaml).
Non-negotiables carried from the schema: output is YAML data; **dates are quoted strings**;
steps reference **abstract capability names** (never endpoints) that `/scout:setup`'s
Capability Manifest maps; a `skill-call` step invokes the team's **existing** investigators.

## Phase Map

At the start of every phase, print a banner:

```
═══════════════════════════════════════════════════════
/scout:harvest phase <label>: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| Label | Phase name                                              |
|-------|---------------------------------------------------------|
| 0     | Read the schema + Capability Manifest + wiki detection  |
| 1     | Discover sources (runbooks, READMEs, incidents, Makefile) |
| 2     | Map each source onto playbook fields (incl. kind + last_verified) |
| 3     | Draft + VALIDATE against the JSON Schema (gate)         |
| 4     | Write drafts + register in INDEX + capabilities-to-add checklist + optional wiki ingest + report |

---

## Phase 0: Read the contract + detect the wiki

**Print phase banner.**

1. **Read the schema** — `../../schema/playbook.schema.md` and
   `../../schema/playbook.schema.json`. Never edit it.
2. **Read the reference example** —
   [`../../playbooks/examples/file-fetch-miss.playbook.yaml`](../../playbooks/examples/file-fetch-miss.playbook.yaml).
3. **Read the Capability Manifest if present** — `.claude/scout/capability-manifest.md`. Use
   its capability names + existing skills when mapping steps; if absent, still draft (naming
   capabilities the repo *should* provide) and note the drafts are inert until `/scout:setup`
   maps them. Also read the v0.4 **`investigation_toolbox[]`** section (the ambient shared tools —
   `app-logs`, `db-read`, `traces`, `mcp`, `other`, plus any the repo added) if present: its tool
   names both (a) resolve ambiently for a drafted step that reads logs/db/traces (union scan with
   `capabilities[]`), and (b) feed the **toolbox-gap** flags in the Phase 4 reconciliation checklist.
   If the section is absent, treat the toolbox set as empty (a v0.3 repo) — the toolbox flags simply
   find nothing.
4. **Detect a team-work wiki (OPTIONAL).** Check for `.team-work/wiki-config.md` at the repo
   root. If present, read `wiki_root:`. This enables the optional ingest in Phase 4. If
   absent, Scout works standalone — **do not block, do not error.**

## Phase 1: Discover sources

**Print phase banner.**

If `$ARGUMENTS` names a path or glob, scan that. Otherwise sweep the repo for the four source
classes below. Report what you found (path + type + a one-line description) before drafting, so
the user can deselect noise.

| Source type | How to find it (heuristics) |
|-------------|-----------------------------|
| **Runbooks** | `docs/runbooks/`, `runbooks/`, `docs/ops/`, files named `*runbook*`, `*sop*`, `*procedure*`; markdown with numbered/ordered steps and a "when to use / symptoms" header. |
| **README troubleshooting** | `README*`, `docs/**/*.md` sections whose heading matches `Troubleshoot*`, `Common (Issues\|Problems)`, `FAQ`, `Known Issues`, `Debugging`, `Errors`; often a "Symptom → Cause → Fix" table or list. |
| **Incident / postmortem write-ups** | `incidents/`, `postmortems/`, `docs/incidents/`, `rfo*`, files named `*postmortem*`, `*incident*`, `*rca*`; look for "Impact / Timeline / Root Cause / Remediation / Follow-up" structure. |
| **Makefile targets** | `Makefile`, `makefile`, `*.mk`; parse targets and their `## comment` help text. Focus on **diagnostic/read** targets (`status`, `check`, `logs`, `health`, `verify`, `diagnose`, `ls-*`) — skip build/deploy/mutating targets, or map them as `needs-approval`/`guided-human`. |

## Phase 2: Map each source onto playbook fields

**Print phase banner.**

For each selected source, apply this mapping. Draft ONE playbook per distinct scenario (a
runbook usually = one playbook; a multi-symptom README section may split into several).

| Playbook field | Draw it from the source by… |
|----------------|-----------------------------|
| `metadata.id` | kebab-case slug of the source's title/filename (match `^[a-z0-9]+(-[a-z0-9]+)*$`). |
| `metadata.title` / `summary` | the source's title + its "purpose / when to use" preamble. |
| `metadata.kind` | **infer the playbook class from the doc** (see "Inferring `metadata.kind`" below): a troubleshooting / diagnosis / "if you see X → cause" doc → `investigation`; a promote / deploy / sync / refresh / release **procedure** doc → `procedure`. Default `investigation` when genuinely ambiguous, and flag it for review. This value flows to the INDEX entry's `kind` and decides which runner (`/scout:investigate` vs `/scout:runbook`) picks the playbook up. |
| `metadata.status` | always `draft` for a harvested playbook (a human reviews before use; `/scout:lint` and the runners treat draft accordingly). |
| `metadata.owner` | CODEOWNERS for the source file, the doc's stated owner, or a placeholder to confirm. |
| `metadata.tags` | topic keywords from headings/filename. |
| `metadata.triggers.keywords` | the doc's **symptom / "if you see X" / "when this happens"** phrases → keywords. This is the highest-value mapping: a runbook's symptoms and a troubleshooting table's left column ARE the triggers. These become the INDEX entry's routing `keywords`. |
| `metadata.triggers.signals` | any explicit failing status / error string / failing step name mentioned → `source` + `matches`. |
| `metadata.last_verified` | **the SOURCE doc's OWN last-updated date — NOT today's harvest date.** See "`last_verified` from the source doc" below. Always a **quoted** `"YYYY-MM-DD"` string. |
| `inputs` | identifiers the procedure asks for (a run id, a date, a host, a ticket number) → typed inputs; a date input example is a quoted string. |
| `steps` | the doc's **ordered steps / numbered commands / Makefile targets** → ordered `steps`. Classify each by kind (below) and assign `safety`. |
| `conclusions` | the doc's **resolution / root-cause / "this means…" outcomes** → `conclusions`, each with a `when` guard, a `verdict`, `guidance`, and an honest `confidence`. |
| `redaction` | default to `default: safe`; add `never_return` for any secrets/PII the source touches. |

**Classifying a source step into a step kind:**
- A command that reads via an API/CLI → `api-read` or `shell-read` with a **capability name**
  substituted for the concrete endpoint/command.
- A SQL/stored-proc lookup → `query` **only if** it is an allowlisted parameterized query;
  free-form SQL against prod is `forbidden` — draft it as a `guided-human` step instead and
  flag it for review.
- A step that says "run our sentry/error-tracker investigation" or references an existing skill
  → `skill-call` (reuse, don't reimplement).
- A manual step (breakglass, "ask the on-call", "check the console") → `guided-human`.
- Explanatory prose that isn't an action → `note`.
- **Safety default:** map read/diagnostic steps to `read-only`; anything that could mutate or
  that the doc marks risky → `needs-approval` (or drop it). Never label a mutating command
  `read-only`.

**Where a mapping is ambiguous**, insert a `note` step or a clearly-marked placeholder and flag
it in the report for human review — do NOT invent facts.

**Inferring `metadata.kind` (investigation vs procedure vs toolbox).** The doc's shape tells you
which class:
- **`investigation`** — the doc is diagnostic: it has a symptom/"if you see X" header, a
  cause/"this means…" section, and its steps GATHER evidence to reach a verdict (a troubleshooting
  guide, an incident/postmortem RCA, a "debugging X" section). Run by `/scout:investigate`.
- **`procedure`** — the doc is operational: an ordered runbook whose steps CHANGE or operate on
  something and end in a done/verify state. Strong signals in the title/steps: **promote, deploy,
  release, ship, sync, refresh, rotate, migrate, cut-over, provision, roll back**. Run by
  `/scout:runbook`; its mutating steps must lean on `needs-approval` (never auto-`read-only`).
- **`toolbox` (v0.4)** — the doc is clearly **"how to USE / interpret a specific tool"** rather than
  "diagnose symptom Y" or "operate on Z": it teaches how to read/query/interpret ONE tool (e.g.
  "how to read the DB per-run, not windowed", "how to interpret a service's logs", "how to run a
  trace query"), with no symptom to route from and no state to mutate. Draft it as `kind: toolbox`
  into the **`toolbox/` subdir** (see Phase 4 write) and INDEX-register it with `kind: toolbox`, so
  the runners NEVER route a symptom to it — it is composed only as a sub-procedure. Its
  `metadata.triggers.keywords` describe the TOOL/technique (so a composing playbook can find it),
  not a symptom. As with all harvested drafts, **flag it for review**.
- When the doc genuinely could be either, default to `investigation` and **flag the guess** in the
  report so the human confirms `metadata.kind` before promoting the draft. (Only reach for
  `toolbox` when the doc is unmistakably tool-usage know-how; when in doubt between
  investigation/procedure, do NOT guess toolbox.)

**`last_verified` from the source doc (NOT the harvest date).** A harvested playbook's freshness is
the freshness of the KNOWLEDGE it came from — so `metadata.last_verified` MUST be the SOURCE doc's
own last-updated date, never today's date (stamping today would make a decade-old runbook look
freshly verified and defeat `/scout:lint`'s staleness check). Determine the source date, in order:
  1. An explicit date IN the doc — an incident/postmortem date, a "Last updated: …" / "Reviewed: …"
     line, a changelog/front-matter date.
  2. Failing that, the file's git last-commit date (`git log -1 --format=%cd --date=short -- <path>`)
     as a reasonable proxy.
  3. **If neither is determinable, OMIT `last_verified` and FLAG it for review** — do NOT invent a
     date and do NOT fall back to today. An omitted `last_verified` reads as "unverified" to
     `/scout:lint`, which is the honest state.

> **LOUD unquoted-date guard.** Whatever date you use, it MUST be a **QUOTED** `"YYYY-MM-DD"`
> string — `last_verified: "2026-07-16"`, quotes included. An UNQUOTED `YYYY-MM-DD` parses as a
> native YAML date, which the JSON Schema (no date type) REJECTS — the single most common way a
> harvested draft fails validation. This applies to EVERY date the draft carries (a `date`-typed
> input's `example`, any date in `signals`, etc.), not just `last_verified`. Double-check every
> date is quoted before you validate.

## Phase 3: Draft + VALIDATE (the gate)

**Print phase banner.**

1. Assemble each draft as a full YAML doc: `apiVersion: scout/v0.3`, `kind: Playbook`, then
   `metadata` (including the inferred `metadata.kind`, `metadata.status: draft`, and — when
   determinable — the source-doc `metadata.last_verified`), `audience` (default
   `[developer, support]` for harvested drafts unless the source clearly serves business users —
   narrow, don't over-widen), `inputs`, `steps`, `conclusions`, `redaction`. **Quote all dates.**
2. **Validate against the JSON Schema — hard gate. Never write an invalid draft.** Prefer the
   machine validator if `jsonschema` + `pyyaml` are available:

   ```bash
   python - "$DRAFT_YAML_PATH" "plugins/scout/schema/playbook.schema.json" <<'PY'
   import sys, json, yaml, jsonschema
   doc = yaml.safe_load(open(sys.argv[1]))
   schema = json.load(open(sys.argv[2]))
   jsonschema.Draft202012Validator(schema).validate(doc)
   print("VALID")
   PY
   ```

   If those libs are unavailable, hand-validate against `../../schema/playbook.schema.json`
   (same checklist as `/scout:author` Phase 7: required keys, executable steps carry `safety`,
   ≥1 step, ≥1 conclusion, `redaction.default` set, **dates quoted**).
3. On any error, fix the draft and re-validate. A draft that cannot be made to validate is
   reported as "could not harvest cleanly — needs manual authoring", **not** written.

## Phase 4: Write drafts + register in INDEX + reconcile capabilities + optional wiki ingest + report

**Print phase banner.**

1. **Write** each validated draft to the target repo (create the dir if needed). The path depends on
   the inferred `metadata.kind`:
   - `investigation` / `procedure` → `.claude/scout/playbooks/<id>.playbook.yaml` (store root).
   - **`toolbox` (v0.4) → `.claude/scout/playbooks/toolbox/<id>.playbook.yaml`** (the `toolbox/`
     subdir `/scout:setup` scaffolds) — a how-to-use-a-tool draft belongs with the other toolbox
     playbooks so the runners never route a symptom to it. Create `toolbox/` if it doesn't exist.

   Mark it as a draft in the report and, where the schema allows free text, note provenance in
   `metadata.summary` (e.g. "Drafted by /scout:harvest from docs/runbooks/…; review before
   use."). If a file with that id exists (in the applicable location), ask before overwriting.
2. **Register each draft in the playbook INDEX.** For every draft written, APPEND (or UPDATE) its
   entry in `.claude/scout/playbooks/INDEX.md` — the per-repo routing registry `/scout:investigate`
   and `/scout:runbook` read FIRST to route a natural-language request (match `keywords`/
   `when_to_use` filtered by `kind`), then open only the matched file. The structured data MUST
   validate against [`../../schema/index.schema.json`](../../schema/index.schema.json) (prose spec:
   [`../../schema/index.schema.md`](../../schema/index.schema.md)). It stays **minimal — route,
   don't duplicate** (no steps/inputs/conclusions/redaction in the INDEX).
   - **Create the INDEX if missing** (e.g. `/scout:setup` never ran): empty scaffold first —
     `apiVersion: scout/v0.3`, `kind: PlaybookIndex`, `generated_by: /scout:harvest`,
     `generated_at: "<today, quoted>"`, `playbooks: []`.
   - Build each entry from the draft's metadata (exactly the six INDEX fields): `id` ←
     `metadata.id`; `title` ← `metadata.title`; `kind` ← the inferred `metadata.kind` (default
     `investigation`; `procedure` or **`toolbox`** where inferred — a `toolbox` entry is
     sub-procedure-only, never a symptom route); `keywords` ← `metadata.triggers.keywords`;
     `when_to_use` ← a ONE-LINE disambiguation from `metadata.summary`; `path` ← the file path
     relative to the store — `<id>.playbook.yaml`, or **`toolbox/<id>.playbook.yaml`** for a
     `kind: toolbox` draft written to the subdir.
   - **Idempotent:** if an entry with that `id` already exists, UPDATE it in place; else APPEND.
     Refresh `generated_by`/`generated_at`. Validate the INDEX (machine-check against
     `index.schema.json` when `pyyaml`+`jsonschema` are available; else hand-check the entry shape).
     A draft whose `metadata.kind` is a flagged guess still gets an INDEX entry — note in the report
     that its `kind` (hence which runner routes to it) needs human confirmation.
3. **Emit the "capabilities to add" reconciliation checklist.** A harvested draft names **abstract
   capability names** (and `skill-call` skill names) for the endpoints/commands it saw in the
   source — but those names are only *runnable* once they exist in the Capability Manifest. A
   drafted capability NOT in the manifest is **valid but INERT** (the step silently does nothing).
   This checklist closes the inert-capability gap so `/scout:setup` can wire them:
   - Load the current Capability Manifest's `capabilities[].name` and `skills[].name` sets (from
     Phase 0). If no manifest exists, treat both sets as empty and say so.
   - Across ALL drafts written this run, collect every capability/skill name referenced by a step
     (`request.capability` on `api-read`/`query`/`diagnostic-query`/`shell-read`/`time-travel`;
     `request.skill` on `skill-call`) that is **NOT** already in the manifest.
   - For each such missing name, emit a checklist line: **the name → the SOURCE endpoint/command/
     skill it was drafted from** (the concrete thing seen in the doc — e.g. `fetch-status → GET
     /fetcher/status seen in docs/runbooks/fetch.md:42`), plus which draft(s) reference it. This
     gives `/scout:setup` (or a human editing the manifest) the exact binding to add.
   - **Resolve against BOTH manifest sections (v0.4).** A referenced `request.capability` counts as
     bound if it appears in `capabilities[].name` **OR** the ambient `investigation_toolbox[].name`
     (the union scan the rails use, RAILS.md §4.1) — an ambient toolbox tool is a real binding, so
     don't flag a step that resolves to one as "capability to add."
   - Present it as an explicit, copy-usable block, e.g.:
     ```
     Capabilities to add to the manifest (drafted but not yet bound — steps run inert until mapped):
       - fetch-status   → GET /fetcher/status   (docs/runbooks/fetch.md:42; used by draft: file-fetch-miss)
       - record-counts  → proc count_records    (docs/runbooks/counts.md:printed SQL; used by draft: count-check)
     Skills to wire (skill-call to a skill the manifest doesn't list yet):
       - sentry:investigate  → referenced by draft: crash-triage
     Next: run /scout:setup to (re-)probe and bind these, or add them to .claude/scout/capability-manifest.md by hand.
     ```
   - If every referenced capability/skill is already bound, say so ("all drafted capabilities
     already in the manifest — nothing to reconcile").

   **Also flag toolbox gaps (v0.4) — same graceful, non-blocking checklist posture.** In the same
   pass, surface the two toolbox reconciliation gaps below. These are **suggestions, never blocks**
   (a v0.3 repo with no `investigation_toolbox` section simply produces none of these lines):
   - **(a) A discovered log/db/trace/MCP surface with no `investigation_toolbox` entry.** While
     mapping sources this run you may have seen a common investigation surface — a log command /
     log-query API (`app-logs`), a data store / DSN (`db-read`), an OTLP/Grafana/trace endpoint
     (`traces`), an MCP server (`mcp`), or another read-only diagnostic tool (`other`) — that the
     manifest's `investigation_toolbox[]` does NOT yet cover (the slot is missing or still an
     unfilled stub). Flag it and suggest adding it via **`/scout:author toolbox`** (or a
     `/scout:setup` re-probe). Never draft free-form SQL — a `db-read` surface is suggested as a
     **named-allowlisted-proc placeholder** only.
   - **(b) An `investigation_toolbox` tool with no how-to-use toolbox playbook.** For each tool in
     the manifest's `investigation_toolbox[]`, check whether a `kind: toolbox` playbook exists in
     `.claude/scout/playbooks/toolbox/` that teaches how to USE/interpret it. If none, flag it and
     suggest authoring one via **`/scout:author`** with `metadata.kind: toolbox` (or — when a source
     doc you just saw is itself tool-usage know-how — that harvest drafted one this run, per the
     `kind: toolbox` inference above).
   - Present these under the same block, e.g.:
     ```
     Toolbox gaps (v0.4 — suggestions, non-blocking):
       Surfaces with no investigation_toolbox entry (add via /scout:author toolbox):
         - db-read   → Postgres DSN seen in .env.example:12 (named-proc placeholder; never free-form SQL)
         - traces    → OTLP endpoint seen in docker-compose.yml:31
       Toolbox tools with no how-to-use toolbox playbook (author via /scout:author, metadata.kind: toolbox):
         - app-logs  → no playbooks/toolbox/*.playbook.yaml teaches it yet
     ```
   - If there are no toolbox gaps (or no toolbox section at all), say so briefly ("no toolbox gaps"
     / "no investigation_toolbox in this manifest — nothing to reconcile there") and move on.
4. **Optional wiki ingest (degrades gracefully).** ONLY if Phase 0 detected
   `.team-work/wiki-config.md`, offer to also ingest the *source docs* into the wiki so the
   knowledge compounds — this is separate from drafting the playbook and never required:
   ```
   Skill("team-work:work-ingest", "<source-doc-path> --wiki <wiki_root>")
   ```
   If no wiki is present, **skip this silently** — no error, no prompt. (Harvest drafts
   playbooks with or without a wiki; the wiki is a complement, not a dependency.)
5. **Report**: for each draft — the source it came from, the path written (noting a `kind: toolbox`
   draft went to the `toolbox/` subdir), its inferred `metadata.kind` (and whether that kind was a
   flagged guess — a `toolbox` guess is always flagged for review), its `metadata.last_verified`
   (and whether it was taken from the source doc, from git, or omitted-and-flagged), that it was
   registered in the INDEX, the capabilities / skills it references, and every place a human MUST
   review (guessed owners, ambiguous safety classifications, ambiguous `kind`, placeholder
   capability names, dropped/flagged risky commands). Then print the **capabilities-to-add
   reconciliation checklist** (step 3) once for the whole run, **including the v0.4 toolbox-gap
   flags** (surfaces with no `investigation_toolbox` entry; toolbox tools with no how-to-use toolbox
   playbook). Point the user to `/scout:author` to refine a draft (or `/scout:author toolbox` to add
   a flagged toolbox surface, or `/scout:author` with `metadata.kind: toolbox` to author a missing
   tool playbook), `/scout:setup` to bind the reconciliation checklist, and `/scout:investigate`
   (investigation drafts) or `/scout:runbook` (procedure drafts) to run one. A `kind: toolbox` draft
   has no symptom route — it is composed as a sub-procedure by another playbook.

## Verification before completion

Do not claim a playbook was harvested until the file exists on disk AND validated clean against
`../../schema/playbook.schema.json`, AND its INDEX entry exists in
`.claude/scout/playbooks/INDEX.md` and the INDEX validates against
`../../schema/index.schema.json`. Confirm every date in each draft is a QUOTED string, and that
the capabilities-to-add reconciliation checklist was emitted (or "nothing to reconcile" stated).
See the
[verification-before-completion policy](../../../agent-orch/policies/verification-before-completion.md).

## What this skill does NOT do

- It does not modify the schema (frozen) or the Capability Manifest (that's `/scout:setup`).
- It does not treat a draft as final — a human always reviews before use.
- It does not require a team-work wiki; wiki ingest is optional and skipped cleanly when absent.
- It does not write code — only declarative YAML drafts.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running, check
that file for a `skills.scout-harvest:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points:
- `before` — targets run before source discovery (e.g. point at extra source directories or a
  house mapping convention).
- `after` — targets run after drafts validate and are written (e.g. a review checklist, or
  bulk wiki ingest of the harvested sources).

Run any listed targets in order per the shared resolver
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline). Tell the
user when you run an extension target; a failing target is surfaced but does not abort the
skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
