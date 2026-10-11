# Now Your Agents Can See and Document Everything

The Claude Agent Orchestration Plugin now ships 17 specialized agents -- up from 15. The two new additions tackle the gaps that kept showing up in production-ready projects: observability and architecture documentation.

## What's New in v2.5.0

### Telemetry Engineer (Agent #16)

A dedicated observability specialist that sets up full-stack OpenTelemetry instrumentation:

- **OTel Collector** with OTLP receivers, batch processors, and exporters
- **Docker Compose stack** -- Prometheus (metrics), Loki (logs), Tempo (traces), Grafana (dashboards)
- **Grafana dashboards** -- Service Overview (RED metrics), Infrastructure, Logs Explorer, Trace Explorer
- **Environment variable config** -- same code works locally (Docker Compose) and in cloud. No hardcoded endpoints

The Telemetry Engineer activates automatically when the Architect detects observability-related work -- new services, logging changes, monitoring gaps.

### C4 Scribe (Agent #17)

Architecture documentation using the [C4 model](https://c4model.com/). Creates and maintains a `docs/c4/` directory with four abstraction levels:

1. **System Context** -- how the system fits into its environment
2. **Container** -- high-level technology choices (apps, data stores, services)
3. **Component** -- internals of each container
4. **Code** -- class/module level (when requested)

All diagrams use **Mermaid syntax** that renders natively in GitHub. Every page includes top and bottom navigation links. When activated during a build, the C4 Scribe updates only the diagrams affected by the changes -- it doesn't regenerate everything from scratch.

To generate C4 docs for your entire codebase in one shot:

```bash
/agent-orch:c4
```

### `/agent-orch:olly` -- One-Command Observability

New skill that runs the Telemetry Engineer for any codebase:

```bash
/agent-orch:olly
```

It scans your project and determines the right mode:

- **Greenfield** -- no existing telemetry. Adds everything from scratch
- **Brownfield** -- migrates from vendor-specific SDKs (Datadog, New Relic, Splunk, Jaeger, Zipkin) to OpenTelemetry
- **Gap Fill** -- completes a partial OTel setup (e.g., has traces but no dashboards)

You review the plan, approve it, and the agent handles the rest.

**SS&C Observability Resources:**
- Platform: [olly-kc-dev.ssnc-corp.cloud](https://olly-kc-dev.ssnc-corp.cloud/)
- Support: [Observability POD Teams Channel](https://teams.microsoft.com/l/channel/19%3aa0048df2ce294dd9a10352be65e5e1e8%40thread.tacv2/Observability%2520POD?groupId=51aaa7fa-6c62-4710-9a24-1443932a894f&tenantId=f4c566ce-a3ce-4b10-b55b-1e9d56ad1b26)

## Install or Upgrade

```bash
# New install
/plugin marketplace add git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
/plugin install agent-orch@ssnc-agent-orch

# Existing users -- force upgrade
/plugin install agent-orch@ssnc-agent-orch
```

Or commit the plugin config to `.claude/settings.json` and your whole team gets it automatically.

---

*Claude Agent Orchestration Plugin v2.5.0 is available now via the Claude Code plugin marketplace at `code.ssnc.dev`.*
