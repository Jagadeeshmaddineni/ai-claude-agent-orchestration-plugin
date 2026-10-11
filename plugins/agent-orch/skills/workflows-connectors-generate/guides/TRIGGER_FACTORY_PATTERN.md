# Trigger Factory Pattern

**Purpose:** Reduce code duplication in polling triggers by extracting common logic into a reusable factory function.

## When to Use

Apply this pattern when you have **2 or more polling triggers** that share the same structure but differ only in configuration details like:
- Which field to monitor (created vs updated)
- Display names and descriptions
- Query parameters or filters
- Table/resource names

**Key benefit:** Dramatically reduces code per trigger - extract common logic once, configure variations simply.

## Core Concept

Instead of writing complete trigger implementations for each similar trigger:

1. **Identify what's common**: Polling logic, lifecycle hooks, deduplication strategy
2. **Identify what varies**: Display names, API parameters, field names
3. **Extract common logic** to a factory function in `polling-trigger-helper.ts`
4. **Configure variations** through simple objects in individual trigger files

## Pattern Structure

### 1. Define Configuration Interface

Analyze your triggers to determine what varies between them:

```typescript
// In lib/triggers/polling-trigger-helper.ts

interface PollingTriggerConfig {
    name: string;
    displayName: string;
    description: string;
    // Add fields that vary between YOUR triggers
    // Examples (adapt to your API):
    // - monitoredField?: string
    // - resourceType?: string
    // - filterParam?: string
    // - additionalProps?: InputPropertyMap
}
```

**Important:** The config interface should match YOUR triggers' variations, not a predetermined structure.

### 2. Create Factory Function

Build a function that takes config and returns a complete trigger:

```typescript
export function createPollingTrigger(config: PollingTriggerConfig) {
    // Define props (use config for variations)
    const props = {
        // Base props common to all triggers
        // + any config.additionalProps if needed
    };

    // Define polling logic using config values
    const polling: Polling<AuthType, PropsType> = {
        strategy: DedupeStrategy.TIMEBASED,
        items: async ({ auth, propsValue }) => {
            // Use config values to customize API calls
            // Return items with epochMilliSeconds for deduplication
        },
    };

    // Return complete trigger with all hooks
    return createTrigger({
        auth: yourAuth,
        name: config.name,
        displayName: config.displayName,
        description: config.description,
        type: TriggerStrategy.POLLING,
        props: props,
        sampleData: {},
        onEnable: async (context) => {
            await pollingHelper.onEnable(polling, context);
        },
        onDisable: async (context) => {
            await pollingHelper.onDisable(polling, context);
        },
        run: async (context) => {
            return await pollingHelper.poll(polling, context);
        },
        test: async (context) => {
            return await pollingHelper.test(polling, context);
        },
    });
}
```

### 3. Use Factory in Trigger Files

Each trigger becomes a simple configuration:

```typescript
// In lib/triggers/new-item.ts
import { createPollingTrigger } from './polling-trigger-helper';

export const newItemTrigger = createPollingTrigger({
    name: 'new_item',
    displayName: 'New Item',
    description: 'Triggers when a new item is created',
    // Only specify what's different for this trigger
});
```

```typescript
// In lib/triggers/updated-item.ts
import { createPollingTrigger } from './polling-trigger-helper';

export const updatedItemTrigger = createPollingTrigger({
    name: 'updated_item',
    displayName: 'Updated Item',
    description: 'Triggers when an item is updated',
    // Only specify what's different for this trigger
});
```

## File Organization

```
lib/
├── triggers/
│   ├── polling-trigger-helper.ts    # Factory function (shared)
│   ├── new-item.ts                  # Configuration only
│   ├── updated-item.ts              # Configuration only
│   ├── deleted-item.ts              # Configuration only
│   └── index.ts
```

## What Goes in polling-trigger-helper.ts

### Always Include
- Complete trigger lifecycle: `onEnable`, `onDisable`, `run`, `test`
- Polling strategy (typically `DedupeStrategy.TIMEBASED`)
- Items mapping logic
- Error handling

### Make Configurable
- Anything that differs between your triggers
- Display metadata (name, displayName, description)
- API-specific parameters determined by config
- Optional additional properties per trigger

## Integration with Constants

Use constants from `lib/common/constants.ts` in trigger configurations:

```typescript
// In constants.ts - define what varies
export const MONITOR_FIELD = {
  CREATED: 'created_at',
  UPDATED: 'updated_at',
};

// In trigger configuration
export const newItemTrigger = createPollingTrigger({
    monitoredField: MONITOR_FIELD.CREATED,
    // ...
});
```

## Decision Guide

**Use this pattern when:**
- ✅ You have 2+ polling triggers
- ✅ They share the same polling logic
- ✅ They differ only in configuration (parameters, names, etc.)

**Don't use this pattern when:**
- ❌ You have only 1 polling trigger
- ❌ Triggers have fundamentally different logic
- ❌ Triggers are webhooks (different pattern)
- ❌ Each trigger needs unique processing logic

## Key Principles

1. **Configuration over duplication**: If you're copying and pasting trigger code, extract to factory
2. **Analyze YOUR triggers first**: Don't assume what should be configurable - examine your actual triggers
3. **One factory per pattern**: If some triggers follow a different pattern, create separate factories
4. **Keep triggers minimal**: Individual trigger files should be mostly configuration, not logic

## Example Evolution

**Step 1:** Write first polling trigger (full implementation)

**Step 2:** Write second polling trigger, notice duplication

**Step 3:** Identify what's common vs what varies

**Step 4:** Extract common logic to `polling-trigger-helper.ts`

**Step 5:** Refactor both triggers to use factory

**Step 6:** Additional triggers become trivial
