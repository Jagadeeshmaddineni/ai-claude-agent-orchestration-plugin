# Supply Chain Security for the Agentic SDLC

AI-generated code exponentially increases software supply chain surface area. Every agent build introduces dependencies, modifies code, and produces artifacts that must be tracked, attested, and secured. This document defines the defense-in-depth strategy for the agentic development platform.

---

## Why This Is Critical

### The New Attack Surface

Traditional SDLC has a manageable supply chain: humans choose dependencies, CI builds artifacts, known tools produce known outputs.

Agentic SDLC changes this fundamentally:

| Traditional SDLC | Agentic SDLC |
|-------------------|--------------|
| Human selects dependencies | Agent selects dependencies dynamically |
| Fixed CI pipeline | Agents may modify build configuration |
| Known code authors | 26 agents producing code per session |
| Static dependency tree | Dynamic dependency changes per build |
| Manual code review | Automated review (but can agents be compromised?) |
| Predictable artifact provenance | Agent-generated artifacts need attestation |

### The Compounding Problem

- **Model CVEs are dynamic**: A model vulnerability isn't like a library CVE - it changes behavior without changing code
- **Agent configurations live in production**: Agent definitions (`.md` files with tool access) ARE the production configuration
- **Where are agents running?** Local dev, CI/CD, cloud - each has different trust boundaries
- **Rate of change**: Agents produce more code, faster, with more dependencies, increasing the surface area linearly with adoption

---

## Defense-in-Depth Strategy

We should NOT choose between building our own solution and adopting Kusari. We should do both. Redundancy is the point.

```
Layer 1: Internal Controls (What We Build)
    |
    +-- Agent provenance tracking
    +-- Agent-generated SBOM requirements
    +-- Code provenance in commit metadata
    +-- Policy enforcement in agent review gates
    |
Layer 2: Kusari Platform (What We Integrate)
    |
    +-- GUAC graph database for supply chain visibility
    +-- Automated SBOM generation and management
    +-- Vulnerability intelligence with context
    +-- Provenance verification and attestation
    +-- CI/CD policy enforcement (fail-fast)
    |
Layer 3: Combined (Defense in Depth)
    |
    +-- Internal controls catch agent-specific risks
    +-- Kusari catches traditional supply chain risks
    +-- Neither alone covers the full surface area
    +-- Redundancy is intentional
```

---

## Layer 1: Internal Controls (Build Our Own)

### 1.1 Agent Provenance Tracking

Every agent action should produce a provenance record:

```json
{
  "agent": "orchestrate-builder",
  "model": "claude-sonnet-4-6",
  "session": "ssnc-agent-orch/2026-04-16-user-api/",
  "action": "add_dependency",
  "dependency": "express@4.18.2",
  "reason": "Required for REST API implementation per PLAN.md",
  "timestamp": "2026-04-16T14:30:00Z",
  "plan_reference": "PLAN.md#task-3",
  "human_approved": false,
  "review_status": "pending"
}
```

**Status**: Not built. Requires instrumentation in the Builder agent and a log sink.

### 1.2 Agent-Generated SBOM Requirements

Every `/build` session should produce an SBOM as a mandatory artifact:

- **Format**: CycloneDX (JSON) or SPDX
- **Scope**: All dependencies added or modified during the session
- **Attribution**: Which agent added each dependency and why
- **Attestation**: Signed by the session with human approval status

**Status**: Not built. The Validator agent could generate this as part of integration verification.

### 1.3 Code Provenance in Commits

All agent-generated commits already include `Co-Authored-By: Claude` attribution. Extend this to include:

- Session ID
- Plan reference
- Review status (which stages passed)
- Agent chain (which agents touched this code)

```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
Agent-Session: ssnc-agent-orch/2026-04-16-user-api
Agent-Chain: architect -> builder -> validator -> spec-reviewer -> quality-reviewer
Review-Status: APPROVED (stage-1: PASS, stage-2: PASS)
```

**Status**: Partially built (Co-Authored-By exists). Extended metadata is not.

### 1.4 Policy Enforcement in Agent Review Gates

The two-stage review system should include supply chain checks:

**Stage 1 (Spec Reviewer) additions:**
- Verify no unexpected new dependencies (not mentioned in spec)
- Flag dependency version pinning (exact versions, not ranges)
- Check for known vulnerable dependencies before approving

**Stage 2 (Quality Reviewer) additions:**
- Verify SBOM was generated
- Check dependency licenses against approved list
- Verify no transitive dependency conflicts

**Status**: Not built. Review agents focus on code quality, not supply chain.

---

## Layer 2: Kusari Integration

### 2.1 Why Kusari

Kusari built GUAC (Graph for Understanding Artifact Composition), an OpenSSF incubating project. Their platform:

- **Maps the full supply chain graph**: Every library, binary, and container traced to source
- **Ingests multiple formats**: CycloneDX, SPDX, in-toto, SLSA, OSV, OpenSSF Scorecard, CSAF/VEX
- **Provides context, not noise**: 70% faster MTTR by showing what matters
- **Enforces policy in CI/CD**: Fail-fast on insecure components, zero unknowns in prod
- **Produces attestations**: Signed SBOMs, vulnerability reports, provenance records

### 2.2 Integration Points

