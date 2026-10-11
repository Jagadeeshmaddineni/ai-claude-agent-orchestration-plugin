---
name: setup
description: "Stand up a Scout support module in the current repo — probe its capabilities (AI chat, MCP, internal APIs AND sibling/non-primary HTTP services, runbooks, data stores, auth/governance, existing investigation skills, team-work wiki), emit a Capability Manifest (with v0.3 auth-style + production markers and a v0.4 ambient investigation_toolbox), scaffold the playbook store (incl. a toolbox/ subdir), and create/refresh the playbook INDEX. Re-running reconciles (merge, never clobber) and reports a toolbox health check. Read-only probe; repo-agnostic; inherits the repo's own governance. Usage: /scout:setup"
---

# Scout Setup — probe a repo and stand up a support module

Run this once per repo, first. `/scout:setup` performs a **read-only probe** of the current
repo to learn what support surfaces it has, writes a **Capability Manifest** that binds the
abstract capability names playbooks reference to this repo's real endpoints/commands + auth env
var names, scaffolds an (empty) playbook store, and reports what was found and what to run next.

Nothing here is application-specific. Scout is a factory; the specificity comes from what a team
authors (declarative **playbooks**, see `../../schema/playbook.schema.md`) and what their repo
exposes. See [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) for the whole picture.

## Hard invariants (this skill MUST obey all of them)

- **INV-1 Repo-agnostic core.** This skill contains NO application/account/vendor specifics. It
  detects generically. Everything repo-specific it discovers is written into the *target* repo's
  manifest, never back into the plugin.
- **INV-4 Complementary, not a replacement.** It only *records* existing runbooks / chat / MCP /
  scripts / investigation skills / wiki — it never rebuilds or replaces them.
- **INV-5 Secrets never seen, only used.** The probe records env var **NAMES** only. It MUST NOT
  open `.env` files, print, log, or store a secret value. If it encounters a value, it records the
  name and discards the value.
- **INV-8 Inherit governance, don't invent it.** It maps Scout's tiers onto the repo's detected
  roles/CODEOWNERS/PR rules. When nothing is detected it says so and applies the schema's tier
  defaults — it does not fabricate a role model.
- **Writes are confined.** The ONLY paths this skill may create or modify are under the target
  repo's `.claude/scout/`. It writes nowhere else. The probe itself writes nothing.

## Two-repo mental model (design for both)

The probe must produce a correct, materially DIFFERENT manifest on each of these, and never fail
on either:

- **Rich repo** — has an AI chat, an MCP server, internal REST/GraphQL APIs behind auth, a role
  model + CODEOWNERS, its own `investigate-*` skills, and a team-work wiki. Manifest is full:
  every `surfaces:` entry `available`, several `capabilities:`, a real `role_map`, a `skills:`
  list.
- **Plain repo** — only a README, some `docs/runbooks/`, and a `Makefile`/scripts. No chat, no
  MCP, no API, no role model, no existing skills, no wiki. Manifest is sparse: `mcp/chat/wiki:
  absent`, `capabilities:` limited to read-only shell/script commands (or `[]`), `role_map`
  falling back to schema tier defaults, `skills: []`. **This is a fully valid outcome, not a
  failure.** Scout's baseline surface — the Claude Code skill — is always available, so Scout
  works even here.

The rule: **detect what's there, record it precisely, degrade cleanly for what isn't.**

---

## Phase 0: Locate the target repo (and pre-flight)

1. The **target repo** is the current working repo root (the directory containing `.git`, or the
   top-most ancestor with a project marker such as `package.json` / `pyproject.toml` / `go.mod` /
   `pom.xml`). All probing and all writes are relative to this root.
