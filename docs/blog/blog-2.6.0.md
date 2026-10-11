# Your Agents Now Talk to Jira, Confluence, TestRail, and Azure DevOps

The Claude Agent Orchestration Plugin v2.6.0 ships a bundled MCP server that connects Claude Code directly to your project management and QA tools. No more switching tabs to look up a ticket, search a wiki page, or check a test run -- agents can do it inline.

## What's New in v2.6.0

### Local MCP Server

A single MCP server that exposes four services over SSE, running locally on your machine. Each service registers its own tools in Claude Code -- 90+ tools total across all four integrations.

**Jira** (38 tools) -- Full issue lifecycle: search with JQL, create/update/transition issues, manage sprints and boards, handle attachments, link issues, post comments, assign team members.

**Confluence** (11 tools) -- Page and space operations: search with CQL, create and update pages, browse space hierarchies, manage labels, read comments.

**TestRail** (9 tools) -- Test case management: browse projects and suites, search and filter cases, create and update test cases, inspect custom fields.

**Azure DevOps** (33 tools) -- Repos, boards, and pipelines: list projects and repos, manage pull requests (create, review, approve, complete), search work items with WIQL, trigger and monitor CI/CD pipelines, read build logs and artifacts.

### How It Works

The server runs on [Bun](https://bun.sh) and exposes each service as an independent SSE endpoint. You pick which services to enable, add your API tokens, and Claude Code discovers the tools automatically. Both Atlassian DataCenter and Atlassian Cloud deployments are supported.

## Setup (3 Commands)

```bash
/agent-orch:mcp-setup       # Interactive wizard -- pick your services
/agent-orch:mcp-start       # Start the server (installs Bun if needed)
/mcp                        # Enable services in Claude Code's MCP panel
```

The setup wizard creates two files:
- `~/.claude/mcp-config.json` -- your credentials and service config
- `~/.claude.json` -- MCP endpoint registrations (updated automatically)

### Adding Your API Token

Edit `~/.claude/mcp-config.json` and replace the placeholder tokens:

```json
{
  "port": 13999,
  "jira": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "jira.ssnc-corp.cloud",
    "token": "YOUR_JIRA_PAT_HERE",
    "scope": "write"
  }
}
```

For Atlassian Cloud, use `"deploymentType": "cloud"` with `siteName`, `email`, and `apiToken` instead:

```json
{
  "port": 13999,
  "jira": {
    "enabled": true,
    "deploymentType": "cloud",
    "siteName": "your-site",
    "email": "you@example.com",
    "apiToken": "YOUR_ATLASSIAN_API_TOKEN",
    "scope": "write"
  }
}
```

| Service | Where to Create a Token |
|---------|------------------------|
| Jira (DataCenter) | Profile icon → API token authentication → New API Token |
| Jira / Confluence (Cloud) | https://id.atlassian.com/manage-profile/security/api-tokens |
| Confluence (DataCenter) | Profile → Settings → Personal Access Tokens |
| TestRail | My Settings → API Keys → Add Key |
| Azure DevOps | User Settings → Personal access tokens → + New Token |

### Read-Only Mode

If you only want lookup tools (no create/update/delete), set `"scope": "read"` on any service in `~/.claude/mcp-config.json`.

## Example Workflows

### Look up a Jira ticket while coding

```
> What's the acceptance criteria for PROJ-1234?

Claude uses jira_getIssue to fetch the ticket, reads the description
and acceptance criteria fields, and summarizes them inline.
```

### Search Confluence for architecture decisions

```
> Search Confluence for our API versioning strategy

Claude uses confluence_searchContent with CQL to find relevant pages,
then reads the content to answer your question.
```

### Create a Jira bug from a failing test

```
> That test failure looks like a real bug. Create a Jira bug in the PLATFORM
  project with what we just found.

Claude uses jira_createIssue with the test output, stack trace, and
reproduction steps as the description.
```

### Check Azure DevOps pipeline status

```
> Did the latest CI run pass on the main branch?

Claude uses azuredevops_listPipelineRuns to check recent builds,
then azuredevops_getBuildLog if something failed.
```

### Build a feature from a Jira epic

```
> /agent-orch:build

Claude: What would you like to build?

> Implement the stories in PROJ-100

The Architect agent uses jira_getIssue to read the epic, then
jira_searchIssues to pull all child stories. It builds the plan
directly from the ticket descriptions and acceptance criteria.
```

### Link test cases to implementation

```
> What TestRail cases cover the payment module?

Claude uses testrail_getCases with filters to find matching cases,
then summarizes coverage gaps.
```

### Manage sprints from the terminal

```
> Show me the open sprint for the PLATFORM board and what's still in progress

Claude uses jira_getAllBoards to find the board, jira_getSprintsFromBoard
to get the active sprint, then jira_getSprintIssues to list the work items
with their current status.
```

### Review a pull request with full context

```
> Review the Azure DevOps PR #456 in the payments repo

Claude uses azuredevops_getPullRequestFiles to see what changed,
azuredevops_getPRComments to read existing review threads, and
cross-references with jira_getIssue to verify the changes match
the linked ticket's requirements.
```

## Managing the Server

| Command | What It Does |
|---------|-------------|
| `/agent-orch:mcp-setup` | Configure services and credentials |
| `/agent-orch:mcp-start` | Start the server |
| `/agent-orch:mcp-stop` | Stop the server |

The server runs in the background on the configured port (default 13999) and exposes a health endpoint at `http://localhost:13999/health`.

**Troubleshooting tips:**
- Services not visible after setup? Restart Claude Code or start a new session
- "Needs authentication" error? Toggle the service off and on in `/mcp`
- Port conflict? Change `port` in `~/.claude/mcp-config.json`, then re-run `/agent-orch:mcp-setup`

## Install or Upgrade

```bash
# New install
/plugin marketplace add git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
/plugin install agent-orch@ssnc-agent-orch

# Existing users -- force upgrade
/plugin install agent-orch@ssnc-agent-orch
```

Or commit the plugin config to `.claude/settings.json` and your whole team gets it automatically.

---

*Claude Agent Orchestration Plugin v2.6.0 is available now via the Claude Code plugin marketplace at `code.ssnc.dev`.*
