---
name: setup-cline-rules
description: Sets up a hierarchical .clinerules structure for optimal agent orchestration. Creates rules in .clinerules/ for universal standards, and subdirectory .clinerules.md files for domain-specific standards. Supports migration from monolithic AGENTS.md. Usage: /setup-cline-rules.md
---

# Setup Hierarchical Rules for Cline

This workflow creates a **hierarchical .clinerules structure** that reduces agent context by 70-85% compared to a monolithic rules file.

## Why This Matters

A monolithic rules file grows to 40k+ tokens in real projects. Every agent loads the entire file even though most only need a subset. The hierarchical structure:

- **Root `AGENTS.md`** (~2k tokens) -- project identity, git workflow, env vars, agent notes
- **`.clinerules/*.md`** (~3-4k tokens, always loaded) -- security baseline, code standards, testing standards
- **Subdirectory `.clinerules.md`** (~1.5k each, loaded per-directory) -- API, database, frontend standards

The ISC2-certified Staff SWE persona is loaded automatically via the `persona.md` rule.

### What Each Agent Gets

| Working on | Context loaded | ~Tokens |
|------------|---------------|---------|
| API code | Root + rules + API .clinerules.md | ~7,500 |
| Database code | Root + rules + DB .clinerules.md | ~7,500 |
| Frontend code | Root + rules + frontend .clinerules.md | ~7,500 |
| General code | Root + rules only | ~6,000 |
| **Old monolithic** | **Everything** | **~46,000** |

---

## Process

### Step 1: Detect Existing Structure

Check what already exists:

1. **Root `AGENTS.md`** -- does it exist? If so, is it monolithic (>100 lines) or lean?
2. **`.clinerules/`** -- does the directory exist? What files are in it?
3. **Subdirectory `.clinerules.md` files** -- any in `src/`, `lib/`, etc.?

**Determine mode:**

