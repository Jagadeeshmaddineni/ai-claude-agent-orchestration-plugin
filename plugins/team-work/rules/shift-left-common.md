# Shift-Left Common Rules (shared snippet)

The shared behaviors for the three shift-left SDLC skills — `work-analyze`,
`work-signoff`, and `work-handoff`. Each references this file so the behaviors
cannot drift apart. Read the sections your skill's phases point at.

These three skills convert an ambiguous input into an artifact someone can act
on, at three successive gates:

| Skill | Gate it closes |
|---|---|
| `work-analyze` | "Is what they asked for what we should build?" |
| `work-signoff` | "What exactly are we committing to?" |
| `work-handoff` | "Can a developer start without me?" |

---

## 1. Wiki resolution (hard prerequisite)

All three skills are **wiki-required**. The wiki is the context layer: it holds
cross-source memory, the open-questions register, and the provenance that makes
every generated claim traceable. Without it these skills would be generic
document generators.

Resolve the wiki root in this order:

1. `--wiki <path>` argument
2. `wiki_root` in `.team-work/wiki-config.md`
3. Ask the user

**If no wiki exists at all, stop.** Do not offer a degraded run:

```
This skill needs a team-work wiki — it's the context layer that supplies prior
decisions, the open-questions register, and the source citations that make the
output traceable.

  /team-work:work-wiki          # stand one up (once per product)
  /team-work:work-analyze --wiki <path>   # or point me at an existing wiki
```

Also resolve `ingest_mode` from `.team-work/wiki-config.md` (see §5).

---

## 2. Codebase resolution (sibling-repo walk)

`work-analyze` needs the real code to ground its verdicts; `work-handoff` needs
repo topology to tell a developer where their work lands. A wiki is commonly a
**child of a parent directory whose other children are the code repos** — so try
that before asking.

1. **Walk up** from the wiki root looking for a parent directory that contains
   the wiki *and* one or more sibling git repositories (a directory with a
   `.git` entry). Stop at the first parent that qualifies, or at `$HOME` /
   filesystem root.
2. **Present what you found and confirm.** Never proceed on a silent guess:

   ```
   The wiki looks like a child of /path/to/parent, whose sibling repos are:

     api-service      (Python)
     web-client       (TypeScript)
     infra            (Terraform)

   (a) Correct — use these as the codebase
   (b) Only some of these — I'll pick
   (c) The code is somewhere else — I'll give you paths
   ```

3. **If the walk finds nothing**, ask directly for one or more paths. Accept
   multiple; a feature commonly spans repos.
4. **Detect each repo's stack** (language, framework, test tooling) from its
   manifest files, so downstream output can name it accurately.

**Reading the code:** dispatch **read-only explorer subagents** for the scan
rather than reading everything into the main session — a large repo will
otherwise flood context. Instruct them explicitly to write nothing, and require
`file:line` evidence in their findings so every claim in the output is checkable.

---

## 3. Idempotent ingest delegation

Skills that take a source document (`work-analyze`, `work-signoff`) **always**
delegate archival to `/team-work:work-ingest`. Never write to `sources/`
directly — single-sourcing the archival step is what keeps the audit trail
trustworthy.

Ingest is idempotent: given a source already archived with identical content, it
reports "already ingested" and returns cleanly without prompting (see
`work-ingest` Phase 3, step 1a). **So call it unconditionally.** Do not check
`sources/` yourself, and do not ask the user whether they already ingested —
either answer leads to the same correct behavior.

Ingest also performs work that must happen regardless of whether this is the
first pass: attendee extraction, speaker attribution, decision pages,
open-questions register updates, and contradiction flagging.

---

## 4. Audience routing

The single biggest determinant of whether these documents land is that **they
never leak the wrong register at the wrong reader.** Engineering reasoning aimed
at a business stakeholder reads as obstruction; business hand-waving aimed at an
engineer reads as vagueness.

1. **Establish the audiences up front.** Ask who will read the document and who
   owns decisions. Expect several distinct groups — e.g. business/product
   stakeholders, an external or partner technical team, internal engineering.
   Capture named owners where possible; "the business" is not an owner.
2. **Route every open question and decision to an owning audience.** A question
   nobody owns will not get answered. Group questions *by owner*, not by topic.
3. **Write each section in its audience's register:**
   - **Business/stakeholder sections** — consequences, cost, risk, and scope in
     plain language. Technical reasoning gets *translated*, not omitted: say
     what breaks and what it costs, not which class is involved.
   - **Technical-partner sections** — precise and specific: formats, protocols,
     failure modes, exact confirmations needed.
   - **Internal engineering sections** — full detail, file paths, dependency
     reality.
4. **Never state or imply how the document was produced.** The reader is being
   given a well-reasoned document; the tooling behind it is not the subject.
5. **Do not manufacture warmth or hedge.** Terse and direct beats padded. Where
   a position is taken, state it and give the reason.

---

## 5. Output, catalog, and commit

Generated documents belong **in the wiki**, so they compound and become
queryable by `/work-ask` later.

1. **Write to the wiki's generated directory** appropriate to the artifact
   (`requirements/`, `decisions/`, `plans/` — per the wiki's own `CLAUDE.md`
   conventions, which always win over anything here).
2. **Follow the wiki's page conventions**: OKF-conformant frontmatter with a
   required `type`, plus `title`, `description`, `tags`, `status`, `updated`.
   Links are **standard relative markdown links** with the `.md` extension and
   correct `../` hops — never `[[wikilinks]]` — so they resolve on GitHub and in
   Obsidian alike.
3. **Cite every claim** back to its source with a citation block, including
   speaker and timestamp where available.
4. **Update the catalog and log**: add the new page to `README.md` under its
   category, add a matching entry to the directory's OKF `index.md`, and append
   an entry to `log.md`.
5. **Re-index qmd** if configured (`qmd: yes`).
6. **Commit per `ingest_mode`** — `local` (commit on the current branch, no
   push) or `pr` (branch, push, open a PR). Honor it silently; do not re-ask.

---

## 6. Boundaries

None of the three skills:

- writes production code,
- creates tracker issues (`/team-work:work-plan` owns that),
- opens PRs beyond what `ingest_mode` dictates, or
- edits anything under `sources/` (immutable).

---

## 7. Domain neutrality

These skills ship to any team in any domain. Keep the vocabulary generic:
"requirements document" (not a company-specific acronym), "downstream partner"
or "external system" (not a named vendor), "release" (not a local version
label). Never bake an example client, product, or system name into generated
document structure. Concrete names belong only in the *output* for a specific
project, drawn from that project's sources.
