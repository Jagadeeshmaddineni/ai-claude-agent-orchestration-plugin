---
description: Gather and consolidate API documentation for connector generation. Creates structured documentation artifacts for use in subsequent steps.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The input may contain documentation URLs or additional context.

## Prerequisites

### 1. Load Connector Context

**Read the connector context first:**

1. Check `specs/*/connector-context.md` for the most recently modified folder
2. If exists, read it to get the service name, internal name, and feature branch
3. If not exists, ask user to run `/workflows-connectors-generate` first

```
🔍 Loading connector context...

[If specs/[feature-branch-name]/connector-context.md exists]
Service: [Service Name]
Internal Name: [service-name]
Feature Branch: [feature-branch-name]
Artifacts: specs/[feature-branch-name]/

[If not exists]
❌ No connector context found.

Please run /workflows-connectors-generate first to set up the connector.
```

### 2. Playwright Dependencies (Optional)

Playwright is used as a **fallback** when WebFetch cannot retrieve content from JavaScript-heavy sites.

**Verification (run only if Playwright fallback is needed):**
```bash
python -c "from playwright.sync_api import sync_playwright; print('Playwright OK')"
```

**Installation (if needed):**
```bash
pip install playwright && python -m playwright install chromium
```

**Note:** Playwright verification is NOT required upfront. It will be checked only if WebFetch fails to retrieve usable content.

---

## Official Source Policy

**CRITICAL:** This command ONLY uses official documentation sources. Third-party sources (blogs, integration guides, community sites) are NOT used automatically.

### Why Official Sources Only

Third-party sources may be:
- **Outdated** - Referencing deprecated API versions
- **Incomplete** - Focused on specific integration use cases
- **Misleading** - Emphasizing legacy APIs (e.g., SOAP when REST is preferred)

### Official Source Classification

**Tier 1 - Official API Documentation (ALLOWED):**
- Vendor's developer portal: `developer.{service}.com`, `docs.{service}.com`, `api.{service}.com`
- Vendor's main domain: `{service}.com`, `{service}.io`, `{service}.org`
- Official GitHub: `github.com/{service}/*`, `{service}.github.io`
- Official npm packages: `npmjs.com/package/@{service}/*`, `npmjs.com/package/{service}-*`

**Tier 2 - User-Provided Documentation (ALLOWED):**
- Local files provided by user (HTML, PDF, MD, OpenAPI specs)
- Confluence pages (internal enterprise docs)
- Downloaded official documentation saved locally

**Tier 3 - Third-Party Sources (NOT ALLOWED):**
- Integration platform docs: `learn.microsoft.com`, `docs.microsoft.com`, `workato.com`, `zapier.com`, `tray.io`
- Community sites: `medium.com`, `dev.to`, `stackoverflow.com`
- API aggregators: `rapidapi.com`, `programmableweb.com`
- Blog posts and tutorials

### Source Validation

Before fetching any URL, validate it is an official source:

```
🔍 Evaluating documentation source...

URL: https://developer.workday.com/api-reference
Domain: developer.workday.com

[If official]
✅ OFFICIAL SOURCE
Reason: Matches vendor domain pattern (developer.{service}.com)
→ Proceeding with fetch

[If third-party]
⚠️ THIRD-PARTY SOURCE DETECTED
Domain: learn.microsoft.com

This is a third-party integration guide, not official [Service] documentation.
Third-party sources are not used automatically due to accuracy concerns.

Options:
[1] Provide official documentation URL
[2] Provide documentation files (HTML, PDF, OpenAPI spec)
[3] Switch to Path B (manual documentation input)

Choice (1/2/3):
```

---

## Command Flow

This command uses a **phased discovery approach** to gather API documentation, addressing the common issue that flat endpoint discovery captures only "general" endpoints and misses the breadth of API capabilities.

```
Phase 1: Light Landscape Discovery
    ├── Fetch main API docs page
    ├── Parse navigation/structure
    └── Extract area names + documentation URLs

Phase 2: Service Size Assessment
    ├── 1-4 areas → FOCUSED → auto-proceed to Phase 4
    └── 5+ areas → LARGE → go to Phase 3

Phase 3: User Scoping (large services only)
    ├── Present discovered areas with documentation links
    ├── Multi-select (comma-separated numbers)
    └── Include "Other" option for custom areas

Phase 4: Deep Discovery
    ├── Fetch detailed docs for selected areas
    ├── Map operations per resource
    ├── Identify core actions (scoring system)
    └── Track documentation status per operation

Phase 5: Coverage Assessment & Artifact Creation
    ├── Calculate per-resource coverage %
    ├── Create hierarchical artifact
    └── List inaccessible documentation
```

