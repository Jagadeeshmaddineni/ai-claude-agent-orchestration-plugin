---
name: lint
description: "Health-check the repo's Scout playbook store (.claude/scout/playbooks/) — READ-ONLY. Flags playbooks whose metadata.last_verified is old (stale) or missing, metadata.status: draft playbooks that were never promoted, playbooks referencing capabilities / skills / investigator roles NOT in the current Capability Manifest (drifted — they would run inert; the union of capabilities[] and the v0.4 ambient investigation_toolbox[]), broken references (bad capability/skill/role names, dangling doc/source paths), and INDEX reconciliation gaps (playbooks missing from INDEX.md, INDEX entries whose playbook file is gone, and INDEX entries whose keywords/kind drifted from the playbook). Also runs a v0.4 toolbox reconciliation (toolbox tools with no how-to-use kind: toolbox playbook; toolbox playbooks not INDEX-registered; orphan toolbox INDEX entries) and a store-wide guardrail preflight (inert steps, free-form queries that would reject, confirmed conclusions that would always downgrade). Produces a per-playbook health summary (fresh / stale / drifted / draft + why) and a prioritized punch list. Suggests fixes; never forces them. Modifies nothing; reads no secrets. Repo-agnostic; conceptually mirrors /team-work:work-lint for playbooks. Usage: /scout:lint [--stale-after <days>]"
---

# Scout Lint — playbook staleness / drift / draft health check (read-only)

> STATUS: **v0.4.** A health check over a repo's Scout playbook store. It reads the playbooks
> and the Capability Manifest and reports which playbooks are **fresh, stale, drifted, or
> still-draft**, and why. It is the playbook-knowledge analogue of `/team-work:work-lint`
> (which health-checks a wiki). It is **read-only**: it suggests fixes, it never applies them,
> never edits a playbook, and never touches the schema or the rails. See
> [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md).

## What this is (read this first)

Playbooks are encoded institutional knowledge — and like all knowledge, they rot. A playbook can
go **stale** (not verified in a long time), stay **draft** (harvested but never promoted to
active), or **drift** (reference a capability/skill/role the repo's current Capability Manifest
no longer provides, so the playbook would run **inert** — silently doing nothing). `/scout:lint`
surfaces all of that in one pass so a maintainer can keep the store fresh, rather than
discovering a dead playbook mid-incident.

**Who runs this:** a **developer or support engineer / playbook admin with repo access**
(maintenance happens in the repo). It is a maintenance/hygiene skill, not a consuming-audience
one.

## Hard invariants (this skill MUST obey all of them)

- **INV-1 Repo-agnostic core.** No app-, account-, or vendor-specific logic or examples. It lints
  whatever playbooks + manifest the target repo happens to have.
- **INV-5 Secrets never seen, only used.** It reads playbook YAML and the manifest, which carry
  capability/skill/role NAMES and env-var NAMES only — never values. It never opens `.env`,
  never resolves or echoes any `${env.*}` value, and never surfaces a credential.
- **INV-6 Redaction / no leaks.** Its output is names, dates, statuses, and reasons only. If a
  playbook or manifest ever contained something secret-looking, it cites the location by path,
  never the value.
- **INV-9 Reuse, don't reimplement.** It mirrors the *spirit* of `/team-work:work-lint`
  (health-check + prioritized punch list + read-only-with-offer-to-fix) applied to playbooks; it
  does not reimplement wiki linting. For fixing a flagged draft/stale playbook it points at
  `/scout:author` (edit) — it does not author or edit playbooks itself.
- **Read-only.** It **modifies nothing** — no writes to playbooks, the manifest, the schema, or
  the rails. It only reports and suggests. (An OPTIONAL `--fix` offer, if ever added via the
  extension hooks, would still require explicit per-change confirmation — the default is
  report-only.)

## The contracts it reads (READ-ONLY — never modified)

