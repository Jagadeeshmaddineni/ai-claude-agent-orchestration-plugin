---
name: inherit-plugin
description: Inherit from an existing plugin — clone, analyse, interactively remap domain and tech stack, generate a new plugin. Usage: /agent-orch:inherit-plugin <git-repo-url>
---

# Plugin Inheritance Wizard

Clone an existing Claude Code plugin and transform it into a new plugin for your domain.

## When to Use

Use this when you want to:
- Adapt an existing plugin for a different business unit or team
- Replace the tech stack (e.g., Terraform → Ansible, Spring Boot → Node.js)
- Keep the orchestration patterns but swap the domain-specific rules

---

## Usage

```
/agent-orch:inherit-plugin <git-repo-url>
```

Example:
```
/agent-orch:inherit-plugin git@github.com:myorg/gids-agent-orch.git
```

---

## Process

### Phase 1: Clone & Inventory

**Step 1: Parse arguments**

Extract the git repo URL from command arguments:
- If no URL provided, ask the user: "Please provide the git repository URL of the plugin you want to inherit from"
- Validate it looks like a git URL (contains `git@`, `https://`, or `http://`)
- If invalid format, show error and ask again

**Step 1.5: Check for previous inheritance state**

Before cloning, check if the current working directory contains `.inherit-plugin-state.json`:

If the file exists:
1. Read and parse it (if invalid JSON, warn: "Found .inherit-plugin-state.json but it contains invalid JSON. Starting fresh." and proceed normally)
2. Check the `version` field. If not `"1.0"`, warn: "State file version mismatch (found [N], expected 1.0). Backing up to .inherit-plugin-state.json.bak and starting fresh."
3. Compare `sourceRepo` field against the provided git URL
4. If they match, present:

```
Found previous inheritance decisions from [createdAt]:
Source: [sourceRepo]
Target: [identity.pluginName]
Components: [N] kept, [N] modified, [N] skipped, [N] renamed

How would you like to proceed?
(a) Replay all decisions -- skip wizard, go straight to generation
(b) Start fresh -- ignore previous state entirely
(c) Review and edit -- walk through decisions with previous answers pre-filled
```

Wait for response.

5. If they do NOT match:

```
Found state file from a different source plugin ([state.sourceRepo]).
Starting fresh for [provided URL].
```

Proceed to Step 2.

Actions:
- **(a) Replay**: Clone source (Step 2), skip Steps 3-4 and all of Phase 2, jump directly to Phase 3 using all decisions from the state file. Still clone the source temporarily because Phase 3 needs the file content.
- **(b) Fresh**: Delete the state file, proceed normally from Step 2
- **(c) Review and edit**: Clone source (Step 2), proceed through Phase 2 but pre-fill every prompt with the saved value. When presenting each question, show the saved answer in brackets and say "(press Enter to keep, or type a new answer)". If the user confirms without typing, keep the saved value.

If the file does not exist, proceed normally to Step 2.

**Step 2: Clone the source plugin**

```bash
TIMESTAMP=$(date +%s)
SOURCE_DIR="/tmp/inherit-plugin-source-${TIMESTAMP}"
git clone <url> ${SOURCE_DIR}
```

If clone fails:
- Check if it's an SSH auth issue: suggest `ssh-add` or HTTPS URL
- Check if repo doesn't exist: verify URL
- Show the exact git error to user
- Exit with: "Failed to clone source plugin. Please check the URL and your access permissions."

**If in Replay mode**: After successful clone, check if the source plugin has changed since the state was saved. Compare the source plugin's component files against the state file's `components` entries. If new components exist that aren't in the state, or components listed in the state no longer exist in the source:

```
Warning: The source plugin has changed since your last run ([updatedAt]).

New components not in state: [list]
Components in state but missing from source: [list]

Switching to "review and edit" mode so you can address the changes.
```

Switch to Review-and-edit mode automatically.

**Step 3: Inventory the source plugin**

Scan SOURCE_DIR and build a complete inventory. Read these files in order:

1. `.claude-plugin/marketplace.json` (validate it exists, else error "Not a Claude Code plugin marketplace")
2. Find plugin directory: `plugins/*/`
3. `plugins/*/.claude-plugin/plugin.json`
4. Count and list:
   - `plugins/*/agents/*.md` or `plugins/*/agents/*.json` files
   - `plugins/*/skills/*/SKILL.md` files
   - `plugins/*/rules/*.md` files
   - `plugins/*/conventions/*.md` files
   - `plugins/*/hooks/*.sh` files
   - `plugins/*/hooks/hooks.json` file
   - `plugins/*/mcp/.mcp.json` file (if exists)
   - `plugins/*/.claude-plugin/settings.json` file (if exists)

For each category, read the actual files to extract:
- **Agents**: name, description, model from frontmatter or JSON
- **Skills**: name, description from frontmatter
- **Rules**: filename, first heading or first line
- **Conventions**: filename, detect language/framework from filename or content
- **Hooks**: event type and description from hooks.json
- **MCP**: service name and type from .mcp.json

**Step 4: Present inventory to user**