---

## Outline

### 1. Determine Documentation Source

Using the service name from context, ask:

```
📚 Documentation for [Service Name]

Is this:
A) A well-known service (public API documentation available)
   → I'll research and find documentation myself

B) An internal/custom service
   → You'll provide all documentation (Confluence, files, etc.)

Which one? (A/B):
```

### 2. Path A: Well-Known Service (Official Sources Only)

If user selects Path A, proceed through the 5 phases below.

---

### Phase 1: Light Landscape Discovery

**Objective:** Quickly discover the API's structure before diving deep.

1. Search: "[Service Name] official API documentation"
2. Identify the vendor's official developer portal
3. **Validate URL is an official source** (see "Official Source Policy" section)
4. Fetch the main API documentation page
5. Parse navigation/structure to extract API areas

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Discovering API Landscape
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fetching: https://developer.[service].com/api-reference
✅ Source verified as OFFICIAL

Parsing documentation structure...

Discovered API Areas:
┌─────────────────────────────┬────────────────────────────────────────────┐
│ Area                        │ Documentation URL                          │
├─────────────────────────────┼────────────────────────────────────────────┤
│ Incidents                   │ /api/now/table/incident                    │
│ Change Requests             │ /api/now/table/change                      │
│ Service Catalog             │ /api/sn_sc/servicecatalog                  │
│ Users & Groups              │ /api/now/table/sys_user                    │
│ Knowledge Base              │ /api/now/table/kb_knowledge                │
│ Configuration Items         │ /api/now/cmdb                              │
│ ...                         │                                            │
└─────────────────────────────┴────────────────────────────────────────────┘

Total: [N] distinct API areas discovered
```

**What to extract per area:**
- Area name (human-readable)
- Documentation URL (relative or absolute)
- Brief description (if available from navigation/headers)

**If fetch fails:** Follow "Handle Official Source Inaccessibility" (see below).

---

### Phase 2: Service Size Assessment

**Objective:** Determine if user input is needed for scoping.

Based on the number of discovered API areas:

| Areas Discovered | Service Type | Action |
|------------------|--------------|--------|
| 1-4 areas | FOCUSED | Auto-proceed to Phase 4 (document all) |
| 5+ areas | LARGE | Proceed to Phase 3 (user selects scope) |

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Service Size Assessment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API Areas Discovered: [N]
Service Type: [FOCUSED / LARGE]

[If FOCUSED]
✅ Focused service detected. Will document all [N] areas.
→ Proceeding to deep discovery...

[If LARGE]
ℹ️ Large service detected. User scoping recommended.
→ Proceeding to area selection...
```

---

### Phase 3: User Scoping (Large Services Only)

**Objective:** Let user select which API areas to document in depth.

Present the discovered areas with their documentation links:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Select API Areas to Document
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This service has [N] API areas. Select which to document in depth:

[ ] 1. Incidents
    └─ https://developer.service.com/api/incidents

[ ] 2. Change Requests
    └─ https://developer.service.com/api/changes

[ ] 3. Service Catalog
    └─ https://developer.service.com/api/catalog

[ ] 4. Users & Groups
    └─ https://developer.service.com/api/users

[ ] 5. Knowledge Base
    └─ https://developer.service.com/api/knowledge

[ ] 6. Other (specify custom area or URL)

Enter numbers separated by commas (e.g., 1,2,3):
>
```

**If user selects "Other":**
```
Enter custom API area name or documentation URL:
>

🔍 Validating...
[If valid URL] ✅ Added: [area name from URL]
[If area name] ✅ Added: [area name] - Will search for documentation
```

**After selection:**
```
Selected areas for deep documentation:
✓ Incidents
✓ Change Requests
✓ Users & Groups

Non-selected areas will be listed in artifact but not documented in depth.

