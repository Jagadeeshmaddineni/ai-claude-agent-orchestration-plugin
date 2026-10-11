---
name: analyse
description: Multi-agent codebase analysis for GitHub spec-kit. Architect and Scribe analyse before specification. Usage: /agent-orch:analyse [area or feature]
---

# Spec-Kit Multi-Agent Analysis

Enhances spec-kit's analysis phase with multi-agent exploration.

## When to Use

Run BEFORE `/speckit.specify` to understand the codebase deeply.

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

**For parallel execution**: Send a SINGLE message with MULTIPLE Task tool calls. Do NOT send them sequentially.

---

## Process

### Step 1: Launch Agents in Parallel

**CRITICAL**: Launch BOTH agents in a SINGLE message with TWO Task tool calls.

**Agent 1 - Architect**
- **subagent_type**: `agent-orch:orchestrate-architect`
- **description**: "Analyse codebase architecture"
- **prompt**:
  ```
  Analyse the codebase for: $ARGUMENTS
  Focus on architecture, patterns, and integration points.
  Check .specify/memory/ for existing constitution.
  Return 15-20 key files to understand.
  ```

**Agent 2 - Scribe**
- **subagent_type**: `agent-orch:orchestrate-scribe`
- **description**: "Analyse documentation gaps"
- **prompt**:
  ```
  Analyse documentation for: $ARGUMENTS
  Check existing specs/ for related features.
  Identify documentation gaps.
  Note any unclear areas needing /speckit.clarify.
  ```

### Step 2: Wait for Agent Results

Both agents will return their findings. Collect their outputs before proceeding.

### Step 2b: Agent Teams Mode (Alternative)

If `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is enabled and the analysis scope is broad (multiple modules, cross-layer), use Agent Teams for richer collaboration:

**Create Team:**
```
TeamCreate:
  name: "analyse-[area]"
```

**Spawn Teammates:**
```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-architect"
  team_name: "analyse-[area]"
  prompt: "Analyse the codebase for: $ARGUMENTS
           Focus on architecture, patterns, and integration points.
           Use SendMessage to share key findings with @scribe.
           Return 15-20 key files to understand."
  description: "Analyse codebase architecture"

Agent tool call:
  subagent_type: "agent-orch:orchestrate-scribe"
  team_name: "analyse-[area]"
  prompt: "Analyse documentation for: $ARGUMENTS
           Check existing specs/ for related features.
           Use SendMessage to request clarification from @architect.
           Identify documentation gaps."
  description: "Analyse documentation gaps"
```

Teammates can message each other directly via `SendMessage` to share findings and resolve ambiguities before reporting back.

**Cleanup after analysis:**
```
TeamDelete:
  name: "analyse-[area]"
```

### Step 3: Synthesise

1. Read files identified by agents
2. Present comprehensive analysis:
   - Architecture overview
   - Existing patterns to follow
   - Related specifications
   - Documentation gaps
   - Recommendations for `/speckit.specify`

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.analyse:` entry. If the file is absent, has no
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
