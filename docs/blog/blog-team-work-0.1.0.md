# From Planning Call to Running Agents in Three Commands (team-work v0.1.0)

Every team has the same upstream problem. Not the building -- agent orchestration handles that. Not the Jira lifecycle -- v2.16.0 automated that. The problem is what happens before any code gets written: the planning session.

Someone has a call. Notes get taken. Action items get listed. Then someone spends an afternoon turning those notes into Jira tickets, arguing about what "done" means, and figuring out who does what. By the time the board is set up, the context from the call has faded. Open questions got silently resolved by whoever created the tickets. Dependencies live in someone's head. Half the items have vague acceptance criteria because Jira doesn't force you to be specific.

The `team-work` plugin closes this gap. Three skills that take a team from raw planning material to a populated Jira board with an active work queue -- without the ceremony, without the context loss, without the silent assumptions.

## Why This Exists

Teams using the agent orchestration plugin already have `/make` for individual feature delivery. One command: worktree, build, commit, push, PR, Jira lifecycle. `/make` is the execution engine. But `/make` starts from a Jira ticket. Someone still has to create those tickets, and the process of creating them is where the real planning work gets lost.

The translation from "planning session" to "Jira board" is a lossy compression. Five specific things get dropped:

**Open questions** get quietly resolved by whoever creates the ticket. The team discussed three possible approaches to auth -- but the ticket just says "implement auth." The decision gets made by the person typing, not the team.

**Definitions of done** get skipped because nothing enforces them. Jira has a description field. People write "As a user, I want to..." and move on. When the agent picks it up or a developer starts coding, "done" means whatever they interpret it to mean.

**Dependencies** get tracked informally. Someone knows that the Kafka topics need to exist before the connector can be built. That knowledge lives in their head until someone tries to build the connector and discovers the topics don't exist yet.

**Agent readiness** is never classified. Can Claude Code implement this autonomously? Does it need a human to make judgment calls first? Is it even in this repo? These are questions that should be answered during planning, not when someone picks up the ticket.

**The plan itself** lives in someone's head or a Google Doc that's stale by the end of the day. There's no artifact that shows what the team agreed on, what's still open, and how things connect.

## The Solution: Three Skills

### `/team-work:work-prep` -- Plan Together

An interactive wizard that turns planning material into a structured markdown work plan in a PR.

Start with whatever you have. Three modes:

1. **Meeting notes or transcript** -- paste them in, and the wizard extracts action items, decisions, and open questions
2. **Rough list** -- a bullet list of things to do, and the wizard asks clarifying questions for each
3. **Nothing** -- the wizard runs interactive discovery, asking about goals, workstreams, and items

What makes `/work-prep` different from "generate a plan from my notes" is that it's an interactive wizard, not a generator. It doesn't dump a wall of plausible-looking items and ask "does this look right?" It walks through each item one at a time, asking the questions that matter:

**What does done look like?** Not a vague description -- a testable definition. "Topics created in dev and staging, schema registry entries published, consumer groups pre-created." If you can't define done, the wizard doesn't make something up. It adds an explicit entry to the Open Questions section for the team to discuss.

**Who owns this?** Assign now, or leave blank for team review. Either way, it's tracked.

**How should this be executed?** Three labels:
- `claude-code-agent-harness` -- an agent can implement this in the repo
- `human-review-required` -- needs human judgment before an agent starts
- `external` -- outside this repo (ServiceNow ticket, vendor work, infrastructure request)

**What depends on what?** The wizard maps blocking relationships. Item 3 can't start until items 1 and 2 are done. This gets recorded as both a dependency list and execution waves.

The output is a `planning/<slug>.md` file on a worktree branch with a PR opened for team review. The plan uses structured tables:

```
## Work Items -- Data Pipeline

| # | Item | Owner | Label | Status | Jira |
|---|------|-------|-------|--------|------|
| 1 | Set up Kafka topic configuration | Joe | claude-code-agent-harness | todo | -- |
| 2 | Define Avro schemas for events | Ana | claude-code-agent-harness | todo | -- |
| 3 | Build ingestion connector | -- | human-review-required | todo | -- |
| 4 | Configure monitoring dashboards | Joe | claude-code-agent-harness | todo | -- |

## Definitions of Done

### 1. Set up Kafka topic configuration
- Topics created in dev and staging environments
- Schema registry entries published
- Consumer groups pre-created with appropriate offsets
- Retention policies configured per topic

### 2. Define Avro schemas for events
...
```

Plus sections for Dependencies (with a Mermaid diagram), Execution Waves, Open Questions (as a checkbox list), and a Changelog.

The plan is a PR. The team reviews it, comments, argues about scope. Run `/work-prep` again on feedback to incorporate changes. The wizard detects it's running in iteration mode and picks up where the plan left off. Iterate until everyone agrees.

### `/team-work:work-plan` -- Create the Board

