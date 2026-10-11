# Code Style Policies

*Standards and conventions for connector code generation*

## 0. Company Code Standards (PRIORITY)

**These company-specific standards take precedence over standard Node.js/TypeScript conventions when conflicts arise.**

### Query Parameters as Constants

**Rule**: Store all query parameters and filter values in named constants, not inline strings. This applies to all literal values including complex query strings (e.g., `ORDERBYDESCsys_created_on`) and field names, even for single occurrences.

**Rationale**: Improves code readability, enables reuse, and makes parameter modification easier during maintenance.

**Don't**:
```typescript
const response = await httpClient.sendRequest({
  url: `${API_URL}/items?status=active&limit=50`
});
```

**Do**:
```typescript
const STATUS = 'active';
const LIMIT = 50;

const response = await httpClient.sendRequest({
  url: `${API_URL}/items?status=${STATUS}&limit=${LIMIT}`
});
```

See `guides/CODE_REUSE_PATTERNS.md` Example 2 for complex query patterns and field name constants.

### Function Parameter Deconstruction

**Rule**: Use ES6 destructuring for function parameters instead of accessing properties with dot notation.

**Rationale**: Reduces verbosity, makes required parameters explicit at function signature level, and improves code clarity.

**Don't**:
```typescript
async run(context) {
  const channelId = context.propsValue.channelId;
  const message = context.propsValue.message;
  const auth = context.auth;
}
```

**Do**:
```typescript
async run({ propsValue, auth }) {
  const { channelId, message } = propsValue;
}
```

### No Comments for Well-Structured Code

**Rule**: Do not add comments to explain well-structured, self-documenting code.

**Rationale**: Good code should be self-explanatory through clear naming and structure. Comments add maintenance burden and can become outdated.

**Don't**:
```typescript
// Get the user's email from props
const email = propsValue.email;
// Send the email
await sendEmail(email);
```

**Do**:
```typescript
const { email } = propsValue;
await sendEmail(email);
```

**Exception**: Comments ARE allowed for:
- Complex business logic that isn't immediately obvious
- API quirks or workarounds
- TODOs during development

### User-Friendly Field Naming

**Rule**: Name input fields with maximum user context and clarity, not just technical property names.

**Rationale**: Users configuring workflows may not understand technical jargon. Descriptive names reduce support burden and improve user experience.

**Don't**:
```typescript
Property.ShortText({
  displayName: 'ID',
  description: 'The ID',
})
```

**Do**:
```typescript
Property.ShortText({
  displayName: 'Channel ID',
  description: 'The unique identifier of the Slack channel where the message will be posted',
})
```

### In-Function Validation

**Rule**: Validate parameters inside the functions that use them, not upfront at the entry point.

**Rationale**: Keeps validation logic close to where data is consumed, improves maintainability, and makes dependencies explicit.

**Don't**:
```typescript
async run(context) {
  // Validate everything upfront
  if (!context.propsValue.email) throw new Error('Email required');
  if (!context.propsValue.name) throw new Error('Name required');

  await createContact(context.propsValue);
}
```

**Do**:
```typescript
async function createContact({ email, name }) {
  if (!email) throw new Error('Email is required for contact creation');
  if (!name) throw new Error('Name is required for contact creation');

  // proceed with creation
}

async run({ propsValue }) {
  await createContact(propsValue);
}
```

**Note**: For action/trigger props that need format validation (URLs, emails, number ranges), use Zod schemas with `propsValidation.validateZod()` at the start of the `run()` function. See `guides/CODE_REUSE_PATTERNS.md` Example 3 for validation schema patterns.

---

## 1. Directory Structure (NON-NEGOTIABLE)

All connectors must follow this exact directory structure:

```
packages/connectors/[service-name]/
├── src/
│   ├── index.ts                 (entry point)
│   ├── auth.ts                  (authentication definition)
│   └── lib/
│       ├── actions/
│       │   ├── [action-1].ts
│       │   ├── [action-2].ts
│       │   └── index.ts
│       ├── triggers/
│       │   ├── [trigger-1].ts
│       │   ├── [trigger-2].ts
│       │   └── index.ts
│       └── common/
│           ├── constants.ts
│           └── index.ts
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── .eslintrc.json
└── README.md
```

**Rationale**: Consistency across all connectors for maintainability and developer familiarity.

