---
name: create-release
description: Interactive release management — propose tag from branch context, generate technical and customer release notes as markdown + PDF, create git tag and GitHub release, optional Jira ticket with PDF attachments, create PR. Branch-aware versioning (main → new release branch, release branch → patch). Usage: /team-work:create-release
---

# Create Release: Interactive Tag, Notes, and GitHub Release

Interactive release skill that figures out what to tag based on your current branch and commit history, generates two sets of release notes (technical and customer-friendly), converts them to PDF, creates the git tag and GitHub release, optionally creates a Jira ticket with the PDFs attached, and opens a PR. Branch-aware: on main it creates a new `release/X.Y.0` branch, on a release branch it increments the patch version.

**This skill does NOT use worktrees.** It works directly on the current branch because release operations (tags, branches) need to happen in the real repo, not an isolated copy.

## Prerequisites

- Must be in a git repository
- `gh` CLI authenticated
- For PDF generation: a markdown-to-PDF tool available (the skill will detect `pandoc`, `wkhtmltopdf`, or fall back to browser-based Print → Save as PDF)
- For Jira integration (optional): `.claude/rules/jira.md` + MCP server running

## Process

### Phase 0: Detect Branch Context and Propose Tag

**Goal**: Figure out what branch we're on, find the last tag, and suggest the next version.

1. **Get current branch:**
   ```bash
   CURRENT_BRANCH=$(git branch --show-current)
   ```

2. **Find last tag on this branch:**
   ```bash
   # Tags reachable from current HEAD on this branch
   LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "none")
   ```

   If no tags found:
   ```bash
   # Check all tags in the repo
   ALL_TAGS=$(git tag --sort=-v:refname | head -5)
   ```

3. **Determine version strategy based on branch:**

   **Case A: On `main` (or default branch)**
   - Find the latest tag across all branches:
     ```bash
     git tag --sort=-v:refname | head -1
     ```
   - Also check for release branches:
     ```bash
     git branch -r --list 'origin/release/*' | sort -V | tail -1
     ```
   - Propose: increment minor version → new release branch
   - Example: last tag `0.5.3` on `release/0.5` → propose `0.6.0` with `release/0.6` branch
   - Example: last tag `2.17.0` → propose `2.18.0` with `release/2.18` branch

   **Case B: On a `release/X.Y` branch**
   - Find the latest tag matching this release line:
     ```bash
     git tag --sort=-v:refname --list "X.Y.*" | head -1
     ```
   - Propose: increment patch version
   - Example: on `release/0.6`, last tag `0.6.2` → propose `0.6.3`
   - Example: on `release/0.6`, no tags yet → propose `0.6.0`

   **Case C: On another branch (feature, hotfix, etc.)**
   - Find nearest tag:
     ```bash
     git describe --tags --abbrev=0 2>/dev/null
     ```
   - If found, propose based on that tag
   - If not found, ask the user

   **Case D: No tags found anywhere**
   ```
   No tags found in this repository. What should the first release be?

   (a) 0.1.0 (pre-release)
   (b) 1.0.0 (first stable)
   (c) Let me type a version
   ```

4. **Present proposal to user:**

   ```
   Release Context:
     Branch: main
     Last tag: 0.5.3 (on release/0.5)
     Commits since last release branch: 12

   Proposed release:
     Tag: 0.6.0
     Branch: release/0.6 (will be created from current HEAD)

   (a) Use proposed tag and branch
   (b) Different version — I'll type it
   (c) Cancel
   ```

   Or on a release branch:
   ```
   Release Context:
     Branch: release/0.6
     Last tag: 0.6.2
     Commits since 0.6.2: 5

   Proposed release:
     Tag: 0.6.3
     No new branch needed (already on release/0.6)

   (a) Use proposed tag: 0.6.3
   (b) Different version
   (c) Cancel
   ```

### Phase 1: Gather Commits

**Goal**: Collect all commits since the last tag for release notes.

1. **Get commit range:**
   ```bash
   # If there's a previous tag
   git log ${LAST_TAG}..HEAD --oneline --no-merges
   
   # If no previous tag (first release)
   git log --oneline --no-merges
   ```

2. **Get detailed commit info:**
   ```bash
   git log ${LAST_TAG}..HEAD --format="%H|%an|%s|%b" --no-merges
   ```

