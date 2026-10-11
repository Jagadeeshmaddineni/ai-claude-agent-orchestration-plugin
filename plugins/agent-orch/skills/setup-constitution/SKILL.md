---
name: setup-constitution
description: Reviews and configures your spec-kit constitution.md file for optimal agent orchestration. Checks for required sections, suggests improvements, and can create/update the file. Usage: /agent-orch:setup-constitution
---

# Setup Constitution for Agent Orchestration

This skill reviews your `.specify/memory/constitution.md` file to ensure it contains all the sections needed for the agent orchestration system to work effectively with spec-kit.

## Why This Matters

The agents in `/agent-orch:implement` read the constitution to understand:
- **Code standards** - How to write code that matches your project
- **Testing requirements** - What coverage and patterns to follow
- **Security standards** - What security practices to enforce
- **API conventions** - How to design endpoints
- **Component library** - What design system to use (frontend projects)

The **Quality Reviewer** (Stage 2) specifically validates all code against the constitution.

### Relationship with `.claude/rules/`

Universal standards (security baseline, code standards, testing standards) are now managed in `.claude/rules/` and are **always loaded automatically** by Claude Code. The ISC2-certified Staff SWE persona is loaded via the agent-orch plugin's `rules/persona.md`.

This means `constitution.md` can be **leaner** -- focus on project-specific standards and spec-kit-specific context. Universal standards from `.claude/rules/` supplement the constitution automatically.

Without proper configuration:
- Quality reviews will be inconsistent
- Agents may not follow your patterns
- Security requirements may be missed
- Code quality will vary

---

## Process

### Step 1: Check for Spec-Kit Structure

Verify spec-kit is initialized:

**If `.specify/` doesn't exist:**
```
No .specify/ directory found.

Options:
(a) Initialize spec-kit structure now
(b) Use standalone mode (/agent-orch:setup-claude-md instead)
(c) Exit - run 'specify init' first
```

**If `.specify/` exists but no constitution:**
```
.specify/ exists but no constitution.md found.

I'll create .specify/memory/constitution.md for you.
```

**If constitution exists:**
- Read and analyse current content
- Compare against required sections
- Identify gaps

### Step 2: Analyse Project Context

Before suggesting content, analyse the project:

1. **Check for existing CLAUDE.md:**
   - If exists, use as reference for standards
   - Offer to sync/merge relevant sections

2. **Detect tech stack:**
   - Check `package.json` for Node.js/TypeScript
   - Check `requirements.txt` or `pyproject.toml` for Python
   - Check `go.mod` for Go
   - Check for framework indicators

3. **Detect existing patterns:**
   - Look for linter/formatter configs
   - Check existing test patterns
   - Identify folder structure conventions

4. **Check existing specs:**
   - Read `specs/` for context
   - Understand what features exist
   - Note any referenced standards

### Step 3: Required Sections Checklist

Present a checklist of required sections:

```markdown
## Constitution Configuration Checklist

### Identity (Required)
- [ ] **Project Identity** - Name, type, purpose

### Code Quality (Required)
- [ ] **Technical Standards** - Language, tools, quality gates
- [ ] **Architecture Patterns** - Structure, principles, allowed patterns
- [ ] **Naming Conventions** - Files, code elements

### Quality Assurance (Required)
- [ ] **Testing Requirements** - Coverage, structure, rules
- [ ] **Error Handling** - Error classes, response format

### Security (Required for APIs)
- [ ] **Security Standards** - OWASP, auth, validation

### API (Required for Backend)
- [ ] **API Standards** - Versioning, format, status codes
- [ ] **Database Standards** - Queries, migrations, naming

### Frontend (Required for UI)
- [ ] **Component Library** - Paths, packages, rules

### Documentation (Recommended)
- [ ] **Documentation Requirements** - What to document

### Agent Context (Recommended)
- [ ] **Key Integration Points** - Important files
- [ ] **Patterns to Follow** - Reference implementations
- [ ] **Technical Debt** - Areas to avoid
```

### Step 4: Generate Recommendations

For each missing section, provide:

1. **What's missing** - Specific gap
2. **Why it matters** - Which review stage uses it
3. **Suggested content** - Based on project analysis

Example:

```markdown
## Missing: Testing Requirements

**Impact:** Quality Reviewer checks test coverage against these thresholds.

**Detected from your project:**
- Framework: Jest (from package.json)
- Current coverage: 72% (from coverage report)
- Test pattern: AAA structure in existing tests

**Suggested content:**

```markdown
## Testing Requirements

### Coverage Thresholds
```
Statements: 80%
Branches: 75%
Functions: 80%
Lines: 80%
```

