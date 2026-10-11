---
name: mcp-setup
description: Configure MCP server credentials for Jira, Confluence, TestRail, Azure DevOps, Playwright, and SonarQube (Cline version). Usage: /mcp-setup.md
---

# MCP Setup (Cline)

Configure the local MCP server for Jira, Confluence, TestRail, Azure DevOps, Playwright, and SonarQube.

## Overview

The MCP server provides tools for interacting with external services. This workflow helps you:
1. Enable/disable services
2. Configure API credentials
3. Register SSE endpoints in Cline

## Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `mcp-config.json` | API credentials | Cline settings directory |
| `cline_mcp_settings.json` | SSE server registration | Cline settings directory |

**Cline settings directory:**
- Windows: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\`
- macOS: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/`
- Linux: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/`

## Actions

### Step 1: Ask which services to enable

Show this prompt and wait for user input:

```
MCP Setup

Available services:
1. Jira (issue tracking)
2. Confluence (documentation)
3. TestRail (test management)
4. Azure DevOps (work items, repos)
5. Playwright (browser automation)
6. SonarQube (code quality analysis)

Enter numbers to enable (e.g., 1,3 or "all"):
```

Parse the response:
- "all" or "1,2,3,4,5,6" → enable all
- "1,3" or "1 3" → enable Jira and TestRail
- Empty → keep existing settings

### Step 2: Collect credentials for enabled services

For each enabled service, ask for credentials:

**Jira (DataCenter):**
```
Jira Configuration

Host (e.g., jira.company.com):
API Token:

Get token: Profile → API token authentication → New API Token
```

**Jira (Cloud/Atlassian):**
```
Jira Cloud Configuration

Site name (e.g., "ssctech" for ssctech.atlassian.net):
Email:
API Token:

Get token: https://id.atlassian.com/manage-profile/security/api-tokens
```

**Confluence (DataCenter):**
```
Confluence Configuration

Host (e.g., confluence.company.com):
API Token:

Get token: Profile → Settings → Personal Access Tokens
```

**Confluence (Cloud/Atlassian):**
```
Confluence Cloud Configuration

Site name (e.g., "ssctech" for ssctech.atlassian.net):
Email:
API Token:

Get token: https://id.atlassian.com/manage-profile/security/api-tokens
```

**TestRail:**
```
TestRail Configuration

URL (e.g., https://company.testrail.io):
Email:
API Key:

Get key: TestRail → My Settings → API Keys → Add Key
Important: Click "Save Settings" after creating the key!
```

**Azure DevOps:**
```
Azure DevOps Configuration

Organization URL (e.g., https://dev.azure.com/myorg):
Personal Access Token (PAT):

Get PAT: https://dev.azure.com/{org}/_usersSettings/tokens
Scope: Full access (or specific scopes for work items, code, etc.)
```

**Playwright:**
```
Playwright Configuration

No credentials required. Playwright controls a local browser.

Options:
- headless: true/false (default: true)
- browserType: chromium/firefox/webkit (default: chromium)

Note: Run `npx playwright install chromium` to install browser binaries.
```

**SonarQube:**
```
SonarQube Configuration

URL (e.g., https://sonarcloud.io or https://sonar.company.com):
Token:
Organization (optional, for SonarCloud):

Get token: Your SonarQube/SonarCloud > My Account > Security > Generate Token
```

### Step 3: Update mcp-config.json

Read existing file if present (preserve other settings).

Write the config:

```json
{
  "port": 13999,
  "jira": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "jira.company.com",
    "token": "USER_TOKEN",
    "scope": "write"
  },
  "confluence": {
    "enabled": true,
    "deploymentType": "datacenter",
    "host": "confluence.company.com",
    "token": "USER_TOKEN",
    "scope": "write"
  },
  "testrail": {
    "enabled": true,
    "url": "https://company.testrail.io",
    "email": "user@company.com",
    "apiKey": "USER_API_KEY",
    "scope": "write"
  },
  "azureDevOps": {
    "enabled": true,
    "baseUrl": "https://dev.azure.com",
    "organizations": {
      "myorg": {
        "name": "My Organization",
        "token": "USER_PAT"
      }
    },
    "scope": "write"
  },
  "playwright": {
    "enabled": true,
    "headless": true,
    "browserType": "chromium",
    "defaultTimeout": 30000,
    "screenshotDir": "./screenshots",
    "scope": "write"
  },
  "sonarqube": {
    "enabled": true,
    "url": "https://sonarcloud.io",
    "token": "USER_TOKEN",
    "organization": "my-org",
    "scope": "read"
  }
}
```

### Step 4: Update cline_mcp_settings.json

Read existing file (preserve other MCP servers like playwright).

Add/update SSE server entries:

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
    }
  }
}
```

Only add entries for enabled services. Set `"disabled": true` for services that are registered but not enabled.

### Step 5: Show summary

```
MCP Setup Complete

Enabled services: {list}

Configuration files updated:
- mcp-config.json (credentials)
- cline_mcp_settings.json (SSE endpoints)

Next steps:
1. Run /mcp-start.md to start the MCP server
2. Restart Cline or toggle services in MCP panel

Scope: Most services are configured with "write" scope (full access).
SonarQube defaults to "read" scope (analysis only).
To change scope, edit mcp-config.json.
```

## Reconfiguring

To change settings later, run `/mcp-setup.md` again. Existing credentials will be preserved unless you provide new ones.

## Troubleshooting

**Services not appearing in Cline:**
- Restart Cline after setup
- Check that cline_mcp_settings.json was updated

**Authentication errors:**
- Verify tokens are correct in mcp-config.json
- For Jira/Confluence Cloud, ensure you're using email + API token (not username + password)
- For TestRail, make sure you clicked "Save Settings" after creating the API key
