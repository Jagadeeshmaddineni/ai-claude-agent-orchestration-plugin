# Jira Integration Guide

[< Back to Documentation Index](README.md) | [< Back to README](../README.md)

---

Jira integration in the Agent Orchestration Plugin provides three layers: **project context caching**, **team coordination**, and **work queue governance**. Each layer builds on the previous one.

## Overview

| Layer | Skill | What It Does |
|-------|-------|--------------|
| **Context Caching** | `/agent-orch:jira` | Discovers and caches project metadata (issue types, priorities, transitions, fields) in `.claude/rules/jira.md` |
| **Team Coordination** | Advocate agent (Phase 1.5) | Searches for conflicts, creates session tickets, manages lifecycle |
| **Work Queue** | `/agent-orch:jira-work` | Browse agent-ready issues, triage backlogs, hand off to `/build` or `/implement` |

---

## Setup

### Prerequisites

1. **MCP server running** with Jira enabled
2. **Jira API token** configured

```bash
# Configure MCP services
/agent-orch:mcp-setup

# Start the MCP server
/agent-orch:mcp-start

# Cache your project metadata
/agent-orch:jira
```

### What Gets Cached

The `/jira` skill creates `.claude/rules/jira.md` (auto-loaded into every conversation) containing:

- Project metadata (name, key, lead, board)
- Issue types with IDs
- Priorities with IDs
- Statuses and transitions (sampled from real issues)
- Components and versions
- Custom fields
- Required fields per issue type
- Agent harness label governance reference
- Quick reference for common MCP calls

This eliminates redundant API calls -- agents use cached IDs instead of looking them up each time.

### Managing Cached Context

```bash
/agent-orch:jira              # Discover and cache project(s)
/agent-orch:jira PROJ         # Cache a specific project
/agent-orch:jira add PROJ     # Add another project to existing context
/agent-orch:jira refresh      # Re-fetch all cached projects
/agent-orch:jira status       # Show what's cached
```

---

## Label Governance (Human on the Loop)

The plugin uses two Jira labels to implement [human-on-the-loop governance](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html):

| Label | Meaning | Effect |
|-------|---------|--------|
| `claude-code-agent-harness` | Issue is agent-ready | Visible in `/jira-work` queue; can be picked up by `/build` or `/implement` |
| `human-review-required` | Needs human approval before agent work | Shown in queue with a warning gate; agent won't auto-start |

### Governance Flow

```
New Issue --> unlabeled (invisible to agents)
    |
    v
/jira-work triage (human or agent-assisted)
    |
    +-- agent-ready --> claude-code-agent-harness --> visible in queue
    +-- needs review --> human-review-required --> gated in queue
    +-- not code work --> skip (no label)
```

### Why Labels?

Labels are the simplest governance mechanism that works across teams:

- **Visible in Jira UI** -- anyone can see which issues are agent-ready without using Claude Code
- **Searchable via JQL** -- `labels = claude-code-agent-harness AND status != Done`
- **Auditable** -- Jira tracks label changes in issue history
- **Zero configuration** -- no custom fields, workflows, or permissions needed
- **Reversible** -- remove a label to pull an issue from the queue

---

## The /jira-work Skill

### Usage

```bash
/agent-orch:jira-work              # Interactive wizard
/agent-orch:jira-work my           # My agent-ready issues (assigned to me)
/agent-orch:jira-work open         # All agent-ready open issues
/agent-orch:jira-work triage       # Classify unlabeled issues
/agent-orch:jira-work PROJ-123     # Work on a specific issue directly
```

### Interactive Wizard Flow

1. **Check Jira context** -- ensures `.claude/rules/jira.md` exists; if not, directs you to `/agent-orch:jira`
2. **Select project** -- if multiple projects are cached, asks which one
3. **Choose view** -- My Issues, Open Issues, Both, Triage, or enter a specific key
4. **Query Jira** -- searches for issues with `claude-code-agent-harness` label
5. **Present results** -- table of agent-ready issues with type, priority, status
6. **Pick and work** -- select an issue, choose `/build` or `/implement`

### Triage Mode

Three methods for classifying unlabeled issues:

| Method | Best For | How It Works |
|--------|----------|-------------|
| **Interactive** | Small batches (<10 issues) | Show each issue, you decide one at a time |
| **Agent-assisted** | Large backlogs | Triage agent analyses all issues, suggests labels, you confirm |
| **Quick filter** | When you already know what you want | Show list, enter numbers to label |

### The Triage Agent

The `orchestrate-jira-triage` agent classifies issues based on four criteria:

1. **Is it code work?** (bug, feature, refactor, test, docs = yes)
2. **Does it match this repo?** (checks files, tech stack, domain)
3. **Is it well-specified?** (clear description, acceptance criteria, bounded scope)
4. **Risk level?** (auth, payments, DB migrations, public APIs = higher risk)

