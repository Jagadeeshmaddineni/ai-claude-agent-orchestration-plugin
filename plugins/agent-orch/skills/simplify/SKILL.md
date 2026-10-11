# Simplify Skill

Post-implementation code simplification - reviews changed code for reuse opportunities, quality improvements, and efficiency gains.

## Purpose

After implementing a feature, this skill performs a focused simplification pass to identify:
- Duplicated logic that could be extracted
- Over-engineered solutions that could be simpler
- Performance inefficiencies
- Reusable patterns worth abstracting
- Code quality improvements

This is equivalent to Anthropic's official `/simplify` command but integrated with the agent orchestration system.

## When to Use

**After implementation is complete:**
- Feature works and tests pass
- Code is committed or ready for PR
- You want to improve code quality before merge
- Post-hoc refactoring and optimization

**Do NOT use during initial implementation** - build features first, simplify later.

## What This Does

1. **Identifies changed code** - Uses git diff to find modified/new files
2. **Analyzes for simplification opportunities** - Reviews code for patterns
3. **Generates improvement suggestions** - Reports findings without modifying code
4. **User approves changes** - You review and approve before applying
5. **Applies approved changes** - Updates code based on approval

## Review Categories

### Code Reuse
- Duplicated logic across files
- Similar functions that could be consolidated
- Repeated patterns worth extracting
- Shared utilities missing

### Simplification
- Over-complex logic that could be simpler
- Unnecessary abstractions
- Too many layers of indirection
- Can be expressed more clearly

### Performance
- Inefficient algorithms (O(n²) → O(n log n))
- Unnecessary iterations
- Missing memoization opportunities
- Expensive operations in loops

### Quality
- Long functions that could be split
- Poor naming that obscures intent
- Missing error handling
- Hard-coded values that should be constants

## Usage

```bash
# Review all changed files
/agent-orch:simplify

# Review specific files
/agent-orch:simplify --files="src/api/users.ts,src/utils/validation.ts"

# Review changes since specific commit
/agent-orch:simplify --since=abc123

# Report only (don't apply changes)
/agent-orch:simplify --report-only
```

## Output Format

```markdown
# Simplification Report

**Files Analyzed**: [N files]
**Lines Changed**: [N lines]
**Opportunities Found**: [N]

## High-Value Improvements

### 1. Extract Duplicated Validation Logic
**Files**: src/api/users.ts:45-67, src/api/posts.ts:89-111
**Issue**: Same email validation logic duplicated in 2 files
**Suggestion**: Extract to shared `validateEmail()` utility
**Impact**: -40 lines, improved maintainability
**Confidence**: HIGH

**Before** (users.ts):
\`\`\`typescript
if (!email || !email.includes('@') || email.length < 5) {
  throw new Error('Invalid email');
}
\`\`\`

**After** (utils/validation.ts):
\`\`\`typescript
export function validateEmail(email: string) {
  if (!email || !email.includes('@') || email.length < 5) {
    throw new Error('Invalid email');
  }
}
\`\`\`

### 2. Simplify Nested Conditionals
**File**: src/api/orders.ts:156-189
**Issue**: 4 levels of nested if/else - hard to follow
**Suggestion**: Use early returns
**Impact**: Improved readability
**Confidence**: HIGH

**Before**:
\`\`\`typescript
function processOrder(order) {
  if (order.valid) {
    if (order.user) {
      if (order.items.length > 0) {
        // process order
      } else {
        throw new Error('No items');
      }
    } else {
      throw new Error('No user');
    }
  } else {
    throw new Error('Invalid order');
  }
}
\`\`\`

**After**:
\`\`\`typescript
function processOrder(order) {
  if (!order.valid) throw new Error('Invalid order');
  if (!order.user) throw new Error('No user');
  if (order.items.length === 0) throw new Error('No items');

  // process order
}
\`\`\`

### 3. Replace Loop with Built-in Method
**File**: src/utils/array-helpers.ts:23-31
**Issue**: Manual loop to find item - less efficient and clear
**Suggestion**: Use Array.find()
**Impact**: -8 lines, O(n) same but clearer intent
**Confidence**: MEDIUM

**Before**:
\`\`\`typescript
let found = null;
for (let i = 0; i < users.length; i++) {
  if (users[i].id === userId) {
    found = users[i];
    break;
  }
}
return found;
\`\`\`

**After**:
\`\`\`typescript
return users.find(user => user.id === userId);
\`\`\`

## Medium-Value Improvements

### 4. Extract Magic Numbers
**File**: src/config/limits.ts:12,45,67
**Issue**: Hardcoded numbers (100, 50, 25) scattered in code
**Suggestion**: Define named constants
**Impact**: Improved maintainability
**Confidence**: MEDIUM

### 5. Consolidate Error Messages
**Files**: Multiple files
**Issue**: Similar error messages with slight variations
**Suggestion**: Centralize error messages
**Impact**: Consistency, easier i18n later
**Confidence**: LOW

## Summary
- **High-value improvements**: 3
- **Medium-value improvements**: 2
- **Estimated time to apply**: 20-30 minutes
- **Lines saved**: ~48
- **Maintainability gain**: HIGH

## Approve Changes?
- Type 'yes' to apply all HIGH confidence improvements
- Type 'selective' to choose which improvements to apply
- Type 'no' to keep as-is
```

