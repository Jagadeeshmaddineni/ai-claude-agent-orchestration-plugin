# Question 6: Resolve Uncertainties

**Condition:** Only if artifact has unresolved uncertainties.

## Step 1: Check for Uncertainties

Read `specs/[service-name]-api-reference.md` → Uncertainties section.

**If no uncertainties exist:** Skip this question, proceed to Output.

**If uncertainties exist:** Continue to resolve each one.

---

## Step 2: Resolve One at a Time

For each uncertainty in the artifact, present it individually:

**Output:**
```
❓ Uncertainty: [Topic]

From documentation analysis:
  [What's unclear and the options discovered]

[If applicable, show relevant info from original docs]
```

**Use AskUserQuestion:**
```
Question: "How should we resolve: [Topic]?"
Header: "Uncertainty"

Options:
1. Label: "[Option A]"
   Description: "[brief description of option A]"

2. Label: "[Option B]"
   Description: "[brief description of option B]"

3. Label: "Need more information"
   Description: "I'll check original docs and provide context"
```

---

## Step 3: Handle Response

**Option 1 or 2 (User chooses resolution):**
- Store the resolution
- Move to next uncertainty (or proceed to Output if none remaining)

**Option 3 (Need more information):**
- Read the relevant original documentation source
- Present additional context
- Re-ask the same uncertainty with new information

---

## Step 4: Track Resolutions

After all uncertainties are resolved, compile the list:

```
Uncertainties Resolved:
  ✓ [Topic]: [chosen option]
  ✓ [Topic]: [chosen option]
```

---

## Common Uncertainties

Examples of uncertainties that may appear in the artifact:

- **OAuth2 Grant Type:** Docs mention both flows → Ask user preference
- **Pagination:** Multiple patterns found → Ask which to use
- **Webhook verification:** Signature method unclear → Confirm approach
- **Rate limiting:** Different limits mentioned → Confirm which applies
- **API versioning:** Multiple versions available → Ask which to target

---

## Output

Store all resolutions:
- `resolved_uncertainties`: list of {topic, resolution} objects
- If no uncertainties existed: `resolved_uncertainties: []`
