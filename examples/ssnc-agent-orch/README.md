# `.claude/ssnc-agent-orch/` — agent-orch extension config

Drop this directory into a repo (copy from this `examples/` folder, or let
`/agent-orch:init-plugin` / `/agent-orch:upgrade-plugin` scaffold it) to extend or
override agent-orch skills and agents **without changing any default behaviour**.

> **Zero behaviour change by default.** Every file ships fully commented out. A commented
> (or absent) file is identical to having no config. Uncomment only what you want to change.

## Files

| File | What it controls |
|------|------------------|
| `skills.yaml` | Hook-point steps for skills (`/make` `before_pr`, `/build` `after_build`, …) |
| `agents.yaml` | `before` / `replace` / `after` extension of each orchestration agent |
| `jira-workflow.yaml` | Override the Jira transitions/fields/lifecycle used by `/make`, `/build`, `/make-clean` |
| `git-workflow.yaml` | Offload git/PR steps to an external repo (clone-and-run) |

## Quick start

1. Copy this folder to your repo's `.claude/ssnc-agent-orch/`.
2. Open the file you want, uncomment a block, point it at your scripts/markdown/loops.
3. Run the skill as usual — it now honours your config. Remove the block to revert.

The `.cache/` subdirectory (used by `git-workflow.yaml`) is git-ignored and created on
demand.

Full contract and resolution rules: `plugins/agent-orch/rules/extensibility.md`.
