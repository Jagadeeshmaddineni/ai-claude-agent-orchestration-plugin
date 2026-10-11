# Config Discovery: Harness-Native Defaults + Layered Config — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the blind spot where OpenCode sessions on repos with no `.agent-orch-models.json` inherit Claude Code values, by giving each harness native defaults, adding a global config tier, and shipping a `/agent-orch:config` skill with a model picker (OpenCode) and env-var auto-fill (Claude Code).

**Architecture:** Each harness knows its own identity at runtime — the OpenCode bootstrap IS the OpenCode entry point (defaults to `opencode`); the hook adapter passes `harness: 'opencode'` in the stdin payload. Config is layered: project (`<repo>/.agent-orch-models.json`) → global (`~/.config/agent-orch-models.json`) → harness-native hardcoded defaults. The shipped `.agent-orch-models.json` becomes a template (renamed to `.agent-orch-models.example.json`), no longer read at runtime. A new `/agent-orch:config` skill writes project or global config, using `opencode models` to present a numbered picker (OpenCode) or `ANTHROPIC_DEFAULT_OPUS_MODEL`/`ANTHROPIC_DEFAULT_SONNET_MODEL` env vars to auto-fill (Claude Code).

**Tech Stack:** Bash (hook), JavaScript/TypeScript (OpenCode bootstrap + adapter, run via Bun), Markdown (skill docs, README, CHEAT-SHEET).

## Global Constraints

- Config resolution tiers (both bootstrap and hook): project `<cwd>/.agent-orch-models.json` → global `~/.config/agent-orch-models.json` → harness-native hardcoded default. The shipped `.agent-orch-models.example.json` is NEVER read at runtime.
- OpenCode bootstrap hardcoded default: `harness = 'opencode'`, `aliases = { thinking: 'thinking', instruct: 'instruct' }` (sentinels — trigger first-run prompt).
- Claude Code hook hardcoded default: `harness = 'claude-code'`. Hook reads `ANTHROPIC_DEFAULT_OPUS_MODEL` and `ANTHROPIC_DEFAULT_SONNET_MODEL` env vars at Tier 3 to auto-fill the model IDs in the trailer (falls back to literal `opus`/`sonnet` if env vars absent).
- Hook adapter passes `harness: 'opencode'` in the stdin JSON payload to the bash hook. Hook reads it via `${harness:-claude-code}` when no config exists.
- Hook legacy-trailer acceptance: when harness is `claude-code`, the old `Co-authored-by: Claude ... <noreply@anthropic.com>` trailer is ACCEPTED (backward compat). When harness is `opencode`, it is REJECTED.
- Global config path: `~/.config/agent-orch-models.json` (via `os.homedir()` in JS, `$HOME` in bash).
- `/agent-orch:config` skill: OpenCode runs `opencode models` for a numbered picker; Claude Code reads `ANTHROPIC_DEFAULT_*` env vars and auto-fills (prompts only if env vars absent).
- The 26-agent `thinking`/`instruct` mapping is unchanged (7 thinking, 19 instruct).
- README.md and CHEAT-SHEET.md must stay in sync per the repo's CLAUDE.md (skills diff empty, 26 agents in both).
- No comments in code unless the surrounding file already uses comments (the hook and bootstrap both use comments — preserve that style).
- macOS environment: `sed -i ''`, `bash` scripts use `set -uo pipefail`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `.opencode/plugins/agent-orch.js` | OpenCode bootstrap: register skills, resolve config (3-tier), inject preamble (with first-run prompt), wire hooks |
| `.opencode/agent-orch-hooks.ts` | TS adapter: bridge OpenCode `tool.execute.before` to bash hooks, pass `harness: 'opencode'` in stdin |
| `plugins/agent-orch/hooks/validate-ai-commit.sh` | Bash hook: validate commit trailer, 4-tier config resolution (project → global → stdin → claude-code default), env-var auto-fill, legacy accept |
| `plugins/agent-orch/skills/config/SKILL.md` | **NEW** — `/agent-orch:config` skill: model picker (OpenCode) or env-var auto-fill (Claude Code), writes project or global config |
| `.agent-orch-models.example.json` | **RENAMED** from `.agent-orch-models.json` — template only, nothing reads it at runtime |
| `README.md` | Dual-harness install docs: first-run config (OpenCode), env-var auto-config (Claude Code), `/agent-orch:config` usage |
| `CHEAT-SHEET.md` | Quick-reference: `/agent-orch:config` rows, model config section updates |
| `plugins/agent-orch/skills/init-plugin/SKILL.md` | Update config-generation step: reference `/agent-orch:config` as lightweight alternative, update template filename |
| `plugins/agent-orch/skills/inherit-plugin/SKILL.md` | Update template filename references to `.agent-orch-models.example.json` |

---

### Task 1: Rename shipped config to template + update init-plugin/inherit-plugin references

**Files:**
- Rename: `.agent-orch-models.json` → `.agent-orch-models.example.json`
- Modify: `plugins/agent-orch/skills/init-plugin/SKILL.md:561-609`
- Modify: `plugins/agent-orch/skills/inherit-plugin/SKILL.md:725-773`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `.agent-orch-models.example.json` as the canonical template filename that later tasks reference

- [ ] **Step 1: Rename the shipped config file**

Run:
```bash
git mv .agent-orch-models.json .agent-orch-models.example.json
```

- [ ] **Step 2: Update init-plugin/SKILL.md to reference the template filename and mention /agent-orch:config**

In `plugins/agent-orch/skills/init-plugin/SKILL.md`, replace the line at 565:
```
Write `.agent-orch-models.json`:
```
with:
```
Write `.agent-orch-models.json` (see `.agent-orch-models.example.json` in the plugin repo for a template — or run `/agent-orch:config` for a guided setup that picks models from a list):
```

