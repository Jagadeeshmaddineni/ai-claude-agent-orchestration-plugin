# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.54.0] - 2026-08-02

### Added - team-work 0.20.0: three shift-left SDLC gates

As agents absorb more of the build, the leverage moves **left**: the hard part is no longer
typing the code, it's getting the context and the plan right. Three new team-work skills make
that front third of the SDLC repeatable. Each closes a gate and consumes the previous one's
output.

| Skill | Gate | What it produces |
|---|---|---|
| `/team-work:work-analyze <doc>` | *Is what they asked for what we should build?* | A requirements analysis giving **every requirement an explicit verdict** — BUILD AS WRITTEN / BUILD WITH CHANGES / RECOMMEND AGAINST / DEFER / NEEDS DECISION — grounded in `file:line` code evidence and the wiki's prior decisions, with an alternative for anything recommended against, open questions routed to named owners by audience, plus risks, implicit scope, and what the release won't deliver |
| `/team-work:work-signoff <transcript>` | *What exactly are we committing to?* | The concise agreed scope statement stakeholders sign, in place of reconciling a requirements doc that has drifted. Supersedes any earlier sign-off (kept citable) with a "what changed since" section, and splits still-open items into **blocking vs non-blocking** |
| `/team-work:work-handoff` | *Can a developer start without me?* | A developer onboarding guide whose **dependency map is read from the tracker's real link graph, never inferred** — plus repo/stack mapping, a document index with reading order, ticket conventions, DoD, and a getting-unblocked path that leads with querying the wiki |

All three are **wiki-required** — the wiki supplies the cross-source memory and citations that
make their output defensible — and all three write their artifact back into the wiki, so it
compounds and stays queryable by `/work-ask`.

`work-analyze` and `work-handoff` resolve the codebase by **walking up from the wiki root to
find sibling repos under a shared parent** (a common layout), confirming what they found rather
than guessing, and only asking for paths when the walk comes up empty. Code is read by
read-only explorer subagents so a large repo doesn't flood the session.

`work-handoff` reads the issue graph through the existing
[tracker-provider contract](plugins/agent-orch/rules/tracker-provider.md), so it works with
Jira or GitHub Issues, and degrades to a clearly-labelled plan-derived map under
`tracker: none`.

Shared behaviour lives in a new `plugins/team-work/rules/shift-left-common.md` (wiki
resolution, sibling-repo discovery, idempotent ingest delegation, audience routing,
output/commit) so the three cannot drift apart.

### Fixed - `/work-ingest` is now idempotent

`/team-work:work-ingest` previously **prompted interactively** when a source was already
archived at the same path, offering overwrite / new-slug / re-ingest. That blocked programmatic
use: a skill delegating to ingest mid-workflow would stall waiting for input, and choosing
"new slug" would silently duplicate an immutable source, corrupting the audit trail every
citation depends on.

Ingest now compares a content digest against the destination first:

- **identical content** → reports "already ingested" and returns cleanly, **no prompt**;
- **different content** at the same date+slug → the existing interactive resolution, unchanged;
- **no file there** → normal archive.

Callers can therefore invoke `/work-ingest` unconditionally without knowing whether the user
already ingested the source. Benefits every caller, not just the new skills.

## [2.53.0] - 2026-07-31

### Removed - `mainframe-analyzer` plugin relocated to gids-ai-marketplace

The `mainframe-analyzer` plugin (Mainframe COBOL/JCL analysis via the SmartTSXL Xtensions
V4 API) has been **removed from this repository** and relocated to the **gids-ai-marketplace**
catalog, where it now lives as **`gids-mainframe-analyzer`** in its own repository.

- Deleted `plugins/mainframe-analyzer/` and removed the entry from `.claude-plugin/marketplace.json`.
- Documentation (README, CHEAT-SHEET, USER_GUIDE, CONTRIBUTING) now points to the new home.

