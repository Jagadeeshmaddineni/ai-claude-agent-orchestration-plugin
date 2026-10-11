# Scout Rails Engine (normative spec, v0.3)

The **rails engine** is the security and governance heart of Scout. Every investigation —
no matter which surface drives it (a Claude Code skill, an MCP tool, the app's own AI chat,
or a guided-human runbook) — routes each proposed step through the **identical** ordered
decision algorithm defined here, and every unit of output through the **identical** redaction
pass. Nothing reaches a caller except through the rails.

> **Hard invariant — surface-agnostic, single source of truth.**
> The decision an caller receives MUST depend only on `(playbook, manifest, caller_tier,
> proposed_step)` — never on which surface asked. Two surfaces given the same four inputs
> MUST produce the same decision and the same redacted output. A surface may present the
> result differently; it may never make a different *decision*. If a surface cannot apply
> a check in this document, it must refuse to run the step, never run it un-checked.

This file is the normative prose spec. The reference checker is
[`check.py`](./check.py); the trap-case fixtures it enforces live in [`tests/`](./tests/).

---

## 0. Vocabulary and inputs

The engine is a pure function:

```
decide(playbook, manifest, caller_tier, step, produced_output?) -> DecisionRecord
```

| Input | Source | Notes |
|-------|--------|-------|
| `playbook` | a schema-valid Scout playbook | frozen contract — see `../schema/playbook.schema.md`. The engine READS `audience`, `steps[]`, `conclusions[]`, `redaction`. It never mutates it. |
| `manifest` | the target repo's Capability Manifest | see `../skills/setup/capability-manifest.template.md`. The engine READS `surfaces`, `capabilities`, `governance.role_map`, `skills`. |
| `caller_tier` | one of `developer \| support \| business \| admin` | the Scout tier the caller authenticated as on this surface. |
| `step` | one `steps[]` entry the surface proposes to execute next | may be executable (`api-read`/`query`/`shell-read`/`skill-call`/`time-travel`) or non-executable (`guided-human`/`note`). |
| `produced_output` | the raw result of a step, when the engine is asked to gate output | redaction runs over this before it leaves the engine. |

**Canonical tiers** are the schema's fixed vocabulary (`developer`, `support`, `business`,
`admin`). The engine NEVER invents roles: it maps a tier onto the repo's real roles via the
manifest's `governance.role_map` (INV-8). A tier absent from `role_map` (value `[]`) means the
manifest applied the schema tier defaults; the engine still enforces the tier's rights.

**Decision outcomes** the engine can return for a step:

| Outcome | Meaning |
|---------|---------|
| `allow` | the step may execute; its output must still pass the redaction pass (§7). |
| `needs-approval` | the step is blocked until an authorized tier confirms; a dry-run preview is shown first (§2). |
| `reject` | the step must NOT execute — a hard stop (forbidden safety, or a tier/confidence violation). |
| `inert` | the step is skipped with a clear reason (unmapped capability/skill); never an error (§4). |

`reject` and `inert` are different: `reject` is a *safety/governance refusal* (the caller asked
for something not allowed); `inert` is *"this repo can't do this"* (the capability isn't bound
here) and is a normal, expected outcome that lets a portable playbook degrade gracefully.

---

## 1. The ordered decision algorithm (normative)

Apply these checks **in this exact order**. The FIRST check that produces a terminal outcome
(`reject` or `inert`) wins and stops evaluation — later checks do not run. `needs-approval` is
terminal for *this* pass (it stops execution pending confirmation) but the step is re-evaluated
from Gate A once an authorized tier confirms. `allow` is only returned if **every** applicable
gate passes.

Ordering rationale: an explicitly `forbidden` step is a hard-stop first (it must never be
downgraded to "inert"); then capability resolution, so an *unmapped* capability degrades to
`inert` rather than fail-closing to `reject`; the free-form-query safety check runs on a
*resolved* binding; and secret/redaction always last so they apply to whatever survives.

```
Gate A.0  Safety: explicit forbidden   (§2)   -> reject (unconditional hard stop)
Gate B    Capability resolution        (§4)   -> may make the step inert
Gate A.1  Safety: free-form query      (§2.A.1)-> may reject (mapped-but-free-form only)
Gate A.2  Safety: needs-approval       (§2)   -> may force needs-approval
Gate C    Audience / tier gate         (§5)   -> may reject
Gate D    Confidence gate              (§6)   -> conclusions only; may reject (upgrade) or downgrade (§6.1 env / §6.2 liveness)
Gate E    Secret handling              (§3)   -> invariant enforced throughout; asserted here
Gate F    Redaction pass               (§7)   -> transforms output; may block if a never_return leaks
------------------------------------------------------------------
          allow  (with the redacted output from Gate F)
```

