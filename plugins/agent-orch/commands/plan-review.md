# Plan Review

Review an existing PLAN.md file and suggest improvements without launching a full architect session.

## What This Does

This lightweight command analyzes your existing PLAN.md and provides feedback on:
- Completeness (are all sections present?)
- Clarity (are tasks well-defined?)
- Feasibility (realistic estimates and approach?)
- Dependencies (are blockers identified?)
- Quality targets (coverage, TDD, standards)
- Phasing (logical task breakdown?)

**This is NOT a replacement for architect planning**. Use this for:
- Quick review of draft plans
- Sanity check before starting implementation
- Identify missing sections or ambiguities
- Get suggestions for improvement

## When to Use

- After drafting a plan manually
- Before starting implementation
- When plan seems incomplete
- Quick check for common planning mistakes
- Update existing plan after scope changes

## How It Works

1. Reads PLAN.md from session directory or specified path
2. Validates structure against standard plan template
3. Checks for common issues:
   - Vague task descriptions
   - Missing acceptance criteria
   - No quality targets defined
   - Missing dependencies
   - Unrealistic complexity assessment
4. Generates improvement suggestions

## Output Format

```markdown
# Plan Review Report

**Plan File**: [path to PLAN.md]
**Review Time**: [timestamp]

## Completeness Check
| Section | Present | Quality |
|---------|---------|---------|
| Feature Description | ✅ | GOOD |
| Goal | ✅ | NEEDS IMPROVEMENT |
| Requirements | ✅ | GOOD |
| Architecture | ❌ MISSING | N/A |
| Tasks | ✅ | NEEDS IMPROVEMENT |
| Quality Targets | ⚠️ PARTIAL | NEEDS IMPROVEMENT |
| Specialists | ✅ | GOOD |

## Issues Found

### HIGH Priority (Fix Before Starting)
- **Missing Architecture section**: No design or approach specified
- **Vague task #3**: "Implement authentication" - needs breakdown
- **No TDD_MODE specified**: Add TDD_MODE to quality targets

### MEDIUM Priority (Improve Before Review)
- **Goal too vague**: "Make it better" - specify measurable outcomes
- **No dependencies listed**: Check if external systems or approvals needed
- **Coverage target missing**: Add COVERAGE_TARGET (default 100%)

### LOW Priority (Nice to Have)
- **No acceptance criteria**: Add success criteria for each requirement
- **Estimates missing**: Consider adding time estimates for major tasks

## Suggestions

1. **Architecture**: Add section describing:
   - Authentication flow (JWT vs sessions?)
   - Where tokens are stored
   - API endpoints affected

2. **Task Breakdown**: Split "Implement authentication" into:
   - Task 3.1: Create authentication middleware
   - Task 3.2: Add login endpoint
   - Task 3.3: Add logout endpoint
   - Task 3.4: Add token refresh endpoint

3. **Quality Targets**: Add to PLAN.md:
   ```
   COVERAGE_TARGET: 100%
   TDD_MODE: enforced
   PASS_RATE_TARGET: 100%
   ```

## Summary
- **Overall Quality**: NEEDS WORK
- **Ready for Implementation**: NO (fix HIGH priority issues first)
- **Estimated Fix Time**: 15-30 minutes
```

## Example Usage

```bash
# Review current session's PLAN.md
/agent-orch:plan-review

# Review specific PLAN.md file
/agent-orch:plan-review --file="ssnc-agent-orch/2026-03-28-feature/PLAN.md"

# Quick validation only (no suggestions)
/agent-orch:plan-review --validate-only
```

## What Gets Checked

### Completeness
- [ ] Feature/Goal clearly stated
- [ ] Requirements enumerated
- [ ] Architecture/approach described
- [ ] Tasks with acceptance criteria
- [ ] Quality targets defined
- [ ] Specialists identified
- [ ] Dependencies noted

### Clarity
- [ ] Tasks are specific and actionable
- [ ] No vague language ("make it better", "fix issues")
- [ ] Success criteria measurable
- [ ] Technical terms defined
- [ ] Constraints documented

### Feasibility
- [ ] Complexity score reasonable
- [ ] Dependencies realistic
- [ ] Scope not too large for single session
- [ ] Standards achievable (100% coverage feasible?)
- [ ] Phasing logical

### Standards
- [ ] Quality targets present (coverage, TDD, pass rate)
- [ ] Constitution/CLAUDE.md referenced
- [ ] Enforcement rules considered
- [ ] Agent coordination specified

## Comparison: Plan Review vs Full Architect

| Feature | Plan Review | Full Architect |
|---------|------------|----------------|
| **Time** | 2-3 minutes | 10-20 minutes |
| **Scope** | Review existing plan | Create plan from scratch |
| **Output** | Improvement suggestions | Complete PLAN.md |
| **Agents** | No agents (command) | Architect agent |
| **Use Case** | Validate draft plan | Initial planning |
| **Interaction** | Single-pass | Multi-turn refinement |

## No Agent Overhead

This is a **command**, not a skill:
- No agent spawning
- No multi-turn planning
- Fast feedback (2-3 minutes)
- Focused on improvement suggestions

For initial planning from requirements, use `/agent-orch:build` with full architect support.
