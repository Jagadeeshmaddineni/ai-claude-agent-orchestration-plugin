# File Generation Templates

This guide provides reference connectors to use as templates when generating different types of connector files.

## Reference Connectors

**Use exact patterns from existing connectors**. Each reference connector demonstrates a specific pattern:

### OAuth2 + WEBHOOK triggers
**Reference**: `packages/connectors/acuity-scheduling/`

Use this pattern when:
- Service uses OAuth2 authentication
- Service supports webhook-based triggers

### POLLING triggers
**Reference**: `packages/connectors/discord/`

Use this pattern when:
- Service does not support webhooks
- Triggers must poll API endpoints periodically

### MIXED (both WEBHOOK and POLLING)
**Reference**: `packages/connectors/wufoo/`

Use this pattern when:
- Some triggers can use webhooks
- Other triggers must use polling
- Each connector can mix both strategies

### SecretText authentication
**Reference**: `packages/connectors/firecrawl/`

Use this pattern when:
- Service uses API key authentication
- Single secret text field for auth

### CustomAuth
**Reference**: `packages/connectors/activecampaign/`

Use this pattern when:
- Service requires multiple authentication fields
- Custom authentication configuration needed
- Examples: Username + Password, API URL + API Key, etc.

## Trigger Strategy Selection

- **Use WEBHOOK template** when service has webhook support for that specific event
- **Use POLLING template** when no webhook available or as fallback
- **Each connector can mix both strategies** (like Wufoo does)

## Code Organization

When generating connector files, ensure robust architecture by extracting common functionality:
- **HTTP client abstraction** → `lib/common/client.ts`
- **Constants** (API paths, queries, field names) → `lib/common/constants.ts`
- **Validation schemas** → `lib/common/validators.ts`
- **Utility functions** → `lib/common/url-utils.ts`, `error-handler.ts`

See `guides/CODE_REUSE_PATTERNS.md` for detailed examples and extraction criteria.

## Best Practices

1. Always examine the reference connector before generating
2. Copy the exact structure and patterns
3. Adjust only the service-specific details (URLs, field names, etc.)
4. Keep configuration files (package.json, project.json) consistent
5. Follow the same naming conventions
