# Loop Library: A Local, Committed Catalog of Bounded Agent Loops

**Date**: 2026-06-22
**Branch**: `loop-library-skill`
**Audience**: anyone running Claude Code with the agent-orch plugin
**Versions**: `agent-orch` 2.32.0 → **2.33.0**; marketplace 2.41.0 → **2.42.0**

This release adds **`/agent-orch:loop-library`** — a skill for finding, saving, auditing, adapting, and designing **bounded, repeatable agent loops**, backed by a **local, git-committed catalog** in your repo. The loop concept and methodology are adapted from [Forward Future's Loop Library](https://github.com/Forward-Future/loop-library) (MIT); the catalog and storage model are our own.

## What is a "loop"?

Most prompts ask an agent to do something **once**. A loop adds the feedback that makes work repeatable and **bounded**:

> Find the slowest page, make one focused improvement, and measure it again. Keep the change only if it helps. Repeat until every page meets the target or another pass stops improving anything.

A good loop answers four questions — what to accomplish, how to know it worked, what to do with what it learned, and when to stop or ask for help — and always includes a real verification check, a clear stopping condition, and an approval boundary. A loop is **not** permission for an agent to run forever.

## Security: the catalog is local, not remote

The upstream Loop Library skill discovers loops by **fetching a live catalog over the network** (`signals.forwardfuture.ai`) and reading its markdown into the agent's context. We deliberately did **not** carry that behavior across, because it's a real risk:

- **Prompt injection / supply chain** — a compromised, spoofed, or man-in-the-middled response could feed instructions into the agent that it then acts on.
- **Data egress** — it sends your problem description off your network to recommend a match.

**This port removes the external dependency completely:**

- **No network calls.** The skill never fetches a URL, hits an API, or sends a loop anywhere.
- **The catalog is local and committed.** Loops live in `.loop-library/` at your repo root and get there only by being **saved and reviewed through your normal git/PR flow** — trusted, auditable content instead of untrusted remote markdown.
- **Find reads only that local catalog.** Saved loops are still treated as data, never auto-executed.

If you want loops shared across repos, commit `.loop-library/` to a shared repo or copy entries between repos — distribution happens through git review, where you can see exactly what you're trusting.

## How to use it

Invoke the skill and describe what you want:

```
/agent-orch:loop-library
```

It routes to the smallest useful path:

### Find a loop (from your local catalog)
> "Is there a loop for keeping our API docs in sync with the code?"

It reads `.loop-library/` and recommends up to three saved loops that fit — with the exact name, file path, why it fits, and the smallest change you'd need. If the catalog is empty or missing, it says so and offers to design one (rather than reaching for any external source).

### Save a loop (new!)
> "Save that as 'doc-freshness'."

Writes `.loop-library/loops/doc-freshness.md` (YAML frontmatter — `use_when`, `trigger`, `verify`, `stop`, `approval` — plus a one-sentence summary and a copy-ready prompt) and adds a row to `.loop-library/README.md`. On the **first** save it offers to scaffold `.loop-library/` from a bundled template (an index + an example loop). Saving **only writes local files** — it never commits, pushes, or transmits anything; you review and commit like any other change, so every cataloged loop is vetted before anyone can Find it.

### Audit / repair a loop ("Loop Doctor")
> "Review this loop." *(paste your prompt or config)*

Returns a verdict — **Ready**, **Repair needed**, or **Not actually a loop** — with up to three material findings (weak/unreproducible checks, unsafe authority, endless retries, stale state, missing stop conditions) and a minimally repaired version. It preserves your intent and won't expand the loop's authority or activate it.

### Adapt a saved loop
> "Take the coverage loop but use our test command and a 90% threshold."

Swaps thresholds, tools, cadence, and checks **without weakening the feedback cycle**, and offers to save the result as a new entry.

### Design a new loop from scratch
> "I want the agent to triage new production errors every morning."

A short plain-language interview (one question at a time) produces a **copy-ready prompt**, then offers to save it:

```markdown
## Morning error triage

Reviews new production errors each morning, groups them, drafts a fix for the
highest-impact one, and stops once none remain above the noise threshold.

Prompt:
> Each morning, read new errors since the last run, group by root cause, and pick
> the highest-impact group. Draft one focused fix and run the existing test suite;
> keep it only if tests pass. Stop when no group is above the noise threshold or a
> pass makes no progress. Ask before deploying.
```

## The catalog layout

```
.loop-library/
├── README.md            # index: one row per saved loop
└── loops/
    ├── raise-coverage.md
    ├── fix-prod-errors.md
    └── doc-freshness.md
```

Each loop is plain reviewable markdown. Commit the directory so your team shares one trusted, versioned set of loops.

## Safety model

The skill **plans and stores** loops; it does not run them. Designing, adapting, or saving a loop never starts a schedule, changes production, sends a message, or makes a network call. To execute bounded work, hand the resulting prompt to `/agent-orch:make` or your own scheduler. Destructive, irreversible, production, financial, privacy-sensitive, or external-message actions always carry an explicit approval boundary.

## What changed (for plugin authors)

- **New skill**: `plugins/agent-orch/skills/loop-library/SKILL.md` + `references/audit.md` (Loop Doctor) + `references/catalog-template/` (the scaffold copied into a repo on first Save).
- **Local-only by design**: no `WebFetch`, no remote catalog, no API. The SKILL has a dedicated "Security: why the catalog is local" section documenting the removed threat.
- **Claude-Code-only scope**: the upstream project's website, Cloudflare Worker, and build scripts are not skills and were not ported.
- **Versions**: agent-orch `2.32.0 → 2.33.0`, marketplace `2.41.0 → 2.42.0`. Docs synced (README, CHEAT-SHEET, skill count 27 → 28).

## Credit

The loop concept and the design/audit methodology are adapted from the [Loop Library](https://github.com/Forward-Future/loop-library) by **Forward Future** (MIT License). The local-catalog storage and Save workflow, and the removal of all network access, are specific to this agent-orch port.
