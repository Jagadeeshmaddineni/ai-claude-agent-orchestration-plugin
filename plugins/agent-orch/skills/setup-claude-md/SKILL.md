---
name: setup-claude-md
description: Sets up a hierarchical CLAUDE.md structure for optimal agent orchestration. Creates lean root CLAUDE.md, .claude/rules/ for universal standards, and subdirectory CLAUDE.md files for domain-specific standards. Supports migration from monolithic CLAUDE.md. Accepts plugin context from /init-plugin and /upgrade-plugin. Usage: /agent-orch:setup-claude-md
---

# Setup Hierarchical CLAUDE.md for Agent Orchestration

This skill creates a **hierarchical CLAUDE.md structure** that reduces agent context by 70-85% compared to a monolithic CLAUDE.md.

## Why This Matters

A monolithic CLAUDE.md grows to 40k+ tokens in real projects. Every agent loads the entire file even though most only need a subset. The hierarchical structure:

- **Root `CLAUDE.md`** (~2k tokens) -- project identity, git workflow, env vars, agent notes
- **`.claude/rules/`** (~3-4k tokens, always loaded) -- security baseline, code standards, testing standards
- **Subdirectory `CLAUDE.md`** (~1.5k each, loaded per-directory) -- API, database, frontend standards

The persona is loaded automatically via the agent-orch plugin's rules. When called with plugin context (from `/init-plugin` or `/upgrade-plugin`), the persona comes from the selected plugin instead of defaulting to ISC2.

---

## Plugin Context Input

When called from `/init-plugin` or `/upgrade-plugin`, this skill receives **plugin context** that overrides defaults:

| Parameter | Default (no plugin context) | With Plugin Context |
|-----------|---------------------------|---------------------|
| **persona** | ISC2-certified Staff SWE | Plugin-provided persona (e.g., compliance expert, sales methodology) |
| **rules** | security-baseline, code-standards, testing-standards | Plugin-provided rule files |
| **conventions** | Detected from tech stack | Plugin conventions + detected tech stack |
| **governance_dir** | None | Plugin governance directory (e.g., `.gids/`, `.ssc-devops/`, `.legal/`) |
| **governance_files** | None | Files to create/reference in governance directory |
| **mcp_config** | None | MCP services to reference in CLAUDE.md |

### How Plugin Context Changes Behavior

1. **Step 3 (Present Detected Structure)**: Show plugin-provided rules instead of engineering defaults
2. **Step 5 (Create Files)**: Use plugin rules/conventions instead of built-in templates
3. **Root CLAUDE.md**: Include reference to plugin governance directory if provided
4. **Persona reference**: Point to plugin persona instead of ISC2 default

### Health Check Mode

When called as a **health check** (Phase 0 of `/init-plugin` or `/upgrade-plugin`), this skill runs in **validation mode**:

1. Check that `.claude/` directory exists
2. Check that `.claude/rules/` exists and has files
3. Check that `CLAUDE.md` exists and is not monolithic (>100 lines)
4. Check for expected subdirectory CLAUDE.md files
5. Report issues but don't create/modify files unless asked

Output format for health check mode:

```
Running CLAUDE.md health check...

  [ok] .claude/ directory exists
  [ok] .claude/rules/ exists (3 files)
  [ok] CLAUDE.md exists (lean root, 47 lines)
  [!!] src/api/CLAUDE.md is missing (expected from detected API directory)
  [ok] No monolithic CLAUDE.md detected

1 issue found.
```

Return the list of issues so the calling skill (`/init-plugin` or `/upgrade-plugin`) can decide how to proceed.

### What Each Agent Gets

| Working on | Context loaded | ~Tokens |
|------------|---------------|---------|
| API code | Root + rules + API CLAUDE.md | ~7,500 |
| Database code | Root + rules + DB CLAUDE.md | ~7,500 |
| Frontend code | Root + rules + frontend CLAUDE.md | ~7,500 |
| General code | Root + rules only | ~6,000 |
| **Old monolithic** | **Everything** | **~46,000** |

---

## Process

### Step 1: Detect Existing Structure

Check what already exists:

1. **Root `CLAUDE.md`** -- does it exist? If so, is it monolithic (>100 lines) or lean?
2. **`.claude/rules/`** -- does the directory exist? What files are in it?
3. **Subdirectory `CLAUDE.md` files** -- any in `src/`, `lib/`, etc.?

**Determine mode:**

