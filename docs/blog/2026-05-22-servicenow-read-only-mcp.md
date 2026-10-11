# Read-Only ServiceNow MCP: From `requests.get` to `servicenow_searchTickets`

**Author**: SS&C AI Tools team
**Audience**: SS&C plugin authors, anyone running Claude Code against ServiceNow

If you've ever stuffed `requests.get(BASE_URL, auth=(SNOW_USER, SNOW_PASS), params={...})` into a script, you know the routine: hand-roll the URL, hand-roll the pagination, hand-roll the catalog-variable knowledge, hope the next maintainer rediscovers the gotchas you wrote down in `SERVICENOW_NOTES.md`.

Today we're shipping a **read-only ServiceNow service inside the local MCP server** that comes bundled with the [ssnc-agent-orch plugin](../../README.md). Eight tools, Basic auth, all the scope-gating you'd expect from the other MCP services we ship. The motivating use case is [`ddq-tools`](../../../jbeedbe/ddq-tools/README.md) — but the same MCP service works for any repo that wants to read incidents, catalog tasks, the CMDB, or business units.

This post explains why we built it, the auth design we landed on, the architecture, and how to migrate from raw API calls.

## Why we built it

`ddq-tools` is the obvious motivator. It's a Python toolkit that helps the Global Sales DDQ team triage catalog requests, and every script in `ddq-tools/scripts/snow_*.py` ends up doing the same things:

- Read `SNOW_USER` / `SNOW_PASS` from the environment
- Hit `https://ssctech.service-now.com/api/now/table/sc_task`
- Pass an encoded `sysparm_query` for the DDQ assignment-group filter
- Page through results with `sysparm_offset` until a partial page returns
- Decode catalog variables (`variables.client`, `variables.business_unit`, …) carefully because the names changed between the 2025 and 2026 catalog items
- Re-implement all of the above next quarter when somebody adds a new report

When that team starts using Claude Code on the same repo, the LLM has no idea what `variables.please_enter_name_referenced_above_as_other` means, why `variables.*` filters silently return wrong data, or that `assignment_groupLIKEDDQ` needs five `^NOT LIKE` clauses to filter out BCP/Privacy/Risk/Third-party/Intralinks. The agent ends up reinventing the same Python paginator the team already has — usually with worse error handling.

The MCP service moves all of that knowledge into one place where every agent in every repo can use it.

## The Basic auth challenge

ServiceNow doesn't issue API tokens the way Atlassian Cloud does. Authentication is a username and password sent as HTTP Basic auth. That's awkward for tooling that assumes a single secret slot — and it's awkward for an MCP config file that already has a `token` field on every other service.

We considered three options:

**Option 1 — pipe-delimited single field.** Stuff `username|password` into the existing `apiKey`-shaped slot and parse it on the server side. Tempting because it fits one secret slot. Rejected because it's a pessimization: the next person to read the config has to figure out what the pipe means, and any tool that escapes pipes (or treats them as shell metacharacters) breaks.

**Option 2 — separate `username` and `password` fields.** Two fields in JSON config; two env vars (`SNOW_USER`, `SNOW_PASS`). Mirrors what `ddq-tools` already does, mirrors how every shell user thinks about this. Rejected by some because "two secrets in one config" feels weird, but ServiceNow has decided for us — Basic auth is the auth.

**Option 3 — both.** Accept either form. Adds code paths that no one will exercise.

We picked **Option 2**. Here's the contract:

```json
{
  "servicenow": {
    "enabled": true,
    "url": "https://ssctech.service-now.com",
    "username": "your.username",
    "password": "your-password",
    "scope": "read"
  }
}
```

Or, equivalently, env vars:

```bash
export SNOW_URL=https://ssctech.service-now.com
export SNOW_USER=your.username
export SNOW_PASS=your-password
```

The MCP service builds the `Authorization: Basic <base64(user:pass)>` header **inside** the `getAuthHeaders` closure at request time, so the credentials never leave that closure scope. There is no logging of the password anywhere in the client; `MCPError.toJSON()` does not include the Authorization header; auth failures get a ServiceNow-specific hint pointing at `SNOW_USER` / `SNOW_PASS`.

## Architecture

The service is a straight clone of the [SonarQube service pattern](../../plugins/agent-orch/mcp/src/services/sonarqube/), with five files:

```
plugins/agent-orch/mcp/src/services/servicenow/
├── client.ts     # extends BaseHttpClient — searchTable, getRecord, getRecordByNumber
├── schemas.ts    # zod schemas; every tool tagged `scope: 'read'`
├── tools.ts      # getServiceNowToolsByScope (mirrors getSonarQubeToolsByScope)
├── service.ts    # implements IToolService — scope check, dispatch, business_unit fallback
└── index.ts      # barrel
```

A few decisions worth calling out:

- **Default scope is `read`.** The configured scope filters which tools are visible to the LLM. v1 only ships read tools, but the service-level scope check still runs on every call so any future write tool is automatically gated unless someone flips `"scope": "write"`.
- **Pagination is not auto-iterative.** Table API pages can be huge. We expose `limit` and `offset` to the LLM and let it page itself. Default `limit` is 1000; ServiceNow's hard cap is 10000.
- **`sysparm_display_value=true` by default.** Reference fields come back as human-readable names instead of sys_ids — what callers want 95% of the time. Pass `displayValue: false` for raw or `'all'` for both.
- **`sysparm_exclude_reference_link=true` always.** Strips out the URL blobs ServiceNow loves to embed. Less noise, smaller LLM contexts.
- **`listBusinessUnits` falls back to `core_company`** if the instance doesn't expose `business_unit` (it's not enabled everywhere). The response includes `source: 'core_company', fallback: true` so the LLM knows.