Then replace the line at 609:
```
If the user is on OpenCode, ask whether they want to set the `aliases` to their full model IDs now (e.g., `ssnc-gateway/zai-org/GLM-5.2-FP8`) and set `commit_attribution.harness` to `"opencode"`.
```
with:
```
If the user is on OpenCode, recommend running `/agent-orch:config` instead — it presents a numbered picker of available models (via `opencode models`) and writes the config automatically. If they prefer to edit by hand, set the `aliases` to their full model IDs (e.g., `ssnc-gateway/zai-org/GLM-5.2-FP8`) and set `commit_attribution.harness` to `"opencode"`.
```

- [ ] **Step 3: Update inherit-plugin/SKILL.md to reference the template filename**

In `plugins/agent-orch/skills/inherit-plugin/SKILL.md`, replace the heredoc target at line 730:
```
cat > .agent-orch-models.json <<'CONFIG'
```
with:
```
cat > .agent-orch-models.json <<'CONFIG'  # template: .agent-orch-models.example.json in the plugin repo
```

Then replace the OpenCode note (find the line containing "If the user is on OpenCode, set `commit_attribution.harness`"):
```
If the user is on OpenCode, set `commit_attribution.harness` to `"opencode"` and ask for their model IDs.
```
with:
```
If the user is on OpenCode, recommend running `/agent-orch:config` instead — it presents a numbered picker of available models and writes the config automatically. If they prefer to edit by hand, set `commit_attribution.harness` to `"opencode"` and the `aliases` to their full model IDs.
```

- [ ] **Step 4: Verify no runtime code references the old shipped filename**

Run:
```bash
grep -rn '\.agent-orch-models\.json' .opencode/ plugins/agent-orch/hooks/
```
Expected: the bootstrap (`agent-orch.js`) and hook (`validate-ai-commit.sh`) still reference `.agent-orch-models.json` (the project-config filename, which is correct — users create that file in their repo). The shipped template is now `.agent-orch-models.example.json`. No code should reference the template filename at runtime — confirm the grep hits are for the project-config path, not the shipped-template path.

- [ ] **Step 5: Commit**

```bash
git add .agent-orch-models.example.json plugins/agent-orch/skills/init-plugin/SKILL.md plugins/agent-orch/skills/inherit-plugin/SKILL.md
git commit -m "refactor: rename shipped config to .agent-orch-models.example.json (template only)

Nothing reads the shipped config at runtime after this change — each
harness uses its own native defaults. The file becomes a pure template.
init-plugin and inherit-plugin now mention /agent-orch:config as the
lightweight alternative to hand-editing."
```

---

### Task 2: Update the OpenCode hook adapter to pass `harness: 'opencode'` in stdin

**Files:**
- Modify: `.opencode/agent-orch-hooks.ts:39-43, 51-55`

**Interfaces:**
- Consumes: nothing
- Produces: the bash hook receives `harness: 'opencode'` in its stdin JSON payload, which Task 3 reads

- [ ] **Step 1: Add `harness: 'opencode'` to both runHook payloads**

In `.opencode/agent-orch-hooks.ts`, replace the two `runHook` call payloads. At lines 39-43, replace:
```typescript
        const result = runHook("validate-ai-commit.sh", {
          tool_name: claudeTool,
          tool_input: args,
          cwd: sessionCwd,
        })
```
with:
```typescript
        const result = runHook("validate-ai-commit.sh", {
          tool_name: claudeTool,
          tool_input: args,
          cwd: sessionCwd,
          harness: "opencode",
        })
```

At lines 51-55, replace:
```typescript
      const result = runHook("guard-worktree-writes.sh", {
        tool_name: claudeTool,
        tool_input: args,
        cwd: sessionCwd,
      })
```
with:
```typescript
      const result = runHook("guard-worktree-writes.sh", {
        tool_name: claudeTool,
        tool_input: args,
        cwd: sessionCwd,
        harness: "opencode",
      })
```

- [ ] **Step 2: Verify the file is syntactically valid**

Run:
```bash
node --check .opencode/agent-orch-hooks.ts 2>&1 || true
```
Note: `node --check` may fail on TypeScript syntax (`import type`). If it errors on the `import type` line, that's expected — the file is loaded by Bun, not Node. Verify manually that the two payloads now include `harness: "opencode"`.

- [ ] **Step 3: Verify the harness field is present in both payloads**

Run:
```bash
grep -n "harness:" .opencode/agent-orch-hooks.ts
```
Expected: 2 matches, both `harness: "opencode",`

- [ ] **Step 4: Commit**

```bash
git add .opencode/agent-orch-hooks.ts
git commit -m "feat: hook adapter passes harness: 'opencode' in stdin payload

The bash hook reads this to know the runtime harness when no config
exists. Claude Code's native hook invocation doesn't include this
field, so the hook defaults to 'claude-code' when it's absent."
```

---

### Task 3: Rewrite the hook's config resolution (4-tier + env-var auto-fill + legacy accept)

**Files:**
- Modify: `plugins/agent-orch/hooks/validate-ai-commit.sh:63-184`

