# When to Use: Decision Guide

A practical guide to help you choose the right tool for your development task: standard Claude Code, spec-kit alone, or this multi-agent orchestration plugin.

---

## Quick Decision Matrix

| Your Situation | Recommended Approach | Why |
|----------------|----------------------|-----|
| Simple bug fix or single-file change | **Standard Claude Code** | Overhead of multi-agent not justified |
| Need structured planning for complex feature | **Spec-Kit Alone** | Great for specs/planning, implement manually or with standard Claude |
| Complex feature with multiple concerns (API + DB + tests + docs + security) | **This Plugin (`/agent-orch:implement`)** | Parallel execution, specialist reviews, verification gates |
| Quick prototype without formal specs | **This Plugin (`/agent-orch:build`)** | Multi-agent power without spec-kit setup |
| Large refactor across many files | **This Plugin** | Multiple agents can handle different concerns simultaneously |
| Learning unfamiliar codebase | **This Plugin (`/agent-orch:analyse`)** | Multiple specialist perspectives provide deeper insights |
| Solo dev, small project (<5 files) | **Standard Claude Code** | Keep it simple |
| Team collaboration, medium project (5-20 files) | **Spec-Kit + This Plugin** | Specs for alignment, multi-agent for implementation |
| Large project (20+ files), multiple concerns | **Spec-Kit + This Plugin** | Essential for managing complexity |

---

## Standard Claude Code

### When to Use

Use the standard Claude Code CLI when:

- **Simple, focused changes** - Fixing a bug, updating a function, adding a small feature
- **Single concern** - Only need one type of work (just code, or just tests, or just docs)
- **Quick iterations** - Rapid back-and-forth with a single agent is more efficient
- **Learning/exploring** - Experimenting with ideas, not production-ready code yet
- **Files < 5** - Small scope that doesn't benefit from parallelization

### Examples

```bash
# Fix a specific bug
claude
> Fix the validation error in src/auth/login.ts

# Update documentation
claude
> Update the README with new installation instructions

# Simple feature addition
claude
> Add a new method to calculate tax in the Order class
```

### Advantages

- Fast startup
- Lower API costs (single agent)
- Direct conversation flow
- No coordination overhead
- Simple mental model

### Limitations

- Sequential work only
- No specialist reviews
- No verification gates
- Manual coordination of concerns
- Can miss edge cases

---

## Spec-Kit Alone

### When to Use

