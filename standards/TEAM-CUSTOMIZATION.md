# Team Customization Guide

How different SS&C teams adapt the base agent orchestration plugin for their business domain and engineering practices.

---

## The Inheritance Model

Every team starts with the same base: the Agent Orchestration Plugin. Teams customize it through **plugin inheritance** - cloning the base and remapping domain, tech stack, and conventions.

```
Agent Orchestration Plugin (base)
    |
    |-- /inherit-plugin
    |
    +-- GIDS Team Plugin
    |     - Java/Spring Boot conventions
    |     - Fund accounting domain agents
    |     - MariaDB migration patterns
    |     - SOC 2 compliance rules
    |
    +-- WIT Team Plugin
    |     - .NET/C# conventions
    |     - Wealth management domain agents
    |     - Azure infrastructure patterns
    |     - Regulatory compliance rules
    |
    +-- Intralinks Team Plugin
    |     - React/TypeScript conventions
    |     - Document management domain agents
    |     - S3/CDN patterns
    |     - Data sovereignty rules
    |
    +-- GlobeOp Team Plugin
    |     - Python/Java conventions
    |     - Fund operations domain agents
    |     - Batch processing patterns
    |     - Reconciliation rules
    |
    +-- Private Cloud Team Plugin
          - Terraform/HCL conventions
          - Infrastructure domain agents
          - Kubernetes deployment patterns
          - Network security rules
```

---

## What Gets Inherited vs What Gets Customized

### Always Inherited (Base Ingredients)

These should be in every team's plugin:

| Component | Why Universal |
|-----------|--------------|
| Two-stage review (spec-reviewer + quality-reviewer) | Every team needs verified code quality |
| Builder agent (TDD) | Every team benefits from test-driven implementation |
| Validator agent | Every team needs comprehensive testing |
| Debugger agent | Every team encounters bugs |
| Integration verification | Build + migrate + start + lint is universal |
| No scaffolding policy | No team wants placeholder code in production |

### Often Inherited, Sometimes Customized

| Component | Default | Example Customization |
|-----------|---------|----------------------|
| Architect agent | Generic planning | Add domain-specific architecture patterns |
| Security agent | OWASP Top 10 | Add compliance-specific checks (PCI DSS, SOX) |
| DevOps agent | Docker/K8s/CI | Add Bolt API, Ansible, team-specific deployment |
| Database agent | Generic SQL | Add MariaDB-specific, migration framework patterns |
| API agent | REST/GraphQL/OpenAPI | Add domain-specific API standards |

### Always Customized per Team

| Component | What Changes |
|-----------|-------------|
| Language conventions | TypeScript vs Java vs Python vs C# vs Go |
| Domain agents | Fund accounting vs wealth management vs document management |
| Compliance rules | SOC 2 vs PCI DSS vs GDPR vs financial regulations |
| Infrastructure patterns | Private cloud vs AWS vs Azure vs hybrid |
| Jira project configuration | Board, labels, workflow states |
| Coverage targets | 100% (base) vs team's chosen threshold |

---

## Step-by-Step: Creating Your Team's Plugin

### 1. Inherit the Base

```bash
/agent-orch:inherit-plugin git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
```

The wizard walks you through:
- **Domain remapping**: What business domain? (fund services, wealth management, etc.)
- **Tech stack detection**: Reads your `package.json`, `pom.xml`, `pyproject.toml`, etc.
- **Naming**: Your team's plugin name and command prefix
- **Agent selection**: Which specialists do you need?

### 2. Add Domain Agents

Create agents in `plugins/your-plugin/agents/` that understand your domain:

```yaml
---
name: fund-accounting-expert
description: Domain expert in fund NAV calculation, pricing, reconciliation, and reporting
tools: [Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task]
model: opus
---

# Fund Accounting Expert

You are a senior fund accountant and software engineer...
```

### 3. Add Domain Rules

Create rules in `plugins/your-plugin/rules/` that enforce your team's standards:

```markdown
# Compliance Requirements

## SOC 2 Type II
- All database queries must use parameterized statements
- No PII in log output
- Audit trail for all data mutations
- Session timeout enforced at 30 minutes
```

### 4. Customize /build

Override build behavior in `.claude/rules/build-overrides.md`:

```markdown
# Build Overrides for [Team Name]

TDD_MODE: required
COVERAGE_TARGET: 90
BRANCH_COVERAGE_TARGET: 85
ADVOCATE_REVIEW: enabled
SPECIALIST_AGENTS: security, database, devops
DEFAULT_REVIEWERS: @team-lead, @security-champion
```

### 5. Register in the Catalog

```bash
/contribute-plugin-marketplace
```

Share your adapted plugin so other teams in your division can discover and inherit it.

---

## Real-World Example: Private Cloud Team

The SS&C Private Cloud team (`ssnc-cloud` in the catalog) created three plugins from the base:

1. **cloud-developer** - Safe contributor policy with guardrails
   - PR size limits (max files, max lines)
   - Required test coverage before merge
   - Security scanning on every commit

2. **ssnc-cloud-pro** - Platform architecture knowledge
   - Deep knowledge of all cloud microservices (Stratus, Gateway, Edge, etc.)
   - Angular UI patterns and conventions
   - Terraform and Kubernetes deployment patterns

3. **cloud-pipeline** - Spec-driven development pipeline
   - `/spec-build` combines spec generation + architect challenge + multi-agent implementation
   - Auto-detects when you're working in a cloud service repo
   - Uses the cloud architect agent for platform-aware planning

This is the model: start with the base, add what your team needs, share back.

---

## Real-World Example: GlobeOp DevOps

The GlobeOp team (`ssc-devops` in the catalog) built a DevOps-focused plugin:

1. **ssc-cloud-deploy** - Bolt API + Ansible deployment automation
2. **ssc-cloud-cicd** - GitHub Actions with blue-green deployments
3. **ssc-cloud-monitor** - OpenSearch + Prometheus + Grafana setup
4. **ssc-cloud-security** - LDAP/AD + secrets management
5. **ssc-cloud-troubleshoot** - Systematic infrastructure debugging

They didn't need the full agent orchestration for their use case - they built domain-specific skills that encode their team's deployment patterns.

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Better Approach |
|-------------|---------|-----------------|
| Fork the base, never update | Miss improvements and bug fixes | Use `/upgrade-plugin` regularly |
| Override everything | Defeats the purpose of shared standards | Customize only what your domain requires |
| Skip the two-stage review | Agents produce unverified code | Always keep spec-reviewer + quality-reviewer |
| No domain agents | Generic agents don't understand your business | Add at least one domain expert agent |
| Don't register in catalog | Other teams can't discover your patterns | Run `/contribute-plugin-marketplace` |
| Giant monolithic plugin | Hard to maintain, slow to load | Split into focused plugins (like cloud team did) |

---

## Governance

### Labels for Agent Work

| Label | Meaning |
|-------|---------|
| `claude-code-agent-harness` | Issue is agent-ready, can be picked up by `/jira-work` |
| `human-review-required` | Needs human review before agent pickup |

### Who Owns What

| Layer | Owner | Cadence |
|-------|-------|---------|
| Base plugin (agent-orch) | AI Governance Team | Monthly releases |
| Discovery catalog | AI Governance Team | Continuous (MR-based) |
| Team plugins | Individual teams | Team's release cadence |
| Domain agents & rules | Individual teams | As needed |
| Catalog entries | Individual teams | On major releases |
