# Agent Teams Quick Reference

Quick reference for using agent teams with agent-orch plugin.

## Setup (One Time)

```json
// .claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "teammateMode": "in-process"  // or "auto" for split panes
}
```

## When to Use

| Score | Specialists | Layers | Iterations | Use |
|-------|-------------|--------|------------|-----|
| 0-1 | 0-1 | 1 | 1 | Subagents (auto) |
| 2-3 | 1-2 | 1-2 | 1-2 | Subagents (auto) |
| 4-5 | 2-3 | 2 | 2 | Ask user |
| 6+ | 3+ | 2-3 | 2-3 | Agent teams (recommend) |

**Calculation:** `Score = specialists + (cross_layer ? 2 : 0) + iterations + dependencies`

## Command Pattern

### Create Team
```
"Create an agent team called 'build-[feature-name]'"
```

### Spawn Teammates
```
"Spawn teammates:
- Builder (implement features)
- Validator (test and validate)
- Scribe (documentation)
- [Specialists as approved]

All read ssnc-agent-orch/[session]/COORDINATION.md for protocols"
```

### Cleanup
```
"Ask all teammates to shut down"
"Clean up the team"
```

## Agent Communication

### Direct Messages

**Builder to Validator:**
```
@validator: Registration ready at src/api/auth/register.ts
```

**Validator to Builder:**
```
@builder: Test failure - missing null check at auth.ts:105
@builder: Fixed, please retest
```

**Security to Builder:**
```
@security: HIGH vulnerability at db/query.ts:67 - SQL injection
@builder: Fixed with parameterized queries, please re-audit
```

**Reviewer to Builder:**
```
@spec-reviewer: Missing requirement from PLAN.md:42
@builder: Added at auth.ts:115, please verify
```

### Broadcasting
```
@team: Database migration complete
```

### Escalation
```
@lead: Blocked - need architectural decision
```

## Session Files

```
ssnc-agent-orch/2026-02-22-feature/
├── PLAN.md           # Shared task list
├── STATUS.md         # Agent progress
└── COORDINATION.md   # Team metadata
```

### Task Claiming (PLAN.md)
```markdown
### Phase 1
- [claimed by: Builder] Implement endpoint
- [blocked by: endpoint] Write tests
- [in-progress by: Scribe] Document API
```

### Progress Tracking (STATUS.md)

**Subagent Mode:**
```markdown
## Builder Progress
- [x] Task 1
- [x] Task 2

## Evidence
[test output]
```

**Agent Team Mode:**
```markdown
## Team Activity Log

### 14:23
Builder → Validator: "Ready for testing"
Validator → Builder: "Test failure at auth.ts:105"
Builder → Validator: "Fixed, please retest"

## Agent Status
Builder: Idle (8/8 tasks complete, 12 messages sent)
Validator: Idle (Tests: 12 passed)
```

## Verification Gates (Hooks)

### TaskCompleted Hook
Blocks task completion without evidence.

**Required format:**
```markdown
## Agent Task Completion

### Task: [task name]

### Verification Command
```bash
npm test
```

### Evidence
[full output showing success]

### Status: VERIFIED COMPLETE
```

### TeammateIdle Hook
Blocks agent from finishing without completion evidence.

**Required format:**
```markdown
## Agent Completion: [AgentName]
**Timestamp**: [ISO timestamp]
**Status**: ✅ COMPLETED
**Tasks Completed**: X/X
**Evidence**: [test output or verification]
**Status**: VERIFIED COMPLETE
```

## Troubleshooting

### Not Using Teams
**Cause:** Score <4 (feature is simple)
**Solution:** Trust the detection, subagents are more efficient here

### Agents Not Messaging
**Cause:** Spawn prompts don't emphasize direct messaging
**Solution:** Add to spawn prompt: "Message @[agent] directly, don't wait for orchestrator"

### Too Many Interventions
**Cause:** Agents defaulting to STATUS.md instead of messaging
**Solution:** Update COORDINATION.md, reinforce messaging protocols

### Verification Gate Blocks
**Cause:** Missing evidence in STATUS.md
**Solution:** Run verification command, add output to STATUS.md

### Can't Go Idle
**Cause:** No completion marker or incomplete tasks
**Solution:** Add completion marker, check for unfinished assigned tasks

## Benefits

| Metric | Subagents | Agent Teams |
|--------|-----------|-------------|
| Orchestrator interventions | 20-30 | 3-5 |
| Direct agent messages | 0 | 40-50 |
| Autonomous iterations | 0 | 8-12 |
| Time saved | - | ~40% |

## Examples

### Simple Feature (Score 1) → Subagents
```
Task: Fix typo in validation message
Specialists: 0
Layers: 1 (backend only)
Iterations: 1
Score: 1
```

### Medium Feature (Score 3) → Subagents
```
Task: Add GET /users/:id endpoint
Specialists: 2 (API + Security)
Layers: 1 (backend)
Iterations: 2
Score: 3
```

### Complex Feature (Score 11) → Agent Teams
```
Task: JWT authentication with refresh tokens
Specialists: 4 (Security, Database, API, Performance)
Layers: 3 (Frontend + Backend + Database)
Iterations: 3
Dependencies: 8
Score: 11

With teams:
- 47 direct agent messages
- 3 orchestrator interventions
- 9 autonomous iterations
```

## Quick Decision Tree

```
Is feature complex (score >= 6)?
├─ Yes → Use agent teams
│   ├─ Spawn core team (Builder, Validator, Scribe)
│   ├─ Spawn approved specialists
│   └─ Let agents coordinate directly
│
└─ No → Use subagents (default)
    ├─ Launch agents in parallel
    └─ Synthesize results
```

## Key Reminder

**Agent teams excel at:**
- Multi-specialist coordination
- Iterative refinement (reviewers ↔ builders)
- Cross-layer features (API + DB + Frontend)

**Subagents excel at:**
- Well-defined tasks
- Single-domain work
- Simple features

Trust the automatic detection in Phase 0!
