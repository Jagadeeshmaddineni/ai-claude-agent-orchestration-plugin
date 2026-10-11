---
name: explain
description: "Answer 'how does X work in this app?' from accumulated knowledge, READ-ONLY — no investigation, no mutations, no secrets. When a team-work LLM wiki is present, DELEGATE retrieval to Skill('team-work:work-ask', '<question> --wiki <wiki_root>') and return its cited answer verbatim; Scout never reimplements search/RAG. When no wiki is present, fall back to reading the repo's own docs/README/runbooks and the Scout playbook store (playbooks are encoded investigation knowledge) and synthesize a plain answer, clearly labeled as non-wiki-sourced. Also answers 'what playbooks/runbooks exist here / what can Scout help with' by reading the playbook INDEX (the natural catalog). Every answer cites its sources (wiki pages, or the docs/playbooks/INDEX read). Repo-agnostic; degrades gracefully when no wiki. Usage: /scout:explain \"<question>\""
---

# Scout Explain — how-does-X-work, from accumulated knowledge (read-only)

> STATUS: **v0.4.** This is a **knowledge** skill, not an investigation skill. It answers
> "how does X work in this app?" from knowledge that already exists — the team-work wiki when
> present, or the repo's own docs + the Scout playbook store when not. It **runs nothing, reads
> no data stores, touches no capabilities, and modifies nothing.** It does not reimplement a
> search engine — when a wiki exists it delegates retrieval to `/team-work:work-ask`. See
> [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) ("Knowledge-wiki integration").

## What this is (read this first)

`/scout:explain "<question>"` answers a *how-does-this-work* question from **accumulated
knowledge**. It is the read-only complement to `/scout:investigate`: investigate gathers fresh,
railed evidence about a live incident; **explain never gathers evidence** — it synthesizes an
answer from knowledge that already exists and **cites where the answer came from**.

The wiki loop closes the flywheel: `/scout:investigate` emits cited findings → (when a wiki
exists) those findings are ingested as `incident` knowledge → `/scout:explain` can then answer
future "why does X break / how does X work?" questions from that compounded knowledge. Scout
**complements** the team-work wiki when present and **works standalone** when absent.

**Who runs this:** any consuming audience — a developer or support engineer in Claude Code, or a
business user through a chat/MCP surface that calls the same skill. Because it is read-only and
its output is cited/redacted, it is safe for every tier.

## Hard invariants (this skill MUST obey all of them)

- **INV-1 Repo-agnostic core.** No app-, account-, or vendor-specific logic, names, or examples
  live here. Everything specific comes from the target repo's wiki / docs / playbooks.
- **INV-4 Complement, don't replace.** When a team-work wiki exists, **delegate** retrieval to
  it (`/team-work:work-ask`) — never reimplement search, ranking, or RAG. When no wiki exists,
  fall back to plainly reading the repo's own knowledge. Never rebuild what a repo already has.
- **INV-5 Secrets never seen, only used.** This skill reads documentation and playbook YAML; it
  never reads `.env` files or secret stores, never resolves or echoes any `${env.*}` value, and
  never surfaces a credential. It has no reason to touch a secret and must not.
- **INV-6 Redaction before any output.** Explain is read-only and reads only already-safe
  knowledge sources (wiki pages are already redacted; docs/README are public repo content;
  playbook summaries/steps are declarative, secret-free). If a source ever contains something
  that looks like a secret/credential, do NOT echo it — cite the source by path instead.
- **INV-9 Reuse, don't reimplement.** Delegate to `/team-work:work-ask` for wiki retrieval and,
  where relevant, point the user at `/scout:investigate` for a *live* answer or `/scout:lint`
  for playbook health. Explain synthesizes from knowledge; it does not run investigations.

**What this skill is NOT:** it is not `/scout:investigate` (no capability/query/shell/skill
steps, no rails-gated evidence gathering, no findings artifact). If a question actually requires
*live* evidence ("why did run X fail just now?"), explain says so and points the caller at
`/scout:investigate <ticket|run-id>` — it does not fake a live answer from stale knowledge.

---

## Phase Map

At the start of every phase, print a banner:

```
═══════════════════════════════════════════════════════
/scout:explain phase <label>: <phase name>
<one-line description>
═══════════════════════════════════════════════════════
```

