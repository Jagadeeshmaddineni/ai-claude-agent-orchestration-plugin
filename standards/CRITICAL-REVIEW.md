# Critical Review: Honest Assessment of the Platform

An unvarnished look at what works, what doesn't, and what we should improve. Written in the spirit of the spec-reviewer agent: distrust claims, verify evidence, flag gaps.

---

## What We Do Well

### 1. Two-Stage Review is Genuinely Valuable
The separation of spec compliance from code quality is a real architectural insight. Most AI code generation tools produce code that "works" but drifts from intent. Having an independent skeptical reviewer that reads the spec and verifies against actual code is the right approach.

**Evidence**: The spec-reviewer explicitly says "DISTRUST THE IMPLEMENTER'S REPORT" and independently reads source files. This isn't theater - it catches real gaps.

### 2. Out-of-the-Box Works Without Configuration
`/build` works from conversation alone. No spec-kit, no configuration files, no setup wizard. A developer can install the plugin and be productive in minutes. This is the correct onboarding experience.

### 3. Plugin Inheritance is the Right Model
Rather than one-size-fits-all or build-from-scratch, inheritance lets teams start with battle-tested patterns and customize what their domain requires. The `/inherit-plugin` wizard handles the tedious remapping.

### 4. Discovery Catalog is Well-Designed
The `plugin.md` manifest format with structured frontmatter enables real searchability. The taxonomy (division > BU > team > plugin) mirrors how SS&C is organized. `/find-plugin` for quick search + `/discover-plugin` for deep browsing covers both use cases.

### 5. Agent Specialization is Right-Sized
26 agents is a lot, but each has a clear, non-overlapping responsibility. The model selection (opus for reasoning-heavy tasks, sonnet for focused work) shows cost/capability awareness.

---

## What Needs Improvement

### 1. No Observability into Agent Behavior
**Problem**: The human cannot see what agents are doing in real time. STATUS.md is a text file updated by the orchestrator, not a live dashboard. There is no way to:
- See token usage per agent
- Track time spent per phase
- Compare efficiency across builds
- Detect when an agent is spinning its wheels

**Impact**: Teams can't optimize their workflows because they have no data on what's happening.

**Recommendation**: Build a lightweight session analytics tool. Log structured events (agent start, agent complete, tokens used, files modified) to a JSON file. A `/build-report` command could summarize.

### 2. The Agent Count Discrepancy is Confusing
The catalog manifest says "17 agents" but the actual repo has 26. The CLAUDE.md says "18 total skills" and "25 total agents" but the actual counts are 19 and 26. The README, CHEAT-SHEET, and CLAUDE.md all reference different counts. This erodes trust in documentation accuracy.

**Impact**: Teams evaluating the platform see conflicting numbers and wonder what else is inaccurate.

**Recommendation**: Automate count verification. A CI check that counts `orchestrate-*.md` files and compares against README/CHEAT-SHEET/catalog would prevent drift.

### 3. No Regression Testing for Agent Quality
We have no way to verify that agents produce consistent quality over time. If a model update changes behavior, if a SKILL.md edit introduces a subtle regression, if a rule conflict causes unexpected outcomes - we won't know until a user reports it.

**Impact**: The platform's quality guarantee is only as good as the latest manual test.

**Recommendation**: Build a test suite of canonical tasks. Run them periodically. Compare outputs against baseline. Flag regressions. This is what `/agent-orch:simplify` does for user code - we should eat our own cooking.

### 4. The `/add-skill` Gap is Real
The all-or-nothing plugin model means a team that wants one skill gets 26 agents and 19 skills. This is the most common feedback from teams evaluating adoption.

**Impact**: Slows adoption. Teams with lightweight needs choose to go without rather than take on the full plugin.

**Recommendation**: Implement `/add-skill` as proposed in ADD-SKILL-PROPOSAL.md. Start with Phase 1 (local extraction) which is low effort and immediately useful.

### 5. Documentation Says Things the Code Doesn't Enforce
- README says "100% test coverage targets" but this is a soft default in agent prompts, not a hard gate
- CLAUDE.md says "18 total skills" but there are 19
- The catalog says version 2.8.0 but the repo is at 2.13.0
- Agent Team mode is described as production-ready in some docs but "experimental" in others

**Impact**: Developers building on the platform can't trust documentation as the source of truth.

**Recommendation**: Treat documentation like code. CI checks for counts, versions, and feature flags. The `docs-sync` command exists but isn't run automatically.

