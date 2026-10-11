# Config Discovery: Harness-Native Defaults + Layered Config

**Date:** 2026-08-02
**Status:** Approved (design)
**Predecessor:** [2026-08-02 Dual-Harness OpenCode Support](./2026-08-02-dual-harness-opencode-design.md)

## Problem

When a user starts on a repo with the agent-orch plugin installed but no project-level `.agent-orch-models.json`, the plugin can't determine the correct harness or model IDs. The shipped config at the plugin repo root declares `harness: "claude-code"` with `opus`/`sonnet` aliases — so an OpenCode session on a non-configured repo inherits Claude Code values: wrong harness label in the commit trailer, wrong model IDs that OpenCode can't resolve.

Root causes identified during exploration:
1. **No runtime harness detection.** The harness is purely a config value. The OpenCode bootstrap hardcodes `opencode` as its default (line 76) but the shipped config overrides it to `claude-code`.
2. **Inconsistent defaults.** Bootstrap defaults to `opencode`; hook defaults to `legacy`. They only agree when a project config explicitly sets the value.
3. **Shipped config is Claude-Code-shaped.** `harness: "claude-code"`, `aliases: thinking→opus, instruct→sonnet`. Any OpenCode session without a project config inherits wrong values.
4. **No lightweight config-init skill.** Only the heavyweight `init-plugin` wizard or `inherit-plugin` (for new plugin repos) write the config. `setup-claude-md` does not.
5. **OpenCode adaptation is a conditional aside.** Both init skills say "if the user is on OpenCode…" with no detection mechanism — the default output is always Claude-Code-shaped.
6. **Preamble advertises the config but not the fix path.** No "if missing, run X" instruction; entry-point list omits setup skills.
7. **CLAUDE.md is silent on first-run.** No "new repo / first run / initialize" guidance.

## Solution