Continue? (Y/n):
```

---

### Phase 4: Deep Discovery

**Objective:** Fetch detailed documentation for each selected area and map operations.

For each selected area:
1. Fetch the area's documentation page
2. Extract all operations (endpoints)
3. Identify core actions using scoring system
4. Track documentation status per operation

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Deep Discovery: [Area Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fetching: [area documentation URL]

Operations discovered:
┌──────────────────────┬────────┬─────────────────────┬────────────┐
│ Operation            │ Method │ Endpoint            │ Status     │
├──────────────────────┼────────┼─────────────────────┼────────────┤
│ Create Entity ⭐    │ POST   │ /api/entity         │ ✅ Docs    │
│ Get Entity ⭐       │ GET    │ /api/entity/{id}    │ ✅ Docs    │
│ List Entities        │ GET    │ /api/entity         │ ✅ Docs    │
│ Update Entity        │ PATCH  │ /api/entity/{id}    │ ✅ Docs    │
│ Delete Entity        │ DELETE │ /api/entity/{id}    │ 🔒 Auth    │
│ Attach File          │ POST   │ /api/entity/attach  │ ⚠️ Partial │
└──────────────────────┴────────┴─────────────────────┴────────────┘

⭐ = Core action (high importance score)
```

**Core Action Identification - Scoring System:**

| Signal | Points |
|--------|--------|
| Create operation on primary resource | +3 |
| Get/Read operation on primary resource | +3 |
| Appears in "Getting Started" guide | +2 |
| Referenced by other operations | +2 |
| Has detailed code examples | +1 |
| Listed first in resource docs | +1 |

**Threshold:** Score >= 3 = Core Action (marked with ⭐)

**Documentation Status Legend:**

| Icon | Status | Meaning |
|------|--------|---------|
| ✅ | Documented | Full documentation available |
| ⚠️ | Partial | Some documentation, missing details |
| 🔒 | Auth-gated | Documentation requires authentication |
| ❓ | Not found | Referenced but no documentation found |

**Repeat for each selected area**, then proceed to Phase 5.

---

### Phase 5: Coverage Assessment & Artifact Creation

**Objective:** Calculate coverage, create hierarchical artifact, and report.

#### 5a. Calculate Per-Resource Coverage

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Documentation Coverage Assessment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────┬──────────┬──────────────────────────────┐
│ Resource           │ Coverage │ Status                       │
├────────────────────┼──────────┼──────────────────────────────┤
│ Incidents ⭐       │ 85%      │ ✅ Good (5/6 operations)     │
│ Change Requests    │ 70%      │ ⚠️ Partial (4/6 operations)  │
│ Users & Groups     │ 40%      │ ⚠️ Limited (2/5 operations)  │
└────────────────────┴──────────┴──────────────────────────────┘

Overall Coverage: 65% (11/17 operations documented)
```

**Coverage Calculation:**
- Per resource: (documented operations / total operations) × 100
- Overall: (total documented / total operations) × 100

#### 5b. Sufficiency Thresholds

| Coverage | Status | Action |
|----------|--------|--------|
| >= 60% | ✅ Proceed | Sufficient for connector generation |
| 40-59% | ⚠️ Warn | Proceed with caution, some assumptions needed |
| < 40% | ❌ Block | Insufficient - request additional documentation |

**If coverage < 40%:**
```
❌ Documentation coverage is insufficient (< 40%).

Connector generation may fail or produce incomplete results.

Options:
[1] Provide additional documentation for low-coverage areas
[2] Proceed anyway (not recommended)

Choice (1/2):
```

#### 5c. Track Inaccessible Documentation

List any documentation that couldn't be accessed:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 Inaccessible Documentation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────┬────────────┬─────────────────────────────────┐
│ Area           │ Status     │ What's Missing                  │
├────────────────┼────────────┼─────────────────────────────────┤
│ Admin APIs     │ 🔒 Auth    │ User management, permissions    │
│ Workflows      │ ❓ Missing │ Referenced in SDK, no REST docs │
│ Reports        │ 🔒 Auth    │ Report generation endpoints     │
└────────────────┴────────────┴─────────────────────────────────┘

These areas are documented in the artifact but not deeply explored.
```

#### 5d. Create Hierarchical Artifact

Read `~/.claude/skills/workflows-connectors-generate/templates/API_REFERENCE_ARTIFACT.md` for structure and create the artifact at `specs/[feature-branch-name]/api-reference.md`.

