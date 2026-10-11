# Wave Execution Pattern

This guide explains how to use wave execution for large features that exceed single-session capacity.

---

## Table of Contents

- [Overview](#overview)
- [When to Use Wave Execution](#when-to-use-wave-execution)
- [How Wave Execution Works](#how-wave-execution-works)
- [Wave Transition Protocol](#wave-transition-protocol)
- [Status Tracking Across Waves](#status-tracking-across-waves)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

**Wave execution** enables agent teams to tackle large features by breaking work into multiple waves, each with a fresh 200K token context window.

### Key Benefits

- **Prevents context degradation** in long implementation sessions
- **Fresh context per wave** means agents maintain focus and performance
- **Scales to features with 10+ tasks** that would overwhelm a single session
- **Maintains continuity** through STATUS.md hand-off between waves

### Wave vs. Single-Session

| Approach | Best For | Context | Task Count |
|----------|----------|---------|------------|
| **Single Session** | Well-scoped features | 200K tokens (shared) | 1-9 tasks |
| **Wave Execution** | Large features | 200K tokens per wave | 10+ tasks |

---

## When to Use Wave Execution

### Automatic Detection

The architect agent automatically recommends wave execution during Phase 0 analysis when:

```
Task count > 10
```

Example output:

```
Feature Analysis Complete

Recommended approach: WAVE EXECUTION

Reason:
- 15 tasks identified
- Estimated 8 files to modify
- Multiple specialist agents needed
- Feature complexity: HIGH

Recommendation: Break into 3 waves
- Wave 1: Core implementation (tasks 1-6)
- Wave 2: Integration & testing (tasks 7-11)
- Wave 3: Documentation & refinement (tasks 12-15)

Each wave gets fresh 200K context for optimal performance.
```

### Manual Override

You can request wave execution even for smaller features:

```bash
> /agent-orch:build --wave-mode
```

Or decline wave execution for large features:

```bash
# Architect recommends waves
"Use single-session mode instead"
```

---

## How Wave Execution Works

### Wave Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                        WAVE 1                                │
│  - Fresh 200K context                                        │
│  - Architect reads PLAN.md tasks 1-N                         │
│  - Builder + specialists implement                           │
│  - Validator tests                                           │
│  - STATUS.md updated with wave completion                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Hand-off: STATUS.md persists state
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        WAVE 2                                │
│  - Fresh 200K context (previous context discarded)          │
│  - Architect reads STATUS.md from Wave 1                     │
│  - Picks up from last completed task                         │
│  - Builder continues implementation                          │
│  - STATUS.md updated                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        WAVE N                                │
│  - Fresh context                                             │
│  - Reads previous wave STATUS.md                             │
│  - Completes remaining tasks                                 │
│  - Final review and approval                                 │
└─────────────────────────────────────────────────────────────┘
```

### Context Management

**What persists between waves:**
- PLAN.md (task list)
- STATUS.md (progress, decisions, blockers)
- COORDINATION.md (team protocols)
- Implementation files (code changes)

**What does NOT persist:**
- Agent conversation history
- Agent context windows (reset to 0)
- In-memory state

**Result:** Each wave starts fresh but has full visibility into prior decisions and progress.

---

## Wave Transition Protocol

### End of Wave

Builder must update STATUS.md with:

```markdown
## Wave N Completion

### Wave: 1
### Status: COMPLETE
### Timestamp: 2026-03-28T14:35:00Z
### Tasks Completed: 6/15
### Tasks Remaining: 9

### Completed This Wave
- [x] Task 1: Implement user registration
- [x] Task 2: Add email validation
- [x] Task 3: Create user table migration
- [x] Task 4: Add authentication middleware
- [x] Task 5: Write registration tests
- [x] Task 6: Document registration API

### Next Wave Should Start With
- [ ] Task 7: Implement login endpoint
- [ ] Task 8: Add JWT token generation
- [ ] Task 9: Create refresh token flow

### Files Modified This Wave
- src/api/auth/register.ts (created)
- src/db/migrations/001_users.sql (created)
- src/middleware/auth.ts (created)
- tests/auth/register.test.ts (created)

### Decisions Made
- Using bcrypt for password hashing (cost factor: 12)
- Session expiry: 24 hours
- Email validation regex: RFC 5322 compliant

### Blockers for Next Wave
None

### Notes for Wave 2
- JWT secret needs to be added to .env (documented in PLAN.md)
- Consider rate limiting for login endpoint
```

### Start of Wave

Architect reads previous wave STATUS.md:

```
"Read ssnc-agent-orch/[session-dir]/STATUS.md to understand Wave 1 completion"

# Architect will:
1. Identify last completed task
2. Read decisions made in previous wave
3. Check for blockers
4. Resume from next task
5. Spawn teammates with context from Wave 1
```

---

## Status Tracking Across Waves

### STATUS.md Wave Sections

```markdown
# Implementation Status

## Wave Tracking

### Wave 1: Core Implementation
- Status: COMPLETE ✓
- Tasks: 1-6 (6/6 complete)
- Duration: 2026-03-28 10:00 - 12:30
- Files modified: 4
- Review status: Stage 1 PASSED

### Wave 2: Integration & Testing
- Status: IN PROGRESS
- Tasks: 7-11 (2/5 complete)
- Started: 2026-03-28 14:00
- Current: Implementing JWT token flow

### Wave 3: Documentation & Refinement
- Status: PENDING
- Tasks: 12-15
- Blocked by: Wave 2 completion

## Current Wave: 2

[Rest of STATUS.md continues...]
```

### COORDINATION.md Wave Transitions

Track wave transitions in team activity log:

```markdown
## Team Activity Log

### 2026-03-28 [Wave 1 Start]
Lead: Created team build-auth-feature
Lead: Spawned Builder, Validator, Security, Database
Builder: Claimed tasks 1-6

### 2026-03-28 [Wave 1 Complete]
Builder: Completed tasks 1-6
Validator: All tests passing (12/12)
Lead: Wave 1 marked complete, shutting down teammates

### 2026-03-28 [Wave 2 Start]
Lead: Spawned new team for Wave 2
Architect: Read Wave 1 STATUS.md
Builder: Resuming from task 7
```

---

## Examples

### Example 1: Full-Stack Authentication (3 Waves)

**Feature**: JWT authentication with refresh tokens, password reset, email verification

**Wave 1: Core Authentication (Tasks 1-6)**
```bash
> /agent-orch:build "Implement JWT authentication"

# Architect recommends 3 waves (18 tasks total)
# You approve Wave 1 scope (tasks 1-6)

# Agents implement:
- User registration
- Password hashing
- Login endpoint
- JWT generation
- Auth middleware
- Basic tests

# Builder marks Wave 1 complete in STATUS.md
```

**Wave 2: Token Management (Tasks 7-12)**
```bash
# Fresh context, new team spawn
> Continue with Wave 2

# Architect reads Wave 1 STATUS.md
# Picks up from task 7

# Agents implement:
- Refresh token flow
- Token expiry handling
- Logout endpoint
- Token blacklist
- Integration tests
- Security review

# Builder marks Wave 2 complete
```

**Wave 3: Extended Features (Tasks 13-18)**
```bash
# Fresh context, new team spawn
> Continue with Wave 3

# Agents implement:
- Password reset flow
- Email verification
- Rate limiting
- Documentation
- E2E tests
- Final review

# Two-stage review (Stage 1 + Stage 2)
# Feature complete
```

### Example 2: Database Migration (2 Waves)

**Feature**: Migrate from MongoDB to PostgreSQL

**Wave 1: Schema & Core Migration**
- Design PostgreSQL schema
- Create migration scripts
- Migrate users & core tables
- Basic data validation

**Wave 2: Data Validation & Cutover**
- Migrate remaining tables
- Data integrity checks
- Performance testing
- Cutover documentation

---

## Best Practices

### 1. Natural Breaking Points

Choose wave boundaries at logical stopping points:

**Good wave boundaries:**
- ✅ After core implementation, before integration
- ✅ After backend complete, before frontend
- ✅ After data migration, before validation
- ✅ After implementation, before documentation

**Poor wave boundaries:**
- ❌ Middle of a feature implementation
- ❌ Between tightly coupled components
- ❌ During active debugging session

### 2. Document Decisions Thoroughly

Each wave should document:
- **What was completed** (task list with evidence)
- **Why decisions were made** (rationale for future waves)
- **What blockers exist** (for next wave to resolve)
- **What files changed** (so next wave knows what to read)

### 3. Verification Before Wave Transition

Before ending a wave:
- ✅ Run tests (all passing)
- ✅ Verify build succeeds
- ✅ Check no uncommitted changes
- ✅ Update STATUS.md with evidence
- ✅ Document any technical debt

### 4. Context Budget Per Wave

Each wave has 200K tokens shared across all agents:

**Reserve tokens for:**
- Reading STATUS.md from previous wave (5-10K tokens)
- Reading implementation files (varies)
- Agent coordination (varies)
- Two-stage review (20-30K tokens)

**Avoid in waves:**
- Reading entire codebase (use targeted reads)
- Excessive logging/verbose output
- Redundant status updates

### 5. Keep Waves Focused

**Ideal wave size:** 4-7 tasks per wave

**Too small:** Overhead of wave transitions exceeds benefits
**Too large:** Risk of context overflow within wave

### 6. Leverage Agent Teams with Waves

Wave execution works seamlessly with agent teams:

```bash
# Enable both features
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

> /agent-orch:build --wave-mode

# Each wave spawns fresh teammates
# Teammates coordinate within wave
# Lead manages wave transitions
```

---

## Troubleshooting

### Wave Not Resuming Correctly

**Problem:** Wave 2 starts from scratch instead of continuing from Wave 1

**Solution:**
1. Verify STATUS.md has Wave 1 completion marker
2. Check PLAN.md still exists with all tasks
3. Ensure architect reads STATUS.md at Wave 2 start

```bash
# Explicit instruction at Wave 2 start
"Read ssnc-agent-orch/[session-dir]/STATUS.md to see Wave 1 results before starting"
```

### Context Overflow Within Wave

**Problem:** Context fills up before wave completes

**Symptoms:**
- Agents losing track of earlier decisions
- Repeated questions about completed work
- Performance degradation

**Solutions:**
1. **Split wave earlier** - Move remaining tasks to next wave
2. **Reduce verbose output** - Trim STATUS.md updates
3. **Targeted file reads** - Don't read entire codebase

### Lost Context Between Waves

**Problem:** Wave 2 doesn't have critical information from Wave 1

**Solution:**
Ensure Wave 1 STATUS.md documents:
- Key decisions and rationale
- File paths of all changes
- Any non-obvious patterns used
- Blockers or warnings for next wave

### Too Many Waves

**Problem:** Feature broken into too many small waves

**Analysis:**
```
Wave 1: 2 tasks (2 hours)
Wave 2: 3 tasks (2.5 hours)
Wave 3: 2 tasks (2 hours)

Total: 7 tasks, 6.5 hours across 3 waves
```

**Better approach:**
```
Wave 1: 5 tasks (4 hours)
Wave 2: 2 tasks + review (3 hours)

Total: 7 tasks, 7 hours across 2 waves
Saved: 1+ hours of wave transition overhead
```

**Rule of thumb:** Use waves only when tasks >10 or complexity very high.

---

## Summary

Wave execution enables agent teams to:

- **Scale to large features** (10+ tasks)
- **Maintain performance** with fresh context per wave
- **Preserve continuity** through STATUS.md hand-offs
- **Work incrementally** with natural breakpoints

**When to use:**
- Task count >10 (automatic recommendation)
- Feature naturally divides into phases
- Single session would risk context overflow

**Key success factors:**
1. Choose logical wave boundaries
2. Document decisions thoroughly in STATUS.md
3. Verify completeness before wave transitions
4. Keep waves focused (4-7 tasks ideal)
5. Combine with agent teams for maximum efficiency

Wave execution is the bridge between single-session workflows and month-long epics, giving you the flexibility to tackle complex features while maintaining agent coordination quality.
