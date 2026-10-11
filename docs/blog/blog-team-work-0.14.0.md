# The Wiki Goes Live: Publishing the SDLC Knowledge Base to GitHub Pages (team-work v0.14.0)

team-work v0.12.0 gave business analysts an LLM-maintained wiki — a compounding, cross-referenced knowledge base that turns a stream of client calls into cited requirement pages. v0.13.0 made it render natively on GitHub: `README.md` as the catalog, standard relative markdown links instead of Obsidian-only wikilinks.

But "browsable in the GitHub repo UI" isn't the same as "a site you send someone." A BA who wants to share the requirements picture with a stakeholder, an auditor who wants to read the decision trail, an engineer catching up on a domain — they shouldn't need repo access and a mental model of the folder layout. They should get a URL.

v0.14.0 adds that URL. The new **`/team-work:work-publish`** skill hosts the wiki as a searchable [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) site on SS&C's internal GitHub Enterprise Pages, at `https://pages.code.ssnc.dev/<org>/<repo>/`. And `/work-wiki` now offers to set it up for you the moment your wiki exists.

## The wiki *is* the docs source

SS&C already has a house pattern for documentation sites: the [`tech-infra/wiki-template`](https://code.ssnc.dev/tech-infra/wiki-template) — MkDocs Material in the "Blue Stone" style, deployed to Pages by a GitHub Actions workflow. It's a good pattern, and teams across the org use it (you can see a real one at [`uk-digital/ai-agent-runner-wiki`](https://pages.code.ssnc.dev/uk-digital/ai-agent-runner-wiki/)).

The template assumes a human author maintaining a hand-curated `docs/` tree and a hand-written `nav:` in `mkdocs.yml`. That's exactly backwards for an LLM wiki, where the *agent* curates the structure and reshapes it on every ingest. A hand-coded nav would drift out of sync the first time `/work-ingest` added a page.

So `/work-publish` reproduces the template's toolchain — same Material theme, same Blue Stone branding, same self-hosted-runner deploy — but with two deliberate adaptations:

- **`docs_dir` points at the wiki root.** The wiki you've been accumulating *is* the documentation source. No copying, no separate authoring step, no second source of truth.
- **The navigation is auto-generated.** No `nav:` key. MkDocs builds the tree from the directory structure, using each directory's `README.md` as its landing page — so the site is always correct, no matter how the agent reorganizes `requirements/`, `entities/`, `decisions/`, and the rest.

The result: the same markdown that renders in the GitHub repo UI and in Obsidian now also renders as a themed, full-text-searchable site — with zero new authoring burden.

## One skill, host-aware

```
/team-work:work-publish [--wiki <path>] [--dry-run]
```

It runs in five phases, and the first one is a gate. `/work-publish` detects your git remote host. The deploy mechanics here are SS&C-specific — a self-hosted Actions runner, `mkdocs gh-deploy` to a `gh-pages` branch, the `pages.code.ssnc.dev/<org>/<repo>/` URL pattern — so the skill supports **`code.ssnc.dev` only**. On any other remote it explains why and changes nothing, rather than scaffolding a workflow that can't run.

On a `code.ssnc.dev` repo, it scaffolds the minimal working set at the publishing repo root:

```
mkdocs.yml                          # Material theme, docs_dir = wiki root, auto-nav, README.md home
requirements.txt                    # mkdocs<2.0, mkdocs-material
.github/workflows/deploy-docs.yml   # self-hosted runner → mkdocs gh-deploy → gh-pages
serve.sh                            # local preview
.gitignore                          # + site/, .cache/
```

It's idempotent — re-run it any time to repair the scaffold; if a file exists and differs, it shows you the diff and asks before overwriting. `--dry-run` previews every file and writes nothing. It honors the wiki's `ingest_mode`: commit locally, or open a PR for review, exactly like `/work-ingest` and `/work-upgrade`.

Two things a commit can't do — enabling Actions write-permission and setting the Pages source to `gh-pages` — it attempts via the API and always prints the exact manual fallback. Push to `main`, and about a minute later the site is live.

## `/work-wiki` asks you

Publishing should be discoverable, not buried in a skill you have to know exists. So `/work-wiki` — the skill you already run to initialize or repair the wiki — now ends by offering it:

```
Publish this wiki as a hosted site?
It can be served at https://pages.code.ssnc.dev/<org>/<repo>/ (MkDocs
Material, searchable, SS&C Blue Stone style), auto-deployed on push.

(a) Yes — set up GitHub Pages now   (runs /team-work:work-publish)
(b) Not now   (run /team-work:work-publish any time later)
```

On a `code.ssnc.dev` repo it prompts and hands off; on any other remote it simply mentions the skill without prompting. Either way, every wiki user is told the option exists, the first time it's relevant.

## The `sources/` decision

There's a real trade-off in publishing an LLM wiki, and v0.14.0 makes it explicit rather than papering over it.

The wiki's `sources/` tree is its immutable audit trail — verbatim client-call transcripts, requirement documents, postmortems. That provenance is the whole point of the wiki: every requirement page cites the call it came from. But `pages.code.ssnc.dev` is readable by anyone on the SS&C network, and publishing raw transcripts is a materially different exposure than them sitting in a repo.

By default, `/work-publish` **publishes everything, including `sources/`** — the audit trail is part of what makes the site valuable. But before it does, it prints a confidentiality notice that names exactly what becomes public:

```
⚠ This will publish the ENTIRE wiki to https://pages.code.ssnc.dev/<org>/<repo>/,
  readable by anyone on the SS&C network. That includes:
    ...
    sources/   ← VERBATIM client call transcripts and requirement docs
```

Here's the trap we hit in real use, and why the default is what it is: **excluding `sources/` is not a clean opt-out — it breaks the audit trail on the very surface people use to browse it.** Every generated page cites its source as a clickable link into `sources/` (`> Source: [...](../sources/...)`). Exclude that tree from the build and every one of those citations 404s on the live site. Worse, `mkdocs build --strict` *won't* warn you: links into an excluded directory are logged as INFO, not WARNING, so the build passes green while the links are dead. Strict-build is not a safety net for this.

So `/work-publish` steers you toward the right lever. To reduce exposure it recommends **restricting who can view the site** (an access-layer control) over excluding content — because that keeps `sources/` present and every citation working. A `publish_exclude` opt-out still exists for directories nothing links into, but the prompt now warns loudly before you exclude anything that pages link to, and the summary repeats the caveat so it isn't forgotten. The default respects that the audit trail is valuable *and* that its links must resolve; the access option respects that it might be confidential.

## It enables Pages and checks its own work

Two papercuts from the first real run, now closed.

Setting the Pages source used to be a manual click, because the `gh-pages` branch doesn't exist until the first deploy. But the moment it *does* exist, the API call works cleanly. So `/work-publish` now enables Pages for you automatically whenever `gh-pages` is present — which means on the first run it just tells you to push and re-run, and the re-run wires up Pages via the API with no trip to the settings page. (A by-hand fallback is still printed for when `gh` isn't authenticated.)

