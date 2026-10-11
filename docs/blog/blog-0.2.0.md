# Stop Vibe Coding. Start Shipping.

There's a seductive pattern in AI-assisted development right now. You open Claude Code, describe something vaguely, let it generate code, glance at the output, say "looks good," and move on. It feels productive. You're moving fast. You're vibing.

Then the bugs start. The security review catches SQL injection in a query the AI wrote because it didn't know your team uses parameterized queries. The PR reviewer points out the new endpoint doesn't follow your REST conventions. Tests pass locally but the coverage dropped below your threshold because nobody checked. The component uses hardcoded colors instead of your design tokens.

Vibe coding is fast until it isn't. The rework, the back-and-forth, the "wait, that's not how we do things here" — it eats the time you thought you saved.

## What If the AI Already Knew How You Work?

That's the premise behind the Claude Agent Orchestration Plugin. Instead of one general-purpose AI session where you hope it writes code the way your team expects, you get 15 specialized agents that already understand your project's standards, conventions, and constraints before they write a single line.

You describe what you want to build. An **Architect** agent analyses your codebase, creates a plan, and selects which specialists your feature needs. You review the plan. Then agents launch in parallel — a **Builder** writing implementation code, a **Validator** writing and running tests, a **Security Auditor** checking for OWASP vulnerabilities, a **Scribe** documenting everything, and whatever other specialists the feature demands.

When they're done building, a two-stage review kicks in. A **Spec Reviewer** independently verifies that every requirement was actually implemented — by reading the code, not trusting the Builder's claims. Only after that passes does a **Quality Reviewer** check the code against your project's standards. If either stage finds issues, agents fix them and re-submit. No human has to mediate the back-and-forth.

Every agent operates under the persona of a **Staff Software Engineer with ISC2 certifications — CISSP, CCSP, CSSLP**. That's not cosmetic. It means the Builder considers input validation while writing an endpoint. The Database Architect thinks about data protection when designing a schema. The DevOps Engineer evaluates cloud security in deployment configs. Security isn't one agent's job — it's everyone's baseline.

## How It Works in Practice

Install the plugin and set up your project standards:

```bash
/plugin marketplace add git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
/plugin install agent-orch@ssnc-agent-orch
/reload-plugins
/agent-orch:setup-claude-md
```

That last command auto-detects your tech stack, finds your API routes, database models, frontend components, and test framework, then creates a standards structure tailored to your project. It takes about two minutes.

Then build something:

```bash
/agent-orch:build
```

The plugin asks you what you're building, one question at a time. Once it understands the requirements, agents take over. You watch progress updates as they work — which files are being created, how many tests pass, what the security auditor found. When it's done, you get a summary of everything that was implemented, tested, reviewed, and documented.

For teams using GitHub spec-kit, there's a spec-driven mode too:

```bash
/agent-orch:implement
```

This reads your `.specify/` directory and implements against your written specification, with the same multi-agent orchestration and two-stage review.

## Why This Beats Vibe Coding

Vibe coding gives you speed with no guardrails. You're trading quality for velocity, and the bill comes due at review time, at deploy time, or worse — in production.

The orchestration plugin gives you speed *with* guardrails. The Builder follows your naming conventions because it read your code standards before writing anything. The Validator writes tests that match your coverage requirements because those requirements are loaded into its context. The Security Auditor knows your auth patterns because it read your security baseline. The Quality Reviewer checks code against your actual project constitution, not generic best practices.

You're not hoping the AI gets it right. You've told it exactly what "right" looks like for your team, and multiple independent agents verify the work before you ever see it.

The difference compounds over time. One vibe-coded feature might be fine. Ten vibe-coded features across a team of engineers, with no consistent conventions, no security review, no test coverage enforcement — that's how codebases rot.

## The 15 Agents

The plugin ships four core agents that run on every build (Architect, Builder, Validator, Scribe), two review agents that enforce quality gates (Spec Reviewer, Quality Reviewer), a Debugger for when things break, and eight specialists activated only when relevant — Security Auditor, Performance Analyst, DevOps Engineer, Database Architect, API Designer, UI/UX Designer, Refactorer, and Migration Specialist.

