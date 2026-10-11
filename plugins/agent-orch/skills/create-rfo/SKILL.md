---
name: create-rfo
description: Generate a Request for Outage (RFO) document from a postmortem call transcript. Numbers RFOs sequentially in `incidents/request-for-outages/rfo-NNN.md`, extracts attendees, drafts Problem/Solution/Root Cause/Follow-up sections, generates a matching PDF, commits both on a `rfo/NNN` branch, pushes, and opens a PR. Compatible with `/agent-orch:make-validate`. Optional `--wiki <path>` also files the postmortem synthesis into a team-work wiki (`wiki/incidents/`) and archives the transcript under `sources/incidents/` with citations. Usage: /agent-orch:create-rfo <path-to-transcript-or-paste> [--wiki <path>]
---

# Create RFO: Postmortem Transcript → Request for Outage

Takes a postmortem call transcript and produces a standard, distributable Request for Outage (RFO) document. The RFO captures Problem, Solution, Root Cause, and Follow-up actions. Generates Markdown and PDF, commits both on a `rfo/NNN` branch, pushes, and opens a PR so the document can be reviewed and `/agent-orch:make-validate` can be used.

**This skill does NOT use worktrees.** It works directly on the current branch (then creates a feature branch in-place) because the RFO is a one-shot write to the real repo.

## Prerequisites

- Must be in a git repository
- `gh` CLI authenticated (`gh auth status`)
- A remote named `origin` must exist
- The user provides a transcript: either a file path passed as the skill argument, or pasted text in the conversation
- For PDF generation: `pandoc` or `wkhtmltopdf` installed (browser fallback is offered if neither is present)
- Should be run from a clean working tree on the default branch (the skill creates `rfo/NNN` from current HEAD)
- **Optional**: `--wiki <path>` to also file the RFO synthesis into a team-work wiki. If passed (or auto-detected from `.team-work/wiki-config.md`), the skill archives the transcript under `<wiki>/sources/incidents/` and writes an incident page under `<wiki>/incidents/` that cites it. Additive only — default behavior is unchanged when the flag is absent.

## Phase Map (what the user sees)

`/create-rfo` has 7 user-visible phases. At the START of every phase, print a banner:

```
═══════════════════════════════════════════════════════
/create-rfo phase <N>/7: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| N | Phase name                      | What happens                                                  |
|---|---------------------------------|---------------------------------------------------------------|
| 1 | Validate environment            | Check git, gh auth, transcript availability, default branch   |
| 2 | Determine RFO number + branch   | Scan `incidents/request-for-outages/`, pick next NNN          |
| 3 | Parse transcript                | Extract attendees, identify named individuals, gather context |
| 4 | Draft RFO markdown              | Write Problem, Solution, Root Cause, Follow-up sections       |
| 5 | Generate PDF                    | pandoc → wkhtmltopdf → browser fallback                       |
| 6 | Commit and push                 | Create `rfo/NNN`, commit md + pdf, push                       |
| 6.5 | File into wiki (optional)     | If `--wiki`/config: archive transcript + write cited incident page |
| 7 | Open PR + summary               | `gh pr create`, present URL                                   |

## Process

### Phase 1: Validate Environment

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/create-rfo phase 1/7: Validate environment
Checking git, gh auth, and locating the postmortem transcript.
═══════════════════════════════════════════════════════
```

1. **Verify git repo:**
   ```bash
   git rev-parse --is-inside-work-tree
   ```
   If not in a git repo, stop with: `Not in a git repository. Run /agent-orch:create-rfo from inside the repo.`

2. **Verify gh authentication:**
   ```bash
   gh auth status
   ```
   If not authenticated: `GitHub CLI is not authenticated. Run 'gh auth login' first.`