- **Playbook schema** — [`../../schema/playbook.schema.md`](../../schema/playbook.schema.md)
  (v0.2). The lint keys are `metadata.last_verified` (drives **staleness**), `metadata.status`
  (`draft | active | deprecated` — drives the **draft** check), and every capability/skill/role
  NAME referenced by `steps[]` (drives the **drift** check). Read-only.
- **Capability Manifest** — the target repo's `.claude/scout/capability-manifest.md`, written by
  [`/scout:setup`](../setup/SKILL.md). Its `capabilities[].name`, `skills[].name`, and
  `investigators:` role map are the **source of truth** for what is currently bound. A playbook
  reference not present there is **drift** (the step would be inert). Read-only.
  - **`investigation_toolbox[]` (v0.4).** The optional ambient shared-tool section. A
    `request.capability` resolves against the **union** of `capabilities[].name` **and**
    `investigation_toolbox[].name` (capabilities-first, per
    [`../../rails/RAILS.md`](../../rails/RAILS.md) §4.1), so the drift check MUST scan BOTH — a step
    resolving to an ambient toolbox tool is bound, NOT drift. Its tool names also drive the v0.4
    **toolbox reconciliation** (check 1f). If the section is absent (a v0.3 manifest), treat the
    toolbox set as empty — the union collapses to `capabilities[]` and everything lints exactly as
    before.
- **Toolbox playbooks** — `kind: toolbox` playbooks under `.claude/scout/playbooks/toolbox/`
  (v0.4): how-to-USE/interpret-a-tool playbooks, composed as sub-procedures, never routed to by a
  symptom. Lint reads them like any other playbook (all checks apply) and additionally reconciles
  them against the `investigation_toolbox[]` tools + the INDEX (check 1f). Read-only.
- **Playbook INDEX** — the target repo's `.claude/scout/playbooks/INDEX.md`, appended by
  [`/scout:author`](../author/SKILL.md) and [`/scout:harvest`](../harvest/SKILL.md) and read by the
  runners to route. Its entry shape is defined by
  [`../../schema/index.schema.md`](../../schema/index.schema.md) /
  [`../../schema/index.schema.json`](../../schema/index.schema.json) (`id`/`title`/`kind`/
  `keywords`/`when_to_use`/`path`). Lint **reconciles** it against the store: the playbook file is
  authoritative on any conflict (`id` is the join key). Read-only.

---

## Phase Map

At the start of every phase, print a banner:

```
═══════════════════════════════════════════════════════
/scout:lint phase <label>: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| Label | Phase name                                                                    |
|-------|-------------------------------------------------------------------------------|
| 0     | Intake — locate repo, load the playbook store (incl. `toolbox/`) + Capability Manifest (incl. `investigation_toolbox`) + INDEX |
| 1     | Check each playbook — staleness · draft · drift · broken references · INDEX reconcile · toolbox reconcile (1f) · guardrail preflight (1g) |
| 2     | Report — per-playbook health summary + prioritized punch list + suggested fixes|

---

## Phase 0: Intake — load the store + the manifest

**Print phase banner.**

1. **Locate the target repo** — current working repo root (dir with `.git`, or the top-most
   ancestor with a project marker). Store + manifest are read relative to it.
2. **Load the playbook store** — read every `*.playbook.yaml` under `.claude/scout/playbooks/`,
   **including the `toolbox/` subdir** (v0.4) — a `kind: toolbox` playbook is a normal playbook and
   gets every check; note its `metadata.kind: toolbox` and its subdir location for checks 1e/1f.
   - If the directory is **missing or empty**: report "no playbooks to lint yet" and offer
     `/scout:author` (write one) or `/scout:harvest` (auto-draft from existing docs). Stop.
   - Parse each playbook's YAML (strictly). A file that fails to parse is itself a lint finding
     ("unparseable playbook — fix YAML"): report it and continue with the rest.
3. **Load the Capability Manifest** — `.claude/scout/capability-manifest.md`.
   - If **absent**: note that `/scout:setup` has not run, so the **drift** check cannot resolve
     references (every capability/skill/role would appear unbound). Still run the **staleness**,
     **draft**, and **YAML/self-reference** checks — those don't need the manifest — and clearly
     mark drift as "cannot evaluate (no manifest — run `/scout:setup`)". Do not fabricate a
     manifest or bindings.
   - If **present**: read `capabilities[].name`, `skills[].name`, and the `investigators:` role
     map into three sets — the currently-bound capability / skill / role names. **Also read the
     v0.4 `investigation_toolbox[].name` set** (the ambient tools): fold it INTO the bound-capability
     set for the drift check (the rails resolve `request.capability` against the union,
     capabilities-first — RAILS.md §4.1), and keep it separately for the toolbox reconciliation
     (1f). If there is no `investigation_toolbox` section, the toolbox set is empty and the union is
     just `capabilities[]` — identical to v0.3.
4. **Load the playbook INDEX** — `.claude/scout/playbooks/INDEX.md`, for the reconciliation check
   (1e). Parse its `playbooks[]` entries into a map keyed by `id` (each carrying
   `title`/`kind`/`keywords`/`when_to_use`/`path`).
   - If **absent**: note that no INDEX exists (runners can't route by natural language) and treat
     the INDEX-side as empty — the reconciliation check will then flag every playbook as "missing
     from INDEX" and suggest running `/scout:setup` (rebuild) or re-authoring. Do not fabricate one.
   - If it **fails to parse / fails `index.schema.json`**: that is itself a lint finding
     ("unparseable or invalid INDEX — fix or rebuild via `/scout:setup`"); report it and continue
     with whatever entries did parse.
5. **Parse options.** `--stale-after <days>` overrides the staleness threshold (default below).
   Strip it from any other args.

## Phase 1: Check each playbook

**Print phase banner.** For **each** parsed playbook, evaluate checks 1a–1d below, then run the
store-wide reconciliations: INDEX (1e), toolbox (1f, v0.4), and the guardrail preflight (1g, v0.4).
Record the findings. Nothing here writes anything.

### 1a. Staleness — `metadata.last_verified`

`metadata.last_verified` (an optional `"YYYY-MM-DD"` string) is the last time a human confirmed
the playbook still reflects reality.

- **Missing** `last_verified` → **stale (unverified)**: it has never been marked verified. Flag
  it; suggest verifying + setting `last_verified`.
- **Present** → compare to today. If `today − last_verified` exceeds the **staleness threshold**,
  flag it **stale**. Default threshold: **180 days** (configurable via `--stale-after <days>`).
  Report the age (e.g. "last verified 240 days ago").
- Parse `last_verified` defensively: it should be a quoted `YYYY-MM-DD` string. If it is an
  unquoted native YAML date or an unparseable value, flag it as a **broken reference**
  ("`last_verified` should be a quoted `YYYY-MM-DD` string") in addition to the age check.
- A `metadata.status: deprecated` playbook is expected to be old — don't flag it as stale; note
  it as **deprecated** (candidate for removal) instead.

### 1b. Draft never promoted — `metadata.status`

`metadata.status` is `draft | active | deprecated` (optional; `/scout:harvest` sets `draft`).

- **`status: draft`** → flag **draft (never promoted)**: it was drafted (e.g. harvested) but
  never reviewed/promoted to `active`, so `/scout:investigate` may under-trust or skip it.
  Suggest reviewing it in `/scout:author` and promoting to `active` (or deleting if obsolete).
- **`status: deprecated`** → note it: deprecated playbooks still match routing; suggest removing
  them or confirming they're intentionally retained.
- **Missing `status`** → not itself an error (status is optional), but note it as **status
  unset** so a maintainer can decide (treated as active by default).

### 1c. Drift — references to capabilities / skills / roles NOT in the manifest

A playbook step names a **capability** (`api-read`/`query`/`shell-read`/`time-travel` →
`request.capability`), a **skill** (`skill-call` → `request.skill`), or an **investigator role**
(`agent-investigate` → `request.role`). If the current Capability Manifest does not provide that
name, the step is **inert** — it silently does nothing when the playbook runs. That is **drift**:
the playbook looks fine but is partly (or wholly) dead on this repo.

For each executable step in the playbook, collect the referenced name by kind and check it
against the manifest sets loaded in Phase 0:

| Step kind(s) | Referenced name | Checked against | Drift finding when absent |
|--------------|-----------------|-----------------|---------------------------|
| `api-read`, `query`, `diagnostic-query`, `shell-read`, `time-travel` | `request.capability` | manifest `capabilities[].name` **∪ `investigation_toolbox[].name`** (v0.4 union; capabilities-first) | "capability `<name>` not bound → step would be inert" |
| `skill-call` | `request.skill` | manifest `skills[].name` | "skill `<name>` not available → step would be inert" |
| `agent-investigate` | `request.role` | manifest `investigators:` roles | "role `<name>` has no agent bound → leg would be inert" |

> **v0.4 — resolve against the toolbox union.** A `request.capability` is **bound** if the name is
> in `capabilities[].name` OR the ambient `investigation_toolbox[].name` (the rails' union scan,
> RAILS.md §4.1). A step resolving to an ambient toolbox tool is NOT drift — do not flag it. Only a
> name in **neither** section is inert. (A v0.3 manifest with no toolbox section behaves exactly as
> before: the union is just `capabilities[]`.)

- **All references bound** → the playbook is not drifted.
- **Some references unbound** → **partial drift**: name each unbound reference + which step. The
  playbook still runs, but those steps are inert.
- **Every executable reference unbound** → **fully drifted (inert)**: the playbook would do
  effectively nothing on this repo — the highest-priority drift finding.
- If the **manifest is absent** (Phase 0), mark drift **"cannot evaluate — run `/scout:setup`"**;
  do not claim references are bound or unbound.
- Note: drift is expected and *valid* for a portable playbook shared across repos (the schema
  says an unmapped capability is valid-but-inert). Lint's job is to make the inertness **visible**
  on *this* repo, not to call it a bug — phrase it as "would run inert here."

### 1d. Broken references (structural)

Beyond manifest drift, flag references that are broken regardless of the manifest:

- **Missing required step body** for a kind (e.g. an `api-read` with no `request.capability`, a
  `skill-call` with no `request.skill`, an `agent-investigate` with no `request.role`/`objective`,
  a `guided-human` with no `instructions`) — a schema violation; suggest fixing via `/scout:author`
  or re-validating against `playbook.schema.json`.
- **Dangling provenance path** — `metadata.source` (a doc path a harvested playbook came from)
  that no longer exists in the repo. Flag "source doc `<path>` no longer exists."
- **Empty/missing required routing** — `metadata.triggers` with no `keywords` and no `signals`
  (the router could never select it), or a duplicate `metadata.id` across two playbooks (id must
  be unique in the store). Flag both.
- **Unreachable conclusion** — a `conclusions[]` entry whose `audience` is empty (v0.2 requires
  `minItems: 1`) — it can never be shown.

Structural checks read the schema shape only; when a Python env with `pyyaml` is available you
MAY additionally validate a playbook against
[`../../schema/playbook.schema.json`](../../schema/playbook.schema.json) and fold any schema
errors into the broken-reference findings — but never rewrite the playbook.

### 1e. INDEX reconciliation — store vs `.claude/scout/playbooks/INDEX.md`

The INDEX is the routing backbone the runners read FIRST; if it drifts from the store, a runner
routes wrong — or can't reach a playbook at all. Reconcile the INDEX map (loaded in Phase 0)
against the parsed playbook store. The **playbook file is authoritative** on any conflict (`id` is
the join key); this check makes the divergence visible, it does not rewrite either side. Emit three
finding classes:

| Finding | Condition | Why it matters | Suggested fix |
|---------|-----------|----------------|---------------|
| **Missing from INDEX** | a playbook `<id>` exists in the store but has NO entry in the INDEX | runners route by reading the INDEX first, so an un-indexed playbook is **effectively unroutable by natural language** (it exists but nothing can find it) | re-author it (`/scout:author` re-registers on write), re-run `/scout:harvest` for a harvested draft, or rebuild via `/scout:setup` |
| **Orphan INDEX entry** | an INDEX entry whose `id`/`path` does NOT resolve to a playbook file in the store (file deleted/renamed) | the runner would try to open a playbook that is gone — a dead route | remove the stale INDEX entry (or restore/rename the playbook) |
| **Drifted INDEX entry** | an INDEX entry whose `keywords`, `kind`, `title`, or `path` no longer match the playbook file's `metadata.triggers.keywords` / `metadata.kind` (default `investigation`) / `metadata.title` / actual relative path | routing keys are stale: e.g. a `kind` mismatch sends it to the WRONG runner (`/scout:investigate` vs `/scout:runbook`), or drifted `keywords` mean it no longer matches the requests it should | refresh the entry (re-authoring the playbook re-syncs it) — the playbook is the source of truth |

- Compare each field precisely: `kind` mismatch (treat a missing playbook `metadata.kind` as
  `investigation`); `keywords` as a set (order-insensitive); `path` as the actual file location
  relative to the store; `title` string-equal. Report exactly which field drifted and both values.
- If the **INDEX is absent** (Phase 0): report every store playbook as "missing from INDEX (no
  INDEX file — run `/scout:setup` to build it, or re-author/re-harvest to create it)"; there are no
  orphan/drift findings to compute against an absent INDEX.
- An **empty store with a non-empty INDEX** → all entries are orphans. An empty store AND empty/no
  INDEX → nothing to reconcile.

### 1f. Toolbox reconciliation (v0.4)

The ambient `investigation_toolbox[]` and the `kind: toolbox` playbooks in `toolbox/` form a small
registry that can drift the same way the store and INDEX can — and the manifest itself can go stale
when new MCP tools appear after the last setup. This check is **entirely additive**: a v0.3 repo
(no `investigation_toolbox` section AND no `toolbox/` playbooks) produces **no** toolbox-registry 1f
findings; the stale-manifest finding only fires when unbound MCP tools are actually visible in the
session. Emit four finding classes:

| Finding | Condition | Class | Suggested fix |
|---------|-----------|-------|---------------|
| **Tool without a how-to-use playbook** | an `investigation_toolbox[].name` for which NO `kind: toolbox` playbook in `toolbox/` teaches how to use/interpret it | **informational** — the tool still resolves ambiently and runs; this only flags that its correct-use know-how isn't captured as a reusable asset | author one via `/scout:author` with `metadata.kind: toolbox` |
| **Unregistered toolbox playbook** | a `kind: toolbox` playbook file in `toolbox/` that has NO INDEX entry, OR whose INDEX entry's `kind` is not `toolbox` | **drift** — an un-/mis-registered toolbox playbook can't be discovered as a composable sub-procedure (or is mis-filed as a routable investigation/procedure) | re-author it (`/scout:author` re-registers with `kind: toolbox`), or rebuild via `/scout:setup` |
| **Orphan toolbox INDEX entry** | an INDEX entry with `kind: toolbox` whose `id`/`path` does NOT resolve to a file in `toolbox/` (deleted/renamed) | **orphan** — a dead sub-procedure reference | remove the stale INDEX entry (or restore/rename the playbook) |
| **Stale manifest — new MCP tools/surfaces not bound** | MCP tools are visible in this session (e.g. `mcp__<server>__*`) whose server/surface is NOT reflected in the manifest's `surfaces.mcp` / `capabilities[]` / `investigation_toolbox[]` | **stale** — the manifest is a snapshot from the last `/scout:setup`; tools added since aren't bound, so any step that would use them runs **inert** and the investigation quietly falls back to manual improvisation outside the rails (the real Trigger-MCP failure) | **run `/scout:setup` to bind the new tools** (or `/scout:author toolbox` to add a common one), then re-lint |

- The **tool-without-a-playbook** finding is **informational only** — it never marks a playbook
  broken/drifted; it is a "capture this know-how" nudge (mirrors the `/scout:harvest` toolbox-gap
  flag and the `/scout:setup` re-probe toolbox health summary). Do not raise a playbook's headline
  severity for it.
- The unregistered / mis-`kind` toolbox playbook is folded into the **INDEX reconciliation** family
  (it is a `kind`-drift or missing-from-INDEX case, scoped to `toolbox/`); the orphan toolbox entry
  is an INDEX orphan. Report them alongside 1e with the `toolbox/` location called out.
- If the manifest has an `investigation_toolbox` section but `toolbox/` is empty, every toolbox tool
  is a "tool without a how-to-use playbook" (informational). If `toolbox/` has playbooks but there
  is no `investigation_toolbox` section, they still lint as playbooks and reconcile against the
  INDEX; there are simply no tools to match them to.

### 1g. Guardrail preflight — store-wide static checks (v0.4)

`/scout:lint` is the **persistent home** for the guardrail preflight (the same three static checks
`/scout:author` runs at write-time in its Phase 7.5): checks with **NO live data** that catch a
schema-valid playbook that will nonetheless run inert, get rejected at a rails gate, or present a
verdict the rails always downgrade. Run them **across ALL playbooks** in the store (including
`toolbox/`). **Read-only, advisory — suggest, never force** (lint's standing posture): these are
findings on the punch list, not a gate. If the **manifest is absent**, mark the checks that need it
"cannot evaluate — run `/scout:setup`" (as the drift check does) and run only what doesn't.

For each playbook, flag:

1. **(i) Step referencing an unmapped capability / toolbox tool → inert.** Any executable step whose
   `request.capability` resolves to **neither** `capabilities[]` **nor** `investigation_toolbox[]`
   (the union scan, RAILS.md §4/§4.1), or whose `request.skill` / `request.role` is unbound. This
   **extends** the 1c drift check to explicitly scan `investigation_toolbox[]` as well — report it
   as "step `<id>` references `<name>` (in neither capabilities[] nor investigation_toolbox[]) →
   would run **inert** here." (1c and 1g(i) are the same underlying condition; when both fire, cite
   it once under drift and don't double-count.)
2. **(ii) `query` / `diagnostic-query` bound free-form → would REJECT at Gate A.1.** Any
   `query`/`diagnostic-query` step that carries inline SQL (`request.sql` / `query` / `query_text` /
   `statement`), OR whose resolved capability `endpoint` contains free-form markers (SQL keywords
   `SELECT`/`INSERT`/`UPDATE`/`DELETE`, `${…}`, `raw connection`, `connection string`, literal
   `free-form`), OR whose resolved endpoint is **empty**. The rails would **reject** it as
   forbidden-free-form-query ([`../../rails/RAILS.md`](../../rails/RAILS.md) §2.A.1) — the query MUST
   name an allowlisted proc (`proc:<...>`). Applies identically to a toolbox `db-read` (always a
   named proc). Report: "step `<id>` would be **rejected at Gate A.1** (free-form query) — bind to a
   named allowlisted proc."
3. **(iii) `confirmed` conclusion that can't reach an owning-env step → would ALWAYS downgrade.**
   Any conclusion authored `confidence: confirmed` whose `from_steps` cannot reach a step resolving
   to an owning-environment capability (`production: true` or an explicit env). The rails' §6.1
   (confirmed-verdict-requires-owning-env) and §6.2 (liveness) guardrails will **always downgrade it
   to `likely — verify`** at run time ([`../../rails/RAILS.md`](../../rails/RAILS.md) §6.1/§6.2).
   Report: "conclusion `<id>` is `confirmed` but its `from_steps` can't reach an owning-env step —
   it will **always present as `likely — verify`**; lower it to `likely` or bind an owning-env
   step." (A `confirmed` conclusion with no `from_steps` at all is flagged the same way — it can't
   demonstrate owning-env evidence.)

These are **advisory** findings: they land on the punch list (a new "guardrail preflight" class),
never rewrite a playbook, and never block anything — a deliberately-portable playbook that names
capabilities THIS repo lacks is valid-but-inert here, exactly as the drift check already says.

## Phase 2: Report — health summary + prioritized punch list

**Print phase banner.**

1. **Per-playbook health line.** For each playbook, print one status line with the worst
   applicable label + the reasons:

   ```
   <playbook-id>  [<fresh|stale|drifted|draft|deprecated|broken>]  status=<active|draft|deprecated|unset>  last_verified=<date|missing>
     - <finding> (e.g. "stale: last verified 240 days ago (threshold 180)")
     - <finding> (e.g. "drifted: capability `run-status` not bound → step `fetch-run-status` inert")
     - <finding> (e.g. "draft: never promoted to active")
   ```

   Label precedence (report the most serious as the headline, list the rest as findings):
   **broken** > **drifted (fully inert)** > **drifted (partial)** > **unindexed** (missing from
   INDEX) > **index-drift** (drifted INDEX entry) > **draft** > **stale** > **deprecated** >
   **fresh**. A playbook with no findings is **fresh** — say so. (Orphan INDEX entries have no
   playbook to attach a health line to — list them separately in the punch list under INDEX.)

2. **Prioritized punch list.** Aggregate across the store, highest-impact first:
   1. **Broken** (schema-invalid / unparseable / duplicate id / unparseable-or-invalid INDEX) — the
      playbook (or the INDEX itself) can't be trusted.
   2. **Fully drifted (inert)** — runs but does nothing on this repo.
   3. **Partially drifted** — some steps inert; name them.
   4. **Guardrail preflight** (1g, v0.4) — would-**reject** free-form `query`/`diagnostic-query`
      steps (highest, a hard rails reject) and would-**always-downgrade** `confirmed` conclusions
      (a verdict that can never present as authored); inert-step findings (1g-i) fold into the drift
      lines above. Name each id + which check fired. Advisory — never blocks.
   5. **INDEX reconciliation** (1e) — **missing from INDEX** (unroutable) and **orphan INDEX
      entries** (dead routes) first, then **drifted INDEX entries** (esp. a `kind` mismatch that
      routes to the wrong runner). Name each id + which side is wrong. **Include toolbox INDEX
      reconciliation** (1f): a `kind: toolbox` playbook in `toolbox/` that is un-/mis-registered, and
      orphan `kind: toolbox` INDEX entries.
   6. **Draft never promoted** — knowledge captured but not trusted for routing.
   7. **Stale** — verify + refresh `last_verified`.
   8. **Toolbox tools without a how-to-use playbook** (1f, **informational**) — capture the tool's
      correct-use know-how as a `kind: toolbox` playbook; never a blocker.
   9. **Deprecated / status unset / dangling source** — housekeeping.

3. **Suggested fixes (never forced).** For each class, suggest the concrete next action WITHOUT
   doing it:
   - stale → "verify against reality, then set `metadata.last_verified: \"<today>\"`."
   - draft → "review in `/scout:author` and set `metadata.status: active` (or delete if obsolete)."
   - drift → "re-run `/scout:setup` to refresh the manifest, or correct the capability/skill/role
     name in the playbook, or accept it as intentionally-portable (inert here)."
   - broken → "fix the YAML / add the required step body / dedupe the id; re-validate against
     `playbook.schema.json`."
   - deprecated → "remove the playbook or confirm it is intentionally retained."
   - INDEX (missing) → "re-author (`/scout:author` re-registers on write), re-harvest, or rebuild
     the INDEX via `/scout:setup`."
   - INDEX (orphan) → "remove the stale INDEX entry, or restore/rename the playbook it points to."
   - INDEX (drift) → "refresh the entry from the playbook (the file is the source of truth) —
     re-authoring re-syncs `keywords`/`kind`/`title`/`path`; a `kind` mismatch is highest-priority
     because it routes to the wrong runner."
   - guardrail (would-reject) → "bind the `query`/`diagnostic-query` step to a named allowlisted proc
     (`proc:<...>`) — free-form is forbidden by definition (RAILS.md §2.A.1)."
   - guardrail (would-downgrade) → "lower the conclusion to `likely`, or add a `from_steps` step that
     resolves to an owning-env (`production`/explicit-env) capability (RAILS.md §6.1/§6.2)."
   - toolbox (no how-to-use playbook) → "author a `kind: toolbox` playbook via `/scout:author`
     (`metadata.kind: toolbox`) to capture how to use/interpret the tool. Informational — optional."
   - toolbox (unregistered / orphan) → "re-author the toolbox playbook (`/scout:author` re-registers
     with `kind: toolbox`), or remove the orphan INDEX entry."

