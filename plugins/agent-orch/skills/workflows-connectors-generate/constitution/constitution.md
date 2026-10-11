# Connector Generation Constitution

**Purpose:** Guide connector code generation for workflows-connectors following proven patterns from baseline connectors (ServiceNow, Workday, Kafka)

---

## Core Principles

### 0. API Reference as Source of Truth (NON-NEGOTIABLE)

When planning or implementing connector code, you MUST consult the API Reference artifact at `specs/[service-name]-api-reference.md` for all API-related decisions.

**The API Reference contains:**
- Authentication details (type, URLs, scopes, complexity signals)
- Base URL and endpoint specifications
- Webhook events and payload structures
- Pagination patterns and parameters
- Error handling patterns
- Documentation sources (links to original docs for detailed lookups)

**Rules:**
1. **Planning phase**: When creating data-model or api-contracts, extract information from API Reference
2. **Implementation phase**: When writing client.ts, actions, or triggers, reference API Reference for endpoint details
3. **Never guess**: If information isn't in API Reference, check the Documentation Sources table for original docs
4. **Specification file**: The `specs/[service-name]-specification.md` contains selected actions/triggers - API Reference has the technical details

**Rationale**: API Reference is curated during the docs phase with verified information. Using it ensures consistency and prevents errors from outdated or incorrect assumptions.

---

### I. TypeScript-First Connector Development

All connector code MUST be written in TypeScript following company code standards. This ensures:
- Type safety across actions, triggers, and utilities
- Better IDE support during development
- Consistent code quality
- Seamless integration with the ActivePieces framework

**Rationale**: TypeScript catches errors at compile time and provides autocomplete for framework types, making connectors more maintainable.

---

### II. Directory Structure Compliance (NON-NEGOTIABLE)

All connectors MUST follow the exact directory structure:

```
packages/connectors/{service-name}/
├── src/
│   ├── index.ts                    # Piece definition
│   ├── auth.ts                     # Authentication definition
│   └── lib/
│       ├── actions/
│       │   ├── {action-name}.ts    # Individual action files
│       │   └── index.ts            # Action exports
│       ├── triggers/
│       │   ├── {trigger-name}.ts   # Individual trigger files
│       │   └── index.ts            # Trigger exports
│       └── common/
│           ├── client.ts           # HTTP client abstraction
│           ├── constants.ts        # Constants and enums
│           ├── validators.ts       # Input validation schemas
│           ├── types.ts            # Type definitions (optional)
│           └── index.ts            # Common exports
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── .eslintrc.json
└── README.md
```

**Rationale**: Consistent structure enables pattern reuse and simplifies maintenance.

**See:** `policies/code-style.md` Section 1 for complete directory rules.

---

### III. Pattern Compliance (NON-NEGOTIABLE)

All generated connector code MUST follow the 9 proven patterns (C1-C9) from baseline connectors:

#### **C1: HTTP Client Abstraction**

Extract HTTP logic to `lib/common/client.ts` for reusability and consistency.

**Rule:** Actions and triggers SHOULD use client helper functions for API calls. This pattern is recommended for connectors with multiple actions that share similar HTTP logic.

**Pattern:**
```typescript
// lib/common/client.ts
export async function makeRequest<T>(
    auth: AuthType,
    method: HttpMethod,
    endpoint: string,
    body?: Record<string, unknown>
): Promise<T> {
    const response = await httpClient.sendRequest<T>({
        method,
        url: `${auth.props.instanceUrl}${endpoint}`,
        headers: buildHeaders(auth),
        body,
    });
    return response.body;
}

// Specific helpers for common operations
export async function makePostRequest<T>(options: RequestOptions): Promise<T>;
export async function makeGetRequest<T>(options: RequestOptions): Promise<T>;
export async function makePatchRequest<T>(options: RequestOptions): Promise<T>;
export async function makeDeleteRequest<T>(options: RequestOptions): Promise<T>;
```

**Rationale**: Centralized HTTP logic ensures consistent error handling, retry logic, and authentication.

