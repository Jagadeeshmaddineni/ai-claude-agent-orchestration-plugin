# Dual-Harness Support (Claude Code + OpenCode) — Design

**Date:** 2026-08-02
**Status:** Approved (pending user spec review)
**Scope:** All 6 plugins (agent-orch, codebase-graph-analyzer, mainframe-analyzer, meta-orch, team-work, vault-orch)

---

## Problem

The claude-agent-orchestration-plugin repo is a Claude Code plugin marketplace with 6 plugins.
Users want the same skills, agents, commands, hooks, MCP servers, and rules to work in OpenCode
as well — without forking the content or hardcoding a specific model.

A proof-of-concept exists at `/Users/jstein/dev/ssnc/ai/skathi` that copied agent-orch's content
into `.opencode/` and got it working. It proved the concept but has two limitations:

1. **Hardcoded model** — `opencode.json` pins `ssnc-gateway/zai-org/GLM-5.2-FP8` and skill tables
   bake the same string into prose. Every user would have to edit the same files to use their own
   model.
2. **Copy, not source** — skills/agents/commands are duplicated under `.opencode/`. Edits to the
   canonical `plugins/<name>/` tree don't reach the OpenCode copy without a manual sync.

The goal: both harnesses consume a **single source of truth** under `plugins/<name>/`, with
user-configurable agent models, and one install line per harness.

## Reference

