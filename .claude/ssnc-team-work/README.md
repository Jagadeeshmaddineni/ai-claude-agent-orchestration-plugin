# `.claude/ssnc-team-work/` — team-work extension config

Drop this directory into a repo to extend or override team-work skills (and, in future,
agents) **without changing any default behaviour**.

> **Zero behaviour change by default.** Every file ships fully commented out. A commented
> (or absent) file is identical to having no config.

## Files

| File | What it controls |
|------|------------------|
| `skills.yaml` | Hook-point steps for team-work skills (`/work-publish` `after_publish`, `/create-release` `before_tag`, …) |
| `agents.yaml` | Reserved — `before`/`replace`/`after` for team-work agents (none today) and per-skill overrides of agent-orch agents |

team-work skills share the same Jira and git workflow config as agent-orch — they read
`.claude/ssnc-agent-orch/jira-workflow.yaml` and `.claude/ssnc-agent-orch/git-workflow.yaml`
when present.

Full contract and resolution rules: `plugins/agent-orch/rules/extensibility.md`.
