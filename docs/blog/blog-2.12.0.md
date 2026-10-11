# Seeing the Whole Board: Playwright, SonarQube, and the Expanding MCP Toolbelt (v2.12.0)

An AI coding agent is only as useful as the systems it can reach.

Up to now, the agent orchestration plugin could talk to Jira, Confluence, TestRail, and Azure DevOps through its local MCP server. That covers project management, documentation, test management, and CI/CD. But there were two obvious gaps: the agent couldn't open a browser and look at what it built, and it couldn't check the quality of the code it wrote against the same static analysis the rest of the team uses.

v2.12.0 closes both gaps.

## Playwright MCP: The Agent Gets Eyes

Playwright integration gives agents the ability to launch browsers, navigate pages, take screenshots, fill forms, click buttons, and verify visual state -- all through MCP tool calls. This isn't a testing framework bolted on after the fact. It's a first-class MCP service that any agent in the orchestration pipeline can use.

The Validator agent can now write and run end-to-end tests as part of the standard build pipeline. The Builder can verify its UI work renders correctly. The Quality Reviewer can check visual regressions. And the Debugger can reproduce browser-based issues without asking the human to describe what they see.

Configuration is straightforward:

```json
{
  "playwright": {
    "enabled": true,
    "headless": true,
    "browserType": "chromium",
    "defaultTimeout": 30000,
    "screenshotDir": "./screenshots",
    "scope": "write"
  }
}
```

Set `"headless": false` if you want to watch the agent drive the browser -- useful for debugging, entertaining to observe.

## SonarQube MCP: Continuous Quality Feedback

SonarQube (and SonarCloud) integration gives agents read access to the same quality gates, code smells, bugs, vulnerabilities, and coverage data that your CI pipeline enforces. Instead of shipping code and waiting for the SonarQube scan to come back red, agents can check before they commit.

The Quality Reviewer can query SonarQube for existing issues in the files it's reviewing. The Security agent can cross-reference its findings with SonarQube's vulnerability database. The Architect can check technical debt trends before proposing new patterns.

```json
{
  "sonarqube": {
    "enabled": true,
    "url": "https://sonarcloud.io",
    "token": "YOUR_TOKEN",
    "organization": "your-org",
    "scope": "read"
  }
}
```

SonarQube is read-only by default -- agents observe quality metrics, they don't modify them.

## The MCP Server at Six Services

The local MCP server now supports six integrations:

| Service | What Agents Can Do |
|---------|--------------------|
| **Jira** | Create issues, transition workflows, search backlogs, manage sprints |
| **Confluence** | Read and create documentation, search knowledge bases |
| **TestRail** | Manage test cases and test runs, track test coverage |
| **Azure DevOps** | Work items, pipelines, repositories across organizations |
| **Playwright** | Browser automation, screenshots, form filling, e2e testing |
| **SonarQube** | Code quality metrics, vulnerabilities, coverage data |

All six run through a single server on one port, configured with one JSON file, started with one command (`/agent-orch:mcp-start`).

## Also in This Release: Jira Work Queues (from v2.11.0)

If you're coming from v2.10.0, this release also includes everything from v2.11.0 -- the Jira-driven work queue with human-on-the-loop governance:

- **`/jira-work`** -- An interactive wizard for browsing, triaging, and picking up Jira issues for agent-assisted implementation
- **Label governance** -- Two labels (`claude-code-agent-harness` and `human-review-required`) control what agents can work on, following [Martin Fowler's human-on-the-loop model](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html)
- **Triage agent** -- A specialized agent that analyzes backlogs and recommends which issues are suitable for agent work
- **`/build JIRA-ID`** -- Start a build session directly from a Jira issue, pulling requirements automatically and tracking progress back to the ticket

## Getting Started

Update the plugin, then configure the new services:

```bash
# Update plugin
/install agent-orch@ssnc-agent-orch

# Configure new services
/agent-orch:mcp-setup

# Start the server
/agent-orch:mcp-start
```

For Playwright, install browser binaries once:

```bash
npx playwright install chromium
```

For SonarQube, generate an API token from your instance's security settings.

---

[< Back to Blog Index](README.md) | [< Back to Documentation](../README.md) | [< Back to README](../../README.md)
