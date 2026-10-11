# Extensible Skills and Agents Framework

**Date**: 2026-06-25  
**Audience**: SS&C engineers using the Claude Agent Orchestration Plugin

The plugin now supports opt-in extensibility for both skills and agents. Teams can inject repo-specific context, override agent behavior, or offload git/Jira workflows to external repositories — all without changing any default behavior.

## The Big Idea

**Hard invariant — zero behavior change by default.**

If your config file is absent, unreadable, malformed, or contains no entry for a skill or agent (or an empty entry), that skill or agent behaves exactly as it does today. Extensibility is strictly additive and opt-in. A repository that has never heard of these files is unaffected.

When you want to extend something, uncomment the relevant section in the config file, add your targets, and the plugin runs them at the documented hook points. When you want to revert, just comment it back out.

## Where Config Lives

The plugin now recognizes two configuration directories in your consuming repository:

| Plugin | Config Directory | Files |
|--------|------------------|-------|
| `agent-orch` | `.claude/ssnc-agent-orch/` | `skills.yaml`, `agents.yaml`, `jira-workflow.yaml`, `git-workflow.yaml` |
| `team-work` | `.claude/ssnc-team-work/` | `skills.yaml`, `agents.yaml` |

These files ship (via `/agent-orch:init-plugin`, `/agent-orch:upgrade-plugin`, or by copying from `examples/`) **fully commented out**, listing every skill and agent so you can uncomment exactly what you want. A commented-out file is equivalent to no file: zero behavior change.

The config directory is in the **consuming repository** (the repo you run the skill in), not in the plugin cache. The plugin ships templates; your repo owns its active config.

## Agent Extension: `before` / `replace` / `after`

Every agent supports three optional extension keys in `agents.yaml`:

- **`before`** — a list of targets (file globs, markdown paths, loop-library refs, skill names) run **before** the agent's own instructions. Use this to inject repo-specific context like ADRs, standards, or checklists.
- **`replace`** — when non-empty, your target **replaces** the plugin's agent entirely. Your agent becomes the agent for that role in this run.
- **`after`** — like `before`, but runs **after** the agent (or the replacement) finishes. Typical use: run a `/loop-library` loop or a repo post-processing checklist.

### Example: Architect Agent with ADRs and a Loop

```yaml
agents:
  architect:
    before:
      - docs/adr/*                      # feed every ADR to the architect first
    replace:                            # leave empty → our architect runs
    after:
      - .loop-library/architect.yaml    # run a loop-library loop afterwards
```

**What happens:**
1. The plugin reads all markdown files matching `docs/adr/*` and presents them to the architect before it plans.
2. The plugin's architect agent runs normally (since `replace` is empty).
3. After the architect finishes, the plugin runs the `.loop-library/architect.yaml` loop.

### Example: Custom Security Checklist Before Security Agent

```yaml
agents:
  security:
    before:
      - docs/security/checklist.md      # read repo security standards first
    replace:
    after: []
```