| Condition | Mode |
|-----------|------|
| No AGENTS.md exists | **Fresh setup** |
| Monolithic AGENTS.md (>100 lines, multiple ## sections) | **Migration** |
| Lean AGENTS.md + .clinerules/ already exist | **Update** (check for missing pieces) |

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
   - Detect framework (Next.js, Express, FastAPI, Django, SpecFlow, etc.)

2. **Detect existing patterns:**
   - Look for ESLint/Prettier configs
   - Check tsconfig.json settings
   - Find existing test files and patterns
   - Identify folder structure conventions

3. **Auto-detect domain directories:**

   **API directory** -- glob for these patterns and pick the best match:
   - `**/routes/**/*.{ts,js,py,go,cs}`
   - `**/api/**/*.{ts,js,py,go,cs}`
   - `**/controllers/**/*.{ts,js,py,go,cs}`
   - `**/endpoints/**/*.{ts,js,py,go,cs}`

   **Database directory** -- glob for:
   - `**/models/**/*.{ts,js,py,go,cs}`
   - `**/db/**/*.{ts,js,py,go,cs}`
   - `**/migrations/**`
   - `**/repositories/**/*.{ts,js,py,go,cs}`
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
   - `**/*.feature` (SpecFlow/Gherkin)
   - `**/Steps/**/*.cs` (SpecFlow step definitions)

4. **Detect component library (frontend):**
   - Look for design system imports in package.json
   - Check for Storybook configuration
   - Find theme/token files

### Step 3: Present Detected Structure

Show the user what was detected and what will be created:

```
## Detected Project Structure

**Tech stack:** C# / .NET + SpecFlow
**Test framework:** SpecFlow + NUnit (found in *.csproj)

### Files to Create

#### Always-Loaded Rules (.clinerules/)
- [x] security-baseline.md -- OWASP, auth, encryption
- [x] code-standards.md -- C#, naming conventions, file-scoped namespaces
- [x] testing-standards.md -- SpecFlow, thin steps, FluentAssertions

#### Root AGENTS.md
- [x] Project Overview
- [x] Git Workflow
- [x] Environment Variables
- [x] Agent Orchestration Notes

#### Domain-Specific (subdirectory .clinerules.md)
- [x] Test Standards -- detected: tests/functional-tests/
- [ ] API Standards -- not detected
- [ ] Database Standards -- not detected

### Persona
The ISC2-certified Staff SWE persona is loaded via persona.md rule.

Proceed with this structure?
(a) Yes, create all files
(b) Let me adjust the detected paths first
(c) Show me what each file will contain
(d) Skip -- I'll set up manually
```

**If user chooses (b):** Ask which paths to change, one at a time.
**If user chooses (c):** Show content previews for each file, then ask to proceed.

### Step 4: Migration Support (if monolithic AGENTS.md detected)

If a monolithic AGENTS.md exists:

1. **Parse sections** by `##` headers
2. **Map sections to new locations:**

   | Section in monolithic AGENTS.md | New location |
   |--------------------------------|-------------|
   | Project Overview | Root `AGENTS.md` |
   | Code Standards / Naming Conventions | `.clinerules/code-standards.md` |
   | Error Handling | `.clinerules/code-standards.md` (appended) |
   | Testing Standards | `.clinerules/testing-standards.md` |
   | Security Requirements | `.clinerules/security-baseline.md` |
   | API Design | `[detected-api-dir]/.clinerules.md` |
   | Database | `[detected-db-dir]/.clinerules.md` |
   | Component Library | `[detected-frontend-dir]/.clinerules.md` |
   | Git Workflow | Root `AGENTS.md` |
   | Environment Variables | Root `AGENTS.md` |
   | Agent Orchestration Notes | Root `AGENTS.md` |

3. **Present migration plan:**
   ```
   ## Migration Plan

   Your current AGENTS.md is ~[X] lines ([estimated tokens] tokens).
   After migration, agents will load ~7,500 tokens instead of ~[estimated tokens].

   ### Content will be split as follows:

   Root AGENTS.md (always loaded):
   - Project Overview (from lines 1-18)
   - Git Workflow (from lines 220-240)
   - Environment Variables (from lines 242-258)
   - Agent Orchestration Notes (from lines 262-282)

   .clinerules/security-baseline.md (always loaded):
   - Security Requirements (from lines 147-167)

   .clinerules/code-standards.md (always loaded):
   - Code Standards (from lines 22-53)
   - Error Handling (from lines 89-123)

   .clinerules/testing-standards.md (always loaded):
   - Testing Standards (from lines 57-85)

   tests/functional-tests/.clinerules.md (loaded when working in tests/):
   - Test-specific standards (from lines 127-143)

   Options:
   (a) Proceed with migration (backs up original as AGENTS.md.bak)
   (b) Show me the content for each file first
   (c) Keep monolithic -- just add .clinerules/ alongside it
   (d) Cancel
   ```

4. **If user approves:**
   - Back up original: copy `AGENTS.md` to `AGENTS.md.bak`
   - Extract sections and create new files
   - Replace root `AGENTS.md` with lean version
   - Create `.clinerules/` files
   - Create subdirectory `.clinerules.md` files at detected paths

### Step 5: Create Files

Create each file based on the approved structure:

1. **Root `AGENTS.md`** -- project overview, git workflow, env vars, agent notes, standards structure pointer
2. **`.clinerules/security-baseline.md`** -- from detected/template security standards
3. **`.clinerules/code-standards.md`** -- from detected/template code standards + error handling
4. **`.clinerules/testing-standards.md`** -- from detected/template testing standards (if tests detected)
5. **`[api-dir]/.clinerules.md`** -- from detected/template API standards (if API detected)
6. **`[db-dir]/.clinerules.md`** -- from detected/template database standards (if DB detected)
7. **`[frontend-dir]/.clinerules.md`** -- from detected/template frontend standards (if frontend detected)
8. **`[test-dir]/.clinerules.md`** -- from detected/template test standards (if tests detected)

**For fresh setup:** Generate templates based on detected tech stack.
**For migration:** Extract content from existing AGENTS.md sections.

### Step 6: Validation Summary

After creating files, show:

```
## Hierarchical Rules Setup Complete

### Files Created
- [x] AGENTS.md (root, lean) -- [X] lines
- [x] .clinerules/security-baseline.md -- [X] lines
- [x] .clinerules/code-standards.md -- [X] lines
- [x] .clinerules/testing-standards.md -- [X] lines
- [x] tests/functional-tests/.clinerules.md -- [X] lines

### Token Savings
- Before: ~[X] tokens (monolithic)
- After: ~[X] tokens (worst case, all directories)
- Per-agent average: ~7,500 tokens
- Savings: ~[X]% reduction

### Persona
ISC2-certified Staff SWE persona is active via persona.md rule.

### Ready For
- [x] /build.md -- All required standards present
- [x] Builder agent -- Code standards in .clinerules/
- [x] Validator agent -- Testing standards in .clinerules/
- [x] Security agent -- Security baseline in .clinerules/
- [x] Quality Reviewer -- Standards distributed across rules + directories

### Next Steps
Run `/build.md` to start a new implementation with the optimized structure.
```

---

## Section Reference

### What Each Agent Needs

| Agent | Reads from... | Auto-loaded? |
|-------|--------------|-------------|
| **All agents** | `.clinerules/persona.md` | Yes (rule) |
| **All agents** | `.clinerules/security-baseline.md` | Yes (rule) |
| **All agents** | `.clinerules/code-standards.md` | Yes (rule) |
| **All agents** | `.clinerules/testing-standards.md` | Yes (rule) |
| **Architect** | Root `AGENTS.md` (overview, key files) | Yes (root) |
| **Builder** | Root + directory .clinerules.md for current work | Yes (auto by directory) |
| **Validator** | Root + testing standards rule | Yes (auto) |
| **Security** | Security baseline rule | Yes (auto) |
| **API** | `[api-dir]/.clinerules.md` | Yes (when in API dir) |
| **Database** | `[db-dir]/.clinerules.md` | Yes (when in DB dir) |
| **UI/UX** | `[frontend-dir]/.clinerules.md` | Yes (when in frontend dir) |
| **Quality Reviewer** | All rules + relevant directory .clinerules.md | Yes (auto) |

### When to Add More Subdirectory .clinerules.md Files

Add a new subdirectory `.clinerules.md` when:
- A directory has domain-specific conventions that don't apply project-wide
- Multiple agents would benefit from targeted context when working in that directory
- The content is >20 lines (otherwise just put it in the nearest parent rule)

---

## Troubleshooting

### Agents Not Following Standards

If agents aren't following your standards:
1. Run `/setup-cline-rules.md` to check the structure
2. Ensure standards are specific (not vague)
3. Include code examples where possible
4. Verify the .clinerules.md is in the right directory (agents only load it when working there)

### Standards Not Loading

If an agent seems unaware of standards:
1. Check that `.clinerules/*.md` files exist (these are always loaded)
2. Check that subdirectory `.clinerules.md` is in the correct directory
3. Cline loads rules from `.clinerules/` folder -- verify placement

### Migration Issues

If migration from monolithic AGENTS.md missed content:
1. Check `AGENTS.md.bak` for the original content
2. Copy missing sections to the appropriate rules or subdirectory file
3. Run `/setup-cline-rules.md` again to validate the structure
