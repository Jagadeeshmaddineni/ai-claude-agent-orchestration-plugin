---
name: olly
description: Add OpenTelemetry observability to any codebase. Works for greenfield (no existing telemetry) or brownfield (cut over from vendor-specific SDKs to OpenTelemetry). Sets up OTel Collector, Prometheus, Loki, Tempo, Grafana with env-var-based config for local/cloud portability. Usage: /agent-orch:olly
---

# Observability Setup (/olly)

Add full-stack OpenTelemetry observability to your codebase using the Telemetry Engineer agent. Works for both **greenfield** (no existing telemetry) and **brownfield** (migrating from vendor-specific SDKs to OpenTelemetry).

## SS&C Observability Resources

| Resource | Link |
|----------|------|
| **Observability Platform** | [olly-kc-dev.ssnc-corp.cloud](https://olly-kc-dev.ssnc-corp.cloud/) |
| **Observability POD Teams Channel** | [Teams Channel](https://teams.microsoft.com/l/channel/19%3aa0048df2ce294dd9a10352be65e5e1e8%40thread.tacv2/Observability%2520POD?groupId=51aaa7fa-6c62-4710-9a24-1443932a894f&tenantId=f4c566ce-a3ce-4b10-b55b-1e9d56ad1b26) |

For questions about SS&C's cloud observability infrastructure, endpoints, or onboarding, reach out on the Observability POD Teams channel.

---

## When to Use

- **Greenfield**: Your project has no observability infrastructure. You want traces, metrics, and logs from scratch.
- **Brownfield / Cutover**: Your project uses vendor-specific SDKs (Datadog, New Relic, Splunk, etc.) and you want to migrate to OpenTelemetry for vendor-neutral observability.
- **Gap Fill**: You have partial observability (e.g., metrics but no tracing) and want to complete the stack.

---

## What It Does

1. **Detects current state** -- scans the codebase for existing telemetry (OTel, Datadog, New Relic, Splunk, Jaeger, Zipkin, StatsD, Prometheus client libraries)
2. **Determines mode** -- Greenfield (add from scratch) or Brownfield (migrate to OTel)
3. **Plans the work** -- presents a plan based on the detected state
4. **Implements** using the Telemetry Engineer agent:
   - OTel Collector configuration (receives OTLP, routes to backends)
   - Docker Compose observability stack (Prometheus, Loki, Tempo, Grafana)
   - Grafana dashboard provisioning (datasources + dashboards)
   - Application instrumentation (traces, metrics, structured logging)
   - Environment variable configuration for local/cloud portability
5. **For brownfield**: Replaces vendor-specific SDK calls with OTel equivalents, removes old dependencies, updates configs
6. **Verifies** -- runs validation checks (compose config, health endpoints, Grafana datasources)

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

Before launching any agents, scan the codebase to determine the starting point.

**Scan for existing telemetry:**

1. Search for OpenTelemetry:
   - `@opentelemetry/` (Node.js), `opentelemetry-sdk` (Python), `go.opentelemetry.io` (Go), `OpenTelemetry` (Java/.NET)
   - `otel-collector-config`, `docker-compose` with otel/prometheus/grafana/loki/tempo services

2. Search for vendor-specific SDKs:
   - **Datadog**: `dd-trace`, `datadog`, `DD_AGENT_HOST`, `DD_TRACE_ENABLED`
   - **New Relic**: `newrelic`, `NEW_RELIC_LICENSE_KEY`, `@newrelic/`
   - **Splunk**: `splunk-otel`, `SPLUNK_ACCESS_TOKEN`
   - **Jaeger**: `jaeger-client`, `JAEGER_AGENT_HOST`
   - **Zipkin**: `zipkin`, `ZIPKIN_ENDPOINT`
   - **StatsD**: `statsd`, `hot-shots`, `STATSD_HOST`
   - **Prometheus client**: `prom-client`, `prometheus_client`, `prometheus/client_golang`

3. Search for existing infrastructure:
   - `docker-compose.yml` / `docker-compose.yaml` with observability services
   - `grafana/` directory with dashboards or provisioning
   - `.env` files with telemetry-related variables
   - Kubernetes manifests with collector sidecars

### Phase 2: Present Mode and Plan

Based on Phase 1 findings, present one of three modes to the user:

**Mode A: Greenfield (No existing telemetry detected)**

```
No existing telemetry infrastructure detected. Starting from scratch.

I will:
1. Create OTel Collector config (otel-collector-config.yaml)
2. Add observability services to Docker Compose (Prometheus, Loki, Tempo, Grafana)
3. Provision Grafana datasources and dashboards
4. Add application instrumentation (traces, metrics, structured logging)
5. Create .env.observability with environment variables
6. Verify end-to-end telemetry flow

Detected tech stack: [from package.json/go.mod/etc.]

Proceed? (a) Yes  (b) Let me customize
```

**Mode B: Brownfield / Cutover (Vendor SDK detected)**

```
Detected existing telemetry: [vendor name] ([files found])

I will migrate to OpenTelemetry:
1. Replace [vendor] SDK with OpenTelemetry SDK
2. Map [vendor]-specific instrumentation to OTel equivalents
3. Remove [vendor] dependencies and config
4. Set up OTel Collector to receive OTLP
5. Add observability stack (Prometheus, Loki, Tempo, Grafana)
6. Provision Grafana dashboards
7. Create env-var-based config for local/cloud portability
8. Verify no [vendor] references remain

Files to modify: [list affected files]

Proceed? (a) Yes  (b) Let me customize  (c) Keep [vendor] alongside OTel (dual-write)
```

**Mode C: Gap Fill (Partial OTel detected)**

```
Detected partial OpenTelemetry setup:
- [x] Traces: [found/not found]
- [x] Metrics: [found/not found]
- [x] Logging: [found/not found]
- [x] Collector: [found/not found]
- [x] Grafana: [found/not found]
- [x] Docker Compose stack: [found/not found]

I will fill the gaps:
[list only what's missing]

Proceed? (a) Yes  (b) Let me customize
```

### Phase 3: Launch Telemetry Agent

After user approves the plan, launch the Telemetry Engineer agent.

**Greenfield prompt:**

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-telemetry`
- **description**: "Add observability from scratch"
- **prompt**:
  ```
  GREENFIELD observability setup for this project.

  Detected tech stack: [stack from Phase 1]

  Create from scratch:
  1. otel-collector-config.yaml with OTLP receivers, batch/memory_limiter processors,
     and exporters for Prometheus, Loki, and Tempo
  2. Docker Compose services: otel-collector, prometheus, loki, tempo, grafana
     (add to existing compose file or create docker-compose.observability.yml)
  3. Grafana provisioning: datasources (Prometheus, Loki, Tempo) and dashboards
     (Service Overview RED, Infrastructure, Logs Explorer, Trace Explorer)
  4. Application instrumentation: add OTel SDK init, trace HTTP handlers,
     add structured JSON logging with trace_id/span_id correlation
  5. .env.observability with all endpoint variables (local defaults)
  6. Verify: docker compose config, collector health, Grafana datasources, dashboard JSON valid

  Use environment variables for ALL endpoints. Same code must work for local
  Docker Compose and cloud deployment (https://olly-kc-dev.ssnc-corp.cloud/).

  Read CLAUDE.md for project standards. Standards from .claude/rules/ are auto-loaded.
  ```

**Brownfield prompt:**

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-telemetry`
- **description**: "Migrate to OpenTelemetry"
- **prompt**:
  ```
  BROWNFIELD migration from [vendor] to OpenTelemetry.

  Detected tech stack: [stack from Phase 1]
  Vendor SDK found: [vendor details from Phase 1]
  Files with vendor references: [file list from Phase 1]

  Migration steps:
  1. Replace [vendor] SDK imports with OpenTelemetry SDK equivalents
  2. Map [vendor] instrumentation to OTel: traces, metrics, logging
  3. Remove [vendor] dependencies from package.json/requirements.txt/go.mod
  4. Remove [vendor]-specific config files and env vars
  5. Create otel-collector-config.yaml with OTLP receivers and exporters
  6. Add Docker Compose observability stack (Prometheus, Loki, Tempo, Grafana)
  7. Provision Grafana datasources and dashboards
  8. Create .env.observability with endpoint variables
  9. Grep for any remaining [vendor] references -- must be zero
  10. Verify: docker compose config, collector health, Grafana datasources

  Use environment variables for ALL endpoints. Same code must work for local
  Docker Compose and cloud deployment (https://olly-kc-dev.ssnc-corp.cloud/).

  Read CLAUDE.md for project standards. Standards from .claude/rules/ are auto-loaded.
  ```

**Gap Fill prompt:**

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-telemetry`
- **description**: "Complete observability gaps"
- **prompt**:
  ```
  GAP FILL for existing OpenTelemetry setup.

  Detected tech stack: [stack from Phase 1]
  Current state:
  - Traces: [status]
  - Metrics: [status]
  - Logging: [status]
  - Collector: [status]
  - Grafana dashboards: [status]
  - Docker Compose stack: [status]

  Fill ONLY the gaps. Do NOT modify working existing setup.
  [List specific gaps to fill from Phase 2]

  Use environment variables for ALL endpoints. Same code must work for local
  Docker Compose and cloud deployment (https://olly-kc-dev.ssnc-corp.cloud/).

  Read CLAUDE.md for project standards. Standards from .claude/rules/ are auto-loaded.
  ```

### Phase 4: Report Results

After the Telemetry Agent completes:

1. Read the agent's output and status
2. Present summary to user:
   - Mode used (Greenfield / Brownfield / Gap Fill)
   - Files created/modified
   - Services added to Docker Compose
   - Dashboards provisioned
   - Env vars to configure
   - Verification results

3. Provide next steps:

```
## Next Steps

### Local Development
docker compose up -d    # Start observability stack
open http://localhost:3000  # Grafana dashboards

### Cloud Deployment
Configure these env vars for your cloud environment:
  OTEL_EXPORTER_OTLP_ENDPOINT=https://olly-kc-dev.ssnc-corp.cloud:4317
  OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <your-token>

### Support
- Observability Platform: https://olly-kc-dev.ssnc-corp.cloud/
- Teams Channel: Observability POD (link in docs)
```

---

## Cloud Configuration

When deploying to SS&C's cloud observability infrastructure, override these environment variables:

| Variable | Local Default | Cloud Value |
|----------|--------------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317` | Set per environment by platform team |
| `OTEL_EXPORTER_OTLP_HEADERS` | (empty) | Auth token provided by platform team |
| `GRAFANA_URL` | `http://localhost:3000` | `https://olly-kc-dev.ssnc-corp.cloud/` |

Contact the [Observability POD](https://teams.microsoft.com/l/channel/19%3aa0048df2ce294dd9a10352be65e5e1e8%40thread.tacv2/Observability%2520POD?groupId=51aaa7fa-6c62-4710-9a24-1443932a894f&tenantId=f4c566ce-a3ce-4b10-b55b-1e9d56ad1b26) for cloud endpoint details and onboarding.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.olly:` entry. If the file is absent, has no
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