Once the team agrees on the plan -- the PR has been reviewed, open questions resolved, definitions of done are specific -- `/work-plan` converts it to Jira in one command.

```
/team-work:work-plan planning/q2-data-pipeline.md
```

Or pass a PR number:

```
/team-work:work-plan #42
```

The skill reads the agreed plan and proceeds through five phases:

1. **Check for unresolved open questions.** If there are unchecked `- [ ]` items in the Open Questions section, it warns you. Proceed anyway, resolve them now, or cancel.

2. **Configure Jira mapping.** Reads `.claude/rules/jira.md` for the project key, issue type IDs, and priority IDs. Asks whether to create a new parent Epic from the plan's Goal section, link to an existing one, or skip.

3. **Map owners to Jira users.** For each unique owner name in the plan, searches Jira and confirms the match. Caches the mapping so it doesn't re-ask for repeated owners.

4. **Create issues in dependency order.** Items with no dependencies first, then dependents. Each item becomes a Jira Story or Task with:
   - Summary from the work item description
   - Description including the area, definition of done, and plan source reference
   - Label from the classification (`claude-code-agent-harness`, `human-review-required`)
   - Epic link if a parent was selected
   - Owner assignment if mapped
   - Progress reporting: `[3/12] Created RCONAI-261: Build ingestion connector`

5. **Link dependencies.** Uses Jira issue links (`Blocks`) between dependent items. Falls back to alternative link types if `Blocks` isn't available.

After creating all issues, `/work-plan` writes Jira URLs back into the plan markdown. The `--` in the Jira column becomes a clickable link:

```
| 1 | Set up Kafka topic configuration | Joe | agent-harness | todo | [RCONAI-259](https://jira.example.com/browse/RCONAI-259) |
```

The plan and the board are now synchronized. The markdown is the source of truth, with links to every ticket.

### `/team-work:work-pop` -- What's Next?

You have a populated board, a markdown plan with Jira links, and a list of assigned items. Now what?

`/work-pop` reads the plan, identifies the current user from `.claude/rules/jira.md`, and presents a work dashboard:

```
READY TO START:
  1. [RCONAI-259] Set up Kafka topic configuration
     Label: claude-code-agent-harness (agent-ready)
     Definition of done: Topics created in dev + staging, schema registry entries...
     No blockers

BLOCKED:
  2. [RCONAI-261] Build ingestion connector
     Blocked by: RCONAI-259 (todo), RCONAI-260 (todo)

UNASSIGNED (available to pick up):
  3. [RCONAI-263] Configure monitoring dashboards

Recommended next: RCONAI-259
Why: No blockers, unblocks RCONAI-261 (highest downstream impact)
```

The recommendation algorithm is simple and transparent:

1. Filter to items with no uncompleted blockers
2. Prefer items that unblock the most downstream work
3. Prefer `claude-code-agent-harness` over `human-review-required`
4. Prefer items with clearer definitions of done
5. Break ties by plan order

Pick the recommended item, or choose a different one. Review the full context -- definition of done, what it unblocks, any notes from the plan, the Jira issue details. Then augment the prompt:

```
Options:
(a) Use as-is
(b) Add more context (type additional instructions)
(c) Add from file (read a spec, doc, or example)
(d) Cancel
```

Choose (a) and `/work-pop` does three things:

1. Updates the plan markdown: status from `todo` to `in-progress`
2. Commits and pushes: `planning: mark RCONAI-259 as in-progress`
3. Launches `/agent-orch:make RCONAI-259 <augmented prompt>`

You're in a worktree, building, with full Jira context, in seconds.

## The Full Loop

```
/team-work:work-prep "Q2 data pipeline migration"
  → Wizard walks through items, definitions of done, dependencies
  → planning/q2-data-pipeline-migration.md committed to worktree branch
  → PR #50 opened for team review

  (team reviews, comments, iterates)

/team-work:work-prep
  → Detects iteration mode, incorporates feedback
  → Updated plan pushed to same PR

/team-work:work-plan planning/q2-data-pipeline-migration.md
  → 12 Jira issues created with dependencies, labels, assignments
  → Plan markdown updated with Jira URLs
  → [12/12] All issues created. Epic: RCONAI-250

/team-work:work-pop
  → RCONAI-259 recommended (no blockers, unblocks 2 items)
  → Plan status: in-progress
  → Launches /make RCONAI-259

  (agent builds feature, opens PR #51)

/agent-orch:make-clean
  → PR #51 merged, worktree removed
  → Jira: RCONAI-259 → Done
  → Plan: status → done (auto-synced)

/team-work:work-pop
  → RCONAI-260 now recommended (RCONAI-259 dependency cleared)
  → Repeat...
```

The plan markdown stays current throughout. Every state transition is tracked. When someone asks "where are we on Q2 pipeline?" -- `git show main:planning/q2-data-pipeline-migration.md` gives the answer without opening Jira.