The [superpowers](https://github.com/obra/superpowers) plugin solves multi-harness support with
per-harness manifest directories (`.claude-plugin/`, `.codex-plugin/`, `.opencode/`) and a
bootstrap plugin at `.opencode/plugins/superpowers.js` that registers skill paths and injects
context into the first user message. This design adapts that pattern to a multi-plugin
marketplace with a shared source tree.

---

## Architecture (Approach A — Single-Source + Bootstrap Adapter)

### What stays canonical (unchanged location)

```
plugins/<name>/
├── skills/        # SKILL.md files — the slash commands
├── agents/        # orchestrate-*.md agent definitions
├── commands/      # lightweight single-pass commands
├── hooks/         # Python/bash scripts + hooks.json (Claude Code)
├── mcp/           # MCP server code (Python)
├── rules/         # behavior rules referenced by skills
├── conventions/   # language conventions
└── .claude-plugin/plugin.json
```

### What's added for dual-harness

```
.opencode/
├── plugins/
│   └── agent-orch.js          # Bootstrap: registers paths, injects context, wires hooks
├── agent-orch-hooks.ts        # TS adapter: OpenCode tool names → existing scripts
└── agent-orch.opencode.example.json   # MCP + tracker config template
.agent-orch-models.json        # Central model config (repo root, both harnesses read this)
.claude-plugin/marketplace.json        # Existing — Claude Code marketplace (unchanged)
```

### Key invariant

Edits to any file under `plugins/<name>/` land in both harnesses with zero sync step. The only
harness-specific files are the bootstrap, the hook adapter, and config templates — everything
else is shared.

### Data flow in OpenCode

1. `opencode.json` has `"plugin": ["git+https://code.ssnc.dev/ai/claude-agent-orchestration-plugin.git"]`
2. OpenCode loads `.opencode/plugins/agent-orch.js` (the `main` in `package.json`)
3. Bootstrap's `config` hook appends all 6 `plugins/<name>/skills` paths to `config.skills.paths`
   → skills auto-discovered
4. Bootstrap's `experimental.chat.messages.transform` injects a one-time preamble into the first
   user message: tool-name mapping, agent dispatch model names from `.agent-orch-models.json`,
   and the SessionStart entry-point hint
5. Hook adapter's `tool.execute.before` intercepts bash/edit/write, maps tool names, execs the
   *unchanged* `guard-worktree-writes.sh` / `validate-ai-commit.sh` from
   `plugins/agent-orch/hooks/`
6. MCP servers run unchanged (Python); users enable them in their `opencode.json` from the
   template

### Data flow in Claude Code (unchanged except models)

- `.claude-plugin/marketplace.json` → `/plugin install` discovers all 6 plugins as before
- Skills/agents/commands auto-discovered by directory convention
- `hooks.json` runs the scripts directly with Claude Code's capitalized tool names
- Skills read `.agent-orch-models.json` for model names instead of hardcoded `opus`/`sonnet`
- Default config (`aliases.thinking: "opus"`, `aliases.instruct: "sonnet"`) preserves current
  behavior

---

## Model Config File Format

`.agent-orch-models.json` at repo root. Two-level structure with vendor-neutral aliases.

### Vendor-neutral alias semantics

- `thinking` — the deep-reasoning tier (architecture, debugging, spec review, quality review,
  advocacy, incident response, legacy modernization). Replaces `opus`.
- `instruct` — the fast execution tier (building, validation, domain implementation, scribing,
  telemetry). Replaces `sonnet`.

### Initial file (shipped defaults)

```json
{
  "$schema": "https://opencode.ai/agent-orch-models.schema.json",
  "commit_attribution": {
    "harness": "claude-code",
    "trailer_format": "Co-authored-by: {gh_user} + {harness}/{models} <{gh_user}@users.noreply.github.com>"
  },
  "aliases": {
    "thinking": "opus",
    "instruct": "sonnet"
  },
  "agents": {
    "orchestrate-advocate": "thinking",
    "orchestrate-architect": "thinking",
    "orchestrate-debugger": "thinking",
    "orchestrate-incident-responder": "thinking",
    "orchestrate-legacy-modernizer": "thinking",
    "orchestrate-quality-reviewer": "thinking",
    "orchestrate-spec-reviewer": "thinking",
    "orchestrate-api": "instruct",
    "orchestrate-builder": "instruct",
    "orchestrate-c4-scribe": "instruct",
    "orchestrate-content-specialist": "instruct",
    "orchestrate-data-engineer": "instruct",
    "orchestrate-database": "instruct",
    "orchestrate-devops": "instruct",
    "orchestrate-jira-triage": "instruct",
    "orchestrate-migration": "instruct",
    "orchestrate-ml-engineer": "instruct",
    "orchestrate-observability": "instruct",
    "orchestrate-performance": "instruct",
    "orchestrate-private-cloud": "instruct",
    "orchestrate-refactorer": "instruct",
    "orchestrate-scribe": "instruct",
    "orchestrate-security": "instruct",
    "orchestrate-telemetry": "instruct",
    "orchestrate-uiux": "instruct",
    "orchestrate-validator": "instruct"
  }
}
```

### Resolution

- The bootstrap reads the JSON, maps each agent → alias → resolved model string, injects the
  resolved table into the session preamble so skills/agents see concrete model names at runtime.
- **Claude Code (default shipped):** `aliases.thinking` = `"opus"`, `aliases.instruct` =
  `"sonnet"` → native Anthropic aliases Claude understands. Behavior matches today.
- **OpenCode:** User edits the `aliases` block once: `"thinking":
  "ssnc-gateway/zai-org/GLM-5.2-FP8"`, `"instruct": "ssnc-gateway/..."`. All 26 agents pick up
  the change. The `agents` block never needs editing unless you want to change an individual
  agent's tier.
- **Fallback:** If the config file is missing, the bootstrap falls back to the raw alias
  (`thinking`/`instruct`) and logs a warning. Agent files keep a `model:` frontmatter default so
  they still work without the config.

### Override path preserved

The existing `.claude/rules/build-overrides.md` and `.specify/memory/constitution.md` override
mechanism stays — it overrides individual agents for a specific repo with a resolved model
string. The new config file is the *base* layer; per-repo overrides stack on top.

### Skill edits required (in-place, both harnesses benefit)

- `plugins/agent-orch/skills/build/SKILL.md` lines 2224-2244: replace hardcoded `opus`/`sonnet`
  model table + `.claude/rules/build-overrides.md` override mechanism with a reference to
  `.agent-orch-models.json` (keep the rationale column, point to the config for the actual model
  value). The `thinking`/`instruct` aliases appear in the table instead of vendor names.
- `plugins/agent-orch/skills/implement/SKILL.md` lines 1097-1115: same edit
- `plugins/agent-orch/skills/bugfix/SKILL.md` lines 268-269: replace "Debugger and Architect run
  on opus... Builder and Validator on sonnet. These are pinned in the agent definitions" with
  "Debugger and Architect run on the `thinking` model; Builder and Validator on `instruct`.
  Models are configured per-agent in `.agent-orch-models.json`"
- Agent files (`plugins/agent-orch/agents/orchestrate-*.md`): the `model:` frontmatter line
  changes from `opus`/`sonnet` to `thinking`/`instruct` (the bootstrap resolves these via the
  config; if the config file is absent, the raw alias is still a meaningful default the user can
  map)
- `plugins/agent-orch/skills/init-plugin/SKILL.md` and
  `plugins/agent-orch/skills/inherit-plugin/SKILL.md`: update to generate
  `.agent-orch-models.json` as part of plugin setup, defaulting to `thinking`/`instruct` aliases

---

## Harness-Agnostic Commit Trailer

The current `validate-ai-commit.sh` hook and `ai-code-governance.md` policy are hardcoded to
require a `Co-authored-by: Claude ... <noreply@anthropic.com>` trailer. This breaks the
dual-harness goal: an OpenCode session running a non-Anthropic model (e.g.,
`ssnc-gateway/zai-org/GLM-5.2-FP8`) cannot satisfy the policy without lying about the author.

The trailer must become harness- and model-agnostic. It identifies **the GitHub human user, the
harness, and the model(s)** that produced the commit, packed into a single git-standard
`Co-authored-by:` line — no Anthropic-specific email.

### Trailer format

Single `Co-authored-by:` line using git's `Name <email>` shape. The Name packs the human's GH
username + the harness/model attribution; the email is the human's GitHub noreply address (so
GitHub links the commit to their profile):

```
Co-authored-by: <gh-user> + <harness>/<models> <<gh-user>@users.noreply.github.com>
```

