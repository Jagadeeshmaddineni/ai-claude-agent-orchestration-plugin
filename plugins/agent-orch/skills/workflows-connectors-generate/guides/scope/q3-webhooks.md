# Question 3: Webhook Capability

**Condition:** Always required.

## Step 1: Load from API Reference Artifact

Read `specs/[service-name]-api-reference.md` → Webhooks section:
- Supported: Yes/No
- Event Types: list or count
- Verification method
- Docs link

---

## Step 2: Present Overview

**Output this template based on what was found:**

```
🔔 Webhook Capability Overview

From API Reference Artifact:
```

**If webhooks appear SUPPORTED:**
```
✅ Webhooks appear to be SUPPORTED

  Events Available: [N] event types
  Verification: [signature / timestamp / none]
  Documentation: [source from Documentation Sources table]

  Example events: resource.created, resource.updated, ...
```

**If webhooks appear NOT SUPPORTED:**
```
⚠️ Webhooks appear to be NOT SUPPORTED

  Evidence: [what artifact says - e.g., "No subscription endpoint found"]
```

**If UNCLEAR:**
```
❓ Webhook support UNCLEAR

  The documentation was not conclusive about webhook support.
```

---

## Step 3: Get User Confirmation

**IMPORTANT: Always ask user to confirm. DO NOT assume or proceed without confirmation.**

**Use AskUserQuestion with these EXACT options:**

```
Question: "Based on the documentation, webhooks appear to be [SUPPORTED/NOT SUPPORTED/UNCLEAR]. How should we proceed?"
Header: "Webhooks"

Options (use these EXACT labels):
1. Label: "Confirm webhooks supported"
   Description: "Use WEBHOOK strategy where events exist, POLLING for others"

2. Label: "Confirm NO webhooks"
   Description: "Use POLLING strategy for all triggers"

3. Label: "I need to check"
   Description: "I'll verify webhook support and provide more info"
```

---

## Step 4: Handle User Response

**Option 1 (Confirm webhooks supported):**
- Store `webhooks_supported: true`
- Proceed to Question 4

**Option 2 (Confirm NO webhooks):**
- Store `webhooks_supported: false`
- Proceed to Question 4

**Option 3 (I need to check):**
- Wait for user to provide additional information
- Re-present the overview with new information
- Return to Step 3 (loop until user confirms)

---

## Output

Store the webhook capability decision:
- `webhooks_supported`: true/false
- `webhook_events`: list of events (if supported)
- `webhook_verification`: method (if supported)

**Note:** Specific trigger-to-event mapping happens in Question 5.
