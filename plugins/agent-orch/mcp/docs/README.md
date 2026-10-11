# MCP Server — Setup & Configuration

[< Back to MCP README](../README.md)

The complete setup, configuration, and troubleshooting reference for the agent-orch
local MCP server. The server connects Claude Code (and Cline) to Jira, Confluence,
TestRail, Azure DevOps, Playwright, SonarQube, SS&C Cloud, and ServiceNow over
HTTP + Server-Sent Events.

- For a high-level overview and architecture, see the [MCP README](../README.md).
- For the full tool catalog of a service, see its [service reference page](#service-reference).

## Prerequisites

**Bun** — the server runs on [Bun](https://bun.sh) (a fast JavaScript runtime), not
Node. If it isn't installed, `/agent-orch:mcp-start` will prompt you to install it.

Manual installation:

- **Windows:** `powershell -c "irm bun.sh/install.ps1 | iex"`
- **macOS / Linux:** `curl -fsSL https://bun.sh/install | bash`

## Quick Start

### Claude Code

1. Run `/agent-orch:mcp-setup` and select the services to enable.
2. Add your API tokens to `~/.claude/mcp-config.json`.
3. Run `/agent-orch:mcp-start` to start the server.
4. Run `/mcp` and enable the services you need.

Claude Code reads MCP config at session start — **restart Claude Code** (or start a
new session) after changing `~/.claude/mcp-config.json` or `~/.claude.json`.

### Cline

Cline talks to the same server over SSE. See [Cline registration](#cline) below for
the settings paths and endpoint block.

## Getting API Tokens

### Jira (DataCenter)

1. Go to your Jira DataCenter instance (e.g. `https://jira.ssnc-corp.cloud/`).
2. Profile icon → **API token authentication**.
3. **New API Token**, set permissions to **Read & Write**.
4. Copy the token immediately (shown only once).

### Jira (Cloud / Atlassian Cloud)

1. Go to <https://id.atlassian.com/manage-profile/security/api-tokens>.
2. **Create API token**, give it a label.
3. Copy immediately (shown only once).
4. You also need your Atlassian account email and site name (e.g. `ssctech` from
   `ssctech.atlassian.net`).

### Confluence (DataCenter)

1. Go to your Confluence DataCenter instance (e.g. `https://confluence.ssnc-corp.cloud/`).
2. Profile → **Settings** tab → **Personal Access Tokens**.
3. **Create token**, set permissions to **Read & Write**.
4. Copy immediately (shown only once).

### Confluence (Cloud / Atlassian Cloud)

Uses the **same** API token as Jira Cloud — both are managed from your Atlassian
account. Create or reuse the token at
<https://id.atlassian.com/manage-profile/security/api-tokens>, with the same email
and site name as Jira Cloud.

### TestRail

1. Go to your TestRail instance (e.g. `https://blueprism.testrail.io`).
2. Click your name (top right) → **My Settings**.
3. **API Keys** tab → **Add Key**.
4. Copy the key immediately (shown only once).
5. **Click Save Settings at the bottom of the page** — otherwise the key is lost.

### Azure DevOps

1. Go to <https://dev.azure.com/>.
2. **User Settings** → **Personal access tokens**.
3. **+ New Token**, set **Scope** to **Full access**.
4. Copy immediately (shown only once).

> You need one PAT per organization, or select "All accessible organizations" for a
> single PAT.

### Playwright (Browser Automation)

Playwright needs browser binaries installed. After enabling it in your config:

```bash
# Install Chromium (run once)
npx playwright install chromium
# Or install all browsers
npx playwright install
```

> Playwright support requires running the server with `bun run dev` (not the compiled
> binary) due to Playwright's binary dependencies.

### SonarQube

1. Go to your SonarQube instance (e.g. `https://sonarqube.bpdevops.co.uk/`).
2. Profile icon → **My Account** → **Security**.
3. Under **Tokens**, enter a name and click **Generate**.
4. Copy immediately (shown only once).

> For SonarCloud, use <https://sonarcloud.io/account/security>.

### SS&C Cloud

Obtain an API key from the SS&C Cloud portal (`https://portal.ssnc-corp.cloud`) under
your account / API access settings. SS&C Cloud is read-only.

### ServiceNow

ServiceNow uses your instance **username and password** (Basic Auth) rather than a
token. Use a service account with read access to the tables you need
(`sc_task`, `incident`, `cmdb_ci`, `business_unit` / `core_company`).

## Configuration

After running `/agent-orch:mcp-setup`, your credentials live in
`~/.claude/mcp-config.json`. The loader (`src/config.ts`) searches these paths in
order and uses the first that exists:

1. `$MCP_CONFIG_PATH` (explicit override)
2. Cline's settings directory (`mcp-config.json` — see [Cline](#cline))
3. `~/.claude/mcp-config.json` (Claude Code)
4. `.env` fallback (legacy)

### Top-level fields

| Field | Default | Description |
|-------|---------|-------------|
| `port` | `13999` | Port the server listens on |
| `logging` | `true` | Write tool-call logs (see [Logging](#logging)) |

### DataCenter example

For Jira DataCenter and Confluence DataCenter instances:

```json
{
  "port": 13999,
  "jira": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "jira.ssnc-corp.cloud",
    "token": "YOUR_JIRA_TOKEN",
    "scope": "write"
  },
  "confluence": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "confluence.ssnc-corp.cloud",
    "token": "YOUR_CONFLUENCE_TOKEN",
    "scope": "write"
  }
}
```

### Cloud example (Atlassian Cloud)

For Jira Cloud and Confluence Cloud (`*.atlassian.net`):

```json
{
  "port": 13999,
  "jira": {
    "enabled": true,
    "deploymentType": "cloud",
    "host": "ssctech.atlassian.net",
    "email": "you@example.com",
    "token": "YOUR_ATLASSIAN_API_TOKEN",
    "scope": "write"
  },
  "confluence": {
    "enabled": true,
    "deploymentType": "cloud",
    "host": "ssctech.atlassian.net",
    "email": "you@example.com",
    "token": "YOUR_ATLASSIAN_API_TOKEN",
    "scope": "write"
  }
}
```

> For Cloud, `host` accepts any form of your Atlassian URL — `"ssctech"`,
> `"ssctech.atlassian.net"`, or `"https://ssctech.atlassian.net/"` all work. The
> server extracts the site name automatically.

### Full example (all services)

```json
{
  "port": 13999,
  "logging": true,
  "jira": {
    "enabled": true,
    "deploymentType": "cloud",
    "host": "ssctech.atlassian.net",
    "email": "you@example.com",
    "token": "YOUR_ATLASSIAN_API_TOKEN",
    "scope": "write"
  },
  "confluence": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "confluence.ssnc-corp.cloud",
    "token": "YOUR_CONFLUENCE_TOKEN",
    "scope": "write"
  },
  "testrail": {
    "enabled": false,
    "url": "https://blueprism.testrail.io",
    "email": "your.email@example.com",
    "apiKey": "YOUR_TESTRAIL_API_KEY",
    "scope": "write"
  },
  "azureDevOps": {
    "enabled": false,
    "baseUrl": "https://dev.azure.com",
    "organizations": {
      "org-id": {
        "name": "Organization Name",
        "token": "YOUR_ADO_TOKEN"
      }
    },
    "scope": "write"
  },
  "playwright": {
    "enabled": false,
    "headless": true,
    "browserType": "chromium",
    "defaultTimeout": 30000,
    "screenshotDir": "./screenshots",
    "scope": "write"
  },
  "sonarqube": {
    "enabled": false,
    "url": "https://sonarqube.bpdevops.co.uk",
    "token": "YOUR_SONARQUBE_TOKEN",
    "organization": "",
    "scope": "read"
  },
  "sscCloud": {
    "enabled": false,
    "url": "https://portal.ssnc-corp.cloud",
    "apiKey": "YOUR_SSC_CLOUD_API_KEY"
  },
  "servicenow": {
    "enabled": false,
    "url": "https://your-instance.service-now.com",
    "username": "YOUR_SNOW_USER",
    "password": "YOUR_SNOW_PASS",
    "scope": "read"
  }
}
```

Per-service field reference lives on each [service page](#service-reference).

### Deployment type (Jira / Confluence)

The `deploymentType` field controls authentication and which API endpoints are used:

| Field | `"datacenter"` | `"cloud"` |
|-------|----------------|-----------|
| Auth | Bearer token (`token`) | Basic Auth (`email` + `token`) |
| Jira URL | `https://{host}/rest/api/2` | `https://{host}.atlassian.net/rest/api/2` (and `/rest/api/3` for some endpoints) |
| Confluence URL | `https://{host}/rest/api` | `https://{host}.atlassian.net/wiki/rest/api` |
| User identifier | `username` | `accountId` |
| Required fields | `host`, `token` | `host`, `email`, `token` |

If `deploymentType` is omitted, **Jira defaults to `"cloud"`** and **Confluence
defaults to `"datacenter"`**.

### Scope

Each service (except SS&C Cloud) has a `scope` setting that filters which tools
register:

- `"write"` — all tools (read + create/update/delete).
- `"read"` — read-only tools (no modifications).

Defaults vary by service: Jira, Confluence, TestRail, Azure DevOps, and Playwright
default to `"write"`; SonarQube and ServiceNow default to `"read"`. SS&C Cloud has no
`scope` field — it is always read-only.

## Claude Code registration

`/agent-orch:mcp-setup` writes the credentials to `~/.claude/mcp-config.json` and the
SSE endpoints to `~/.claude.json` under `mcpServers`. Each enabled service gets one
entry pointing at its `/sse/<service>` route:

```json
{
  "mcpServers": {
    "jira":        { "type": "sse", "url": "http://localhost:13999/sse/jira" },
    "confluence":  { "type": "sse", "url": "http://localhost:13999/sse/confluence" },
    "testrail":    { "type": "sse", "url": "http://localhost:13999/sse/testrail" },
    "azuredevops": { "type": "sse", "url": "http://localhost:13999/sse/azuredevops" },
    "playwright":  { "type": "sse", "url": "http://localhost:13999/sse/playwright" },
    "sonarqube":   { "type": "sse", "url": "http://localhost:13999/sse/sonarqube" },
    "ssccloud":    { "type": "sse", "url": "http://localhost:13999/sse/ssccloud" },
    "servicenow":  { "type": "sse", "url": "http://localhost:13999/sse/servicenow" }
  }
}
```

Include only the services you enabled, and preserve any other existing `mcpServers`
entries and keys in `~/.claude.json`. Match the port to `mcp-config.json` (default
`13999`).

## <a name="cline"></a>Cline registration

Cline connects to the **same** server over SSE. Two files are involved:

1. **Credentials** — `mcp-config.json` in Cline's settings directory (same schema as
   the Claude Code config above). Platform-specific path
   (`getClineSettingsDir()` in `src/config.ts`):

   | Platform | Path |
   |----------|------|
   | macOS | `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/mcp-config.json` |
   | Linux | `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/mcp-config.json` |
   | Windows | `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\mcp-config.json` |

   The loader checks this directory **before** `~/.claude/mcp-config.json`, so Cline
   users can keep credentials here.

2. **Endpoints** — `cline_mcp_settings.json` in the same settings directory. Register
   each service as an SSE server pointing at `http://localhost:13999/sse/<service>`,
   mirroring the Claude Code `mcpServers` block above.

Start the server the same way (`/agent-orch:mcp-start` or `bin/mcp-ctl start`), then
enable the servers in Cline's MCP panel.

## How it connects

The server runs `Bun.serve()` on port `13999` and exposes one SSE endpoint pair per
service:

- `GET /sse/<service>` — the SSE stream the client connects to.
- `POST /sse/<service>/message` — the client posts JSON-RPC messages here.
- `GET /health` — returns `agent-orch-mcp`, the version, and the list of configured
  services.

Services: `jira`, `confluence`, `testrail`, `azuredevops`, `playwright`, `sonarqube`,
`ssccloud`, `servicenow`.

## Commands

| Command | Description |
|---------|-------------|
| `/agent-orch:mcp-setup` | Configure services and write the config files |
| `/agent-orch:mcp-start` | Start the MCP server |
| `/agent-orch:mcp-stop` | Stop the MCP server |

You can also drive it directly with the control script:

```bash
bin/mcp-ctl start      # start (runs `bun run src/index.ts`)
bin/mcp-ctl stop       # stop
bin/mcp-ctl status     # is it running?
bin/mcp-ctl check-setup
```

Playwright requires `bun run dev` rather than the compiled binary.

## Logging

The server logs tool-call inputs and outputs to `~/.claude/logs/mcp-server.log` as
structured JSON — useful for debugging tool calls.

- **Enabled by default** — no configuration needed.
- **Rotation** — files rotate at 5 MB, keeping up to 5 files (25 MB total).
- **Truncation** — responses are truncated to 500 characters in logs.

To disable logging, set `"logging": false` in `~/.claude/mcp-config.json`:

```json
{
  "port": 13999,
  "logging": false
}
```

## Troubleshooting

### Services not visible after setup

Claude Code reads MCP config at session start. **Restart Claude Code** or start a new
session.

### "Needs authentication" error

The connection state is cached. In the `/mcp` panel, **toggle the service off and
on**.

### Port already in use

Change `port` in `~/.claude/mcp-config.json` to an available port, and update the URLs
in `~/.claude.json` to match.

### Connection closed errors

1. Check the server is running: `/agent-orch:mcp-start` (or `bin/mcp-ctl status`).
2. Check health: <http://localhost:13999/health>.
3. Toggle the service off/on in the `/mcp` panel.

## <a name="service-reference"></a>Service reference

Full tool catalogs, per-service config fields, and scope behaviour:

| Service | Tools | Default scope | Reference |
|---------|------:|---------------|-----------|
| Jira | 39 | write | [services/jira.md](services/jira.md) |
| Azure DevOps | 34 | write | [services/azuredevops.md](services/azuredevops.md) |
| SS&C Cloud | 33 | read (enforced) | [services/ssccloud.md](services/ssccloud.md) |
| SonarQube | 27 | read | [services/sonarqube.md](services/sonarqube.md) |
| Playwright | 21 | write | [services/playwright.md](services/playwright.md) |
| Confluence | 11 | write | [services/confluence.md](services/confluence.md) |
| TestRail | 9 | write | [services/testrail.md](services/testrail.md) |
| ServiceNow | 8 | read | [services/servicenow.md](services/servicenow.md) |
| **Total** | **182** | | |