3. **Categorize commits** by conventional commit prefix:
   - `feat:` → New Features
   - `fix:` → Bug Fixes
   - `docs:` → Documentation
   - `refactor:` → Refactoring
   - `perf:` → Performance
   - `test:` → Testing
   - `chore:` → Maintenance
   - `ci:` → CI/CD
   - No prefix → Other Changes

4. **Extract Jira references** from commit messages:
   - Pattern: `[A-Z]+-\d+` (e.g., AITOOLS-38)
   - Build a map of Jira keys mentioned in this release

### Phase 2: Generate Release Notes

**Goal**: Create two release notes documents — technical and customer-friendly.

#### Document 1: Technical Release Notes

For SMEs, Engineers, and DevOps. Commit-by-commit detail.

Create `release-notes/<tag>/technical-release-notes.md`:

```markdown
# Technical Release Notes — <tag>

**Release**: <tag>
**Date**: <YYYY-MM-DD>
**Branch**: <branch>
**Commits**: <count> since <last-tag>
**Contributors**: <unique author list>

## Summary

<2-3 sentence technical summary of what changed>

## Changes by Category

### New Features
- **<commit hash short>** <summary> (<author>)
  <body if present>
  [If Jira ref]: Jira: <KEY>

### Bug Fixes
- **<hash>** <summary> (<author>)

### Refactoring
...

### Documentation
...

### CI/CD & Infrastructure
...

### Other
...

## Files Changed

<count> files changed, <insertions> insertions, <deletions> deletions

### Key Files
<list of most-changed files with line counts>

## Jira Issues in This Release

| Key | Summary | Status |
|-----|---------|--------|
| <KEY> | <summary from Jira if available> | <status> |

## Deployment Notes

<Any migration, config, or infrastructure changes detected from commits>

## Full Commit Log

| Hash | Author | Message |
|------|--------|---------|
| <short hash> | <author> | <message> |

---
Generated by `/team-work:create-release` on <date>
```

#### Document 2: Customer-Friendly Release Notes

Prose narrative suitable for stakeholders, product managers, and end users.

Create `release-notes/<tag>/customer-release-notes.md`:

```markdown
# What's New in <tag>

**Release Date**: <YYYY-MM-DD>

## Highlights

<3-5 bullet points summarizing the most impactful changes in plain language.
No commit hashes, no file paths, no technical jargon. Focus on outcomes.>

## New Capabilities

<For each feat: commit, write a 1-2 sentence description of what users
can now do that they couldn't before. Group related features together.>

## Improvements

<For each fix/refactor/perf commit, describe what got better in user terms.
"Faster load times for..." not "Optimized SQL query in...">

## What's Coming Next

<If planning markdown exists, pull upcoming items from the plan.
Otherwise, leave this section as "See our roadmap for upcoming features.">

---
<Product name> <tag> — Released <date>
```

### Phase 3: Convert to PDF

**Goal**: Generate PDFs from the markdown release notes.

1. **Detect PDF tool:**
   ```bash
   which pandoc 2>/dev/null && echo "pandoc"
   which wkhtmltopdf 2>/dev/null && echo "wkhtmltopdf"
   ```

2. **Generate PDFs:**

   **If pandoc available:**
   ```bash
   pandoc release-notes/<tag>/technical-release-notes.md \
     -o release-notes/<tag>/technical-release-notes.pdf \
     --pdf-engine=wkhtmltopdf \
     -V geometry:margin=1in
   
   pandoc release-notes/<tag>/customer-release-notes.md \
     -o release-notes/<tag>/customer-release-notes.pdf \
     --pdf-engine=wkhtmltopdf \
     -V geometry:margin=1in
   ```

   **If wkhtmltopdf only:**
   - Convert markdown to HTML first (simple inline conversion)
   - Then wkhtmltopdf to PDF

   **If neither available:**
   ```
   No PDF generation tool found (pandoc or wkhtmltopdf).

   (a) Skip PDFs — I'll generate them manually
   (b) Open the markdown in browser for Print → Save as PDF
   (c) Install pandoc now (brew install pandoc)
   ```

   If (b): open the markdown files in browser:
   ```bash
   open release-notes/<tag>/technical-release-notes.md
   open release-notes/<tag>/customer-release-notes.md
   ```
   Wait for user to save PDFs, then ask for the paths.

   If (c): Install and retry.

### Phase 4: Commit Release Notes

**Goal**: Commit the markdown and PDFs to the repo.

```bash
git add release-notes/<tag>/
git commit -m "release: add release notes for <tag>

- Technical release notes (SME/Engineer/DevOps)
- Customer-friendly release notes
- PDF versions of both documents
- <count> commits since <last-tag>"
```