**Interfaces:**
- Consumes: `harness` field in stdin JSON payload (from Task 2's adapter)
- Produces: the hook resolves `harness` via 4-tier fallback (project → global → stdin → `claude-code` default), auto-fills model IDs from `ANTHROPIC_DEFAULT_*` env vars, and accepts legacy Claude trailers when harness is `claude-code`

- [ ] **Step 1: Replace `resolve_trailer_check` with the 4-tier version**

In `plugins/agent-orch/hooks/validate-ai-commit.sh`, replace the entire `resolve_trailer_check` function (lines 63-102) with:

```bash
# Resolve the harness for commit trailer validation. Four-tier fallback:
# 1. Project config: <cwd>/.agent-orch-models.json
# 2. Global config: ~/.config/agent-orch-models.json
# 3. Stdin harness field (passed by the OpenCode adapter)
# 4. Hardcoded default: "claude-code"
# Returns the harness string. Also echoes the resolved config file path
# (empty if none found) on a second line for use by the caller.
resolve_trailer_check() {
    local cwd="$1"
    local stdin_harness="$2"
    local global_cfg="${HOME}/.config/agent-orch-models.json"

    for cfg_file in "${cwd}/.agent-orch-models.json" "${global_cfg}"; do
        if [ -f "$cfg_file" ]; then
            if command -v jq >/dev/null 2>&1; then
                local h
                h=$(jq -r '.commit_attribution.harness // empty' "$cfg_file" 2>/dev/null)
                if [ -n "$h" ]; then printf '%s\n%s\n' "$h" "$cfg_file"; return; fi
            elif command -v python3 >/dev/null 2>&1; then
                local h
                h=$(python3 -c "
import json, sys
try:
    cfg = json.load(open(sys.argv[1]))
    h = cfg.get('commit_attribution', {}).get('harness', '')
    print(h)
except Exception:
    pass
" "$cfg_file" 2>/dev/null)
                if [ -n "$h" ]; then printf '%s\n%s\n' "$h" "$cfg_file"; return; fi
            fi
        fi
    done

    # No config found — use stdin harness or hardcoded default.
    if [ -n "$stdin_harness" ]; then
        printf '%s\n\n' "$stdin_harness"
    else
        printf '%s\n\n' "claude-code"
    fi
}
```

- [ ] **Step 2: Add a function to extract the `harness` field from stdin**

After the `extract_command` function (before `resolve_trailer_check`), add:

```bash
# Extract the harness field from the stdin JSON payload (passed by the
# OpenCode adapter). Empty when invoked by Claude Code's native hook.
extract_harness() {
    if command -v jq >/dev/null 2>&1; then
        printf '%s' "$1" | jq -r '.harness // empty' 2>/dev/null
        return
    fi
    if command -v python3 >/dev/null 2>&1; then
        printf '%s' "$1" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('harness', ''))
except Exception:
    pass
" 2>/dev/null
        return
    fi
    printf ''
}
```

- [ ] **Step 3: Add a function to resolve model IDs from env vars (Claude Code auto-fill)**

After the `git_user_name` function, add:

```bash
# Resolve the model IDs for the commit trailer. When no config exists
# and the harness is claude-code, read ANTHROPIC_DEFAULT_OPUS_MODEL and
# ANTHROPIC_DEFAULT_SONNET_MODEL env vars. Falls back to literal
# opus/sonnet alias names if the env vars are unset.
resolve_default_models() {
    local harness="$1"
    local cfg_file="$2"
    if [ -n "$cfg_file" ] && [ -f "$cfg_file" ]; then
        # Config exists — extract distinct model IDs from the aliases.
        if command -v jq >/dev/null 2>&1; then
            local t i
            t=$(jq -r '.aliases.thinking // empty' "$cfg_file" 2>/dev/null)
            i=$(jq -r '.aliases.instruct // empty' "$cfg_file" 2>/dev/null)
            if [ -n "$t" ] && [ -n "$i" ]; then
                printf '%s,%s' "$t" "$i"
                return
            fi
        elif command -v python3 >/dev/null 2>&1; then
            python3 -c "
import json, sys
try:
    cfg = json.load(open(sys.argv[1]))
    t = cfg.get('aliases', {}).get('thinking', '')
    i = cfg.get('aliases', {}).get('instruct', '')
    if t and i:
        print(f'{t},{i}')
except Exception:
    pass
" "$cfg_file" 2>/dev/null
            return
        fi
    fi
    # No config — use env vars (claude-code) or sentinels.
    if [ "$harness" = "claude-code" ]; then
        local t="${ANTHROPIC_DEFAULT_OPUS_MODEL:-opus}"
        local i="${ANTHROPIC_DEFAULT_SONNET_MODEL:-sonnet}"
        printf '%s,%s' "$t" "$i"
    else
        printf '%s,%s' "thinking" "instruct"
    fi
}
```

- [ ] **Step 4: Replace the validation block (lines 127-184) with the new 4-tier logic**

Replace the block starting at `# Determine trailer expectation: configured format or legacy fallback.` (line 127) through the end of the file (line 184) with:

```bash
# Determine trailer expectation: 4-tier config resolution.
STDIN_HARNESS=$(extract_harness "$INPUT")
RESOLVED=$(resolve_trailer_check "$CWD" "$STDIN_HARNESS")
CONFIGURED_HARNESS=$(printf '%s' "$RESOLVED" | sed -n '1p')
RESOLVED_CFG_FILE=$(printf '%s' "$RESOLVED" | sed -n '2p')
GH_USER=$(git_user_name "$CWD")

if [ -z "$GH_USER" ]; then
    {
        echo "AI Code Governance Policy Violation: git user.name not set."
        echo ""
        echo "The commit trailer requires the GitHub username (from 'git config user.name')."
        echo "Set it with: git config user.name \"<your-github-username>\""
    } >&2
    exit 2
fi

# Resolve the model IDs for the trailer (from config or env vars).
MODELS_STR=$(resolve_default_models "$CONFIGURED_HARNESS" "$RESOLVED_CFG_FILE")

# Escape regex metacharacters for the trailer regex.
GH_USER_ESC=$(printf '%s' "$GH_USER" | sed 's/[][\\.^$*+?(){}|]/\\&/g')
HARNESS_ESC=$(printf '%s' "$CONFIGURED_HARNESS" | sed 's/[][\\.^$*+?(){}|]/\\&/g')
TRAILER_REGEX="Co-authored-by:[[:space:]]+${GH_USER_ESC}[[:space:]]\+[[:space:]]${HARNESS_ESC}/[^[:space:]]+[[:space:]]<${GH_USER_ESC}@users\.noreply\.github\.com>"

if printf '%s' "$COMMAND" | grep -qiE "$TRAILER_REGEX"; then
    # Configured-format trailer present — allow.
    exit 0
fi

# Legacy accept: when harness is claude-code, accept the old Claude trailer
# for backward compatibility with repos that have existing commits.
if [ "$CONFIGURED_HARNESS" = "claude-code" ]; then
    if printf '%s' "$COMMAND" | grep -qiE "Co-authored-by:[[:space:]]+Claude[^<]*<noreply@anthropic\.com>"; then
        exit 0
    fi
fi

# Trailer missing or malformed — reject with guidance.
{
    echo "AI Code Governance Policy Violation: Missing or malformed Co-authored-by trailer."
    echo ""
    echo "Expected (harness: ${CONFIGURED_HARNESS}):"
    echo "  Co-authored-by: ${GH_USER} + ${CONFIGURED_HARNESS}/${MODELS_STR} <${GH_USER}@users.noreply.github.com>"
    echo ""
    if [ -z "$RESOLVED_CFG_FILE" ]; then
        echo "No .agent-orch-models.json found (project or global). Using ${CONFIGURED_HARNESS} defaults."
        echo "Run /agent-orch:config to configure, or /agent-orch:config --global for all repos."
        echo ""
    fi
    echo "See: plugins/agent-orch/policies/ai-code-governance.md"
} >&2
exit 2
```

- [ ] **Step 5: Verify the hook is syntactically valid**

Run:
```bash
bash -n plugins/agent-orch/hooks/validate-ai-commit.sh && echo "syntax OK"
```
Expected: `syntax OK`

- [ ] **Step 6: Test — no config, no stdin harness, Claude Code default**

Run:
```bash
cd /tmp && rm -rf test-hook3 && mkdir test-hook3 && cd test-hook3
git init -q && git config user.name "testuser"
HOOK=/Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
# No config, no harness in stdin (simulates Claude Code native invocation)
jq -nc '{tool_input:{command:"git commit -m \"test\""},cwd:"/tmp/test-hook3"}' | bash $HOOK
echo "exit: $?"
# Should exit 2 with "harness: claude-code" in the error
```
Expected: exit 2, error message shows `harness: claude-code`

- [ ] **Step 7: Test — no config, stdin harness=opencode**

Run:
```bash
cd /tmp/test-hook3
HOOK=/Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
jq -nc '{tool_input:{command:"git commit -m \"test\""},cwd:"/tmp/test-hook3",harness:"opencode"}' | bash $HOOK
echo "exit: $?"
# Should exit 2 with "harness: opencode"
rm -rf /tmp/test-hook3
```
Expected: exit 2, error message shows `harness: opencode`

- [ ] **Step 8: Test — project config wins over global**

Run:
```bash
cd /tmp && rm -rf test-proj && mkdir test-proj && cd test-proj
mkdir -p ~/.config
cat > ~/.config/agent-orch-models.json <<'EOF'
{"commit_attribution":{"harness":"claude-code"},"aliases":{"thinking":"opus","instruct":"sonnet"},"agents":{}}
EOF
cat > .agent-orch-models.json <<'EOF'
{"commit_attribution":{"harness":"opencode"},"aliases":{"thinking":"glm","instruct":"glm"},"agents":{}}
EOF
git init -q && git config user.name "testuser"
HOOK=/Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
jq -nc '{tool_input:{command:"git commit -m \"test\""},cwd:"/tmp/test-proj",harness:"claude-code"}' | bash $HOOK 2>&1 | grep "harness:"
echo "---"
# Should show "harness: opencode" (project wins)
rm -rf /tmp/test-proj ~/.config/agent-orch-models.json
```
Expected: error shows `harness: opencode` (project config wins over both global and stdin)

- [ ] **Step 9: Test — global config used when project absent**

Run:
```bash
cd /tmp && rm -rf test-glob && mkdir test-glob && cd test-glob
mkdir -p ~/.config
cat > ~/.config/agent-orch-models.json <<'EOF'
{"commit_attribution":{"harness":"opencode"},"aliases":{"thinking":"glm","instruct":"glm"},"agents":{}}
EOF
git init -q && git config user.name "testuser"
HOOK=/Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
jq -nc '{tool_input:{command:"git commit -m \"test\""},cwd:"/tmp/test-glob",harness:"claude-code"}' | bash $HOOK 2>&1 | grep "harness:"
# Should show "harness: opencode" (global wins over stdin)
rm -rf /tmp/test-glob ~/.config/agent-orch-models.json
```
Expected: error shows `harness: opencode` (global config wins over stdin harness)

- [ ] **Step 10: Test — legacy Claude trailer accepted when harness=claude-code**

Run:
```bash
cd /tmp && rm -rf test-legacy && mkdir test-legacy && cd test-legacy
git init -q && git config user.name "testuser"
HOOK=/Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
jq -nc '{tool_input:{command:"git commit -m \"test\n\nCo-authored-by: Claude Code <noreply@anthropic.com>\""},cwd:"/tmp/test-legacy"}' | bash $HOOK
echo "exit: $?"
# Should exit 0 (legacy accept when harness=claude-code, no config)
rm -rf /tmp/test-legacy
```
Expected: exit 0 (legacy trailer accepted)

- [ ] **Step 11: Test — legacy Claude trailer rejected when harness=opencode**

Run:
```bash
cd /tmp && rm -rf test-legacy2 && mkdir test-legacy2 && cd test-legacy2
git init -q && git config user.name "testuser"
HOOK=/Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
jq -nc '{tool_input:{command:"git commit -m \"test\n\nCo-authored-by: Claude Code <noreply@anthropic.com>\""},cwd:"/tmp/test-legacy2",harness:"opencode"}' | bash $HOOK
echo "exit: $?"
# Should exit 2 (legacy rejected when harness=opencode)
rm -rf /tmp/test-legacy2
```
Expected: exit 2 (legacy trailer rejected)

- [ ] **Step 12: Test — env-var auto-fill (Claude Code, no config)**

Run:
```bash
cd /tmp && rm -rf test-env && mkdir test-env && cd test-env
git init -q && git config user.name "testuser"
HOOK=/Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
ANTHROPIC_DEFAULT_OPUS_MODEL="us.anthropic.claude-opus-5" \
ANTHROPIC_DEFAULT_SONNET_MODEL="global.anthropic.claude-sonnet-5" \
  bash -c 'jq -nc '"'"'{tool_input:{command:"git commit -m \"test\""},cwd:"/tmp/test-env"}'"'"'' \
  | ANTHROPIC_DEFAULT_OPUS_MODEL="us.anthropic.claude-opus-5" \
    ANTHROPIC_DEFAULT_SONNET_MODEL="global.anthropic.claude-sonnet-5" \
    bash $HOOK 2>&1 | grep "Expected"
# Should show "claude-code/us.anthropic.claude-opus-5,global.anthropic.claude-sonnet-5"
rm -rf /tmp/test-env
```
Expected: error shows `claude-code/us.anthropic.claude-opus-5,global.anthropic.claude-sonnet-5`

- [ ] **Step 13: Commit**

```bash
git add plugins/agent-orch/hooks/validate-ai-commit.sh
git commit -m "feat: hook 4-tier config resolution + env-var auto-fill + legacy accept

- resolve_trailer_check: project → global → stdin harness → claude-code
- extract_harness: reads harness field from stdin (OpenCode adapter)
- resolve_default_models: reads ANTHROPIC_DEFAULT_OPUS_MODEL/SONNET_MODEL
  env vars at Tier 3 for Claude Code auto-fill
- Legacy Claude trailer accepted only when harness=claude-code
- No longer reads the shipped .agent-orch-models.json at runtime"
```

---

### Task 4: Rewrite the bootstrap's config resolution (3-tier + first-run detection)

**Files:**
- Modify: `.opencode/plugins/agent-orch.js:47-90, 92-139, 141-176`

**Interfaces:**
- Consumes: nothing new (reads project + global config paths)
- Produces: `configTier` value (`'project'` / `'global'` / `'none'`) driving first-run preamble injection; resolved `models` and `commitTrailer` with correct harness

- [ ] **Step 1: Replace `resolveModels` with the 3-tier version**

In `.opencode/plugins/agent-orch.js`, replace the `resolveModels` function (lines 58-69) with:

```javascript
function resolveModels(configPath, globalConfigPath) {
  for (const p of [configPath, globalConfigPath]) {
    if (fs.existsSync(p)) {
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
      const resolved = {};
      for (const [agent, alias] of Object.entries(cfg.agents || {})) {
        resolved[agent] = (cfg.aliases && cfg.aliases[alias]) || alias;
      }
      return resolved;
    }
  }
  console.warn('[agent-orch] No .agent-orch-models.json found (project or global) — using sentinel defaults');
  return DEFAULT_MODELS;
}
```

- [ ] **Step 2: Replace `resolveCommitAttribution` with the 3-tier version that returns configTier**

Replace the `resolveCommitAttribution` function (lines 71-90) with:

```javascript
function resolveCommitAttribution(configPath, globalConfigPath, directory) {
  const ghUserRaw = gitUserName(directory);
  const ghUser = ghUserRaw === null ? '<git user.name not set>' : ghUserRaw;
  let harness = 'opencode';
  let models;
  let configTier = 'none';
  if (fs.existsSync(configPath)) {
    configTier = 'project';
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    harness = (cfg.commit_attribution && cfg.commit_attribution.harness) || harness;
    models = resolveModels(configPath, globalConfigPath);
  } else if (fs.existsSync(globalConfigPath)) {
    configTier = 'global';
    const cfg = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
    harness = (cfg.commit_attribution && cfg.commit_attribution.harness) || harness;
    models = resolveModels(configPath, globalConfigPath);
  } else {
    console.warn('[agent-orch] No .agent-orch-models.json found — using opencode defaults. Run /agent-orch:config --global to configure.');
    models = DEFAULT_MODELS;
  }
  const distinctModels = [...new Set(Object.values(models))];
  const modelsStr = distinctModels.join(',');
  const email = `${ghUser}@users.noreply.github.com`;
  const trailer = `Co-authored-by: ${ghUser} + ${harness}/${modelsStr} <${email}>`;
  return { trailer, configTier };
}
```

- [ ] **Step 3: Update `buildPreamble` to accept `configTier` and inject first-run prompt**

Replace the `buildPreamble` function (lines 92-139) with:

```javascript
function buildPreamble(directory, models, commitTrailer, configTier) {
  const cacheKey = directory;
  if (_preambleCache && _preambleCache[cacheKey]) return _preambleCache[cacheKey];

  const modelTable = Object.entries(models)
    .map(([agent, model]) => `- ${agent}: ${model}`)
    .join('\n');

  const firstRunBlock = configTier === 'none'
    ? `
**⚠️ No model configuration found.**
Before running any agents, ask the user:
1. What model should \`thinking\` (deep reasoning) use?
2. What model should \`instruct\` (fast execution) use?
Then run \`/agent-orch:config --global\` to save their answers as the default for all repos.
If the user wants project-specific models instead, run \`/agent-orch:config\` (no flag).
Agents will not work correctly until you configure models.
`
    : '';

  const preamble = `<EXTREMELY_IMPORTANT>
You are running in OpenCode with the agent-orch orchestration plugin.
${firstRunBlock}
**Tool Mapping for OpenCode:**
When skills or agents reference Claude Code tool names, substitute OpenCode equivalents:
- \`Bash\` → \`bash\`
- \`Write\` → \`write\`
- \`Edit\` → \`edit\`
- \`MultiEdit\` → \`edit\` (multi-edit)
- \`NotebookEdit\` → \`edit\` (notebook)
- "Create a todo" / "mark complete in todo list" → \`todowrite\`
- \`Subagent (general-purpose):\` → \`task\` with \`subagent_type: "general"\`
- Invoke a skill → OpenCode's native \`skill\` tool
- Read files → \`read\`
- Create, edit, or delete files → \`edit\` / \`write\`
- Run shell commands → \`bash\`
- Search file contents → \`grep\`, \`glob\`
- Fetch a URL → \`webfetch\`

**Skill namespace mapping:**
Claude Code slash commands like \`/agent-orch:brainstorm\` map to OpenCode skills loaded from \`plugins/<name>/skills/\`. Use OpenCode's native \`skill\` tool to list and load them.

**Agent model table (resolved from .agent-orch-models.json):**
${modelTable}

**Commit attribution for this session:**
${commitTrailer}
(configured in .agent-orch-models.json → commit_attribution; gh_user from \`git config user.name\`)
Every AI-generated commit MUST end with this trailer. The \`validate-ai-commit.sh\` hook enforces it.

**Entry points:**
Pick the entry point that fits the task:
- /agent-orch:brainstorm (design before code) → /agent-orch:build (standalone) or /agent-orch:implement (spec-kit)
- /agent-orch:bugfix (root-cause fix)
- /agent-orch:make (full feature lifecycle: worktree/branch + PR)
- /agent-orch:config (configure models + commit trailer)
If a skill might apply, invoke it to check.
</EXTREMELY_IMPORTANT>`;

  if (!_preambleCache) _preambleCache = {};
  _preambleCache[cacheKey] = preamble;
  return preamble;
}
```

- [ ] **Step 4: Update the `AgentOrchPlugin` function to compute globalConfigPath and configTier**

Replace the `AgentOrchPlugin` function (lines 141-176) with:

```javascript
export const AgentOrchPlugin = async ({ client, directory, worktree }) => {
  const pluginsRoot = path.resolve(__dirname, '../../plugins');
  const modelConfigPath = path.resolve(directory, '.agent-orch-models.json');
  const globalConfigPath = path.resolve(process.env.HOME || '', '.config', 'agent-orch-models.json');
  const sessionCwd = worktree || directory;

  const models = resolveModels(modelConfigPath, globalConfigPath);
  const { trailer: commitTrailer, configTier } = resolveCommitAttribution(modelConfigPath, globalConfigPath, directory);
  const hookHandler = createHookHandler(sessionCwd);

  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      for (const name of PLUGIN_NAMES) {
        const skillsDir = path.join(pluginsRoot, name, 'skills');
        if (fs.existsSync(skillsDir)) {
          if (!config.skills.paths.includes(skillsDir)) {
            config.skills.paths.push(skillsDir);
          }
        }
      }
    },

    'experimental.chat.messages.transform': async (_input, output) => {
      const preamble = buildPreamble(directory, models, commitTrailer, configTier);
      if (!output.messages || !output.messages.length) return;
      const firstUser = output.messages.find(m => m.info && m.info.role === 'user');
      if (!firstUser || !firstUser.parts || !firstUser.parts.length) return;
      if (firstUser.parts.some(p => p.type === 'text' && p.text && p.text.includes('EXTREMELY_IMPORTANT'))) return;
      const ref = firstUser.parts[0];
      firstUser.parts.unshift({ ...ref, type: 'text', text: preamble });
    },

    'tool.execute.before': hookHandler,
  };
};
```

- [ ] **Step 5: Update the `_preambleCache` declaration to be an object keyed by directory**

Replace line 47:
```javascript
let _preambleCache = undefined;
```
with:
```javascript
let _preambleCache = undefined;
```
(This stays the same — the cache is now initialized as `{}` inside `buildPreamble` on first use. No change needed here, but verify the `buildPreamble` function handles the `undefined` → `{}` transition, which it does in Step 3 above.)

- [ ] **Step 6: Verify the bootstrap parses**

Run:
```bash
node --check .opencode/plugins/agent-orch.js && echo "syntax OK"
```
Expected: `syntax OK`

- [ ] **Step 7: Commit**

```bash
git add .opencode/plugins/agent-orch.js
git commit -m "feat: bootstrap 3-tier config resolution + first-run prompt