**See:** `guides/CODE_REUSE_PATTERNS.md` Example 1 for complete pattern.

---

#### **C2: Constants Extraction**

Store ALL literal values in `lib/common/constants.ts` - even single occurrences.

**Rule:** No hardcoded API paths, field names, query parameters, or magic numbers in actions/triggers.

**Pattern:**
```typescript
// lib/common/constants.ts
export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;

export const ENDPOINTS = {
    RECORDS: `${API_BASE_PATH}/records`,
    USERS: `${API_BASE_PATH}/users`,
} as const;

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 1000;
export const MIN_LIMIT = 1;

export const ERROR_MESSAGES = {
    INVALID_ID: 'Invalid record ID provided',
    NOT_FOUND: 'Record not found',
} as const;
```

**Rationale**: Constants in one place improve discoverability, enable easy updates, and prevent typos.

**See:** `guides/CODE_REUSE_PATTERNS.md` Example 2 for complete pattern.

---

#### **C3: Validation Schemas**

Use Zod schemas with `propsValidation.validateZod()` for props that require format validation.

**When validation is REQUIRED:**
- Numeric pagination props (limit, offset, page) with defined min/max bounds
- String props with documented format constraints (URLs, emails, pattern-based IDs)

**When to extract to `lib/common/validators.ts`:**
- When 2+ actions share the same validation logic (avoids duplication)
- Otherwise, inline validation in the action is acceptable

**Where validation constraints come from:**
1. **API documentation** (primary source) - documented limits, formats, constraints
2. **Platform requirements** - Activepieces-specific constraints if any
3. **Logical constraints** - pagination can't be negative, IDs can't be empty

Do not invent arbitrary limits without justification.

**Pattern:**
```typescript
// If multiple actions need limit/offset validation → extract to validators.ts
// lib/common/validators.ts
import { z } from 'zod';

export const limitSchema = (min = 1, max = 1000) =>
    z.coerce.number().int().min(min).max(max).optional();

export const offsetSchema = (min = 0) =>
    z.coerce.number().int().min(min).optional();

// Usage in action
async run({ auth, propsValue }) {
    await propsValidation.validateZod(propsValue, {
        limit: limitSchema(1, 1000),  // bounds from API docs
        offset: offsetSchema(),
    });
    // Proceed with API call
}
```

**Rationale**: Early validation prevents invalid API calls and provides clear, actionable error messages to users.

**See:** `guides/CODE_REUSE_PATTERNS.md` Example 3 for validation pattern.

---

#### **C4: Separate Auth Definition**

Authentication MUST be defined in a separate `auth.ts` file, never inline in `index.ts`.

**Rule:** Export auth definition AND create a client factory function.

**Pattern:**
```typescript
// auth.ts
import { PieceAuth, Property } from '@activepieces/pieces-framework';

export const serviceAuth = PieceAuth.CustomAuth({
    description: 'Service connection configuration',
    required: true,
    props: {
        instanceUrl: Property.ShortText({
            displayName: 'Instance URL',
            description: 'Your service instance URL (e.g., https://instance.example.com)',
            required: true,
        }),
        apiKey: PieceAuth.SecretText({
            displayName: 'API Key',
            description: 'Your API key from the settings page',
            required: true,
        }),
    },
});

export type ServiceAuthType = typeof serviceAuth;

// Client factory helper
export function createClient(auth: PiecePropValueSchema<typeof serviceAuth>) {
    return new ServiceClient({
        instanceUrl: auth.instanceUrl,
        apiKey: auth.apiKey,
    });
}
```

**Rationale**: Separating auth improves testability and allows reuse of auth validation.

**See:** `guides/AUTHENTICATION_PATTERNS.md` for OAuth2, SecretText, and CustomAuth patterns.

---

#### **C5: Trigger Strategy Selection**

Select WEBHOOK or POLLING based on API capabilities. Use factory pattern for 2+ similar polling triggers.