Display the complete inventory:

```
Source Plugin Inventory:

Marketplace:
  Name: [marketplace.json → name]
  Display Name: [displayName]
  Version: [version]
  Owner: [owner.name] <[owner.email]>

Plugin:
  Name: [plugin.json → name]
  Directory: plugins/[name]/
  Description: [description]

Agents: [count]
  - [name]: [description] (model: [model])
  - ...

Skills: [count]
  - [name]: [description]
  - ...

Rules: [count]
  - [filename]: [heading or description]
  - ...

Conventions: [count]
  - [filename]: [language/framework detected]
  - ...

Hooks: [count]
  - [event]: [count] hooks
    - [description]
  - ...

MCP:
  - [service-name]: [type] (port: [port])
  OR: None configured

Settings:
  [List key environment variables if settings.json exists]
  OR: None configured

Ready to start the interactive mapping session? (yes/no)
```

Wait for user confirmation before proceeding.

---

### Phase 2: Interactive Discovery & Mapping

This phase has two parts: deep analysis (silent), then one-at-a-time interactive walkthrough with the user.

**CRITICAL**: Do NOT present batch tables and ask for all answers at once. Ask ONE question at a time. Wait for the user's response before moving to the next question.

---

#### Part A: Deep Analysis (before any user interaction)

Before asking the user anything, build a complete decision inventory by **reading the full content** of every file in the source plugin. Do NOT just scan filenames -- you must read the file body.

**For each rule file** (`rules/*.md`) -- Read the FULL content. Extract:
- What technology, tool, or product does this rule enforce? (e.g., "HashiCorp Vault" from a secrets rule, "Ansible" from a config management rule)
- What business-specific references exist? (internal URLs, team names, Confluence spaces, Jira projects, tool instance hostnames)
- What CLI commands or APIs does it reference? (e.g., `terraform`, `ansible-playbook`, `vault`)
- What validation patterns or conventions does it encode?

**For each hook script** (`hooks/*.sh`) -- Read the FULL content. Extract:
- What commands does it validate or block? (e.g., `terraform destroy`, `ansible-galaxy init`)
- What detection patterns does it use? (e.g., `hvs.` prefix for Vault tokens, `AKIA` prefix for AWS keys)
- What tool-specific logic is encoded in the validation?

**For each convention file** (`conventions/*.md`) -- Read the FULL content. Extract:
- What framework or language does it cover?
- What libraries, packages, or tools does it reference?
- What patterns are framework-specific vs. generic?

**For each agent definition** (`agents/*.md` or `agents/*.json`) -- Read the FULL content. Extract:
- What technologies are listed in the persona or expertise section?
- What tool-specific instructions exist?
- What domain-specific references exist?

**For MCP config** (`.mcp.json` or `mcp/`) -- Read and extract:
- What external service does it connect to? (e.g., Confluence, Jira)
- What authentication method and URLs does it use?

**For settings** (`.claude-plugin/settings.json`) -- Read and extract:
- What environment variables are defined?
- What technology or service do they relate to?

**For README** -- Read and extract:
- Installation instructions referencing specific tools
- Configuration steps for specific services
- Architecture descriptions naming technologies

**Build three inventories:**

1. **Technology decisions** -- each entry:
   - Name (e.g., "HashiCorp Vault")
   - Category (e.g., "Secrets management")
   - Purpose (e.g., "Stores application secrets by CMDB ID and environment")
   - Files where it appears (with what it does in each file)
   - Related detection patterns in hooks (if any)
   - Dependencies on other technologies (e.g., "Terraform outputs feed Ansible inventory")

2. **Business/domain decisions** -- each entry:
   - Term (e.g., "GIDS", "gids-", a Confluence space URL, a Jira project key)
   - What it represents (business unit name, filename prefix, internal URL, etc.)
   - Count of occurrences
   - Files where it appears

3. **Component dependency map** -- for each component file:
   - What other components reference or depend on this one (e.g., an agent that mentions specific rules, a skill that invokes specific agents, a hook that validates patterns defined in a rule)
   - What components this one references or depends on
   - Architectural role: governance (rules), enforcement (hooks), persona (agents), workflow (skills), style guide (conventions), integration (MCP)
   - What would break or degrade if this component were removed
   - Any architectural observations: anti-patterns, outdated approaches, duplicated logic, unusually strong design patterns worth preserving

**IMPORTANT**: Every technology that has a dedicated rule file, a hook that validates it, a convention file that covers it, or a presence in the agent persona MUST appear in the technology inventory. If the source plugin has 8 rule files covering 6 different technologies, all 6 technologies must be in the inventory. Missing a technology here means the user never gets asked about it.

---

#### Part B: One-at-a-Time Interactive Walkthrough

Present each decision to the user individually as a conversational question. Wait for their response before moving to the next question.

**If in Review-and-edit mode**: For every question below, show the saved answer from the state file in brackets and say "(press Enter to keep, or type a new answer)". If the user confirms without typing, keep the saved value and move on.

**Step 1: Business Domain**