**CRITICAL:** The Documentation Sources table MUST include:
- All URLs fetched (official documentation pages)
- All user-provided file paths (PDF, MD, HTML, OpenAPI specs)
- All Confluence page URLs
- Raw documentation files saved to `specs/[feature-branch-name]/docs-raw/`

This ensures subsequent steps (`/speckit.scope`, `/speckit.specify`, etc.) can reference the original documentation sources.

```
✅ Documentation analysis complete!

📄 API reference artifact created:
   Location: specs/[feature-branch-name]/api-reference.md
   Artifact Version: 2.0

This artifact contains:
- Service scope (type, selected areas)
- Source quality assessment
- Documentation sources (consolidated links table with file paths)
- Authentication details (type, complexity signals)
- Integration options (SDK and/or HTTP API links)
- API Landscape (hierarchical, per-resource operations)
- Core actions marked with ⭐
- Per-resource coverage percentages
- Listed but not deeply documented areas
- Inaccessible documentation tracking
- Pagination, webhooks, rate limits, error handling
```

---

### Handle Official Source Inaccessibility

When official documentation cannot be loaded (any phase):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Official Documentation Inaccessible
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

URL: https://developer.[service].com/api-reference
Issue: [Authentication required / JavaScript rendering failed / Timeout / Not found]

Why this matters:
- Official documentation ensures accurate connector generation
- Third-party sources may be outdated or incomplete
- Our testing shows accuracy drops from ~93% to ~37% without official docs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Provide Documentation Yourself
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can provide official documentation in these formats:

1. HTML files (downloaded web pages)
   → Save pages from your authenticated browser session
   → Right-click → Save As → Web Page, Complete

2. PDF documents
   → Export from vendor documentation portals
   → Print to PDF from authenticated session

3. Markdown files
   → README files, exported documentation

4. OpenAPI/Swagger specifications (.json, .yaml)
   → Download from vendor's API reference

How to proceed:

[1] Provide documentation files (recommended)
    → I'll wait for you to share file paths

[2] Provide a different official URL to try
    → If you know another official documentation location

[3] Switch to Path B (Internal Service mode)
    → You'll provide all documentation sources manually

[4] Cancel
    → Stop and reconsider approach

Choice (1/2/3/4):
```

**If user chooses [1] - Provide documentation files:**

```
📁 Documentation File Input

Provide paths to your documentation files (one per line).
Supported formats: .html, .pdf, .md, .json, .yaml, .txt

Example:
  ~/docs/[service]-api-reference.pdf
  ~/docs/[service]-auth-guide.html
  ~/specs/[service]-openapi.yaml

Enter file paths (type 'done' when finished):
>
```

After each file:
```
📄 Processing: [filename]
   Type: [PDF document / HTML page / Markdown / OpenAPI spec]
   [Size/pages info if applicable]

   Analyzing content...

✅ Processed successfully
   - Found sections: [list relevant sections detected]
   - Estimated: ~[X] words of technical content
```

**IMPORTANT:** Track all user-provided file paths for the Documentation Sources table in the artifact:
```
userProvidedFiles:
  - path: "[absolute or relative path to file]"
    type: "[PDF / HTML / Markdown / OpenAPI / Text]"
    topic: "[what the file covers: API Reference / Authentication / Webhooks / etc.]"
```

These paths will be saved to the API reference artifact so subsequent steps can reference them.

**If user chooses [2] - Provide different URL:**

```
Enter an alternative official documentation URL:
>

🔍 Validating source...
[If official] ✅ Source verified as OFFICIAL. Attempting fetch...
[If third-party] ⚠️ This appears to be a third-party source ([domain]).
                 Third-party sources are not used automatically.
                 Please provide an official vendor URL or documentation files.