2. If `.claude/scout/capability-manifest.md` already exists, this is a **re-probe** — the explicit
   **reconcile** flow ("is setup done? what's new?"). Read it, tell the user it exists, and offer:
   (a) refresh in place (re-run the probe, merge — preserve any manual edits to `role_map`/
   `audience` the user made, overwrite auto-detected facts), or (b) show a diff of what changed, or
   (c) cancel. Never silently clobber a hand-edited manifest.
   - **Merge the `investigation_toolbox` too (v0.4).** On a refresh, apply the SAME preserve-hand-
     edits rule that `role_map`/`audience`/INDEX `when_to_use` get: keep every hand-filled toolbox
     entry and any manual edits to a stub verbatim; only ADD newly-detected canonical stubs that are
     missing, and refresh the auto-detected facts (endpoint/auth/production/source) on entries that
     are still un-edited stubs. Never overwrite a tool the user completed. A v0.3 manifest with NO
     `investigation_toolbox` section gets the section ADDED as stubs (backward-compatible — merge,
     never clobber; a repo that never wants a toolbox is unaffected).
   - A re-probe is a **toolbox health check**, not a rebuild: it produces the reconciliation summary
     in Phase 4 (which canonical tools are still unfilled stubs, which newly-detectable surfaces
     could be added, which toolbox entries have no how-to-use playbook yet).
3. Confirm the probe is read-only: it uses Glob/Grep/Read only. It does NOT run the repo's build,
   start servers, or execute scripts.

---

## Phase 1: Probe (read-only)

Work through each surface below. For each: run the detection heuristics, and record either a
concrete finding **with provenance** (the `file:line` or doc where you saw it) or an explicit
"absent". **Never guess.** If a heuristic is ambiguous, record it as a candidate and note the
uncertainty rather than asserting a capability that may not exist.

> Grep guidance: search source + config + docs, case-insensitively, and read enough surrounding
> context to confirm a hit is real (not a comment, a test fixture, or a vendored dependency).
> Skip `node_modules/`, `vendor/`, `.venv/`, `dist/`, `build/`, and lockfiles.

### 1a. AI chat surface

Is there an assistant/chat/copilot the app itself exposes (a candidate `chat` surface)?

- Grep (case-insensitive) for: `chat`, `assistant`, `copilot`, `completion`, `streamText`,
  `text/event-stream`, `server-sent events`/`SSE`, `function.?calling`, `tool.?call`,
  `system.?prompt`.
- Look for routes/handlers whose path contains `chat`/`assistant`/`ai` (e.g. `**/api/chat/**`,
  `**/routes/**chat**`, `**/*chat*.{ts,js,py,go,java}`).
- Look for an LLM client dependency in the manifest (`package.json`, `requirements.txt`,
  `pyproject.toml`, `go.mod`, `pom.xml`) — a generic signal that a chat/agent surface may exist.
- **Record:** `chat: available` + provenance if a genuine chat endpoint/handler exists; else
  `chat: absent`. (A bare LLM dependency with no chat route → note as a weak signal, default
  `absent` unless a route/handler confirms it.)

### 1b. MCP surface

Does the repo expose or consume an MCP (Model Context Protocol) server?

- Look for files: `**/mcp*.{json,ts,js,py}`, `.mcp.json`, `mcp-config*`, `**/*mcp-server*`,
  a `mcpServers` key in any JSON config.
- Grep for: `modelcontextprotocol`, `@modelcontextprotocol`, `mcp.server`, `FastMCP`,
  `registerTool`, `list_tools`/`listTools`, `tools/call`, `jsonrpc`.
- **Record:** `mcp: available` + provenance (the server/config file) if found; else `mcp: absent`.

### 1c. Internal APIs + sibling services (candidate `api-read` capabilities)

Is there an internal REST/GraphQL surface a playbook could read from, and how is it authed?

- REST: glob `**/routes/**`, `**/controllers/**`, `**/api/**`, `**/endpoints/**`, `**/handlers/**`;
  OpenAPI/Swagger files (`openapi*.{yml,yaml,json}`, `swagger*`). Grep for HTTP verb decorators/
  registrations (`@Get`, `@GetMapping`, `router.get`, `app.get`, `@app.get`, `func (…) Handle`).
- GraphQL: `*.graphql`, `schema.gql`, `type Query`, `resolvers`.
- **Prefer read endpoints** — GET routes, `Query` types, anything named `get`/`list`/`status`/
  `search`/`fetch`. Scout discovery only records **read-only** capabilities; mutating endpoints
  are noted but NOT turned into capabilities.
