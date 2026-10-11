# Your Staff Engineer in a Prompt: /inherit-plugin v2.8.0

v2.7.0 introduced `/inherit-plugin` -- a wizard that clones any Claude Code plugin and remaps it for your domain. It worked. But it had a gap: it treated components in bulk. "Keep all agents? Select some? None?" That's fine when you know the source plugin inside out. It's not fine when you're inheriting from a plugin someone else built and you need to understand what each piece does before deciding whether to keep it.

v2.8.0 fixes that. The wizard now behaves like a staff software engineer conducting an architecture review of the source plugin, walking you through every component one at a time.

## What Changed

### Component-by-Component Expert Walkthrough

The old Step 5 asked "agents: all/select/none" per category. The new Step 5 walks through every single component -- each rule, hook, agent, skill, convention, and MCP config -- individually. For each one, you get a structured analysis:

```
Rules 3/8: gids-secrets-management.md
File: plugins/gids-agent-orch/rules/gids-secrets-management.md

WHAT IT DOES:
Enforces that all application secrets are stored in HashiCorp Vault
using paths organized by CMDB ID and environment. Prevents hardcoded
secrets in code and ensures Vault token rotation practices are followed.

ARCHITECTURE FIT:
  - Depended on by: validate-no-hardcoded-secrets.sh (enforces detection
    patterns), validate-no-secret-leak.sh (blocks insecure Vault access)
  - Depends on: none
  - If removed: Both secret validation hooks become no-ops -- they'll
    still run but lack the policy definitions that give them teeth.

KEY DETAILS:
  - Vault paths follow pattern: secret/{cmdb-id}/{environment}/
  - References Spring Cloud Vault for app-level integration
  - Includes token rotation schedule (90-day max TTL)

PLANNED TRANSFORMATIONS:
  Based on your earlier decisions:
  - "GIDS" → "Health" (3 occurrences)
  - "HashiCorp Vault" → "AWS Secrets Manager" (7 occurrences)

OBSERVATION:
This rule and its two dependent hooks form a tightly coupled secrets
stack. Removing this rule without removing the hooks leaves orphaned
validation scripts. If you're swapping to AWS Secrets Manager, the
Vault token pattern (hvs.*) in the hooks won't apply -- you'll need
arn:aws:secretsmanager patterns instead.

What would you like to do with this component?
(a) Keep as-is (with transformations)
(b) Keep but modify -- I'll ask what changes you want
(c) Skip / Remove from your plugin
(d) Rename to: [type new name]
```

This is the level of analysis every component gets. Not a filename in a table. A staff-engineer explanation of what it does, why it exists, what depends on it, and what happens if you remove it.

### Four Actions Per Component

The old wizard gave you keep or drop. Now you have four options for every component:

**Keep as-is** -- Apply domain and tech transformations from your earlier decisions. The standard path.

**Keep but modify** -- Keep the component but make changes beyond simple find-and-replace. The wizard asks what you want to change and shows you what's possible for that component type:

```
What modifications do you want for gids-secrets-management.md?

Possible modifications for rules:
  Change what it enforces, add/remove validation patterns,
  relax/tighten constraints, update referenced URLs or tools

Describe your changes:
> Remove the token rotation section, add AWS IAM role-based access patterns
```

**Skip / Remove** -- Drop it from your plugin entirely. The wizard tracks this and automatically cleans up cross-references in other components that pointed to the skipped one.

**Rename** -- Keep the content but give it a new name. Cross-references in other files are updated automatically.

### Batch Mode for Large Plugins

Walking through 17 agents one at a time would be tedious. After the first 3 components in any category with more than 5 entries, the wizard offers an escape hatch:

```
You've reviewed 3 of 17 agents. Would you like to:
(a) Continue one-by-one for the remaining 14
(b) Keep all remaining agents as-is (with transformations)
(c) Skip all remaining agents
```

Review the critical ones individually, batch the rest.

### Decision Memory

Every run of `/inherit-plugin` now saves all wizard decisions to `.inherit-plugin-state.json` in your target repo. This file records everything: source URL, domain mappings, tech swaps, per-component decisions (keep/modify/skip/rename), naming, and branding.

