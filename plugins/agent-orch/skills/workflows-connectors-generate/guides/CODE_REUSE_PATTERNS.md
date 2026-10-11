# Code Reuse Patterns

**Purpose:** Build robust, maintainable architecture by extracting common functionality into dedicated modules. This approach creates consistent patterns, reduces cognitive load, and makes the connector easier to test and extend.

## Example 1: HTTP Client Abstraction

**Always extract HTTP client logic to avoid duplicated request configuration.**

**Before (Duplicated):**
```typescript
// In create-record.ts
async run({ auth, propsValue }) {
    const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: `${baseUrl}/api/table/${table}`,
        headers: {
            Authorization: `Bearer ${auth.access_token}`,
            'Content-Type': 'application/json',
        },
        body: propsValue.fields,
    });
    return response.body;
}

// In update-record.ts - Same setup repeated
async run({ auth, propsValue }) {
    const response = await httpClient.sendRequest({
        method: HttpMethod.PATCH,
        url: `${baseUrl}/api/table/${table}`,
        headers: {
            Authorization: `Bearer ${auth.access_token}`,
            'Content-Type': 'application/json',
        },
        body: propsValue.fields,
    });
    return response.body;
}
```

**After (Extracted to `lib/common/client.ts`):**
```typescript
// lib/common/client.ts
export async function makeApiRequest(params: ApiRequestParams) {
  const { auth, method, url, body, queryParams } = params;
  const { access_token } = auth;
  const instanceUrl = auth.props?.['instanceUrl'] as string | undefined;

  if (!instanceUrl) {
    throw new Error('Instance URL is required in authentication props');
  }

  const request: HttpRequest = {
    method,
    url: `${instanceUrl}${url}`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token: access_token,
    },
    queryParams,
    body,
  };

  return await httpClient.sendRequest(request);
}

export async function makePostRequest(params: Omit<ApiRequestParams, 'method'>) {
  return makeApiRequest({ ...params, method: HttpMethod.POST });
}

export async function makePatchRequest(params: Omit<ApiRequestParams, 'method'>) {
  return makeApiRequest({ ...params, method: HttpMethod.PATCH });
}

// Now actions are clean:
// In create-record.ts
async run({ auth, propsValue }) {
    const response = await makePostRequest({
        auth,
        url: `${API_BASE_PATH}/${table}`,
        body: propsValue.fields,
    });
    return response.body;
}
```

### Non-HTTP Services (Client Libraries)

Some services provide client libraries instead of HTTP APIs (e.g., databases, message queues, email protocols).

**When the service uses a client library:**
1. Read the library documentation carefully
2. Follow the library's connection lifecycle rules (connect/disconnect, pooling, etc.)
3. Ensure proper cleanup in error scenarios (use try/finally or equivalent)
4. Wrap connection management in reusable helpers if multiple actions share the same pattern

**Examples:** Kafka (kafkajs), PostgreSQL (pg), MongoDB (mongodb), IMAP (imap-simple)

---

## Example 2: Constants Extraction

**Extract all literal values to constants, even single occurrences. This improves discoverability and enables future reuse.**

**Before:**
```typescript
// In list-records.ts
const response = await makeGetRequest({
    auth,
    url: '/api/v1/resources/' + resourceId,
    queryParams: {
        sort: '-created_at',
    },
});

// In new-record-trigger.ts
queryParams: {
    sort: '-created_at',
}
```

**After (Extracted to `lib/common/constants.ts`):**
```typescript
// lib/common/constants.ts
export const API_BASE_PATH = '/api/v1/resources';

export const TIMESTAMP_FIELD = {
  CREATED: 'created_at',
  UPDATED: 'updated_at',
} as const;

export const SORT_QUERY = {
  CREATED_DESC: '-created_at',
  UPDATED_DESC: '-updated_at',
  CREATED_ASC: 'created_at',
  UPDATED_ASC: 'updated_at',
};

// Pagination limits (from API documentation)
export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 1000;
export const MIN_LIMIT = 1;

// Usage in actions/triggers:
const response = await makeGetRequest({
    auth,
    url: `${API_BASE_PATH}/${resourceId}`,
    queryParams: {
        sort: SORT_QUERY.CREATED_DESC,
    },
});
```

