---
name: c4
description: "Generate C4 model architecture documentation for the entire codebase. Creates docs/c4/ with System Context, Container, Component diagrams in Mermaid, navigation, and decision records. Updates existing docs when the codebase changes. Usage: /agent-orch:c4"
---

# C4 Architecture Documentation (/c4)

Generate [C4 model](https://c4model.com/) architecture documentation for your entire codebase using the C4 Scribe agent. Creates a navigable `docs/c4/` directory with Mermaid diagrams at each abstraction level.

---

## When to Use

- **New project** -- no architecture documentation exists yet
- **Existing project** -- has code but no `docs/c4/` directory
- **Stale docs** -- `docs/c4/` exists but the codebase has changed significantly (new services, changed integrations, refactored components)

---

## What It Does

1. **Scans the codebase** -- detects entry points, services, data stores, external integrations, deployment topology
2. **Determines mode** -- Greenfield (create from scratch) or Update (refresh existing docs)
3. **Plans the work** -- presents what will be documented at each C4 level
4. **Generates documentation** using the C4 Scribe agent:
   - Level 1: System Context -- how the system fits into the world
   - Level 2: Container -- high-level tech building blocks (apps, data stores, services)
   - Level 3: Component -- internal structure of each container
   - README index with navigation to all levels
   - Architecture Decision Records directory
5. **Verifies** -- navigation links resolve, Mermaid syntax valid, README index complete

All diagrams use **Mermaid** syntax that renders natively in GitHub and GitLab.

---

## How to Launch Agents

**CRITICAL**: You MUST use the **Task tool** to launch agents. Each agent has a `subagent_type` that must be specified.

**Pattern for launching an agent:**
```
Task tool call:
  subagent_type: "agent-orch:orchestrate-<agent-name>"
  prompt: "<the prompt for the agent>"
  description: "<short 3-5 word description>"
```

---

## Process

### Phase 1: Detect Current State

Before launching any agents, scan the codebase to understand the architecture.

**Check for existing C4 docs:**

1. Check if `docs/c4/` directory exists
2. If it exists, read `docs/c4/README.md` and note what levels are documented and when they were last updated

**Scan for architecture signals:**

1. **Entry points**: Look for `main.*`, `index.*`, `app.*`, `server.*`, `cmd/` directories
2. **Services / containers**:
   - `docker-compose.yml` / `docker-compose.yaml` -- list all services
   - `Dockerfile` / `Dockerfile.*` -- container definitions
   - Kubernetes manifests (`k8s/`, `deploy/`, `manifests/`) -- deployments, services
   - Separate application directories (monorepo structure)
3. **Data stores**:
   - Database configs, connection strings, migration directories
   - Cache configs (Redis, Memcached)
   - Message queues (RabbitMQ, Kafka, SQS)
4. **External integrations**:
   - API client libraries, SDK imports
   - Webhook handlers
   - Third-party service configs (auth providers, payment, email)
5. **Tech stack**:
   - `package.json`, `go.mod`, `requirements.txt`, `pom.xml`, `Cargo.toml`, `*.csproj`
   - Frameworks detected from dependencies
6. **API surface**:
   - Route definitions, controller files, GraphQL schemas, OpenAPI specs

### Phase 2: Present Plan

Based on Phase 1 findings, present one of two modes to the user:

**Mode A: Greenfield (No `docs/c4/` found)**

```
No existing C4 documentation found. Creating from scratch.

Detected architecture:
- Tech stack: [from package.json/go.mod/etc.]
- Services: [from docker-compose/K8s/directory structure]
- Data stores: [databases, caches, queues found]
- External integrations: [APIs, SDKs, third-party services]
- Entry points: [main files, server files]

I will create:
1. docs/c4/README.md -- Architecture index
2. docs/c4/01-system-context.md -- Level 1: System in its environment
3. docs/c4/02-container.md -- Level 2: Tech building blocks
4. docs/c4/03-component.md -- Level 3: Internal structure
5. docs/c4/decisions/README.md -- ADR index

All diagrams in Mermaid with top+bottom navigation.

Proceed? (a) Yes  (b) Let me customize
```

**Mode B: Update (Existing `docs/c4/` found)**

```
Found existing C4 documentation:
- [x] README.md: [present/missing]
- [x] Level 1 (System Context): [present/missing] -- last updated [date]
- [x] Level 2 (Container): [present/missing] -- last updated [date]
- [x] Level 3 (Component): [present/missing] -- last updated [date]
- [x] Level 4 (Code): [present/missing]
- [x] Decisions: [present/missing]

Changes detected since last update:
- [list new services, removed services, new integrations, changed components]

I will update:
- [list only affected levels and what changed]

Proceed? (a) Yes  (b) Let me customize  (c) Regenerate everything from scratch
```

### Phase 3: Launch C4 Scribe Agent

After user approves the plan, launch the C4 Scribe agent.

**Greenfield prompt:**

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-c4-scribe`
- **description**: "Generate C4 architecture docs"
- **prompt**:
  ```
  GREENFIELD C4 architecture documentation for the entire codebase.

  Detected architecture:
  - Tech stack: [stack from Phase 1]
  - Services/containers: [list from Phase 1]
  - Data stores: [list from Phase 1]
  - External integrations: [list from Phase 1]
  - Entry points: [list from Phase 1]

  Create from scratch in docs/c4/:
  1. Analyse the full codebase to understand system boundaries, containers, and components
  2. Create docs/c4/01-system-context.md -- Level 1 with Mermaid diagram showing
     the system, its users, and external systems it integrates with
  3. Create docs/c4/02-container.md -- Level 2 with Mermaid diagram showing all
     containers (apps, services, data stores) and their communication protocols
  4. Create docs/c4/03-component.md -- Level 3 with Mermaid diagrams showing
     internal components of each significant container (one diagram per container)
  5. Create docs/c4/decisions/README.md -- empty ADR index
  6. Create docs/c4/README.md -- main index with overview, links to all levels,
     key facts (tech stack, deployment, integrations)
  7. Add top+bottom navigation to EVERY file
  8. Verify: all navigation links resolve, Mermaid syntax valid, README index complete

  Follow C4 model conventions: https://c4model.com/
  Use the C4 colour palette: #438DD5 (internal), #08427B (system), #999999 (external), #1168BD (people).

  Read CLAUDE.md for project standards. Standards from .claude/rules/ are auto-loaded.
  ```

**Update prompt:**

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-c4-scribe`
- **description**: "Update C4 architecture docs"
- **prompt**:
  ```
  UPDATE existing C4 architecture documentation.

  Detected architecture:
  - Tech stack: [stack from Phase 1]
  - Services/containers: [list from Phase 1]
  - Data stores: [list from Phase 1]
  - External integrations: [list from Phase 1]

  Current docs/c4/ state:
  [list existing files and their current content summary from Phase 1]

  Changes detected:
  [list specific changes from Phase 2]

  Update ONLY the affected levels. Do NOT rewrite unchanged sections.
  - New external integration? -> Update Level 1 (system context)
  - New service/container? -> Update Level 2 (containers)
  - New module/component? -> Update Level 3 (components)
  - Changed communication patterns? -> Update affected relationship arrows

  Preserve existing content. Add or modify only what changed.
  Update the "Last updated" date in README.md.
  Verify: all navigation links resolve, Mermaid syntax valid, README index complete.

  Follow C4 model conventions: https://c4model.com/

  Read CLAUDE.md for project standards. Standards from .claude/rules/ are auto-loaded.
  ```

### Phase 4: Report Results

After the C4 Scribe Agent completes:

1. Read the agent's output and status
2. Present summary to user:
   - Mode used (Greenfield / Update)
   - Files created/modified
   - C4 levels documented
   - Verification results

3. Provide next steps:

```
## C4 Documentation Complete

View your architecture docs:
  docs/c4/README.md           -- Start here (main index)
  docs/c4/01-system-context.md  -- Level 1: System in context
  docs/c4/02-container.md       -- Level 2: Containers
  docs/c4/03-component.md       -- Level 3: Components

All diagrams render natively in GitHub/GitLab (Mermaid syntax).

### Keeping Docs Current
Run `/agent-orch:c4` again after major architecture changes, or include
the C4 Scribe agent in your `/agent-orch:build` or `/agent-orch:implement`
workflows for automatic updates.

### C4 Model Reference
https://c4model.com/
```

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.c4:` entry. If the file is absent, has no
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