**Rules:**
1. Use WEBHOOK when service supports webhook registration
2. Use POLLING with `DedupeStrategy.TIMEBASED` when webhooks unavailable
3. Use factory pattern when 2+ polling triggers share logic

**Polling Pattern:**
```typescript
const polling: Polling<AuthType, PropsType> = {
    strategy: DedupeStrategy.TIMEBASED,
    items: async ({ auth, propsValue, lastFetchEpochMS }) => {
        const client = createClient(auth);
        const records = await client.getRecordsSince(lastFetchEpochMS);

        return records.map((record) => ({
            epochMilliSeconds: new Date(record.createdAt).getTime(),
            data: record,
        }));
    },
};

export const newRecordTrigger = createTrigger({
    auth: serviceAuth,
    name: 'new_record',
    displayName: 'New Record',
    description: 'Triggers when a new record is created',
    type: TriggerStrategy.POLLING,
    props: { /* trigger props */ },
    sampleData: { /* sample record */ },
    async onEnable(context) {
        await pollingHelper.onEnable(polling, context);
    },
    async onDisable(context) {
        await pollingHelper.onDisable(polling, context);
    },
    async run(context) {
        return await pollingHelper.poll(polling, context);
    },
    async test(context) {
        return await pollingHelper.test(polling, context);
    },
});
```

**See:** `templates/WEBHOOK_TRIGGER.md` and `templates/POLLING_TRIGGER.md` for complete templates.
**See:** `guides/TRIGGER_FACTORY_PATTERN.md` for factory pattern when 2+ polling triggers.

---

#### **C6: Property Type Inference**

Use correct Property types based on API schema.

**Rules:**
| API Type | Property Type |
|----------|--------------|
| String + `format: date-time` | `Property.DateTime()` |
| String + enum values | `Property.StaticDropdown()` |
| String (short, <100 chars) | `Property.ShortText()` |
| String (long, >100 chars) | `Property.LongText()` |
| Number/integer | `Property.Number()` |
| Boolean | `Property.Checkbox()` |
| Resource ID (list available) | `Property.Dropdown()` with dynamic fetch |
| Resource ID (no list endpoint) | `Property.ShortText()` |
| Complex object | `Property.Object()` or `Property.Json()` |

**See:** `policies/code-style.md` Section 4 for complete type inference table.

---

#### **C7: Property Description Enhancement**

Enhance property descriptions with format hints, examples, and optional markers.

**Rules:**
- Timestamp fields: Add `(ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ)`
- ID fields: `The unique identifier of the [resource]`
- Optional fields: `. Optional - leave empty if not needed`
- URL/Link fields: `(must be a valid HTTPS URL)`
- Email fields: `(e.g., user@example.com)`
- Number ranges: `[Description] (min: X, max: Y)`

**Example:**
```typescript
dueDate: Property.DateTime({
    displayName: 'Due Date',
    description: 'When the task is due (ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ). Optional - leave empty if not needed',
    required: false,
}),
```

**See:** `policies/code-style.md` Section 5 for description patterns.

---

#### **C8: Error Message Context**

All error messages MUST include operation context and resource identifiers.

**Rule:** Include what failed, which resource, and original error - never raw status codes alone.

**Pattern:**
```typescript
// lib/common/client.ts
private mapError(error: any, operation: string): Error {
    const status = error.response?.status;
    const message = error.response?.body?.message || error.message;

    switch (status) {
        case 401:
            return new Error(`Authentication failed: Invalid credentials`);
        case 403:
            return new Error(`Permission denied: Insufficient access for ${operation}`);
        case 404:
            return new Error(`Not found: Resource does not exist`);
        case 429:
            return new Error(`Rate limited: Too many requests, retry later`);
        default:
            return new Error(`Failed to ${operation}: ${message}`);
    }
}
```

**See:** `policies/code-style.md` Section 6 for error patterns.

---

#### **C9: Function Parameter Deconstruction**

Use ES6 destructuring for function parameters, no dot notation access.

