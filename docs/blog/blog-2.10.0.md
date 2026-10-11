# The Engineer Who Says No: Advocate Agent & Jira Coordination v2.10.0

AI coding assistants have a yes-man problem. Ask for microservices, you get microservices. Ask for a hand-rolled auth system, you get a hand-rolled auth system. Nobody pushes back. Nobody asks "have you considered what happens when this hits 10,000 concurrent users?" or "there's already a service in the platform that does this."

v2.10.0 adds the 18th agent to the orchestration: the **Advocate**. It sits between your requirements and your architecture plan and does what a good staff engineer does in a design review -- challenges your assumptions, checks for existing solutions, and makes sure the team knows what you're building before you build it.

## What Changed

### The Advocate Agent

The Advocate runs as Phase 1.5 in both `/build` and `/implement` -- after requirements are gathered, before the Architect draws up a plan. It operates with the persona of a Staff Software Engineer holding CISSP, CCSP, and CSSLP certifications, with deep cloud architecture and business domain experience.

It doesn't just review. It argues.

#### 7-Point Challenge Checklist

Every build session gets challenged on seven dimensions:

1. **Over-engineering** -- Are you building a distributed system when a monolith would ship in a week? Microservices for a team of three?
2. **Security architecture** -- Not just "use HTTPS." mTLS between services? Secrets in Vault or hardcoded? PII encrypted at rest? Auth at the gateway or per-service?
3. **Existing solutions** -- Before writing a single line, the Advocate searches `../totalis` for platform services that already do what you're asking for. Why build a new auth service when `platform-core` already has one?
4. **Operational readiness** -- Who's on call? What's the runbook? How do you roll back? If you can't answer these, you're not ready to ship.
5. **Cost and scale** -- That Kafka cluster costs money. Those Lambda invocations add up. The Advocate models what your architecture costs at 10x current load.
6. **Data architecture** -- Event sourcing sounds great until you need to query across aggregates. The Advocate checks your data model against your access patterns.
7. **Team capacity** -- Five new microservices for a team that's never operated one. The Advocate flags the skill gap.

Each item gets a severity: CRITICAL, HIGH, MEDIUM, or LOW. The user sees every finding and decides what to accept, override, or investigate further.

#### Enforcement Mode

By default, the Advocate operates in **advisory mode with hard-block for CRITICAL findings**. Four things trigger a hard block:

- PII storage without encryption
- Public API without authentication
- Hardcoded secrets or credentials
- Dependencies with CVE score >= 9.0

These cannot be overridden without explicitly setting `ADVOCATE_ENFORCE=false` in your project's CLAUDE.md. On first run, if the setting isn't found, the Advocate explains the options and asks what you want:

```
ADVOCATE_ENFORCE is not configured for this project.

Options:
  true  (default) -- Advisory mode. I present findings as recommendations
        you can accept or override, EXCEPT for CRITICAL severity findings
        which hard-block the build until resolved.

  false -- Pure advisory. All findings are recommendations only.
        You can override anything, including CRITICAL findings.

Recommended: true (advisory with hard-block for CRITICAL)

Which mode do you want for this project?
```

The decision is stored and respected for all future sessions.

#### Infrastructure & Platform Discovery

Before recommending you build something new, the Advocate needs to understand two things: what platform services already exist, and how your code ships to production.

It starts by scanning locally -- checking for adjacent repos like `../totalis/`, looking for Helm charts, Kustomize overlays, Terraform modules, Dockerfiles, and CI/CD configs in the current repo. Then it asks you:

```
Before I recommend building new services, I need to check what already exists.

Does your team have a platform, shared services, or SDK repo?
(a) Yes — SS&C Totalis (I'll clone git@code.ssnc.dev:ai/Totalis.git to ../totalis)
(b) Yes — different repo (I'll tell you the path or git URL)
(c) No shared platform — this project is self-contained
(d) Not sure — skip platform discovery for now
```

If you point it at a platform repo, it searches for services that overlap with what you're building:

