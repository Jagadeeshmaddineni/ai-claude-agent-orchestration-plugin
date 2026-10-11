---
name: wiki-source
description: Turn a code repository into wiki knowledge in three steps. (1) Generate or refresh C4 architecture docs in docs/c4/ (Mermaid + prose) by delegating to /agent-orch:c4 — create if missing, update if present. (2) Walk the source code and write two cross-referenced markdown outputs: a concise BUSINESS-DOMAIN guide for analysts at docs/wiki/domain/ (what the system does and the domain rules it encodes — caching policy, matching logic, settlement, etc., NOT how the code is written) and a TECHNICAL code reference at docs/wiki/technical/ (modules, data flow, dependencies) — linking into existing repo docs and filling gaps so the repo's markdown represents DevSecOps, the business, and everything else for the next step. (3) /work-ingest the repo's markdown (now including the fresh C4 and the new guides) into the team-work wiki so it compounds and is queryable. Honors the wiki's ingest_mode; commits in place. Usage: /team-work:wiki-source [--wiki <path>] [path-or-glob]
---

# Wiki Source: Turn a Codebase into Wiki Knowledge

The **source → wiki** operation. Where `/work-ingest` integrates *external* sources (client calls, requirement docs, postmortems), `/wiki-source` mines the **repository itself** — its architecture and its code — into well-structured markdown, then feeds that markdown into the team-work wiki so the codebase's knowledge compounds alongside everything else.

It runs in three steps, in order, because each feeds the next:

1. **C4 architecture** — generate/refresh `docs/c4/` (delegates to `/agent-orch:c4`).
2. **Code → markdown** — write a **business-domain guide** (`docs/wiki/domain/`) and a **technical reference** (`docs/wiki/technical/`), cross-linking existing repo docs and filling gaps.
3. **Ingest** — `/work-ingest` the repo's markdown (now including step 1 + 2) into the wiki.

The goal of steps 1–2 is to get the repository's markdown into a state that **properly represents the business domain, the technical design, DevSecOps, and anything else the repo's docs cover** — so step 3 ingests a complete, cross-referenced picture rather than scattered fragments.

> **Scope.** `/wiki-source` lets you target a path or glob (default: the whole repo, but it will offer to scope to changed files). For an unconditional **whole-repo** pass that commits everything on the current branch — the variant `/make` calls automatically — use [`/team-work:wiki-source-branch`](../wiki-source-branch/SKILL.md).

## Key Principles

1. **Two audiences, two trees.** The **domain** guide (`docs/wiki/domain/`) is for a business analyst: what the system *does* and the domain rules it encodes (how is cache matching done? what is the settlement policy? what are the entities?) — **not** how the code is written. The **technical** reference (`docs/wiki/technical/`) is for engineers: modules, data flow, dependencies, the "how". Never mix them.
2. **Link, don't duplicate.** Before writing a page, find existing repo markdown (READMEs, `docs/`, ADRs, the fresh `docs/c4/`) on the topic and **link to it**. Only write new prose to fill genuine gaps. Cross-reference liberally with relative markdown links.
3. **C4 first, ingest last.** Architecture context (step 1) makes the code walk (step 2) sharper; both must exist before the ingest (step 3) so the wiki gets the complete picture in one pass.
4. **Idempotent.** Re-running refreshes: `/agent-orch:c4` updates existing C4 docs; step 2 updates the guides in place; step 3 re-ingests (integrate, don't duplicate — `/work-ingest`'s own rule).
5. **Honor the wiki's commit mode.** Commit per `ingest_mode` in `.team-work/wiki-config.md`, exactly like `/work-ingest`. Commit **in place** on the current branch.

## Prerequisites

- Must be in a git repository.
- A wiki must exist (`.team-work/wiki-config.md`). If absent, offer to run `/team-work:work-wiki` first.
- The **agent-orch** plugin must be available for step 1 (`/agent-orch:c4`). If it isn't, step 1 degrades — see Error Handling.
- `gh` CLI authenticated **only if** the wiki's `ingest_mode: pr`.

