# Agent Orchestration Hooks

## Plugin Hook (Automatic)

The `hooks.json` file registers a `SessionStart` hook that displays a welcome message when the plugin loads. This works automatically when the plugin is installed.

## AI Code Governance Hook (Automatic)

The `validate-ai-commit.sh` script is registered as a `PreToolUse` hook (matcher: `Bash`) in `hooks.json`. It runs automatically whenever an agent executes a Bash command containing `git commit`.

**What it does:**
- Intercepts all `git commit` commands from agents
- Validates the commit message contains a `Co-authored-by:` trailer matching the configured format in `.agent-orch-models.json` → `commit_attribution` (GitHub user + harness + model(s), `<gh_user>@users.noreply.github.com` email). Falls back to the legacy `Claude ... <noreply@anthropic.com>` form when the config file is absent.
- Rejects the commit with instructions if the trailer is missing

**Exit codes:**
- `0` - Commit message is compliant (trailer present, or not a git commit command)
- `2` - Commit rejected (missing Co-authored-by trailer, feedback sent to agent)

This enforces the organization's AI Code Governance policy automatically. See `plugins/agent-orch/policies/ai-code-governance.md` for the full policy.

---

## Worktree Write Guard (Automatic)

The `guard-worktree-writes.sh` script (logic in `guard-worktree-writes.py`) is
registered as a `PreToolUse` hook (matcher: `Write|Edit|MultiEdit|NotebookEdit|Bash`)
in `hooks.json`. It is the **mechanical enforcement layer** behind
`plugins/agent-orch/rules/worktree-context.md`.

**The problem it solves:** When `/make` sets up a worktree, every downstream
agent is *supposed* to write only inside that worktree. Previously this was
instruction-only (prose in SKILL.md plus an exported `$MAKE_SESSION_FILE` that
does not actually survive across tool calls or into subagents). Agents drifted
and wrote files into the **primary** checkout instead — wrong branch, empty
worktree PRs, confused users. A prompt instruction can be ignored; a
`PreToolUse` hook returning exit 2 cannot.

**What it does:**
- Runs `git worktree list --porcelain` to find the primary checkout + worktrees
- Reads `<primary>/.claude/.make-session-*.json` for active `mode: worktree` sessions
- Resolves the write target (file_path for Write/Edit; redirect/`tee`/`mkdir`/`touch`
  target for Bash) and **blocks** it if it lands in the primary tree but outside
  the worktree

**Always allowed (exit 0):** writes inside the worktree, writes outside the
primary repo entirely (`../`, `/tmp`), writes under `<primary>/.claude/` and
`<primary>/.git/`, any tool when no worktree session is active, and everything
in branch mode (in-place edits are legitimate there).

**Exit codes:**
- `0` - Allowed (no worktree session, branch mode, in-worktree, or external)
- `2` - Blocked (write would drift into the primary tree; feedback names the
  correct in-worktree path)

**Fails open:** on any internal error or when `python3` is unavailable the hook
exits 0, degrading to the prior instruction-only behaviour so it can never
wedge a host.

---

## Agent Teams Quality Gate Hooks (Project-Level Setup)

The shell scripts in this directory enforce verification gates when using Agent Teams mode. These use `TeammateIdle` and `TaskCompleted` events which are **Agent Teams-specific hooks** and must be configured at the **project level**, not the plugin level.

### Setup

Add the following to your **project's** `.claude/settings.json`:

```json
{
  "hooks": {
    "TeammateIdle": [{
      "hooks": [{
        "type": "command",
        "command": "bash ~/.claude/plugins/cache/ssnc-agent-orch/agent-orch/1.1.0/hooks/check-teammate-tasks.sh $TEAMMATE_NAME"
      }]
    }],
    "TaskCompleted": [{
      "hooks": [{
        "type": "command",
        "command": "bash ~/.claude/plugins/cache/ssnc-agent-orch/agent-orch/1.1.0/hooks/verify-task-evidence.sh $TASK_ID"
      }]
    }]
  }
}
```

> **Note:** Adjust the path to match your installed plugin cache location. Run `cat ~/.claude/plugins/installed_plugins.json` to find the exact `installPath`.

### Hook Behavior

#### check-teammate-tasks.sh (TeammateIdle)

Runs when a teammate is about to go idle. Checks:
- All tasks assigned to the teammate are marked complete
- STATUS.md has been updated with completion evidence

**Exit codes:**
- `0` - Teammate can go idle (all tasks done)
- `2` - Teammate should continue working (sends feedback message)

#### verify-task-evidence.sh (TaskCompleted)

Runs when a task is being marked complete. Checks:
- STATUS.md contains a completion marker for the task
- Evidence section exists (not just "Done!" claims)
- Test output is present for implementation tasks

**Exit codes:**
- `0` - Task can be marked complete
- `2` - Task cannot be completed (sends feedback about missing evidence)

### Customization

Edit the scripts to match your project's conventions:
- Change the STATUS.md path for spec-kit vs standalone mode
- Adjust evidence requirements
- Add project-specific checks
