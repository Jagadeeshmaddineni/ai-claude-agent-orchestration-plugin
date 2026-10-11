# Claude Agent Orchestration Plugin - Development Standards

This CLAUDE.md file defines standards for maintaining the claude-agent-orchestration-plugin project.

---

## Documentation Sync Requirements

**CRITICAL**: When making changes to plugin capabilities, features, or usage instructions, you MUST update these files in parallel:

### Files That Must Stay In Sync

| File | Purpose | What to Update |
|------|---------|---------------|
| [README.md](README.md) | Primary documentation | Installation, usage, features, examples |
| [CHEAT-SHEET.md](CHEAT-SHEET.md) | Quick reference | Commands, agents, workflows, troubleshooting |

### When to Update Both Files

Update **BOTH** files when changes involve:

- ✅ New slash commands or skills
- ✅ New agents or subagent types
- ✅ Permission management guidance
- ✅ CLI flags or options
- ✅ Installation procedures
- ✅ Usage workflows
- ✅ Configuration examples
- ✅ Troubleshooting guidance
- ✅ Quick start instructions
- ✅ MCP integration
- ✅ Key concepts or terminology

### Update Checklist

When modifying plugin documentation:

```
[ ] README.md updated with detailed explanation
[ ] CHEAT-SHEET.md updated with quick reference
[ ] Both files use consistent terminology
[ ] Both files reference the same CLI flags/options
[ ] Both files show the same command examples
[ ] Version numbers match (if applicable)
[ ] Links between files work correctly
```

### Validation

Before committing documentation changes, verify:

```bash
# Check for inconsistencies
grep -n "agent-orch:" README.md CHEAT-SHEET.md | grep -v "^#"
grep -n "permission-mode" README.md CHEAT-SHEET.md
grep -n "orchestrate-" README.md CHEAT-SHEET.md

# Count agents in both files (should match)
grep -o "orchestrate-[a-z-]*" README.md | sort -u | wc -l
grep -o "orchestrate-[a-z-]*" CHEAT-SHEET.md | sort -u | wc -l
```

---

## File-Specific Guidelines

### README.md

- **Comprehensive** - Detailed explanations with context
- **Examples** - Show real-world usage patterns
- **Installation** - Step-by-step with troubleshooting
- **Architecture** - Diagrams and flow explanations
- **Target audience** - New users and detailed reference

### CHEAT-SHEET.md

- **Concise** - Quick lookups, minimal prose
- **Tables** - Scannable command/agent references
- **Workflows** - Short, copy-paste ready examples
- **Target audience** - Existing users who need quick answers

---

## Plugin Structure Reference

```
claude-agent-orchestration-plugin/
├── README.md                     # PRIMARY DOCUMENTATION
├── CHEAT-SHEET.md                # QUICK REFERENCE
├── CLAUDE.md                     # THIS FILE - dev standards
├── plugins/agent-orch/
│   ├── skills/                   # Slash commands
│   │   ├── make/
│   │   ├── make-validate/
│   │   ├── make-clean/
│   │   ├── build/
│   │   ├── implement/
│   │   ├── analyse/
│   │   ├── init-plugin/
│   │   ├── upgrade-plugin/
│   │   └── ... (27 total skills)
│   ├── agents/                   # Agent definitions
│   │   ├── orchestrate-architect.md
│   │   ├── orchestrate-builder.md
│   │   ├── orchestrate-validator.md
│   │   └── ... (25 total agents)
│   ├── commands/                 # Built-in utilities
│   │   ├── db-migration-check.md
│   │   ├── docs-sync.md
│   │   └── ... (8 total commands)
│   ├── conventions/              # Language conventions
│   ├── mcp/                      # MCP server
│   └── hooks/                    # Quality gates
└── examples/                     # Templates
```

---

## Common Updates

### Adding a New Skill

1. Create `plugins/agent-orch/skills/[name]/SKILL.md`
2. Update `README.md`:
   - Add to "What's in the Box" table
   - Add to appropriate workflow section
   - Add example usage
3. Update `CHEAT-SHEET.md`:
   - Add to "Main Skills" table
   - Add to "Quick Workflows" if applicable
4. Commit: `git commit -m "Add /agent-orch:[name] skill"`

### Adding a New Agent

1. Create `plugins/agent-orch/agents/orchestrate-[name].md`
2. Update `README.md`:
   - Add to agent summary table
   - Update total agent count
   - Add to specialist descriptions if applicable
3. Update `CHEAT-SHEET.md`:
   - Add to "The 26 Agents" section (update count!)
   - Add to appropriate category (Core/Review/Support/Specialist)
4. Commit: `git commit -m "Add [name] agent (orchestrate-[name])"`

### Updating Permission Guidance

