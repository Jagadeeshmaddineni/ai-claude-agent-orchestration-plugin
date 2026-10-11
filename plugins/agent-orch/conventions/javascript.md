# JavaScript Conventions

## Naming Conventions

### Casing Rules

| Element | Case | Example |
|---------|------|---------|
| Classes | PascalCase | `SecurityData`, `ErrorHandler` |
| Functions, Methods, Variables, Properties | camelCase | `handleKafkaError`, `configValue` |
| Constants (module-level) | CONSTANT_CASE | `MAX_BATCH_SIZE`, `DEFAULT_CLIENT_ID` |

### Naming Rules

- Use descriptive names; abbreviations must be unambiguous
- Treat acronyms as words: `loadHttpUrl` not `loadHTTPURL`
- Do NOT use trailing/leading underscores for private properties

```javascript
// Correct
function validateTopicName(topic) {...}
const maxRetries = 3;

// Incorrect
function validateTopicname(topic) {...}
const max_retries = 3;
```

## Exports and Imports

### Exports

- Use named exports exclusively
- Do NOT use default exports
- Do NOT use mutable exports

```javascript
// Correct
export const createIncidentAction = createAction({...});
export function handleError(error) {...}

// Incorrect
export default createIncidentAction;
export let mutableValue = 1;
```

### Barrel Files

- Use `index.js` files to re-export public APIs
- Re-export with `export * from './module'`

```javascript
// src/lib/actions/index.js
export * from './create-incident';
export * from './update-incident';
export * from './get-incident';
```

### Imports

- Use ES modules (`import`/`export`) when possible
- Use CommonJS (`require`) only when necessary (Node.js < 14 without ESM)
- Prefer named imports over namespace imports for small sets

```javascript
// ES modules (preferred)
import { validateTopic, normalizeTopic } from './validation';

// CommonJS (when needed)
const { validateTopic } = require('./validation');
```

## File Organization

- Group related functions together
- Keep utility functions small and focused

## Comments and Documentation

### JSDoc

- Use JSDoc (`/** */`) for type hints and documentation
- Document function parameters and return types
- Use line comments (`//`) for implementation notes

```javascript
// Correct - JSDoc for type hints and documentation
/**
 * Validates a Kafka topic name against naming rules.
 * @param {string} topic - The topic name to validate
 * @returns {string} The validated topic name
 * @throws {Error} If the topic name is invalid
 */
export function validateTopicName(topic) {...}

// Implementation note
// TODO: Add support for wildcard patterns
```

## Functions

### Declaration Style

- Use function declarations for named, top-level functions
- Use arrow functions for callbacks and inline functions
- Do NOT use function expressions

```javascript
// Function declaration
export function validateTopicName(topic) {
    // ...
}

// Arrow function for callback
const filtered = items.filter(item => item.isValid);

// Incorrect - function expression
const validate = function(topic) {...};
```

### Arrow Functions

- Omit parentheses for single parameter
- Use concise body when returning a value
- Use block body when performing side effects

```javascript
// Concise body (returns value)
const names = items.map(item => item.name);

// Block body (side effects or complex logic)
const processed = items.map(item => {
    logProcessing(item);
    return transform(item);
});
```

### Pure Utility Functions

- Keep utility functions small and single-purpose
- Return transformed values, not void

```javascript
// Small, focused utilities
export function normalizeUrl(url) {
    return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function joinPath(base, path) {
    const normalizedBase = normalizeUrl(base);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
}
```

### Predicate Functions

- Extract boolean conditions into named functions for readability

```javascript
function hasValidValue(entry) {
    return entry.value !== null && entry.value !== undefined;
}

// Usage
const validEntries = entries.filter(hasValidValue);
```

### Safe JSON Parsing

- Use try/catch with fallback for parsing untrusted data

```javascript
function parseJsonSafely(value) {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}
```

## Error Handling

### Throwing Errors

- Always throw `Error` instances, never primitives
- Use `new Error()` with descriptive messages
- Include context in error messages

```javascript
// Correct
throw new Error('Topic name cannot be empty');
throw new Error(`Failed to create Kafka topic: ${errorMessage}`);

// Incorrect
throw 'Topic name cannot be empty';
throw { message: 'error' };
```

### Validation

- Validate inputs early, fail fast
- Throw descriptive errors for invalid inputs
- Return the validated/normalized value, not void