### Phase 5: Create Release Branch (if on main)

**Goal**: If on main, create a release branch before tagging.

**If on main:**

1. **Create release branch:**
   ```bash
   git checkout -b release/<major>.<minor>
   git push -u origin release/<major>.<minor>
   ```

2. **Switch back to main for continued development:**
   The tag lives on the release branch. Main continues to receive new work.

**If already on a release branch:** Skip this step.

### Phase 6: Tag and GitHub Release

**Goal**: Create the git tag and GitHub release.

1. **Create annotated tag:**
   ```bash
   git tag -a <tag> -m "Release <tag>

   <2-3 line summary from customer release notes>"
   ```

2. **Push tag:**
   ```bash
   git push origin <tag>
   ```

3. **Create GitHub release:**
   ```bash
   gh release create <tag> \
     --title "Release <tag>" \
     --notes-file release-notes/<tag>/technical-release-notes.md \
     release-notes/<tag>/technical-release-notes.pdf \
     release-notes/<tag>/customer-release-notes.pdf
   ```

   This creates the release with the technical notes as the body and attaches both PDFs as release assets.

4. **Report:**
   ```
   Tag created: <tag>
   GitHub release: <release URL>
   Assets: technical-release-notes.pdf, customer-release-notes.pdf
   ```

### Phase 7: Optional Jira Integration

**Goal**: Create a Jira ticket for the release with PDFs attached.

1. **Check if Jira is configured:**
   - Read `.claude/rules/jira.md`
   - If not found: skip Jira entirely, proceed to Phase 8

2. **Check release config for Jira preference:**
   Read `.release-config.md` (if exists) for stored preferences:
   ```markdown
   # Release Configuration
   
   ## Jira Release Tickets
   jira_release_tickets: yes
   jira_release_assignee: joe.stein@sscinc.com
   ```

   **If no config exists or first time:**
   ```
   Jira is configured for this repo. Want to create a Jira ticket for this release?

   (a) Yes — create a release ticket and attach the PDFs
   (b) No — skip Jira for this release
   (c) Never — don't ask again (saves preference)
   ```

   If (c): Create `.release-config.md` with `jira_release_tickets: no`.

3. **If creating Jira ticket:**

   Ask for assignee (or use saved preference):
   ```
   Who should be assigned to the release ticket?

   (a) Joe Stein (last used)
   (b) Someone else — I'll type the name
   (c) Unassigned
   
   Remember this choice for next time? (yes/no)
   ```

   If "remember": save to `.release-config.md`.

   Create the ticket:
   ```
   mcp__jira__jira_createIssue with:
     projectKey: "<KEY>"
     summary: "Release <tag>"
     issueType: "<Task ID>"
     description: "Release <tag> created on <date>.
     
     Commits: <count> since <last-tag>
     Branch: <branch>
     GitHub Release: <release URL>
     
     See attached PDFs for full release notes."
   ```

   Attach PDFs:
   ```
   mcp__jira__jira_uploadAttachment with:
     issueKey: "<NEW-KEY>"
     filePath: "release-notes/<tag>/technical-release-notes.pdf"
   
   mcp__jira__jira_uploadAttachment with:
     issueKey: "<NEW-KEY>"
     filePath: "release-notes/<tag>/customer-release-notes.pdf"
   ```

   Assign:
   ```
   mcp__jira__jira_assignIssue with:
     issueKey: "<NEW-KEY>"
     assignee: "<saved or chosen assignee>"
   ```

   Report:
   ```
   Jira ticket created: <KEY> — Release <tag>
   PDFs attached. Assigned to <name>.
   ```

### Phase 8: Create PR

**Goal**: Create a PR with the customer-friendly release notes as the description.

1. **Read customer release notes for PR body:**
   ```bash
   cat release-notes/<tag>/customer-release-notes.md
   ```

2. **Push current branch** (if not already pushed):
   ```bash
   git push
   ```

3. **Create PR:**

   **If on a new release branch (created from main):**
   ```bash
   gh pr create \
     --base main \
     --title "Release <tag>" \
     --body "<customer release notes content>"
   ```

   **If on an existing release branch (patch release):**
   ```bash
   gh pr create \
     --base release/<major>.<minor> \
     --title "Release <tag>" \
     --body "<customer release notes content>"
   ```

   Note: For patch releases on a release branch, the PR base is the release branch itself (for record-keeping). The tag is already created. The PR documents the release.