4. **Summary counts + report.** Print totals (`N playbooks: X fresh, Y stale, Z drifted, W draft,
   … , B broken`) plus INDEX reconciliation totals (`INDEX: U missing, O orphan, D drifted`), the
   **guardrail-preflight totals** (`Guardrail: R would-reject, C would-downgrade, I inert`), and the
   **toolbox-reconciliation totals** (`Toolbox: T tools without a how-to-use playbook, P
   unregistered/orphan toolbox playbooks`) — the last two omitted entirely on a v0.3 repo with no
   toolbox and no guardrail findings, so the report reads exactly as before. Remind the caller this
   was **read-only — nothing was changed**. Offer to re-run after they apply fixes.

## Verification before completion

Do not claim the lint is complete until: every playbook in the store (**including `toolbox/`**) was
checked against all checks (staleness · draft · drift · broken · INDEX reconciliation · toolbox
reconciliation (1f) · guardrail preflight (1g)) (or explicitly reported unparseable); drift was
evaluated against the actual manifest sets — the **union** of `capabilities[]` and
`investigation_toolbox[]` (or clearly marked "cannot evaluate — no manifest"); the INDEX was
reconciled against the store (or clearly marked "no INDEX — all playbooks flagged unindexed"); the
toolbox reconciliation + guardrail preflight ran (finding nothing on a v0.3 repo is the correct
result, not a skip); the report contains only names/dates/statuses/reasons (no `${env.*}` value, no
credential, no secret); and **nothing on disk was modified**. See the
[verification-before-completion policy](../../../agent-orch/policies/verification-before-completion.md).

## What this skill does NOT do

- It does not modify, author, or promote playbooks — it reports and suggests. Fixes go through
  `/scout:author` (or a hand edit); staleness is cleared by a human verifying and updating
  `last_verified`.
- It does not modify the schema or the rails (read-only consumers of the schema shape only).
- It does not run playbooks or gather evidence — that is `/scout:investigate`. Lint never
  executes a step, calls a capability, or resolves a secret.
- It does not reimplement wiki linting — it mirrors `/team-work:work-lint`'s spirit for playbooks.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running, check that
file for a `skills.scout-lint:` entry. If the file is absent, has no entry for this skill, or the
entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points:
- `before` — targets run before intake begins (e.g. inject a house staleness threshold or an
  additional check).
- `after` — targets run after the health report is produced (e.g. open a maintenance ticket for
  the punch list, or gate CI on drift/broken findings).

Run any listed targets in order per the shared resolver
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline). Tell the user
when you run an extension target; a failing target is surfaced but does not abort the skill. Full
contract: `plugins/agent-orch/rules/extensibility.md`.