```
Agent Build Session
    |
    v
Agents produce code + dependencies
    |
    v
Integration Verification (Phase 3.5)
    |
    +-- Build succeeds?
    +-- Tests pass?
    +-- [NEW] Kusari scan: SBOM generated, vulnerabilities checked
    +-- [NEW] Internal controls: agent provenance logged
    |
    v
Two-Stage Review (Phase 4)
    |
    +-- Spec compliance + [NEW] dependency compliance
    +-- Code quality + [NEW] supply chain attestation
    |
    v
Commit + Push
    |
    v
CI/CD Pipeline
    |
    +-- [Kusari] Full SBOM generation
    +-- [Kusari] Provenance verification
    +-- [Kusari] Policy enforcement (block on violations)
    +-- [Kusari] GUAC graph update
    +-- [Internal] Agent provenance attestation
    |
    v
Production Deployment
    |
    +-- [Kusari] Continuous monitoring
    +-- [Kusari] VEX reporting for new CVEs
    +-- [Internal] Agent configuration audit trail
```

### 2.3 GUAC for Agent-Generated Code

GUAC's graph database is particularly valuable for agent-generated code because:

1. **Agents change dependencies frequently**: GUAC tracks the delta, not just the state
2. **Multiple agents touch the same artifacts**: The graph shows the full chain of custody
3. **Model changes affect behavior**: GUAC can track model version as a "dependency" of agent-generated artifacts
4. **Cross-team visibility**: When GIDS and GlobeOp both use the same base plugin, GUAC shows shared risk

### 2.4 Kusari + Agent Orchestration Skills

Proposed skills for Kusari integration:

| Skill | Description |
|-------|-------------|
| `/add-skill kusari-scan` | Run Kusari Inspector on agent-generated changes |
| `/add-skill kusari-sbom` | Generate and sign SBOM for the current session |
| `/add-skill kusari-policy` | Check agent changes against supply chain policy |

---

## Layer 3: Combined Defense-in-Depth

Neither layer alone is sufficient:

| Risk | Internal Controls | Kusari | Combined |
|------|------------------|--------|----------|
| Agent adds malicious dependency | Provenance log shows which agent added it | SBOM scan catches known vulnerable packages | Both: trace who added it + block if vulnerable |
| Model CVE changes agent behavior | Agent chain tracking detects behavioral drift | N/A (model behavior isn't a package) | Internal controls cover what Kusari can't |
| Typosquatted package in agent suggestion | Not caught (agents don't know typosquats) | Provenance verification traces to source | Kusari catches what internal controls can't |
| Transitive dependency vulnerability | Not caught (too deep for agent review) | GUAC graph exposes full transitive chain | Kusari handles the depth |
| Agent configuration tampering | Agent definition audit trail | N/A (agent configs aren't packages) | Internal controls cover agent-specific risks |
| License compliance violation | Not built | Automated license checking | Kusari handles this well |

**The principle**: Build what's unique to our agentic context (agent provenance, model tracking, configuration audit). Integrate Kusari for everything else (dependency scanning, SBOM management, vulnerability intelligence, attestation).

---

## Agent Configuration as Code: A Special Risk

Agent definitions (`.md` files in `plugins/agent-orch/agents/`) grant tool access:

```yaml
tools: [Glob, Grep, LS, Read, NotebookRead, Edit, Write, Bash, TodoWrite, Task]
```

An agent with `Bash` access can execute arbitrary commands. An agent with `Write` access can modify any file. These configurations:

- **Are the security boundary** between "agent can read" and "agent can execute"
- **Live in git** but aren't treated with the same rigor as IAM policies
- **Change per plugin inheritance** - when a team inherits a plugin, they may unknowingly expand agent permissions
- **Have no audit trail** beyond git history

### Recommendations

1. **Treat agent definitions as security-sensitive**: Changes to agent tool grants should require security review
2. **Principle of least privilege**: Agents should have minimum required tools (many agents have Bash but don't need it)
3. **Agent configuration attestation**: Sign agent definitions and verify they haven't been tampered with
4. **Runtime monitoring**: Track what tools each agent actually uses vs what's granted (detect privilege expansion)

---

## Implementation Roadmap

| Phase | Action | Effort | Dependencies |
|-------|--------|--------|-------------|
| **Phase 0** | Audit current agent tool grants (principle of least privilege) | Low | None |
| **Phase 1** | Add agent provenance logging to Builder/Validator | Medium | Logging infrastructure |
| **Phase 1** | Evaluate Kusari platform (trial/POC) | Low | Kusari engagement |
| **Phase 2** | Integrate Kusari Inspector into integration verification | Medium | Kusari trial |
| **Phase 2** | Add SBOM generation to `/build` pipeline | Medium | CycloneDX tooling |
| **Phase 3** | Extended commit metadata (agent chain, review status) | Low | Git hook |
| **Phase 3** | Supply chain checks in review agents | Medium | Dependency scanning tool |
| **Phase 4** | GUAC deployment for cross-team supply chain graph | High | Kusari platform |
| **Phase 4** | Agent configuration attestation and signing | High | Signing infrastructure |
| **Phase 5** | Runtime agent tool usage monitoring | High | Telemetry infrastructure |

---

## Key Principle

**Every line of agent-generated code is a supply chain event.** When 26 agents across multiple teams are producing code at scale, the supply chain isn't just npm packages and Docker images anymore - it's the agents themselves, their configurations, their model versions, and every decision they make about what code to write and what dependencies to include.

We must secure this from the ground up, not bolt it on later. Defense-in-depth means building what's unique to us AND integrating the best external tools. Kusari + GUAC for traditional supply chain. Internal controls for the agent-specific surface area. Both, always.