You don't manage them. The Architect selects which specialists your feature needs based on what it finds in the codebase. You approve the selection, and they all launch in parallel.

For complex features that need tight coordination between agents, experimental Agent Teams mode lets agents message each other directly — the Security Auditor flags a vulnerability to the Builder, the Builder fixes it, the Validator re-runs tests, all without you mediating. The plugin calculates a complexity score and recommends when this mode would help.

## Getting Started

Four commands, two minutes:

```bash
/plugin marketplace add git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
/plugin install agent-orch@ssnc-agent-orch
/agent-orch:setup-claude-md
/agent-orch:build
```

For team-wide adoption, commit the plugin config to your project's `.claude/settings.json` and every engineer gets it automatically.

---

# What's New in v2.0

For teams already using the plugin, here's what changed from the initial release.

## Hierarchical CLAUDE.md Structure

**The problem:** The monolithic `CLAUDE.md` approach worked in demos but grew to 46,000+ tokens on real projects. Every agent loaded the entire file — the Security Auditor consumed frontend component library rules, the UI/UX Designer loaded database migration patterns. Multiply by 5-8 parallel agents and you're burning hundreds of thousands of tokens on irrelevant context per build.

**The fix:** Project standards now distribute across focused files that Claude Code loads intelligently:

- **Root `CLAUDE.md`** (~2k tokens) — project overview, git workflow, environment variables
- **`.claude/rules/`** (~3-4k tokens, always loaded) — security baseline, code standards, testing standards
- **Subdirectory `CLAUDE.md`** (~1.5k each, loaded per-directory) — API conventions, database patterns, frontend standards

An agent working on API code loads ~7,500 tokens instead of ~46,000. That's a 70-85% reduction, compounding across every agent in the run.

**Migration:** Run `/agent-orch:setup-claude-md`. It detects your existing monolithic file, parses it by section, maps each section to its new location, backs up the original, and creates the hierarchical structure. Fully reversible.

## ISC2-Certified Staff SWE Persona

Every agent now operates under the persona of a **Staff Software Engineer with ISC2 certifications — CISSP, CCSP, CSSLP**. This loads automatically via a plugin-level rule — no per-project setup. Security-first thinking is now baked into every agent's approach, not just the Security Auditor's.

## Auto-Detect Project Structure

The `/agent-orch:setup-claude-md` skill now auto-detects your project layout — globs for API routes, database models, frontend components, test frameworks — and proposes where to place standards files. Confirm the detected paths and it creates everything. No manual configuration.

## Updated Agent Spawn Prompts

All agent prompts in `/agent-orch:build` and `/agent-orch:implement` now reference the hierarchical structure. Agents know that `.claude/rules/` is auto-loaded and don't waste context re-reading universal standards from a monolithic file.

## Convention Files

The plugin ships coding conventions for TypeScript, JavaScript, Python, Go, Java, C#, and Rust in `plugins/agent-orch/conventions/`. Agents automatically reference the right convention file based on your detected tech stack.

## Quality Enforcement Hooks

Two hooks enforce verification gates in Agent Teams mode:

- **TaskCompleted** — blocks task completion without verification evidence
- **TeammateIdle** — prevents agents from going idle with incomplete tasks

## Git Worktree Isolation

In Agent Teams mode, code-editing agents now use git worktree isolation automatically. Each agent gets its own copy of the repository, preventing file conflicts during parallel work.

## Upgrading

```bash
/plugin install agent-orch@ssnc-agent-orch
/agent-orch:setup-claude-md
```

Existing workflows are unchanged. The two-stage review, specialist selection, Agent Teams mode — all the same. Your monolithic `CLAUDE.md` continues to work without migration. The token savings kick in when you run the setup command.

---

*Claude Agent Orchestration Plugin v2.0 is available now via the Claude Code plugin marketplace at `code.ssnc.dev`.*
