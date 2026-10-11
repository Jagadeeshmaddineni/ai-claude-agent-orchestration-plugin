# The Team-Work Wiki

[< Back to docs](README.md)

A user's guide to the `team-work` wiki skills — an **LLM-maintained SDLC knowledge base** for business analysts and delivery teams.

---

## What it is

The team-work wiki is a persistent, compounding knowledge repository that sits *upstream* of planning. It's where you accumulate everything you learn from client calls, requirements documents, and postmortems into living, cross-referenced markdown pages — each with a full audit trail back to the source it came from.

The core idea:

> **The LLM writes the wiki; the human reads it.**

You feed in raw material (a call transcript, an RFP, an incident write-up). The agent does the bookkeeping — summarising, classifying, cross-referencing, citing — and integrates it into existing pages so the corpus **compounds** instead of fragmenting. Months later you can ask "why did we commit to multi-currency?" and jump straight to the call, the speaker, and the timestamp where it was agreed.

Pages are plain markdown with frontmatter and **standard relative links**, so they render and navigate correctly on **GitHub** *and* in **Obsidian**. A BA can browse the wiki right in the GitHub UI while the agent edits it.

### Where it fits in the SDLC

```
  ┌─────────── the wiki (knowledge layer) ───────────┐
  │  /work-wiki → /work-ingest → /work-ask → /work-lint │
  └───────────────────────┬───────────────────────────┘
                          │  seeds
                          ▼
        /work-prep → /work-plan → /work-pop → /agent-orch:make
                  (planning + delivery)
```

The wiki front-runs planning. You accumulate many sources in the wiki, then seed a `/work-prep` session from the clean requirement pages when a body of work is ready.

---

## The six skills at a glance

