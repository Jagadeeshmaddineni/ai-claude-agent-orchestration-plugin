---
name: work-pop
description: Browse your work plan for assigned items, pick the next one to work on, review context, augment the prompt, and launch into /make. Usage: /team-work:work-pop [path-to-plan.md]
---

# Work Pop: Pick Next Item and Launch

Reads a work plan created by `/team-work:work-prep` (with Jira links from `/team-work:work-plan`), shows you items you're assigned to, recommends what to start next based on dependencies and priority, lets you review and augment the prompt, and hands off to `/agent-orch:make` with the Jira key and context.

## Prerequisites

- A work plan with Jira links (created by `/work-prep` then `/work-plan`)
- `/agent-orch:make` must be available (agent-orch plugin installed)
- Must NOT be in a worktree (since `/make` creates its own)

## Process

### Phase 0: Locate and Parse Work Plan

**Goal**: Find the plan and extract actionable items.

1. **Find the plan file:**

   - If path provided in arguments: read that file.
   - Otherwise, search for plans:
     ```bash
     find planning/ -name "*.md" -type f 2>/dev/null
     ```
   - If multiple plans found:
     ```
     Multiple work plans found:
     1. planning/q2-data-pipeline.md (12 items, 4 done, 8 remaining)
     2. planning/auth-migration.md (6 items, 6 done -- complete)

     Which plan? (number)
     ```
   - If no plan found:
     ```
     No work plans found in planning/.

     Run /team-work:work-prep to create one, or provide a path:
       /team-work:work-pop planning/my-plan.md
     ```
     Exit.

2. **Parse the plan:**
   - Extract all work items with: #, Item, Owner, Label, Status, Jira link
   - Extract dependencies
   - Extract execution waves/sequence

3. **Identify current user:**
   - Resolve identity live via `mcp__jira__jira_getCurrentUser` (use its `displayName`/`accountId`) — never read a cached user/email from `jira.md`.
   - If Jira is unavailable, ask: "What's your name as it appears in the plan?"

### Phase 1: Present Your Items

**Goal**: Show the user what they can work on.

1. **Filter items:**
   - **My items**: Items assigned to the current user
   - **Unassigned**: Items with no owner (available to pick up)
   - **Exclude**: Items with status `done`, `cut`, or assigned to others

2. **Check dependencies:**
   For each item, check if all blocking items are `done`. If not, mark as `blocked`.

3. **Present the dashboard:**

   ```
   Work Plan: Q2 Data Pipeline Migration
   Your items (Joe):

   READY TO START:
     1. [RCONAI-259] Set up Kafka topic configuration
        Label: claude-code-agent-harness (agent-ready)
        Definition of done: Topics created in dev + staging, schema registry configured
        No blockers

     2. [RCONAI-260] Provision dev environment resources
        Label: claude-code-agent-harness (agent-ready)
        Definition of done: Dev env provisioned with Kafka, monitoring, and storage
        No blockers

   BLOCKED (waiting on dependencies):
     3. [RCONAI-261] Build ingestion connector for source X
        Label: claude-code-agent-harness
        Blocked by: RCONAI-259 (todo), RCONAI-260 (todo)

   UNASSIGNED (available to pick up):
     4. [RCONAI-263] Configure monitoring dashboards
        Label: human-review-required
        No blockers

   ALREADY DONE: 2 items
   ASSIGNED TO OTHERS: 3 items (John: 3)
   ```

4. **Show ideas (if any exist in plan):**

   If the plan has an "Ideas & Hypotheses" section with non-parked ideas:

   ```
   IDEAS (from plan — not in Jira yet):
     I1. Container-based integration test deployment (Joe)
         Status: open — needs exploration
     I2. Full test suite only on release branch (Philip)
         Status: exploring
   ```

5. **Recommend next item:**

   ```
   Recommended next: [RCONAI-259] Set up Kafka topic configuration

   Why: No blockers, and completing this unblocks RCONAI-261 (highest downstream impact).
   Also ready: RCONAI-260 (no blockers, unblocks same item).
   ```

   Recommendation logic:
   - Prefer items that unblock the most downstream work
   - Prefer `claude-code-agent-harness` over `human-review-required`
   - Prefer items with clearer definitions of done
   - Break ties by plan order (lower item number first)

### Phase 2: Select and Review

**Goal**: Let the user pick an item and review its context.

```
Which item do you want to work on?

(a) RCONAI-259: Set up Kafka topic configuration (Recommended)
(b) RCONAI-260: Provision dev environment resources
(c) RCONAI-263: Configure monitoring dashboards (unassigned, pick up?)
(d) Show all items (including blocked and others' items)
(e) Refresh from Jira (check for status changes)
(f) Explore an idea — refine it before making it a work item
```

**Option (d): Show all items** -- includes blocked items and those assigned to others, with clear status indicators.

**Option (e): Refresh from Jira** -- For each item with a Jira link, fetch current status from Jira and update the local plan if anything changed (e.g., someone completed a blocking item outside of `/work-pop`).

**Option (f): Explore an idea** -- See Phase 2.5 below.

Once the user picks an item:

1. **Show full context:**

   ```
   Selected: [RCONAI-259] Set up Kafka topic configuration

   From plan: planning/q2-data-pipeline.md
   Area: Data Pipeline
   Owner: Joe
   Label: claude-code-agent-harness
   Status: todo
   Jira: https://jira.ssnc-corp.cloud/browse/RCONAI-259

   Definition of Done:
     Topics created in dev + staging, schema registry configured,
     consumer groups defined

   Unblocks:
     RCONAI-261: Build ingestion connector for source X

   Notes from plan:
     <any notes from the plan's Notes section relevant to this item>
   ```