```
The source plugin is built for the "[detected primary domain]" business unit.

What business unit or domain is your new plugin for?
```

Wait for user response. Store as TARGET_DOMAIN.

**Step 2: Domain-Specific Terms**

For EACH domain term found in Part A, ask individually:

```
I found "[term]" -- it appears to be [what it represents].

It appears [N] times in:
  - [file1] ([context of how it's used])
  - [file2] ([context of how it's used])
  - ...

What should this become in your plugin?
(a) Replace with: [suggest TARGET_DOMAIN variant if obvious, or ask user to type]
(b) Keep as-is
(c) Remove references to this term
```

Wait for response. Store in DOMAIN_MAP. Move to next term.

**IMPORTANT**: Auto-generate case variants for each mapping:
- If user maps "GIDS" → "WIT", automatically add: "gids" → "wit", "Gids" → "Wit", "gids-" → "wit-"

**Step 3: Technology Decisions**

For EACH technology found in Part A, ask individually. Group related technologies together where they form a stack, but still ask about each one.

For each technology:

```
[Category]: The source plugin uses [Technology Name] for [purpose].

It appears in [N] files:
  - [rules/file.md] -- [what the rule enforces about this technology]
  - [hooks/file.sh] -- [what the hook validates, including specific patterns like "hvs." or "AKIA"]
  - [conventions/file.md] -- [what conventions it defines]
  - [agents/file.md] -- [how it appears in the agent persona]
  - [.mcp.json] -- [what service it connects to]

[If this technology has dependencies on others]:
Note: [dependency info, e.g., "The Terraform rule generates outputs that feed into the Ansible inventory. If you change one, consider the other."]

[If hooks contain specific detection patterns]:
Note: The hooks contain [technology]-specific detection patterns (e.g., [pattern examples]). These will be updated to match your replacement.

[If there are architectural observations about this technology's usage]:
Observation: [e.g., "This uses Vault's v1 KV engine. V2 is now standard and supports versioning.", "The Terraform module registry pattern here is well-designed and worth preserving even with a different IaC tool."]

What would you like to use instead?
(a) Keep [Technology Name] as-is
(b) Replace with: [type your replacement]
(c) Remove this capability entirely
```

Wait for response. Store in TECH_MAP. Move to next technology.

**Order of technology questions** (by category, most impactful first):
1. Secrets management (e.g., Vault → AWS Secrets Manager)
2. Infrastructure provisioning (e.g., Terraform)
3. Configuration management (e.g., Ansible → Salt)
4. Monitoring & observability (e.g., Grafana Alloy, Prometheus, Loki, Tempo)
5. CI/CD (e.g., GitHub Actions → GitLab CI)
6. Cloud platform (e.g., SS&C Private Cloud → AWS)
7. Application framework (e.g., Spring Boot → FastAPI)
8. Documentation & collaboration (e.g., Confluence)
9. Any other technologies detected

**For tightly coupled stacks** (e.g., Grafana Alloy + Prometheus + Loki + Tempo), present them together:

```
Monitoring: The source plugin uses Grafana Alloy as the monitoring agent, collecting:
  - Metrics via Prometheus
  - Logs via Loki
  - Traces via Tempo

This stack appears in:
  - rules/[monitoring-rule].md -- enforces Alloy configuration
  - agents/[agent].md -- listed in persona expertise

What would you like to use for monitoring?
(a) Keep the Grafana Alloy stack (Prometheus + Loki + Tempo)
(b) Replace with: [type your monitoring stack, e.g., "Datadog", "CloudWatch", "ELK"]
(c) Remove monitoring rules and conventions
```

**Step 4: Naming & Branding**

Ask each question individually:

```
Let's set up your plugin identity.

Plugin name (lowercase-with-hyphens, e.g., "wit-agent-orch"):
```
Wait for response. Store as PLUGIN_NAME.

```
Marketplace name (e.g., "ssnc-wit-agent-orch"):
```
Wait for response. Store as MARKETPLACE_NAME.

```
Display name (e.g., "SS&C WIT Agent Orchestration Plugin"):
```
Wait for response. Store as DISPLAY_NAME.

```
Short description of what your plugin does:
```
Wait for response. Store as DESCRIPTION.

```
Owner name (person or team):
```
Wait for response. Store as OWNER_NAME.

```
Owner email:
```
Wait for response. Store as OWNER_EMAIL.

**Step 5: Component-by-Component Expert Walkthrough**

Walk through EVERY component in the source plugin individually, acting as a staff software engineer conducting an architecture review. Present components in this order:

1. Rules (governance constraints)
2. Hooks (enforcement mechanisms)
3. Agents (personas and expertise)
4. Skills (workflows and commands)
5. Conventions (style and pattern guides)
6. MCP (external service integrations)

Within each category, present components ordered by how many other components depend on them (most depended-on first).

**CRITICAL**: Ask about ONE component at a time. Wait for the user's response before presenting the next component.

**Category header** (show once when entering each category):

```
--- [CATEGORY]: [N] components ---
Let's walk through each [category] one at a time.
```

**For EACH component, present this analysis:**

