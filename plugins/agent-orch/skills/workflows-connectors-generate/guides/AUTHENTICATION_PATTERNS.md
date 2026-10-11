# Authentication Patterns

**Purpose:** Code patterns and templates for implementing authentication correctly during connector generation.

## OAuth2 Patterns

OAuth2 supports two grant types with different configurations. The grant type decision is made during `/speckit.scope`.

### AUTHORIZATION_CODE Pattern (Default)

**Use when:** API acts on behalf of individual users with their own permissions.

**Basic pattern:**
```typescript
// In src/auth.ts
import { PieceAuth, OAuth2PropertyValue } from '@activepieces/pieces-framework';

export const myServiceAuth = PieceAuth.OAuth2({
    authUrl: 'https://api.example.com/oauth/authorize',
    tokenUrl: 'https://api.example.com/oauth/token',
    scope: ['read', 'write'],
    required: true,
});

export type MyServiceAuth = OAuth2PropertyValue;
```

**With validation:**
```typescript
import { PieceAuth, OAuth2PropertyValue } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';

export const myServiceAuth = PieceAuth.OAuth2({
    authUrl: 'https://api.example.com/oauth/authorize',
    tokenUrl: 'https://api.example.com/oauth/token',
    scope: ['read', 'write'],
    required: true,
    validate: async ({ auth }) => {
        try {
            const typedAuth = auth as OAuth2PropertyValue;
            await httpClient.sendRequest({
                method: HttpMethod.GET,
                url: 'https://api.example.com/v1/me',
                headers: {
                    'Authorization': `Bearer ${typedAuth.access_token}`,
                },
            });
            return { valid: true };
        } catch (e) {
            return {
                valid: false,
                error: 'Failed to validate OAuth2 token',
            };
        }
    },
});

export type MyServiceAuth = OAuth2PropertyValue;
```

**Key characteristics:**
- No `grantType` specified (defaults to AUTHORIZATION_CODE)
- `authUrl` is populated
- `scope` contains actual permission scopes
- Framework shows browser popup for user authorization

**Required imports:**
```typescript
import { PieceAuth, OAuth2PropertyValue } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';  // If validation
```

### CLIENT_CREDENTIALS Pattern

**Use when:** Server-to-server authentication with organization-wide access.

**Pattern:**
```typescript
// In src/auth.ts
import { PieceAuth, Property, OAuth2PropertyValue } from '@activepieces/pieces-framework';
import { OAuth2GrantType } from '@activepieces/shared';

export const myServiceAuth = PieceAuth.OAuth2({
    grantType: OAuth2GrantType.CLIENT_CREDENTIALS,
    authUrl: '',
    tokenUrl: 'https://api.example.com/oauth/token',
    scope: [],
    required: true,
    props: {
        instanceUrl: Property.ShortText({
            displayName: 'Instance URL',
            description: 'Your organization instance URL',
            required: true,
        }),
    },
});

export type MyServiceAuth = OAuth2PropertyValue;
```

**Critical Requirements:**

When using CLIENT_CREDENTIALS, these fields MUST be configured exactly as shown:

```typescript
grantType: OAuth2GrantType.CLIENT_CREDENTIALS,  // Required - framework defaults to AUTHORIZATION_CODE if omitted
authUrl: '',  // Must be empty string (no user authorization endpoint)
scope: [],  // Must be empty array (application has predefined permissions)
```

**Key characteristics:**
- `grantType` explicitly set to `CLIENT_CREDENTIALS`
- Often includes custom props (like `instanceUrl`)
- No browser popup - credentials configured directly

**Required imports:**
```typescript
import { PieceAuth, Property, OAuth2PropertyValue } from '@activepieces/pieces-framework';
import { OAuth2GrantType } from '@activepieces/shared';  // Required for CLIENT_CREDENTIALS
```

## SecretText/API Key Patterns

Simple API key or bearer token authentication.

### Basic Pattern

```typescript
// In src/auth.ts
import { PieceAuth } from '@activepieces/pieces-framework';

export const myServiceAuth = PieceAuth.SecretText({
    displayName: 'API Key',
    description: 'Your API key from the service dashboard',
    required: true,
});
```

### With Validation

```typescript
// In src/auth.ts
import { PieceAuth } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';

export const myServiceAuth = PieceAuth.SecretText({
    displayName: 'API Key',
    description: 'Your API key from the service dashboard',
    required: true,
    validate: async ({ auth }) => {
        try {
            await httpClient.sendRequest({
                method: HttpMethod.GET,
                url: 'https://api.example.com/v1/account',
                headers: {
                    'Authorization': `Bearer ${auth}`,
                },
            });
            return { valid: true };
        } catch (e) {
            return {
                valid: false,
                error: 'Invalid API Key',
            };
        }
    },
});
```

**Key points:**
- Auth value is a string (use `auth` directly, not `auth.access_token`)
- Header format determined during `/speckit.scope` (examples: `Bearer ${auth}`, `X-API-Key: ${auth}`)
- Display name and description from `/speckit.scope` decisions