```

---

### 3. Path B: Internal/Custom Service

If user selects Path B:

a. Request documentation:
   ```
   I'll need you to provide documentation. Please add all relevant sources:

   Documentation options:
   1. Confluence page URL
   2. Local documentation file path (.md, .txt, .pdf, .docx)
   3. Internal doc portal URL
   4. OpenAPI spec (if available)

   You can provide multiple sources. The more complete, the better!

   Add source (or 'done' when finished):
   ```

b. For each source:
   - **Confluence URL**: Ask if auth needed, fetch if accessible
   - **File path**: Validate file exists, read content
   - **URL**: Fetch and parse
   - **OpenAPI spec**: Parse structured data

   **Track all sources for the Documentation Sources table:**
   ```
   documentationSources:
     - source: "[URL or file path]"
       type: "[Confluence / File / URL / OpenAPI]"
       topic: "[what it covers]"
       accessible: [true/false]
   ```

c. Confirm sources:
   ```
   Received documentation:
   ✓ [Source 1]
   ✓ [Source 2]

   I'll parse these sources. Note: I won't search for external documentation.
   If something is missing, I'll ask you for it.

   Continue? (Y/n):
   ```

d. **After parsing**, proceed to Phase 4 (Deep Discovery) and Phase 5 (Coverage Assessment) with the provided sources.

---

### 4. Update Context and Report

Update `specs/[feature-branch-name]/connector-context.md` status:
```markdown
- [x] Pre-flight complete
- [x] API documentation gathered  ← UPDATE THIS
- [ ] Connector configured
...
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Documentation Gathering Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Service: [Service Name]
Service Type: [FOCUSED / LARGE]
Areas Documented: [M] of [N] discovered

Summary:
┌─────────────────────┬─────────────────────────────────────┐
│ Metric              │ Value                               │
├─────────────────────┼─────────────────────────────────────┤
│ Auth Type           │ [OAuth2 / API Key / Custom]         │
│ Auth Complexity     │ [Simple / Complex]                  │
│ Integration Options │ [SDK / HTTP API / Both]             │
│ Overall Coverage    │ [X]%                                │
│ Core Actions        │ [N] identified                      │
│ Webhook Support     │ [Yes (N events) / No]               │
│ Pagination          │ [cursor / offset / link-header / N/A]│
└─────────────────────┴─────────────────────────────────────┘

Artifact: specs/[feature-branch-name]/api-reference.md

→ Next: Run /speckit.scope to configure connector details
```

---

## Documentation Fetching

Use a **WebFetch-first strategy** with Playwright as fallback for JavaScript-heavy sites.

### Storage Folder

All fetched documentation should be saved to: `specs/[feature-branch-name]/docs-raw/`

Create this folder if it doesn't exist:
```bash
mkdir -p specs/[feature-branch-name]/docs-raw
```

This keeps raw fetched content separate from processed artifacts.

### Step 1: Try WebFetch First

WebFetch is fast and works well for many documentation sites. Always try it first.

```
Fetching: [url]
```

**If WebFetch succeeds, save the content:**
```bash
# Save WebFetch result to docs-raw folder
# Filename: [service-name]-[topic]-[timestamp].md
```

Use the Write tool to save WebFetch results to `specs/[feature-branch-name]/docs-raw/[topic].md`

### Step 2: Evaluate WebFetch Results

After WebFetch returns, check for these **failure indicators**:

| Indicator | Example | Action |
|-----------|---------|--------|
| Very short content | < 500 characters of text | → Playwright fallback |
| JavaScript framework markers | "Loading...", "Please enable JavaScript", "React app", empty body | → Playwright fallback |
| Navigation-only content | Only menu items, no actual documentation text | → Playwright fallback |
| Error messages | 403, 404, "Access denied", rate limiting | → Try different URL or Path B |
| Redirect to different host | Login page, CDN redirect | → Follow redirect or Path B |

**WebFetch SUCCESS criteria (all must be true):**
- ✅ Content length > 500 characters
- ✅ Contains actual documentation text (not just navigation)
- ✅ No "enable JavaScript" or loading placeholders
- ✅ Relevant API/SDK information present

**If WebFetch succeeds:** Continue with documentation analysis.

### Step 3: Playwright Fallback (if WebFetch fails)

If WebFetch results are insufficient, use Playwright:

**First, verify Playwright is installed:**
```bash
python -c "from playwright.sync_api import sync_playwright; print('Playwright OK')"
```

**If not installed, ask user:**
```
WebFetch returned insufficient content (likely JavaScript-rendered site).

Playwright can render JavaScript pages but requires installation:
  pip install playwright && python -m playwright install chromium

