# Loop Library (local catalog)

> Local, git-committed catalog of reusable agent **loops** — bounded, repeatable
> workflows with an explicit trigger, action, verification check, stopping
> condition, and approval boundary. Managed by `/agent-orch:loop-library`.
>
> Every loop here is trusted because it was committed through normal code
> review. The skill reads only this directory — it makes no network calls.

## Loops

<!-- One row per saved loop. /agent-orch:loop-library keeps this current on Save. -->

| Loop | Use when | File |
|------|----------|------|
| _(none yet — run `/agent-orch:loop-library` and Save your first loop)_ | | |

## How to use

- **Find**: `/agent-orch:loop-library` → describe your goal → it recommends a
  loop from this catalog or offers to design a new one.
- **Save**: design or adapt a loop, then save it here (writes `loops/<slug>.md`
  and adds a row above). Commit it like any other change so the team can reuse it.
- **Audit**: paste an existing loop and ask for a review (Loop Doctor).

Each loop lives in `loops/<slug>.md` with YAML frontmatter (`name`, `slug`,
`use_when`, `tags`, `trigger`, `verify`, `stop`, `approval`, `created`) plus a
one-sentence explanation and a copy-ready prompt. See `loops/example-loop.md`.