Use [spec-kit](https://github.com/github/spec-kit) without orchestration when:

- **Planning phase** - Need to document what to build before implementing
- **Team alignment** - Multiple stakeholders need to review specifications
- **Complex domain** - Requirements need careful thinking and validation
- **Implementation later** - Want to spec now, implement later (manually or with standard Claude)
- **Architecture decisions** - Need structured decision-making process

### Example Workflow

```bash
claude
> /speckit.specify       # Write detailed specification
> /speckit.plan          # Create implementation plan
> /speckit.tasks         # Break into specific tasks

# Then either:
# Option A: Implement manually or with team
# Option B: Use standard Claude Code for implementation
# Option C: Use this plugin's /agent-orch:implement
```

### Advantages

- Excellent for planning and documentation
- Creates shared understanding
- Structured decision-making
- Great for async team collaboration
- Implementation-agnostic

### When to Add This Plugin

Add multi-agent orchestration if:
- Implementation involves **multiple concerns** (security + performance + tests)
- Feature is **large** (multiple files, complex logic)
- Want **parallel execution** (docs while coding while testing)
- Need **specialist reviews** (security audits, performance analysis)
- Want **verification gates** (no completion without evidence)

---

## This Plugin: Multi-Agent Orchestration

### `/agent-orch:implement` (Spec-Kit Mode)

**Use when**: You have `.specify/` directory and want parallel multi-agent implementation

#### Ideal Scenarios

1. **Complex features with multiple concerns**
   ```
   Example: User authentication system
   - API endpoints (API Designer)
   - Database schema (Database Architect)
   - Security validation (Security Auditor)
   - Tests (Validator)
   - Documentation (Scribe)

   All work in parallel, coordinated by Architect
   ```

2. **Large feature development**
   ```
   Example: Payment processing integration
   - Multiple files (10+)
   - Multiple services
   - Security critical
   - Performance critical
   - Comprehensive testing needed
   ```

3. **Features requiring specialist expertise**
   ```
   Example: Real-time notification system
   - Performance optimization needed (Performance Analyst)
   - Frontend updates (UI/UX Designer)
   - Infrastructure changes (DevOps Engineer)
   - API design (API Designer)
   ```

#### Workflow

```bash
# Phase 1: Spec-Kit (Planning)
claude
> /speckit.specify       # Define requirements
> /speckit.plan          # Plan approach
> /speckit.tasks         # Break into tasks

# Phase 2: Multi-Agent Implementation
> /agent-orch:implement

# Architect analyses and recommends specialists
# You approve plan + specialist selection
# 4 core agents + specialists work in parallel
# Two-stage code review (spec compliance → code quality)
# Finalization after Quality Reviewer approval
```

#### Advantages

- **Parallel execution** - Multiple concerns handled simultaneously
- **Specialist reviews** - Security, performance, etc.
- **Verification gates** - No claims without evidence
- **Two-stage review** - Spec compliance verified before code quality
- **Systematic debugging** - Root cause analysis when issues occur
- **Constitution-aware** - All agents read project standards

#### Cost Considerations

- **4 core agents always active** (Architect, Builder, Validator, Scribe)
- **2 review agents** (Spec Reviewer, Quality Reviewer)
- **0-8 specialist agents** based on task
- **Higher API costs** than single-agent mode
- **Faster completion** offsets cost for complex features

#### When NOT to Use

- Simple changes (<5 files)
- Single-concern tasks (just docs, just tests)
- Tight budget constraints on small tasks
- Learning/experimental work

---

### `/agent-orch:build` (Standalone Mode)

**Use when**: Want multi-agent power WITHOUT spec-kit setup

#### Ideal Scenarios

1. **Quick prototypes with quality**
   ```
   Example: POC for new feature
   - No time for formal specs
   - Still want tests + docs + reviews
   - Need it working quickly
   ```

2. **Projects without spec-kit**
   ```
   Example: Working in codebase without .specify/
   - Can't add spec-kit infrastructure
   - Still want multi-agent benefits
   - Uses PLAN.md and STATUS.md in project root
   ```

3. **Exploratory development**
   ```
   Example: Trying new architecture approach
   - Requirements emerge during development
   - Conversation-driven requirements gathering
   - Iterate on design before formalizing
   ```

#### Workflow

```bash
claude
> /agent-orch:build

# Phase 1: Conversation-based requirements gathering
# Answers questions to define what to build
# Reviews design sections incrementally

# Phase 2: Creates PLAN.md with requirements
# Architect analyses and recommends specialists
# You approve

# Phase 3: Multi-agent implementation
# Same parallel execution as implement mode
# Uses PLAN.md instead of specs/
# Uses CLAUDE.md instead of .specify/memory/constitution.md
```

#### Advantages

- No spec-kit setup required
- Conversation-driven requirements
- Incremental design validation
- Same multi-agent power as implement mode
- Good for one-off projects

#### Limitations

- Less structure than spec-kit mode
- No formal spec artifacts
- Requirements in conversation, not documents
- Better for smaller features

---

### `/agent-orch:analyse`

**Use when**: Need to understand code before writing specs

#### Ideal Scenarios

1. **Onboarding to unfamiliar codebase**
   ```
   > /agent-orch:analyse

   Multiple agents examine code from different perspectives:
   - Architect: Overall structure and patterns
   - Security Auditor: Security concerns
   - Performance Analyst: Performance bottlenecks
   - Database Architect: Data layer analysis
   ```

2. **Before writing specifications**
   ```
   Example: Planning major refactor
   - Understand current state first
   - Get specialist assessments
   - Then use /speckit.specify with insights
   ```

3. **Code review or audit**
   ```
   Example: Inheriting legacy project
   - Security audit
   - Performance review
   - Technical debt assessment
   - Migration planning
   ```

#### Workflow

```bash
claude
> /agent-orch:analyse

# Launches relevant specialists based on codebase
# Each provides perspective in their domain
# Results compiled into analysis report
# Use insights for planning next steps
```

---

## Project Size Guidelines

### Small Project (1-10 files)

**Recommended**: Standard Claude Code

**Characteristics**:
- Simple domain
- Few dependencies
- Single developer
- Rapid iteration

**When to add this plugin**:
- Security-critical code
- Performance-critical code
- Need comprehensive testing

### Medium Project (10-50 files)

**Recommended**: Spec-Kit + This Plugin (selective use)

**Characteristics**:
- Multiple modules
- Team of 2-5 developers
- Some complex interactions

**Usage pattern**:
- Use spec-kit for planning all features
- Use `/agent-orch:implement` for complex features
- Use standard Claude for simple changes

### Large Project (50+ files)

**Recommended**: Spec-Kit + This Plugin (default)

**Characteristics**:
- Multiple services/modules
- Large team
- Complex domain
- Strict quality requirements

**Usage pattern**:
- Always use spec-kit for planning
- Default to `/agent-orch:implement` for most features
- Only use standard Claude for trivial fixes

---

## Feature Complexity Matrix

### Simple Fix (1 point of complexity)

**Example**: Fix typo, update config, small bug fix

**Decision**: Standard Claude Code

**Why**: Multi-agent overhead not justified

---

### Medium Feature (2-3 points of complexity)

**Example**: Add new API endpoint with tests and docs

**Decision**:
- **With spec-kit already**: `/agent-orch:implement`
- **Without spec-kit**: `/agent-orch:build` OR Standard Claude Code

**Factors**:
- Budget: Standard Claude cheaper
- Quality gates needed: Use plugin
- Time pressure: Use plugin (parallel)

---

### Complex Feature (4-6 points of complexity)

**Example**: User authentication with security, database, API, tests, docs

**Decision**: `/agent-orch:implement` (with spec-kit) OR `/agent-orch:build`

**Why**:
- Multiple concerns benefit from parallel execution
- Specialist reviews catch issues
- Verification gates ensure completeness

---

### Major Feature/Refactor (7+ points of complexity)

**Example**: Payment system integration, database migration, frontend redesign

**Decision**: **Spec-Kit + `/agent-orch:implement`** (required)

**Why**:
- Complexity demands structure (spec-kit)
- Multiple specialists essential
- Team coordination required
- Risk mitigation through reviews

### Complexity Scoring

Add 1 point for each:
- New file created
- Database change
- Security consideration
- Performance requirement
- API change
- UI component
- Documentation needed
- Multiple services involved

---

## Team Size Considerations

### Solo Developer

**Pattern**: Mix approaches based on task

- Simple: Standard Claude
- Planning: Spec-kit alone
- Complex: `/agent-orch:build` (no spec-kit overhead)
- Critical: `/agent-orch:implement` with spec-kit

**Benefits of plugin for solo dev**:
- Specialist reviews you might miss
- Verification gates prevent shortcuts
- Documentation doesn't get skipped

---

### Small Team (2-5 developers)

**Pattern**: Spec-kit + selective orchestration

- All features: Start with spec-kit (alignment)
- Complex features: `/agent-orch:implement`
- Simple fixes: Standard Claude or manual

**Benefits**:
- Specs provide team alignment
- Orchestration handles complex coordination
- Manual work stays option for simple tasks

**Setup**:
```json
// .claude/settings.json (team-shared)
{
  "extraKnownMarketplaces": { "ssnc": { /* ... */ } },
  "enabledPlugins": { "agent-orch@ssnc": true }
}
```

---

### Large Team (6+ developers)

**Pattern**: Spec-kit + orchestration by default

- All features: Spec-kit planning
- All implementations: `/agent-orch:implement`
- Exception: Trivial fixes can use standard Claude

**Benefits**:
- Consistent process
- Quality gates enforced
- Specialist reviews on all code
- Documentation never forgotten

**Additional considerations**:
- Add `.specify/memory/constitution.md` with team standards
- Configure specialist agents for your domain
- Train team on workflow

---

## Standalone vs Spec-Kit Mode

### `/agent-orch:build` (Standalone)

**Best for**:
- Prototypes and POCs
- Projects without spec-kit
- Solo development
- Exploratory features
- External/consulting projects

**File structure**:
```
project-root/
├── CLAUDE.md      # Project standards
├── PLAN.md        # Created by plugin
└── STATUS.md      # Agent progress
```

**Pros**:
- No spec-kit dependency
- Faster to start
- Conversation-driven

**Cons**:
- Less formal structure
- Requirements not as documented
- No spec-kit validation tools

---

### `/agent-orch:implement` (Spec-Kit Mode)

**Best for**:
- Production features
- Team projects
- Long-term maintenance
- Complex domains
- When specs needed for stakeholders

**File structure**:
```
.specify/
├── memory/constitution.md
└── specs/[feature]/
    ├── spec.md        # From /speckit.specify
    ├── plan.md        # From /speckit.plan
    ├── tasks.md       # From /speckit.tasks
    └── status.md      # Updated by agents
```

**Pros**:
- Formal specifications
- Better for teams
- Audit trail
- Works with spec-kit tools

**Cons**:
- Requires spec-kit setup
- More overhead for simple tasks
- Learning curve for spec-kit

---

## Cost Considerations

### API Call Costs

**Standard Claude Code**: 1 agent = 1x cost

**This Plugin (Spec-Kit Mode)**:
- Core team: 4 agents (4x cost)
- Review team: 2 agents (2x cost)
- Specialists: 0-8 agents (variable)
- **Total**: 6-14x cost depending on specialists activated

**This Plugin (Standalone Mode)**: Same as spec-kit mode

### When Higher Cost is Worth It

1. **Time savings outweigh cost**
   - Parallel execution cuts wall-clock time 60-80%
   - Complex feature: 4 hours vs 1.5 hours = worth 6x cost

2. **Quality prevents expensive bugs**
   - Security audit catches vulnerability = saves potential breach
   - Performance review prevents costly refactor later
   - Verification gates prevent incomplete features

3. **Documentation prevents future cost**
   - Scribe agent ensures docs don't get skipped
   - Future developers save time understanding code
   - Reduces support/maintenance burden

4. **Comprehensive testing prevents rework**
   - Validator ensures edge cases covered
   - Two-stage review catches issues early
   - Less time debugging in production

### When to Optimize Cost

1. **Budget constrained**
   - Use standard Claude for simple tasks
   - Use `/agent-orch:build` only for complex features
   - Manually disable specialists you don't need

2. **Learning/experimental work**
   - Standard Claude fine for prototypes
   - Add orchestration when moving to production

3. **Very simple changes**
   - Single-file changes: Standard Claude
   - Documentation updates: Standard Claude
   - Config changes: Standard Claude

---

## Example Scenarios with Recommendations

### Scenario 1: Fix Login Bug

**Context**: Login form doesn't validate email format properly

**Complexity**: 1 point (single concern, one file)

**Recommendation**: **Standard Claude Code**

**Why**: Simple fix doesn't benefit from multi-agent orchestration

```bash
claude
> Fix email validation in src/components/LoginForm.tsx
```

**Time**: 5-10 minutes
**Cost**: 1x

---

### Scenario 2: Add New Dashboard Widget

**Context**: Need new widget showing recent activity, with tests and docs

**Complexity**: 3 points (new component, tests, docs)

**Recommendation**: **`/agent-orch:build`** (if no spec-kit) OR **`/agent-orch:implement`** (if has spec-kit)

**Why**: Multiple concerns (UI + tests + docs) benefit from parallel execution

```bash
# Without spec-kit
claude
> /agent-orch:build

# With spec-kit
claude
> /speckit.specify    # Define widget requirements
> /speckit.plan       # Plan implementation
> /speckit.tasks      # Break into tasks
> /agent-orch:implement
```

**Time**:
- Build mode: 1-1.5 hours
- Implement mode: 1.5-2 hours (includes spec-kit)

**Cost**: 6-8x (core team + UI/UX Designer)

**Value**: Guaranteed tests, docs, and design consistency

---

### Scenario 3: Implement Payment Processing

**Context**: Integrate Stripe for payments, including webhooks, database, security, tests, docs

**Complexity**: 8 points (security critical, multiple files, database, API, tests, docs, compliance)

**Recommendation**: **Spec-Kit + `/agent-orch:implement`** (REQUIRED)

**Why**:
- High complexity demands structure
- Security critical requires audit
- Multiple concerns need coordination
- Team needs shared understanding

```bash
claude
> /speckit.specify       # Detailed payment spec
> /speckit.plan          # Architecture plan
> /speckit.tasks         # Task breakdown
> /agent-orch:implement

# Architect activates:
# - Builder (implementation)
# - Validator (comprehensive tests)
# - Scribe (docs)
# - Security Auditor (OWASP, PCI considerations)
# - API Designer (webhook endpoints)
# - Database Architect (transaction schema)
```

**Time**: 4-6 hours (vs 12-16 hours sequential)
**Cost**: 10-12x (core + 6 specialists)
**Value**:
- Security audit prevents breaches
- Comprehensive tests prevent payment failures
- Proper docs prevent integration issues
- Parallel execution saves 60% time

---

### Scenario 4: Large Refactor - Split Monolith Service

**Context**: Break monolithic service into 3 microservices

**Complexity**: 12+ points (multiple services, migrations, breaking changes, tests, docs, deployment)

**Recommendation**: **Spec-Kit + `/agent-orch:implement`** (ESSENTIAL)

**Why**:
- Massive complexity requires systematic approach
- Multiple specialists needed
- High risk requires reviews
- Team coordination essential

```bash
# Phase 1: Analysis
claude
> /agent-orch:analyse    # Understand current monolith

# Phase 2: Planning
> /speckit.specify       # Define new architecture
> /speckit.plan          # Migration strategy
> /speckit.tasks         # Phased implementation

# Phase 3: Implementation (multiple iterations)
> /agent-orch:implement

# Architect activates:
# - Builder (code changes)
# - Validator (extensive tests)
# - Scribe (migration docs)
# - Refactorer (technical debt)
# - Migration Specialist (backward compatibility)
# - Database Architect (data migration)
# - DevOps Engineer (deployment strategy)
# - Performance Analyst (ensure no regression)
```

**Time**: Multiple days/weeks with phases
**Cost**: 14x per phase (all specialists)
**Value**:
- Systematic approach reduces risk
- Specialist reviews catch issues early
- Comprehensive testing prevents outages
- Documentation enables smooth rollout
- Without orchestration: extremely risky

---

### Scenario 5: Quick POC - Test New Framework

**Context**: Evaluate new React framework for potential adoption

**Complexity**: 4 points (new code, learning, evaluation needed)

**Recommendation**: **`/agent-orch:build`**

**Why**:
- Not production code yet
- Don't need formal specs
- Want quality feedback quickly
- Conversation-driven is fine

```bash
claude
> /agent-orch:build

# Conversational requirements gathering
# Creates PLAN.md with POC scope
# UI/UX Designer provides framework feedback
# Builder implements POC
# Validator tests
# Scribe documents findings
```

**Time**: 2-3 hours
**Cost**: 7x (core + UI/UX)
**Value**:
- Quality POC with tests
- Framework evaluation from specialist
- Decision documentation
- Faster than doing sequentially

---

### Scenario 6: Update Documentation Only

**Context**: Update API documentation for recent changes

**Complexity**: 1 point (docs only)

**Recommendation**: **Standard Claude Code**

**Why**: Single concern doesn't benefit from orchestration

```bash
claude
> Update API docs in docs/api.md to reflect recent auth changes
```

**Time**: 10-15 minutes
**Cost**: 1x

---

### Scenario 7: Performance Investigation

**Context**: Dashboard loading slowly, need to find and fix bottlenecks

**Complexity**: 5 points (investigation, multiple potential issues, testing)

**Recommendation**: **`/agent-orch:implement`** OR **`/agent-orch:build`**

**Why**:
- Multiple potential causes (DB, frontend, network)
- Need systematic investigation
- Performance Analyst specialist helpful
- Verification that fixes work

```bash
claude
> /agent-orch:build

# If issues found, Debugger uses systematic approach:
# 1. Root cause investigation (no guessing)
# 2. Pattern analysis
# 3. Hypothesis testing
# 4. Implementation with verification
```

**Time**: 2-4 hours
**Cost**: 8x (core + Performance Analyst + Debugger)
**Value**:
- Systematic root cause analysis
- No shotgun debugging
- Performance verification
- Documentation of findings

---

## Decision Tree

```
START: Need to write code
│
├─ Is it < 5 files and single concern?
│  ├─ YES → Use Standard Claude Code
│  └─ NO → Continue
│
├─ Do you need formal specifications?
│  ├─ YES → Do you have .specify/ setup?
│  │  ├─ YES → Use /speckit.specify + /agent-orch:implement
│  │  └─ NO → Set up spec-kit first, then /agent-orch:implement
│  │
│  └─ NO → Continue
│
├─ Multiple concerns? (security + performance + tests + docs)
│  ├─ YES → Use /agent-orch:build OR set up spec-kit
│  └─ NO → Continue
│
├─ Is it security or performance critical?
│  ├─ YES → Use /agent-orch:build (get specialist review)
│  └─ NO → Continue
│
├─ Tight budget?
│  ├─ YES → Use Standard Claude Code
│  └─ NO → Consider /agent-orch:build for quality
│
└─ DEFAULT → Standard Claude Code
```

---

## Quick Reference

### Use Standard Claude Code For:
- Bug fixes
- Single-file changes
- Simple features
- Documentation updates
- Learning/experimentation
- Quick iterations
- Budget constrained

### Use Spec-Kit Alone For:
- Planning phase only
- Team alignment
- Complex domain analysis
- Will implement manually or later

### Use `/agent-orch:analyse` For:
- Understanding unfamiliar code
- Before writing specs
- Code audits
- Onboarding

### Use `/agent-orch:build` For:
- Prototypes needing quality
- Projects without spec-kit
- Quick but thorough development
- Exploratory features

### Use `/agent-orch:implement` For:
- Complex features (4+ concerns)
- Security/performance critical
- Large features (10+ files)
- Team projects with spec-kit
- When specialist reviews essential
- Production-quality requirements

---

## Still Unsure?

### Ask These Questions:

1. **How many files will change?**
   - 1-3: Standard Claude
   - 4-10: Consider plugin
   - 10+: Use plugin

2. **How many concerns?** (tests, docs, security, performance, etc.)
   - 1: Standard Claude
   - 2-3: Consider plugin
   - 4+: Use plugin

3. **What's the risk if something goes wrong?**
   - Low: Standard Claude is fine
   - Medium: Consider plugin for reviews
   - High: Use plugin for verification gates

4. **Is time or cost the constraint?**
   - Time: Use plugin (parallel execution)
   - Cost: Use standard Claude

5. **Do you have spec-kit set up?**
   - Yes: Use `/agent-orch:implement`
   - No: Use `/agent-orch:build` OR stay with standard Claude

6. **Is this a one-off or ongoing project?**
   - One-off: `/agent-orch:build` is fine
   - Ongoing: Set up spec-kit properly

---

## Summary

**The plugin excels when**:
- Multiple concerns need parallel attention
- Specialist expertise adds value
- Quality gates prevent issues
- Time savings justify cost
- Systematic approach reduces risk

**Standard Claude excels when**:
- Simple, focused changes
- Single concern
- Quick iterations
- Budget constrained
- Learning/experimental

**Spec-kit excels when**:
- Need formal planning
- Team coordination essential
- Complex domain requires structure
- Specifications needed for stakeholders

**Choose based on**: complexity, concerns, risk, team size, budget, and project phase.

**When in doubt**: Start with standard Claude. Upgrade to plugin when you feel the pain of coordinating multiple concerns manually.
