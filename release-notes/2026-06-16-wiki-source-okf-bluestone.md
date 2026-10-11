# Codebase → Wiki, Open Knowledge Format, and Blue Stone by Default

**Date**: 2026-06-16
**Branch**: `wiki-source-skills`
**Audience**: SS&C plugin authors (who maintain `team-work`/`agent-orch`) **and** users who run the wiki skills
**Versions**: `team-work` 0.15.0 → **0.18.0**; `agent-orch` 2.31.0 → **2.32.0**; marketplace 2.40.0 → **2.41.0**

This release ships three changes to the **team-work LLM wiki**, bundled because they build on each other:

1. **Two new skills** — `/wiki-source` and `/wiki-source-branch` — that mine a code repository into the wiki, wired into `/agent-orch:make`.
2. **Open Knowledge Format (OKF v0.1)** conformance — the wiki is now a portable, vendor-neutral knowledge bundle.
3. **SS&C Blue Stone is the default look** for published wikis (`/work-publish`), and now applies reliably offline.

Everything here is a change to **skill specifications** (the markdown prompt files the agent executes) plus the docs that describe them. There is no runtime/binary to install — pull the branch (or upgrade the plugin) and the new behaviour is live.

---

## 1. Turn a codebase into wiki knowledge: `/wiki-source` & `/wiki-source-branch`

### For users

The wiki already ingested *external* sources — client calls, requirement docs, postmortems — via `/work-ingest`. It had no way to mine the **code repository itself**. Now it does.

```
/team-work:wiki-source [--wiki <path>] [path-or-glob]
```

Runs a three-step pipeline:

1. **C4 architecture** — generates or refreshes `docs/c4/` (System Context, Container, Component diagrams in Mermaid + prose). It **delegates to the existing `/agent-orch:c4`** skill rather than reimplementing it, so there's one source of truth for architecture docs.
2. **Code → markdown** — walks the source and writes **two cross-referenced trees**:
   - `docs/wiki/domain/` — a **business-analyst guide** to *what the system does* and the domain rules it encodes (caching policy, matching logic, settlement, entities). Deliberately **not** about how the code is written.
   - `docs/wiki/technical/` — a **technical / DevSecOps reference** (modules, data flow, dependencies, CI/CD, security). The "how".
   - Existing repo docs (READMEs, ADRs) are **linked, not duplicated** — it fills gaps rather than restating.
3. **Ingest** — `/work-ingest`s that markdown (plus the fresh C4) into the wiki so it compounds and becomes queryable with `/work-ask`.

It honours the wiki's `ingest_mode` and **commits in place** on the current branch. Scope can be the whole repo, only files changed on the branch, or a path/glob.

```
/team-work:wiki-source-branch [--wiki <path>]
```

The same pipeline over the **entire repo**, always committed on the current branch — **no scope prompt, no worktree, no PR**. It **no-ops cleanly when no wiki is initialized**, so it's safe to call unconditionally.

**`/agent-orch:make` now runs it for you.** After `/make` commits your code changes, if a wiki exists in the repo it runs `/wiki-source-branch` (new **step 4.5**), commits the generated docs, then continues to push — so the knowledge wiki stays in lockstep with the code on every feature. If there's no wiki, the step is skipped silently; wiki-sync errors never abort the `/make` run.

### For plugin authors

- New skills live at `plugins/team-work/skills/wiki-source/SKILL.md` and `plugins/team-work/skills/wiki-source-branch/SKILL.md`.
- `wiki-source` is the interactive parent (5 phases, scope prompt, `ingest_mode`-aware). `wiki-source-branch` is the non-interactive variant that fixes *scope = whole repo* and *commit = in place* so a caller like `/make` can invoke it without prompts. It deliberately delegates the pipeline definition to `wiki-source` rather than duplicating it.
- The `/make` change is additive and behind a gate: `plugins/agent-orch/skills/make/SKILL.md` Phase 4 gains **step 4.5**, which checks for `.team-work/wiki-config.md` and skips entirely if absent. It uses `git diff --cached --quiet` to avoid empty commits. This is the only reason `agent-orch` bumped to 2.32.0.
- Output directory split (`docs/wiki/domain/` vs `docs/wiki/technical/`) was a deliberate decision so the BA-facing bundle never forces a domain reader through implementation detail.

---

## 2. The wiki is now an Open Knowledge Format (OKF v0.1) bundle

### Background

