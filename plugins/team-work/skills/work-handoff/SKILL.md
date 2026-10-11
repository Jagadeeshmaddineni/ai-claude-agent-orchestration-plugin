---
name: work-handoff
description: Generate a developer onboarding guide from an existing work plan, its tracker issues, and the wiki — so developers can pick up their first ticket without interrupting the lead. Reads the real blocked-by/blocks graph from the tracker rather than inferring it from prose, maps each work item to the repo and stack it lands in, mines the wiki for the authoritative design and the decisions behind it, and emits a guide with a mental model, document index with reading order, ticket-reading conventions, dependency map with owners, definition of done, and a getting-unblocked path that leads with querying the wiki. Usage: /team-work:work-handoff [path-to-plan.md] [--wiki <path>]
---

# Work Handoff: Plan + Tracker → Developer Onboarding Guide

The **third shift-left gate**. The scope is agreed, the coordination plan exists,
and the tracker issues are created and linked. Now developers have to actually
start — and the difference between a good handoff and a bad one is whether the
lead becomes a bottleneck for the next two months.

The guide has one measurable purpose: **a developer who has never seen this
project can pick up their first ticket and make progress without interrupting the
lead.** Everything in it serves that. Anything that doesn't, cut.

Shared behaviors live in
[`../../rules/shift-left-common.md`](../../rules/shift-left-common.md). Read it —
the phases reference its sections.

## Key Principles

1. **The dependency map is read, never inferred.** Pull it from the tracker's
   actual link graph. A plausible-but-wrong map is worse than none, because a
   developer will trust it and stall a teammate.
2. **It's a map, not a source of truth.** The guide must say explicitly that
   where it disagrees with the authoritative design, the design wins. Without
   that line it rots into a competing specification.
3. **Answer the questions a newcomer is embarrassed to ask.** What does this
   acronym mean, which repo does my code go in, what does this ticket type imply,
   am I allowed to just start. These block people silently.
4. **Point at the wiki first for getting unblocked.** Design reasoning, scope
   calls, and open-question status are all already recorded and cited. Asking a
   human should be the fallback, not the default.
5. **Name owners, not teams.** "Coordinate with the platform team" is not
   actionable; a person's name is.
6. **Refuse to produce a guide with a fake graph.** If the plan's items have no
   tracker issues, stop and say so.

## Prerequisites

- A team-work wiki (rules §1 — **hard-fail** if absent).
- A work plan (from `/team-work:work-prep`) whose items carry tracker keys
  (created by `/team-work:work-plan`).
- An active tracker, resolved per
  [`../../../agent-orch/rules/tracker-provider.md`](../../../agent-orch/rules/tracker-provider.md).

## Phase Map (what the user sees)

`/work-handoff` has 6 phases. Print a banner at the start of each:

```
═══════════════════════════════════════════════════════
/work-handoff phase <N>/6: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name              | What happens                                                     |
|---|-------------------------|------------------------------------------------------------------|
| 1 | Resolve inputs          | Wiki, plan, tracker backend; refuse if items have no issues      |
| 2 | Read the issue graph    | Pull issues + real dependency links from the tracker             |
| 3 | Map repo topology       | Sibling-repo walk; map each item to repo + stack                 |
| 4 | Mine the wiki           | Design, decisions, open questions, agreed scope                  |
| 5 | Confirm + assemble      | Show coverage, then write the guide                              |
| 6 | Write, catalog, commit  | Into the wiki's `plans/`; honor `ingest_mode`                    |

## Process

### Phase 1: Resolve Inputs

**Goal**: Confirm the preconditions actually hold before generating anything.

1. **Resolve the wiki root** and `ingest_mode` per rules §1. Hard-fail with no
   wiki.
2. **Locate the work plan**: the path argument, else the newest file under the
   wiki's `planning/`. If several exist, list them and ask.
3. **Resolve the tracker backend** per the tracker-provider contract
   (`.claude/ssnc-agent-orch/tracker.yaml` → `.make-config.md` → default `jira`).
   Express all tracker work as the contract's **normalized verbs**; let the
   mapping resolve the backend. Read the cached context file
   (`.claude/rules/jira.md` or `github.md`) instead of re-discovering metadata.
4. **Verify the plan's items carry tracker keys.** If they don't, **stop**:

   ```
   This plan's items have no tracker issues yet, so there's no real dependency
   graph to read — and a handoff guide with an invented graph will stall people.

     /team-work:work-plan <plan-path>    # create the linked issues first

   Then re-run /team-work:work-handoff.
   ```

   If *some* items have keys, report the coverage and ask whether to proceed with
   a guide that explicitly marks the gaps.

### Phase 2: Read the Issue Graph

**Goal**: The real dependency reality, from the tracker.

1. **Fetch every issue** referenced by the plan using `get_issue(id)`. Record:
   type, status, assignee, labels, title, and URL.
2. **Read the dependency links.** The normalized `get_issue` verb does **not**
   return link relationships, so this needs one backend-specific read:
   - **Jira** — `mcp__jira__jira_getIssue` with `issuelinks` in the requested
     fields; extract inward/outward `Blocks` / `is blocked by` pairs.
   - **GitHub** — dependencies are conventionally expressed in issue bodies
     (`blocked by #N`) or a task list on a tracking issue; parse those and say
     in the guide that the graph came from issue bodies rather than typed links.
   - **`tracker: none`** — no graph is available; fall back to the plan's own
     stated dependencies and label the map clearly as plan-derived, not
     tracker-verified.
