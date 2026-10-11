# Dual-Harness OpenCode Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 6 plugins in the claude-agent-orchestration-plugin repo work identically in Claude Code and OpenCode from a single source of truth under `plugins/<name>/`, with user-configurable agent models and a harness-agnostic commit trailer.

**Architecture:** Single source in `plugins/` (no sync). A new OpenCode bootstrap plugin (`.opencode/plugins/agent-orch.js`) registers all 6 plugins' skill paths, injects a preamble (tool-name mapping, resolved model table, commit attribution, entry-point hint) into the first user message, and wires a TS hook adapter (`.opencode/agent-orch-hooks.ts`) that execs the unchanged Python/bash hook scripts. A central `.agent-orch-models.json` at repo root configures agent models (via `thinking`/`instruct` aliases) and the commit trailer format. Skills and agents are edited in place to reference the config instead of hardcoded vendor values.

**Tech Stack:** Bash (hook scripts), TypeScript/ESM (OpenCode plugin + hook adapter), JSON (config), Markdown (skills/agents/policy/docs). OpenCode runtime is Bun (handles `.ts` import from `.js` natively). No build step.

**Spec:** `docs/superpowers/specs/2026-08-02-dual-harness-opencode-design.md`

## Global Constraints

- **Single source of truth:** No file under `plugins/<name>/` is copied or symlinked into `.opencode/`. The bootstrap reaches into `plugins/<name>/skills` etc. directly.
- **Model aliases:** Vendor-neutral `thinking` (deep reasoning) and `instruct` (fast execution). Shipped defaults: `aliases.thinking: "opus"`, `aliases.instruct: "sonnet"`.
- **No Anthropic-specific email:** Commit trailer uses `<gh_user>@users.noreply.github.com` derived from `git config user.name`. `noreply@anthropic.com` is dropped.
- **Backward compatibility:** Existing Claude Code repos without `.agent-orch-models.json` must keep working — the hook falls back to the legacy `Claude[^<]*<noreply@anthropic\.com>` regex.
- **No build step:** OpenCode (Bun) imports `.ts` from `.js` natively. The hook adapter is `.ts`, the bootstrap is `.js`.
- **Docs sync:** README.md and CHEAT-SHEET.md must stay in sync per the repo's CLAUDE.md.
- **CLAUDE.md commit rule:** This repo's CLAUDE.md requires updating BOTH README.md and CHEAT-SHEET.md for capability/usage changes. Tasks touching user-facing behavior include both files.
- **No comments in code** unless the surrounding file already uses comments.

---

## File Structure

### New files

| Path | Responsibility |
|------|----------------|
| `.agent-orch-models.json` | Central config: model aliases, per-agent tier, commit attribution |
| `.opencode/plugins/agent-orch.js` | OpenCode bootstrap: register skill paths, inject preamble, wire hooks |
| `.opencode/agent-orch-hooks.ts` | TS adapter: OpenCode tool events → unchanged bash hook scripts |
| `.opencode/agent-orch.opencode.example.json` | MCP server config template (all `enabled: false`) |
| `package.json` | Root package.json so OpenCode's plugin loader finds `main` |
| `docs/superpowers/plans/2026-08-02-dual-harness-opencode.md` | This plan |

### Modified files

| Path | Change |
|------|--------|
| `plugins/agent-orch/agents/orchestrate-*.md` (26 files) | `model:` frontmatter: `opus`→`thinking`, `sonnet`→`instruct` |
| `plugins/agent-orch/agents/orchestrate-scribe.md` | Line 94: drop hardcoded `Co-authored-by: Claude Code` |
| `plugins/agent-orch/agents/orchestrate-debugger.md` | Line 450: drop hardcoded `Co-authored-by: Claude Code` |
| `plugins/agent-orch/skills/build/SKILL.md` | Lines 2220-2247: model table → config reference |
| `plugins/agent-orch/skills/implement/SKILL.md` | Lines 1095-1115: model table → config reference |
| `plugins/agent-orch/skills/bugfix/SKILL.md` | Lines 252-253, 268-269: trailer + model references |
| `plugins/agent-orch/skills/init-plugin/SKILL.md` | Generate `.agent-orch-models.json` during setup |
| `plugins/agent-orch/skills/inherit-plugin/SKILL.md` | Generate `.agent-orch-models.json` during scaffold |
| `plugins/agent-orch/hooks/validate-ai-commit.sh` | Config-driven trailer check + legacy fallback |
| `plugins/agent-orch/policies/ai-code-governance.md` | Drop Anthropic examples, add config-based trailer |
| `plugins/agent-orch/hooks/README.md` | Update trailer examples |
| `README.md` | Dual-harness section, OpenCode install, model config, MCP setup |
| `CHEAT-SHEET.md` | Quick install, model config table, MCP setup |

---

## Task 1: Create `.agent-orch-models.json` config file

**Files:**
- Create: `.agent-orch-models.json`

**Interfaces:**
- Produces: the canonical config file consumed by the bootstrap (Task 6), the hook (Task 9), and referenced by edited skills (Tasks 3-5). Shape: `{ commit_attribution: { harness, trailer_format }, aliases: { thinking, instruct }, agents: { <agent-name>: <alias> } }`

- [ ] **Step 1: Create the config file**

Write `.agent-orch-models.json` at the repo root with this exact content:

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

- [ ] **Step 2: Validate JSON parses**

Run: `python3 -c "import json; json.load(open('.agent-orch-models.json')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Verify agent count matches the agents directory**

Run: `diff <(python3 -c "import json; print('\n'.join(sorted(json.load(open('.agent-orch-models.json'))['agents'].keys())))") <(ls plugins/agent-orch/agents/orchestrate-*.md | xargs -n1 basename | sed 's/\.md$//' | sort)`
Expected: no output (exact match — 26 agents)

- [ ] **Step 4: Commit**

```bash
git add .agent-orch-models.json
git commit -m "feat: add .agent-orch-models.json central model + commit-attribution config

Vendor-neutral thinking/instruct aliases (default opus/sonnet) and the
harness-agnostic commit trailer format. Consumed by the OpenCode bootstrap,
the validate-ai-commit hook, and skills that reference agent models."
```

---

## Task 2: Migrate agent `model:` frontmatter to aliases

**Files:**
- Modify: `plugins/agent-orch/agents/orchestrate-*.md` (26 files)

**Interfaces:**
- Consumes: `.agent-orch-models.json` `agents` block (Task 1) — confirms which alias each agent maps to
- Produces: agent files with `model: thinking` or `model: instruct` that the bootstrap resolves via the config

- [ ] **Step 1: Replace `model: opus` with `model: thinking` in the 7 thinking-tier agents**

Run:
```bash
for agent in advocate architect debugger incident-responder legacy-modernizer quality-reviewer spec-reviewer; do
  sed -i '' 's/^model: opus$/model: thinking/' "plugins/agent-orch/agents/orchestrate-${agent}.md"
done
```

- [ ] **Step 2: Replace `model: sonnet` with `model: instruct` in the 19 instruct-tier agents**

Run:
```bash
for agent in api builder c4-scribe content-specialist data-engineer database devops jira-triage migration ml-engineer observability performance private-cloud refactorer scribe security telemetry uiux validator; do
  sed -i '' 's/^model: sonnet$/model: instruct/' "plugins/agent-orch/agents/orchestrate-${agent}.md"
