# Agent Orchestration Plugin - Cheat Sheet

Quick reference for all slash commands, agents, and utilities in the Claude Agent Orchestration Plugin.

---

## Quick Install

### Claude Code

```bash
/plugin marketplace add git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
/plugin install agent-orch@ssnc-agent-orch
# Restart Claude, then: /agent-orch:build
```

**Models:** Auto-configured from `ANTHROPIC_DEFAULT_OPUS_MODEL`/`SONNET_MODEL` env vars. Override: `/agent-orch:config`.

### OpenCode

Add to `opencode.json` (global or project-level):

```json
{
  "plugin": ["git+https://code.ssnc.dev/ai/claude-agent-orchestration-plugin.git"]
}
```

Restart OpenCode. Verify: "Tell me about your agent-orch skills"

**First run (OpenCode):** Agent prompts for model IDs → `/agent-orch:config --global` to set now.

---

## Model Configuration

| Alias | Default (Claude Code) | OpenCode (user-set) | Use for |
|-------|----------------------|---------------------|---------|
| `thinking` | `opus` | `ssnc-gateway/.../GLM-5.2-FP8` | Architecture, debugging, review |
| `instruct` | `sonnet` | `ssnc-gateway/.../...` | Building, validation, domain work |

Config: project `.agent-orch-models.json` → global `~/.config/agent-orch-models.json` → harness defaults. Edit `aliases` to change all 26 agents. Generate/update via `/agent-orch:config`. Per-repo agent override: `.claude/rules/build-overrides.md`.

Commit trailer (configured in same file under `commit_attribution`):
```
Co-authored-by: <gh-user> + <harness>/<models> <<gh-user>@users.noreply.github.com>
```

---

## 🚀 Main Skills (Slash Commands)

### Implementation Commands

| Command | Description | Use When |
|---------|-------------|----------|
| `/agent-orch:make` | **Feature lifecycle** -- thin git + tracker wrapper; delegates all code/content to `/build` (including version edits); computes next minor version from last tag and passes to `/build`; worktree or branch + commit + PR | You want a new feature branch (isolated or in-place) with automatic PR |
| `/agent-orch:config` | Configure models (thinking/instruct) + commit trailer harness | OpenCode: model picker. Claude Code: env-var auto-fill. `--global` for all repos |
| `/agent-orch:make-bug` | **Bug-fix lifecycle** -- thin git + tracker wrapper; delegates root-cause diagnosis + repair to `/bugfix` (Debugger -> Builder -> Validator, regression-test-first); worktree or branch + commit + PR. Reuses `/make` session state so `/make-validate` + `/make-clean` work unchanged | You want a diagnosed, root-cause bug fix on an isolated branch with an automatic PR |
| `/agent-orch:make-validate` | **Validate PR** -- check CI/reviews, fix via `/build`, push | Your PR has failed checks or review feedback |
| `/agent-orch:make-review [per-skill]` | Autonomously (no stops) run `/code-review` + `/security-review` + `/review` + (optional) `/build-graph` + `/review-pr` and **post findings to the PR via `gh`**. Default: ONE merged `gh pr review` (request-changes if Critical/High, else comment). `per-skill` (aka "post review as comment on PR for each of the skills") posts **one `gh pr comment` per review skill** | You want every review skill run on your PR end-to-end; default = one consolidated review, `per-skill` = one comment per skill |
| `/agent-orch:make-clean` | **Merge & clean up** -- merge PR, remove worktree or branch, back to main. Preserves `release/*` branches | Your PR is ready to merge and you want to clean up |
| `/agent-orch:create-rfo` | **Postmortem → RFO** -- numbered `incidents/request-for-outages/rfo-NNN.md` + PDF, `rfo/NNN` branch, PR | You ran a postmortem call and need a Request for Outage doc to distribute |
| `/agent-orch:release-me` | **Tagged release** -- bump version, generate `release-notes/<tag>.md` + PDF from commits, tag, GitHub Release, PR on `release/<tag>` | You want to cut a release with a documented changelog (lighter than `/team-work:create-release`) |
| `/agent-orch:brainstorm` | **Design before code** -- Socratic, one-question-at-a-time refinement; hard gate (no implementation until approved); writes `DESIGN.md` for `/build` | Requirements/approach aren't pinned down and you want an approved design first |
| `/agent-orch:bugfix` | **Root-cause fix** -- Debugger (4-phase, regression-test-first) → Builder → Validator; worktree-aware; 3-attempts→escalate to Architect | Something's broken and you want a diagnosed fix, not a symptom patch |
| `/agent-orch:build` | **Standalone multi-agent build** (no spec-kit required); consumes a `/brainstorm` `DESIGN.md` if present | You want multi-agent implementation without .specify/ setup |
| `/agent-orch:implement` | **Spec-kit multi-agent implementation** (requires .specify/) | You have a spec-kit project with .specify/ directory |
| `/agent-orch:simplify` | Post-implementation code simplification | You need to find reuse opportunities and improve code quality |
| `/agent-orch:analyse` | Multi-agent codebase analysis for spec-kit | You need deep analysis before writing specs |
| `/agent-orch:olly` | Add OpenTelemetry observability to any codebase | You need monitoring, tracing, metrics, or dashboards |
| `/agent-orch:c4` | Generate C4 architecture documentation (Mermaid diagrams) | You need architecture docs for the entire codebase |
| `/agent-orch:enforce` | Convert recurring issues into linter rules and hooks | You want to automate quality checks |
| `/agent-orch:private-cloud` | Interactive DevSecOps assistant for SS&C private cloud terraform | You want to plan terraform changes before `/build` |
| `/agent-orch:refactor-to-bluestone` | Activate Bluestone (SS&C) design system enforcement for UI work | You want UI/UX agent to enforce Bluestone tokens and components |
| `/agent-orch:loop-library` | Find / **save** / audit / repair / adapt / design **bounded repeatable agent loops** (trigger + action + verification + stop + approval). Backed by a **local, git-committed catalog** (`.loop-library/`) — no network calls. **Worktree/branch-aware**: on save, prompts for current session / new worktree / new branch (last two: commit + push + PR). Methodology adapted from Forward Future's Loop Library (MIT) | You want a reliable, bounded iterative workflow — fix-prod-errors, raise-coverage, doc-freshness — and a trusted team catalog to reuse |

