# One Plugin Becomes Many: Introducing /inherit-plugin

Every SS&C business unit has its own infrastructure standards, tech stack preferences, and domain language. But the plugin architecture -- agents, rules, hooks, conventions, safety gates -- is the same everywhere. Until now, the only way to create a new domain-specific plugin was to fork an existing one and spend hours doing find-and-replace across dozens of files, hoping you caught every reference to the old domain in every agent definition, hook script, rule file, and convention doc.

v2.7.0 fixes that with a single command.

## What's New in v2.7.0

### `/agent-orch:inherit-plugin` -- Plugin Inheritance

A meta-skill that clones any existing Claude Code plugin, walks you through an interactive session to remap its domain and tech stack, and generates a complete new plugin in your repo. Every layer gets transformed -- agents, skills, rules, hooks, conventions, MCP config, settings, README.

```bash
/agent-orch:inherit-plugin git@code.ssnc.dev:dt233894/claude-agent-gids-sdd-plugin.git
```

The wizard runs in four phases:

**Phase 1: Inventory.** Clones the source repo and scans everything -- marketplace config, plugin manifest, agent definitions, skills, rules, hooks, conventions, MCP servers, settings. Shows you the complete bill of materials.

**Phase 2: Interactive Mapping.** Walks through each substitution one at a time:
- **Domain terms** -- every business-specific reference found in filenames and content. "GIDS" appears in 15+ files? The wizard finds every one and asks what it should become.
- **Tech stack** -- Vault, Spring Boot, Terraform, Grafana Alloy -- each technology detected with the files it appears in. Swap Vault for AWS Secrets Manager and the wizard knows to update rule files, hook scripts, convention docs, and agent personas.
- **Naming and branding** -- plugin name, marketplace ID, description, owner, email.
- **Capabilities** -- choose which agents, rules, hooks, and conventions to keep, modify, or drop.

**Phase 3: Generate.** Creates the full plugin structure in your repo with all mappings applied -- marketplace.json, plugin.json, transformed agents, skills, rules, hooks, conventions, and a generated README.

**Phase 4: Summary.** Lists every file created and gives you next steps for review, testing, and distribution.

## The GIDS Plugin: A Real-World Example