Classification outputs:
- `claude-code-agent-harness` -- code work, matches repo, well-specified, acceptable risk
- `human-review-required` -- code work but under-specified, sensitive, or high-risk
- `skip` -- not code work or doesn't match this repo

The agent is conservative: when in doubt, it recommends `human-review-required`.

---

## Building from Jira Issues

Both `/build` and `/implement` accept a Jira issue key:

```bash
/agent-orch:build PROJ-123
/agent-orch:implement PROJ-123
```

### What Happens

1. **Fetch issue** from Jira via MCP
2. **Extract requirements** -- summary becomes feature name, description becomes requirements, acceptance criteria extracted if present
3. **Check label governance** -- if issue lacks `claude-code-agent-harness`, asks whether to add it
4. **Present requirements** -- user can accept as-is or modify
5. **Skip brainstorming** -- requirements already exist, goes straight to Architect
6. **Set session tracking** -- the Jira issue IS the session ticket (no duplicate created)
7. **Transition to In Progress** and post session start comment
8. **Full build/implement lifecycle** -- Advocate, Architect, Builder, Validator, Review
9. **On completion** -- transition to Done, post summary comment

### Jira Lifecycle Comments

| Event | Comment Posted |
|-------|---------------|
| Session start | "Agent-assisted /build session started. Engineer: [name]. Session: [dir]" |
| Blocked | "Build session blocked. Reason: [description]" |
| Out-of-scope work | New backlog issue created with `claude-code-agent-harness` label, linked |
| Completion | "Session completed. [summary of changes, files, tests, review rounds]" |
| Abort | "Build session aborted. Progress: [phase reached]. Can be reopened." |

---

## Team Coordination (Advocate Agent)

The Advocate agent runs as Phase 1.5 in both `/build` and `/implement`, providing team-level coordination through Jira.

### Phase A: Team Awareness

Searches for all issues with `claude-code-agent-harness` label to show what the team is working on:

```
Team Activity:
  PROJ-142: "Auth service refactor" -- Engineer A (In Progress)
  PROJ-138: "API gateway rate limiting" -- Engineer B (In Progress)
```

### Phase B: Conflict Detection

Compares your planned work against in-progress issues. Looks for:
- **Overlapping files or modules**
- **Competing API changes**
- **Contradictory business requirements**
- **Shared dependency modifications**

Conflicts **block the build** until you acknowledge and decide how to proceed. A comment is posted on the conflicting issue to notify the other engineer.

### Phase C: Session Tracking

Creates or links a Jira ticket for the session:
- Finds existing matching issues before creating new ones
- Transitions to In Progress
- Adds session metadata as a comment

### Phase D: Lifecycle Management

Writes lifecycle instructions into PLAN.md so the orchestrator manages the full ticket lifecycle (In Progress, Done, Blocked, Abort, Out-of-scope backlog items).

---

## Coordination Modes

Not every project uses Jira. The Advocate supports three modes:

| Mode | Detection | Coordination |
|------|-----------|-------------|
| **Jira** | `.claude/rules/jira.md` exists | Full MCP integration, conflict detection, ticket lifecycle |
| **Markdown** | User chooses when jira.md absent | `ssnc-agent-orch/TEAM-BOARD.md` in the repo, committed to git |
| **None** | User opts out | Challenge checklist only, no team tracking |

---

## JQL Quick Reference

Common queries used by the plugin:

```sql
-- All agent-ready open issues
project = PROJ AND labels = claude-code-agent-harness AND status != Done ORDER BY priority DESC

-- My agent-ready issues
project = PROJ AND labels = claude-code-agent-harness AND assignee = currentUser() AND status != Done

-- Issues needing human review
project = PROJ AND labels = human-review-required AND status != Done

-- Unlabeled issues (for triage)
project = PROJ AND status != Done AND (labels IS EMPTY OR labels NOT IN (claude-code-agent-harness))

-- Active agent sessions (in progress)
project = PROJ AND labels = claude-code-agent-harness AND status = 'In Progress'
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Jira MCP server not available" | Run `/agent-orch:mcp-start` |
| "No Jira project context found" | Run `/agent-orch:jira` to cache your project |
| Labels can't be added to issues | Check Jira project permissions; some restrict label editing |
| Wrong project detected | Run `/agent-orch:jira add CORRECT-KEY` |
| Stale cached data | Run `/agent-orch:jira refresh` |
| Issue transitions fail | Run `/agent-orch:jira refresh` to update transition IDs |

---

## Further Reading

- [Humans and Agents](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html) -- Martin Fowler on human-on-the-loop governance
- [v2.11.0 Blog Post](blog/blog-2.11.0.md) -- The story behind this feature
- [v2.10.0 Blog Post](blog/blog-2.10.0.md) -- The Advocate agent that laid the groundwork
- [MCP Setup Guide](../plugins/agent-orch/mcp/docs/README.md) -- Configuring the MCP server

---

[< Back to Documentation Index](README.md) | [< Back to README](../README.md)
