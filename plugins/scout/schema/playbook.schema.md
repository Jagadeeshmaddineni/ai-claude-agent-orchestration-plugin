# Scout Playbook Schema (v0.3)

> The single declarative contract at the heart of Scout. A **playbook** is ONE artifact
> that captures a support investigation OR an operational procedure. Scout's projector
> compiles it into whichever delivery surface a repo supports (Claude Code skill, MCP tool,
> guided-human runbook).
> **You never author per-surface** — you author one playbook, and the framework projects it.
>
> This file is the normative spec. `../playbooks/examples/file-fetch-miss.playbook.yaml`
> is a validating reference instance. A machine-checkable JSON Schema lives alongside at
> `playbook.schema.json` for CI validation.

## Design principles the schema enforces

1. **Knowledge separate from delivery** — a playbook describes *what to investigate and how
   to reason about it*, never *which surface renders it*.
2. **Declarative, not code** — every field is plain data a developer writes without touching
   plugin internals. (Authoring happens in the repo, so authors are developers/support with
   repo access; the *investigations* they produce are consumable by any audience — see
   `audience` — through any surface.)
3. **Safe by construction** — every executable step carries a `safety` classification; the
   framework refuses anything unsafe regardless of who authored it.
4. **Redaction is mandatory, not optional** — outputs declare what must be scrubbed before
   any surface returns them.
5. **Audience-scoped** — a playbook (and each step) declares which audience tiers may see or
   run it. Business-tier answers can never exceed what the author allowed.

## Top-level structure

```yaml
apiVersion: scout/v0.3            # REQUIRED. Schema version this playbook targets.
kind: Playbook                    # REQUIRED. Always "Playbook" for this schema.
metadata: { ... }                 # REQUIRED. Identity + routing (+ optional kind/roles/severity/source/status).
audience: [ ... ]                 # REQUIRED. Which tiers may use this playbook at all.
inputs: [ ... ]                   # REQUIRED. The structured facts the playbook needs.
steps: [ ... ]                    # REQUIRED. Ordered investigation steps.
conclusions: [ ... ]              # REQUIRED. Possible verdicts + how to reach them.
redaction: { ... }                # REQUIRED. What must never leak.
incident: { ... }                 # OPTIONAL (v0.2). Incident-class behavior (applies to kind: investigation).
surfaces: { ... }                 # OPTIONAL. Per-surface hints (NOT per-surface logic).
```

### `metadata.kind` — investigation vs procedure vs toolbox (v0.3, +toolbox v0.4)

A playbook is one of three **classes**, declared by the optional `metadata.kind` (default
`investigation`):