- resolveModels + resolveCommitAttribution: project → global → opencode
  default. No longer reads the shipped config.
- configTier ('project'/'global'/'none') drives first-run preamble:
  when 'none', preamble instructs agent to prompt user for model IDs
  and run /agent-orch:config --global.
- Preamble cache keyed by directory (multi-project safety).
- /agent-orch:config added to entry points."
```

---

### Task 5: Create the `/agent-orch:config` skill

**Files:**
- Create: `plugins/agent-orch/skills/config/SKILL.md`

**Interfaces:**
- Consumes: `opencode models` CLI (OpenCode), `ANTHROPIC_DEFAULT_*` env vars (Claude Code), the 26-agent mapping from `.agent-orch-models.example.json`
- Produces: writes `.agent-orch-models.json` (project) or `~/.config/agent-orch-models.json` (global)

- [ ] **Step 1: Create the skill directory and SKILL.md**

Create `plugins/agent-orch/skills/config/SKILL.md` with:

```markdown
---
description: Configure agent-orch models (thinking/instruct aliases) and commit trailer harness. Writes project-level .agent-orch-models.json by default, or global (~/.config/) with --global flag. OpenCode presents a model picker; Claude Code auto-fills from ANTHROPIC_DEFAULT_* env vars.
---

# /agent-orch:config