- **Sweep SIBLING / non-primary-API HTTP handlers — do NOT stop at the main API routes dir.** The
  main service's `routes/` dir is only *one* place HTTP handlers live. A repo often ships several
  services in one tree, and a diagnostically-useful read handler frequently lives OUTSIDE the
  primary API dir. Widen the sweep to catch them:
  - **Non-JS/TS handlers:** Go HTTP handlers (`http.HandleFunc`, `mux.HandleFunc`, `r.Get`/`e.GET`,
    a `func(w http.ResponseWriter, r *http.Request)` signature), Python (`@app.get`, `@router.get`,
    Flask `@app.route`), Java/Kotlin (`@GetMapping`, `@RestController`), regardless of language.
  - **Sibling service directories** — glob broadly for service roots anywhere in the tree, not just
    the primary one: `**/cmd/**`, `**/services/**`, `**/svc/**`, `**/*-service/**`, `**/worker/**`,
    `**/fetcher/**`, `**/agent/**`, `**/daemon/**`, plus any dir with its own `main.go` / `main.py`
    / `Dockerfile` / server bootstrap. Each such sub-tree can expose its OWN read endpoints.
  - **Concrete gap this closes:** a helper/fetcher service nested under a subdirectory (e.g. a Go
    file-fetch service under `<something>/fetcher/`) that exposes a `/status` or `/health` read
    endpoint the main API never surfaces — the exact class of handler a routes-dir-only probe
    misses. Record each such sibling read handler as its own candidate capability.
- Auth model: grep for `Authorization`, `Bearer`, `JWT`, `OIDC`/`OAuth`, `apiKey`/`api_key`,
  `@PreAuthorize`, `requireRole`/`hasRole`, `middleware`/`guard` names like `auth`/`authz`. Record
  the mechanism and the **env var name** that supplies the credential (from the config/manifest —
  name only). Classify the auth **style** for the v0.3 `auth: {style, env?}` form (see Phase 2):
  `env` (a static env var supplies the credential — record the NAME), `caller-token` (the handler
  uses the invoking user's own token/session — no shared secret), or `tenant-config` (the
  credential is resolved from per-tenant config at run time).