### Test Structure
```typescript
describe('[ModuleName]', () => {
  describe('[methodName]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange - Set up test data
      // Act - Execute the code
      // Assert - Verify the result
    });
  });
});
```
```
```

### Step 5: CLAUDE.md Sync Check

If both `CLAUDE.md` and constitution exist:

```markdown
## Sync Check: CLAUDE.md ↔ constitution.md

| Section | CLAUDE.md | constitution.md | Status |
|---------|-----------|-----------------|--------|
| Code Standards | ✅ Present | ✅ Present | ✅ In sync |
| Testing | ✅ Present | ❌ Missing | ⚠️ Add to constitution |
| Security | ❌ Missing | ✅ Present | ⚠️ Add to CLAUDE.md |
| API Design | ✅ Present | ✅ Present | ⚠️ Differences detected |

Options:
(a) Sync constitution from CLAUDE.md (Recommended)
(b) Sync CLAUDE.md from constitution
(c) Review differences manually
(d) Keep both as-is
```

### Step 6: Apply Changes

Ask user what action to take:

```
I found 5 missing sections in your constitution.md:
1. Testing Requirements
2. Error Handling
3. Security Standards
4. API Standards
5. Agent Context

Options:
(a) Add all missing sections (Recommended)
(b) Add specific sections - let me choose
(c) Show me the suggested content first
(d) Skip - I'll update manually
```

**If user approves:**
- Read existing constitution.md
- Merge new sections (preserve existing)
- Write updated file
- Show summary

### Step 7: Validation Summary

After updates:

```markdown
## Constitution Configuration Complete

### Sections Present
- [x] Project Identity
- [x] Technical Standards
- [x] Architecture Patterns
- [x] Naming Conventions
- [x] Testing Requirements
- [x] Error Handling
- [x] Security Standards
- [x] API Standards
- [x] Database Standards
- [x] Component Library
- [x] Agent Context

### Quality Review Ready
The Quality Reviewer (Stage 2) can now validate against:
- [x] Code patterns and architecture
- [x] Naming conventions
- [x] Test coverage thresholds
- [x] Security requirements
- [x] API consistency

### Agent Support
| Agent | Constitution Sections Used | Status |
|-------|---------------------------|--------|
| Quality Reviewer | All sections | ✅ Ready |
| Builder | Architecture, Naming | ✅ Ready |
| Validator | Testing Requirements | ✅ Ready |
| Security | Security Standards | ✅ Ready |
| API Designer | API Standards | ✅ Ready |
| Database | Database Standards | ✅ Ready |
| UI/UX | Component Library | ✅ Ready |

### Next Steps
Run `/agent-orch:implement` to start implementation with full quality review support.
```

---

## Section Reference

### What Quality Reviewer Checks

The Quality Reviewer (Stage 2) validates ALL code against constitution:

| Constitution Section | What's Validated |
|---------------------|------------------|
| Technical Standards | Linting, type safety, quality gates |
| Architecture Patterns | Correct structure, allowed patterns |
| Naming Conventions | File/code naming consistency |
| Testing Requirements | Coverage meets thresholds |
| Error Handling | Proper error classes used |
| Security Standards | OWASP compliance, auth patterns |
| API Standards | Response format, status codes |
| Database Standards | Query safety, naming |
| Component Library | Design system usage |

### Constitution vs CLAUDE.md

| Aspect | constitution.md | CLAUDE.md |
|--------|-----------------|-----------|
| Location | `.specify/memory/` | Project root |
| Used by | `/agent-orch:implement` | `/agent-orch:build` |
| Scope | Spec-kit projects | Standalone projects |
| Quality Review | Stage 2 reference | Quality check reference |

**Recommendation:** Keep both in sync if using both modes.

### Minimum Viable Constitution

For basic spec-kit orchestration:

```markdown
## Project Identity
[Name and purpose]

## Technical Standards
[Language and tools]

## Testing Requirements
[Coverage thresholds]

## Patterns to Follow
[Reference implementations]
```

### Full Constitution

For comprehensive quality review, include all sections from:
`examples/constitution.md.template`

---

## Troubleshooting

### Quality Review Failing

If Quality Reviewer keeps rejecting code:
1. Run this skill to check constitution
2. Ensure standards are achievable
3. Check if thresholds are too high
4. Verify patterns match existing code

### Constitution Not Found

If agents report missing constitution:
1. Check `.specify/memory/constitution.md` exists
2. Run this skill to create/fix it
3. Verify file permissions

### Standards Not Being Enforced

If code passes review but doesn't meet standards:
1. Constitution sections may be too vague
2. Add specific examples and patterns
3. Include file:line references to existing code

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.setup-constitution:` entry. If the file is absent, has no
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
