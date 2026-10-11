# CLAUDE.md Protection Policy

**CLAUDE.md files are human-owned.** Agents MUST NOT write to, append to, edit, or modify any `CLAUDE.md` file — whether the root `CLAUDE.md` or any subdirectory `CLAUDE.md`.

## Where to Write Instead

| What you need to persist | Where to write it |
|--------------------------|-------------------|
| Build configuration overrides (coverage targets, TDD mode, etc.) | `.claude/rules/build-overrides.md` |
| Conventions or standards discovered during a session | `${SESSION_DIR}/conventions.md` |
| Agent notes, findings, or recommendations | `${SESSION_DIR}/STATUS.md` or `${SESSION_DIR}/PLAN.md` |
| Quality gate results or review findings | `${SESSION_DIR}/` (appropriate file) |

## Why

`CLAUDE.md` is the project constitution — it controls what agents load into context. Uncontrolled writes cause:
- **Context bloat**: Monolithic CLAUDE.md files waste tokens on every agent spawn
- **Drift from setup-claude-md**: The hierarchical structure gets flattened back into a single file
- **Conflicting instructions**: Agents append contradictory sections over multiple sessions
- **Upgrade breakage**: `/upgrade-plugin` cannot safely merge files that agents have modified unpredictably

## The Rule

1. **NEVER** use Write or Edit tools on any file named `CLAUDE.md`
2. **NEVER** suggest "add this to CLAUDE.md" in status updates or recommendations
3. If a user asks you to update CLAUDE.md, suggest they run `/agent-orch:setup-claude-md` instead
4. If you need to persist configuration, use `.claude/rules/` (always auto-loaded) or the session directory
