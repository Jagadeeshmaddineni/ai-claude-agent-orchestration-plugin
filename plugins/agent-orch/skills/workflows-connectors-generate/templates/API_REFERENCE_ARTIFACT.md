# API Reference Artifact Template

**Purpose:** Structured reference file created by `/speckit.docs` to retain API documentation context throughout the connector generation workflow.

**File Location:** `specs/[service-name]-api-reference.md`

**Lifecycle:** Created by `/speckit.docs`, used by subsequent commands, archived by `/speckit.complete`

---

## Template Structure

```markdown
# [Service Name] API Reference

**Generated:** [timestamp]
**Artifact Version:** 2.0

---

## Service Scope

**Service Type:** [Large / Focused]
**Scoped Areas:** [user-selected areas, or "Full service" if Focused]

| Metric | Value |
|--------|-------|
| Total API Areas Discovered | [N] |
| Areas Documented in Depth | [M] |

---

## Source Quality

**Confidence Level:** [HIGH / MEDIUM / LOW]

| Aspect | Status | Notes |
|--------|--------|-------|
| Source Type | [Official / User-Provided / Mixed] | [URL domain or file types] |
| Source Accessible | [Yes / Auth-Gated / Partial] | [Details if not fully accessible] |
| Overall Coverage | [X]% | [Y]/[Z] operations documented |

[If confidence is not HIGH, include this warning:]
**Warning:**
[Explanation of why confidence is not HIGH and what would improve it]

**Confidence Level Definitions:**
- **HIGH:** Official docs fully accessible, coverage >= 60%, all core actions documented
- **MEDIUM:** Official docs accessible but coverage 40-59%, OR user-provided docs with good coverage
- **LOW:** Coverage < 40%, OR significant gaps in core actions

---

## Documentation Sources

All discovered documentation links for quick reference:

| Topic | Link | Type | Description |
|-------|------|------|-------------|
| Main API Docs | [url or file path] | [Official / User-Provided] | Primary API documentation |
| Authentication | [url or file path] | [Official / User-Provided] | Auth setup and configuration |
| SDK/Library | [url or file path] | [Official / User-Provided] | Official SDK documentation (if available) |
| Webhooks | [url or file path] | [Official / User-Provided] | Webhook setup and events (if available) |
| Rate Limits | [url or file path] | [Official / User-Provided] | Rate limiting details (if documented) |
| Errors | [url or file path] | [Official / User-Provided] | Error codes and handling (if documented) |
| [Area-specific] | [url or file path] | [Official / User-Provided] | [Per-area documentation links] |

**Source Types:**
- **Official:** Fetched from vendor's official documentation site
- **User-Provided:** Files supplied by user (HTML, PDF, MD, OpenAPI specs)

**Primary Source Used:** [Main URL or file path used for this artifact]
**Documentation Method:** [WebFetch / Playwright / User Files / Mixed]

---

## Authentication

**Method:** [OAuth2 / API Key / Custom Auth]

**Details:**
[For OAuth2:]
- Grant Type: [AUTHORIZATION_CODE / CLIENT_CREDENTIALS]
- Authorization URL: [url]
- Token URL: [url]
- Scopes: [list]
- Additional fields: [instanceUrl, etc.]

[For API Key:]
- Display Name: [name]
- Header Format: [Bearer, X-API-Key, etc.]

[For Custom Auth:]
- Required Fields: [field1, field2, etc.]
- Field Types: [descriptions]

**Credentials Location:** [Where users get credentials]

**Validation Endpoint:** [Endpoint for testing auth, if available]

**Complexity Signals:**
- [ ] JWT/RSA token generation required
- [ ] Environment selection needed (sandbox/production)
- [ ] Instance URL or tenant ID required
- [ ] Short token lifetime (needs refresh)
- [ ] Multiple environments with different base URLs

---

## Integration Options

**SDK/Client Library:**
- Available: [Yes / No]
- Package: [npm package name, if available]
- Docs: [link to SDK documentation]
- Notes: [Promise vs callback, handles auth automatically, etc.]

**HTTP/REST API:**
- Available: [Yes / No]
- Docs: [link to REST API documentation]
- OpenAPI Spec: [link if available]

**Decision:** Deferred to /speckit.scope

---

## Base URL

[Primary API base URL]

---

## API Landscape

[This section replaces the old "Key Endpoints" with a hierarchical, resource-based structure]

### Resource: [Name] (Core)

**Coverage:** [X]% ([M]/[N] operations documented)
**Documentation:** [URL to resource documentation]

| Operation | Method | Endpoint | Status | Notes |
|-----------|--------|----------|--------|-------|
| Create [Resource] | POST | /api/[resource] | [Status] | [Core / Notes] |
| Get [Resource] | GET | /api/[resource]/{id} | [Status] | [Core / Notes] |
| List [Resources] | GET | /api/[resource] | [Status] | [Notes] |
| Update [Resource] | PATCH | /api/[resource]/{id} | [Status] | [Notes] |
| Delete [Resource] | DELETE | /api/[resource]/{id} | [Status] | [Notes] |

[Repeat for each resource/area that was deeply documented]

### Resource: [Name 2]

**Coverage:** [X]% ([M]/[N] operations documented)
**Documentation:** [URL to resource documentation]

| Operation | Method | Endpoint | Status | Notes |
|-----------|--------|----------|--------|-------|
| ... | ... | ... | ... | ... |

---

## Listed Areas (Not Deeply Documented)

Areas discovered during landscape discovery but not selected for deep documentation:

| Area | Documentation | Notes |
|------|---------------|-------|
| [Area Name] | [URL] | Out of scope / User did not select |
| [Area Name] | [URL] | Out of scope / User did not select |

---

## Inaccessible Documentation

Documentation that could not be accessed during discovery:

| Area | Status | What's Missing |
|------|--------|----------------|
| [Area Name] | [Auth-gated / Not found] | [Brief description of what's missing] |
| [Area Name] | [Auth-gated / Not found] | [Brief description of what's missing] |

---

## Pagination

**Applicable:** [Yes / No / SDK handles internally]

[If Yes:]
- Method: [cursor / offset / link-header / page]
- Parameters: [limit, offset, after, page, etc.]
- Max Page Size: [number]
- Docs: [link to pagination documentation]

---

## Webhooks

**Supported:** [Yes / No]

[If Yes:]
- Docs: [link to webhook documentation]
- Event Types: [list key events or "~N event types available"]
- Verification: [signature / timestamp / none / unknown]
- Notes: [brief setup requirements]

[If No:]
Will use POLLING strategy for all triggers.

---

## Rate Limits

**Documented:** [Yes / No]
- Docs: [link to rate limiting documentation]
- Notes: [brief summary, e.g., "100 req/min, uses X-RateLimit headers"]

---

## Error Handling

**Pattern:** [standard-http / custom-codes / unknown]
- Docs: [link to error documentation, if exists]
- Notes: [brief note if custom codes, e.g., "Uses error.code and error.message"]

---

## Entity Relationships

**Has Hierarchy:** [Yes / No / Unknown]

[If Yes:]
- [Resource] belongs to [Parent Resource]
- [Resource] references [Other Resource]

Notes: [e.g., "Most resources require organization_id"]

---

## Batch Operations

**Supported:** [Yes / No / Unknown]
- Docs: [link to batch/bulk documentation]
- Notes: [e.g., "POST /batch supports up to 100 items"]

---

## Custom API Call

**Supported:** [Yes / No]
- Type: [REST_GENERIC / TABLE_API / GRAPHQL / QUERY_ENDPOINT / N/A]
- Pattern: [e.g., "/api/objects/{objectType}" or "POST /graphql"]
- Docs: [link to generic API documentation]
- Notes: [e.g., "Allows querying any entity via generic endpoint"]

[If supported, this enables `createCustomApiCallAction` in the connector]

---

## Generic API Pattern

**Detected:** [Yes / No]

[If Yes - the API uses a generic endpoint pattern where entity/object type is a parameter:]

**Pattern:** [e.g., "/api/objects/{objectType}", "/crm/v3/objects/{objectType}"]

### Pre-configured Action Candidates

Entities that should have dedicated actions in addition to generic actions:

| Entity | Criterion | Reason |
|--------|-----------|--------|
| [entity name] | high-frequency | [why it's commonly used] |
| [entity name] | high-frequency | [why it's commonly used] |
| [entity name] | complex | [what makes it cumbersome: magic values, required combos, etc.] |

**Criteria:**
- **high-frequency**: Primary use case for the service, featured in docs/examples
- **complex**: Has magic values, required field combinations, state machines, etc.

[If No - the API has fixed, resource-specific endpoints:]

Pre-configured actions will be the only option (no generic alternative).

---

## Common Parameters

[Common query parameters, headers, or conventions if applicable]

---

## Uncertainties

Capture any ambiguities or decision points that need clarification in `/speckit.scope`:

- [Topic]: [What's unclear and the options discovered]
- [Topic]: [What's unclear and the options discovered]

Example entries:
- OAuth2 Grant Type: Docs mention both user-based and server-to-server flows - needs clarification
- SDK vs HTTP: Both available; SDK covers 80% of endpoints, HTTP has full coverage
- Trigger Strategy: Webhooks documented but subscription endpoint unclear

---

## Notes

[Any additional important information or quirks about the API]
```