Install Playwright now? (Y/n):
```

**Run Playwright fetch (saves to feature branch docs-raw folder):**
```bash
python .claude/scripts/fetch-docs.py <url> <service-name>-docs specs/[feature-branch-name]/docs-raw
```

**Playwright output files (in specs/[feature-branch-name]/docs-raw/):**
- `<service-name>-docs-<timestamp>.txt` (text content) ← Read this file
- `<service-name>-docs-<timestamp>.html` (full HTML)
- `<service-name>-docs-<timestamp>.png` (screenshot for verification)
- `<service-name>-docs-<timestamp>-metadata.json` (metadata)

### Step 4: If Both Methods Fail

```
❌ Unable to fetch documentation automatically

The site may require:
  - Authentication/login
  - Anti-bot verification
  - VPN or special network access

Options:
1. Switch to Path B (you provide documentation)
2. Try a different documentation URL

Choice (1/2):
```

### Direct File URLs (No Fallback Needed)

WebFetch works reliably for direct file links - no Playwright fallback needed:
- `.json` files (OpenAPI/Swagger specs)
- `.md` files (Markdown documentation)
- `.txt` files (Plain text)
- `.yaml`/`.yml` files (API specs)

---

## Authentication Extraction

When analyzing documentation, extract:

**1. Authentication Method:**
- OAuth2 (look for: "oauth", "OAuth 2.0", authorization/token URLs)
- API Key (look for: "api key", "bearer token", header formats)
- Custom Auth (look for: multiple required fields, basic auth)

**2. OAuth2 Details (if applicable):**
- Grant type indicators:
  - User-based: "user authorization", "three-legged", "authorization code", "redirect URI"
  - Server-to-server: "two-legged", "client credentials", "machine-to-machine"
- Authorization URL (if user-based)
- Token URL
- Scopes available
- Instance/organization URL field needed?

**3. API Key Details (if applicable):**
- What it's called ("API Key", "Access Token", etc.)
- Header format (`Authorization: Bearer`, `X-API-Key:`, etc.)
- Where users obtain it

**4. Custom Auth Details (if applicable):**
- List all required fields
- Field types (URL, username, password, etc.)

**5. Validation Endpoint (optional but helpful):**
- Lightweight endpoint for testing credentials: `/me`, `/user`, `/account`, `/health`

**6. Auth Complexity Signals (note if present):**
- JWT/RSA token generation required
- Environment selection needed (sandbox/production URLs)
- Instance URL or tenant ID required
- Short token lifetime (needs refresh logic)
- Multiple environments with different base URLs

---

## API Integration Options

Identify available options for API integration. Decision on which to use is made later in `/speckit.scope`.

**1. Official SDK/Client Library:**
- Search: "[Service Name] SDK", "[Service Name] npm package", "[Service Name] JavaScript client"
- Check npm registry for official packages
- Note: package name, maintenance status, Promise vs callback API

**2. HTTP/REST API:**
- Direct HTTP calls via httpClient
- Look for REST API documentation, OpenAPI specs

**Store in artifact:**
```
integrationOptions:
  sdk:
    available: true/false
    packageName: "@vendor/service-sdk" (if available)
    docsLink: "https://..." (link to SDK documentation)
    notes: "Promise-based, handles auth automatically" (brief note)
  httpApi:
    available: true/false
    docsLink: "https://..." (link to REST API documentation)
    openApiSpec: "https://..." (if available)
```

**Note:** Both options may be available. The choice depends on:
- Scope of actions/triggers needed
- SDK completeness vs API coverage
- Maintenance and community support

---

## Pagination Detection

**When to extract:** Only if HTTP API path is considered AND API has list/search endpoints.

**What to look for:**
- **Cursor-based**: `after`, `cursor`, `nextToken` parameters
- **Offset/limit**: `offset`, `skip`, `limit`, `per_page` parameters
- **Link headers**: GitHub-style pagination with `Link` header
- **Page-based**: `page`, `pageNumber` parameters

**Extract:**
- Pagination method used
- Parameter names
- Default and maximum page sizes
- Link to pagination documentation

**Store in artifact:**
```
pagination:
  method: "cursor" / "offset" / "link-header" / "page" / "none"
  params: { limit: "limit", cursor: "after" }
  maxPageSize: 100
  docsLink: "https://..."
