# Claude Agent Orchestration

A native Claude Code plugin marketplace that gives every SS&C engineer access to multi-agent orchestration with 26 specialized agents, Jira-driven work queues with [human-on-the-loop](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html) governance, TDD enforcement, comprehensive test coverage, two-stage code review, verification gates, and systematic debugging -- all from the command line.

> **New in v2.29.0**: **Worktree drift is now mechanically impossible.** A `PreToolUse` guard hook hard-blocks any agent write that lands in the primary checkout while a `/make` worktree session is active — no more files leaking onto the wrong branch. Enforcement no longer depends on prompt instructions or the (non-persistent) `$MAKE_SESSION_FILE` env var. See [`plugins/agent-orch/rules/worktree-context.md`](plugins/agent-orch/rules/worktree-context.md) → "Mechanical enforcement".
>
> **v2.27.0**: **Parallel-safe** session state — each `/make` writes its own `.claude/.make-session-<timestamp>-<pid>.json`, so multiple Claudes can run `/make` in parallel on the same repo without overwriting each other's anchor. Session artifacts now go under a date tree: `ssnc-agent-orch/<YYYY>/<MM>/<DD>/<feature>/`. (Worktree/branch context enforcement and visible phase banners landed in v2.25.0.)
>
> **v2.15.0**: [Worktree feature lifecycle](docs/blog/blog-2.15.0.md) -- `/make`, `/make-validate`, `/make-clean` skills for isolated worktree-based development with automatic PR management. Plus everything from [v2.14.0](docs/blog/blog-2.14.0.md): Bluestone design system enforcement and [v2.13.0](docs/blog/blog-2.13.0.md): plugin lifecycle wizards.

## Dual-Harness Support (Claude Code + OpenCode)

This plugin marketplace works identically in **Claude Code** and **OpenCode**. A single source of truth under `plugins/<name>/` serves both harnesses — skills, agents, commands, hooks, MCP servers, and rules are not duplicated.

- **Claude Code** v1.0.33+ — install via the marketplace (see Quick Start below)
- **OpenCode** — install via one plugin line in `opencode.json` (see Quick Start below)

Harness-specific files:
- `.opencode/plugins/agent-orch.js` — OpenCode bootstrap (registers skills, injects context, wires hooks)
- `.opencode/agent-orch-hooks.ts` — TS adapter mapping OpenCode tool events to the unchanged bash hook scripts
- `.opencode/agent-orch.opencode.example.json` — MCP server config template
- `.agent-orch-models.json` — central model + commit-attribution config (both harnesses read this)

### Optional Plugin: Codebase Graph Analyzer

Token-efficient code review and codebase navigation using a persistent knowledge graph. Reduces tokens by 5-10x on review tasks by sending only the blast radius of a change — not the whole codebase.
The graph auto-updates after every file edit and on worktree switches — no manual rebuilds needed.

> All skills, agents, and commands below work in both Claude Code and OpenCode unless noted. The mainframe-analyzer MCP server has a harness-specific setup path — see the mainframe-analyzer section below for Claude Code setup; in OpenCode, run `/mainframe-analyzer:setup` which walks through credential collection and server registration.

## What's in the Box

