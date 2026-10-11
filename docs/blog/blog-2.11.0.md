# Jira as a Shared Brain: Work Queues and Human-on-the-Loop Governance (v2.11.0)

There's a fundamental question every team adopting AI coding agents has to answer: who decides what the agent works on?

In most setups, the answer is "whoever is sitting at the keyboard." You open Claude Code, describe what you want, and the agent builds it. That works for a single engineer on a single task. It falls apart when five engineers are running agents on the same codebase, all pulling from the same Jira backlog, with no shared understanding of what's been claimed, what's in progress, and what's appropriate for an agent to touch in the first place.

v2.11.0 solves this with a Jira-driven work queue and a governance model borrowed from [Martin Fowler's exploration of humans and agents](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html).

## Human on the Loop, Not in the Loop

The distinction matters. Fowler's article makes it clear:

> "The difference between in the loop and on the loop is most visible in what we do when we're not satisfied with what the agent produces."

**Human in the loop** means a person reviews every agent output -- every pull request, every code change, every decision. It's thorough, but it doesn't scale. If you're reviewing everything the agent does, you've just created a more expensive pair programming setup.

**Human on the loop** means the person designs the _harness_ -- the specifications, quality checks, and workflow guidance that control the agent's behavior. The agent operates autonomously within those constraints. When something goes wrong, you improve the harness, not the output.

Applied to our system: **Jira labels are the harness.**

## The Label Governance Model

Two labels control what agents can and cannot work on:

| Label | Meaning | Who Sets It |
|-------|---------|-------------|
| `claude-code-agent-harness` | This issue is agent-ready | A human, via `/jira-work triage` |
| `human-review-required` | A human must review before any agent touches this | A human, via triage or manually |

That's it. Two labels. The governance is simple because it has to be -- anything more complex won't get adopted.

An issue without `claude-code-agent-harness` is invisible to the agent work queue. It doesn't matter how well-specified it is. Until a human says "this is agent-ready," no agent picks it up.

An issue with `human-review-required` appears in the queue but with a gate. The agent shows it to you, asks "has a human reviewed this?", and won't proceed until you confirm. This is for work that's appropriate for agents but sensitive enough to warrant a human checkpoint -- auth changes, database migrations, public API modifications.

The flow looks like this:

```
New Jira Issue
    |
    v
[Unlabeled -- invisible to agents]
    |
    v
/jira-work triage
    |
    +-- "Agent-ready" --> claude-code-agent-harness
    |                         |
    |                         v
    |                  [Visible in /jira-work queue]
    |                         |
    |                         v
    |                  User picks it --> /build PROJ-123
    |
    +-- "Needs review" --> human-review-required
    |                         |
    |                         v
    |                  [Human reviews, then adds agent-harness]
    |
    +-- "Not code work" --> skip
```

The human designs the harness (which issues get which labels). The agent operates within it.

## The /jira-work Skill

The new `/jira-work` skill is the entry point for the Jira-driven SDLC. It's an interactive wizard that connects your Jira backlog to Claude Code's implementation engine.

### Browsing the Queue

```bash
/agent-orch:jira-work          # Interactive wizard
/agent-orch:jira-work my       # My agent-ready issues
/agent-orch:jira-work open     # All agent-ready issues
```

The skill queries Jira for issues with the `claude-code-agent-harness` label and presents them:

```
My Agent-Ready Issues (3 found)

| # | Key      | Type  | Priority | Summary                    | Status      |
|---|----------|-------|----------|----------------------------|-------------|
| 1 | PROJ-201 | Bug   | Critical | Fix auth token expiry loop | In Progress |
| 2 | PROJ-215 | Story | High     | Add CSV export endpoint    | To Do       |
| 3 | PROJ-220 | Task  | Medium   | Migrate logger to OTel     | To Do       |

Pick an issue to work on (enter number or issue key):
```

You pick one. The skill asks how you want to work on it:

```
(a) /build PROJ-215 -- standalone implementation
(b) /implement PROJ-215 -- spec-kit mode
(c) Just assign it to me
```

Choose (a) or (b) and you're off.

### Triaging the Backlog

```bash
/agent-orch:jira-work triage
```

Triage mode finds unlabeled open issues and helps you classify them. Three methods:

**Interactive** -- one issue at a time, you decide:

```
Issue 1 of 12: PROJ-230

Type: Bug | Priority: High
Summary: Login fails on Safari when cookies disabled
Description: Users report 500 error when attempting login with
  third-party cookies blocked in Safari...

Is this suitable for Claude Code agent work?
(a) Yes -- add claude-code-agent-harness
(b) Needs human review first
(c) Both labels
(d) Skip -- not code work
```

**Agent-assisted** -- the new `orchestrate-jira-triage` agent analyses all unlabeled issues in batch, reads your codebase to understand what kind of work this repo handles, and suggests labels:

```
Agent triage results:

| # | Key      | Suggested Label  | Confidence | Reason                              |
|---|----------|------------------|------------|-------------------------------------|
| 1 | PROJ-230 | agent-harness    | HIGH       | Bug fix, matches src/auth/, clear repro |
| 2 | PROJ-231 | human-review     | MEDIUM     | DB migration, sensitive, scope unclear  |
| 3 | PROJ-232 | skip             | HIGH       | "Schedule team retro" -- not code work  |

Apply these labels?
(a) Apply all
(b) Review one by one
(c) Apply HIGH confidence only
```

The triage agent is conservative by design. When in doubt, it recommends `human-review-required` rather than `claude-code-agent-harness`. It's better for a human to spend thirty seconds reviewing something safe than for an agent to spend thirty minutes on something unsuitable.

**Quick filter** -- just show the list, you pick which ones to label:

```
Enter numbers to label as agent-ready (comma-separated): 1,3,7
Any need human-review-required instead? 4,6
```

## /build PROJ-123 and /implement PROJ-123

Both `/build` and `/implement` now accept a Jira issue key as an argument. When you run `/build PROJ-215`:

1. The skill fetches the issue from Jira
2. Extracts the summary, description, and acceptance criteria as requirements
3. Presents them for your review -- you can modify or accept as-is
4. Skips the brainstorming phase (requirements already exist in Jira)
5. Uses the Jira issue as the session ticket (no duplicate ticket created)
6. Transitions the issue to In Progress
7. Posts a comment: "Agent-assisted /build session started"

Throughout the build:
- The Advocate checks for conflicts with other agent-harness issues (same as v2.10.0)
- Progress comments are posted to the Jira issue
- On completion, the issue transitions to Done with a summary of what was built

The Jira issue becomes the single source of truth for that work item -- from backlog to triage to implementation to done.

## The Triage Agent

The `orchestrate-jira-triage` agent is the 25th agent in the orchestration (24 existing + 1 new). It's a classifier, not an implementer. It reads issue descriptions and your codebase, then makes a judgment call:

**Classification criteria:**

1. **Is it code work?** Bug fix, feature, refactor, test, docs = yes. Meeting scheduling, manual deployment, UX research = no.
2. **Does it match this repo?** Compares issue references against actual files, tech stack, and domain.
3. **Is it well-specified?** Clear repro steps, acceptance criteria, bounded scope = agent-ready. Vague requirements, unbounded scope = needs human review.
4. **Risk level?** Auth changes, payment processing, DB migrations, public API changes = recommend human review even if well-specified.

The agent runs on Sonnet for speed (it's a classification task, not a reasoning task) and processes the entire batch in a single pass.

## What This Means for Teams

Before v2.11.0, the path from "Jira issue exists" to "agent builds it" required manual orchestration. You'd read the issue, copy requirements into a `/build` prompt, manage the Jira lifecycle yourself, and hope nobody else was working on the same thing.

Now the path is:

1. Someone creates a Jira issue (normal workflow, nothing changes)
2. A human triages it with `/jira-work triage` (30 seconds per issue, or batch with the agent)
3. An engineer runs `/jira-work`, picks an issue, and the agent handles the rest
4. Jira reflects reality -- In Progress while building, Done when complete, with comments tracking every phase

The human designs the harness. The agent operates within it. When something goes wrong, you improve the harness -- adjust which labels you apply, tighten the triage criteria, add `human-review-required` to more categories. You don't inspect every line of agent output. You tune the system.

That's human on the loop.

## What's New in v2.11.0

| Feature | Description |
|---------|-------------|
| `/agent-orch:jira-work` | Interactive work queue: browse, filter, triage, pick up issues |
| `/agent-orch:jira-work triage` | Classify unlabeled issues for agent governance |
| `orchestrate-jira-triage` agent | Autonomous issue analysis and label suggestion |
| `/build JIRA-ID` | Pull requirements from Jira, skip brainstorming, track in Jira |
| `/implement JIRA-ID` | Same Jira integration for spec-kit workflows |
| Label governance in `/jira` | Generated `jira.md` includes Agent Harness Labels section |

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
# Set up Jira (if not already done)
/agent-orch:jira

# Browse the work queue
/agent-orch:jira-work

# Or jump straight to an issue
/agent-orch:build PROJ-123
```

## Further Reading

- [Humans and Agents](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html) -- Martin Fowler's article on human-on-the-loop governance patterns
- [Jira Integration Guide](../JIRA_INTEGRATION.md) -- Full documentation for all Jira features
- [v2.10.0: The Engineer Who Says No](blog-2.10.0.md) -- The Advocate agent and Jira coordination that laid the groundwork

---

*Claude Agent Orchestration Plugin v2.11.0 is available now via the Claude Code plugin marketplace at `code.ssnc.dev`.*