**New home:** [code.ssnc.dev/FS/gids-mainframe-analyzer-plugin](https://code.ssnc.dev/FS/gids-mainframe-analyzer-plugin)
(distributed via the [gids-ai-marketplace](https://code.ssnc.dev/FS/gids-ai-marketplace) catalog)

**Install from the new location:**

```bash
/plugin marketplace add git@code.ssnc.dev:FS/gids-ai-marketplace.git
/plugin install gids-mainframe-analyzer@gids-ai-marketplace
/reload-plugins
/gids-mcp-catalog:mcp-smarttsxl   # installs the SmartTSXL MCP server it depends on
```

The old `/plugin install mainframe-analyzer@ssnc-agent-orch` command no longer works;
use `gids-mainframe-analyzer@gids-ai-marketplace` instead. The relocated plugin exposes
`/gids-mainframe-analyzer:change-impact-analysis` and `/gids-mainframe-analyzer:mips-hotspot-audit`.

## [2.51.0] - 2026-07-22

### Added — `/agent-orch:make-bug` bug-fix lifecycle skill (agent-orch 2.38.0)

- **New skill `/agent-orch:make-bug`** — the bug-fix analogue of `/make`. It is the
  same git + issue-tracker + PR lifecycle wrapper, but its implementation phase runs
  `/agent-orch:bugfix` (Debugger → Builder → Validator, regression-test-first) instead
  of `/build`. **`/make-bug` is to `/bugfix` what `/make` is to `/build`.**
  - **Reuses `/make` session state** — writes the identical
    `.make-session-<UTC_TS>-<PID>.json` (v2), differing only in `invoking_skill`, so
    `/bugfix`'s anchor pre-flight, `/make-validate`, and `/make-clean` operate on the
    fix branch with zero new code. No change to `/bugfix` was required.
  - **No version bump** — computes no `NEXT_MINOR` and sets no Jira `fixVersion`; a fix
    rides whatever release is next.
  - **Scaffolds the session date-tree + `STATUS.md` sink + `prompt.md`** before invoking
    `/bugfix` (which, unlike `/build`, does not create its own session tree), with a glob
    fallback so the commit/PR steps never read an empty sink.
  - New issues default to the **Bug** issue type; conventional `fix:` commits; PR body
    sourced from the `/bugfix` findings (root cause / fix / regression test).
- Registered across README, CHEAT-SHEET, CLAUDE.md (skill count 31→32), the SessionStart
  hook, `extensibility.md`, `marketplace.json`, and `plugin.json`.

## [2.45.0] - 2026-06-25

### Added - port of Superpowers v6.0.3 capabilities (agent-orch 2.35.0)

Brings the best of the latest [obra/Superpowers](https://github.com/obra/superpowers)
(MIT) into agent-orch as new and hardened capabilities.

- **New skill `/agent-orch:brainstorm`** — standalone Socratic design refinement
  *before* implementation: one question at a time, explore 2-3 approaches, design
  in incrementally-approved sections. A **hard gate** means no code until the design
  is approved. Writes an approved `DESIGN.md` under the session tree.
- **New skill `/agent-orch:bugfix`** — focused root-cause fix that wraps the
  systematic `orchestrate-debugger` (4-phase methodology, a **failing regression
  test before the fix**) with a Builder → Validator loop, a 3-attempts-then-escalate
  rule, and worktree/`.make-session` awareness. Leaner than `/build` (no
  brainstorming, no Advocate gate).
- **`/agent-orch:build` Phase 0.6** — detects and consumes a `/brainstorm`
  `DESIGN.md`, skipping the requirements interview (mirrors the existing Jira skip).
- **New shared policy `verification-before-completion.md`** — an "evidence before
  claims" honesty gate: no completion claim without fresh verification this turn,
  and a subagent's self-report is verified independently. Referenced by the builder,
  validator, and both reviewers.
- **Reviewer independence / anti-gaming rules** — the spec and quality reviewers are
  read-only on the verdict, cannot be told what to ignore or how to pre-rate
  severity, still report plan-mandated defects, and may return a "cannot verify"
  verdict when the diff alone is insufficient.
- **Builder status conventions** (`DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` /
  `NEEDS_CONTEXT`), a four-lens self-review, and the "bad work is worse than no work"
  escalation principle.
- **SessionStart hook** now nudges skill discovery across entry points.
- Docs synced (README, CHEAT-SHEET, CLAUDE.md); Acknowledgments extended.

## [2.44.0] - 2026-06-24

### Added - new `vault-orch` plugin (Obsidian vault over agent-orch + Jira)

- **New plugin `plugins/vault-orch/` (v0.1.0)** — provisions an Obsidian vault
  into any repo that uses the agent-orch workflow, so `/make` + `/build`
  sessions, business-requirement notes, and Jira tickets cross-link as a
  navigable knowledge graph. Core principle: **store the relationships, never
  the state** — the vault owns immutable references (which sessions/requirements
  touch which ticket) and the requirement thinking; Jira keeps owning mutable
  status. The ticket layer is **derived** (phantom graph nodes via frontmatter
  wikilinks + live Dataview queries), never a stored per-ticket note or sync
  script.
- **Four skills:**
  - `/vault-orch:init` — provision `.obsidian/` with `userIgnoreFilters` baked
    into `app.json` (the hard prerequisite for multi-GB repos), Dataview enabled,
    templates, three Dataview dashboards (sessions, the derived tickets hub,
    exec-updates), and `.gitignore` hygiene. Refuses without `ssnc-agent-orch/`.
    Idempotent.
  - `/vault-orch:backfill` — idempotent **variant-B** frontmatter stamper:
    header-only diff (bodies untouched), skips fenced/inline code, markdown
    links, and URLs, generic project-key regex (`--keys`), dry-run by default,
    lands as one mechanical PR.
  - `/vault-orch:intake` — scaffold a requirement note (`vault/intake/<topic>.md`)
    that feeds `team-work:work-prep` / `work-plan` (→ Jira) and then `/make`.
  - `/vault-orch:exec-update` — exec-altitude weekly summary written **into** the
    vault as a dated, Dataview-indexed, **Mermaid-charted** node. Shares
    `scripts/gather-activity.mjs` with — and is deliberately differentiated from
    — `team-work:work-recap` (exec vs PM altitude, Mermaid vs PPTX, into-vault vs
    sibling-dir).
- **Defensive `Stop` hook** (`hooks/frontmatter-on-session.sh`) — promotes each
  finished `/make` / `/build` session's `prompt.md` `## Metadata` block into
  frontmatter + `jira:` wikilinks automatically, keeping the vault current with
  zero forking of the agent-orch skills. No-ops cleanly outside an agent-orch
  repo / uninitialised vault / when no session is found, and never blocks a
  session.
- A new documentation guide at [`docs/VAULT_ORCH.md`](docs/VAULT_ORCH.md), linked
  from the docs index.
- Both scripts are Node-stdlib-only (no dependencies). Validated against a real
  1,453-file `ssnc-agent-orch/` tree (read-only dry-run) and a controlled
  idempotency/edge-case fixture. Adversarial verification caught and fixed a
  `set -u` empty-array abort in the Stop hook on bash 3.2 (macOS).

### Changed

- Marketplace version: `2.43.0` → `2.44.0`
- New `vault-orch` plugin version: `0.1.0`
- Merged latest `main` (through the opt-in extensibility framework, #66): picks
  up team-work `0.19.0` and agent-orch `2.34.0`.

## [2.39.0] - 2026-06-08

### Added - Publish the wiki to GitHub Pages with `/work-publish` (team-work 0.14.0)

A new `team-work` skill that hosts the LLM-maintained SDLC wiki as a searchable
**MkDocs Material** site on SS&C GitHub Enterprise Pages
(`https://pages.code.ssnc.dev/<org>/<repo>/`), reproducing the
[`tech-infra/wiki-template`](https://code.ssnc.dev/tech-infra/wiki-template)
setup but **adapted for an LLM wiki** — the wiki *is* the docs source, so there
is no separate authoring step.

- **`/team-work:work-publish`** — detects the git remote host (**`code.ssnc.dev`
  only**; no-ops with guidance on other remotes), then scaffolds the minimal
  working setup at the publishing repo root: `mkdocs.yml` (Material theme,
  `docs_dir` pointed at the wiki root, `README.md` as the home page, and
  **auto-generated navigation** so the site stays correct as the agent reshapes
  the wiki — no hand-maintained `nav:`), `requirements.txt` (mkdocs pinned
  `<2.0`), and `.github/workflows/deploy-docs.yml` (a self-hosted-runner job that
  deploys via `mkdocs gh-deploy --force` to the `gh-pages` branch). It
  **auto-enables Pages via the API** once the `gh-pages` branch exists (re-run
  after the first deploy), then **verifies the live site** (probes the home page
  and a deep page), and commits/PRs per the wiki's `ingest_mode`. Idempotent;
  `--dry-run` previews every file. Optional SS&C "Blue Stone" branding pulled
  from the template repo. Notes that the `mkdocs-material` red "MkDocs 2.0"
  banner is advisory, not a build failure.
- **`/team-work:work-wiki`** now **offers publishing when it finishes** (on
  `code.ssnc.dev` repos) — the discoverable entry point — and records
  `publish`, `publish_url`, and `publish_exclude` in `.team-work/wiki-config.md`.

By default the whole wiki is published, **including the immutable `sources/`
audit trail**. Because `pages.code.ssnc.dev` is readable by anyone on the SS&C
network, `/work-publish` prints a confidentiality notice naming exactly what
becomes public. To reduce exposure it **recommends restricting site viewers over
excluding content**: excluding `sources/` makes **every citation link 404 on the
live site** (each page links into `sources/` for provenance), and
`mkdocs build --strict` does *not* flag this (such links are logged as INFO, not
WARNING). A `publish_exclude` opt-out remains for directories nothing links into,
behind a loud warning.

### Configuration

- **`.team-work/wiki-config.md`** gains `publish`, `publish_url`, and
  `publish_exclude` keys (owned by `/work-publish`; preserved by `/work-wiki`).
- Build output (`site/`, `.cache/`) is gitignored.

### Changed

- Marketplace version: `2.38.0` → `2.39.0`
- `team-work` plugin version: `0.13.0` → `0.14.0`

## [2.37.0] - 2026-06-04

### Added - Team-Work Wiki: an LLM-maintained SDLC knowledge base (team-work 0.12.0)

A persistent, compounding knowledge layer that sits **upstream** of planning,
for business analysts who accumulate client calls, requirement docs, and
postmortems. The LLM does the bookkeeping (summarizing, cross-referencing,
filing, citing); the human curates sources and asks questions. Four new
`team-work` skills, each a SKILL.md following the existing team-work style:

- **`/team-work:work-wiki`** — bootstrap/repair a wiki at a configurable path:
  `CLAUDE.md` schema, `index.md` catalog, `log.md`, immutable categorized
  `sources/` tree, generated page directories (requirements, entities,
  concepts, decisions, incidents, plans), and qmd search wiring. Idempotent.
- **`/team-work:work-ingest`** — the core BA tool. Classify a source → archive
  it verbatim+categorized under `sources/<type>/<client>/<date>` as an audit
  trail (converting PDF/xlsx/docx to markdown via a markitdown/pandoc/textutil
  shim while preserving the original binary) → extract attendees + speaker
  attribution → integrate into pages where **every claim cites its source** →
  flag contradictions → update `index.md`+`log.md` → re-index qmd. Asks
  pr-vs-local on first run and stores the choice repo-wide.
- **`/team-work:work-ask`** — qmd hybrid search (BM25/vector + LLM re-rank)
  with an `index.md` fallback → cited answer (page + originating call/doc +
  speaker/date) → optionally file the answer back as a new page so
  explorations compound.
- **`/team-work:work-lint`** — wiki health-check: contradictions, stale claims,
  orphan pages, missing requirement pages, missing cross-refs, broken
  provenance, source gaps. Prioritized punch list; read-only by default,
  `--fix` applies safe fixes.

`/work-prep` is unchanged — the wiki *front-runs* it. A BA accumulates
knowledge over many calls, then seeds a `/work-prep` planning session from the
requirement pages when a body of work is ready.

### Added - `/create-rfo --wiki` (agent-orch 2.30.2)

- Optional `--wiki <path>` flag on `/agent-orch:create-rfo` files the
  postmortem synthesis into a team-work wiki (`wiki/incidents/`) and archives
  the transcript under `sources/incidents/` with citations. Additive only;
  default behavior is unchanged when the flag is absent.

### Configuration

- **`.team-work/wiki-config.md`** (repo-level) records the wiki root path and
  the `ingest_mode` (`pr` | `local`) preference.
- **`.qmd/`** search index is gitignored (derived from markdown, rebuilt on
  demand).

### Changed

- Marketplace version: `2.36.1` → `2.37.0`
- `team-work` plugin version: `0.11.0` → `0.12.0`
- `agent-orch` plugin version: `2.30.1` → `2.30.2`
- New optional prerequisites: **qmd** (wiki hybrid search) and a markdown
  converter (markitdown/pandoc/textutil) for non-markdown ingest. Both degrade
  gracefully when absent.

## [2.24.0] - 2026-05-14

### Added - Worktree/branch context enforcement + phase communication

- **New rule `plugins/agent-orch/rules/worktree-context.md`** — machine-
  enforceable contract that every orchestrated agent stays inside the
  worktree or feature branch selected by `/agent-orch:make`. Prevents
  silent drift where subagents edit files in the primary checkout instead
  of the worktree (AITOOLS-47).
- **Session state file `.claude/.make-session.json`** — `/make` writes this
  file the moment it creates a worktree or feature branch. Every `/build`
  run (and every subagent `/build` spawns) reads the file, anchors `pwd`
  to `worktree_path`, and refuses to continue if drift is detected. The
  file is gitignored and removed by `/make-clean`.
- **Phase banners in `/make`, `/build`, and `/make-clean`** — every phase
  now starts with a visual banner (`═══… phase N/M: name …═══`) and each
  subagent launch prints a one-line `→ Launching … ` update so the user
  always knows where orchestration is.
- **Anchor-block propagation** — every subagent prompt emitted by `/build`
  is prefixed with `${ANCHOR_BLOCK}` containing mode/branch/worktree_path
  so children inherit the anchor rather than re-guessing from cwd alone.

### Changed

- Marketplace version: `2.28.1` → `2.29.0`
- `agent-orch` plugin version: `2.23.1` → `2.24.0`

## [2.23.1] - 2026-05-14

### Fixed - MCP server and skills

- **MCP logging**: fixed log message truncation in the MCP handler so
  Jira/Confluence/TestRail/Azure DevOps/Playwright/SonarQube tool call
  payloads are logged in full (#42).
- **`mcp-setup` skill**: corrected the endpoint shown in the service
  list message.
- **`mcp-ctl`**: improved plugin folder lookup when multiple plugin
  folders are present.
- **`mcp-start` skill**: increased startup timeout so slow first starts
  are not falsely reported as failures.
- **`mcp-stop` skill**: macOS variant now properly stops the server
  process and frees the port.
- **Jira config**: default `deploymentType` is now `cloud`.

### Changed

- Marketplace version: `2.28.0` → `2.28.1`
- `agent-orch` plugin version: `2.23.0` → `2.23.1`
- `agent-orch-mcp` package version: `0.2.0` → `0.2.1`

## [2.22.0] - 2026-05-06

### Added - MCP server logging

- **`pino`-based structured logging** in the local MCP server
  (`plugins/agent-orch/mcp/`). New `src/shared/logger.ts` provides a shared
  logger wired through `composition-root.ts` and the MCP handler, so Jira/
  Confluence/TestRail/Azure DevOps/Playwright/SonarQube tool calls emit
  consistent, inspectable logs. Log level is configurable via config.
- Updated `mcp-ctl`, `mcp-config.example.json`, and `docs/SETUP.md` with
  the new logging options.

### Changed

- Marketplace version: `2.26.0` → `2.27.0`
- `agent-orch` plugin version: `2.21.0` → `2.22.0`
- `agent-orch-mcp` package version: `0.1.0` → `0.2.0`

## [2.21.0] - 2026-05-05

### Added - prompt.md session provenance

- **`prompt.md` in every `/agent-orch:build` session**: Every build session
  now writes a `prompt.md` provenance artifact alongside `PLAN.md`,
  `STATUS.md`, and `COORDINATION.md`. It captures:
  - The original prompt string (the raw `$ARGUMENTS` the user passed, or
    the requirements pulled from a Jira issue when `/build JIRA-ID` is
    used).
  - The clarifying question/answer exchange that happens before `PLAN.md`
    is drafted, appended in real time as the requirements conversation
    progresses.
  - A final scope summary written after `PLAN.md` is finalized, so the
    prompt file tells the full story of what was asked → what was
    clarified → what was committed to the plan.
  - Metadata: session start timestamp (UTC), invoking skill (`direct` or
    `via /make`), worktree path, and Jira issue key when applicable.
- **`/agent-orch:make` integration**: When `/make` invokes `/build` with a
  JIRA-ID, the Jira issue summary/description/type/priority are appended
  to `prompt.md` under the Original Prompt section so the session has a
  self-contained record of what work was pulled from Jira.
- **Purpose**: efficacy review. When revisiting an old session to
  understand *why* a plan looked a certain way (did a clarifying question
  push scope sideways? did the user override an Advocate recommendation?),
  `prompt.md` is the durable record of the pre-plan conversation.
- Documentation updated: `README.md` Standalone Mode Sessions, the
  `CHEAT-SHEET.md` Session Files table, and the `/agent-orch:make`
  skill all list `prompt.md` as a first-class session artifact.

### Changed

- Marketplace version: `2.25.0` → `2.26.0`
- `agent-orch` plugin version: `2.20.0` → `2.21.0`

## [2.9.0] - 2026-03-31

### Added - Specialized Agents, Commands, and Enhanced Features

- **6 New Specialized Agents** (17 → 23 agents):
  - **Observability Engineer**: End-to-end observability strategy, SLO/SLI definition, alert tuning, on-call runbooks
  - **Data Engineer**: ETL pipelines, data transformations, quality checks, batch/stream processing
  - **ML Engineer**: Model architecture, training loops, evaluation metrics, serving infrastructure
  - **Legacy Modernizer**: Legacy system modernization, incremental migration, strangler fig pattern, risk mitigation
  - **Content Specialist**: Technical writing, API documentation, user guides, training materials
  - **Incident Responder**: Production incident triage, root cause analysis, mitigation, postmortem reports

- **8 Lightweight Commands** (new `/agent-orch:*` commands without agent overhead):
  - **status-check**: Quick project status summary from STATUS.md files
  - **review-quick**: Fast code review for critical issues only (1-2 minutes)
  - **test-check**: Verify tests pass and coverage meets targets
  - **plan-review**: Validate PLAN.md completeness and feasibility
  - **enforce-check**: Run enforcement rules without full verification
  - **db-migration-check**: Verify migrations are safe and reversible
  - **security-quick**: Fast security scan for common vulnerabilities
  - **docs-sync**: Check documentation matches implementation

- **Simplify Skill** (`/agent-orch:simplify`):
  - Post-implementation code simplification and optimization
  - Identifies duplicated logic, over-engineered solutions, performance inefficiencies
  - Extracts reusable patterns and improves code quality
  - User approval workflow before applying changes
  - Confidence levels: HIGH (safe), MEDIUM (review carefully), LOW (discretionary)
  - Integration with build skill via `SIMPLIFY_POST_BUILD: true` in PLAN.md

- **Wave Execution Support**:
  - Agent orchestration now supports sequential waves for dependency management
  - Foundation agents (DB, API) execute first, implementation agents second
  - Prevents race conditions and ordering issues
  - Wave metadata tracked in STATUS.md

- **Confidence Scoring in Reviews**:
  - Code review findings now include confidence levels
  - Helps prioritize which issues to address first
  - Tracked: HIGH confidence (fix immediately), MEDIUM (review), LOW (optional)

- **Role Personas for All Agents**:
  - Every agent operates as Staff Software Engineer with ISC2 certifications (CISSP, CCSP, CSSLP)
  - Consistent security-first mindset across all agents
  - Baseline security awareness via `.claude/rules/security-baseline.md`

- **Compound Learning System**:
  - Agents now learn from past mistakes and successes
  - Learning stored in `.specify/memory/learnings.md`
  - Patterns extracted and applied to future work
  - Cross-session knowledge accumulation

- **Delta Specs for Brownfield**:
  - New spec format for modifying existing systems
  - Describes changes rather than complete implementation
  - Current state → desired state transition documented
  - Reduces spec size for large codebases

- **Auto Mode Recommendations**:
  - Orchestrator now suggests when to use agent teams vs subagents
  - Based on complexity score and task dependencies
  - User can override automatic recommendations
  - Guidance for optimal coordination mode

### Changed

- **Build and Implement Skills**:
  - Added simplify option to PLAN.md template
  - Wave execution metadata in STATUS.md
  - Enhanced spawn prompts with persona context
  - Auto mode recommendation in Phase 0

- **All Agent Definitions**:
  - Added role persona (Staff Engineer with ISC2 certs)
  - Enhanced security baseline awareness
  - Updated to use confidence scoring in findings
  - Wave-aware coordination protocols

- **Review Process**:
  - Confidence levels added to all review findings
  - Better prioritization of critical vs optional issues
  - Clearer approval criteria based on confidence

### Performance Improvements

- **Lightweight Commands**: 8 new commands provide fast results (seconds) without agent spawning
- **Wave Execution**: Prevents re-work from dependency ordering issues
- **Auto Mode**: Reduces orchestrator overhead by suggesting optimal coordination mode upfront

### Configuration

New optional configuration in PLAN.md:

```markdown
SIMPLIFY_POST_BUILD: true        # Run simplify after implementation
SIMPLIFY_CONFIDENCE: HIGH        # Apply only HIGH confidence changes
WAVE_EXECUTION: true             # Enable wave-based agent coordination
AUTO_MODE: recommend             # Auto-suggest coordination mode
```

---

## [2.6.0] - 2026-03-27

### Added - Quality Enforcement Pipeline

- **Test-Driven Development (TDD) Enforcement**:
  - Builder agent now follows RED-GREEN-REFACTOR cycle by default
  - Writes failing test first, then implements until test passes
  - Reports TDD evidence (RED -> GREEN -> REFACTOR) for each task in STATUS.md
  - Configurable: set `TDD_MODE: optional` in CLAUDE.md to disable

- **Comprehensive Test Coverage Targets**:
  - Default targets: 100% line coverage, 100% branch coverage, 100% pass rate
  - Validator writes comprehensive tests: happy path, error paths, edge cases, boundary conditions, negative tests
  - Coverage shortfall protocol: Validator writes additional tests until target met
  - All targets configurable via CLAUDE.md (`COVERAGE_TARGET`, `BRANCH_COVERAGE_TARGET`, `PASS_RATE_TARGET`)

- **Playwright E2E Testing (UI Features)**:
  - Mandatory Playwright tests for any feature with UI changes
  - Covers user flows, form interactions, navigation, error/loading/empty states
  - Accessibility testing via axe-core integration
  - Responsive testing at mobile and desktop breakpoints
  - UI/UX agent reviews Playwright coverage and requests missing tests
  - Configurable: set `PLAYWRIGHT_TESTS: optional` in CLAUDE.md to disable

- **No Scaffolding Policy**:
  - Builder never creates placeholder, stub, or scaffold implementations by default
  - Forbidden: TODO/FIXME comments, empty function bodies, placeholder text, mock data returns
  - Required: full error handling, loading states, validation, edge cases for all code
  - Spec Reviewer detects scaffolding as a compliance failure (new Step 3b)
  - Quality Reviewer detects scaffolding as HIGH severity finding
  - Scaffolding only allowed when explicitly requested in spec/PLAN.md

- **Integration Verification (Phase 3.5)**:
  - New pipeline phase between implementation and code review
  - DevOps agent verifies: full build, DB migrations, DB seeds, app startup, lint/type-check
  - Stops on first failure; relevant agent fixes issue before review begins
  - Maximum 3 retry attempts before escalating to user
  - Configurable: set `INTEGRATION_VERIFICATION: optional` in CLAUDE.md to skip

- **Database Migration & Seed Verification**:
  - Database agent now runs migrations after writing them
  - Verifies seeds execute successfully
  - Data integrity checks (tables, columns, foreign keys, indexes)
  - Rollback testing when feasible
  - Migration evidence required in STATUS.md

- **Quality Targets in PLAN.md**:
  - Every build session now includes a Quality Targets section in PLAN.md
  - Documents coverage target, pass rate, TDD mode, Playwright requirement
  - All agents read and follow these targets
  - Targets pulled from CLAUDE.md overrides or plugin defaults

### Changed

- **Builder Agent**: Complete rewrite of implementation protocol. Now follows TDD cycle, includes no-scaffolding policy, reads quality targets from PLAN.md
- **Validator Agent**: Expanded test requirements (comprehensive coverage, not rudimentary). Added Playwright e2e section. Added coverage shortfall protocol
- **Quality Reviewer Agent**: Added coverage target verification table, scaffold detection checklist, Playwright/accessibility gate in approval criteria
- **Spec Reviewer Agent**: Added Step 3b scaffold detection. Checks for TODOs, stubs, placeholder content, incomplete implementations
- **DevOps Agent**: Added Post-Implementation Integration Verification section with build/migration/seed/startup/lint checks
- **Database Agent**: Added mandatory migration/seed verification with evidence requirements
- **UI/UX Agent**: Added Playwright test coordination section. Reviews e2e coverage and requests missing tests from Validator
- **Build Skill (SKILL.md)**: Added Phase 3.5 Integration Verification. Updated PLAN.md template with Quality Targets and Implementation Standards. Updated all Builder/Validator spawn prompts (subagent + team mode)
- **Implement Skill (SKILL.md)**: Mirrored all build skill changes. Updated spawn prompts. Added Phase 3.5
- **README.md**: Complete rewrite with comprehensive documentation of all quality enforcement features, configuration options, and override mechanisms

### Configuration

All new features are enabled by default and configurable via project CLAUDE.md:

```markdown
COVERAGE_TARGET: 80%              # Default: 100%
BRANCH_COVERAGE_TARGET: 80%       # Default: 100%
PASS_RATE_TARGET: 100%            # Default: 100%
TDD_MODE: optional                # Default: enforced
PLAYWRIGHT_TESTS: optional        # Default: required (for UI)
INTEGRATION_VERIFICATION: optional # Default: required
```

---

## [2.5.0] - 2026-03-24

### Added - Agent Teams Integration, Telemetry, C4 Architecture

- **Agent Teams Support**: Full integration with Claude Code's experimental Agent Teams feature
  - Agents can now communicate directly with each other (no orchestrator bottleneck)
  - Self-coordinated task claiming from shared task list
  - Iterative review without orchestrator mediation (reviewers ↔ builders)
  - Real-time debugging coordination between agents

- **Automatic Coordination Mode Detection**:
  - Phase 0 complexity scoring system automatically recommends teams vs. subagents
  - Score calculation: `specialists + (cross_layer ? 2 : 0) + iterations + dependencies`
  - Scores ≥6 strongly recommend agent teams
  - Scores 2-3 recommend subagents
  - User asked to choose for scores 4-5

- **Team-Aware Agent Definitions**:
  - Updated Builder agent with team coordination protocols
  - Updated Validator agent with direct messaging patterns
  - Updated Spec Reviewer agent with autonomous iteration
  - Updated Quality Reviewer agent with cross-agent refinement
  - Updated Scribe agent with collaborative documentation patterns
  - All agents now include "Team Coordination (Agent Teams Mode)" sections

- **Quality Enforcement Hooks**:
  - **TaskCompleted Hook** (`.claude/hooks/TaskCompleted`):
    - Enforces verification gates when tasks are marked complete
    - Blocks completion without evidence for implementation and test tasks
    - Requires actual test output, not "should work" claims
  - **TeammateIdle Hook** (`.claude/hooks/TeammateIdle`):
    - Prevents agents from going idle without completion evidence
    - Builder must provide test output verification
    - Validator must show test results and coverage
    - Checks for incomplete assigned tasks

- **Enhanced Build Skill**:
  - `/agent-orch:build` now supports both subagent and agent team modes
  - Phase 0 determines coordination mode based on feature complexity
  - COORDINATION.md file tracks team metadata and message counts
  - STATUS.md enhanced with team activity logs showing agent-to-agent messages
  - Session files now include coordination efficiency metrics

- **Comprehensive Documentation**:
  - [`docs/AGENT_TEAMS.md`](docs/AGENT_TEAMS.md): Complete guide to agent teams integration
  - [`docs/AGENT_TEAMS_QUICK_REF.md`](docs/AGENT_TEAMS_QUICK_REF.md): Quick reference for common patterns
  - Updated README with agent teams section
  - Examples showing 40% time savings from direct agent coordination

### Changed

- **Build Skill Workflow**:
  - Added Phase 0: Coordination Mode Detection (before architect analysis)
  - Enhanced PLAN.md to include coordination mode and complexity score
  - STATUS.md format differs between subagent and agent team modes
  - Session directory now includes COORDINATION.md for team sessions

- **Agent Communication Patterns**:
  - Subagent mode: All communication through orchestrator (unchanged)
  - Agent team mode: Direct messaging between agents, orchestrator only for escalation
  - Agents now support @mentions for direct communication (`@builder`, `@validator`, etc.)
  - Broadcast messages available for team-wide announcements

### Performance Improvements

Real-world metrics from complex feature implementation:

| Metric | Subagents | Agent Teams | Improvement |
|--------|-----------|-------------|-------------|
| Orchestrator interventions | 24 | 3 | **87% reduction** |
| Direct agent messages | 0 | 47 | N/A (new capability) |
| Autonomous iterations | 0 | 9 | N/A (new capability) |
| Estimated time saved | - | - | **~40%** |

### Setup Requirements

To enable agent teams, add to `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Or set environment variable:
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### Backward Compatibility

- All existing workflows continue to work unchanged
- Subagent mode remains the default for simple features
- Agent teams are optional and automatically recommended only for complex features
- No breaking changes to existing skills or agent interfaces

---

## [1.0.0] - 2026-02-XX (Previous Version)

### Added

- Initial release with 15 specialized agents
- Two-stage code review (Spec Compliance → Code Quality)
- Verification gates for Builder and Validator
- Systematic debugging with 4-phase methodology
- Parallel agent execution
- Support for both spec-kit and standalone modes
- Skills: `/agent-orch:implement`, `/agent-orch:build`, `/agent-orch:analyse`
- Setup skills for CLAUDE.md and constitution.md
- Session directory management for build sessions
- Integration with GitHub spec-kit

### Features

- 4 Core Agents: Architect, Builder, Validator, Scribe
- 2 Review Agents: Spec Reviewer, Quality Reviewer
- 1 Support Agent: Debugger
- 8 Specialist Agents: Security, Performance, DevOps, Database, API, UI/UX, Refactorer, Migration

---

[2.6.0]: https://code.ssnc.dev/ai/claude-agent-orchestration-plugin/compare/v2.5.0...v2.6.0
[2.5.0]: https://code.ssnc.dev/ai/claude-agent-orchestration-plugin/compare/v1.0.0...v2.5.0
[1.0.0]: https://code.ssnc.dev/ai/claude-agent-orchestration-plugin/releases/tag/v1.0.0
