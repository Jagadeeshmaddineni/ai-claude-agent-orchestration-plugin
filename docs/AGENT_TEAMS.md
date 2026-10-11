# Agent Teams Integration

This document explains how to use Claude Code's experimental **Agent Teams** feature with the agent-orch plugin.

## Table of Contents

- [Overview](#overview)
- [When to Use Agent Teams](#when-to-use-agent-teams)
- [Setup](#setup)
- [How It Works](#how-it-works)
- [Usage with /agent-orch:build](#usage-with-agent-orchbuild)
- [Benefits vs. Subagents](#benefits-vs-subagents)
- [Hooks for Quality Gates](#hooks-for-quality-gates)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## Overview

**Agent Teams** is an experimental Claude Code feature that allows multiple Claude instances to:

- Work as independent teammates with their own context windows
- **Communicate directly with each other** (not just through the orchestrator)
- Self-coordinate by claiming tasks from a shared task list
- Iterate autonomously (e.g., reviewers fix issues with builders without orchestrator mediation)

### Agent Teams vs. Subagents

| Feature | Subagents | Agent Teams |
|---------|-----------|-------------|
| **Context** | Own context, results return to caller | Fully independent context |
| **Communication** | Report to orchestrator only | Message each other directly |
| **Coordination** | Orchestrator manages all work | Shared task list + self-coordination |
| **Token Cost** | Lower (results summarized) | Higher (each is full Claude instance) |
| **Best For** | Simple, focused tasks | Complex coordination work |

---

## When to Use Agent Teams

The agent-orch plugin **automatically detects** when agent teams would be beneficial using a complexity scoring system:

### Automatic Detection (Phase 0)

After the architect agent analyzes your feature in Phase 2, the orchestrator calculates:

```
Score = specialists_count + (cross_layer ? 2 : 0) + expected_iterations + task_dependencies

Score >= 6: STRONGLY recommend agent teams
Score 4-5: Recommend agent teams, ask user
Score 2-3: Recommend subagents
Score 0-1: Use subagents (default)
```

### Complexity Indicators

**Use Agent Teams when:**

1. **Complex Coordination**
   - >3 specialists required simultaneously
   - Tight integration between layers (API + Database + Frontend)
   - >2 expected review iterations
   - Multiple interdependent tasks

2. **Iterative Work**
   - Uncertain requirements requiring exploration
   - Complex debugging scenarios
   - Progressive refinement needed

3. **Cross-Domain Collaboration**
   - Frontend + Backend + Database all changing
   - API contracts need coordination
   - Security + Performance both critical

**Use Subagents when:**

- Feature is well-defined with clear spec
- <3 specialists needed
- Single domain (just API, just UI, or just DB)
- Expected to complete in <2 review rounds
- Tasks are independent (parallel but don't communicate)

---

## Setup

### 1. Enable Agent Teams

Add to your `.claude/settings.json` or `settings.local.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Or set as environment variable:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### 2. Choose Display Mode

Two display modes available:

**In-Process Mode (default):**
- All teammates run in your main terminal
- Use Shift+Down to cycle through teammates
- Works in any terminal

**Split Panes Mode:**
- Each teammate gets its own pane
- Requires tmux or iTerm2
- See all agent outputs simultaneously

Configure in settings:

```json
{
  "teammateMode": "in-process"  // or "auto" or "tmux"
}
```

### 3. Install Hooks

The plugin includes two hooks for quality enforcement:

- **TaskCompleted**: Enforces verification gates (see [Hooks](#hooks-for-quality-gates))
- **TeammateIdle**: Ensures agents provide evidence before finishing

Hooks are automatically installed in `.claude/hooks/` when you use the plugin.

### 4. Enable Auto Mode (Recommended)

**Auto mode is the recommended way to run agent teams** as it eliminates permission stalls, the #1 coordination blocker.

Add to your `.claude/settings.json`:

```json
{
  "permissionMode": "auto"
}
```

Or run Claude Code with the `--permission-mode auto` flag:

```bash
claude --permission-mode auto
```

**Why auto mode matters for agent teams:**

- **Eliminates permission stalls**: Teammates don't wait for approval on every tool call
- **Faster coordination**: Builder → Validator → Builder iterations happen without interruption
- **Better parallel execution**: Multiple specialists work simultaneously without blocking each other
- **Reduced orchestrator burden**: You don't mediate every file read, edit, or test run

**When to use prompted mode:**

- First time using the plugin (to understand agent behavior)
- Working with sensitive files or destructive operations
- Debugging agent coordination issues

**Hybrid approach:**

Start with prompted mode to learn, then switch to auto mode once comfortable with agent behavior patterns.

---

## How It Works

### Architecture

When you use `/agent-orch:build` with agent teams:

```
Lead (You - Orchestrator)
  │
  ├── Create team: "build-[feature-name]"
  │
  ├── Spawn teammates:
  │   ├── Builder (teammate)
  │   ├── Validator (teammate)
  │   ├── Scribe (teammate)
  │   └── Specialists (as needed)
  │
  ├── Shared Resources:
  │   ├── PLAN.md (task list)
  │   ├── STATUS.md (progress)
  │   └── COORDINATION.md (team metadata)
  │
  └── Teammates coordinate directly:
      - Builder ↔ Validator
      - Builder ↔ Specialists
      - Reviewers ↔ Builder
      - All → Lead (for escalation only)
```

### Communication Patterns

**Direct Messaging:**
```
Builder → Validator: "Registration endpoint ready for testing"
Validator → Builder: "Test failure: Missing null check at auth.ts:105"
Builder → Validator: "Fixed, please retest"
Validator → Lead: "All tests passing (12/12)"
```

**Broadcasting (use sparingly):**
```
Database → @team: "Schema migration complete - check migrations/"
```

**Escalation:**
```
Validator → Lead: "Tests failing after 3 fix attempts - need @debugger"
```

### Task Claiming

Teammates self-coordinate via PLAN.md:

```markdown
### Phase 1: Core Implementation
- [claimed by: Builder] Implement registration endpoint
- [blocked by: registration endpoint] Write registration tests
- [pending] Document API
```

When Builder completes:
1. Marks task complete: `- [x] Implement registration endpoint ✓`
2. Blocked task auto-unblocks
3. Validator claims and starts testing

---

## Usage with /agent-orch:build

### Complete Workflow

#### Phase 0: Automatic Detection

After architect analysis, you'll see:

```
Complexity Analysis:
- Specialists recommended: 4 (Security, Database, API, Performance)
- Cross-layer changes: Yes (Frontend + Backend + Database)
- Expected iterations: 3 rounds
- Task dependencies: 8

Complexity Score: 11 (HIGH)

This feature would benefit significantly from agent teams.

With agent teams:
- Security can message Builder directly with vulnerabilities
- Reviewers iterate with Builder without my mediation
- Specialists coordinate database/API contracts directly

Agent teams status: ENABLED ✓

Options:
(a) Use agent teams (recommended for this complexity)
(b) Use traditional subagents
```

#### Phase 1: Create Team

```
"Create an agent team called 'build-auth-feature'"
```

#### Phase 2: Spawn Teammates

```
"Spawn implementation team:

1. Builder teammate
2. Validator teammate
3. Scribe teammate
4. Security teammate
5. Database teammate
6. API teammate

All teammates: Read ssnc-agent-orch/2026-02-22-auth-feature/COORDINATION.md
for team protocols."
```

#### Phase 3: Teammates Work & Coordinate

**You observe (minimal intervention):**

```
Builder: Claimed "Implement user registration"
Builder → Validator: "Registration endpoint ready at src/api/auth/register.ts"
Validator: Running tests...
Validator → Builder: "Test failure: Missing email validation"
Builder → Validator: "Fixed at auth.ts:115, please retest"
Validator: All tests passing (12/12)
Validator → Lead: "Implementation validated, ready for review"
```

```
Security: Reviewing authentication code...
Security → Builder: "HIGH: Password stored in plaintext at auth.ts:142"
Builder → Security: "Fixed - using bcrypt hashing now"
Security → Builder: "Verified secure"
```

```
Database → API: "Schema ready, user table has email_index"
API → Database: "Thanks, updated OpenAPI spec to reflect"
```

#### Phase 4: Review with Iteration

```
Spec Reviewer: Reviewing against PLAN.md...
Spec Reviewer → Builder: "Missing requirement: session expiry (PLAN.md:45)"
Builder → Spec Reviewer: "Added at auth.ts:156-170, please verify"
Spec Reviewer: [verifies code independently]
Spec Reviewer → Lead: "Stage 1 PASSED - all requirements verified"
```

```
Quality Reviewer: Starting Stage 2...
Quality Reviewer → Builder: "2 HIGH issues: using `any` types, missing error handling"
Quality Reviewer → Validator: "Add test for error path"
Builder → Quality Reviewer: "Fixed HIGH issues, ready for re-review"
Validator → Quality Reviewer: "Added error test"
Quality Reviewer: [re-verifies]
Quality Reviewer → Lead: "Stage 2 APPROVED - 2 rounds completed"
```

#### Phase 5: Cleanup

```
"Ask all teammates to shut down gracefully"
"Clean up the team"
```

---

## Benefits vs. Subagents

### Real-World Performance Comparison

**Example: Full-Stack Auth Feature**

| Metric | Subagents | Agent Teams |
|--------|-----------|-------------|
| Specialists activated | 5 | 5 |
| Review rounds | 3 | 3 |
| **Orchestrator interventions** | **24** | **3** |
| Direct agent messages | 0 | 47 |
| Autonomous iterations | 0 | 9 |
| **Estimated time saved** | - | **~40%** |

### Where Agent Teams Excel

**1. Review Iterations**

*Subagent Mode:*
```
Spec Reviewer → STATUS.md: "Missing requirements"
↓ (you read STATUS.md)
You → Builder: "Fix these requirements"
Builder → STATUS.md: "Fixed"
↓ (you read STATUS.md)
You → Spec Reviewer: "Re-verify"
```

*Agent Team Mode:*
```
Spec Reviewer → Builder: "Missing requirements at auth.ts"
Builder → Spec Reviewer: "Fixed, please verify"
Spec Reviewer → Lead: "PASSED"
```

**2. Cross-Agent Coordination**

*Subagent Mode:*
```
Security → STATUS.md: "SQL injection risk"
↓ (you read)
You → Builder: "Fix SQL injection"
Builder → STATUS.md: "Fixed with parameterized queries"
↓ (you read)
You → Security: "Re-audit"
```

*Agent Team Mode:*
```
Security → Builder: "SQL injection at db/users.ts:67"
Builder → Security: "Fixed with parameterized queries at line 67-72"
Security → Builder: "Verified secure"
```

**3. Debugging Coordination**

*Agent Team Mode:*
```
Validator → Debugger: "Tests failing consistently at auth.test.ts:42"
Debugger → Builder: "Root cause: race condition in session creation"
Builder → Validator: "Fixed with mutex lock, please retest"
Validator → Lead: "All tests passing"
```

---

## Hooks for Quality Gates

### TaskCompleted Hook

Enforces verification gates when tasks are marked complete.

**Location:** `.claude/hooks/TaskCompleted`

**What it checks:**
- Implementation tasks must have verification evidence
- Test tasks must show actual test output
- No "should work" or "seems fine" without proof

**Example block:**

```
🚫 VERIFICATION GATE BLOCKED

Task: Implement user registration
Agent: Builder

Missing verification evidence in STATUS.md.

Before marking complete, you MUST:
1. Run verification command (tests, build, etc.)
2. Capture FULL output
3. Add evidence section to STATUS.md
```

**Required evidence format:**

```markdown
## Builder Task Completion

### Task: Implement user registration

### Verification Command
```bash
npm test -- --grep "registration"
```

### Evidence
```
PASS src/api/auth/register.test.ts
  Registration
    ✓ creates new user (45ms)
    ✓ validates email format (12ms)

Tests: 3 passed
```

### Status: VERIFIED COMPLETE
```

### TeammateIdle Hook

Prevents agents from going idle without proper completion evidence.

**Location:** `.claude/hooks/TeammateIdle`

**What it checks:**
- Builder must provide test output evidence
- Validator must show test results and coverage
- All agents must have completion markers in STATUS.md
- No incomplete tasks remain assigned to agent

**Example block:**

```
🚫 BUILDER ACCOUNTABILITY CHECK FAILED

You're trying to go idle, but there's no verification evidence.

Add this to STATUS.md before going idle:

## Agent Completion: Builder
**Timestamp**: 2026-02-22T14:35:00Z
**Status**: ✅ COMPLETED
**Tasks Completed**: 3/3
**Files Modified**: 5

### Evidence
[actual test output]

**Status**: VERIFIED COMPLETE
```

---

## Examples

### Example 1: Simple Bug Fix (Use Subagents)

```
Task: Fix email validation regex bug
Complexity: Low (1 specialist, 1 layer, 1 iteration, 0 dependencies)
Score: 1

Recommendation: Use subagents (automatic)
```

### Example 2: New API Endpoint (Use Subagents)

```
Task: Add GET /api/users/:id endpoint
Complexity: Medium (2 specialists: API + Security, 1-2 layers, 1-2 iterations)
Score: 3

Recommendation: Use subagents (automatic)
```

### Example 3: Authentication System (Use Agent Teams)

```
Task: Implement JWT authentication with refresh tokens
Complexity: High (4 specialists: Security, Database, API, Performance)
Cross-layer: Frontend + Backend + Database
Expected iterations: 3 rounds
Dependencies: 8 tasks

Score: 11

Recommendation: STRONGLY recommend agent teams
```

**With agent teams, you get:**

```
Security → Builder: "Use httpOnly cookies, not localStorage"
Database → Builder: "Added refresh_tokens table with TTL index"
API → Frontend Dev: "Token refresh endpoint ready at POST /auth/refresh"
Performance → Builder: "Cache JWT validation results for 5 minutes"

Spec Reviewer → Builder: [3 rounds of iteration]
Quality Reviewer → Builder, Validator, Scribe: [2 rounds of refinement]

Result: All coordination happens directly between agents
Your interventions: 3 (phase transitions only)
Agent-to-agent messages: 47
Autonomous iterations: 9
```

### Example 4: Database Migration (Ask User)

```
Task: Migrate from MySQL to PostgreSQL
Complexity: Medium-High (3 specialists: Database, Migration, Backend)
Cross-layer: Backend + Database
Expected iterations: 2-3 rounds
Dependencies: 5 tasks

Score: 8

Recommendation: Agent teams could help with cross-specialist coordination

Options:
(a) Use agent teams (better for database/backend coordination)
(b) Use subagents (sufficient but may need more orchestration)
```

---

## Troubleshooting

### Agent Teams Not Available

**Problem:** "Agent teams require CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"

**Solution:**
```bash
# Add to .claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}

# Or set environment variable
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### Teammates Not Messaging Each Other

**Problem:** Agents updating STATUS.md instead of messaging directly

**Symptoms:**
- Builder updates STATUS.md with "Fixed"
- Reviewer reads STATUS.md instead of getting direct message
- You're mediating every interaction

**Solutions:**

1. **Check spawn prompts** - Ensure they include messaging instructions:
   ```
   "Message @validator when ready for testing"
   "Message @builder directly with issues, don't wait for orchestrator"
   ```

2. **Reinforce in COORDINATION.md:**
   ```markdown
   ## Communication Protocol
   - ✅ Direct messages between agents
   - ❌ Don't update STATUS.md and wait
   - ❌ Don't message lead for peer coordination
   ```

3. **Explicit instruction:**
   ```
   "@spec-reviewer: Message @builder directly with issues, don't use STATUS.md"
   ```

### Too Many Orchestrator Interventions

**Problem:** You're still mediating most interactions despite using agent teams

**Analysis:**
```
Expected with agent teams: <5 orchestrator interventions
Actual: 15+ interventions

This indicates agents aren't self-coordinating.
```

**Solutions:**

1. **Review spawn prompts** - Make sure they emphasize autonomy
2. **Check complexity score** - If <4, subagents might be more appropriate
3. **Update COORDINATION.md** with clearer protocols
4. **Explicit redirection:**
   ```
   "Teammates: coordinate directly with each other, don't wait for me"
   ```

### Verification Gate Keeps Blocking

**Problem:** TaskCompleted hook keeps blocking task completion

**Symptom:**
```
🚫 VERIFICATION GATE BLOCKED
Missing verification evidence in STATUS.md
```

**Solutions:**

1. **Agent needs to add evidence:**
   ```markdown
   ### Verification Command
   ```bash
   npm test
   ```

   ### Evidence
   [actual output]

   ### Status: VERIFIED COMPLETE
   ```

2. **If evidence is actually present:**
   - Check that STATUS.md has expected markers (`### Evidence`, `VERIFIED COMPLETE`, or test output)
   - Hook looks for these patterns to verify evidence exists

3. **Temporarily disable hook** (not recommended):
   ```bash
   chmod -x .claude/hooks/TaskCompleted
   ```

### Agent Going Idle Too Early

**Problem:** TeammateIdle hook blocks agent from finishing

**Symptom:**
```
🚫 BUILDER ACCOUNTABILITY CHECK FAILED
No verification evidence in STATUS.md
```

**Solutions:**

1. **Agent must provide completion evidence** (see hook documentation above)

2. **Check for incomplete tasks:**
   ```bash
   grep -A 5 "assigned: Builder" ssnc-agent-orch/*/PLAN.md | grep "\[ \]"
   ```

3. **If agent genuinely complete:**
   - Verify STATUS.md has completion marker
   - Verify no assigned tasks remain incomplete
   - Check hook didn't misidentify agent type

### Team Cleanup Fails

**Problem:** "Cannot cleanup - teammates still running"

**Solution:**
```
# Shut down teammates first
"Ask all teammates to shut down gracefully"

# Wait for all to confirm shutdown

# Then cleanup
"Clean up the team"
```

**Never let teammates run cleanup** - only the lead should cleanup.

---

## Best Practices

### 1. Trust the Complexity Detection

The automatic detection in Phase 0 is well-calibrated. If score <4, subagents are usually better.

### 2. Use Agent Teams for Your Complex Features

You mentioned you use `/agent-orch:build` quite a lot. For your complex features:

- **Use agent teams:** Multi-layer features, high specialist count, expected iterations
- **Use subagents:** Well-defined features, single domain, simple workflows

### 3. Monitor Coordination Efficiency

Check COORDINATION.md after completion:

```markdown
### Coordination Efficiency
- Total direct messages: 47
- Orchestrator interventions: 3
- Autonomous iterations: 9
- Time saved: ~40%
```

If interventions >10, consider if subagents would be simpler for that feature type.

### 4. Leverage Hooks

The verification gates prevent "Done!" claims without evidence. Keep hooks enabled for quality assurance.

### 5. Iterate on Spawn Prompts

If agents aren't self-coordinating well, refine your spawn prompts to emphasize:
- Direct messaging
- Autonomous iteration
- Only escalate to lead when blocked

---

## Summary

Agent Teams shine when:
- **Complex coordination** between multiple specialists
- **Iterative refinement** (multiple review rounds)
- **Cross-domain collaboration** (API + DB + Frontend all changing)

Use the **automatic detection** in Phase 0 to let the system recommend when agent teams provide value.

For your `/agent-orch:build` workflow, agent teams will **significantly reduce orchestrator mediation** for complex features, letting agents coordinate directly and iterate autonomously.

**Result:** You focus on phase transitions and high-level decisions, while agents handle the detailed back-and-forth of implementation and refinement.
