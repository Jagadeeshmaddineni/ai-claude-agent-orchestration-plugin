# GitHub Issues as a Swappable Tracker Backend (alongside Jira)

**Date**: 2026-06-29
**Branch**: `feat/github-issues-tracker`
**Audience**: anyone running Claude Code with the agent-orch plugin
**Versions**: `agent-orch` 2.35.0 → **2.36.0**; marketplace 2.45.0 → **2.46.0**

This release makes the issue tracker **pluggable**. Until now, agent-orch's
work-tracking (`/make`, `/build`, `/make-clean`, the work queue, the Advocate) was
hard-wired to **Jira** via the MCP server. You can now run the exact same workflow
against **GitHub Issues on `code.ssnc.dev`** through the `gh` CLI — and **swap between
the two per repo** with a single config line.

> **Zero behaviour change by default.** Existing repos keep using Jira with no
> changes. The default tracker is `jira`; if you never set `tracker:`, nothing about
> your workflow moves.

## Why

Not every team lives in Jira. Some SS&C repos coordinate work entirely in **GitHub
Issues on the Enterprise instance** (`code.ssnc.dev`). They still want the
human-on-the-loop agent harness — pick an agent-ready issue, hand it to `/build`,
track status, close it on merge — without standing up Jira or the MCP server. This
release gives them that, and it does so through a **backend-neutral contract** so the
choice is one setting, not a fork.

## The model: select a backend, keep the workflow

Three layers, mirroring how the plugin already handles `jira_mode`:

1. **Selector** — `.make-config.md` gains a `tracker:` line (`jira` | `github` |
   `none`), or `.claude/ssnc-agent-orch/tracker.yaml` for a finer-grained override.
   This is the swap.
2. **Provider contract** — a new rule, `plugins/agent-orch/rules/tracker-provider.md`,
   defines normalized verbs (`get_issue`, `list_agent_ready`, `create_issue`,
   `assign`, `set_status`, `comment`, `link`, `add_label`…). The consuming skills call
   these verbs; the contract maps them to Jira (`mcp__jira__*`) or GitHub (`gh`).
3. **Context cache** — `/agent-orch:jira` caches `.claude/rules/jira.md`;
   `/agent-orch:github-issues` caches `.claude/rules/github.md`. Both emit the **same
   normalized `## Tracker Contract` header**, so skills read one shape regardless of
   backend.

```
.make-config.md
  tracker: github          # ← swap here. Repo A stays jira, Repo B goes github.
```

Because every consuming skill talks to the contract, **the rest of the workflow is
identical** — same branch/PR flow, same harness labels, same `/build` handoff.

## How to use it

Point a repo at GitHub Issues:

```bash
# one-time: authenticate gh for the Enterprise host
GH_HOST=code.ssnc.dev gh auth login        # choose GitHub Enterprise Server

# in the repo: select the backend and cache context
#   .make-config.md  →  tracker: github
/agent-orch:github-issues                  # discovers the repo, writes .claude/rules/github.md
```

Then everything works as before:

```bash
/agent-orch:github-issues work             # agent-ready queue (the /jira-work equivalent)
/agent-orch:github-issues triage           # classify unlabeled issues for agent work
/agent-orch:make "#42"                      # /make resolves GitHub issue #42, assigns @me,
                                           #   sets status, opens a PR with "Closes #42"
/agent-orch:make-clean                     # merge → the issue closes (Done)
```

The **governance harness is identical** to Jira — the same two labels gate agent work
on both backends:

| Label | Meaning |
|-------|---------|
| `claude-code-agent-harness` | Agent-ready — appears in the work queue |
| `human-review-required` | A human must approve before agent work begins |

## The one real difference: status

Jira has rich workflow transitions; GitHub Issues has only open/closed plus labels.
The lifecycle maps two ways, chosen per repo in
`.claude/ssnc-agent-orch/github-workflow.yaml`:

- **`labels` (default, zero setup)** — `status:in-progress` → `status:in-review`, then
  the issue is **closed** for Done. Status labels are auto-created on first use. Works
  on any repo.
- **`project` (opt-in)** — drive a GitHub **Projects v2** single-select Status field.
  Richer board, but requires a Project wired up and a project-scoped token.

```yaml
github:
  enabled: true
  status_model: labels
  statuses:
    in_progress: "status:in-progress"
    in_review:   "status:in-review"
    done:        close
```

## Identity and host, done safely

- **Identity is resolved live, never cached.** On GitHub that means the literal `@me`
  in `gh` flags (the server resolves the token's user). We deliberately avoid
  `gh api user` for routine work — the token may lack `read:user` scope. This mirrors
  the existing Jira rule (`mcp__jira__jira_getCurrentUser` at point of use).
- **Enterprise host throughout.** Every `gh`/`git` call runs with
  `GH_HOST=code.ssnc.dev`, and code references cite `https://code.ssnc.dev/`. The
  plugin already used this host in `/make-validate`, `/make-clean`, and `/release-me`.

## What changed (for plugin authors)

- **New skill**: `plugins/agent-orch/skills/github-issues/SKILL.md` — the GitHub
  backend (context cache + `work` + `triage`), structural twin of `/agent-orch:jira`.
- **New rule (the keystone)**: `plugins/agent-orch/rules/tracker-provider.md` — the
  normalized verb contract and the Jira/GitHub mappings, including the GitHub status
  model.
- **New templates**: `examples/ssnc-agent-orch/tracker.yaml` (selector) and
  `examples/ssnc-agent-orch/github-workflow.yaml` (status model), both fully commented
  out (a commented file == no file == Jira default).
- **Selector + back-compat**: `.make-config.md` gains `tracker:`; absent it, the legacy
  `jira_mode` is mapped (`yes`/`ask-me` ⇒ jira, `no` ⇒ none).
- **Tracker-neutralized consumers** (additive, no default change): `/make` Phase 0.5,
  `/build` issue-pickup, `/make-clean` Done transition, `/jira-work` (GitHub redirect),
  the Advocate's coordination protocol, and the triage agent — each now dispatches
  through the provider contract when `tracker: github`, and behaves exactly as before
  when `tracker: jira`. `/jira` now also writes the shared `## Tracker Contract` header.
- **Extensibility framework**: new §6 documents `tracker.yaml` + `github-workflow.yaml`;
  the config-files table lists them.
- **Versions**: agent-orch `2.35.0 → 2.36.0`, marketplace `2.45.0 → 2.46.0`. Docs
  synced (README, CHEAT-SHEET, skill count 30 → 31).

## Relationship to existing skills

This sits next to `/agent-orch:jira` + `/agent-orch:jira-work`, not on top of them.
Jira repos are untouched. A repo opts into GitHub by setting `tracker: github` and
running `/agent-orch:github-issues`. Both backends share the same human-on-the-loop
labels, the same work queue behaviour, and the same `/build`/`/implement` handoff —
only the transport (MCP vs `gh`) and the status mechanics differ.
