# Spec-Kit Integration Guide

This guide explains how the Claude Agent Orchestration plugin integrates with your existing spec-kit workflow using native `.specify/` structure.

---

## Overview

The Claude Agent Orchestration plugin **enhances, not replaces** spec-kit. Use spec-kit for specification and planning, then use this plugin for parallel multi-agent implementation.

**Key principle**: All coordination happens through `.specify/` - no separate tracking files.

---

## Native Integration

### How Agents Use `.specify/`

```
.specify/
├── memory/
│   └── constitution.md    # Agents READ project standards
├── specs/[feature]/
│   ├── spec.md            # Agents READ requirements (from /speckit.specify)
│   ├── plan.md            # Agents READ approach (from /speckit.plan)
│   ├── tasks.md           # Agents READ & UPDATE task progress
│   └── status.md          # Agents WRITE findings & progress
└── orchestration/
    └── [feature]/
        └── agents.md      # Created if needed for specialist coordination
```

### Auto-Detection

When you run `/agent-orch:implement`:
1. Plugin scans `specs/` for feature directories
2. Checks `tasks.md` files for incomplete tasks
3. If single feature: proceeds automatically
4. If multiple features: shows list and asks which to implement

---

## Recommended Workflow

### Phase 1: Specification (Standard Spec-Kit)

```
> /speckit.specify         # Write the specification
```

Creates `specs/[feature]/spec.md`

### Phase 2: Planning (Standard Spec-Kit)

```
> /speckit.plan            # Create implementation plan
```

Creates `specs/[feature]/plan.md`

### Phase 3: Task Generation (Standard Spec-Kit)

```
> /speckit.tasks           # Generate task list
```

Creates `specs/[feature]/tasks.md`

### Phase 4: Multi-Agent Implementation (This Plugin)

```
> /agent-orch:implement
```

The plugin:
1. Auto-detects the feature from `specs/`
2. Architect reads specs, plan, and tasks
3. Architect recommends specialists based on task analysis
4. You approve plan + specialist selection
5. All approved agents launch in parallel
6. Progress tracked in `specs/[feature]/status.md`

### Phase 5: Validation (Standard Spec-Kit)

```
> /speckit.checklist       # Final validation
```

---

## Example: User Authentication Feature

### Day 1: Specification

```bash
claude

> /speckit.specify
# Write auth specification with requirements

> /speckit.plan
# Create implementation approach

> /speckit.tasks
# Generate task list
```

**Result**: `specs/user-auth/` contains spec.md, plan.md, tasks.md

### Day 2: Implementation

```bash
claude

> /agent-orch:implement

[Auto-detects user-auth from specs/]
[Architect analyses and recommends: Security Auditor, Database Architect, API Designer]
[You approve]
[6 agents launch in parallel]
[Progress in specs/user-auth/status.md]
```

**Result**: Implemented feature with tests, docs, security review

### Day 3: Validation

```bash
> /speckit.checklist

# Any issues → targeted fix
> /agent-orch:implement
```

---

## Agent Reading from Spec-Kit

### What Each Agent Reads

| Agent | Reads From |
|-------|------------|
| Architect | `constitution.md`, `spec.md`, `plan.md`, `tasks.md` |
| Builder | `spec.md`, `plan.md`, `tasks.md` |
| Validator | `spec.md`, `tasks.md` |
| Scribe | `spec.md`, `plan.md` |
| Reviewer | `constitution.md`, `spec.md`, `tasks.md`, `status.md` |
| Specialists | `spec.md`, `status.md` |

### What Each Agent Writes

| Agent | Writes To |
|-------|-----------|
| Architect | `tasks.md` (assignments), `agents.md` (coordination) |
| Builder | `tasks.md` (completion), `status.md` (progress) |
| Validator | `status.md` (test results, issues) |
| Scribe | `status.md` (doc status) |
| Reviewer | `status.md` (review findings), `tasks.md` (refinement tasks) |
| Specialists | `status.md` (findings) |

---

## Ensuring Spec Compliance

### During Implementation

The Validator agent checks implementation against specification:

1. Reads `specs/[feature]/spec.md`
2. Validates each feature Builder creates
3. Reports deviations in `status.md`
4. Severity levels:
   - **Critical**: Violates spec requirement
   - **Major**: Missing spec requirement
   - **Minor**: Style/convention difference

### Specification Updates

If implementation must deviate from spec:

1. Builder flags in `status.md`
2. Architect reviews and decides
3. If approved, Scribe updates specification
4. Documentation reflects the change

---

## When to Use Which

### Use Standard Spec-Kit for:
- Creating specifications (`/speckit.specify`)
- Planning approaches (`/speckit.plan`)
- Generating task lists (`/speckit.tasks`)
- Final checklist validation (`/speckit.checklist`)
- Single-focus work

### Use Claude Agent Orchestration for:
- Complex implementations requiring multiple concerns
- Features needing tests + docs + security review simultaneously
- When you want parallel agent execution
- Large feature development
- When specialist expertise is beneficial

---

## Troubleshooting

### Feature Not Auto-Detected

If the plugin doesn't find your feature:
1. Verify `specs/[feature-name]/` exists
2. Check that `tasks.md` has incomplete tasks (`- [ ]`)
3. If multiple features exist, plugin will ask you to choose

### Agents Not Reading Constitution

If agents ignore project standards:
1. Verify `.specify/memory/constitution.md` exists
2. Check file has proper markdown formatting
3. Ensure no permission issues

### Spec Conflicts

If Validator reports spec conflicts:
1. Check `specs/[feature]/status.md` for details
2. Decide: update spec or fix implementation
3. Architect will help resolve conflicts

---

## Compatibility

Works with **any spec-kit version** because it:
- Uses standard `.specify/` directory structure
- Reads spec-kit's output files (specs, plans, tasks)
- Doesn't modify spec-kit's core commands
- Adds orchestration as a layer on top
