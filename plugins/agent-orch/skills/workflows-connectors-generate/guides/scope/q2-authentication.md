# Question 2: Authentication Approach

**Condition:** Always required.

## Step 1: Read from Artifact

Read `specs/[service-name]-api-reference.md` → Authentication section.

Determine:
- Auth type: OAuth2 / API Key / Custom Auth
- If OAuth2: grant type indicators (see detection logic below)
- Relevant URLs and configuration

---

## Step 2: Present Detected Auth

**If auth type is clear, output:**

```
🔐 Authentication

Based on the API documentation:

Detected: [OAuth2 / API Key / Custom Auth]

Configuration:
[Show extracted details from artifact]
```

**Use AskUserQuestion:**
```
Question: "Is this authentication configuration correct?"
Header: "Auth"

Options:
1. Label: "Yes, correct"
   Description: "Proceed with detected configuration"

2. Label: "No, let me specify"
   Description: "I'll provide the correct auth details"
```

---

**If auth type is uncertain, output:**

```
🔐 Authentication

I couldn't determine the authentication method clearly from the documentation.
```

**Use AskUserQuestion:**
```
Question: "Which authentication method does [Service] use?"
Header: "Auth"

Options:
1. Label: "OAuth2"
   Description: "User authorizes via popup/redirect"

2. Label: "API Key / Bearer Token"
   Description: "Static token in header"

3. Label: "Custom Auth"
   Description: "Multiple fields like username+password"
```

---

## Step 3: OAuth2 Grant Type (If OAuth2 Selected)

### Detection Logic

**Default Preference:** For workflow automation connectors, prefer CLIENT_CREDENTIALS unless documentation explicitly requires user authorization.

**Check in priority order:**

1. **Service Type:**
   - System/Backend Integration APIs → Likely CLIENT_CREDENTIALS
   - User-Delegated Access APIs → Likely AUTHORIZATION_CODE

2. **CLIENT_CREDENTIALS indicators** (any → CLIENT_CREDENTIALS):
   - "client credentials flow", "two-legged OAuth"
   - "machine-to-machine", "server-to-server"
   - OAuth setup requires only client_id + client_secret

3. **AUTHORIZATION_CODE indicators** (any → AUTHORIZATION_CODE):
   - "user consent", "user authorization"
   - Requires "redirect URI" or "callback URL"
   - Shows browser-based login flow

### If Both Grant Types Supported

**Output:**
```
⚠️ This API supports BOTH OAuth2 grant types.

For workflow automation connectors:
```

**Use AskUserQuestion:**
```
Question: "Which OAuth2 grant type should we use?"
Header: "OAuth2"

Options:
1. Label: "CLIENT_CREDENTIALS (Recommended)"
   Description: "No user login required, simpler setup"

2. Label: "AUTHORIZATION_CODE"
   Description: "Acts on behalf of individual users"
```

---

## Step 4: Collect Auth Details

### If CLIENT_CREDENTIALS:
Collect/confirm:
- Token URL: [detected or ask]
- Instance/Organization URL field needed? (Y/n)

### If AUTHORIZATION_CODE:
Collect/confirm:
- Authorization URL: [detected or ask]
- Token URL: [detected or ask]
- Scopes: [detected or ask]

### If API Key:
**Output:**
```
API Key details:

Display Name: [detected - e.g., "API Key", "Access Token"]
Header Format: [detected - e.g., Bearer <token>, X-API-Key: <token>]
```

**Use AskUserQuestion:**
```
Question: "Is this API Key configuration correct?"
Header: "API Key"

Options:
1. Label: "Yes, correct"
   Description: "Proceed with detected configuration"

2. Label: "No, let me specify"
   Description: "I'll provide the correct details"
```

### If Custom Auth:
**Output:**
```
What fields are required for authentication?

Example: API URL, API Key
Example: Username, Password, Organization ID
```

Ask user to provide the required fields.

---

## Step 5: Validation Endpoint

**Use AskUserQuestion:**
```
Question: "Should we include authentication validation? (Tests credentials when users set them up)"
Header: "Validation"

Options:
1. Label: "Yes (Recommended)"
   Description: "Include a validation endpoint"

2. Label: "No"
   Description: "Skip validation"
```

**If Yes:** Ask which endpoint to use for testing (common options: /me, /user, /account, /health)

---

## Step 6: Store Decision

Store all collected authentication configuration for the specification file:
- Auth type
- Grant type (if OAuth2)
- URLs
- Scopes (if applicable)
- Validation endpoint (if enabled)