```javascript
export function validateTopicName(topic) {
    const trimmed = topic?.trim() || '';

    if (!trimmed) {
        throw new Error('Topic name cannot be empty');
    }

    if (trimmed.length > MAX_TOPIC_NAME_LENGTH) {
        throw new Error(`Topic name exceeds maximum length of ${MAX_TOPIC_NAME_LENGTH}`);
    }

    return trimmed;
}
```

## Variables

### Declaration

- Use `const` by default
- Use `let` only when reassignment is necessary
- Never use `var`

```javascript
// Correct
const name = 'John';
let count = 0;

// Incorrect
var name = 'John';
```

### Destructuring

- Use destructuring for extracting object properties and array elements

```javascript
// Object destructuring
const { name, age } = user;

// Array destructuring
const [first, second] = items;

// Function parameter destructuring
function greet({ name, title }) {
    return `Hello, ${title} ${name}`;
}
```

### Spread and Rest

- Use spread operator for copying arrays/objects
- Use rest parameters for variable arguments

```javascript
// Spread
const newArray = [...oldArray, newItem];
const newObject = { ...oldObject, newProp: value };

// Rest parameters
function sum(...numbers) {
    return numbers.reduce((a, b) => a + b, 0);
}
```

### Defensive Defaults

- Provide defaults for optional values using `||` or `??`

```javascript
// For falsy defaults (empty string, 0, false are replaced)
const items = response.items || [];
const config = options.config || {};

// For nullish defaults (only null/undefined replaced)
const count = response.count ?? 0;
const name = user.name ?? 'Anonymous';
```

## Control Flow

### Equality

- Use `===` and `!==` exclusively
- Exception: `== null` is allowed to check both null and undefined

```javascript
// Strict equality
if (value === 'expected') {...}

// Allowed exception for null/undefined check
if (value == null) {...}

// Incorrect - loose equality
if (value == 'expected') {...}
```

### Optional Chaining

- Use `?.` to safely access nested properties

```javascript
// Correct
const street = user?.address?.street;

// Verbose alternative
const street = user && user.address && user.address.street;
```

### Nullish Coalescing

- Use `??` to provide defaults only for null/undefined

```javascript
// Correct - only replaces null/undefined
const count = response.count ?? 0;

// Incorrect - replaces falsy values (0, '', false)
const count = response.count || 0;
```

### Iteration

- Prefer `for...of` for arrays
- Use `Object.keys()`, `Object.values()`, or `Object.entries()` for objects

```javascript
// Array iteration
for (const item of items) {...}

// Object iteration
for (const [key, value] of Object.entries(config)) {...}
```

## Async/Await

### Async Functions

- Use `async`/`await` for asynchronous operations
- Avoid raw promises except for parallel operations

```javascript
// Correct - async/await
async function fetchUser(id) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
}

// Correct - parallel with Promise.all
async function fetchUsers(ids) {
    const promises = ids.map(id => fetchUser(id));
    return Promise.all(promises);
}

// Avoid - promise chains
function fetchUser(id) {
    return fetch(`/api/users/${id}`)
        .then(response => response.json());
}
```

### Error Handling

- Use try/catch with async/await
- Always handle promise rejections

```javascript
async function fetchData() {
    try {
        const data = await fetch('/api/data');
        return data.json();
    } catch (error) {
        console.error('Failed to fetch data:', error);
        throw error;
    }
}
```

## Constants

### Organization

- Group related constants in objects with descriptive names
- Use CONSTANT_CASE for top-level constants
- Separate files for logical groupings

```javascript
// Grouped constants
export const TIMESTAMP_FIELD = {
    CREATED: 'sys_created_on',
    UPDATED: 'sys_updated_on',
};

// Individual constants
export const MAX_BATCH_SIZE = 1000;
export const DEFAULT_CLIENT_ID = 'workflows-kafka-client';
```

## Classes

### Constructor

- Initialize properties in constructor
- Use parameter destructuring for options

```javascript
export class ApiClient {
    constructor({ baseUrl, timeout }) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }
}
```

### Method Declaration

- Use concise method syntax in classes

```javascript
export class ApiClient {
    async fetch(endpoint) {
        // Implementation
    }
}
```

## Modules

### Module Structure

- ES modules (preferred):

```javascript
// Import
import { validateTopic } from './validation';

// Export
export function validateTopic(topic) {...}
```

- CommonJS (when needed):

```javascript
// Import
const { validateTopic } = require('./validation');

// Export
function validateTopic(topic) {...}
module.exports = { validateTopic };
```
