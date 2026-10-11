---
name: upgrade-plugin
description: Seamless upgrade wizard -- pull upstream plugin changes, walk through diffs one file at a time, three-way merge to preserve local customizations, and refresh CLAUDE.md hierarchy. Usage: /agent-orch:upgrade-plugin
---

# Upgrade Plugin Wizard

Pulls upstream improvements into a repo that's already been initialized with `/init-plugin`, while preserving local customizations through three-way merge. Walks the user through every change -- nothing is silently applied.

## Design Principles

- **Wizard, not wall-of-text.** Walk the user through every change, one at a time.
- **Healthy CLAUDE.md is a precondition.** Run `setup-claude-md` as a health check before doing anything, and again at the end.
- **Never silently apply changes.** Every file addition, modification, and removal is presented for user decision.
- **Three-way merge preserves local work.** Use the upstream snapshot from `/init-plugin` as the merge base.

## Relationship to `/init-plugin`

These two skills share a contract. `/init-plugin` creates; `/upgrade-plugin` maintains.

| Structure | Created by `/init-plugin` | Used by `/upgrade-plugin` |
|-----------|--------------------------|--------------------------|
| `.claude/plugins.json` | Records installed plugins + versions | Reads to determine what needs upgrading |
| `.claude/plugins/[name]@[version]/` | Stores upstream snapshots as base | Compares base vs upstream for three-way merge |
| `.claude/rules/` | Populates with plugin rules | Detects local modifications for merge decisions |
| `.claude/upgrade-state.json` | N/A (created on first upgrade) | Records all upgrade decisions for audit/replay |
| `CLAUDE.md` hierarchy | Created by setup-claude-md | Refreshed by setup-claude-md after upgrade |
| Governance dirs (`.gids/`, etc.) | Created during plugin config phase | Checked for local modifications during upgrade |

---

## File Ownership Model

Every file in the repo falls into one of these categories:

| Ownership | Examples | On Upgrade |
|-----------|----------|-----------|
| **Upstream-owned** | Plugin snapshots in `.claude/plugins/[name]@[version]/` | Replaced entirely with new version |
| **Locally-owned** | Root `CLAUDE.md`, subdirectory `CLAUDE.md` files, custom rules | Never touched -- user's territory |
| **Shared** | Rules/conventions originally from a plugin but locally modified | Three-way merge with user walkthrough |
| **Metadata** | `.claude/plugins.json`, `.claude/upgrade-state.json` | Updated by the upgrade process |

---

## Process

### Phase 0: Health Check (automatic)

Run `setup-claude-md` in validation mode before anything else:

```
Running CLAUDE.md health check...

  [ok] CLAUDE.md exists (lean root, 47 lines)
  [ok] .claude/rules/ exists (3 files)
  [ok] .claude/plugins.json exists (2 plugins registered)
  [!!] src/api/CLAUDE.md is missing (expected from last init)
  [ok] .ssc-devops/ governance directory intact (6 files)

1 issue found. Fix before upgrading? (yes / skip / details)
```

- **yes**: Run `setup-claude-md` to regenerate the missing file.
- **skip**: Continue with a warning.
- **details**: Show what's expected vs. what's present, then ask again.

**If no `.claude/plugins.json` exists:**

```
This repo hasn't been initialized with /init-plugin yet.
No plugin configuration found at .claude/plugins.json.

Would you like to run /init-plugin first? (yes / no)
```

- **yes**: Hand off to `/init-plugin`. Exit this skill.
- **no**: Exit.

**If user has uncommitted changes:**

```bash
git status --porcelain
```

If output is non-empty:

```
Warning: You have uncommitted changes in your working tree.

It's recommended to commit or stash changes before upgrading so you can
easily review upgrade changes with `git diff`.

(a) Continue anyway
(b) Abort -- I'll commit first
```

---

### Phase 1: Check for Updates

#### Step 1: Read Installed Plugins

Read `.claude/plugins.json` to get the list of installed plugins:

```json
{
  "schemaVersion": "1.0",
  "plugins": [
    {
      "name": "agent-orch",
      "source": "git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git",
      "version": "2.12.0",
      "role": "orchestrator",
      "installedAt": "2026-03-15T10:00:00Z"
    },
    {
      "name": "ssc-devops",
      "source": "git@code.ssnc.dev:GlobeOp/devops-claude-plugin.git",
      "version": "0.2.0",
      "role": "overlay",
      "installedAt": "2026-03-20T14:00:00Z"
    }
  ]
}
```

#### Step 2: Fetch Upstream Versions

For each plugin, clone the source repo:

```bash
TIMESTAMP=$(date +%s)
UPSTREAM_DIR="/tmp/upgrade-plugin-${plugin_name}-${TIMESTAMP}"
git clone --depth 1 <source-url> ${UPSTREAM_DIR}
```

Read the upstream version from:
- `.claude-plugin/marketplace.json` → `version` field, OR
- `.claude-plugin/plugin.json` → `version` field, OR
- `plugins/*/` directory structure

**If clone fails** for a specific plugin:

```
Warning: Cannot reach source for ssc-devops at
git@code.ssnc.dev:GlobeOp/devops-claude-plugin.git

The repository may have moved or been archived.

(a) Skip this plugin
(b) Enter a new source URL
(c) Remove this plugin from my configuration
```

- **(a)**: Skip, continue checking other plugins.
- **(b)**: Ask for new URL, clone, and continue.
- **(c)**: Remove from `.claude/plugins.json`. Warn that associated rules/conventions will remain but won't receive future updates.

#### Step 3: Compare Versions

Compare installed version vs. upstream version for each plugin.

**Present results:**

```
Checking for updates...

  agent-orch:
    Installed: 2.12.0 (2026-03-15)
    Available: 2.14.0
    Changes:   2 added, 3 changed, 1 removed

  ssc-devops:
    Installed: 0.2.0 (2026-03-20)
    Available: 0.2.0
    Status:    Up to date

Upgrade agent-orch 2.12.0 -> 2.14.0?
(a) Yes -- walk me through the changes
(b) Show changelog first
(c) Skip this plugin
(d) Upgrade all plugins at once (still walks through changes)
```

- **(a)**: Continue to Phase 2 for this plugin.
- **(b)**: Check for CHANGELOG.md or release notes in upstream repo. Show them. Ask again.
- **(c)**: Skip this plugin.
- **(d)**: Walk through changes for ALL plugins that have updates (one plugin at a time).

**If all plugins are up to date:**

```
All plugins are up to date. Nothing to upgrade.

  agent-orch: 2.12.0 (current)
  ssc-devops: 0.2.0 (current)
```

Exit.

**If skipping versions:**

```
agent-orch: 2.12.0 -> 2.16.0 (skipping 2.13.0, 2.14.0)

Note: You're skipping 2 minor versions. Changes from 2.13.0 and 2.14.0
are included in this upgrade.

Showing cumulative changes (not incremental):
  + 3 files added across 2.13.0-2.16.0
  ~ 5 files changed
  - 1 file removed
```

The three-way merge still works because the base is the installed version (from snapshot) and the target is the upstream head. Intermediate versions don't matter.

---

### Phase 2: Present Changes

For each plugin being upgraded, diff the installed snapshot against the upstream version.

#### Step 1: Compute File Diff

Compare `.claude/plugins/<name>@<old-version>/` against the upstream clone.

Categorize every file:

| Category | Meaning |
|----------|---------|
| **ADDED** | File exists upstream but not in snapshot |
| **CHANGED** | File exists in both but content differs |
| **REMOVED** | File exists in snapshot but not upstream |

For CHANGED files, also check if the user has modified the working copy:
- Compare the file in `.claude/rules/` (or wherever it was installed) against the snapshot version
- If they differ, the user has local modifications → this is a **shared** file requiring merge

#### Step 2: Present Change Summary

```
agent-orch 2.12.0 -> 2.14.0:

  ADDED (2 files):
    + agents/core/orchestrate-incident-responder.md
      New core agent for production incident triage and emergency fixes.

    + rules/core/supply-chain-security.md
      Validates dependency sources and lockfile integrity.

  CHANGED (3 files):
    ~ agents/core/orchestrate-builder.md
      TDD gate now supports property-based testing alongside unit tests.
      Lines changed: +18, -3

    ~ conventions/typescript.md
      Added Bun runtime support, updated import conventions for Node 22.
      Lines changed: +45, -12

    ~ hooks/core/hooks.json
      Added supply-chain-security hook to PreToolUse events.
      Lines changed: +8, -0

  REMOVED (1 file):
    - conventions/coffeescript.md
      Deprecated -- CoffeeScript no longer supported.

  YOUR LOCAL OVERRIDES THAT MAY BE AFFECTED:
    ! .claude/rules/security-baseline.md
      You modified this file (last changed 2026-03-22).
      The upstream version added supply-chain checks (+12 lines, additive only).

Ready to walk through each change? (yes / skip all / accept all)
```

- **yes**: Continue to Phase 3 (walk through one at a time).
- **skip all**: Abort upgrade for this plugin. Keep current version.
- **accept all**: Apply everything without individual review. For users who trust upstream and haven't customized.