## Example 3: Validation Schemas

**Extract validation logic when consistent rules apply across multiple actions.**

**Before (Duplicated validation):**
```typescript
// In list-records.ts
async run({ auth, propsValue }) {
    const limit = propsValue.limit ?? 50;
    if (limit < 1 || limit > 1000) {
        throw new Error('Limit must be between 1 and 1000');
    }
    // ... rest of action
}

// In search-records.ts - Same validation repeated
async run({ auth, propsValue }) {
    const limit = propsValue.limit ?? 50;
    if (limit < 1 || limit > 1000) {
        throw new Error('Limit must be between 1 and 1000');
    }
    // ... rest of action
}
```

**After (Extracted to `lib/common/validators.ts`):**
```typescript
// lib/common/validators.ts
import { z } from 'zod';

export const limitSchema = (min: number = 1, max: number = 1000) =>
  z.union([
    z.null(),
    z.undefined(),
    z.coerce.number().int()
      .min(min, `Limit must be at least ${min}`)
      .max(max, `Limit must be at most ${max}`)
  ]).transform(val => val === null || val === undefined ? undefined : val).optional();

export const offsetSchema = (min: number = 0) =>
  z.union([
    z.null(),
    z.undefined(),
    z.coerce.number().int().min(min, `Offset must be at least ${min}`)
  ]).transform(val => val === null || val === undefined ? undefined : val).optional();

// Usage in actions:
async run({ auth, propsValue }) {
    await propsValidation.validateZod(propsValue, {
        limit: limitSchema(1, 1000),
        offset: offsetSchema(),
    });
    // ... rest of action
}
```

## Example 4: URL Utilities

**Extract URL manipulation logic to ensure consistent handling across all actions.**

**Before:**
```typescript
// Duplicated URL handling in multiple actions
const baseUrl = auth.instanceUrl.endsWith('/')
    ? auth.instanceUrl.slice(0, -1)
    : auth.instanceUrl;
const fullUrl = `${baseUrl}${endpoint}`;
```

**After (Extracted to `lib/common/url-utils.ts`):**
```typescript
// lib/common/url-utils.ts
export function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

// Usage:
const fullUrl = joinUrl(auth.instanceUrl, endpoint);
```

## Example 5: Error Handling Patterns

**Standardize error handling for consistent user experience.**

**Before (Inconsistent):**
```typescript
// In one action
if (response.status !== 200) {
    throw new Error(`Request failed with status ${response.status}`);
}

// In another action
if (!response.body.success) {
    throw new Error('Operation failed');
}
```

**After (Extracted to `lib/common/error-handler.ts`):**
```typescript
// lib/common/error-handler.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiResponse<T>(response: HttpResponse<T>): T {
  if (response.status < 200 || response.status >= 300) {
    throw new ApiError(
      `API request failed with status ${response.status}`,
      response.status,
      response.body
    );
  }
  return response.body;
}

// Usage:
const data = handleApiResponse(response);
```

## When to Extract

Extract functionality when it:
1. **Appears in multiple locations** - Any duplicated code should be extracted
2. **Contains business logic** - API endpoints, query formats, field names
3. **Requires consistent behavior** - Authentication, error handling, URL construction
4. **Improves testability** - Isolated utilities are easier to unit test
5. **Reduces coupling** - Actions shouldn't know about auth headers or URL construction

## Recommended File Structure

```
lib/
├── common/
│   ├── client.ts          # HTTP request abstraction
│   ├── constants.ts       # API endpoints, field names, query strings
│   ├── validators.ts      # Zod schemas for prop validation
│   ├── url-utils.ts       # URL manipulation helpers
│   └── error-handler.ts   # Standardized error handling
├── actions/
│   ├── create-record.ts   # Clean actions using common utilities
│   └── ...
└── triggers/
    ├── polling-trigger-helper.ts  # Factory for polling triggers (if 2+)
    └── ...
```

## Trigger Code Reuse

For polling triggers specifically, if you have 2 or more similar triggers, use the factory pattern to reduce duplication. See `guides/TRIGGER_FACTORY_PATTERN.md` for details.
