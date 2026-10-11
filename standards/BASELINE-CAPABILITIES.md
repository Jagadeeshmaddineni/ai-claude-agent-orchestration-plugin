# Baseline Capabilities: What You Get Out of the Box

What the platform delivers on day one with zero configuration, and how it grows with you.

---

## Zero-Config: Install and Go

After installing the agent orchestration plugin and the discovery plugin, every developer gets:

### Immediate Capabilities

```
Day 1: Install two plugins
  |
  +-- /agent-orch:build
  |     "Build me a REST API for user management"
  |     -> Architect plans, Builder codes (TDD), Validator tests,
  |        Security audits, Scribe documents, Reviewers verify
  |     -> Working, tested, documented, reviewed code
  |
  +-- /find-plugin
  |     "Is there a plugin for Terraform deployments?"
  |     -> Searches SS&C catalog, recommends matching plugins
  |
  +-- /agent-orch:olly
  |     "Add observability to this service"
  |     -> OTel Collector, Prometheus, Loki, Tempo, Grafana
  |     -> Docker Compose for local, env vars for cloud
  |
  +-- /agent-orch:c4
  |     "Document this architecture"
  |     -> C4 diagrams (System Context, Container, Component)
  |     -> Mermaid, navigation, decision records
  |
  +-- /agent-orch:simplify
  |     "Review my recent changes"
  |     -> Code quality, reuse opportunities, efficiency
  |
  +-- 8 quick commands (no agents needed):
        security-quick, review-quick, test-check,
        db-migration-check, docs-sync, etc.
```

### What "Out of the Box" Actually Means

| Capability | Requires Setup? | Works With Any Language? |
|------------|----------------|------------------------|
| Multi-agent builds (`/build`) | No | Yes - auto-detects tech stack |
| Two-stage code review | No | Yes |
| TDD enforcement | No | Yes |
| Security audit (OWASP) | No | Yes |
| Performance analysis | No | Yes |
| API design review | No | Yes |
| Database migration checks | No | Yes |
| Documentation generation | No | Yes |
| Plugin discovery | No | N/A |
| Observability setup (`/olly`) | No | Yes (Docker required) |
| C4 architecture docs (`/c4`) | No | Yes |
| Jira integration | MCP setup | N/A |
| Private cloud infra | No | Terraform/HCL |
| Bluestone UI enforcement | Planned (in development) | React, Angular, Web Components |

---

## Growth Path

### Level 1: Use `/build` for Everything (Week 1)

Just describe what you want built. The orchestrator handles the rest.

```
/agent-orch:build Add pagination to the /api/users endpoint
```

What happens behind the scenes:
1. Architect reads your codebase, creates a plan
2. Builder implements with TDD (writes tests first)
3. Validator runs test suite, checks coverage
4. Security agent scans for vulnerabilities
5. Spec Reviewer verifies plan was followed
6. Quality Reviewer checks code quality
7. You get a working, tested, reviewed feature

**You learn**: How agents work, what the review process catches, how TDD flows.

### Level 2: Add Jira Integration (Week 2-3)

```
/agent-orch:mcp-setup    # Configure Jira credentials
/agent-orch:jira          # Cache project metadata
/agent-orch:jira-work     # Browse agent-ready issues
```

Now your workflow becomes:
1. Label issues `claude-code-agent-harness` in Jira
2. `/jira-work` shows agent-ready issues
3. Pick one, agents pull requirements from the issue
4. Implementation flows through the same /build pipeline

### Level 3: Customize Your Plugin (Month 1-2)

```
/agent-orch:inherit-plugin git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
```

Add what your team needs:
- Domain-specific agents
- Language conventions
- Compliance rules
- Custom deployment hooks

### Level 4: Share Back (Month 2+)

```
/contribute-plugin-marketplace
```

Register your adapted plugin so other teams benefit from your patterns.

---

## What the Platform Does NOT Do (Honestly)

| Gap | Status | Workaround |
|-----|--------|-----------|
| Runtime agent monitoring / observability | Not built | STATUS.md is the only window; no dashboards |
| Cost tracking per agent run | Not built | No visibility into token usage per build |
| Rollback of agent-generated code | Not automated | Git revert is manual |
| Cross-repo orchestration | Not supported | Agents work within one repo at a time |
| Real-time collaboration | Not supported | One human + agents per session |
| Agent marketplace (hire/fire agents) | Plugin inheritance only | `/inherit-plugin` is the mechanism |
| Automated testing of agent behavior | Not built | No regression tests for agent quality |
| Approval workflows | Jira labels only | No built-in approval gates beyond review agents |

These are real limitations. The platform is strongest when:
- Working within a single repository
- A human is present to guide and approve
- The work can be described in a spec or conversation
- The target is code, tests, and documentation

---

## Architecture at a Glance

```
                     Human Developer
                           |
                     Claude Code CLI
                           |
              +------------+------------+
              |                         |
    Agent Orchestration           Plugin Discovery
    Plugin (core engine)          (marketplace)
              |                         |
    +----+----+----+----+         +----+----+
    |    |    |    |    |         |    |    |
  Arch Build  Val  Rev  ...     Find Disc Contrib
    |    |    |    |    |
    +----+----+----+----+
              |
        Your Codebase
```

### Coordination Modes

**Subagent Mode** (default): Orchestrator launches agents sequentially via the Task tool. Simple, predictable, works everywhere.

**Agent Teams Mode** (experimental): Agents communicate directly via SendMessage. Better for complex features with 6+ specialists. Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

---

## Comparison: With and Without the Platform

| Scenario | Without Platform | With Platform |
|----------|-----------------|---------------|
| Build a feature | Human writes code | Human describes intent, agents implement with TDD, review gates verify |
| Code review | Human reviews (or skipped) | Two-stage automated review + human final review |
| Security audit | Periodic manual scan | Security agent runs on every build |
| Documentation | Written after (or never) | Scribe agent documents during implementation |
| Architecture docs | Manual Visio/Draw.io | `/c4` generates Mermaid diagrams from code |
| Observability setup | Days of manual configuration | `/olly` generates full stack in minutes |
| Cross-team patterns | Copy-paste or reinvent | `/discover-plugin` + `/inherit-plugin` |
| Onboarding new dev | Weeks of context gathering | Agents encode team patterns, conventions, and domain knowledge |
