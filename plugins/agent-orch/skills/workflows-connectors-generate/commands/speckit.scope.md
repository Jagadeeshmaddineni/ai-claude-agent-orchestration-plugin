---
description: Scope connector details through interactive questions. Determines authentication, triggers, and actions based on API documentation and similar connector patterns.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The input may contain additional context.

---

## STRICT COMPLIANCE RULES

**CRITICAL: You MUST follow the question templates EXACTLY as written in the question files.**

### What You MUST Do:
- **Read and follow each question file exactly** - load from `guides/scope/q[N]-*.md`
- Present questions using the **EXACT text and format** from the question files
- Use the **EXACT option numbers and labels** specified in each question
- Follow the **EXACT step sequence** within each question file
- Use `AskUserQuestion` tool with options that match the templates exactly
- Wait for user response before proceeding to the next question

### What You MUST NOT Do:
- ❌ DO NOT create your own question categories or groupings
- ❌ DO NOT rephrase, restructure, or "improve" the options provided
- ❌ DO NOT combine multiple questions into one
- ❌ DO NOT skip steps within a question
- ❌ DO NOT summarize or condense the templates
- ❌ DO NOT use different option labels than what's specified
- ❌ DO NOT reduce options on loop iterations

### Enforcement:
If you find yourself wanting to present options differently than the question file specifies, **STOP** and use the template exactly as written.

---

## Prerequisites

**Step 1: Read connector context**

1. Check `specs/*/connector-context.md` for the most recently modified folder
2. Read it to get the service name, internal name, and feature branch
3. Check if API documentation step is complete

```
🔍 Loading connector context...

[If specs/[feature-branch-name]/connector-context.md exists]
Service: [Service Name]
Internal Name: [service-name]
Feature Branch: [feature-branch-name]
Artifacts: specs/[feature-branch-name]/

[If not exists]
❌ No connector context found.
Please run /workflows-connectors-generate first to set up the connector.
```

**Step 2: Read API reference artifact**

- Location: `specs/[feature-branch-name]/api-reference.md`
- Contains: Authentication details, endpoints, webhook capability

If artifact not found, instruct user to run `/speckit.docs` first.

---

## Question Flow

Execute each question by reading its file and following the instructions exactly.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATION FLOW                                                 │
│                                                                     │
│  For each question:                                                 │
│  1. Read the question file from guides/scope/            │
│  2. Execute ALL steps in that file exactly as written               │
│  3. Store the outputs/decisions                                     │
│  4. Move to next question                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Question 1: Integration Approach
**Condition:** Only if BOTH SDK and HTTP API available (check artifact)
**If only one option:** Skip, use what's available

→ Read `~/.claude/skills/workflows-connectors-generate/guides/scope/q1-integration-approach.md` and execute its instructions

---

### Question 2: Authentication
**Condition:** Always required

→ Read `~/.claude/skills/workflows-connectors-generate/guides/scope/q2-authentication.md` and execute its instructions

---

### Question 3: Webhooks
**Condition:** Always required

→ Read `~/.claude/skills/workflows-connectors-generate/guides/scope/q3-webhooks.md` and execute its instructions

---

### Question 4: Actions
**Condition:** Always required
**Note:** This question has a confirmation loop - follow the loop rules exactly

→ Read `~/.claude/skills/workflows-connectors-generate/guides/scope/q4-actions.md` and execute its instructions

---

### Question 5: Triggers
**Condition:** Always required

→ Read `~/.claude/skills/workflows-connectors-generate/guides/scope/q5-triggers.md` and execute its instructions

---

### Question 6: Uncertainties
**Condition:** Only if artifact has uncertainties section with items

→ Read `~/.claude/skills/workflows-connectors-generate/guides/scope/q6-uncertainties.md` and execute its instructions (or skip if no uncertainties)

---

### Question 7: PR Breakdown
**Condition:** Always required (evaluates size and may skip breakdown for small connectors)

→ Read `~/.claude/skills/workflows-connectors-generate/guides/scope/q7-breakdown.md` and execute its instructions

This question:
- Assesses connector size based on action/trigger counts
- For large connectors: negotiates breakdown into sub-scopes (MVP, Actions, Triggers)
- Generates `specs/[feature-branch-name]/breakdown.md` if breakdown is needed
- Generates `specs/[feature-branch-name]/specify-instructions.md` from template

---

## Output: Specification File

After all questions answered, create the specification file.

**Location:** `specs/[feature-branch-name]/scope.md`