### 6. Cross-Repo Orchestration is Absent
Modern microservice development often requires changes across multiple repositories simultaneously. The platform is strictly single-repo.

**Impact**: Features that span services (API change + client update + docs update) require multiple separate `/build` sessions with manual coordination.

**Recommendation**: This is architecturally hard. Short-term: document the multi-repo workflow explicitly. Long-term: investigate git worktree-based multi-repo orchestration.

### 7. Cost Awareness is Missing
There is no visibility into how much an agent build costs. Running opus models for architect + spec-reviewer + quality-reviewer + debugger + advocate + incident-responder + legacy-modernizer is expensive. Teams have no way to:
- Set budgets
- Choose cost/quality tradeoffs
- Compare build costs over time

**Impact**: Unpredictable cost makes finance teams nervous about scaling adoption.

**Recommendation**: Add token counting to the orchestrator. Log per-agent usage. Provide a `/build-cost` summary. Let teams override models in `build-overrides.md`.

---

### 8. No Supply Chain Security Strategy
AI-generated code exponentially increases supply chain surface area. Agents dynamically add dependencies, modify build configurations, and produce artifacts - but there is no provenance tracking, no mandatory SBOM generation, no vulnerability scanning integrated into the build pipeline, and no attestation for agent-generated artifacts.

Agent configurations (`.md` files) grant tool access including `Bash` execution. These are security-sensitive artifacts treated as documentation files.

**Impact**: Every agent build is an untracked supply chain event. At scale across SS&C, this is a critical risk.

**Recommendation**: Defense-in-depth. Build internal controls for agent-specific risks (provenance, model tracking, configuration audit). Integrate Kusari/GUAC for traditional supply chain (SBOM, vulnerability intelligence, attestation). Both, always. See [SUPPLY-CHAIN-SECURITY.md](SUPPLY-CHAIN-SECURITY.md) for the full strategy.

---

## What's Missing Entirely

### 1. Onboarding Material
There is no "Getting Started" tutorial that walks a new developer through their first `/build`. The README is comprehensive but dense. There's no video, no walkthrough, no "build your first feature in 10 minutes" guide.

### 2. Failure Mode Documentation
What happens when:
- An agent times out?
- The review loop enters infinite refinement?
- Jira is unreachable during a `/jira-work` session?
- Two agents modify the same file?
- The user denies a permission prompt mid-build?

These failure modes exist but aren't documented. Teams discover them through pain.

### 3. Migration Path from Other Tools
Teams using GitHub Copilot, Cursor, or Aider have no migration guide. What do they gain? What do they lose? How do the tools coexist?

### 4. Metrics and Success Criteria
How does a team know the platform is working? What should they measure? What's a "good" build vs a "bad" one? Without success criteria, adoption decisions are based on vibes.

---

## Priority Recommendations

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Supply chain security: Kusari POC + internal agent provenance | Medium | Critical (security) |
| P0 | Fix documentation count/version discrepancies | Low | High (trust) |
| P0 | Add onboarding tutorial | Medium | High (adoption) |
| P1 | Implement `/add-skill` Phase 1 | Medium | High (adoption) |
| P1 | Add session analytics / token counting | Medium | High (cost visibility) |
| P1 | Document failure modes | Low | Medium (reliability) |
| P2 | Agent regression test suite | High | High (quality) |
| P2 | CI checks for documentation accuracy | Low | Medium (trust) |
| P3 | Cross-repo orchestration investigation | High | Medium (capability) |
| P3 | Migration guides from other AI tools | Medium | Medium (adoption) |

---

## What the Private Cloud and DevOps Plugins Teach Us

The `ssnc-cloud` and `ssc-devops` plugins in the catalog validate the inheritance model but also reveal what the base plugin lacks:

1. **ssnc-cloud** built a `safe-contributor` policy with PR size limits - the base plugin has no concept of PR size governance
2. **ssnc-cloud** built `cloud-architect` with deep platform knowledge - the base plugin's architect is generic and doesn't know about SS&C infrastructure
3. **ssc-devops** built deployment skills (Bolt API, Ansible) - the base plugin has no deployment automation
4. **ssc-devops** built monitoring setup (OpenSearch) - the base plugin's `/olly` uses a different stack (Prometheus/Loki)

These gaps are by design (the base should be generic), but they suggest that some capabilities should be extracted into shared skills available via `/add-skill`:
- Safe contributor guardrails (useful for any team)
- Deployment patterns (at least awareness of Bolt API as the SS&C standard)
- Monitoring stack options (not just one opinionated stack)
