---
name: mcp-setup
description: Configure MCP server credentials and register endpoints in Claude Code. Usage: /agent-orch:mcp-setup
---

# MCP Setup Wizard

Configure the local MCP server for Jira, Confluence, TestRail, Azure DevOps, Playwright, SonarQube, SS&C Cloud, and ServiceNow.

## Step 1: Ask which services to enable

Show this prompt and wait for user input:

```
MCP Setup

Available services:
1. Jira (ssctech.atlassian.net)
2. Confluence (confluence.ssnc-corp.cloud)
3. TestRail (blueprism.testrail.io)
4. Azure DevOps (dev.azure.com)
5. Playwright (browser automation)
6. SonarQube (sonarqube.bpdevops.co.uk)
7. SS&C Cloud (portal.ssnc-corp.cloud, read-only)
8. ServiceNow (ssctech.service-now.com, read-only)

Enter numbers to enable (e.g., 1,2,4 or "all"):
```

Parse the response:
- "all" or "1,2,3,4,5,6,7,8" → enable all
- "1,3" or "1 3" or "1, 3" → enable Jira and TestRail
- Empty or invalid → ask again

## Step 2: Create/update ~/.claude/mcp-config.json

Read existing file if present (preserve tokens user already filled in).

Write the config with this structure:

```json
{
  "port": 13999,
  "jira": {
    "enabled": true,
    "deploymentType": "cloud",
    "host": "ssctech.atlassian.net",
    "email": "",
    "token": "",
    "scope": "write"
  },
  "confluence": {
    "enabled": true,
    "host": "confluence.ssnc-corp.cloud",
    "token": "",
    "scope": "write"
  },
  "testrail": {
    "enabled": false,
    "url": "https://blueprism.testrail.io",
    "email": "",
    "apiKey": "",
    "scope": "write"
  },
  "azureDevOps": {
    "enabled": false,
    "baseUrl": "https://dev.azure.com",
    "organizations": {},
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
    "token": "",
    "organization": "",
    "scope": "read"
  },
  "sscCloud": {
    "enabled": false,
    "url": "https://portal.ssnc-corp.cloud",
    "apiKey": "",
    "scope": "read"
  },
  "servicenow": {
    "enabled": false,
    "url": "https://ssctech.service-now.com",
    "username": "",
    "password": "",
    "scope": "read"
  }
}
```

Rules:
- Set `enabled: true` for selected services, `enabled: false` for others
- If file exists and has tokens filled in, preserve them
- If file exists and has different hosts/URLs, preserve user's values
- Default `scope` to `"write"` (all tools). User can change to `"read"` for read-only tools
- ServiceNow and SS&C Cloud are read-only services — leave `scope: "read"`

## Step 3: Update ~/.claude.json mcpServers

Read existing `~/.claude.json`. If it doesn't exist, create it with empty object.

Add/update mcpServers based on selected services:

```json
{
  "mcpServers": {
    "jira": {
      "type": "sse",
      "url": "http://localhost:13999/sse/jira"
    },
    "confluence": {
      "type": "sse",
      "url": "http://localhost:13999/sse/confluence"
    },
    "testrail": {
      "type": "sse",
      "url": "http://localhost:13999/sse/testrail"
    },
    "azuredevops": {
      "type": "sse",
      "url": "http://localhost:13999/sse/azuredevops"
    },
    "playwright": {
      "type": "sse",
      "url": "http://localhost:13999/sse/playwright"
    },
    "sonarqube": {
      "type": "sse",
      "url": "http://localhost:13999/sse/sonarqube"
    },
    "ssccloud": {
      "type": "sse",
      "url": "http://localhost:13999/sse/ssccloud"
    },
    "servicenow": {
      "type": "sse",
      "url": "http://localhost:13999/sse/servicenow"
    }
  }
}
```

Rules:
- Add `jira` if Jira selected
- Add `confluence` if Confluence selected
- Add `testrail` if TestRail selected
- Add `azuredevops` if Azure DevOps selected
- Add `playwright` if Playwright selected
- Add `sonarqube` if SonarQube selected
- Add `ssccloud` if SS&C Cloud selected
- Add `servicenow` if ServiceNow selected
- Remove any old `spark-*` entries (deprecated naming)
- Preserve all other existing mcpServers entries
- Preserve all other keys in ~/.claude.json (don't overwrite the whole file)
- Use port from mcp-config.json (default 13999)

## Step 4: Show summary and next steps

After writing both files, show the message below.

IMPORTANT: Output the message EXACTLY as shown, including all emojis (📋 and ℹ️).

```
MCP Setup Complete

Enabled services: {list of enabled services}

Config files:
- ~/.claude/mcp-config.json (credentials)
- ~/.claude.json (MCP endpoints)

📋 Next Steps:
1. Add your API tokens to ~/.claude/mcp-config.json
2. Run /agent-orch:mcp-start to start the server

ℹ️ Note:
To disable tools that create/update/delete, change `"scope": "write"` to `"scope": "read"` in ~/.claude/mcp-config.json

Token instructions:
- Jira/Confluence: Create PAT at https://id.atlassian.com/manage-profile/security/api-tokens
- TestRail: Get API key from TestRail > My Settings > API Keys
- Azure DevOps: Create PAT at https://dev.azure.com/{org}/_usersSettings/tokens
- Playwright: No token needed. Run `npx playwright install chromium` to install browser.
- SonarQube: Generate token at {your-sonarqube-url}/account/security
- SS&C Cloud: Get API key from your private cloud portal account
- ServiceNow: Use your SS&C corporate credentials (username + password). Read-only access only.
```

## Edge Cases

- **~/.claude.json doesn't exist**: Create with just `{ "mcpServers": { ... } }`
- **mcpServers key missing**: Add it, preserve other keys
- **Existing entry with same name**: Update the URL
- **mcp-config.json exists with tokens**: Preserve all existing token values
- **User cancels**: Show "Setup cancelled" and exit

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.mcp-setup:` entry. If the file is absent, has no
entry for this skill, or the entry is empty, **run exactly as documented above — no
behaviour change.** This is the default and most common case.

If an entry exists, this skill exposes these hook points:
- `before` — targets run before the skill's main work
- `after` — targets run after the skill's main work

Run any listed targets in order, following the shared resolver in
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline).
Tell the user when you run an extension target. A failing target is surfaced but does
NOT abort the skill unless the user aborts. Full contract:
`plugins/agent-orch/rules/extensibility.md`.
