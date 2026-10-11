---
name: release-me
description: Cut a release with documented release notes. Reads the latest tag, suggests a bumped version (default patch; offer minor/major), generates `release-notes/<tag>.md` from commits and planning docs since the last tag, generates a matching PDF, commits both on a `release/<tag>` branch, then creates the git tag and GitHub Release. Pushes and opens a PR. Compatible with `/agent-orch:make-validate`. Usage: /agent-orch:release-me
---

# Release Me: Tagged Release with Documented Notes

A simple, general-purpose release skill. Reads your last tag, asks for the next one (default: patch bump), generates Markdown + PDF release notes from all commits and planning docs since the last tag, commits them on a `release/<tag>` branch, then creates the git tag and a GitHub Release. Pushes and opens a PR. Designed to be used in any repo without the team-work plugin.

**This skill does NOT use worktrees.** Releases must happen in the real repo (the tag and GitHub Release reference the actual branch and HEAD).

**Difference from `/team-work:create-release`**: That skill is dual-document (technical + customer release notes), branch-strategy aware (main vs release/X.Y), and can attach PDFs to a Jira ticket. `/release-me` is the lighter, single-document alternative for repos that don't use the team-work plugin.

## Prerequisites

- Must be in a git repository
- `gh` CLI authenticated (`gh auth status`)
- A remote named `origin` must exist
- For PDF generation: `pandoc` or `wkhtmltopdf` installed (browser fallback offered)
- Should be run from a clean working tree

## Phase Map (what the user sees)

`/release-me` has 8 user-visible phases. At the START of every phase, print a banner:

