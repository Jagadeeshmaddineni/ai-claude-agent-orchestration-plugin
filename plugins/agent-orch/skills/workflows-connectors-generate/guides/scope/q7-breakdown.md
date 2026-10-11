# Question 7: PR Breakdown

**Condition:** Always required (but may result in no breakdown for small connectors).

## Overview

This question evaluates connector size and optionally creates a breakdown for incremental PR workflow.

---

## Step 1: Size Assessment

### 1.1: Count Selected Items

From previous questions, count:
- `action_count`: total actions from Q4
- `trigger_count`: total triggers from Q5

### 1.2: Classify Size

| Classification | Criteria | Breakdown |
|----------------|----------|-----------|
| Small | actions ≤ 3 AND triggers ≤ 2 | Not needed |
| Large | actions > 3 OR triggers > 2 | Recommended |

---

## Step 2: Small Connector Path

**If classified as Small:**

**Output:**
```
📊 Size Assessment

Actions: [N] | Triggers: [M]
Classification: Small

This connector is manageable in a single PR.
No breakdown required - proceeding with full implementation.
```

→ Proceed to **Step 7: Generate Specify Instructions** (with `has_breakdown = false`).

---

## Step 3: Large Connector Path

**If classified as Large:**

### 3.1: Present Size Assessment

**Output:**
```
📊 Size Assessment

Actions: [N] | Triggers: [M]
Classification: Large

Breaking this connector into smaller PRs will make code reviews easier
and allow incremental testing.
```

### 3.2: Get User Preference

**Use AskUserQuestion with these EXACT options:**

```
Question: "Would you like to break this connector into multiple PRs?"
Header: "Breakdown"

Options (use these EXACT labels):
1. Label: "Yes, use incremental PRs (Recommended)"
   Description: "Break into MVP + Actions + Triggers PRs"

2. Label: "No, generate all at once"
   Description: "Single PR with all actions and triggers"

3. Label: "Custom breakdown"
   Description: "Specify your own PR groupings"
```

---

## Option Handlers:

### Option 1 - Incremental PRs (Recommended):

Proceed to Step 4 (MVP Selection).

---

### Option 2 - Generate all at once:

**Output:**
```
Proceeding with full generation (no breakdown).

All [N] actions and [M] triggers will be generated together.
```

→ Proceed to **Step 7: Generate Specify Instructions** (with `has_breakdown = false`).

---

### Option 3 - Custom breakdown:

**Output:**
```
📝 Custom Breakdown

Describe how you'd like to organize the PRs.

Default structure:
- PR1 (MVP): Foundation + Auth + 1 action + 1 trigger
- PR2: Remaining actions
- PR3: Remaining triggers

You can:
- Group related actions together
- Split by resource type
- Specify exact PR contents

Describe your preferred breakdown:
> _
```

Collect user's description, then proceed to Step 5 (Generate Breakdown) using their custom structure.

---

## Step 4: MVP Selection

### 4.1: Select MVP Action

**Use AskUserQuestion:**

```
Question: "Which action should be in the MVP (first PR)?"
Header: "MVP Action"

Options:
- List first 4 actions from selected_actions (from Q4)
- Recommend the most representative/common action first with "(Recommended)" suffix

Description for each: "[METHOD] [endpoint] - tests [resource] operations"
```

Store selection as `mvp_action`.

### 4.2: Select MVP Trigger

**Use AskUserQuestion:**

```
Question: "Which trigger should be in the MVP (first PR)?"
Header: "MVP Trigger"

Options:
- List first 4 triggers from selected_triggers (from Q5)
- Recommend webhook trigger over polling if available, with "(Recommended)" suffix

Description for each: "[STRATEGY] - [event/endpoint]"
```

Store selection as `mvp_trigger`.

### 4.3: Confirm MVP

**Output:**
```
📦 MVP Configuration

The first PR will include:
┌─────────────────────────────────────────────────────────────┐
│ Foundation    │ package.json, tsconfig, eslint, project.json│
│ Infrastructure│ client, constants, types, validators        │
│ Auth          │ [auth type from Q2]                         │
│ Action        │ [mvp_action]                                │
│ Trigger       │ [mvp_trigger]                               │
│ Entry Point   │ index.ts, README.md                         │
└─────────────────────────────────────────────────────────────┘

This creates a minimal working connector that can be tested end-to-end.
```

Proceed to Step 5.

---

## Step 5: Generate Breakdown

### 5.1: Calculate Remaining Items

```
remaining_actions = selected_actions - mvp_action
remaining_triggers = selected_triggers - mvp_trigger
```

### 5.2: Determine Sub-Scope Structure

**Default structure:**
- Sub-Scope 1 (MVP): Foundation + Auth + mvp_action + mvp_trigger
- Sub-Scope 2 (Actions): All remaining_actions
- Sub-Scope 3 (Triggers): All remaining_triggers (if any)

**If custom breakdown provided:** Use user's structure instead.

**If no remaining triggers:** Skip Sub-Scope 3.

### 5.3: Present Final Breakdown

