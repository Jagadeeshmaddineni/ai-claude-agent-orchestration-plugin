# Skin Deep: Teaching Agents to See Your Design System (v2.14.0)

The hardest part of a design system isn't building it. It's making sure people actually use it.

Every frontend team has lived through this: the design system exists, the Figma tokens are published, the component library has docs and stories -- and yet every sprint review surfaces another screen with hardcoded `#1a2b3c` instead of `var(--primary)`, another hand-rolled card component that's almost-but-not-quite the one in the library.

v2.14.0 gives the UI/UX agent the ability to enforce a design system continuously. Not as a one-time audit, but as a mode of operation that persists across every `/build` and `/implement` session.

## The Problem: UI Drift is Silent

Code linters catch syntax errors. Type checkers catch type mismatches. Nothing catches "you used the wrong shade of blue."

Design system violations are invisible to CI. They pass every test. They ship to production looking almost right. And over months, "almost right" compounds into an app that looks like three different products stitched together.

The UI/UX agent (`orchestrate-uiux`) has always reviewed for accessibility and component library usage. But it had no opinion about *which* design system to enforce. It was a general-purpose reviewer with no teeth.

## The Solution: Tri-Modal UI Agent

The UI/UX agent now operates in one of three modes, determined by a single config file (`.bluestone/config.md`) in the project root:

### Mode 1: Bluestone (Active Enforcement)

When activated, the agent enforces the SS&C Bluestone design system. Every color, every component, every spacing value is checked against the spec.

What it catches:
- Hardcoded hex colors that should be design tokens (`#1F6681` should be `var(--primary-a50)`)
- Custom components that duplicate `@sds/react` functionality
- Missing dark mode support (Bluestone is dark-first)
- Data visualization colors outside the Bluestone dataviz palette
- Typography and spacing that bypass the token scale

What it knows:
- The full color palette: Primary, Secondary, Semantic (RAG), Neutrals, 10 background levels, active states, workspace colors
- All gradients: 9 background gradients, stroke gradients, neutral gradients
- Data visualization colors: primary palette for <=5 categories, secondary for more
- White label variants for client-facing products
- The `@sds/*` package ecosystem: core, react, icons, charts, react-charts, custom-elements

### Mode 2: Custom Design System

Not every project uses Bluestone. The wizard lets you point the agent at your own design system docs -- a PDF, a URL, a local tokens file. The agent reads it and enforces it with the same rigor.

### Mode 3: Continuous Maintain (Default)

This is the critical one. When no config exists, the agent does *nothing new*. It preserves whatever UI patterns already exist. It doesn't introduce Bluestone. It doesn't "improve" colors. It matches the existing codebase exactly.

This matters because the worst thing an AI agent can do to a UI is invent. A model that decides your buttons should be a different shade of blue because it "looks better" is worse than no model at all. Continuous-maintain means the agent is a caretaker, not a designer.

## `/refactor-to-bluestone`: The Activation Wizard

The skill walks through setup in a single session:

```
/agent-orch:refactor-to-bluestone
```

```
How would you like the UI/UX agent to handle design system enforcement?

(a) Activate Bluestone Design System (SS&C standard)
(b) Supply my own design system documentation
(c) Keep existing UI as-is (continuous maintain mode)
```

If you choose Bluestone, the wizard:

1. **Detects your tech stack.** React/Next.js projects get the full `@sds/react` component library. Non-React projects get CSS token guidance. Projects with no frontend at all get told politely that there's nothing to skin.

2. **Sets up Artifactory.** The `@sds/*` packages live on the SS&C Artifactory registry. The wizard checks your `.npmrc`, guides you through login, and links to the [DevX Pod Teams channel](https://teams.microsoft.com/l/channel/19%3Aa44d4548f87b4babb61648a91333eac5%40thread.tacv2/DevX%20Pod?groupId=1ca13069-d921-402e-82fb-4f67e7830b80&tenantId=f4c566ce-a3ce-4b10-b55b-1e9d56ad1b26) if you hit credential issues.

3. **Lets you pick packages.** Not every app needs charts. The wizard asks which `@sds/*` packages you need: core (always), react, icons, charts, react-charts, custom-elements.

4. **Writes the config.** `.bluestone/config.md` lands in your project root. From that point forward, every `/build` and `/implement` session enforces Bluestone through the UI/UX agent.

## Why a Config File, Not a Flag

A flag would require passing `--bluestone` to every command. A memory would be invisible and easy to forget. A config file in the repo is:

- **Visible** -- `git status` shows it, PRs include it, new team members inherit it
- **Portable** -- clone the repo, the design system enforcement comes with it
- **Overridable** -- delete the file to go back to continuous-maintain

The file is markdown, not JSON, because the UI/UX agent reads it as context. It contains the mode, tech stack, installed packages, and a pointer to the full Bluestone reference spec.

## The Reference Spec

The Bluestone reference (`bluestone-reference.md`) is embedded in the plugin -- no external file dependencies. It contains:

- **68 color tokens** with hex, HSL, and usage notes
- **9 background gradients** plus stroke and neutral gradients
- **12 data visualization colors** split into primary and secondary palettes
- **Typography scale** from Display down to Overline
- **Spacing, elevation, border radius, and z-index scales**
- **`@sds/*` package map** with version, purpose, and when to use each
- **Usage patterns** from real production code (ThemeProvider, CSS variables, SSR workarounds)
- **Enforcement checklist** the agent runs on every review

## SSR: The Gotcha

One thing the reference documents that trips up every new Bluestone adopter: `@sds/custom-elements` uses `CSSStyleSheet`, which doesn't exist in Node.js. Server-side rendering frameworks (Next.js, Remix) will crash if you import `@sds/custom-elements` at the top level.

The fix is either `'use client'` directives or dynamic imports. The agent knows this and flags SSR-incompatible imports automatically.

## What Didn't Change

The component library guide (`/agent-orch:complib-guide`) now includes a Bluestone section with the `@sds/*` package map, registry setup, and key patterns. But it still supports any component library -- Bluestone is additive, not exclusive.

The 26 agents are unchanged. The UI/UX agent gained new behavior but lost nothing. Every other agent works exactly as before.

## The Workflow

Before v2.14.0:
```
/agent-orch:build "add user settings page"
# UI/UX agent reviews accessibility, suggests components
# No design system enforcement
# Developer manually checks colors against Figma
```

After v2.14.0:
```
/agent-orch:refactor-to-bluestone    # One-time setup
/agent-orch:build "add user settings page"
# UI/UX agent enforces Bluestone tokens, @sds/* components, dark theme
# Every color, spacing, and component choice is validated
# Design system drift caught at build time, not sprint review
```

## What's Next

The obvious extension is Bluestone migration assistance -- not just enforcing the design system on new code, but helping refactor existing apps from arbitrary CSS to Bluestone tokens. The config file already supports this: switch from `maintain` to `bluestone` and the agent starts flagging existing violations, not just new ones.

For now, the value is simpler: stop the bleeding. Every new screen built with Bluestone enforcement is one fewer screen to migrate later.

---

**v2.14.0** -- 19 skills, 26 agents. Bluestone design system enforcement via `/refactor-to-bluestone`, tri-modal UI/UX agent (Bluestone / custom / continuous-maintain), embedded design system reference with 68 color tokens, `@sds/*` package guidance, and Artifactory setup wizard.