| Label | Phase name                                                                     |
|-------|--------------------------------------------------------------------------------|
| 0     | Intake — locate repo, parse the question, detect the knowledge surface/catalog |
| 1     | Answer — **wiki** (1a, delegate) · **fallback** (1b, docs+playbooks) · **catalog** (1c, the INDEX) |
| 2     | Cite + deliver — return the answer with sources; offer next steps              |

---

## Phase 0: Intake — locate repo, parse the question, detect the surface

**Print phase banner.**

1. **Locate the target repo** — the current working repo root (dir with `.git`, or the top-most
   ancestor with a project marker). All detection and reads are relative to it.
2. **Parse the question.** Take the quoted `"<question>"` argument as-is. If none was given, ask
   the caller for the one thing they want explained (ONE question). Keep the question verbatim —
   it is passed straight through to `/team-work:work-ask` on the wiki path.
   - **Catalog question shortcut.** If the question is a **catalog** question — "what playbooks /
     runbooks exist here?", "what can Scout help with?", "what does Scout know how to
     investigate?", "list the procedures", "what's in the playbook store?" — the best answer is the
     playbook **INDEX**, not a subsystem explanation. Take the **catalog path (Phase 1c)** for
     these, regardless of whether a wiki is present (the INDEX is the authoritative, cheap-to-scan
     catalog of what Scout can route to on THIS repo). A wiki, if present, may add narrative context
     but the INDEX is the source of truth for the catalog itself.
3. **Detect the knowledge surface (the one decision this skill turns on):**
   - **Wiki detection** — check for `.team-work/wiki-config.md` at the repo root. If present,
     read `wiki_root:` (and `qmd:` if set) from it. This is the SAME detection `/scout:setup`
     records (`surfaces.wiki` + `wiki_root` in the Capability Manifest); if a manifest exists at
     `.claude/scout/capability-manifest.md` you MAY read `surfaces.wiki`/`wiki_root` from it
     instead of re-detecting — but the file at the repo root is authoritative.
   - **Catalog question** (per the shortcut above) → take the **catalog path (Phase 1c)** — read
     the playbook INDEX — regardless of wiki presence.
   - **Wiki present** (`.team-work/wiki-config.md` exists and yields a `wiki_root`) → take the
     **wiki path** (Phase 1a). This is the preferred path for a how-does-X-work question.
   - **Wiki absent** (no `.team-work/wiki-config.md`, or no readable `wiki_root`) → take the
     **fallback path** (Phase 1b). Never fail because there is no wiki — falling back is the
     normal standalone behavior.