## Migrating `ddq-tools` from raw API to MCP

Here's a representative excerpt from `ddq-tools/scripts/snow_rpts_by_client.py` today:

```python
import os
import requests

BASE_URL = "https://ssctech.service-now.com/api/now/table/sc_task"
SNOW_QUERY_BASE = (
    "stateIN3%2C4%2C7"
    "%5Eassignment_groupLIKEDDQ"
    "%5Eassignment_groupNOT%20LIKEbcp"
    "%5Eassignment_groupNOT%20LIKEthird"
    "%5Eassignment_groupNOT%20LIKEprivacy"
    "%5Eassignment_groupNOT%20LIKErisk"
    "%5EITEMNOTAudit%20Request"
)

def fetch():
    user = os.environ["SNOW_USER"]
    pwd  = os.environ["SNOW_PASS"]
    results, offset, batch = [], 0, 1000
    while True:
        r = requests.get(BASE_URL, auth=(user, pwd), params={
            "sysparm_query": SNOW_QUERY_BASE,
            "sysparm_fields": ",".join(ALL_FIELDS),
            "sysparm_display_value": "true",
            "sysparm_limit": str(batch),
            "sysparm_offset": str(offset),
        })
        page = r.json()["result"]
        if not page: break
        results.extend(page)
        if len(page) < batch: break
        offset += batch
    return results
```

After cutting over to the MCP, an agent doing the same job runs one tool call:

```jsonc
// LLM-issued via MCP — no env handling, no auth, no manual URL construction
{
  "tool": "servicenow_searchTickets",
  "arguments": {
    "query": "stateIN3,4,7^assignment_groupLIKEDDQ^assignment_groupNOT LIKEbcp^assignment_groupNOT LIKEthird^assignment_groupNOT LIKEprivacy^assignment_groupNOT LIKErisk^ITEMNOTAudit Request",
    "fields": [
      "closed_at", "opened_at", "number", "assigned_to",
      "requested_for", "assignment_group", "state",
      "variables.client", "variables.please_list_other_clients",
      "variables.business_unit", "variables.request_type_master",
      "variables.consultant_ddq_const",
      "variables.products_applications_provided_to_the_client_old",
      "variables.please_enter_name",
      "variables.please_enter_name_referenced_above_as_other",
      "variables.all_products_applications_in_scope",
      "variables.sales_type", "variables.revenue",
      "variables.requester", "variables.name_s"
    ],
    "limit": 1000
  }
}
```

The agent paginates by re-invoking with `offset: 1000`, `2000`, … until it sees a partial page. The `sc_task` knowledge — that catalog variables must be requested explicitly, that `variables.*` cannot be filtered server-side, that the request-type field name differs between catalog years — lives in the tool description and is permanently in the agent's context.

For the report scripts that aren't going away, the Python code can keep its own `requests` calls. The MCP service is for **reading and reasoning** in Claude Code, not for replacing the offline reporting pipelines.

## Tool reference

| Tool | Purpose |
|------|---------|
| `servicenow_searchTickets` | Query `sc_task`. Supports `sysparm_query`, `sysparm_fields`, pagination, display value control. |
| `servicenow_getTicket` | Get one `sc_task` by `sys_id` XOR `number` (e.g. `SCTASK0012345`). |
| `servicenow_searchIncidents` | Query the `incident` table. Same shape as searchTickets. |
| `servicenow_getIncident` | Get one incident by `sys_id` XOR `number` (e.g. `INC0098765`). |
| `servicenow_searchCMDB` | Query `cmdb_ci` with optional `ciClass` (maps to `sys_class_name=…`). |
| `servicenow_getCMDBItem` | Get one CI by `sys_id`. Optional `table` override for class-specific tables (e.g. `cmdb_ci_server`). |
| `servicenow_listBusinessUnits` | List `business_unit`; falls back to `core_company` on instances that don't expose it. |
| `servicenow_listTables` | Static metadata — what tables this MCP service knows about. Useful for tool discovery. |

All eight default to `sysparm_display_value=true` and `sysparm_exclude_reference_link=true`. Override per call as needed.

## Future work

- **Write tools.** ServiceNow ticket assignment, comment posting, state transitions. We deliberately scoped v1 read-only so the auth + scope plumbing is proven before any mutation lands.
- **OAuth.** ServiceNow's OAuth flow is more involved than Basic auth and not every team has the OAuth app provisioned. Adding OAuth is a follow-up — the `getAuthHeaders` closure already supports any header strategy, so the change is local to `client.ts`.
- **Catalog item provisioning / approvals.** Out of scope for the read-only MCP; better suited to a dedicated workflow plugin.

## Try it

```bash
# 1. Pull the new plugin version
/agent-orch:upgrade-plugin

# 2. Configure ServiceNow
/agent-orch:mcp-setup       # walks you through every service

# 3. Start the MCP server
/agent-orch:mcp-start

# 4. Enable in Claude Code
/mcp                        # toggle servicenow on
```

Then, in any conversation, you can ask:

> "Find all DDQ catalog tasks closed in the last 30 days for client Intralinks. Show me the requester, business unit, and revenue."

The agent will issue `servicenow_searchTickets`, paginate if needed, and present the answer. No env vars to set per repo, no `requests` boilerplate, no rediscovering catalog variable names.

If you've got a use case that isn't `ddq-tools`, file an issue against [AITOOLS](https://jira.ssnc-corp.cloud/browse/AITOOLS-65) and tell us what tables you need.
