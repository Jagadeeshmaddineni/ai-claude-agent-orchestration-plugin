# Architecture Documentation

This document explains the architectural decisions, design patterns, and underlying philosophy of the Claude Agent Orchestration plugin.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Three-Tier System](#three-tier-system)
3. [Why 15 Agents?](#why-15-agents)
4. [Two-Stage Review Process](#two-stage-review-process)
5. [Verification Gates](#verification-gates)
6. [Agent Communication Patterns](#agent-communication-patterns)
7. [Distrust-But-Verify Review](#distrust-but-verify-review)
8. [4-Phase Debugging Methodology](#4-phase-debugging-methodology)
9. [Parallel Execution Model](#parallel-execution-model)
10. [Spec-Kit Native Design](#spec-kit-native-design)
11. [Session-Based Directory Design](#session-based-directory-design-standalone-mode)

---

## Design Philosophy

### Why Multi-Agent Orchestration?

Traditional single-agent coding workflows suffer from fundamental limitations:

1. **Sequential Bottlenecks** - One agent doing implementation → testing → documentation creates unnecessary delays
2. **Context Switching Overhead** - Switching between implementation, security review, and optimization mindsets reduces effectiveness
3. **Expertise Dilution** - A general-purpose agent can't match specialized agents for specific domains
4. **Quality Inconsistency** - Without dedicated reviewers, quality checks happen sporadically or not at all

### Core Goals

The Claude Agent Orchestration plugin addresses these issues through:

**1. Separation of Concerns**
Each agent has a single, well-defined responsibility. The Builder doesn't worry about documentation - the Scribe handles that. The Validator doesn't implement features - it validates them.

**2. Parallel Execution**
When implementing user authentication:
- Builder writes the auth endpoint
- Validator creates test cases
- Scribe drafts API documentation
- Security Auditor reviews for OWASP vulnerabilities
- Database Architect designs the user schema

All simultaneously, not sequentially.

**3. Specialized Expertise**
A Security Auditor agent trained exclusively on security concerns will find vulnerabilities a general agent might miss. A Performance Analyst agent tuned for optimization will spot N+1 queries more reliably.

**4. Quality by Design**
Two-stage review isn't optional or something you remember to do - it's structurally enforced. Every implementation passes through Stage 1 (Spec Compliance) and Stage 2 (Code Quality) before completion.

### Guiding Principles

| Principle | Implementation |
|-----------|----------------|
| **Distrust, Then Verify** | Reviewers don't trust completion claims - they independently verify by reading code |
| **Evidence Over Claims** | No task completion without proof (test output, build results) |
| **Root Cause First** | Debugger must find root cause before proposing fixes |
| **Spec as Source of Truth** | `specs/[feature]/spec.md` is the contract - implementation must match exactly |
| **Native Integration** | Uses spec-kit's existing `.specify/` structure - no separate tracking files |

---

## Three-Tier System

The 15 agents are organized into three operational tiers with different activation patterns:

### Tier 1: Core Team (4 Agents - Always Active)

These agents run on **every implementation**, regardless of feature type:

```
┌─────────────┐
│  Architect  │  Plans, coordinates, assigns tasks
└──────┬──────┘
       │
       ├───► Builder      (Implements features)
       ├───► Validator    (Writes tests, validates)
       └───► Scribe       (Documents)
```

**Why always active?**
- Every feature needs implementation (Builder)
- Every feature needs validation (Validator)
- Every feature needs documentation (Scribe)
- Every implementation needs coordination (Architect)

### Tier 2: Review Team (2 Agents - Sequential Quality Gate)

These agents run after implementation, in a strict sequence:

```
Implementation Complete
       │
       ▼
┌────────────────┐
│ Spec Reviewer  │  Stage 1: Verify spec compliance
└────────┬───────┘
         │
         │ ✅ PASS
         ▼
┌────────────────┐
│Quality Reviewer│  Stage 2: Verify code quality
└────────┬───────┘
         │
         │ ✅ APPROVE
         ▼
    Finalization
```

**Why sequential?**
If code doesn't meet the spec, there's no point reviewing its quality. Fix spec compliance first, then assess quality. This prevents wasted effort reviewing code that will need rework anyway.

### Tier 3: Specialist Team (8 Agents - Activated on Demand)

These agents are activated by the Architect based on feature requirements:

| Specialist | Activation Trigger | Example |
|------------|-------------------|---------|
| **Security Auditor** | Auth code, user input, APIs | Login endpoint needs auth security review |
| **Performance Analyst** | DB queries, loops, caching | Report generation with complex queries |
| **DevOps Engineer** | Services, env vars, Docker | New microservice deployment |
| **Database Architect** | Schema changes, migrations | Adding user_preferences table |
| **API Designer** | New endpoints, contracts | REST API for product catalog |
| **UI/UX Designer** | React, design system | Registration form component |
| **Refactorer** | Legacy code modifications | Updating old payment module |
| **Migration Specialist** | Upgrades, breaking changes | React 16 → 18 migration |

**Why on-demand?**
Activating all specialists for every task creates noise and wastes resources. A documentation-only change doesn't need Security Auditor. A backend API doesn't need UI/UX Designer.

### Tier 4: Support Team (1 Agent - Launched When Needed)

| Agent | Launch Condition | Purpose |
|-------|-----------------|---------|
| **Debugger** | Tests fail OR multiple fix attempts fail | Systematic root cause investigation |

The Debugger uses a 4-phase methodology (see [4-Phase Debugging Methodology](#4-phase-debugging-methodology)) and has authority to halt development after 3 failed attempts to escalate architectural concerns.

---

## Why 15 Agents?

The number 15 isn't arbitrary - it represents careful balancing of specialization depth vs. coordination overhead.

### The Math of Agent Count

**Too Few Agents (5-7)**
- Forces agents to cover multiple domains
- Reduces specialization effectiveness
- Can't parallelize effectively
- Example: Combining Security + Performance into one agent dilutes both

**Too Many Agents (25-30)**
- Coordination overhead exceeds benefits
- Redundant responsibilities
- Communication complexity scales exponentially
- Status.md becomes unmanageable

**15 Agents = Optimal Balance**

```
4 Core + 2 Review + 1 Support + 8 Specialists = 15

Why these numbers?

Core (4): Irreducible minimum
- Need: Architect (plans), Builder (implements), Validator (tests), Scribe (documents)
- Can't merge: Each has distinct responsibility and timing

Review (2): Sequential stages
- Need: Spec Compliance (Stage 1) and Code Quality (Stage 2)
- Can't merge: Different concerns, different timing, must be sequential

Support (1): Specialized methodology
- Need: Root-cause debugging with 4-phase methodology
- Can't merge: Debugging mindset conflicts with implementation mindset

Specialists (8): Coverage without redundancy
- Security: Can't compromise on security review
- Performance: Database optimization is distinct specialization
- DevOps: Infrastructure concerns require dedicated focus
- Database: Schema design is specialized skill
- API: Contract design needs dedicated attention
- UI/UX: Accessibility and design systems require expertise
- Refactorer: Technical debt management is separate concern
- Migration: Upgrade strategy needs dedicated planning

Any fewer: Coverage gaps
Any more: Overlapping responsibilities
```

### Specialization Depth

Each agent has:
1. **Dedicated tools** - Only what they need (Security can't write code, Builder can't approve)
2. **Focused instructions** - Narrow responsibility area
3. **Domain expertise** - Training/prompting optimized for their role
4. **Clear interfaces** - Reads from specific files, writes to specific files

### Coordination Complexity

With 15 agents:
- **Core team** coordinates through `tasks.md`
- **Specialists** report findings to `status.md`
- **Reviewers** read `status.md`, write findings and refinement tasks
- **Support** investigates from `status.md`, documents in `status.md`

The `.specify/` structure (see [Spec-Kit Native Design](#spec-kit-native-design)) keeps this manageable.

---

## Two-Stage Review Process

### Why Two Stages Instead of Single Review?

**Problem with single review:**
```
Reviewer: "This code is well-structured and follows patterns...
           but wait, it's missing requirement #5 from the spec.
           Need to implement that...
           now I need to re-review the new code...
           which changes other parts...
           another review cycle..."
```

Result: Thrashing between spec compliance and code quality concerns.

**Two-stage solution:**

```
Stage 1: Spec Compliance Review
↓
Is implementation complete and correct per spec?
├─ NO → Create refinement tasks, return to Builder
└─ YES → Proceed to Stage 2

Stage 2: Code Quality Review
↓
Does code meet quality standards?
├─ NO → Create refinement tasks, return to Builder
└─ YES → APPROVED for finalization
```

### Stage 1: Spec Compliance Review

**Agent:** orchestrate-spec-reviewer
**Model:** Sonnet (requires reasoning capability)
**Authority:** Can BLOCK Stage 2

**Responsibilities:**
1. Extract ALL requirements from `spec.md`
2. Independently verify each requirement exists in code
3. Document verification evidence (file paths, line numbers)
4. Detect scope creep (unrequested additions)
5. Create refinement tasks for gaps

**Output Example:**
```markdown
## Spec Compliance Review - FAILED

### Missing Requirements (2)
| ID | Requirement | Impact |
|----|-------------|--------|
| REQ-003 | Session expiry after 1 hour | HIGH - Security gap |
| AC-007 | Error message for invalid input | MEDIUM |

### Scope Creep (1)
| Addition | Location | Action |
|----------|----------|--------|
| OAuth integration | src/auth/oauth.ts | Remove or get spec approval |

### Refinement Tasks Created
- Builder: SC-001 - Implement session expiry
- Builder: SC-002 - Remove OAuth or update spec
- Validator: SC-003 - Test session expiry

**DO NOT proceed to Stage 2**
```

### Stage 2: Code Quality Review

**Agent:** orchestrate-quality-reviewer
**Model:** Sonnet (requires pattern recognition)
**Authority:** Can APPROVE or REQUEST REFINEMENT

**Prerequisite Check:**
```markdown
## Code Quality Review - BLOCKED

Cannot proceed: Spec Compliance Review has not passed.
Waiting for orchestrate-spec-reviewer approval.
```

**Responsibilities:**
1. Verify constitution compliance (`.specify/memory/constitution.md`)
2. Check code quality (patterns, naming, structure, readability)
3. Validate test quality (coverage, edge cases, isolation)
4. Review documentation completeness
5. Assess specialist findings were addressed

**Output Example:**
```markdown
## Code Quality Review - NEEDS WORK

### Issues Found
| ID | Severity | Category | Issue | Location |
|----|----------|----------|-------|----------|
| QR-001 | HIGH | Constitution | Uses `any` type | src/utils.ts:45 |
| QR-002 | HIGH | Error Handling | Missing try/catch | src/api/users.ts:89 |
| QR-003 | MEDIUM | Testing | No error path test | tests/auth.test.ts |

### Refinement Tasks Created
See tasks.md for Builder and Validator assignments.

**Re-review required after fixes.**
```

### Why Sequential Not Parallel?

**Attempted parallel review causes:**
1. **Duplicate findings** - Both reviewers report missing requirement
2. **Conflicting feedback** - Spec reviewer says "add feature X", Quality reviewer says "reduce complexity"
3. **Wasted effort** - Quality reviewer reviews code that will be rewritten for spec compliance

**Sequential advantages:**
1. **Clear progression** - Fix spec issues → Fix quality issues → Done
2. **No conflicts** - Quality reviewer works with spec-compliant code
3. **Efficient iterations** - Each review round has focused scope
4. **Psychological clarity** - Team knows which type of issues to address

### Maximum Review Rounds

To prevent infinite refinement loops:

**Spec Compliance:** No limit (spec must be met)
**Code Quality:** Maximum 3 rounds

After 3 quality review rounds:
```markdown
## Code Quality Review - ESCALATED

After 3 review rounds, the following issues remain:
- QR-001: Complex function exceeds 50 lines (constitution limit)
- QR-004: Test coverage at 78% (constitution requires 80%)

User decision required:
□ Force approve with documented exceptions
□ Continue refining (round 4)
□ Abort implementation and redesign
```

---

## Verification Gates

### The Problem: Optimistic Completion Claims

Without verification gates:
```
Builder: "✓ Implemented user registration - should be working!"
[No tests run]
[No build verification]
[Code has syntax errors]

Validator: "✓ Tests written for registration"
[Tests don't run]
[Coverage not measured]
```

This creates:
- False confidence
- Integration failures discovered later
- Wasted reviewer time
- Broken main branch

### The Solution: Mandatory Verification Gates

Both Builder and Validator have **identical verification gate requirements** before claiming task completion:

#### The 5-Step Gate

```
1. IDENTIFY → What command proves this task is done?
2. RUN → Execute the verification command freshly
3. READ → Check full output, exit codes, errors
4. VERIFY → Does output confirm your claim?
5. EVIDENCE → Include proof in status.md
```

#### Builder Verification Gate

**Before marking implementation complete:**

```markdown
## Builder Task Completion

### Task: Implement user registration endpoint

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
    ✓ hashes password (23ms)

Tests: 3 passed, 3 total
```

### Files Modified
- src/api/auth/register.ts (new)
- src/api/auth/register.test.ts (new)

### Status: VERIFIED COMPLETE
```

**Prohibited without evidence:**
- "should work"
- "probably passes"
- "seems to be working"
- "Done!" (without proof)

#### Validator Verification Gate

**Before marking validation complete:**

```markdown
## Validator Task Completion

### Task: Validate user registration

### Test Command
```bash
npm test -- --coverage --grep "registration"
```

### Evidence
```
PASS src/api/auth/register.test.ts
  Registration
    ✓ creates new user with valid data (45ms)
    ✓ rejects invalid email format (12ms)
    ✓ rejects weak password (8ms)
    ✓ hashes password before storage (23ms)
    ✓ returns 409 for duplicate email (34ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Coverage:
  Statements: 92%
  Branches: 88%
  Functions: 100%
  Lines: 91%
```

### Spec Compliance Verified
| Requirement | Spec Line | Test | Status |
|-------------|-----------|------|--------|
| Valid email required | spec.md:15 | rejects invalid email | ✅ |
| Password min 8 chars | spec.md:18 | rejects weak password | ✅ |
| Unique email | spec.md:22 | returns 409 duplicate | ✅ |

### Status: VERIFIED COMPLETE
```

**Prohibited without evidence:**
- "tests should pass"
- "coverage looks good"
- "validation complete" (no output)
- "all tests passing" (no proof)

### Enforcement Mechanism

The Spec Reviewer (Stage 1) **distrusts implementation claims** and independently verifies:

```markdown
## Spec Reviewer Process

1. Builder claims: "Registration endpoint complete"
2. Spec Reviewer: Ignore claim, read actual code
3. Locate: src/api/auth/register.ts
4. Verify: Line-by-line check against spec.md requirements
5. Evidence: Document findings with file paths and line numbers

## Verification Evidence

| Requirement | Status | Evidence |
|-------------|--------|----------|
| REQ-001 | ✅ VERIFIED | src/auth/login.ts:45-67 - login function exists |
| REQ-002 | ❌ MISSING | No session expiry found in auth middleware |
| REQ-003 | ⚠️ PARTIAL | Logging exists but incomplete |
```

This catches:
- Incomplete implementations
- Overly optimistic assessments
- Missing requirements
- Scope creep

### When Verification Fails

If verification command fails:

**Builder:**
```markdown
### Task: Implement registration endpoint

### Verification Attempted
```bash
npm test -- --grep "registration"
```

### Result
```
FAIL src/api/auth/register.test.ts
  Registration
    ✗ validates email format (12ms)
      Expected validation error, got 200 OK

Tests: 1 failed, 2 passed, 3 total
```

### Status: VERIFICATION FAILED

### Action
- DO NOT mark task complete
- Request orchestrate-debugger for root cause analysis
- Fix issue and re-verify
```

**This prevents broken code from reaching reviewers.**

---

## Agent Communication Patterns

All agent coordination happens through `.specify/` - no separate tracking, no external tools, no message passing. This section explains the communication patterns.

### Communication Topology

```
             .specify/
                 │
    ┌────────────┼────────────┐
    │            │            │
memory/      specs/     orchestration/
    │            │            │
    │            │            │
    ▼            ▼            ▼
constitution  [feature]/   [feature]/
              ├─spec.md    agents.md
              ├─plan.md
              ├─tasks.md
              └─status.md
```

### Communication Patterns by Agent Type

#### Pattern 1: Architect → Core Team (Broadcasting)

**Mechanism:** Updates `tasks.md` with assignments

```markdown
## Agent Assignments

### Builder
- [ ] Implement user registration endpoint
- [ ] Add password validation

### Validator
- [ ] Write registration tests
- [ ] Test password rules

### Scribe
- [ ] Document registration API
- [ ] Create usage examples
```

**Agents read** `tasks.md` to discover their work.
**No direct messaging** - file serves as assignment board.

#### Pattern 2: Core Team → Status.md (Status Updates)

**Mechanism:** Each agent writes to dedicated section in `status.md`

```markdown
## Builder Progress
- [x] Registration endpoint: src/api/auth/register.ts
- [ ] Password validation (in progress)

## Validator Progress
- [x] Registration tests: src/api/auth/register.test.ts
- Test results: 5/5 passing, 92% coverage

## Scribe Progress
- [x] API documentation: docs/api/auth.md
- [ ] Usage examples (pending Builder completion)
```

**Agents read** other sections to understand overall progress.
**No blocking** - agents work independently, check status.md for dependencies.

#### Pattern 3: Architect → Specialists (Activation)

**Mechanism:** Creates `orchestration/[feature]/agents.md`

```markdown
## Specialist Activation

### Active Specialists
- orchestrate-security (auth code review)
- orchestrate-database (user schema design)
- orchestrate-api (endpoint contract)

### Rationale
Security: Authentication endpoints require OWASP review
Database: New user table needs migration
API: REST contract needs documentation
```

**Specialists read** this file to understand their role.
**Specialists write** findings to `status.md` under their own section.

#### Pattern 4: Builder → Validator (Handoff)

**Mechanism:** Builder updates status.md with "Ready for Validation"

```markdown
## Builder Progress

### Completed
- Registration endpoint: src/api/auth/register.ts

### Ready for Validation
- Registration endpoint ready for Validator
- Includes validation tests
- All unit tests passing
```

**Validator reads** `status.md` to know what's ready.
**No explicit notification** - Validator polls status.md (in parallel execution, this is continuous monitoring).

#### Pattern 5: Reviewer → Builder (Refinement)

**Mechanism:** Reviewer creates new tasks in `tasks.md`

```markdown
## Refinement Tasks (Spec Compliance Review)

### Builder
- [ ] SC-001: Implement session expiry (REQ-002)
- [ ] SC-002: Add error logging (AC-005)

### Validator
- [ ] SC-003: Test session expiry
```

**Builder reads** `tasks.md` for new refinement assignments.
**Refinement loop** - Builder fixes, updates status.md, Reviewer re-reviews.

#### Pattern 6: Specialists → Quality Reviewer (Findings)

**Mechanism:** Specialists write findings to `status.md`

```markdown
## Security Auditor Findings
- [!] HIGH: Password stored in plaintext (src/auth.ts:45)
- [!] MEDIUM: No rate limiting on login endpoint
- [✓] OK: Input validation present

## Performance Analyst Findings
- [!] HIGH: N+1 query in user lookup (src/services/user.ts:23)
- [✓] OK: Proper indexing on email column
```

**Quality Reviewer reads** specialist sections during Stage 2 review.
**Quality Reviewer verifies** specialists' issues were addressed.

### Why File-Based Communication?

**Advantages:**
1. **Auditability** - Full history in version control
2. **No message loss** - Files persist, no message queue failures
3. **Async-friendly** - Agents work at different speeds, files buffer communication
4. **Human-readable** - You can inspect `.specify/` at any time
5. **Tooling-independent** - No Redis, no message broker, just Git

**Challenges:**
1. **File conflicts** - Mitigated by dedicated sections per agent
2. **No real-time** - Agents must poll files
3. **Parsing overhead** - Agents must parse markdown

**Why challenges are acceptable:**
- File conflicts rare (agents write to different sections)
- Polling is fast (files are local)
- Markdown parsing is straightforward

### Communication Example: Full Flow

**Initial State:**
```
specs/user-auth/
├── spec.md      ← From /speckit.specify
├── plan.md      ← From /speckit.plan
├── tasks.md     ← Empty (will be populated)
└── status.md    ← Empty (will be populated)
```

**Phase 1: Architect reads and plans**
```markdown
# Architect reads:
- spec.md (requirements)
- plan.md (approach)

# Architect writes to tasks.md:
## Agent Assignments
### Builder
- [ ] Implement login endpoint
### Validator
- [ ] Test login endpoint
### Scribe
- [ ] Document login API

# Architect writes to orchestration/user-auth/agents.md:
## Specialist Activation
- orchestrate-security (auth code)
```

**Phase 2: Parallel execution**
```markdown
# Builder writes to status.md:
## Builder Progress
- [x] Login endpoint: src/api/auth/login.ts

# Validator writes to status.md:
## Validator Progress
- [x] Login tests: tests/auth/login.test.ts
- Tests: 8/8 passing

# Security writes to status.md:
## Security Auditor Findings
- [!] HIGH: No rate limiting
```

**Phase 3: Review (Stage 1)**
```markdown
# Spec Reviewer reads:
- spec.md (requirements)
- status.md (what was built)
- Actual code files

# Spec Reviewer writes to status.md:
## Spec Compliance Review - PASSED
All requirements verified.
```

**Phase 4: Review (Stage 2)**
```markdown
# Quality Reviewer reads:
- constitution.md (standards)
- status.md (builder progress + security findings)
- Actual code files

# Quality Reviewer writes to status.md:
## Code Quality Review - NEEDS WORK
HIGH: Security finding not addressed (no rate limiting)

# Quality Reviewer writes to tasks.md:
## Refinement Tasks (Code Quality Review)
### Builder
- [ ] QR-001: Add rate limiting per Security Auditor
```

**Phase 5: Refinement**
```markdown
# Builder reads tasks.md (sees QR-001)
# Builder implements rate limiting
# Builder writes to status.md:
## Builder Progress - Refinement
- [x] QR-001: Rate limiting added (src/middleware/ratelimit.ts)
- Verification: Tests passing

# Quality Reviewer re-reads status.md and code
# Quality Reviewer writes to status.md:
## Code Quality Review - APPROVED
```

All communication via `.specify/` files. No external systems.

---

## Distrust-But-Verify Review

### The Core Philosophy

The Spec Reviewer (Stage 1) operates on a fundamental assumption:

**"All completion claims are incomplete, inaccurate, or optimistic until independently verified."**

This isn't about trust or competence - it's about **structural skepticism** as a quality mechanism.

### Why Distrust Is Necessary

**Human Nature:**
- Implementers are optimistic about their work
- Easy to miss edge cases you didn't think of
- "It works on my machine" syndrome
- Confirmation bias (seeing what you expect)

**Agent Nature:**
- Builder agent may not fully understand spec nuance
- Builder focuses on happy path, misses error handling
- Builder may make assumptions not in spec
- Builder is incentivized to mark tasks complete

**Without distrust:**
```
Builder: "✓ Registration complete"
Reviewer: "Great! Looks good"
Production: User enters SQL in email field → Database breach
```

**With distrust:**
```
Builder: "✓ Registration complete"
Reviewer: "I'll verify that..."
Reviewer: *reads actual code*
Reviewer: "Missing input sanitization - not compliant with spec.md:34"
Builder: *fixes SQL injection vulnerability*
```

### The Distrust Protocol

#### Step 1: Ignore Completion Claims

```markdown
## Prohibited Actions

- Accepting the implementer's word about what was built
- Trusting completion claims without code inspection
- Relying on their interpretation of requirements
- Approving based on status.md alone
```

**Why:** status.md reflects the Builder's perspective. Spec Reviewer provides independent perspective.

#### Step 2: Build Independent Checklist

Extract ALL requirements from `spec.md`:

```markdown
## Spec Compliance Checklist (Spec Reviewer's View)

### Functional Requirements
- [ ] REQ-001: User can login with email/password
- [ ] REQ-002: Session expires after 1 hour
- [ ] REQ-003: Failed login attempts are logged

### Non-Functional Requirements
- [ ] NFR-001: Response time < 200ms
- [ ] NFR-002: Passwords hashed with bcrypt

### Acceptance Criteria
- [ ] AC-001: Login form validates email format
- [ ] AC-002: Error message shown for invalid credentials
- [ ] AC-003: Successful login redirects to dashboard
```

**Why:** Prevents missing requirements. Builder may have implemented 7/8 requirements and declared "complete."

#### Step 3: Independent Code Verification

For EACH requirement:

```markdown
## Verification Evidence

| Requirement | Status | Evidence | Location |
|-------------|--------|----------|----------|
| REQ-001 | ✅ VERIFIED | Login function accepts email/password | src/auth/login.ts:45-67 |
| REQ-002 | ❌ MISSING | No session expiry logic found | N/A |
| REQ-003 | ⚠️ PARTIAL | Logging exists but no IP capture | src/auth/login.ts:89 |
```

**Process:**
1. Read spec requirement
2. Grep/search codebase for implementation
3. Read actual code (not Builder's description)
4. Verify behavior matches spec exactly
5. Document file path and line numbers as evidence

**Why:** Evidence requirement prevents rubber-stamping.

#### Step 4: Detect Scope Creep

Find code that wasn't requested:

```markdown
## Scope Creep Detected

| Addition | Location | Analysis |
|----------|----------|----------|
| OAuth integration | src/auth/oauth.ts | Not in spec - adds complexity, untested |
| Password strength meter UI | src/components/PasswordMeter.tsx | Not requested - nice feature but out of scope |
| Rate limiting | src/middleware/ratelimit.ts | Useful but not specified - may conflict with load balancer |
```

**Why:** Scope creep:
- Adds untested code
- Increases attack surface
- May conflict with unspoken requirements
- Delays delivery

**Note:** Some scope additions are good (security features). But they must be explicitly approved, not silently added.

#### Step 5: Red Flag Detection

Extra scrutiny when:

```markdown
## Red Flags Requiring Extra Scrutiny

- Builder marked task complete very quickly (< expected time)
- status.md says "implemented" without file paths
- Large code changes with vague descriptions ("refactored", "cleaned up")
- Claims of "should work" or "probably fine"
- Test output not included with completion claim
```

**Action for red flags:**
- 2x verification depth
- Check related code, not just claimed changes
- Run tests yourself if suspicious
- Look for copy-paste errors

### Verification Standards

Every finding must include:

```markdown
### Evidence Standards

Required for every claim:
1. Specific file path (e.g., src/auth/login.ts)
2. Line numbers (e.g., lines 45-67)
3. Code snippet or description of observed behavior
4. Mapping to specific spec requirement

NO APPROVAL WITHOUT EVIDENCE
```

**Example - Acceptable:**
```markdown
❌ REQ-002 (Session expiry): MISSING
   Evidence: Searched codebase for "session", "expiry", "timeout".
   Checked: src/auth/*.ts, src/middleware/*.ts, config/*.ts
   Found: JWT token creation but no expiration logic
   Impact: Security vulnerability - sessions never expire
```

**Example - Unacceptable:**
```markdown
❌ REQ-002: Missing session expiry
   [No search details, no file paths, no impact analysis]
```

### The Distrust Paradox

**Distrust doesn't mean conflict:**
- Builder isn't "the enemy"
- Distrust is structural, not personal
- Goal is quality, not blame

**Distrust creates trust:**
- When Spec Reviewer approves, it means something
- Builder knows their work will be verified → higher initial quality
- User trusts the process, not just one agent's assessment

**Comparison to external systems:**
- Code review: Colleagues distrust-but-verify each other's PRs
- CI/CD: Tests distrust that manual testing was complete
- Security audits: Auditors distrust self-reported compliance

**The alternative:**
```
Trust-based review:
  Builder: "It's done!"
  Reviewer: "Great!"
  → 60% spec compliance

Distrust-but-verify review:
  Builder: "It's done!"
  Reviewer: "I'll verify... found 3 missing requirements"
  Builder: "Fixed"
  Reviewer: "Verified - all requirements present"
  → 100% spec compliance
```

---

## 4-Phase Debugging Methodology

### The Problem with Trial-and-Error Debugging

**Common anti-pattern:**
```
1. Tests fail
2. Developer guesses cause
3. Makes quick fix
4. Tests still fail (or new failures appear)
5. Makes another guess
6. Repeat for 2-3 hours
7. Finally works (or doesn't)
```

**Problems:**
- Wastes time (average 2-3 hours)
- Introduces new bugs (collateral damage)
- Doesn't build understanding
- May "fix" symptoms, not root cause

### The 4-Phase Methodology

The orchestrate-debugger agent uses a disciplined approach:

```
Phase 1: Root Cause Investigation
         ↓
Phase 2: Pattern Analysis
         ↓
Phase 3: Hypothesis & Testing
         ↓
Phase 4: Implementation
```

**Core principle:** **NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST**

### Phase 1: Root Cause Investigation

**Before ANY code changes:**

#### 1.1: Analyze Error Messages

```markdown
## Error Analysis

### Raw Error
```
TypeError: Cannot read property 'id' of undefined
  at UserService.getUser (src/services/user.ts:45)
  at AuthController.login (src/api/auth.ts:23)
```

### Stack Trace Analysis
- Error occurs in UserService.getUser (line 45)
- Called by AuthController.login (line 23)
- Property access on undefined object

### Initial Hypothesis
- `user` object is undefined when .id accessed
- Likely database query returned null
- Missing null check before property access
```

**Why:** Error messages contain clues. Read every word.

#### 1.2: Achieve Consistent Reproduction

```markdown
## Reproduction Steps

1. Start with clean database
2. Call POST /api/auth/login with {"email": "test@example.com", "password": "password123"}
3. Error occurs on first login attempt

### Reproduction Rate: 100% (10/10 attempts)

### Environment
- Node: 18.16.0
- Database: PostgreSQL 14.5
- Test environment (not production)
```

**Why:** Can't fix what you can't reproduce. Consistent reproduction proves understanding.

#### 1.3: Review Recent Changes

```bash
git log --oneline -10
git diff HEAD~3
```

```markdown
## Recent Changes

| Commit | Files | Potential Impact |
|--------|-------|------------------|
| abc123 | user.ts | Changed query from findOne to findUnique |
| def456 | auth.ts | Added email validation |
| ghi789 | schema.prisma | Modified user table |
```

**Why:** Bugs often correlate with recent changes.

#### 1.4: Trace Data Flow Backward

```markdown
## Data Flow Trace

Expected flow:
1. AuthController.login(email, password)
2. UserService.getUser(email)
3. Database query: prisma.user.findUnique({ where: { email } })
4. Return User object
5. AuthController accesses user.id

Actual flow (failure point):
1. AuthController.login(email, password) ✓
2. UserService.getUser(email) ✓
3. Database query executes ✓
4. Query returns NULL ← FAILURE POINT
5. UserService.getUser() returns undefined
6. AuthController accesses undefined.id → TypeError
```

**Why:** Identifies exact failure point, not just symptoms.

### Phase 2: Pattern Analysis

**Goal:** Find working examples to compare against broken code.

#### 2.1: Locate Similar Working Code

```markdown
## Working Pattern Found

File: src/services/product.ts:34

```typescript
async getProduct(id: string): Promise<Product | null> {
  const product = await this.db.products.findUnique({ where: { id } });
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  return product;
}
```

**Why it works:** Has null check before returning.
```

**Why:** Cargo-culting from working code is faster than inventing solutions.

#### 2.2: Document ALL Differences

```markdown
## Pattern Comparison

| Aspect | Working (product.ts) | Broken (user.ts) | Impact |
|--------|---------------------|------------------|--------|
| Null check | ✅ Has `if (!product)` | ❌ Missing | Broken code assumes user exists |
| Error handling | Throws NotFoundError | No error thrown | Caller gets undefined |
| Return type | Product \| null | User (not nullable) | Type system doesn't enforce null check |
| Logging | Logs not-found cases | No logging | No visibility |
```

**Why:** Differences reveal what's missing.

#### 2.3: Identify Assumptions

```markdown
## Environmental Assumptions

Working code assumes:
- Database connection is valid ✓
- ID format is validated upstream ✓
- Not finding a product is an expected error case ✓

Broken code assumes:
- User always exists ← INVALID ASSUMPTION
- Database never returns null ← INVALID ASSUMPTION
```

**Why:** Invalid assumptions are often root causes.

### Phase 3: Hypothesis & Testing

**Goal:** Formulate testable hypothesis and confirm with minimal changes.

#### 3.1: Formulate Hypothesis

```markdown
## Hypothesis

**Statement**:
UserService.getUser() doesn't handle null return from database query,
causing undefined to propagate to callers who attempt property access.

**Root Cause**: Missing null check after database query

**Evidence Supporting Hypothesis**:
1. Stack trace shows error at property access (.id)
2. Working pattern (product.ts) has null check, broken code doesn't
3. Error only occurs when user doesn't exist in database
4. Database query returns null for non-existent records (Prisma behavior)

**Prediction**:
Adding null check with error throw will:
- Prevent undefined from propagating
- Provide clear error message
- Match working pattern
```

**Why:** Explicit hypothesis prevents "let's just try this" debugging.

#### 3.2: Test with Minimal Changes

```markdown
## Diagnostic Test

Added temporary logging to confirm hypothesis:

```typescript
// src/services/user.ts:45
async getUser(email: string): Promise<User> {
  const user = await this.db.users.findUnique({ where: { email } });
  console.log('[DEBUG] Query result:', user); // ← Diagnostic
  return user;
}
```

### Test Result
```
[DEBUG] Query result: null
TypeError: Cannot read property 'id' of undefined
```

**HYPOTHESIS CONFIRMED**: Database returns null, no handling exists.
```

**Why:** Confirms root cause before making actual fix.

### Phase 4: Implementation

**Only after root cause is confirmed.**

#### 4.1: Create Failing Test First

```markdown
## Failing Test Created

File: src/services/user.test.ts

```typescript
describe('UserService', () => {
  it('throws NotFoundError when user does not exist', async () => {
    await expect(userService.getUser('nonexistent@example.com'))
      .rejects.toThrow(NotFoundError);
  });
});
```

### Test Result
```
FAIL src/services/user.test.ts
  ✗ throws NotFoundError when user does not exist (23ms)
    Expected NotFoundError, got TypeError: Cannot read property 'id'
```

**Test proves bug exists.**
```

**Why:** Test-first ensures fix is verified and prevents regression.

#### 4.2: Implement Focused Fix

```markdown
## Fix Implemented

File: src/services/user.ts:45

```typescript
async getUser(email: string): Promise<User> {
  const user = await this.db.users.findUnique({ where: { email } });

  // Fix: Add null check matching working pattern
  if (!user) {
    throw new NotFoundError(`User not found: ${email}`);
  }

  return user;
}
```

### Change Summary
- Added: Null check (lines 47-49)
- Added: Error throw with message
- Removed: Debug logging
- Files modified: 1
- Lines changed: +3
```

**Why:** Minimal, focused change based on root cause.

#### 4.3: Verify Fix

```markdown
## Verification

### Test Output
```bash
npm test -- --grep "UserService"
```

Result:
```
PASS src/services/user.test.ts
  UserService
    ✓ throws NotFoundError when user does not exist (12ms)
    ✓ returns user when exists (8ms)
    ✓ validates email format (5ms)

Tests: 3 passed, 3 total
```

### Integration Test
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"nonexistent@example.com","password":"test"}'
```

Result:
```json
{
  "error": "Not Found",
  "message": "User not found: nonexistent@example.com"
}
```

**FIX VERIFIED**:
- Unit tests passing
- Integration behaves correctly
- Error message clear
- No regressions
```

**Why:** Verification proves fix works and didn't break anything else.

### The 3-Attempt Rule

**After 3 failed fix attempts, STOP:**

```markdown
## STOP - Architectural Review Required

### Failed Attempts
1. Added null check → Still failing (different error: password undefined)
2. Changed query logic → Introduced new bug (wrong user returned)
3. Reverted and tried different approach → Same original error

### Assessment
The issue appears to be architectural, not a simple bug:
- Multiple components have undefined assumptions
- Data model may need revision
- The specification may have gaps

### Root Issue Analysis
The problem isn't just "missing null check" but:
- User authentication flow assumes pre-validated email
- No clear contract about error handling
- Caller (AuthController) expects User, not error

### Recommendation
Escalate to Architect for design review:
1. Define authentication error handling contract
2. Review User lookup API design
3. Consider: Should getUser() throw or return null?
4. Update spec.md with clarified requirements

**DO NOT continue debugging without architectural resolution.**
```

**Why 3 attempts?**
- Attempt 1: Might be wrong hypothesis
- Attempt 2: Confirms first approach didn't work
- Attempt 3: Pattern suggests deeper issue

**Why stop at 3?**
- More attempts unlikely to succeed
- Indicates architectural problem
- Prevents thrashing
- Escalates to someone who can change design

### Impact Comparison

**Systematic 4-Phase Debugging:**
- Time: 15-30 minutes average
- Success rate: ~95% first-time fix
- Collateral damage: Minimal (focused changes)
- Understanding: Builds codebase knowledge
- Regression risk: Low (test coverage)

**Trial-and-Error Debugging:**
- Time: 2-3 hours average
- Success rate: ~70% (may fix symptoms only)
- Collateral damage: High (multiple changes)
- Understanding: Gaps remain
- Regression risk: High (untested changes)

---

## Parallel Execution Model

### Sequential vs. Parallel: The Performance Gap

**Sequential execution (traditional):**
```
Architect analyzes (10 min)
  ↓
Builder implements (30 min)
  ↓
Validator writes tests (15 min)
  ↓
Scribe documents (10 min)
  ↓
Security reviews (15 min)
  ↓
Total: 80 minutes
```

**Parallel execution (orchestrated):**
```
Architect analyzes (10 min)
  ↓
  ├→ Builder implements (30 min)
  ├→ Validator writes tests (15 min)
  ├→ Scribe documents (10 min)
  └→ Security reviews (15 min)
     ↓
Total: 10 + 30 = 40 minutes (50% reduction)
```

### What Can Run in Parallel?

#### Independent Tasks (Full Parallelism)

```
┌─────────────┐
│  Architect  │ Coordinates
└──────┬──────┘
       │
       ├──────────────────┐
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│   Builder   │    │  Validator  │
│             │    │             │
│ Implements  │    │ Writes      │
│ feature     │    │ test cases  │
└─────────────┘    └─────────────┘
       │                  │
       ▼                  ▼
   (Can work independently)
```

**Why parallel?**
- Builder implements based on `spec.md`
- Validator writes test cases based on `spec.md`
- Both read from same source (spec), no dependency
- Validator can write tests before Builder completes implementation
- Tests verify specification, not implementation details

**Example:**
```
Spec: "User registration requires email and password"

Builder: Implements POST /api/register endpoint
Validator: Writes test cases:
  - Valid email + password → 201 Created
  - Invalid email → 400 Bad Request
  - Missing password → 400 Bad Request

Both work simultaneously, tests will run when Builder completes.
```

#### Dependent Tasks (Partial Parallelism)

```
Builder implements feature
       │
       ├─────────────────────┐
       │                     │
       ├→ status.md: "Login endpoint complete"
       │                     │
       ▼                     ▼
Validator reads status  Scribe reads status
       │                     │
       ▼                     ▼
Runs integration tests   Documents API
```

**Why partial?**
- Validator can write test structure early (parallel)
- Validator must run tests after Builder completes (sequential)
- Scribe can draft docs early (parallel)
- Scribe must verify API details after Builder completes (sequential)

**Example:**
```
Builder (minute 0-30):
  [0-30] Implementing login endpoint

Validator (minute 0-35):
  [0-15] Writing test structure (parallel)
  [30-35] Running integration tests (sequential after Builder)

Scribe (minute 0-35):
  [0-10] Drafting API docs (parallel)
  [30-35] Verifying endpoint details (sequential after Builder)
```

#### Specialists (Full Parallelism)

```
Builder implements
       │
       ├────────────┬────────────┬────────────┐
       ▼            ▼            ▼            ▼
   Security    Performance  Database      API
   Auditor     Analyst      Architect     Designer
       │            │            │            │
       ├→ Findings  ├→ Findings  ├→ Schema    ├→ Contract
       │            │            │            │
       └────────────┴────────────┴────────────┘
                    ↓
          Quality Reviewer reads all findings
```

**Why parallel?**
- Security reviews auth code
- Performance reviews database queries
- Database reviews schema design
- API reviews endpoint contract
- All review different aspects, no dependencies
- All write to separate sections of `status.md`

### Parallelism Limitations

#### Sequential Gate: Two-Stage Review

```
Implementation (parallel)
       │
       ▼
Stage 1: Spec Compliance (sequential)
       │
       │ Must PASS before ↓
       │
       ▼
Stage 2: Code Quality (sequential)
```

**Why NOT parallel?**
- Quality review is wasted if spec compliance fails
- Spec issues require code changes → quality review needs re-run
- Sequential saves effort (see [Two-Stage Review Process](#two-stage-review-process))

#### Sequential Gate: Refinement Loops

```
Implementation → Review → Issues found?
                   ↓              │
                 PASS           YES
                   ↓              │
              Finalization  ←────┘
                            Refinement
```

**Why NOT parallel?**
- Can't refine until review identifies issues
- Multiple parallel refinements could conflict
- Refinement → re-review loop is inherently sequential

### Managing Parallel Execution

#### Challenge 1: Status Visibility

**Problem:** With 6-10 agents working simultaneously, how do you know what's happening?

**Solution:** Centralized `status.md` with sections per agent

```markdown
## Builder Progress
- [x] Login endpoint implemented
- [ ] Password validation (in progress)

## Validator Progress
- [x] Test structure created
- [ ] Waiting for Builder to complete endpoint

## Security Auditor Progress
- [x] Auth code reviewed
- [!] Found 2 HIGH severity issues

## Performance Analyst Progress
- [x] Query analysis complete
- [✓] No issues found
```

**Reading status.md gives instant snapshot of all parallel work.**

#### Challenge 2: Dependency Coordination

**Problem:** Validator needs Builder to finish before running integration tests.

**Solution:** Pull-based coordination via `status.md`

```
Validator (polling every 30 seconds):
  1. Read status.md
  2. Check "Builder Progress" section
  3. If "Login endpoint complete" → run integration tests
  4. Else → continue test structure work
```

**No active notification needed - agents poll status.**

#### Challenge 3: Resource Contention

**Problem:** Multiple agents modifying same file causes conflicts.

**Solution:** Section-based file organization

```markdown
## Builder Progress     ← Only Builder writes here
...

## Validator Progress   ← Only Validator writes here
...

## Security Auditor     ← Only Security writes here
...
```

**Each agent has exclusive write area, minimal conflicts.**

### Parallel Execution Example: Complete Flow

**Feature:** User authentication with login endpoint

**Time 0: Architect plans (10 min)**
```
- Reads spec.md
- Creates task assignments in tasks.md
- Activates specialists: Security, Database, API
```

**Time 10: Parallel execution begins**

```
┌─────────────────────────────────────────────┐
│  Minute 10-40: All agents work in parallel  │
└─────────────────────────────────────────────┘

Builder (30 min):
  [10-40] Implement login endpoint
  [40] Update status.md: "Login complete"

Validator (25 min):
  [10-25] Write test structure
  [40-45] Run integration tests (waits for Builder)

Scribe (15 min):
  [10-25] Draft API documentation
  [40-42] Verify endpoint details

Security Auditor (20 min):
  [10-30] Review auth code, check OWASP
  [30] Write findings to status.md

Database Architect (15 min):
  [10-25] Review user schema
  [25] Write migration file

API Designer (15 min):
  [10-25] Create OpenAPI spec
  [25] Validate against endpoint
```

**Time 45: Parallel execution complete**

```
status.md contains:
- Builder: ✓ Complete
- Validator: ✓ Tests passing (8/8)
- Scribe: ✓ Docs complete
- Security: ! 1 issue found (no rate limiting)
- Database: ✓ Schema approved
- API: ✓ Contract documented
```

**Time 45-50: Sequential Review (Stage 1)**
```
Spec Reviewer:
  - Reads spec.md requirements
  - Verifies implementation in code
  - Checks: All requirements present? → YES
  - status.md: "Spec Compliance Review - PASSED"
```

**Time 50-55: Sequential Review (Stage 2)**
```
Quality Reviewer:
  - Reads constitution.md standards
  - Checks code quality
  - Reviews Security finding (rate limiting)
  - status.md: "Code Quality Review - NEEDS WORK"
  - tasks.md: "QR-001: Add rate limiting"
```

**Time 55-70: Refinement (Sequential)**
```
Builder:
  - Reads tasks.md (QR-001)
  - Implements rate limiting
  - Updates status.md with verification

Quality Reviewer:
  - Re-reviews
  - status.md: "Code Quality Review - APPROVED"
```

**Total Time: 70 minutes**

**Sequential equivalent: ~120 minutes**

**Parallelism benefit: 42% time reduction**

### When Parallelism Doesn't Help

**Scenarios where parallelism provides no benefit:**

1. **Highly sequential tasks**
   - Debugging (must investigate → hypothesize → fix → verify)
   - Migration (must plan → prepare → execute → verify)

2. **Small features**
   - Simple bug fix: Single agent faster than coordination overhead
   - Documentation-only: No parallel work to distribute

3. **Shared resource bottlenecks**
   - Database migrations: Can't parallelize schema changes
   - Deployment: Can't deploy multiple versions simultaneously

**Use orchestration for:**
- Complex features requiring multiple concerns
- Large implementations with independent components
- Features needing specialist expertise

**Use single agent for:**
- Quick fixes
- Small, focused tasks
- Highly sequential workflows

---

## Spec-Kit Native Design

### The Integration Philosophy

Many orchestration systems bolt onto existing workflows:
```
Existing workflow: A → B → C
Orchestration: Install tracker, configure agents, map workflow
Result: A → B → C + X (separate tracking system)
```

**This plugin's approach:**
```
Existing workflow: spec-kit (.specify/ structure)
Orchestration: Read .specify/, work within it, write back to it
Result: Enhanced workflow, same structure
```

**Why this matters:**
- No learning new tracking system
- No separate files to maintain
- No synchronization between systems
- Workflow unchanged for users

### Native Integration Points

#### 1. Uses Existing Specification

```
Standard spec-kit workflow:
> /speckit.specify
  Creates: specs/[feature]/spec.md

Orchestration workflow:
> /agent-orch:implement
  Reads: specs/[feature]/spec.md ← Same file
```

**Benefit:** No re-specification. Spec written once, used by all agents.

#### 2. Uses Existing Task Structure

```
Standard spec-kit workflow:
> /speckit.tasks
  Creates: specs/[feature]/tasks.md

Orchestration workflow:
  Architect updates: tasks.md with agent assignments
  Agents mark complete: [x] in tasks.md
```

**Benefit:** Tasks in one place. No separate "agent tasks" file.

#### 3. Uses Existing Memory System

```
Spec-kit memory:
.specify/memory/constitution.md ← Project standards

Orchestration:
All agents read: constitution.md for standards
Quality Reviewer enforces: constitution.md rules
```

**Benefit:** One source of truth for standards.

### Why No Separate Tracking Files?

**Alternatives considered:**

**Option A: Separate agent tracking**
```
.agent-orchestration/
├── agents.json
├── progress.json
└── findings.json

.specify/
├── specs/[feature]/
│   └── spec.md
```

**Problems:**
- Duplicate information (agents.json + spec.md)
- Synchronization issues (what if they diverge?)
- More files to maintain
- Users must check two places

**Option B (Chosen): Native integration**
```
.specify/
├── specs/[feature]/
│   ├── spec.md       ← Requirements (from spec-kit)
│   ├── plan.md       ← Approach (from spec-kit)
│   ├── tasks.md      ← Tasks (spec-kit + orchestration)
│   └── status.md     ← Progress (orchestration)
└── orchestration/
    └── [feature]/
        └── agents.md ← Only new file (specialist coordination)
```

**Advantages:**
- Single source of truth (spec.md)
- Status in one place (status.md)
- Tasks in one place (tasks.md)
- Minimal new files (agents.md only for specialist coordination)

### File Ownership Model

| File | Created By | Updated By | Purpose |
|------|-----------|------------|---------|
| `spec.md` | spec-kit | Scribe (rare) | Requirements |
| `plan.md` | spec-kit | Architect (clarifications) | Implementation approach |
| `tasks.md` | spec-kit | Architect + Core Team | Task assignments & completion |
| `status.md` | Orchestration | All agents | Progress & findings |
| `agents.md` | Orchestration | Architect | Specialist activation |

**Key insight:** Orchestration writes to spec-kit files (tasks.md) rather than creating parallel files.

### Auto-Detection Mechanism

**How plugin finds features:**

```
> /agent-orch:implement

Plugin logic:
1. Scan specs/ for directories
2. For each directory, read tasks.md
3. Check for incomplete tasks: - [ ]
4. If 1 feature with incomplete tasks → auto-select
5. If multiple features → prompt user
6. If no features → error (run /speckit.tasks first)
```

**Example:**
```
specs/
├── user-auth/
│   └── tasks.md (has incomplete tasks)  ← Selected
├── payment/
│   └── tasks.md (all complete)
└── reporting/
    └── tasks.md (has incomplete tasks)  ← Ambiguous

Plugin: "Found 2 features with incomplete tasks. Which one?
  1. user-auth
  2. reporting"
```

**Benefit:** Zero configuration. Plugin understands spec-kit structure.

### Backward Compatibility

**Works with any spec-kit version:**

**Why?**
- Reads standard markdown files
- No API dependencies
- No version-specific features
- Structure is stable (specs/, memory/)

**Even if spec-kit updates:**
- New spec-kit features: Orchestration ignores unknown files
- Spec-kit changes spec.md format: Orchestration reads as markdown
- Spec-kit adds new commands: Orchestration doesn't interfere

### Standalone Mode Design

**What if no spec-kit?**

```
> /agent-orch:build

Creates:
PLAN.md     ← Replaces specs/[feature]/plan.md
STATUS.md   ← Replaces specs/[feature]/status.md

Agents read: PLAN.md (instead of spec.md + plan.md)
Agents write: STATUS.md (instead of status.md)
```

**Design decision:** Mirror spec-kit structure in project root rather than inventing new structure.

**Benefit:** If user later adds spec-kit, agents already understand the file structure.

### Spec-Kit Workflow Enhancement

**Before orchestration:**
```
┌──────────────┐
│ /speckit.    │
│  specify     │
│              │
│ Writes spec  │
└──────┬───────┘
       │
┌──────▼───────┐
│ /speckit.    │
│  plan        │
│              │
│ Plans impl   │
└──────┬───────┘
       │
┌──────▼───────┐
│ /speckit.    │
│  tasks       │
│              │
│ Creates      │
│ tasks        │
└──────┬───────┘
       │
┌──────▼───────┐
│ Manual       │
│ implementation│
│              │
│ Developer    │
│ codes        │
└──────────────┘
```

**After orchestration:**
```
┌──────────────┐
│ /speckit.    │
│  specify     │
│              │
│ Writes spec  │
└──────┬───────┘
       │
┌──────▼───────┐
│ /speckit.    │
│  plan        │
│              │
│ Plans impl   │
└──────┬───────┘
       │
┌──────▼───────┐
│ /speckit.    │
│  tasks       │
│              │
│ Creates      │
│ tasks        │
└──────┬───────┘
       │
┌──────▼───────┐
│ /agent-orch: │    ← NEW STEP
│  implement   │
│              │
│ Multi-agent  │
│ parallel     │
│ execution    │
└──────────────┘
```

**Enhancement, not replacement:**
- Still use /speckit.specify (required)
- Still use /speckit.plan (recommended)
- Still use /speckit.tasks (required)
- Add /agent-orch:implement (orchestrated execution)

### The Constitution Pattern

**Spec-kit convention:**
```
.specify/memory/constitution.md ← Project standards
```

**Why this works for orchestration:**

```markdown
## constitution.md

### Code Quality
- TypeScript strict mode required
- No `any` types allowed
- ESLint + Prettier enforced

### Testing
- Jest for unit tests
- 80% coverage minimum
- All edge cases must have tests

### Security
- Validate all user input
- Parameterized queries only
- No secrets in code
```

**All agents read this automatically.**

**Quality Reviewer enforces rules:**
```
Quality Reviewer checks:
- Uses `any` type? → Violation of constitution.md line 3
- Coverage 78%? → Below constitution.md minimum (80%)
- Hardcoded SQL? → Violates constitution.md security rule
```

**Why this pattern?**
- Single source of standards
- All agents have same understanding
- Enforceable (not just guidelines)
- Version controlled with code
- Team can update standards (edit constitution.md)

### Integration Summary

**What makes this "native" integration:**

| Aspect | Native Integration | Separate System |
|--------|-------------------|-----------------|
| **Files** | Reads/writes .specify/ | Creates separate tracking files |
| **Workflow** | Enhances existing spec-kit commands | Replaces workflow |
| **Learning curve** | Zero (if you know spec-kit) | New system to learn |
| **Maintenance** | One set of files | Two systems to synchronize |
| **Standards** | Reads constitution.md | Separate config file |
| **Tasks** | Updates tasks.md | Separate agent task system |
| **Compatibility** | Works with any spec-kit version | Version dependencies |

**Result:** Users who know spec-kit already know 80% of the orchestration system.

---

## Session-Based Directory Design (Standalone Mode)

### The Problem: File Accumulation

In standalone mode (`/agent-orch:build`), the plugin originally used fixed filenames in the project root:

```
project-root/
├── PLAN.md          # Fixed filename
├── STATUS.md        # Fixed filename
└── CLAUDE.md
```

**This created several issues:**

1. **Historical Loss**: Each new build session overwrites previous PLAN.md and STATUS.md
2. **File Bloat**: If agents append instead of replace, files grow indefinitely with mixed session data
3. **Confusion**: Developers can't tell which session created which content
4. **Git Noise**: Files create unnecessary changes between sessions
5. **No Session Isolation**: Can't work on multiple features simultaneously or review past work

**Evidence of the problem:**

This plugin's own repository contained leftover PLAN.md and STATUS.md from a "Documentation Improvement" task, demonstrating how these files accumulate without cleanup.

### The Solution: Session-Based Directories

Inspired by spec-kit's feature-based directory structure (`specs/[feature]/`), standalone mode now uses:

```
project-root/
├── ssnc-agent-orch/
│   ├── 2026-01-18-auth-feature/
│   │   ├── PLAN.md
│   │   └── STATUS.md
│   ├── 2026-01-19-api-refactor/
│   │   ├── PLAN.md
│   │   └── STATUS.md
│   ├── 2026-01-20-bug-fixes/
│   │   ├── PLAN.md
│   │   └── STATUS.md
│   └── README.md
├── CLAUDE.md
└── .gitignore
```

### Design Rationale

#### Why `ssnc-agent-orch/` Directory?

**Vendor prefix approach:**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| `.claude-build/` | Hidden, doesn't clutter root | Hard to discover, tooling might ignore | ❌ Rejected |
| `agent-orch-sessions/` | Descriptive, neutral naming | Could conflict with other tools | ⚠️ Alternative |
| `ssnc-agent-orch/` | Clear ownership, visible, discoverable | Vendor branding in project | ✅ **Chosen** |

**Why visible, not hidden?**

Unlike `.specify/` (which is tool-managed and not meant for manual editing), session directories contain **historical artifacts** that developers might want to:
- Review past implementation approaches
- Reference previous sessions
- Share with team members
- Include in documentation

**Comparison to spec-kit:**

| Aspect | Spec-Kit | Standalone Mode |
|--------|----------|-----------------|
| Directory | `.specify/` (hidden) | `ssnc-agent-orch/` (visible) |
| Reasoning | Tool-managed, not user-edited | Historical reference, user-reviewable |
| Session isolation | `specs/[feature]/` | `[YYYY-MM-DD-feature]/` |
| Files per session | 4-5 (spec, plan, tasks, status, checklist) | 2 (PLAN, STATUS) |

#### Why Hybrid Naming: `YYYY-MM-DD-[feature]`?

**Format:** `2026-01-18-auth-feature/`

**Advantages:**

1. **Chronological Sorting**: `ls` automatically sorts by date
2. **Semantic Meaning**: Feature name explains purpose
3. **No Collisions**: Timestamp ensures uniqueness
4. **Grep-Friendly**: `ls ssnc-agent-orch/2026-01-18*` finds all sessions from that day

**Alternatives considered:**

```
Option A: Timestamp only (2026-01-18-143022/)
  ✓ Unique, sortable
  ✗ No semantic meaning

Option B: Feature name only (auth-feature/)
  ✓ Semantic, easy to reference
  ✗ Name collisions possible
  ✗ No chronological sorting

Option C: Hybrid (2026-01-18-auth-feature/)  ← CHOSEN
  ✓ Unique, sortable, AND semantic
  ✓ Best of both worlds
```

### Implementation Details

#### Phase 1 Enhancement: Session Naming

After gathering requirements and before creating PLAN.md:

```markdown
**New Step 4b: Determine Session Name**

Ask user:
> "What should I call this build session?"
>
> Suggested: "auth-feature" (based on conversation)
>
> Options:
> (a) Use suggested name
> (b) Let me type a different name
> (c) Just use today's date

User choice:
- If (a) or (b): session_name = slugify(user_input)
  Example: "Auth Feature" → "auth-feature"

- If (c): session_name = "" (timestamp only)

Generate session directory:
  Format: YYYY-MM-DD-[session_name]
  Example: 2026-01-18-auth-feature/

Create:
  ssnc-agent-orch/2026-01-18-auth-feature/PLAN.md
  ssnc-agent-orch/2026-01-18-auth-feature/STATUS.md
```

**Slugification rules:**
```
Input: "Auth Feature"        → auth-feature
Input: "API Refactor"        → api-refactor
Input: "Bug Fix: Login"      → bug-fix-login
Input: "User Auth & Perms"   → user-auth-and-perms
```

**Directory creation logic:**
```markdown
## Directory Creation

1. Check if ssnc-agent-orch/ exists
   - If not, create it
   - Create ssnc-agent-orch/README.md

2. Check if session directory exists
   - Format: ssnc-agent-orch/YYYY-MM-DD-[name]/
   - If exists, append -2, -3, etc.
   - Example: 2026-01-18-auth-feature-2/

3. Create session directory
4. Create PLAN.md in session directory
5. Create STATUS.md in session directory
```

#### Agent Path Updates

All agent prompts updated to use session-based paths:

**Before:**
```markdown
Read PLAN.md for requirements.
Update STATUS.md with progress.
```

**After:**
```markdown
Read ssnc-agent-orch/[session-dir]/PLAN.md for requirements.
Update ssnc-agent-orch/[session-dir]/STATUS.md with progress.
```

**Session directory passed to all agents:**
```
Environment variable: BUILD_SESSION_DIR=ssnc-agent-orch/2026-01-18-auth-feature

All agents receive:
- PLAN_PATH=${BUILD_SESSION_DIR}/PLAN.md
- STATUS_PATH=${BUILD_SESSION_DIR}/STATUS.md
```

### Session Management

#### Session Discovery

**Listing sessions:**
```bash
ls -lt ssnc-agent-orch/

Output:
2026-01-20-bug-fixes/
2026-01-19-api-refactor/
2026-01-18-auth-feature/
```

**Reading specific session:**
```bash
cat ssnc-agent-orch/2026-01-18-auth-feature/PLAN.md
```

#### Session Cleanup

**Manual cleanup:**
```bash
# Remove old sessions (older than 30 days)
find ssnc-agent-orch/ -maxdepth 1 -type d -name "2026-*" -mtime +30 -exec rm -rf {} \;

# Remove specific session
rm -rf ssnc-agent-orch/2026-01-18-auth-feature/

# Archive session
tar czf archive-auth-feature.tar.gz ssnc-agent-orch/2026-01-18-auth-feature/
rm -rf ssnc-agent-orch/2026-01-18-auth-feature/
```

**Future enhancement: Cleanup skill**
```bash
> /agent-orch:cleanup-sessions

Interactive options:
1. Remove sessions older than [30] days
2. Archive and compress sessions older than [30] days
3. Show session summary (sizes, dates, features)
4. Remove specific session
```

### Git Integration

#### .gitignore Strategies

**Option A: Ignore all sessions (ephemeral)**
```gitignore
# Treat build sessions as temporary artifacts
ssnc-agent-orch/
```

**Use when:**
- Sessions are just for development planning
- Team doesn't need to see implementation history
- CI/CD generates sessions that shouldn't be committed

**Option B: Commit all sessions (documentation)**
```gitignore
# No gitignore entry - commit everything
```

**Use when:**
- Sessions serve as project history/documentation
- Team reviews past implementation approaches
- Sessions explain why decisions were made

**Option C: Selective (recommended)**
```gitignore
# Ignore temp/experimental sessions
ssnc-agent-orch/tmp-*
ssnc-agent-orch/*-test-*
ssnc-agent-orch/*-experiment-*

# Ignore today's active session (commit when complete)
ssnc-agent-orch/2026-01-2[0-9]-*
```

**Use when:**
- Want to commit major feature sessions
- Ignore quick experiments and tests
- Review sessions before committing

### Session Metadata (Optional)

**Future enhancement:** Rich metadata per session

```
ssnc-agent-orch/
├── sessions.json              # Index of all sessions
└── 2026-01-18-auth-feature/
    ├── PLAN.md
    ├── STATUS.md
    └── metadata.json          # Session details
```

**sessions.json:**
```json
{
  "sessions": [
    {
      "id": "2026-01-18-auth-feature",
      "name": "Authentication Feature",
      "created": "2026-01-18T14:30:22Z",
      "completed": "2026-01-18T16:45:10Z",
      "status": "completed",
      "agents_used": ["architect", "builder", "validator", "security"],
      "review_rounds": 2,
      "files_modified": 8,
      "tests_added": 12
    }
  ],
  "active": null
}
```

**Benefits:**
- Queryable history
- CLI commands: `agent-orch sessions list`, `agent-orch sessions show <id>`
- Statistics: How many sessions, success rate, common issues
- Team insights: Which features took longest, which needed most review

### Benefits Summary

**Historical Preservation:**
```
OLD: Each session overwrites PLAN.md/STATUS.md
NEW: Each session preserved in dated directory
```

**No File Bloat:**
```
OLD: Single STATUS.md grows indefinitely
NEW: Each session has isolated STATUS.md
```

**Clear Attribution:**
```
OLD: "When was this STATUS.md written?"
NEW: ssnc-agent-orch/2026-01-18-auth-feature/STATUS.md
```

**Git Friendly:**
```
OLD: PLAN.md changes on every session (noisy)
NEW: Discrete session directories (clean diffs)
```

**Multi-Session Capable:**
```
OLD: Can't work on multiple features
NEW: Each feature gets own session directory (future support)
```

**Easy Discovery:**
```
OLD: Hidden .claude-build/ directory
NEW: Visible ssnc-agent-orch/ in project root
```

**Team Visibility:**
```
OLD: Sessions lost after completion
NEW: Team can review past implementation approaches
```

### Example: Complete Session Lifecycle

#### 1. Session Creation
```
User: /agent-orch:build

Claude: "I'll help implement this feature. Let me gather requirements."

[Phase 1: Requirements gathering through conversation]

Claude: "Great! What should I call this build session?"
        "Suggested name: auth-feature"

User: auth-feature

Claude: "Creating session directory: ssnc-agent-orch/2026-01-18-auth-feature/"
        "Writing PLAN.md..."
```

#### 2. Implementation
```
Agents write to:
  ssnc-agent-orch/2026-01-18-auth-feature/PLAN.md
  ssnc-agent-orch/2026-01-18-auth-feature/STATUS.md

STATUS.md grows with agent progress:
  ## Builder Progress
  - [x] Login endpoint implemented

  ## Validator Progress
  - [x] 12 tests passing
```

#### 3. Completion
```
Claude: "Implementation complete!"
        "Session files: ssnc-agent-orch/2026-01-18-auth-feature/"
        "Would you like to commit these changes?"

User can now:
- Review ssnc-agent-orch/2026-01-18-auth-feature/PLAN.md
- Share session with team
- Commit or gitignore session directory
```

#### 4. Later Reference
```
$ cat ssnc-agent-orch/2026-01-18-auth-feature/STATUS.md

Reviewer can see:
- Exact implementation approach
- Which agents were involved
- Review rounds and issues found
- Final verification evidence
```

### README.md in ssnc-agent-orch/

Created automatically on first session:

```markdown
# Agent Orchestration Build Sessions

This directory contains build session history from `/agent-orch:build`.

## Structure

Each session is in a directory: `YYYY-MM-DD-[feature-name]/`

```
2026-01-18-auth-feature/
├── PLAN.md      # Requirements and implementation plan
└── STATUS.md    # Agent progress and completion status
```

## Usage

**List sessions:**
```bash
ls -lt ssnc-agent-orch/
```

**View specific session:**
```bash
cat ssnc-agent-orch/2026-01-18-auth-feature/PLAN.md
cat ssnc-agent-orch/2026-01-18-auth-feature/STATUS.md
```

**Clean old sessions:**
```bash
# Remove sessions older than 30 days
find ssnc-agent-orch/ -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;
```

## Git

To exclude from version control:
```gitignore
ssnc-agent-orch/
```

To commit sessions as documentation, don't add to .gitignore.
```

### Migration Strategy

**For existing users with PLAN.md/STATUS.md in root:**

```
Detection:
  If PLAN.md or STATUS.md exist in project root:
    Show warning: "Found legacy PLAN.md/STATUS.md in project root"

Options:
  (a) Move to ssnc-agent-orch/legacy/ (recommended)
  (b) Delete (they're from old session)
  (c) Leave as-is (will be overwritten eventually)

If user chooses (a):
  mv PLAN.md ssnc-agent-orch/legacy/PLAN.md
  mv STATUS.md ssnc-agent-orch/legacy/STATUS.md
  echo "Migrated legacy files to ssnc-agent-orch/legacy/"
```

---

## Conclusion

The Claude Agent Orchestration plugin represents a careful balance of architectural decisions:

**15 agents** - Optimal specialization without coordination overhead
**3-tier system** - Core, Review, Specialist roles with clear activation patterns
**2-stage review** - Sequential spec compliance → code quality gates
**Verification gates** - No completion claims without evidence
**Distrust-but-verify** - Structural skepticism as quality mechanism
**4-phase debugging** - Root cause first, no trial-and-error
**Parallel execution** - Independent work maximizes throughput
**File-based communication** - Async, auditable, no external dependencies
**Spec-kit native** - Works within existing structure, no separate tracking

These decisions work together to create a system that is:
- **Faster** - Parallel execution reduces wall-clock time
- **Higher quality** - Multiple specialized reviews catch more issues
- **More maintainable** - Systematic debugging builds understanding
- **Easier to adopt** - Native integration requires no workflow changes

The architecture prioritizes practical engineering concerns over theoretical purity, resulting in a system that works reliably in real-world development workflows.
