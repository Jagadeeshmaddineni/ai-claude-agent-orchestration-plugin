# Scout Capability Manifest

<!--
  Written by /scout:setup into the TARGET repo at .claude/scout/capability-manifest.md
  This file binds the abstract capability names that playbooks reference to THIS repo's
  real endpoints/queries/commands + the env var that authenticates each one, records which
  delivery surfaces the repo supports, maps Scout's audience tiers onto the repo's own
  roles, and lists the repo's existing investigation skills.

  RULES this file must always obey:
  - Record env var NAMES only. NEVER read, echo, or store a secret VALUE (INV-5).
  - Do not invent capabilities/roles/skills. Only record what the probe actually found.
  - Everything here is repo-specific. The Scout plugin core stays repo-agnostic (INV-1).
  - Replace every <placeholder>. Delete blocks/lists that the probe found nothing for,
    OR keep them empty with an explicit "# none detected" marker (see ABSENT behavior).
-->

generated_by: scout/setup v0.2
generated_at: "<YYYY-MM-DD>"          # quote the date (string, not a YAML date)
repo: "<repo-name-or-path>"

surfaces:
  claude-code: available              # always available (Scout runs in Claude Code)
  mcp: <available|absent>             # repo exposes/consumes an MCP server
  chat: <available|absent>            # repo has its own AI assistant/chat surface
  wiki: <available|absent>            # team-work wiki (.team-work/wiki-config.md)
  wiki_root: "<path>"                 # only when wiki: available; else omit this line
  qmd: "<path-or-command>"            # only when wiki: available and qmd is configured; else omit

capabilities:
  # One entry per abstract capability a playbook can reference. Names are the playbook's
  # vocabulary (e.g. run-status, fetch-inventory); the binding is this repo's reality.
  - name: <capability-name>           # kebab-case; what playbook steps reference
    kind: <api-read|query|shell-read> # matches the step kind that consumes it
    endpoint: "<concrete method+path | proc/allowlisted-query name | read-only command>"
    auth_env: "<ENV_VAR_NAME>"        # NAME only; value is used to connect, never read (INV-5)
    audience: [developer, support]    # tiers permitted; a step may narrow, never widen
    safety: read-only                 # discovery only ever records read-only capabilities
    production: <true|false>          # (v0.2) does this capability touch a PRODUCTION data store?
                                      # the rails treat a non-allowlisted query against a prod store
                                      # as forbidden by definition. Default true when unsure (fail-closed).
    source: "<file:line or doc where this was detected>"   # provenance for the human reviewer
  # If NO capabilities were detected, keep this key with a single comment line:
  # capabilities: []   # none detected — repo exposes no programmatic read surface

# investigation_toolbox (v0.4) — the ambient shared capability layer.
# These are the common investigation tools available to EVERY playbook and every step/agent
# WITHOUT re-declaration. Same item shape as capabilities[] plus `ambient: true`. Resolution is
# capabilities[]-first, then investigation_toolbox[]; every use still passes the rails + emits a
# DecisionRecord. Fill these via /scout:author. IMPORTANT: a db-read endpoint MUST be a named
# allowlisted read proc — free-form SQL is forbidden by the rails. Uncomment + replace placeholders
# for the tools this repo actually has; delete the rest. Absent section = identical v0.3 behavior.
# investigation_toolbox:
#   - name: app-logs                     # per-service application logs (k8s / server)
#     kind: shell-read                   # e.g. kubectl logs / journalctl read
#     endpoint: "<read-only log command | log-API method+path>"  # e.g. logs of a named service
#     auth: { style: caller-token }      # caller's own kubeconfig/creds (or auth_env: "<ENV_VAR_NAME>")
#     audience: [developer, support]
#     safety: read-only
#     production: true                   # logs may include prod
#     ambient: true
#     source: "<where detected>"
#   - name: db-read                      # read-only ALLOWLISTED PROC — NOT free-form SQL (the F1 gap)
#     kind: query
#     endpoint: "proc:<your-allowlisted-read-proc>"  # named allowlisted read proc ONLY; free-form SQL forbidden
#     auth_env: "<DB_DSN_ENV_VAR_NAME>"  # NAME only; value used to connect, never read (INV-5)
#     audience: [developer]
#     safety: read-only
#     production: true                   # default true when the store may be prod (fail-closed)
#     ambient: true
#     source: "<where detected>"
#   - name: traces                       # observability — traces/spans (Olly / Tempo / Grafana)
#     kind: api-read
#     endpoint: "<trace-query method+path | TRQL endpoint>"
#     auth: { style: env, env: "<OTLP_OR_GRAFANA_ENV_VAR_NAME>" }  # NAME only (INV-5)
#     audience: [developer, support]
#     safety: read-only
#     production: true
#     ambient: true
#     source: "<where detected>"
#   - name: mcp                          # an investigation MCP the repo consumes
#     kind: api-read
#     endpoint: "<mcp-server-name / tool the investigation MCP exposes>"
#     auth: { style: caller-token }
#     audience: [developer, support]
#     safety: read-only
#     production: false
#     ambient: true
#     source: "<where detected>"
#   - name: other                        # per-repo / per-team diagnostic tool (rename me)
#     kind: shell-read
#     endpoint: "<read-only command | method+path for this repo's own diagnostic tool>"
#     auth: { style: caller-token }
#     audience: [developer]
#     safety: read-only
#     production: false
#     ambient: true
#     source: "<where detected>"

governance:
  role_map:                           # Scout tier -> this repo's own role name(s) (INV-8)
    developer: ["<repo-role>"]        # inherit; do NOT invent roles
    support: ["<repo-role>"]
    business: ["<repo-role>"]
    admin: ["<repo-role>"]
  approval_tiers: [developer, admin]  # (v0.2) which tiers may CONFIRM a needs-approval step.
                                      # Default developer+admin; never business.
  contribution:
    codeowners: <present|absent>      # .github/CODEOWNERS or CODEOWNERS
    codeowners_path: "<path>"         # only when present
    pr_template: <present|absent>     # .github/pull_request_template* or docs equivalent
    review_required: <true|false|unknown>   # inferred from CODEOWNERS / branch-protection docs
  source: "<file(s) the governance model was read from>"
  # If NO governance signal was found, set every role_map value to [] and add:
  # note: "no governance model detected — Scout applies the tier defaults from the schema
  #        (developer/admin = repo-access authors; support/business = consuming tiers)."

skills:
  # Existing investigation skills a playbook `skill-call` step can reuse (complement, INV-4).
  - name: "<plugin:skill or skill-slug>"   # exactly how a skill-call would reference it
    kind: investigate                       # investigation-style skill the probe recognized
    source: "<file/dir where the skill was found>"
  # If NO existing investigation skills were found:
  # skills: []   # none detected — skill-call steps referencing repo skills render inert

investigators:
  # (v0.2) Maps investigator ROLES to real agents, for orchestrated / freewheel investigation.
  # A role with no available agent is INERT (skipped with reason), like an unmapped capability.
  # Sources, in order of preference: agent-orch role agents > Scout defaults > user-imported.
  infra: "<orchestrate-devops | scout-infra-investigator | user-agent-name>"
  data: "<orchestrate-database | scout-data-investigator | ...>"
  app: "<orchestrate-debugger | scout-app-investigator | ...>"
  security: "<orchestrate-security | ...>"
  observability: "<orchestrate-observability | ...>"
  incident: "<orchestrate-incident-responder | ...>"
  root-cause: "<orchestrate-debugger | ...>"
  # Omit any role with no available agent, or set it to "" — it will be treated as inert.