Configure the agent-orch model aliases and commit trailer harness.

## Workflow

### Step 1: Determine target scope

- If the user said `--global` → target is `~/.config/agent-orch-models.json` (applies to all repos without a project config)
- Otherwise → target is `<cwd>/.agent-orch-models.json` (overrides global for this repo only)

Create the parent directory if it doesn't exist:
```bash
mkdir -p "$(dirname "<target>")"
```

### Step 2: Check for existing config

If the target file exists, read and display the current values:
- `aliases.thinking`
- `aliases.instruct`
- `commit_attribution.harness`

Ask the user: "Config already exists at `<target>`. Update these values, or cancel?" If cancel, stop.

### Step 3: Determine harness

You are running inside a harness. Determine which one:
- If the preamble says "You are running in OpenCode" → `harness = "opencode"`
- If you are in Claude Code → `harness = "claude-code"`
- If unsure → ask the user

### Step 4: Collect model IDs

**OpenCode (model picker — no typing):**

Run this command to list available models:
```bash
opencode models
```

This prints `provider_id/model_id` lines, one per model. Present them to the user as a numbered menu:

```
Select a model for `thinking` (deep reasoning — used by architect, debugger, advocate, etc.):

  1. opencode/big-pickle
  2. opencode/deepseek-v4-flash-free
  3. ssnc-gateway/zai-org/GLM-5.2-FP8
  ...

Enter the number:
```

