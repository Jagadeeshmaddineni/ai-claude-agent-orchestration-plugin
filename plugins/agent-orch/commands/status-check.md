# Quick Status Check

Check the current status of your project without launching a full architect session.

## What This Does

This lightweight command reads your project state and provides a concise status report:
- Current feature/task progress
- Recent activity
- Active work streams
- Blockers or issues flagged
- Next steps or pending tasks

## When to Use

- Quick progress check before standup
- After pulling latest changes
- When returning to work after a break
- Before planning next task
- To verify what needs attention

## How It Works

1. Reads `ssnc-agent-orch/*/STATUS.md` files
2. Checks git status for uncommitted changes
3. Reviews `PLAN.md` for pending tasks
4. Scans for BLOCKED, WAITING, or ERROR states
5. Generates summary report

## Output Format

```markdown
# Project Status Report

**Last Updated**: [timestamp from STATUS.md]
**Session**: [session directory name]

## Current Work
- [Active feature/task from STATUS.md]
- [Progress percentage or completion state]

## Recent Activity
- [Last 3-5 significant events]

## Blockers
- [Any BLOCKED or WAITING states]
- [Dependencies or approvals needed]

## Next Steps
- [Top 3 pending tasks from PLAN.md]

## Uncommitted Changes
- [Files with uncommitted changes]
```

## Example Usage

```bash
# In Claude Code
/agent-orch:status-check

# Or via command directly
claude code "Check project status" --command agent-orch:status-check
```

## No Agent Overhead

This is a **command**, not a skill or agent:
- No agent spawning
- No multi-turn conversation
- Single-pass status summary
- Runs in seconds, not minutes

For deep analysis or planning, use `/agent-orch:build` with full architect support.