Concrete examples:

```
# Claude Code session, opus model, user jstein
Co-authored-by: jstein + claude-code/opus <jstein@users.noreply.github.com>

# OpenCode session, GLM-5.2, user jstein
Co-authored-by: jstein + opencode/ssnc-gateway/zai-org/GLM-5.2-FP8 <jstein@users.noreply.github.com>

# Multi-model session (architect on thinking, builder on instruct)
Co-authored-by: jstein + opencode/thinking,instruct <jstein@users.noreply.github.com>
```

The `<gh-user>@users.noreply.github.com` form is GitHub's standard noreply pattern — it links
the commit to the human's profile without exposing their real email. The human's GH username is
read from `git config user.name` at commit time; the noreply email is derived from it (or taken
from `git config user.email` if the user has already set the noreply form).

### Config addition to `.agent-orch-models.json`

A top-level `commit_attribution` block declares the harness name and the trailer template. The
bootstrap reads this and injects the resolved trailer into the session preamble so agents know
what to write.

```json
{
  "commit_attribution": {
    "harness": "claude-code",
    "trailer_format": "Co-authored-by: {gh_user} + {harness}/{models} <{gh_user}@users.noreply.github.com>"
  },
  "aliases": { ... },
  "agents": { ... }
}
```

- **`harness`** — the harness display name appearing in the trailer. Shipped default:
  `"claude-code"`. OpenCode users set `"opencode"` or any identifier their org prefers.
- **`trailer_format`** — template with `{gh_user}`, `{harness}`, and `{models}` placeholders.
  Default format produces the single-line shape above. The `{models}` placeholder resolves to a
  comma-separated list of the distinct resolved model names active in the session (e.g.,
  `opus,sonnet` or `ssnc-gateway/zai-org/GLM-5.2-FP8`).
- **No `email` field** — the email is always derived from `{gh_user}` as
  `<gh_user>@users.noreply.github.com`. No vendor-specific email is stored or validated. The
  Anthropic `noreply@anthropic.com` address is dropped entirely.

### Hook changes: `plugins/agent-orch/hooks/validate-ai-commit.sh`

The hook currently grep-matches a hardcoded regex:
`Co-authored-by:[[:space:]]+Claude[^<]*<noreply@anthropic\.com>`. This is replaced with a
config-driven check with a two-tier fallback:

1. The hook looks for `.agent-orch-models.json` in the session cwd (passed as `.cwd` in the
   stdin payload) — **project-local config**. If present, it uses that.
2. If no project config, the hook derives the plugin's shipped config from its own script path
   (`plugins/agent-orch/hooks/` → repo root → `.agent-orch-models.json`) and uses that. This
   means OpenCode users and updated Claude Code installs enforce the new format even without a
   project-level config.
3. If neither config exists (older plugin install with no project config), the hook falls back
   to the legacy `Claude[^<]*<noreply@anthropic\.com>` regex for backward compatibility.
4. It extracts `commit_attribution.harness` from the resolved config and reads
   `git config user.name` for the GitHub username.
5. It checks the commit message for a `Co-authored-by:` trailer matching the configured format
   (case-insensitive on the label): the human's GH username must be present, the harness name
   must match, and the email must be `<gh_user>@users.noreply.github.com`. The model list is not
   strictly validated by the hook (the bootstrap injects the correct values; the hook enforces
   that *some* harness/models are attributed and that the human user is named).
6. The error message is updated to show the expected trailer shape using the configured harness
   and the current `git config user.name` — no hardcoded `Claude` / `noreply@anthropic.com`
   examples.

The hook remains a bash script (no Node dependency) so Claude Code's native hook runner and the
OpenCode TS adapter both exec it unchanged. Reading JSON in bash uses the existing `jq` →
`python3` → `awk` fallback chain already in the script.

### Policy changes: `plugins/agent-orch/policies/ai-code-governance.md`

- Drop all `noreply@anthropic.com` references and the hardcoded `Claude` examples.
- Replace with a parameterized explanation: "Every AI-generated commit MUST include a single
  `Co-authored-by:` trailer identifying the human GitHub user, the harness, and the model(s)
  that produced it, as configured in `.agent-orch-models.json` under `commit_attribution`."
- Show both a Claude Code example and an OpenCode example (using the format above).
- Update the "Agent Instructions" section to say "Include the configured `Co-authored-by:`
  trailer" instead of "Include a `Co-authored-by: Claude <model> <noreply@anthropic.com>`
  trailer".
- Add a deprecation note: trailers using the legacy `Claude ... <noreply@anthropic.com>` form
  are accepted by the hook only when `.agent-orch-models.json` is absent (fallback mode); new
  repos and all OpenCode sessions must use the configured format.

### Skill and agent edits

- `plugins/agent-orch/skills/bugfix/SKILL.md` line 252: replace `Co-authored-by: Claude ...`
  with the configured-format example and a pointer to `.agent-orch-models.json`.
