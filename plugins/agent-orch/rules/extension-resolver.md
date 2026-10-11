# Extension Resolver (shared snippet)

This is the DRY snippet that every hook-enabled skill and agent references from its
`## Extensibility` section. It is the operational summary of the full contract in
[`extensibility.md`](extensibility.md). Read that file for the authoritative rules.

> **Default path (memorise this):** if the relevant config file does not exist, or has no
> entry for you (or an empty one), **do nothing different** — run exactly as today. Only
> the steps below change behaviour, and only when config explicitly opts in.

## For an agent named `X`

1. Look for `.claude/ssnc-agent-orch/agents.yaml` (or `.claude/ssnc-team-work/agents.yaml`
   for team-work agents). No file / no `agents.X` entry / empty entry → run normally, STOP.
2. Run each target in `agents.X.before` (in listed order) before your own work.
3. If `agents.X.replace` is non-empty → run that target **instead of** your normal role.
   Else → perform your normal role.
4. Run each target in `agents.X.after` (in listed order) after your work.

## For a skill named `S` at hook point `H`

1. Look for `.claude/ssnc-agent-orch/skills.yaml` (or `.claude/ssnc-team-work/skills.yaml`).
   No file / no `skills.S` entry → run normally, STOP.
2. At each hook point `H` you expose, read `skills.S.H` (a list). If absent/empty, just do
   your normal work for that phase.
3. Before/after the phase as documented, run each listed target in order.
4. Ignore (with a one-line warning) any hook point in config that you don't expose.

## Resolving a target
- `/...` skill ref → invoke as a skill (e.g. `/agent-orch:simplify`, `/loop ...`).
- `.loop-library/*.yaml` → run as a loop-library loop.
- `*.sh` / `*.py` / executable → run as a script step.
- `*.md` or glob → read-and-act on the matched markdown.
- anything else → warn once and skip. **Never abort the host skill for a bad target.**

## Failure policy
- Missing config, malformed YAML, unreadable file → treat as "no config": run as today.
- A failing `before`/`after` target → surface the error to the user, but still run your
  normal role unless the user aborts. A failing `replace` target → report and fall back to
  the normal role (do not leave the role unfilled).
- Always tell the user when you ran an extension target, so the behaviour is observable.
