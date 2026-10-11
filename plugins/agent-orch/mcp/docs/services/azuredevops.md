# Azure DevOps

[< Back to docs hub](../README.md) | [< Back to MCP README](../../README.md)

Connects to Azure DevOps — organizations, projects, repositories, pull requests,
work items, pipelines, build logs, and build tags. **34 tools.**

## Overview

Supports **multiple organizations**, each with its own Personal Access Token (PAT).
Organizations are keyed by an arbitrary org ID in the config; every tool takes an
`organization` argument that matches one of those keys. Default scope is **`write`**.

## Configuration

```json
{
  "azureDevOps": {
    "enabled": true,
    "baseUrl": "https://dev.azure.com",
    "organizations": {
      "org-id": {
        "name": "Organization Name",
        "token": "YOUR_ADO_TOKEN"
      }
    },
    "scope": "write"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `enabled` | yes | Register this service's tools |
| `baseUrl` | no | Defaults to `https://dev.azure.com` |
| `organizations` | yes | Map of `org-id → { name, token }`. One PAT per org (or a single all-orgs PAT). |
| `scope` | no | `"write"` (default) or `"read"` |

### Getting a token

1. <https://dev.azure.com/> → **User Settings** → **Personal access tokens**.
2. **+ New Token**, set **Scope** to **Full access**.
3. Copy immediately (shown only once).

> You need one PAT per organization, or select "All accessible organizations" for a
> single PAT.

## Tools

| Tool | Scope | Description |
|------|-------|-------------|
| `azuredevops_listOrganizations` | read | List configured organizations (call first to discover org IDs). |
| `azuredevops_listProjects` | read | List all projects in an organization. |
| `azuredevops_listRepositories` | read | List all Git repositories in a project. |
| `azuredevops_getRepository` | read | Get details about a repository (default branch, size, URL). |
| `azuredevops_listBranches` | read | List all branches in a repository. |
| `azuredevops_listCommits` | read | Get commit history for a repository or branch. |
| `azuredevops_createRepository` | write | Create a new Git repository. |
| `azuredevops_createBranch` | write | Create a new branch from a source branch. |
| `azuredevops_listPullRequests` | read | List PRs in a repository (filter by status). |
| `azuredevops_getPullRequestFiles` | read | Get files changed in a PR. |
| `azuredevops_getPRComments` | read | Get all comments and review threads on a PR. |
| `azuredevops_createPullRequest` | write | Create a new PR (source → target branch). |
| `azuredevops_updatePullRequest` | write | Update a PR's title, description, or status. |
| `azuredevops_approvePullRequest` | write | Approve a PR (sets your vote to Approved). |
| `azuredevops_completePullRequest` | write | Complete (merge) a PR with a chosen merge strategy. |
| `azuredevops_addPRComment` | write | Add a comment to a PR (optionally inline). |
| `azuredevops_getWorkItem` | read | Get full details of a work item by ID. |
| `azuredevops_searchWorkItems` | read | Search work items using WIQL. |
| `azuredevops_listWorkItems` | read | List work items with an optional WIQL query. |
| `azuredevops_createWorkItem` | write | Create a new work item (Bug, Task, Story, Feature, Epic). |
| `azuredevops_updateWorkItem` | write | Update fields on a work item. |
| `azuredevops_listPipelines` | read | List all CI/CD pipelines in a project. |
| `azuredevops_getPipeline` | read | Get pipeline configuration details. |
| `azuredevops_listPipelineRuns` | read | Get pipeline run (build) history. |
| `azuredevops_getPipelineRun` | read | Get details of a specific pipeline run. |
| `azuredevops_runPipeline` | write | Trigger a CI/CD pipeline run. |
| `azuredevops_createPipeline` | write | Create a new pipeline from a YAML file. |
| `azuredevops_cancelPipelineRun` | write | Cancel an in-progress pipeline run. |
| `azuredevops_listBuildLogs` | read | List available logs for a build (metadata only). |
| `azuredevops_getBuildLog` | read | Get the content of a specific build log (paginated). |
| `azuredevops_getBuildArtifacts` | read | Get build artifacts and download links. |
| `azuredevops_getBuildTags` | read | Get all tags attached to a build. |
| `azuredevops_addBuildTag` | write | Add a tag to a build. |
| `azuredevops_deleteBuildTag` | write | Remove a tag from a build. |

## Scope behaviour

With `scope: "read"`, the 14 `write` tools (create/update/approve/complete PR,
create branch/repo, create/update work item, run/create/cancel pipeline, add/delete
build tag, add PR comment) are dropped; the 20 read tools remain.