```
Platform Discovery Results:

Existing services that overlap with your requirements:
- totalis/packages/platform-core/auth — OAuth2/OIDC service with mTLS
  Relevance: You're building auth. This already exists. Use it or extend it.
- totalis/packages/storage-proxy — S3-compatible object storage
  Relevance: Your design includes file storage. This handles it.

Recommendation: Use platform-core/auth instead of building a new auth
service. If it's missing features you need, create a Jira ticket to
extend it rather than building a parallel implementation.
```

Then comes the shipping question -- how does code get to production?

```
I found the following deployment infrastructure in this repo:
- Helm charts in ./charts/ (Kubernetes deployment)
- GitHub Actions in .github/workflows/ (CI/CD)
- Dockerfile (container build)
- Kustomize overlays in ./k8s/overlays/ (dev, staging, prod)

This tells me you ship via: containerized services → Kubernetes via
Kustomize overlays with GitHub Actions CI/CD.

Is this accurate? Anything I'm missing about how you ship?
```

If there's no infrastructure-as-code at all, the Advocate flags it:

```
Finding (HIGH): No infrastructure-as-code found. Manual deployment without
IaC leads to configuration drift, inconsistent environments, and "works on
my machine" failures.

Recommendation: Before building new features, establish IaC. A Dockerfile +
Helm chart + CI pipeline is a solid start.
```

Prototypes get a softer touch -- a MEDIUM advisory noting that IaC should be established before shipping to production. The Advocate accommodates early-stage work without blocking it.

The Architect reads the shipping discovery to understand deployment constraints. If Helm charts exist, new services need Helm templates. If Kustomize overlays exist, the Architect adds overlay patches. If nothing exists, the Architect includes IaC creation in the plan. No more designing architecture in a vacuum without knowing how it deploys.

### Jira as a Communication Channel

This is the big one. The Advocate turns Jira into the communication channel between engineers' Claude Code instances.

Every agent-assisted build session gets a Jira ticket with the `claude-code-agent-harness` label. When Engineer A starts a `/build` on their machine, the Advocate searches for all issues with that label to see what Engineer B, C, and D are already working on. It's not just tracking -- it's coordination.

#### Three Coordination Modes

Not every project uses Jira. The Advocate adapts:

**Jira Mode** -- Full MCP integration. Searches for active work, detects conflicts, creates and manages tickets through their lifecycle.

**Markdown Mode** -- For projects without Jira, a `TEAM-BOARD.md` file in the repo serves as the coordination board. Same conflict detection, same visibility, committed to git so the whole team sees it.

**None Mode** -- The challenge checklist still runs. You just don't get team coordination. For solo projects or early prototypes where the overhead isn't worth it.

#### Team Awareness (Phase A)

Before anything else, the Advocate reads the room:

```
Team Activity (claude-code-agent-harness):

| Issue    | Summary                    | Assignee    | Status      |
|----------|----------------------------|-------------|-------------|
| PROJ-142 | Auth service refactor      | Engineer A  | In Progress |
| PROJ-138 | API gateway rate limiting  | Engineer B  | In Progress |
| PROJ-151 | User profile caching layer | Engineer C  | Open        |

3 issues with claude-code-agent-harness label found.
2 currently in progress.
```

You see what the team is doing before you start.

#### Conflict Detection (Phase B)

The Advocate compares your requirements against in-progress work:

```
CONFLICT DETECTED

Your build: "Add JWT validation to API gateway"
In progress: PROJ-138 — "API gateway rate limiting" (Engineer B, In Progress)

Both modify the API gateway middleware chain. Concurrent changes to
the same routing layer risk merge conflicts and behavioral interference.

RECOMMENDATION: Coordinate with Engineer B before proceeding.
This build is BLOCKED until you confirm how to proceed.
```

Conflicts block the build. You talk to the other engineer, resolve the overlap, then continue. The Advocate adds a comment on the conflicting Jira issue so the other engineer knows too.

#### Session Tracking (Phase C)

Every build gets a ticket:

```
This build session doesn't have a Jira ticket yet. Every agent-assisted
build should be tracked so the team can see what's happening.

Proposed ticket:
  Summary: Add JWT validation to API gateway
  Type: Story
  Labels: claude-code-agent-harness
  Assignee: jstein (from .claude/rules/jira.md)
  Description: [from requirements]

Create this ticket? (yes / modify / link to existing issue)
```

No hardcoded projects. No hardcoded assignees. The Advocate reads from `.claude/rules/jira.md` -- set up once with the `/jira` skill, used everywhere.

#### Full Lifecycle Management (Phase D)

Tickets don't just get created. They get managed:

- **Start**: Transition to In Progress, add comment noting session started
- **Complete**: Transition to Done, add comment with summary of what was built
- **Blocked**: Transition to Blocked, create linked blocker issue, add comment explaining what's blocking
- **Abort**: Transition back to Open, add comment noting the session was aborted and why
- **Out-of-scope work**: New backlog issues created for work discovered during the build but outside current scope, linked to the session ticket

The ADVOCATE-REVIEW.md output captures all of this:

```markdown
## Jira Session Ticket
**Issue**: PROJ-155 — Add JWT validation to API gateway
**Status**: Created, transitioned to In Progress

## Team Activity (claude-code-agent-harness)
| Issue    | Summary                   | Assignee   | Status      | Conflict? |
|----------|---------------------------|------------|-------------|-----------|
| PROJ-142 | Auth service refactor     | Engineer A | In Progress | No        |
| PROJ-138 | API gateway rate limiting | Engineer B | In Progress | YES       |

## Conflicts Detected
- PROJ-138: Engineer B is modifying the same gateway middleware.
  Coordinated with user — proceeding after confirming non-overlapping layers.
```

### Architect Integration

The Architect agent now reads ADVOCATE-REVIEW.md before creating a plan. Decision outcomes from the Advocate review are binding:

- **Accepted recommendations** become constraints in the architecture plan
- **Overridden recommendations** are respected -- the Architect doesn't re-litigate what the user already decided

The PLAN.md template includes a new `## Coordination` section:

```markdown
## Coordination
Mode: jira
Session Ticket: PROJ-155
Label: claude-code-agent-harness
```

Every downstream agent knows the tracking ticket.

### Git Secret Scanner (Bonus)

v2.10.0 also ships a PreToolUse hook that scans for secrets before `git add` and `git commit`. It catches:

- AWS access keys (`AKIA...`)
- Private keys (RSA, DSA, EC, OpenSSH, PGP)
- GitHub, GitLab, and Slack tokens
- JWTs
- Generic API keys and passwords in config
- Database connection strings with embedded credentials

If a secret is found, the commit is blocked with a masked preview showing the file, line number, and secret type. You fix it before it ever hits the repo.

## Why This Matters

The problem with AI coding assistants isn't capability. It's that they're too agreeable. Ask for something bad and they'll build it beautifully. The Advocate changes that dynamic. It's another engineer in the room -- one who's seen what happens when you skip the design review.

The Jira coordination solves a harder problem: when five engineers are all running Claude Code on the same codebase, how do they know what each other is doing? Before this, they didn't. Each Claude Code instance was isolated. Now they communicate through Jira (or a markdown board), and every agent-assisted session is visible to the entire team.

This is human-on-the-loop done right. The AI doesn't make decisions for you. It surfaces information you need, challenges assumptions you should question, and makes sure your work is visible to the people who need to see it.

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
# Set up Jira integration (optional but recommended)
/agent-orch:jira

# Run a build -- the Advocate activates automatically in Phase 1.5
/agent-orch:build Add user authentication to the API
```

The Advocate will challenge your design, check for conflicts, and ensure the team knows what you're building. Accept its recommendations or override them -- either way, the decision is documented and the work is tracked.

---

*Claude Agent Orchestration Plugin v2.10.0 is available now via the Claude Code plugin marketplace at `code.ssnc.dev`.*
