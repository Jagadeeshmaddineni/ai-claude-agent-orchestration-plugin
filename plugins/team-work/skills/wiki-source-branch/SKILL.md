---
name: wiki-source-branch
description: Run the full /team-work:wiki-source pipeline over the ENTIRE repository and commit everything on the current branch — no scope prompt, no worktree, no PR. Three steps: (1) generate/refresh C4 architecture docs in docs/c4/ via /agent-orch:c4, (2) walk all source code to write a business-domain guide (docs/wiki/domain/) and a technical/DevSecOps reference (docs/wiki/technical/) cross-linked to existing repo docs, (3) /work-ingest the repo's markdown into the team-work wiki. Designed to be called inline by /agent-orch:make after it commits code changes, so the wiki stays in sync with every feature; commits the generated docs onto the branch /make is already on, then returns control so /make continues to push. Honors the wiki's ingest_mode for the wiki commits. No-ops cleanly if no wiki is initialized. Usage: /team-work:wiki-source-branch [--wiki <path>]
---

# Wiki Source (Branch): Whole-Repo Source → Wiki, Committed In Place

The **automation-friendly** variant of [`/team-work:wiki-source`](../wiki-source/SKILL.md). It does **everything `/wiki-source` does**, but with two deliberate simplifications that make it safe to call from another skill:

1. **Always the whole repository** — no scope prompt. It processes every relevant file.
2. **Always commits on the current branch, in place** — no worktree, no PR of its own. It commits the generated `docs/c4/` and `docs/wiki/` onto whatever branch you're on and returns, so a caller like `/make` can keep going to its push.

This is the skill `/agent-orch:make` runs automatically after it commits code changes (when a wiki is initialized), so the knowledge wiki stays in lockstep with the code on every feature branch.

> **Same three steps, same outputs as `/wiki-source`.** This file does not redefine the pipeline — it delegates to `/wiki-source`'s logic and fixes the scope/commit policy. Read [`/team-work:wiki-source`](../wiki-source/SKILL.md) for the full description of each step (C4, domain guide, technical reference, ingest).

## Key Principles

1. **Non-interactive by default.** Assume whole-repo scope and commit-in-place. Don't ask the scope question. Only prompt if something is genuinely blocking (e.g. `ingest_mode: unset` on the very first ingest, which `/work-ingest` owns).
2. **No-op cleanly without a wiki.** If there's no `.team-work/wiki-config.md` (and none is provided via `--wiki`), print a one-line notice and exit 0. A caller must be able to invoke this unconditionally without it failing the run.
3. **Commit only what the wiki ingest didn't.** `/work-ingest` commits the wiki tree per `ingest_mode`. This skill commits the generated *repo* docs (`docs/c4/`, `docs/wiki/`) on the current branch. Never push — the caller controls pushing.
4. **Idempotent.** Re-run safely: C4 updates, guides refresh, ingest integrates rather than duplicates.

## Prerequisites

- Must be in a git repository, on the branch you want the docs committed to.
- A wiki should exist (`.team-work/wiki-config.md`) — if not, the skill no-ops with guidance (it does **not** auto-create one, to stay non-interactive).
- agent-orch available for step 1 (`/agent-orch:c4`); degrades with a warning if not.
- `gh` only if the wiki's `ingest_mode: pr`.

## Phase Map (what the user sees)

`/wiki-source-branch` has 4 phases. Print a banner at the start of each:

```
═══════════════════════════════════════════════════════
/wiki-source-branch phase <N>/4: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name                     | What happens                                                       |
|---|--------------------------------|--------------------------------------------------------------------|
| 1 | Wiki preflight (no-op gate)    | Resolve wiki; if none, print notice and exit 0                     |
| 2 | Run the pipeline (whole repo)  | Steps 1–3 of `/wiki-source` over the entire repo, no scope prompt  |
| 3 | Commit generated docs in place | `git add docs/c4 docs/wiki` + commit on the current branch         |
| 4 | Summary + return               | Report; return control (so a caller like `/make` continues)        |

## Process

### Phase 1: Wiki Preflight (No-Op Gate)

**Goal**: Decide whether there's a wiki to feed. This MUST be able to exit cleanly so callers can invoke unconditionally.

1. **Resolve the wiki root**: `--wiki <path>` → `wiki_root` in `.team-work/wiki-config.md`.

2. **If neither exists**, no-op and exit 0:
   ```
   /wiki-source-branch: no wiki initialized (.team-work/wiki-config.md not found).
   Skipping source→wiki sync. Run /team-work:work-wiki to enable it.
   ```
   Do **not** prompt, do **not** create a wiki — just return so the caller continues.

3. **If a wiki exists**, read `ingest_mode` and continue to Phase 2.

### Phase 2: Run the Pipeline (Whole Repo)

**Goal**: Execute the three `/wiki-source` steps across the **entire repository**, non-interactively.

Run the same logic as `/team-work:wiki-source` Phases 2–4, with scope fixed to the whole repo (skip its Phase 1 scope prompt):

1. **Step 1 — C4** (`/wiki-source` Phase 2): delegate to `/agent-orch:c4` via the Skill tool to create/update `docs/c4/`.
   ```
   Skill tool call:
     skill: "agent-orch:c4"
     args: ""
   ```
   If agent-orch is unavailable, warn and continue (C4 flagged incomplete).

2. **Step 2 — Code → markdown** (`/wiki-source` Phase 3): walk all source and write the two cross-referenced trees — `docs/wiki/domain/` (business-analyst domain guide: what the system does and the domain rules it encodes — caching policy, matching logic, settlement, entities — not how the code is written) and `docs/wiki/technical/` (modules, data flow, dependencies, DevSecOps), linking existing repo docs and filling gaps. Keep any discussion minimal — this is meant to run unattended.

3. **Step 3 — Ingest** (`/wiki-source` Phase 4): `/work-ingest` the repo's markdown (the fresh C4, the new domain + technical guides, and pre-existing repo docs not yet in the wiki) into the wiki, in order C4 → domain → technical → other. `/work-ingest` commits the wiki tree per `ingest_mode`.

### Phase 3: Commit Generated Docs In Place

**Goal**: Commit the generated repo docs onto the current branch (the wiki tree was already committed by `/work-ingest`).

```bash
git add docs/c4 docs/wiki
git diff --cached --quiet || git commit -m "docs: sync C4 + domain/technical wiki source (whole repo)

- docs/c4/ (architecture, via /agent-orch:c4)
- docs/wiki/domain/ (business-analyst domain guide)
- docs/wiki/technical/ (technical + DevSecOps reference)
- ingested into the team-work wiki"
```
`git diff --cached --quiet` guards against an empty commit when nothing changed (e.g. a re-run that produced no diffs). **Never push** — the caller owns the push.

### Phase 4: Summary + Return

```
Wiki source (branch) complete on <branch>.
  C4:        docs/c4/ <created|updated|skipped>
  Domain:    docs/wiki/domain/ (N pages)
  Technical: docs/wiki/technical/ (M pages)
  Ingested:  K files into the wiki (ingest_mode=<local|pr>)
  Committed: generated docs on <branch> (not pushed)
```
Then **return control to the caller**. When invoked by `/make`, `/make` proceeds to its push/PR phase.

---

## Relationship to other skills

| Skill | Relationship |
|-------|--------------|
| [`/team-work:wiki-source`](../wiki-source/SKILL.md) | The interactive parent. This variant fixes scope = whole repo and commit = in place. |
| [`/agent-orch:make`](../../../agent-orch/skills/make/SKILL.md) | Calls this automatically after committing code changes (when a wiki exists), before pushing. |
| [`/agent-orch:c4`](../../../agent-orch/skills/c4/SKILL.md) | Step 1 delegate. |
| [`/team-work:work-ingest`](../work-ingest/SKILL.md) | Step 3 per-file ingest. |

## Error Handling

| Scenario | Action |
|----------|--------|
| No wiki initialized | **No-op, exit 0** with a one-line notice (this is the contract that lets `/make` call it unconditionally). Never auto-create a wiki here |
| Not in a git repo | Print notice and exit 0 (nothing to commit/feed); don't error a caller's run |
| `/agent-orch:c4` unavailable | Warn; run steps 2–3; flag C4 as skipped in the summary |
| `ingest_mode: unset` (first ever ingest) | `/work-ingest` asks once and stores it — the one place a prompt may appear; honored thereafter |
| `ingest_mode: pr`, `gh` not authed | Warn; `/work-ingest` falls back to local for the run |
| Nothing changed on re-run | `git diff --cached --quiet` skips the empty commit; report "no changes" and return |
| Called by `/make` but build produced no doc-relevant changes | Still safe: C4/guides refresh idempotently; empty commit is skipped; control returns to `/make` |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.wiki-source-branch:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