Each harness knows its own identity at runtime (the OpenCode bootstrap IS the OpenCode entry point; the hook adapter TELLS the hook it's OpenCode via stdin). Config is layered: project → global → harness-native defaults. A new lightweight skill (`/agent-orch:config`) writes project or global config on demand. First run with no config triggers a preamble-driven prompt.

## Design

### Config Resolution Chain

Three-tier fallback, evaluated in this order at session start:

| Tier | Path | Who sets it | When it wins |
|------|------|-------------|--------------|
| 1. Project | `<repo>/.agent-orch-models.json` | `/agent-orch:config` (no flag) or hand-edited | Always wins if present |
| 2. Global | `~/.config/agent-orch-models.json` | `/agent-orch:config --global` or first-run prompt | No project config |
| 3. Harness-native default | hardcoded in code | shipped | No config at all |

The hook has a 4th sub-tier (stdin harness signal) and a separate legacy-trailer acceptance behavior — both are hook-specific and detailed in the Hook Changes section below. The bootstrap uses only the 3 tiers above.

**Harness-native defaults (Tier 3):**

- **OpenCode bootstrap** (`.opencode/plugins/agent-orch.js`): `harness = 'opencode'`, `aliases = { thinking: 'thinking', instruct: 'instruct' }` — literal alias names as sentinels. These are NOT valid model IDs, which is intentional: if the user reaches Tier 3, the bootstrap detects "no project AND no global config" and injects a first-run preamble instruction BEFORE any agent runs. The sentinels never reach OpenCode's model resolver because the preamble tells the agent to prompt the user first. The sentinels are a marker for "unset," not something OpenCode tries to load.

- **Claude Code hook** (`validate-ai-commit.sh`): `harness = 'claude-code'` when no config and no stdin harness signal. Claude Code's model names (`opus`/`sonnet`) are valid in Claude Code's runtime, so Tier 3 works directly. Additionally, the hook reads `ANTHROPIC_DEFAULT_OPUS_MODEL` and `ANTHROPIC_DEFAULT_SONNET_MODEL` env vars (see "Claude Code env-var auto-config" below) — if set, those values populate the aliases at Tier 3 so the commit trailer includes the real model IDs, not just `opus`/`sonnet` aliases. If the env vars are absent, falls back to the literal `opus`/`sonnet` alias names (which Claude Code resolves internally). No prompt needed for Claude Code users in either case.

- **Hook harness awareness**: the OpenCode adapter (`.opencode/agent-orch-hooks.ts`) passes `harness: 'opencode'` in the stdin payload to the bash hook. The hook reads it from stdin first; if absent (Claude Code invocation), defaults to `claude-code`. This way the hook always knows the runtime harness.

**Claude Code env-var auto-config:** Claude Code users often set `ANTHROPIC_DEFAULT_OPUS_MODEL` (e.g., `us.anthropic.claude-opus-5`) and `ANTHROPIC_DEFAULT_SONNET_MODEL` (e.g., `global.anthropic.claude-sonnet-5`) in their environment to pin model versions. The hook reads these at Tier 3 and uses them as the `aliases.thinking` and `aliases.instruct` values respectively for the commit trailer's `{models}` segment. This means a Claude Code user with these env vars set gets accurate model IDs in their commit trailers automatically — no `/agent-orch:config` run needed. The `agents` block's `thinking`/`instruct` mapping is unchanged (7 thinking, 19 instruct). If the user wants to override (e.g., pin a different model for a specific repo), they run `/agent-orch:config` to write a project config that wins at Tier 1.

**Shipped config's new role:** `.agent-orch-models.json` at the plugin repo root stays on disk as a reference template. Nothing reads it at runtime. `init-plugin` and `inherit-plugin` still copy from it when scaffolding. The file is renamed to `.agent-orch-models.example.json` to clarify it's a template, and a new `.agent-orch-models.json` is NOT shipped (so there's no shipped config to accidentally read).

### `/agent-orch:config` Skill

**File:** `plugins/agent-orch/skills/config/SKILL.md`

**Purpose:** A lightweight skill that writes or updates `.agent-orch-models.json` — either the project-level config (default) or the global config (`--global` flag). Covers the 1% override case and the first-run global setup.

**Workflow:**

1. **Determine target scope:**
   - If user said `--global` → target is `~/.config/agent-orch-models.json`
   - Otherwise → target is `<cwd>/.agent-orch-models.json`

2. **Check for existing config at target:**
   - If it exists: read and display current values (`aliases.thinking`, `aliases.instruct`, `commit_attribution.harness`). Ask: "Update these values, or cancel?" If cancel, exit.
   - If it doesn't exist: proceed to step 3.

3. **Determine harness:**
   - The skill is invoked by the harness itself, so the runtime context is authoritative. The skill instructions say: "You are running inside a harness. If this is OpenCode, set `harness` to `"opencode"`. If this is Claude Code, set `harness` to `"claude-code"`. If unsure, ask the user."
   - In practice: the OpenCode bootstrap's preamble already says "You are running in OpenCode", so the agent knows. Claude Code agents know they're in Claude Code.

4. **Collect model IDs — harness-specific, no typing required:**

   **OpenCode (picker from available models):**
   - Run `opencode models` via the plugin's `$` (Bun shell) to get the list of available models as `provider_id/model_id` lines. (Alternative: `opencode models --verbose` for JSON with names/capabilities if richer display is wanted.)
   - Present the list to the user as a numbered menu: "Select a model for `thinking` (deep reasoning — used by architect, debugger, advocate, etc.):" followed by the numbered options.
   - User picks a number. Repeat for `instruct` (fast execution — used by builder, validator, etc.).
   - If the user selects the same model for both, confirm: "Use `<model>` for both thinking and instruct?"
   - The selected `provider_id/model_id` strings are the alias values written to the config.

   **Claude Code (auto-fill from env vars, prompt only as fallback):**
   - Read `ANTHROPIC_DEFAULT_OPUS_MODEL` and `ANTHROPIC_DEFAULT_SONNET_MODEL` from the environment.
   - If both are set: use them as `aliases.thinking` and `aliases.instruct` respectively. Tell the user: "Detected `ANTHROPIC_DEFAULT_OPUS_MODEL=<value>` and `ANTHROPIC_DEFAULT_SONNET_MODEL=<value>`. Using these for thinking and instruct. Run with different values or edit the config to override." Skip the model-selection prompt.
   - If only one is set: use it for the matching alias, prompt the user to pick/type the other.
   - If neither is set: prompt the user to type the model IDs (Claude Code has no programmatic model-list API in the agent context, so typing is the fallback). Pre-fill with the defaults `opus` and `sonnet` as suggestions.

5. **Write the config:**
   - Full JSON with `$schema`, `commit_attribution` (harness + trailer_format), `aliases` (the two resolved model IDs), `agents` (all 26 agents with the standard 7-thinking/19-instruct mapping).
   - The `agents` block is copied from the shipped template's mapping — it doesn't change per user, only the `aliases` and `harness` do.
   - Use a heredoc (`cat > <path> <<'CONFIG' ... CONFIG`) to write the file.

6. **Confirm and guide:**
   - Print: "Config written to `<path>`."
   - If project scope: "This overrides your global config for this repo. Run `/agent-orch:config --global` to set defaults for all repos."
   - If global scope: "This applies to all repos without a project-level config. Run `/agent-orch:config` (no flag) in a repo to override."

**Scope guardrails:**
- Does NOT run the full `init-plugin` wizard (no CLAUDE.md hierarchy, no plugin discovery, no snapshots)
- Does NOT touch CLAUDE.md, MCP config, or anything else
- If a config already exists at the target path, it shows the current values and asks whether to update or cancel
- Idempotent: running it twice with the same answers produces the same file

### First-Run Prompt Mechanism

**Trigger:** At session start, the OpenCode bootstrap checks for config in this order:
1. `<repo>/.agent-orch-models.json` exists?
2. `~/.config/agent-orch-models.json` exists?

If **neither** exists, the bootstrap injects a first-run preamble (in addition to the normal preamble) that instructs the agent:

> "No model configuration found. Before running any agents, ask the user:
> 1. What model should `thinking` (deep reasoning) use?
> 2. What model should `instruct` (fast execution) use?
> Then run `/agent-orch:config --global` to save their answers as the default for all repos.
> If the user wants project-specific models instead, run `/agent-orch:config` (no flag)."

**What happens next:** The agent prompts the user in chat, collects the two model IDs, runs `/agent-orch:config --global`, which writes `~/.config/agent-orch-models.json`. The next session finds the global config at Tier 2 and never prompts again.

**Claude Code users:** No first-run prompt. If `ANTHROPIC_DEFAULT_OPUS_MODEL` and `ANTHROPIC_DEFAULT_SONNET_MODEL` are set in the environment, the hook auto-fills the aliases from them — commit trailers include the real model IDs automatically. If the env vars are absent, the hook uses the literal `opus`/`sonnet` alias names, which Claude Code resolves internally. Either way, Claude Code works out of the box. If a Claude Code user wants to override (e.g., pin a different model for a specific repo), they run `/agent-orch:config` manually.

**Edge cases:**
- **User dismisses the prompt / says "later":** The bootstrap falls back to Tier 3 sentinels. Agents won't run correctly until config is created. The preamble notes this: "Agents will not work correctly until you configure models." The user can run `/agent-orch:config` any time.
- **Global exists but project config is missing:** No prompt — the global covers it (Tier 2). This is the 99% case after first run.
- **Global exists but project config is wanted (1% case):** No prompt — user explicitly runs `/agent-orch:config` (no flag) to override.
- **Preamble cache invalidation:** The first-run check happens BEFORE the preamble cache check. If the user creates a config mid-session (via `/agent-orch:config`), the cache is stale — but the next session picks it up. Acceptable since the config is usually set once.

### Hook Changes

**Current state:** `resolve_trailer_check()` has a three-tier fallback: project config → shipped config → `"legacy"`. The legacy default accepts the old `Co-authored-by: Claude ... <noreply@anthropic.com>` trailer.

**New state:** Four-tier fallback with harness awareness:

| Tier | Source | What it provides |
|------|--------|------------------|
| 1. Project | `<cwd>/.agent-orch-models.json` | `harness` value |
| 2. Global | `~/.config/agent-orch-models.json` | `harness` value |
| 3. Stdin harness | `harness` field in the stdin JSON payload | `harness` value (from the adapter) |
| 4. Hardcoded default | `"claude-code"` in the hook | Failsafe |

**Stdin harness field:** The OpenCode adapter (`.opencode/agent-orch-hooks.ts`) adds `harness: 'opencode'` to the JSON payload it passes on stdin:

```json
{"tool_name": "Bash", "tool_input": {...}, "cwd": "/path/to/repo", "harness": "opencode"}
```

Claude Code's native hook invocation doesn't include `harness` — the hook reads it with `${harness:-claude-code}` (empty → defaults to `claude-code`).

**Legacy trailer handling — accept-only, not default:**
- The `"legacy"` string is no longer returned as a harness value.
- Instead, the hook gains a separate `accepts_legacy_trailer` check: if the configured harness is `claude-code` AND the commit message has the old `Co-authored-by: Claude ... <noreply@anthropic.com>` trailer, it's ACCEPTED (backward compat for repos with existing commits), but the hook's error message for *missing* trailers always shows the new configured format.
- This means: a new repo with no config defaults to `claude-code`, expects the `claude-code/<models>` trailer, but won't reject an old-style Claude trailer if one appears. A repo with `harness: opencode` config rejects the legacy Claude trailer (correct — that's the backward-compat-inversion already built).

**Hook error messages:** Already config-driven from the prior work. The only change: when the hook falls back to Tier 4 (hardcoded `claude-code`), the error message includes "No `.agent-orch-models.json` found (project or global). Using `claude-code` defaults. Run `/agent-orch:config` to configure."

### Bootstrap Changes

**Current state:** `resolveCommitAttribution()` has a two-tier fallback: project config → shipped config (at `pluginRoot/..`). `resolveModels()` reads only the project config, falling back to `DEFAULT_MODELS` (raw aliases). The harness default is `'opencode'` (line 76) but gets overridden by the shipped config's `claude-code` value.

**New state:**

**`resolveModels(configPath, globalConfigPath)`** — three-tier:
1. Project config (`<repo>/.agent-orch-models.json`) — if present, read it
2. Global config (`~/.config/agent-orch-models.json`) — if present, read it
3. `DEFAULT_MODELS` — hardcoded `{ thinking: 'thinking', instruct: 'instruct' }` sentinels (not real model IDs — triggers the first-run prompt)

**`resolveCommitAttribution(configPath, globalConfigPath)`** — three-tier:
1. Project config → read `commit_attribution.harness`
2. Global config → read `commit_attribution.harness`
3. Hardcoded default: `harness = 'opencode'` (the bootstrap IS the OpenCode entry point)

The shipped config at `pluginRoot/..` is **no longer read** at runtime. It exists as a template only.

**First-run detection:** The bootstrap computes `configTier` from the same two `fs.existsSync` checks used to pick the config file — no separate function. The resolvers (`resolveModels`, `resolveCommitAttribution`) return `{ models, harness, configTier }` (or the caller computes `configTier` from which path was used). Either way, `configTier` is one of:
- `'project'` — project config found
- `'global'` — global config found (no project config)
- `'none'` — neither found

When `configTier === 'none'`, the preamble includes the first-run prompt block. When `configTier === 'project'` or `'global'`, the preamble is the normal one.

**Preamble cache key change:** The current `_preambleCache` is module-level and unkeyed. It becomes keyed by `directory` so that multi-project sessions (if OpenCode ever supports them) don't serve a stale preamble. Low risk but correct.

**`gitUserName()` failure handling:** Unchanged from the prior fix — returns `null`, warns to stderr, `resolveCommitAttribution` substitutes the `<git user.name not set>` placeholder.

**Removed:** The `pluginConfigPath` computation (`path.join(pluginRoot, '..', '.agent-orch-models.json')`) and the shipped-config read branch.

### README + CHEAT-SHEET Updates

**README — "Install for OpenCode" section, add after the install snippet:**

```
### First-Run Configuration

On your first session, the agent will prompt you for your model IDs and save
them globally. To set them now instead:

> /agent-orch:config --global

To override models for a specific repo:

> /agent-orch:config
```

**README — "Install for Claude Code" section, add:**

```
### Model Configuration (Optional)

Claude Code works out of the box. If you set `ANTHROPIC_DEFAULT_OPUS_MODEL`
and `ANTHROPIC_DEFAULT_SONNET_MODEL` in your environment, the plugin uses
those for commit trailers automatically — no config needed.

To override per-repo or set global defaults:

> /agent-orch:config            # per-repo override
> /agent-orch:config --global   # defaults for all repos
```

**CHEAT-SHEET — "Model Configuration" table, add rows:**

```
| `/agent-orch:config` | Write project-level `.agent-orch-models.json` (model IDs + harness) | Per-repo override (1% case) |
| `/agent-orch:config --global` | Write `~/.config/agent-orch-models.json` | Set defaults for all repos (99% case) |
```

**Docs sync:** Both files must reference `/agent-orch:config`, agent counts stay 26, skills diff must remain empty per the repo CLAUDE.md validation.

## Files Changed

| File | Change |
|------|--------|
| `.opencode/plugins/agent-orch.js` | `resolveModels` + `resolveCommitAttribution`: add global config tier, drop shipped-config read, add `configTier` return, hardcode `opencode` default, add first-run preamble block, key preamble cache by `directory` |
| `.opencode/agent-orch-hooks.ts` | Add `harness: 'opencode'` to stdin payload in both `runHook` calls |
| `plugins/agent-orch/hooks/validate-ai-commit.sh` | `resolve_trailer_check`: add global config tier, read `harness` from stdin, default to `claude-code` (not `legacy`), separate `accepts_legacy_trailer` check, read `ANTHROPIC_DEFAULT_OPUS_MODEL`/`ANTHROPIC_DEFAULT_SONNET_MODEL` env vars for Tier 3 alias auto-fill |
| `plugins/agent-orch/skills/config/SKILL.md` | **NEW** — the `/agent-orch:config` skill. OpenCode: runs `opencode models` and presents a numbered picker. Claude Code: auto-fills from `ANTHROPIC_DEFAULT_*` env vars, prompts only as fallback |
| `README.md` | First-run config section (OpenCode + Claude Code), update install steps |
| `CHEAT-SHEET.md` | `/agent-orch:config` rows in skills table + model config section |
| `.agent-orch-models.json` → `.agent-orch-models.example.json` | Rename: clarify it's a template (nothing reads it at runtime now) |
| `plugins/agent-orch/skills/init-plugin/SKILL.md` | Update the config-generation step to mention `/agent-orch:config` as the lightweight alternative; update any reference to the template filename from `.agent-orch-models.json` to `.agent-orch-models.example.json` |
| `plugins/agent-orch/skills/inherit-plugin/SKILL.md` | Same: update template filename references to `.agent-orch-models.example.json` |

## Testing

Verification commands (this repo has no test framework):

1. **Bootstrap path resolution:** `node --check .opencode/plugins/agent-orch.js` — syntax valid
2. **Hook syntax:** `bash -n plugins/agent-orch/hooks/validate-ai-commit.sh` — syntax valid
3. **Config tier 1 (project wins):** project config with `harness: opencode` + global config with `harness: claude-code` → bootstrap resolves `opencode`
4. **Config tier 2 (global fallback):** no project config, global config with `harness: opencode`, `aliases: {thinking: "glm-5.2", instruct: "glm-5.2"}` → bootstrap resolves `opencode` + GLM models
5. **Config tier 3 (no config → first-run):** no project, no global → bootstrap returns `configTier: 'none'`, preamble includes first-run prompt, models are sentinels
6. **Hook tier 1 (project config):** project config present → hook reads `harness` from it, ignores stdin harness
7. **Hook tier 2 (global config):** no project config, global config present → hook reads `harness` from global
8. **Hook tier 3 (stdin harness):** no config at all, stdin has `harness: "opencode"` → hook uses `opencode`
9. **Hook tier 4 (hardcoded default):** no config, no stdin harness → hook uses `claude-code`
10. **Hook legacy accept:** harness is `claude-code`, commit has old `Co-authored-by: Claude <noreply@anthropic.com>` → ACCEPTED (backward compat)
11. **Hook legacy reject:** harness is `opencode`, commit has old Claude trailer → REJECTED (backward-compat-inversion preserved)
12. **Hook env-var auto-fill (Claude Code):** no config, `ANTHROPIC_DEFAULT_OPUS_MODEL=us.anthropic.claude-opus-5` and `ANTHROPIC_DEFAULT_SONNET_MODEL=global.anthropic.claude-sonnet-5` set → hook's commit trailer uses those model IDs, not literal `opus`/`sonnet`
13. **Hook env-var absent (Claude Code):** no config, env vars unset → hook uses literal `opus`/`sonnet` alias names (Claude Code resolves internally)
14. **Shipped config not read:** delete project config, set global config, verify the shipped `.agent-orch-models.example.json` is never accessed (e.g., temp-rename it, behavior unchanged)
15. **`/agent-orch:config` skill exists:** `ls plugins/agent-orch/skills/config/SKILL.md`
16. **OpenCode model picker:** `opencode models` command runs and produces a list of `provider_id/model_id` lines (verify on current machine)
17. **Docs sync:** README and CHEAT-SHEET both reference `/agent-orch:config`, agent counts still 26, skills diff empty

## Scope Guardrails

- No changes to agent files (the 26 `orchestrate-*.md` are unchanged — their `model: thinking`/`model: instruct` frontmatter is already correct)
- No changes to the 6 plugin skill-path registrations (that works already)
- No changes to MCP config template
- No new dependencies (pure bash + JS/TS, same as before)

## Backward Compatibility

- **Existing Claude Code repos with no config:** Previously fell back to the shipped `claude-code` config. Now fall back to the hardcoded `claude-code` default in the hook. Same harness label, same model names — behavior unchanged.
- **Existing repos with a project `.agent-orch-models.json`:** Unaffected — project config is still Tier 1, wins always.
- **Existing repos relying on the legacy Claude trailer:** The hook still accepts it when harness is `claude-code` (accept-only, not default). No regression.
- **The shipped `.agent-orch-models.json` rename:** Anyone who manually copied this file to their repo as their project config is unaffected — their copy is the project config (Tier 1). The rename only affects the plugin repo's own root file, which is no longer read at runtime.
- **`init-plugin` and `inherit-plugin`:** Still scaffold from the template (now `.agent-orch-models.example.json`). The generated config goes to the user's repo root as their project config. No change in behavior.