| Condition | Mode |
|-----------|------|
| No CLAUDE.md exists | **Fresh setup** |
| Monolithic CLAUDE.md (>100 lines, multiple ## sections) | **Migration** |
| Lean CLAUDE.md + .claude/rules/ already exist | **Update** (check for missing pieces) |

**Inform the user which mode was detected.**

### Step 2: Analyse Project Context

Detect the project's tech stack and structure:

1. **Detect tech stack:**
   - Check `package.json` for Node.js/TypeScript
   - Check `tsconfig.json` for TypeScript
   - Check `requirements.txt` or `pyproject.toml` for Python
   - Check `go.mod` for Go
   - Check `Cargo.toml` for Rust
   - Check `pom.xml` or `build.gradle` for Java
   - Check `*.csproj` for C#
   - Detect framework (Next.js, Express, FastAPI, Django, etc.)

2. **Detect existing patterns:**
   - Look for ESLint/Prettier configs
   - Check tsconfig.json settings
   - Find existing test files and patterns
   - Identify folder structure conventions

3. **Auto-detect domain directories:**

   **API directory** -- glob for these patterns and pick the best match:
   - `**/routes/**/*.{ts,js,py,go}`
   - `**/api/**/*.{ts,js,py,go}`
   - `**/controllers/**/*.{ts,js,py,go}`
   - `**/endpoints/**/*.{ts,js,py,go}`

   **Database directory** -- glob for:
   - `**/models/**/*.{ts,js,py,go}`
   - `**/db/**/*.{ts,js,py,go}`
   - `**/migrations/**`
   - `**/repositories/**/*.{ts,js,py,go}`
   - `**/schema/**/*.{ts,js,py,go,sql}`

   **Frontend directory** -- glob for:
   - `**/components/**/*.{tsx,jsx,vue,svelte}`
   - `**/pages/**/*.{tsx,jsx,vue,svelte}`
   - `**/views/**/*.{tsx,jsx,vue,svelte}`

   **Test directory** -- glob for:
   - `**/__tests__/**`
   - `**/test/**`
   - `**/tests/**`
   - `**/spec/**`

4. **Detect component library (frontend):**
   - Look for design system imports in package.json
   - Check for Storybook configuration
   - Find theme/token files

### Step 3: Present Detected Structure

Show the user what was detected and what will be created:

```
## Detected Project Structure

**Tech stack:** TypeScript + Express + PostgreSQL
**Test framework:** Jest (found in package.json)

### Files to Create

#### Always-Loaded Rules (.claude/rules/)
- [x] security-baseline.md -- OWASP, auth, encryption
- [x] code-standards.md -- TypeScript, ESLint, naming conventions
- [x] testing-standards.md -- Jest, 80% coverage

#### Root CLAUDE.md
- [x] Project Overview
- [x] Git Workflow
- [x] Environment Variables
- [x] Agent Orchestration Notes

#### Domain-Specific (subdirectory CLAUDE.md)
- [x] API Standards -- detected: src/api/ (12 route files found)
- [x] Database Standards -- detected: src/db/ (migrations + models found)
- [ ] Frontend Standards -- not detected (no component files found)

### Persona
The persona is loaded automatically via the agent-orch plugin's rules.
When plugin context is provided (from /init-plugin), the plugin's persona is used instead of ISC2.
No per-project setup needed.

Proceed with this structure?
(a) Yes, create all files
(b) Let me adjust the detected paths first
(c) Show me what each file will contain
(d) Skip -- I'll set up manually
```

**If user chooses (b):** Ask which paths to change, one at a time.
**If user chooses (c):** Show content previews for each file, then ask to proceed.

### Step 4: Migration Support (if monolithic CLAUDE.md detected)

If a monolithic CLAUDE.md exists:

1. **Parse sections** by `##` headers
2. **Map sections to new locations:**

   | Section in monolithic CLAUDE.md | New location |
   |--------------------------------|-------------|
   | Project Overview | Root `CLAUDE.md` |
   | Code Standards / Naming Conventions | `.claude/rules/code-standards.md` |
   | Error Handling | `.claude/rules/code-standards.md` (appended) |
   | Testing Standards | `.claude/rules/testing-standards.md` |
   | Security Requirements | `.claude/rules/security-baseline.md` |
   | API Design | `[detected-api-dir]/CLAUDE.md` |
   | Database | `[detected-db-dir]/CLAUDE.md` |
   | Component Library | `[detected-frontend-dir]/CLAUDE.md` |
   | Git Workflow | Root `CLAUDE.md` |
   | Environment Variables | Root `CLAUDE.md` |
   | Agent Orchestration Notes | Root `CLAUDE.md` |

3. **Present migration plan:**
   ```
   ## Migration Plan

   Your current CLAUDE.md is ~[X] lines ([estimated tokens] tokens).
   After migration, agents will load ~7,500 tokens instead of ~[estimated tokens].

   ### Content will be split as follows:

   Root CLAUDE.md (always loaded):
   - Project Overview (from lines 1-18)
   - Git Workflow (from lines 220-240)
   - Environment Variables (from lines 242-258)
   - Agent Orchestration Notes (from lines 262-282)

   .claude/rules/security-baseline.md (always loaded):
   - Security Requirements (from lines 147-167)

   .claude/rules/code-standards.md (always loaded):
   - Code Standards (from lines 22-53)
   - Error Handling (from lines 89-123)

   .claude/rules/testing-standards.md (always loaded):
   - Testing Standards (from lines 57-85)

   src/api/CLAUDE.md (loaded when working in src/api/):
   - API Design (from lines 127-143)

   src/db/CLAUDE.md (loaded when working in src/db/):
   - Database (from lines 170-189)

   Options:
   (a) Proceed with migration (backs up original as CLAUDE.md.bak)
   (b) Show me the content for each file first
   (c) Keep monolithic -- just add .claude/rules/ alongside it
   (d) Cancel
   ```

4. **If user approves:**
   - Back up original: copy `CLAUDE.md` to `CLAUDE.md.bak`
   - Extract sections and create new files
   - Replace root `CLAUDE.md` with lean version
   - Create `.claude/rules/` files
   - Create subdirectory `CLAUDE.md` files at detected paths

### Step 5: Create Files

Create each file based on the approved structure:

1. **Root `CLAUDE.md`** -- project overview, git workflow, env vars, agent notes, standards structure pointer
2. **`.claude/rules/security-baseline.md`** -- from detected/template security standards
3. **`.claude/rules/code-standards.md`** -- from detected/template code standards + error handling
4. **`.claude/rules/testing-standards.md`** -- from detected/template testing standards (if tests detected)
5. **`[api-dir]/CLAUDE.md`** -- from detected/template API standards (if API detected)
6. **`[db-dir]/CLAUDE.md`** -- from detected/template database standards (if DB detected)
7. **`[frontend-dir]/CLAUDE.md`** -- from detected/template frontend standards (if frontend detected)

**For fresh setup:** Use templates from `examples/hierarchical/` as base, customize with detected patterns.
**For migration:** Extract content from existing CLAUDE.md sections.

### Step 6: Validation Summary

After creating files, show:

```
## Hierarchical CLAUDE.md Setup Complete

### Files Created
- [x] CLAUDE.md (root, lean) -- [X] lines
- [x] .claude/rules/security-baseline.md -- [X] lines
- [x] .claude/rules/code-standards.md -- [X] lines
- [x] .claude/rules/testing-standards.md -- [X] lines
- [x] src/api/CLAUDE.md -- [X] lines
- [x] src/db/CLAUDE.md -- [X] lines

### Token Savings
- Before: ~[X] tokens (monolithic)
- After: ~[X] tokens (worst case, all directories)
- Per-agent average: ~7,500 tokens
- Savings: ~[X]% reduction

### Persona
Persona is active via plugin rule (no per-project file needed).
When plugin context is provided (from /init-plugin), the plugin-specific persona is used.

### Ready For
- [x] /agent-orch:build -- All required standards present
- [x] Builder agent -- Code standards in .claude/rules/
- [x] Validator agent -- Testing standards in .claude/rules/
- [x] Security agent -- Security baseline in .claude/rules/
- [x] API agent -- API standards in src/api/CLAUDE.md
- [x] Database agent -- DB standards in src/db/CLAUDE.md
- [x] Quality Reviewer -- Standards distributed across rules + directories

### Next Steps
Run `/agent-orch:build` to start a new implementation with the optimized structure.
```

---

## Section Reference

### What Each Agent Needs

| Agent | Reads from... | Auto-loaded? |
|-------|--------------|-------------|
| **All agents** | `.claude/rules/persona.md` (plugin) | Yes (plugin rule) |
| **All agents** | `.claude/rules/security-baseline.md` | Yes (project rule) |
| **All agents** | `.claude/rules/code-standards.md` | Yes (project rule) |
| **All agents** | `.claude/rules/testing-standards.md` | Yes (project rule) |
| **Architect** | Root `CLAUDE.md` (overview, key files) | Yes (root) |
| **Builder** | Root + directory CLAUDE.md for current work | Yes (auto by directory) |
| **Validator** | Root + testing standards rule | Yes (auto) |
| **Security** | Security baseline rule | Yes (auto) |
| **API** | `[api-dir]/CLAUDE.md` | Yes (when in API dir) |
| **Database** | `[db-dir]/CLAUDE.md` | Yes (when in DB dir) |
| **UI/UX** | `[frontend-dir]/CLAUDE.md` | Yes (when in frontend dir) |
| **Quality Reviewer** | All rules + relevant directory CLAUDE.md | Yes (auto) |

### When to Add More Subdirectory CLAUDE.md Files

Add a new subdirectory `CLAUDE.md` when:
- A directory has domain-specific conventions that don't apply project-wide
- Multiple agents would benefit from targeted context when working in that directory
- The content is >20 lines (otherwise just put it in the nearest parent CLAUDE.md)

---

## Troubleshooting

### Agents Not Following Standards

If agents aren't following your standards:
1. Run `/agent-orch:setup-claude-md` to check the structure
2. Ensure standards are specific (not vague)
3. Include code examples where possible
4. Verify the CLAUDE.md is in the right directory (agents only load it when working there)

### Standards Not Loading

If an agent seems unaware of standards:
1. Check that `.claude/rules/` files exist (these are always loaded)
2. Check that subdirectory `CLAUDE.md` is in the correct directory
3. Claude Code loads the nearest CLAUDE.md up the directory tree -- verify placement

### Migration Issues

If migration from monolithic CLAUDE.md missed content:
1. Check `CLAUDE.md.bak` for the original content
2. Copy missing sections to the appropriate rules or subdirectory file
3. Run `/agent-orch:setup-claude-md` again to validate the structure

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.setup-claude-md:` entry. If the file is absent, has no
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