**Rule:** Destructure `{ auth, propsValue }` in run(), then destructure propsValue fields.

**Pattern:**
```typescript
// CORRECT
async run({ auth, propsValue }) {
    const { tableName, recordId, fields } = propsValue;
    // Use tableName, recordId, fields directly
}

// INCORRECT
async run(context) {
    const tableName = context.propsValue.tableName;
    const recordId = context.propsValue.recordId;
}
```

**Rationale**: Destructuring is cleaner, reduces repetition, and makes dependencies explicit.

**See:** `policies/code-style.md` Section 0 for company code standards.

---

### IV. File Generation Order

Generate files in correct order to ensure dependencies resolve:

1. **Configuration files**: `package.json`, `project.json`, `tsconfig.json`, `tsconfig.lib.json`, `.eslintrc.json`
2. **Constants**: `lib/common/constants.ts` (no dependencies)
3. **Types**: `lib/common/types.ts` (depends on constants)
4. **Validators**: `lib/common/validators.ts` (depends on constants)
5. **Client**: `lib/common/client.ts` (depends on constants, types)
6. **Common index**: `lib/common/index.ts` (exports all common)
7. **Auth**: `auth.ts` (depends on client for validation)
8. **Actions**: `lib/actions/*.ts` (depend on client, constants, validators)
9. **Action index**: `lib/actions/index.ts` (exports all actions)
10. **Triggers**: `lib/triggers/*.ts` (depend on client, polling helpers)
11. **Trigger index**: `lib/triggers/index.ts` (exports all triggers)
12. **Main entry**: `index.ts` (imports auth, all actions/triggers)
13. **Documentation**: `README.md`

**Rationale**: Correct order prevents TypeScript compilation errors from missing imports.

---

### V. Quality Gates

All generated connector files MUST pass:

- **TypeScript compilation**: `nx build connectors-{service-name}` - No type errors
- **ESLint**: `nx lint connectors-{service-name}` - No errors (warnings acceptable)
- **Structure compliance**: Matches directory structure exactly
- **Pattern compliance**: C1-C9 validation passes

**Rationale**: Automated validation ensures generated code meets quality standards.

---

## Connector Generation Standards

### Authentication Patterns

**OAuth2 Authorization Code:**
```typescript
export const serviceAuth = PieceAuth.OAuth2({
    authUrl: 'https://service.com/oauth/authorize',
    tokenUrl: 'https://service.com/oauth/token',
    scope: ['read', 'write'],
    required: true,
});
```

**OAuth2 Client Credentials:**
```typescript
export const serviceAuth = PieceAuth.OAuth2({
    grantType: OAuth2GrantType.CLIENT_CREDENTIALS,
    authUrl: '',  // Must be empty
    tokenUrl: 'https://service.com/oauth/token',
    scope: [],  // Must be empty array
    required: true,
    props: {
        instanceUrl: Property.ShortText({ /* ... */ }),
    },
});
```

**See:** `guides/AUTHENTICATION_PATTERNS.md` for complete authentication patterns.

---

### Dynamic Dropdown Pattern

For properties that need to fetch options from the API:

```typescript
export const tableDropdown = Property.Dropdown({
    displayName: 'Table',
    description: 'Select the table to work with',
    required: true,
    refreshers: [],  // Add dependent props here
    options: async ({ auth }) => {
        if (!auth) {
            return {
                disabled: true,
                placeholder: 'Please connect your account first',
                options: [],
            };
        }

        try {
            const client = createClient(auth);
            const tables = await client.getTables();
            return {
                disabled: false,
                options: tables.map(t => ({ label: t.name, value: t.id })),
            };
        } catch {
            return {
                disabled: true,
                placeholder: 'Failed to load tables. Check your credentials.',
                options: [],
            };
        }
    },
});
```

---

### Piece Assembly