- **Record:** for each candidate read capability (primary API AND sibling services), a draft
  `capabilities:` entry (name, kind `api-read`, endpoint = method+path, `auth` = the v0.3
  auth-style form — or the back-compat `auth_env` NAME — plus a `production` marker where
  detectable per 1c-prod below, and provenance). Pick generic, playbook-friendly capability names
  based on what the endpoint reads (e.g. a status endpoint → `run-status`; a listing endpoint → an
  `-inventory`/`-list` name; a sibling fetcher's status → `fetch-status`). If no internal API and
  no sibling read handler → record none.

**1c-prod. `production` marker (feeds rails G2 resolved_env).** Where detectable, mark whether a
capability touches a **production** surface. This is a per-capability boolean the rails read to
resolve which environment a capability binds to (G2 `resolved_env`) and to gate the confidence
verdict on the owning environment. Detect it generically — never hardcode env names:
  - The endpoint/host/config the capability binds to references a prod marker (`prod`,
    `production`, a prod hostname/URL, a prod-tagged config profile, `NODE_ENV=production`,
    a `production` Ansible/Helm group/values file, a prod DSN var name).
  - A data store the capability reads is a prod store (its connection var / config names a prod
    instance), or the sibling service is deployed to a prod group.
  - **Record** `production: true` when the evidence supports it, `production: false` when the
    capability clearly binds to a non-prod (dev/test/local) surface, and **omit** the field when it
    genuinely cannot be determined (do not guess — an omitted marker is honest; a wrong one
    mis-gates the rails). Note provenance for a `true`.

### 1d. Runbooks / docs (raw material for /scout:harvest)

- Globs: `docs/runbooks/**`, `**/runbook*`, `**/RUNBOOK*`, `docs/**/*.md`, `README*`,
  `**/TROUBLESHOOT*`, `**/incident*`, `**/postmortem*`, `**/POSTMORTEM*`, `**/*oncall*`.
- README sections: grep headings for `Troubleshoot`, `Debugging`, `Operations`, `Runbook`,
  `Common issues`, `FAQ`.
- Build/task targets: `Makefile` targets, `package.json` `scripts`, `Taskfile*`, `justfile`.
- **Record:** a count + list of runbook/doc/target locations (paths only). These are NOT
  capabilities — they are what `/scout:harvest` will read later — but the report names them so the
  user knows harvesting has material. Read-only script/Make targets MAY become `shell-read`
  capabilities if they clearly perform a read-only diagnostic (e.g. a `status`/`logs`/`ls` target)
  — classify conservatively (`safety: read-only`) and record provenance.

### 1e. Data stores + configuring env var NAMES

- Detect stores: grep for driver/client deps and connection config — `postgres`/`pg`, `mysql`/
  `mariadb`, `mongo`, `redis`, `sqlite`, `jdbc:`, `DATABASE_URL`, `*_DSN`, ORM config
  (Prisma `schema.prisma`, TypeORM, SQLAlchemy, GORM, Hibernate `persistence.xml`); mounts/paths
  in config; stored-procedure / allowlisted-query definitions.
- **Env var NAMES only (INV-5):** record the NAMES of the vars that configure each store (e.g.
  `DATABASE_URL`, `<SOMETHING>_DSN`, `REDIS_URL`, host/user/password var names). Read these names
  from `.env.example`/`.env.sample`/`config.*`/manifest references — **do NOT open a real `.env`
  file, and never record a value.** If you only find a name inside a real secret file, record the
  name and discard everything else.
- Free-form queries against a prod store are `forbidden` by the schema; discovery therefore only
  records a data-store capability when there's an **allowlisted parameterized query / stored proc**
  it can bind to. A raw connection alone is recorded as context, not as a runnable capability.
- **Record:** for a bindable query/proc, a `capabilities:` entry with kind `query`, `endpoint` =
  the proc/allowlisted-query name, and the connection credential as the v0.3 `auth: {style, env?}`
  form (typically `style: env` + the connection env var NAME) — or the back-compat `auth_env` NAME.
  Set the `production` marker (1c-prod) when the connection var/config names a prod store. Otherwise
  note the store + its env var name(s) in the report only.

### 1f. Auth + governance (inherit, don't invent — INV-8)

- Roles/permissions: grep for `role`/`roles`, `permission`, `RBAC`, `scope`, enum/const role
  lists, `@PreAuthorize`, `hasRole`, `casbin`, policy files.
- Contribution rules: `.github/CODEOWNERS` or `CODEOWNERS` (record present + path); PR templates
  (`.github/pull_request_template*`, `.github/PULL_REQUEST_TEMPLATE/**`, `docs/**PULL_REQUEST**`);
  required-reviewer / branch-protection hints in `CONTRIBUTING*`, `.github/` docs.
- **Map, don't invent:** build `governance.role_map` by mapping Scout's four tiers
  (`developer`, `support`, `business`, `admin`) onto the repo's OWN role names. Only map onto roles
  that actually exist. If the repo has, say, roles `engineer`/`ops`/`readonly`, map developer→
  engineer/admin, support→ops, business→readonly (as the evidence supports). If NO role model is
  found, set the role_map values to `[]` and add the schema-default note (developer/admin = authors
  with repo access; support/business = consuming tiers) — do not fabricate role names.
- **Record:** `governance.role_map`, `contribution.codeowners`, `contribution.pr_template`,
  `contribution.review_required` (true/false/unknown), with provenance.

### 1g. Existing investigation skills (complement, don't replace — INV-4)

Playbooks can `skill-call` a team's existing investigators; the manifest must list what exists.

- Globs: `**/skills/**/SKILL.md`, `.claude/skills/**`, `**/investigate*/SKILL.md`,
  `**/*investigate*.md`; plugin skill dirs.
- Recognize investigation-style skills: name/description contains `investigate`, `debug`,
  `triage`, `diagnose`, `incident`, `root.?cause`, or references an error/observability tool.
- Record each as it would be referenced by a `skill-call` step (e.g. its `plugin:skill` slug or
  skill name from frontmatter). **Do not include this setup skill itself, or unrelated skills.**
- **Record:** a `skills:` list (name, kind `investigate`, provenance). If none → `skills: []`.

### 1h. Team-work knowledge wiki (optional, complementary)

- Detection: `.team-work/wiki-config.md` at the repo root.
- If present: read `wiki_root:` (and `qmd:` if set) from it. Record `wiki: available` + `wiki_root`
  (+ `qmd` when set). Scout will later route `/scout:explain` through `/team-work:work-ask` and
  ingest findings via `/team-work:work-ingest` (those happen in other slices, not here).
- If absent: `wiki: absent`. Scout runs standalone — this is never required.

### Absent-surface behavior (applies to every heuristic above)

A surface/capability/skill that isn't found is reported **cleanly**, never as an error:

- `surfaces:` — set the missing surface to `absent` (never omit the key).
- `capabilities:` — if none, write `capabilities: []` with a one-line comment saying why. A
  playbook that references an unmapped capability is **valid but inert** on this repo (per the
  schema), so an empty list is safe.
- `skills:` — if none, write `skills: []`.
- `governance.role_map` — if no role model, `[]` values + the tier-default note.
- The probe MUST complete and write a manifest even on a plain repo with only a README. The only
  hard failure is being unable to write under `.claude/scout/` (a filesystem/permission problem).

---

## Phase 2: Emit the Capability Manifest

Write `.claude/scout/capability-manifest.md` in the target repo, using
[`capability-manifest.template.md`](./capability-manifest.template.md) as the exact format. Fill
every placeholder from Phase 1 findings; drop provenance you couldn't determine rather than
inventing it. The written manifest MUST validate against
[`../../schema/capability-manifest.schema.json`](../../schema/capability-manifest.schema.json)
(v0.3). The format (authoritative — keep these blocks):

```markdown
# Scout Capability Manifest

generated_by: scout/setup v0.3
generated_at: "<YYYY-MM-DD>"        # quote the date

surfaces:
  claude-code: available            # always available (Scout runs in Claude Code)
  mcp: <available|absent>
  chat: <available|absent>
  wiki: <available|absent>          # team-work wiki (.team-work/wiki-config.md)
  wiki_root: "<path>"               # only when wiki: available

capabilities:
  - name: <capability-name>         # kebab-case name a playbook step references
    kind: <api-read|query|shell-read>
    endpoint: "<method + path | proc/allowlisted-query | read-only command>"
    auth:                           # v0.3 auth-style form (preferred). See auth-style note below.
      style: <caller-token|env|tenant-config>
      env: "<ENV_VAR_NAME>"         # ONLY when style: env — NAME only, value never read (INV-5)
    # auth_env: "<ENV_VAR_NAME>"    # <- back-compat shorthand; equals auth: {style: env, env: <NAME>}
    audience: [developer, support]
    safety: read-only               # discovery only ever records read-only capabilities
    production: <true|false>        # OPTIONAL — feeds rails G2 resolved_env; OMIT when undeterminable
    source: "<file:line or doc>"    # provenance
  # capabilities: []   # <- use this instead when none were detected

governance:
  role_map:                         # Scout tier -> this repo's own role(s) (INV-8)
    developer: ["<repo-role>"]
    support: ["<repo-role>"]
    business: ["<repo-role>"]
    admin: ["<repo-role>"]
  contribution:
    codeowners: <present|absent>
    pr_template: <present|absent>
    review_required: <true|false|unknown>
  source: "<file(s) read>"
  # note: "<tier-default note>"     # <- when no role model was detected

skills:
  - name: "<plugin:skill or skill-slug>"   # how a skill-call step references it
    kind: investigate
    source: "<file/dir>"
  # skills: []   # <- use this instead when none were detected
```

### Also emit the `investigation_toolbox` (v0.4) — the ambient shared capability layer

After `capabilities:`, emit the `investigation_toolbox:` block using the commented stub template
already in [`capability-manifest.template.md`](./capability-manifest.template.md) as the exact
format. This is the **shared toolbox**: the common investigation tools that are available to
**EVERY playbook and every step/agent WITHOUT re-declaration** (they resolve *ambiently* —
`capabilities[]`-first, then `investigation_toolbox[]`). Every use still passes the rails and emits
a DecisionRecord; tiering/redaction/production markers apply identically. **An absent section =
identical v0.3 behavior**, so this is fully backward-compatible.

Emit the **five canonical stubs** — `app-logs`, `db-read`, `traces`, `mcp`, `other` — each a
`capabilityItem` (same shape as a `capabilities[]` entry) plus `ambient: true`. These are STUBS the
user fills/refines later via `/scout:author` (WS4). A stub is **inert until filled** — a step that
resolves to an unfilled toolbox tool renders inert, exactly like an unmapped capability. Say so in
the report.

**Opportunistic pre-fill from the Phase 1 probe.** If a probe heuristic detected a *real* surface,
pre-fill that stub instead of leaving it blank (with provenance). Anything NOT detected stays a
clearly-marked stub. Env var **NAMES** only, never values (INV-5). The mapping:
- **app-logs** ← a k8s / server log surface. Pre-fill `endpoint` with the generic read-only log
  command or log-API method+path you detected (e.g. logs of a named service). `kind: shell-read`
  (a `kubectl logs`/`journalctl`-style read) or `api-read` (a log-query API).
- **db-read** ← a data store / DSN detected in **1e**. Pre-fill it as a **named-allowlisted-proc
  PLACEHOLDER only**: `kind: query`, `endpoint: "proc:<your-allowlisted-read-proc>"`, and
  `auth_env: "<DSN_ENV_VAR_NAME>"` (the connection var NAME from 1e, never a value). **NEVER**
  free-form SQL and **NEVER** a raw connection string in `endpoint` — the rails (Gate A.1) reject a
  free-form query, so the stub stays a placeholder until the user names a real allowlisted read
  proc. Carry the `production` marker from 1e/1c-prod when the store binds to prod.
- **traces** ← an OTLP / Grafana / trace-query endpoint detected (observability surface). Pre-fill
  `endpoint` with the trace-query method+path and `auth: {style: env, env: "<NAME>"}` (the env var
  NAME only).
- **mcp** ← an MCP server detected in **1b**. Pre-fill `endpoint` with the MCP server name / the
  investigation tool it exposes; `auth: {style: caller-token}` unless a shared secret was detected.
- **other** ← a per-repo / per-team diagnostic tool the probe found that fits none of the above
  (a read-only diagnostic command or handler). Rename it descriptively; else leave the stub.

Requirements on the written manifest:
- Every `surfaces:` key present (missing surface = `absent`, never omitted).
- Env var **NAMES** only anywhere `auth`/`auth_env`/credentials appear — no values (INV-5).
- Only capabilities/roles/skills that the probe actually found; no fabrication.
- `capabilities` entries are all `safety: read-only`. (Mutating/write actions are out of scope for
  discovery; they are never recorded as runnable capabilities.)
- **Auth-style (v0.3):** prefer the richer `auth: {style, env?}` form. `style: caller-token` = the
  capability uses the invoking user's own token/creds (no shared secret to record); `style: env` =
  a static env var supplies it (record the NAME in `env`, never the value); `style: tenant-config`
  = resolved from per-tenant config at run time. The bare `auth_env: "<NAME>"` string is still
  valid and is exactly equivalent to `auth: {style: env, env: "<NAME>"}` — emit it for back-compat
  when you prefer, but never emit both for the same capability. A `caller-token` /
  `tenant-config` capability has no env NAME to record.
- **`production` marker (v0.3, feeds rails G2):** set `production: true`/`false` per 1c-prod where
  detectable; **omit** it when undeterminable — never guess. The rails read it to resolve which
  environment a capability binds to and to gate the confidence verdict on the owning environment.
- `governance.role_map` maps onto the repo's real roles, or `[]` + tier-default note (INV-8).
- **`investigation_toolbox` (v0.4):** emit the five canonical stubs (`app-logs`, `db-read`,
  `traces`, `mcp`, `other`), each a `capabilityItem` + `ambient: true`, pre-filled where the probe
  detected a real surface and left as an inert stub otherwise. `db-read` is ALWAYS a named-proc
  placeholder (`endpoint: "proc:<...>"`), never free-form SQL and never a raw connection string.
  Env var NAMES only (INV-5). Toolbox audience tiers must map onto the repo's OWN roles / the
  detected tiers — do NOT widen access or invent a tier (INV-8). A detected-nothing repo writes all
  five as stubs, which is a **valid** outcome.

A minimal pre-filled example (schema-consistent — validates against `capabilityItem` + the
`investigation_toolbox` array in [`../../schema/capability-manifest.schema.json`](../../schema/capability-manifest.schema.json)):

```yaml
investigation_toolbox:
  - name: db-read                        # detected a Postgres DSN in 1e -> named-proc PLACEHOLDER
    kind: query
    endpoint: "proc:<your-allowlisted-read-proc>"   # named proc ONLY; free-form SQL forbidden (Gate A.1)
    auth_env: "<DB_DSN_ENV_VAR_NAME>"    # NAME only; value never read (INV-5)
    audience: [developer]
    safety: read-only
    production: true                     # store bound to a prod DSN (fail-closed)
    ambient: true
    source: ".env.example:12"
  - name: app-logs                       # not detected -> inert stub the user fills via /scout:author
    kind: shell-read
    endpoint: "<read-only log command | log-API method+path>"
    auth: { style: caller-token }
    audience: [developer, support]
    safety: read-only
    ambient: true
    source: "<where detected>"
```

---

## Phase 3: Scaffold the playbook store + create/refresh the INDEX

1. Create the directory `.claude/scout/playbooks/` in the target repo if it does not exist
   (empty). `/scout:author` and `/scout:harvest` fill it later. Do not create any playbooks here.
   - **Also create the toolbox subdir `.claude/scout/playbooks/toolbox/` (v0.4), empty.** This is
     the home for `kind: toolbox` playbooks — "how to USE/interpret a specific tool" (distinct from
     an investigation playbook that diagnoses a symptom). `/scout:author` (WS4) authors them there;
     runners never route an incoming symptom TO one — they only compose it as a **sub-procedure**.
     On a fresh setup this subdir is empty; on a re-probe leave any existing toolbox playbooks in
     place (they are indexed with `kind: toolbox` in step 2, like any other playbook).
2. **Create or refresh the playbook INDEX** at `.claude/scout/playbooks/INDEX.md` — the per-repo
   routing registry that runners (`/scout:investigate`, `/scout:runbook`) read FIRST to route a
   natural-language request to the right playbook (by matching `keywords`/`when_to_use` filtered by
   `kind`), then open only the matched file. The structured data it carries MUST validate against
   [`../../schema/index.schema.json`](../../schema/index.schema.json) (the normative prose spec is
   [`../../schema/index.schema.md`](../../schema/index.schema.md)). It stays **minimal — route,
   don't duplicate** the playbook (no steps/inputs/conclusions/redaction ever go in the INDEX).
   - **No playbooks yet (fresh setup / empty store):** write an **empty index scaffold** —
     `apiVersion: scout/v0.3`, `kind: PlaybookIndex`, `generated_by: /scout:setup`,
     `generated_at: "<today, quoted>"`, and `playbooks: []`. This is the file `/scout:author` and
     `/scout:harvest` will APPEND entries to on every write.
   - **Playbooks already exist (re-probe of a repo with a store):** **rebuild** the index from the
     playbooks present. Read every `*.playbook.yaml`, and for each emit ONE entry:
     `id` ← `metadata.id`, `title` ← `metadata.title`, `kind` ← `metadata.kind` (default
     `investigation` when absent), `keywords` ← `metadata.triggers.keywords`, `when_to_use` ← a
     one-line disambiguation drawn from `metadata.summary`, `path` ← the playbook file path
     **relative to the store** (`.claude/scout/playbooks/`). Preserve any hand-authored
     `when_to_use` wording already in an existing INDEX entry for that `id` (don't clobber a manual
     edit) — only add missing entries and refresh drifted `keywords`/`kind`/`title`/`path`.
   - The INDEX may render as a Markdown table/list for humans, but the structured entries it carries
     MUST validate against `index.schema.json`. Quote `generated_at`.
   - Validate the emitted INDEX (machine-check against `index.schema.json` if a Python env with
     `pyyaml` + `jsonschema` is available; otherwise hand-check required keys/entry shape).
3. Do not touch anything outside `.claude/scout/`.

---

## Phase 4: Report

Print a concise summary to the user. Suggested shape:

```
Scout setup complete for <repo>.

Surfaces
  claude-code : available
  mcp         : <available|absent>
  chat        : <available|absent>
  wiki        : <available|absent>   <wiki_root if available>

Capabilities mapped: <N>
  - <name> (<kind>) -> <endpoint>   [auth: <ENV_VAR_NAME>]
  ...
  (or: none — no programmatic read surface detected)

Investigation toolbox (ambient — available to every playbook/step without re-declaration): <N> tools (<M> filled, <K> stubs)
  - <name> (<kind>) -> <endpoint>   [<filled | stub — inert until filled>]
  ...
  (a plain repo may have 0 filled tools — that is valid)

Governance
  role_map: developer=<...> support=<...> business=<...> admin=<...>
  (or: no role model detected — using schema tier defaults)
  CODEOWNERS: <present|absent>   PR template: <present|absent>

Existing investigation skills: <N>
  - <skill> ...
  (or: none)

Harvest material found: <N> runbooks/docs, <M> task targets
  <paths...>

Wrote: .claude/scout/capability-manifest.md
Scaffolded: .claude/scout/playbooks/ (empty)
           .claude/scout/playbooks/toolbox/ (empty — home for kind: toolbox playbooks)
INDEX: .claude/scout/playbooks/INDEX.md (<empty scaffold | rebuilt: N entries>)

Next:
  /scout:harvest   — auto-draft playbooks from the runbooks/docs above
  /scout:author    — write a playbook by hand (guided, no code), fill/refine the toolbox tools,
                     and author kind: toolbox how-to-use-a-tool playbooks
  (edit .claude/scout/capability-manifest.md if any binding or role map needs correcting)
```

**Toolbox reconciliation summary (v0.4 — always on a re-probe; on a fresh setup, the "unfilled
stubs" line alone).** This is the "check if setup is done and what's new" health check — never a
clobber. Report:

```
Toolbox reconciliation
  Filled tools     : <names>            (or: none)
  Unfilled stubs   : <names>            — inert until filled via /scout:author
  Newly detectable : <names + one-line why>   — surfaces the re-probe found that could be added
                                                (or: none new since last setup)
  No tool-playbook : <names>            — toolbox tools with NO kind: toolbox playbook in
                                          playbooks/toolbox/ yet -> /scout:author <tool> to write one
                                          (or: all covered)
```

Suggest `/scout:author` for each unfilled stub and each toolbox tool lacking a how-to-use playbook.
On a re-probe, be explicit that hand-filled toolbox entries and edits were **preserved** (merge),
and that only missing stubs were added and un-edited auto-detected facts refreshed.

Be honest about absences: if a surface, capability set, or role model was not found, say so
plainly. On a plain repo the correct report is a sparse one — that is success, not a shortfall.
Do not tell the user to run a surface (chat/MCP) the repo doesn't have.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running, check that
file for a `skills.scout-setup:` entry. If the file is absent, has no entry for this skill, or the
entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points. Run any listed targets in
order per the shared resolver `plugins/agent-orch/rules/extension-resolver.md` (scripts execute,
`.md` files are read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline).
Tell the user when you run an extension target; a failing target is surfaced but does not abort the
skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
