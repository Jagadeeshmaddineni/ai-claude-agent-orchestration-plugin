# agent-orch MCP Server

A local [Model Context Protocol](https://modelcontextprotocol.io) server that
connects Claude Code (and Cline) to the tools your team already uses. It exposes
**182 tools across 8 services** over HTTP + Server-Sent Events, runs on
[Bun](https://bun.sh), and speaks MCP over JSON-RPC.

> **Setting it up?** [`docs/README.md`](docs/README.md) is the full configuration,
> registration, and troubleshooting hub. This page is the overview, followed by a
> [developer's guide](#developers-guide-adding-a-service) for adding new services.

## What this is

- **One local server, many services.** Jira, Confluence, TestRail, Azure DevOps,
  Playwright, SonarQube, SS&C Cloud, and ServiceNow — each enabled independently.
- **HTTP + SSE, not stdio.** The server listens on port `13999` and exposes one SSE
  endpoint pair per service; clients register those URLs (see
  [How it connects](#how-it-connects)).
- **Scope-aware.** Every tool is tagged `read` or `write`; a per-service `scope`
  setting controls which tools register. Some services are read-only by design.
- **Bun runtime.** Started with `/agent-orch:mcp-start` (or `bin/mcp-ctl start`),
  which runs `bun run src/index.ts`.

## Services

| Service | Tools | Default scope | Covers |
|---------|------:|---------------|--------|
| [Jira](docs/services/jira.md) | 39 | write | issues, comments, projects, transitions, boards, sprints, attachments |
| [Azure DevOps](docs/services/azuredevops.md) | 34 | write | repos, PRs, work items, pipelines, build logs |
| [SS&C Cloud](docs/services/ssccloud.md) | 33 | read (enforced) | projects, IAM, Kubernetes, compute, network, CMDB |
| [SonarQube](docs/services/sonarqube.md) | 27 | read | quality gates, issues, hotspots, coverage, duplications |
| [Playwright](docs/services/playwright.md) | 21 | write | browser navigation, interaction, snapshots, screenshots |
| [Confluence](docs/services/confluence.md) | 11 | write | pages, spaces, comments, labels |
| [TestRail](docs/services/testrail.md) | 9 | write | projects, suites, sections, test cases |
| [ServiceNow](docs/services/servicenow.md) | 8 | read | catalog tasks, incidents, CMDB, business units |
| **Total** | **182** | | |

Each service page lists every tool with its scope and description, the exact config
block, and how scope filtering affects it.

## Quick start (Claude Code)

1. `/agent-orch:mcp-setup` — select services to enable.
2. Add your API tokens to `~/.claude/mcp-config.json`.
3. `/agent-orch:mcp-start` — start the server.
4. `/mcp` — enable the services you need.

Claude Code reads MCP config at session start, so **restart Claude Code** after
editing the config. Full token/setup detail: [`docs/README.md`](docs/README.md).

## Quick start (Cline)

Cline talks to the same server over SSE. See
[`docs/README.md#cline`](docs/README.md#cline) for the settings paths and the SSE
endpoint block.

## How it connects

The server runs `Bun.serve()` on port `13999` (configurable) and exposes, for each
service:

- `GET /sse/<service>` — the SSE stream the client connects to.
- `POST /sse/<service>/message` — where the client posts JSON-RPC messages.
- `GET /health` — returns `agent-orch-mcp`, version, and configured services.

Clients register the SSE URLs rather than spawning a subprocess. For Claude Code they
go in `~/.claude.json` under `mcpServers`, one entry per enabled service:

```json
{
  "mcpServers": {
    "jira": { "type": "sse", "url": "http://localhost:13999/sse/jira" }
  }
}
```

See [`docs/README.md`](docs/README.md) for the full block and the Cline equivalent.

## Configuration & scope

Credentials live in `~/.claude/mcp-config.json` (Cline users can use Cline's settings
directory instead — the loader checks it first). Each service block has an `enabled`
flag and, for most services, a `scope` of `"read"` or `"write"` that filters which
tools load. SS&C Cloud and ServiceNow are read-only; SonarQube defaults to read. The
full schema, deployment-type table, and per-service examples are in
[`docs/README.md`](docs/README.md).

## Running manually

```bash
bin/mcp-ctl start        # start the server (bun run src/index.ts)
bin/mcp-ctl stop         # stop it
bin/mcp-ctl status       # check whether it's running
bin/mcp-ctl check-setup  # validate config / environment

bun run dev              # required for Playwright (uses source, not the binary)
```

Health check: <http://localhost:13999/health>.

---

# Developer's Guide: Adding a Service

The rest of this document is for **developers adding a new service** (a new MCP
"connector"). For end-user setup and token instructions, see
[docs/README.md](docs/README.md).

## Table of Contents

- [Architecture](#architecture)
- [Request lifecycle](#request-lifecycle)
- [Anatomy of a service](#anatomy-of-a-service)
- [Adding a new service](#adding-a-new-service)
  - [Step 1 — scaffold the service folder](#step-1--scaffold-the-service-folder)
  - [Step 2 — schemas.ts](#step-2--schemasts)
  - [Step 3 — client.ts](#step-3--clientts)
  - [Step 4 — tools.ts](#step-4--toolsts)
  - [Step 5 — service.ts](#step-5--servicets)
  - [Step 6 — index.ts](#step-6--indexts)
  - [Step 7 — wire it into the app](#step-7--wire-it-into-the-app)
- [Read vs write scope](#read-vs-write-scope)
- [Error handling](#error-handling)
- [Running and testing locally](#running-and-testing-locally)
- [Building binaries](#building-binaries)
- [Wiring checklist](#wiring-checklist)

---

## Architecture

The server uses a layered design with manual dependency injection (no DI
framework). There are three layers plus shared utilities:

```
src/
├── index.ts                 # entry point → bootstrap()
├── composition-root.ts      # wires config + services + server together
├── config.ts                # loads JSON / .env config into typed Config
│
├── presentation/            # transport layer (HTTP/SSE/JSON-RPC)
│   ├── http-server.ts       #   Bun.serve, routes /sse/<service> endpoints
│   ├── sse-session.ts        #   SSE session manager + ServiceType union
│   ├── mcp-handler.ts        #   JSON-RPC → initialize/tools.list/tools.call
│   └── tool-registry.ts      #   maps ServiceType → IToolService
│
├── shared/                  # cross-cutting utilities
│   ├── http/base-client.ts  #   BaseHttpClient (fetch wrapper: get/post/...)
│   ├── errors/mcp-error.ts  #   MCPError + handleApiError + helpers
│   ├── interfaces/          #   IToolService, IHttpClient
│   ├── types/common.ts      #   ToolDefinition, ToolScope, HttpResponse
│   ├── utils/               #   zodToJsonSchema
│   └── logger.ts            #   pino structured logging
│
└── services/                # one folder per connector
    └── <service>/
        ├── schemas.ts       #   Zod schemas + tool metadata (source of truth)
        ├── client.ts        #   typed HTTP client (extends BaseHttpClient)
        ├── tools.ts         #   schemas → MCP ToolDefinition[] + scope filter
        ├── service.ts       #   IToolService impl: dispatch + transform
        └── index.ts         #   barrel re-exports
```

**Key idea:** every service implements the same
[`IToolService`](src/shared/interfaces/tool-service.ts) interface, is registered
under a `ServiceType` key in the `ToolRegistry`, and gets its own SSE endpoint.
Adding a service is mostly mechanical: follow the existing pattern and wire up a
handful of touchpoints.

---

## Request lifecycle

1. Claude Code connects to `GET /sse/<service>` →
   [`HttpServer.handleSSEConnection`](src/presentation/http-server.ts) creates an
   SSE session bound to a `ServiceType` and replies with the message-post URL.
2. Claude POSTs JSON-RPC to `/sse/<service>/message?sessionId=...` →
   [`MCPHandler.handleMessage`](src/presentation/mcp-handler.ts) dispatches:
   - `initialize` → server capabilities
   - `tools/list` → `registry.getTools(serviceType)` (already scope-filtered)
   - `tools/call` → `registry.executeTool(serviceType, name, args)`
3. `ToolRegistry` looks up the `IToolService` for that `ServiceType` and calls
   `executeTool`, which validates args with Zod, calls the client, and returns a
   transformed result.
4. `MCPHandler` JSON-stringifies the result into an MCP `content` block and the
   `SSESessionManager` streams it back over SSE.

---

## Anatomy of a service

Every service folder has the same five files. Using `sonarqube` as the reference:

| File | Responsibility |
|------|---------------|
| `schemas.ts` | **Source of truth.** A `const` object mapping tool name → `{ scope, description, schema }` where `schema` is a Zod object. Also exports the `<Service>ToolName` union type. |
| `client.ts` | A class extending [`BaseHttpClient`](src/shared/http/base-client.ts). Owns auth headers, URL building, and one method per API call. Returns raw API shapes. Implements `isConfigured()`. |
| `tools.ts` | Pure functions that turn `schemas.ts` into MCP `ToolDefinition[]` via `zodToJsonSchema`, plus a `getXToolsByScope(scope)` filter. |
| `service.ts` | The `IToolService` implementation. Constructs the client, exposes `getTools()`, and in `executeTool()` validates args, enforces scope, dispatches by tool name, and **transforms** raw client responses into clean LLM-friendly output. |
| `index.ts` | Barrel file re-exporting the service, client, schemas, and tools. |

The separation matters: `client.ts` knows the external API, `service.ts` knows
MCP and shapes the data, `schemas.ts` is the contract both sides agree on.

---

## Adding a new service

We'll build a fictional `widget` service that talks to a `WidgetTracker` REST
API. It has two read tools (`widget_search`, `widget_get`) and one write tool
(`widget_create`).

### Step 1 — scaffold the service folder

```bash
mkdir -p src/services/widget
cd src/services/widget
# create the five files
```

### Step 2 — `schemas.ts`

`schemas.ts` is the single source of truth. Each entry declares its `scope`
(`'read'` or `'write'`), a description the LLM sees, and a Zod input schema. Use
`.describe()` on every field — that text becomes the JSON Schema description the
model reads.

```ts
import { z } from 'zod';

export const widgetSchemas = {
  widget_search: {
    scope: 'read' as const,
    description:
      'Search widgets by name or status. Returns up to `limit` matches.',
    schema: z.object({
      query: z.string().optional().describe('Free-text search over widget names.'),
      status: z.enum(['active', 'archived']).optional().describe('Filter by status.'),
      limit: z.number().int().min(1).max(100).optional().describe('Page size (default 25).'),
    }),
  },
  widget_get: {
    scope: 'read' as const,
    description: 'Get a single widget by its ID.',
    schema: z.object({
      id: z.string().describe('Widget ID (e.g. WID-123).'),
    }),
  },
  widget_create: {
    scope: 'write' as const,
    description: 'Create a new widget. Requires write scope.',
    schema: z.object({
      name: z.string().describe('Display name for the new widget.'),
      status: z.enum(['active', 'archived']).optional().describe('Initial status (default active).'),
    }),
  },
} as const;

export type WidgetToolName = keyof typeof widgetSchemas;

export function getWidgetSchema(name: WidgetToolName) {
  return widgetSchemas[name];
}
```

> **`zodToJsonSchema` is intentionally minimal** — see
> [src/shared/utils/zod-to-json-schema.ts](src/shared/utils/zod-to-json-schema.ts).
> It handles `string`, `number`, `boolean`, `array`, `enum`, `record`, nested
> `object`, `optional`, and `nullable`. If you need a Zod feature it doesn't
> cover (e.g. `union`, `refine`-driven JSON Schema), either keep the schema
> within supported types or extend the converter. `.refine()` still runs at
> parse time in `service.ts` even though it doesn't appear in the JSON Schema —
> see ServiceNow's `getTicket` for the "exactly one of" pattern.

### Step 3 — `client.ts`

Extend `BaseHttpClient`. The base class gives you `get`, `post`, `put`,
`delete`, `getText`, and `postForm`, all of which call `handleApiError` on
non-2xx responses. You provide `baseUrl`, a `serviceName` (used in error
messages), and a `getAuthHeaders()` closure evaluated per request.

```ts
import { BaseHttpClient, notConfiguredError } from '../../shared';

export interface WidgetConfig {
  enabled: boolean;
  url: string;
  token: string;
  scope?: 'read' | 'write';
}

export interface WidgetRecord {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export class WidgetClient extends BaseHttpClient {
  private readonly widgetConfig: WidgetConfig;

  constructor(config: WidgetConfig) {
    super({
      baseUrl: (config.url || '').replace(/\/+$/, ''),
      serviceName: 'Widget',
      getAuthHeaders: () => ({ Authorization: `Bearer ${config.token}` }),
    });
    this.widgetConfig = config;
  }

  isConfigured(): boolean {
    if (!this.widgetConfig.enabled) return false;
    return !!(this.widgetConfig.url && this.widgetConfig.token);
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw notConfiguredError('Widget', ['url', 'token']);
    }
  }

  async search(params: { query?: string; status?: string; limit?: number }): Promise<{ widgets: WidgetRecord[] }> {
    this.ensureConfigured();
    const qs: Record<string, string> = {};
    if (params.query) qs.q = params.query;
    if (params.status) qs.status = params.status;
    qs.limit = String(params.limit ?? 25);
    const res = await this.get<{ widgets: WidgetRecord[] }>('/api/widgets', qs);
    return res.data;
  }

  async get(id: string): Promise<WidgetRecord> {
    this.ensureConfigured();
    const res = await this.get<WidgetRecord>(`/api/widgets/${encodeURIComponent(id)}`);
    return res.data;
  }

  async create(body: { name: string; status?: string }): Promise<WidgetRecord> {
    this.ensureConfigured();
    const res = await this.post<WidgetRecord>('/api/widgets', body);
    return res.data;
  }
}
```

### Step 4 — `tools.ts`

This is boilerplate — copy [services/servicenow/tools.ts](src/services/servicenow/tools.ts)
and rename. It converts schemas to `ToolDefinition[]` and filters by scope.

```ts
import { ToolDefinition, ToolScope, zodToJsonSchema } from '../../shared';
import { widgetSchemas } from './schemas';

export function generateWidgetTools(): ToolDefinition[] {
  return Object.entries(widgetSchemas).map(([name, def]) => ({
    name,
    description: def.description,
    inputSchema: zodToJsonSchema(def.schema),
    scope: def.scope,
  }));
}

export function getWidgetToolsByScope(configScope: ToolScope): ToolDefinition[] {
  const all = generateWidgetTools();
  if (configScope === 'write') return all;
  return all.filter((tool) => tool.scope === 'read');
}

export const widgetTools = generateWidgetTools();
```

### Step 5 — `service.ts`

The `IToolService` implementation. Three responsibilities in `executeTool`:
1. **validate** the tool exists and parse args with the Zod schema,
2. **enforce scope** (reject write tools when configured read-only),
3. **dispatch** by tool name and **transform** the raw client response.

```ts
import { IToolService, ToolDefinition, ToolScope, toolNotFoundError } from '../../shared';
import { WidgetClient, WidgetConfig } from './client';
import { widgetSchemas, WidgetToolName } from './schemas';
import { getWidgetToolsByScope } from './tools';

export class WidgetService implements IToolService {
  readonly serviceName = 'widget';

  private readonly client: WidgetClient;
  private readonly scope: ToolScope;

  constructor(config: WidgetConfig) {
    this.client = new WidgetClient(config);
    this.scope = config.scope || 'write';
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getTools(): ToolDefinition[] {
    return getWidgetToolsByScope(this.scope);
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (!(toolName in widgetSchemas)) {
      throw toolNotFoundError(this.serviceName, toolName);
    }

    const toolDef = widgetSchemas[toolName as WidgetToolName];

    // Scope gate: write tools require write scope.
    if (toolDef.scope === 'write' && this.scope === 'read') {
      throw new Error(
        `[${this.serviceName}] Tool "${toolName}" requires write scope, but service is configured with read-only scope`
      );
    }

    const parsed = toolDef.schema.parse(args);

    switch (toolName as WidgetToolName) {
      case 'widget_search':
        return this.search(parsed as { query?: string; status?: string; limit?: number });
      case 'widget_get':
        return this.client.get((parsed as { id: string }).id);
      case 'widget_create':
        return this.client.create(parsed as { name: string; status?: string });
      default: {
        const _exhaustive: never = toolName as never;
        throw toolNotFoundError(this.serviceName, _exhaustive);
      }
    }
  }

  private async search(args: { query?: string; status?: string; limit?: number }): Promise<unknown> {
    const { widgets } = await this.client.search(args);
    // Transform: project only the fields the LLM needs.
    return {
      widgets: widgets.map((w) => ({ id: w.id, name: w.name, status: w.status })),
      total: widgets.length,
    };
  }
}
```

> **Transform deliberately.** The client returns raw API shapes; `service.ts`
> should project down to a compact, predictable structure. Large nested API
> responses waste tokens and confuse the model. Look at how
> [sonarqube/service.ts](src/services/sonarqube/service.ts) flattens paging and
> drops fields the model doesn't need.

### Step 6 — `index.ts`

```ts
export { WidgetService } from './service';
export { WidgetClient } from './client';
export type { WidgetConfig, WidgetRecord } from './client';
export { widgetSchemas, getWidgetSchema } from './schemas';
export type { WidgetToolName } from './schemas';
export { widgetTools, generateWidgetTools, getWidgetToolsByScope } from './tools';
```

### Step 7 — wire it into the app

Five touchpoints outside the service folder. Miss one and the service won't load
or won't be reachable.

**7a. `config.ts` — define the typed config (four edits):**

```ts
// 1. Add the runtime interface
export interface WidgetConfig {
  enabled: boolean;
  url: string;
  token: string;
  scope?: ToolScope;
}

// 2. Add it to the Config interface
export interface Config {
  // ...existing fields...
  widget: WidgetConfig;
}

// 3. Add the JSON shape to JsonConfig
interface JsonConfig {
  // ...existing fields...
  widget?: {
    enabled?: boolean;
    url?: string;
    token?: string;
    scope?: ToolScope;
  };
}

// 4a. Map it in getConfig() — JSON branch
widget: {
  enabled: jsonConfig.widget?.enabled ?? false,
  url: jsonConfig.widget?.url || '',
  token: jsonConfig.widget?.token || '',
  scope: jsonConfig.widget?.scope ?? 'write',
},

// 4b. Map it in getConfig() — .env fallback branch
widget: {
  enabled: hasValidToken(get('WIDGET_TOKEN')),
  url: get('WIDGET_URL') || '',
  token: get('WIDGET_TOKEN'),
  scope: (get('WIDGET_SCOPE') as ToolScope) || 'write',
},
```

**7b. `composition-root.ts` — construct and register:**

```ts
import { WidgetService } from './services/widget';

// inside createContainer(), alongside the other services:
const widgetService = new WidgetService(config.widget);
registry.registerService('widget', widgetService);
```

**7c. `presentation/sse-session.ts` — add to the `ServiceType` union:**

```ts
export type ServiceType =
  | 'jira'
  // ...existing...
  | 'servicenow'
  | 'widget';
```

**7d. `presentation/http-server.ts` — add the SSE endpoint:**

```ts
private readonly endpoints: ServiceEndpoint[] = [
  // ...existing...
  { path: '/sse/widget', messagePath: '/sse/widget/message', serviceType: 'widget' },
];
```

**7e. `mcp-config.example.json` — add an example block** so users know the shape:

```json
"widget": {
  "enabled": false,
  "url": "https://widgets.example.com",
  "token": "",
  "scope": "write"
}
```

Then add token-acquisition instructions to [docs/README.md](docs/README.md) and a
per-service page under [docs/services/](docs/services/).

That's it. Restart the server (`bun run dev`) and the new endpoint appears in the
startup log and at `GET /health`.

---

## Read vs write scope

Scope is enforced in two places, and both matter:

1. **Tool visibility** — `getXToolsByScope(scope)` in `tools.ts` filters the
   tool list returned by `tools/list`. A read-only deployment never *sees* write
   tools.
2. **Execution gate** — `service.ts` re-checks scope in `executeTool` before
   dispatch. This is defense-in-depth: even if a write tool name is somehow
   called, a read-only service rejects it.

Conventions from existing services:
- Default scope is `'write'` for most services, **`'read'` for SonarQube and
  ServiceNow** (they're read-oriented by design).
- Tag each schema entry with `scope: 'read' as const` or `'write' as const`.
- A read-only-today service should still keep the scope plumbing in place so a
  future write tool is gated automatically — see the comments in
  [servicenow/service.ts](src/services/servicenow/service.ts).

---

## Error handling

Use the shared error helpers from `src/shared` — don't invent your own:

- **`handleApiError(service, response, context)`** — called automatically by
  `BaseHttpClient` on non-2xx. Maps HTTP status → typed `MCPError` (401/403 →
  `AUTH_FAILED`, 404 → `NOT_FOUND`, 429 → `RATE_LIMITED`, etc.) with an
  actionable hint. You rarely call this directly.
- **`notConfiguredError(service, fields)`** — throw from your client's
  `ensureConfigured()` when credentials are missing.
- **`toolNotFoundError(service, toolName)`** — throw for unknown tool names.
- **`MCPError`** — construct directly when you need a service-specific message.
  See ServiceNow's `rethrowWithSnowHint` for upgrading a generic `AUTH_FAILED`
  into instance-specific guidance.

Thrown errors are caught in [`MCPHandler.handleToolsCall`](src/presentation/mcp-handler.ts),
logged, and returned to the client as an MCP error content block (`isError:
true`) — they don't crash the server.

---

## Running and testing locally

```bash
# install deps (once)
bun install

# run in dev/watch mode — required for Playwright; safest default
bun run dev

# health check (lists every service + configured status)
curl http://localhost:13999/health
```

**Test a single tool without an MCP client** via the debug endpoint
([http-server.ts](src/presentation/http-server.ts) `POST /test/tool`):

```bash
curl -X POST http://localhost:13999/test/tool \
  -H 'Content-Type: application/json' \
  -d '{
    "service": "widget",
    "name": "widget_search",
    "arguments": { "query": "gadget", "limit": 5 }
  }'
```

This runs `registry.executeTool` directly and returns the JSON result — the
fastest way to iterate on a new tool. Point your config at a real (or mock) API
first; `enabled` must be `true` and credentials present, or `isConfigured()`
short-circuits with a `NOT_CONFIGURED` error.

**Logs** stream to `~/.claude/logs/mcp-server.log` as structured JSON (tool
inputs/outputs, durations, errors). Disable with `"logging": false` in config.

---

## Building binaries

The MCP control script ([bin/mcp-ctl](bin/mcp-ctl)) prefers a compiled binary in
`bin/` and falls back to `bun run dev`. Build targets are in
[package.json](package.json):

```bash
bun run build:darwin-arm64   # Apple Silicon
bun run build:darwin-x64     # Intel Mac
bun run build:linux          # Linux x64
bun run build:windows        # Windows x64
```

> Binaries are git-ignored (`bin/mcp-server-*`). The `build` script delegates to
> a `build.sh` that is not committed — use the per-platform `build:*` scripts
> above directly. **Playwright must run from source** (`bun run dev`), not the
> compiled binary, because it shells out to browser binaries.

---

## Wiring checklist

When adding a service, tick every box:

```
Service folder (src/services/<name>/)
[ ] schemas.ts   — tool map with scope + Zod schema, <Name>ToolName union
[ ] client.ts    — extends BaseHttpClient, isConfigured(), one method per call
[ ] tools.ts     — generate<Name>Tools + get<Name>ToolsByScope
[ ] service.ts   — IToolService: getTools + executeTool (validate/scope/dispatch/transform)
[ ] index.ts     — barrel re-exports

Wiring (outside the folder)
[ ] config.ts            — <Name>Config interface
[ ] config.ts            — added to Config interface
[ ] config.ts            — added to JsonConfig
[ ] config.ts            — mapped in getConfig() JSON branch
[ ] config.ts            — mapped in getConfig() .env branch
[ ] composition-root.ts  — construct + registry.registerService('<name>', ...)
[ ] sse-session.ts       — added to ServiceType union
[ ] http-server.ts       — added to endpoints[] array

Docs & verification
[ ] mcp-config.example.json — example block
[ ] docs/README.md          — token instructions
[ ] docs/services/<name>.md — per-service tool catalog
[ ] curl /health shows the service
[ ] curl /test/tool exercises each tool
```