| Capability | Command | What It Does |
|-----------|---------|-------------|
| **Make (Feature Lifecycle)** | `/agent-orch:make <prompt>` | Thin git + tracker + extensibility wrapper: prompts for worktree or feature branch, delegates all code/content changes to `/build` (including version-file edits), commits, pushes, and opens a PR -- full feature lifecycle. Computes next minor version from last git tag and passes it to `/build` to apply |
| **Make Bug (Bug-Fix Lifecycle)** | `/agent-orch:make-bug <desc\|JIRA-ID\|URL>` | Thin git + tracker + extensibility wrapper for bug fixes: prompts for worktree or feature branch, delegates root-cause diagnosis and repair to `/bugfix` (Debugger -> Builder -> Validator, regression-test-first), commits, pushes, and opens a PR -- full bug-fix lifecycle. Reuses `/make` session state so `/make-validate` and `/make-clean` work unchanged |
| **Make Validate** | `/agent-orch:make-validate` | Checks PR for CI failures and review comments, fixes via `/build`, commits and pushes |
| **Make Clean** | `/agent-orch:make-clean` | Merges PR, deletes remote branch, removes worktree (or local branch), returns to main. Preserves `release/*` branches by design |
| **Make Review** | `/agent-orch:make-review [per-skill]` | Autonomously runs all available review skills (`/code-review`, `/security-review`, `/review`, and codebase-graph-analyzer `/build-graph` + `/review-pr`) against the current PR without stopping and **posts the findings to the PR via `gh`**. Default: ONE consolidated `gh pr review` (severity-driven verdict). Pass `per-skill` (or "post review as comment on PR for each of the skills") to post **one PR comment per review skill** instead |
| **Create RFO** | `/agent-orch:create-rfo` | Turn a postmortem call transcript into a numbered RFO (`incidents/request-for-outages/rfo-NNN.md`) with attendees, Problem, Solution, Root Cause, Follow-up; generates PDF; commits both on `rfo/NNN`; opens PR |
| **Release Me** | `/agent-orch:release-me` | Cut a tagged release: bump version interactively, generate `release-notes/<tag>.md` + PDF from commits since last tag, commit, tag, GitHub Release, push, open PR on `release/<tag>` |
| **Brainstorm** | `/agent-orch:brainstorm [topic\|JIRA-ID]` | Socratic design refinement *before* code -- one question at a time, explore alternatives, hard gate (no implementation until approved). Writes an approved `DESIGN.md` that `/build` consumes |
| **Bugfix** | `/agent-orch:bugfix [desc\|JIRA-ID\|URL]` | Focused root-cause fix: Debugger (4-phase, regression-test-first) -> Builder (source fix) -> Validator (verify). Leaner than `/build`; worktree-aware; 3-attempts-then-escalate |
| **Build (Standalone)** | `/agent-orch:build [desc\|JIRA-ID\|DESIGN.md]` | Gathers requirements through conversation, pulls from Jira, or consumes a `/brainstorm` design, then orchestrates agents in parallel |
| **Implement (Spec-Kit)** | `/agent-orch:implement [feat\|JIRA-ID]` | Reads `.specify/` directory or Jira issue, orchestrates agents against your spec |
| **Jira Work Queue** | `/agent-orch:jira-work` | Browse agent-ready Jira issues, triage backlogs, pick up work. [Human-on-the-loop](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html) governance via labels |
| **Jira Context** | `/agent-orch:jira` | Discover and cache Jira project metadata for fast MCP calls |
| **GitHub Issues** | `/agent-orch:github-issues [work\|triage]` | GitHub Issues backend on `code.ssnc.dev` via `gh` — a drop-in alternative to Jira, selected per-repo with a `tracker:` switch. Caches repo context, work queue, triage; same human-on-the-loop label governance |
| **Simplify** | `/agent-orch:simplify` | Post-implementation code simplification - finds reuse opportunities and quality improvements |
| **Analyse** | `/agent-orch:analyse authentication` | Multi-agent codebase analysis on a specific area |
| **Setup CLAUDE.md** | `/agent-orch:setup-claude-md` | Sets up hierarchical CLAUDE.md structure with `.claude/rules/` and subdirectory standards |
| **Setup Constitution** | `/agent-orch:setup-constitution` | Creates `.specify/memory/constitution.md` for spec-kit projects |
| **Observability** | `/agent-orch:olly` | Add OpenTelemetry observability -- greenfield or migrate from vendor SDKs |
| **C4 Architecture** | `/agent-orch:c4` | Generate [C4 model](https://c4model.com/) architecture documentation (`docs/c4/`) for the entire codebase |
| **Enforce** | `/agent-orch:enforce` | Convert recurring issues into deterministic linter rules and hook gates |
| **Component Library Guide** | `/agent-orch:complib-guide` | Reference skill for UI/UX agent |
| **Connector Generator** | `/agent-orch:workflows-connectors-generate` | Generate workflow connector scaffolding |
| **MCP Setup** | `/agent-orch:mcp-setup` | Configure local MCP server for Jira, Confluence, TestRail, Azure DevOps, Playwright, SonarQube, SS&C Cloud, ServiceNow |
| **MCP Start** | `/agent-orch:mcp-start` | Start the local MCP server |
| **MCP Stop** | `/agent-orch:mcp-stop` | Stop the local MCP server |
| **Init Plugin** | `/agent-orch:init-plugin` | Single entry-point wizard: discover, select, and configure plugins for your team and domain |
| **Upgrade Plugin** | `/agent-orch:upgrade-plugin` | Seamless upgrade wizard: pull upstream changes, walk through diffs, preserve local customizations |
| **Private Cloud** | `/agent-orch:private-cloud` | Interactive DevSecOps assistant for SS&C private cloud terraform. Plan infrastructure changes before `/build` executes |
| **Inherit Plugin** | `/agent-orch:inherit-plugin <git-repo>` | Clone a plugin, remap domain and tech stack, generate a new plugin |
| **Bluestone Design System** | `/agent-orch:refactor-to-bluestone` | Activate Bluestone (SS&C) design system enforcement for UI work |
| **Loop Library** | `/agent-orch:loop-library` | Find, **save**, audit, repair, adapt, or design **bounded repeatable agent loops** — workflows with an explicit trigger, action, verification check, stopping condition, and approval boundary. Backed by a **local, git-committed catalog** (`.loop-library/`) — **no network calls**, so there's no remote-fetch/prompt-injection risk. Recommends loops from your committed catalog, saves good loops into it for review, runs a "Loop Doctor" audit, or interviews you to design a new one and returns a copy-ready prompt. **Worktree/branch-aware** like `/build` and `/bugfix` — catalog writes stay anchored to the active `/make` session (never leaking into the primary checkout), and on save it prompts to land the loop in the **current session**, a **new worktree**, or a **new branch** (the last two commit + push + open a PR). Methodology adapted from [Forward Future's Loop Library](https://github.com/Forward-Future/loop-library) (MIT) |
| **Work Wiki** | `/team-work:work-wiki` | Bootstrap/repair an LLM-maintained SDLC knowledge wiki at a configurable path — schema, `README.md` catalog, per-directory OKF `index.md` navigation, `log.md`, immutable `sources/` tree, qmd search. Born **OKF v0.1**-conformant (typed concept pages, bundle-root `okf_version`); pages use standard relative markdown links that render on GitHub and Obsidian. Idempotent |
| **Work Ingest** | `/team-work:work-ingest` | The core BA tool. Classify a client call/doc → archive verbatim+categorized under `sources/` (audit trail; PDF/xlsx/docx → markdown, original preserved) → extract attendees + speaker attribution → integrate into requirement/entity/concept/decision/incident pages where **every claim cites its source** via a relative markdown link → flag contradictions → re-index qmd |
| **Work Ask** | `/team-work:work-ask` | Ask the wiki a question → qmd hybrid search (with `README.md` fallback) → cited answer (page + originating call/doc + speaker/date) → optionally file the answer back so explorations compound |
| **Work Lint** | `/team-work:work-lint` | Wiki health-check: contradictions, stale claims, orphans, missing requirement pages, missing cross-refs, broken provenance, broken/dangling links, lingering `[[wikilinks]]`/legacy catalog `index.md`, **OKF conformance gaps** (untyped concept pages, missing per-dir `index.md`, missing root `okf_version`), source gaps. Prioritized punch list; `--fix` applies safe fixes |
| **Work Upgrade** | `/team-work:work-upgrade` | Migrate an older wiki to current conventions: `index.md` → `README.md` (via `git mv`), rewrite `[[wikilinks]]` → relative markdown links, verify link integrity, refresh the schema, and run an **OKF v0.1 conformance pass** (backfill required `type`, generate per-directory `index.md` nav, add bundle-root `okf_version`). Idempotent, `--dry-run` to preview |
| **Work Publish** | `/team-work:work-publish` | Host the wiki as a **MkDocs Material site on GitHub Pages** (`pages.code.ssnc.dev/<org>/<repo>/`), styled with the **SS&C Blue Stone** look by default (SS&C Blue `#0077C8` + Teal accent, full brand palette, Calibri typography, bordered tables, light/dark — from a canonical `extra.css` embedded in the skill so the brand applies even when the template repo is unreachable; logos fetched best-effort; opt-out to plain Material). Scaffolds `mkdocs.yml` (`docs_dir` = wiki root, auto-generated nav, `README.md` home), `requirements.txt`, and a self-hosted GitHub Actions workflow that deploys via `mkdocs gh-deploy` to `gh-pages`; auto-enables Pages via the API once `gh-pages` exists, then verifies the live site. **code.ssnc.dev only**; prints a confidentiality notice and recommends restricting viewers over excluding `sources/` (excluding it 404s every citation link; strict-build won't catch it). `/work-wiki` offers it automatically. Idempotent, `--dry-run` |
| **Wiki Source** | `/team-work:wiki-source` | Turn the **code repository** into wiki knowledge in three steps: (1) generate/refresh C4 docs in `docs/c4/` (delegates to `/agent-orch:c4`); (2) walk the source to write a **business-domain guide** at `docs/wiki/domain/` (what the system does + domain rules, *not* how the code is written) and a **technical/DevSecOps reference** at `docs/wiki/technical/`, cross-linking existing docs; (3) `/work-ingest` the repo's markdown into the wiki. Honors `ingest_mode`; commits in place |
| **Wiki Source (Branch)** | `/team-work:wiki-source-branch` | The `/wiki-source` pipeline over the **whole repo**, always committed on the **current branch** (no scope prompt/worktree/PR). No-ops cleanly without a wiki. Run automatically by `/agent-orch:make` after it commits code, so the wiki tracks every feature |
| **Work Analyze** | `/team-work:work-analyze <doc>` | **Shift-left gate 1 — pushback.** Deeply analyze a requirements document against the **actual codebase** (auto-resolved from sibling repos) and the wiki's prior decisions. Every requirement gets an explicit verdict — BUILD AS WRITTEN / BUILD WITH CHANGES / RECOMMEND AGAINST / DEFER / NEEDS DECISION — backed by `file:line` evidence or a cited decision, with an alternative for anything recommended against. Open questions routed to named owners by audience; risks, implicit scope, and what the release won't deliver stated plainly |
| **Work Signoff** | `/team-work:work-signoff <transcript>` | **Shift-left gate 2 — agreement.** Turn the review meeting's transcript into the concise agreed statement of what the release delivers — the thing stakeholders sign, instead of reconciling a requirements doc that drifted from reality. Reconciles decisions against the prior analysis, **supersedes** any earlier sign-off (kept as a citable baseline) with a "what changed since" section, and splits open items into **blocking vs non-blocking** so the build can start honestly |
| **Work Handoff** | `/team-work:work-handoff` | **Shift-left gate 3 — handoff.** Generate a developer onboarding guide from the work plan, its tracker issues, and the wiki. The dependency map is **read from the tracker's real link graph, never inferred**. Maps each item to its repo and stack, mines the authoritative design and its decisions into a document index with reading order, and leads "getting unblocked" with querying the wiki instead of interrupting the lead |
| **Work Prep** | `/team-work:work-prep` | Full SDLC intake — parse transcripts into requirements, ideas, decisions, and open questions. Business alignment and Jira hierarchy. Team review via PR |
| **Work Plan** | `/team-work:work-plan` | Convert agreed work plans into Jira issues with dependencies and assignments |
| **Work Pop** | `/team-work:work-pop` | Pick your next assigned item or explore ideas from the plan. Launch into `/make` when ready |
| **Work Report** | `/team-work:work-report` | Sync Jira status across all plans, generate unified Bluestone HTML report for PDF export |
| **Work Recap** | `/team-work:work-recap` | Time-windowed Markdown + Bluestone light-mode PowerPoint recap of Jira activity, commits, and agent-orch sessions. **Every Jira entry is self-contained** — includes description, last comment with total count, attachments, and full metadata (epic, components, fix versions, story points, due date) so stakeholders can read without clicking into Jira. Outputs to `../` for PM status updates and engineers catching up after time away |
| **Groom** | `/team-work:groom` | Worktree-based agentic backlog grooming with Jira lifecycle — batch assign, reschedule, resolve open questions, set timelines. Produces a self-contained Markdown + Bluestone PDF report (description, last comment + count, attachments, metadata per issue) so stakeholders don't need to click into Jira. Transitions tracking Jira to Done when the PR is opened |
| **Create Release** | `/team-work:create-release` | Branch-aware tagging, dual release notes (technical + customer) as markdown and PDF, GitHub release, optional Jira ticket |
| **Plugin Feedback** | `/team-work:plugin-feedback` | Submit structured plugin feedback as a Jira ticket in AITOOLS — wizard collects rating, likes, pain points, suggestions |
| **Vault Init** | `/vault-orch:init` | Provision an Obsidian vault over an agent-orch repo — `.obsidian/` config with `userIgnoreFilters` baked in for multi-GB repos, Dataview, templates, 3 dashboards, git hygiene. Refuses without `ssnc-agent-orch/`. Idempotent |
| **Vault Backfill** | `/vault-orch:backfill` | Stamp variant-B frontmatter (`jira:` wikilinks) onto existing session markdown so the graph + dashboards populate. Header-only diff, skips code/links, idempotent, dry-run by default — one mechanical PR |
| **Vault Intake** | `/vault-orch:intake <topic>` | Scaffold a business-requirement note that feeds `team-work:work-prep`/`work-plan` (→ Jira) and then `/make` |
| **Vault Exec Update** | `/vault-orch:exec-update [start] [end]` | Exec-altitude weekly summary written into the vault as a dated, Dataview-indexed, Mermaid-charted node. Differentiated from `work-recap` (exec vs PM altitude, Mermaid vs PPTX) |
| **Design Tech Spec** | `/meta-orch:design-tech-spec <huge idea>` | Staff/principal-level tech-spec design for something HUGE (1→35 epics). Runs `/deep-research` + a grill-me-style one-question-at-a-time interrogation over the codebase + source + `/wiki`. Writes `docs/tech-specs/000N-name.md`. **Step 1 of meta-orch** |
| **Design Tech Plan** | `/meta-orch:design-tech-plan <spec>` | Decompose an approved spec into epics → tranches → gated stories, CREATE every GitHub epic/story issue (embedded `/make-session` prompt each), install the lock workflow + labels, write `docs/tech-plan/000N-name.md`. **Step 2** |
| **Make Session** | `/meta-orch:make-session [epic#]` | The only worker skill — a **self-driving loop over the whole `/make-*` pipeline**. RED "don't start another yet" → find open+gate-open story → confirm → **atomic lock** → GREEN "start another now" → `/make` → `/make-review` (per-skill PR comments) → `/make-validate` until CI green → `/make-clean` (merge) → free lock, open next gate → **loop to next story**. Owns GitHub state + heartbeat; never touches agent-orch. **Step 3** |
| **Coordinate Session** | `/meta-orch:coordinate-session [once] [epic#]` | Coordinator that loops every N min (default 5) reading in-progress issues + heartbeats + each session's `STATUS.md`; reports per-epic status, who's on what, what's ready to run; flags stale sessions. **Step 4** |
| **Scout Setup** | `/scout:setup` | Probe a repo (AI chat, MCP, internal APIs + sibling services, runbooks, data stores, auth/governance, existing investigation skills, team-work wiki) → emit a **Capability Manifest** binding abstract capability names to real endpoints + auth env var NAMES (never values), scaffold the playbook store + INDEX, and (v0.4) the ambient **investigation toolbox** (common logs/DB/traces/MCP tools). Read-only; inherits the repo's own governance. Re-run to reconcile |
| **Scout Author** | `/scout:author` | Guided one-question wizard → ONE schema-valid **playbook** (`kind: investigation \| procedure \| toolbox`) — declarative YAML, no code; validates, writes to `.claude/scout/playbooks/`, registers in the INDEX. Also maintains the ambient investigation toolbox (`/scout:author toolbox`) and runs an advisory guardrail preflight. Can draft from a rich source doc |
| **Scout Harvest** | `/scout:harvest` | Auto-draft playbooks from EXISTING support knowledge — runbooks, README troubleshooting, incident write-ups, Makefile targets — mapping symptoms → triggers and resolutions → conclusions; registers drafts in the INDEX and emits a "capabilities to add" reconciliation checklist. Complement, don't replace |
| **Scout Investigate** | `/scout:investigate <ticket\|run-id\|symptom>` | Route a symptom to the best-matching playbook (via the INDEX), gather evidence by running steps IN ORDER through the **rails engine** (allow / needs-approval / reject / inert + mandatory redaction), reach a confidence-gated verdict, emit a cited findings artifact. Ambient toolbox tools (logs/DB/traces) are reachable without re-declaring them; `--dry-run` previews the whole run + guardrails |
| **Scout Runbook** | `/scout:runbook <natural language>` | Route a natural-language operation ("promote to uat", "sync secrets", "refresh cache") to a `kind: procedure` playbook and execute its steps through the rails — every mutating step is needs-approval + preview + confirm, followed by verify + rollback. `--dry-run` emits a mutation-plan and executes nothing |
| **Scout Explain** | `/scout:explain "<question>"` | Answer "how does X work here?" read-only — delegates to a team-work wiki via `/work-ask` when present (always cited), else reads the repo's docs + playbook INDEX. Also lists what playbooks/runbooks exist |
| **Scout Lint** | `/scout:lint` | Health-check the playbook store + INDEX + toolbox — flags stale/never-promoted-draft/drifted (inert)/broken playbooks, INDEX reconciliation gaps, a stale manifest when new MCP tools aren't bound (→ `/scout:setup`), and a store-wide guardrail preflight. Read-only; suggests, never forces |

> **Mainframe COBOL/JCL analysis has moved.** The former `mainframe-analyzer` plugin now lives in the **gids-ai-marketplace** catalog as **`gids-mainframe-analyzer`** ([code.ssnc.dev/FS/gids-ai-marketplace](https://code.ssnc.dev/FS/gids-ai-marketplace)). See [Optional: Mainframe COBOL/JCL analysis](#optional-mainframe-cobol-jcl-analysis-moved-to-gids-ai-marketplace) below for install instructions.

### Lightweight Commands

Fast, single-pass commands without agent overhead:

| Command | What It Does |
|---------|-------------|
| `/agent-orch:status-check` | Quick project status summary from STATUS.md files |
| `/agent-orch:review-quick` | Fast code review for critical issues only |
| `/agent-orch:test-check` | Verify tests pass and coverage meets targets |
| `/agent-orch:plan-review` | Validate PLAN.md completeness and feasibility |
| `/agent-orch:enforce-check` | Run enforcement rules without full verification |
| `/agent-orch:db-migration-check` | Verify migrations are safe and reversible |
| `/agent-orch:security-quick` | Fast security scan for common vulnerabilities |
| `/agent-orch:docs-sync` | Check documentation matches implementation |
| `/codebase-graph-analyzer:build-graph` | Parse your repo into a knowledge graph (run once) |
| `/codebase-graph-analyzer:inject-docs` | Inject markdown files into the graph as searchable nodes |
| `/codebase-graph-analyzer:deep-review-pr [branch]` | Ensemble review: graph structural + functional deep review, posts to PR |
| `/codebase-graph-analyzer:review-delta` | Token-efficient review of changes since last commit |
| `/codebase-graph-analyzer:review-pr [branch]` | Full PR review with blast-radius analysis |
| `/codebase-graph-analyzer:review-changes` | Risk-scored review of current working tree |
| `/codebase-graph-analyzer:explore-codebase` | Navigate structure via call chains and communities |
| `/codebase-graph-analyzer:debug-issue` | Trace bugs via callers/callees without grepping |
| `/codebase-graph-analyzer:refactor-safely` | Preview rename/dead-code impact before touching anything |

### Agent Summary

The plugin ships 26 agents, each invoked as a subagent via its `agent-orch:` prefixed type (see table):

| Agent | Subagent Type | Category | Role |
|-------|---------------|----------|------|
| Architect | `agent-orch:orchestrate-architect` | Core | Planning, codebase analysis, task coordination |
| Builder | `agent-orch:orchestrate-builder` | Core | TDD-driven implementation, production code |
| Validator | `agent-orch:orchestrate-validator` | Core | Testing, coverage tracking, Playwright e2e |
| Scribe | `agent-orch:orchestrate-scribe` | Core | API docs, README, usage guides |
| Spec Reviewer | `agent-orch:orchestrate-spec-reviewer` | Review | Stage 1: spec compliance verification |
| Quality Reviewer | `agent-orch:orchestrate-quality-reviewer` | Review | Stage 2: code quality, patterns, constitution |
| Debugger | `agent-orch:orchestrate-debugger` | Support | 4-phase root cause investigation |
| Security Auditor | `agent-orch:orchestrate-security` | Specialist | OWASP audit with file:line evidence |
| Performance Analyst | `agent-orch:orchestrate-performance` | Specialist | Benchmarking, bottleneck analysis |
| API Designer | `agent-orch:orchestrate-api` | Specialist | REST/GraphQL design, OpenAPI specs |
| Database Architect | `agent-orch:orchestrate-database` | Specialist | Schema design, migrations, query optimization |
| DevOps Engineer | `agent-orch:orchestrate-devops` | Specialist | CI/CD, Docker, Kubernetes, infrastructure |
| Telemetry Engineer | `agent-orch:orchestrate-telemetry` | Specialist | OpenTelemetry, Grafana dashboards |
| Refactorer | `agent-orch:orchestrate-refactorer` | Specialist | Code smells, technical debt reduction |
| Migration Specialist | `agent-orch:orchestrate-migration` | Specialist | Framework upgrades, breaking changes |
| UI/UX Designer | `agent-orch:orchestrate-uiux` | Specialist | Design system compliance, accessibility |
| Data Engineer | `agent-orch:orchestrate-data-engineer` | Specialist | ETL pipelines, data warehouses |
| ML Engineer | `agent-orch:orchestrate-ml-engineer` | Specialist | Model training, inference pipelines, MLOps |
| Observability Engineer | `agent-orch:orchestrate-observability` | Specialist | SLOs, alerting, incident metrics |
| Incident Responder | `agent-orch:orchestrate-incident-responder` | Specialist | Production incident triage, emergency fixes |
| Legacy Modernizer | `agent-orch:orchestrate-legacy-modernizer` | Specialist | Brownfield migration, strangler fig pattern |
| C4 Scribe | `agent-orch:orchestrate-c4-scribe` | Specialist | C4 architecture documentation |
| Advocate | `agent-orch:orchestrate-advocate` | Coordination | Architecture decisions, cross-team impact, Jira tickets |
| Private Cloud Engineer | `agent-orch:orchestrate-private-cloud` | Coordination | Terraform/HCL for SS&C and AWS hybrid |
| Content Specialist | `agent-orch:orchestrate-content-specialist` | Coordination | Technical writing, tutorials, blog posts |
| Jira Triage | `agent-orch:orchestrate-jira-triage` | Coordination | Issue classification for agent-readiness |

---

## Quick Start

### Install the Plugin

Requires Claude Code v1.0.33+ and git access to `code.ssnc.dev`.

> **SSH users:** Your SSH key must be loaded before running plugin commands. Run `ssh-add ~/.ssh/id_ed25519` if `ssh-add -l` shows "no identities". See [SSH Setup](#ssh-setup) below for persistent configuration.

```bash
# Register the marketplace + install the plugin
/plugin marketplace add git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
/plugin install agent-orch@ssnc-agent-orch

# Restart Claude, then try it
/agent-orch:build
```

### Model Configuration (Optional)

Claude Code works out of the box. If you set `ANTHROPIC_DEFAULT_OPUS_MODEL` and `ANTHROPIC_DEFAULT_SONNET_MODEL` in your environment, the plugin uses those for commit trailers automatically — no config needed.

To override per-repo or set global defaults:

```
> /agent-orch:config            # per-repo override
> /agent-orch:config --global   # defaults for all repos
```

### Install for OpenCode

Add one line to your `opencode.json` (global or project-level):

```json
{
  "plugin": ["git+https://code.ssnc.dev/ai/claude-agent-orchestration-plugin.git"]
}
```

Restart OpenCode. The bootstrap plugin registers all 6 plugins' skills and injects the tool-name mapping, resolved model table, and commit attribution into your session.

Verify by asking: "Tell me about your agent-orch skills"

#### First-Run Configuration (OpenCode)

On your first session, if no `.agent-orch-models.json` exists (project or global), the agent will prompt you to select your `thinking` and `instruct` models from a list and save them globally. To set them now instead:

```
> /agent-orch:config --global
```

The skill runs `opencode models` and presents a numbered picker — no typing model IDs. To override models for a specific repo:

```
> /agent-orch:config
```

#### Optional: Install the `codebase-graph-analyzer` plugin from the same marketplace

```bash
# Install alongside agent-orch (backend auto-installs on first session)
/plugin install codebase-graph-analyzer@ssnc-agent-orch

# Restart Claude, then try it
/codebase-graph-analyzer:build-graph
```

#### Optional: Install the `vault-orch` plugin to layer an Obsidian knowledge graph

```bash
# Install alongside agent-orch
/plugin install vault-orch@ssnc-agent-orch

# Restart Claude, then provision the vault in an agent-orch repo
/vault-orch:init
/vault-orch:backfill --keys RCONAI --apply
```

#### Optional: Install the `team-work` plugin for collaborative work planning

```bash
# Install alongside agent-orch for team planning workflows
/plugin install team-work@ssnc-agent-orch

# Restart Claude, then try it
/team-work:work-prep
```

The `team-work` plugin adds twelve skills spanning the full SDLC — from a client call to requirements to `/make` to release.

**Knowledge layer — the LLM-maintained SDLC wiki (new in 0.12.0):** a persistent, compounding knowledge base that sits upstream of planning. A business analyst accumulates client calls, requirement docs, and postmortems into living, cross-referenced markdown pages with a full audit trail back to the source. Pages use standard relative markdown links and a `README.md` catalog, so the wiki renders and navigates in the GitHub UI as well as in Obsidian. It *front-runs* `/work-prep` (which is unchanged) — accumulate knowledge over many calls, then seed a planning session from the requirement pages.
- `/team-work:work-wiki` -- Bootstrap/repair a wiki at a configurable path: `CLAUDE.md` schema, `README.md` catalog, `log.md`, immutable categorized `sources/` tree, generated page dirs (requirements, entities, concepts, decisions, incidents, plans), qmd search. Pages use standard relative markdown links (render on GitHub and Obsidian). Idempotent — re-run to repair/upgrade
- `/team-work:work-ingest` -- The core BA tool. Classify a source → save it verbatim+categorized under `sources/<type>/<client>/<date>` as an audit trail (converting PDF/xlsx/docx to markdown while preserving the original binary) → extract attendees + speaker attribution → integrate into requirement/entity/concept/decision/incident pages where **every claim cites its source** via a relative markdown link → flag contradictions → update `README.md`+`log.md` → re-index qmd. The first run asks whether to commit locally or via PR and remembers your choice repo-wide
- `/team-work:work-ask` -- Ask a question against the wiki → qmd hybrid search (BM25/vector + LLM re-rank) with a `README.md` fallback → synthesize a cited answer (page + originating call/doc + speaker/date) → optionally file the answer back as a new page so explorations compound
- `/team-work:work-lint` -- Wiki health-check: contradictions, stale claims, orphan pages, requirements lacking a page, missing cross-refs, broken provenance, broken/dangling relative links, lingering `[[wikilinks]]`/`index.md`, source gaps. Prioritized punch list; read-only by default, `--fix` applies safe fixes
- `/team-work:work-upgrade` -- Migrate an older wiki to current conventions so the other skills run cleanly: `index.md` → `README.md` (via `git mv`, preserving history), rewrite Obsidian `[[wikilinks]]` → standard relative markdown links, verify every link resolves (broken vs. dangling), refresh the `CLAUDE.md` schema. Idempotent and safe to re-run; `--dry-run` previews every change

**Planning → release:**
- `/team-work:work-prep` -- Full SDLC intake: parse transcripts into classified requirements, ideas, decisions, and open questions. Supports business alignment, Jira hierarchy (Goal > Epic > Story), and idea tracking
- `/team-work:work-plan` -- Convert agreed plans into Jira issues with dependencies and assignments
- `/team-work:work-pop` -- Pick your next assigned item or explore and refine ideas before they become work items. Launch into `/agent-orch:make`
- `/team-work:work-report` -- Sync Jira status across all plans, generate a unified Bluestone-styled HTML report covering business readiness, tech deliverables, and dependencies. Save as PDF
- `/team-work:work-recap` -- Time-windowed recap: prompts for a start/end window, collects Jira activity (created, reassigned, status transitions), git commits, and agent-orch session artifacts, cross-references Jira keys with commits, and writes a Markdown report + Bluestone light-mode PowerPoint deck to `../` (parent of the repo). **Every Jira entry is self-contained** -- each one is enriched with the issue description, the most recent comment (with total comment count, e.g. "Last comment (3 of 12)"), a list of attached files (filename, size, MIME type), and the full set of Jira metadata (epic link, components, fix versions, story points, due date, labels). Stakeholders and PMs can read the recap end-to-end without clicking into Jira. Useful for PM status updates or engineers catching up after time away
- `/team-work:groom` -- Worktree-based agentic backlog grooming by Epic. Opens the session on an isolated worktree with a Jira tracking issue, batch assigns, reschedules, resolves open questions, sets Epic-level timelines, and opens a PR with the `planning/` changes and a self-contained grooming report (Markdown + Bluestone PDF) covering every groomed issue — description, last comment (with total comment count), attachments, and full metadata so stakeholders can consume the output without clicking into Jira. When the PR is opened, the tracking Jira transitions to **Done** (the grooming session is complete; the PR is the record). Date-aware: skips items beyond your grooming horizon. Shares `.make-config.md` with `/agent-orch:make`
- `/team-work:create-release` -- Branch-aware tagging and release management. Generates technical + customer release notes as markdown and PDF, creates GitHub release, optional Jira ticket with PDF attachments

#### Optional: Install the `meta-orch` plugin to coordinate MANY parallel sessions on HUGE work

```bash
# Install alongside agent-orch
/plugin install meta-orch@ssnc-agent-orch

# Restart Claude, then run the pipeline in an agent-orch repo:
/meta-orch:design-tech-spec   Big multi-epic idea    # → docs/tech-specs/000N-name.md
/meta-orch:design-tech-plan   docs/tech-specs/0001-name.md   # → GitHub epics/stories + docs/tech-plan/000N-name.md
/meta-orch:coordinate-session                        # one coordinator, loops every 5m
/meta-orch:make-session                              # N workers — start ONE AT A TIME
```

The `meta-orch` plugin is a **meta-orchestration layer above `/agent-orch:make`** for work too big for one session — from 5 PRs under one epic to 1,000+ stories across 35 epics. It uses **GitHub Issues on `code.ssnc.dev`** as shared state and **never modifies `agent-orch`** — it wraps it. Four skills form a pipeline:

- `/meta-orch:design-tech-spec` -- Staff/principal-level technical-specification design for something HUGE. Runs `/deep-research` when available plus a relentless **grill-me-style** one-question-at-a-time Socratic interrogation (recommended answer supplied for every question, explore-the-codebase-over-asking) that considers the existing codebase, all source, and a team-work `/wiki` if initialized. Writes `docs/tech-specs/000N-name.md`
- `/meta-orch:design-tech-plan` -- Decompose an approved spec into **epics → tranches → gated stories** (epics can be epics-of-epics), CREATE every GitHub epic/story issue via `gh` with a ready-to-run `/make-session` prompt embedded in each story, install the concurrency **lock workflow** + labels, and write `docs/tech-plan/000N-name.md`. Tranches group parallel-safe stories; gates serialize work that would merge-conflict
- `/meta-orch:make-session` -- The **only worker skill** and sole owner of a session's GitHub story/epic state — a **self-driving loop through the entire `/make-*` pipeline**. Prints a **huge RED "do not start another `/make-session` yet"** warning, finds an open + gate-open story (scoped to an epic if you pass one, else across epics), asks you to confirm, **atomically locks** the issue the instant you confirm (GitHub Actions concurrency workflow; optimistic fallback), flips to a **GREEN "you may start another now"**, pulls `.meta-orch/session-guardrails.md` into context, and hands the prompt + guardrails to `/agent-orch:make`. It then drives `/agent-orch:make-review` in **per-skill mode** (posts one PR comment per review skill — typically 3, plus `/review-pr` when the graph plugin is installed), loops `/agent-orch:make-validate` until CI is green (max 3 rounds), runs `/agent-orch:make-clean` to merge and close the story, frees the lock, opens the next tranche's gate, and **loops to the next story** — no re-invocation needed. Heartbeats via rolling labels + a pointer comment throughout — no changes to agent-orch
- `/meta-orch:coordinate-session` -- A **coordinator that loops every N minutes** (configurable in `.meta-orch/config.md`, default 5) reading in-progress issues + heartbeat labels, reading each active session's `STATUS.md`, and reporting per-epic/per-story status: **who's working on what, how it's going, and what's open-gated to run**. Flags stale sessions and optionally opens the next tranche's gate

Config lives in `.meta-orch/config.md` (session count default 5, loop interval, labels, lock workflow) and the operating contract in `.meta-orch/session-guardrails.md` — both auto-provisioned on first run. Full concept guide: [docs/meta-orch.md](docs/meta-orch.md).


#### Optional: Mainframe COBOL/JCL analysis (moved to gids-ai-marketplace)

> **This plugin has moved.** The former `mainframe-analyzer` plugin now lives in the
> **gids-ai-marketplace** catalog as **`gids-mainframe-analyzer`**. It is no longer shipped
> from this repository. Install it from its new home:
> **[code.ssnc.dev/FS/gids-ai-marketplace](https://code.ssnc.dev/FS/gids-ai-marketplace)**

```bash
# Register the gids-ai-marketplace catalog (one-time)
/plugin marketplace add git@code.ssnc.dev:FS/gids-ai-marketplace.git

# Install the mainframe analyzer from its new home
/plugin install gids-mainframe-analyzer@gids-ai-marketplace
/reload-plugins

# Install the SmartTSXL MCP server it depends on
/gids-mcp-catalog:mcp-smarttsxl
```

`gids-mainframe-analyzer` is maintained by the RS Architecture & Platform team in its own
repository ([code.ssnc.dev/FS/gids-mainframe-analyzer-plugin](https://code.ssnc.dev/FS/gids-mainframe-analyzer-plugin))
and analyzes mainframe COBOL/JCL/PROC via the SmartTSXL API. It provides two skills —
`/gids-mainframe-analyzer:change-impact-analysis` (blast-radius analysis before a change) and
`/gids-mainframe-analyzer:mips-hotspot-audit` (CPU/MIPS hotspot audit + remediation) — and depends
on the `gids-mcp-catalog` plugin, which installs the SmartTSXL MCP server via `/gids-mcp-catalog:mcp-smarttsxl`.

#### Optional: Install the `scout` plugin for repo-agnostic support & investigation tooling

```bash
# Install alongside agent-orch
/plugin install scout@ssnc-agent-orch

# Restart Claude, then stand Scout up in your repo:
/scout:setup                                   # probe the repo → Capability Manifest + playbook store + INDEX + toolbox
/scout:harvest                                 # auto-draft playbooks from existing runbooks/docs
/scout:author                                  # or hand-write one (guided, no code)
/scout:investigate "broker balances show 0"    # route a symptom → rails-gated evidence → cited findings
```

The `scout` plugin is a **factory for support/investigation tooling — not a support tool itself**. Developers capture their team's tribal support knowledge as declarative **playbooks** (YAML, no code); the resulting investigations are consumable by ANY audience through whatever surface the repo has (a Claude Code skill, the app's MCP server, or its own AI chat) — a business user with no repo access can run a scoped, redacted investigation from chat while a developer runs the same playbook with full evidence in Claude Code. A **rails engine** (ordered gate decision + mandatory redaction) enforces safety on every surface: `read-only | needs-approval | forbidden`, free-form prod queries forbidden, secrets used to connect but never read/echoed, outputs redacted before return, dry-run preview before anything runs. Governance is **inherited** from the repo, never invented. Seven skills across four layers:

- **Setup:** `/scout:setup` -- probe the repo (AI chat, MCP, internal APIs + sibling services, runbooks, data stores, auth, existing investigation skills, team-work wiki) → emit a **Capability Manifest** binding abstract capability names to real endpoints + auth env var NAMES, scaffold the playbook store + **INDEX**, and (v0.4) the ambient **investigation toolbox** (common logs/DB/traces/MCP tools available to every playbook without re-declaring them). Read-only; re-run to reconcile
- **Authoring:** `/scout:author` (guided one-question wizard → one schema-valid playbook; also maintains the toolbox and can draft from a rich source doc), `/scout:harvest` (auto-draft from existing runbooks/README/incident write-ups/Makefile targets)
- **Investigation:** `/scout:investigate` (route a symptom → gather rails-gated evidence → confidence-gated verdict → cited findings → optional `/agent-orch:make` handoff to fix the bug), `/scout:runbook` (natural-language → a `kind: procedure` playbook run through the rails: mutating steps need approval + preview + confirm + verify + rollback), `/scout:explain` (how-does-X-work, cited, delegates to the team-work wiki when present)
- **Health:** `/scout:lint` -- flag stale/draft/drifted/broken playbooks, INDEX + toolbox reconciliation gaps, a stale manifest when new MCP tools aren't bound, and a store-wide guardrail preflight

Complements, never replaces: a playbook step can invoke a team's EXISTING investigators (`skill-call`), Scout reuses agent-orch role agents + the team-work wiki, and anything the repo doesn't provide renders **inert**, not broken. Full architecture: [`plugins/scout/README.md`](plugins/scout/README.md) + [`plugins/scout/architecture/`](plugins/scout/architecture/).

### Team-Wide Auto-Setup

Commit this to your project so every team member gets the plugin automatically:

```json
// .claude/settings.json
{
  "extraKnownMarketplaces": [
    { "source": "git", "url": "git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git" }
  ],
  "enabledPlugins": [
    { "name": "agent-orch", "marketplace": "ssnc-agent-orch" },
    { "name": "codebase-graph-analyzer", "marketplace": "ssnc-agent-orch" },
    { "name": "team-work", "marketplace": "ssnc-agent-orch" }
  ]
}
```

### Alternative: Script Installation

If you prefer to install from a local clone:

```bash
git clone git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
cd claude-agent-orchestration-plugin
./install.sh
```

### Permission Management (Recommended)

**For multi-agent builds**, start Claude with auto-approve permissions to prevent agents from stalling on permission prompts:

```bash
# Recommended for /agent-orch:build or /agent-orch:implement
claude --permission-mode dontAsk

# Then run your build
> /agent-orch:build
```

#### Permission Mode Options

| Flag | Behavior | Use Case |
|------|----------|----------|
| `--permission-mode dontAsk` | Auto-approve all tool calls | **Recommended for agent orchestration** |
| `--permission-mode acceptEdits` | Auto-approve file edits only | Build sessions with external tools |
| `--permission-mode plan` | Require plan approval before execution | Review before running |
| `--permission-mode default` | Ask for each permission | Interactive sessions |
| `--dangerously-skip-permissions` | Skip ALL permission checks | Sandboxes only (no internet) |

#### Persistent Configuration

Add to `~/.claude/settings.json` for all sessions:

```json
{
  "permissionMode": "dontAsk",
  "permissions": {
    "autoApprove": ["read", "edit", "bash", "write"]
  }
}
```

**Why this matters:** Agent orchestration involves multiple agents writing files, running tests, and checking migrations in parallel. Without auto-approval, agents wait silently for permission prompts—the #1 cause of stalled builds.

## Model Configuration

Agent models are configured via a three-tier fallback: project `.agent-orch-models.json` (repo root) → global `~/.config/agent-orch-models.json` → harness-native defaults. The file uses vendor-neutral aliases:

| Alias | Default (Claude Code) | OpenCode (user-set) | Use for |
|-------|----------------------|---------------------|---------|
| `thinking` | `opus` | `ssnc-gateway/.../GLM-5.2-FP8` | Architecture, debugging, review |
| `instruct` | `sonnet` | `ssnc-gateway/.../...` | Building, validation, domain work |

Each of the 26 agents maps to one alias. To use your own models, edit the `aliases` block — all agents pick up the change:

```json
{
  "aliases": {
    "thinking": "ssnc-gateway/zai-org/GLM-5.2-FP8",
    "instruct": "ssnc-gateway/zai-org/GLM-5.2-FP8"
  }
}
```

Per-repo overrides stack on top via `.claude/rules/build-overrides.md` (standalone mode) or `.specify/memory/constitution.md` (spec-kit mode). See [build skill model selection](plugins/agent-orch/skills/build/SKILL.md).

Run `/agent-orch:config` to generate or update the config with a guided picker (OpenCode) or env-var auto-fill (Claude Code):
- `/agent-orch:config` — write project-level `.agent-orch-models.json` (per-repo override)
- `/agent-orch:config --global` — write `~/.config/agent-orch-models.json` (defaults for all repos)

### Commit Attribution

The commit trailer is also configured in `.agent-orch-models.json` under `commit_attribution`. Every AI-generated commit MUST end with:

```
Co-authored-by: <gh-user> + <harness>/<models> <<gh-user>@users.noreply.github.com>
```

The `<gh-user>` is read from `git config user.name`. The `validate-ai-commit.sh` hook enforces this. Claude Code defaults to `harness: "claude-code"`; OpenCode users set `harness: "opencode"`.

---

## Cline Installation (VS Code)

For users of [Cline](https://github.com/cline/cline) (VS Code extension), we provide a separate installer that creates the same capabilities without requiring Claude Code.

### Quick Install

```bash
# Clone the repo
git clone git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
cd claude-agent-orchestration-plugin

# Install to your project (PowerShell)
.\install-cline.ps1 -TargetRepo "C:\path\to\your-project"

# Install to your project (Bash)
./install-cline.sh /path/to/your-project
```

### What Gets Installed

The installer creates this structure in your project:

```
your-project/
├── AGENTS.md                    # Plugin overview
├── .clinerules/
│   ├── convention-*.md          # Language conventions (csharp, typescript, etc.)
│   ├── persona.md               # ISC2 Staff SWE persona
│   ├── policy-*.md              # Policies
│   ├── workflows/               # User-invokable commands
│   │   ├── build.md             # /build.md
│   │   ├── implement.md         # /implement.md
│   │   ├── analyse.md           # /analyse.md
│   │   └── setup-cline-rules.md # /setup-cline-rules.md
│   ├── skills/                  # Specialized agents
│   │   ├── orchestrate-architect/
│   │   ├── orchestrate-builder/
│   │   └── ...
│   └── hooks/
│       └── TaskStart.ps1        # Welcome message hook
```

### Available Workflows

After installation, type `/` in Cline to see available workflows:

| Workflow | Description |
|----------|-------------|
| `/build.md` | Multi-agent implementation (standalone) |
| `/implement.md` | Multi-agent implementation (with spec-kit) |
| `/analyse.md` | Multi-agent codebase analysis |
| `/setup-cline-rules.md` | Set up hierarchical rules structure |

### MCP Integration for Cline

Cline can connect to Jira, Confluence, TestRail, Azure DevOps, Playwright (browser automation), SonarQube, SS&C Cloud, and ServiceNow through a local MCP server using SSE (Server-Sent Events) transport.

#### Step 1: Install with MCP Support

```powershell
# PowerShell
.\install-cline.ps1 -TargetRepo "C:\path\to\project" -IncludeMcp

# Bash
./install-cline.sh /path/to/project --include-mcp
```

This creates:
- `mcp-config.json` in Cline's settings directory (credentials)
- Updates `cline_mcp_settings.json` with SSE server endpoints
- Copies MCP workflows to your project

#### Step 2: Configure Credentials

Run the setup workflow in Cline:

```
/mcp-setup.md
```

Or manually edit the config file:

| Platform | Config Location |
|----------|----------------|
| Windows | `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\mcp-config.json` |
| macOS | `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/mcp-config.json` |
| Linux | `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/mcp-config.json` |

Example configuration:

```json
{
  "port": 13999,
  "jira": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "jira.company.com",
    "token": "YOUR_API_TOKEN",
    "scope": "write"
  },
  "confluence": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "confluence.company.com",
    "token": "YOUR_API_TOKEN",
    "scope": "write"
  },
  "testrail": {
    "enabled": true,
    "url": "https://company.testrail.io",
    "email": "you@company.com",
    "apiKey": "YOUR_API_KEY",
    "scope": "write"
  },
  "azureDevOps": {
    "enabled": true,
    "baseUrl": "https://dev.azure.com",
    "organizations": {
      "myorg": {
        "name": "My Organization",
        "token": "YOUR_PAT"
      }
    },
    "scope": "write"
  }
}
```

#### Step 3: Start the MCP Server

**Recommended: Start in a separate terminal** (server persists across Cline tasks):

```powershell
# Windows (PowerShell)
cd "<plugin-path>\plugins\agent-orch\mcp"
bun run src/index.ts

# macOS/Linux
cd "<plugin-path>/plugins/agent-orch/mcp"
bun run src/index.ts
```

The plugin path is recorded during installation. Check:
- Windows: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\mcp-plugin-path.txt`
- macOS/Linux: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/mcp-plugin-path.txt`

**Alternative: Use the Cline workflow** (server stops when task ends):

```
/mcp-start.md
```

> **Note:** If you start the server via `/mcp-start.md`, it runs in Cline's task context. When you switch to a new task or close the chat, the server stops. For persistent connections, start the server in a separate terminal.

#### Step 4: Verify Connection

After starting the server, toggle the services off and on in Cline's MCP panel. You should see all enabled services connect successfully.

#### Troubleshooting

| Issue | Solution |
|-------|----------|
| Services show "SSE error" | Restart the MCP server and toggle services in Cline |
| "Port already in use" | Stop the existing server or change port in `mcp-config.json` |
| Services not appearing | Restart VS Code after modifying `cline_mcp_settings.json` |
| Auth errors | Verify tokens in `mcp-config.json`; for TestRail, click "Save Settings" after creating API key |

#### Available MCP Workflows

| Workflow | Description |
|----------|-------------|
| `/mcp-setup.md` | Interactive credential configuration |
| `/mcp-start.md` | Start the MCP server (installs Bun if needed) |

---

## SSH Setup

Claude Code fetches plugin marketplaces over git. If your `code.ssnc.dev` access uses SSH, your key must be available in the SSH agent.

### Check Your Key

```bash
ssh-add -l
```

If you see "The agent has no identities", load your key:

```bash
ssh-add ~/.ssh/id_ed25519
```

### Persistent Setup (macOS)

Add to `~/.ssh/config` so your key loads automatically:

```
Host code.ssnc.dev
  HostName code.ssnc.dev
  User git
  IdentityFile ~/.ssh/id_ed25519
  AddKeysToAgent yes
  UseKeychain yes
```

Then run once: `ssh-add --apple-use-keychain ~/.ssh/id_ed25519`

### Persistent Setup (Linux)

Add to your shell profile (`~/.bashrc` or `~/.zshrc`):

```bash
if [ -z "$SSH_AUTH_SOCK" ]; then
  eval "$(ssh-agent -s)"
fi
ssh-add -l &>/dev/null || ssh-add ~/.ssh/id_ed25519 2>/dev/null
```

---

## How It Works

### `/agent-orch:make` -- Feature Lifecycle (Worktree or Branch)

The recommended way to build features. Prompts you to choose **worktree** (isolated checkout for parallel work) or **feature branch** (in-place, simpler), builds with agents, manages the full PR lifecycle, and tracks everything in Jira.

```bash
# Start with a Jira issue (recommended)
/agent-orch:make PROJ-123

# Start with a prompt (Jira issue resolved interactively or created on the fly)
/agent-orch:make Add JWT authentication to the API

# Start with both
/agent-orch:make PROJ-123 Add JWT auth with refresh tokens

# Iterate on the worktree branch as needed
/agent-orch:build

# Run all review skills, post ONE consolidated review on the PR (no stops)
/agent-orch:make-review

# Fix CI failures or review comments
/agent-orch:make-validate

# Merge PR, clean up worktree, back to main
/agent-orch:make-clean
```

| Skill | What It Does |
|-------|-------------|
| `/agent-orch:make <prompt>` | Worktree **or** feature branch + `/build` + commit + push + PR + Jira lifecycle |
| `/agent-orch:make-bug <desc\|JIRA-ID\|URL>` | Worktree **or** feature branch + `/bugfix` (root-cause diagnosis + fix, regression-test-first) + commit + push + PR + Jira lifecycle. Reuses `/make` session state so `/make-validate` and `/make-clean` work unchanged |
| `/agent-orch:make-validate` | Gathers CI failures + review comments, fixes via `/build`, pushes |
| `/agent-orch:make-review` | Autonomously runs all available review skills (`/code-review`, `/security-review`, `/review`, codebase-graph-analyzer `/build-graph` + `/review-pr`) against the PR without stopping and **posts findings to the PR via `gh`**. Default: ONE consolidated `gh pr review` (request-changes if Critical/High, else comment). `per-skill` mode posts **one comment per review skill**. Graph-backed skills degrade gracefully if not installed |
| `/agent-orch:make-clean` | Squash-merges PR, removes worktree (or deletes branch), transitions Jira to Done. **Preserves `release/*` branches** by design — they keep their local and remote refs so future patch releases can be cut from the same line |
| `/agent-orch:create-rfo` | Postmortem call transcript → `incidents/request-for-outages/rfo-NNN.md` (sequentially numbered) + matching PDF, on a `rfo/NNN` branch with PR. Compatible with `/make-validate` |
| `/agent-orch:release-me` | Read latest tag → suggest bumped version → generate `release-notes/<tag>.md` + PDF from commits since last tag → commit → tag → GitHub Release → PR on `release/<tag>`. Compatible with `/make-validate` |

#### Issue Tracker Integration (Jira or GitHub Issues)

`/make` uses a `.make-config.md` file in the repo root to choose an issue-tracker
**backend** and control its behavior. The orchestration skills (`/make`, `/build`,
`/make-clean`, the work queue) talk to a **backend-neutral contract**
([`tracker-provider.md`](plugins/agent-orch/rules/tracker-provider.md)), so a repo can
**swap trackers** by changing one line — the rest of the workflow is identical.

```
tracker: jira      # jira | github | none   ← the backend selector
jira_mode: yes     # yes | no | ask-me      ← applies when tracker: jira
```

| Backend | Setup | Transport | Context cache |
|---------|-------|-----------|---------------|
| **Jira** (default) | `/agent-orch:jira` | `mcp__jira__*` MCP tools | `.claude/rules/jira.md` |
| **GitHub Issues** | `/agent-orch:github-issues` | `gh` CLI on `code.ssnc.dev` | `.claude/rules/github.md` |
| **none** | — | — | (tracker steps skipped) |

`jira_mode` still controls Jira on/off behavior when `tracker: jira`:

| Mode | Behavior |
|------|----------|
| `yes` | Always requires an issue. Search, provide, or create one on the fly. |
| `no` | No tracker integration. Pure git/GitHub-PR workflow. |
| `ask-me` | Prompts each time with option to skip the tracker for that session. |

**Back-compat**: if `tracker:` is absent, `jira_mode` alone is used (`yes`/`ask-me` ⇒
jira, `no` ⇒ none). Existing repos are unaffected — the default is Jira.

**Lifecycle** (same shape on both backends): In Progress (start) → In Review (PR
created) → Done (merged via `/make-clean`). Each issue gets the
`claude-code-agent-harness` label.
- **Jira**: driven by transition IDs (overridable via `jira-workflow.yaml`); start/end
  dates, affects/fix versions.
- **GitHub**: driven by status labels (`status:in-progress` / `status:in-review`, then
  the issue is **closed** for Done) by default, or a Projects v2 Status field if you set
  `status_model: project` in `github-workflow.yaml`. A PR with `Closes #N` auto-closes
  the issue on merge.

Each `/make` session asks whether to use a **worktree** (isolated checkout under `.claude/worktrees/`, multiple features in parallel) or a **feature branch** (new branch in the current working tree, simpler, one feature at a time). `/make-clean` auto-detects the mode when cleaning up.

#### Worktree/Branch Context Enforcement (v2.25.0+, parallel-safe in v2.27.0+, hard-gated in v2.29.0+)

When `/make` creates the worktree or feature branch, it writes a per-Claude
session state file at the **primary** repo root:

```
<repo-root>/.claude/.make-session-<UTC_TIMESTAMP>-<PID>.json
```

Each Claude session writes its OWN file (timestamp + process id), so
multiple Claudes running `/make` in parallel on the same repo never collide.

The schema (v2) captures `session_id`, `mode`, `branch`, `worktree_path`,
`repo_root`, `jira_key`, `started_at`, `invoking_skill`, and `claude_pid`.
The file is gitignored (pattern: `.claude/.make-session-*.json`) and is
removed by `/make-clean` — but ONLY the file matching the merged branch.
Other Claudes' session files are left alone.

**Mechanical enforcement (v2.29.0+).** Enforcement is no longer instruction-only.
A `PreToolUse` hook — [`guard-worktree-writes`](plugins/agent-orch/hooks/guard-worktree-writes.py),
registered automatically by the plugin — inspects every `Write`, `Edit`,
`MultiEdit`, `NotebookEdit`, and `Bash` tool call. While a worktree-mode
session is active, it **hard-blocks (exit 2)** any write whose target lands in
the primary checkout but outside the worktree, and tells the agent the correct
in-worktree path. It is a no-op when no worktree session is active, in
branch mode (in-place edits are legitimate), for writes outside the repo
(`../`, `/tmp`), and under `.claude/`/`.git/`. It fails open if `python3` is
unavailable. The hook discovers the session **from disk on every call** — it
does not rely on environment variables surviving across tool boundaries.

> **Note on `$MAKE_SESSION_FILE`.** `/make` sets this env var as a same-session
> *hint*, but it does NOT cross tool-call or subagent process boundaries (an
> `export` in one Bash call is not seen by the next, nor by spawned agents).
> Anchoring therefore relies on (1) the guard hook reading session files from
> disk, and (2) `/build` prepending an explicit `[worktree-context]` block to
> every subagent prompt — not on inherited env. Earlier docs overstated the
> env var's role; v2.29.0 corrects this.

The full rule lives at
[`plugins/agent-orch/rules/worktree-context.md`](plugins/agent-orch/rules/worktree-context.md).

This fixes the long-standing footgun where a `/build` run (or one of its
subagents) would drift back to the primary checkout and produce commits on
the wrong branch, leaving the worktree empty.

**Read-side compatibility**: `/build` falls back to the legacy single-file
path `.claude/.make-session.json` (v1) if no v2 file matches, so older
sessions started before this scheme keep working until they're cleaned up.

#### Phase Communication (v2.25.0+)

`/make`, `/build`, and `/make-clean` print a visual phase banner at the
start of every phase so you always know where orchestration is:

```
═══════════════════════════════════════════════════════
/build phase 3: Parallel implementation
Launching builders, validator, scribe, and specialists in parallel. Each agent
receives the worktree anchor and MUST stay inside it.
═══════════════════════════════════════════════════════
```

Before every subagent launch you also see a one-line `→ Launching
the agent-orch subagent (with purpose)…` update.

### `/agent-orch:brainstorm` -- Design Before Code

When the requirements or approach aren't pinned down yet, brainstorm first. It's a Socratic design
session: one question at a time, explore 2-3 approaches with trade-offs, and present the design in
small sections you approve incrementally. The **hard gate** means no implementation happens until
you approve the design — "simple" tasks included, because that's where unexamined assumptions cost
the most.

```bash
/agent-orch:brainstorm                          # Start from a blank idea
/agent-orch:brainstorm Real-time notifications  # Start from a seed
/agent-orch:brainstorm PROJ-123                 # Refine a Jira issue into a design
```

The output is an approved `DESIGN.md` under `ssnc-agent-orch/<date>/<feature>/`. Hand it to
`/agent-orch:build` (or `/agent-orch:make`) and the build **skips requirements gathering** — it
already has the agreed scope, approach, and decisions.

```
brainstorm  →  build / make  →  review  →  done
(design)       (implement)      (verify)
```

### `/agent-orch:bugfix` -- Root-Cause Fix

When something's broken, `bugfix` runs a disciplined diagnosis instead of a symptom patch. It
wraps the systematic Debugger (4-phase root cause; a failing **regression test before the fix**)
with a tight fix → verify loop, and it stays anchored to the right worktree/branch.

```bash
/agent-orch:bugfix Login returns 500 on expired tokens
/agent-orch:bugfix PROJ-456                          # Pull the bug report from Jira
/agent-orch:bugfix https://github.com/org/repo/issues/12
```

1. **Debugger** reproduces, traces to the source, writes a failing regression test (RED)
2. **Builder** implements the minimal source-level fix (GREEN) — no symptom patching
3. **Validator** independently verifies the regression test passes and nothing else broke
4. After **3 failed attempts**, it stops and escalates to the **Architect** — the bug is likely
   architectural, not local

Leaner than `/build` (no brainstorming, no Advocate gate, no specialist swarm). For a bug found
mid-build, the Debugger is already wired into `/build`'s review phase — you don't need this skill
there.

### `/agent-orch:build` -- Standalone Mode

Build features without spec-kit. Describe what you want, point at a Jira issue, or hand it a
`/brainstorm` design, and the agents handle the rest.

```bash
/agent-orch:build                        # Conversation-based requirements
/agent-orch:build PROJ-123               # Pull requirements from Jira issue
/agent-orch:build Add user auth to API   # Start with a description
/agent-orch:build ssnc-agent-orch/2026/06/24/auth/DESIGN.md   # Consume a /brainstorm design
```

Claude gathers requirements through conversation (or pulls them from Jira, or consumes a
`/agent-orch:brainstorm` design doc — skipping the questioning phase), then orchestrates:

1. **Architect** analyses your codebase and creates a plan
2. You review and approve the plan + specialist selection + quality targets
3. **All agents launch in parallel** -- Builder (TDD), Validator (comprehensive tests), Scribe, plus relevant specialists
4. **Phase 3.5: Integration Verification** -- build, migrations, seeds, app startup verified
5. **Two-stage review** -- Spec Compliance (Stage 1) then Code Quality (Stage 2)
6. Final summary with all changes

### `/agent-orch:implement` -- Spec-Kit Mode

Use with [GitHub spec-kit](https://github.com/github/spec-kit) for specification-driven implementation.

```bash
# Standard spec-kit workflow first
/speckit.specify       # Write specification
/speckit.plan          # Create plan
/speckit.tasks         # Generate tasks

# Then orchestrate implementation
/agent-orch:implement
```

The agents read your `.specify/` directory and implement according to the spec, with the same quality enforcement pipeline.

### `/agent-orch:analyse` -- Codebase Analysis

Deep-dive analysis of specific areas of your codebase.

```bash
/agent-orch:analyse authentication    # Analyse auth system
/agent-orch:analyse database          # Analyse database layer
```

### `/agent-orch:jira-work` -- Jira Work Queue

Browse, triage, and pick up Jira issues for agent-assisted implementation. Uses [human-on-the-loop](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html) governance -- humans control *which work* agents can pick up via labels, and agents operate autonomously within that harness.

```bash
/agent-orch:jira-work              # Interactive wizard
/agent-orch:jira-work my           # My agent-ready issues
/agent-orch:jira-work open         # All agent-ready open issues
/agent-orch:jira-work triage       # Classify unlabeled issues for agent work
/agent-orch:jira-work PROJ-123     # Work on a specific issue
```

**Label governance:**

| Label | Meaning |
|-------|---------|
| `claude-code-agent-harness` | Agent-ready -- visible in the work queue |
| `human-review-required` | Needs human approval before agent work begins |

Pick an issue, choose `/build` or `/implement`, and the agent pulls requirements from Jira, tracks progress via comments, and transitions the issue through its lifecycle.

See the [Jira Integration Guide](docs/JIRA_INTEGRATION.md) for full details.

### `/agent-orch:github-issues` -- GitHub Issues backend (code.ssnc.dev)

The GitHub Issues counterpart to `/agent-orch:jira` + `/agent-orch:jira-work`, for
repos that track work in **GitHub Issues on `code.ssnc.dev`** instead of Jira. It uses
the `gh` CLI (no MCP server needed) and the **same** human-on-the-loop label
governance, so the work queue and triage behave identically — only the backend differs.

```bash
/agent-orch:github-issues            # Discover repo, cache .claude/rules/github.md
/agent-orch:github-issues work       # Agent-ready work queue (like /jira-work)
/agent-orch:github-issues triage     # Classify unlabeled issues for agent work
/agent-orch:github-issues refresh    # Re-fetch labels/milestones/templates
/agent-orch:github-issues status     # Show what's cached
```

**Swap a repo to GitHub Issues** by setting `tracker: github` in `.make-config.md`.
Then `/make`, `/build`, and `/make-clean` resolve issues (`#123`), assign, comment, and
move status through GitHub automatically via the
[tracker-provider contract](plugins/agent-orch/rules/tracker-provider.md). Identity is
resolved live with `@me` (never cached). Prereq: `GH_HOST=code.ssnc.dev gh auth login`.

The harness labels are identical to Jira:

| Label | Meaning |
|-------|---------|
| `claude-code-agent-harness` | Agent-ready -- visible in the work queue |
| `human-review-required` | Needs human approval before agent work begins |

Status (default `labels` model): `status:in-progress` → `status:in-review` → issue
**closed** for Done. Configure via [`github-workflow.yaml`](examples/ssnc-agent-orch/github-workflow.yaml)
(including an opt-in Projects v2 `project` model).

### First Time Setup

Configure your repo for multi-agent orchestration:

```bash
/agent-orch:init-plugin            # Wizard: discover, configure, and set up CLAUDE.md (recommended)
/agent-orch:setup-claude-md        # Just set up CLAUDE.md hierarchy (if you skip init-plugin)
/agent-orch:setup-constitution     # For spec-kit mode
```

---

## `/agent-orch:olly` -- Observability Setup

Add full-stack OpenTelemetry observability to any codebase.

```bash
/agent-orch:olly
```

Works for three scenarios:
- **Greenfield** -- No existing telemetry. Adds OTel Collector, Prometheus, Loki, Tempo, Grafana, instrumentation, and dashboards from scratch.
- **Brownfield / Cutover** -- Migrates from vendor-specific SDKs (Datadog, New Relic, Splunk, etc.) to OpenTelemetry.
- **Gap Fill** -- Completes a partial OTel setup (e.g., has traces but no dashboards).

All configs use environment variables so the same code works locally (Docker Compose) and in cloud ([olly-kc-dev.ssnc-corp.cloud](https://olly-kc-dev.ssnc-corp.cloud/)).

**SS&C Observability Resources:**
- Platform: [olly-kc-dev.ssnc-corp.cloud](https://olly-kc-dev.ssnc-corp.cloud/)
- Support: [Observability POD Teams Channel](https://teams.microsoft.com/l/channel/19%3aa0048df2ce294dd9a10352be65e5e1e8%40thread.tacv2/Observability%2520POD?groupId=51aaa7fa-6c62-4710-9a24-1443932a894f&tenantId=f4c566ce-a3ce-4b10-b55b-1e9d56ad1b26)

---

## Local MCP Server -- Jira, Confluence, TestRail, Azure DevOps, Playwright, SonarQube, SS&C Cloud, ServiceNow

A bundled MCP server that gives Claude direct access to your project management, QA, browser automation, code quality, cloud infrastructure, and IT-service-management tools. Agents can look up Jira tickets, search Confluence, query TestRail, browse Azure DevOps work items, drive browsers with Playwright, check SonarQube quality metrics, query SS&C Cloud infrastructure, and read ServiceNow incidents / catalog tasks / CMDB / business units -- all without leaving the conversation.

> **Cline users:** See [MCP Integration for Cline](#mcp-integration-for-cline) above for SSE-based setup.

### Quick Start (Claude Code)

```bash
/agent-orch:mcp-setup       # Select services and create config
# Edit ~/.claude/mcp-config.json to add your API tokens
/agent-orch:mcp-start       # Start the server
/mcp                        # Enable services in Claude Code
```

### MCP Setup for OpenCode

1. Copy the entries you need from `.opencode/agent-orch.opencode.example.json` into your project's `opencode.json`
2. Run `/agent-orch:mcp-setup` to configure credentials for each backend
3. Run `/agent-orch:mcp-start` to start the local MCP server
4. Flip `enabled: true` in `opencode.json` for the backends you want
5. Restart OpenCode

### Getting API Tokens

| Service | Where to Get a Token |
|---------|---------------------|
| **Jira (DataCenter)** | Profile icon → API token authentication → New API Token |
| **Jira (Cloud)** | https://id.atlassian.com/manage-profile/security/api-tokens |
| **Confluence (DataCenter)** | Profile → Settings → Personal Access Tokens → Create token |
| **Confluence (Cloud)** | Same Atlassian API token as Jira Cloud |
| **TestRail** | My Settings → API Keys → Add Key (click Save Settings!) |
| **Azure DevOps** | User Settings → Personal access tokens → + New Token (Full access) |
| **Playwright** | No token needed -- run `npx playwright install chromium` to install browser binaries |
| **SonarQube** | Profile icon → My Account → Security → Generate token |
| **SS&C Cloud** | [Cloud Portal API Key](https://ssctech.service-now.com/kb_view.do?sysparm_article=KB0013801) |
| **ServiceNow** | No API token -- ServiceNow uses your username and password (HTTP Basic auth). Set `username`/`password` in mcp-config.json or `SNOW_USER`/`SNOW_PASS` env vars. |

### Configuration

| Tool | Credentials | Server Registration |
|------|-------------|---------------------|
| **Claude Code** | `~/.claude/mcp-config.json` | `~/.claude.json` (mcpServers) |
| **Cline** | `<Cline settings>/mcp-config.json` | `<Cline settings>/cline_mcp_settings.json` |

The setup wizard creates both files automatically. Claude Code uses stdio transport; Cline uses SSE transport on `http://localhost:13999`.

**DataCenter example** (Jira + Confluence):

```json
{
  "port": 13999,
  "jira": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "jira.ssnc-corp.cloud",
    "token": "YOUR_JIRA_TOKEN",
    "scope": "write"
  },
  "confluence": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "confluence.ssnc-corp.cloud",
    "token": "YOUR_CONFLUENCE_TOKEN",
    "scope": "write"
  }
}
```

**Cloud example** (Atlassian Cloud):

```json
{
  "port": 13999,
  "jira": {
    "enabled": true,
    "deploymentType": "cloud",
    "host": "ssctech.atlassian.net",
    "email": "you@example.com",
    "token": "YOUR_ATLASSIAN_API_TOKEN",
    "scope": "write"
  }
}
```

**SS&C Cloud example** (READ-ONLY infrastructure queries):

```json
{
  "sscCloud": {
    "enabled": true,
    "url": "https://portal.ssnc-corp.cloud",
    "apiKey": "YOUR_SSC_CLOUD_API_KEY"
  }
}
```

Or via environment variables:
```bash
export SSC_CLOUD_API_KEY=your-api-key
export SSC_CLOUD_URL=https://portal.ssnc-corp.cloud  # optional, this is the default
```

The SS&C Cloud service is always READ-ONLY (33 query tools, no mutation operations). Use it with `/agent-orch:private-cloud` to query live infrastructure state.

**ServiceNow example** (READ-ONLY incident, sc_task, CMDB, business unit queries):

```json
{
  "servicenow": {
    "enabled": true,
    "url": "https://ssctech.service-now.com",
    "username": "your.username",
    "password": "your-password",
    "scope": "read"
  }
}
```

Or via environment variables:
```bash
export SNOW_URL=https://ssctech.service-now.com
export SNOW_USER=your.username
export SNOW_PASS=your-password
# SNOW_SCOPE defaults to read
```

ServiceNow ships **8 read-only tools** (v1):

| Tool | Purpose |
|------|---------|
| `servicenow_searchTickets` | Query `sc_task` (catalog tasks). Supports `sysparm_query` and `sysparm_fields`. |
| `servicenow_getTicket` | Get an `sc_task` by `sys_id` XOR `number` (SCTASK*). |
| `servicenow_searchIncidents` | Query the `incident` table. |
| `servicenow_getIncident` | Get an incident by `sys_id` XOR `number` (INC*). |
| `servicenow_searchCMDB` | Query `cmdb_ci` with optional `ciClass` (e.g. `cmdb_ci_server`). |
| `servicenow_getCMDBItem` | Get a CMDB item by `sys_id` (table override allowed). |
| `servicenow_listBusinessUnits` | List `business_unit`; falls back to `core_company` on instances without it. |
| `servicenow_listTables` | Static discovery -- lists every table this MCP service knows. |

Catalog variables (`variables.client`, `variables.business_unit`, etc.) must be requested explicitly via the `fields` parameter -- they are not returned by default. See [docs/blog/2026-05-22-servicenow-read-only-mcp.md](docs/blog/2026-05-22-servicenow-read-only-mcp.md) for migration patterns and gotchas.

### Scope

Each service has a `scope` setting:
- `"write"` (default) -- All tools including create/update/delete
- `"read"` -- Read-only tools (no modifications)
- **SS&C Cloud** is always `"read"` regardless of setting (enforced)
- **ServiceNow** defaults to `"read"` and v1 ships only read tools (write tools rejected at runtime)

### Commands

| Command | Description |
|---------|-------------|
| `/agent-orch:mcp-setup` | Interactive wizard to select services and create config files |
| `/agent-orch:mcp-start` | Start the MCP server (installs Bun if needed) |
| `/agent-orch:mcp-stop` | Stop the running MCP server |

### Troubleshooting

- **Services not visible after setup:** Restart Claude Code or start a new session
- **"Needs authentication" error:** Toggle the service off and on in `/mcp`
- **Port already in use:** Change `port` in `~/.claude/mcp-config.json`

See [MCP Setup Guide](plugins/agent-orch/mcp/docs/README.md) for full details including all service configuration options.

---

## `/agent-orch:inherit-plugin` -- Plugin Inheritance

Build a new plugin by inheriting from an existing one. The skill clones a source plugin, walks you through an interactive session to remap its business domain and tech stack, then generates a complete new plugin in your repo.

### Why This Exists

SS&C has dozens of business units -- GIDS, WIT, Intralinks, Health, IDFS, BluePrism, and more. Each unit has different domain terminology, infrastructure preferences, and tooling. But the plugin architecture and quality patterns are the same everywhere.

Instead of copying a plugin repo and doing find-and-replace (which misses hooks, agent personas, rule logic, and convention details), this skill understands the plugin structure and transforms every layer:

- **Agent definitions** -- persona descriptions, tool references, coordination protocols
- **Rules** -- validation logic, domain-specific patterns, URL references
- **Hooks** -- safety gates, command validation, secret detection patterns
- **Conventions** -- framework-specific code standards
- **Skills** -- entry points, context collection, orchestration flow
- **MCP servers** -- service configuration, endpoints

### Quick Start

```bash
/agent-orch:inherit-plugin git@code.ssnc.dev:dt233894/claude-agent-gids-sdd-plugin.git
```

The wizard walks you through four steps:

1. **Inventory** -- Clones the source and shows everything it contains (agents, skills, rules, hooks, conventions, MCP)
2. **Domain mapping** -- Maps business-specific terms (e.g., "GIDS" → "WIT", Jira project keys, Confluence spaces)
3. **Tech stack substitution** -- Swaps technologies (e.g., Vault → AWS Secrets Manager, Spring Boot → FastAPI)
4. **Capability selection** -- Choose which agents, rules, hooks, and conventions to keep, modify, or drop

After you approve the transformation plan, the skill generates the complete plugin structure in your current repo -- marketplace config, plugin manifest, agents, skills, rules, hooks, conventions, and README.

### Real-World Example

The GIDS SDD plugin uses Vault for secrets, Terraform with SS&C Cloud modules, Spring Boot conventions, and Grafana Alloy for monitoring. A team in the Health business unit wants the same operational quality but with:

- AWS Secrets Manager instead of Vault
- Python/FastAPI instead of Spring Boot
- Their own Confluence space and Jira project
- Health-specific domain terminology

```bash
cd ~/dev/ssnc/health/claude-agent-health-plugin
/agent-orch:inherit-plugin git@code.ssnc.dev:dt233894/claude-agent-gids-sdd-plugin.git
```

The wizard detects all GIDS-specific terms, presents them for remapping, swaps the tech stack references, and generates a complete `health-agent-orch` plugin -- ready to install, test, and iterate on.

### What Gets Generated

```
your-repo/
├── .claude-plugin/
│   └── marketplace.json        # Your marketplace registration
├── plugins/[your-plugin-name]/
│   ├── .claude-plugin/
│   │   └── plugin.json         # Your plugin manifest
│   ├── agents/                 # Transformed agent definitions
│   ├── skills/                 # Transformed entry-point skills
│   ├── rules/                  # Domain-specific rules with your terms
│   ├── conventions/            # Tech-stack conventions for your framework
│   ├── hooks/                  # Safety gates for your tooling
│   │   └── hooks.json
│   └── mcp/                    # MCP config (if kept)
└── README.md                   # Generated documentation
```

The generated plugin is a working starting point. Review the rules and hooks for domain accuracy, then push to your git remote for team distribution.

---

## `/agent-orch:init-plugin` -- Plugin Initialization Wizard

A single entry-point wizard that configures any repo for multi-agent orchestration. Discovers the right plugin for your team, configures it, and sets up the CLAUDE.md hierarchy -- all in one command.

```bash
/agent-orch:init-plugin
```

### Why This Exists

The orchestration engine (spec-driven builds, verification gates, multi-agent coordination) is universally useful. But the opinions layered on top -- ISC2 persona, TypeScript conventions, OWASP rules -- are engineering-specific. Legal, sales, compliance, and infrastructure teams need different opinions but the same orchestration.

`/init-plugin` decouples the core from the opinions. The orchestrator is the product; everything else is a swappable plugin.

### How It Works

The wizard runs five phases:

1. **Health Check** -- runs `setup-claude-md` to detect/repair CLAUDE.md hierarchy issues
2. **Detect Context** -- silently scans for tech stack, existing config, git remote
3. **Plugin Selection** -- interactive wizard with four paths:
   - **(a) Software engineering** -- fast path, applies agent-orch defaults (ISC2, engineering conventions, security rules)
   - **(b) Direct entry** -- enter a plugin name or git URL
   - **(c) Conversational search** -- describe what you need, wizard recommends plugins from the catalog
   - **(d) Browse catalog** -- hierarchical drill-down through the SS&C Plugin Discovery catalog
4. **Plugin Configuration** -- shows what the plugin will set up, configures governance layer, MCP integrations, and plugin-specific settings
5. **Apply** -- stores upstream snapshot (for future `/upgrade-plugin` three-way merge), runs `setup-claude-md` with plugin context

### What Gets Created

```
your-repo/
├── CLAUDE.md                          # Lean root (~2k tokens)
├── .claude/
│   ├── rules/                         # Plugin-provided rules (always loaded)
│   │   ├── security-baseline.md
│   │   └── infra-standards.md
│   ├── plugins.json                   # Installed plugin metadata
│   └── plugins/                       # Upstream snapshots for upgrade
│       ├── agent-orch@2.12.0/
│       └── ssc-devops@0.2.0/
├── .ssc-devops/                       # Plugin governance layer (example)
│   ├── coding-standards.md
│   └── infra-standards.md
└── src/api/CLAUDE.md                  # Subdirectory standards
```

### Plugin Discovery

The wizard searches the SS&C Plugin Discovery catalog at `code.ssnc.dev`. Plugins are scored by weighted signal matching:

| Signal | Weight |
|--------|--------|
| Tag match | 3 |
| Capability name match | 3 |
| Description match | 2 |
| Capability type match | 2 |
| Tech stack match | 1 |
| Body content match | 1 |

### Per-Repo Configuration

Different repos get different agent behaviors. `/build` in a React frontend repo loads React conventions and UI/UX agent opinions. `/build` in a Terraform repo loads infrastructure rules and DevOps opinions. Same command, different behavior, driven entirely by what `/init-plugin` configured.

### Multiple Plugins

A repo can compose multiple plugins. Run `/init-plugin` again to add another:

```json
// .claude/plugins.json
{
  "plugins": [
    { "name": "agent-orch", "role": "orchestrator", "version": "2.12.0" },
    { "name": "ssc-devops", "role": "overlay", "version": "0.2.0" }
  ]
}
```

---

## `/agent-orch:upgrade-plugin` -- Seamless Plugin Upgrades

Pulls upstream plugin improvements into your repo while preserving local customizations through three-way merge.

```bash
/agent-orch:upgrade-plugin
```

### Why This Exists

Plugins evolve -- new agents, updated rules, improved conventions. Without an upgrade path, you're stuck choosing between re-running `/init-plugin` (losing customizations) or manually diffing files. `/upgrade-plugin` solves this with a guided walkthrough that respects your local changes.

### How It Works

The wizard runs five phases:

1. **Health Check** -- runs `setup-claude-md` to detect/repair hierarchy issues
2. **Check for Updates** -- reads `.claude/plugins.json`, clones upstream repos, compares versions
3. **Present Changes** -- shows added/changed/removed files per plugin, highlights local overrides
4. **Walk Through Changes** -- one file at a time, user decides each:
   - **Added files**: accept or skip
   - **Changed files (no local mods)**: accept or keep current
   - **Changed files (with local mods)**: merge, keep yours, accept upstream, or view three-way diff
   - **Removed files**: remove or keep locally
5. **Finalize** -- replaces upstream snapshots, updates metadata, runs `setup-claude-md`

### Three-Way Merge

When you've customized a file that the upstream also changed, the wizard uses the snapshot from `/init-plugin` as the merge base:

```
Base:     .claude/plugins/agent-orch@2.12.0/rules/security-baseline.md
Upstream: (new version from git)
Local:    .claude/rules/security-baseline.md (your working copy)
```

The wizard assesses conflict risk and recommends a strategy:

| Risk | When | Recommendation |
|------|------|----------------|
| LOW | Upstream only adds, your changes untouched | Auto-merge |
| MEDIUM | Both changed different sections | Show merge preview |
| HIGH | Both changed same lines | Manual resolution |

### Audit Trail

Every upgrade decision is recorded in `.claude/upgrade-state.json` for auditability and replay:

```json
{
  "upgrades": [{
    "plugin": "agent-orch",
    "fromVersion": "2.12.0",
    "toVersion": "2.14.0",
    "decisions": [
      { "file": "agents/core/orchestrate-incident-responder.md", "type": "added", "action": "accept" },
      { "file": ".claude/rules/security-baseline.md", "type": "changed", "action": "merge" }
    ]
  }]
}
```

### Version Skipping

Skipping versions works correctly. The three-way merge uses the installed snapshot as base and the current upstream as target -- intermediate versions don't matter.

---

## Quality Enforcement Pipeline

The plugin enforces production-quality code through multiple layers. All defaults are configurable.

### Pipeline Phases

```
Phase 0: Coordination Mode + Jira Detection + Preliminary Complexity Assessment
Phase 1: Requirements Gathering
Phase 1.5: Advocate Gate (hard gate for complexity >= 4 or infra/security/cross-team)
Phase 2: Architect Planning & Specialist Selection
Phase 3: Parallel Implementation (TDD, No Scaffolding)
Phase 3.5: Integration Verification (Build, Migrations, Seeds, App Startup)
Phase 4: Two-Stage Code Review (Spec Compliance + Code Quality)
Phase 5: Finalization
```

#### Phase 1.5: Advocate Gate (Hard Gate)

When `/build` detects preliminary complexity >= 4 OR when the prompt mentions infrastructure, security, or cross-team coordination, **Phase 1.5 becomes a hard gate**. The Advocate agent runs BEFORE Architect to challenge assumptions, discover existing platform services, and detect conflicts via Jira.

**Why this matters:** Complex features benefit from skeptical review before committing to an architecture. The Advocate creates cross-team tickets, identifies reusable services, and prevents scope creep. Without this gate, sessions waste tokens on plans that need fundamental revision.

**Bypass (when appropriate):** Set `ADVOCATE_ENFORCE: false` in `.claude/rules/build-overrides.md` to make the gate advisory only. A warning will be logged to `STATUS.md` when bypassed.

### Default Quality Targets

| Target | Default | Override Key | Description |
|--------|---------|-------------|-------------|
| **Line Coverage** | 100% | `COVERAGE_TARGET: 80%` | Minimum unit test line coverage |
| **Branch Coverage** | 100% | `BRANCH_COVERAGE_TARGET: 80%` | Minimum unit test branch coverage |
| **Pass Rate** | 100% | `PASS_RATE_TARGET: 100%` | Minimum test pass rate |
| **TDD Mode** | enforced | `TDD_MODE: optional` | RED-GREEN-REFACTOR cycle required |
| **Playwright E2E** | required (UI) | `PLAYWRIGHT_TESTS: optional` | E2E tests for UI features |
| **Integration Verification** | required | `INTEGRATION_VERIFICATION: optional` | Build/migration/startup checks |

To override, create `.claude/rules/build-overrides.md` in your project:

```markdown
# Build Overrides

## Quality Targets
COVERAGE_TARGET: 80%
BRANCH_COVERAGE_TARGET: 80%
PASS_RATE_TARGET: 100%
TDD_MODE: optional
PLAYWRIGHT_TESTS: optional
INTEGRATION_VERIFICATION: optional
```

> **Important:** Do NOT add overrides to `CLAUDE.md`. Files in `.claude/rules/` are auto-loaded by all agents and keep `CLAUDE.md` lean. See [CLAUDE.md Protection](#claudemd-protection) below.

---

### Test-Driven Development (TDD)

**Enabled by default.** The Builder agent follows the RED-GREEN-REFACTOR cycle for every feature:

1. **RED** -- Write a failing test that describes the expected behavior
2. **GREEN** -- Write the minimum code to make the test pass
3. **REFACTOR** -- Clean up without changing behavior

The Builder reports TDD evidence for each task in `STATUS.md`:

```
Task: User registration
TDD Cycle: RED (test written) -> GREEN (passes) -> REFACTOR (clean)
Test file: src/auth/__tests__/register.test.ts
Tests: 8 passing, 0 failing
```

**To disable TDD** (implementation-first with tests after): set `TDD_MODE: optional` in `.claude/rules/build-overrides.md`.

---

### Comprehensive Test Coverage

The Validator agent writes comprehensive tests targeting the configured coverage threshold (default 100%). Tests must cover:

- Happy path (normal expected behavior)
- Error paths (what happens when things go wrong)
- Edge cases (boundary conditions, empty inputs, null values, max values)
- Negative tests (invalid inputs, unauthorized access, malformed data)
- Integration points (how components interact with dependencies)

If coverage falls below the target, the Validator writes additional tests until the target is met or documents why specific code is untestable.

---

### Playwright E2E Tests (UI Features)

**Required by default for any feature that includes UI changes.** The Validator writes Playwright tests covering:

- Complete user flows from start to finish
- Form interactions (fill, submit, validation errors, success states)
- Navigation (route changes, breadcrumbs)
- Error states (network errors, server errors, validation errors)
- Loading states and empty states
- Accessibility via axe-core integration
- Responsive behavior at mobile and desktop breakpoints

The UI/UX agent reviews Playwright test coverage and requests missing tests from the Validator.

**To make Playwright tests optional**: set `PLAYWRIGHT_TESTS: optional` in `.claude/rules/build-overrides.md`.

---

### No Scaffolding Policy

**Enforced by default.** The Builder agent never creates placeholder or stub implementations. Every piece of code must be fully functional:

| What | Requirement |
|------|-------------|
| **UI Components** | Real data handling, loading states, error states, empty states, responsive layout, accessibility |
| **Forms** | Full validation (client + server), submission handling, error display, success feedback |
| **API Endpoints** | Full request parsing, validation, business logic, error handling, proper HTTP status codes |
| **Database Operations** | Proper queries, error handling, transaction management |
| **Background Jobs** | Full processing logic, error recovery, retry handling, logging |

**Forbidden patterns** (caught by Spec Reviewer and Quality Reviewer):
- `// TODO`, `// FIXME`, `// HACK` comments
- Empty function bodies or `throw new Error('Not implemented')`
- Placeholder text ("Lorem ipsum", "Coming soon")
- Components that only render a title
- API endpoints returning hardcoded mock data
- Forms without validation

**Scaffolding IS allowed when**: the spec or PLAN.md explicitly marks a task as "scaffold only", or the user requests it.

---

### Integration Verification (Phase 3.5)

**Runs after implementation and before code review.** The DevOps agent verifies the full system works:

| Check | What It Verifies |
|-------|-----------------|
| **Full Build** | Zero compilation/type errors |
| **DB Migrations** | All pending migrations complete without error |
| **DB Seeds** | Seed data created successfully |
| **App Startup** | Application boots and responds to health check |
| **Lint & Type Check** | Zero linter errors, zero type errors |

If any check fails, the relevant agent (Builder or Database) is launched to fix the issue before review begins.

**To skip integration verification**: set `INTEGRATION_VERIFICATION: optional` in `.claude/rules/build-overrides.md`.

---

### Two-Stage Code Review

Code must pass both stages sequentially:

**Stage 1: Spec Compliance (Spec Reviewer)**
- Verifies implementation matches requirements exactly
- Distrusts implementer claims -- reads actual code independently
- Detects scaffolding and incomplete implementations
- Checks for scope creep (unrequested additions)
- Must PASS before Stage 2 begins

**Stage 2: Code Quality (Quality Reviewer)**
- Validates against project constitution/CLAUDE.md standards
- Convention compliance verification
- Coverage target verification (runs actual coverage report)
- Scaffold detection
- Playwright test verification (UI features)
- TDD evidence verification (if TDD mode enforced)
- Issues categorized: CRITICAL > HIGH > MEDIUM > LOW

Both stages support iterative refinement -- agents fix issues and re-submit for review, up to 3 rounds before escalating to the user.

---

## The 26 Agents

### Core Team (Always Active)

| Agent | What It Does |
|-------|-------------|
| **Architect** | Reads specs, analyses codebase, creates plans, selects specialists, resolves conflicts |
| **Builder** | Implements features using TDD (RED-GREEN-REFACTOR). No scaffolding. Verification gate: must provide evidence before marking complete |
| **Validator** | Writes comprehensive tests targeting 100% coverage. Playwright e2e for UI features. Verification gate: must show actual test output |
| **Scribe** | Documents completed features, creates usage examples, maintains API docs |

### Review Team (Two-Stage Quality Gate)

| Agent | What It Does |
|-------|-------------|
| **Spec Reviewer** | Stage 1: Verifies implementation matches spec exactly. Detects scaffolding and incomplete implementations. Must PASS before Stage 2 |
| **Quality Reviewer** | Stage 2: Reviews code against project standards. Verifies coverage targets, TDD evidence, Playwright tests, no scaffolding. Only runs after Stage 1 passes |

### Support Team

| Agent | What It Does |
|-------|-------------|
| **Debugger** | 4-phase methodology: Root Cause -> Pattern Analysis -> Hypothesis Testing -> Fix. No fixes without root cause |

### Specialist Agents (Activated When Relevant)

| Agent | Activated When | What It Does |
|-------|----------------|-------------|
| **Security Auditor** | Auth, user input, APIs, sensitive data | OWASP Top 10 review, auth/authz, input validation, injection risks |
| **Performance Analyst** | DB queries, loops, caching, real-time | N+1 detection, bottleneck analysis, memory leak detection, caching recommendations |
| **DevOps Engineer** | CI/CD, Docker/K8s, deployment changes | CI/CD pipelines, Docker configs, K8s manifests. **Post-implementation integration verification**: build, migrations, seeds, app startup |
| **Telemetry Engineer** | Observability, monitoring, tracing | OTel Collector config, Docker Compose stack (Prometheus, Loki, Tempo, Grafana), dashboards, instrumentation |
| **Observability Engineer** | Production monitoring, SRE practices | End-to-end observability strategy, SLO/SLI definition, alert tuning, on-call runbooks |
| **Database Architect** | Schema changes, migrations | Schema design, migration scripts, query optimization, indexes. **Migration/seed verification**: runs migrations, seeds, data integrity checks, rollback testing |
| **Data Engineer** | ETL, data pipelines, analytics | Data pipeline architecture, transformation logic, data quality checks, batch/stream processing |
| **API Designer** | New endpoints, API modifications | RESTful design, OpenAPI specs, API consistency, request/response schemas |
| **UI/UX Designer** | React/frontend, design system | Design system compliance (Bluestone or custom), WCAG 2.1 AA accessibility, design tokens. **Reviews Playwright e2e test coverage** and requests missing tests. **Tri-modal**: Bluestone enforcement, custom design system, or continuous-maintain |
| **Refactorer** | Legacy code, complex functions | Code smells, technical debt, safe refactoring scope |
| **Legacy Modernizer** | Legacy system upgrades, tech debt | Modernization strategy, incremental migration, strangler fig pattern, risk mitigation |
| **Migration Specialist** | Framework upgrades, breaking changes | Migration paths, backward compatibility, rollback procedures |
| **ML Engineer** | ML models, training pipelines, inference | Model architecture, training loops, evaluation metrics, serving infrastructure |
| **C4 Scribe** | Architecture changes, new services | C4 model documentation (System Context, Container, Component) using Mermaid diagrams |
| **Content Specialist** | Documentation, user guides, training | Technical writing, API documentation, user guides, training materials |
| **Incident Responder** | Production incidents, outages | Incident triage, root cause analysis, mitigation steps, postmortem reports |
| **Advocate** | Architecture decisions, cross-team impact | Challenges assumptions, discovers platform services, detects conflicts via Jira, creates cross-team tickets |
| **Private Cloud Engineer** | Terraform, SS&C Cloud, hybrid cloud | SS&C `terraform-provider-ssccloud` + AWS hybrid cloud. HCL generation, module design, security hardening, `terraform validate` |
| **Jira Triage** | Backlog classification | Analyses issues and codebase, suggests `claude-code-agent-harness` or `human-review-required` labels |

---

## Enforcement Rules

The `/agent-orch:enforce` command converts recurring issues into permanent, deterministic checks. When you notice a pattern problem that keeps coming back, run:

```bash
/agent-orch:enforce "Builder keeps using default exports instead of named exports"
```

The Enforcer agent creates:

```
.claude/enforce/
  rules.json                        # Rule registry
  rules/[rule-id]/rule.[ext]        # AST-aware linter rule (ESLint, Ruff, etc.)
  rules/[rule-id]/rule.test.[ext]   # Test cases for the rule
  prompts/[rule-id].md              # Agent directive injected into spawn prompts
  hooks/enforce-check.sh            # Master hook script
```

Enforcement rules are automatically injected into agent prompts during Phase 3, and the master hook runs after implementation to catch violations before code review.

### Supported Stacks

| Stack | Linter Rule Format |
|-------|--------------------|
| TypeScript | ESLint rule |
| Python | Ruff rule |
| Go | go/analysis analyzer |
| Rust | Clippy lint |
| Java | PMD rule |
| C# | Roslyn analyzer |

---

## Bluestone Design System

The `/agent-orch:refactor-to-bluestone` skill activates SS&C's Bluestone design system for UI work. This modifies the UI/UX agent's behavior to enforce Bluestone design tokens, components, and accessibility standards.

### Three Operating Modes

The UI/UX agent (`orchestrate-uiux`) operates in one of three modes, determined by `.bluestone/config.md` in your project root:

| Mode | When | Behavior |
|------|------|----------|
| **Bluestone** | After running `/agent-orch:refactor-to-bluestone` | Enforces Bluestone tokens, `@sds/*` components, color palette, accessibility |
| **Custom** | When custom design system docs provided | Follows user-supplied design system documentation |
| **Continuous Maintain** | No `.bluestone/config.md` exists | **Default mode** - Preserves existing UI exactly, invents nothing |

**Default behavior**: The UI/UX agent starts in continuous-maintain mode and preserves existing UI patterns without inventing new styles or components. To activate Bluestone enforcement, you must explicitly run `/agent-orch:refactor-to-bluestone`.

### Activating Bluestone

```bash
/agent-orch:refactor-to-bluestone
```

The wizard walks you through:

1. **Tech stack detection** - Identifies React vs non-React projects
2. **Package installation** (React projects):
   - Configures Artifactory registry: `@sds:registry=https://artifactory.ssnc.dev/artifactory/api/npm/enterprise-npm-repo`
   - Guides installation of `@sds/core`, `@sds/react`, `@sds/icons`, `@sds/charts`, `@sds/react-charts`, `@sds/custom-elements`
   - Links to DevX POD Teams channel for Artifactory support
3. **Token setup** (non-React projects):
   - CSS variables for Bluestone color tokens
   - Typography tokens
   - Spacing and layout tokens
4. **Configuration** - Creates `.bluestone/config.md` with mode and component inventory

### Bluestone Component Packages

| Package | Purpose |
|---------|---------|
| `@sds/core` | Core design tokens (colors, spacing, typography) |
| `@sds/react` | React component library |
| `@sds/icons` | Iconography system |
| `@sds/charts` | Data visualization components |
| `@sds/react-charts` | React chart components |
| `@sds/custom-elements` | Web components (framework-agnostic) |

### Artifactory Setup

The Bluestone packages are hosted on SS&C's internal Artifactory registry. The wizard guides the setup process:

```bash
# Add registry to .npmrc (wizard does this automatically)
@sds:registry=https://artifactory.ssnc.dev/artifactory/api/npm/enterprise-npm-repo
```

**Need help with Artifactory access?** The wizard provides a direct link to the DevX POD Teams channel: [DevX POD](https://teams.microsoft.com/l/channel/19%3Aa44d4548f87b4babb61648a91333eac5%40thread.tacv2/DevX%20Pod?groupId=1ca13069-d921-402e-82fb-4f67e7830b80&tenantId=f4c566ce-a3ce-4b10-b55b-1e9d56ad1b26)

### Custom Design Systems

If you have a design system other than Bluestone:

```bash
/agent-orch:refactor-to-bluestone
# Select "Use custom design system"
# Provide path to your design system documentation
```

The UI/UX agent will follow your custom design system instead of Bluestone.

### Example Workflow

```bash
# Step 1: Activate Bluestone enforcement
/agent-orch:refactor-to-bluestone
# → Wizard configures Artifactory, installs packages, creates .bluestone/config.md

# Step 2: Build features with Bluestone enforcement
/agent-orch:build "Add user dashboard"
# → UI/UX agent enforces Bluestone tokens and @sds/* components

# Step 3: Verify compliance
# → Quality Reviewer checks for Bluestone token usage and component patterns
```

### Deactivating Bluestone

To return to continuous-maintain mode:

```bash
rm -rf .bluestone/
```

The UI/UX agent will revert to preserving existing UI patterns without imposing design system opinions.

---

## Extensibility

The plugin supports opt-in extensibility for both skills and agents. Teams can inject repo-specific context, override agent behavior, or offload git/Jira workflows to external repositories — all without changing any default behavior.

**Hard invariant — zero behavior change by default.** If your config file is absent, unreadable, malformed, or contains no entry for a skill or agent (or an empty entry), that skill or agent behaves exactly as it does today. Extensibility is strictly additive and opt-in.

### Configuration Files

The plugin recognizes two configuration directories in your consuming repository:

| Plugin | Config Directory | Files |
|--------|------------------|-------|
| `agent-orch` | `.claude/ssnc-agent-orch/` | `skills.yaml`, `agents.yaml`, `tracker.yaml`, `jira-workflow.yaml`, `github-workflow.yaml`, `git-workflow.yaml` |
| `team-work` | `.claude/ssnc-team-work/` | `skills.yaml`, `agents.yaml` |

These files ship (via `/agent-orch:init-plugin`, `/agent-orch:upgrade-plugin`, or by copying from `examples/`) **fully commented out**, listing every skill and agent. Uncomment exactly what you want to extend. A commented-out file is equivalent to no file: zero behavior change.

### Agent Extension: `before` / `replace` / `after`

Every agent supports three optional extension keys in `agents.yaml`:

- **`before`** — list of targets (file globs, markdown paths, loop-library refs, skill names) run **before** the agent's own instructions. Use this to inject repo-specific context like ADRs, standards, or checklists.
- **`replace`** — when non-empty, your target **replaces** the plugin's agent entirely. Your agent becomes the agent for that role.
- **`after`** — like `before`, but runs **after** the agent finishes. Typical use: run a `/loop-library` loop or a repo post-processing checklist.

**Example — Architect with ADRs and a loop:**

```yaml
agents:
  architect:
    before:
      - docs/adr/*                      # feed every ADR to the architect first
    replace:                            # leave empty → our architect runs
    after:
      - .loop-library/architect.yaml    # run a loop-library loop afterwards
```

**Example — Security agent with pre-check:**

```yaml
agents:
  security:
    before:
      - docs/security/checklist.md      # read repo security standards first
    replace:
    after: []
```

### Skill Hook Points

Every skill exposes **named hook points** where you can inject targets. Each hook point is a list of targets to run at that point in the skill's lifecycle.

**Core skill hook points:**

| Skill | Hook Points |
|-------|-------------|
| `make` | `before_commit`, `before_pr`, `after_pr` |
| `make-bug` | `before_commit`, `before_pr`, `after_pr` |
| `build` | `before_plan`, `after_plan`, `before_review`, `after_build` |
| `make-clean` | `before_merge`, `after_merge` |
| `make-validate` | `before_validate`, `after_validate` |

Other skills expose hook points documented in their own `## Extensibility` section (most expose a `before` / `after` pair).

**Example — `/make` with formatting, review loop, and notification:**

```yaml
skills:
  make:
    before_commit:                       # after /build, before staging+commit
      - scripts/format.sh
    before_pr:                           # after push, before `gh pr create`
      - .loop-library/pre-pr-review.yaml #   run a bounded review loop
      - docs/checklists/pr-ready.md      #   then read-and-act a checklist
    after_pr:                            # after the PR is opened
      - scripts/notify-team.sh
```

**Example — `/build` with automatic simplification:**

```yaml
skills:
  build:
    after_build:  [/agent-orch:simplify]
```

**Target syntax:**
- `scripts/foo.sh` or `foo.py` → run a script step
- `docs/checklist.md` or `docs/adr/*` → read-and-act on markdown
- `.loop-library/foo.yaml` → run a loop-library loop
- `/agent-orch:simplify` → invoke a skill inline

### Pluggable Jira Workflow

Override Jira transition IDs, custom-field IDs, and lifecycle steps via `jira-workflow.yaml`:

```yaml
jira:
  enabled: true                          # false → skip Jira entirely
  transitions:
    in_progress: "21"
    in_review:   "31"
    done:        "41"
  fields:
    start_date:  "customfield_10015"
    end_date:    "customfield_10016"
  lifecycle:                             # optional extra steps at events
    on_start:  [docs/jira/on-start.md]
    on_review: [scripts/post-pr-to-jira.sh]
    on_done:   [docs/jira/on-done.md]
```

If `jira-workflow.yaml` exists and `jira.enabled` is set, skills use its values in place of hard-coded defaults.

### Pluggable Issue Tracker (Jira ⇄ GitHub Issues)

Select the tracker backend with `tracker.yaml` (or `.make-config.md` `tracker:`), and
configure the GitHub status lifecycle with `github-workflow.yaml`:

```yaml
# .claude/ssnc-agent-orch/tracker.yaml
tracker:
  provider: github                       # jira | github | none

# .claude/ssnc-agent-orch/github-workflow.yaml
github:
  enabled: true
  status_model: labels                   # labels (default) | project
  statuses:
    in_progress: "status:in-progress"
    in_review:   "status:in-review"
    done:        close                    # `close` ⇒ gh issue close
```

The orchestration skills use the normalized verbs in
[`tracker-provider.md`](plugins/agent-orch/rules/tracker-provider.md), so swapping the
provider changes the backend without touching the workflow. Absent everything ⇒ Jira,
unchanged. Full contract: extensibility framework §6.

### Pluggable Git Workflow (External-Repo Offload)

Offload git/PR steps to an external repository that owns the actual scripts and markdown:

```yaml
git:
  source: git@code.ssnc.dev:BluedoorAIUK/test_codeReviewFlow.git
  ref: main                              # branch, tag, or SHA
  steps:                                 # hook point → paths WITHIN the cloned repo
    before_pr:
      - scripts/lint.sh
      - flows/review.md
    after_pr:
      - scripts/post-merge-checks.sh
```

**Clone-and-run mechanism:**
1. On first use in a session, shallow-clone `source` at `ref` to `.claude/ssnc-agent-orch/.cache/<repo-name>@<ref>/`
2. Reuse the cache for the rest of the session; refresh if `ref` changes
3. Run each target from the cache dir at the documented hook points
4. `.claude/ssnc-agent-orch/.cache/` is git-ignored

The skill shows `source`/`ref` and steps, and gets confirmation before the first run in a session (unless in an auto-approved permission mode).

### team-work Extensibility

The `team-work` plugin supports the same model. Configuration lives in `.claude/ssnc-team-work/`.

**Example — Work-publish hooks:**

```yaml
skills:
  work-publish:
    before_publish: [scripts/check-pages-perms.sh]
    after_publish:  [scripts/announce-site.sh]
```

### Getting Started

**Step 1: Copy the templates**

```bash
# For agent-orch
mkdir -p .claude/ssnc-agent-orch
cp examples/ssnc-agent-orch/*.yaml .claude/ssnc-agent-orch/

# For team-work
mkdir -p .claude/ssnc-team-work
cp examples/ssnc-team-work/*.yaml .claude/ssnc-team-work/
```

Or run `/agent-orch:init-plugin` or `/agent-orch:upgrade-plugin` — they scaffold the config files automatically.

**Step 2: Uncomment what you want**

Open the relevant config file and uncomment the skill or agent you want to extend.

**Step 3: Run the skill or agent**

The plugin will detect the config and run your extension targets at the documented hook points.

**Step 4: Revert (just comment it out)**

To revert, comment out the extension config again. Zero behavior change.

### Full Contract

For the authoritative rules and resolution algorithm, see:
- **Full blog post with examples**: [`docs/blog/2026-06-25-extensible-skills-and-agents.md`](docs/blog/2026-06-25-extensible-skills-and-agents.md)
- **Contract**: [`plugins/agent-orch/rules/extensibility.md`](plugins/agent-orch/rules/extensibility.md)
- **Resolver snippet**: [`plugins/agent-orch/rules/extension-resolver.md`](plugins/agent-orch/rules/extension-resolver.md)
- **Examples**: [`examples/ssnc-agent-orch/`](examples/ssnc-agent-orch/) and [`examples/ssnc-team-work/`](examples/ssnc-team-work/)

---

## Code Conventions

The plugin ships with language-specific coding conventions that agents automatically reference. Located in `plugins/agent-orch/conventions/`:

| Language | File | Key Rules |
|----------|------|-----------|
| **TypeScript** | `conventions/typescript.md` | Named exports only, no `any` types, `interface` for objects, `===` equality, function declarations, `Record<K,V>` for dictionaries, `as` assertions |
| **Python** | `conventions/python.md` | Type hints required, pytest fixtures, `snake_case`, absolute imports, dataclasses/Pydantic, specific exception catching |
| **Go** | `conventions/go.md` | Small interfaces (1-3 methods), table-driven tests, `errgroup` for parallel ops, never ignore errors |
| **Rust** | `conventions/rust.md` | Rust-specific conventions |
| **Java** | `conventions/java.md` | Java-specific conventions |
| **C#** | `conventions/csharp.md` | C#-specific conventions |

### How Conventions Are Applied

1. During setup, the plugin detects your tech stack (via `tsconfig.json`, `pyproject.toml`, `go.mod`, etc.)
2. A `conventions.md` file is generated referencing the correct convention file
3. All code-writing agents read conventions before their first code change
4. The Quality Reviewer verifies convention compliance during Stage 2 review

### Project Overrides

If `.conventions/convention.md` exists in your project root, those rules take precedence over the plugin's built-in conventions.

---

## Agent Teams (Experimental)

For complex features, agents can coordinate directly with each other using Claude Code's experimental [Agent Teams](https://code.claude.com/docs/en/agent-teams) feature.

### Enable Agent Teams

Add to your `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "teammateMode": "in-process"
}
```

### How It Works

The plugin automatically calculates a complexity score after the Architect analyses your task:

| Score | Mode | Behavior |
|-------|------|----------|
| 1-3 | Subagents | Traditional mode, automatic |
| 4-5 | Ask | System asks you to choose |
| 6+ | Agent Teams | Strongly recommended, agents message each other directly |

**Complexity score** = specialists + (cross-layer changes ? 2 : 0) + expected iterations + task dependencies

With agent teams, agents iterate directly -- Builder and Validator fix issues without orchestrator mediation, Security flags vulnerabilities to Builder in real-time, and specialists coordinate database/API contracts directly.

### Display Modes

| Agent Count | Recommended Mode | Setup |
|-------------|-----------------|-------|
| 3-5 agents | Split panes (tmux) | `"teammateMode": "tmux"` |
| 6+ agents | In-process | `"teammateMode": "in-process"` |
| VS Code terminal | In-process only | `"teammateMode": "in-process"` |

### Quality Enforcement Hooks

Two hooks enforce verification gates in agent teams mode:

- **TaskCompleted** -- Blocks completion without verification evidence
- **TeammateIdle** -- Prevents agents from going idle with incomplete tasks

See `plugins/agent-orch/hooks/README.md` for setup instructions.

---

## Session Management

### Standalone Mode Sessions

Each `/agent-orch:build` run creates a session directory:

```
project-root/
  ssnc-agent-orch/
    2026-03-27-auth-feature/
      prompt.md         # Original prompt + clarifying Q&A (session provenance)
      PLAN.md           # Requirements, tasks, quality targets
      STATUS.md         # Agent progress, test results, review findings
      COORDINATION.md   # Agent team metadata (if using teams)
      conventions.md    # Detected tech stack conventions
      ADVOCATE-REVIEW.md # (optional) Advocate decision audit (only documented side-file)
```

**`prompt.md`** is written immediately after the session directory is created
and BEFORE `PLAN.md` is drafted. It captures the verbatim prompt you typed,
the clarifying questions the build skill asked (with your answers), and the
final scope summary once the plan is approved. When you revisit an old
session to figure out *why* a plan was scoped a particular way,
`prompt.md` is the provenance record — no need to dig through transcripts.

#### Session File Contract

Every `/build` session produces the same documented set of files, regardless of which specialists run:

**Canonical files (always present):**
- **`prompt.md`** - Original prompt, clarifying Q&A, and final scope summary (session provenance)
- **`PLAN.md`** - Requirements, tasks, quality targets, specialist selection
- **`STATUS.md`** - Single sink for ALL agent findings. Every agent appends a named section (e.g., `## Builder Findings`, `## Validator Findings`, `## Security Findings`) instead of creating its own side-file

**Optional files (created when needed):**
- **`conventions.md`** - Architect-generated stack conventions (detected during Phase 2)
- **`ADVOCATE-REVIEW.md`** - Advocate decision audit trail (the ONLY documented side-file exception)
- **`COORDINATION.md`** - Agent Teams metadata (when using teams mode)

**Forbidden patterns:**
Agents do NOT create `*-REVIEW.md`, `*-STATUS.md`, `*-NOTES.md`, `POSTMORTEM.md`, `PR_BODY.md`, or `ADR-*.md` files. All findings append to `STATUS.md`. The Advocate's `ADVOCATE-REVIEW.md` is the sole exception because it's a user-facing decision audit surfaced before Architect runs.

### Useful Commands

```bash
# List today's sessions (date-tree layout)
ls -lt ssnc-agent-orch/$(date +%Y/%m/%d)/

# Find a session by name across all dates (works for both layouts)
find ssnc-agent-orch -type d -name "*auth-feature*"

# View a session (date-tree layout, v2.27.0+)
cat ssnc-agent-orch/2026/05/26/auth-feature/prompt.md   # why this scope?
cat ssnc-agent-orch/2026/05/26/auth-feature/PLAN.md
cat ssnc-agent-orch/2026/05/26/auth-feature/STATUS.md

# Legacy flat layout still works for older sessions
cat ssnc-agent-orch/2026-03-27-auth-feature/PLAN.md

# Clean old sessions (older than 30 days, both layouts)
find ssnc-agent-orch -type d -mtime +30 -exec test -f "{}/PLAN.md" \; -exec rm -rf {} \;
```

### Git Integration

To exclude sessions from version control:

```bash
echo "ssnc-agent-orch/" >> .gitignore
```

To commit sessions as documentation (useful for team visibility):

```bash
git add ssnc-agent-orch/
git commit -m "Add build session: auth-feature"
```

---

## Configuration Reference

### Quality Target Overrides

Add any of these to `.claude/rules/build-overrides.md` in your project to override defaults:

```markdown
# Build Overrides

COVERAGE_TARGET: 80%
BRANCH_COVERAGE_TARGET: 80%
PASS_RATE_TARGET: 100%
TDD_MODE: optional
PLAYWRIGHT_TESTS: optional
INTEGRATION_VERIFICATION: optional
ADVOCATE_ENFORCE: true
```

> **Why `.claude/rules/` instead of `CLAUDE.md`?** Files in `.claude/rules/` are auto-loaded by all agents -- same visibility as `CLAUDE.md`. But `CLAUDE.md` is the project constitution (human-owned, lean). Agents are prohibited from writing to `CLAUDE.md` to prevent context bloat and drift. See the `claude-md-protection` rule.

### Agent Model Overrides

Default models are configured per agent. To override for your project, add to `.claude/rules/build-overrides.md`:

```markdown
## Agent Model Overrides
- orchestrate-builder: opus      # Use Opus for complex implementations
- orchestrate-security: opus     # Use Opus for critical security reviews
- orchestrate-validator: opus    # Use Opus for test strategy
```

| Agent | Default Model | Rationale |
|-------|--------------|-----------|
| Architect | opus | Complex planning and coordination |
| Spec Reviewer | opus | Skeptical verification requires deep reasoning |
| Quality Reviewer | opus | Constitution compliance and pattern analysis |
| Debugger | opus | Root cause analysis |
| Builder | sonnet | Implementation speed; Architect already planned |
| Validator | sonnet | Test execution within clear targets |
| Scribe | sonnet | Documentation from clear requirements |
| All Specialists | sonnet | Domain review within defined scope |

### CLAUDE.md Protection

`CLAUDE.md` files are **human-owned**. All agents are prohibited from writing to, editing, or appending to any `CLAUDE.md` file. This is enforced by the `claude-md-protection` rule in `plugins/agent-orch/rules/`.

**Why this matters:**
- Uncontrolled agent writes cause CLAUDE.md bloat (46k+ tokens when it should be ~2k)
- Bloated CLAUDE.md wastes context on every agent spawn, reducing quality
- `/agent-orch:setup-claude-md` creates a lean hierarchy; agent writes undo that work
- `/agent-orch:upgrade-plugin` cannot safely merge files agents have modified unpredictably

**Where agents write instead:**

| Need | Location |
|------|----------|
| Build configuration overrides | `.claude/rules/build-overrides.md` |
| Session conventions | `${SESSION_DIR}/conventions.md` |
| Agent notes and findings | `${SESSION_DIR}/STATUS.md` or `PLAN.md` |

If you need to update CLAUDE.md, run `/agent-orch:setup-claude-md`.

---

## Documentation

Full documentation: **[docs/](docs/README.md)**

### Guides

| Document | What It Covers |
|----------|---------------|
| [Installation Guide](docs/INSTALLATION.md) | Install via marketplace, script, or Cline |
| [User Guide](docs/USER_GUIDE.md) | How to use the plugin effectively |
| [Quick Reference](docs/QUICK_REFERENCE.md) | Single-page cheat sheet |
| [Jira Integration](docs/JIRA_INTEGRATION.md) | Work queues, label governance, team coordination, `/build JIRA-ID` |
| [Architecture](docs/ARCHITECTURE.md) | Design philosophy, agent tiers, patterns |
| [Configuration](docs/CONFIGURATION.md) | Quality targets, model overrides, all settings |

### Advanced

| Document | What It Covers |
|----------|---------------|
| [Agent Teams](docs/AGENT_TEAMS.md) | Native agent-to-agent messaging |
| [Spec-Kit Integration](docs/SPECKIT_INTEGRATION.md) | Working with spec-kit workflows |
| [When to Use](docs/WHEN_TO_USE.md) | Decision guide: which skill for which situation |
| [Contributing](docs/CONTRIBUTING.md) | How to create/modify agents and skills |

### Blog Posts

| Version | Title |
|---------|-------|
| [v2.12.0](docs/blog/blog-2.12.0.md) | Seeing the Whole Board: Playwright, SonarQube, and the Expanding MCP Toolbelt |
| [v2.11.0](docs/blog/blog-2.11.0.md) | Jira as a Shared Brain: Work Queues and Human-on-the-Loop Governance |
| [v2.10.0](docs/blog/blog-2.10.0.md) | The Engineer Who Says No: Advocate Agent & Jira Coordination |
| [Earlier releases](docs/README.md#blog-posts) | v0.2.0 through v2.8.0 |

---

## Releasing a New Version

Three version fields must stay in sync:

| File | Field |
|------|-------|
| `.claude-plugin/marketplace.json` | Top-level `"version"` |
| `.claude-plugin/marketplace.json` | `plugins[0].version` |
| `plugins/agent-orch/.claude-plugin/plugin.json` | `"version"` |

Use [semver](https://semver.org/): patch for bug fixes, minor for new agents/skills, major for breaking changes.

```bash
# After bumping versions:
git add .claude-plugin/marketplace.json plugins/agent-orch/.claude-plugin/plugin.json
git commit -m "bump agent-orch plugin to <version>"
git push
```

Users get the update on next session start, or force it with `/plugin install agent-orch@ssnc-agent-orch`.

---

## Upgrading

The plugin auto-updates when Claude Code starts a new session. To force an immediate upgrade:

```bash
/plugin install agent-orch@ssnc-agent-orch
```

This pulls the latest version from the marketplace. Restart Claude Code after upgrading.

### Team-Wide Upgrades

If your project uses `.claude/settings.json` for [team-wide auto-setup](#team-wide-auto-setup), all team members get the latest version automatically on their next session start -- no action required.

---

## Uninstalling

### Remove the Plugin

```bash
/plugin uninstall agent-orch@ssnc-agent-orch
```

### Remove the Marketplace

If you no longer need the SS&C marketplace at all:

```bash
/plugin marketplace remove ssnc-agent-orch
```

### Remove Team-Wide Configuration

If your project has auto-setup in `.claude/settings.json`, remove the `extraKnownMarketplaces` and `enabledPlugins` entries:

```json
// .claude/settings.json -- remove these blocks
{
  "extraKnownMarketplaces": [
    { "source": "git", "url": "git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git" }
  ],
  "enabledPlugins": [
    { "name": "agent-orch", "marketplace": "ssnc-agent-orch" }
  ]
}
```

### Script Uninstall

Alternatively, use the bundled scripts: `./uninstall.sh` (bash) or `.\uninstall.ps1` (PowerShell). These remove both the plugin and the marketplace registration.

---

## Acknowledgments

This plugin incorporates methodologies and patterns from the following open-source projects:

### superpowers Plugin

Several of our agent workflows are derived from or inspired by the [superpowers plugin](https://github.com/obra/superpowers) by Jesse Vincent, released under the MIT License:

- **4-phase debugging methodology** - Systematic root cause analysis (Root Cause Investigation → Pattern Analysis → Hypothesis Testing → Implementation), now also surfaced as the `/agent-orch:bugfix` entry point
- **Spec compliance verification approach** - "DISTRUST THE IMPLEMENTER'S REPORT" principle with independent code verification
- **Reviewer independence / anti-gaming rules** - Reviewers are read-only on the verdict, can't be told what to ignore or how to pre-rate severity, and still report plan-mandated defects ("the plan can't grade its own work")
- **Code quality review structure** - Two-stage review gate and severity classification system
- **TDD enforcement patterns** - "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST" discipline
- **Requirements gathering methodology** - Iterative questioning approach with incremental approval, now also surfaced as the standalone `/agent-orch:brainstorm` skill with a hard pre-implementation gate
- **Verification before completion** - "Evidence before claims" honesty gate ([policy](plugins/agent-orch/policies/verification-before-completion.md)): no completion claim without fresh verification, and a subagent's self-report is verified independently
- **Builder status conventions** - `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` reporting and the "bad work is worse than no work" escalation principle

We're grateful to Jesse Vincent for creating and open-sourcing these excellent engineering practices that have significantly improved our development workflow.

See [plugins/agent-orch/LICENSE](./plugins/agent-orch/LICENSE) for full attribution details.

---

## License

MIT - See [plugins/agent-orch/LICENSE](./plugins/agent-orch/LICENSE) for full details including attribution to derived works.