And it no longer stops at "should be live." Phase 5 probes the actual site — the home page and one deep page — and reports the HTTP codes, so a broken deploy or a bad base path is caught right then instead of by a confused reader later. One more small mercy: recent `mkdocs-material` prints a big red "MkDocs 2.0" advisory block on every build that looks like a fatal error but isn't, so the skill calls it out as advisory up front.

## Design decisions

**The wiki is the docs source.** No copy step, no second source of truth. `docs_dir` points at the wiki root and the nav auto-generates, so the published site can never drift from the wiki the agent maintains.

**Host-aware, fail-closed.** The deploy mechanics are SS&C-specific, so the skill supports `code.ssnc.dev` only and stops cleanly elsewhere rather than writing a workflow that won't run. (github.com support can follow.)

**Match the house template.** Same Material theme, Blue Stone branding, self-hosted runner, and `gh-deploy`-to-`gh-pages` flow as `tech-infra/wiki-template`, so a published team-work wiki looks and deploys like every other SS&C docs site.

**Idempotent and non-destructive.** Re-run to repair; diffs are shown before any overwrite; `--dry-run` previews everything.

**Honor `ingest_mode`.** Commit locally or via PR, consistent with the other wiki skills — no new commit convention to learn.

**Citations must resolve — confidentiality is an access concern.** Don't break the audit trail to hide it. Publish everything so every citation link works, and reduce exposure by restricting viewers rather than excluding linked-to content. Exclusion stays available, but only behind an explicit warning.

**Enable and verify, don't leave homework.** Auto-enable Pages via the API once `gh-pages` exists, then probe the live site to confirm — instead of ending at a manual checklist and an unverified URL.

**Make the confidentiality trade-off explicit.** Publish everything by default, but say exactly what goes public and offer a per-directory opt-out.

## Prerequisites

- A repo hosted on **`code.ssnc.dev`**.
- **`gh` CLI** authenticated against the enterprise host (`GH_HOST=code.ssnc.dev gh auth status`).
- Access to an SS&C **self-hosted Actions runner** (the workflow uses the org's `[self-hosted, Linux, c2.m4]` label; the one line to change if your runners differ is flagged for you).
- **MkDocs** locally is optional — if present, `/work-publish` validates the build before pushing; if not, CI builds it on push.

## Try it

```bash
/team-work:work-wiki        # initialize (or repair) the wiki — it now offers to publish
/team-work:work-publish     # or set up hosting any time
git push                    # first deploy → live in ~1 minute
```

---

**team-work v0.14.0** — `/work-publish` hosts the LLM-maintained SDLC wiki as a searchable MkDocs Material site on GitHub Pages (`pages.code.ssnc.dev/<org>/<repo>/`), with `docs_dir` pointed at the wiki root and auto-generated navigation so the site never drifts from the wiki. It auto-enables Pages via the API once `gh-pages` exists and verifies the live site. `/work-wiki` offers it on finish. `code.ssnc.dev` only; idempotent; publishes the whole wiki by default with a confidentiality notice — and steers you to restrict viewers rather than exclude `sources/`, because excluding it breaks every citation link (and strict-build won't catch it).