**Structure:**
```markdown
# Connector Specification: [Service Name]

**API Reference:** `specs/[feature-branch-name]/api-reference.md`

## Service Information

- Display Name: [Service Name]
- Internal Name: [service-name] (kebab-case)
- Category: [PieceCategory]

## Integration Approach

- Method: [SDK / HTTP API]
- [If SDK] Package: [npm package name]
- [If HTTP] Uses httpClient with endpoints from API Reference

## Authentication

- Type: [OAuth2 / SecretText / CustomAuth]
- [If OAuth2] Grant Type: [CLIENT_CREDENTIALS / AUTHORIZATION_CODE]
- Validation Endpoint: [endpoint]

See API Reference → Authentication section for full details.

## Actions ([N] selected)

[If Custom API Call supported]
| Action | Resource | Method | Endpoint |
|--------|----------|--------|----------|
| 🔧 custom-api-call | Generic | ANY | [pattern] |

[If Generic API Pattern detected - include Generic CRUD actions]
| Action | Resource | Method | Endpoint |
|--------|----------|--------|----------|
| 📦 create-[entity] | [Entity] | POST | [pattern] |
| 📦 get-[entity] | [Entity] | GET | [pattern]/{id} |
| 📦 list-[entity]s | [Entity] | GET | [pattern] |
| 📦 update-[entity] | [Entity] | PATCH | [pattern]/{id} |
| 📦 delete-[entity] | [Entity] | DELETE | [pattern]/{id} |

[Pre-configured entity actions]
| Action | Resource | Method | Endpoint |
|--------|----------|--------|----------|
| [action-name] | [Entity] | [METHOD] | [/specific/path] |

[Other actions]
| Action | Resource | Method | Endpoint |
|--------|----------|--------|----------|
| [action-name] | [Resource] | [METHOD] | [/path] |

See API Reference → API Landscape for endpoint details.

## Triggers ([N] selected)

| Trigger | Strategy | Event/Endpoint | Dedup |
|---------|----------|----------------|-------|
| [trigger-name] | WEBHOOK | [event.name] | - |
| [trigger-name] | POLLING | [GET /path] | [field] |

See API Reference → Webhooks section for event details.

## Resolved Uncertainties

[If any were resolved]
- [Topic]: [Chosen resolution]

[If none] None - all requirements were clear from documentation.

## Notes

[Any special considerations discovered during configuration]
```

---

## Update Context and Report

**Update** `specs/[feature-branch-name]/connector-context.md` status:
```markdown
- [x] Pre-flight complete
- [x] API documentation gathered
- [x] Connector configured  ← UPDATE THIS
- [ ] Code generated
```

**Final Output:**

### If Breakdown Created (Large Connector - Incremental Mode):
```
✅ Connector configuration complete!

📄 Scope: specs/[feature-branch-name]/scope.md
📋 Breakdown: specs/[feature-branch-name]/breakdown.md ([N] sub-scopes)

Summary:
┌─────────────────────┬─────────────────────────────────────┐
│ Service             │ [Service Name]                      │
│ Integration         │ [SDK: package-name / HTTP API]      │
│ Authentication      │ [Type] ([Grant Type if OAuth2])     │
│ Actions             │ [N] total                           │
│   🔧 Custom API     │ [1 if included / 0]                 │
│   📦 Generic CRUD   │ [N] (if Generic API Pattern)        │
│   📌 Pre-configured │ [N] entity-specific                 │
│   Other             │ [N] additional                      │
│ Triggers            │ [N] ([X] webhook, [Y] polling)      │
│ Uncertainties       │ [N] resolved / None                 │
└─────────────────────┴─────────────────────────────────────┘

📦 Sub-Scope Breakdown:
┌─────────────────────────────────────────────────────────────┐
│ Sub-Scope 1: MVP [current]                                  │
│   Auth + [mvp-action] + [mvp-trigger]                       │
├─────────────────────────────────────────────────────────────┤
│ Sub-Scope 2: Actions [pending]                              │
│   [N] remaining actions                                     │
├─────────────────────────────────────────────────────────────┤
│ Sub-Scope 3: Triggers [pending]                             │
│   [N] remaining triggers                                    │
└─────────────────────────────────────────────────────────────┘

→ Next: Run /speckit.specify @specs/[feature-branch-name]/specify-instructions.md
```

### If No Breakdown (Small Connector - Full Mode):
```
✅ Connector configuration complete!

📄 Scope: specs/[feature-branch-name]/scope.md
📄 Mode: Full (single PR)

Summary:
┌─────────────────────┬─────────────────────────────────────┐
│ Service             │ [Service Name]                      │
│ Integration         │ [SDK: package-name / HTTP API]      │
│ Authentication      │ [Type] ([Grant Type if OAuth2])     │
│ Actions             │ [N] total                           │
│   🔧 Custom API     │ [1 if included / 0]                 │
│   📦 Generic CRUD   │ [N] (if Generic API Pattern)        │
│   📌 Pre-configured │ [N] entity-specific                 │
│   Other             │ [N] additional                      │
│ Triggers            │ [N] ([X] webhook, [Y] polling)      │
│ Uncertainties       │ [N] resolved / None                 │
└─────────────────────┴─────────────────────────────────────┘

→ Next: Run /speckit.specify @specs/[feature-branch-name]/specify-instructions.md
```

**IMPORTANT:** Always replace `[feature-branch-name]` with the actual feature branch name from connector-context.md.
Example: `→ Next: Run /speckit.specify @specs/feat-CONN-123-acme-crm-connector/specify-instructions.md`

---

## Reference Policies

- `~/.claude/skills/workflows-connectors-generate/policies/authentication.md`
- `~/.claude/skills/workflows-connectors-generate/guides/AUTHENTICATION_PATTERNS.md`
- `~/.claude/skills/workflows-connectors-generate/guides/PATTERN_ANALYSIS.md`