done
```

- [ ] **Step 3: Verify no `opus` or `sonnet` remain in agent frontmatter**

Run: `grep -l "^model: \(opus\|sonnet\)$" plugins/agent-orch/agents/orchestrate-*.md`
Expected: no output (all migrated)

- [ ] **Step 4: Verify the migration matches the config**

Run:
```bash
python3 -c "
import json, re, glob, os
cfg = json.load(open('.agent-orch-models.json'))['agents']
mismatches = []
for f in glob.glob('plugins/agent-orch/agents/orchestrate-*.md'):
    name = os.path.basename(f)[:-3]
    m = re.search(r'^model: (\w+)', open(f).read(), re.M)
    if m and m.group(1) != cfg.get(name):
        mismatches.append(f'{name}: file={m.group(1)} config={cfg.get(name)}')
print('OK' if not mismatches else 'MISMATCH: ' + '; '.join(mismatches))
"
```
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add plugins/agent-orch/agents/orchestrate-*.md
git commit -m "refactor: migrate agent model frontmatter to thinking/instruct aliases

All 26 agent files now declare model: thinking or model: instruct instead
of vendor-specific opus/sonnet. The bootstrap resolves aliases via
.agent-orch-models.json; Claude Code defaults (thinking->opus, instruct->sonnet)
preserve current behavior."
```

---

## Task 3: Edit `build/SKILL.md` model table → config reference

**Files:**
- Modify: `plugins/agent-orch/skills/build/SKILL.md:2220-2247`

**Interfaces:**
- Consumes: `.agent-orch-models.json` (Task 1)
- Produces: skill text that points to the config instead of hardcoding `opus`/`sonnet`

- [ ] **Step 1: Read the current model selection section**

Run: `read plugins/agent-orch/skills/build/SKILL.md offset 2220 limit 30`

Confirm the section spans lines 2220-2247 and contains the hardcoded table.

- [ ] **Step 2: Replace the section**

Replace lines 2220-2247 (the `## Agent Model Selection` heading through the `---` separator before `## Progress Reporting`) with:

```markdown
## Agent Model Selection

Default models are configured per agent in `.agent-orch-models.json` (repo root). Each agent maps to a vendor-neutral alias:

| Agent | Alias | Plan Mode | Rationale |
|-------|-------|-----------|-----------|
| Architect | `thinking` | N/A | Complex planning and coordination decisions |
| Spec Reviewer | `thinking` | Yes | Skeptical verification requires deep reasoning |
| Quality Reviewer | `thinking` | Yes | Constitution compliance and pattern analysis |
| Debugger | `thinking` | N/A | Root cause analysis requires systematic reasoning |
| Builder | `instruct` | **NO** | Must start coding immediately. Architect already planned. |
| Validator | `instruct` | Yes | Test plan approval before execution |
| Scribe | `instruct` | No | Documentation from clear requirements |
| All Specialists | `instruct` | No | Domain review within defined scope |

The bootstrap resolves each alias to a concrete model via `aliases.thinking` and `aliases.instruct` in the config. Shipped defaults: `thinking` → `opus`, `instruct` → `sonnet` (Claude Code). OpenCode users set these to their full model IDs (e.g., `ssnc-gateway/zai-org/GLM-5.2-FP8`).

### Override Per Session

To override a model for a specific agent, add to `.claude/rules/build-overrides.md`:

```markdown
## Agent Model Overrides
- orchestrate-builder: opus  # Use for complex implementations
- orchestrate-security: opus  # Use for critical security reviews
```

The orchestrator reads these overrides and passes them when launching agents. Overrides stack on top of `.agent-orch-models.json` (the config is the base layer).

**Do NOT add overrides to CLAUDE.md** -- use `.claude/rules/build-overrides.md` instead. Files in `.claude/rules/` are auto-loaded by all agents and keep CLAUDE.md lean.
```

- [ ] **Step 3: Verify the edit landed**

Run: `grep -n "opus\|sonnet" plugins/agent-orch/skills/build/SKILL.md | grep -v "aliases.thinking\|aliases.instruct\|orchestrate-builder: opus\|orchestrate-security: opus"`
Expected: no output (no stray hardcoded vendor names except in the documented override examples and alias mapping)

- [ ] **Step 4: Commit**

```bash
git add plugins/agent-orch/skills/build/SKILL.md
git commit -m "docs: build skill model table references .agent-orch-models.json

Replaces hardcoded opus/sonnet with thinking/instruct aliases that the
bootstrap resolves from config. Per-repo override mechanism preserved."
```

---

## Task 4: Edit `implement/SKILL.md` model table → config reference

**Files:**
- Modify: `plugins/agent-orch/skills/implement/SKILL.md:1095-1115`

**Interfaces:**
- Consumes: `.agent-orch-models.json` (Task 1)
- Produces: skill text consistent with Task 3's build skill edit

- [ ] **Step 1: Read the current section**

Run: `read plugins/agent-orch/skills/implement/SKILL.md offset 1095 limit 25`

Confirm the section spans lines 1095-1115.

- [ ] **Step 2: Replace the section**

Replace lines 1095-1115 (the `## Agent Model Selection` heading through the `## Agent Model Overrides` content, ending before the next `---`) with:

```markdown
## Agent Model Selection

Default models are configured per agent in `.agent-orch-models.json` (repo root). Each agent maps to a vendor-neutral alias:

| Agent | Alias | Plan Mode | Rationale |
|-------|-------|-----------|-----------|
| Architect | `thinking` | N/A | Complex planning and coordination |
| Spec Reviewer | `thinking` | Yes | Deep verification reasoning |
| Quality Reviewer | `thinking` | Yes | Constitution compliance analysis |
| Debugger | `thinking` | N/A | Root cause investigation |
| Builder | `instruct` | **NO** | Must start coding immediately. Architect already planned. |
| Validator | `instruct` | Yes | Test plan approval before execution |
| All others | `instruct` | No | Implementation within clear specs |

The bootstrap resolves each alias to a concrete model via `aliases.thinking` and `aliases.instruct` in the config. Shipped defaults: `thinking` → `opus`, `instruct` → `sonnet` (Claude Code).

### Override Per Session

Add model overrides to `.specify/memory/constitution.md`:

```markdown
## Agent Model Overrides
- orchestrate-builder: opus
```

Overrides stack on top of `.agent-orch-models.json` (the config is the base layer).
```

- [ ] **Step 3: Verify no stray vendor names remain**

Run: `grep -n "opus\|sonnet" plugins/agent-orch/skills/implement/SKILL.md | grep -v "aliases.thinking\|aliases.instruct\|orchestrate-builder: opus"`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add plugins/agent-orch/skills/implement/SKILL.md
git commit -m "docs: implement skill model table references .agent-orch-models.json