**Required imports:**
```typescript
import { PieceAuth } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';  // If validation
```

## CustomAuth Patterns

Multiple authentication fields required (e.g., API URL + API Key, domain + credentials).

### Basic Pattern

```typescript
// In src/auth.ts
import { PieceAuth, Property } from '@activepieces/pieces-framework';

type MyServiceAuthType = {
    apiUrl: string;
    apiKey: string;
};

export const myServiceAuth = PieceAuth.CustomAuth({
    description: 'Configure your API credentials',
    props: {
        apiUrl: Property.ShortText({
            displayName: 'API URL',
            description: 'Your organization API URL',
            required: true,
        }),
        apiKey: PieceAuth.SecretText({
            displayName: 'API Key',
            description: 'Your API key from settings',
            required: true,
        }),
    },
    required: true,
});

export type MyServiceAuth = MyServiceAuthType;
```

### With Validation

```typescript
// In src/auth.ts
import { PieceAuth, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, propsValidation } from '@activepieces/pieces-common';
import { z } from 'zod';

type MyServiceAuthType = {
    apiUrl: string;
    apiKey: string;
};

export const myServiceAuth = PieceAuth.CustomAuth({
    description: 'Configure your API credentials',
    props: {
        apiUrl: Property.ShortText({
            displayName: 'API URL',
            description: 'Your organization API URL',
            required: true,
        }),
        apiKey: PieceAuth.SecretText({
            displayName: 'API Key',
            description: 'Your API key from settings',
            required: true,
        }),
    },
    validate: async ({ auth }) => {
        try {
            await validateAuth(auth);
            return { valid: true };
        } catch (e) {
            return {
                valid: false,
                error: (e as Error)?.message,
            };
        }
    },
    required: true,
});

const validateAuth = async (auth: MyServiceAuthType) => {
    await propsValidation.validateZod(auth, {
        apiUrl: z.string().url(),
        apiKey: z.string().min(1),
    });

    await httpClient.sendRequest({
        method: HttpMethod.GET,
        url: `${auth.apiUrl}/account`,
        headers: {
            'Authorization': `Bearer ${auth.apiKey}`,
        },
    });
};

export type MyServiceAuth = MyServiceAuthType;
```

**Key points:**
- Type definition required for auth structure
- Use `PieceAuth.SecretText()` for sensitive fields within CustomAuth props
- Auth accessed as object: `auth.fieldName` (e.g., `auth.apiUrl`, `auth.apiKey`)
- Extract validation to separate function for readability
- Validate formats first (Zod), then test API connectivity

**Common field combinations:**
- `apiUrl` + `apiKey` (most common)
- `domain`/`subdomain` + `apiKey`
- `region` + `domain` + `email` + `password`
- `instanceUrl` + `username` + `password`

**Required imports:**
```typescript
import { PieceAuth, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, propsValidation } from '@activepieces/pieces-common';
import { z } from 'zod';  // For validation
```

## Validation Guidelines

General guidance for authentication validation across all auth types.

### When to Include Validation

**Include validation (default: yes)** for:
- SecretText/API Key authentication (recommended)
- CustomAuth with credentials (recommended)
- OAuth2 if verifying token functionality (optional)

**Skip validation** when:
- User explicitly declines during Step 3
- No suitable lightweight endpoint available
- OAuth2 with standard flow (token exchange validates automatically)

### Endpoint Selection

Choose lightweight endpoints with these characteristics:

**Characteristics of good validation endpoints:**
- **Read-only** - No data creation or modification
- **Lightweight** - Returns minimal data (user info, account status)
- **Fast** - Low latency, no heavy computations
- **No side effects** - Doesn't trigger workflows, notifications, or billing

**Common patterns** (if available in the API):
- User/account info endpoints (e.g., `/me`, `/user`, `/account`)
- Status/health checks (e.g., `/ping`, `/status`)
- Profile/settings endpoints (e.g., `/profile`, `/settings`)

**Endpoint determined during `/speckit.scope`** - Use the validation endpoint identified during authentication configuration.

**Avoid:**
- Data creation/modification endpoints
- Heavy query operations (list all records, search, etc.)
- Endpoints with side effects (send email, create webhook, etc.)

### Error Messages

Keep error messages user-friendly and actionable:

**Good:**
- `"Invalid API Key"`
- `"Authentication failed. Please check your credentials."`
- `"Could not connect to API. Verify your instance URL."`

**Avoid:**
- Raw status codes: `"Error 401"`
- Technical details: `"ECONNREFUSED 127.0.0.1:3000"`
- Generic messages: `"Request failed"`
- Exposing stack traces to users

### Validation Return Structure

All validation callbacks must return this exact structure:

```typescript
// Success
return { valid: true };

// Failure
return {
    valid: false,
    error: 'User-friendly error message',
};
```

**Important:** Never throw errors from the validate callback - always catch and return the structured response.
