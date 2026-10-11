# Confluence

[< Back to docs hub](../README.md) | [< Back to MCP README](../../README.md)

Connects to a Confluence instance — pages, spaces, comments, labels, and user
search. **11 tools.**

## Overview

Works against both **Atlassian Cloud** and **Confluence DataCenter**. The
`deploymentType` field selects auth and endpoints:

| | `"datacenter"` | `"cloud"` |
|--|----------------|-----------|
| Auth | Bearer token (`token`) | Basic Auth (`email` + `token`) |
| Base URL | `https://{host}/rest/api` | `https://{host}.atlassian.net/wiki/rest/api` |
| Required fields | `host`, `token` | `host`, `email`, `token` |

If `deploymentType` is omitted, Confluence defaults to **`"datacenter"`**. Default
scope is **`write`**.

## Configuration

```json
{
  "confluence": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "confluence.ssnc-corp.cloud",
    "token": "YOUR_CONFLUENCE_TOKEN",
    "scope": "write"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `enabled` | yes | Register this service's tools |
| `deploymentType` | no | `"datacenter"` (default) or `"cloud"` |
| `host` | yes | Hostname (Cloud accepts site name or full URL) |
| `email` | cloud only | Atlassian account email |
| `token` | yes | API token / Personal Access Token |
| `scope` | no | `"write"` (default) or `"read"` |

### Getting a token

**DataCenter:** profile → **Settings** → **Personal Access Tokens** → **Create
token**, set permissions to **Read & Write**, copy immediately.

**Cloud:** reuses the same Atlassian API token as Jira Cloud — create or reuse one at
<https://id.atlassian.com/manage-profile/security/api-tokens>, with the same email
and site name as Jira Cloud.

## Tools

| Tool | Scope | Description |
|------|-------|-------------|
| `confluence_getContent` | read | Get a page by ID (title, body, version, metadata). |
| `confluence_searchContent` | read | Search pages, blog posts, and attachments using CQL. |
| `confluence_createContent` | write | Create a new page or blog post in a space. |
| `confluence_updateContent` | write | Update an existing page (requires current version number). |
| `confluence_getSpaces` | read | List all accessible spaces. |
| `confluence_searchSpace` | read | Search for spaces by name or key. |
| `confluence_getPageChildren` | read | Get child pages under a parent page. |
| `confluence_getComments` | read | Get comments and discussions on a page. |
| `confluence_getLabels` | read | Get labels (tags) attached to a page. |
| `confluence_addLabel` | write | Add a label to a page for categorization. |
| `confluence_searchUser` | read | Search for users by name, email, or username. |

## Scope behaviour

With `scope: "read"`, the 3 `write` tools (`confluence_createContent`,
`confluence_updateContent`, `confluence_addLabel`) are dropped; the 8 read tools
remain.