## Phase Map (what the user sees)

`/wiki-source` has 5 phases. Print a banner at the start of each:

```
═══════════════════════════════════════════════════════
/wiki-source phase <N>/5: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name                       | What happens                                                          |
|---|----------------------------------|-----------------------------------------------------------------------|
| 1 | Resolve wiki + scope             | Read config; resolve wiki root + ingest_mode; pick repo scope         |
| 2 | C4 architecture (step 1)         | Delegate to `/agent-orch:c4` — create or update `docs/c4/`            |
| 3 | Code → markdown (step 2)         | Write `docs/wiki/domain/` (BA) + `docs/wiki/technical/` (eng), cross-linked |
| 4 | Ingest repo markdown (step 3)    | `/work-ingest` the repo's markdown into the wiki                      |
| 5 | Commit (in place) + summary      | Commit per ingest_mode; report what was generated and ingested        |

## Process

### Phase 1: Resolve Wiki + Scope

**Goal**: Know where the wiki is, how to commit, and how much of the repo to process.

1. **Resolve the wiki root** in this order: `--wiki <path>` argument → `wiki_root` in `.team-work/wiki-config.md` → ask. If no config exists at all:
   ```
   No wiki found. /wiki-source feeds a team-work wiki. Run /team-work:work-wiki first.

   (a) Run /work-wiki now (I'll initialize, then continue)
   (b) Point me at an existing wiki with --wiki <path>
   ```

2. **Read `ingest_mode`** from `.team-work/wiki-config.md` (`pr` or `local`). If `unset`, `/work-ingest` in step 3 will ask once and store it; honor it thereafter. If `ingest_mode: pr`, verify `gh auth status` and warn if not authed.

3. **Resolve scope.** Default is the whole repo. If a `path-or-glob` argument was passed, use it. Otherwise offer:
   ```
   What should I mine into the wiki?

   (a) The whole repository  (recommended for the first run)
   (b) Only files changed on this branch vs. the default branch  (incremental)
   (c) A specific path or glob  (I'll ask)
   ```
   - (b): compute `git diff --name-only <default-branch>...HEAD` and scope the code walk to those files (still refresh C4 for the whole system — architecture is global).

   > For the unconditional whole-repo, commit-on-this-branch behavior `/make` uses, see `/team-work:wiki-source-branch`, which skips this prompt.

### Phase 2: C4 Architecture (Step 1)

**Goal**: Get `docs/c4/` current — create it from the code if missing, update it if present.

1. **Check for existing C4 docs** (`docs/c4/README.md`).

2. **Delegate to `/agent-orch:c4`** via the **Skill tool** — it owns the greenfield-vs-update decision, the C4 Scribe agent, Mermaid generation, and verification. Do **not** reimplement C4 here.
   ```
   Skill tool call:
     skill: "agent-orch:c4"
     args: ""
   ```
   `/agent-orch:c4` detects whether `docs/c4/` exists and either creates all levels (System Context, Container, Component, ADR index, README) or updates only the affected levels. Let it run its phases; it produces Mermaid diagrams + prose that render on GitHub.

3. **If the agent-orch plugin / `/agent-orch:c4` is unavailable**, tell the user and offer to continue without step 1 (Error Handling). Don't hand-roll C4 — note it as a gap the user can fill by installing agent-orch and re-running.

4. **Confirm** `docs/c4/` is present before moving on (step 3 will ingest it).

### Phase 3: Code → Markdown (Step 2)

**Goal**: Walk the source (within scope) and produce two cross-referenced outputs, linking existing docs and filling gaps. **Both are markdown destined for the wiki in step 3.**

First, **inventory existing repo markdown** so you link instead of duplicate: top-level `README.md`, `docs/**`, `CONTRIBUTING.md`, ADRs, `docs/c4/**` (just generated), and any per-package READMEs. Note what each already covers.

Then produce the two trees:

#### 3a. Business-domain guide → `docs/wiki/domain/`

A **concise business-analyst guide to the domain the code implements** — *what* the system does and the business rules it encodes, **not how the code is written**. The litmus test: every claim should make sense to an analyst who will never read the source.

- `docs/wiki/domain/README.md` — overview + index of domain pages, with links into `docs/c4/` for the architecture picture and into existing repo docs where they already explain a domain area.
- One page per **domain area / capability**, named for the business concept (not the module). Capture domain rules as questions-and-answers an analyst would ask, e.g.:
  - *How is cache matching done?* (the matching policy and why) — not the cache class API.
  - *What is the caching strategy and when does data expire?* (business freshness rules).
  - *What are the core entities and their lifecycle?*
  - *What are the settlement / validation / pricing rules?* (whatever the domain is).
- Write in plain prose. Where the answer is already documented in a repo file, **link to it** and summarize, rather than restating.
- Use standard relative markdown links (with `.md` and the right `../` hops) so they resolve on GitHub and after ingest.

#### 3b. Technical reference → `docs/wiki/technical/`

The engineering "how", kept **separate** from the domain guide:

- `docs/wiki/technical/README.md` — overview + index, linking to `docs/c4/` (architecture) and existing technical docs.
- Pages covering: module/package map, key data flows, external dependencies and integrations, configuration, build/test/deploy (**DevSecOps** — CI/CD, security scanning, secrets handling, runtime) where the repo's files (workflows, Dockerfiles, IaC) reveal it.
- For anything **not already in markdown**, generate a concise reference page; for anything that **is**, link to it and fill only the gaps.
- This is the "technical part of the codebase" the user asked to live in its own directory, so domain readers aren't forced through implementation detail.

**Cross-reference both ways**: domain pages link to the relevant technical page and the C4 level; technical pages link back to the domain capability they implement. The goal stated by the user: the repo's markdown, after this phase, **properly represents the business, the technical design, DevSecOps, and anything else the repo's docs cover** — ready to ingest.

Keep the discussion with the user concise (wizard, not a wall of generated markdown): summarize the domain areas and technical sections you'll create, let the user correct the carve-up, then write the files.

### Phase 4: Ingest Repo Markdown (Step 3)

**Goal**: Feed the repo's markdown — now including the fresh `docs/c4/` (step 1) and the new `docs/wiki/domain/` + `docs/wiki/technical/` (step 2), plus pre-existing repo docs — into the wiki so it compounds and becomes queryable via `/work-ask`.

1. **Assemble the ingest set**: the markdown produced/refreshed in steps 1–2 plus any pre-existing repo docs in scope that aren't yet represented in the wiki (`README.md`, `docs/**`, ADRs). Skip the wiki's own tree and `sources/`.

2. **Ingest each via `/work-ingest`** using the **Skill tool**, classifying the repo as the "client/project". For repository markdown the natural source type is **requirements-doc** (architecture/domain/technical reference), so the verbatim copy is archived under `sources/requirements-docs/<repo-slug>/` and the knowledge is integrated into `requirements/`, `entities/`, `concepts/`, and `decisions/` pages with citations back to the repo file.
   ```
   Skill tool call:
     skill: "team-work:work-ingest"
     args: "<path-to-markdown-file> --wiki <WIKI_ROOT>"
   ```
   Process files in a sensible order — C4 (architecture) → domain guide → technical reference → other docs — so entity/concept pages exist before pages that reference them. Batch related files where `/work-ingest` supports it; otherwise loop. Let `/work-ingest` do the archiving, extraction, integration, contradiction-flagging, catalog/log updates, and qmd re-index.

3. **Don't double-commit.** `/work-ingest` commits per `ingest_mode`. Step 5 below only commits the step-1/step-2 *generated repo docs* that live outside the wiki (`docs/c4/`, `docs/wiki/`), which `/work-ingest` doesn't own.

### Phase 5: Commit (In Place) + Summary

**Goal**: Persist the generated repo docs and report. Commit **on the current branch** (in place — no worktree, no PR from this skill itself; the wiki ingest already committed per its own `ingest_mode`).

1. **Stage the generated repo docs** (the wiki commits were handled by `/work-ingest`):
   ```bash
   git add docs/c4 docs/wiki
   ```

2. **Commit in place:**
   ```bash
   git commit -m "docs: generate C4 + domain/technical wiki source

   - docs/c4/ (architecture, via /agent-orch:c4) [created|updated]
   - docs/wiki/domain/ (business-analyst domain guide)
   - docs/wiki/technical/ (technical + DevSecOps reference)
   - ingested into the team-work wiki"
   ```
   Do **not** push automatically (the user / `/make` controls pushing). If `ingest_mode: pr`, note that `/work-ingest` may have opened a wiki PR separately.

3. **Summary:**
   ```
   Wiki source complete.

     Step 1 — C4:        docs/c4/ <created|updated> (Mermaid + prose)
     Step 2 — Domain:    docs/wiki/domain/ (N pages — business-analyst guide)
              Technical: docs/wiki/technical/ (M pages — eng + DevSecOps)
     Step 3 — Ingested:  K markdown files into the wiki at <WIKI_ROOT>
     Commit:             in place on <branch> (wiki commits per ingest_mode=<local|pr>)

   Next:
     /team-work:work-ask "<a domain question>"   # query what the code now tells the wiki
     /team-work:work-lint                          # health-check the enriched wiki
   ```

---

## Relationship to other skills

| Skill | Relationship |
|-------|--------------|
| [`/agent-orch:c4`](../../../agent-orch/skills/c4/SKILL.md) | Step 1 delegates to it for architecture docs. Single source of truth — `/wiki-source` never reimplements C4. |
| [`/team-work:work-ingest`](../work-ingest/SKILL.md) | Step 3 calls it per file. `/wiki-source` is the *codebase* feeder; `/work-ingest` handles *external* sources (calls, docs). |
| [`/team-work:wiki-source-branch`](../wiki-source-branch/SKILL.md) | Whole-repo variant that always commits on the current branch; what `/make` runs automatically. |
| [`/team-work:work-ask`](../work-ask/SKILL.md) / [`/work-lint`](../work-lint/SKILL.md) | Query / health-check the wiki after sourcing. |

## Error Handling

| Scenario | Action |
|----------|--------|
| No wiki config | Offer to run `/team-work:work-wiki` first, or take a `--wiki` path |
| Not in a git repository | Stop — `/wiki-source` commits generated docs and feeds a wiki that needs git |
| `/agent-orch:c4` unavailable (plugin not installed) | Warn; offer to continue steps 2–3 without fresh C4; note installing agent-orch + re-running fills the gap. Don't hand-roll C4 |
| `docs/c4/` generation fails | Report it; continue with steps 2–3 over whatever docs exist; flag C4 as incomplete in the summary |
| Existing repo doc already covers a topic | Link to it; only write new prose for genuine gaps (don't duplicate) |
| Domain vs. technical content ambiguous | Default: anything an analyst needs → `domain/`; anything requiring code/impl knowledge → `technical/`. When unsure, put the *what* in domain and the *how* in technical and cross-link |
| `ingest_mode: pr` but `gh` not authed | Warn; `/work-ingest` will offer to fall back to local for the run |
| `ingest_mode: unset` | `/work-ingest` asks once (local vs pr) and stores it; honored thereafter |
| Re-run on an already-sourced repo | Idempotent: C4 updates, guides refresh in place, `/work-ingest` integrates rather than duplicating |
| Scope = changed-files only | Walk only changed files for step 2; still refresh C4 globally (architecture is system-wide) |
| Nothing to commit in Phase 5 | Wiki ingest may still have committed; report that and stop cleanly |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.wiki-source:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points (plus any
skill-specific points noted in the config template). Run listed targets in order per the
shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work skills also
read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