> **G9 — gate reordering (v0.3).** The safety gate is split so that capability resolution
> (Gate B) runs BEFORE the free-form-query safety check (Gate A.1):
> - **Gate A.0** still runs first: an author-tagged `safety: forbidden` step is an
>   unconditional `reject` regardless of whether its capability is mapped — a forbidden action
>   must never be silently downgraded to "inert".
> - **Gate B** then resolves the capability. An UNMAPPED `query` / `diagnostic-query` (or any
>   unmapped capability/skill) is `inert` — a portable playbook that lands on a repo lacking the
>   binding degrades gracefully instead of fail-closing to a scary `reject: free-form
>   production query`.
> - **Gate A.1** runs only for a query-family step that Gate B already RESOLVED. It rejects
>   the step only when the bound endpoint actually looks free-form (SQL keywords, `${…}`, a
>   raw connection / connection string, or inline query text on the step). Net: **unmapped
>   query = inert; mapped-but-free-form = reject.**
> - **Gate A.2** applies the authored `needs-approval` classification (block + preview).
>
> The gates are still evaluated as one ordered algorithm; A.0/A.1/A.2 are the safety gate's
> sub-steps interleaved around resolution, and the emitting gate label for any safety outcome
> remains `A-safety`.

Each gate is specified below. The engine emits ONE `DecisionRecord` (§8) per step capturing
the winning gate, outcome, reason, and what was redacted.

---

## 2. Gate A — Safety gate

Read `step.safety` (`read-only | needs-approval | forbidden`). The schema requires it on every
executable kind; a `guided-human` step classifies the command it suggests. `note` steps have no
safety and skip this gate (they are non-executable commentary).

Under G9 (v0.3) the safety gate is split around capability resolution (Gate B). The `forbidden`
sub-check (A.0) runs BEFORE resolution; the free-form-query check (A.1) and the `needs-approval`
sub-check (A.2) run AFTER, on a resolved binding. All safety outcomes carry the gate label
`A-safety`.

| `step.safety` | Sub-gate | Outcome | Behavior |
|---------------|----------|---------|----------|
| `forbidden` | **A.0** (before B) | **reject** | hard stop, regardless of mapping. The step must never run; a forbidden action is never downgraded to `inert`. |
| `read-only` / `needs-approval` | (resolve at B first) | — | proceed to Gate B; an unmapped capability becomes `inert` there. |
| `query` / `diagnostic-query`, MAPPED but free-form | **A.1** (after B) | **reject** | see §2.A.1 — a resolved query binding that is free-form is forbidden by definition. |
| `needs-approval` | **A.2** (after B) | **needs-approval** | block execution; render a dry-run preview (capability → resolved endpoint/command, params with secrets already elided per §3, and the redaction that will apply) and require an **authorized tier** to confirm before re-evaluation. |
| `read-only` | (after B) | continue to Gate C | cannot mutate state or exfiltrate secrets; still redacted + previewed. |

**Authorized tier to confirm a `needs-approval` step:** a tier whose rights (per the tier table
in §5) include running `needs-approval` steps — `developer` and `admin`. A `support` or
`business` caller may *see* the dry-run preview but cannot confirm; the step stays blocked.
(The full preview mechanism is Slice 4; the rails engine here defines the gate and who may
confirm.)

### A.1 Free-form query is `forbidden` by definition (INV-7) — runs on a RESOLVED binding (G9)

A `query` or `diagnostic-query` step is treated as **`forbidden`** when its bound capability's
artifact is free-form rather than an allowlisted parameterized query / stored proc.

**Ordering (G9, v0.3):** this check runs AFTER Gate B has resolved the capability. Therefore:

- An **unmapped** query/diagnostic-query never reaches A.1 — Gate B already made it `inert`
  (a portable playbook degrades gracefully). This is the change from v0.1/v0.2, where an
  unmapped query fail-closed to `reject: free-form production query`.