---

### Phase 3: Walk Through Changes (the wizard)

**CRITICAL**: One file at a time. Always ask the user. Never silently apply.

#### For ADDED files:

```
[1/6] NEW: agents/core/orchestrate-incident-responder.md

  What it does:
    Production incident response agent. Handles triage, debugging live
    systems, emergency fixes, and post-incident analysis. Joins the
    core agent team (always available, not specialist-gated).

  Why it was added:
    Core team gap -- incidents previously required manual debugging
    or repurposing the Debugger agent outside its design scope.

  Impact on your setup:
    Will be available in all /build and /implement sessions.
    No conflicts with existing configuration.

Accept this addition?
(a) Yes -- add to my setup
(b) No -- skip this file
(c) Show full file content
```

**How to generate the "What it does" and "Why" descriptions:**
- Read the file content
- Extract the description from YAML frontmatter if present
- Summarize the key purpose in 2-3 sentences
- Note any dependencies or impacts

#### For CHANGED files (upstream-owned, no local modifications):

```
[2/6] CHANGED: agents/core/orchestrate-builder.md

  What changed:
    TDD gate now supports property-based testing alongside unit tests.
    The builder can now accept property-based test evidence (e.g., from
    fast-check, hypothesis, QuickCheck) as valid TDD proof.

  Lines: +18, -3 (net addition)

  Your status: No local modifications -- safe to update.

Accept this update?
(a) Yes -- update to new version
(b) No -- keep current version
(c) Show diff
```

#### For CHANGED files (shared -- local modifications exist):

This is the critical path. The user has customized a file that the upstream also changed.

```
[5/6] CHANGED: .claude/rules/security-baseline.md

  YOUR VERSION differs from upstream.

  Upstream change:
    Added supply-chain security checks: lockfile integrity validation,
    dependency source verification, SBOM generation requirements.
    Change type: ADDITIVE (new content only, nothing removed or rewritten)

  Your local changes (since init):
    You relaxed the "no eval()" rule for the test/ directory and added
    a custom rule about internal certificate pinning.

  Conflict risk: LOW (upstream additions don't overlap with your changes)

How would you like to handle this?
(a) Merge -- add upstream additions to my version (recommended for additive changes)
(b) Keep mine -- ignore upstream additions
(c) Accept upstream -- replace my version (lose my customizations)
(d) Show three-way diff (base / upstream / mine)
(e) Create both -- keep mine, save upstream as security-baseline.upstream.md for reference
```

##### Three-Way Diff (option d):

```
=== BASE (what was installed at init, 2.12.0) ===
[original file content from .claude/plugins/agent-orch@2.12.0/rules/core/security-baseline.md]

=== UPSTREAM (new version, 2.14.0) ===
[new upstream content, with additions highlighted]

=== YOURS (current local version) ===
[your modified content, with changes highlighted]

=== MERGE PREVIEW ===
[predicted merge result -- your changes + upstream additions]

Accept the merge preview?
(a) Yes -- apply this merge
(b) No -- let me choose a different option
```

**How to generate the merge preview:**
1. Read BASE from `.claude/plugins/<name>@<old-version>/`
2. Read UPSTREAM from the cloned upstream repo
3. Read LOCAL from the working copy in `.claude/rules/` (or wherever installed)
4. Compute three-way merge:
   - Sections only in LOCAL (user additions) → keep
   - Sections only in UPSTREAM (upstream additions) → add
   - Sections in both LOCAL and UPSTREAM that differ from BASE → conflict
5. If no conflicts: present clean merge
6. If conflicts: highlight conflicting sections, ask user to resolve each one

##### Conflict Risk Assessment:

| Change Type | Risk | Strategy | User Prompt |
|-------------|------|----------|-------------|
| **Additive** (upstream only adds, user's changes untouched) | LOW | Auto-merge recommended | "Merge (recommended)" |
| **Non-overlapping** (both changed, different sections) | MEDIUM | Auto-merge possible | "Show merge preview" |
| **Overlapping** (both changed same lines) | HIGH | Manual resolution required | "Show three-way diff, choose per conflict" |
| **Rewrite** (upstream rewrote the file) | HIGH | Cannot auto-merge | "Keep yours / Accept upstream / Side-by-side" |

#### For REMOVED files:

```
[6/6] REMOVED: conventions/coffeescript.md

  Why it was removed:
    CoffeeScript support deprecated upstream. No longer maintained.

  Your status: File exists in .claude/plugins/agent-orch@2.12.0/conventions/
  Local references: None found (no files reference coffeescript.md)

Remove this file?
(a) Yes -- remove from my setup
(b) No -- keep it (will be marked as locally-maintained)
```

#### Batch Escape Hatch

After walking through 3 files in a plugin that has many changes:

```
You've reviewed 3 of 12 changes. Would you like to:
(a) Continue one-by-one for the remaining 9
(b) Accept all remaining changes
(c) Skip all remaining changes
(d) Accept additions, walk through modifications only
```

---

### Phase 4: Apply Changes

Execute all decisions made during Phase 3.

#### Step 1: Replace Upstream Snapshots

```bash
# Remove old snapshot
rm -rf .claude/plugins/<name>@<old-version>/

# Create new snapshot from upstream
mkdir -p .claude/plugins/<name>@<new-version>/
# Copy upstream files to new snapshot directory
```

#### Step 2: Apply Accepted Additions

For each ADDED file where user chose "accept":
- Copy file from upstream to appropriate location
- For agents: copy to snapshot only (agents are loaded from plugin install path)
- For rules: copy to `.claude/rules/`
- For conventions: copy to conventions directory
- For hooks: merge into hooks configuration

#### Step 3: Apply Accepted Updates

For each CHANGED file where user chose "accept" or "merge":
- **Accept**: replace the working copy with upstream version
- **Merge**: write the merged content to the working copy

#### Step 4: Apply Accepted Removals

For each REMOVED file where user chose "accept":
- Delete from working copy
- If file was in `.claude/rules/`, remove it
- If file was a convention, remove it

#### Step 5: Update Metadata

Update `.claude/plugins.json` with new version:

```json
{
  "name": "agent-orch",
  "source": "git@code.ssnc.dev:ai/claude-agent-orchestration-plugin.git",
  "version": "2.14.0",
  "role": "orchestrator",
  "installedAt": "2026-04-09T14:30:00Z"
}
```

#### Step 6: Record Upgrade State

Create or update `.claude/upgrade-state.json`:

```json
{
  "schemaVersion": "1.0",
  "upgrades": [
    {
      "plugin": "agent-orch",
      "fromVersion": "2.12.0",
      "toVersion": "2.14.0",
      "performedAt": "2026-04-09T14:30:00Z",
      "healthCheckPassed": true,
      "decisions": [
        {
          "file": "agents/core/orchestrate-incident-responder.md",
          "type": "added",
          "action": "accept"
        },
        {
          "file": "agents/core/orchestrate-builder.md",
          "type": "changed",
          "action": "accept",
          "hadLocalModifications": false
        },
        {
          "file": ".claude/rules/security-baseline.md",
          "type": "changed",
          "action": "merge",
          "hadLocalModifications": true,
          "mergeStrategy": "additive",
          "conflictRisk": "low"
        },
        {
          "file": "conventions/coffeescript.md",
          "type": "removed",
          "action": "accept"
        }
      ],
      "setupClaudeMdRan": true
    }
  ]
}
```

This enables:
- **Audit trail**: What was accepted, merged, or skipped in each upgrade
- **Replay**: If something goes wrong, review exactly what changed
- **Smart defaults**: Next upgrade can pre-fill decisions based on patterns (e.g., "user always accepts additions")

**Present progress:**

```
Applying upgrade...

  [1/6] Added agents/core/orchestrate-incident-responder.md
  [2/6] Updated agents/core/orchestrate-builder.md
  [3/6] Updated conventions/typescript.md
  [4/6] Updated hooks/core/hooks.json
  [5/6] Merged .claude/rules/security-baseline.md (your changes + upstream additions)
  [6/6] Removed conventions/coffeescript.md

  Updated .claude/plugins.json (agent-orch: 2.12.0 -> 2.14.0)
  Saved decisions to .claude/upgrade-state.json
```

---

### Phase 5: Finalize (setup-claude-md)

Run `setup-claude-md` with the updated plugin context to refresh the CLAUDE.md hierarchy.

#### Step 1: Run setup-claude-md

Pass the updated plugin context (new rules, conventions, persona) to setup-claude-md.

The skill should:
- Update root CLAUDE.md if new governance directories were added
- Regenerate subdirectory CLAUDE.md files if conventions changed
- Wire new rules into the hierarchy
- Ensure everything is consistent

```
Refreshing CLAUDE.md hierarchy with updated plugin configuration...

  [ok] Root CLAUDE.md -- updated agent reference (added incident-responder)
  [ok] .claude/rules/ -- 4 files (security-baseline merged successfully)
  [ok] src/api/CLAUDE.md -- regenerated (typescript conventions updated)
  [ok] src/components/CLAUDE.md -- no changes needed
  [new] .claude/rules/supply-chain-security.md -- wired into hierarchy

CLAUDE.md hierarchy is healthy and reflects agent-orch 2.14.0.
```

#### Step 2: Cleanup

Remove temp directories:

```bash
rm -rf /tmp/upgrade-plugin-*
```

#### Step 3: Present Final Summary

```
=== UPGRADE COMPLETE ===

  agent-orch: 2.12.0 -> 2.14.0

  Applied: 5 changes
    + 1 new agent (incident-responder)
    + 1 new rule (supply-chain-security)
    ~ 2 updated files (builder agent, typescript conventions)
    - 1 removed file (coffeescript conventions)

  Merged: 1 file
    ~ .claude/rules/security-baseline.md (your changes preserved + upstream additions)

  Skipped: 0 changes

  CLAUDE.md hierarchy: Healthy (refreshed by setup-claude-md)

  Next: Your next /build or /implement session will use the updated agents and rules.
```

---

## Edge Cases

### User skips an upgrade, then upgrades two versions later

The three-way merge still works because the base is the installed version (from the snapshot at `.claude/plugins/<name>@<old-version>/`) and the target is the current upstream head. Intermediate versions don't need to exist.

Present the cumulative changes rather than incremental:

```
agent-orch: 2.12.0 -> 2.16.0 (skipping 2.13.0, 2.14.0)

Showing cumulative changes from 2.12.0 to 2.16.0:
  + 3 files added
  ~ 5 files changed
  - 1 file removed
```

### Plugin removed from catalog or source repo gone

```
Warning: Cannot reach source for ssc-devops at
git@code.ssnc.dev:GlobeOp/devops-claude-plugin.git

The repository may have moved or been archived.

(a) Skip this plugin
(b) Enter a new source URL
(c) Remove this plugin from my configuration
```

If **(b)**: update the `source` field in `.claude/plugins.json` with the new URL.

If **(c)**: remove the plugin entry from `.claude/plugins.json`. Leave installed rules/conventions in place (they become locally-owned).

### Multiple plugins with conflicting changes

If two plugins both modify the same file:

```
Conflict: Both agent-orch and ssc-devops provide a rule named
"naming-conventions.md" in the new version.

Current merge strategy: overlay (last plugin wins)

(a) Keep agent-orch's version
(b) Keep ssc-devops's version
(c) Keep both (rename one: naming-conventions-devops.md)
(d) Show both and let me merge manually
```

### First run (no previous upgrade state)

```
This is the first upgrade check since /init-plugin was run.
Establishing baseline from installed versions in .claude/plugins.json.
```

Create initial `.claude/upgrade-state.json` with empty upgrades array, then proceed normally.

### User wants to downgrade

```
agent-orch: 2.14.0 -> 2.12.0 (DOWNGRADE)

Warning: Downgrading may remove features your setup depends on.
Files that were added in 2.13.0-2.14.0 will be flagged for removal.

Are you sure you want to downgrade? (yes / no)
```

If yes, walk through the same wizard but inverted:
- Files that were ADDED in newer versions become REMOVAL candidates
- Files that were REMOVED in newer versions become ADDITION candidates
- Changed files revert to the older version

### Upgrade interrupted midway

If `.claude/upgrade-state.json` has a partial upgrade (decisions recorded but `setupClaudeMdRan` is false):

```
A previous upgrade was interrupted after applying changes but before
refreshing CLAUDE.md.

(a) Resume -- run setup-claude-md to complete the upgrade
(b) Start over -- re-check for updates and walk through again
```

---

## Troubleshooting

### "No .claude/plugins.json found"

This repo hasn't been initialized with `/init-plugin`. Run `/agent-orch:init-plugin` first.

### "Cannot clone plugin source"

```
ssh-add -l                          # Check SSH key is loaded
ssh -T git@code.ssnc.dev           # Test SSH access
```

If the source URL has changed, use option (b) to enter a new URL.

### "Merge produced conflicts"

When a three-way merge can't be resolved automatically:
1. The wizard shows both versions side-by-side
2. User chooses which sections to keep
3. If too complex, user can choose "keep mine" and manually review the `.upstream.md` reference copy

### "CLAUDE.md hierarchy unhealthy after upgrade"

Run `/agent-orch:setup-claude-md` standalone to repair the hierarchy.

### "Upgrade state shows unexpected decisions"

Review `.claude/upgrade-state.json` for the audit trail. Each decision is recorded with the file, type, and action taken.

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.upgrade-plugin:` entry. If the file is absent, has no
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