**Output:**
```
📋 PR Breakdown Plan

┌─────────────────────────────────────────────────────────────┐
│ Sub-Scope 1: MVP                                    [current]│
├─────────────────────────────────────────────────────────────┤
│ • Foundation (package.json, tsconfig, etc.)                 │
│ • Infrastructure (client, constants, types)                 │
│ • Auth: [auth type]                                         │
│ • Action: [mvp_action]                                      │
│ • Trigger: [mvp_trigger]                                    │
│ • Entry point + README                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Sub-Scope 2: Actions                                [pending]│
├─────────────────────────────────────────────────────────────┤
│ • [action-1]                                                │
│ • [action-2]                                                │
│ • ...                                                       │
│ • Update actions/index.ts                                   │
└─────────────────────────────────────────────────────────────┘

[If remaining triggers exist]
┌─────────────────────────────────────────────────────────────┐
│ Sub-Scope 3: Triggers                               [pending]│
├─────────────────────────────────────────────────────────────┤
│ • [trigger-1]                                               │
│ • [trigger-2]                                               │
│ • ...                                                       │
│ • Update triggers/index.ts                                  │
└─────────────────────────────────────────────────────────────┘

Total: [N] sub-scopes
```

### 5.4: Confirm Breakdown

**Use AskUserQuestion:**

```
Question: "Does this breakdown look good?"
Header: "Confirm"

Options:
1. Label: "Confirm breakdown"
   Description: "Save this breakdown and continue"

2. Label: "Adjust groupings"
   Description: "Modify how items are grouped"

3. Label: "Change MVP selection"
   Description: "Select different action/trigger for MVP"
```

**Option 1:** Proceed to Step 6.
**Option 2:** Return to Step 5 with user adjustments.
**Option 3:** Return to Step 4.

---

## Step 6: Create Breakdown File

### 6.1: Write breakdown.md

**Location:** `specs/[feature-branch-name]/breakdown.md`

**Content:**
```markdown
# Connector Breakdown: [Service Name]

## Size Assessment
- Actions: [N]
- Triggers: [M]
- Classification: Large

## Sub-Scopes

### Sub-Scope 1: MVP [current]
Minimal working connector for end-to-end testing.

**Includes:**
- Infrastructure: all (package.json, tsconfig, client, constants, types, validators)
- Auth: [auth type]
- Actions: [mvp_action]
- Triggers: [mvp_trigger]
- Entry point: index.ts
- Documentation: README.md

---

### Sub-Scope 2: Actions [pending]
Remaining actions implementation.

**Includes:**
- Actions: [action-1], [action-2], [action-3], ...
- Update: actions/index.ts

**Notes:**
- Apply factory pattern if similar action structures detected
- Ensure consistent error handling across all actions

---

[If Sub-Scope 3 exists]
### Sub-Scope 3: Triggers [pending]
Remaining triggers implementation.

**Includes:**
- Triggers: [trigger-1], [trigger-2], ...
- Update: triggers/index.ts

**Notes:**
- Apply trigger factory pattern if 2+ polling triggers
- Ensure consistent deduplication strategy
```

---

## Step 7: Generate Specify Instructions

**Always create `specify-instructions.md`** - regardless of whether breakdown was created.

### 7.1: Determine Mode

Check if breakdown was created (`has_breakdown`):
- `true` → Use incremental mode template
- `false` → Use full mode template

### 7.2: Write Instructions File

**Location:** `specs/[feature-branch-name]/specify-instructions.md`

#### If has_breakdown = true (Incremental Mode):

```markdown
# Specify Instructions: [Service Name]

Generate implementation specification for the **current sub-scope only**.

## Current Sub-Scope

Read the sub-scope marked as `[current]` from:
`specs/[feature-branch-name]/breakdown.md`

Only generate specification for the items listed in that sub-scope.

## Technical Decisions

Use the technical decisions and configuration from:
`specs/[feature-branch-name]/scope.md`

This includes:
- Integration approach (SDK vs HTTP API)
- Authentication type and configuration
- Action/trigger definitions and endpoints

## API Reference

Reference endpoint details, request/response schemas, and authentication from:
`specs/[feature-branch-name]/api-reference.md`

## Instructions

1. **Scope limitation**: Generate spec.md for the CURRENT SUB-SCOPE ONLY
   - Do not include actions/triggers from other sub-scopes
   - Include all infrastructure/auth details (needed for every sub-scope)

2. **For MVP sub-scope** (Sub-Scope 1):
   - Include complete foundation setup
   - Include full authentication configuration
   - Include the single selected action with complete details
   - Include the single selected trigger with complete details
   - Include entry point and README structure

3. **For subsequent sub-scopes** (Actions, Triggers):
   - Include only the items listed in this sub-scope
   - Reference existing infrastructure (already implemented)
   - Include index.ts updates

4. **Context note**: Add this header to spec.md:
   ```
   > This specification covers: [Sub-Scope Name]
   > Part of [Service Name] connector - see breakdown.md for full plan
   ```
```

#### If has_breakdown = false (Full Mode):

```markdown
# Specify Instructions: [Service Name]

Generate implementation specification for the **complete connector**.

## Specification

Use the full connector specification from:
`specs/[feature-branch-name]/scope.md`

Include all actions and triggers defined in the specification.

## API Reference

Reference endpoint details, request/response schemas, and authentication from:
`specs/[feature-branch-name]/api-reference.md`

## Instructions

1. Generate spec.md covering:
   - Complete foundation setup
   - Full authentication configuration
   - All selected actions with complete details
   - All selected triggers with complete details
   - Entry point and README structure

2. Include all technical decisions from the specification file.
```

---

## Output

### Always Store:

- `instructions_file`: `specs/[feature-branch-name]/specify-instructions.md`

### If Breakdown Created:

Additionally store:
- `breakdown_created`: true
- `breakdown_file`: `specs/[feature-branch-name]/breakdown.md`
- `sub_scope_count`: number of sub-scopes
- `current_sub_scope`: "MVP"

### If No Breakdown:

Additionally store:
- `breakdown_created`: false

**Final message always uses instructions file path:**
`→ Next: Run /speckit.specify @specs/[feature-branch-name]/specify-instructions.md`