- A **mapped** query reaches A.1. The engine rejects it as
  `forbidden: mapped query binding is free-form (not an allowlisted proc)` when ANY of:
  1. the step carries inline SQL/query text (`request.sql` / `query` / `query_text` /
     `statement`); OR
  2. the resolved capability's `endpoint` contains free-form markers — SQL keywords
     (`SELECT`/`INSERT`/`UPDATE`/`DELETE`), `${…}`, `raw connection`, `connection string`,
     or literal `free-form`; OR
  3. the resolved capability has an empty `endpoint` (a bound query with no named artifact
     cannot be proven to be an allowlisted proc).

Otherwise (the endpoint names a specific proc, e.g. `proc:sp_record_counts_by_run`) the step
proceeds. This holds **even if the author mis-tagged the step `read-only`** — A.1 is
authoritative over the authored tag for this class. `diagnostic-query` is treated identically:
it MUST resolve to a `kind: query` capability that names an allowlisted proc.

Net effect of G9: **unmapped query = `inert`** (graceful, portable), **mapped-but-free-form =
`reject`** (the free-form-prod-SQL vulnerability class stays closed). An explicit
`safety: forbidden` still rejects at A.0 regardless of mapping.

---

## 3. Gate E — Secret handling (INV-5, enforced throughout)

Capability params may reference environment variables as `${env.NAME}`. The engine's contract:

- The **value** behind `${env.NAME}` is used ONLY to establish the connection at execution time.
  It is NEVER read into the model context, NEVER logged, and NEVER placed in any field of the
  `DecisionRecord`, the dry-run preview, or the step output.
- Anywhere a param, preview, or record would otherwise display a resolved secret, the engine
  substitutes the **literal token** `${env.NAME}` (name only) — matching the manifest, which
  itself records env var NAMES only.
- If `produced_output` (Gate F) contains a substring equal to the *value* of any `${env.*}`
  the step referenced, that is a leak: the engine treats it as a `never_return` hit (§7) and
  **blocks** the output. The engine compares against the value it holds transiently for the
  connection; it does not surface that value in doing so.

The engine therefore never *sees* a secret in any durable channel, and structurally cannot echo
one. This gate is asserted after resolution and re-checked during the redaction pass.

---

## 4. Gate B — Capability resolution gate (inert, never error)

An executable step references a **capability name** (`request.capability` for
`api-read`/`query`/`diagnostic-query`/`shell-read`/`time-travel`) or a **skill**
(`request.skill` for `skill-call`). The engine resolves it against the manifest:

- `api-read`/`query`/`diagnostic-query`/`shell-read`/`time-travel`: the `request.capability`
  must appear in `manifest.capabilities[].name` **∪ `manifest.investigation_toolbox[].name`**
  (v0.4 — see §4.1). `time-travel` wraps an `api-read`/`query`, so it resolves the same way as
  the capability it wraps. A `diagnostic-query` resolves to a `kind: query` capability (same
  binding as `query`).
- `skill-call`: the `request.skill` must appear in `manifest.skills[].name`.

### 4.1 Toolbox resolution and ambient tools (v0.4)

A `request.capability` resolves against the **union** of two manifest sections,
scanned **capabilities-first**:

1. `manifest.capabilities[]` — the playbook-declared capabilities (v0.3).
2. `manifest.investigation_toolbox[]` — the optional **ambient shared capability layer** (v0.4):
   common investigation tools (`app-logs`, `db-read`, `svc-traces`, an MCP surface, per-repo
   others) available to EVERY investigation without a playbook re-declaring them.

The scan is `capabilities[]` first, then `investigation_toolbox[]`, so a name present in **both**
resolves from `capabilities[]` (a declared capability **wins on collision**). A name in **neither**
list is still **`inert`** exactly as before. A `manifest` with **no** `investigation_toolbox` key
behaves **identically to v0.3** (the toolbox scan is empty).

> **Ambient — discovery, never authority.** A toolbox tool is *ambient*: an investigation, a
> step, or a sub-agent may **USE** a toolbox tool WITHOUT the playbook enumerating it in a
> `steps[]` entry (the schema marks toolbox entries `ambient: true` by default). But its
> **resolution, gating, and DecisionRecord are IDENTICAL to a declared capability.** A toolbox
> `query` still must be a named allowlisted proc (Gate A.1); a toolbox `production: true` still
> drives `resolved_env` (G2); Gate C (audience/tier) still runs unchanged, so a `business`-tier
> caller only reaches business-tier toolbox tools; redaction and secret-handling apply
> identically. **Ambient changes DISCOVERY, never AUTHORITY** — the toolbox goes UNDER the
> rails, never around them. This is **not a new gate** and it **loosens no gate**.