After the user picks, repeat for `instruct`:
```
Select a model for `instruct` (fast execution — used by builder, validator, etc.):

  1. opencode/big-pickle
  ...

Enter the number:
```

If the user selects the same model for both, confirm: "Use `<model>` for both thinking and instruct?"

The selected `provider_id/model_id` strings are the alias values.

**Claude Code (env-var auto-fill — prompt only as fallback):**

Read the environment variables:
```bash
echo "ANTHROPIC_DEFAULT_OPUS_MODEL=${ANTHROPIC_DEFAULT_OPUS_MODEL:-}"
echo "ANTHROPIC_DEFAULT_SONNET_MODEL=${ANTHROPIC_DEFAULT_SONNET_MODEL:-}"
```

- If BOTH are set: use them as `aliases.thinking` and `aliases.instruct` respectively. Tell the user: "Detected `ANTHROPIC_DEFAULT_OPUS_MODEL=<value>` and `ANTHROPIC_DEFAULT_SONNET_MODEL=<value>`. Using these for thinking and instruct." Skip the model-selection prompt.
- If only ONE is set: use it for the matching alias, ask the user to type the other.
- If NEITHER is set: ask the user to type the model IDs. Suggest `opus` and `sonnet` as defaults.

### Step 5: Write the config

Write the full config file using a heredoc. The `agents` block is the standard 26-agent mapping (7 thinking, 19 instruct) — it's the same for everyone. Only `aliases` and `commit_attribution.harness` change per user.

