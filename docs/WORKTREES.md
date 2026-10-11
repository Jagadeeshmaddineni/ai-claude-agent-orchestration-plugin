# Git Worktrees with Agent Orchestration

## What Are Git Worktrees?

Git worktrees let you check out multiple branches of the same repository simultaneously in separate directories. When agents use `isolation: "worktree"`, each agent gets its own working copy - preventing file conflicts when multiple agents edit code in parallel.

## How Agent-Orch Uses Worktrees

### Automatic Worktree Isolation

When the orchestrator spawns agents in **Agent Teams mode**, code-editing agents (Builder, specialists) use worktree isolation:

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-builder"
  team_name: "build-feature"
  isolation: "worktree"          # <-- Each agent gets isolated copy
  prompt: "..."
```

This means:
- Builder works in `/path/to/repo/.worktrees/builder-abc123/`
- Validator works in `/path/to/repo/.worktrees/validator-def456/`
- They can edit the same files without conflicts

### When Worktrees Are Used

| Mode | Worktrees? | Why |
|------|-----------|-----|
| Subagent mode (simple) | No | Agents run sequentially, no conflicts |
| Agent Teams (code agents) | Yes | Parallel code editing needs isolation |
| Agent Teams (read-only agents) | No | Scribe, reviewers only read code |

### Automatic Cleanup

Worktrees are automatically cleaned up when:
- The agent completes without making changes
- The agent's changes are merged back to the main branch
- The team is deleted

If an agent made changes, the worktree path and branch name are returned so you can review and merge manually.

## Manual Worktree Usage

You can also use worktrees manually with Claude Code:

### Create a Worktree for a Feature

```bash
# Create worktree with new branch
git worktree add .worktrees/my-feature -b feature/my-feature

# Work in the worktree
cd .worktrees/my-feature
# ... make changes ...

# When done, merge back
cd ../..
git merge feature/my-feature
git worktree remove .worktrees/my-feature
```

### Safety: Protect Your .gitignore

Always ensure worktree directories are gitignored:

```bash
# Check if .worktrees is ignored
git check-ignore -q .worktrees && echo "Safe" || echo "Add to .gitignore!"

# Add if needed
echo ".worktrees/" >> .gitignore
```

### List Active Worktrees

```bash
git worktree list
```

### Clean Up Stale Worktrees

```bash
# Remove worktrees that no longer exist on disk
git worktree prune

# Remove a specific worktree
git worktree remove .worktrees/old-feature
```

## Best Practices

1. **Always use `.worktrees/` directory** - keeps worktrees organized and easy to gitignore
2. **Run setup after creating** - worktrees need `npm install`, `pip install`, etc. just like fresh clones
3. **Verify baseline tests pass** - run tests in the worktree before starting work
4. **Clean up after merging** - remove worktrees once changes are integrated
5. **Don't nest worktrees** - create them at the repository root level only

## Troubleshooting

### "fatal: is already checked out"
Another worktree already has that branch checked out. Use a different branch name or remove the existing worktree.

### Agent worktree not cleaning up
If a worktree persists after an agent finishes:
```bash
git worktree list          # See all worktrees
git worktree prune         # Clean stale entries
rm -rf .worktrees/stale    # Remove directory if needed
git worktree prune         # Clean again after removal
```

### Changes in worktree not visible
Worktrees share the same `.git` directory but have independent working trees. Changes need to be committed and merged to be visible across worktrees.
