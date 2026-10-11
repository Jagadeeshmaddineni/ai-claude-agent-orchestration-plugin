---
name: work-publish
description: Publish the team-work LLM wiki as a hosted MkDocs Material site on SS&C GitHub Enterprise Pages (pages.code.ssnc.dev/<org>/<repo>/), styled with the SS&C "Blue Stone" look and feel by default. Detects the git remote host, scaffolds the wiki-template setup adapted for the LLM wiki — mkdocs.yml (Material theme, docs_dir = the wiki root, README.md as home, auto-generated nav over the curated page dirs), requirements.txt, a self-hosted GitHub Actions workflow that deploys via `mkdocs gh-deploy --force` to the gh-pages branch, and the canonical Blue Stone stylesheet (SS&C Blue #0077C8 + Teal accent, full brand palette, Calibri typography, bordered tables, light/dark) written from a copy embedded in the skill so the brand applies even when tech-infra/wiki-template is unreachable; logos are fetched best-effort. Branding can be opted out (plain Material) or used as a base for a sub-brand. Commits per the wiki's ingest_mode, auto-enables Pages via the API once the gh-pages branch exists (re-run after the first deploy), and verifies the live site. Warns that excluding sources/ breaks every citation link (strict-build won't catch it) and recommends restricting site access instead. Idempotent. Only the code.ssnc.dev host is supported; no-ops with guidance on other remotes. Usage: /team-work:work-publish [--wiki <path>] [--dry-run]
---

# Work Publish: Host the Wiki on GitHub Pages (MkDocs)

Turns the LLM-maintained team-work wiki into a **browsable, searchable hosted site** on SS&C's internal GitHub Enterprise Pages, served at `https://pages.code.ssnc.dev/<org>/<repo>/`, with the **SS&C "Blue Stone" look and feel applied by default**. It reproduces the [`tech-infra/wiki-template`](https://code.ssnc.dev/tech-infra/wiki-template) MkDocs Material setup, **adapted for an LLM wiki** in two ways: (1) instead of a hand-maintained `nav:` over a fixed `docs/` tree, it points MkDocs at the wiki root and lets the nav auto-generate from the curated page directories — so the site stays correct as the agent reshapes the wiki; and (2) the Blue Stone brand stylesheet (SS&C Blue `#0077C8`, Teal accent, full palette, Calibri typography, bordered tables, light/dark) is **embedded in this skill and written directly**, so the brand look is reliable rather than a runtime fetch that silently fails to plain Material. Authors who want the conventions can consult the hosted style guide at `tech-infra/wiki-template` (`docs/style-guide/`).

This is the **(publish)** operation of the LLM Wiki pattern, alongside init (`/work-wiki`), ingest (`/work-ingest`), query (`/work-ask`), lint (`/work-lint`), and upgrade (`/work-upgrade`). Run it once to set up hosting; re-run any time to repair or refresh the scaffold.

## Key Principles

1. **Host-aware, one supported host.** Publishing is wired for **`code.ssnc.dev`** (SS&C GitHub Enterprise + `pages.code.ssnc.dev`). On any other remote (github.com, GitLab, none) the skill explains why it can't proceed and stops cleanly — it never writes a workflow that won't run here.
2. **Idempotent and non-destructive.** Re-running never clobbers a file you've customized. Each scaffolded file is created if missing; if it exists and differs, the skill shows the diff and asks before overwriting. `--dry-run` previews every file and writes nothing.
3. **The wiki is the docs source.** `docs_dir` points at the wiki root; `README.md` is the home page (MkDocs treats it as the section index); nav is auto-generated. No hand-maintained `nav:` to drift against the agent's curation.
4. **Publishes the whole wiki by default — including `sources/`.** Per the team's decision, the immutable audit trail is published too. Because `pages.code.ssnc.dev` is readable by anyone on the SS&C network, the skill prints a **one-time confidentiality notice** naming exactly what becomes public, and offers a `publish_exclude` opt-out for any directory without changing the default. **Excluding `sources/` is not a free lunch:** every generated page cites its source with a clickable `> Source: [...](../sources/...)` link, so excluding that tree makes *every citation 404 on the live site* — and `mkdocs build --strict` does **not** catch it. The exclusion prompt warns about this and offers access-restriction as the citation-preserving alternative (see Phase 2).
5. **Honor the repo's commit mode.** Commit locally or open a PR per `ingest_mode` in `.team-work/wiki-config.md`, exactly like `/work-ingest` and `/work-upgrade`.
6. **Pages is enabled for you once it can be.** Setting the Pages source is a repo setting, and the API call works the moment the `gh-pages` branch exists. So the skill enables Pages via the API automatically when `gh-pages` is present (e.g. on a re-run after the first deploy), and on the first run — before any deploy — tells the user to push and simply re-run, rather than leaving a manual click. A by-hand fallback is always printed for when `gh` isn't authed.
7. **SS&C Blue Stone is the default look.** The site ships with the brand identity — SS&C Blue `#0077C8`, Teal `#1099AC` accent, the full brand palette, **Calibri** typography, bordered tables, light/dark — matching `tech-infra/wiki-template` and every other SS&C wiki. The brand stylesheet is **embedded in this skill** (see [extra.css template](#extracss-template-blue-stone)) and written directly, so the look applies **even when the template repo is unreachable** — it is not a fragile runtime fetch. Logos are fetched best-effort; if they can't be, the colors + font still apply (Material shows a text logo). Teams can opt out to plain Material, or use Blue Stone as a base and tweak the CSS for a sub-brand.

## Prerequisites

- A wiki must exist with `.team-work/wiki-config.md` (or pass `--wiki <path>`). If neither, point the user at `/team-work:work-wiki`.
- Must be in a git repository with an `origin` remote on **`code.ssnc.dev`**.
- **`gh` CLI** authenticated against the enterprise host (`GH_HOST=code.ssnc.dev gh auth status`). Required for the best-effort Pages-enable call and for `ingest_mode: pr`.
- The repo's CI must have access to an SS&C **self-hosted Actions runner** (label `[self-hosted, Linux, c2.m4]`, per the org template). If the team's runner labels differ, the skill flags the one line to change.

## Phase Map (what the user sees)

`/work-publish` has 5 phases. Print a banner at the start of each:

```
═══════════════════════════════════════════════════════
/work-publish phase <N>/5: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name                    | What happens                                                                 |
|---|-------------------------------|------------------------------------------------------------------------------|
| 1 | Preflight + resolve target    | Find wiki root; detect host; derive org/repo, docs_dir, site_url; or stop    |
| 2 | Confirm what gets published   | Confidentiality notice + look-&-feel choice (Blue Stone default) + file plan; offer `publish_exclude`; confirm |
| 3 | Scaffold MkDocs + CI          | Write mkdocs.yml, requirements.txt, deploy-docs.yml, Blue Stone extra.css + logos, serve.sh, .gitignore |
| 4 | Enable Pages + commit         | Auto-enable Pages when `gh-pages` exists (else re-run); commit/PR per ingest_mode |
| 5 | Verify + summary              | Probe the live site (home + a deep page); report URL, scope caveats, next steps |

## Process

### Phase 1: Preflight + Resolve Target

**Goal**: Confirm this repo can publish to SS&C Pages, and compute every value the scaffold needs.

1. **Resolve the wiki root** (same precedence as the other wiki skills): `--wiki <path>` → `wiki_root` in `.team-work/wiki-config.md` → ask. If no config and no argument:
   ```
   No wiki found. If you haven't created one yet, run /team-work:work-wiki.
   Otherwise tell me the wiki path with --wiki <path>.
   ```

2. **Detect the git remote host:**
   ```bash
   git remote get-url origin 2>/dev/null
   ```
   Parse the host and the `<org>/<repo>` path from either SSH or HTTPS form (strip a trailing `.git`):
   - `git@code.ssnc.dev:uk-digital/ai-agent-runner.git`  → host `code.ssnc.dev`, org `uk-digital`, repo `ai-agent-runner`
   - `https://code.ssnc.dev/uk-digital/ai-agent-runner.git` → same

3. **Gate on the host.** If the host is **not** `code.ssnc.dev`, stop cleanly:
   ```
   /work-publish currently supports SS&C GitHub Enterprise only (code.ssnc.dev →
   pages.code.ssnc.dev). This repo's origin is: <host>

   Nothing was changed. The MkDocs + GitHub Pages pattern can be added for
   github.com later; for now, publish from a repo hosted on code.ssnc.dev.
   ```
   Stop here. (Do **not** scaffold a workflow that can't deploy on this host.)

4. **Locate the publishing repo and compute `docs_dir`.** The site is built and deployed from the git repo that *contains* the wiki:
   - **Wiki is inside this repo** (the common case, `wiki_root: wiki`): the publishing repo is this one. `docs_dir` = the wiki path relative to the repo root (e.g. `wiki`). `mkdocs.yml` and `.github/workflows/deploy-docs.yml` go at **this repo's root**.
   - **Wiki is its own git repo** (a sibling knowledge repo): the publishing repo is the wiki's repo. `docs_dir: .` (or the content subdir) and the scaffold goes in **that** repo's root. Re-derive `<org>/<repo>` from the wiki repo's `origin`. Confirm with the user which repo will host the site.
   - If the wiki root is a non-git directory outside any repo, explain that Pages needs a code.ssnc.dev repo and stop.

5. **Compute the published values:**
   - `SITE_URL` = `https://pages.code.ssnc.dev/<org>/<repo>/`  (trailing slash required — it's the base path)
   - `REPO_URL` = `https://code.ssnc.dev/<org>/<repo>`
   - `REPO_NAME` = `<org>/<repo>`
   - `SITE_NAME` = a human title — prefer the wiki `README.md` H1, else `<repo>` wiki.

6. **Report the resolved plan** (and continue):
   ```
   Publish target
     Wiki root:   <WIKI_ROOT>
     Repo:        <org>/<repo>   (host: code.ssnc.dev)
     docs_dir:    <docs_dir>
     Site URL:    https://pages.code.ssnc.dev/<org>/<repo>/
     Runner:      [self-hosted, Linux, c2.m4]   (change if your org uses different labels)
   ```

### Phase 2: Confirm What Gets Published

**Goal**: Make the confidentiality trade-off explicit before anything is exposed, and let the user trim it.

1. **Print the confidentiality notice.** The default publishes the entire wiki, including the immutable `sources/` audit trail:
   ```
   ⚠ This will publish the ENTIRE wiki to https://pages.code.ssnc.dev/<org>/<repo>/,
     readable by anyone on the SS&C network. That includes:

       README.md, log.md, and all generated pages
       requirements/  entities/  concepts/  decisions/  incidents/  plans/
       sources/   ← VERBATIM client call transcripts and requirement docs

     The sources/ tree is your raw audit trail and may contain client-confidential
     material. Publishing it exposes it on the network.

   (.qmd/ and dotfiles are excluded automatically by MkDocs.)
   ```

2. **Offer the opt-out** (default keeps the team's "publish everything" choice):
   ```
   Publish scope:
     (a) Publish everything, including sources/   (default — keeps every citation link working)
     (b) Restrict who can view the site, but still publish everything
         — keeps sources/ (so citations resolve); limits exposure at the access layer
     (c) Exclude specific directories from the built site (advanced)
         — they stay in the repo, but are NOT rendered on the site
   ```
   - (a): `PUBLISH_EXCLUDE=` (empty). Recommended.
   - (b): `PUBLISH_EXCLUDE=` (empty) — nothing is excluded from the build, so all citation links resolve. Confidentiality is handled at the access layer instead: point the user at restricting the published site's audience (e.g. an internal-only / SSO-gated Pages configuration, or keeping the repo's network exposure limited). This skill does not configure access control; it surfaces the option and links the Pages settings. This is the **citation-preserving** way to reduce exposure.
   - (c): **advanced — warn first.** Excluding a directory that other pages link into breaks those links on the live site:
     ```
     ⚠ Excluding sources/ will break EVERY citation link on the site.
       Each generated page cites its source as a clickable link into sources/
       (`> Source: [...](../sources/...)`). Exclude that tree and all of those
       links 404 on the live site — exactly the audit trail people browse the
       site to follow.

       IMPORTANT: `mkdocs build --strict` will NOT flag this. Links into an
       excluded dir are logged as INFO, not WARNING, so the build still passes
       green while the live links are dead. Strict-build is not a safety net here.

       If your goal is confidentiality, prefer option (b) — restrict viewers but
       keep sources/ so citations keep working. Only exclude a directory if
       nothing links into it.
     ```
     If the user still proceeds, ask which directories; store as a comma list in `PUBLISH_EXCLUDE` (e.g. `sources`). These become MkDocs `exclude_docs` entries — the files remain in git, only the *built site* omits them. Record the broken-citation caveat in the Phase 5 summary so it isn't forgotten.

3. **Choose the look** (default is SS&C Blue Stone — see [Phase 3 step 4](#phase-3-scaffold-mkdocs--ci)):
   ```
   Site look & feel:
     (a) SS&C Blue Stone   (default — brand colors #0077C8 + Teal #1099AC, Calibri
         typography, bordered tables, light/dark; matches every SS&C wiki)
     (b) Plain MkDocs Material defaults   (no SS&C branding)
     (c) Blue Stone as a base, I'll tweak the CSS after   (sub-brand / product color)
   ```
   - (a)/(c): `BRANDING=bluestone` (default). The canonical Blue Stone `extra.css` is written from the copy embedded in this skill (see [extra.css template](#extracss-template-blue-stone)) — so styling is applied **even if `tech-infra/wiki-template` is unreachable**. Logos are fetched as a best-effort enhancement.
   - (b): `BRANDING=material`. Omit the palette/logo/`extra_css` lines from `mkdocs.yml`; write no `extra.css`.

4. **Confirm the file plan** (skip the prompt under `--dry-run` — just print it):
   ```
   I'll create/refresh, at <publishing repo root>:
     mkdocs.yml                          [new|differs → will show diff]
     requirements.txt                    [new|present]
     .github/workflows/deploy-docs.yml   [new|differs → will show diff]
     serve.sh                            [new|present]
     .gitignore (+ site/, .cache/)       [append if missing]
   [when BRANDING=bluestone (default):]
     <wiki>/stylesheets/extra.css        [Blue Stone brand CSS — embedded, always written]
     <wiki>/assets/images/ssc-logo*.png  [Blue Stone logos — fetched best-effort]

   Proceed? (a) Yes  (b) Dry-run first  (c) Cancel
   ```

### Phase 3: Scaffold MkDocs + CI

**Goal**: Write the minimal, working SS&C-style MkDocs Pages setup, adapted for the LLM wiki. Idempotent — create if missing; if a file exists and differs, show the diff and ask before overwriting; never silently clobber.

1. **`mkdocs.yml`** at the publishing repo root. Use the [mkdocs.yml template](#mkdocsyml-template). Substitute `SITE_NAME`, `SITE_URL`, `REPO_URL`, `REPO_NAME`, `SITE_AUTHOR` (the org/team, or the repo name if unknown), `docs_dir`. **No `nav:` key** — MkDocs auto-generates the nav from the directory tree, using each directory's `README.md`/`index.md` as its landing page (this is the LLM-wiki adaptation; do **not** copy the template's hand-maintained `nav:`). When `BRANDING=bluestone` (the default) emit the `theme.palette`, `theme.logo`, `theme.favicon`, and `extra_css` lines; when `BRANDING=material` omit them. Add an `exclude_docs:` block only if `PUBLISH_EXCLUDE` is non-empty.

2. **`requirements.txt`** at the publishing repo root. Use the [requirements.txt template](#requirementstxt-template) verbatim — it matches the org template (MkDocs pinned `<2.0`, mkdocs-material), so behavior matches `tech-infra/wiki-template` and other SS&C wikis.

3. **`.github/workflows/deploy-docs.yml`**. Use the [workflow template](#deploy-docsyml-template) verbatim. It runs on the self-hosted runner and deploys with `mkdocs gh-deploy --force` to the `gh-pages` branch under `permissions: contents: write`. If you detect a non-standard runner setup, flag the single `runs-on:` line as the thing to edit; don't guess a different label.

4. **Blue Stone branding (the default look).** Skip this step entirely only if the user chose `BRANDING=material` in Phase 2. Otherwise (`BRANDING=bluestone`, the default), apply SS&C Blue Stone — this is what "support the Blue Stone look and feel" means: SS&C Blue `#0077C8` primary, Teal `#1099AC` accent, the full brand palette as CSS variables, **Calibri** typography, bordered data tables, and light/dark (`slate`) schemes.

   **a. Write `extra.css` from the copy embedded in this skill — always, no network needed.** The canonical Blue Stone stylesheet is reproduced verbatim in the [extra.css template](#extracss-template-blue-stone) below; it is the **source of truth**. Write it to `${WIKI_ROOT}/stylesheets/extra.css` (create the dir). Because the bytes live in this skill, the brand styling applies **even when `tech-infra/wiki-template` is unreachable** — that was the old failure mode (silently falling back to plain Material). The mkdocs.yml `extra_css: [stylesheets/extra.css]` line points at this file.

   **b. Fetch the logos as a best-effort enhancement** (they're binary, so not embeddable here):
   ```bash
   mkdir -p "${WIKI_ROOT}/assets/images" "${WIKI_ROOT}/stylesheets"
   GH_HOST=code.ssnc.dev gh api repos/tech-infra/wiki-template/contents/docs/assets/images/ssc-logo-white.png \
     --jq '.content' | base64 -d > "${WIKI_ROOT}/assets/images/ssc-logo-white.png" 2>/dev/null
   GH_HOST=code.ssnc.dev gh api repos/tech-infra/wiki-template/contents/docs/assets/images/ssc-logo.png \
     --jq '.content' | base64 -d > "${WIKI_ROOT}/assets/images/ssc-logo.png" 2>/dev/null
   ```
   - **Logos fetched OK** → keep `theme.logo: assets/images/ssc-logo-white.png` and `theme.favicon: assets/images/ssc-logo.png` in `mkdocs.yml`.
   - **Logos unreachable** → **still keep the colors + Calibri** (the CSS is already written in step a). Drop only the `theme.logo`/`theme.favicon` lines so the build doesn't 404 on a missing image; Material renders the `site_name` as a text logo in the brand color meanwhile. Tell the user they can drop the two PNGs into `assets/images/` later and re-add the lines. Do **not** fall back to unbranded Material — the brand colors and font are the look, and they don't depend on the logos.

   These are **build assets**, not wiki content — `/work-ingest` and `/work-lint` only touch the OKF concept dirs, so they leave `stylesheets/`/`assets/` alone, and they carry no `type` frontmatter (not OKF concepts).

   **c. Reference the canonical style guide** (don't copy it in). The template ships a `style-guide/` doc section (colors, typography, admonitions, page-status, tables). Do **not** scaffold those pages into the wiki — they'd add non-concept pages to the OKF bundle. Instead, note in the Phase 5 summary that the live Blue Stone style guide is at `https://code.ssnc.dev/tech-infra/wiki-template` (docs/style-guide) for authors who want the conventions.

5. **`serve.sh`** for local preview (matches the template):
   ```bash
   #!/bin/bash
   # Helper script to serve MkDocs documentation locally
   source .venv/bin/activate 2>/dev/null || true
   mkdocs serve
   ```
   `chmod +x serve.sh`.

6. **`.gitignore`** at the publishing repo root — append if missing:
   ```
   # MkDocs build output (rendered by CI; never committed)
   site/
   .cache/
   ```
   (`.qmd/` is already ignored by `/work-wiki`.)

7. **Local build check** (skip under `--dry-run`). If `mkdocs` is available, validate the config builds before pushing:
   ```bash
   mkdocs build --strict 2>&1 | tail -20 || echo "mkdocs not installed locally — CI will build on push"
   ```
   `--strict` surfaces nav problems and links to genuinely-missing targets early. If it fails on a broken relative link, point the user at `/work-lint` to fix it (don't auto-edit wiki content from this skill). If `mkdocs` isn't installed locally, that's fine — note CI will build it.

   > **`--strict` is NOT a safety net for excluded directories.** If `PUBLISH_EXCLUDE` is non-empty, links *into* an excluded dir (e.g. citations into `sources/`) are logged by MkDocs as INFO, not WARNING — so `--strict` passes green even though those links are dead on the live site. When `PUBLISH_EXCLUDE` is non-empty, do **not** rely on the strict build; remind the user (per Phase 2) that those citation links will 404.

   > **Cosmetic noise heads-up.** Recent `mkdocs-material` prints a large red **"MkDocs 2.0"** advisory block on every build. It looks like a fatal error but is **advisory, not a failure** — the build still succeeds. Tell the user to judge success by the exit code / "Documentation built" line, not the red banner.

### Phase 4: Enable Pages + Commit

**Goal**: Get the site live and persist the choice, honoring the repo's commit mode.

1. **Enable Pages from `gh-pages` — automatically once the branch exists.** Setting the Pages source via the API works cleanly the moment `gh-pages` exists; it only fails *before* the first deploy because the branch isn't there yet. So:

   **a. Check whether `gh-pages` already exists** (it will on a re-run after a successful deploy, or if a prior run pushed):
   ```bash
   GH_HOST=code.ssnc.dev gh api repos/<org>/<repo>/branches/gh-pages --jq '.name' 2>/dev/null
   ```
   **b. If it exists, enable Pages now** (and confirm):
   ```bash
   GH_HOST=code.ssnc.dev gh api -X POST repos/<org>/<repo>/pages \
     -f 'source[branch]=gh-pages' -f 'source[path]=/' 2>/dev/null \
     || GH_HOST=code.ssnc.dev gh api -X PUT repos/<org>/<repo>/pages \
        -f 'source[branch]=gh-pages' -f 'source[path]=/' 2>/dev/null
   GH_HOST=code.ssnc.dev gh api repos/<org>/<repo>/pages --jq '.html_url' 2>/dev/null \
     && echo "Pages enabled from gh-pages/(root)."
   ```
   (`POST` creates the Pages site; `PUT` updates it if it already exists — try POST, fall back to PUT, so this is idempotent on re-runs.)

   **c. If `gh-pages` does NOT exist yet** (the common first-run case — local mode hasn't pushed, so no deploy has happened): say so, and tell the user the skill will do it for them on the next run:
   ```
   gh-pages doesn't exist yet (no deploy has run). Pages can't be enabled until
   the first deploy creates it. After you push and the "Deploy Documentation"
   workflow succeeds, just RE-RUN /team-work:work-publish — it will detect
   gh-pages, enable Pages via the API, and verify the live site. (Or set it once
   by hand — see below.)
   ```
   Offer, when `gh` is authed and the user is ready to push, to poll briefly for the branch and enable Pages in the same run:
   ```bash
   # optional: after the user confirms they've pushed, poll up to ~2 min
   for i in $(seq 1 12); do
     GH_HOST=code.ssnc.dev gh api repos/<org>/<repo>/branches/gh-pages --jq '.name' 2>/dev/null && break
     sleep 10
   done
   # then run step (b)
   ```
   Don't poll unprompted in local mode (nothing has been pushed); only offer it.

2. **Manual fallback** (only needed if the API path above couldn't run — e.g. `gh` not authed):
   ```
   One-time repo settings on https://code.ssnc.dev/<org>/<repo>/settings :
     1. Settings → Actions → General → Workflow permissions → "Read and write permissions"
        (the workflow also declares `permissions: contents: write`, which usually suffices)
     2. After the first "Deploy Documentation" run creates the gh-pages branch:
        Settings → Pages → Build and deployment → Source: "Deploy from a branch"
        → Branch: gh-pages  / (root)  → Save
        (or just re-run /team-work:work-publish, which does this via the API)
   ```

3. **Persist config.** Update `.team-work/wiki-config.md` — set `publish: yes`, `publish_url: <SITE_URL>`, and `publish_exclude: <list|empty>`. Preserve `wiki_root`, `qmd`, `qmd_mcp`, `ingest_mode` untouched. (If the keys are absent — an older config — add them.)

4. **Append a `log.md` entry:**
   ```markdown
   ## [<YYYY-MM-DD>] publish — configured GitHub Pages hosting
   MkDocs Material site → https://pages.code.ssnc.dev/<org>/<repo>/
   docs_dir=<docs_dir>, auto-nav, deploy via gh-deploy on self-hosted runner.
   Exclude from site: <none|list>.
   ```

5. **Commit, honoring `ingest_mode`** (default to local if unset, and tell the user):

   **`ingest_mode: local`:**
   ```bash
   git add mkdocs.yml requirements.txt .github/workflows/deploy-docs.yml serve.sh .gitignore \
           "${WIKI_ROOT}" .team-work/wiki-config.md
   git commit -m "wiki: publish as MkDocs site on GitHub Pages

   - mkdocs.yml (Material, docs_dir=<docs_dir>, auto-nav, README.md home)
   - self-hosted deploy-docs.yml → gh-deploy to gh-pages
   - site: https://pages.code.ssnc.dev/<org>/<repo>/"
   ```
   Don't push automatically (match `/work-upgrade` local behavior); remind the user that the deploy runs on push to `main`.

   **`ingest_mode: pr`:**
   ```bash
   git checkout -b "wiki/publish-<YYYY-MM-DD>"
   # commit as above
   git push -u origin "wiki/publish-<YYYY-MM-DD>"
   GH_HOST=code.ssnc.dev gh pr create --title "Publish wiki as MkDocs site on GitHub Pages" --body "$(cat <<'EOF'
   ## Wiki publishing

   Adds MkDocs Material + a self-hosted GitHub Actions deploy so the wiki is hosted at
   `https://pages.code.ssnc.dev/<org>/<repo>/` (built from the wiki root, auto-generated nav).

   ### Review
   - Confirm the runner label in `deploy-docs.yml` matches this org's runners.
   - Confirm publish scope (sources/ included unless excluded) is acceptable for a network-readable site.
   - After merge: set Settings → Pages → Source → `gh-pages` / (root) once the branch exists.
   EOF
   )"
   ```

### Phase 5: Verify + Summary

**Goal**: Close the loop — don't stop at "should be live." If Pages was enabled (i.e. `gh-pages` existed and step 4 succeeded), probe the actual site; otherwise tell the user exactly what's left.

1. **Probe the live site** (only when Pages is enabled; skip with a note if `gh-pages` didn't exist yet). Check the home page and one deep page so a broken deploy or a bad base-path is caught here, not by a user later:
   ```bash
   BASE="https://pages.code.ssnc.dev/<org>/<repo>/"
   # home page
   curl -fsS -o /dev/null -w "home: %{http_code}\n" "$BASE"
   # one deep page — pick a real generated page, e.g. the README of a populated dir,
   # rendered by MkDocs at <dir>/ (directory URLs). Fall back to requirements/ if present.
   curl -fsS -o /dev/null -w "deep: %{http_code}\n" "${BASE}requirements/"
   ```
   - Both `200` → report verified.
   - Home `200`, deep `404` → likely still propagating, or the page path differs; note it and suggest re-checking in a minute (don't fail hard).
   - Home `404`/connection error → Pages may not have finished its first build, or the source isn't set; point back to Phase 4 (re-run once `gh-pages` exists).
   - If `cmux`/a browser is available, optionally snapshot `$BASE` for a visual confirm.
   - On a non-SS&C network the host won't resolve — note that the probe needs the SS&C network and isn't a failure of the setup.

2. **Print the summary:**
   ```
   Publishing configured.

     Site:                       https://pages.code.ssnc.dev/<org>/<repo>/
                                 [verified: home 200, requirements/ 200]   ← when probed
                                 [pending: re-run after first deploy to enable + verify]  ← when gh-pages absent
     Source:                     <docs_dir>  (wiki root, auto-nav, README.md home)
     Look & feel:                SS&C Blue Stone — #0077C8 + Teal, Calibri, light/dark
                                 [logos: applied | text logo (PNGs not fetched — add later)]
                                 <or: Plain Material defaults (branding opted out)>
     Deploy:                     push to main/master → self-hosted runner → gh-deploy → gh-pages (~1 min)
     Publish scope:              everything <or: excluding [list]>
     Commit mode:                <local|pr>   [PR: <url> if pr]
     Style guide:                tech-infra/wiki-template → docs/style-guide (Blue Stone conventions)
   ```
   **If `PUBLISH_EXCLUDE` is non-empty, add a prominent caveat:**
   ```
     ⚠ Excluded from the site: <list>. Any citation/links into these dirs will
       404 on the live site (strict-build won't flag it). Consider restricting
       site access instead and re-running with everything published.
   ```
   **If Pages wasn't enabled yet:**
   ```
     Next deploy enables it: push → wait for "Deploy Documentation" → re-run
     /team-work:work-publish (it detects gh-pages, enables Pages via API, verifies).
   ```

3. **Next steps:**
   ```
   Re-run /team-work:work-publish any time to repair the scaffold or enable+verify Pages (idempotent).
   Next:
     /team-work:work-lint     # fix any broken links before they ship to the site
     git push                 # (local mode) trigger the first deploy
   ```

---

## mkdocs.yml template

`{{ ... }}` values are substituted in Phase 3. The `exclude_docs:` block is included **only** when `PUBLISH_EXCLUDE` is non-empty. The `theme.palette`, `theme.logo`, `theme.favicon`, and `extra_css` lines are emitted when `BRANDING=bluestone` (the default) and **omitted** when `BRANDING=material`. When the logos couldn't be fetched (Phase 3 step 4b), keep the palette + `extra_css` but drop the `logo`/`favicon` lines.

```yaml
# =============================================================================
# MkDocs configuration — team-work LLM wiki, SS&C Blue Stone style
# Generated by /team-work:work-publish. Adapted from tech-infra/wiki-template:
# docs_dir points at the wiki root and nav is auto-generated (no hand nav:),
# so the site stays correct as the agent reshapes the wiki. Blue Stone brand
# colors + Calibri typography come from stylesheets/extra.css (default look).
# =============================================================================

site_name: "{{ SITE_NAME }}"
site_description: "LLM-maintained SDLC knowledge wiki"
site_author: "{{ SITE_AUTHOR }}"      # org/team (or repo name if unknown)
site_url: "{{ SITE_URL }}"            # https://pages.code.ssnc.dev/<org>/<repo>/

repo_name: "{{ REPO_NAME }}"
repo_url: "{{ REPO_URL }}"

# The wiki root is the documentation source. README.md is the home page.
docs_dir: "{{ DOCS_DIR }}"

# Auto-generated navigation (no nav: key) — MkDocs builds the tree from the
# directory structure, using each dir's README.md/index.md as its landing page.

theme:
  name: material
  # --- Blue Stone branding (omit this logo/favicon pair if BRANDING=material,
  #     or if the logos couldn't be fetched; the palette + extra_css below still
  #     deliver the brand colors + Calibri). ---
  logo: assets/images/ssc-logo-white.png
  favicon: assets/images/ssc-logo.png
  # SS&C brand colors are applied via stylesheets/extra.css (see extra_css).
  palette:
    - media: "(prefers-color-scheme: light)"
      scheme: default
      toggle:
        icon: material/brightness-7
        name: Switch to dark mode
    - media: "(prefers-color-scheme: dark)"
      scheme: slate
      toggle:
        icon: material/brightness-4
        name: Switch to light mode
  features:
    - navigation.tabs
    - navigation.sections
    - navigation.top
    - navigation.tracking
    - search.suggest
    - search.highlight
    - search.share
    - content.code.copy
    - content.code.annotate
    - toc.follow

markdown_extensions:
  - pymdownx.highlight:
      anchor_linenums: true
  - pymdownx.inlinehilite
  - pymdownx.snippets
  - pymdownx.superfences
  - pymdownx.tabbed:
      alternate_style: true
  - pymdownx.tasklist:
      custom_checkbox: true
  - admonition
  - pymdownx.details
  - attr_list
  - md_in_html
  - tables
  - footnotes
  - pymdownx.emoji:
      emoji_index: !!python/name:material.extensions.emoji.twemoji
      emoji_generator: !!python/name:material.extensions.emoji.to_svg

plugins:
  - search:
      lang: en

# Blue Stone brand colors + Calibri typography (omit only if BRANDING=material):
extra_css:
  - stylesheets/extra.css

extra:
  social:
    - icon: fontawesome/brands/github
      link: "{{ REPO_URL }}"

# Only emitted when directories are excluded from the published site
# (they remain in the repo; just not built into the site):
# exclude_docs: |
#   sources/
```

> **Notes for the agent generating this file**
> - **Blue Stone is the default.** Emit `theme.palette`, `theme.logo`, `theme.favicon`, and `extra_css` whenever `BRANDING=bluestone`. Only omit the whole branding set when the user explicitly chose `BRANDING=material`. If the logos couldn't be fetched, drop just `theme.logo`/`theme.favicon` but **keep** `theme.palette` + `extra_css` (colors + Calibri don't need the logos).
> - The `extra_css` file is written from the [embedded copy](#extracss-template-blue-stone) in this skill, so the colors apply even offline — never drop `extra_css` for `BRANDING=bluestone` on the grounds that the template repo was unreachable.
> - `docs_dir` is relative to the directory containing `mkdocs.yml`. For the in-repo case it's the wiki path (e.g. `wiki`); for a wiki that is its own repo it's `.`.
> - MkDocs ignores dot-directories, so `.qmd/` is never published — no exclusion needed.
> - `exclude_docs` takes gitignore-style patterns, one per line; emit `sources/` etc. only for entries in `PUBLISH_EXCLUDE`.

## extra.css template (Blue Stone)

The canonical SS&C Blue Stone stylesheet, reproduced verbatim from
`tech-infra/wiki-template` (`docs/stylesheets/extra.css`). This is the **source
of truth** — Phase 3 step 4a writes it to `${WIKI_ROOT}/stylesheets/extra.css`
directly, so the brand look (colors + Calibri) applies with no network fetch.
If the upstream brand refreshes, re-sync this block from the template repo.

```css
/* SS&C Brand Colors - Override Material Theme (Blue Stone style guide) */
:root,
[data-md-color-scheme="default"] {
  /* Primary - SS&C Blue (#0077C8) */
  --md-primary-fg-color:        #0077C8 !important;  /* SS&C Blue */
  --md-primary-fg-color--light: #3392D3 !important;  /* SS&C Blue 500 */
  --md-primary-fg-color--dark:  #0B4D99 !important;  /* Cobalt */
  --md-primary-bg-color:        #ffffff !important;
  --md-primary-bg-color--light: #f5f5f5 !important;

  /* Accent - Teal (#1099AC) */
  --md-accent-fg-color:         #1099AC !important;  /* Teal */
  --md-accent-fg-color--transparent: #1099AC1A !important;
  --md-accent-bg-color:         #ffffff !important;
  --md-accent-bg-color--light:  #f5f5f5 !important;

  /* Links and Interactive Elements */
  --md-typeset-a-color:         #0077C8 !important;  /* Links - SS&C Blue */

  /* Additional Brand Colors Available */
  --ssc-navy:       #131E58;
  --ssc-dark-teal:  #076775;
  --ssc-dark-gray:  #344157;
  --ssc-gray:       #858EA0;
  --ssc-yellow:     #F5AB0A;
}

/* Dark mode adjustments */
[data-md-color-scheme="slate"] {
  --md-primary-fg-color:        #3392D3 !important;  /* Lighter blue for dark mode */
  --md-primary-fg-color--light: #66ADDE !important;
  --md-primary-fg-color--dark:  #0077C8 !important;

  --md-accent-fg-color:         #40ADBD !important;  /* Lighter teal for dark mode */
  --md-accent-fg-color--transparent: #40ADBD1A !important;

  --md-typeset-a-color:         #3392D3 !important;
}

/* Logo styling - using pre-inverted white logo, no filter needed */

/* SS&C Brand Typography - Calibri for Digital (per brand guidelines pages 22-25) */
body,
.md-typeset,
.md-typeset * {
  font-family: Calibri, 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif !important;
}

/* Headings also use Calibri */
.md-typeset h1,
.md-typeset h2,
.md-typeset h3,
.md-typeset h4,
.md-typeset h5,
.md-typeset h6 {
  font-family: Calibri, 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif !important;
}

/* Navigation and header elements */
.md-header,
.md-nav,
.md-tabs {
  font-family: Calibri, 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif !important;
}

/* Table styling - add borders for data tables */
.md-typeset table:not([class]) {
  border: 1px solid var(--md-default-fg-color--lightest);
  border-collapse: collapse;
}

.md-typeset table:not([class]) th,
.md-typeset table:not([class]) td {
  border: 1px solid var(--md-default-fg-color--lightest);
  padding: 0.6em 1em;
}

.md-typeset table:not([class]) th {
  background-color: var(--md-default-fg-color--lightest);
  font-weight: 600;
}
```

**Blue Stone palette reference** (the extended colors above are available as CSS
variables for custom content — diagrams, callouts — so authors never hardcode hex):

| Role | Color | Hex | CSS variable |
|------|-------|-----|--------------|
| Primary | SS&C Blue | `#0077C8` | `--md-primary-fg-color` |
| Primary light | SS&C Blue 500 | `#3392D3` | `--md-primary-fg-color--light` |
| Primary dark | Cobalt | `#0B4D99` | `--md-primary-fg-color--dark` |
| Accent | Teal | `#1099AC` | `--md-accent-fg-color` |
| Extended | Navy | `#131E58` | `--ssc-navy` |
| Extended | Dark Teal | `#076775` | `--ssc-dark-teal` |
| Extended | Dark Gray | `#344157` | `--ssc-dark-gray` |
| Extended | Gray | `#858EA0` | `--ssc-gray` |
| Extended | Yellow | `#F5AB0A` | `--ssc-yellow` |

Full conventions (typography hierarchy, admonitions, page-status indicators) live
in the hosted Blue Stone style guide: `tech-infra/wiki-template` → `docs/style-guide/`.

## requirements.txt template

Verbatim from the org template (keeps parity with other SS&C wikis):

```
# Pin to MkDocs 1.x to avoid breaking changes in 2.0
mkdocs>=1.6.0,<2.0.0
mkdocs-material>=9.5.0
mkdocs-minify-plugin>=0.8.0
mkdocs-git-revision-date-localized-plugin>=1.2.0

# livereload enables MkDocs auto-reload functionality during local development
livereload>=2.6.3
```

## deploy-docs.yml template

Verbatim from the org template. The only line a team may need to change is `runs-on:` (the self-hosted runner label).

```yaml
name: Deploy Documentation

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: write

# Allow one concurrent deployment
concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: [self-hosted, Linux, c2.m4]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.x'

      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          key: mkdocs-material-${{ hashFiles('requirements.txt') }}
          path: .cache
          restore-keys: |
            mkdocs-material-

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Deploy to GitHub Pages
        run: mkdocs gh-deploy --force
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No wiki config and no `--wiki` | Point user to `/team-work:work-wiki`, or ask for the path |
| Not in a git repo / no `origin` | Explain Pages needs a code.ssnc.dev repo; stop |
| Remote host is not `code.ssnc.dev` | Print the host, explain only SS&C Enterprise is supported, change nothing, stop |
| Wiki root is outside any git repo | Explain the publishing repo must be a code.ssnc.dev repo; stop |
| Wiki is its own repo (sibling) | Set up the scaffold in *that* repo; re-derive org/repo from its `origin`; confirm with user |
| `mkdocs.yml` / workflow already exists and differs | Show the diff; ask before overwriting; never silently clobber |
| Scaffold files already current | Report "already configured"; offer to refresh Blue Stone CSS/logos (re-sync from the embedded copy) / re-print manual steps |
| `gh` not authenticated on code.ssnc.dev | Skip the best-effort Pages-enable call; print manual steps; warn if `ingest_mode: pr` |
| Template repo unreachable (logos can't be fetched) | **Blue Stone colors + Calibri still apply** — `extra.css` is written from the embedded copy, not fetched. Only the logo PNGs are skipped: drop `theme.logo`/`theme.favicon`, keep `palette`+`extra_css`, tell the user to add the PNGs later. Never fall back to unbranded Material for this reason |
| User opts out of branding (`BRANDING=material`) | Omit `theme.palette`/`logo`/`favicon`/`extra_css`; write no `extra.css`; plain Material defaults |
| User wants a sub-brand color | `BRANDING=bluestone` then point them at `stylesheets/extra.css` to override the `--md-primary-*` variables; don't override colors in `mkdocs.yml` (matches the template's guidance) |
| `mkdocs` not installed locally | Skip the local `mkdocs build` check; note CI builds on push |
| Local `mkdocs build --strict` fails on a broken link | Report it; point at `/work-lint`; don't auto-edit wiki content here |
| `mkdocs build` prints a red "MkDocs 2.0" advisory block | Advisory, not a failure — judge success by exit code / "Documentation built"; tell the user so they don't panic |
| `PUBLISH_EXCLUDE` non-empty (e.g. excludes `sources/`) | Links into the excluded dir 404 on the live site; `--strict` will NOT flag it (INFO not WARNING). Warn at the Phase 2 prompt and again in the Phase 5 summary; recommend access-restriction (option b) instead |
| User wants to hide `sources/` but keep citations working | Don't exclude it — recommend restricting site viewers (Phase 2 option b); publish everything so links resolve |
| `gh-pages` doesn't exist yet (first run, nothing pushed) | Expected: can't enable Pages pre-deploy. Tell the user to push, let the workflow run, then re-run the skill (it auto-enables + verifies). Optionally poll for the branch if they confirm a push |
| `gh-pages` exists (re-run / after deploy) | Enable Pages via API (POST then PUT fallback); then probe the live site in Phase 5 |
| Live-site probe returns 404/connection error | Don't fail hard — likely still propagating or Pages source not set; suggest re-checking shortly or re-running once the deploy finished |
| Probe can't resolve `pages.code.ssnc.dev` | Needs the SS&C network; note it's a network/visibility limitation, not a setup failure |
| Self-hosted runner labels differ for this org | Flag the single `runs-on:` line to change; don't guess a label |
| `ingest_mode: pr` but `gh` not authed | Warn; offer to fall back to local commit for this run |
| Push/PR fails | Commit preserved locally; show manual `git push` / `gh pr create` |
| `--dry-run` | Print the full plan and every file's content/diff; write nothing |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.work-publish:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes two hook points: `before_publish` (before the
MkDocs site is scaffolded/built) and `after_publish` (after the site is deployed and
verified). Run listed targets in order per the shared resolver
`plugins/agent-orch/rules/extension-resolver.md`. team-work skills also read
`.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when present.
Tell the user when you run an extension target; a failing target is surfaced but does not
abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