To keep an audit able to tell a toolbox-resolved capability from a declared one, the
DecisionRecord records **`resolved_from`** (`capabilities` | `investigation_toolbox`; §8) — a
code-controlled label, never a secret. The `capability` name and every gate outcome are otherwise
identical regardless of which section a capability resolved from.

> **G9 (v0.3):** this gate runs BEFORE the free-form-query safety check (§2.A.1). An unmapped
> query/diagnostic-query is therefore `inert` here — it never fail-closes to `reject`. Only a
> query that resolves at this gate is subject to the free-form check that follows.

If the referenced capability/skill is **not** in the manifest, the step is **`inert`**: it is
skipped with the reason `capability '<name>' not bound in this repo's manifest` (or
`skill '<name>' not available in this repo`). This is a normal, expected outcome — a portable
playbook running on a repo that lacks a surface renders that step inert, NOT broken, NOT an
error (matches the schema's "valid but inert" rule). The investigation continues with the next
step.

The engine also checks the **kind matches**: a step of `kind: query` must resolve to a
capability of `kind: query`; a `kind: diagnostic-query` step also resolves to a `kind: query`
capability; `api-read`/`shell-read` must match their own kind; `time-travel` accepts the wrapped
capability's kind. A kind mismatch is treated as unresolved → `inert` with a reason noting the
mismatch, so a mis-bound manifest degrades safely rather than running the wrong artifact.

`guided-human` and `note` steps reference no capability and skip this gate.

---

## 5. Gate C — Audience / tier gate

Two independent checks, both must pass.

### C.1 Caller tier must be in the step's audience

The caller may run a step only if `caller_tier ∈ step.audience`. Otherwise → **reject** with
reason `tier '<caller>' not in step audience <list>`. Example: a `business` caller proposing a
step whose `audience: [developer]` is rejected (developer-only step denied to business).

### C.2 Step audience may narrow but never widen the playbook audience

A step's (or conclusion's) `audience` MUST be a **subset** of the playbook's top-level
`audience`. If a step lists a tier the playbook itself does not permit, the engine treats the
playbook as malformed for that step and **rejects** the step with reason
`step audience widens playbook audience`. The effective audience the engine enforces is
therefore `step.audience ∩ playbook.audience` — narrowing is honored, widening is refused. (A
well-authored, schema-valid playbook never widens; this gate defends against a hand-edited or
mis-generated one.)

### C.3 Mapping tiers onto repo roles (INV-8)

The tier→role mapping is **inherited from the manifest**, never invented: the engine reads
`manifest.governance.role_map[tier]` to know which of the repo's real roles a Scout tier
corresponds to, and enforces the repo's existing access model. When `role_map[tier]` is `[]`
(no role model detected), the engine falls back to the schema **tier defaults** below and does
not fabricate role names.

