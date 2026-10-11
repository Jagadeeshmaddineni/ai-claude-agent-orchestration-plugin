# Proposal: `/add-skill` - Fine-Grained Skill Installation

## Problem

Today, Claude Code plugins are all-or-nothing. You install a full plugin and get everything it contains: all agents, all skills, all rules, all hooks. This creates friction:

1. **Heavyweight adoption** - A team that only needs `/olly` (observability) must install the entire agent orchestration plugin with 26 agents and 19 skills
2. **Noise** - Skills irrelevant to a team's domain appear in autocomplete and consume context
3. **Version coupling** - A bug fix in one skill forces a plugin-wide upgrade
4. **Discovery friction** - `/discover-plugin` shows full plugins, not individual capabilities a team might cherry-pick

## Proposed Solution: `/add-skill`

A fine-grained installation command that fetches individual skills (or small skill bundles) from the catalog without requiring a full plugin install.

### Usage

```bash
# Add a single skill from the catalog
/add-skill olly

# Add a skill from a specific plugin
/add-skill agent-orch:olly

# Add a skill from a remote repo
/add-skill git@code.ssnc.dev:cloud/ai-resources.git:cloud-architect

# Add multiple skills
/add-skill olly c4 simplify

# List available skills
/add-skill --list

# Remove an added skill
/add-skill --remove olly
```

### How It Works

```
User runs /add-skill olly
    |
    v
1. Search catalog for skill "olly"
    |
    v
2. Resolve source plugin (agent-orch in this case)
    |
    v
3. Clone source plugin (shallow, to temp dir)
    |
    v
4. Extract just the skill:
   - plugins/agent-orch/skills/olly/SKILL.md
   - Any dependent agents referenced in the skill
   - Any dependent rules referenced in the skill
    |
    v
5. Install to local project:
   - .claude/skills/olly/SKILL.md
   - .claude/agents/ (only required agents)
    |
    v
6. Register in .claude/settings.json
    |
    v
7. Cleanup temp clone
```

### Dependency Resolution

Skills often depend on agents. The `/add-skill` command must resolve these:

```yaml
# Example: /add-skill olly
# SKILL.md references orchestrate-telemetry agent
# Resolution:
#   - Install skills/olly/SKILL.md
#   - Install agents/orchestrate-telemetry.md
#   - Install agents/orchestrate-devops.md (telemetry skill also uses devops for docker-compose)
```

### Skill Manifest Extension

Skills would need a `dependencies` field in their frontmatter:

```yaml
---
name: olly
description: Add OpenTelemetry observability to any codebase
dependencies:
  agents:
    - orchestrate-telemetry
    - orchestrate-devops
  rules: []
  conventions: []
---
```

### Catalog Integration

The Plugin Discovery catalog (`plugin.md` manifests) already inventory skills with name and description. The `/add-skill` command would:

1. Index all skills across all catalog entries
2. Present a flat, searchable list (no plugin hierarchy)
3. Auto-resolve which plugin to clone based on the skill's source

### Conflict Resolution

When a skill from plugin A depends on an agent that's also in locally-installed plugin B:

- **Same version**: Skip, use existing
- **Different version**: Warn, ask user which to keep
- **No overlap**: Install cleanly

### What This Enables

| Scenario | Today | With `/add-skill` |
|----------|-------|-------------------|
| Team wants observability only | Install full agent-orch (26 agents, 19 skills) | `/add-skill olly` (1 skill, 2 agents) |
| Team wants cloud architect advice | Install full ssnc-cloud (3 plugins) | `/add-skill cloud-architect` |
| Team wants safe contributor guardrails | Install full ssnc-cloud | `/add-skill safe-contributor` |
| Team building custom plugin wants observability | Install full agent-orch | `/add-skill olly` + customize |

### Relationship to Existing Commands

| Command | Scope | Use When |
|---------|-------|----------|
| `/plugin install` | Full plugin | You want everything a team offers |
| `/plugin-discover:inherit-plugin` | Full plugin + remapping | You want to fork and adapt a plugin |
| `/add-skill` (proposed) | Individual skill + deps | You want a specific capability |
| `/find-plugin` | Discovery | You're searching for what exists |

### Implementation Phases

**Phase 1: Local extraction** (MVP)
- `/add-skill` extracts skills from locally installed plugins
- No network, no catalog - just reorganizes what's already there
- Useful for teams who installed agent-orch but want to slim down

**Phase 2: Catalog integration**
- `/add-skill` searches the discovery catalog
- Shallow clones, extracts skill + dependencies
- Installs to `.claude/skills/`

**Phase 3: Skill registry**
- Skills declare dependencies explicitly
- Catalog indexes skills as first-class entities (not nested under plugins)
- `/add-skill --list` shows all available skills across SS&C
- Version pinning per skill

### Open Questions

1. **Where do added skills live?** `.claude/skills/` (project-local) or `~/.claude/skills/` (global)?
2. **How are updates handled?** Auto-update on `/upgrade-plugin`? Manual `/add-skill --update`?
3. **Should skills be composable?** Can a skill declare that it enhances another skill?
4. **How do we handle skill name collisions?** Two plugins might have a `deploy` skill.
5. **Should this be in the discovery plugin or the orchestration plugin?** Discovery makes more sense architecturally, but orchestration has the larger user base.

### Recommendation

Build Phase 1 in the **discovery plugin** (`code-plugin-discovery`) since it already manages the catalog and has `/find-plugin` for search. The orchestration plugin should not grow responsibility for package management.

Phase 2 depends on extending the `plugin.md` manifest format with per-skill dependency declarations - a change to the CONTRIBUTING.md spec.