4. State which surface was detected in one line (e.g. "team-work wiki found at `<wiki_root>` —
   delegating retrieval" or "no team-work wiki — answering from repo docs + Scout playbooks"),
   so the caller knows where the answer will come from.

## Phase 1a: Answer — WIKI PATH (delegate to team-work, do NOT reimplement retrieval)

**Print phase banner.**

A wiki was detected. **Delegate retrieval to the team-work wiki** — Scout never reimplements
search/ranking/RAG (INV-4/INV-9). Invoke, via the Skill tool:

```
Skill("team-work:work-ask", "<question> --wiki <wiki_root>")
```

- Pass the caller's **verbatim** question, then `--wiki <wiki_root>` (the value read in Phase 0).
- `/team-work:work-ask` runs qmd hybrid search (BM25/vector + LLM re-rank) with a README.md
  fallback, reads the relevant pages, and returns a **cited** answer with source provenance
  (page + originating call/doc). Scout does none of that itself.
- **Return that cited answer** to the caller as the answer. Preserve its citations/links
  (standard relative markdown links that resolve on GitHub/Obsidian). Do not strip provenance,
  and do not "improve" it by adding un-cited claims of your own.
- If `/team-work:work-ask` is somehow unavailable at call time (the skill errors or is not
  installed even though a wiki config exists), say so plainly and **fall back** to Phase 1b
  rather than failing — degrade gracefully.

Then go to Phase 2 to deliver + offer next steps. (On the wiki path, Phase 2's job is mostly to
frame the returned answer and offer next steps — the citations already come from the wiki.)

## Phase 1b: Answer — FALLBACK PATH (no wiki: read repo docs + the Scout playbook store)

**Print phase banner.**

No wiki. Synthesize an answer by **reading knowledge that already exists in the repo** — never
by running an investigation, and never by building a search index. Read (read-only) the sources
most likely to explain the subsystem the question is about, then synthesize a plain answer.

**Sources to read (in rough priority order):**

1. **Repo documentation** — `README*`, `docs/**/*.md`, `docs/runbooks/**`, `**/RUNBOOK*`,
   `**/TROUBLESHOOT*`, architecture/design docs (`ARCHITECTURE*`, `docs/architecture/**`,
   `docs/c4/**`), `CONTRIBUTING*`. Grep these for the question's key nouns/verbs and read the
   matching sections. These are the primary fallback source.
2. **The Scout playbook store — start at the INDEX.** Read `.claude/scout/playbooks/INDEX.md`
   FIRST (the routing catalog: each entry is `id`/`title`/`kind`/`keywords`/`when_to_use`/`path`).
   Use it to find which playbook(s) are relevant to the question — match the question against entry
   `keywords`/`when_to_use`/`title` — then open ONLY the matched playbook file(s) rather than
   parsing the whole store. **Playbooks ARE encoded knowledge:** a matched playbook's
   `metadata.summary`, its `steps[]` titles/`note` steps, and its `conclusions[]` explain *how a
   subsystem is investigated and what can go wrong with it* — often the best plain-language
   explanation of "how X works here and how it fails." Read matching playbooks' `summary` + step
   titles + conclusions (declarative, secret-free) and fold them in, citing each by id/path.
   - If there is no INDEX (e.g. `/scout:setup`/`/scout:author` never wrote one), fall back to
     globbing `*.playbook.yaml` directly — the INDEX is an optimization, not a hard dependency.
   - If the store is missing/empty, that is fine — rely on docs. Note that authoring playbooks
     (`/scout:author`, `/scout:harvest`) would enrich future answers (the flywheel).
3. **Prior findings (if present)** — `.claude/scout/findings/*.md` are cited, redacted records
   of past investigations. When one is relevant to the question, it is a strong source for "why
   X broke before / how X behaves." (These are the same docs that, WITH a wiki, would have been
   ingested — reading them directly is the standalone equivalent.)

**Synthesis rules:**

- Answer in plain language, at the altitude of the question. Prefer *how it works* and *how it
  is investigated / what goes wrong*, drawn from the sources — not speculation.
- **Only assert what a source supports.** If the repo's knowledge does not answer the question,
  say so honestly ("the repo docs and playbooks don't cover this") and suggest where an answer
  might come from (author a playbook, run `/scout:investigate` for a live answer, or add a
  wiki + ingest findings). Do NOT fabricate an answer.
- **Clearly label the answer as non-wiki-sourced** — e.g. a one-line header: *"Answered from
  this repo's docs + Scout playbooks (no team-work wiki present)."* This distinguishes a
  synthesized-from-repo answer from a wiki-cited one.
- Read-only + secret-safe throughout (INV-5/6): never open `.env`, never echo anything that
  looks like a credential; if a doc contains one, cite the doc by path instead of quoting it.

Then go to Phase 2.

## Phase 1c: Answer — CATALOG PATH (what playbooks/runbooks exist / what can Scout help with)

**Print phase banner.**

The question is a **catalog** question. The playbook **INDEX** is the natural, authoritative answer
— it is the per-repo registry runners use to route, so it is exactly "the list of what Scout can
help with here." Answer from it directly (read-only):

1. **Read the INDEX** — `.claude/scout/playbooks/INDEX.md`. Each entry carries `id`, `title`,
   `kind` (`investigation` | `procedure`), `keywords`, `when_to_use`, and `path`. This is minimal
   routing metadata by design (it never duplicates the playbook), so it is cheap to summarize and
   safe to show (no steps/inputs/secrets live in it).
2. **Summarize the catalog** — list what exists, grouped by `kind` so the caller sees the two
   classes and which runner reaches each:
   - **Investigations** (`kind: investigation`, run by `/scout:investigate`) — for each: `title` +
     the `when_to_use` one-liner.
   - **Procedures / runbooks** (`kind: procedure`, run by `/scout:runbook`) — same shape.
   Keep it a catalog, not a deep-dive: title + when-to-use per entry. If the caller then asks "how
   does <one of these> work", answer THAT as an ordinary how-does-X question (Phase 1a/1b), opening
   the matched playbook via its INDEX `path`.
