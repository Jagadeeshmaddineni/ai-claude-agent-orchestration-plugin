---
name: backfill
description: Stamp variant-B YAML frontmatter (type, session, date, jira wikilinks, status) onto existing agent-orch session markdown so the Obsidian graph and Dataview dashboards populate. Header-only diff — never rewrites bodies. Skips code fences/inline code/links, generic Jira project-key regex, idempotent, dry-run by default. Lands as one mechanical PR. Usage: /vault-orch:backfill [--keys RCONAI,AITOOLS] [--apply]
---

# vault-orch: backfill

Migrate existing agent-orch sessions into the vault graph by stamping a small
YAML frontmatter header onto each `ssnc-agent-orch/**` markdown file. This is the
**variant-B** migration: the Jira reference is stored as a wikilink array in the
*frontmatter*, so Obsidian Properties (v1.4+) treat it as a real graph edge +
backlink — with only a **header-sized diff**. Bodies are never touched.

```yaml
---
type: session-plan        # derived from filename
session: 2026-05-31-recon-pipeline-cob-carryforward-matching
date: 2026-05-31
jira: ["[[RCONAI-427]]", "[[RCONAI-635]]"]
status: in-progress       # only if confidently inferred; else omitted
skill: build              # only if discoverable from prompt.md; else omitted
---
```

## Why variant B (and not the alternatives)

- **Store relationships, not state.** The header records the immutable fact
  "this file references ticket X". No Jira status is copied in.
- **Header-only diff.** Rewriting 1,400+ bodies to linkify inline `RCONAI-427`
  text was rejected — huge diff, code-block risk, and zero extra graph value
  (edges dedupe per file-pair). Frontmatter wikilinks give the identical graph
  payoff with a trivial diff.
- **One mechanical PR.** The whole backfill is meant to land as a single,
  easily-reviewed, header-only change.

## Usage

```
/vault-orch:backfill                      # dry-run, generic key regex
/vault-orch:backfill --keys RCONAI        # anchor to one project key
/vault-orch:backfill --keys RCONAI,AITOOLS --apply
```

Dry-run is the **default** — nothing is written until you pass `--apply`.

## Process

### Phase 0: Preconditions

1. Confirm git repo + `ssnc-agent-orch/` exists (same gate as `init`). If no
   `ssnc-agent-orch/`, stop: there is nothing to backfill.
2. Recommend the vault be initialised first (`/vault-orch:init`) so the stamped
   frontmatter actually renders, but do not hard-require it.
3. **Determine project keys.** In order of preference:
   - explicit `--keys` argument;
   - keys cached in `.claude/rules/jira.md` (parse `## Project: KEY` headers);
   - otherwise fall back to the generic matcher `/[A-Z]{2,}-\d+/` and tell the
     user it will collect *any* uppercase Jira-style key.

### Phase 1: Dry-run (always first)

Run the stamper in dry-run mode and show the user the plan:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/backfill-frontmatter.mjs \
  --root "$REPO_ROOT" --keys "$KEYS"
```

This prints, per file, whether it would `stamp` (new frontmatter) or `refresh`
(merge into existing), and the resulting `jira` list — then a summary line. It
writes nothing. Present the counts and a representative sample to the user.

### Phase 2: Confirm, then apply

Because this can change many files, **confirm before applying** even though the
result is a clean mechanical diff:

```
This will stamp frontmatter on N files (header-only; bodies untouched).
Apply now? (yes / no)
```

On approval:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/backfill-frontmatter.mjs \
  --root "$REPO_ROOT" --keys "$KEYS" --apply
```

### Phase 3: Verify idempotency

Re-run the dry-run once after applying and confirm it reports **0 changes** —
proof the stamp is stable and a second PR would be empty:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/backfill-frontmatter.mjs --root "$REPO_ROOT" --keys "$KEYS"
# → "0 of N file(s) would change"
```

### Phase 4: One mechanical PR

This is a textbook `/agent-orch:make` candidate, but since you may already be in
a session, just stage the header-only diff and let the user open the PR:

```
Backfill complete: N files stamped (header-only diff).
Re-run reported 0 changes (idempotent ✓).
This is designed to land as one mechanical PR — review the diff, then commit
on a feature branch (e.g. feat/vault-backfill-frontmatter).
```

## What the stamper guarantees (`scripts/backfill-frontmatter.mjs`)

| Guarantee | Detail |
|-----------|--------|
| **Header-only** | Frontmatter is added/merged; the markdown body is byte-for-byte unchanged. |
| **Skips non-prose** | Ticket refs inside ``` fenced blocks, `inline code`, `[md](links)`, and bare URLs are ignored — only prose refs populate `jira`. |
| **Both layouts** | Flat `ssnc-agent-orch/YYYY-MM-DD-slug/` and date-tree `ssnc-agent-orch/YYYY/MM/DD/slug/`. |
| **Idempotent** | Existing frontmatter is merged (jira deduped, unknown keys preserved); a no-op re-run produces no diff. |
| **Type derivation** | `PLAN.md`→`session-plan`, `STATUS.md`→`session-status`, `prompt.md`→`session-prompt`, `conventions.md`→`session-conventions`, else `session-doc`. |
| **Generic keys** | `--keys` accepts any comma-separated project prefixes; omit for the universal matcher. |
| **Conservative status/skill** | `status` is never invented (only preserved if already present); `skill` is set only when discoverable from a sibling `prompt.md`. |

## Flags (passed through to the script)

| Flag | Meaning |
|------|---------|
| `--keys A,B` | Restrict ticket collection to these project prefixes |
| `--apply` | Write changes (omit for dry-run) |
| `--only <substr>` | Restrict to paths containing a substring (used by the Stop hook) |
| `--json` | Machine-readable summary (used by the Stop hook) |
| `--quiet` | Summary only |

## Relationship to the Stop hook

The Stop hook (`hooks/frontmatter-on-session.sh`, installed by `init`) runs the
*same* script scoped to the just-finished session, so after the one-time
backfill you rarely need to run this manually again — new sessions are stamped
automatically.