```

**Skip if:** Service only supports webhooks (no polling needed) or SDK handles pagination internally.

---

## Webhook Capability Detection

Analyze documentation for webhook support.

**Required for OUTBOUND webhook support (all must be present):**
1. Subscription API: `POST /webhooks` that accepts callback URL parameter
2. Deletion API: `DELETE /webhooks/{id}` to unsubscribe
3. Documentation confirms service SENDS webhooks to registered URLs
4. Event types are documented

**Detection Process:**
```
Search for:
  ✓ Webhook subscription endpoint that accepts callback URL
  ✓ Phrases: "service will POST to your URL", "callback URL will receive"
  ✓ Unsubscribe/delete webhook endpoint

Avoid false positives:
  ✗ Endpoints where YOU send TO service (inbound direction)
  ✗ Phrases: "send webhooks to this endpoint", "webhook receiver"

If all requirements met → Webhooks supported
Otherwise → Use POLLING
```

**Store in artifact (links + brief summary only):**
```
webhookCapability:
  supported: true/false
  docsLink: "https://..." (link to webhook documentation)
  eventTypes: ["order.created", "order.updated", "..."] (list available events)
  eventCount: 15 (approximate number of event types)
  verificationMethod: "signature" / "timestamp" / "none" / "unknown"
  notes: "Brief note about webhook setup requirements"
```

**Note:** Detailed payload structures are extracted later in `/speckit.scope` when specific triggers are selected.

---

## Rate Limiting

If rate limiting is documented, capture:
- Docs link to rate limiting section
- Basic limits (requests per minute/hour) if easily found
- Any special headers (X-RateLimit-Remaining, Retry-After)

**Store in artifact:**
```
rateLimiting:
  documented: true/false
  docsLink: "https://..." (if documented)
  notes: "100 req/min, uses X-RateLimit headers" (brief summary)
```

---

## Error Response Structure

Flag how errors are returned. Don't deep-dive, just note the pattern.

**What to look for:**
- Standard HTTP status codes only
- Custom error codes/messages in response body
- Error object structure (if documented)

**Store in artifact:**
```
errorHandling:
  pattern: "standard-http" / "custom-codes" / "unknown"
  docsLink: "https://..." (if error docs exist)
  notes: "Uses error.code and error.message in response body" (if custom)
```

---

## Entity Relationships

Note resource hierarchies and dependencies. Helps inform action/trigger selection in scope.

**What to look for:**
- Parent-child relationships (Company → Contacts → Deals)
- Required parent IDs when creating resources
- Cross-references between resources

**Store in artifact:**
```
entityRelationships:
  hasHierarchy: true/false
  relationships:
    - "Contact belongs to Company"
    - "Deal references Contact and Company"
  notes: "Most resources require organization_id"
```

**Skip if:** API has flat structure with independent resources.

---

## Batch Operations

Note if API supports bulk endpoints. Informs action design in scope.

**What to look for:**
- Bulk create/update/delete endpoints
- Batch retrieval endpoints
- Limits per batch request

**Store in artifact:**
```
batchOperations:
  supported: true/false
  docsLink: "https://..." (if documented)
  notes: "POST /batch supports up to 100 items per request"
```

**Skip if:** No bulk endpoints documented.

---

## Custom API Call Capability

Identify if the service supports a generic API endpoint that allows arbitrary queries or custom API calls. This enables the `createCustomApiCallAction` pattern in connectors.

**What to look for:**
- Generic query endpoint (e.g., `/api/query`, `/graphql`, `/execute`)
- Table/Entity API that accepts any entity name as parameter
- REST API with predictable URL patterns that work across resources
- Documentation for "raw" or "custom" API access

**Indicators of custom API call support:**
- "Make any API call" or "Execute custom query" in docs
- Generic endpoint accepting resource name as parameter
- OpenAPI/Swagger spec showing parameterized paths
- SDK method like `client.request()` or `client.execute()`

**Store in artifact:**
```
customApiCall:
  supported: true/false
  type: [REST_GENERIC / TABLE_API / GRAPHQL / QUERY_ENDPOINT]
  docsLink: "https://..." (if documented)
  pattern: "/api/objects/{objectType}" or similar
  notes: "Allows querying any entity via generic endpoint"