3. **Locate the transcript:**

   The skill argument may be:
   - A file path (e.g., `/tmp/postmortem-2026-05-22.txt`) — read with the Read tool.
   - Inline pasted text — use directly.
   - Empty — ask the user:
     ```
     I need the postmortem call transcript. How do you want to provide it?

     (a) Path to a file
     (b) Paste it inline now
     (c) Cancel
     ```

   Store the transcript content as `TRANSCRIPT_TEXT`.

4. **Check working tree:**
   ```bash
   git status --porcelain
   ```
   If there are uncommitted changes:
   ```
   You have uncommitted changes. The RFO branch will include them.

   (a) Stash and continue
   (b) Continue anyway (changes go on the rfo/NNN branch)
   (c) Cancel — I'll handle them first
   ```

5. **Detect default branch (for PR base later):**
   ```bash
   DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main")
   ```

### Phase 2: Determine RFO Number and Branch

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/create-rfo phase 2/7: Determine RFO number + branch
Picking the next available rfo-NNN.md and the rfo/NNN branch name.
═══════════════════════════════════════════════════════
```

1. **Ensure target directory exists:**
   ```bash
   mkdir -p incidents/request-for-outages
   ```

2. **Find next available NNN:**
   ```bash
   ls incidents/request-for-outages/rfo-*.md 2>/dev/null \
     | sed -n 's|.*/rfo-\([0-9][0-9][0-9]\)\.md$|\1|p' \
     | sort -n | tail -1
   ```
   - If output is empty: `NNN=001`
   - Otherwise: increment by 1, zero-pad to 3 digits (e.g., `005` → `006`).

3. **Set filenames and branch:**
   ```
   RFO_MD=incidents/request-for-outages/rfo-${NNN}.md
   RFO_PDF=incidents/request-for-outages/rfo-${NNN}.pdf
   BRANCH=rfo/${NNN}
   ```

4. **Confirm with user:**
   ```
   Next RFO: rfo-NNN.md (e.g., rfo-007.md)
   Branch: rfo/NNN

   (a) Use these values
   (b) Override the number (I'll type a different NNN)
   (c) Cancel
   ```

5. **Create the branch (in place, no worktree):**
   ```bash
   git checkout -b ${BRANCH}
   ```
   If branch already exists:
   ```
   Branch ${BRANCH} already exists.

   (a) Switch to it (I'll add this RFO to the existing branch)
   (b) Pick a different NNN
   (c) Cancel
   ```

### Phase 3: Parse Transcript

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/create-rfo phase 3/7: Parse transcript
Extracting attendees, identifying named individuals, gathering incident facts.
═══════════════════════════════════════════════════════
```

Read `TRANSCRIPT_TEXT` and extract:

1. **Attendees**:
   - Look for explicit attendee blocks: lines starting with "Attendees:", "Participants:", "Present:", "On the call:", or similar.
   - Look for speaker labels: lines matching `^[A-Z][a-z]+( [A-Z][a-z]+)?:` (e.g., `Joe Stein:`, `Maria Chen:`).
   - Look for `@mention`-style references.
   - De-duplicate by name (case-insensitive).
   - Tag each attendee with role if mentioned (e.g., "Joe Stein (SRE on-call)").

2. **Named individuals referenced in body**:
   - Even if not in the attendee list, capture people referenced for action items, decisions, or root cause attribution.

3. **Incident facts**:
   - Date/time of incident (look for ISO timestamps, "happened at", "started at").
   - Affected systems/services (named services, environments, regions).
   - Detection time, mitigation time, resolution time, total duration if stated.
   - Customer/user impact (numbers, scope, severity if mentioned).

4. **Decisions and action items**:
   - Look for "Action:", "TODO:", "Owner:", "Follow-up:", or sentences like "X will Y by Z".
   - Capture owner and target date where present.

If the transcript is too short or vague to extract these, ask the user to fill the gaps before drafting:
```
The transcript is light on details for [section]. What should I write for:
- Affected systems:
- Detection time:
- Total impact duration:
```

### Phase 4: Draft RFO Markdown

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/create-rfo phase 4/7: Draft RFO markdown
Writing the standard Problem / Solution / Root Cause / Follow-up document.
═══════════════════════════════════════════════════════
```

Create `${RFO_MD}` using this template:

```markdown
# Request for Outage — RFO-NNN

**Status**: Draft
**Date Authored**: YYYY-MM-DD
**Incident Date**: YYYY-MM-DD HH:MM TZ (or "unknown — see transcript")
**Severity**: <SEV-N if known, else "to be determined">
**Authors**: <current git user.name>

## Attendees

The following people participated in the postmortem call:

| Name | Role / Team |
|------|-------------|
| <Name 1> | <Role/Team or "—"> |
| <Name 2> | <Role/Team or "—"> |
| ... | ... |

## Affected Systems

- <Service / region / environment>
- <Service / region / environment>

## Customer / User Impact

<Plain-language description of who was affected, for how long, and how badly.
If known: number of customers affected, requests failed, revenue impact, etc.>

## Timeline

| Time (TZ) | Event |
|-----------|-------|
| <HH:MM> | <event — detection, escalation, mitigation, resolution> |

## Problem

<2-4 paragraphs describing what went wrong from the user's perspective. Lead
with the symptom, then the scope. No internal jargon — this section is what
gets shared externally if the RFO is distributed.>

## Root Cause

<2-4 paragraphs explaining the underlying technical cause. This is the
"why it failed" section. If multiple contributing factors, list them all
and identify the primary cause. Reference systems, code paths, configs.
Identify named individuals only when their decision/action is load-bearing
to the explanation — not for blame.>

## Solution

<What was done to mitigate (short term) and what will be done to prevent
recurrence (long term). Distinguish "what we did to stop the bleeding" from
"what we'll do so this can't happen again". Include relevant PR links,
tickets, or commits if mentioned in the transcript.>

### Mitigation (already applied)

- <action — owner — when>
- <action — owner — when>

### Long-term prevention

- <action — owner — target date>
- <action — owner — target date>

## Follow-up To-Do

| # | Action | Owner | Target Date | Status |
|---|--------|-------|-------------|--------|
| 1 | <action> | <owner> | <YYYY-MM-DD or "TBD"> | open |
| 2 | <action> | <owner> | <YYYY-MM-DD or "TBD"> | open |
| ... | ... | ... | ... | ... |

## Distribution

This RFO is intended for distribution to:

- Engineering leadership
- The teams owning the affected systems
- Customer support / account management (where customer impact occurred)

---

Generated by `/agent-orch:create-rfo` on YYYY-MM-DD from a postmortem call transcript.
RFO ID: RFO-NNN
```

Fill every section from the parsed transcript. Where information is missing and the user did not fill the gap in Phase 3, mark the field `TBD` rather than fabricating.

After writing, present the draft to the user:
```
Drafted ${RFO_MD}.

Open it in your editor to review, or:
(a) Continue to PDF generation
(b) Let me revise a specific section first
(c) Cancel
```

### Phase 5: Generate PDF

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/create-rfo phase 5/7: Generate PDF
Converting markdown to PDF using pandoc, wkhtmltopdf, or browser fallback.
═══════════════════════════════════════════════════════
```

1. **Detect PDF tool:**
   ```bash
   which pandoc 2>/dev/null
   which wkhtmltopdf 2>/dev/null
   ```

2. **Generate PDF:**

   **If pandoc available:**
   ```bash
   pandoc "${RFO_MD}" \
     -o "${RFO_PDF}" \
     --pdf-engine=wkhtmltopdf \
     -V geometry:margin=1in \
     --metadata title="Request for Outage — RFO-${NNN}"
   ```

   If `--pdf-engine=wkhtmltopdf` fails, fall back to pandoc's default engine:
   ```bash
   pandoc "${RFO_MD}" -o "${RFO_PDF}" -V geometry:margin=1in
   ```

   **If only wkhtmltopdf:** convert markdown to a simple HTML file then `wkhtmltopdf input.html ${RFO_PDF}`.

   **If neither available:**
   ```
   No PDF generation tool found.

   (a) Skip PDF — I'll generate it manually later (commits markdown only)
   (b) Open the markdown in browser for Print → Save as PDF, then I'll commit it
   (c) Install pandoc now (e.g., 'brew install pandoc' on macOS)
   ```

   - **(a)**: Set `${RFO_PDF}` to empty; commit markdown only. Skip PDF in commit message.
   - **(b)**: `open ${RFO_MD}` in browser. Wait for the user to save the PDF and confirm path. Move it to `${RFO_PDF}`.
   - **(c)**: Install, then retry detection.

3. **Verify PDF was created** (if not skipped):
   ```bash
   test -s "${RFO_PDF}"
   ```
   If empty or missing, report and fall back to option (b).

### Phase 6: Commit and Push

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/create-rfo phase 6/7: Commit and push
Committing the markdown and PDF on rfo/NNN, pushing to origin.
═══════════════════════════════════════════════════════
```

1. **Stage:**
   ```bash
   git add "${RFO_MD}"
   if [ -s "${RFO_PDF}" ]; then git add "${RFO_PDF}"; fi
   ```

2. **Commit:**
   ```bash
   git commit -m "rfo(${NNN}): <short summary of incident>

   - Postmortem call summary captured as RFO-${NNN}
   - Attendees: <count> people
   - Sections: Problem, Solution, Root Cause, Follow-up
   <if PDF>: - Includes PDF for distribution

   Generated by /agent-orch:create-rfo"
   ```

   Pull the short summary from the Problem section's first sentence (truncate to ~60 chars).

3. **Push branch:**
   ```bash
   git push -u origin ${BRANCH}
   ```
   If push fails, report the error and show the manual command for retry.

### Phase 6.5: File into Wiki (optional, additive)

**Only runs if `--wiki <path>` was passed, or `.team-work/wiki-config.md`
exists with a `wiki_root`. If neither, skip this phase entirely — default
behavior is unchanged.**

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/create-rfo phase 6.5/7: File into wiki (optional)
Archiving the transcript under sources/incidents/ and writing a cited incident page.
═══════════════════════════════════════════════════════
```

1. **Resolve the wiki root:** `--wiki <path>` argument → `wiki_root` in
   `.team-work/wiki-config.md`. If neither resolves, skip this phase.

2. **Confirm with the user** (so RFO behavior is never surprising):
   ```
   Also file this RFO into the wiki at <WIKI_ROOT>?
   (a) Yes — archive the transcript + write a cited incident page
   (b) No — RFO only (skip wiki)
   ```
   If no, skip the rest of this phase.

3. **Archive the transcript** verbatim under the wiki's immutable sources tree:
   ```
   <WIKI_ROOT>/sources/incidents/<YYYY-MM-DD>-<slug>.md
   ```
   This mirrors `/work-ingest`'s audit-trail convention. (If the wiki dir does
   not exist, create the `sources/incidents/` and `incidents/` directories.)

4. **Write the incident synthesis page** under `<WIKI_ROOT>/incidents/<slug>.md`
   using the wiki's page conventions (frontmatter `type: incident`, citation
   blocks). Synthesize root cause, impact, timeline, and follow-ups from the
   RFO, and cite the archived transcript so provenance is preserved:
   ```markdown
   ## Root cause: <one-line>

   > Source: [[sources/incidents/<YYYY-MM-DD>-<slug>]] — postmortem call, <date>
   > Status: confirmed

   <synthesis...>
   ```
   Cross-link affected systems to their `[[entities/...]]` pages if they exist.