---

## Status Legend

Use these icons consistently throughout the artifact:

| Icon | Meaning |
|------|---------|
| ✅ | Fully documented |
| ⚠️ | Partially documented |
| 🔒 | Auth-gated (requires authentication to view) |
| ❓ | Not found (referenced but no documentation) |
| ⭐ | Core action/resource (high importance) |

---

## Usage Guidelines

**When to Create:**
- At the end of `/speckit.docs`, after all documentation has been analyzed (Phase 5)
- Before proceeding to `/speckit.scope`

**What to Include:**
- Only information extracted from documentation or provided by user
- Use "Not specified" or "Not documented" for missing information
- Keep descriptions concise (1-2 sentences per endpoint)
- Include links to documentation sources for each section
- Check applicable complexity signals in Authentication section
- Mark core actions with ⭐ based on scoring system

**Coverage Requirements:**
- Overall coverage >= 60%: Proceed normally
- Overall coverage 40-59%: Warn user, proceed with caution
- Overall coverage < 40%: Block and request additional documentation

**Benefits:**
- Persistent context across all steps
- Reduces token usage (no need to re-analyze documentation)
- User can review extracted information
- Ensures consistency in authentication and endpoint decisions
- Prevents context loss in long generation sessions
- Hierarchical structure makes it easy to see API breadth
- Core action identification guides scope recommendations

---

## Migration from v1.0 Artifacts

If consuming an artifact without the "Artifact Version" header, treat it as v1.0:
- "Key Endpoints" section maps to "API Landscape" (flat list → hierarchical)
- No "Service Scope" or coverage percentages in v1.0
- No "Listed Areas" or "Inaccessible Documentation" sections in v1.0

The `/speckit.scope` command should handle both formats.
