---
name: refactor-to-bluestone
description: Activate Bluestone design system enforcement for UI work. Guides Artifactory setup, detects tech stack (React vs non-React), and configures the UI/UX agent to enforce Bluestone tokens and @sds/* components. Usage: /agent-orch:refactor-to-bluestone
---

# Refactor to Bluestone Design System

A wizard-based skill that activates Bluestone design system enforcement for the UI/UX agent. Guides through Artifactory setup, detects the project's tech stack, and configures tri-modal UI agent behavior (Bluestone enforcement, custom design system, or continuous-maintain mode).

## Design Principles

- **Design systems prevent UI drift.** Every hardcoded color is future tech debt. Bluestone provides tokens, components, and patterns for SS&C products.
- **Tech-stack aware.** React projects get full component library (`@sds/react`). Non-React projects get CSS tokens.
- **Tri-modal agent behavior.** Bluestone enforcement, custom design system compliance, or "do no harm" continuous-maintain mode.
- **Artifactory is a gate.** SS&C packages require Artifactory credentials. The wizard guides setup.

---

## Process

### Step 1: Detect Current UI State

Check if `.bluestone/config.md` already exists.

**If yes:**
```
Found existing Bluestone configuration:

  Mode: bluestone
  Tech Stack: React/Next.js
  Packages: @sds/core, @sds/react, @sds/icons
  Configured: 2026-04-01

Reconfigure? (yes / no)
```

- **yes**: Proceed to Step 2 (user wants to change configuration)
- **no**: Exit. Show "Bluestone is already active. Use /agent-orch:complib-guide for reference."

**If no:**

Proceed to Step 2 (first-time setup).

---

### Step 2: Choose Mode

Ask user:

```
How would you like the UI/UX agent to handle design system enforcement?

(a) Activate Bluestone Design System (SS&C standard)
(b) Supply my own design system documentation
(c) Keep existing UI as-is (continuous maintain mode — no changes)

Choice:
```

- **(a)**: Proceed to Step 3a (Bluestone activation flow)
- **(b)**: Proceed to Step 3b (Custom design system flow)
- **(c)**: Proceed to Step 3c (Continuous maintain flow)

---

### Step 3a: Bluestone Activation Flow

#### 3a.1: Detect Tech Stack

Inspect the project to determine the tech stack:

**Check for React/Next.js:**
- Look for `package.json` with `"react"` or `"next"` dependencies
- Look for `tsconfig.json` or `jsconfig.json` with JSX support

**Check for Python:**
- Look for `requirements.txt`, `pyproject.toml`, `setup.py`

**Check for Go:**
- Look for `go.mod`

**Check for Rust:**
- Look for `Cargo.toml`

**Check for other backend languages:**
- Look for `pom.xml` (Java), `*.csproj` (C#), etc.

**Present findings:**
```
Detected tech stack: React/Next.js (TypeScript)

Bluestone support level:
  ✓ Full component library available (@sds/react)
  ✓ Design tokens via @sds/core
  ✓ Icons via @sds/icons
  ✓ Charts via @sds/charts + @sds/react-charts
```

OR for non-React:

```
Detected tech stack: Python (FastAPI)

Bluestone support level:
  ✓ Design tokens via CSS custom properties
  ✗ Component library not applicable (backend only)
  → CSS tokens can be used for any HTML templates
```

#### 3a.2: Artifactory Setup (React projects only)

**Check if `.npmrc` has `@sds:registry`:**

```bash
grep -q "@sds:registry=https://artifactory.ssnc.dev" .npmrc 2>/dev/null
```

**If not found:**
```
Bluestone packages (@sds/*) require Artifactory access.

Step 1: Add to .npmrc (in project root):
  @sds:registry=https://artifactory.ssnc.dev/artifactory/api/npm/enterprise-npm-repo

Step 2: Login to Artifactory:
  npm login --registry=https://artifactory.ssnc.dev/artifactory/api/npm/enterprise-npm-repo --scope=@sds

Problems? Contact DevX Pod:
  https://teams.microsoft.com/l/channel/19%3Aa44d4548f87b4babb61648a91333eac5%40thread.tacv2/DevX%20Pod?groupId=1ca13069-d921-402e-82fb-4f67e7830b80&tenantId=f4c566ce-a3ce-4b10-b55b-1e9d56ad1b26

Ready to continue? (yes / no)
```

**If user says no:** Exit with "Run this skill again after completing Artifactory setup."

**If user says yes OR .npmrc already configured:** Proceed to 3a.3.

#### 3a.3: Choose Packages (React projects only)

```
Which Bluestone packages do you need?

(a) Core only (design tokens, theme utilities)
(b) Core + React components
(c) Core + React + Icons
(d) Core + React + Icons + Charts
(e) Everything (@sds/core, @sds/react, @sds/icons, @sds/charts, @sds/react-charts, @sds/custom-elements)

Choice:
```

Map choices to package lists:
- **(a)**: `@sds/core`
- **(b)**: `@sds/core`, `@sds/react`
- **(c)**: `@sds/core`, `@sds/react`, `@sds/icons`
- **(d)**: `@sds/core`, `@sds/react`, `@sds/icons`, `@sds/charts`, `@sds/react-charts`
- **(e)**: `@sds/core`, `@sds/react`, `@sds/icons`, `@sds/charts`, `@sds/react-charts`, `@sds/custom-elements`

**Show installation command:**
```
Install these packages:

  npm install @sds/core @sds/react @sds/icons

Run this now? (yes / skip)
```

- **yes**: Run `npm install [packages]` via Bash tool
- **skip**: Show "Installation skipped. Run manually when ready."

#### 3a.4: Write Configuration

Create `.bluestone/config.md`:

```markdown
# Bluestone Configuration

**Mode:** bluestone  
**Tech Stack:** [detected stack, e.g., "React/Next.js (TypeScript)"]  
**Configured:** [current date]

## Installed Packages

- @sds/core ^1.0.252
- @sds/react ^1.0.252
- @sds/icons ^1.0.252

## Reference

Full design system specification:
`~/.claude/plugins/marketplaces/ssnc-agent-orch/plugins/agent-orch/skills/refactor-to-bluestone/bluestone-reference.md`

## Agent Behavior

The UI/UX agent (orchestrate-uiux) will:
- ENFORCE: All colors use Bluestone design tokens (no hardcoded hex)
- ENFORCE: Use @sds/* components when available (no custom reimplementation)
- ENFORCE: Dark theme is default (Bluestone is dark-first)
- ENFORCE: Data visualization uses Bluestone dataviz palette
- REVIEW: Flag non-Bluestone colors and custom components that duplicate @sds/* functionality

## Artifactory Registry

@sds:registry=https://artifactory.ssnc.dev/artifactory/api/npm/enterprise-npm-repo

DevX Pod (for access issues):
https://teams.microsoft.com/l/channel/19%3Aa44d4548f87b4babb61648a91333eac5%40thread.tacv2/DevX%20Pod?groupId=1ca13069-d921-402e-82fb-4f67e7830b80&tenantId=f4c566ce-a3ce-4b10-b55b-1e9d56ad1b26
```

**For non-React projects:**

```markdown
# Bluestone Configuration

**Mode:** bluestone  
**Tech Stack:** [detected stack, e.g., "Python (FastAPI)"]  
**Configured:** [current date]

## Design Tokens

Bluestone CSS custom properties available for HTML templates.

## Reference

Full design system specification:
`~/.claude/plugins/marketplaces/ssnc-agent-orch/plugins/agent-orch/skills/refactor-to-bluestone/bluestone-reference.md`

## Agent Behavior

The UI/UX agent (orchestrate-uiux) will:
- ENFORCE: All colors use Bluestone design tokens (CSS custom properties)
- ENFORCE: Dark theme is default (Bluestone is dark-first)
- REVIEW: Flag hardcoded colors that should use Bluestone tokens
```

Proceed to Final Step.

---

### Step 3b: Custom Design System Flow

Ask user:

```
Please provide your design system documentation:

(a) Local file path (e.g., /path/to/design-system.pdf or /path/to/docs.md)
(b) URL (e.g., https://example.com/design-system)
(c) Paste content directly

Choice:
```

**If (a):** Ask for file path. Validate it exists with Read tool.  
**If (b):** Ask for URL. Record it in config.  
**If (c):** Ask user to paste content. Write it to `.bluestone/custom-design-system.md`.

Then ask:

```
Component library information:

Package name (if applicable, e.g., @yourorg/ui):
Registry URL (if private, e.g., https://registry.yourorg.com):
Documentation URL (if online):

(Press Enter to skip any field)
```

#### Write Configuration

Create `.bluestone/config.md`:

```markdown
# Custom Design System Configuration

**Mode:** custom  
**Tech Stack:** [detected stack]  
**Configured:** [current date]

## Design System Documentation

[Show file path, URL, or "See .bluestone/custom-design-system.md"]

## Component Library

[If provided:]
- Package: @yourorg/ui
- Registry: https://registry.yourorg.com
- Docs: https://docs.yourorg.com/ui

## Agent Behavior

The UI/UX agent (orchestrate-uiux) will:
- ENFORCE: Follow design system tokens and patterns from provided documentation
- ENFORCE: Use component library components when available
- REVIEW: Flag deviations from documented design system standards
```

Proceed to Final Step.

---

### Step 3c: Continuous Maintain Flow

```
Continuous maintain mode preserves existing UI exactly as-is.

The UI/UX agent will:
  - NOT introduce new design patterns or colors
  - NOT refactor existing UI unless explicitly asked
  - PRESERVE existing styling and component usage
  - ONLY flag accessibility issues (WCAG 2.1 AA)

This is "do no harm" mode for stable UIs.

Confirm? (yes / no)
```

**If yes:**

#### Write Configuration

Create `.bluestone/config.md`:

```markdown
# Continuous Maintain Configuration

**Mode:** maintain  
**Tech Stack:** [detected stack]  
**Configured:** [current date]

## Agent Behavior

The UI/UX agent (orchestrate-uiux) will:
- PRESERVE: Existing UI patterns, colors, components exactly as-is
- MATCH: New features to existing project patterns
- FLAG: Accessibility issues only (WCAG 2.1 AA)
- NOT REFACTOR: UI unless explicitly requested

This is "continuous maintain" mode — the agent is a caretaker, not a redesigner.
```

Proceed to Final Step.

**If no:** Return to Step 2.

---

### Final Step: Confirmation

Show what was written to `.bluestone/config.md`:

```
Configuration saved to .bluestone/config.md

Mode: [bluestone / custom / maintain]
[Summary of what was configured]

Next steps:
- The UI/UX agent (orchestrate-uiux) will now [enforce Bluestone / follow custom docs / preserve existing UI]
- Use /agent-orch:complib-guide for component library reference
- [If Bluestone:] Read bluestone-reference.md for full design system spec

Done!
```

---

## Reference Files

The skill should tell agents to read the sibling file `bluestone-reference.md` for the complete Bluestone design system specification (colors, tokens, gradients, typography, dataviz palette, @sds/* packages, usage patterns).

---

## Notes

- This skill modifies agent behavior by writing `.bluestone/config.md`, which is read by `orchestrate-uiux` agent
- The skill is idempotent: running it multiple times allows reconfiguration
- Artifactory access is required for `@sds/*` packages (wizard guides setup)
- Non-React projects get CSS tokens only (no component library)
- The skill does NOT install packages unless user confirms

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.refactor-to-bluestone:` entry. If the file is absent, has no
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
