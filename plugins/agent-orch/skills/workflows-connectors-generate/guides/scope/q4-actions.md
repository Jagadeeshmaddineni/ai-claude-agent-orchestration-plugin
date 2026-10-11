# Question 4: Actions Selection

**Condition:** Always required.

## Overview

This question has two parts:
- **Step A:** Present recommended actions (information display)
- **Step B:** Confirmation loop (user interaction)

---

## Step A: Present Recommendations

### A1: Load from API Reference Artifact

Read `specs/[service-name]-api-reference.md`:
- API Landscape section → resources and operations
- ⭐ Core actions identified during docs phase
- Documentation Sources table → links to original docs for details
- **Generic API Pattern section** → if present, check for pre-configured action candidates (entities marked as high-frequency or complex should have dedicated actions in addition to generic ones)

### A2: Consult Original Documentation

For each resource/operation in API Landscape, reference the original documentation:
- If URL source → use WebFetch or read from `specs/docs-raw/`
- If local file (PDF, MD, HTML) → read the file path from Documentation Sources
- Extract: parameters, request/response schemas, required fields

### A3: Pattern Analysis (Secondary Signal)

1. **Classify service**: Match against PieceCategory
2. **Find similar connectors**: Search packages/connectors/ for same category
3. **Extract patterns**: Common action names across similar connectors

Reference: `guides/PATTERN_ANALYSIS.md`

### A4: Check Custom API Call Capability

Read `specs/[service-name]-api-reference.md` → Custom API Call section.

**If Custom API Call is supported:**
- Automatically include `custom-api-call` in the actions list
- Note the type: TABLE_API, REST_GENERIC, GRAPHQL, or QUERY_ENDPOINT

### A5: Check Generic API Pattern → Include Generic CRUD Actions

Read `specs/[service-name]-api-reference.md` → Generic API Pattern section.

**If Generic API Pattern is detected, ALWAYS include Generic CRUD actions:**