Mirrors the build skill edit: thinking/instruct aliases resolved from
config, per-repo override mechanism preserved."
```

---

## Task 5: Edit `bugfix/SKILL.md` model + trailer references

**Files:**
- Modify: `plugins/agent-orch/skills/bugfix/SKILL.md:251-254, 268-269`

**Interfaces:**
- Consumes: `.agent-orch-models.json` (Task 1)
- Produces: bugfix skill consistent with Tasks 3-4 and the harness-agnostic trailer

- [ ] **Step 1: Read the two regions**

Run: `read plugins/agent-orch/skills/bugfix/SKILL.md offset 248 limit 25`

Confirm line 252 has `Co-authored-by: Claude ...` and lines 268-269 have the opus/sonnet model note.

- [ ] **Step 2: Replace the trailer reference (lines 251-254)**

Replace:
```
3. **Optional commit.** Offer to commit. If the user agrees, the commit MUST carry the
   `Co-authored-by: Claude ...` trailer and stay separate from human-authored changes — the
   `validate-ai-commit.sh` hook enforces this. See
   [ai-code-governance policy](../../policies/ai-code-governance.md).
```

With:
```
3. **Optional commit.** Offer to commit. If the user agrees, the commit MUST carry the
   configured `Co-authored-by:` trailer (see `.agent-orch-models.json` → `commit_attribution`)
   and stay separate from human-authored changes — the `validate-ai-commit.sh` hook enforces
   this. See [ai-code-governance policy](../../policies/ai-code-governance.md).
```

- [ ] **Step 3: Replace the model note (lines 268-269)**

Replace:
```
- **Models**: Debugger and Architect run on opus (root-cause reasoning); Builder and Validator on
  sonnet. These are pinned in the agent definitions — no per-call model needed.
```

With:
```
- **Models**: Debugger and Architect run on the `thinking` model (root-cause reasoning); Builder
  and Validator on `instruct`. Models are configured per-agent in `.agent-orch-models.json` — no
  per-call model needed.
```

- [ ] **Step 4: Verify no stray vendor names or hardcoded trailer**

Run: `grep -n "opus\|sonnet\|Co-authored-by: Claude" plugins/agent-orch/skills/bugfix/SKILL.md`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add plugins/agent-orch/skills/bugfix/SKILL.md
git commit -m "docs: bugfix skill uses config-based model aliases and commit trailer

Replaces hardcoded opus/sonnet with thinking/instruct and the Claude
trailer with a pointer to .agent-orch-models.json commit_attribution."
```

---

## Task 6: Update scribe + debugger agent commit policy sections

**Files:**
- Modify: `plugins/agent-orch/agents/orchestrate-scribe.md:90-95`
- Modify: `plugins/agent-orch/agents/orchestrate-debugger.md:446-451`

**Interfaces:**
- Consumes: `.agent-orch-models.json` `commit_attribution` (Task 1)

- [ ] **Step 1: Read both sections**

Run in parallel:
- `read plugins/agent-orch/agents/orchestrate-scribe.md offset 90 limit 8`
- `read plugins/agent-orch/agents/orchestrate-debugger.md offset 446 limit 8`

Confirm both have `Co-authored-by: Claude Code` in a code block.

- [ ] **Step 2: Replace the scribe commit policy**

In `plugins/agent-orch/agents/orchestrate-scribe.md`, replace:
```
## Commit Policy (AI Code Governance)

If you commit documentation files, every commit message MUST end with:
```
Co-authored-by: Claude Code
```
```

With:
```
## Commit Policy (AI Code Governance)

If you commit documentation files, every commit message MUST end with the configured `Co-authored-by:` trailer from `.agent-orch-models.json` → `commit_attribution`. The `validate-ai-commit.sh` hook enforces this. See [ai-code-governance policy](../policies/ai-code-governance.md).
```

- [ ] **Step 3: Replace the debugger commit policy**

In `plugins/agent-orch/agents/orchestrate-debugger.md`, replace:
```
## Commit Policy (AI Code Governance)

If you commit fixes, every commit message MUST end with:
```
Co-authored-by: Claude Code
```
```

With:
```
## Commit Policy (AI Code Governance)

If you commit fixes, every commit message MUST end with the configured `Co-authored-by:` trailer from `.agent-orch-models.json` → `commit_attribution`. The `validate-ai-commit.sh` hook enforces this. See [ai-code-governance policy](../policies/ai-code-governance.md).
```

- [ ] **Step 4: Verify no hardcoded Claude trailer remains in agents**

Run: `grep -rn "Co-authored-by: Claude" plugins/agent-orch/agents/`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add plugins/agent-orch/agents/orchestrate-scribe.md plugins/agent-orch/agents/orchestrate-debugger.md
git commit -m "docs: scribe + debugger agents reference config-based commit trailer

Drops the hardcoded Co-authored-by: Claude Code literal in favor of a
pointer to .agent-orch-models.json commit_attribution."
```

---

## Task 7: Update `ai-code-governance.md` policy

**Files:**
- Modify: `plugins/agent-orch/policies/ai-code-governance.md` (full rewrite of trailer section)

**Interfaces:**
- Consumes: `.agent-orch-models.json` `commit_attribution` (Task 1)
- Produces: the policy the hook enforces and skills reference

- [ ] **Step 1: Read the current policy**

Run: `read plugins/agent-orch/policies/ai-code-governance.md`

Confirm the hardcoded `Claude` / `noreply@anthropic.com` examples throughout.

- [ ] **Step 2: Replace lines 17-38 (the `### 2. Co-authored-by Trailer` section through the commit template)**

Replace:
```markdown
### 2. Co-authored-by Trailer (MANDATORY)

Every commit containing AI-generated code MUST include a `Co-authored-by:` trailer that names a Claude model and uses the anthropic noreply email. Any of these forms is accepted:

```
Co-authored-by: Claude Code <noreply@anthropic.com>
Co-authored-by: Claude Opus 4.7 <noreply@anthropic.com>
Co-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>
Co-authored-by: Claude Haiku 4.5 <noreply@anthropic.com>
```

The match is case-insensitive on the `Co-authored-by:` label. The author must start with `Claude` and the email must be `<noreply@anthropic.com>`.

**Commit message template:**

```
type(scope): description of changes

[optional body explaining what and why]

Co-authored-by: Claude Code <noreply@anthropic.com>
```
```

With:
```markdown
### 2. Co-authored-by Trailer (MANDATORY)

Every commit containing AI-generated code MUST include a single `Co-authored-by:` trailer that identifies the human GitHub user, the harness, and the model(s) that produced it. The trailer format is configured in `.agent-orch-models.json` under `commit_attribution`:

```
Co-authored-by: {gh_user} + {harness}/{models} <{gh_user}@users.noreply.github.com>
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

The `{gh_user}` value is read from `git config user.name` at commit time. The email is the GitHub noreply form (`<gh_user>@users.noreply.github.com`) so the commit links to the human's GitHub profile without exposing their real email.

The `validate-ai-commit.sh` hook enforces this. The match is case-insensitive on the `Co-authored-by:` label. When `.agent-orch-models.json` is absent, the hook falls back to accepting the legacy `Claude ... <noreply@anthropic.com>` form for backward compatibility — but new repos and all OpenCode sessions must use the configured format.

**Commit message template:**

```
type(scope): description of changes

[optional body explaining what and why]

Co-authored-by: jstein + claude-code/opus <jstein@users.noreply.github.com>
```
```

- [ ] **Step 3: Replace the Agent Instructions section (lines 56-69)**

Replace:
```markdown
## Agent Instructions