3. **Build the graph and check it.** Report anything suspicious rather than
   papering over it: a cycle, an item blocked by something already closed, an
   item with no path to the work's completion, a dependency on a retired item.
4. **Derive build order** — the waves that can proceed in parallel, and the
   critical path. This is what tells a developer whether they can start today.
5. **Identify retired or descoped items** so the guide can say "do not pick these
   up" explicitly. Developers *will* find closed tickets and wonder.

### Phase 3: Map Repo Topology

**Goal**: Tell each developer where their code goes.

1. **Resolve the codebase** per rules §2 — sibling-repo walk, present, confirm.
2. **Detect each repo's stack** (language, framework, test tooling) from its
   manifests, and its default branch.
3. **Map every work item to its repo(s)**, from the plan, the issue text, and the
   component/label metadata. Flag items spanning repos — those need per-repo
   changes and coordinated review, and that's exactly what a newcomer gets wrong.
4. **Detect conventions from the repo itself, not from assumption**: branch
   naming and commit-message shape from recent history (`git log`), whether a
   parent orchestration directory exists, and where the agent workflow should be
   launched from. State what you observed.

### Phase 4: Mine the Wiki

**Goal**: Point at the authoritative material, in the right order.

Use `/team-work:work-ask` (don't reimplement search) to locate:

- **The authoritative design** — the current one. If several revisions exist, say
  which supersedes which; a newcomer reading a stale design is a costly failure.
- **The decision records** explaining *why* the design is what it is.
- **The agreed scope statement** (the `/work-signoff` output) — what's in, what's
  explicitly out.
- **The open-questions register** — live unknowns, owners, and status.
- **The implementation plans**, if the plan links task-level breakdowns.

Then derive a **reading order**: this guide → your item's section in the
implementation plan → the decisions that item cites → the design section those
point at. Newcomers otherwise read either nothing or everything.

Also collect the **acronyms and domain terms** used across the plan, issues, and
design. This is the cheapest, most-skipped part of onboarding.

### Phase 5: Confirm and Assemble

1. **Show coverage before writing:**

   ```
   Plan: planning/<name>.md — 34 items, 15 engineering / 19 coordination
   Tracker: jira · all 34 have issues · graph read from typed links

   Dependency graph: 3 waves, critical path 4 items deep
     ⚠ 2 items are blocked by issues that are already closed — worth a look
     ⚠ 1 retired item still has an open link from an active item

   Repos: 3 (api · Python/pytest, web · TypeScript/Karma, infra · Ansible)
     2 items span repos

   Wiki: design found (2 revisions — newer supersedes), 11 decisions,
         scope statement, 4 open questions (1 blocking go-live, not the build)

   (a) Assemble the guide
   (b) Let me resolve those graph warnings first
   ```

2. **Structure the guide** (engineer register — full detail, precise, no
   business-facing softening):

   - **Preamble** — who it's for, and the **map-not-source-of-truth line**: where
     this guide disagrees with the authoritative design, the design wins; tell
     the owner so the guide gets fixed.
   - **Acronym / term key** — a table.
   - **The 60-second mental model** — what's being built, why, and how the work is
     phased. If the work has phases that can ship independently, say so
     explicitly and say what depends on what.
   - **Where everything lives** — a table of document → what it is → link, with
     the **reading order for a new developer** stated after it.
   - **How to read a ticket** — the hierarchy (what hangs off what, and how
     children attach — that trips people up when a parent isn't an epic), what
     each issue type implies about workflow, what each label means *for the
     reader*, ready-made tracker queries (all work / agent-ready / my items / by
     workstream), and how to get from a ticket to its task-level breakdown.
   - **How to start work** — which directory to launch from and why, the repo
     table with stacks, branch and commit conventions per repo, the agent
     workflow command with its phases, follow-up commands, and an explicit
     warning about items whose labels require human sign-off before agent work.
   - **Where you fit — the dependency map.** The centerpiece: build-order
     diagrams per phase, then a per-item table (item, owner, repo, issue link,
     blocked by, blocks), then how to use it — everything in *blocked by* must
     land first; everything in *blocks* is a teammate waiting on you.
   - **Non-engineering gates** — items that gate release but aren't code, and
     crucially **whether they gate merging or only release**. Developers stop
     unnecessarily when this is unclear.
   - **Definition of done** — per item: plan tasks complete, tests passing (name
     the actual frameworks and any coverage gate), merged to the right branch,
     plus item-specific criteria.
   - **Getting unblocked** — lead with `/team-work:work-ask` against the wiki and
     give real example questions. Then: design questions → the design and its
     decisions; scope questions → the scope statement and the plan's out-of-scope
     list; blocked by a teammate → find the owner in the dependency table;
     ambiguous requirement → the open-questions register, and how to raise a new
     one.

   If the wiki lives in a separate checkout from the code, say how to set that up
   — querying and implementing in the same session is awkward.

### Phase 6: Write, Catalog, and Commit

Per rules §5:

1. Write the guide into the wiki's `plans/` with `type: plan` frontmatter and
   relative markdown links.
2. Link every document reference and issue; a dead link in an onboarding guide
   costs someone twenty minutes.
3. Update `README.md`, the directory's OKF `index.md`, and `log.md`. Re-index qmd.
4. Commit per `ingest_mode`.

**Summary:**

```
Developer onboarding guide ready.

  Guide: <wiki-relative path>
  Plan:  <plan path> — N items (N engineering)
  Graph: read from <typed links | issue bodies | plan-derived>  ·  N waves
  Repos: N  ·  Warnings surfaced: N
  Commit mode: <local|pr>  [PR: <url>]

Next:
  Share it with the developers picking up their first item.
  /team-work:work-pop      # a developer picks their next item and launches
  /team-work:work-handoff  # re-run when the plan or graph changes materially
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No wiki | **Hard-fail** with the `/work-wiki` pointer (rules §1). |
| No plan found | List candidates under `planning/`; ask. If none, point at `/team-work:work-prep`. |
| Plan items have no tracker issues | **Stop.** Point at `/team-work:work-plan` — never invent a dependency graph. |
| Only some items have issues | Report coverage; offer to proceed with gaps marked explicitly in the guide. |
| `tracker: none` | Build the map from the plan's stated dependencies and label it plan-derived, not tracker-verified. |
| Tracker unreachable / not authenticated | Stop rather than guessing the graph; show what to authenticate. |
| Dependency cycle detected | Surface it with the items involved; ask the owner to resolve. Do not silently break it. |
| Item blocked by an already-closed issue | Surface it — usually a stale link, occasionally a real gap. |
| Multiple design revisions in the wiki | State which is authoritative and which are superseded. Never link a stale design as current. |
| No authoritative design in the wiki | Warn: the guide will lack its most-cited reference. Offer to proceed with a placeholder pointing at what to ingest. |
| Sibling-repo walk finds nothing | Ask for paths (rules §2). |
| Guide already exists for this plan | Update it in place, noting what changed; don't create a parallel copy. |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-handoff:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points. Run listed targets
in order per the shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work
skills also read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when
present. Tell the user when you run an extension target; a failing target is surfaced but
does not abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
