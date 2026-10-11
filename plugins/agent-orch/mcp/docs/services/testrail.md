# TestRail

[< Back to docs hub](../README.md) | [< Back to MCP README](../../README.md)

Connects to a TestRail instance — projects, suites, sections, and test cases.
**9 tools.**

## Overview

Authenticates with an email + API key against a TestRail URL. Default scope is
**`write`**.

## Configuration

```json
{
  "testrail": {
    "enabled": true,
    "url": "https://blueprism.testrail.io",
    "email": "your.email@example.com",
    "apiKey": "YOUR_TESTRAIL_API_KEY",
    "scope": "write"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `enabled` | yes | Register this service's tools |
| `url` | yes | TestRail instance URL |
| `email` | yes | Account email |
| `apiKey` | yes | API key from My Settings → API Keys |
| `scope` | no | `"write"` (default) or `"read"` |

### Getting an API key

1. Click your name (top right) → **My Settings**.
2. Go to the **API Keys** tab → **Add Key**.
3. Copy the key immediately (shown only once).
4. **Click Save Settings at the bottom of the page** — otherwise the key is lost.

## Tools

| Tool | Scope | Description |
|------|-------|-------------|
| `testrail_getProjects` | read | List all TestRail projects. |
| `testrail_getSuites` | read | Get test suites for a project. |
| `testrail_getSections` | read | Get test case sections (folders) in a project. |
| `testrail_getCase` | read | Get a single test case by ID. |
| `testrail_getCases` | read | Search/list test cases with filters. |
| `testrail_addCase` | write | Create a new test case. |
| `testrail_updateCase` | write | Update an existing test case. |
| `testrail_getCaseTypes` | read | Get available test case types. |
| `testrail_getCaseFields` | read | Get all case fields including custom fields. |

## Scope behaviour

With `scope: "read"`, the 2 `write` tools (`testrail_addCase`,
`testrail_updateCase`) are dropped; the 7 read tools remain.