3. **Degrade gracefully:**
   - **No INDEX / empty `playbooks: []`** — say the catalog is empty (no playbooks authored yet)
     and point the caller at `/scout:author` (write one), `/scout:harvest` (auto-draft from existing
     docs), and `/scout:setup` (if never run). Do NOT fabricate a catalog.
   - **No INDEX file but playbooks exist on disk** (e.g. a store predating the INDEX) — fall back to
     listing `*.playbook.yaml` by their `metadata.title`/`kind`, and suggest re-running
     `/scout:setup` (or re-authoring) to rebuild the INDEX so routing works.
   - **Wiki present** — you MAY additionally note narrative context from the wiki, but the INDEX
     remains the source of truth for the catalog itself.

Then go to Phase 2 (cite the INDEX as the source; offer next steps — run one via
`/scout:investigate`/`/scout:runbook`, or author more).

## Phase 2: Cite + deliver — sources, then next steps

**Print phase banner.**

1. **Deliver the answer with its sources.** Every answer cites where it came from:
   - **Wiki path:** return the `/team-work:work-ask` answer with its citations intact (wiki page
     + originating source). Add a one-line note that the answer came from the team-work wiki.
   - **Fallback path:** list every source you read as a **Sources** block — repo doc paths
     (`README.md`, `docs/...`), the INDEX (`.claude/scout/playbooks/INDEX.md`) if used to locate
     playbooks, playbook ids/paths (`.claude/scout/playbooks/<id>.playbook.yaml`), and any findings
     docs — using relative paths. Attribute each claim to a source; keep the non-wiki-sourced label.
   - **Catalog path:** cite the INDEX (`.claude/scout/playbooks/INDEX.md`) as the source; the
     catalog IS the answer. Note if you fell back to listing `*.playbook.yaml` because no INDEX
     existed.
2. **Never present un-cited claims as fact.** If part of the answer is inference rather than
   something a source states, mark it as such.
3. **Offer next steps (as fits the question):**
   - **Live answer needed?** If the question is really about a *current* incident/run ("why did
     X fail right now?"), point the caller at `/scout:investigate <ticket|run-id|free-text>` —
     explain answers from knowledge, investigate gathers live railed evidence.
   - **Knowledge gap?** If the repo/wiki couldn't answer well: on the wiki path, `/team-work:work-ask`
     may itself offer to file the exploration back as a wiki page (let it); on the fallback path,
     suggest authoring a playbook (`/scout:author`), harvesting existing docs (`/scout:harvest`),
     or — if the team wants compounding knowledge — standing up a team-work wiki so future
     findings ingest and become answerable.
   - **Stale knowledge?** If an answer leaned on a playbook that looked old/uncertain, suggest
     `/scout:lint` to check playbook health (staleness/drift/draft).

## Verification before completion

Do not claim an answer is complete until: the correct path was taken for the detected surface
(wiki present → delegated to `/team-work:work-ask`; absent → repo docs + playbooks fallback);
every claim is attributed to a cited source; the fallback answer is labeled non-wiki-sourced; no
`${env.*}` value or credential appears anywhere in the output; and nothing was executed,
mutated, or investigated. See the
[verification-before-completion policy](../../../agent-orch/policies/verification-before-completion.md).

## What this skill does NOT do

- It does not investigate — no capability/query/shell/skill-call steps, no rails-gated evidence,
  no findings artifact. That is `/scout:investigate`.
- It does not reimplement search/ranking/RAG — it delegates to `/team-work:work-ask` when a wiki
  exists (INV-4/INV-9).
- It does not modify anything — no writes, no mutations. It is strictly read-only.
- It does not read secrets or echo `${env.*}` values, ever.
- It does not fabricate an answer when the knowledge isn't there — it says so and points at how
  to get one.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running, check that
file for a `skills.scout-explain:` entry. If the file is absent, has no entry for this skill, or
the entry is empty, **run exactly as documented above — no behaviour change.**

If an entry exists, this skill exposes `before` and `after` hook points:
- `before` — targets run before intake/surface-detection begins (e.g. inject a house convention
  for which docs/knowledge sources to prefer, or a default wiki path).
- `after` — targets run after the answer is delivered (e.g. offer to file a good answer back to
  the wiki, or log the Q&A).

Run any listed targets in order per the shared resolver
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline). Tell the user
when you run an extension target; a failing target is surfaced but does not abort the skill. Full
contract: `plugins/agent-orch/rules/extensibility.md`.