```bash
cat > "<target>" <<'CONFIG'
{
  "$schema": "https://opencode.ai/agent-orch-models.schema.json",
  "commit_attribution": {
    "harness": "<harness>",
    "trailer_format": "Co-authored-by: {gh_user} + {harness}/{models} <{gh_user}@users.noreply.github.com>"
  },
  "aliases": {
    "thinking": "<thinking_model>",
    "instruct": "<instruct_model>"
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
CONFIG
```

Replace `<harness>`, `<thinking_model>`, and `<instruct_model>` with the resolved values before writing. Do NOT use literal placeholders in the written file.

### Step 6: Confirm and guide

Print:
```
Config written to `<target>`.
```

Then based on scope:
- **Project scope:** "This overrides your global config for this repo. Run `/agent-orch:config --global` to set defaults for all repos."
- **Global scope:** "This applies to all repos without a project-level config. Run `/agent-orch:config` (no flag) in a repo to override."

## Scope Guardrails

- This skill ONLY writes `.agent-orch-models.json`. It does NOT touch CLAUDE.md, MCP config, plugin settings, or anything else.
- It does NOT run the full `init-plugin` wizard.
- Idempotent: running it twice with the same answers produces the same file.
```

- [ ] **Step 2: Verify the skill file exists and is valid markdown**

Run:
```bash
ls -la plugins/agent-orch/skills/config/SKILL.md
head -5 plugins/agent-orch/skills/config/SKILL.md
```
Expected: file exists, frontmatter is valid YAML with `description:` key

- [ ] **Step 3: Verify the agents block matches the template**

Run:
```bash
python3 -c "
import re
skill = open('plugins/agent-orch/skills/config/SKILL.md').read()
template = open('.agent-orch-models.example.json').read()
import json
tmpl_agents = json.loads(template)['agents']
# Extract agent names from the skill's CONFIG heredoc
skill_agents = re.findall(r'"(orchestrate-[a-z0-9-]+)": "(thinking|instruct)"', skill)
skill_map = dict(skill_agents)
assert skill_map == tmpl_agents, f'MISMATCH:\n{skill_map}\n{tmpl_agents}'
print(f'OK — {len(skill_map)} agents match template')
"
```
Expected: `OK — 26 agents match template`

- [ ] **Step 4: Commit**

```bash
git add plugins/agent-orch/skills/config/SKILL.md
git commit -m "feat: add /agent-orch:config skill (model picker + env-var auto-fill)

OpenCode: runs 'opencode models' and presents a numbered picker — no
typing model IDs. Claude Code: auto-fills from ANTHROPIC_DEFAULT_OPUS_MODEL
and ANTHROPIC_DEFAULT_SONNET_MODEL env vars, prompts only as fallback.
Writes project (.agent-orch-models.json) or global (~/.config/) config."
```

---

### Task 6: Update README.md with first-run config + env-var auto-config docs

**Files:**
- Modify: `README.md:177-189` (Install for OpenCode section)
- Modify: `README.md:155-175` (Install for Claude Code section, after the install block)
- Modify: `README.md:376-396` (Model Configuration section)

- [ ] **Step 1: Add first-run config section after OpenCode install**

In `README.md`, after line 189 (`Verify by asking: "Tell me about your agent-orch skills"`), insert:

```markdown

#### First-Run Configuration (OpenCode)

On your first session, if no `.agent-orch-models.json` exists (project or global), the agent will prompt you to select your `thinking` and `instruct` models from a list and save them globally. To set them now instead:

```
> /agent-orch:config --global
```

The skill runs `opencode models` and presents a numbered picker — no typing model IDs. To override models for a specific repo:

```
> /agent-orch:config
```
```

- [ ] **Step 2: Add model configuration section after Claude Code install**

In `README.md`, after line 175 (the closing ` ``` ` of the Claude Code install block), insert:

```markdown

### Model Configuration (Optional)

Claude Code works out of the box. If you set `ANTHROPIC_DEFAULT_OPUS_MODEL` and `ANTHROPIC_DEFAULT_SONNET_MODEL` in your environment, the plugin uses those for commit trailers automatically — no config needed.

To override per-repo or set global defaults:

```
> /agent-orch:config            # per-repo override
> /agent-orch:config --global   # defaults for all repos
```
```

- [ ] **Step 3: Update the Model Configuration section to mention config tiers**

In `README.md`, replace line 378:
```
Agent models are configured in `.agent-orch-models.json` at the repo root. The file uses vendor-neutral aliases:
```
with:
```
Agent models are configured via a three-tier fallback: project `.agent-orch-models.json` (repo root) → global `~/.config/agent-orch-models.json` → harness-native defaults. The file uses vendor-neutral aliases:
```

After line 396 (the build-overrides paragraph), insert:

```markdown

Run `/agent-orch:config` to generate or update the config with a guided picker (OpenCode) or env-var auto-fill (Claude Code):
- `/agent-orch:config` — write project-level `.agent-orch-models.json` (per-repo override)
- `/agent-orch:config --global` — write `~/.config/agent-orch-models.json` (defaults for all repos)
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README — first-run config (OpenCode), env-var auto-config (Claude Code), /agent-orch:config

OpenCode install: documents first-run prompt and /agent-orch:config picker.
Claude Code install: documents ANTHROPIC_DEFAULT_* env-var auto-config.
Model Configuration section: documents 3-tier fallback and /agent-orch:config."
```

---

### Task 7: Update CHEAT-SHEET.md with `/agent-orch:config` rows + model config updates

**Files:**
- Modify: `CHEAT-SHEET.md:7-27` (Quick Install section)
- Modify: `CHEAT-SHEET.md:31-43` (Model Configuration section)
- Modify: `CHEAT-SHEET.md:47-51` (Main Skills section — add config skill row)

- [ ] **Step 1: Add config note to Quick Install — OpenCode**

In `CHEAT-SHEET.md`, after line 27 (`Restart OpenCode. Verify: "Tell me about your agent-orch skills"`), insert:

```markdown

**First run (OpenCode):** Agent prompts for model IDs → `/agent-orch:config --global` to set now.
```

- [ ] **Step 2: Add config note to Quick Install — Claude Code**

In `CHEAT-SHEET.md`, after line 15 (the Claude Code install block's closing ` ``` `), insert:

```markdown

**Models:** Auto-configured from `ANTHROPIC_DEFAULT_OPUS_MODEL`/`SONNET_MODEL` env vars. Override: `/agent-orch:config`.
```

- [ ] **Step 3: Update Model Configuration section with tier info and config rows**

In `CHEAT-SHEET.md`, replace line 38:
```
Config file: `.agent-orch-models.json` at repo root. Edit the `aliases` block to change all 26 agents at once. Override per-repo: `.claude/rules/build-overrides.md`.
```
with:
```
Config: project `.agent-orch-models.json` → global `~/.config/agent-orch-models.json` → harness defaults. Edit `aliases` to change all 26 agents. Generate/update via `/agent-orch:config`. Per-repo agent override: `.claude/rules/build-overrides.md`.
```

- [ ] **Step 4: Add `/agent-orch:config` to the skills table**

In `CHEAT-SHEET.md`, find the "Implementation Commands" section (around line 49). Add after the first row:

```markdown
| `/agent-orch:config` | Configure models (thinking/instruct) + commit trailer harness | OpenCode: model picker. Claude Code: env-var auto-fill. `--global` for all repos |
```

- [ ] **Step 5: Run the docs sync validation**

Run:
```bash
# Skills diff (should be empty)
diff <(grep -o '/agent-orch:[a-z-]*' README.md | sort -u) <(grep -o '/agent-orch:[a-z-]*' CHEAT-SHEET.md | sort -u)
echo "skills diff exit: $?"

# Agent counts (should be 26 each)
echo "README agents: $(grep -o 'orchestrate-[a-z0-9-]*' README.md | sort -u | wc -l)"
echo "CHEAT-SHEET agents: $(grep -o 'orchestrate-[a-z0-9-]*' CHEAT-SHEET.md | sort -u | wc -l)"
echo "agent files: $(ls plugins/agent-orch/agents/orchestrate-*.md | wc -l)"

# /agent-orch:config in both
echo "README config refs: $(grep -c '/agent-orch:config' README.md)"
echo "CHEAT-SHEET config refs: $(grep -c '/agent-orch:config' CHEAT-SHEET.md)"
```
Expected: skills diff empty, 26 agents in all three counts, `/agent-orch:config` appears in both files.

- [ ] **Step 6: Commit**

```bash
git add CHEAT-SHEET.md
git commit -m "docs: CHEAT-SHEET — /agent-orch:config rows, model config tiers, first-run note

Quick Install: first-run prompt (OpenCode), env-var auto-config (Claude Code).
Model Configuration: 3-tier fallback, /agent-orch:config skill row.
Skills sync validated: 26 agents, /agent-orch:config in both docs."
```

---

### Task 8: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Bootstrap syntax**

Run:
```bash
node --check .opencode/plugins/agent-orch.js && echo "bootstrap OK"
```
Expected: `bootstrap OK`

- [ ] **Step 2: Hook syntax**

Run:
```bash
bash -n plugins/agent-orch/hooks/validate-ai-commit.sh && echo "hook OK"
```
Expected: `hook OK`

- [ ] **Step 3: Skill exists**

Run:
```bash
ls plugins/agent-orch/skills/config/SKILL.md && echo "skill OK"
```
Expected: file exists

- [ ] **Step 4: Template renamed**

Run:
```bash
ls .agent-orch-models.example.json && ! ls .agent-orch-models.json 2>/dev/null && echo "rename OK"
```
Expected: `.agent-orch-models.example.json` exists, `.agent-orch-models.json` does not exist at repo root

- [ ] **Step 5: No runtime code reads the shipped template**

Run:
```bash
grep -rn 'agent-orch-models\.example\.json' .opencode/ plugins/agent-orch/hooks/
```
Expected: no output (no runtime code references the template filename)

- [ ] **Step 6: Hook — all 4 config tiers**

Run the 6 hook tests from Task 3 (Steps 6-11) and verify all exit codes match expectations.

- [ ] **Step 7: Hook — env-var auto-fill**

Run the env-var test from Task 3 (Step 12) and verify the trailer shows the env-var values.

- [ ] **Step 8: `opencode models` works**

Run:
```bash
opencode models | head -3
```
Expected: at least 3 `provider_id/model_id` lines

- [ ] **Step 9: Docs sync**

Run the docs sync validation from Task 7 (Step 5) and verify all checks pass.

- [ ] **Step 10: Full verification summary**

If all steps 1-9 pass, report "All verification checks pass — no commit needed." If any fail, investigate and fix before completing.
