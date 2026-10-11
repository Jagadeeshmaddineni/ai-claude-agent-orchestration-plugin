# Scout Playbook Index Schema (v0.3)

> The routing contract for a repo's Scout playbook store. The INDEX is a single per-repo file at
> `.claude/scout/playbooks/INDEX.md` that lists every playbook with just enough metadata to
> **route** a natural-language request to the right playbook — never a duplicate of the playbook
> itself. `/scout:author` and `/scout:harvest` APPEND an entry on every write; `/scout:investigate`
> and `/scout:runbook` read the INDEX FIRST to pick a candidate (filtered by `kind`), then open
> only the matched playbook(s); `/scout:lint` reconciles the INDEX against the store.
>
> This file is the normative spec. A machine-checkable JSON Schema lives alongside at
> `index.schema.json` (draft 2020-12) for CI validation.

## Why an INDEX

At scale, a runner should not have to open and parse every playbook to decide which one applies.
The INDEX is the **routing backbone**: a small, cheap-to-scan list that maps natural-language
triggers to a playbook id + path. It stays deliberately **minimal** — if it grows into a
second copy of the playbooks it will rot out of sync. Route, don't duplicate.

## Top-level structure

```yaml
apiVersion: scout/v0.3          # REQUIRED. const.
kind: PlaybookIndex             # REQUIRED. const. Distinguishes it from a Playbook.
generated_by: /scout:author     # OPTIONAL. Tool/skill that last wrote the index.
generated_at: "2026-07-19"      # OPTIONAL. Quoted timestamp of the last write (quote dates).
playbooks:                      # REQUIRED. One routing entry per playbook in the store.
  - { ... }
```

## Entry shape (minimal — route, don't duplicate)

Each entry in `playbooks` has exactly six fields:

| field | required | shape | purpose |
|-------|----------|-------|---------|
| `id` | yes | kebab-case string | MUST match the target playbook's `metadata.id`. The join key. |
| `title` | yes | one-line string | Human title (mirrors the playbook's `title`). |
| `kind` | yes | `investigation` \| `procedure` \| `toolbox` | Lets a runner filter: `/scout:investigate` → `investigation`, `/scout:runbook` → `procedure`. A `toolbox` entry (v0.4) is **never routed to by an incoming symptom** — runners compose it as a **sub-procedure** only. |
| `keywords` | yes | non-empty string array | The natural-language **routing triggers** a runner matches an incoming request against. |
| `when_to_use` | yes | one-line string | Disambiguation guidance when several playbooks' keywords overlap. |
| `path` | yes | string | Path to the playbook file, **relative to the playbook store** (`.claude/scout/playbooks/`). |

```yaml
playbooks:
  - id: file-fetch-miss
    title: "File-fetch step reports no data for a run"
    kind: investigation
    keywords: ["no files", "missing data", "not on the mount", "fetch failed"]
    when_to_use: "A run's file-fetch step reports missing input data."
    path: examples/file-fetch-miss.playbook.yaml

  - id: promote-build
    title: "Promote a build to the next environment"
    kind: procedure
    keywords: ["promote", "ship to uat", "deploy to next env"]
    when_to_use: "Operator wants to promote a validated build forward."
    path: procedures/promote-build.playbook.yaml
```

## What the INDEX is NOT

- Not a place for `steps`, `inputs`, `conclusions`, `redaction`, or any executable detail — those
  live only in the playbook. The INDEX carries no safety-relevant data; it cannot widen access.
- Not authoritative over the playbook: on any conflict the playbook file wins. `id` is the join
  key; `/scout:lint` flags entries whose `id`/`path` no longer resolve, and playbooks with no
  INDEX entry.

## Validation

- Machine validation: `index.schema.json` (JSON Schema, draft 2020-12) — used by CI and by
  `/scout:lint` when reconciling the INDEX against the store.
- The prose `INDEX.md` a repo actually ships may render these entries as a Markdown table or list
  for human readability; the structured data it carries MUST validate against this schema.

## Versioning

`apiVersion: scout/v0.3` tracks the playbook schema version. The INDEX contract is introduced in
v0.3 alongside natural-language routing for both runners.
