# ServiceNow

[< Back to docs hub](../README.md) | [< Back to MCP README](../../README.md)

Read-only access to ServiceNow — catalog tasks, incidents, CMDB, and business units.
**8 tools, all read-only.**

## Overview

Authenticates with a username + password against a ServiceNow instance URL. All tools
are tagged `scope: 'read'`; default scope is **`read`**. Adding write capability would
require code changes, so in practice this service is read-only.

Several search tools share a common parameter shape: `query` (encoded
`sysparm_query`), `fields` (projection — catalog variables like `variables.client`
must be requested explicitly), `limit`, `offset`, and `displayValue`
(`true` | `false` | `"all"`).

## Configuration

```json
{
  "servicenow": {
    "enabled": true,
    "url": "https://your-instance.service-now.com",
    "username": "YOUR_SNOW_USER",
    "password": "YOUR_SNOW_PASS",
    "scope": "read"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `enabled` | yes | Register this service's tools |
| `url` | yes | ServiceNow instance URL |
| `username` | yes | ServiceNow username |
| `password` | yes | ServiceNow password |
| `scope` | no | `"read"` (default) |

## Tools

| Tool | Scope | Description |
|------|-------|-------------|
| `servicenow_searchTickets` | read | Search catalog tasks (`sc_task`); supports `query`, `fields`, and catalog variables. |
| `servicenow_getTicket` | read | Get a single catalog task by `sys_id` or `number` (e.g. SCTASK0012345). |
| `servicenow_searchIncidents` | read | Search incidents (same parameter shape as searchTickets). |
| `servicenow_getIncident` | read | Get a single incident by `sys_id` or `number` (e.g. INC0098765). |
| `servicenow_searchCMDB` | read | Search the CMDB (`cmdb_ci`); optional `ciClass` narrows to a class. |
| `servicenow_getCMDBItem` | read | Get a single CMDB configuration item by `sys_id`. |
| `servicenow_listBusinessUnits` | read | List business units (falls back to `core_company`). |
| `servicenow_listTables` | read | List the ServiceNow tables this service supports (static — no API call). |

## Scope behaviour

All 8 tools are read-only and always register when the service is enabled. Adding a
write tool in the future would also require extending `ServiceNowToolName` and the
service-level scope check.