**Tier rights (schema defaults; a repo's role_map binds these to real roles):**

| Tier | May run |
|------|---------|
| `developer` | `read-only`; may confirm & run `needs-approval`; may call APIs with own env creds. |
| `support` | `read-only`; guided-human steps; scoped API reads. Cannot confirm `needs-approval`. |
| `business` | interpretation + `read-only` scoped reads only. Always redacted + confidence-gated. Cannot confirm `needs-approval`. |
| `admin` | everything `developer` can, plus authoring/config. |

The audience gate (C.1/C.2) governs *which steps a tier sees*; these rights govern *what a tier
may do with a step it can see* (e.g. confirm a `needs-approval`, per Gate A).

---

## 6. Gate D — Confidence gate (conclusions)

When the engine gates a **conclusion** for presentation (as opposed to a step for execution),
it enforces the authored `confidence` (`confirmed > likely > unknown`). A lower-privilege
surface — specifically a **`business`-tier** answer — may NEVER present a conclusion at a higher
confidence than authored. The engine never *upgrades*; it enforces the authored level and shapes
the phrasing:

| Authored `confidence` | Business-tier rendering the engine enforces |
|-----------------------|---------------------------------------------|
| `confirmed` | may be stated as fact. |
| `likely` | MUST be phrased "likely — verify"; never asserted as certain. |
| `unknown` | MUST escalate; never presented as a settled answer. |

If a caller/surface attempts to present a conclusion above its authored confidence for a
business-tier answer (e.g. rendering a `likely` conclusion as `confirmed`), the engine
**rejects** that presentation with reason `confidence upgrade forbidden for business tier`. The
correct behavior is to render at (or below) the authored level — the engine will emit the
downgraded phrasing rather than the upgraded claim. Confidence may be *downgraded* (e.g. when
evidence is incomplete) but never *upgraded*.

Conclusions also carry an `audience`; C.1/C.2 apply to conclusions too (a conclusion whose
`audience` excludes the caller is not shown to that caller).

### 6.1 Confirmed-verdict requires the owning environment (G2)

The confidence gate must guard against being "confidently wrong about dev vs prod." A
**data-gap-style verdict** — a conclusion that asserts data is genuinely absent / has not landed
/ does not exist (as opposed to "present but mismatched") — may be presented as **`confirmed`**
only if the **load-bearing capability** (the step whose evidence the conclusion draws on, per
`conclusions[].from_steps`) resolved to the environment that OWNS that data. Concretely: if the
verdict concerns production data but the evidence step's `DecisionRecord.resolved_env` is not the
production/owning environment, the conclusion MUST be **downgraded to `likely`** (verify) and
MUST NOT be presented as `confirmed` — checking dev and declaring prod-data absent is exactly the
error this rule prevents.

**Where this is enforced:** the rails engine's `decide()` is per-step, so it captures the
`resolved_env` on each executable step's DecisionRecord (above). The conclusion-side refusal —
correlating a data-gap conclusion's `from_steps` with those records and refusing `confirmed` when
the owning environment wasn't queried — is enforced by the investigate skill (WS5), which is the
component that assembles a verdict from the step records. This section defines the contract that
skill consumes; the engine provides the `resolved_env` signal it keys on. (This is a *downgrade*,
consistent with §6: confidence may be lowered when evidence is incomplete, never raised.)

### 6.2 Telemetry/DB-liveness guardrail (v0.4) — feeds Gate D

The confidence gate must also guard against being "confidently wrong about a source that returned
nothing" — recommending a trace tool when its spans are a **no-op**, or declaring "confirmed: no
data" when a query silently hit an **empty** or wrong source. This rule **mirrors §6.1** and
reuses the same `from_steps` + per-step `resolved_env` plumbing.

**Liveness signal.** Each executable step's `produced_output` may carry a **`liveness`** label
describing whether the capability returned *usable* evidence:

| `liveness` | Meaning |
|------------|---------|
| `data` | the step returned usable rows / spans / log lines. |
| `empty` | the step ran but returned an empty result set (no rows/spans/lines). |
| `no-op` | the source did nothing usable (e.g. a no-op / absent telemetry span, an unconfigured source). |
| `unknown` | not determinable (a legitimate zero cannot be told apart from a no-op). |

The engine reads `liveness` from `produced_output` and records the code-controlled label on the
step's DecisionRecord (§8). When `produced_output` carries no `liveness` (a v0.3 output), the label
is `null` and this rule does not fire — **backward compatible**.

**Rule (mirrors §6.1).** A conclusion whose `from_steps` includes a **load-bearing** step whose
DecisionRecord `liveness` is **`empty`** or **`no-op`** MUST NOT be presented above
**`likely — verify`**: a `confirmed` verdict resting on an empty/no-op source is **downgraded to
`likely`** (verify). This stops "confirmed: recommend the trace tool" when spans are a no-op and
"confirmed: no data" when a query silently hit an empty/wrong source.

**Downgrade-only, and SAFE by construction.** Like §6, this guardrail only ever **lowers**
confidence — it NEVER fabricates evidence and NEVER upgrades. If `liveness` is **`unknown`** (or
absent), the engine does **NOT** downgrade on this rule alone — the heuristic must not over-fire on
an ambiguous legitimate-zero. Only a proven `empty`/`no-op` load-bearing step triggers the cap.

**Where enforced.** The per-step `decide()` captures each step's `liveness` on its DecisionRecord
(as it captures `resolved_env` for §6.1). The conclusion-side gate — `decide_conclusion()` — is
handed the load-bearing steps' records (`from_steps` → their DecisionRecords) and applies the
downgrade in **Gate D** alongside the §6.1 confirmed-refusal logic. The outcome remains `allow`
(the conclusion may still be shown), but at the capped `likely — verify` confidence, and the record
carries `gate: D-confidence` with a `liveness: empty-or-no-op` marker so the downgrade is auditable.

---

## 7. Gate F — Redaction pass (INV-6)

Before ANY output leaves the engine, it is transformed by the playbook's `redaction` block. This
pass runs on all step output and on rendered conclusions. It is the enforcement that prevents the
"sensitive value echoed through an audited/logged channel" class of bug: the engine redacts
*before* it hands output to any channel — including any that is itself logged or audited.

Order of application within the pass:

1. **Secret elision (§3)** — any output value equal to a `${env.*}` value the step referenced is
   an implicit `never_return` and is **blocked**. The engine holds that value only transiently
   for the connection and never surfaces it.
2. **`never_return`** — any value/field matched here is removed entirely. If a `never_return`
   value is present in the output, the affected output is **blocked**: the engine does not
   emit the raw value under any circumstance. (A step whose *sole purpose* would be to return a
   `never_return` value therefore yields blocked/empty output — see trap case (b).)
   Two forms (per the schema):
   - **String term** — matched with **token-boundary matching** (G10), NOT naive substring.
     The term and each output field name / string value are reduced to normalized, stemmed word
     tokens (lower-cased, non-alphanumerics are boundaries, trailing plural `s` folded) plus a
     collapsed whole-string token. A term matches when its collapsed form OR all its stemmed word
     tokens appear in a field's or value's token set. This is why `never_return: ["connection
     strings"]` (plural) now blocks a `connectionString` field or a `connection string:` value
     (singular) — the pre-G10 substring check (`term.lower() in value.lower()`) missed exactly
     this and leaked a secret (the highest-severity dogfooding finding). Token matching also
     avoids false positives: `"connection strings"` does NOT match an unrelated `connect` /
     `reconnection` token.
   - **Structured `{ field_path: "a.b.c" }`** — deterministic. The engine walks the dotted path
     into the output and, if that exact path is present, blocks it. No heuristics; the record
     lists the path name only, never the value.
3. **Built-in credential patterns (`redaction.builtins`, G10)** — see §7.1. Default `on`.
4. **`mask`** — each `mask[].field` is partially shown per its `strategy`:
   - `last4` — show only the last 4 characters, mask the rest (e.g. `••••••1234`).
   - `hash` — replace the value with a stable non-reversible hash.
   - `full-mask` — replace the entire value with a fixed mask (e.g. `••••`).
5. **`default`** — the fall-through policy for anything not explicitly handled above:
   - `default: safe` — **redact anything not explicitly allowed for the caller's tier.** Authors
     opt fields *in* to visibility; when in doubt, redact. For a `business` caller especially,
     only fields explicitly permitted for that tier survive; everything else is masked/removed.
   - `default: permissive` — the schema permits it, but the engine still applies `never_return`,
     `mask`, and §3 secret elision; `permissive` only widens the fall-through for fields not
     otherwise governed, and the engine still narrows to the caller's tier for `business`.

The `DecisionRecord.redactions` field lists exactly what the pass did (which fields were
removed, masked, or blocked and why), so the transformation is auditable **without** the
record ever containing the sensitive values themselves.

**Redaction is not skippable.** There is no surface, tier, or flag that returns un-redacted
output. `allow` means "allowed, *and here is the redacted output*", never "allowed, raw".

### 7.1 Built-in credential patterns (`redaction.builtins`, G10)

Secret-safety must NOT depend on how (or whether) the author worded `never_return` — the
dogfooding leak was a plural/singular wording mismatch. So, independently of `never_return`, the
engine applies a fixed set of **built-in credential patterns**. This layer is governed by
`redaction.builtins` (schema; default `on`). When on, the engine **blocks** any output field
whose name or value looks like a credential, even if the playbook's `never_return` list is empty
or mis-worded. Blocked entries are recorded with `why: builtin-credential`.

A field/value is credential-shaped when ANY of these hold:

- **Credential key name** — the field name reduces (via the same token normalization as §7.2) to
  one of: `password`, `passwd`, `pwd`, `token`, `secret`, `api_key`/`apikey`, `dsn`,
  `credential(s)`, `connection string`/`connectionString`, `conn_str`, `private_key`,
  `access_key`, `secret_key`, `auth_token`, `bearer`.
- **Connection-string URL shape** — the value matches `scheme://user:pass@host` (e.g.
  `postgres://u:p@host/db`).
- **`key=value` credential shape** — the value contains a `key[:=]value` where `key` is one of
  the credential key names above (e.g. `... user=svc;password=hunter2`, `api_key: abc`).

The patterns are tuned to avoid over-redaction of legitimate output (the design's Open-Questions
risk): an ordinary field such as `region`, `record_count`, `status`, or `business_date` is NOT
credential-shaped and is not blocked. Set `redaction.builtins: off` only for the rare playbook
that must deliberately return a value a built-in would otherwise catch (e.g. a "list design
tokens" step whose `token` field is not a secret); with `builtins: off` and no matching
`never_return`, that value is allowed through.

> **Fail-safe default.** Because unquoted YAML parses `on`/`off` as booleans, the engine treats
> only an explicit `off`/`false`/`no`/`0` as disabling; anything else (including absent) is `on`.

### 7.2 Token normalization (shared by §7.2 string terms and §7.1 key names)

The engine reduces a string to a set of tokens by lower-casing, splitting on any non-alphanumeric
run (so `connection_string`, `connection-string`, `connection string`, `connectionString` all
split the same), folding a trailing plural `s` on each word, and adding a collapsed whole-string
token. Matching is then set membership, never raw substring — which both closes the
plural/singular leak and prevents substring false positives.

---

## 8. Decision-record format

The engine emits exactly one **DecisionRecord** per step (and per gated conclusion), so an
investigation is fully auditable. It is emitted for `allow`, `needs-approval`, `reject`, and
`inert` alike. The record NEVER contains a secret value or a `never_return` value — only names,
outcomes, and reasons (INV-5/INV-6).

```yaml
decision_record:
  step_id: <steps[].id or conclusions[].id>
  kind: <step kind or "conclusion">
  caller_tier: <developer|support|business|admin>
  outcome: <allow|needs-approval|reject|inert>
  gate: <A-safety|B-capability|C-audience|D-confidence|F-redaction|null>
        # the gate that PRODUCED the outcome; null when allowed through all gates
  reason: "<human-readable, secret-free explanation>"
  capability: <resolved capability/skill name, or null>   # name only, never an endpoint secret
  resolved_env: <production|non-production|<env-name>|null>  # G2 — env the capability bound to
  resolved_from: <capabilities|investigation_toolbox|null>  # v0.4 §4.1 — which section resolved it
  liveness: <data|empty|no-op|unknown|empty-or-no-op|null>  # v0.4 §6.2 — step-output liveness label
  redactions:                       # what Gate F did; empty list if no output gated yet
    - field: <field-or-value-name>
      action: <removed|masked|blocked>
      strategy: <last4|hash|full-mask|null>   # for action: masked
      why: <never_return|builtin-credential|mask-rule|default-safe|secret-elided>
  requires_confirmation_by: [<tiers>]   # only when outcome == needs-approval
  timestamp: "<ISO-8601>"           # when the decision was made
```

Field rules:

- `outcome` and `gate` are the machine-readable heart; `reason` is the human explanation.
- `gate` is `null` only when `outcome: allow` (passed every gate). For every other outcome it
  names the gate that decided it.
- **`resolved_env` (G2, v0.3)** records which ENVIRONMENT the step's capability bound to, read
  from the manifest binding: an explicit `env` string if present, else `production` when the
  capability carries `production: true`, else `non-production`. It is `null` when nothing
  resolved (an unmapped/`inert` step, a `guided-human`/`note`, or a gated conclusion). It is a
  code-controlled label — never a secret — so it is safe in the audit record, and it is the
  signal the confidence gate uses for the confirmed-refusal rule (§6.1).
- **`resolved_from` (v0.4, §4.1)** records which manifest section a capability resolved from —
  `capabilities` or `investigation_toolbox` — so an audit can distinguish a declared capability
  from an ambient toolbox tool. It is `null` when nothing capability-shaped resolved (a `skill-call`,
  `guided-human`/`note`, unmapped/`inert`, or a gated conclusion). Code-controlled label, never a
  secret. Authority is identical regardless of source; only discovery differs.
- **`liveness` (v0.4, §6.2)** records the step-output liveness label (`data`/`empty`/`no-op`/
  `unknown`) the runner attached to `produced_output`, or the `empty-or-no-op` marker on a
  conclusion the §6.2 guardrail downgraded. It is `null` when no liveness was supplied (v0.3
  output). Code-controlled enum, never a secret; it is the signal the confidence gate keys on for
  the liveness downgrade (§6.2).
- `redactions` documents the transformation, listing NAMES/actions only — never the sensitive
  values. A `blocked` action means a `never_return`/secret/built-in-credential value was present
  and the output was withheld.
- `requires_confirmation_by` appears only for `needs-approval`, listing the tiers authorized to
  confirm (developer/admin per §2).
- The record is safe to write to any audited/logged channel, by construction.

A surface MUST persist (or at least be able to render) the DecisionRecord for every step it
runs. The chain of records for an investigation is its audit trail.

---

## 9. Surface-agnostic conformance checklist

Any surface that runs Scout steps (Claude Code skill, MCP tool, chat adapter, guided-human
runner) MUST:

1. Call `decide()` (this algorithm, in this order) for every proposed step and gated
   conclusion — never execute a step it has not put through the rails.
2. Honor the outcome exactly: run only on `allow`; block-and-preview on `needs-approval`;
   never run on `reject`; skip-with-reason on `inert`.
3. Emit and retain the DecisionRecord (§8) for each.
4. Return only Gate-F-redacted output; never a raw value, never a secret.
5. Apply the identical tier rights and role_map — a surface may not grant a tier more than §5
   allows, and may not invent roles beyond the manifest's `role_map`.

A surface that cannot perform one of these MUST refuse the step (fail closed), never run it
un-railed.

---

## 10. Procedure-execution semantics (`kind: procedure` / `/scout:runbook`)

A `metadata.kind: procedure` playbook (schema v0.3) is an ordered operational runbook — promote a
build, sync secrets, refresh ESO, run terraform. Unlike an investigation (which reads to a
verdict), a procedure's steps often **MUTATE**. This section is the CONTRACT the `/scout:runbook`
skill (WS4) consumes; the same `decide()` gates apply, with these additional rules a procedure
runner MUST enforce.

**P1 — Mutating steps are `needs-approval` or higher.** Every step of a procedure that mutates,
operates on, or has side effects on a real system MUST be authored `safety: needs-approval` (or
`forbidden` if it must never run). A mutating step tagged `read-only` is an **authoring error**;
the rails treat it as `needs-approval` at minimum — a procedure runner MUST NOT execute a mutating
step on the strength of a `read-only` tag. (The rails engine cannot always infer "mutating" from a
capability alone; the safe contract is that procedure authors classify mutating steps
`needs-approval`, and the runner refuses to auto-run anything in a procedure that is not provably
read-only. When in doubt, treat as `needs-approval`.)

**P2 — Preview + confirm by an approval tier.** Each `needs-approval` step gets a **dry-run
preview** (resolved target/command, params with secrets elided per §3, and the redaction that will
apply) and requires confirmation before it runs — exactly as Gate A.2 specifies. The tiers that
may confirm are the manifest's `approval_tiers` (falling back to the §5 default: `developer` /
`admin`). `support` / `business` may see the preview but never confirm a mutating step.

**P3 — Ordered, halt-on-failure by default.** Procedure steps execute strictly in order. A step's
`on_error` governs progression; for a procedure the safe default is `halt` (do not proceed past a
failed mutating step). A step that resolves `inert` (unmapped capability) is skipped with reason,
same as anywhere — but a runner SHOULD surface that a *procedure* step went inert prominently,
because a skipped mutation can leave a partial operation.

**P4 — Verify + rollback.** A well-formed procedure SHOULD carry a **verify** step after its
mutations (a `read-only` / `diagnostic-query` check that confirms the intended end state) and
**rollback guidance** (how to undo, typically as `guided-human` instructions or a further
`needs-approval` step). The runner presents verify results as the procedure's terminal outcome
(via `conclusions`, used here as verify results) and surfaces the rollback guidance if verify
fails. Redaction (§7) applies to all procedure output identically — a procedure never echoes a
secret it used to authenticate a mutation.

These rules add to, and never relax, the ordered gates of §1: a procedure step still passes
A.0 → B → A.1 → A.2 → C → (E) → F. `kind: procedure` changes *which runner routes to the
playbook and the P1–P4 authoring/execution discipline above*, not the decision algorithm.