```
[Category] [current]/[total]: [component name]
File: [relative path in source plugin]

WHAT IT DOES:
[2-3 sentence summary of what this component does and WHY it exists. Not just "it's a rule about Terraform" but "It enforces that all Terraform plans must include cost estimation tags and be validated against the organization's module registry before apply. This prevents unreviewed infrastructure costs and ensures compliance with the shared module library."]

ARCHITECTURE FIT:
  - Depended on by: [list components that reference or depend on this one, or "none"]
  - Depends on: [list components this one references, or "none"]
  - If removed: [what would break or degrade, e.g., "The validate-infra hook would still run but would lack the policy definitions this rule provides, making it a no-op."]

KEY DETAILS:
  - [2-3 most important implementation specifics, e.g.:]
  - [e.g., "Validates token patterns matching /hvs\.[a-zA-Z0-9]{24}/ for Vault"]
  - [e.g., "Blocks `terraform destroy` without explicit approval flag"]
  - [e.g., "References Jira project key GIDS-* for ticket linking"]

PLANNED TRANSFORMATIONS:
  Based on your earlier decisions, this component will have:
  - [domain term] → [replacement] ([N] occurrences)
  - [tech term] → [replacement] ([N] occurrences)
  [OR: "No transformations needed -- this component has no domain/tech-specific content."]

[If there are architectural observations -- include ONLY when genuinely useful]:
OBSERVATION:
  [Expert-level insight. Examples:]
  - "This rule duplicates logic also found in [hook name]. Consider consolidating."
  - "The validation pattern here is brittle -- it matches by string prefix rather than parsing the config format."
  - "This convention references [framework] v3 patterns but v4 has been out for 2 years."
  - "This is one of the strongest components -- the escalation matrix pattern ensures destructive operations always get human review."
  - "These three rules form a tightly coupled stack -- removing one without the others leaves gaps in validation coverage."

What would you like to do with this component?
(a) Keep as-is (with domain/tech transformations from your earlier decisions)
(b) Keep but modify -- I'll ask what changes you want
(c) Skip / Remove from your plugin
(d) Rename to: [type new name]
```

Wait for response.

**If user chooses (b) "Keep but modify":**

```
What modifications do you want for [component name]?

Possible modifications for [category type]:
```

Show the relevant options for the component type:
- **Rules**: Change what it enforces, add/remove validation patterns, relax/tighten constraints, update referenced URLs or tools, merge with another rule
- **Hooks**: Change detection patterns, update blocked/allowed commands, modify error messages, add/remove validation logic
- **Agents**: Update expertise areas, modify persona description, add/remove tool references, change coordination instructions, adjust model tier
- **Skills**: Update workflow steps, modify commands referenced, change output format, add/remove phases
- **Conventions**: Update framework patterns, modify code examples, change style rules, add/remove language coverage

```
Describe your changes:
```

Wait for response. Store in component decision as `modifications` field.

**If user chooses (d) "Rename":**

```
What should [component name] be renamed to?
(just the name, not the file extension)
```

Wait for response. Store as `newName` field.

**Batch mode escape hatch**: After presenting the first 3 components in any category that has more than 5 components, offer:

```
You've reviewed 3 of [N] [category]. Would you like to:
(a) Continue one-by-one for the remaining [N-3]
(b) Keep all remaining [category] as-is (with transformations)
(c) Skip all remaining [category]
```

If user chooses (b) or (c), apply that action to all remaining components in the category and move to the next category.

**Category tally** (show after completing each category):

```
[Category] decisions: [N] kept, [N] modified, [N] skipped, [N] renamed
```

**Step 6: Save State File**

Write all wizard decisions to `.inherit-plugin-state.json` in the current working directory.

The file must contain:

```json
{
  "version": "1.0",
  "createdAt": "[current ISO-8601 timestamp]",
  "updatedAt": "[current ISO-8601 timestamp]",
  "sourceRepo": "[the git URL provided]",
  "sourcePluginName": "[source plugin name from marketplace.json]",
  "identity": {
    "pluginName": "[PLUGIN_NAME]",
    "marketplaceName": "[MARKETPLACE_NAME]",
    "displayName": "[DISPLAY_NAME]",
    "description": "[DESCRIPTION]",
    "ownerName": "[OWNER_NAME]",
    "ownerEmail": "[OWNER_EMAIL]"
  },
  "domainMapping": {
    "targetDomain": "[TARGET_DOMAIN]",
    "terms": [
      {
        "source": "[original term]",
        "target": "[replacement]",
        "action": "replace|keep|remove",
        "autoVariants": ["UPPER->UPPER", "lower->lower", "Title->Title", "kebab-->kebab-"]
      }
    ]
  },
  "technologyMapping": [
    {
      "name": "[Technology Name]",
      "category": "[category]",
      "action": "keep|replace|remove",
      "replacement": "[replacement name or null]"
    }
  ],
  "components": {
    "rules": [
      {
        "name": "[component name]",
        "sourceFile": "[relative path in source]",
        "action": "keep|modify|skip|rename",
        "modifications": "[free-text description of changes, or null]",
        "newName": "[new name if renamed, or null]"
      }
    ],
    "hooks": [],
    "agents": [],
    "skills": [],
    "conventions": [],
    "mcp": {
      "action": "keep|skip",
      "modifications": "[or null]"
    }
  }
}
```