When any agent commits code:

1. Stage only the AI-generated files
2. Write a clear commit message following conventional commits format
3. Include a `Co-authored-by: Claude <model> <noreply@anthropic.com>` trailer as the last line
4. Never combine AI work with uncommitted human changes in the same commit

When the orchestrator presents commit options in Phase 5 (Finalize):

1. Remind the user of the separate-commits requirement
2. Ensure the Co-authored-by trailer is included
3. If human changes exist in the working tree, warn the user to commit them separately
```

With:
```markdown
## Agent Instructions

When any agent commits code:

1. Stage only the AI-generated files
2. Write a clear commit message following conventional commits format
3. Include the configured `Co-authored-by:` trailer (from `.agent-orch-models.json` → `commit_attribution`) as the last line — the bootstrap injects the resolved trailer into the session preamble
4. Never combine AI work with uncommitted human changes in the same commit

When the orchestrator presents commit options in Phase 5 (Finalize):

1. Remind the user of the separate-commits requirement
2. Ensure the Co-authored-by trailer is included
3. If human changes exist in the working tree, warn the user to commit them separately
```

- [ ] **Step 4: Verify no Anthropic email remains in the policy**

Run: `grep -n "noreply@anthropic\|Claude Code\|Claude Opus\|Claude Sonnet\|Claude Haiku" plugins/agent-orch/policies/ai-code-governance.md`
Expected: only the one backward-compat mention of the legacy `Claude ... <noreply@anthropic.com>` form in the new section text (describing what the fallback accepts) — no prescriptive examples.

- [ ] **Step 5: Commit**

```bash
git add plugins/agent-orch/policies/ai-code-governance.md
git commit -m "docs: ai-code-governance policy uses harness-agnostic commit trailer

Drops prescriptive noreply@anthropic.com examples. New trailer packs
GitHub user + harness + model(s) per .agent-orch-models.json. Legacy
Claude trailer accepted only as a fallback when config is absent."
```

---

## Task 8: Update `hooks/README.md` trailer examples

**Files:**
- Modify: `plugins/agent-orch/hooks/README.md:13`

**Interfaces:**
- Consumes: the policy from Task 7

- [ ] **Step 1: Read the current line**

Run: `read plugins/agent-orch/hooks/README.md limit 6 offset 10`

- [ ] **Step 2: Replace the trailer description**

Replace:
```
- Validates the commit message contains a `Co-authored-by:` trailer naming a Claude model (`Claude Code`, `Claude Opus 4.7`, `Claude Sonnet 4.6`, `Claude Haiku 4.5`, etc.) with the anthropic noreply email
```

With:
```
- Validates the commit message contains a `Co-authored-by:` trailer matching the configured format in `.agent-orch-models.json` → `commit_attribution` (GitHub user + harness + model(s), `<gh_user>@users.noreply.github.com` email). Falls back to the legacy `Claude ... <noreply@anthropic.com>` form when the config file is absent.
```

- [ ] **Step 3: Commit**

```bash
git add plugins/agent-orch/hooks/README.md
git commit -m "docs: hooks README references config-based commit trailer"
```

---

## Task 9: Make `validate-ai-commit.sh` config-driven

**Files:**
- Modify: `plugins/agent-orch/hooks/validate-ai-commit.sh:80-108`

**Interfaces:**
- Consumes: `.agent-orch-models.json` `commit_attribution.harness` (Task 1); stdin payload `.cwd` from the hook caller
- Produces: a hook that validates the configured trailer format, falling back to the legacy regex when config is absent

- [ ] **Step 1: Read the current validation block**

Run: `read plugins/agent-orch/hooks/validate-ai-commit.sh offset 79 limit 32`

Confirm lines 80-108 contain the hardcoded regex and error message.

- [ ] **Step 2: Add a config-reading helper after the `extract_command` function**

Insert this block immediately before the `COMMAND=$(extract_command "$INPUT")` line (currently line 62):

```bash

# Resolve the harness for commit trailer validation. Looks for
# .agent-orch-models.json in the session cwd first (project-local override),
# then falls back to the plugin's shipped config (so OpenCode users without
# a project-level config still get the harness-agnostic trailer, not the
# legacy Claude form). Returns "legacy" only when neither file exists
# (keeps backward compat for Claude Code repos that predate the config).
resolve_trailer_check() {
    local cwd="$1"
    local plugin_root

    # Try the plugin's shipped config: derive from the hook script's own path.
    # resolve_trailer_check is called from this script, so $0 is the hook path.
    plugin_root="$(cd "$(dirname "$0")/.." && pwd)/../.."
    local plugin_cfg="${plugin_root}/.agent-orch-models.json"

    for cfg_file in "${cwd}/.agent-orch-models.json" "${plugin_cfg}"; do
        if [ -f "$cfg_file" ]; then
            if command -v jq >/dev/null 2>&1; then
                local h
                h=$(jq -r '.commit_attribution.harness // empty' "$cfg_file" 2>/dev/null)
                if [ -n "$h" ]; then printf '%s\n' "$h"; return; fi
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
                if [ -n "$h" ]; then printf '%s\n' "$h"; return; fi
            fi
        fi
    done

    # Neither config exists — legacy mode for pre-config Claude Code repos.
    echo "legacy"
}

# Read git config user.name for the GitHub username in the trailer.
git_user_name() {
    git -C "$1" config user.name 2>/dev/null | tr -d '\n'
}
```

- [ ] **Step 3: Replace the hardcoded regex check (lines 80-108)**

Replace the entire block from `# Check for the required Co-authored-by trailer (case-insensitive).` through `exit 2` / `fi` (the block ending before `# Trailer present - allow commit`) with:

```bash
# Determine trailer expectation: configured format or legacy fallback.
CWD=$(printf '%s' "$INPUT" | { command -v jq >/dev/null 2>&1 && jq -r '.cwd // empty' 2>/dev/null || python3 -c "import json,sys; print(json.load(sys.stdin).get('cwd',''))" 2>/dev/null; })
CONFIGURED_HARNESS=$(resolve_trailer_check "$CWD")
GH_USER=$(git_user_name "$CWD")
GH_NOREPLY="${GH_USER}@users.noreply.github.com"

if [ "$CONFIGURED_HARNESS" = "legacy" ]; then
    # Legacy mode: no .agent-orch-models.json. Accept the old Claude trailer.
    if ! printf '%s' "$COMMAND" | grep -qiE "Co-authored-by:[[:space:]]+Claude[^<]*<noreply@anthropic\.com>"; then
        {
            echo "AI Code Governance Policy Violation: Missing Co-authored-by trailer."
            echo ""
            echo "All commits from AI agents MUST include a Co-authored-by trailer."
            echo "Legacy mode (no .agent-orch-models.json):"
            echo "  Co-authored-by: Claude Code <noreply@anthropic.com>"
            echo ""
            echo "Add .agent-orch-models.json to use the harness-agnostic format."
            echo ""
            echo "See: plugins/agent-orch/policies/ai-code-governance.md"
        } >&2
        exit 2
    fi
elif [ -z "$GH_USER" ]; then
    {
        echo "AI Code Governance Policy Violation: git user.name not set."
        echo ""
        echo "The commit trailer requires the GitHub username (from 'git config user.name')."
        echo "Set it with: git config user.name \"<your-github-username>\""
    } >&2
    exit 2
else
    # Configured mode: validate {gh_user} + {harness}/{models} <{gh_user}@users.noreply.github.com>
    # The hook checks the gh_user, harness, and noreply email. The model list is
    # injected by the bootstrap and not strictly validated here (any non-empty
    # /<models> segment is accepted).
    TRAILER_REGEX="Co-authored-by:[[:space:]]+${GH_USER}[[:space:]]\+[[:space:]]${CONFIGURED_HARNESS}/[^[:space:]]+[[:space:]]<${GH_USER}@users\.noreply\.github\.com>"
    if ! printf '%s' "$COMMAND" | grep -qiE "$TRAILER_REGEX"; then
        {
            echo "AI Code Governance Policy Violation: Missing or malformed Co-authored-by trailer."
            echo ""
            echo "Expected (configured in .agent-orch-models.json):"
            echo "  Co-authored-by: ${GH_USER} + ${CONFIGURED_HARNESS}/<models> <${GH_USER}@users.noreply.github.com>"
            echo ""
            echo "Example:"
            echo "  Co-authored-by: ${GH_USER} + ${CONFIGURED_HARNESS}/opus,sonnet <${GH_USER}@users.noreply.github.com>"
            echo ""
            echo "See: plugins/agent-orch/policies/ai-code-governance.md"
        } >&2
        exit 2
    fi
fi
```