5. **Update `<WIKI_ROOT>/index.md`** (add the incident page + source) and append
   a `lint`/`ingest`-style entry to `<WIKI_ROOT>/log.md`:
   ```markdown
   ## [<YYYY-MM-DD>] ingest — RFO-NNN postmortem (via /create-rfo --wiki)
   Source: sources/incidents/<YYYY-MM-DD>-<slug>.md
   Touched: incidents/<slug> (new)
   ```

6. **Re-index qmd** if available (`qmd index "<WIKI_ROOT>" --db "<WIKI_ROOT>/.qmd"`).

7. **Stage the wiki files** so they ride along on the same `rfo/NNN` commit:
   ```bash
   git add "<WIKI_ROOT>"   # only if the wiki is inside this repo
   git commit --amend --no-edit   # OR a follow-up commit; prefer a new commit
   ```
   Prefer a **separate follow-up commit** on the same branch over amending:
   ```bash
   git add "<WIKI_ROOT>"
   git commit -m "wiki: file RFO-${NNN} postmortem synthesis + transcript"
   git push
   ```
   If the wiki lives outside this repo, write the files there and tell the user
   to commit in that repo (do not try to stage cross-repo).

### Phase 7: Open PR + Summary

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/create-rfo phase 7/7: Open PR + summary
Creating the PR so reviewers can comment, then handing off to /make-validate.
═══════════════════════════════════════════════════════
```

1. **Create PR:**
   ```bash
   gh pr create \
     --base ${DEFAULT_BRANCH} \
     --title "RFO-${NNN}: <short summary>" \
     --body "$(cat <<EOF