Tell the user:

```
Saved all decisions to .inherit-plugin-state.json
You can re-run /inherit-plugin with the same source URL to replay or edit these decisions.
Consider adding .inherit-plugin-state.json to .gitignore (it's a local workflow artifact).
```

**Step 7: Review All Decisions**

Present the complete transformation plan for final approval:

```
=== TRANSFORMATION PLAN ===

Source Plugin: [source plugin name]
Target Plugin: [PLUGIN_NAME]

Domain Mapping: [N] terms
  [source term] → [target term]
  [source term] → [target term]
  ...

Technology Decisions: [N] technologies
  [category]: [source tech] → [target tech]
  [category]: [source tech] → kept as-is
  [category]: [source tech] → removed
  ...

Plugin Identity:
  Name: [PLUGIN_NAME]
  Marketplace: [MARKETPLACE_NAME]
  Display Name: [DISPLAY_NAME]
  Description: [DESCRIPTION]
  Owner: [OWNER_NAME] <[OWNER_EMAIL]>

Components:

  Rules ([N] total):
    [keep] [name]
    [mod]  [name] -- [brief modification summary]
    [skip] [name]
    [=>]   [old name] → [new name]

  Hooks ([N] total):
    [keep] [name]
    ...

  Agents ([N] total):
    [keep] [name]
    ...

  Skills ([N] total):
    [keep] [name]
    ...

  Conventions ([N] total):
    [keep] [name]
    ...

  MCP: [keep/skip]

Proceed with generation? (yes / edit / cancel)
```

Actions:
- **yes**: Continue to Phase 3
- **edit**: Ask which section to revisit, return to that step
- **cancel**: Exit with "Generation cancelled. No files were created."

---

### Phase 3: Generate Plugin

**Step 1: Verify target directory**

Check if current working directory already has `.claude-plugin/`:

```bash
if [ -d ".claude-plugin" ]; then
  echo "WARNING: This directory already has a .claude-plugin/ directory."
  echo "Continuing will add/overwrite plugin files."
  echo "Proceed? (yes/no)"
fi
```

If user says no, exit.

**Step 2: Create directory structure**

```bash
mkdir -p .claude-plugin
mkdir -p plugins/${PLUGIN_NAME}/.claude-plugin
```

For each category that has at least one kept, modified, or renamed component, create directories:
```bash
[ has kept/modified/renamed agents ] && mkdir -p plugins/${PLUGIN_NAME}/agents
[ has kept/modified/renamed skills ] && mkdir -p plugins/${PLUGIN_NAME}/skills
[ has kept/modified/renamed rules ] && mkdir -p plugins/${PLUGIN_NAME}/rules
[ has kept/modified/renamed conventions ] && mkdir -p plugins/${PLUGIN_NAME}/conventions
[ has kept/modified/renamed hooks ] && mkdir -p plugins/${PLUGIN_NAME}/hooks
[ keep MCP ] && mkdir -p plugins/${PLUGIN_NAME}/mcp
```

**Step 3: Generate marketplace.json**

Read source marketplace.json and transform:

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "[MARKETPLACE_NAME]",
  "displayName": "[DISPLAY_NAME]",
  "description": "[DESCRIPTION]",
  "version": "0.1.0",
  "owner": {
    "name": "[OWNER_NAME]",
    "email": "[OWNER_EMAIL]"
  },
  "plugins": [
    {
      "name": "[PLUGIN_NAME]",
      "source": "./plugins/[PLUGIN_NAME]",
      "version": "0.1.0",
      "description": "[DESCRIPTION]",
      "tags": [adapt from source + add TARGET_DOMAIN terms]
    }
  ]
}
```

Write to `.claude-plugin/marketplace.json`

**Step 4: Generate plugin.json**

```json
{
  "name": "[PLUGIN_NAME]",
  "description": "[DESCRIPTION]",
  "version": "0.1.0",
  "author": {
    "name": "[OWNER_NAME]",
    "email": "[OWNER_EMAIL]"
  },
  "license": "MIT"
}
```

Write to `plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json`

### Write `.agent-orch-models.json` at the new plugin's repo root

Generate the central model + commit-attribution config for the new plugin. Map the source plugin's agent model declarations to `thinking`/`instruct` aliases:

```bash
cat > .agent-orch-models.json <<'CONFIG'  # template: .agent-orch-models.example.json in the plugin repo
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

If the new plugin defines additional agents (domain-specific), add them to the `agents` block with the appropriate alias. If the user is on OpenCode, recommend running `/agent-orch:config` instead — it presents a numbered picker of available models and writes the config automatically. If they prefer to edit by hand, set `commit_attribution.harness` to `"opencode"` and the `aliases` to their full model IDs.

**Step 5: Transform and copy files**

For each component in the decision map, process based on the action:

**action = "keep"**:
1. Read source file content
2. Apply domain mappings (case-sensitive: exact case, lowercase, title case, kebab-case)
3. Apply tech stack substitutions (case-sensitive and lowercase)
4. Apply filename transformations (domain prefix mappings, e.g., `gids-terraform.md` → `wit-terraform.md`)
5. Write to target path: `plugins/${PLUGIN_NAME}/[category]/[transformed-filename]`

**action = "modify"**:
1. Read source file content
2. Apply domain + tech transformations (same as "keep")
3. Apply the user's modification instructions as additional content changes. Interpret the free-text modification description and make appropriate edits to the file content (e.g., if user said "remove Ansible references, add Puppet expertise" for an agent, update the persona section accordingly)
4. Add a comment at the top of the file: `<!-- Modified during inheritance: [brief modification summary] -->`
5. Write to target path

**action = "skip"**:
- Do not copy this file
- Log: "Skipped: [filename]"

**action = "rename"**:
1. Read source file content
2. Apply domain + tech transformations (same as "keep")
3. Rename the file using the new name provided by the user
4. Update any internal self-references (e.g., if the file references its own name)
5. Write to target path with new filename

**Category-specific transformation details:**

**Agents** (`agents/*.md` or `agents/*.json`):
- Transform `name`, `description`, `persona` fields
- Update any tool references in persona
- Update team coordination sections
- Keep `model` and `max_tokens` unchanged unless modification specifies otherwise

**Skills** (`skills/*/SKILL.md`):
- Transform frontmatter `description`
- Update agent references (e.g., `agent-orch:orchestrate-X` if plugin name changed)
- Transform content with domain + tech mappings

**Rules** (`rules/*.md`):
- Transform filenames (domain prefixes)
- Transform content: tool names, CLI commands, URLs, validation patterns
- Update example code blocks with new tech stack

**Conventions** (`conventions/*.md`):
- Transform filenames (tech stack names)
- If tech stack was swapped, replace framework-specific examples
- Add TODO comments for user to fill in details: `<!-- TODO: Add [new framework] specific patterns -->`

**Hooks** (`hooks/*.sh` and `hooks/hooks.json`):
- Transform script filenames
- Transform content: command names, validation patterns, error messages
- Update `hooks.json`: transform script paths, event names, descriptions
- Remove entries from `hooks.json` for any skipped hook scripts
- Keep hook event types unless explicitly removed

**MCP** (`mcp/.mcp.json` and binaries):
- Transform service name and description
- Update URLs with domain mappings
- Copy config only (skip binaries with warning)
- Add note: "MCP binaries not copied - rebuild with source code"

**Settings** (`.claude-plugin/settings.json` if exists):
- Transform env var names with domain prefixes
- Transform descriptions and default values
- Keep structure intact

**Step 5.5: Cross-reference cleanup**

After all component files are generated, scan for stale cross-references caused by skipped or renamed components:

- Agent files referencing skipped rules or skills → remove the reference
- Skills referencing skipped agents → remove the reference
- hooks.json referencing skipped hook scripts → remove the entry
- README referencing skipped components → remove the reference
- Any file referencing a renamed component → update to the new name

For each stale reference found:
- Remove or update the reference
- Add a comment: `<!-- Reference to [skipped/old component] removed/updated during inheritance -->`
- Log: "Updated cross-reference in [file]: [action] reference to [component]"

**Step 6: Generate README.md**

If source has README.md, transform it:
- Apply domain + tech mappings to content
- Add header noting it was generated from source
- Update installation commands with new marketplace name
- Update skill command examples with new plugin name
- Remove references to skipped components

If no source README, generate a basic one:

```markdown
# [DISPLAY_NAME]

Inherited from [source plugin name] and adapted for [TARGET_DOMAIN].

## Installation

\`\`\`bash
/plugin marketplace add .
\`\`\`

## Features

[List kept capabilities: agents, skills, rules, hooks -- only those not skipped]

## Configuration

[If settings.json exists, document env vars]

## Usage

[List skill commands if any kept]

## Development

This plugin was generated using /agent-orch:inherit-plugin.

To customize:
1. Review and adapt rules in plugins/[name]/rules/
2. Modify hooks for your validation requirements
3. Tune agent personas if needed
4. Update conventions for your tech stack specifics

## License

MIT
```

Write to `README.md` at repo root.

---

### Phase 4: Summary

Present completion summary:

```
=== PLUGIN GENERATED SUCCESSFULLY ===

Created [N] files in plugins/[PLUGIN_NAME]/

Directory Structure:
[Run: tree -L 3 plugins/[PLUGIN_NAME] -I node_modules]

Files Created:
  Core:
    - .claude-plugin/marketplace.json
    - plugins/[PLUGIN_NAME]/.claude-plugin/plugin.json
    - README.md

  State:
    - .inherit-plugin-state.json (re-run /inherit-plugin to replay decisions)

  [if agents kept/modified/renamed]
  Agents ([N]):
    - plugins/[PLUGIN_NAME]/agents/[list names]
    [if any modified]: (modified) [name] -- [brief summary]
    [if any renamed]: (renamed) [old] → [new]

  [if skills kept/modified/renamed]
  Skills ([N]):
    - plugins/[PLUGIN_NAME]/skills/[list names]

  [if rules kept/modified/renamed]
  Rules ([N]):
    - plugins/[PLUGIN_NAME]/rules/[list filenames]

  [if conventions kept/modified/renamed]
  Conventions ([N]):
    - plugins/[PLUGIN_NAME]/conventions/[list filenames]

  [if hooks kept/modified/renamed]
  Hooks ([N]):
    - plugins/[PLUGIN_NAME]/hooks/[list filenames]
    - plugins/[PLUGIN_NAME]/hooks/hooks.json

  [if MCP kept]
  MCP:
    - plugins/[PLUGIN_NAME]/mcp/.mcp.json
    [if binaries found] WARNING: MCP binaries not copied - rebuild from source

Skipped Components: [N]
  [list each skipped component: category/name]

Applied Transformations:
  - Domain: [N] term replacements across [M] files
  - Tech: [N] technology replacements across [M] files
  - Renamed: [N] files with domain/tech prefixes
  - Modified: [N] components with custom changes
  - Cross-references: [N] stale references cleaned up

Next Steps:

1. Review Generated Files
   Priority areas (domain-specific logic):
   - rules/*.md - Verify validation patterns match your tools
   - hooks/*.sh - Verify safety gates are appropriate
   - conventions/*.md - Add tech-specific details (look for TODO comments)
   [if any modified components]:
   - Modified components (look for "Modified during inheritance" comments)

2. Configuration
   [if settings.json exists]
   - Add required credentials/tokens to plugins/[PLUGIN_NAME]/.claude-plugin/settings.json
   [if MCP kept]
   - Rebuild MCP server from source if needed

3. Test the Plugin
   /plugin marketplace add .
   /plugin list

4. Iterate
   - Modify agent personas for your team's needs
   - Add domain-specific rules
   - Refine hook validation logic
   - Update skill workflows

5. Distribute
   - Commit to git
   - Push to your team's repository
   - Share marketplace URL with team

6. Future Inheritance
   - Re-run /inherit-plugin with the same source URL to update or revise decisions
   - Hand-edit .inherit-plugin-state.json to adjust decisions manually
   - Consider adding .inherit-plugin-state.json to .gitignore (local workflow artifact)

Warnings:
[if any files were skipped]
  - [N] components skipped (removed from plugin)
[if any cross-references were cleaned up]
  - [N] cross-references updated due to skipped/renamed components
[if MCP binaries present]
  - MCP binaries require rebuild from source
[if conventions had tech swaps]
  - Convention files contain TODOs for tech-specific details
```

**Cleanup:**
```bash
rm -rf ${SOURCE_DIR}
```

---

## Edge Cases

**No marketplace.json in source:**
```
Error: This doesn't appear to be a Claude Code plugin repository.
Expected: .claude-plugin/marketplace.json
Found: [none]

Please verify the repository URL points to a valid Claude Code plugin.
```

**Multiple plugins in source marketplace:**
```
Found [N] plugins in source marketplace:
  1. [plugin-name-1] - [description]
  2. [plugin-name-2] - [description]
  ...

Which plugin do you want to inherit from? (enter number)
```

**Source has dependency artifacts (node_modules, bun.lock, etc.):**
- Skip automatically with log message: "Skipping dependency artifacts (node_modules, .lock files)"
- Copy package.json, tsconfig.json, etc. but not generated files

**Empty capability directories:**
- Don't show that category in inventory
- Skip in component walkthrough

**User types invalid mapping format:**
```
Invalid format. Please use: term1=replacement1, term2=replacement2
Or type "same" or "skip" for each term.
```

**Git clone requires authentication:**
```
Git clone failed with authentication error.

For SSH URLs:
  - Ensure your SSH key is added: ssh-add ~/.ssh/id_rsa
  - Verify SSH access: ssh -T git@github.com

For HTTPS URLs:
  - Try SSH URL instead: git@github.com:org/repo.git
  - Or configure git credential helper

Error details:
[git error output]
```

**Target directory already has files:**
```
WARNING: Target plugin directory already exists: plugins/[PLUGIN_NAME]/

This will overwrite existing files. Continue? (yes/no)
```

**Transformation conflict (term appears in tech and domain):**
- Apply domain mapping first, then tech mapping
- Log: "Note: '[term]' mapped in both domain and tech - applying domain mapping first"

**File encoding issues:**
- Skip binary files automatically
- Log: "Skipped binary file: [path]"

**Permission errors during directory creation:**
```
Error: Cannot create directory [path]
Permission denied.

Please check write permissions in current directory.
```

**State file exists but is corrupted/invalid JSON:**
```
Warning: Found .inherit-plugin-state.json but it contains invalid JSON.
Starting fresh. The corrupted file will be overwritten at the end of the wizard.
```

**State file version mismatch:**
```
Found .inherit-plugin-state.json (version [N]) but this wizard expects version 1.0.
Backing up to .inherit-plugin-state.json.bak and starting fresh.
```

