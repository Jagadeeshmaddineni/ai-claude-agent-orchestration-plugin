# Skill & Capability Inventory

Complete inventory of what ships with the platform vs what is discoverable through the marketplace.

---

## Included: Agent Orchestration Plugin (v2.13.0)

### Skills (19)

| Skill | Category | Description | Status |
|-------|----------|-------------|--------|
| `/agent-orch:build` | Core | Multi-agent implementation from conversation - no spec-kit required | Stable |
| `/agent-orch:implement` | Core | Spec-kit-driven multi-agent implementation with parallel specialists | Stable |
| `/agent-orch:analyse` | Core | Multi-agent codebase analysis (Architect + Scribe in parallel) | Stable |
| `/agent-orch:init-plugin` | Lifecycle | Plugin discovery, selection, and configuration wizard | Stable |
| `/agent-orch:upgrade-plugin` | Lifecycle | Seamless plugin upgrade with three-way merge | Stable |
| `/agent-orch:inherit-plugin` | Lifecycle | Clone and remap an existing plugin for your domain/tech | Stable |
| `/agent-orch:setup-claude-md` | Setup | Hierarchical CLAUDE.md structure creation | Stable |
| `/agent-orch:setup-constitution` | Setup | Constitution.md configuration and validation | Stable |
| `/agent-orch:private-cloud` | Infrastructure | SS&C private cloud and AWS hybrid infrastructure planning | Stable |
| `/agent-orch:olly` | Observability | OpenTelemetry stack setup (OTel Collector, Prometheus, Loki, Grafana, Tempo) | Stable |
| `/agent-orch:c4` | Documentation | C4 model architecture documentation with Mermaid diagrams | Stable |
| `/agent-orch:jira` | Integration | Jira project context caching and MCP integration | Stable |
| `/agent-orch:jira-work` | Integration | Jira-driven work queue for agent-ready issues | Stable |
| `/agent-orch:mcp-setup` | MCP | Configure MCP server credentials | Stable |
| `/agent-orch:mcp-start` | MCP | Start local MCP server (Jira, Confluence, TestRail, Azure DevOps, Playwright, SonarQube) | Stable |
| `/agent-orch:mcp-stop` | MCP | Stop running MCP server | Stable |
| `/agent-orch:simplify` | Quality | Code review for reuse, quality, and efficiency | Stable |
| `/agent-orch:complib-guide` | UI | Component library compliance reference | Stable |
| `/agent-orch:workflows-connectors-generate` | Domain | Multi-agent connector generation with C0-C9 constitution | Stable |

### Agents (26)

| Agent | Model | Category | Description |
|-------|-------|----------|-------------|
| `orchestrate-architect` | opus | Core | Planning, codebase analysis, task coordination |
| `orchestrate-builder` | sonnet | Core | TDD-driven implementation, production code |
| `orchestrate-validator` | sonnet | Core | Testing, coverage tracking, Playwright e2e |
| `orchestrate-scribe` | sonnet | Core | API docs, README, usage guides |
| `orchestrate-spec-reviewer` | opus | Review | Stage 1: spec compliance verification |
| `orchestrate-quality-reviewer` | opus | Review | Stage 2: code quality, patterns, constitution |
| `orchestrate-debugger` | opus | Support | 4-phase root cause investigation |
| `orchestrate-security` | sonnet | Specialist | OWASP audit with file:line evidence |
| `orchestrate-performance` | sonnet | Specialist | Benchmarking, bottleneck analysis |
| `orchestrate-api` | sonnet | Specialist | REST/GraphQL design, OpenAPI specs |
| `orchestrate-database` | sonnet | Specialist | Schema design, migrations, query optimization |
| `orchestrate-devops` | sonnet | Specialist | CI/CD, Docker, Kubernetes, infrastructure |
| `orchestrate-telemetry` | sonnet | Specialist | OpenTelemetry, Grafana dashboards |
| `orchestrate-refactorer` | sonnet | Specialist | Code smells, technical debt reduction |
| `orchestrate-migration` | sonnet | Specialist | Framework upgrades, breaking changes |
| `orchestrate-uiux` | sonnet | Specialist | Design system compliance, accessibility |
| `orchestrate-data-engineer` | sonnet | Specialist | ETL pipelines, data warehouses |
| `orchestrate-ml-engineer` | sonnet | Specialist | Model training, inference pipelines, MLOps |
| `orchestrate-observability` | sonnet | Specialist | SLOs, alerting, incident metrics |
| `orchestrate-incident-responder` | opus | Specialist | Production incident triage, emergency fixes |
| `orchestrate-legacy-modernizer` | opus | Specialist | Brownfield migration, strangler fig pattern |
| `orchestrate-c4-scribe` | sonnet | Specialist | C4 architecture documentation |
| `orchestrate-advocate` | opus | Coordination | Architecture decisions, cross-team impact, Jira tickets |
| `orchestrate-private-cloud` | sonnet | Coordination | Terraform/HCL for SS&C and AWS hybrid |
| `orchestrate-content-specialist` | sonnet | Coordination | Technical writing, tutorials, blog posts |
| `orchestrate-jira-triage` | sonnet | Coordination | Issue classification for agent-readiness |