- [ ] **Step 4: Test fallback to plugin's shipped config (no project config file)**

This test simulates a project with no local `.agent-orch-models.json`. The hook should read the plugin's shipped config (which has `harness: "claude-code"`) and validate the new trailer format — not the legacy Claude trailer.

Run:
```bash
cd /tmp && rm -rf test-hook && mkdir test-hook && cd test-hook
git init -q && git config user.name "testuser"
echo '{"tool_input":{"command":"git commit -m \"test\""},"cwd":"/tmp/test-hook"}' | bash /Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
echo "exit: $?"
```
Expected: exit 2, error message shows the expected trailer using `claude-code` harness (from the plugin's shipped config) and `testuser@users.noreply.github.com` — NOT "Legacy mode" / `noreply@anthropic.com`

- [ ] **Step 5: Test acceptance of a valid trailer using the plugin's shipped config**

Run:
```bash
cd /tmp/test-hook
echo '{"tool_input":{"command":"git commit -m \"test\n\nCo-authored-by: testuser + claude-code/opus,sonnet <testuser@users.noreply.github.com>\""},"cwd":"/tmp/test-hook"}' | bash /Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
echo "exit: $?"
```
Expected: exit 0

- [ ] **Step 6: Test project-config override (harness: opencode)**

Run:
```bash
cd /tmp && rm -rf test-cfg && mkdir test-cfg && cd test-cfg
cat > .agent-orch-models.json <<'EOF'
{"commit_attribution":{"harness":"opencode"},"aliases":{"thinking":"x","instruct":"y"},"agents":{}}
EOF
git init -q && git config user.name "testuser"
echo '{"tool_input":{"command":"git commit -m \"test\""},"cwd":"/tmp/test-cfg"}' | bash /Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
echo "exit: $?"
```
Expected: exit 2, error mentions `testuser + opencode/<models> <testuser@users.noreply.github.com>`

- [ ] **Step 7: Test project-config acceptance of a valid trailer**

Run:
```bash
cd /tmp/test-cfg
echo '{"tool_input":{"command":"git commit -m \"test\n\nCo-authored-by: testuser + opencode/glm-5.2 <testuser@users.noreply.github.com>\""},"cwd":"/tmp/test-cfg"}' | bash /Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
echo "exit: $?"
```
Expected: exit 0

- [ ] **Step 8: Test project-config rejection of legacy Claude trailer**

Run:
```bash
cd /tmp/test-cfg
echo '{"tool_input":{"command":"git commit -m \"test\n\nCo-authored-by: Claude Code <noreply@anthropic.com>\""},"cwd":"/tmp/test-cfg"}' | bash /Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/plugins/agent-orch/hooks/validate-ai-commit.sh
echo "exit: $?"
```
Expected: exit 2 (project config is present with harness "opencode", so the legacy Anthropic trailer is rejected)

- [ ] **Step 9: Clean up test dirs and commit**

```bash
rm -rf /tmp/test-hook /tmp/test-cfg
git add plugins/agent-orch/hooks/validate-ai-commit.sh
git commit -m "feat: validate-ai-commit.sh reads trailer format from .agent-orch-models.json

Config-driven: validates {gh_user} + {harness}/{models} <{gh_user}@users.noreply.github.com>
using the project's .agent-orch-models.json, falling back to the plugin's
shipped config (harness: claude-code). Legacy Claude regex is only used when
neither config exists (pre-config Claude Code repos). Drops the
noreply@anthropic.com requirement for new repos."
```

---

## Task 10: Create the OpenCode hook adapter

**Files:**
- Create: `.opencode/agent-orch-hooks.ts`

**Interfaces:**
- Consumes: the unchanged hook scripts at `plugins/agent-orch/hooks/{validate-ai-commit.sh, guard-worktree-writes.sh}` (existing)
- Produces: `createHookHandler(sessionCwd: string)` — exported factory the bootstrap (Task 11) imports and registers as `tool.execute.before`

- [ ] **Step 1: Create the directory**

Run: `mkdir -p .opencode`

- [ ] **Step 2: Write the adapter**

Create `.opencode/agent-orch-hooks.ts` with this content:

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

- [ ] **Step 3: Verify the path resolves to the real hooks directory**

Run:
```bash
cd .opencode && node -e "const p = require('path'); console.log(p.join(__dirname, '..', '..', 'plugins', 'agent-orch', 'hooks'))" 2>/dev/null || python3 -c "import os; print(os.path.abspath(os.path.join('.opencode', '..', '..', 'plugins', 'agent-orch', 'hooks')))"
```
Then verify that path exists: `ls <printed-path>/validate-ai-commit.sh`
Expected: the file is listed.

- [ ] **Step 4: Commit**

```bash
git add .opencode/agent-orch-hooks.ts
git commit -m "feat: add OpenCode hook adapter (.opencode/agent-orch-hooks.ts)

TS adapter that maps OpenCode's lowercase tool names and tool.execute.before
contract to the {tool_name, tool_input, cwd} stdin shape the unchanged
bash hook scripts expect. Exports createHookHandler(sessionCwd) for the
bootstrap to register."
```

---

## Task 11: Create the OpenCode bootstrap plugin

**Files:**
- Create: `.opencode/plugins/agent-orch.js`
- Create: `package.json` (repo root)

**Interfaces:**
- Consumes: `createHookHandler` from `.opencode/agent-orch-hooks.ts` (Task 10); `.agent-orch-models.json` (Task 1); the 6 plugin skill directories under `plugins/<name>/skills`
- Produces: an OpenCode plugin that registers skill paths, injects a preamble, and wires the hook handler

- [ ] **Step 1: Create the plugins directory**

Run: `mkdir -p .opencode/plugins`

- [ ] **Step 2: Write the bootstrap**

Create `.opencode/plugins/agent-orch.js` with this content:

```js
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import { createHookHandler } from '../agent-orch-hooks.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLUGIN_NAMES = [
  'agent-orch',
  'codebase-graph-analyzer',
  'mainframe-analyzer',
  'meta-orch',
  'team-work',
  'vault-orch',
];

const DEFAULT_MODELS = {
  'orchestrate-advocate': 'thinking',
  'orchestrate-architect': 'thinking',
  'orchestrate-debugger': 'thinking',
  'orchestrate-incident-responder': 'thinking',
  'orchestrate-legacy-modernizer': 'thinking',
  'orchestrate-quality-reviewer': 'thinking',
  'orchestrate-spec-reviewer': 'thinking',
  'orchestrate-api': 'instruct',
  'orchestrate-builder': 'instruct',
  'orchestrate-c4-scribe': 'instruct',
  'orchestrate-content-specialist': 'instruct',
  'orchestrate-data-engineer': 'instruct',
  'orchestrate-database': 'instruct',
  'orchestrate-devops': 'instruct',
  'orchestrate-jira-triage': 'instruct',
  'orchestrate-migration': 'instruct',
  'orchestrate-ml-engineer': 'instruct',
  'orchestrate-observability': 'instruct',
  'orchestrate-performance': 'instruct',
  'orchestrate-private-cloud': 'instruct',
  'orchestrate-refactorer': 'instruct',
  'orchestrate-scribe': 'instruct',
  'orchestrate-security': 'instruct',
  'orchestrate-telemetry': 'instruct',
  'orchestrate-uiux': 'instruct',
  'orchestrate-validator': 'instruct',
};

let _preambleCache = undefined;

function gitUserName(directory) {
  try {
    return execFileSync('git', ['-C', directory, 'config', 'user.name'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function resolveModels(configPath) {
  if (!fs.existsSync(configPath)) {
    console.warn('[agent-orch] .agent-orch-models.json not found at', configPath, '— using raw aliases');
    return DEFAULT_MODELS;
  }
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const resolved = {};
  for (const [agent, alias] of Object.entries(cfg.agents || {})) {
    resolved[agent] = (cfg.aliases && cfg.aliases[alias]) || alias;
  }
  return resolved;
}

function resolveCommitAttribution(configPath, directory, pluginRoot) {
  const ghUser = gitUserName(directory);
  const pluginConfigPath = path.join(pluginRoot, '..', '.agent-orch-models.json');
  const localConfig = fs.existsSync(configPath) ? configPath : pluginConfigPath;
  let harness = 'opencode';
  let models;
  if (fs.existsSync(localConfig)) {
    const cfg = JSON.parse(fs.readFileSync(localConfig, 'utf8'));
    harness = (cfg.commit_attribution && cfg.commit_attribution.harness) || harness;
    models = resolveModels(localConfig);
  } else {
    console.warn('[agent-orch] .agent-orch-models.json not found — using opencode defaults');
    models = DEFAULT_MODELS;
  }
  const distinctModels = [...new Set(Object.values(models))];
  const modelsStr = distinctModels.join(',');
  const email = `${ghUser}@users.noreply.github.com`;
  return `Co-authored-by: ${ghUser} + ${harness}/${modelsStr} <${email}>`;
}

function buildPreamble(directory, models, commitTrailer) {
  if (_preambleCache !== undefined) return _preambleCache;

  const modelTable = Object.entries(models)
    .map(([agent, model]) => `- ${agent}: ${model}`)
    .join('\n');

  const preamble = `<EXTREMELY_IMPORTANT>
You are running in OpenCode with the agent-orch orchestration plugin.

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
If a skill might apply, invoke it to check.
</EXTREMELY_IMPORTANT>`;

  _preambleCache = preamble;
  return preamble;
}

export const AgentOrchPlugin = async ({ client, directory, worktree }) => {
  const pluginsRoot = path.resolve(__dirname, '../../plugins');
  const modelConfigPath = path.resolve(directory, '.agent-orch-models.json');
  const sessionCwd = worktree || directory;

  const models = resolveModels(modelConfigPath);
  const commitTrailer = resolveCommitAttribution(modelConfigPath, directory, pluginsRoot);
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
      const preamble = buildPreamble(directory, models, commitTrailer);
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

- [ ] **Step 3: Create the root package.json**

Create `package.json` at the repo root:

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

- [ ] **Step 4: Verify the bootstrap parses as valid JS**

Run: `node --check .opencode/plugins/agent-orch.js`
Expected: no output (valid syntax)

- [ ] **Step 5: Commit**

```bash
git add .opencode/plugins/agent-orch.js package.json
git commit -m "feat: add OpenCode bootstrap plugin and root package.json

.opencode/plugins/agent-orch.js registers all 6 plugins' skill paths,
injects a preamble (tool mapping, resolved model table, commit trailer,
entry-point hint) into the first user message, and wires the hook adapter.
package.json main field points OpenCode's plugin loader at the bootstrap."
```

---

## Task 12: Create the MCP config template

**Files:**
- Create: `.opencode/agent-orch.opencode.example.json`

**Interfaces:**
- Produces: a copy-paste template users merge into their `opencode.json`

- [ ] **Step 1: Write the template**

Create `.opencode/agent-orch.opencode.example.json`:

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

- [ ] **Step 2: Validate JSON**

Run: `python3 -c "import json; json.load(open('.opencode/agent-orch.opencode.example.json')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .opencode/agent-orch.opencode.example.json
git commit -m "feat: add OpenCode MCP config template

Copy-paste template with all 8 MCP servers (jira, confluence, testrail,
azuredevops, playwright, sonarqube, ssccloud, servicenow) enabled: false.
Users merge entries into opencode.json and flip enabled: true after
running /agent-orch:mcp-setup + /agent-orch:mcp-start."
```

---

## Task 13: Update `init-plugin` skill to generate the config

**Files:**
- Modify: `plugins/agent-orch/skills/init-plugin/SKILL.md`

**Interfaces:**
- Consumes: the config shape from Task 1
- Produces: a skill that scaffolds `.agent-orch-models.json` (with `commit_attribution`) as part of plugin setup

- [ ] **Step 1: Find the config-writing section**

Run: `grep -n "settings.json\|marketplace.json\|plugin.json" plugins/agent-orch/skills/init-plugin/SKILL.md | head -20`

Identify the section where the skill writes plugin metadata files (around line 547 per the spec, where it stores answers in `.claude-plugin/settings.json`).

- [ ] **Step 2: Read the region around the settings-writing step**

Run: `read plugins/agent-orch/skills/init-plugin/SKILL.md offset 540 limit 60`

Confirm the context for where to add the `.agent-orch-models.json` generation step.

- [ ] **Step 3: Add a step that generates `.agent-orch-models.json`**

After the step that writes `.claude-plugin/settings.json` (around line 547), insert a new step:

```markdown
### Generate `.agent-orch-models.json`

After writing plugin metadata, generate the central model + commit-attribution config at the project root. This file is consumed by both Claude Code and OpenCode.

Write `.agent-orch-models.json`:

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

If the user is on OpenCode, ask whether they want to set the `aliases` to their full model IDs now (e.g., `ssnc-gateway/zai-org/GLM-5.2-FP8`) and set `commit_attribution.harness` to `"opencode"`.
```

- [ ] **Step 4: Commit**

```bash
git add plugins/agent-orch/skills/init-plugin/SKILL.md
git commit -m "feat: init-plugin generates .agent-orch-models.json during setup

Scaffolds the central model + commit-attribution config so new plugins
start dual-harness-ready. Asks OpenCode users for their model IDs."
```

---

## Task 14: Update `inherit-plugin` skill to scaffold the config

**Files:**
- Modify: `plugins/agent-orch/skills/inherit-plugin/SKILL.md`

**Interfaces:**
- Consumes: the config shape from Task 1
- Produces: a skill that generates `.agent-orch-models.json` when scaffolding a new plugin from an existing one

- [ ] **Step 1: Find the file-writing section**

Run: `grep -n "plugin.json\|marketplace.json\|mkdir -p" plugins/agent-orch/skills/inherit-plugin/SKILL.md | head -20`

- [ ] **Step 2: Read the region around the plugin.json write (around line 723)**

Run: `read plugins/agent-orch/skills/inherit-plugin/SKILL.md offset 720 limit 40`

- [ ] **Step 3: Add a step to write `.agent-orch-models.json` in the new plugin**

After the step that writes `plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json` (around line 723), insert:

```markdown
### Write `.agent-orch-models.json` at the new plugin's repo root

Generate the central model + commit-attribution config for the new plugin. Map the source plugin's agent model declarations to `thinking`/`instruct` aliases:

```bash
cat > .agent-orch-models.json <<'CONFIG'
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
CONFIG
```

If the new plugin defines additional agents (domain-specific), add them to the `agents` block with the appropriate alias. If the user is on OpenCode, set `commit_attribution.harness` to `"opencode"` and ask for their model IDs.
```

- [ ] **Step 4: Commit**

```bash
git add plugins/agent-orch/skills/inherit-plugin/SKILL.md
git commit -m "feat: inherit-plugin scaffolds .agent-orch-models.json for new plugins

New plugins cloned via /agent-orch:inherit-plugin start dual-harness-ready
with the central model + commit-attribution config generated alongside
plugin.json."
```

---

## Task 15: Update README.md with dual-harness documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: all prior tasks (the install path, config, MCP template, hook behavior)

- [ ] **Step 1: Read the current README structure**

Run: `read README.md limit 130`

Identify: intro (lines 1-10), "What's in the Box" (line 17), "Quick Start" (line 109), MCP section (search for it).

- [ ] **Step 2: Add a "Dual-Harness Support" section after the intro**

After the blockquote intro (around line 10, before `### Optional Plugin: Codebase Graph Analyzer`), insert:

```markdown
## Dual-Harness Support (Claude Code + OpenCode)

This plugin marketplace works identically in **Claude Code** and **OpenCode**. A single source of truth under `plugins/<name>/` serves both harnesses — skills, agents, commands, hooks, MCP servers, and rules are not duplicated.

- **Claude Code** v1.0.33+ — install via the marketplace (see Quick Start below)
- **OpenCode** — install via one plugin line in `opencode.json` (see Quick Start below)

Harness-specific files:
- `.opencode/plugins/agent-orch.js` — OpenCode bootstrap (registers skills, injects context, wires hooks)
- `.opencode/agent-orch-hooks.ts` — TS adapter mapping OpenCode tool events to the unchanged bash hook scripts
- `.opencode/agent-orch.opencode.example.json` — MCP server config template
- `.agent-orch-models.json` — central model + commit-attribution config (both harnesses read this)
```

- [ ] **Step 3: Add the OpenCode install path in Quick Start**

Find the "### Install the Plugin" section (around line 111). After the existing Claude Code install block (which ends with `/plugin install agent-orch@ssnc-agent-orch`), add:

```markdown
### Install for OpenCode

Add one line to your `opencode.json` (global or project-level):

```json
{
  "plugin": ["git+https://code.ssnc.dev/ai/claude-agent-orchestration-plugin.git"]
}
```

Restart OpenCode. The bootstrap plugin registers all 6 plugins' skills and injects the tool-name mapping, resolved model table, and commit attribution into your session.

Verify by asking: "Tell me about your agent-orch skills"
```

- [ ] **Step 4: Add a "Model Configuration" section after Quick Start**

After the install section, add:

```markdown
## Model Configuration

Agent models are configured in `.agent-orch-models.json` at the repo root. The file uses vendor-neutral aliases:

| Alias | Default (Claude Code) | OpenCode (user-set) | Use for |
|-------|----------------------|---------------------|---------|
| `thinking` | `opus` | `ssnc-gateway/.../GLM-5.2-FP8` | Architecture, debugging, review |
| `instruct` | `sonnet` | `ssnc-gateway/.../...` | Building, validation, domain work |

Each of the 26 agents maps to one alias. To use your own models, edit the `aliases` block — all agents pick up the change:

```json
{
  "aliases": {
    "thinking": "ssnc-gateway/zai-org/GLM-5.2-FP8",
    "instruct": "ssnc-gateway/zai-org/GLM-5.2-FP8"
  }
}
```

Per-repo overrides stack on top via `.claude/rules/build-overrides.md` (standalone mode) or `.specify/memory/constitution.md` (spec-kit mode). See [build skill model selection](plugins/agent-orch/skills/build/SKILL.md).

### Commit Attribution

The commit trailer is also configured in `.agent-orch-models.json` under `commit_attribution`. Every AI-generated commit MUST end with:

```
Co-authored-by: <gh-user> + <harness>/<models> <<gh-user>@users.noreply.github.com>
```

The `<gh-user>` is read from `git config user.name`. The `validate-ai-commit.sh` hook enforces this. Claude Code defaults to `harness: "claude-code"`; OpenCode users set `harness: "opencode"`.
```

- [ ] **Step 5: Add an "MCP Setup (OpenCode)" subsection**

Find the existing MCP section (search for `mcp-setup` or `MCP Setup`). Add a subsection:

```markdown
### MCP Setup for OpenCode

1. Copy the entries you need from `.opencode/agent-orch.opencode.example.json` into your project's `opencode.json`
2. Run `/agent-orch:mcp-setup` to configure credentials for each backend
3. Run `/agent-orch:mcp-start` to start the local MCP server
4. Flip `enabled: true` in `opencode.json` for the backends you want
5. Restart OpenCode
```

- [ ] **Step 6: Add a note above "What's in the Box"**

Before the `## What's in the Box` heading (line 17), add:

```markdown
> All skills, agents, and commands below work in both Claude Code and OpenCode unless noted. The mainframe-analyzer MCP server has a harness-specific setup path covered in its own section.
```

- [ ] **Step 7: Verify the README has the key new sections**

Run:
```bash
grep -c "Dual-Harness Support\|Install for OpenCode\|Model Configuration\|MCP Setup for OpenCode\|commit_attribution" README.md
```
Expected: at least 5 (all sections present)

- [ ] **Step 8: Commit**

```bash
git add README.md
git commit -m "docs: README adds dual-harness (Claude Code + OpenCode) directions

New sections: Dual-Harness Support overview, OpenCode install path,
Model Configuration (.agent-orch-models.json thinking/instruct aliases),
Commit Attribution, MCP Setup for OpenCode. Existing Claude Code sections
unchanged."
```

---

## Task 16: Update CHEAT-SHEET.md with dual-harness quick reference

**Files:**
- Modify: `CHEAT-SHEET.md`

**Interfaces:**
- Consumes: same content as Task 15 (must stay in sync per CLAUDE.md)

- [ ] **Step 1: Read the current CHEAT-SHEET structure**

Run: `read CHEAT-SHEET.md limit 80`

Identify: Quick Install section, Main Skills table, MCP section, footer.

- [ ] **Step 2: Add OpenCode install to the Quick Install section**

Find the existing install instructions. Add alongside the Claude Code commands:

```markdown
### OpenCode

Add to `opencode.json` (global or project-level):

```json
{
  "plugin": ["git+https://code.ssnc.dev/ai/claude-agent-orchestration-plugin.git"]
}
```

Restart OpenCode. Verify: "Tell me about your agent-orch skills"
```

- [ ] **Step 3: Add a "Model Configuration" quick-reference table**

Add a new section after Quick Install:

```markdown
## Model Configuration

| Alias | Default (Claude Code) | OpenCode (user-set) | Use for |
|-------|----------------------|---------------------|---------|
| `thinking` | `opus` | `ssnc-gateway/.../GLM-5.2-FP8` | Architecture, debugging, review |
| `instruct` | `sonnet` | `ssnc-gateway/.../...` | Building, validation, domain work |

Config file: `.agent-orch-models.json` at repo root. Edit the `aliases` block to change all 26 agents at once. Override per-repo: `.claude/rules/build-overrides.md`.

Commit trailer (configured in same file under `commit_attribution`):
```
Co-authored-by: <gh-user> + <harness>/<models> <<gh-user>@users.noreply.github.com>
```
```

- [ ] **Step 4: Add OpenCode column to MCP Quick Setup**

Find the existing MCP setup section. Add:

```markdown
### OpenCode MCP Setup

1. Copy from `.opencode/agent-orch.opencode.example.json` → `opencode.json`
2. `/agent-orch:mcp-setup` → configure credentials
3. `/agent-orch:mcp-start` → start server
4. Flip `enabled: false` → `true` in `opencode.json`
5. Restart OpenCode
```

- [ ] **Step 5: Update the footer**

Find the footer (version line). Update to add a dual-harness note:

```markdown
**Dual-harness:** Claude Code + OpenCode | **Config:** `.agent-orch-models.json`
```

- [ ] **Step 6: Run the sync validation from CLAUDE.md**

Run:
```bash
diff <(grep -o '/agent-orch:[a-z-]*' README.md | sort -u) <(grep -o '/agent-orch:[a-z-]*' CHEAT-SHEET.md | sort -u) && echo "skills match"
grep -o "orchestrate-[a-z-]*" README.md | sort -u | wc -l
grep -o "orchestrate-[a-z-]*" CHEAT-SHEET.md | sort -u | wc -l
grep -c "opencode.json" README.md CHEAT-SHEET.md
```
Expected: "skills match", 26, 26, and both files have `opencode.json` count > 0.

- [ ] **Step 7: Commit**

```bash
git add CHEAT-SHEET.md
git commit -m "docs: CHEAT-SHEET adds dual-harness quick reference

OpenCode install one-liner, model configuration table (thinking/instruct),
commit trailer format, MCP setup steps. Stays in sync with README per
CLAUDE.md."
```

---

## Task 17: End-to-end verification

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: all prior tasks

- [ ] **Step 1: Verify no hardcoded Anthropic references remain in skill/agent prose**

Run:
```bash
grep -rn "noreply@anthropic\|Co-authored-by: Claude" plugins/agent-orch/skills/ plugins/agent-orch/agents/ plugins/agent-orch/policies/ plugins/agent-orch/hooks/README.md
```
Expected: no output (all prescriptive references removed; the only remaining `noreply@anthropic.com` mentions are in the hook's legacy fallback code and the policy's backward-compat note, which describe the old format, not prescribe it)

- [ ] **Step 2: Verify all 26 agent files use aliases**

Run: `grep -l "^model: \(opus\|sonnet\)$" plugins/agent-orch/agents/orchestrate-*.md`
Expected: no output

- [ ] **Step 3: Verify the config file matches the agents**

Run (the script from Task 1 Step 3):
```bash
python3 -c "
import json, re, glob
cfg = json.load(open('.agent-orch-models.json'))['agents']
mismatches = []
for f in glob.glob('plugins/agent-orch/agents/orchestrate-*.md'):
    name = re.sub(r'.*/|\.', '', f)[:-3]
    m = re.search(r'^model: (\w+)', open(f).read(), re.M)
    if m and m.group(1) != cfg.get(name):
        mismatches.append(f'{name}: file={m.group(1)} config={cfg.get(name)}')
print('OK' if not mismatches else 'MISMATCH: ' + '; '.join(mismatches))
"
```
Expected: `OK`

- [ ] **Step 4: Verify the bootstrap and adapter parse**

Run:
```bash
node --check .opencode/plugins/agent-orch.js
```
Expected: no output

- [ ] **Step 5: Verify the hook handles all modes**

Re-run the five hook tests from Task 9 (Steps 4-8) and confirm the same exit codes: plugin-config fallback (reject + accept), project-config override (reject + accept), legacy-Claude rejection.

- [ ] **Step 6: Verify docs sync**

Run the validation from Task 16 Step 6 again. Confirm: skills match, 26 agents in both, `opencode.json` present in both.

- [ ] **Step 7: Verify the new files exist**

Run:
```bash
ls -la .agent-orch-models.json .opencode/plugins/agent-orch.js .opencode/agent-orch-hooks.ts .opencode/agent-orch.opencode.example.json package.json
```
Expected: all 5 files listed.

- [ ] **Step 8: Final commit (if any cleanup needed)**

If verification surfaced any fixes, commit them:
```bash
git add -A
git commit -m "chore: dual-harness OpenCode support verification fixes"
```

Otherwise, no commit — verification passes clean.

---

## Spec Coverage Check

| Spec Section | Tasks |
|--------------|-------|
| Architecture (single source, bootstrap, hook adapter) | Tasks 10, 11 |
| Model config file format (`thinking`/`instruct` aliases) | Task 1 |
| Skill edits (build, implement, bugfix) | Tasks 3, 4, 5 |
| Agent file `model:` migration | Task 2 |
| Agent commit policy (scribe, debugger) | Task 6 |
| Harness-agnostic commit trailer (config, hook, policy) | Tasks 1, 7, 8, 9 |
| Bootstrap plugin (preamble, model resolution, hook wiring) | Task 11 |
| Hook adapter (TS, createHookHandler) | Task 10 |
| MCP config template | Task 12 |
| `init-plugin` / `inherit-plugin` config generation | Tasks 13, 14 |
| README dual-harness docs | Task 15 |
| CHEAT-SHEET dual-harness docs | Task 16 |
| Acceptance tests (bootstrap, brainstorm, model, hooks, MCP, docs, regression) | Task 17 (verification) + live session transcript (post-plan) |
| `package.json` creation | Task 11 |
| Backward compatibility (legacy Claude trailer fallback) | Task 9 (hook fallback) |