### Setup & Lifecycle Commands

| Command | Description | Use When |
|---------|-------------|----------|
| `/agent-orch:init-plugin` | **Single entry-point wizard** -- discover, select, configure plugins for your team | First time setting up any repo with agent orchestration |
| `/agent-orch:upgrade-plugin` | **Seamless upgrade wizard** -- pull upstream changes, three-way merge, preserve customizations | When plugins have new versions available |
| `/agent-orch:setup-claude-md` | Configure CLAUDE.md hierarchy (also runs as health check in init/upgrade) | Before using `/agent-orch:build` (first time) |
| `/agent-orch:setup-constitution` | Configure constitution.md for spec-kit mode | Before using `/agent-orch:implement` (first time) |

### Team Work Commands (separate `team-work` plugin)

| Command | Description | Use When |
|---------|-------------|----------|
| `/team-work:work-wiki` | Init/repair the LLM-maintained SDLC wiki at a configurable path (schema, `README.md` catalog, per-dir OKF `index.md` nav, `log.md`, immutable `sources/`, qmd search; relative markdown links). Born **OKF v0.1**-conformant. Idempotent | First time setting up a knowledge base, or repairing one |
| `/team-work:work-ingest` | Classify a client call/doc → archive verbatim+categorized under `sources/` (audit trail; PDF/xlsx/docx → markdown) → integrate into requirement/entity/concept/decision/incident pages with per-claim citations (relative markdown links) → re-index qmd | After every client call or when you receive a requirements doc |
| `/team-work:work-ask` | qmd hybrid search (with `README.md` fallback) → cited answer (page + call/doc + speaker/date) → optionally file it back as a page | You need an answer that spans multiple calls/docs, with provenance |
| `/team-work:work-lint` | Wiki health-check: contradictions, stale claims, orphans, missing pages/cross-refs, broken/dangling links, legacy `[[wikilinks]]`/catalog `index.md`, **OKF gaps** (untyped pages, missing per-dir `index.md`, no root `okf_version`), source gaps. `--fix` applies safe fixes | Before seeding `/work-prep` from the wiki, or periodic maintenance |
| `/team-work:work-upgrade` | Migrate an older wiki to current conventions: `index.md` → `README.md` (`git mv`), `[[wikilinks]]` → relative markdown links, verify link integrity, refresh schema, **OKF v0.1 conformance pass** (backfill `type`, generate per-dir `index.md`, add `okf_version`). Idempotent, `--dry-run` to preview | Upgrading a wiki created by an earlier version, or making it OKF-conformant |
| `/team-work:work-publish` | Host the wiki as a MkDocs Material site on GitHub Pages (`pages.code.ssnc.dev/<org>/<repo>/`), **SS&C Blue Stone look by default** (Blue `#0077C8` + Teal, Calibri, bordered tables, light/dark; embedded `extra.css` so it applies offline; opt-out to Material). Scaffolds `mkdocs.yml` (`docs_dir` = wiki root, auto-nav), `requirements.txt`, self-hosted deploy workflow → `gh-pages`; auto-enables Pages once `gh-pages` exists + verifies the live site. **code.ssnc.dev only**; confidentiality notice — recommends restricting viewers over excluding `sources/` (exclusion 404s every citation link). Idempotent, `--dry-run` | Publishing the wiki as a searchable hosted site (`/work-wiki` offers it automatically) |
| `/team-work:wiki-source` | Mine the **code repo** into the wiki: (1) C4 docs in `docs/c4/` (via `/agent-orch:c4`); (2) business-domain guide `docs/wiki/domain/` + technical/DevSecOps reference `docs/wiki/technical/`, cross-linked; (3) `/work-ingest` the repo markdown into the wiki. Commits in place | Bring a codebase's architecture + domain knowledge into the wiki |
| `/team-work:wiki-source-branch` | `/wiki-source` over the whole repo, committed on the current branch (no prompt/worktree/PR). No-ops without a wiki | Auto-run by `/make` after committing code; or to sync the wiki on the branch you're on |
| `/team-work:work-analyze` | **Gate 1 — pushback.** Requirements doc → per-requirement verdicts (BUILD AS WRITTEN / WITH CHANGES / RECOMMEND AGAINST / DEFER / NEEDS DECISION) grounded in `file:line` code evidence + wiki decisions, with alternatives, audience-routed open questions, risks, and implicit scope | A requirements doc arrives and you need to push back with evidence before design |
| `/team-work:work-signoff` | **Gate 2 — agreement.** Review-meeting transcript → the concise agreed scope statement stakeholders sign. Supersedes any earlier sign-off with "what changed since"; splits open items into blocking vs non-blocking | The review meeting happened and you need an approvable scope statement out of it |
| `/team-work:work-handoff` | **Gate 3 — handoff.** Plan + tracker issues → developer onboarding guide: mental model, doc index with reading order, ticket conventions, **dependency map read from the tracker (never inferred)**, DoD, getting-unblocked | Issues are created and devs need to start without interrupting you |
| `/team-work:work-prep` | Full SDLC intake — parse transcripts into requirements, ideas, decisions, open questions. Business alignment and Jira hierarchy | Planning from a call transcript, gathering requirements, or brainstorming |
| `/team-work:work-plan` | Convert agreed plans into Jira issues with dependencies | Team has agreed on a plan, ready to create tickets |
| `/team-work:work-pop` | Pick next assigned item or explore ideas, launch into `/make` | Ready to start work or refine an idea into an actionable item |
| `/team-work:work-report` | Sync Jira status, generate unified Bluestone HTML report for PDF export | Need a consolidated view of all plans for stakeholders or team review |
| `/team-work:work-recap` | Time-windowed Markdown + Bluestone PPTX recap of Jira, commits, and agent-orch sessions → `../`. Each Jira entry is self-contained: description, last comment (N of M), attachments, and full metadata (epic, components, fix versions, story points, due) | PM status update or catching engineers up after time away, without clicking into Jira |
| `/team-work:groom` | Worktree-based backlog grooming — batch assign, reschedule, resolve open questions. PR includes a self-contained Markdown + Bluestone PDF report (description, last comment + count, attachments, metadata per issue). Tracking Jira transitions to **Done** on PR open | Backlog needs attention: overdue items, missing dates, unresolved questions. Also when PMs want the grooming output without opening Jira |
| `/team-work:create-release` | Branch-aware tagging, dual release notes + PDFs, GitHub release, optional Jira ticket | Ready to cut a release — tag, document, and ship |