**Note**: Always define authentication in a separate `auth.ts` file, not inline in `index.ts`. This improves code organization and makes auth reusable across actions/triggers.

---

## 2. File Naming Conventions

**Rationale**: Consistent file naming enables quick navigation, predictable imports, and pattern recognition across 100+ connectors.

### Service Name
**Format**: `lowercase-kebab-case`

**Examples**:
- ✅ `google-sheets`
- ✅ `acuity-scheduling`
- ❌ `GoogleSheets`
- ❌ `google_sheets`

### Action Files
**Format**: `[verb]-[noun].ts`

**Examples**:
- ✅ `create-row.ts`
- ✅ `send-message.ts`
- ✅ `list-contacts.ts`
- ❌ `rowCreate.ts`
- ❌ `createRow.ts`

**Common verbs**: create, update, delete, get, list, send, fetch

### Trigger Files
**Format**: `[event-description].ts` (kebab-case)

**Examples**:
- ✅ `new-message.ts`
- ✅ `order-updated.ts`
- ✅ `form-submitted.ts`
- ❌ `newMessage.ts`
- ❌ `new_message.ts`

---

## 3. Variable Naming Conventions

**Rationale**: Following TypeScript/JavaScript conventions ensures code readability and aligns with framework patterns used by @activepieces.

### Service References
**Format**: `camelCase` for variable names, `PascalCase` for types

**Examples**:
```typescript
// Service auth reference
import { slackAuth } from '../../';
import { githubAuth } from '../../';

// Service name in constants
const TRIGGER_KEY = 'slack-new-message-webhook-id';
const TRIGGER_KEY = 'github-issue-created-webhook-id';
```

### Export Names
**Format**: `camelCase` with descriptive suffix

**Examples**:
```typescript
// Actions
export const createRowAction = createAction({ ... });
export const sendMessageAction = createAction({ ... });

// Triggers
export const newMessageTrigger = createTrigger({ ... });
export const orderUpdatedTrigger = createTrigger({ ... });
```

### Constants
**Format**: `UPPER_SNAKE_CASE`

**Examples**:
```typescript
// In src/lib/common/constants.ts
export const API_URL = 'https://api.service.com';
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_RETRIES = 3;
```

### Display Names
**Format**: `Title Case` (human-readable)

**Examples**:
```typescript
displayName: 'Create Row'
displayName: 'Send Message'
displayName: 'New Order Created'
```

### Internal Names (name property)
**Format**: `kebab-case`

**Examples**:
```typescript
name: 'create-row'
name: 'send-message'
name: 'new-order-created'
```

---

## 4. Property Type Inference

**Rationale**: Correct property types determine how inputs are rendered in the workflow builder UI and what validation is applied. Using the right type improves user experience and prevents runtime errors.

When generating action properties from API schemas, use these mappings:

| API Type | API Format/Context | Property Type |
|----------|-------------------|---------------|
| `string` | `format: "date-time"` | `Property.DateTime()` |
| `string` | with enum values | `Property.Dropdown()` |
| `string` | short text (< 100 chars) | `Property.ShortText()` |
| `string` | long text (> 100 chars) | `Property.LongText()` |
| `number` | - | `Property.Number()` |
| `integer` | - | `Property.Number()` |
| `boolean` | - | `Property.Checkbox()` |
| Resource ID | list endpoint available | `Property.Dropdown()` with dynamic fetch |
| Resource ID | no list endpoint | `Property.ShortText()` |

**Special Cases**:
- **File uploads**: Use `Property.File()`
- **Arrays**: Use `Property.Array()` or `Property.MultiSelectDropdown()` depending on type
- **Objects**: Use `Property.Object()` or `Property.Json()`

---

## 5. Property Description Patterns

Apply these generic patterns to enhance property descriptions during generation.

### Timestamp/Date Fields

**Detect**: Property name contains: `timestamp`, `date`, `time`, `created_at`, `updated_at`

**Add to description**: `(ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ)`

**Example**:
```typescript
// Before
Property.ShortText({
  displayName: 'Created At',
  description: 'When the resource was created',
})

// After (with pattern)
Property.ShortText({
  displayName: 'Created At',
  description: 'When the resource was created (ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ)',
})
```

### ID Fields

**Detect**: Property name ends with: `_id`, `Id`, `ID`, or is exactly `id`