```
═══════════════════════════════════════════════════════
/release-me phase <N>/8: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name                | What happens                                                       |
|---|---------------------------|--------------------------------------------------------------------|
| 1 | Validate environment      | Check git, gh auth, working tree clean                             |
| 2 | Determine tag             | Read last tag, suggest bumped version, confirm with user           |
| 3 | Create release branch     | `git checkout -b release/<tag>` from current HEAD                  |
| 4 | Gather commits + planning | `git log` since last tag, scan `planning/*.md` for related changes |
| 5 | Generate release notes md | Highlights, Features, Bug Fixes, Breaking Changes, Internal        |
| 6 | Generate PDF              | pandoc → wkhtmltopdf → browser fallback                            |
| 7 | Commit, tag, release      | Commit md+pdf, then create git tag and GitHub Release              |
| 8 | Push + open PR + summary  | Push branch (and tag, if user approves), `gh pr create`, summary   |

## Process

### Phase 1: Validate Environment

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/release-me phase 1/8: Validate environment
Checking git, gh auth, and a clean working tree.
═══════════════════════════════════════════════════════
```

1. **Git repo:**
   ```bash
   git rev-parse --is-inside-work-tree
   ```

2. **gh auth:**
   ```bash
   gh auth status
   ```

3. **Working tree:**
   ```bash
   git status --porcelain
   ```
   If dirty:
   ```
   Working tree has uncommitted changes. Releases should be cut from a clean tree.

   (a) Stash and continue
   (b) Continue anyway (changes go on the release/<tag> branch)
   (c) Cancel
   ```

4. **Default branch (for PR base later):**
   ```bash
   DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main")
   ```

### Phase 2: Determine Tag

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/release-me phase 2/8: Determine tag
Reading the last tag, suggesting a bumped version, confirming with the user.
═══════════════════════════════════════════════════════
```

1. **Find the last tag:**
   ```bash
   LAST_TAG=$(git tag --sort=-v:refname | head -1)
   ```

2. **Suggest the next version:**

   **If `LAST_TAG` is empty (first release):**
   ```
   No tags found in this repository. What should the first release be?

   (a) 0.1.0 (pre-release, recommended for new projects)
   (b) 1.0.0 (first stable)
   (c) Let me type a version
   ```

   **If `LAST_TAG` exists:**
   - Parse `LAST_TAG` as semver. Strip a leading `v` if present and remember the prefix flag.
   - If it parses as `major.minor.patch`:
     - **Patch bump** (default): `major.minor.(patch+1)`
     - **Minor bump**: `major.(minor+1).0`
     - **Major bump**: `(major+1).0.0`
   - If it does not parse cleanly, ask the user to type the next tag.

   Present the choices:
   ```
   Last tag: <LAST_TAG>
   Commits since <LAST_TAG>: <count>

   Suggested next tag:

   (a) <patch-bump>   (default)
   (b) <minor-bump>
   (c) <major-bump>
   (d) Let me type a different tag
   (e) Cancel
   ```

   Preserve the original prefix style (e.g., if the last tag was `v2.15.2`, keep the `v` prefix on suggestions).

3. **Validate the chosen tag:**
   ```bash
   if git rev-parse "${TAG}" >/dev/null 2>&1; then echo "exists"; fi
   ```
   If the tag already exists:
   ```
   Tag ${TAG} already exists.

   (a) Pick a different tag
   (b) Cancel
   ```

4. **Set filenames and branch:**
   ```
   NOTES_MD=release-notes/${TAG}.md
   NOTES_PDF=release-notes/${TAG}.pdf
   BRANCH=release/${TAG}
   ```

### Phase 3: Create Release Branch

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/release-me phase 3/8: Create release branch
Creating release/<tag> from current HEAD (in place, no worktree).
═══════════════════════════════════════════════════════
```

1. **Check whether the branch already exists:**
   ```bash
   git rev-parse --verify "${BRANCH}" 2>/dev/null
   ```
   If yes:
   ```
   Branch ${BRANCH} already exists.

   (a) Switch to it (continue the release on the existing branch)
   (b) Pick a different tag
   (c) Cancel
   ```

2. **Create and switch:**
   ```bash
   git checkout -b "${BRANCH}"
   ```

3. **Ensure the release-notes directory exists:**
   ```bash
   mkdir -p release-notes
   ```

### Phase 4: Gather Commits + Planning

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/release-me phase 4/8: Gather commits + planning
Collecting commits since the last tag and scanning planning/*.md for context.
═══════════════════════════════════════════════════════
```

1. **Commit range:**
   ```bash
   if [ -n "${LAST_TAG}" ]; then
     RANGE="${LAST_TAG}..HEAD"
   else
     RANGE=""
   fi
   ```

2. **Get commits with metadata:**
   ```bash
   git log ${RANGE} --no-merges --format="%h|%an|%ae|%ad|%s|%b%n----END----" --date=short
   ```

3. **Categorize by conventional-commit prefix:**

   | Prefix | Section |
   |--------|---------|
   | `feat:` | Features |
   | `fix:` | Bug Fixes |
   | `BREAKING CHANGE` (in body) or `feat!:`/`fix!:` | Breaking Changes |
   | `docs:`, `chore:`, `refactor:`, `test:`, `ci:`, `build:`, `style:`, `perf:` | Internal |
   | (no prefix) | Other |

4. **Extract Jira keys** from commit messages: pattern `[A-Z]+-\d+`. Build a map of keys mentioned in this release for inclusion in the notes.

5. **Scan planning docs (if present):**
   ```bash
   ls planning/*.md 2>/dev/null
   ```
   For each file, look for entries that reference Jira keys from the commit map, or that have changelog-style date entries newer than `LAST_TAG`'s date. Capture them for inclusion in the Highlights section.

6. **Compute summary stats:**
   ```bash
   git diff --shortstat ${LAST_TAG}..HEAD 2>/dev/null
   git log ${RANGE} --no-merges --format="%an" | sort -u
   ```
   Capture: total commits, files changed, insertions/deletions, unique contributors.

### Phase 5: Generate Release Notes Markdown

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/release-me phase 5/8: Generate release notes markdown
Drafting release-notes/<tag>.md from commits and planning context.
═══════════════════════════════════════════════════════
```

Create `${NOTES_MD}` using this template:

```markdown
# Release Notes — <TAG>

**Release Date**: YYYY-MM-DD
**Branch**: release/<TAG>
**Previous Release**: <LAST_TAG or "(initial release)">
**Commits in this release**: <count>
**Contributors**: <list of unique authors>

## Highlights

<3-5 bullet points summarizing the most impactful changes for this release.
Lead with user/customer outcomes, not commit messages. Pull from feat: and
fix: commits with the largest impact, plus any planning docs that called out
this release as a milestone.>

## Features

<For each `feat:` commit, write 1-2 sentences describing what's new.
Group related features. Reference Jira keys where present.>

- **<short hash>** <subject> (<author>) [<JIRA-KEY> if present]
  <body if present>

## Bug Fixes

<For each `fix:` commit. Plain language: what was broken, what now works.>

- **<short hash>** <subject> (<author>) [<JIRA-KEY> if present]

## Breaking Changes

<Any commit with `!:` in the type or `BREAKING CHANGE` in the body.
Required: describe the change AND the migration path. If empty, write "None.">

- **<short hash>** <subject>
  - **What changed**: <description>
  - **Migration**: <how to update>

## Internal

<docs:, refactor:, chore:, test:, ci:, perf:, style:, build: — one-line summaries.
This section is for engineering visibility, not customer comms.>

- <short hash> <subject> (<author>)

## Other Changes

<Commits with no conventional-commit prefix, if any.>

## Jira Issues in This Release

| Key | Status | Summary |
|-----|--------|---------|
| <KEY> | (status if known) | <commit subject that referenced it> |

## Statistics

- Files changed: <count>
- Insertions: +<count>
- Deletions: -<count>
- Contributors: <count>

## Full Commit Log

| Hash | Date | Author | Subject |
|------|------|--------|---------|
| <hash> | <YYYY-MM-DD> | <author> | <subject> |

---

Generated by `/agent-orch:release-me` on YYYY-MM-DD.
```

Fill from the gathered data. Where a section has no entries, write "None in this release." rather than omitting the section.

After writing, present a brief summary to the user:
```
Drafted ${NOTES_MD}.

Highlights:
  - <first highlight>
  - <second highlight>
  - <third highlight>

Total: <N> commits across Features (<x>), Bug Fixes (<y>), Breaking (<z>), Internal (<w>).

(a) Continue to PDF generation
(b) Let me edit the markdown first (open in editor)
(c) Cancel
```

### Phase 6: Generate PDF

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/release-me phase 6/8: Generate PDF
Converting release notes to PDF using pandoc, wkhtmltopdf, or browser fallback.
═══════════════════════════════════════════════════════
```

1. **Detect tool:**
   ```bash
   which pandoc 2>/dev/null
   which wkhtmltopdf 2>/dev/null
   ```

2. **Generate:**

   **pandoc available:**
   ```bash
   pandoc "${NOTES_MD}" \
     -o "${NOTES_PDF}" \
     --pdf-engine=wkhtmltopdf \
     -V geometry:margin=1in \
     --metadata title="Release Notes — ${TAG}"
   ```
   On failure, fall back to default engine: `pandoc "${NOTES_MD}" -o "${NOTES_PDF}" -V geometry:margin=1in`.

   **wkhtmltopdf only:** convert markdown to HTML first, then `wkhtmltopdf input.html ${NOTES_PDF}`.

   **Neither:**
   ```
   No PDF tool found.

   (a) Skip PDF — commit markdown only
   (b) Open the markdown in browser for Print → Save as PDF
   (c) Install pandoc now (e.g., 'brew install pandoc')
   ```

3. **Verify:**
   ```bash
   test -s "${NOTES_PDF}"
   ```

### Phase 7: Commit, Tag, GitHub Release

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/release-me phase 7/8: Commit, tag, and GitHub Release
Committing the notes FIRST, then creating the git tag, then the GitHub Release.
═══════════════════════════════════════════════════════
```

**CRITICAL ORDERING**: Commit the release notes BEFORE creating the tag. The tag should point at the commit that contains its own release notes.

1. **Stage and commit notes:**
   ```bash
   git add "${NOTES_MD}"
   if [ -s "${NOTES_PDF}" ]; then git add "${NOTES_PDF}"; fi
   git commit -m "release: notes for ${TAG}

   - Markdown: ${NOTES_MD}
   <if PDF>: - PDF: ${NOTES_PDF}
   - <count> commits since ${LAST_TAG}

   Generated by /agent-orch:release-me"
   ```

2. **Create the annotated tag:**
   ```bash
   git tag -a "${TAG}" -m "Release ${TAG}

   <pull the Highlights bullets from ${NOTES_MD}>"
   ```

3. **Push tag decision:**
   ```
   The tag ${TAG} has been created locally.

   (a) Push the tag now AND create the GitHub Release (recommended)
   (b) Wait — push the tag only after the PR merges
   (c) Skip the GitHub Release entirely (just keep the local tag)
   ```

4. **If (a):**
   ```bash
   git push origin "${TAG}"
   gh release create "${TAG}" \
     --title "Release ${TAG}" \
     --notes-file "${NOTES_MD}" \
     ${NOTES_PDF:+"${NOTES_PDF}"}
   ```
   - The `${NOTES_PDF:+...}` syntax attaches the PDF only if it was generated.
   - Capture the release URL: `RELEASE_URL=$(gh release view "${TAG}" --json url --jq '.url')`.

5. **If (b):**
   - Tag stays local. Note in the PR body that the tag will be pushed after merge.
   - Set `RELEASE_URL=""` and `TAG_PUSHED=false`.

6. **If (c):**
   - Tag stays local. No GitHub Release.
   - `RELEASE_URL=""`, `TAG_PUSHED=false`.

### Phase 8: Push + Open PR + Summary

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/release-me phase 8/8: Push + open PR + summary
Pushing the release branch, opening the PR, presenting the final report.
═══════════════════════════════════════════════════════
```

1. **Push branch:**
   ```bash
   git push -u origin "${BRANCH}"
   ```

2. **Build PR body:**

   Use the Highlights and Features sections from `${NOTES_MD}` as the PR body. Append a footer with tag/release info.

3. **Create PR:**
   ```bash
   gh pr create \
     --base ${DEFAULT_BRANCH} \
     --title "Release ${TAG}" \
     --body "$(cat <<EOF
## Release ${TAG}

<Highlights from ${NOTES_MD}>

## Documents

- Markdown: \`${NOTES_MD}\`
- PDF: \`${NOTES_PDF}\` (if generated)

## Tag

- Tag created: \`${TAG}\`
- Tag pushed: ${TAG_PUSHED}
- GitHub Release: ${RELEASE_URL:-"(deferred — will create after merge)"}

## Review checklist

- [ ] Highlights accurately summarize the most impactful changes
- [ ] Breaking Changes section lists every breaking change with migration steps
- [ ] Statistics match \`git diff --shortstat\`
- [ ] Tag points at the commit containing its own release notes

---

Generated by \`/agent-orch:release-me\`. Use \`/agent-orch:make-validate\` to address review comments.

**Note**: \`/agent-orch:make-clean\` preserves \`release/*\` branches by design — this branch will NOT be deleted on merge.
EOF
)"
   ```

4. **Capture PR URL:**
   ```bash
   PR_URL=$(gh pr view --json url --jq '.url')
   ```

5. **Final summary:**
   ```
   Release prepared.

     Tag:           ${TAG}
     Branch:        ${BRANCH}
     Markdown:      ${NOTES_MD}
     PDF:           ${NOTES_PDF}  (or "skipped")
     GitHub Release: ${RELEASE_URL or "deferred / skipped"}
     PR:            ${PR_URL}

     Commits in release: <count>
     Contributors:       <list>

   Next steps:
     /agent-orch:make-validate   # to fix CI failures or address review comments
     /agent-orch:make-clean      # to merge — note: release/* branch is preserved by design
   ```

## Error Handling

| Scenario | Action |
|----------|--------|
| Not in a git repo | Stop, instruct to run from inside the repo |
| `gh` not authenticated | Stop, ask to run `gh auth login` |
| Working tree dirty | Offer stash, continue, or cancel |
| No tags found | Ask user for first version (offer 0.1.0 or 1.0.0) |
| Last tag is not parseable as semver | Ask user to type the next tag |
| Chosen tag already exists | Ask user to pick a different tag |
| Branch `release/<tag>` already exists | Offer switch, pick different tag, or cancel |
| pandoc and wkhtmltopdf missing | Browser fallback or skip PDF |
| Pandoc fails with wkhtmltopdf engine | Retry with default engine |
| `git tag` fails | Report; do NOT push branch until tag is fixed |
| `git push origin <tag>` fails | Tag remains local; report and show manual command |
| `gh release create` fails | Tag is pushed; report and show `gh release create` command |
| Push branch fails | Commits are local; show manual `git push -u origin` command |
| PR creation fails | Branch and tag are pushed; show `gh pr create` command |
| No commits since `LAST_TAG` | Stop with: "Nothing to release since ${LAST_TAG}." |

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.release-me:` entry. If the file is absent, has no
entry for this skill, or the entry is empty, **run exactly as documented above — no
behaviour change.** This is the default and most common case.

If an entry exists, this skill exposes these hook points:
- `before` — targets run before the skill's main work
- `after` — targets run after the skill's main work

Run any listed targets in order, following the shared resolver in
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline).
Tell the user when you run an extension target. A failing target is surfaced but does
NOT abort the skill unless the user aborts. Full contract:
`plugins/agent-orch/rules/extensibility.md`.
