# TypeScript Conventions

## Naming Conventions

### Casing Rules

| Element | Case | Example |
|---------|------|---------|
| Classes, Interfaces, Types, Enums | PascalCase | `SecurityData`, `ErrorMatcher` |
| Functions, Methods, Variables, Properties | camelCase | `handleKafkaError`, `configValue` |
| Constants (module-level) | CONSTANT_CASE | `MAX_BATCH_SIZE`, `DEFAULT_CLIENT_ID` |
| Enum values | CONSTANT_CASE | `CREATED`, `UPDATED` |

### Naming Rules

- Do NOT prefix interfaces with `I` (use `SecurityData` not `ISecurityData`)
- Do NOT use trailing/leading underscores for private properties
- Use descriptive names; abbreviations must be unambiguous
- Treat acronyms as words: `loadHttpUrl` not `loadHTTPURL`
- Generic type parameters: use single uppercase letters `T`, `K`, `V`, `E`

```typescript
// Correct
function map<T, U>(items: T[], fn: (item: T) => U): U[] {...}
type Record<K extends string, V> = { [key in K]: V };

// Incorrect
function map<Item, Result>(items: Item[], fn: (item: Item) => Result): Result[] {...}
```

## Exports and Imports

### Exports

- Use named exports exclusively
- Do NOT use default exports
- Do NOT use mutable exports (`export let`)

```typescript
// Correct
export const createIncidentAction = createAction({...});
export interface ErrorMatcher {...}
export function handleError(error: unknown): never {...}

// Incorrect
export default createIncidentAction;
export let mutableValue = 1;
```

### Barrel Files

- Use `index.ts` files to re-export public APIs
- Re-export with `export * from './module'`

```typescript
// src/lib/actions/index.ts
export * from './create-incident';
export * from './update-incident';
export * from './get-incident';
```

### Imports

- Use relative imports within the same package
- Prefer named imports over namespace imports for small sets
- Use namespace imports (`import * as`) for large APIs with many symbols

## File Organization

- Define types and interfaces at the top of the file, before implementation
- Group related types together

## Type Definitions

### Interface vs Type

- Use `interface` for object shapes and contracts
- Use `type` for unions, intersections, tuples, and aliases

```typescript
// Interface for object shapes
export interface SecurityData {
    securityId: string;
    lastPrice?: number;
}

// Type for unions and aliases
export type ActionType = 'dividend' | 'split' | 'merger';
export type RequestParams = SecurityData & { timestamp: number };
```

### Array Syntax

- Use `T[]` for simple types
- Use `Array<T>` for complex types (unions, long type names)

```typescript
// Simple
const items: string[] = [];
const matchers: ErrorMatcher[] = [];

// Complex
const results: Array<SecurityData | ErrorResponse> = [];
```

### Extensible Objects

- Use index signatures when objects can have dynamic keys

```typescript
export interface SecurityData {
    securityId: string;
    [key: string]: BloombergFieldValue;
}
```

### Type Assertions

- Use `as` syntax, not angle bracket syntax
- Document why assertions are necessary when unsafe
- Prefer runtime checks over assertions when possible

```typescript
// Correct
const value = someValue as string;
const element = event.target as HTMLInputElement;

// Incorrect
const value = <string>someValue;
```

### Type Inference

- Do NOT annotate when TypeScript can infer the type correctly
- Add annotations for function return types when it improves clarity
- Always annotate public API boundaries

```typescript
// Correct - let TypeScript infer
const name = 'John';
const items = [1, 2, 3];
const doubled = items.map(x => x * 2);

// Incorrect - redundant annotation
const name: string = 'John';
const items: number[] = [1, 2, 3];
```

### Non-null Assertions

- Avoid the `!` operator; prefer proper null checks
- Use only when you have definite knowledge TypeScript cannot infer

```typescript
// Preferred - proper null check
if (element) {
    element.focus();
}

// Avoid unless absolutely necessary
element!.focus();
```

### Utility Types

- Use `Record<string, T>` for dictionary/map types
- Use `Partial<T>` for objects with all optional properties
- Use `Pick<T, K>` and `Omit<T, K>` for type subsetting

```typescript
// Dictionary type
const config: Record<string, string> = {};

// Partial for optional updates
function updateUser(id: string, updates: Partial<User>): User {...}

// Pick/Omit for type subsetting
type UserSummary = Pick<User, 'id' | 'name'>;
type UserWithoutPassword = Omit<User, 'password'>;
```