These are the "sweet spot" between Custom API Call and Pre-configured actions:
- More structured than Custom API Call (user doesn't need HTTP knowledge)
- More flexible than Pre-configured (works with ANY entity/table)

**Determine entity name from the pattern variable:**
| Pattern Variable | Entity Name | Example Actions |
|------------------|-------------|-----------------|
| `{tableName}` | record | create-record, get-record, list-records, update-record, delete-record |
| `{objectType}` | object | create-object, get-object, list-objects, update-object, delete-object |
| `{entityName}` | entity | create-entity, get-entity, list-entities, update-entity, delete-entity |
| `{resourceType}` | resource | create-resource, get-resource, list-resources, update-resource, delete-resource |

**Standard Generic CRUD actions to include:**
1. `create-[entity]` - POST to generic pattern
2. `get-[entity]` - GET single item by ID
3. `list-[entity]` or `search-[entity]` - GET with query parameters
4. `update-[entity]` - PATCH/PUT by ID
5. `delete-[entity]` - DELETE by ID (if API supports deletion)

### A6: Display Actions

**Output this EXACT template format. DO NOT create custom groupings or "approach" categories.**

```
📋 Actions Selection

Sources consulted:
  • API Reference: specs/[service-name]-api-reference.md
  • Original Docs: [list from Documentation Sources table]
  • Similar Connectors: [N] connectors in [Category]

[If Custom API Call supported - show first]
**🔧 Custom API Call (Auto-included):**
┌────────────────────────┬──────────┬─────────────────────┬────────────┐
│ Action                 │ Type     │ Pattern             │ Status     │
├────────────────────────┼──────────┼─────────────────────┼────────────┤
│ 🔧 Custom API Call     │ [TYPE]   │ [pattern]           │ ✅ Included│
└────────────────────────┴──────────┴─────────────────────┴────────────┘
This action lets users make arbitrary API calls to any endpoint.

[If Generic API Pattern detected - show Generic CRUD actions]
**📦 Generic CRUD Actions (Auto-included):**
These work with ANY [entity] - the sweet spot between Custom API Call and Pre-configured.
┌────────────────────────┬──────────┬─────────────────────┬────────────┐
│ Action                 │ Operation│ Endpoint            │ Status     │
├────────────────────────┼──────────┼─────────────────────┼────────────┤
│ create-[entity]        │ CREATE   │ POST [pattern]      │ ✅ Included│
│ get-[entity]           │ READ     │ GET [pattern]/{id}  │ ✅ Included│
│ list-[entity]s         │ LIST     │ GET [pattern]       │ ✅ Included│
│ update-[entity]        │ UPDATE   │ PATCH [pattern]/{id}│ ✅ Included│
│ delete-[entity]        │ DELETE   │ DELETE [pattern]/{id}│ ✅/❌     │
└────────────────────────┴──────────┴─────────────────────┴────────────┘
User provides [entity] name + fields. More structured than Custom API Call.

**Core Actions (⭐ from documentation):**
┌────────────────────────┬──────────┬─────────────────────┬────────────┐
│ Action                 │ Resource │ Endpoint            │ Docs       │
├────────────────────────┼──────────┼─────────────────────┼────────────┤
│ ⭐ [action-name]       │ [Name]   │ [METHOD /path]      │ ✅         │
│ ⭐ [action-name]       │ [Name]   │ [METHOD /path]      │ ✅         │
│ ...                    │ ...      │ ...                 │ ...        │
└────────────────────────┴──────────┴─────────────────────┴────────────┘

**Additional Operations (available):**
┌────────────────────────┬──────────┬─────────────────────┬────────────┐
│ Action                 │ Resource │ Endpoint            │ Docs       │
├────────────────────────┼──────────┼─────────────────────┼────────────┤
│ [action-name]          │ [Name]   │ [METHOD /path]      │ ✅/⚠️/❓   │
│ ...                    │ ...      │ ...                 │ ...        │
└────────────────────────┴──────────┴─────────────────────┴────────────┘

[If Generic API Pattern detected with pre-configured candidates]
**📌 Pre-configured Actions (recommended):**
Based on API analysis, these entities benefit from dedicated actions:
┌────────────────────────┬──────────┬─────────────────────┬────────────┐
│ Action                 │ Entity   │ Criterion           │ Reason     │
├────────────────────────┼──────────┼─────────────────────┼────────────┤
│ create-[entity]        │ [name]   │ [high-freq/complex] │ [reason]   │
│ get-[entity]           │ [name]   │ [high-freq/complex] │ [reason]   │
│ ...                    │ ...      │ ...                 │ ...        │
└────────────────────────┴──────────┴─────────────────────┴────────────┘
These wrap the generic API with better UX (typed fields, dropdowns, validation).

Legend: ⭐ = core, 🔧 = custom API call, 📦 = generic CRUD
        ✅ = documented, ⚠️ = partial docs, ❓ = needs verification
```

**After displaying, IMMEDIATELY proceed to Step B.**

---

## Step B: Confirmation Loop

```
┌─────────────────────────────────────────────────────────────┐
│  LOOP BEHAVIOR:                                             │
│                                                             │
│  User selects option → Process it → Show updated list →     │
│  → Return to this dialogue (unless "Confirm" selected)      │
│                                                             │
│  Only "Confirm" exits the loop and proceeds to Question 5   │
└─────────────────────────────────────────────────────────────┘
```

### ⚠️ CRITICAL RULES:

1. **Every iteration MUST present the SAME 4 options**
2. **DO NOT simplify, reduce, or change options on subsequent iterations**
3. **Whether 1st, 2nd, or 10th iteration, ALWAYS show all 4 options**

---

### B1: Display Current Selection

**Output:**
```
✅ Current Actions Selected: [N] actions

┌────────────────────────┬──────────┬─────────────────────┐
│ Action                 │ Resource │ Endpoint            │
├────────────────────────┼──────────┼─────────────────────┤
│ [action-name]          │ [Name]   │ [METHOD /path]      │
│ ...                    │ ...      │ ...                 │
└────────────────────────┴──────────┴─────────────────────┘
```

### B2: Present Options

**Use AskUserQuestion with these EXACT options (EVERY TIME):**

```
Question: "You have [N] actions selected. How would you like to proceed?"
Header: "Actions"

Options (use these EXACT labels - ALL 4 OPTIONS EVERY TIME):
1. Label: "Confirm ([N] actions)"
   Description: "Finalize selection and proceed to triggers"

2. Label: "Add more (+5)"
   Description: "Add 5 more actions from available operations"

3. Label: "Adjust selection"
   Description: "Toggle individual actions on/off"

4. Label: "Enter custom list"
   Description: "Provide your own list of actions"
```

---

### Option Handlers:

#### Option 1 - Confirm:
✅ **EXIT LOOP** → Store selected actions, proceed to Question 5.

---

#### Option 2 - Add more (+5):

1. Add up to 5 more actions from available operations
2. If fewer than 5 available, add all remaining
3. **Output:**
```
➕ Expanding action selection...

Previous: [N] actions
Added: [X] actions (from available operations)
New total: [M] actions
```
4. Show updated action list
5. 🔄 **LOOP BACK → Return to B1 with updated list**

---

#### Option 3 - Adjust selection:

1. **Output:**
```
Toggle actions (enter number, 'done' when finished):

SELECTED:
  [1] ⭐ [Action Name]
  [2] ⭐ [Action Name]
  [3] [Action Name]

AVAILABLE:
  [4] [Action Name]
  [5] [Action Name] ⚠️

Enter number or 'done':
```
2. Process user's toggles until they enter 'done'
3. Show updated action list
4. 🔄 **LOOP BACK → Return to B1 with updated list**

---

#### Option 4 - Enter custom list:

1. **Output:**
```
📝 Enter your desired actions

Type the actions you want, one per line.
You can use action names from the list above or describe new ones.
Type 'done' when finished.

Examples:
  - create-incident
  - Get User by Email
  - Custom: Upload attachment to record

Your actions:
> _
```
2. Collect user's list until they enter 'done'
3. Map each to API endpoints:
```
Mapped actions:
  ✅ create-incident → POST /table/incident
  ✅ Get User by Email → GET /table/sys_user (with query)
  ⚠️ Upload attachment → POST /attachment/file (needs verification)
```
4. 🔄 **LOOP BACK → Return to B1 with custom list as current selection**

---

## Output

When user confirms, store:
- `selected_actions`: list of action objects with name, resource, method, endpoint
- `custom_api_call`: true/false and type if included
- `generic_crud_actions`: list of generic CRUD action names (if Generic API Pattern detected)
- `pre_configured_actions`: list of pre-configured entity actions
- `action_count`: total number
