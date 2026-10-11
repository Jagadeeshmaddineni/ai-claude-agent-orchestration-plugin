# Scout Plugin

**Scout is a repo-agnostic factory for support/investigation tooling — not a support tool
itself.** It turns tribal support knowledge into declarative **playbooks** — each an
**investigation** (diagnose a symptom to a confidence-gated verdict) or a **procedure** (an ordered
operational runbook) — that anyone (support, admin, BA — no code) can author, then projects each
playbook onto whichever delivery surface a repo supports: a Claude Code skill, an MCP tool, or a
repo's existing AI chat. Both classes route by natural language through a per-repo playbook INDEX.
Security, redaction, and a safe-command contract are enforced by the framework across every
surface, and governance is **detected and inherited** from the target repo rather than invented.

Two teams install the same plugin and get completely different, razor-specific toolkits —
because the specificity comes from what each team authors and what their repo exposes.

> **v0.3.** The playbook schema (the core contract, now with `metadata.kind`, the `diagnostic-query`
> step kind, step `emits`/`binds` data flow, `sweep`, `required_params`/`widenable_params`, and
> `redaction.builtins`), the playbook INDEX, the rails engine, and all seven skills are in place.
> See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the pieces fit together.

## Skills

| Skill | Description |
|-------|-------------|
| `/scout:setup` | Probe a repo (AI chat, MCP, internal APIs, runbooks, data stores, auth/governance), emit a Capability Manifest, and scaffold the playbook store + INDEX. |
| `/scout:author` | Guided, one-question-at-a-time wizard that produces a schema-valid playbook (investigation or procedure) and appends its INDEX entry — authorable by non-developers, no code. |
| `/scout:harvest` | Auto-draft playbooks from a repo's existing runbooks, README troubleshooting sections, incident write-ups, and Makefile targets; append INDEX entries. |
| `/scout:investigate` | Route an incoming ticket / run-id / symptom (via the INDEX, `kind: investigation`) to the matching playbook, gather evidence through the repo's capabilities and the rails, conclude at a confidence-gated verdict, and emit a cited findings document. |
| `/scout:runbook` | Route a natural-language operation (via the INDEX, `kind: procedure`) to the matching procedure playbook, then execute its steps IN ORDER through the rails — every mutating step is needs-approval minimum with a preview + confirmation by an approval tier, followed by a verify step and rollback guidance on failure; `--dry-run` emits a mutation plan and executes nothing. Emits a cited run document. |
| `/scout:explain` | Answer "how does X work here?" from accumulated knowledge, read-only — delegates retrieval to a team-work wiki when present, else falls back to the repo's docs + the Scout playbook store; always cited. |
| `/scout:lint` | Health-check the playbook store and reconcile the INDEX (read-only): flag stale (`last_verified`), never-promoted `draft`, drifted (references a capability/skill/role not in the current manifest → inert), broken playbooks, and INDEX drift; produces a prioritized punch list. |

## Key Principles

1. **Knowledge separate from delivery.** A playbook is ONE artifact; the projector compiles
   it into surfaces. You never author per-surface.
2. **Developers author; anyone consumes.** Setup and authoring happen in the repo (developers/
   support, declarative — no code). The resulting investigations are consumable by any
   audience — including business users in the app's AI chat who have no repo access.
3. **Complementary, not a replacement.** Scout wraps what a team already built — existing
   investigation skills (`investigate-sentry`, tool-specific ones) via `skill-call` steps,
   runbooks, the app's chat/MCP, and `/agent-orch:make` to fix a bug on the spot.
4. **Safe by construction.** Every executable step carries a `read-only | needs-approval |
   forbidden` classification; free-form queries against prod stores are forbidden (`query` and
   `diagnostic-query` resolve only to allowlisted procs); a procedure's mutating steps are
   needs-approval minimum with preview + confirm; secrets are used to connect but never read or
   echoed; outputs are redacted before any surface returns them (with built-in credential patterns
   on by default).
5. **Inherit governance, don't invent it.** `/scout:setup` maps Scout's audience tiers onto
   the repo's existing roles and contribution rules.
6. **Repo-agnostic core.** No app-specific logic lives in Scout; app specifics live in a
   repo's playbooks and Capability Manifest.
7. **Complements existing knowledge tooling.** When a `team-work` LLM wiki is present, Scout
   ingests findings into it and answers `/scout:explain` through it; when absent, Scout works
   standalone.

## The playbook schema

Everything flows through one contract:

- Spec: [`schema/playbook.schema.md`](./schema/playbook.schema.md)
- Validation: [`schema/playbook.schema.json`](./schema/playbook.schema.json) (JSON Schema, draft 2020-12)
- Example: [`playbooks/examples/file-fetch-miss.playbook.yaml`](./playbooks/examples/file-fetch-miss.playbook.yaml)

## Getting Started

```
/scout:setup        # probe this repo and stand up the module (start here)
```

Then: `/scout:harvest` to auto-draft playbooks from existing docs, or `/scout:author` to write one
by hand; `/scout:investigate <ticket|run-id|symptom>` to run an investigation; and
`/scout:runbook <natural language>` to run an operational procedure.

## Architecture & contributing

Start with [`architecture/README.md`](./architecture/README.md) — the leveled, C4-inspired
architecture set with rich diagrams (system context, components, the playbook model, investigation
flow, the security/rails model, integrations, the lifecycle/flywheel, and design decisions).
[`ARCHITECTURE.md`](./ARCHITECTURE.md) is the concise single-page overview and points into that
set. Together they cover the playbook schema, capability indirection, the safety model, the
knowledge-wiki integration, and how to add a playbook without touching plugin code.