In June 2026, Google Cloud published the [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) — an open, vendor-neutral spec that formalizes the "LLM wiki" pattern: a directory of typed markdown *concept* pages with YAML frontmatter, cross-linked into a graph, with `index.md` navigation and `log.md` history. Our wiki was already ~90% of the way there. This release pins down the remaining conformance so the corpus is **portable to any OKF-aware consumer** (Google's Knowledge Catalog, the OKF visualiser, future agents) without locking us into any of them.

### For users

You don't have to do anything — the wiki skills produce conformant bundles automatically. What it means in practice:

- **Every concept page carries a required `type`** in frontmatter (`requirement`, `entity`, `concept`, `decision`, `incident`, `plan`). That's OKF's one hard requirement.
- **Each directory has an `index.md`** navigation file (progressive-disclosure listing) *alongside* the `README.md` catalog. The bundle-root `index.md` declares `okf_version: "0.1"`.
- **`sources/` is the OKF citations store** — exempt from frontmatter rules, so your verbatim transcripts are untouched.

Skill-by-skill:

| Skill | What changed |
|-------|--------------|
| `/work-wiki` | Born OKF-conformant: generates per-directory `index.md`, declares `okf_version`, documents OKF in the wiki schema, adds `okf`/`okf_version` config keys. |
| `/work-ingest` | Writes the required `type` (+ `description`/`timestamp`) on every concept page; keeps each directory's `index.md` in lockstep with `README.md`. |
| `/work-upgrade` | New **Phase 5.5 OKF conformance pass** — backfills `type`, generates `index.md`, adds `okf_version`, reports conformance. Run it on an older wiki to bring it up to spec. |
| `/work-lint` | New conformance check — flags untyped pages, missing/stale `index.md`, missing `okf_version`, reserved-filename misuse; `--fix` handles the safe ones. |

### Deliberate deviations from OKF *recommendations* (all conformant per spec §9)

These are documented in the wiki `CLAUDE.md` schema so future maintainers know they were chosen, not missed:

- **`README.md` is kept as the human catalog *alongside* the OKF `index.md`.** OKF only *reserves* `index.md`; `README.md` is a normal file to it. We keep README because GitHub auto-renders it as the directory landing page. The two are kept in sync.
- **Relative links are kept over OKF's recommended absolute bundle-relative form** (`/path`). OKF §5.2 permits relative links; we use them because they also navigate in Obsidian and render in GitHub subdirectories.

### For plugin authors

- The biggest hazard was the **`index.md` naming collision**: `/work-upgrade` historically migrated a legacy *catalog* `index.md` → `README.md`, while OKF *reintroduces* `index.md` as a per-directory *navigation* file. These are different roles with the same filename. The upgrade skill resolves it by ordering: migrate the legacy catalog out of `index.md` *first* (Phase 2), then generate fresh OKF nav `index.md` files (Phase 5.5). The assessment and error-handling tables were updated to distinguish a *catalog* `index.md` (section headings, many pages) from a *nav* `index.md` (short per-dir listing) so a re-run never re-migrates.
- `/work-lint`'s OKF check (check 11) runs in advisory mode when the wiki isn't marked `okf: yes`, so it reports readiness without treating gaps as errors.
- Conformance is scoped to the concept directories only; `sources/` is never touched.

---

## 3. SS&C Blue Stone is the default look for published wikis

### For users

`/work-publish` hosts the wiki as a MkDocs Material site on `pages.code.ssnc.dev`. Previously the SS&C **Blue Stone** branding was *opt-in*, and it **fetched** the stylesheet from `tech-infra/wiki-template` at publish time — so if that repo was unreachable, the site silently fell back to plain Material.

Now Blue Stone is the **default and reliable** look:

- **SS&C Blue `#0077C8`** primary, **Teal `#1099AC`** accent, the full brand palette as CSS variables, **Calibri** typography, bordered data tables, and light/dark (`slate`) schemes — matching every other SS&C wiki.
- The brand stylesheet is **embedded in the skill** and written straight to `stylesheets/extra.css`, so **the look applies even with no network access**. Logos are fetched best-effort; if they can't be, the colours and font still apply (Material renders a text logo) and you can drop the PNGs in later.
- You can **opt out** to plain Material, or keep Blue Stone as a base and tweak the CSS for a product sub-brand.
- The hosted [Blue Stone style guide](https://code.ssnc.dev/tech-infra/wiki-template) (`docs/style-guide/`) documents the full conventions; those pages are **not** copied into your wiki (they'd pollute the OKF concept bundle) — they're linked instead.

### For plugin authors

- The canonical `extra.css` is reproduced **verbatim** in `plugins/team-work/skills/work-publish/SKILL.md` under the "extra.css template (Blue Stone)" heading — it is the source of truth and is byte-identical to `tech-infra/wiki-template`'s `docs/stylesheets/extra.css`. **If the upstream brand refreshes, re-sync that block.**
- `mkdocs.yml` always emits the `theme.palette`, `theme.logo`, `theme.favicon`, and `extra_css` lines for the default path (added `site_author` too). When logos can't be fetched, only the `logo`/`favicon` lines are dropped — `palette` + `extra_css` stay. The old "template unreachable → Material defaults" code path is gone.
- The LLM-wiki adaptation is preserved: **auto-generated nav** (no hand-maintained `nav:`), `docs_dir` pointed at the wiki root. The template's `nav:` is deliberately *not* adopted.
- Phase 2 gained a look-&-feel choice (`BRANDING=bluestone|material`), and Key Principles / Phase Map / error-handling were updated accordingly.

---

## Upgrading an existing wiki

If you already have a team-work wiki from a previous version:

```
/team-work:work-upgrade          # brings it to OKF v0.1 (backfills type, generates index.md, adds okf_version)
/team-work:work-lint             # confirms conformance + link health
/team-work:work-publish          # re-run to apply Blue Stone by default (idempotent)
```

All three skills are idempotent and safe to re-run.

## Files changed

- **New**: `plugins/team-work/skills/wiki-source/SKILL.md`, `plugins/team-work/skills/wiki-source-branch/SKILL.md`
- **Modified skills**: `work-wiki`, `work-ingest`, `work-upgrade`, `work-lint`, `work-publish` (team-work); `make` (agent-orch)
- **Manifests/versions**: `plugins/team-work/.claude-plugin/plugin.json` (0.18.0), `plugins/agent-orch/.claude-plugin/plugin.json` (2.32.0), `.claude-plugin/marketplace.json` (2.41.0)
- **Docs**: `README.md`, `CHEAT-SHEET.md`, `docs/team-work-wiki.md`, `plugins/team-work/README.md`

> **Note**: these skills are agent-executed specifications, not compiled code, so there is no automated test suite to gate them. Validate by exercising the skills against a real repo/wiki. The embedded Blue Stone CSS was verified byte-identical to the upstream template; manifests are valid JSON and versions are consistent across all files.