- `plugins/agent-orch/agents/orchestrate-scribe.md` line 94 and
  `plugins/agent-orch/agents/orchestrate-debugger.md` line 450: replace the literal
  `Co-authored-by: Claude Code` with a placeholder/instruction ("use the configured
  `commit_attribution` trailer from `.agent-orch-models.json`") since agent files are
  templates, not commit messages.
- `plugins/agent-orch/skills/init-plugin/SKILL.md` and
  `plugins/agent-orch/skills/inherit-plugin/SKILL.md`: generate the `commit_attribution` block
  with the chosen harness default when scaffolding a new plugin.

### What the bootstrap injects

The session preamble (Section: Bootstrap Plugin, part 2) includes the resolved trailer string
so agents have a copy-paste-ready value. The bootstrap reads `git config user.name` for the
current repo to fill `{gh_user}`, resolves `{harness}` from config, and resolves `{models}`
from the distinct model names in the agents block:

```
Commit attribution for this session:
  Co-authored-by: jstein + opencode/ssnc-gateway/zai-org/GLM-5.2-FP8 <jstein@users.noreply.github.com>
(configured in .agent-orch-models.json → commit_attribution; gh_user from git config user.name)
```

Claude Code sessions with the shipped default resolve to:
```
  Co-authored-by: jstein + claude-code/opus,sonnet <jstein@users.noreply.github.com>
```

### Backward compatibility

- **Existing Claude Code repos without a project-level `.agent-orch-models.json`:** the hook
  falls back to the plugin's **shipped** config (which has `harness: "claude-code"`), so the new
  trailer format is enforced using the `claude-code` harness. Legacy trailers with
  `Claude ... <noreply@anthropic.com>` are **rejected** in this case — the user must switch to
  the new trailer shape (`<gh_user> + claude-code/<models> <...@users.noreply.github.com>`).
  This is a one-line migration documented in the policy.
- **Existing Claude Code repos that predate the config file entirely (e.g. installed an older
  plugin version before `.agent-orch-models.json` was shipped at the repo root):** the hook
  finds neither a project config nor a shipped config and falls back to the legacy
  `Claude[^<]*<noreply@anthropic\.com>` regex. Existing trailers continue to pass. This path
  disappears once the repo updates to the current plugin version (which ships the config).
- **Existing Claude Code repos that add a project-level config file:** the project config takes
  precedence over the shipped default. Legacy trailers with `Claude ... <noreply@anthropic.com>`
  are **not** accepted — the hook enforces the new format. Document this as a one-line migration.
- **OpenCode sessions:** always have the shipped config available (it lives in the repo root),
  so they use the new format from day one. The bootstrap warns if the project-level config is
  missing and falls back to the shipped default.

---

## Bootstrap Plugin (`.opencode/plugins/agent-orch.js`)

Single entry point OpenCode loads. Modeled on superpowers' bootstrap but covers 6 plugins +
model resolution + hook wiring.

### Structure

```js
export const AgentOrchPlugin = async ({ client, directory }) => {
  const pluginsRoot = path.resolve(__dirname, '../../plugins');
  const modelConfigPath = path.resolve(directory, '.agent-orch-models.json');

  return {
    // 1. Register all 6 plugins' skill paths
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      for (const name of PLUGIN_NAMES) {
        const skillsDir = path.join(pluginsRoot, name, 'skills');
        if (fs.existsSync(skillsDir)) {
          config.skills.paths.push(skillsDir);
        }
      }
    },

    // 2. Inject preamble into first user message
    'experimental.chat.messages.transform': async (_input, output) => { ... },

    // 3. Wire hook adapter
    'tool.execute.before': async (input, output) => { ... },
  };
};
```

### Plugin names constant

`['agent-orch', 'codebase-graph-analyzer', 'mainframe-analyzer', 'meta-orch', 'team-work',
'vault-orch']`. The `config` hook loops over them, appending each `<name>/skills` path.
OpenCode's skill discovery does the rest — same mechanism superpowers uses for its single
`skills/` dir, extended to 6.

### Injected preamble (one-time, into first user message)

Guard: skip if first user message already contains bootstrap (prevents double injection), same
pattern as superpowers.

Contains four parts:

1. **Tool-name mapping** — Claude Code uses capitalized tool names (`Bash`, `Write`, `Edit`,
   `MultiEdit`, `NotebookEdit`); OpenCode uses lowercase (`bash`, `write`, `edit`). Skills and
   agent files reference both. The preamble states the mapping so skill text that says "use the
   Bash tool" resolves correctly.

2. **Resolved model table + commit attribution** — the bootstrap reads `.agent-orch-models.json`,
   resolving a project-local config (in the user's project directory) first, then falling back
   to the plugin's shipped config (at the repo root of this plugin). It resolves each agent →
   alias → final model string and injects a compact table. Skills reference agent names; the
   preamble tells the session which concrete model each agent runs on. If neither config file
   exists, the bootstrap falls back to the raw alias (`thinking`/`instruct`) and logs a warning.
   The preamble also includes the resolved `commit_attribution` trailer string — a single
   `Co-authored-by:` line packing the GitHub human user, harness, and model(s) (e.g.,
   `Co-authored-by: jstein + opencode/ssnc-gateway/zai-org/GLM-5.2-FP8 <jstein@users.noreply.github.com>`)
   so agents know exactly what to append to commit messages without referencing any vendor. The
   `{gh_user}` is read from `git config user.name`. The hook's fallback chain mirrors the
   bootstrap's (project config → shipped config → legacy regex) so the injected trailer and the
   hook's validation always agree.

3. **Entry-point hint** — the SessionStart message from `hooks.json` ("Pick the entry point
   that fits the task: /agent-orch:brainstorm → /agent-orch:build..."). On Claude Code this
   fires via the `SessionStart` hook; on OpenCode the bootstrap injects it into the first
   message since OpenCode has no SessionStart hook equivalent.

4. **Plugin/skill namespace mapping** — clarifies that `/agent-orch:brainstorm` in Claude Code
   maps to the `brainstorm` skill loaded from `plugins/agent-orch/skills/` in OpenCode.
   OpenCode's `skill` tool lists them by skill name; the preamble bridges the namespace gap.

### Model resolution logic

```js
const resolveModels = (configPath) => {
  if (!fs.existsSync(configPath)) {
    return { 'orchestrate-architect': 'thinking', /* ...defaults... */ };
  }
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const resolved = {};
  for (const [agent, alias] of Object.entries(cfg.agents)) {
    resolved[agent] = cfg.aliases[alias] || alias;
  }
  return resolved;
};
```

Cached at module level (like superpowers' `_bootstrapCache`) since the config file doesn't
change during a session.

### Hook wiring

The bootstrap imports `agent-orch-hooks.ts`'s exported `createHookHandler` function and calls it
from `tool.execute.before`, passing the resolved session cwd (`worktree || directory`).

### package.json (new file at repo root)

This repo currently has no root `package.json` (unlike superpowers). A new one must be created
so OpenCode's plugin loader can find the entry point. Mirrors superpowers' `package.json`:

```json
{
  "name": "claude-agent-orchestration-plugin",
  "version": "2.48.0",
  "description": "Multi-agent orchestration for Claude Code and OpenCode",
  "type": "module",
  "main": ".opencode/plugins/agent-orch.js",
  "keywords": ["agent-orch", "orchestration", "multi-agent", "skills", "opencode", "claude-code"]
}
```

The `main` field points to `.opencode/plugins/agent-orch.js`. The `type: "module"` field enables
ES module syntax (the bootstrap uses `import`/`export`). OpenCode's runtime (Bun) handles
importing `.ts` from `.js` natively, so the bootstrap importing `agent-orch-hooks.ts` works
without a build step.

---

## Hook Adapter (`.opencode/agent-orch-hooks.ts`)

Adapts OpenCode's hook contract to the existing Python/bash scripts so they run **unchanged**.
Direct evolution of the skathi proof-of-concept, extended to cover all hook scripts and
plugin-agnostic.

### The gap it bridges

| Concern | Claude Code | OpenCode |
|---------|-------------|----------|
| Tool names | `Bash`, `Write`, `Edit`, `MultiEdit`, `NotebookEdit` | `bash`, `write`, `edit` |
| Hook input | JSON on stdin: `{ tool_name, tool_input, cwd }` | `tool.execute.before(input, output)` callback |
| Hook registration | `hooks.json` with matchers | Plugin's `tool.execute.before` handler |
| `${CLAUDE_PLUGIN_ROOT}` | Set by Claude Code | Not set — adapter resolves script paths |

### Scripts it wraps (all live under `plugins/agent-orch/hooks/`, unchanged)

1. **`guard-worktree-writes.sh`** → `guard-worktree-writes.py` — blocks agent writes that drift
   into the primary checkout during a `/make` worktree session. Fires on `bash`, `edit`, `write`
   (Claude Code: `Write|Edit|MultiEdit|NotebookEdit|Bash`).
2. **`validate-ai-commit.sh`** — rejects `git commit` without `Co-authored-by:` trailer. Fires
   on `bash` when the command matches `git commit`.

### Structure

```ts
import path from "node:path"
import { execFileSync } from "node:child_process"
import type { Plugin } from "@opencode-ai/plugin"

const TOOL_NAME_CASING: Record<string, string> = {
  bash: "Bash",
  write: "Write",
  edit: "Edit",
  multiedit: "MultiEdit",
  notebookedit: "NotebookEdit",
}

// Resolve script path relative to repo root (plugins/agent-orch/hooks/)
const hooksDir = path.join(__dirname, "..", "plugins", "agent-orch", "hooks")

function runHook(script: string, payload: unknown): { blocked: boolean; message: string } {
  try {
    const stdin = JSON.stringify(payload)
    execFileSync("bash", [path.join(hooksDir, script)], {
      input: stdin,
      timeout: 10000,
      encoding: "utf8",
    })
    return { blocked: false, message: "" }
  } catch (err: any) {
    const message = (err.stdout || err.stderr || err.message || "").trim()
    return { blocked: true, message }
  }
}

export function createHookHandler(sessionCwd: string) {
  return async (input: any, output: any) => {
    const tool: string = output?.tool ?? input?.tool ?? ""
    const args = output?.args ?? input?.tool_input ?? {}
    const claudeTool = TOOL_NAME_CASING[tool] ?? tool

    // Commit trailer validation
    if (tool === "bash") {
      const command: string = args.command ?? ""
      if (/\bgit\s+commit\b/.test(command)) {
        const result = runHook("validate-ai-commit.sh", {
          tool_name: claudeTool,
          tool_input: args,
          cwd: sessionCwd,
        })
        if (result.blocked) {
          throw new Error(`Blocked by validate-ai-commit: ${result.message}`)
        }
      }
    }

    // Worktree write guard
    if (tool === "edit" || tool === "write" || tool === "bash") {
      const result = runHook("guard-worktree-writes.sh", {
        tool_name: claudeTool,
        tool_input: args,
        cwd: sessionCwd,
      })
      if (result.blocked) {
        throw new Error(`Blocked by guard-worktree-writes: ${result.message}`)
      }
    }
  }
}
```

### Key differences from skathi's version (the proven prototype)

1. **`hooksDir` resolves to the canonical `plugins/agent-orch/hooks/`** instead of
   `.opencode/agent-orch/scripts/`. Single source of truth — the scripts live where Claude Code
   expects them, OpenCode reaches into the same path.
2. **`createHookHandler(sessionCwd)` factory** instead of an inline closure — the bootstrap
   calls this with the resolved session cwd (`worktree || directory`), then registers the
   returned function as `tool.execute.before`. Keeps the adapter testable and decoupled from
   the bootstrap.
3. **Same script contract** — the adapter reproduces `{ tool_name, tool_input, cwd }` on stdin,
   exactly what the scripts were written for. Zero changes to `guard-worktree-writes.py`,
   `guard-worktree-writes.sh`, or `validate-ai-commit.sh`.

### What's NOT wrapped (intentionally)

- `hooks.json` `SessionStart` hook → handled by the bootstrap's preamble injection (entry-point
  hint, part 3)
- `check-teammate-tasks.sh`, `verify-task-evidence.sh` → these are invoked *by skill prompts*,
  not by PreToolUse hooks. They run via the `bash` tool directly when a skill calls them, so no
  adapter needed — OpenCode's `bash` tool executes them like any shell command.

### Testing the adapter

- Unit: call `createHookHandler(cwd)` with a mock `git commit` (no trailer) → expect thrown
  error
- Unit: call with a normal `edit` outside a worktree session → expect no block
- Integration: in a real OpenCode session with a `/make` worktree active, attempt a write to
  the primary checkout → expect hard block with the guard's message

---

## MCP & Tracker Config Template

The MCP servers (Jira, Confluence, TestRail, Azure DevOps, Playwright, SonarQube, SS&C Cloud,
ServiceNow) are Python under `plugins/agent-orch/mcp/` and run unchanged — OpenCode connects to
them via SSE like any remote MCP.

### `.opencode/agent-orch.opencode.example.json`

A copy-paste template users merge into their `opencode.json`. All servers `enabled: false` by
default (mirrors skathi's pattern):

```json
{
  "mcp": {
    "agent-orch-jira": {
      "type": "remote",
      "url": "http://localhost:13999/sse/jira",
      "enabled": false
    },
    "agent-orch-confluence": {
      "type": "remote",
      "url": "http://localhost:13999/sse/confluence",
      "enabled": false
    },
    "agent-orch-testrail": {
      "type": "remote",
      "url": "http://localhost:13999/sse/testrail",
      "enabled": false
    },
    "agent-orch-azuredevops": {
      "type": "remote",
      "url": "http://localhost:13999/sse/azuredevops",
      "enabled": false
    },
    "agent-orch-playwright": {
      "type": "remote",
      "url": "http://localhost:13999/sse/playwright",
      "enabled": false
    },
    "agent-orch-sonarqube": {
      "type": "remote",
      "url": "http://localhost:13999/sse/sonarqube",
      "enabled": false
    },
    "agent-orch-ssccloud": {
      "type": "remote",
      "url": "http://localhost:13999/sse/ssccloud",
      "enabled": false
    },
    "agent-orch-servicenow": {
      "type": "remote",
      "url": "http://localhost:13999/sse/servicenow",
      "enabled": false
    }
  }
}
```

### User workflow

1. Copy the relevant `mcp` entries into their project's `opencode.json`
2. Run `/agent-orch:mcp-setup` (skill, harness-agnostic) to configure credentials for the server
3. Run `/agent-orch:mcp-start` (skill) to start the Python server
4. Flip `enabled: true` in `opencode.json` for the backends they want
5. Restart OpenCode

### Skill changes

The `/mcp-setup`, `/mcp-start`, `/mcp-stop` skills need no changes — they're already
harness-agnostic shell commands. The bootstrap's tool-name mapping ensures "use the Bash tool"
in skill text resolves to OpenCode's `bash`.

### Tracker config

`.make-config.md` (`tracker: jira | github | none`) is already harness-neutral — no template
needed, skills read it via the `read` tool in both harnesses.

---

## Documentation Updates (README + CHEAT-SHEET)

Per the repo's CLAUDE.md, both files must stay in sync.

### README.md changes

**New top-level section: "Dual-Harness Support (Claude Code + OpenCode)"** placed after the
intro, before "What's in the Box." Explains:

- One source of truth under `plugins/<name>/` serves both harnesses
- Which harnesses are supported (Claude Code v1.0.33+, OpenCode)
- Where the harness-specific files live (`.opencode/`, `.agent-orch-models.json`)
- Pointer to the two install paths below

**Two install paths in "Quick Start"** — current Claude Code path stays first, new OpenCode path
added second:

```bash
# OpenCode — add one line to opencode.json (global or project-level):
{
  "plugin": ["git+https://code.ssnc.dev/ai/claude-agent-orchestration-plugin.git"]
}
# Restart OpenCode. Verify: ask "Tell me about your agent-orch skills"
```

**New "Model Configuration" section** explaining `.agent-orch-models.json`:

- What the `thinking`/`instruct` aliases mean and which agents use which tier
- How to override per-harness: Claude Code ships `aliases.thinking: "opus"`,
  `aliases.instruct: "sonnet"`; OpenCode users edit the aliases block to their full model IDs
  (e.g., `ssnc-gateway/zai-org/GLM-5.2-FP8`)
- How per-repo overrides still work via `.claude/rules/build-overrides.md` and
  `.specify/memory/constitution.md`
- Example JSON snippet

**New "MCP Setup (OpenCode)" subsection** in the existing MCP section:

- Copy `.opencode/agent-orch.opencode.example.json` entries into `opencode.json`
- Run `/agent-orch:mcp-setup` then `/agent-orch:mcp-start` (same skills, harness-agnostic)
- Flip `enabled: true` and restart

**"What's in the Box" table** — add a note above the table clarifying all skills/agents/commands
work in both harnesses unless noted (mainframe-analyzer's MCP server is the only one with a
harness-specific setup path, covered in its own section).

**Existing Claude Code sections** stay as-is — no behavior change for Claude Code users except
the model names in skill tables become `thinking`/`instruct` (with the config file mapping them
back to `opus`/`sonnet` by default).

### CHEAT-SHEET.md changes

**"Quick Install" row** — add OpenCode one-liner alongside the existing Claude Code install:

```
# Claude Code
/plugin marketplace add git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
/plugin install agent-orch@ssnc-agent-orch

# OpenCode
# Add to opencode.json: "plugin": ["git+https://code.ssnc.dev/ai/claude-agent-orchestration-plugin.git"]
```

**New "Model Configuration" quick-reference table** — compact, scannable:

```
| Alias     | Default (Claude Code) | OpenCode (user-set)          | Use for                          |
|-----------|----------------------|------------------------------|----------------------------------|
| thinking  | opus                 | ssnc-gateway/.../GLM-5.2-FP8 | Architecture, debugging, review  |
| instruct  | sonnet               | ssnc-gateway/.../...         | Building, validation, domain work|
```

Config file: `.agent-orch-models.json` at repo root. Override per-repo:
`.claude/rules/build-overrides.md`.

**"MCP Quick Setup"** — add OpenCode column showing the template file path + `enabled: false` →
`true` flow.

**Footer** — bump version, add "Dual-harness: Claude Code + OpenCode" note.

### Sync validation

Per CLAUDE.md, run after edits:

```bash
# Skills documented in both files match
diff <(grep -o '/agent-orch:[a-z-]*' README.md | sort -u) \
     <(grep -o '/agent-orch:[a-z-]*' CHEAT-SHEET.md | sort -u)
# Agent counts match
grep -o "orchestrate-[a-z-]*" README.md | sort -u | wc -l
grep -o "orchestrate-[a-z-]*" CHEAT-SHEET.md | sort -u | wc -l
# Install instructions present in both
grep -c "opencode.json" README.md CHEAT-SHEET.md
```

---

## Acceptance Test & Validation

Mirrors superpowers' bar: a clean-session transcript proving the integration works end-to-end.

**Test environment:** Clean OpenCode session in a fresh checkout of the repo with
`.agent-orch-models.json` configured for an OpenCode-compatible model.

### Test 1 — Bootstrap loads and registers all 6 plugins' skills

```
User: list your available skills
Expected: skill tool lists skills from all 6 plugins (agent-orch, codebase-graph-analyzer,
         mainframe-analyzer, meta-orch, team-work, vault-orch)
```

### Test 2 — Acceptance test (the superpowers bar)

```
User: /agent-orch:brainstorm let's make a react todo list
Expected: brainstorming skill auto-triggers, Socratic one-question-at-a-time dialogue begins,
         hard pre-implementation gate holds (no code written until design approved)
```

### Test 3 — Model resolution

```
User: what model does the architect agent use?
Expected: responds with the resolved model from .agent-orch-models.json (e.g.,
         "ssnc-gateway/zai-org/GLM-5.2-FP8" if aliases.thinking points there)
```

Fallback test: delete `.agent-orch-models.json`, restart session, ask again → expect raw alias
`thinking` + a warning in logs that the config file is missing.

### Test 4 — Hook adapter: commit trailer enforcement (harness-agnostic)

```
Setup: .agent-orch-models.json has commit_attribution.harness = "opencode",
       git config user.name = "jstein"

User: git commit -m "test" (no Co-authored-by trailer)
Expected: blocked by validate-ai-commit, error message shows the expected trailer shape using
         "jstein" and "opencode" — NOT hardcoded "Claude" / "noreply@anthropic.com"

User: git commit -m "test" -m "Co-authored-by: jstein + opencode/ssnc-gateway/zai-org/GLM-5.2-FP8 <jstein@users.noreply.github.com>"
Expected: allowed through

User: git commit -m "test" -m "Co-authored-by: Claude Code <noreply@anthropic.com>"
Expected: REJECTED — project config is present (harness "opencode"), so the legacy Anthropic
         trailer no longer satisfies the policy. Error shows the expected new format.

Setup: delete project .agent-orch-models.json (but plugin ships its own at repo root)

User: git commit -m "test" -m "Co-authored-by: jstein + claude-code/opus,sonnet <jstein@users.noreply.github.com>"
Expected: allowed through (hook falls back to the plugin's shipped config, harness "claude-code")

User: git commit -m "test" -m "Co-authored-by: Claude Code <noreply@anthropic.com>"
Expected: REJECTED — the shipped plugin config is present, so the new format is enforced even
         without a project-level config
```

### Test 5 — Hook adapter: worktree write guard

```
Setup: start a /agent-orch:make session in a worktree
User: attempt to write a file into the primary checkout path
Expected: hard block from guard-worktree-writes with the guard's message
```

### Test 6 — MCP template

```
Validate: .opencode/agent-orch.opencode.example.json parses as valid JSON
Validate: copying entries into opencode.json and running /agent-orch:mcp-start starts the server
Validate: /agent-orch:mcp-setup walks through credential configuration
```

### Test 7 — Documentation sync

```bash
# Run the validation commands from the Documentation section
diff <(grep -o '/agent-orch:[a-z-]*' README.md | sort -u) \
     <(grep -o '/agent-orch:[a-z-]*' CHEAT-SHEET.md | sort -u)  # no diff
grep -o "orchestrate-[a-z-]*" README.md | sort -u | wc -l       # 26
grep -o "orchestrate-[a-z-]*" CHEAT-SHEET.md | sort -u | wc -l  # 26
grep -c "opencode.json" README.md CHEAT-SHEET.md                # both > 0
```

### Test 8 — Claude Code regression (no behavior change)

```
In Claude Code with default .agent-orch-models.json (aliases: thinking→opus, instruct→sonnet):
- /agent-orch:brainstorm works as before
- /agent-orch:build dispatches agents to opus/sonnet as before
- hooks.json fires SessionStart and PreToolUse hooks as before
- No skill text references "opus" or "sonnet" literally — all go through the config
```

### Pass criteria

Tests 1-5 must pass for the integration to be considered working. Tests 6-8 are validation
gates (docs, MCP, regression). A session transcript of Test 2 (the acceptance test) goes into
the design doc as proof, matching superpowers' PR requirement.

---

## Out of Scope

- Rewriting the Python MCP servers as OpenCode-native plugins (they run unchanged via SSE)
- Per-plugin OpenCode bootstraps (one bootstrap serves all 6 plugins by design decision)
- Per-harness sync scripts (single source of truth means no sync needed)
- Renaming the repo (it stays `claude-agent-orchestration-plugin`; OpenCode is an added target,
  not a replacement)
- The other 5 plugins' agent files (only agent-orch has agents with `model:` frontmatter; the
  others have no agents or no model declarations to migrate)

---

## Open Questions

None. All design decisions resolved during brainstorming:

1. Scope: all 6 plugins in one spec ✓
2. Source of truth: single source in `plugins/` ✓
3. Model config: central `.agent-orch-models.json` ✓
4. Aliases: `thinking`/`instruct` (vendor-neutral) ✓
5. Hooks: keep scripts, one TS adapter ✓
6. Skill rewrites: edit skills in place ✓
7. Bootstrap: single plugin for all 6 ✓
8. Install UX: one plugin line, git URL ✓
9. MCP: config template, server unchanged ✓
10. Acceptance: superpowers-style acceptance test ✓
11. Docs: README + CHEAT-SHEET updated with dual-harness directions ✓
12. Commit trailer: harness-agnostic, single `Co-authored-by:` line packing GitHub user + harness + model(s), no Anthropic email ✓