## Approval Workflow

### Option 1: Apply All High-Confidence
```bash
User: yes
Assistant: Applying 3 high-confidence improvements...
- ✅ Extracted validateEmail() to utils/validation.ts
- ✅ Simplified processOrder() with early returns
- ✅ Replaced manual loop with Array.find()

All changes applied. Run tests to verify.
```

### Option 2: Selective Application
```bash
User: selective
Assistant: Which improvements do you want to apply? (comma-separated numbers)
User: 1,2
Assistant: Applying improvements #1 and #2...
- ✅ Extracted validateEmail() utility
- ✅ Simplified processOrder() conditionals
- ⏭️ Skipped #3 (manual loop replacement)

Changes applied. Run tests to verify.
```

### Option 3: Report Only
```bash
User: no
Assistant: No changes applied. Report saved to simplification-report.md for future reference.
```

## Confidence Levels

**HIGH Confidence** - Apply with minimal risk:
- Extract duplicated code
- Replace complex logic with simpler equivalent
- Use built-in methods over manual implementations
- Extract magic numbers to constants

**MEDIUM Confidence** - Review carefully:
- Performance optimizations (verify with benchmarks)
- Refactor moderate complexity functions
- Consolidate similar patterns

**LOW Confidence** - User discretion advised:
- Aggressive abstractions
- Significant restructuring
- Style preferences
- Speculative improvements

## Integration with Build Skill

The `/agent-orch:build` skill can optionally run simplify after implementation:

```markdown
# In PLAN.md

SIMPLIFY_POST_BUILD: true  # Run simplify after implementation
SIMPLIFY_CONFIDENCE: HIGH  # Only apply HIGH confidence changes
```

## Comparison to Refactorer Agent

| Feature | Simplify Skill | Refactorer Agent |
|---------|---------------|------------------|
| **Timing** | Post-implementation | During implementation |
| **Scope** | Changed code only | Any code in codebase |
| **Approval** | User approves first | Applies immediately |
| **Focus** | Quick wins, reuse | Comprehensive refactoring |
| **Agent** | Single-pass analysis | Multi-turn refactoring |

Use **simplify** for post-implementation cleanup.
Use **refactorer** during active development for larger restructuring.

## Best Practices

**Do**:
- ✅ Run after feature completion
- ✅ Review suggestions before applying
- ✅ Run tests after applying changes
- ✅ Focus on high-confidence improvements first

**Don't**:
- ❌ Run during active development (disrupts flow)
- ❌ Apply all suggestions blindly
- ❌ Over-abstract for single use cases
- ❌ Optimize prematurely without measurements

## Example Session

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.simplify:` entry. If the file is absent, has no
entry for this skill, or the entry is empty, **run exactly as documented above — no
behaviour change.** This is the default and most common case.

If an entry exists, this skill exposes these hook points:
- `before` — targets run before the skill's main work
- `after` — targets run after the skill's main work

Run any listed targets in order, following the shared resolver in
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline).
Tell the user when you run an extension target. A failing target is surfaced but does
NOT abort the skill unless the user aborts. Full contract:
`plugins/agent-orch/rules/extensibility.md`.

---

## Example Session

```bash
User: /agent-orch:simplify