2. **Fetch Jira issue details:**

   ```
   mcp__jira__jira_getIssue with issueKey: "RCONAI-259"
   ```

   Show any additional context from Jira (description, comments, acceptance criteria).

### Phase 2.5: Explore Ideas (Option f)

**Goal**: Let the user refine an idea before it becomes a work item.

If the user chose option (f) in Phase 2, present the ideas from the plan:

```
Which idea do you want to explore?

1. I1: Container-based integration test deployment (Joe) — open
2. I2: Full test suite only on release branch (Philip) — exploring
```

Once selected:

```
Selected idea: I1. Container-based integration test deployment

Source: Joe (from 2026-04-27 planning call)
Status: open
Notes: <any existing notes from the plan>

What would you like to do?

(a) Discuss and refine — let's think through this together
(b) Promote to work item — it's ready to become actionable
(c) Park it — not the right time
(d) Add notes — capture thoughts for next time
(e) Back to dashboard
```

**Option (a): Discuss and refine**
- Have a conversation about the idea — explore feasibility, implications, alternatives.
- After the conversation, ask: "Want to capture any of this as notes on the idea?"
- Update the idea's Notes field in the plan markdown.
- Change status to `exploring` if currently `open`.

**Option (b): Promote to work item**
- Walk through the work-prep wizard steps for this single item:
  1. Define "done" for it
  2. Classify it (`claude-code-agent-harness`, `human-review-required`, `external`)
  3. Assign an owner (or leave unassigned)
  4. Place it in the correct area/workstream
- Add the new item to the work items table in the plan.
- Change the idea's status to `promoted` with a reference: "Promoted to item #N".
- Commit the plan update.
- Offer to run `/work-plan` to create the Jira issue for just this item, or continue to the regular dashboard.

**Option (c): Park it**
- Change idea status to `parked` in the plan.
- Optionally ask for a reason: "Any note on why we're parking this?"
- Commit the plan update.
- Return to the main dashboard.

**Option (d): Add notes**
- Ask the user to type notes.
- Append to the idea's Notes field in the plan.
- Commit the plan update.
- Return to the idea menu (show options a-e again).

**Option (e): Back to dashboard**
- Return to Phase 1 dashboard.

### Phase 3: Augment the Prompt

**Goal**: Build a rich prompt for `/make` with the user's input.

```
I'll pass this to /agent-orch:make. The base prompt will be:

  "RCONAI-259 Set up Kafka topic configuration. Definition of done:
   Topics created in dev + staging, schema registry configured,
   consumer groups defined."

Want to add anything to the prompt?

(a) Use as-is -- launch /make now
(b) Add more context -- I'll type additional instructions
(c) Add context from a file -- point me to a spec, doc, or example
(d) Cancel -- I'll come back to this later
```

**Option (b)**: Append user's text to the prompt.
**Option (c)**: Read the file and append relevant content.
**Option (d)**: Exit without launching.

### Phase 4: Update Plan and Launch

**Goal**: Mark the item as in-progress in the plan and hand off to `/make`.

1. **Update the plan markdown:**

   Change the item's Status from `todo` to `in-progress`:
   ```
   | 1 | Set up Kafka topic configuration | Joe | `claude-code-agent-harness` | in-progress | [RCONAI-259](...) |
   ```

   Add changelog entry:
   ```
   - <YYYY-MM-DD>: Item 1 (RCONAI-259) started via /work-pop by Joe
   ```

2. **Commit the plan update:**
   ```bash
   git add planning/
   git commit -m "planning: mark RCONAI-259 as in-progress"
   git push
   ```

   If push fails (e.g., not on the plan branch), commit locally and warn.

3. **Launch /make:**

   ```
   Launching /agent-orch:make with your item...
   ```

   Invoke `/agent-orch:make` using the Skill tool:
   ```
   Skill tool call:
     skill: "agent-orch:make"
     args: "RCONAI-259 <augmented prompt text>"
   ```

   `/make` takes over from here -- it will create the worktree, run build, commit, push, and open a PR. When `/make` completes successfully, the Jira issue will be transitioned and the user can run `/work-pop` again for the next item.

---

## Post-Make: Updating the Plan (for /make integration)

When `/agent-orch:make` completes a work item that came from a work plan:

1. The item's Jira status changes (In Progress -> In Review -> Done) are tracked by `/make` and `/make-clean`.
2. The plan markdown should be updated to reflect the final status. This can be done:
   - By running `/work-pop` again (it will refresh from Jira)
   - By `/make-clean` detecting the plan file and updating it (see /make integration)

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No work plan found | Show usage, suggest /work-prep |
| Plan has no Jira links | Suggest running /work-plan first |
| No items assigned to user | Show unassigned items, offer to pick up |
| All items done | Congratulate, suggest closing the plan PR |
| All items blocked | Show what's blocking, suggest working on blockers |
| Jira fetch fails | Use plan data only, warn about staleness |
| /make not available | Show the prompt and Jira key for manual use |
| Push fails during plan update | Warn, continue with /make launch |
| Already in worktree | Cannot launch /make -- tell user to exit worktree first |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-pop:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