**What happens:**
1. Before the security agent audits code, it reads `docs/security/checklist.md` (your team's OWASP checklist, PCI-DSS requirements, etc.).
2. The plugin's security agent runs with that context.
3. No post-processing.

### Resolution Order

```
if no entry for agent X (or entry empty)  → run orchestrate-X exactly as today. STOP.
run each item in `before` (in order)
if `replace` non-empty                    → run replacement target (skip orchestrate-X)
else                                       → run orchestrate-X normally
run each item in `after` (in order)
```

You can combine `before` and `after` with `replace` freely.

## Skill Hook Points

Every skill exposes **named hook points** where you can inject targets. Each hook point is a list of targets to run at that point in the skill's lifecycle.

### Example: `/make` with Before-Commit Formatting, Before-PR Review Loop, and After-PR Notification

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

**What happens:**
1. `/make` runs `/build` as usual.
2. At the commit phase, it runs `scripts/format.sh` before staging files.
3. After pushing the branch, it runs the `.loop-library/pre-pr-review.yaml` loop (e.g., a bounded loop that checks for TODOs, missing tests, or doc updates).
4. Then it reads and acts on `docs/checklists/pr-ready.md` (your team's PR readiness checklist).
5. After the PR is created, it runs `scripts/notify-team.sh` (maybe a Slack webhook or email).

### Example: `/build` with After-Build Simplification

```yaml
skills:
  build:
    before_plan:  []
    after_plan:   []
    before_review: []
    after_build:  [/agent-orch:simplify]
```

**What happens:**
1. `/build` runs normally (architect, builder, validator, scribe, review).
2. After the build completes, `/agent-orch:simplify` runs automatically to find reuse opportunities and quality improvements.

### Target Syntax

A hook target may be:

- **Script path** (`scripts/format.sh`, `tools/lint.py`) — executed as a build step (cwd = repo root, or cache dir for git steps).
- **Markdown path or glob** (`docs/checklist.md`, `docs/adr/*`) — read-and-act instructions.
- **`/loop` reference** (`/loop ...` or `.loop-library/*.yaml`) — a bounded repeatable loop.
- **Skill name** (`/agent-orch:simplify`, `/team-work:work-lint`) — invoked inline.

### Hook Points Exposed by Core Skills

| Skill | Hook Points |
|-------|-------------|
| `make` | `before_commit`, `before_pr`, `after_pr` |
| `build` | `before_plan`, `after_plan`, `before_review`, `after_build` |
| `make-clean` | `before_merge`, `after_merge` |
| `make-validate` | `before_validate`, `after_validate` |

Other skills expose hook points named in their own `## Extensibility` section (most expose a `before` / `after` pair around their main work). When a skill lists no hook points, it is not yet hook-enabled and config under it is ignored (still zero behavior change).

## Pluggable Jira Workflow

Today, Jira transition IDs, custom-field IDs, and lifecycle steps are read from `.claude/rules/jira.md` and partly hard-coded in `/make`, `/build`, and `/make-clean`. The new `jira-workflow.yaml` lets you override that flow declaratively.

### Example: Override Jira Transition IDs and Add Lifecycle Steps

```yaml
jira:
  enabled: true                          # false → skip Jira entirely (like jira_mode: no)

  transitions:                           # override the IDs/names used by the skills
    in_progress: "21"
    in_review:   "31"
    done:        "41"

  fields:                                # custom-field IDs the skills set
    start_date:  "customfield_10015"
    end_date:    "customfield_10016"

  lifecycle:                             # optional extra steps at lifecycle events
    on_start:  [docs/jira/on-start.md]
    on_review: [scripts/post-pr-to-jira.sh]
    on_done:   [docs/jira/on-done.md]
```

**What happens:**
1. When `/make` transitions a Jira issue to "In Progress", it uses transition ID `21` (instead of the hard-coded default).
2. When the PR is created, the skill transitions to "In Review" using ID `31`, then runs `scripts/post-pr-to-jira.sh` (maybe to add a comment with the PR link or update a custom field).
3. When `/make-clean` merges the PR, it transitions to "Done" using ID `41`, then reads and acts on `docs/jira/on-done.md` (your team's post-merge checklist).

**Resolution:** If `jira-workflow.yaml` exists and `jira.enabled` is set, skills use its values in place of the hard-coded IDs (falling back to `.claude/rules/jira.md` for any key it doesn't specify). If the file is absent, the current behavior is unchanged: read `.claude/rules/jira.md` and use the existing flow.

## Pluggable Git Workflow (External-Repo Offload)

You can offload git/PR steps to an **external repository** that owns the actual scripts and markdown. The plugin orchestrates *when* steps run; the external repo owns *what* they do.

### Example: Offload Before-PR and After-PR Steps to an External Repo

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

**What happens:**

1. On first use in a session, the plugin shallow-clones `git@code.ssnc.dev:BluedoorAIUK/test_codeReviewFlow.git` at `main` to `.claude/ssnc-agent-orch/.cache/test_codeReviewFlow@main/`.
2. The cache is reused for the rest of the session; it refreshes if `ref` changes.
3. When `/make` reaches the `before_pr` hook point, it runs each target from the cache dir:
   - Execute `scripts/lint.sh` (from the cloned repo).
   - Read and act on `flows/review.md` (from the cloned repo).
4. After the PR is created, it runs `scripts/post-merge-checks.sh` from the cache.

### Clone-and-Run Mechanism

1. On first use in a session: `git clone --depth 1 --branch <ref> <source> .claude/ssnc-agent-orch/.cache/<repo-name>@<ref>/` (for a SHA, clone then `checkout`).
2. Reuse the cache for the rest of the session; refresh if `ref` changed.
3. When a skill reaches a hook point listed under `git.steps`, run each target from the cache dir in order (scripts executed, markdown read-and-acted).
4. `.claude/ssnc-agent-orch/.cache/` is git-ignored — it is never committed.

### Safety Confirmation

Cloning and running third-party scripts is powerful. The skill **shows the `source`/`ref` and the list of steps to the user and gets confirmation before the first run in a session**, unless the user is running in an auto-approved permission mode (`--permission-mode dontAsk`).

Absent `git-workflow.yaml` ⇒ no clone, current git flow unchanged.

## team-work Extensibility

The `team-work` plugin supports the same extensibility model for its skills. Configuration lives in `.claude/ssnc-team-work/`.

### Example: Work-Publish After-Publish Hook

```yaml
skills:
  work-publish:
    before_publish: [scripts/check-pages-perms.sh]
    after_publish:  [scripts/announce-site.sh]
```

**What happens:**
1. Before `/team-work:work-publish` scaffolds the MkDocs site and deploys to GitHub Pages, it runs `scripts/check-pages-perms.sh` (maybe to verify the repository is public or that the Pages deployment key is loaded).
2. After the site is live, it runs `scripts/announce-site.sh` (maybe to post the URL to Slack or send an email).

### team-work Agents

The `team-work` plugin currently ships no standalone agents — its skills run inline or delegate to `agent-orch` agents. The `.claude/ssnc-team-work/agents.yaml` file is reserved so that:
- If `team-work` gains agents later, they extend the same way (`before`/`replace`/`after`).
- A team can override an `agent-orch` agent *specifically when invoked by a `team-work` skill* by listing it in `ssnc-team-work/agents.yaml` (team-work config takes precedence for team-work skills; otherwise `.claude/ssnc-agent-orch/agents.yaml` applies).

## How Resolution Works

When a skill or agent looks for extension config:

1. **Starts with `/`** and matches a known skill (e.g. `/agent-orch:simplify`, `/loop`) → invoke as a skill.
2. **Ends in `.yaml`** under a `.loop-library/` dir → treat as a loop-library loop.
3. **Ends in `.sh`/`.py`** or is executable → run as a script (cwd = repo root, or cache dir for git steps).
4. **Ends in `.md`** or is a glob → read-and-act on the matched markdown file(s).
5. **Otherwise** → warn (one line) and skip that target. **Never abort the host skill for a bad target.**

Relative paths are resolved from the consuming repo root (or, for `git.steps`, from the clone cache dir).

### Failure Policy

- **Missing config, malformed YAML, unreadable file** → treat as "no config": run as today.
- **A failing `before`/`after` target** → surface the error to the user, but still run the normal role unless the user aborts.
- **A failing `replace` target** → report and fall back to the normal role (do not leave the role unfilled).
- **Always tell the user when you ran an extension target**, so the behavior is observable.

## Getting Started

### Step 1: Copy the Templates

If you don't already have the config files, copy them from `examples/`:

```bash
# For agent-orch
mkdir -p .claude/ssnc-agent-orch
cp examples/ssnc-agent-orch/*.yaml .claude/ssnc-agent-orch/

# For team-work
mkdir -p .claude/ssnc-team-work
cp examples/ssnc-team-work/*.yaml .claude/ssnc-team-work/
```

Alternatively, run `/agent-orch:init-plugin` or `/agent-orch:upgrade-plugin` — they scaffold the config files automatically.

### Step 2: Uncomment What You Want

Open the relevant config file and uncomment the skill or agent you want to extend. For example, to run a format script before every commit in `/make`:

```yaml
skills:
  make:
    before_commit:
      - scripts/format.sh
#   before_pr: []
#   after_pr: []
```

### Step 3: Run the Skill or Agent

Run the skill as usual. The plugin will detect the config and run your extension targets at the documented hook points.

```bash
/agent-orch:make PROJ-123 Add JWT auth
```

You'll see log output showing when extension targets run:

```
[EXTENSION] Running before_commit hook for /make: scripts/format.sh
[EXTENSION] Completed before_commit hook
```

### Step 4: Revert (Just Comment It Out)

To revert, just comment out the extension config again. The skill will run as it did before — zero behavior change.

```yaml
# skills:
#   make:
#     before_commit:
#       - scripts/format.sh
```

## Full Contract

For the authoritative rules and resolution algorithm, see:
- **Contract**: [`plugins/agent-orch/rules/extensibility.md`](../../plugins/agent-orch/rules/extensibility.md)
- **Resolver snippet**: [`plugins/agent-orch/rules/extension-resolver.md`](../../plugins/agent-orch/rules/extension-resolver.md)
- **Examples**: [`examples/ssnc-agent-orch/`](../../examples/ssnc-agent-orch/) and [`examples/ssnc-team-work/`](../../examples/ssnc-team-work/)

## Summary

The extensibility framework gives you fine-grained control over agent behavior and skill lifecycle without forking the plugin. Inject repo-specific context, override agents entirely, or offload workflows to external repositories — all opt-in, all reversible by commenting out the config.

**Zero behavior change by default.** Extensibility is strictly additive. Your existing workflows are unaffected until you uncomment a config entry.