1. Check Claude CLI for latest flags: `claude --help | grep -i permission`
2. Update **both** files:
   - `README.md` - "Permission Management" section
   - `CHEAT-SHEET.md` - "Permission Management" section
3. Ensure examples match exactly
4. Verify flag names are correct
5. Commit: `git commit -m "Update permission management guidance"`

### Updating Version Numbers

1. Update version in:
   - `README.md` (if version is mentioned)
   - `CHEAT-SHEET.md` footer
   - `package.json` (if exists)
   - `.claude-plugin/metadata.json`
2. Update agent/skill counts if they changed
3. Commit: `git commit -m "Bump version to X.Y.Z"`

---

## Quality Standards

### Documentation

- Use **absolute paths** for cross-references when possible
- Use **relative paths** for internal links (README ↔ CHEAT-SHEET)
- Include **working examples** that users can copy-paste
- Test **all commands** before documenting them
- Show **actual output** in examples when helpful
- Keep **tables aligned** and consistent
- Use **consistent terminology** (e.g., "skill" vs "command", "agent" vs "subagent")

### Code Examples

```bash
# ✅ GOOD - Shows context and expected outcome
claude --permission-mode dontAsk
> /agent-orch:build
# → Launches multi-agent build with auto-approved permissions

# ❌ BAD - No context, unclear what happens
/agent-orch:build
```

### Terminology Consistency

| Term | Meaning | Example |
|------|---------|---------|
| **Skill** | User-invokable slash command | `/agent-orch:build` |
| **Agent** | Specialized worker in orchestration | Architect, Builder, Validator |
| **Subagent** | Agent launched as a subprocess | `agent-orch:orchestrate-builder` |
| **Command** | Built-in utility (not a skill) | `db-migration-check` |
| **Mode** | Coordination strategy | Subagents vs Agent Teams |

---

## Testing Documentation Changes

Before committing doc updates:

### 1. Verify Links

```bash
# Check for broken internal links
grep -Eo '\[.*\]\(.*\.md.*\)' README.md CHEAT-SHEET.md | while read link; do
  file=$(echo "$link" | sed 's/.*(\(.*\))/\1/' | cut -d'#' -f1)
  [ -f "$file" ] || echo "Broken: $link"
done
```

### 2. Verify Command References

```bash
# All skills should be documented in both files
diff <(grep -o '/agent-orch:[a-z-]*' README.md | sort -u) \
     <(grep -o '/agent-orch:[a-z-]*' CHEAT-SHEET.md | sort -u)
# Should show no differences
```

### 3. Verify Agent Counts

```bash
# Count agents in skills/ directory
ls plugins/agent-orch/agents/orchestrate-*.md | wc -l

# Count agents mentioned in README
grep -c "orchestrate-[a-z-]*" README.md

# Count agents in CHEAT-SHEET
grep -c "orchestrate-[a-z-]*" CHEAT-SHEET.md

# All three should match
```

### 4. Test Permission Examples

```bash
# Verify permission flags exist in Claude CLI
claude --help | grep -q "permission-mode" || echo "WARNING: --permission-mode flag not found in Claude CLI"
claude --help | grep -q "dangerously-skip-permissions" || echo "WARNING: --dangerously-skip-permissions flag not found"
```

---

## Commit Message Standards

When updating documentation:

```bash
# Adding new feature documentation
git commit -m "docs: add /agent-orch:new-skill to README and cheat sheet"

# Updating existing documentation
git commit -m "docs: update permission management guidance in README and cheat sheet"

# Fixing documentation
git commit -m "docs: fix broken links in cheat sheet"

# Syncing documentation
git commit -m "docs: sync agent count between README and cheat sheet"
```

---

## Review Checklist

Before merging documentation changes:

- [ ] README.md and CHEAT-SHEET.md are consistent
- [ ] All CLI flags are current (verify with `claude --help`)
- [ ] All skills are documented in both files
- [ ] All agents are documented in both files
- [ ] Agent/skill counts are accurate
- [ ] Examples are tested and working
- [ ] Links are not broken
- [ ] Terminology is consistent
- [ ] Tables are properly formatted
- [ ] Code blocks have syntax highlighting
- [ ] Version numbers match everywhere

---

## Contact

For questions about documentation standards:
- Check this CLAUDE.md file first
- Review existing commits for patterns: `git log --grep="docs:" --oneline`
- File an issue if standards are unclear

---

**Last Updated**: 2026-07-09  
**Total Skills**: 32 (agent-orch)  
**Total Agents**: 26 (agent-orch)  
**Sibling plugins**: team-work, vault-orch, codebase-graph-analyzer, meta-orch  
**Files to Sync**: 2 (README.md, CHEAT-SHEET.md)