On subsequent runs with the same source URL, the wizard detects the state file and offers three modes:

```
Found previous inheritance decisions from 2026-03-28T14:30:00Z:
Source: git@code.ssnc.dev:dt233894/claude-agent-gids-sdd-plugin.git
Target: health-agent-orch
Components: 12 kept, 3 modified, 2 skipped, 1 renamed

How would you like to proceed?
(a) Replay all decisions -- skip wizard, go straight to generation
(b) Start fresh -- ignore previous state entirely
(c) Review and edit -- walk through with previous answers pre-filled
```

**Replay** skips the entire wizard and regenerates immediately. Source plugin got updated? Replay picks up the new content and applies your existing decisions to it.

**Review and edit** walks through every question but pre-fills your previous answers. Just hit Enter to keep, or type a new answer to change. Perfect for tweaking one or two decisions without re-answering 40 questions.

**Start fresh** deletes the state file and runs the wizard from scratch.

The state file also handles drift. If the source plugin added new components or removed ones since your last run, Replay mode automatically switches to Review-and-edit so you can address the changes.

### Cross-Reference Cleanup

When you skip or rename a component, it doesn't just disappear from the output directory. The wizard scans every generated file for stale references:

- Agent files that mention skipped rules get those references removed
- Skills that invoke skipped agents get updated
- `hooks.json` entries for skipped scripts get cleaned out
- Renamed components get their references updated across all files

Each cleanup is logged and commented so you can trace what happened.

### Deep Dependency Analysis

Phase 2's silent analysis now builds a third inventory beyond technologies and domain terms: a **component dependency map**. For every component, the wizard traces:

- What other components reference it
- What it references
- Its architectural role (governance, enforcement, persona, workflow, style guide, integration)
- What would break if removed
- Any anti-patterns or unusually strong design patterns

This is what powers the ARCHITECTURE FIT section in the walkthrough. You see the dependency chains before you decide.

## The Full Flow

Here's what the improved wizard looks like end to end:

```bash
/agent-orch:inherit-plugin git@code.ssnc.dev:dt233894/claude-agent-gids-sdd-plugin.git
```

**Phase 1: Inventory** -- Clone, scan, show the bill of materials. If a state file exists from a previous run, offer Replay/Fresh/Edit.

**Phase 2: Interactive Mapping** -- Seven steps, each one at a time:
1. Business domain
2. Domain-specific terms (one by one, with context)
3. Technology decisions (one by one, with architectural observations)
4. Naming and branding
5. Component-by-component expert walkthrough (the new core)
6. Save state file
7. Review the complete transformation plan

**Phase 3: Generate** -- Create the plugin with four actions per component, apply modifications, clean up cross-references.

**Phase 4: Summary** -- List everything created, skipped, modified, renamed. Show next steps including how to re-run with the state file.

## Why This Matters

The original `/inherit-plugin` was a smart find-and-replace. It understood structure but not architecture. The v2.8.0 wizard understands both. It reads every file, traces every dependency, and explains every component like the person who built it would -- then asks you what to do with it.

This means:
- Teams inheriting from plugins they didn't build can make informed decisions instead of keeping everything or guessing what to drop
- Modified components carry the user's intent into generation instead of requiring manual post-generation edits
- The state file eliminates the "re-answer 40 questions" tax when the source plugin gets updated
- Cross-reference cleanup prevents the silent breakage that happens when you remove a component that other components depend on

## Install or Upgrade

### New Install

```bash
/plugin marketplace add git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git
/plugin install agent-orch@ssnc-agent-orch
```

### Existing Users

```bash
/plugin install agent-orch@ssnc-agent-orch
```

### Try It

Inherit from the GIDS SDD Plugin to create your own domain-specific plugin:

```bash
mkdir claude-agent-your-bu-plugin && cd claude-agent-your-bu-plugin
git init
/agent-orch:inherit-plugin git@code.ssnc.dev:dt233894/claude-agent-gids-sdd-plugin.git
```

The wizard does the thinking. You make the decisions.

---

*Claude Agent Orchestration Plugin v2.8.0 is available now via the Claude Code plugin marketplace at `code.ssnc.dev`.*