| `metadata.kind` | What it is | Run by | Terminal shape |
|-----------------|-----------|--------|----------------|
| `investigation` (default) | Diagnose a symptom to a confidence-gated **verdict** (the existing v0.2 model). | `/scout:investigate` | `conclusions` (verdict + confidence). |
| `procedure` | An ordered **operational runbook** — promote a build, sync secrets, refresh ESO — executed step-by-step. | `/scout:runbook` | An ordered set of steps that mutate/operate; mutating steps lean on `needs-approval`, and conventionally end with a verify (and rollback guidance). |
| `toolbox` (v0.4) | A **how-to-use/interpret-a-tool playbook** — captures how to use or interpret a specific tool (e.g. how to read a per-run table not windowed, how to interpret a service's logs, how to run a trace). | Composed as a **sub-procedure** by other playbooks (or a freewheel agent); **never routed to by symptom**. | Shares the playbook shape; lives in `.claude/scout/playbooks/toolbox/` and is indexed with `kind: toolbox`. |

All classes share the SAME document shape (`steps`, `redaction`, `audience`, `conclusions`).
A `procedure` still declares `conclusions` (used as its terminal outcomes / verify results);
`metadata.kind` only changes which runner routes to it and how steps are gated. `incident:`
applies to `kind: investigation` only. A `toolbox` playbook is never a routing target for an
incoming symptom — `/scout:investigate` / `/scout:runbook` only pull it in as a sub-procedure of
a playbook (or agent) that uses the underlying tool. The `apiVersion` stays `scout/v0.3`: the
toolbox is versioned via the manifest's optional `investigation_toolbox` section, and a playbook's
shape is unchanged beyond this additive enum value.

---

## `metadata` (required)

```yaml
metadata:
  id: file-fetch-miss             # REQUIRED. kebab-case, unique within a repo's playbook store.
  title: "File-fetch step reports no data for a run"  # REQUIRED. Human title.
  summary: >                      # REQUIRED. One-paragraph what/when.
    Diagnoses a run whose file-fetch step reports missing input data, and decides
    whether the data is genuinely absent, present-but-mismatched to the run's
    parameters, or a fetcher/mount fault.
  owner: "team-or-person"         # REQUIRED. Who maintains this playbook.
  kind: investigation             # OPTIONAL (v0.3). investigation (default) | procedure. See "metadata.kind".
  tags: [file-fetch, data-availability, pipeline]  # OPTIONAL. For routing + discovery.
  last_verified: "2026-07-16"     # OPTIONAL. Drives the staleness check (Scout item #23).
                                  # NOTE: quote dates. Unquoted YYYY-MM-DD parses as a native
                                  # YAML date; the schema expects a string (JSON has no date type).
  # --- v0.2 additions (all optional) ---
  source: "docs/runbooks/<name>.md" # OPTIONAL. Provenance — the doc a harvested playbook came from.
  status: active                  # OPTIONAL. draft | active | deprecated. /scout:harvest sets draft.
  roles: [infra, data]            # OPTIONAL. Which investigator role(s) best run this playbook in
                                  # orchestrated mode. enum: infra|data|app|security|observability|incident|generic
  triggers:                       # REQUIRED. How /scout:investigate routes to this playbook.
    keywords: ["no files", "not on the mount", "missing data", "fetch failed"]
    severity_hint: sev2           # OPTIONAL (v0.2). sev1|sev2|sev3|sev4 — default severity when this
                                  # playbook matches; feeds triage + effort tier.
    signals:                      # OPTIONAL. Structured signals (e.g., a failing step name).
      - source: run-status
        matches: "fetch step: failed"
```

`triggers` is what the router matches an incoming ticket/run-id against. Keep keywords
specific enough to avoid collisions between playbooks. `roles` and `severity_hint` are hints
for the orchestrated investigation modes — an incident that matches several playbooks fans out
one role-agent per playbook (see the Scout incident design).

---

## `audience` (required)

The set of tiers permitted to invoke this playbook at all. Individual steps and conclusions
can narrow this further, never widen it.

```yaml
audience: [developer, support, business]
```

**Canonical tiers** (v0.2 fixed vocabulary; a repo maps these onto its own roles during
`/scout:setup` — governance is inherited, not invented):

| Tier | Who | Typical rights |
|------|-----|----------------|
| `developer` | Engineers with repo + env access | may run `read-only` and (with confirmation) `needs-approval` steps; may call APIs with their own env creds |
| `support` | Support engineers | `read-only` steps; guided-human steps; scoped API reads |
| `business` | Business users (often via chat) | interpretation + `read-only` scoped reads only; answers always redacted + confidence-gated |
| `admin` | Playbook/module admins | authoring, config, and everything `developer` can do |

---

## `inputs` (required)

The structured facts the playbook needs before it can run. These form the "input contract"
a user (or chat) supplies. Each input is declarative and typed.

```yaml
inputs:
  - name: run_id
    type: string
    required: true
    description: "The run identifier to investigate."
    example: "run-000123"
  - name: business_date
    type: date
    required: false
    description: "The COB/business date segment, if the user knows it."
```

Supported `type` values (v0.2): `string`, `number`, `date`, `enum` (add `values: [...]`),
`boolean`.

---

## `steps` (required)

Ordered investigation actions. Each step is one of a small set of **step kinds**, and every
executable step declares a `safety` classification and an `audience` subset.

```yaml
steps:
  - id: fetch-run-status
    kind: api-read                # see "Step kinds" below
    title: "Fetch the run's status and stage breakdown"
    audience: [developer, support, business]
    safety: read-only             # REQUIRED for executable kinds. See "Safety contract".
    request:                      # shape depends on kind
      capability: run-status      # a capability name the repo's Capability Manifest maps to a real endpoint
      params:
        run_id: "${inputs.run_id}"
    expect:                       # OPTIONAL. Feeds golden-snapshot diffing (Scout item #17).
      description: "A run object with a status and per-stage list."
    on_error: continue            # continue | halt | escalate

  - id: guide-breakglass-ls
    kind: guided-human            # a non-executable instruction for a person to run
    title: "If fetcher fault suspected, inspect the mount directly"
    audience: [developer]
    instructions: >
      Request breakglass for the fetcher instance, then run:
      `ls -la <mount>/<segment>/` and report the file count and names back.
    safety: read-only             # guided-human steps still classify the command they suggest
```

### Step kinds (v0.3)

| kind | Executable? | Required body | Purpose |
|------|-------------|---------------|---------|
| `api-read` | yes | `request.capability` | Call a repo capability that reads data (never mutates). |
| `query` | yes | `request.capability` | Run a parameterized query / stored proc from an allowlist (never free-form). |
| `diagnostic-query` | yes | `request.capability` | (v0.3) A read-only, allowlisted/parameterized **diagnostic** query — the SQL-diagnostic step of a runbook, captured as a first-class kind instead of collapsing to `guided-human`. Carries `safety`; MUST resolve to a manifest-bound allowlisted query (never free-form). |
| `shell-read` | yes | `request.capability` | Run a read-only shell command (e.g., `ls`) via the operator's own env. |
| `skill-call` | yes | `request.skill` | Invoke an EXISTING skill the team already has (e.g. `investigate-sentry`, a custom or tool-specific investigator) and use its output as evidence. Complement, don't replace. |
| `agent-investigate` | yes | `request.role` + `request.objective` | (v0.2) Delegate a bounded sub-investigation to an investigator role-agent. Used in orchestrated / freewheel modes. |
| `guided-human` | no | `instructions` | Instruct a person to do something Scout can't/shouldn't automate (e.g., breakglass). |
| `time-travel` | yes | `request.capability` | Compare state as-of run-time vs now (Scout item #22). Wraps an `api-read`/`query`. |
| `note` | no | — | Author commentary / reasoning aid shown during investigation. |

**Per-kind body requirements are enforced by the JSON schema (v0.3):** an `api-read`/`query`/
`diagnostic-query`/`shell-read`/`time-travel` step MUST carry `request.capability`; a
`skill-call` MUST carry `request.skill`; an `agent-investigate` MUST carry `request.role` +
`request.objective`; a `guided-human` MUST carry `instructions`.

A `diagnostic-query` step (v0.3) is a read-only diagnostic SQL step. It behaves exactly like a
`query` for safety purposes — it MUST resolve, through the Capability Manifest, to an allowlisted
parameterized query or stored proc; **free-form SQL is `forbidden` by definition** and never
permitted, and a non-allowlisted query against a `production` store is rejected by the rails.
The kind exists so runbook SQL-diagnostic steps are modeled as executable evidence (with a
`safety` classification and an `expect`) rather than being flattened into a `guided-human`
instruction to "go run this query."

`api-read`, `query`, and `shell-read` reference a **capability name** (e.g.
`run-status`), NOT a concrete endpoint or connection string. `/scout:setup`'s Capability
Manifest maps capability names to the repo's real endpoints/procs/creds. This indirection is
what keeps playbooks repo-agnostic and portable.

A `skill-call` step names an existing skill via `request.skill` (e.g.
`skill: "sentry:investigate"`) plus `request.args`. `/scout:setup` discovers which
investigation skills a repo already has and records them in the Capability Manifest; a
`skill-call` to a skill the repo lacks renders that step inert (not an error), same as an
unmapped capability. This is how Scout leverages a team's existing investigators instead of
re-implementing them.

An `agent-investigate` step (v0.2) delegates a bounded sub-investigation to a **role-agent**:

```yaml
- id: probe-infra
  kind: agent-investigate
  title: "Delegate the mount-reachability hypothesis to the infra role-agent"
  audience: [developer]
  safety: read-only
  request:
    role: infra                 # resolved to an agent via the Capability Manifest `investigators:` block
    objective: "Was the mount reachable during the failure window?"
    budget: 10                  # OPTIONAL. Max tool calls for this sub-investigation (effort cap).
```

The role is resolved per repo to a real agent (an agent-orch role agent, a Scout default
investigator, or a user-imported agent). A role with no available agent is **inert**, same as
an unmapped capability. Crucially, **every tool call the delegated agent makes still passes the
rails `decide()` gate** — the agent is added underneath the rails, never around them, and
cannot exceed the caller's tier.

### Step data-flow: `emits` / `binds` and `${steps.X.field}` (v0.3, G1)

A step may declare **named outputs** it produces, and a later step may reference them in its
params. This is the provenance-then-replay backbone: it makes step→step data flow explicit and
machine-checkable instead of relying on prose.

```yaml
steps:
  - id: fetch-run-status
    kind: api-read
    title: "Fetch the run's status"
    audience: [developer]
    safety: read-only
    emits: [segment, fetch_host]        # NEW (v0.3): named outputs this step produces
    request:
      capability: run-status
      params: { run_id: "${inputs.run_id}" }

  - id: list-files-for-segment
    kind: api-read
    title: "List files for the resolved segment"
    audience: [developer]
    safety: read-only
    binds: ["${steps.fetch-run-status.segment}"]   # NEW (v0.3): declares what it consumes
    request:
      capability: fetch-inventory
      params:
        segment: "${steps.fetch-run-status.segment}"   # the reference form
```

- `emits: [<name>, ...]` — the named outputs a step produces. Each `<name>` is
  `snake_case`.
- A later step references an emitted output anywhere it takes a value using the form
  **`${steps.<step-id>.<name>}`** (parallel to the existing `${inputs.<name>}` /
  `${env.<NAME>}` forms). The reference is resolved at run time and, like any output value, is
  **redaction-gated** — a value an earlier step redacted cannot be un-redacted by flowing into a
  later param.
- `binds: [ ... ]` — OPTIONAL. An explicit list of the `${steps.X.field}` references a step
  consumes, for provenance/linting. The actual data still flows through `params`; `binds` is a
  declared manifest of dependencies a linter can check against `emits`.

### `steps[].sweep` — parameter matrix (v0.3, G3)

An optional parameter-matrix on a `query` / `diagnostic-query` step. Each key is a request
param; each value is a list. The step runs **once per combination** and results are reported
**per-variant**.

```yaml
  - id: counts-by-region
    kind: diagnostic-query
    title: "Record counts across candidate regions and dates"
    audience: [developer]
    safety: read-only
    request:
      capability: record-counts       # allowlisted, parameterized
      params: { region: "${sweep.region}", day: "${sweep.day}" }
    sweep:
      region: [east, west, central]
      day: ["2026-07-17", "2026-07-18"]   # 3 x 2 = 6 variants, reported separately
```

### `steps[].required_params` / `steps[].widenable_params` (v0.3, G8)

Two optional string arrays that tell a runner which request params it may relax when a step
returns nothing and it wants to **widen** the search — so it never attempts an invalid widening.

```yaml
  - id: find-records
    kind: diagnostic-query
    title: "Find records for the run"
    audience: [developer]
    safety: read-only
    required_params: [run_id]            # MUST be present; never dropped when widening
    widenable_params: [day, region]      # MAY be dropped/relaxed to widen the search
    request:
      capability: record-lookup
      params: { run_id: "${inputs.run_id}", day: "${inputs.day}", region: "${inputs.region}" }
```

---

## Safety contract (required on executable steps)

Every `api-read` / `query` / `diagnostic-query` / `shell-read` / `skill-call` /
`agent-investigate` / `time-travel` step (and the command a `guided-human` step suggests) MUST
carry one of:

| `safety` | Meaning | Framework behavior |
|----------|---------|--------------------|
| `read-only` | Cannot mutate state or exfiltrate secrets | Allowed; still redacted + previewed. |
| `needs-approval` | Potentially sensitive; a human must confirm | Blocked until an authorized tier confirms (dry-run preview shown first). |
| `forbidden` | Must never run | Hard-rejected by the rails engine; authoring it is an error. |

**Hard rules the rails engine enforces (Scout item #4):**
- `query` and `diagnostic-query` steps may only reference an allowlisted parameterized query /
  stored proc. **Free-form SQL is `forbidden` by definition** for any prod-tier data store.
- No step may return a value that `redaction` marks as sensitive through an audited/logged
  channel (prevents the plaintext-exfil class of vulnerability).
- Secrets are used to connect, never read or echoed. Capability params may reference
  `${env.FOO}` but the value is never surfaced to the model or the output.

---

## `conclusions` (required)

The possible verdicts, each with a `when` guard and a confidence level. This is where
**confidence signaling** (Scout item #16) lives.

```yaml
conclusions:
  - id: genuinely-missing
    when: "no files on disk for the requested segment"
    verdict: "Data has not landed yet for this segment."
    confidence: confirmed         # confirmed | likely | unknown
    from_steps: [list-available-files]   # OPTIONAL (v0.3). Step ids whose evidence supports this.
    guidance: "Check the upstream export; re-run once data lands."
    audience: [developer, support, business]

  - id: wrong-params
    when: "files present on disk but not for the requested date segment"
    verdict: "Data exists but the run's parameters don't match it."
    confidence: likely
    guidance: "Re-run with corrected date/parameters."
    audience: [developer, support, business]

  - id: fetcher-fault
    when: "files should be present and are not"
    verdict: "Possible fetcher/mount fault — needs engineering."
    confidence: unknown
    guidance: "Escalate with the specific instance/mount."
    audience: [developer, support]
```

**Confidence vocabulary (v0.2):**

| `confidence` | Business-tier rendering rule |
|--------------|------------------------------|
| `confirmed` | State as fact. |
| `likely` | Must be phrased "likely — verify"; never asserted as certain. |
| `unknown` | Must escalate; never presented as an answer. |

A business-tier answer may **never** upgrade a conclusion's confidence. This is enforced by
the framework, not left to the author.

Each conclusion's `audience` MUST be non-empty (v0.2) — a conclusion with no audience would be
unreachable.

**`from_steps` (v0.3, optional):** a string array of step ids whose evidence supports this
conclusion. It makes the step→conclusion linkage explicit and machine-checkable — a linter can
verify every id resolves to a real step, and multi-symptom playbooks can show exactly which
evidence drives each verdict. Omitting it leaves the linkage implicit (as in v0.2).

---

## `redaction` (required)

Declares what must be scrubbed before ANY surface returns output.

```yaml
redaction:
  never_return:                   # values/fields that must never appear in output
    - "connection strings"        # string form — heuristic (name/substring) match
    - "credentials / tokens"
    - { field_path: "result.connection.host" }   # v0.2 structured form — deterministic match
  mask:                           # values shown partially
    - field: account_number
      strategy: last4             # last4 | hash | full-mask
  default: safe                   # safe = redact anything not explicitly allowed for the tier
  builtins: on                    # v0.3 (G10). on (default) | off. Apply built-in credential
                                  # patterns regardless of author wording. NOTE: unquoted `on`/`off`
                                  # parse as YAML booleans (true/false) — that is fine, the schema
                                  # and engine accept both the strings and the booleans.
```

`default: safe` means: when in doubt, redact. Authors opt fields *in* to visibility, not out.

**`never_return` entries (v0.2)** may be either a plain string (heuristic name/substring match,
as in v0.1) or a structured `{ field_path: "<dotted.path>" }` object for deterministic matching
against a known result field. Mixed lists are allowed.

**`redaction.builtins` (v0.3, G10):** `on` (default) or `off`. When `on`, the engine ALSO applies
a set of **built-in credential patterns** — `password`, `token`, `secret`, `dsn`,
connection-string shapes, and `key=value` credential forms — regardless of how (or whether) the
author worded `never_return`. This closes the class of leak where a playbook redacts
`"connection strings"` but a result field is named `connectionString` (a plural/singular or
casing mismatch). Matching is **normalized and token-boundary aware, not naive substring**, so it
resists casing/pluralization drift without over-redacting unrelated tokens. Set `builtins: off`
only for the rare playbook that must return a value a built-in pattern would otherwise catch.
The field accepts the strings `on`/`off` **and** the YAML booleans `true`/`false` — an unquoted
`builtins: on` (or `off`) parses as a YAML 1.1 boolean, and both forms resolve identically (the
engine treats only explicit off/false/no/0 as disabled), so you never need to quote it.
(The matching engine itself is implemented in the rails — WS2; this schema field is the author-
facing toggle it reads.)

---

## `incident` (optional, v0.2 — incident-class behavior)

Present only on playbooks that represent an incident-class investigation (`kind: investigation`).
Absent → the playbook behaves as an ordinary support playbook (keeps simple playbooks simple).

```yaml
incident:
  timeline: true                  # maintain a running, redacted timeline for this investigation
  postmortem: create-rfo          # on resolution, offer to generate a postmortem.
                                  # enum: create-rfo (delegates to /agent-orch:create-rfo) | none
```

Scout does not reimplement postmortems — `postmortem: create-rfo` hands the findings + timeline
to the existing `/agent-orch:create-rfo` skill. The timeline is an append-only, rails-redacted
record kept in the investigation's session artifacts.

---

## `surfaces` (optional — hints only, never logic)

Per-surface presentation hints. These MUST NOT change *what* the playbook does — only how a
projected surface labels or frames it. If omitted, the projector uses sensible defaults.

```yaml
surfaces:
  claude-code:
    skill_name: investigate-file-fetch-miss   # optional override for the generated skill slug
  mcp:
    tool_name: scout_investigate_file_fetch_miss
  chat:
    intro: "I'll check what happened with that run's data fetch."
```

---

## Validation

- Machine validation: `playbook.schema.json` (JSON Schema, draft 2020-12) — used by CI and
  by `/scout:author` before a playbook is saved.
- A playbook that references a capability not present in the repo's Capability Manifest is
  **valid** as authored but **inert** on that repo (the projector reports it as unsupported
  rather than failing) — this keeps playbooks portable across repos with different surfaces.

## Versioning

`apiVersion: scout/v0.3` is pre-1.0 and may change. Breaking changes bump the version and
ship a migration note. Playbooks declare the version they target so the framework can warn
on mismatch.

### v0.2 → v0.3 migration

All v0.3 additions are **optional** (or fix a latent gap); a well-formed v0.2 playbook migrates
by bumping **only** the version string (`apiVersion: scout/v0.2` → `scout/v0.3`). No field is
removed or made stricter. `metadata.kind` defaults to `investigation`, so existing playbooks keep
their exact behavior. Changes:

- **Added** (all optional):
  - `metadata.kind: investigation | procedure` (default `investigation`) — playbook class;
    `procedure` playbooks are run by `/scout:runbook`.
  - `diagnostic-query` step kind — read-only allowlisted/parameterized diagnostic query
    (requires `request.capability`; carries `safety`; never free-form).
  - `steps[].emits: [<name>...]` and `steps[].binds: [ ... ]` — named step outputs + the
    `${steps.<step-id>.<name>}` reference form for step→step data flow (G1), redaction-gated.
  - `steps[].sweep: { <param>: [ ... ] }` — parameter-matrix on a query/diagnostic-query step;
    runs once per combination, reported per-variant (G3).
  - `steps[].required_params` / `steps[].widenable_params` — string arrays naming which request
    params are required vs droppable-for-widening (G8).
  - `conclusions[].from_steps: [<step-id>...]` — step ids whose evidence supports the conclusion.
  - `redaction.builtins: on | off` (default `on`) — engine also applies built-in credential
    patterns regardless of author wording; normalized/token-boundary matching (G10).
- **Unchanged / kept from v0.2**: the structured `{ field_path }` form for `redaction.never_return`
  (introduced in v0.2, retained); the `incident:` block (now noted as applying to
  `kind: investigation`).
- **Manifest**: the Capability Manifest gains an optional richer `auth: { style, env? }` on each
  capability, back-compatible with the existing `auth_env: string` — see
  `capability-manifest.schema.json`.
- **New sibling schema**: `index.schema.(md|json)` defines the per-repo playbook INDEX contract
  that runners read first to route by natural language.

### v0.1 → v0.2 migration

All v0.2 additions are optional or fix a latent gap; a well-formed v0.1 playbook migrates by
bumping the version string. Changes:
- **Added** (all optional): `metadata.source`, `metadata.status`, `metadata.roles`,
  `metadata.triggers.severity_hint`, the `agent-investigate` step kind, the `incident:` block,
  and the structured `{field_path}` form for `redaction.never_return`.
- **Tightened** (v0.1 playbooks already comply if well-formed): each executable step kind now
  *requires* its body (`request.capability` / `request.skill` / `request.role`+`objective` /
  `instructions`); `conclusions[].audience` now requires `minItems: 1`.
- **Manifest**: the Capability Manifest gains an `investigators:` role→agent map, an
  `approval_tiers` list (which tiers may confirm `needs-approval`), and a per-capability
  `production` flag — see `capability-manifest.schema.json`.
