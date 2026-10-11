# From Zero to Running: Plugin Lifecycle, Private Cloud, and Protecting the Constitution (v2.13.0)

Every plugin ecosystem eventually faces the same three problems: how do users get started, how do they stay current, and how do you stop the system from eating its own configuration files.

v2.13.0 addresses all three.

## /init-plugin: One Wizard to Start Them All

Before this release, setting up the orchestration plugin for a new repo meant reading the README, running `/setup-claude-md`, maybe running `/agent-orch:jira`, deciding which rules and conventions applied to your stack, and hoping you didn't miss a step. It worked, but it required tribal knowledge.

`/init-plugin` replaces all of that with a single interactive wizard. It walks through the full setup in one session:

1. **Health-checks your CLAUDE.md** hierarchy (or creates one from scratch)
2. **Discovers plugins** from the catalog based on what you describe -- "I'm working on a Go API with Postgres" finds the right conventions, rules, and MCP services
3. **Configures per-repo** -- plugins are installed into the repository, not the user profile, so different repos get different agent behaviors
4. **Stores upstream snapshots** so `/upgrade-plugin` can later do three-way merges without losing your local customizations

The design principle is discovery-first: you don't need to memorize plugin names. Describe what you need, and the wizard finds it.

```bash
/agent-orch:init-plugin
```

```
Running CLAUDE.md health check...

  [ok] CLAUDE.md exists (lean root, 32 lines)
  [ok] .claude/rules/ exists (2 files)
  [!!] No plugins configured yet

What kind of project is this?
> Go microservice with Postgres, deployed to K8s

Searching catalog...

Recommended plugins:
  1. go-service    -- Go conventions, test patterns, linting rules
  2. postgres-ops  -- Migration safety, query review, schema standards
  3. k8s-deploy    -- Helm/Kustomize conventions, deployment gates

Install all recommended? (yes / pick / skip)
```

One command. One conversation. Working setup.

## /upgrade-plugin: Three-Way Merge for Plugin Updates

The companion to `/init-plugin`. When upstream plugins release new rules, conventions, or agent improvements, `/upgrade-plugin` pulls them in without destroying local work.

The key insight is the **three-way merge**. When `/init-plugin` installs a plugin, it stores an upstream snapshot as the merge base. When `/upgrade-plugin` runs:

- **Upstream-owned files** (snapshots) are replaced entirely
- **Locally-owned files** (your CLAUDE.md, your custom rules) are never touched
- **Shared files** (plugin rules you've modified locally) get a three-way merge with a one-file-at-a-time walkthrough

Nothing is silently applied. Every addition, modification, and removal is presented for your decision.

```bash
/agent-orch:upgrade-plugin
```

```
Running CLAUDE.md health check...
  [ok] All checks passed

Checking for updates...

  go-service: 1.2.0 -> 1.3.0 (3 files changed)
  postgres-ops: 2.0.1 -> 2.1.0 (1 file changed)

Walking through changes...

File 1 of 4: .claude/rules/go-error-handling.md
  [MODIFIED UPSTREAM] New rule: wrap errors with %w
  Your version: unmodified (matches base)
  Action: (accept upstream / skip / diff)
```

An audit trail is written to `.claude/upgrade-state.json` so you can replay or review past upgrade decisions.

## /private-cloud: DevSecOps for SS&C Infrastructure

For teams managing SS&C private cloud and AWS hybrid environments, `/private-cloud` adds an interactive planning assistant backed by a new read-only MCP service.

The workflow splits infrastructure work into two phases:

1. **`/private-cloud`** -- the planning phase. Query current state, explore what exists, spec out what needs to change.
2. **`/build`** -- the execution phase. The new `orchestrate-private-cloud` agent implements the terraform changes.

The SS&C Cloud MCP service (`ssccloud`) exposes 33 read-only tools across all Cloud API domains -- IAM, Kubernetes, Security, Compute, Storage, Network, CMDB, and more. Zero mutation operations are available through MCP; all changes go through terraform.

```bash
/agent-orch:private-cloud
```

```
What would you like to do with your infrastructure?
> What security groups exist in the prod environment?

Querying SS&C Cloud API...

| Name              | VPC          | Inbound Rules | Outbound Rules |
|-------------------|--------------|---------------|----------------|
| sg-api-prod       | vpc-prod-01  | 3             | 1              |
| sg-db-prod        | vpc-prod-01  | 2             | 1              |
| sg-bastion-prod   | vpc-prod-01  | 1             | 1              |

Want to modify any of these, or plan new infrastructure?
```

For pure queries (checking state, auditing security, listing resources), the skill answers directly using MCP tools. For changes, it produces a detailed terraform plan and hands off to `/build`.

### Setting Up the SS&C Cloud MCP Service

The `ssccloud` service requires an API key from the SS&C Cloud portal. Add it to your `~/.claude/mcp-config.json`:

```json
{
  "sscCloud": {
    "enabled": true,
    "url": "https://portal.ssnc-corp.cloud",
    "apiKey": "YOUR_SSC_CLOUD_API_KEY"
  }
}
```

Or via environment variable (for `.env` or shell config):

```bash
export SSC_CLOUD_API_KEY="your-api-key"
```

Then start the MCP server:

```bash
/agent-orch:mcp-start
```

The service is **read-only by design** -- there is no scope toggle. All 33 tools are query operations: list projects, describe clusters, check security groups, inspect IAM roles, audit certificates, and so on. No MCP tool can create, modify, or delete infrastructure. That boundary is intentional -- all mutations go through terraform, reviewed in a PR, with the full audit trail that infrastructure changes require.

| Domain | Example Tools |
|--------|--------------|
| **IAM** | List users, roles, policies, service accounts |
| **Kubernetes** | List clusters, namespaces, deployments, services |
| **Security** | Security groups, firewall rules, certificates |
| **Compute** | VMs, instance types, availability zones |
| **Storage** | Volumes, snapshots, object storage buckets |
| **Network** | VPCs, subnets, load balancers, DNS records |
| **CMDB** | Configuration items, relationships, change history |

The MCP server now supports seven services total (up from six in v2.12.0).

## CLAUDE.md Protection: The Constitution Is Read-Only

This one fixes a problem that emerged as more teams ran longer agent sessions. Agents with write access were appending configuration sections to CLAUDE.md -- quality targets, model overrides, advocate settings -- because the build skill and agent documentation said "set X in CLAUDE.md." Over time, the lean CLAUDE.md hierarchy that `/setup-claude-md` creates would bloat back into a monolithic file, with contradictory sections from different sessions.

v2.13.0 adds a hard rule: **agents must not write to any CLAUDE.md file**. Not the root, not subdirectory variants. The policy is enforced via a new `claude-md-protection` rule that's loaded into every agent's context.

Configuration that agents previously wrote to CLAUDE.md now goes to `.claude/rules/build-overrides.md`, which is auto-loaded by the rules system but doesn't pollute the project constitution.

| What agents need to persist | Where it goes now |
|--------------------------|-------------------|
| Build configuration overrides | `.claude/rules/build-overrides.md` |
| Conventions discovered during sessions | `${SESSION_DIR}/conventions.md` |
| Agent notes and recommendations | `${SESSION_DIR}/STATUS.md` |
| Quality gate results | Session directory |

This also means `/upgrade-plugin` can safely merge CLAUDE.md changes -- it knows agents haven't been scribbling in a file it needs to manage.

## Cline Parity

Cline users get the Playwright SSE endpoint in installers and SonarQube MCP service support, plus an updated AGENTS.md template matching v2.12.0 capabilities.

## What's New in v2.13.0

| Feature | Description |
|---------|-------------|
| `/agent-orch:init-plugin` | Single entry-point wizard: discover, select, configure plugins per-repo |
| `/agent-orch:upgrade-plugin` | Three-way merge upgrade wizard with one-file-at-a-time walkthrough |
| `/agent-orch:private-cloud` | Interactive DevSecOps assistant for SS&C private cloud terraform |
| `orchestrate-private-cloud` agent | Specialist agent for terraform implementation on SS&C + AWS hybrid infra |
| `ssccloud` MCP service | 33 read-only tools across all SS&C Cloud API domains |
| CLAUDE.md protection rule | Agents cannot write to any CLAUDE.md file -- config redirected to `.claude/rules/` |
| Cline: Playwright SSE | Playwright endpoint added to Cline installers |
| Cline: SonarQube MCP | SonarQube service support for Cline users |
| Cline: AGENTS.md v2.12.0 | Updated agent template for Cline |

## Install or Upgrade

### New Install

```bash
/plugin marketplace add git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
/plugin install agent-orch@ssnc-agent-orch
```

### Existing Users

```bash
/plugin install agent-orch@ssnc-agent-orch
```

### Try It

```bash
# Set up a new repo with the right plugins
/agent-orch:init-plugin

# Upgrade an existing repo's plugins
/agent-orch:upgrade-plugin

# Plan private cloud infrastructure changes
/agent-orch:private-cloud
```

## Further Reading

- [v2.12.0: Seeing the Whole Board](blog-2.12.0.md) -- Playwright and SonarQube MCP
- [v2.11.0: Jira as a Shared Brain](blog-2.11.0.md) -- Work queues and human-on-the-loop governance
- [v2.10.0: The Engineer Who Says No](blog-2.10.0.md) -- The Advocate agent

---

*Claude Agent Orchestration Plugin v2.13.0 is available now via the Claude Code plugin marketplace at `code.ssnc.dev`.*