## Summary

Postmortem call captured as RFO-${NNN}.

- **Markdown**: ${RFO_MD}
- **PDF**: ${RFO_PDF} (if generated)
- **Attendees**: <count>
- **Affected systems**: <list>

## Distribution

This RFO is intended for: <list from Distribution section>.

## Review checklist

- [ ] Problem statement is accurate and customer-facing
- [ ] Root cause identifies the primary contributing factor
- [ ] Follow-up to-dos have owners and target dates
- [ ] Attendee list is complete

---

Generated by \`/agent-orch:create-rfo\`. Use \`/agent-orch:make-validate\` to address review comments.
EOF
)"
   ```

2. **Capture PR URL:**
   ```bash
   PR_URL=$(gh pr view --json url --jq '.url')
   ```

3. **Final report:**
   ```
   RFO created and pushed.

     RFO-NNN: <short summary>
     Markdown: ${RFO_MD}
     PDF:      ${RFO_PDF}  (or "skipped" if no PDF tool)
     Branch:   ${BRANCH}
     PR:       ${PR_URL}

   Next steps:
     /agent-orch:make-validate   # to fix CI failures or address review comments
     /agent-orch:make-clean      # to merge when reviewers approve
   ```

## Error Handling

| Scenario | Action |
|----------|--------|
| Not in a git repo | Stop with instruction to run from inside the repo |
| `gh` not authenticated | Stop, ask user to run `gh auth login` |
| No transcript provided | Ask user to paste or supply file path |
| `incidents/request-for-outages/` doesn't exist | Create it (`mkdir -p`) |
| Branch `rfo/NNN` already exists | Offer to switch, pick different NNN, or cancel |
| Transcript too thin to fill template | Ask user to fill gaps; mark anything still unknown as TBD |
| pandoc and wkhtmltopdf both missing | Offer browser fallback or skip PDF |
| Pandoc fails with wkhtmltopdf engine | Retry with default engine; if still fails, fall back to browser |
| Push fails | Report error, leave commit local, show manual `git push` command |
| PR creation fails | Branch is pushed; show `gh pr create` command for manual recovery |
| `--wiki` given but no wiki at path | Offer to skip wiki filing, or run `/team-work:work-wiki` first |
| `--wiki` not given and no wiki config | Skip Phase 6.5 entirely (default behavior, unchanged) |
| Wiki lives outside this repo | Write files there; instruct user to commit in that repo (no cross-repo staging) |
| Uncommitted changes on default branch | Offer stash, continue-anyway, or cancel |

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.create-rfo:` entry. If the file is absent, has no
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