```typescript
// index.ts
import { createPiece, PieceAuth } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { serviceAuth } from './auth';
import { createRecordAction, updateRecordAction, getRecordAction } from './lib/actions';
import { newRecordTrigger, updatedRecordTrigger } from './lib/triggers';

export const serviceName = createPiece({
    displayName: 'Service Name',
    description: 'Brief description of what the service does',
    auth: serviceAuth,
    minimumSupportedRelease: '0.36.1',
    logoUrl: 'https://cdn.activepieces.com/pieces/service-name.png',
    authors: ['SS&C Blue Prism'],
    categories: [PieceCategory.PRODUCTIVITY],
    actions: [
        createRecordAction,
        updateRecordAction,
        getRecordAction,
    ],
    triggers: [
        newRecordTrigger,
        updatedRecordTrigger,
    ],
});
```

---

## Governance

### Pattern Compliance Review

All generated connector code MUST be validated against C1-C9:

**Pre-Generation Checklist:**
- [ ] Read `specs/[service-name]-api-reference.md` (API knowledge source)
- [ ] Read `specs/[service-name]-specification.md` (selected actions/triggers)
- [ ] Read `policies/constitution.md` (this file)
- [ ] Understand C1-C9 principles
- [ ] Confirm authentication type from API Reference
- [ ] Confirm trigger strategy from Specification (webhook vs polling per trigger)

**Post-Generation Validation:**
- [ ] C0: Endpoints, auth config, and webhook events match API Reference
- [ ] C1: HTTP calls use client abstraction when multiple actions share similar logic
- [ ] C2: All literals extracted to constants.ts
- [ ] C3: Props with format constraints validated with Zod schemas
- [ ] C4: Auth defined in separate auth.ts with factory function
- [ ] C5: Triggers use appropriate strategy (webhook/polling) per Specification
- [ ] C6: Property types match API schema from API Reference
- [ ] C7: Property descriptions include format hints
- [ ] C8: Error messages include operation context
- [ ] C9: Props destructured, no dot notation access

**Quality Gates:**
- [ ] TypeScript compilation passes
- [ ] ESLint passes
- [ ] Directory structure matches specification
- [ ] All actions and triggers are exported correctly

---

### Constitution Replacement Workflow

When using connector-generator skill with spec-kit:

1. **Backup original constitution:**
   ```bash
   cp .specify/memory/constitution.md .specify/memory/constitution.md.backup
   ```

2. **Replace with connector generation constitution:**
   ```bash
   cp policies/constitution.md .specify/memory/constitution.md
   ```

3. **Generate connector** using spec-kit workflows

4. **Restore original constitution:**
   ```bash
   mv .specify/memory/constitution.md.backup .specify/memory/constitution.md
   ```

**Rationale**: Spec-kit workflows read constitution.md. Replacing it ensures connector generation follows C1-C9 patterns.

---

### Amendment Process

This constitution can be amended when:
1. New patterns emerge from connector development
2. Build/lint failure rates indicate pattern gaps
3. Framework changes require pattern updates

Amendments require:
- Documentation of rationale (why pattern is needed)
- Evidence from baseline connectors
- Updated version number

---

## References

**Primary Documents:**
- `policies/code-style.md` - Company code standards and conventions
- `guides/AUTHENTICATION_PATTERNS.md` - Auth implementation patterns
- `guides/CODE_REUSE_PATTERNS.md` - Utility extraction patterns
- `guides/TRIGGER_FACTORY_PATTERN.md` - Polling trigger factory pattern
- `templates/WEBHOOK_TRIGGER.md` - Webhook trigger template
- `templates/POLLING_TRIGGER.md` - Polling trigger template

**Baseline Connectors:**
- ServiceNow - HTTP client abstraction, polling triggers, validation
- Workday - OAuth2 patterns, enterprise API handling
- Kafka - Resource management, constants extraction, error handling

---

**Version**: 1.1.0 | **Ratified**: 2025-01-16 | **Purpose**: Connector Generation | **Based on**: Baseline Connector Analysis

**Changelog:**
- v1.1.0: Added Principle 0 (API Reference as Source of Truth) - mandates using api-reference artifact for all API-related decisions during planning and implementation