The best way to understand `/inherit-plugin` is to see what it inherits from. The [GIDS SDD Plugin](https://code.ssnc.dev/dt233894/claude-agent-gids-sdd-plugin) is a production plugin built by the GIDS Platform Architecture team that layers GIDS-specific infrastructure standards on top of the generic agent-orch plugin.

Here's what makes it worth inheriting from:

### A Specialized SRE Orchestrator

The plugin ships a **GIDS DevOps SRE Lead** agent that coordinates all 17 upstream agents with infrastructure expertise baked in. It knows about SS&C's Terraform provider, Ansible common roles, Vault paths, and the SS&C Private Cloud hierarchy. When it launches the Builder or DevOps agents, it injects GIDS context so they follow the right standards without being told.

### 8 Always-On Rules

Rules auto-load into every agent's context when they touch matching file types. The GIDS plugin enforces:

| Rule | What It Enforces |
|------|-----------------|
| **Terraform** | Use reusable modules from [terraform-provider-ssccloud](https://code.ssnc.dev/cloud/terraform-provider-ssccloud.git); outputs feed Ansible inventory |
| **Ansible** | Use [ansible-common](https://code.ssnc.dev/gps/ansible-common) roles; `us-monitoring` for US data centers |
| **Secrets** | Vault paths by CMDB ID + environment; never hardcode secrets |
| **Monitoring** | Grafana Alloy for metrics, logs, and traces |
| **CI/CD** | GitHub Actions with Vault integration; plan on PRs, apply on merge |
| **Cloud Platform** | SS&C Private Cloud Account/Project/Subproject hierarchy with geography validation |
| **Confluence** | Consult GIDS Platform Engineering Confluence page as authoritative source |
| **Conventions** | Three-tier lookup: project > GIDS > upstream |

### 5 Safety Hooks

Hooks fire before tool calls to catch mistakes before they happen:

- **validate-terraform-safety.sh** -- Blocks `terraform destroy -auto-approve` and warns on apply without a plan file
- **validate-no-secret-leak.sh** -- Blocks echo/print of Vault tokens, insecure curl to Vault, bare env dumps
- **validate-no-hardcoded-secrets.sh** -- Scans file writes for Vault tokens (`hvs.`), AWS keys (`AKIA`), hardcoded passwords
- **validate-gids-context.sh** -- Blocks terraform/ansible/vault commands until CMDB ID is collected
- **validate-ansible-reuse.sh** -- Reminds to check ansible-common before creating new roles

### Spring Boot Conventions

A comprehensive Spring Boot 3.x convention file covering project structure, Vault integration via Spring Cloud, REST API patterns, Actuator health checks, observability with Micrometer + OpenTelemetry, Flyway migrations, and a full testing pyramid with Testcontainers.

### Auto-Starting Confluence MCP

The plugin bundles a Confluence MCP server that starts automatically -- no manual `/mcp` setup. Agents can search and read Confluence pages during implementation, referencing runbooks, ADRs, and architecture docs directly.

## What Inheriting Looks Like

Say you're on the Health team. You want the same operational quality as GIDS but with different infrastructure choices:

```bash
mkdir claude-agent-health-plugin && cd claude-agent-health-plugin
git init

/agent-orch:inherit-plugin git@code.ssnc.dev:dt233894/claude-agent-gids-sdd-plugin.git
```

The wizard shows the inventory, then asks:

```
The source plugin is built for the "GIDS" business unit.
What business unit/domain is your new plugin for?
> Health

I found these domain-specific terms:

| Source Term | Appears In                          | Your Replacement |
|-------------|-------------------------------------|-----------------|
| GIDS        | rules/, hooks/, agents/, skills/    | Health          |
| gids        | filenames, rule content              | health          |
| CMDBXXXXX   | context template                    | same            |
| ...         | ...                                 | ...             |
```

Then tech stack:

```
| Technology    | Used For            | Your Replacement       |
|---------------|---------------------|------------------------|
| Vault         | Secrets management  | AWS Secrets Manager    |
| Spring Boot   | App framework       | FastAPI                |
| Terraform     | Infrastructure      | same                   |
| Grafana Alloy | Monitoring          | same                   |
```

After you approve, the wizard generates:

```
health-agent-orch/
├── .claude-plugin/marketplace.json
├── plugins/health-agent-orch/
│   ├── agents/orchestrate-health-devops-sre.md
│   ├── rules/health-terraform.md
│   ├── rules/health-secrets-management.md    # Now references AWS Secrets Manager
│   ├── hooks/validate-no-hardcoded-secrets.sh # Updated patterns
│   ├── conventions/fastapi.md                 # Replaced Spring Boot
│   └── ...
└── README.md
```

Every file is transformed. The secrets rule now references AWS Secrets Manager paths instead of Vault. The hook scripts detect AWS credential patterns instead of `hvs.` tokens. The agent persona knows about your Health-specific infrastructure. The README documents your plugin, not the GIDS one.

## Install or Upgrade

### New Install

```bash
# Register the marketplace and install the plugin
/plugin marketplace add git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
/plugin install agent-orch@ssnc-agent-orch
```

### Existing Users

```bash
/plugin install agent-orch@ssnc-agent-orch
```

### Want the GIDS Plugin Too?

If you're in the GIDS business unit or want to see a real-world domain plugin to inherit from:

```bash
/plugin marketplace add git@code.ssnc.dev:dt233894/claude-agent-gids-sdd-plugin.git
/plugin install gids-agent-orch@ssnc-gids-agent-orch
```

Then start a GIDS infrastructure implementation:

```bash
/gids-agent-orch:gids-implement my-feature
```

Or use it as a template for your own business unit:

```bash
cd ~/dev/ssnc/your-bu/claude-agent-your-bu-plugin
git init
/agent-orch:inherit-plugin git@code.ssnc.dev:dt233894/claude-agent-gids-sdd-plugin.git
```

### Team-Wide Auto-Setup

Commit this to your project so every team member gets the plugin automatically:

```json
// .claude/settings.json
{
  "extraKnownMarketplaces": [
    { "source": "git", "url": "git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git" }
  ],
  "enabledPlugins": [
    { "name": "agent-orch", "marketplace": "ssnc-agent-orch" }
  ]
}
```

---

*Claude Agent Orchestration Plugin v2.7.0 is available now via the Claude Code plugin marketplace at `code.ssnc.dev`. The GIDS SDD Plugin is at [code.ssnc.dev/dt233894/claude-agent-gids-sdd-plugin](https://code.ssnc.dev/dt233894/claude-agent-gids-sdd-plugin).*
