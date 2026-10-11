# Extensibility Framework (the contract)

This rule defines how **every** agent-orch and team-work skill and agent can be
extended or overridden by a repository, **without changing any default behaviour**.

> **Hard invariant — zero behaviour change by default.**
> If the config file is absent, unreadable, malformed, or contains no entry for the
> skill/agent in question (or an empty entry), the skill/agent behaves **exactly** as
> it does today. Extensibility is strictly additive and opt-in. A repository that has
> never heard of these files is unaffected.

---

## 1. Where config lives

| Plugin | Config directory | Files |
|--------|------------------|-------|
| agent-orch | `.claude/ssnc-agent-orch/` | `skills.yaml`, `agents.yaml`, `tracker.yaml`, `jira-workflow.yaml`, `github-workflow.yaml`, `git-workflow.yaml` |
| team-work | `.claude/ssnc-team-work/` | `skills.yaml`, `agents.yaml` |

These files ship (via `/agent-orch:init-plugin`, `/agent-orch:upgrade-plugin`, or by
copying from `examples/`) **fully commented out**, listing every skill and agent so a
team can uncomment exactly what it wants. A commented-out file is equivalent to no file:
zero behaviour change.

The config directory is in the **consuming repository** (the repo the user runs the
skill in), not in the plugin cache. The plugin ships *templates*; the repo owns its
*active* config.

---

## 2. Agent extension model — `before` / `replace` / `after`

`agents.yaml` maps an agent's short name (e.g. `architect`, `builder`, `security`) to up
to three optional keys:

```yaml
agents:
  architect:
    before:
      - docs/adr/*                 # globs/markdown run BEFORE our agent runs
    replace:                       # if set, REPLACES our agent entirely (see below)
    after:
      - .loop-library/architect.yaml   # markdown / loop-library refs run AFTER
```

Resolution for an agent named `X`:

1. **`before`** — a list of file globs / markdown paths / `/loop` refs / skill names.
   Each is run (read-and-act, in listed order) **before** our agent's own instructions.
   Use this to inject repo-specific context (ADRs, standards, checklists) ahead of the
   agent. Failures here are surfaced but do not silently skip our agent.

2. **`replace`** — when **non-empty**, the listed target *replaces* our agent. Instead of
   running the plugin's `orchestrate-X` definition, the orchestrator runs the user's
   extended agent from their repo (e.g. a path to the repo's own `architect` agent
   markdown, or a `/loop` / skill reference). The user's agent becomes *the* agent for
   that role in this run. When `replace` is empty/absent, our agent runs normally.

3. **`after`** — like `before`, but runs **after** our agent (or the replacement) finishes.
   Typical use: run a `/loop-library` loop or a repo post-processing checklist.

### Resolution order
```
if no entry for X (or entry empty)         → run orchestrate-X exactly as today. STOP.
run each item in `before` (in order)
if `replace` non-empty                     → run replacement target  (skip orchestrate-X)
else                                        → run orchestrate-X normally
run each item in `after` (in order)
```

`before` and `after` may be combined with `replace` freely.

---

## 3. Skill extension model — named hook points

`skills.yaml` maps a skill's short name (e.g. `make`, `build`, `work-publish`) to a set of
**named hook points** the skill exposes. Each hook point lists targets to run at that point:

```yaml
skills:
  make:
    before_commit:                 # run after /build, before staging/committing
      - scripts/format.sh
    before_pr:                     # run after push, before `gh pr create`
      - .loop-library/pre-pr-review.yaml
      - docs/checklists/pr-ready.md
    after_pr:                      # run after the PR is opened
      - scripts/notify-team.sh
```

A hook target may be:
- a **script** path (`*.sh`, `*.py`, …) — executed as a build step,
- a **markdown** path or glob — read-and-act instructions,
- a **`/loop` reference** (`/loop ...` or a `.loop-library/*.yaml` entry) — a bounded loop,
- a **skill name** (e.g. `/agent-orch:simplify`) — invoked inline.

Each skill documents which hook points it exposes in its own `## Extensibility` section.
**A skill only runs hook points it explicitly defines.** Unknown hook points in config are
ignored with a one-line warning. No hook config for a skill ⇒ the skill runs as today.

### Hook points exposed by core skills (authoritative list)
| Skill | Hook points |
|-------|-------------|
| `make` | `before_commit`, `before_pr`, `after_pr` |
| `make-bug` | `before_commit`, `before_pr`, `after_pr` |
| `build` | `before_plan`, `after_plan`, `before_review`, `after_build` |
| `make-clean` | `before_merge`, `after_merge` |
| `make-validate` | `before_validate`, `after_validate` |

Other skills expose hook points named in their own `## Extensibility` section (most expose
a `before` / `after` pair around their main work). When a skill lists no hook points, it is
not yet hook-enabled and config under it is ignored (still zero behaviour change).

---

## 4. Pluggable Jira workflow — `jira-workflow.yaml`

Today, Jira transition IDs, custom-field IDs, and lifecycle steps are read from
`.claude/rules/jira.md` and partly hard-coded in `/make`, `/build`, and `/make-clean`.
`jira-workflow.yaml` lets a team **override** that flow declaratively:

```yaml
jira:
  enabled: true                    # false → skip Jira entirely (same as jira_mode: no)
  transitions:                     # override the IDs/names used by the skills
    in_progress: "21"
    in_review:   "31"
    done:        "41"
  fields:
    start_date:  "customfield_10015"
    end_date:    "customfield_10016"
  lifecycle:                       # optional: run extra steps at lifecycle events
    on_start:  [docs/jira/on-start.md]
    on_review: [scripts/post-pr-to-jira.sh]
    on_done:   [docs/jira/on-done.md]
```

Resolution: if `jira-workflow.yaml` exists and `jira.enabled` is set, skills use its
values **in place of** the hard-coded IDs (falling back to `.claude/rules/jira.md` for any
key it doesn't specify). If the file is absent, the **current** behaviour is unchanged:
read `.claude/rules/jira.md` and use the existing flow.

---

## 5. Pluggable git workflow — `git-workflow.yaml` (external-repo offload)

A team can offload git/PR steps to an **external repo** that owns the actual scripts and
markdown. agent-orch orchestrates *when* steps run; the external repo owns *what* they do.

```yaml
git:
  source: git@code.ssnc.dev:BluedoorAIUK/test_codeReviewFlow.git
  ref: main                        # branch, tag, or SHA
  steps:                           # hook point → paths WITHIN the cloned repo
    before_pr:
      - scripts/lint.sh
      - flows/review.md
    after_pr:
      - scripts/post-merge-checks.sh
```

### Clone-and-run mechanism
1. On first use in a session, shallow-clone `source` at `ref` to
   `.claude/ssnc-agent-orch/.cache/<repo-name>@<ref>/`
   (`git clone --depth 1 --branch <ref>`; for a SHA, clone then `checkout`).
2. Reuse the cache for the rest of the session; refresh if `ref` changed.
3. When a skill reaches a hook point listed under `git.steps`, run each target from the
   cache dir in order (scripts executed, markdown read-and-acted).
4. `.claude/ssnc-agent-orch/.cache/` is git-ignored — it is never committed.

**Safety**: cloning and running third-party scripts is powerful. The skill MUST show the
`source`/`ref` and the list of steps to the user and get confirmation before the first run
in a session, unless the user is running in an auto-approved permission mode. Absent
`git-workflow.yaml` ⇒ no clone, current git flow unchanged.

---

## 6. Pluggable issue tracker — `tracker.yaml` + `github-workflow.yaml`

The issue tracker is **backend-neutral**. A repo selects Jira or GitHub Issues with one
setting; the orchestration skills use the normalized verbs in
`plugins/agent-orch/rules/tracker-provider.md`, so the rest of the workflow is identical.

**Selector** (`.claude/ssnc-agent-orch/tracker.yaml`, or `.make-config.md` `tracker:`):

```yaml
tracker:
  provider: github                 # jira | github | none
```

Resolution precedence: `tracker.yaml` → `.make-config.md` `tracker:` →
`.make-config.md` `jira_mode:` back-compat (`yes`/`ask-me` ⇒ jira, `no` ⇒ none) →
default `jira`. Absent everything ⇒ **jira**, the current behaviour, unchanged.

- `jira` → context cached in `.claude/rules/jira.md` via `/agent-orch:jira`; verbs map to
  `mcp__jira__*` (overridable by `jira-workflow.yaml`, §4).
- `github` → context cached in `.claude/rules/github.md` via `/agent-orch:github-issues`;
  verbs map to `gh` on `code.ssnc.dev`. Status lifecycle is configured by
  `github-workflow.yaml`:

```yaml
github:
  enabled: true
  status_model: labels             # labels (default) | project
  statuses:
    in_progress: "status:in-progress"
    in_review:   "status:in-review"
    done:        close              # `close` ⇒ gh issue close
  # project mode drives a Projects v2 single-select Status field (opt-in)
```

Templates: `examples/ssnc-agent-orch/tracker.yaml`, `examples/ssnc-agent-orch/github-workflow.yaml`.
The governance harness labels (`claude-code-agent-harness`, `human-review-required`) are
identical across both backends. Full contract: `tracker-provider.md`.

---

## 7. Target resolution (how a path/ref is interpreted)

When a hook lists a target, resolve it in this order:
1. Starts with `/` and matches a known skill (e.g. `/agent-orch:simplify`, `/loop`) → invoke as a skill.
2. Ends in `.yaml` under a `.loop-library/` dir → treat as a loop-library loop.
3. Ends in `.sh`/`.py`/executable → run as a script (cwd = repo root, or cache dir for git steps).
4. Ends in `.md` or is a glob → read-and-act on the matched markdown file(s).
5. Otherwise → warn (one line) and skip that target. Never abort the host skill for a bad target.

Relative paths are resolved from the consuming repo root (or, for `git.steps`, from the
clone cache dir).

---

## 8. Authoring rule for wired skills/agents

Every skill and agent that participates points at the shared resolver snippet rather than
restating this algorithm. See `extension-resolver.md`. The wired `## Extensibility` section
is short: it names the config file, the entry key, the hook points it exposes (skills) or
confirms before/replace/after support (agents), and links here for the full contract.

**When in doubt, do nothing different.** The default path is always "behave as today."