4. **Report:**
   ```
   PR created: <PR URL>
   Title: Release <tag>
   Description: Customer-friendly release notes
   ```

### Phase 9: Final Summary

```
RELEASE COMPLETE — <tag>

  Branch: <branch>
  Tag: <tag> (pushed)
  GitHub Release: <release URL>
  PR: <PR URL>

  Release Notes:
    release-notes/<tag>/technical-release-notes.md
    release-notes/<tag>/technical-release-notes.pdf
    release-notes/<tag>/customer-release-notes.md
    release-notes/<tag>/customer-release-notes.pdf

  [If Jira]: Jira: <KEY> — Release <tag> (PDFs attached)

  Commits in this release: <count>
  Contributors: <list>

  [If on main]: Release branch created: release/<major>.<minor>
  Main branch continues to receive new work.
  Next release on this line: run /create-release on release/<major>.<minor>
```

---

## Branch Strategy Reference

```
main (development)
  │
  ├── 0.5.0 ──── release/0.5
  │                ├── 0.5.1 (patch)
  │                ├── 0.5.2 (patch)
  │                └── 0.5.3 (patch)
  │
  ├── 0.6.0 ──── release/0.6
  │                ├── 0.6.1 (patch)
  │                └── 0.6.2 (patch)
  │
  └── (next) ─── /create-release on main → proposes 0.7.0
                  creates release/0.7 branch
```

**On main**: `/create-release` looks at the highest tag across all branches, bumps minor, creates a new `release/X.Y` branch, tags `X.Y.0` on that branch.

**On release/X.Y**: `/create-release` finds the highest `X.Y.*` tag, bumps patch, tags `X.Y.Z+1` on the same branch.

**Ambiguous cases**: If the skill can't determine the version (e.g., no tags, unusual branch name), it asks:
```
I'm not sure what version to propose. Here's what I found:

  Branch: feature/some-branch
  Tags reachable: 0.5.3, 0.5.2
  All tags: 0.6.2, 0.6.1, 0.6.0, 0.5.3, ...

What should the tag be?
```

---

## Configuration: `.release-config.md`

Created on first run if user makes preferences. Commit to repo for team-wide defaults.

```markdown
# Release Configuration

## Jira Release Tickets
<!-- yes = create ticket + attach PDFs | no = skip | ask = prompt each time -->
jira_release_tickets: yes

## Default Assignee for Release Tickets
jira_release_assignee: joe.stein@sscinc.com

## PDF Generation
<!-- pandoc | wkhtmltopdf | browser | skip -->
pdf_tool: pandoc
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No tags found | Ask user for first version |
| Can't determine version | Present findings, ask user |
| pandoc/wkhtmltopdf not installed | Offer browser fallback or skip PDFs |
| Tag already exists | Warn, ask to increment or override |
| Push tag fails | Report, show manual push command |
| GitHub release creation fails | Tag exists, show `gh release create` command |
| Jira MCP not running | Skip Jira, warn user |
| Jira attachment upload fails | Report, release continues without attachments |
| PR creation fails | Branch pushed, show `gh pr create` command |
| No commits since last tag | "Nothing to release since <tag>." Exit |
| Merge conflicts on release branch | Ask user to resolve, then retry |

---

## Integration with team-work Skills

| Skill | How /create-release Relates |
|-------|-----------------------------|
| `/work-prep` | Ideas and open questions may reference milestones that align with releases |
| `/work-plan` | Jira issues created by /work-plan appear in release notes when committed |
| `/groom` | Grooming sets dates that may target a release milestone |
| `/work-pop` | Items completed via /work-pop appear as commits in release notes |
| `/work-report` | /work-report can reference releases for progress tracking |

## Extensibility

This skill is extensible via `.claude/ssnc-team-work/skills.yaml`. Before running, check
that file for a `skills.create-release:` entry. If the file is absent, has no entry for this
skill, or the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes two hook points: `before_tag` (before the git tag
is created) and `after_release` (after the GitHub release is published). Run listed targets
in order per the shared resolver `plugins/agent-orch/rules/extension-resolver.md`. team-work
skills also read `.claude/ssnc-agent-orch/jira-workflow.yaml` and `git-workflow.yaml` when
present. Tell the user when you run an extension target; a failing target is surfaced but
does not abort the skill. Full contract: `plugins/agent-orch/rules/extensibility.md`.