## Integration with `/make` (v2.17.0)

The agent-orch plugin was updated to detect when a Jira ticket being worked through `/make` or completed through `/make-clean` appears in a `planning/*.md` file. When it does, the status column in that plan row is updated automatically:

- `/make` opens a PR → plan row status becomes `in-review`
- `/make-clean` merges the PR → plan row status becomes `done`
- A changelog entry is appended: `2026-04-24: RCONAI-259 completed (merged via /make-clean)`

This keeps the plan synchronized without any manual effort. The plan file is the artifact that outlasts the sprint board. It's readable in a PR, in a code review, in the repo -- no Jira required.

## Design Decisions

**Markdown first, not Jira first.** The plan lives in a git PR because that's where teams already do async review. Nobody reviews Jira boards line-by-line. People review PRs. Comments, threads, approvals -- the machinery is there. Jira is the execution layer. It gets populated after the plan is agreed on, not before.

**Open questions are first-class.** Most planning tools silently resolve ambiguity. Someone writes "implement auth" and moves on. `/work-prep` makes ambiguity explicit. If you can't define "done" for an item, that's not a failure of the tool -- it's a signal that the team needs to discuss it. The Open Questions section is not an afterthought. It's the most important part of the plan for items that aren't ready.

**Three labels, not a taxonomy.** Agent-ready, human-review-required, or external. That's the decision tree:

- Can an agent do this autonomously? → `claude-code-agent-harness`
- Does a human need to make decisions first? → `human-review-required`
- Is this even in this repo? → `external`

No priority matrix. No effort estimation. No story points. Those are downstream concerns. At planning time, the only question that matters for execution strategy is: who executes this?

**The wizard asks, it doesn't generate.** `/work-prep` doesn't prompt Claude with "generate a plan from these notes." It's an interactive wizard that asks one question at a time and builds the plan from the answers. The output is only as good as the conversation. This is deliberate -- it forces the team (or the person running it) to think through each item rather than rubber-stamping generated text.

**Separate plugin, not bundled into agent-orch.** Not every team needs structured planning. Teams of one who just want `/make` for individual features shouldn't carry the weight of `/work-prep`, `/work-plan`, and `/work-pop`. The team-work plugin is optional. Install it when your team reaches the point where planning → Jira ticket creation is a bottleneck. That's usually around 3+ people working on the same codebase with shared dependencies.

**Plans are files, not database records.** A plan is a markdown file in `planning/`. It can be `git diff`'d, `git blame`'d, reviewed in a PR, grepped, and read by any tool. No schema migrations. No API. No state management. When `/work-plan` writes Jira URLs back into the file, it's just text editing. When `/make-clean` marks an item as done, it's a `sed`-equivalent replacement. The simplicity is the feature.

## Prerequisites

**For `/work-prep`:**
- A git repository (for worktree creation)
- `gh` CLI authenticated (for PR creation)
- Not currently in a worktree (unless iterating on feedback)

**For `/work-plan`:**
- An agreed work plan (from `/work-prep`)
- Jira context cached: `/agent-orch:jira` (for project metadata)
- MCP server running: `/agent-orch:mcp-start` (for Jira API)
- `gh` CLI authenticated

**For `/work-pop`:**
- A work plan with Jira links (from `/work-prep` + `/work-plan`)
- `/agent-orch:make` available (for launching builds)
- Not currently in a worktree (a new one will be created)

## Installation

```bash
# If you already have the marketplace registered:
/plugin install team-work@ssnc-agent-orch

# Or add to .claude/settings.json for team-wide setup:
{
  "enabledPlugins": [
    { "name": "agent-orch", "marketplace": "ssnc-agent-orch" },
    { "name": "team-work", "marketplace": "ssnc-agent-orch" }
  ]
}
```

Requires the agent-orch plugin v2.17.0+ for `/make` integration and work plan auto-sync.

## What This Changes

Before team-work, the flow was: planning call → someone manually creates Jira tickets → someone picks one up → `/make PROJ-123`. The gap between "team agreed on work" and "agent starts building" was filled with manual Jira administration.

After team-work, the flow is: planning call → `/work-prep` → team reviews PR → `/work-plan` → `/work-pop`. The gap is three commands. The plan is a reviewable artifact. The board is pre-triaged. The agent starts with full context. And the plan stays synchronized through completion.

The planning session is no longer a ceremony that produces stale artifacts. It's the first step in a pipeline that runs all the way to merged code.

---

**team-work v0.1.0** -- 3 skills. `/work-prep` creates collaborative work plans in markdown PRs. `/work-plan` converts agreed plans into Jira issues with dependencies and assignments. `/work-pop` picks your next item and launches `/make`. Plan markdown stays synchronized through the entire lifecycle.

**agent-orch v2.17.0** -- `/make` and `/make-clean` now detect work plan references and auto-update status columns when Jira tickets from a plan are worked or completed.
