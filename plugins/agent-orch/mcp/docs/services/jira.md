# Jira

[< Back to docs hub](../README.md) | [< Back to MCP README](../../README.md)

Connects Claude Code (and Cline) to a Jira instance — issues, comments, projects,
transitions, boards, sprints, and attachments. **39 tools.**

## Overview

Works against both **Atlassian Cloud** (`*.atlassian.net`) and **Jira DataCenter**
(self-hosted). The `deploymentType` field selects the auth scheme and API endpoints:

| | `"datacenter"` | `"cloud"` |
|--|----------------|-----------|
| Auth | Bearer token (`token`) | Basic Auth (`email` + `token`) |
| Base URL | `https://{host}/rest/api/2` | `https://{host}.atlassian.net/rest/api/2` (and `/rest/api/3` for some endpoints) |
| User identifier | `username` | `accountId` |
| Required fields | `host`, `token` | `host`, `email`, `token` |

If `deploymentType` is omitted, Jira defaults to **`"cloud"`**. Default scope is
**`write`** (all tools register).

## Configuration

DataCenter:

```json
{
  "jira": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "jira.ssnc-corp.cloud",
    "token": "YOUR_JIRA_TOKEN",
    "scope": "write"
  }
}
```

Cloud:

```json
{
  "jira": {
    "enabled": true,
    "deploymentType": "cloud",
    "host": "ssctech.atlassian.net",
    "email": "you@example.com",
    "token": "YOUR_ATLASSIAN_API_TOKEN",
    "scope": "write"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `enabled` | yes | Register this service's tools |
| `deploymentType` | no | `"cloud"` (default) or `"datacenter"` |
| `host` | yes | Hostname. Cloud accepts `"ssctech"`, `"ssctech.atlassian.net"`, or the full URL — the site name is extracted automatically |
| `email` | cloud only | Atlassian account email (Basic Auth) |
| `token` | yes | API token / Personal Access Token |
| `scope` | no | `"write"` (default) or `"read"` |

### Getting a token

**DataCenter:** profile icon → **API token authentication** → **New API Token**,
set permissions to **Read & Write**, copy immediately (shown only once).

**Cloud:** create at <https://id.atlassian.com/manage-profile/security/api-tokens>.
You also need your Atlassian account email and site name (e.g. `ssctech` from
`ssctech.atlassian.net`). Confluence Cloud reuses this same token.

## Tools

| Tool | Scope | Description |
|------|-------|-------------|
| `jira_getIssue` | read | Get full details of a single Jira issue by its key (e.g. PROJ-123). For multiple issues use `jira_searchIssues`. |
| `jira_searchIssues` | read | Search issues using JQL. Use `fields` to limit the response size. |
| `jira_createIssue` | write | Create a new issue (bug, task, story, epic). Check `jira_getIssueTypes` and `jira_getRequiredFields` first. |
| `jira_updateIssue` | write | Update fields on an existing issue (summary, description, custom fields). |
| `jira_deleteIssue` | write | Permanently delete an issue (cannot be undone). |
| `jira_getIssueComments` | read | Get all comments and discussion on an issue. |
| `jira_postIssueComment` | write | Add a comment to an issue (supports wiki markup). |
| `jira_getAllProjects` | read | List all accessible projects. |
| `jira_getProject` | read | Get detailed info about a specific project. |
| `jira_getIssueTypes` | read | Get available issue types for a project (find valid issue type IDs). |
| `jira_getComponents` | read | Get components (subsystems/modules) for a project. |
| `jira_getVersions` | read | Get versions (releases, milestones) for a project. |
| `jira_getPriorities` | read | Get all available priority levels. |
| `jira_getTransitions` | read | Get available workflow transitions for an issue. |
| `jira_transitionIssue` | write | Change the status of an issue (To Do → In Progress → Done). |
| `jira_searchUsers` | read | Search for users by name, email, or username. |
| `jira_getCurrentUser` | read | Get the currently authenticated user. |
| `jira_getUserProfile` | read | Get a user's profile (accountId for Cloud, username for DataCenter). |
| `jira_assignIssue` | write | Assign an issue to a user, or pass null to unassign. |
| `jira_addWatcher` | write | Add a user as a watcher on an issue. |
| `jira_removeWatcher` | write | Remove a user from an issue's watchers. |
| `jira_getIssueLinkTypes` | read | Get available issue link types (Blocks, Relates to, etc.). |
| `jira_linkIssues` | write | Create a relationship link between two issues. |
| `jira_getFields` | read | Get all fields (system + custom). |
| `jira_getFieldById` | read | Get details of a specific field by ID. |
| `jira_getCustomFields` | read | Get only custom fields (IDs like `customfield_10001`). |
| `jira_getRequiredFields` | read | Get mandatory fields for a project + issue type before creating. |
| `jira_searchFields` | read | Search for fields by name (case-insensitive). |
| `jira_getAllBoards` | read | List all Agile boards (Scrum, Kanban, Simple). |
| `jira_getBoardIssues` | read | Get all issues visible on a board. |
| `jira_getSprintsFromBoard` | read | List sprints on a Scrum board (filter by state). |
| `jira_getSprintIssues` | read | Get all issues in a specific sprint. |
| `jira_createSprint` | write | Create a new sprint on a Scrum board. |
| `jira_updateSprint` | write | Update a sprint (name, dates, goal, state). |
| `jira_batchCreateIssues` | write | Create multiple issues in a single API call. |
| `jira_getAttachments` | read | Get attachment metadata on an issue. |
| `jira_downloadAttachment` | read | Download a single attachment by ID (returns base64). |
| `jira_uploadAttachment` | write | Upload a base64-encoded file attachment to an issue. |
| `jira_deleteAttachment` | write | Delete an attachment by ID (cannot be undone). |

## Scope behaviour

With `scope: "read"`, only the `read` tools above register. The 14 `write` tools
(`jira_createIssue`, `jira_updateIssue`, `jira_deleteIssue`, `jira_postIssueComment`,
`jira_transitionIssue`, `jira_assignIssue`, `jira_addWatcher`, `jira_removeWatcher`,
`jira_linkIssues`, `jira_createSprint`, `jira_updateSprint`, `jira_batchCreateIssues`,
`jira_uploadAttachment`, `jira_deleteAttachment`) are dropped.