```

**Examples:**
- CRM with generic object API (`/crm/v3/objects/{objectType}`) - any object type can be queried
- Salesforce: SOQL Query endpoint - custom queries supported
- GraphQL APIs: Single endpoint with flexible queries

**Skip if:** API only supports fixed, resource-specific endpoints with no generic access pattern.

---

## Generic API Pattern Detection

When an API has a **generic endpoint pattern** (detected above in Custom API Call Capability), identify candidates for **pre-configured actions** that would provide better UX than the generic action alone.

### What is a Generic API?

An API is "generic" when:
1. **Single endpoint pattern** accepts entity/object/table type as parameter
2. **Same HTTP method** works across all entity types
3. **Body structure is consistent** (fields vary, but pattern is the same)

**Generic API patterns:**
```
✅ Generic: POST /api/objects/{objectType}
✅ Generic: POST /crm/v3/objects/{objectType}
✅ Generic: GET /data/{entityName}
❌ Not Generic: POST /prospects, POST /workers/{id}/jobChanges (different patterns per resource)
```

### Pre-configured Action Candidates

**If a generic API is detected**, identify entities that should have dedicated pre-configured actions in addition to the generic action.

**Criterion 1: High-frequency entity**
The entity is a **primary use case** for the service - what users most commonly interact with.

Look for:
- Entities featured prominently in "Getting Started" guides
- Entities used as examples throughout documentation
- Entities mentioned in service's value proposition
- Core domain objects (e.g., `Contact` for a CRM, `Order` for e-commerce)

**Criterion 2: Complex/cumbersome entity**
The entity has fields that benefit from **encapsulation** in a dedicated action.

Look for:
- Fields with magic values (numeric codes like 1, 2, 3 that map to High/Medium/Low)
- Reference fields requiring lookups (IDs of related entities)
- Required field combinations that aren't obvious
- Non-intuitive field names
- Fields with specific formats or validation rules
- State machine fields (status transitions)

### Store in artifact:

```
genericApiPattern:
  detected: true/false
  pattern: "/api/objects/{objectType}" (if detected)

  preconfiguredCandidates:
    - entity: "contact"
      criterion: "high-frequency"
      reason: "Primary CRM object, featured in all getting-started examples"

    - entity: "deal"
      criterion: "high-frequency"
      reason: "Core sales workflow object"

    - entity: "ticket"
      criterion: "complex"
      reason: "Has priority (1-5 codes), status workflow, required assignment fields"

    - entity: "invoice"
      criterion: "complex"
      reason: "Requires line items, tax calculations, payment terms with specific formats"
```

**Note:** This information is used in `/speckit.scope` to suggest both generic actions AND pre-configured actions for the identified candidates. The user will decide which approach to use.

---

## Key Rules

### Official Sources Only
- **NEVER use third-party sources** (Microsoft, Workato, Zapier, blogs, community sites)
- **ALWAYS validate URLs** against the Official Source Policy before fetching
- **If official docs are inaccessible**, prompt user to provide documentation files - do NOT fall back to third-party sources
- **User-provided files** (HTML, PDF, MD, OpenAPI) are acceptable alternatives to official online docs

### Track All Documentation Sources
- **ALWAYS save file paths** for user-provided documentation (PDF, MD, HTML, OpenAPI, etc.) to the API reference artifact
- **Include in Documentation Sources table**: Topic, full path, type (User-Provided), and brief description
- **Track raw fetched docs**: Save WebFetch/Playwright results to `specs/[feature-branch-name]/docs-raw/` and include paths in artifact
- **Why this matters**: Subsequent steps (`/speckit.scope`, `/speckit.specify`, etc.) need to reference original sources

### Documentation Quality
- **Assess sufficiency** after fetching - check for required items (auth, base URL, endpoints)
- **Warn user** if critical information is missing before proceeding
- **Track source type** (Official / User-Provided) in the artifact

### Process
- **Always read connector context first** from `specs/[feature-branch-name]/connector-context.md`
- **Use WebFetch-first strategy** for fetching documentation (see "Documentation Fetching" section)
- Fall back to Playwright only when WebFetch returns insufficient content
- Direct file URLs (.json, .md, .txt, .yaml) work reliably with WebFetch alone
- Create the API reference artifact before completing
- The artifact location should be `specs/[feature-branch-name]/api-reference.md`
- Update context status after completion
- Point user to `/speckit.scope` as next step