### Vault Orchestration Commands (separate `vault-orch` plugin)

| Command | Description | Use When |
|---------|-------------|----------|
| `/vault-orch:init` | Provision an Obsidian vault over the repo — `.obsidian/` config (`userIgnoreFilters` baked in for multi-GB repos), Dataview, templates, 3 dashboards, git hygiene. Refuses without `ssnc-agent-orch/`. Idempotent | You want sessions, requirements, and Jira tickets to cross-link as a graph |
| `/vault-orch:backfill [--keys K] [--apply]` | Stamp variant-B frontmatter (`jira:` wikilinks) onto existing session markdown. Header-only diff, skips code/links, idempotent, dry-run by default | One-time migration so the graph + dashboards populate |
| `/vault-orch:intake <topic>` | Scaffold a business-requirement note → feeds `team-work:work-prep`/`work-plan` (→ Jira) → `/make` | A non-engineer wants to write a requirement that flows into the build loop |
| `/vault-orch:exec-update [start] [end]` | Exec-altitude weekly summary written into the vault as a dated, Dataview-indexed, Mermaid-charted node | Sponsors need a themes/KPIs/trend view (vs `work-recap`'s PM-altitude PPTX) |

> A defensive `Stop` hook (installed by `/vault-orch:init`) auto-stamps each finished `/make`/`/build` session's frontmatter — the vault stays current with zero forking of the agent-orch skills.

### Meta-Orchestration Commands (separate `meta-orch` plugin)

Coordinate MANY parallel Claude Code sessions on HUGE work (1→35 epics, 5→1000+ stories) using GitHub Issues on `code.ssnc.dev` as shared state. Wraps `/agent-orch:make`; never modifies it. Run the four skills as a pipeline.

| Command | Description | Use When |
|---------|-------------|----------|
| `/meta-orch:design-tech-spec <huge idea>` | **Step 1.** Staff/principal-level tech-spec design. Runs `/deep-research` + a grill-me-style one-question-at-a-time interrogation (recommended answer each; explore-over-ask) over the codebase + source + `/wiki`. → `docs/tech-specs/000N-name.md` | You have something too big for one `/make` and need a real spec first |
| `/meta-orch:design-tech-plan <spec>` | **Step 2.** Decompose the approved spec into epics → tranches → gated stories, CREATE every GitHub epic/story issue (embedded `/make-session` prompt each), install the lock workflow + labels. → `docs/tech-plan/000N-name.md` | The spec is approved and you want the coordinated GitHub work created |
| `/meta-orch:make-session [epic#]` | **Step 3, the only worker — a self-driving `/make-*` loop.** RED "don't start another yet" → find open+gate-open story (epic-scoped or across epics) → confirm → **atomic lock** → GREEN "start another now" → `/make` → `/make-review` (per-skill PR comments) → `/make-validate` until CI green → `/make-clean` (merge) → free lock, open next gate → **loop to next story**. Owns GitHub state + heartbeat | Each engineer, per session — start **one at a time**, wait for the green all-clear. It then loops through all stories on its own |
| `/meta-orch:coordinate-session [once] [epic#]` | **Step 4, the coordinator.** Loops every N min (default 5) reading in-progress issues + heartbeats + each session's `STATUS.md`; reports per-epic status, who's on what, what's ready to run; flags stale sessions | One engineer runs this to watch the whole fleet |

> **Race guard:** only one `/make-session` may be in its claim window at a time. It flashes 🔴 on start, atomically locks the story the instant you confirm the pick, then flashes 🟢 to clear the next session. **Config:** `.meta-orch/config.md` (session count default 5, loop interval, labels). **Contract:** `.meta-orch/session-guardrails.md`. Both auto-provisioned on first run. Guide: `docs/meta-orch.md`.

### Mainframe Analyzer Commands (moved to gids-ai-marketplace)

> **Moved.** The `mainframe-analyzer` plugin now lives in the **gids-ai-marketplace** catalog as **`gids-mainframe-analyzer`** ([plugin repo](https://code.ssnc.dev/FS/gids-mainframe-analyzer-plugin)). It is no longer shipped from this repo. Skills: `/gids-mainframe-analyzer:change-impact-analysis`, `/gids-mainframe-analyzer:mips-hotspot-audit`. Install:
>
> ```bash
> /plugin marketplace add git@code.ssnc.dev:FS/gids-ai-marketplace.git
> /plugin install gids-mainframe-analyzer@gids-ai-marketplace
> /reload-plugins
> /gids-mcp-catalog:mcp-smarttsxl   # installs the SmartTSXL MCP server it depends on
> ```


### Utility Commands

| Command | Description | Use When |
|---------|-------------|----------|
| `/agent-orch:jira` | Discover + cache Jira project metadata (`.claude/rules/jira.md`) | Tracking work in Jira (the default backend) |
| `/agent-orch:jira-work [my\|open\|triage\|KEY]` | Jira work queue — browse agent-ready issues, triage, hand off to `/build` | Picking up agent-ready Jira work |
| `/agent-orch:github-issues [work\|triage\|refresh\|status]` | **GitHub Issues backend** on `code.ssnc.dev` via `gh` — drop-in alternative to `/jira`+`/jira-work`. Caches `.claude/rules/github.md`; same harness labels. Set `tracker: github` to use it | Your repo tracks work in GitHub Issues, not Jira |
| `/agent-orch:mcp-setup` | Configure MCP server credentials (Jira, Confluence, Playwright, SS&C Cloud, ServiceNow, etc.) | You want to connect to external systems |
| `/agent-orch:mcp-start` | Start local MCP server | You need Jira, Confluence, TestRail, Azure DevOps, Playwright, SS&C Cloud, or ServiceNow access |
| `/agent-orch:mcp-stop` | Stop local MCP server | You're done using MCP services |
| `/agent-orch:complib-guide` | Reference for UI/UX agent component library usage | You need to configure design system paths |
| `/agent-orch:inherit-plugin` | Clone and remap an existing plugin to a new domain | You want to create a plugin based on this one |
| `/agent-orch:workflows-connectors-generate` | Generate workflow connectors (workflows repo specific) | You're in the workflows-connectors repository |

---

## 🤖 The 26 Agents

### Core Team (Always Active)

| Agent | Subagent Type | Role |
|-------|--------------|------|
| **Architect** | `agent-orch:orchestrate-architect` | Planning, coordination, agent assignments, decision-making |
| **Builder** | `agent-orch:orchestrate-builder` | Implementation with TDD + verification gate |
| **Validator** | `agent-orch:orchestrate-validator` | Testing, QA, coverage + verification gate |
| **Scribe** | `agent-orch:orchestrate-scribe` | Documentation, examples, README updates |

### Review Team (Two-Stage Quality Gate)

| Agent | Subagent Type | Role |
|-------|--------------|------|
| **Spec Reviewer** | `agent-orch:orchestrate-spec-reviewer` | Stage 1: Verify spec compliance (MUST pass first) |
| **Quality Reviewer** | `agent-orch:orchestrate-quality-reviewer` | Stage 2: Code quality, patterns, constitution compliance |

### Support Team

| Agent | Subagent Type | Role |
|-------|--------------|------|
| **Debugger** | `agent-orch:orchestrate-debugger` | Systematic root cause analysis (4-phase methodology) |

### Specialist Agents (Activated When Needed)

| Agent | Subagent Type | When Used |
|-------|--------------|-----------|
| **Security Auditor** | `agent-orch:orchestrate-security` | Auth code, user input, sensitive data, OWASP review |
| **Performance Analyst** | `agent-orch:orchestrate-performance` | Database queries, bottlenecks, caching, optimization |
| **DevOps Engineer** | `agent-orch:orchestrate-devops` | CI/CD, Docker, Kubernetes, deployment, integration checks |
| **Database Architect** | `agent-orch:orchestrate-database` | Schema design, migrations, query optimization |
| **API Designer** | `agent-orch:orchestrate-api` | REST/GraphQL design, OpenAPI specs, API consistency |
| **UI/UX Designer** | `agent-orch:orchestrate-uiux` | Design system compliance (tri-modal: Bluestone, custom, maintain), accessibility (WCAG 2.1 AA) |
| **Refactorer** | `agent-orch:orchestrate-refactorer` | Code smells, technical debt, pattern improvements |
| **Migration Specialist** | `agent-orch:orchestrate-migration` | Framework upgrades, breaking changes, compatibility |
| **Telemetry Engineer** | `agent-orch:orchestrate-telemetry` | OTel, Prometheus, Grafana, observability stack |
| **C4 Scribe** | `agent-orch:orchestrate-c4-scribe` | C4 model architecture docs (System, Container, Component) |
| **Data Engineer** | `agent-orch:orchestrate-data-engineer` | ETL pipelines, data warehouses, batch/stream processing |
| **ML Engineer** | `agent-orch:orchestrate-ml-engineer` | Model training, inference, feature engineering, MLOps |
| **Observability Engineer** | `agent-orch:orchestrate-observability` | SLOs, alerting, runbooks, on-call configuration |
| **Incident Responder** | `agent-orch:orchestrate-incident-responder` | Production issues, triage, emergency fixes |
| **Legacy Modernizer** | `agent-orch:orchestrate-legacy-modernizer` | Brownfield migration, strangler fig pattern |
| **Content Specialist** | `agent-orch:orchestrate-content-specialist` | Technical writing, user guides, tutorials |
| **Private Cloud Engineer** | `agent-orch:orchestrate-private-cloud` | SS&C Cloud + AWS terraform, HCL generation, security hardening |

### Coordination Agents

| Agent | Subagent Type | Role |
|-------|--------------|------|
| **Advocate** | `agent-orch:orchestrate-advocate` | Architecture decisions, cross-team impact, Jira tickets |
| **Jira Triage** | `agent-orch:orchestrate-jira-triage` | Issue classification for agent-readiness |

---

## 🌐 MCP Service Quick Reference

The bundled MCP server exposes 8+ services. Configure in `~/.claude/mcp-config.json`:

| Service | Auth | Default Scope | Notes |
|---------|------|---------------|-------|
| Jira | API token | write | Cloud + DataCenter |
| Confluence | API token | write | Cloud + DataCenter |
| TestRail | API key | write | |
| Azure DevOps | PAT | write | Multi-org via `ADO_ORGS` |
| Playwright | none | write | Run `npx playwright install chromium` |
| SonarQube | token | read | Server + SonarCloud |
| SS&C Cloud | API key | read (forced) | 33 query tools |
| **ServiceNow** | **username + password** | **read** | 8 read-only tools (sc_task, incident, cmdb_ci, business_unit) |

**ServiceNow auth quick start** (one of these works):

```json
{ "servicenow": { "enabled": true, "url": "https://ssctech.service-now.com", "username": "you", "password": "...", "scope": "read" } }
```

```bash
export SNOW_URL=https://ssctech.service-now.com SNOW_USER=you SNOW_PASS=...
```

ServiceNow tools: `servicenow_searchTickets`, `servicenow_getTicket`, `servicenow_searchIncidents`, `servicenow_getIncident`, `servicenow_searchCMDB`, `servicenow_getCMDBItem`, `servicenow_listBusinessUnits`, `servicenow_listTables`.

### OpenCode MCP Setup

1. Copy from `.opencode/agent-orch.opencode.example.json` → `opencode.json`
2. `/agent-orch:mcp-setup` → configure credentials
3. `/agent-orch:mcp-start` → start server
4. Flip `enabled: false` → `true` in `opencode.json`
5. Restart OpenCode

---

## 📋 Built-In Commands (Quick Utilities)

These are **not** slash skills but built-in command prompts you can invoke directly:

| Command File | Purpose | Usage Pattern |
|--------------|---------|---------------|
| `/agent-orch:db-migration-check` | Verify database migrations are safe and complete | After DB schema changes |
| `/agent-orch:docs-sync` | Sync documentation with code changes | After feature completion |
| `/agent-orch:enforce-check` | Run enforcement rules against changed files | Before commit/PR |
| `/agent-orch:plan-review` | Review implementation plan for completeness | After architect planning |
| `/agent-orch:review-quick` | Quick code review (lighter than quality-reviewer) | For small changes |
| `/agent-orch:security-quick` | Quick security scan (lighter than security auditor) | For rapid security check |
| `/agent-orch:status-check` | Check agent progress and STATUS.md health | During agent execution |
| `/agent-orch:test-check` | Verify test coverage and quality | After validator runs |

---

## 🎯 Quick Workflows

### Worktree Lifecycle (Recommended)

```bash
# Full feature lifecycle with your choice of worktree or feature branch, automatic PRs, and Jira tracking
claude --permission-mode dontAsk
```

```
1. /agent-orch:make PROJ-123          # Pick worktree or branch → /build → commit → push → PR → Jira In Review
   /agent-orch:make Add JWT auth      # Or without a Jira key (search/create interactively)
2. /agent-orch:build                  # Iterate on the branch (as many times as needed)
3. /agent-orch:make-review            # Autonomously run all review skills → ONE consolidated gh pr review
4. /agent-orch:make-validate          # Check CI failures + review comments → /build to fix → push
5. /agent-orch:make-clean             # Merge PR → Jira Done → remove worktree or delete branch → back to main
```

**Jira mode** (`.make-config.md`): `yes` = always require Jira | `no` = skip | `ask-me` = prompt each time

**Worktree/branch anchor** (v2.25.0+, parallel-safe in v2.27.0+, hard-gated in
v2.29.0+): each `/make` writes its own per-Claude session file
`.claude/.make-session-<UTC_TS>-<PID>.json`. Multiple Claudes can run `/make`
in parallel on the same repo without overwriting each other's anchor.
`/make-clean` removes ONLY this Claude's file (leaves other Claudes' files
alone).

**Hard gate (v2.29.0+):** the `guard-worktree-writes` PreToolUse hook
hard-blocks (exit 2) any `Write`/`Edit`/`Bash` write that lands in the primary
checkout while a worktree session is active — drift is now impossible, not just
discouraged. No-op when no worktree session, in branch mode, outside the repo
(`../`, `/tmp`), or under `.claude/`/`.git/`. It reads session files from disk
every call; it does NOT depend on `$MAKE_SESSION_FILE` (which is only a
same-session hint and does not survive across tool calls or into subagents).
See
[`plugins/agent-orch/rules/worktree-context.md`](plugins/agent-orch/rules/worktree-context.md)
for the full rule.

**Session artifacts** (v2.27.0+): `/build` writes PLAN.md / STATUS.md /
prompt.md under a date tree:
`ssnc-agent-orch/<YYYY>/<MM>/<DD>/<feature-slug>/`. Legacy flat
`ssnc-agent-orch/<YYYY-MM-DD>-<slug>/` dirs still work for reading.

**Phase banners**: `/make`, `/build`, and `/make-clean` print visual phase
banners (`═══ phase N/M: name ═══`) so you always know which stage the
orchestration is in and what's happening.

### Team Planning Workflow (requires `team-work` plugin)

```
0. /team-work:work-wiki                # One-time: init the knowledge wiki at a chosen path
   /team-work:work-upgrade             # Migrate an older wiki (index.md → README.md, [[wikilinks]] → markdown links)
   /team-work:work-ingest              # After each client call/doc → archive + integrate (compounding, cited)
   /team-work:wiki-source              # Mine THIS repo (C4 + domain/technical docs) → ingest into the wiki
   /team-work:work-ask                 # Query accumulated knowledge → cited answers
   /team-work:work-lint                # Health-check before seeding a plan
1. /team-work:work-prep                # Paste transcript or notes → classified requirements, ideas, decisions → PR
   /team-work:work-prep                # Re-run to incorporate team feedback or refine ideas
2. /team-work:work-plan                # Team agreed → create Jira issues (Goals/Epics/Stories) with deps
3. /team-work:groom                    # Groom by Epic: dates, assignments, open questions, batch actions
4. /team-work:work-pop                 # Pick your next item or explore an idea → review → launch /make
5. /agent-orch:make-clean              # Merge → Jira Done → work plan updated → next item
6. /team-work:work-report              # Sync Jira → generate Bluestone HTML report → save as PDF → PR
7. /team-work:work-recap                # Recap Jira + commits + agent-orch for a time window → Markdown + PPTX to ../
8. /team-work:create-release           # Tag → dual release notes + PDFs → GitHub release → optional Jira → PR
```

**Plan format**: `planning/<slug>.md` with tables, definitions of done, dependencies, open questions.
**Labels**: `claude-code-agent-harness` (agent-ready) | `human-review-required` | `external` (outside repo)

### Meta-Orchestration Workflow (requires `meta-orch` plugin) — many parallel sessions on HUGE work

```
1. /meta-orch:design-tech-spec  Big multi-epic idea       # grill-me + deep-research → docs/tech-specs/000N-name.md
2. /meta-orch:design-tech-plan  docs/tech-specs/0001-x.md  # epics→tranches→gated stories, CREATE all GitHub issues,
                                                            # install lock workflow → docs/tech-plan/000N-name.md
   git add .github/workflows/meta-orch-lock.yml && commit && push   # so the atomic Actions lock is live
3. /meta-orch:coordinate-session                            # ONE coordinator — loops every 5m, reports the fleet
4. /meta-orch:make-session          # worker A — auto-pick across epics; wait for 🟢 GREEN before starting the next
   /meta-orch:make-session #123     # worker B — scope to epic #123 (and its sub-epics)
   ...                              # up to session_count workers (default 5), ONE AT A TIME
   # Each worker then LOOPS on its own through the full /make-* pipeline per story:
   #   /make → /make-review (per-skill PR comments) → /make-validate (until CI green)
   #   → /make-clean (merge; Closes #N; lock frees) → open next gate → next story
   # A fully-merged tranche opens the next tranche's gate (auto or on confirm).
   # Loop ends when no eligible story remains, or CI stays red after 3 validate rounds.
```

**State**: all in GitHub Issues on `code.ssnc.dev` — epics (`meta:epic`, nestable), stories (`meta:story`, one = one PR),
tranches (`meta:tranche:<epic>:<N>`, parallel-safe), gates (`meta:gate-open`/`meta:gate-blocked`), locks (`meta:locked`),
heartbeats (`meta:hb:<UTC_MINUTE>`). One story per session, always. See `docs/meta-orch.md`.

### Postmortem → RFO

```
1. /agent-orch:create-rfo /tmp/postmortem-2026-05-22.txt   # or paste transcript inline
   # Picks next rfo-NNN, extracts attendees, drafts Problem/Solution/Root Cause/Follow-up,
   # generates PDF, commits md+pdf on rfo/NNN, pushes, opens PR
2. /agent-orch:make-validate                                # Address review comments via /build
3. /agent-orch:make-clean                                   # Merge → rfo/NNN branch is cleaned up normally
```

**Output**: `incidents/request-for-outages/rfo-NNN.md` + `rfo-NNN.pdf` (zero-padded 3 digits, sequential).

### Tagged Release

```
1. /agent-orch:release-me                                   # Read last tag → suggest patch/minor/major bump
   # Generates release-notes/<tag>.md + .pdf from commits since last tag, commits,
   # creates git tag, GitHub Release, opens PR on release/<tag>
2. /agent-orch:make-validate                                # Fix CI or review comments
3. /agent-orch:make-clean                                   # Merge → release/<tag> branch is PRESERVED (by design)
```

**Output**: `release-notes/<tag>.md` + `release-notes/<tag>.pdf`, annotated tag, GitHub Release with PDF attached. The `release/<tag>` branch stays around so future patches on the same line can be cut from it (same convention as `/team-work:create-release`).

### Standalone Mode (No Spec-Kit)

```bash
# Start Claude with auto-approve permissions (recommended for agent builds)
claude --permission-mode dontAsk
```

```
1. /agent-orch:init-plugin            # First time: discover plugin, configure, setup CLAUDE.md
   → Health check → Plugin selection → Configure → Store snapshot → Setup CLAUDE.md
2. /agent-orch:build                  # Start implementation
   → Conversation-based requirements → Architect plans → Parallel agents → Review → Done!
3. /agent-orch:upgrade-plugin         # When plugin updates are available
   → Health check → Check versions → Walk through changes → Three-way merge → Refresh CLAUDE.md
```

### Brainstorm → Build

```
1. /agent-orch:brainstorm Real-time notifications   # Socratic design; hard gate until approved
   → One question at a time → 2-3 approaches → design in sections → approve
   → Writes ssnc-agent-orch/<date>/<feature>/DESIGN.md
2. /agent-orch:build <path-to>/DESIGN.md            # Consumes the design, skips requirements Q&A
   → Architect plans → parallel agents → two-stage review → done
   # or: /agent-orch:make <path-to>/DESIGN.md       # same, with worktree/branch + PR lifecycle
```

**Hard gate:** `/brainstorm` writes no code — its only output is an approved `DESIGN.md`. Use it
when the approach isn't settled; skip straight to `/build` when it is.

### Bug Fix (Root Cause)

```
1. /agent-orch:bugfix Login 500s on expired tokens   # or a JIRA-ID / issue URL
   → Debugger: reproduce → trace to source → FAILING regression test (RED)
   → Builder: minimal source fix (GREEN), no symptom patch
   → Validator: regression test passes + nothing else broke (fresh evidence)
   → 3 failed attempts → escalate to Architect (likely architectural)
2. # Optional commit (Co-authored-by trailer enforced); under /make, /make owns the PR
```

Leaner than `/build` — no brainstorming, no Advocate gate. Worktree-aware (honors the active
`.make-session`). For a bug found mid-`/build`, the Debugger is already in Phase 4.

To wrap the whole diagnosis in a worktree/branch + PR lifecycle -- the way `/make` wraps
`/build` -- use `/agent-orch:make-bug`: it delegates to `/bugfix`, then commits, pushes, and opens
a PR. Because it reuses the same `/make` session state, `/make-validate` and `/make-clean` work on
the result unchanged.

### Spec-Kit Mode

```bash
# Start Claude with auto-approve permissions (recommended for agent builds)
claude --permission-mode dontAsk
```

```
1. /speckit.specify                  # Write spec (standard spec-kit)
2. /speckit.plan                     # Create plan (standard spec-kit)
3. /speckit.tasks                    # Generate tasks (standard spec-kit)
4. /agent-orch:setup-constitution    # First time setup
5. /agent-orch:implement             # Multi-agent implementation
   → Architect analyses
   → User approves plan
   → Parallel execution
   → Two-stage review
   → Done!
```

### Add Observability to Existing Project

```
/agent-orch:olly
→ Detects existing setup (vendor SDK or greenfield)
→ Sets up OTel Collector, Prometheus, Loki, Tempo, Grafana
→ Creates Docker Compose stack
→ Instruments your code
→ Generates dashboards
```

### Generate Architecture Docs

```
/agent-orch:c4
→ Analyses entire codebase
→ Generates C4 diagrams (System, Container, Component)
→ Creates docs/c4/ with Mermaid diagrams
→ Includes navigation and decision records
```

### Activate Bluestone Design System

```
/agent-orch:refactor-to-bluestone
→ Wizard detects tech stack (React or not)
→ Configures Artifactory registry
→ Installs @sds/* packages
→ Creates .bluestone/config.md

# Then any /build or /implement enforces Bluestone UI standards
/agent-orch:build "Add user settings page"
→ UI/UX agent enforces Bluestone tokens and components
```

---

## ⚡ Permission Management

### Claude CLI Permission Flags

Run Claude with permission modes to reduce friction during agent execution:

```bash
# Don't ask for permissions - auto-approve all (safest for sandboxed environments)
claude --permission-mode dontAsk

# Auto-approve file edits only (good for agent builds)
claude --permission-mode acceptEdits

# Bypass all permissions (use ONLY in sandboxes with no internet)
claude --dangerously-skip-permissions

# Require plan approval before execution (good for review)
claude --permission-mode plan

# Default behavior (ask for each permission)
claude --permission-mode default

# Auto mode (AI decides when to ask)
claude --permission-mode auto
```

### Permission Mode Reference

| Mode | Behavior | Use Case |
|------|----------|----------|
| `dontAsk` | Auto-approve all tool calls | Agent orchestration, trusted environments |
| `acceptEdits` | Auto-approve file edits, ask for bash/other | Build sessions with external tools |
| `bypassPermissions` | Skip ALL permission checks | Sandboxes only (no internet) |
| `plan` | Require plan approval before execution | Review before running |
| `default` | Ask for each permission | Interactive sessions |
| `auto` | AI decides when to ask | Balanced automation |

### Recommended for Agent Orchestration

```bash
# For /agent-orch:build or /agent-orch:implement
claude --permission-mode dontAsk

# Why: Agents need to write files, run tests, check migrations
# without constant user approval blocking the pipeline
```

### Settings.json Configuration

Add to `~/.claude/settings.json` for persistent permission configuration:

```json
{
  "permissionMode": "dontAsk",
  "permissions": {
    "autoApprove": ["read", "edit", "bash", "write"]
  }
}
```

---

## 🔑 Key Concepts

### Two Coordination Modes

| Mode | When | Token Cost | Best For |
|------|------|------------|----------|
| **Subagents** | Score 0-3 | Lower | Simple features, <3 specialists, single domain |
| **Agent Teams** | Score 4+ | 2-4x higher | Complex features, cross-layer, iterative work |

### Two-Stage Review Process

```
Stage 1: Spec Compliance Review (orchestrate-spec-reviewer)
  ├── Verifies EVERY requirement is implemented
  ├── Distrusts implementer claims - reads code directly
  ├── Must PASS before Stage 2 can begin
  └── Gaps found → back to Builder

Stage 2: Code Quality Review (orchestrate-quality-reviewer)
  ├── Reviews patterns, tests, docs, constitution compliance
  ├── Runs only after Stage 1 passes
  ├── Can request refinements
  └── Approved → Done!
```

### Verification Gates

Both **Builder** and **Validator** have verification gates:

- **Builder**: Must provide TDD evidence (RED→GREEN→REFACTOR) before marking tasks complete
- **Validator**: Must show actual test output + coverage % before claiming completion

### Session Files

| Mode | Location | Files |
|------|----------|-------|
| **Standalone** (v2.27.0+) | `ssnc-agent-orch/<YYYY>/<MM>/<DD>/<name>/` | prompt.md, PLAN.md, STATUS.md, conventions.md, ADVOCATE-REVIEW.md, COORDINATION.md |
| **Standalone** (legacy) | `ssnc-agent-orch/YYYY-MM-DD-[name]/` | same files; older sessions still readable |
| **Spec-Kit** | `.specify/specs/[feature]/` | spec.md, plan.md, tasks.md, status.md |

**`prompt.md` (standalone only)** — frozen after Phase 1 of `/build`. Holds
the verbatim prompt, clarifying Q&A, and final scope summary. Read this
first when auditing why an old session was scoped the way it was.

#### Session File Contract (Standalone Mode)

**Canonical files (always present):**
- `prompt.md` - Session provenance (original prompt + clarifying Q&A)
- `PLAN.md` - Requirements, tasks, quality targets
- `STATUS.md` - **Single sink for ALL agent findings** (Builder, Validator, Security, etc. each append a `## <Agent> Findings` section)

**Optional files (created when needed):**
- `conventions.md` - Architect-generated stack conventions
- `ADVOCATE-REVIEW.md` - Advocate decision audit (ONLY documented side-file exception)
- `COORDINATION.md` - Agent Teams metadata

**Forbidden:** Agents do NOT create `*-REVIEW.md`, `*-STATUS.md`, `*-NOTES.md`, `POSTMORTEM.md`, `PR_BODY.md`, or `ADR-*.md` files. All findings append to `STATUS.md`.

---

## 🛠️ Configuration Files

### Standalone Mode

```
CLAUDE.md in project root (lean, human-owned -- do NOT add config here)
├── Project overview
├── Git workflow
└── References to .claude/rules/

.claude/rules/build-overrides.md (quality targets + agent config)
├── Coverage targets (COVERAGE_TARGET, BRANCH_COVERAGE_TARGET)
├── TDD mode (TDD_MODE: optional)
├── Agent model overrides
└── Advocate enforcement mode

.claude/rules/ (auto-loaded by all agents)
├── security-baseline.md
├── code-standards.md
└── testing-standards.md
```

### Spec-Kit Mode

```
.specify/memory/constitution.md
├── Architecture principles
├── Code style rules
├── Testing requirements
├── Component library paths (for UI/UX agent)
└── Quality standards
```

---

## 🔧 Extensibility

**Zero behavior change by default.** Extensibility is opt-in via config files in your repo. Commented or absent config = unchanged behavior.

### Config Files

| Plugin | Config Directory | Files |
|--------|------------------|-------|
| `agent-orch` | `.claude/ssnc-agent-orch/` | `skills.yaml`, `agents.yaml`, `tracker.yaml`, `jira-workflow.yaml`, `github-workflow.yaml`, `git-workflow.yaml` |
| `team-work` | `.claude/ssnc-team-work/` | `skills.yaml`, `agents.yaml` |

Copy from `examples/ssnc-*/` or run `/agent-orch:init-plugin` to scaffold. Files ship fully commented out.

### Agent Extension Keys

| Key | Effect |
|-----|--------|
| `before` | Run targets (markdown/scripts/loops/skills) BEFORE agent |
| `replace` | Run target INSTEAD of plugin's agent |
| `after` | Run targets AFTER agent |

**Example:**

```yaml
agents:
  architect:
    before: [docs/adr/*]                 # inject ADRs first
    replace:                             # empty = use plugin agent
    after: [.loop-library/architect.yaml]
```

### Core Skill Hook Points

| Skill | Hook Points |
|-------|-------------|
| `make` | `before_commit`, `before_pr`, `after_pr` |
| `make-bug` | `before_commit`, `before_pr`, `after_pr` |
| `build` | `before_plan`, `after_plan`, `before_review`, `after_build` |
| `make-clean` | `before_merge`, `after_merge` |
| `make-validate` | `before_validate`, `after_validate` |

**Example:**

```yaml
skills:
  make:
    before_commit: [scripts/format.sh]
    before_pr: [.loop-library/pre-pr-review.yaml, docs/checklists/pr-ready.md]
    after_pr: [scripts/notify-team.sh]
```

### Target Syntax

- `scripts/foo.sh` or `foo.py` → run script
- `docs/checklist.md` or `docs/adr/*` → read-and-act markdown
- `.loop-library/foo.yaml` → run loop
- `/agent-orch:simplify` → invoke skill

### Pluggable Jira Workflow

Override Jira transition IDs and add lifecycle hooks in `jira-workflow.yaml`:

```yaml
jira:
  enabled: true
  transitions: { in_progress: "21", in_review: "31", done: "41" }
  fields: { start_date: "customfield_10015" }
  lifecycle:
    on_start: [docs/jira/on-start.md]
    on_review: [scripts/post-pr-to-jira.sh]
```

### Swap Tracker: Jira ⇄ GitHub Issues

Select the backend (`tracker.yaml` or `.make-config.md` `tracker:`); configure GitHub
status in `github-workflow.yaml`. Backend-neutral contract: `tracker-provider.md`.

```yaml
# tracker.yaml
tracker: { provider: github }            # jira | github | none

# github-workflow.yaml
github:
  enabled: true
  status_model: labels                   # labels (default) | project
  statuses: { in_progress: "status:in-progress", in_review: "status:in-review", done: close }
```

`github` → `/agent-orch:github-issues` caches `.claude/rules/github.md`; `gh` on
`code.ssnc.dev`; `#123` IDs; identity via `@me`. Absent everything ⇒ Jira, unchanged.

### External Git Workflow

Offload git/PR steps to an external repo:

```yaml
git:
  source: git@code.ssnc.dev:BluedoorAIUK/test_codeReviewFlow.git
  ref: main
  steps:
    before_pr: [scripts/lint.sh, flows/review.md]
    after_pr: [scripts/post-merge-checks.sh]
```

Clones to `.claude/ssnc-agent-orch/.cache/<repo>@<ref>/` on first use, reuses for session. Safety confirmation required on first run.

### Quick Start

```bash
# Copy templates
cp examples/ssnc-agent-orch/*.yaml .claude/ssnc-agent-orch/

# Uncomment what you want to extend
# Run skills/agents as usual → extensions run at hook points

# Revert: just comment out the config again
```

**Full docs**: [Extensibility blog post](docs/blog/2026-06-25-extensible-skills-and-agents.md) | [Contract](plugins/agent-orch/rules/extensibility.md)

---

## 📊 Agent Models

| Agent | Default Model | Reasoning |
|-------|---------------|-----------|
| Architect | **opus** | Complex planning and coordination |
| Spec Reviewer | **opus** | Deep verification requires reasoning |
| Quality Reviewer | **opus** | Constitution compliance analysis |
| Debugger | **opus** | Root cause analysis |
| Builder | **sonnet** | Implementation from clear plan |
| Validator | **sonnet** | Testing from clear spec |
| All Specialists | **sonnet** | Domain review within scope |

Override in `.claude/rules/build-overrides.md`:
```markdown
## Agent Model Overrides
- orchestrate-builder: opus  # For complex implementations
```

---

## 🚧 Phase Gates

### Advocate Gate (Phase 1.5)

**When:** Preliminary complexity >= 4 OR prompt mentions infra/security/cross-team

**What:** Hard gate - Advocate runs BEFORE Architect to challenge assumptions, discover platform services, detect conflicts

**Bypass:** Set `ADVOCATE_ENFORCE: false` in `.claude/rules/build-overrides.md` (logs warning to STATUS.md)

---

## 🚨 Common Issues & Solutions

### "No progress detected"

**Likely Cause**: Agents waiting for permission approval

**Fix**: Check agent panes for pending permission prompts. Approve file writes, shell commands, or tool calls.

### "Agent went idle but tasks remain"

**Cause**: In-process teammates can go idle even with incomplete work

**Fix**: Idle Agent Recovery - re-spawn the agent (cannot resume in-process agents)

### "Agents launched but no STATUS.md updates"

**Cause**: Permission blocked or agents crashed

**Fix**: 
1. Check for pending permissions
2. Read agent output for errors
3. Re-spawn failed agents

### "Agent Teams use too many tokens"

**Cause**: Agent Teams mode uses 2-4x more tokens than subagents

**Fix**: 
- Use subagents for simple features (complexity score <4)
- Reserve teams for complex, cross-layer features

---

## 🎓 Tips & Best Practices

### When to Use Each Mode

```
Use /agent-orch:build when:
✅ Quick iteration without spec-kit ceremony
✅ Prototyping or exploration
✅ One-off features or bug fixes

Use /agent-orch:implement when:
✅ Formal specifications required
✅ Team collaboration on specs
✅ Need spec history and versioning
```

### Reduce Permission Friction

**Best approach**: Use CLI permission flags when starting Claude:
```bash
claude --permission-mode dontAsk
```

**Alternative**: Pre-approve in `~/.claude/settings.json`:
```json
{
  "permissionMode": "dontAsk",
  "permissions": {
    "autoApprove": ["read", "edit", "bash", "write"]
  }
}
```

See [Permission Management](#-permission-management) section for all options.

### Progress Reporting

**ALWAYS** check STATUS.md regularly during agent execution. Don't wait for agents to report - proactively monitor progress.

### Quality Targets

Set in `.claude/rules/build-overrides.md` (standalone) or constitution.md (spec-kit):
```markdown
## Quality Targets
COVERAGE_TARGET: 80%
TDD_MODE: optional
PLAYWRIGHT_TESTS: optional
ADVOCATE_ENFORCE: true
```

Override per feature in PLAN.md if needed. **Do NOT add overrides to CLAUDE.md** -- use `.claude/rules/build-overrides.md` instead.

---

## 📚 Further Reading

- [README.md](README.md) - Full plugin documentation
- [docs/meta-orch.md](docs/meta-orch.md) - Meta-orchestration concept guide (many parallel sessions on huge work)
- [examples/EXAMPLE_WORKFLOW.md](examples/EXAMPLE_WORKFLOW.md) - Step-by-step example
- [examples/CLAUDE.md.template](examples/CLAUDE.md.template) - Standalone mode template
- [examples/constitution.md.template](examples/constitution.md.template) - Spec-kit mode template

---

**Version**: 2.51.0  
**Total Agents**: 26  
**Total Skills**: 32  
**Coordination Modes**: 2 (Subagents, Agent Teams)  
**Dual-harness**: Claude Code + OpenCode | **Config**: `.agent-orch-models.json`