### Generic Response Wrappers

- Use generic types for API response structures

```typescript
export interface ApiResponse<T> {
    data: T;
    success: boolean;
}

export interface ListResponse<T> extends ApiResponse<T[]> {
    total: number;
}
```

## Constants

### Organization

- Group related constants in objects with `as const`
- Use CONSTANT_CASE for top-level constants
- Separate files for logical groupings (endpoints, defaults, errors)

```typescript
// Grouped constants
export const TIMESTAMP_FIELD = {
    CREATED: 'sys_created_on',
    UPDATED: 'sys_updated_on',
} as const;

// Individual constants
export const MAX_BATCH_SIZE = 1000;
export const DEFAULT_CLIENT_ID = 'workflows-kafka-client';
```

## Enums

- Use plain `enum`, not `const enum`
- Use CONSTANT_CASE for enum values

```typescript
// Correct
export enum HttpStatus {
    OK = 200,
    NOT_FOUND = 404,
    INTERNAL_ERROR = 500,
}

// Incorrect - const enum
const enum HttpStatus {
    OK = 200,
}
```

## Classes

### Readonly Properties

- Use `readonly` for properties never reassigned after construction

```typescript
export class ApiClient {
    readonly baseUrl: string;
    readonly timeout: number;

    constructor(baseUrl: string, timeout: number) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }
}
```

### Parameter Properties

- Use parameter properties to reduce boilerplate

```typescript
// Preferred - parameter properties
export class ApiClient {
    constructor(
        private readonly baseUrl: string,
        private readonly timeout: number
    ) {}
}

// Verbose alternative
export class ApiClient {
    private readonly baseUrl: string;
    private readonly timeout: number;

    constructor(baseUrl: string, timeout: number) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }
}
```

## Comments and Documentation

### JSDoc

- Use JSDoc (`/** */`) for documentation of public APIs
- Do NOT use JSDoc for type information; TypeScript handles types
- Use line comments (`//`) for implementation notes

```typescript
// Correct - JSDoc for documentation
/**
 * Validates a Kafka topic name against naming rules.
 * Throws an error if the name is invalid.
 */
export function validateTopicName(topic: string): string {...}

// Incorrect - JSDoc for types (redundant with TypeScript)
/**
 * @param {string} topic - The topic name
 * @returns {string} The validated topic name
 */
export function validateTopicName(topic: string): string {...}
```

## Functions

### Declaration Style

- Use function declarations for named, top-level functions
- Use arrow functions for callbacks and inline functions
- Do NOT use function expressions

```typescript
// Function declaration
export function validateTopicName(topic: string): string {
    // ...
}

// Arrow function for callback
const filtered = items.filter((item) => item.isValid);

// Incorrect - function expression
const validate = function(topic: string) {...};
```

### Arrow Functions

- Omit parentheses for single parameter when no type annotation needed
- Use concise body when returning a value
- Use block body when performing side effects

```typescript
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

```typescript
// Small, focused utilities
export function normalizeUrl(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function joinPath(base: string, path: string): string {
    const normalizedBase = normalizeUrl(base);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
}
```

### Predicate Functions

- Extract boolean conditions into named functions for readability

```typescript
function hasValidValue(entry: ConfigEntry): boolean {
    return entry.value !== null && entry.value !== undefined;
}

// Usage
const validEntries = entries.filter(hasValidValue);
```

### Safe JSON Parsing

- Use try/catch with fallback for parsing untrusted data

```typescript
function parseJsonSafely(value: string): unknown {
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

```typescript
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

```typescript
export function validateTopicName(topic: string): string {
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

### Avoid `any`

- Use `unknown` when type is truly unknown
- Provide specific types where possible
- Document `@ts-expect-error` suppressions

```typescript
// Use unknown
function extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

// Avoid any
function process(data: any) {...}  // Incorrect
```

### Defensive Defaults

- Provide defaults for optional values using `||` or `??`

```typescript
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

```typescript
// Strict equality
if (value === 'expected') {...}

// Allowed exception for null/undefined check
if (value == null) {...}

// Incorrect - loose equality
if (value == 'expected') {...}
```

### Iteration

- Prefer `for...of` for arrays
- Use `Object.keys()`, `Object.values()`, or `Object.entries()` for objects

```typescript
// Array iteration
for (const item of items) {...}

// Object iteration
for (const [key, value] of Object.entries(config)) {...}
```
