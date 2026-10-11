# Question 5: Triggers Selection

**Condition:** Always required.

## Step 1: Load Webhook Capability

Read the stored webhook decision from Question 3:
- `webhooks_supported`: true/false
- `webhook_events`: list of events (if supported)

Also read `specs/[service-name]-api-reference.md` → Webhooks section for event details.

---

## Step 2: Consult Original Webhook Documentation

If webhooks supported, read the original webhook docs:
- Source from Documentation Sources table (Webhooks row)
- Extract: event names, payload structures, subscription endpoints

---

## Step 3: Map Triggers to Events/Endpoints

Create a mapping table:

| Trigger Type | Webhook Event | Strategy | Source |
|--------------|---------------|----------|--------|
| New [Resource] | `resource.created` | 🔗 WEBHOOK | webhook docs |
| [Resource] Updated | `resource.updated` | 🔗 WEBHOOK | webhook docs |
| New Form Response | (none) | 🔄 POLLING | API endpoint |

**Strategy Rules:**
- If webhook event exists for the trigger → 🔗 WEBHOOK
- If no webhook event → 🔄 POLLING (use list endpoint + dedup field)

---

## Step 4: Present Triggers

**Output this EXACT template:**

```
🔔 Triggers Selection

Sources consulted:
  • Webhooks: [webhook docs source from artifact]
  • API Endpoints: [API docs source for polling fallback]

Webhook Support: [Yes / No] (confirmed in Question 3)
[If Yes] Events Found: [N] event types in documentation

**Recommended Triggers:**
┌─────────────────────────┬──────────┬─────────────────────────────────┐
│ Trigger                 │ Strategy │ Details                         │
├─────────────────────────┼──────────┼─────────────────────────────────┤
│ ⭐ New [Resource]       │ 🔗 WEBHOOK│ Event: resource.created         │
│ ⭐ [Resource] Updated   │ 🔗 WEBHOOK│ Event: resource.updated         │
│ New Form Submitted      │ 🔄 POLLING│ Endpoint: GET /api/forms        │
│                         │          │ Dedup: id + submitted_at        │
└─────────────────────────┴──────────┴─────────────────────────────────┘

Strategy Summary:
  🔗 WEBHOOK: [X] triggers (real-time via webhook events)
  🔄 POLLING: [Y] triggers (no webhook event available)
```

---

## Step 5: Get User Choice

**Use AskUserQuestion with these EXACT options:**

```
Question: "How would you like to proceed with the recommended triggers?"
Header: "Triggers"

Options (use these EXACT labels):
1. Label: "Use recommended triggers"
   Description: "Proceed with the triggers shown above"

2. Label: "Customize selection"
   Description: "Add or remove specific triggers"

3. Label: "View webhook docs"
   Description: "See original webhook documentation"

4. Label: "Show all events"
   Description: "List all available webhook events"
```

---

## Option Handlers:

### Option 1 - Use recommended:
✅ Store selected triggers, proceed to Question 6 (or Output if no uncertainties).

---

### Option 2 - Customize selection:

**Output:**
```
Toggle triggers (enter number, 'done' when finished):

SELECTED:
  [1] ⭐ New [Resource] (🔗 WEBHOOK)
  [2] ⭐ [Resource] Updated (🔗 WEBHOOK)

AVAILABLE:
  [3] [Resource] Deleted (🔗 WEBHOOK)
  [4] New Comment (🔄 POLLING)

Enter number or 'done':
```

Process user's toggles, then return to Step 5.

---

### Option 3 - View webhook documentation:

**Output:**
```
Webhook Documentation:

Source: [URL or file path from Documentation Sources]

[Read and display webhook section from original documentation]

Return to selection? (Y):
```

After user confirms, return to Step 5.

---

### Option 4 - Show all events:

**Output:**
```
Webhook Events (from original documentation):

Source: [webhook docs source]

  • resource.created - [description from docs]
  • resource.updated - [description from docs]
  • resource.deleted - [description from docs]
  ...

Return to selection? (Y):
```

After user confirms, return to Step 5.

---

## Output

Store the selected triggers:
- `selected_triggers`: list of trigger objects with name, strategy, event/endpoint, dedup field
- `webhook_triggers_count`: number using WEBHOOK strategy
- `polling_triggers_count`: number using POLLING strategy