**Source plugin changed since state was saved (Replay mode):**
```
Warning: The source plugin has changed since your last run ([updatedAt]).

New components not in state: [list]
Components in state but missing from source: [list]

Switching to "review and edit" mode so you can address the changes.
```

---

## Expert Analysis Tone

When presenting each component during the walkthrough, adopt the voice of a staff software engineer conducting an architecture review. This section provides guidance on the quality and style of analysis.

**DO:**
- Explain the "why" behind each component, not just the "what"
- Identify dependency chains: "If you remove this rule, the hook at hooks/validate-X.sh becomes orphaned since it enforces this rule's patterns"
- Flag improvements: "This hook uses string matching for secret detection. A regex-based approach would catch more variants"
- Acknowledge strong patterns: "The escalation matrix in this agent is well-designed -- it ensures destructive operations always get human review"
- Note when components are tightly coupled: "These three rules form a stack -- removing one without the others will leave gaps in validation coverage"
- Provide migration guidance when tech is swapped: "If you replace Vault with AWS Secrets Manager, the token detection pattern (hvs.*) won't apply -- you'll need arn:aws:secretsmanager patterns instead"
- Call out when a component is generic vs domain-specific: "This convention file is pure language style -- it has no domain or tech dependencies and will work as-is in any plugin"

**DON'T:**
- Be verbose -- keep each component analysis to ~15-20 lines max
- Hedge excessively -- give clear opinions backed by what you see in the code
- Repeat information the user already confirmed in earlier steps
- Present analysis for skipped/removed components when they appear as cross-references later
- Invent problems that don't exist in the actual file content -- only flag genuine observations

---

## Implementation Notes

**File Detection Patterns:**

Domain terms:
- Capital acronyms appearing 3+ times
- Words in plugin name or display name
- Prefix patterns in filenames (e.g., `gids-*.md`)
- Jira project keys and Confluence space identifiers
- Tool instance hostnames

Tech terms:
- Known frameworks: spring, springboot, nodejs, react, angular, vue, django, flask
- Known tools: terraform, ansible, vault, docker, kubernetes, aws, azure, gcp
- CLI commands: tf, aws, kubectl, docker, az, gcloud
- Config files: .tf, .yaml, .yml, pom.xml, package.json, requirements.txt

**Transformation Order:**
1. Filename transformations (create rename map)
2. Content transformations per file:
   a. Domain exact case
   b. Domain lowercase
   c. Domain kebab-case
   d. Tech exact case
   e. Tech lowercase
   f. Tech kebab-case
3. Special file updates (hooks.json paths, agent references)
4. Custom modifications (for "modify" action components)
5. Cross-reference cleanup (for skipped/renamed components)

**Testing Approach:**
- After generation, suggest user runs: `/plugin list` to verify plugin loads
- If errors, point to plugin.json syntax
- Suggest starting with one skill to test: `/[plugin-name]:[skill-name]`

---

## Security Notes

**Per CISSP/CCSP/CSSLP principles:**

1. **Secrets handling**: Warn if source settings.json contains hardcoded secrets
   ```
   WARNING: Source settings.json may contain credentials.
   Review plugins/[name]/.claude-plugin/settings.json before committing.
   ```

2. **Hook script safety**: When transforming hooks, preserve validation patterns
   - Don't accidentally disable security gates
   - Add comment if tech swap makes validation unclear: `# TODO: Update validation for [new tech]`

3. **Dependency security**: Warn about source dependencies
   ```
   Note: Review dependencies in [package.json/requirements.txt/etc] for vulnerabilities.
   Run security scan after installation: [npm audit / pip-audit / etc]
   ```

4. **File permissions**: Preserve executable bits for hook scripts
   ```bash
   chmod +x plugins/${PLUGIN_NAME}/hooks/*.sh
   ```

5. **Data protection**: Scrub any PII or sensitive URLs from example content
   - If source has hardcoded IPs, domains, or identifiers, flag for review
   ```
   REVIEW REQUIRED: Found hardcoded values in [file]:
   - [IP address or domain]
   Verify these should be in the new plugin.
   ```

6. **State file security**: The `.inherit-plugin-state.json` file may contain source repo URLs and organizational terms. Recommend `.gitignore` to prevent accidental exposure of internal naming conventions.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.inherit-plugin:` entry. If the file is absent, has no
entry for this skill, or the entry is empty, **run exactly as documented above — no
behaviour change.** This is the default and most common case.

If an entry exists, this skill exposes these hook points:
- `before` — targets run before the skill's main work
- `after` — targets run after the skill's main work

Run any listed targets in order, following the shared resolver in
`plugins/agent-orch/rules/extension-resolver.md` (scripts execute, `.md` files are
read-and-acted, `.loop-library/*.yaml` run as loops, `/skill` refs invoke inline).
Tell the user when you run an extension target. A failing target is surfaced but does
NOT abort the skill unless the user aborts. Full contract:
`plugins/agent-orch/rules/extensibility.md`.
