# Question 1: Integration Approach

**Condition:** Only ask if artifact shows BOTH SDK and HTTP API are available.

## Step 1: Check Integration Options from Artifact

Read `specs/[service-name]-api-reference.md` → Integration Options section:
- SDK Available: Yes/No
- HTTP API Available: Yes/No

**If only one option available:** Skip this question, store what's available, return `SKIP`.

**If both available:** Continue to Step 2.

---

## Step 2: Present Options

**Output this EXACT template:**

```
🔧 Integration Approach

Both SDK and HTTP API are available for [Service]:

SDK: [package name]
  • [notes from artifact - e.g., "Promise-based, handles auth automatically"]
  • Docs: [SDK docs link]

HTTP API:
  • Direct REST calls via httpClient
  • Docs: [API docs link]
```

---

## Step 3: Get User Choice

**Use AskUserQuestion with these EXACT options:**

```
Question: "Which integration approach do you prefer?"
Header: "Integration"

Options (use these EXACT labels):
1. Label: "SDK (Recommended)"
   Description: "Simpler auth handling, built-in types"

2. Label: "HTTP API"
   Description: "Full control, access to all endpoints"
```

---

## Step 4: Store Decision

Based on user's choice:
- **Option 1 (SDK):** Store `integration_approach: SDK`, store package name
- **Option 2 (HTTP API):** Store `integration_approach: HTTP`

Return the decision for use in subsequent questions and specification output.
