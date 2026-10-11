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