| Skill | Operation | What you use it for |
|-------|-----------|---------------------|
| [`/team-work:work-wiki`](#1-work-wiki--initialise-or-repair) | **init** | Create (or repair/upgrade) the wiki structure. Run once to start. |
| [`/team-work:work-ingest`](#2-work-ingest--add-a-source) | **ingest** | The core BA tool. Feed in a transcript/doc/postmortem; it integrates the knowledge. |
| [`/team-work:work-ask`](#3-work-ask--query-the-wiki) | **query** | Ask a question; get a cited answer from the compiled knowledge. |
| [`/team-work:work-lint`](#4-work-lint--health-check) | **lint** | Health-check the wiki: contradictions, stale claims, broken links, OKF conformance, gaps. |
| [`/team-work:work-publish`](#5-work-publish--host-it) | **publish** | Host the wiki as a searchable MkDocs site on GitHub Pages, SS&C Blue Stone styled. |
| [`/team-work:work-upgrade`](#6-work-upgrade--migrate-an-older-wiki) | **upgrade** | Migrate an older wiki (`index.md`, `[[wikilinks]]`) to current conventions + OKF conformance. |

---

## Quick start

```bash
# 1. Create the wiki (once)
/team-work:work-wiki
#    → asks where it should live (./wiki/ is recommended), wires search, persists config

# 2. Add your first source
/team-work:work-ingest path/to/discovery-call.txt
#    → classifies it, archives the verbatim original, integrates claims into pages

# 3. Ask what you now know
/team-work:work-ask "is multi-currency in scope for phase 1?"
#    → reads the compiled pages, answers with citations back to the call

# 4. Health-check before you plan
/team-work:work-lint
#    → punch list of contradictions, stale claims, broken links

# 5. (optional) Host it for the team
/team-work:work-publish
#    → SS&C Blue Stone MkDocs site at pages.code.ssnc.dev/<org>/<repo>/
```

---

## How the wiki is laid out

`/work-wiki` creates this structure at your chosen root (e.g. `wiki/`):

```
wiki/
├── CLAUDE.md        # the wiki's operating manual ("schema") — how the agent behaves here
├── README.md        # content catalog + GitHub landing page (one line per page)
├── index.md         # OKF navigation; the root one declares okf_version: "0.1"
├── log.md           # append-only chronological record of every ingest/query/lint
├── sources/         # IMMUTABLE audit trail / OKF citations — verbatim originals, never edited
│   ├── transcripts/<client>/<date>-<slug>.md
│   ├── requirements-docs/<client>/...
│   ├── incidents/<date>-<slug>.md
│   ├── emails/  misc/  assets/
├── requirements/    # generated requirement pages   (+ index.md nav)
├── entities/        # clients, systems, people, products   (+ index.md nav)
├── concepts/        # domain glossary   (+ index.md nav)
├── decisions/       # ADR-style decision pages   (+ index.md nav)
├── incidents/       # postmortem / RFO synthesis   (+ index.md nav)
└── plans/           # thin pages linking planning back to requirements   (+ index.md nav)
```

Two rules worth internalising:

- **`sources/` is immutable.** It's an append-only audit trail (and the wiki's OKF *citations* store). The agent files verbatim originals here and never edits them. Every generated claim cites a source file.
- **Generated pages are compiled, not appended.** A second transcript about billing *updates* the billing requirement page — it doesn't create a parallel note.

### An Open Knowledge Format bundle

The wiki is an **[Open Knowledge Format (OKF v0.1)](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) bundle**. OKF — published by Google Cloud in June 2026 — is an open, vendor-neutral spec that formalises exactly this "LLM wiki" pattern so a knowledge corpus is portable across tools and organisations. You don't have to do anything to get this; the wiki skills produce conformant bundles automatically. What it means in practice:

- **Every concept page has a `type`** in its YAML frontmatter (`requirement`, `entity`, `concept`, `decision`, `incident`, `plan`). That's OKF's one hard requirement — it lets any OKF consumer route and filter pages.
- **Each directory has an `index.md`** navigation file (a short listing for "progressive disclosure"), kept *alongside* the `README.md` catalog. README is the rich human/GitHub view; `index.md` is the spec's machine-friendly listing. The bundle-root `index.md` declares `okf_version: "0.1"`.
- **Links stay relative.** OKF *recommends* absolute `/path` links but explicitly allows relative ones (§5.2); the wiki keeps relative links because those also navigate in Obsidian. Still fully conformant.
- **`sources/` is the citations store**, exempt from frontmatter rules — your verbatim transcripts don't need a `type`.

Why it matters to you: your wiki is now portable knowledge any OKF-aware tool can consume (Google's Knowledge Catalog, the OKF static visualiser, future agents) — without locking you into any of them. `/work-lint` reports conformance gaps; `/work-upgrade` makes an older wiki conformant.

---

## The skills in detail

### 1. `work-wiki` — initialise or repair

```
/team-work:work-wiki [path]
```

Bootstraps the structure above: the `CLAUDE.md` schema, `README.md` catalog, per-directory OKF `index.md` navigation, `log.md`, the immutable `sources/` tree, and the generated page directories. The wiki it creates is an **OKF v0.1**-conformant bundle from day one. It also wires up search and records the wiki root in `.team-work/wiki-config.md` so every other skill knows where to look.

**You'll be asked** where the wiki should live:
- **In this repo at `./wiki/`** — versioned alongside code (recommended for single-project teams).
- **A sibling knowledge repo or directory** — one cross-project wiki.
- **A custom path.**

It's **idempotent** — re-run it any time to repair or upgrade the structure; it never destroys existing content. When it finishes, it offers to publish the wiki as a hosted site (handing off to `/work-publish`).

> **Search (optional):** if [`qmd`](https://github.com/tobi/qmd) is installed, the wiki gets on-device hybrid BM25/vector + LLM re-rank search from day one. If it's absent, the wiki degrades gracefully to `README.md`-based navigation (still fully functional).

---

### 2. `work-ingest` — add a source

```
/team-work:work-ingest [path-or-paste] [--wiki <path>]
```

**This is the skill you'll use most.** You finish a client call or receive a requirements document, and run `/work-ingest`. It runs an 8-phase wizard:

1. **Resolve wiki + commit mode** — the first time, it asks once how wiki changes should be committed (see below) and remembers your choice.
2. **Accept + classify** — paste text, give a file path, or a URL. It classifies the source as transcript / requirements-doc / incident / email / misc and identifies the client.
3. **Archive (audit trail)** — saves the verbatim original under `sources/`. Non-markdown files (PDF, docx, xlsx, pptx) are converted to markdown *and* the original binary is preserved.
4. **Extract** — attendees, speaker attribution, dates, and categorised claims (functional/NFR/entity/concept/decision/incident).
5. **Discuss takeaways** — a concise summary, *not* a wall of generated markdown. You confirm, reclassify, or drop items here.
6. **Integrate into pages** — creates/updates pages where **every claim cites its source**, and flags contradictions with existing pages rather than silently overwriting.
7. **Update catalog + log + search index.**
8. **Commit** — honouring your commit mode.

**Commit mode (asked once, stored per repo):**

| Mode | Behaviour |
|------|-----------|
| **`local`** | Commit wiki changes on the current branch. Fast; solo/trusted workflow. Push when you like. |
| **`pr`** | Every ingest opens a PR for review. A review gate for teams. |

Change it any time by editing `.team-work/wiki-config.md`.

> **Contradictions** are surfaced explicitly. If a new source disagrees with an existing page ("multi-currency phase 1" vs. an earlier "currency deferred to phase 2"), the wizard shows you both and asks how to resolve it — supersede the old claim, or keep both with a flagged note that `/work-lint` will keep surfacing.

---

### 3. `work-ask` — query the wiki

```
/team-work:work-ask <question> [--wiki <path>]
```

Asks a question against the **compiled** knowledge (the pages), not the raw sources — so it's fast and the answer is cited. Unlike query-time RAG that re-derives from raw material every time, `/work-ask` reads the requirement pages, entity pages, and decisions you've already built up.

Every answer cites its wiki page *and*, through that page, the originating call or document (with speaker and date). Example output:

> Multi-currency invoicing is in scope for phase 1.
> - Acme requires invoices in the customer's billing currency (*billing invoice generation* — from the 2026-06-04 discovery call, Maria Chen 00:42:18).
> - This was an explicit decision that supersedes an earlier 2026-05-20 note deferring currency to phase 2.

**The compounding twist:** if the answer is a substantive synthesis or comparison worth keeping, `/work-ask` offers to **file it back into the wiki as a new page** — so the next person who asks gets the compiled answer instead of re-deriving it.

If the wiki doesn't cover your question, it says so honestly and suggests what to ingest (rather than fabricating).

---

### 4. `work-lint` — health-check

```
/team-work:work-lint [--wiki <path>] [--fix]
```

Wikis die when maintenance outpaces value — cross-references rot, summaries drift, a new call quietly contradicts an old requirement. `/work-lint` is the agent doing that maintenance. It reads the whole wiki and produces a **prioritised punch list**:

- 🔴 **High** — contradictions, broken provenance (a citation pointing at a missing source), broken links, OKF-untyped concept pages.
- 🟡 **Medium** — missing requirement pages, stale claims, legacy syntax, missing OKF `index.md`/`okf_version`.
- 🟢 **Low** — orphan pages, missing cross-references, catalog drift, dangling TODO links.

It's **read-only by default**. Pass `--fix` (or confirm per-item) and it applies the *safe* fixes — adding cross-references, repairing unambiguous broken links, marking clearly-superseded claims, creating stub pages for missing-but-referenced requirements, and the OKF-safe fixes (backfill an unambiguous `type`, generate a missing `index.md`, add `okf_version`). It **never** auto-resolves a genuine contradiction or invents missing content — those need your judgement.

Run it periodically, and **especially before seeding a `/work-prep` session** — you want clean requirement pages before they become a plan.

---

### 5. `work-publish` — host it

```
/team-work:work-publish [--wiki <path>] [--dry-run]
```

Turns the wiki into a **browsable, searchable hosted site** — an MkDocs Material site on SS&C GitHub Enterprise Pages at `https://pages.code.ssnc.dev/<org>/<repo>/`. It scaffolds `mkdocs.yml`, `requirements.txt`, and a self-hosted GitHub Actions deploy workflow, then auto-deploys on push.

Key things to know:

- **SS&C Blue Stone look by default.** The site is styled to match every other SS&C wiki — SS&C Blue `#0077C8` primary, Teal `#1099AC` accent, the full brand palette, **Calibri** typography, bordered tables, and a light/dark toggle. The brand stylesheet is *embedded in the skill* and written straight into `stylesheets/extra.css`, so the look applies reliably even if the `tech-infra/wiki-template` repo is unreachable (the old behaviour silently fell back to plain Material). The SS&C logos are fetched best-effort; if they can't be, the colours and font still apply and you can drop the PNGs in later. You can opt out to plain Material, or keep Blue Stone as a base and tweak the CSS for a product sub-brand. Full conventions live in the hosted [Blue Stone style guide](https://code.ssnc.dev/tech-infra/wiki-template) (`docs/style-guide/`).
- **Only `code.ssnc.dev` is supported.** On any other remote (github.com, GitLab) it stops cleanly without writing a workflow that can't run.
- **Auto-generated nav.** It points MkDocs at the wiki root and lets the nav generate from your page directories, so the site stays correct as the agent reshapes the wiki — no hand-maintained `nav:` to drift.
- **Confidentiality trade-off.** By default it publishes the *entire* wiki, including `sources/` (verbatim client material), readable by anyone on the SS&C network. It prints a one-time notice naming exactly what becomes public.
  - ⚠ **Don't exclude `sources/` to hide it.** Every generated page cites its source with a link into `sources/`, so excluding that tree makes **every citation 404** on the live site — and `mkdocs build --strict` won't catch it. If confidentiality matters, restrict *who can view the site* instead (the citation-preserving option), and keep everything published.
- **Idempotent.** Re-run to repair the scaffold. On the first run (before any deploy) it tells you to push and re-run; on the re-run it auto-enables Pages via the API and verifies the live site.

Use `--dry-run` to preview every file it would write without changing anything.

---

### 6. `work-upgrade` — migrate an older wiki

```
/team-work:work-upgrade [--wiki <path>] [--dry-run]
```

A one-time migration for wikis created by an **earlier** version of `/work-wiki`, which used `index.md` as the catalog and Obsidian-style `[[wikilinks]]` — neither of which renders or navigates in the GitHub UI — and which predate OKF. `/work-upgrade`:

- Migrates the legacy catalog `index.md` → `README.md` with `git mv` (preserving history).
- Rewrites every `[[wikilink]]` into a standard relative markdown link.
- Verifies every link resolves, classifying each as OK / broken (with a near-match) / dangling (intentional TODO).
- Refreshes the wiki `CLAUDE.md` schema.
- Runs an **OKF v0.1 conformance pass**: backfills a required `type` into every concept page that lacks one (inferred from its directory), generates the per-directory `index.md` navigation files, and adds `okf_version` to the bundle-root `index.md`.

> Note the two roles of `index.md`: the migration moves the *legacy catalog* out of `index.md` into `README.md`, then the OKF pass creates new, spec-shaped *navigation* `index.md` files. Different job, same filename — they don't collide because they run in that order.

It's **idempotent and safe** — re-run on an already-current, already-conformant wiki and it reports "nothing to upgrade." It never touches the immutable `sources/` tree, and it never rewrites page bodies (the OKF pass only backfills frontmatter and generates nav files). Use `--dry-run` to preview.

You don't need this for a freshly-created wiki — only if `/work-lint` or `/work-wiki` flags that your wiki predates the current conventions or isn't OKF-conformant.

---

## Configuration

All wiki skills read `.team-work/wiki-config.md`, created by `/work-wiki`. You can edit it by hand any time:

| Key | Meaning | Owned by |
|-----|---------|----------|
| `wiki_root` | Where the wiki lives (in-repo, sibling repo, custom path). | `/work-wiki` |
| `qmd` | Whether hybrid search is available. | `/work-wiki` |
| `qmd_mcp` | Whether a qmd MCP server is configured (native search in `/work-ask`). | `/work-wiki` |
| `ingest_mode` | `pr` (every change opens a PR) or `local` (commit on the branch). | `/work-ingest` |
| `publish` | Whether GitHub Pages hosting is configured. | `/work-publish` |
| `publish_url` | The live site URL once publishing is set up. | `/work-publish` |
| `publish_exclude` | Directories kept out of the published site (empty = publish everything). | `/work-publish` |
| `okf` | Whether the wiki is an OKF-conformant bundle (`yes` for wikis created/upgraded with OKF support). | `/work-wiki`, `/work-upgrade` |
| `okf_version` | The OKF spec version the bundle targets (currently `0.1`). | `/work-wiki`, `/work-upgrade` |

---

## A typical BA workflow

```bash
# Day 1 — set up once
/team-work:work-wiki                              # create wiki at ./wiki/
                                                   # → pick "local" commit mode on first ingest

# Ongoing — after every client touchpoint
/team-work:work-ingest discovery-call-acme.txt    # integrate the call
/team-work:work-ingest acme-rfp.pdf               # integrate the RFP (auto-converted)
/team-work:work-ask "what payment terms has Acme confirmed?"

# Before planning a body of work
/team-work:work-lint                              # clean up contradictions + stale claims
/team-work:work-prep                              # seed planning from the clean requirement pages

# When the team wants to browse it
/team-work:work-publish                           # host on GitHub Pages
```

---

## Tips

- **Ingest little and often.** The value compounds — each source enriches the pages the last one built.
- **Trust the audit trail.** Because every claim links back to a source with speaker + timestamp, you never have to remember *why* a requirement exists — just follow the citation.
- **Lint before you plan.** A contradiction in a requirement page becomes a contradiction in your plan. Catch it early.
- **Don't hand-write generated pages.** Direct the agent and curate the sources; let it do the bookkeeping. Hand edits to `requirements/`, `entities/`, etc. risk being reshaped on the next ingest. (Your own sections in `CLAUDE.md` are preserved.)
- **Install `qmd` for better answers.** Without it the wiki still works via the `README.md` catalog, but hybrid search makes `/work-ask` and `/work-lint` sharper.

---

[< Back to docs](README.md)