### Commands (8 - Lightweight, no agents)

| Command | Description |
|---------|-------------|
| `db-migration-check` | Database migration validation (syntax, breaking changes, rollback) |
| `docs-sync` | Documentation drift detection (signatures, endpoints, examples) |
| `enforce-check` | Enforcement rules validation (patterns, naming, structure) |
| `plan-review` | PLAN.md validation and improvement suggestions |
| `review-quick` | Single-pass code review (critical issues only) |
| `security-quick` | OWASP Top 10 vulnerability scan |
| `status-check` | Project status from session files |
| `test-check` | Test results and coverage reporting |

---

## Included: Plugin Discovery (v0.2.0)

| Skill | Description |
|-------|-------------|
| `/find-plugin` | Conversational auto-discovery - searches catalog from natural language |
| `/discover-plugin` | Full interactive catalog browser with filtering |
| `/contribute-plugin-marketplace` | Wizard to register your plugin in the catalog |
| `/plugin-discover:inherit-plugin` | Clone, remap domain/tech, generate adapted plugin |

---

## Discoverable: SS&C Plugin Catalog

Plugins registered in the marketplace that teams can inherit and adapt.

### SS&C Private Cloud Developer Toolkit (`ssnc-cloud`)

| Component | Description |
|-----------|-------------|
| `/cloud-pipeline:spec-build` | End-to-end feature pipeline: spec generation + architect challenge + multi-agent implementation |
| `/cloud-developer:safe-contributor` | Conservative agent policy with PR size limits and security guardrails |
| `/ssnc-cloud-pro:cloud-architect` | SS&C Cloud Architect expert (Stratus, Gateway, Edge, Roustabout, Gatsby, Icarus, AppDOp) |
| `/cloud-pipeline:cloud-deploy` | Deploy to SS&C Cloud environments (planned) |
| `/cloud-pipeline:cloud-troubleshoot` | Cross-service issue investigation (planned) |
| `/cloud-pipeline:cloud-db` | MariaDB query and schema inspection (planned) |

**Stack**: Java 17+, Spring Boot 3.x, Angular, TypeScript, Terraform, Kubernetes, MariaDB, Loki/Tempo/Grafana

### SS&C DevOps Cloud Automation (`ssc-devops`)

| Component | Description |
|-----------|-------------|
| `/ssc-cloud-deploy` | Deploy via Bolt API + Ansible + Terraform |
| `/ssc-cloud-cicd` | GitHub Actions workflows, blue-green deployments, rollback |
| `/ssc-cloud-monitor` | OpenSearch + Prometheus + Grafana observability |
| `/ssc-cloud-security` | LDAP/AD + secrets + network security |
| `/ssc-cloud-troubleshoot` | Systematic infrastructure debugging |

**Stack**: Python, Ansible, Terraform, GitHub Actions, Docker/Podman, OpenSearch, Prometheus

### Agent Orchestration (in catalog as `agent-orch`)

The core plugin itself is registered in the catalog so teams can discover and inherit it as a foundation for their own orchestration plugins.

---

## Proposed: Additional Skills for Everyone

Based on analysis of the discovery catalog and cross-team needs, these skills should be promoted from discoverable to included in the base plugin or made available via `/add-skill`:

| Skill | Source | Rationale |
|-------|--------|-----------|
| Cloud Architect consultation | ssnc-cloud | Every team touching SS&C infrastructure benefits from platform awareness |
| Safe Contributor policy | ssnc-cloud | Sensible default guardrails any team can adopt |
| Deployment automation | ssc-devops | Bolt API + Ansible patterns are universal for SS&C Cloud |
| Monitoring setup | ssc-devops | OpenSearch/Prometheus/Grafana is the standard stack |

See [ADD-SKILL-PROPOSAL.md](ADD-SKILL-PROPOSAL.md) for the `/add-skill` mechanism.
