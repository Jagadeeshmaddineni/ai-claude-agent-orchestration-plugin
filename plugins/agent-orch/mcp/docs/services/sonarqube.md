# SonarQube

[< Back to docs hub](../README.md) | [< Back to MCP README](../../README.md)

Connects to SonarQube Server or SonarCloud — projects, quality gates, issues,
security hotspots, measures, coverage, duplications, and system status. **27 tools.**

## Overview

Reads code-quality data and (with `scope: "write"`) can change issue / hotspot
status and create webhooks. Default scope is **`read`** — SonarQube is intended to be
read-only unless you explicitly opt in to write.

## Configuration

```json
{
  "sonarqube": {
    "enabled": true,
    "url": "https://sonarqube.bpdevops.co.uk",
    "token": "YOUR_SONARQUBE_TOKEN",
    "organization": "",
    "scope": "read"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `enabled` | yes | Register this service's tools |
| `url` | no | SonarQube Server URL, or `https://sonarcloud.io` for SonarCloud (default) |
| `token` | yes | User token from My Account → Security |
| `organization` | SonarCloud only | Your SonarCloud organization key |
| `scope` | no | `"read"` (default) or `"write"` |

### Getting a token

1. Your SonarQube instance → profile icon → **My Account** → **Security**.
2. Under **Tokens**, enter a name and click **Generate**.
3. Copy immediately (shown only once).

> For SonarCloud, use <https://sonarcloud.io/account/security>.

## Tools

| Tool | Scope | Description |
|------|-------|-------------|
| `sonarqube_searchProjects` | read | Search projects by name or key (call first to find a projectKey). |
| `sonarqube_getQualityGateStatus` | read | Get the Quality Gate pass/fail status for a project. |
| `sonarqube_listQualityGates` | read | List all Quality Gates and their conditions. |
| `sonarqube_searchIssues` | read | Search bugs, vulnerabilities, and code smells (supports PR/new-code filters). |
| `sonarqube_searchSecurityHotspots` | read | Search security hotspots in a project. |
| `sonarqube_showSecurityHotspot` | read | Get detailed info about a specific security hotspot. |
| `sonarqube_showRule` | read | Get details about a rule (description, severity, impacts). |
| `sonarqube_getComponentMeasures` | read | Get metrics for a project/component (ncloc, coverage, etc.). |
| `sonarqube_searchFilesByCoverage` | read | List files sorted by coverage (worst first). |
| `sonarqube_getRawSource` | read | Get a file's source code as raw text. |
| `sonarqube_getScmInfo` | read | Get SCM author/commit info per line for a file. |
| `sonarqube_getFileCoverageDetails` | read | Get line-by-line coverage details for a file. |
| `sonarqube_getDuplications` | read | Get code duplication details for a file. |
| `sonarqube_searchDuplicatedFiles` | read | Search for files with code duplications. |
| `sonarqube_listPullRequests` | read | List all pull requests for a project. |
| `sonarqube_listLanguages` | read | List supported programming languages. |
| `sonarqube_searchMetrics` | read | Search available metrics (keys, names, types). |
| `sonarqube_getSystemHealth` | read | Get instance health (GREEN/YELLOW/RED). |
| `sonarqube_getSystemStatus` | read | Get server state, version, and server ID. |
| `sonarqube_systemPing` | read | Ping the server (returns "pong"). |
| `sonarqube_getSystemInfo` | read | Get detailed system info (requires Administer). |
| `sonarqube_getSystemLogs` | read | Get server system logs (app, ce, es, web, access, deprecation). |
| `sonarqube_listWebhooks` | read | List configured webhooks. |
| `sonarqube_listPortfolios` | read | List portfolios (aggregated project views). |
| `sonarqube_changeIssueStatus` | write | Accept, mark false-positive, or reopen an issue. |
| `sonarqube_changeSecurityHotspotStatus` | write | Change a hotspot's review status / resolution. |
| `sonarqube_createWebhook` | write | Create a project or global webhook. |

## Scope behaviour

Default `scope: "read"` registers the 24 read tools only. Set `scope: "write"` to
also enable the 3 write tools (`sonarqube_changeIssueStatus`,
`sonarqube_changeSecurityHotspotStatus`, `sonarqube_createWebhook`).