**Use as description**: `The unique identifier of the [resource]`

**Example**:
```typescript
Property.ShortText({
  displayName: 'Order ID',
  description: 'The unique identifier of the order',
})
```

### Optional Fields

**Detect**: `required: false` in property definition

**Add to description**: `. Optional - leave empty if not needed`

**Example**:
```typescript
Property.ShortText({
  displayName: 'Notes',
  description: 'Additional notes about the order. Optional - leave empty if not needed',
  required: false,
})
```

### URL/Link Fields

**Detect**: Property name contains: `url`, `link`, `webhook`, `callback`

**Add to description**: `(must be a valid HTTPS URL)`

**Example**:
```typescript
Property.ShortText({
  displayName: 'Webhook URL',
  description: 'The callback URL for webhook events (must be a valid HTTPS URL)',
})
```

### Email Fields

**Detect**: Property name contains: `email`

**Add to description**: `(e.g., user@example.com)`

**Example**:
```typescript
Property.ShortText({
  displayName: 'Customer Email',
  description: 'Email address of the customer (e.g., user@example.com)',
})
```

### Number Ranges

**Detect**: `Property.Number()` with min/max known from API documentation

**Format description**: `[Description] (min-max)` or just `([min]-[max])`

**Example**:
```typescript
Property.Number({
  displayName: 'Page Size',
  description: 'Number of items to fetch (1-1000)',
  defaultValue: 50,
})
```

### Important Notes on Property Descriptions

1. **These are GENERIC patterns only** - They provide helpful formatting hints and examples
2. **Service-specific details should NOT be added** - Examples:
   - ❌ "Get Channel ID by right-clicking the channel in Slack"
   - ❌ "Find your Repository ID in GitHub settings"
   - These will be added by engineers based on requirements/design docs
3. **Combine patterns when applicable** - A field can match multiple patterns:
   ```typescript
   Property.ShortText({
     displayName: 'Callback URL',
     description: 'URL for webhook callbacks (must be a valid HTTPS URL). Optional - leave empty if not needed',
     required: false,
   })
   ```
4. **Don't override existing good descriptions** - If the API documentation already provides a clear, detailed description, keep it and only add format hints

---

## 6. Error Handling

**Rationale**: Clear, contextual error messages help users diagnose issues quickly and reduce support burden. Errors should communicate what failed, where, and why.

### Error Message Pattern (NON-NEGOTIABLE)

**Rule**: All error messages must include operation context and relevant identifiers.

**Required elements**:
1. What operation failed
2. Which resource (ID/name if applicable)
3. Original error message or HTTP status

**Example**:
```typescript
try {
  const response = await httpClient.sendRequest({
    method: HttpMethod.POST,
    url: `${API_URL}/sheets/${sheetId}/rows`,
    body: rowData,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create row: ${response.statusText} (${response.status})`
    );
  }

  return response.body;
} catch (error) {
  throw new Error(
    `Failed to create row in sheet ${sheetId}: ${error.message}`
  );
}
```

**Bad examples**:
```typescript
❌ throw new Error('Failed');
❌ throw new Error('Error creating row');
❌ throw new Error(error.message); // loses context
```

**Good examples**:
```typescript
✅ throw new Error(`Failed to create row in sheet ${sheetId}: ${error.message}`);
✅ throw new Error(`Failed to send message to channel ${channelId}: ${response.statusText}`);
✅ throw new Error(`Failed to update contact ${contactId}: Resource not found (404)`);
```

### HTTP Response Errors

**Pattern**: Include both status text and status code for HTTP errors.

**Format**: `${response.statusText} (${response.status})`

**Examples**:
- `Not Found (404)`
- `Unauthorized (401)`
- `Internal Server Error (500)`

---

## 7. Piece Metadata (NON-NEGOTIABLE)

**Rationale**: Consistent metadata ensures proper attribution and discoverability across all connectors.

### Authors

**Rule**: All generated connectors MUST use `['SS&C Blue Prism']` as the authors value.

```typescript
export const serviceName = createPiece({
    // ...
    authors: ['SS&C Blue Prism'],
    // ...
});
```

**Never use**:
- `['author-name']` (placeholder)
- `['activepieces']` (incorrect attribution)
- Empty array `[]`

---

**Last Updated**: 2025-01-19 (Added Section 7: Piece Metadata)
