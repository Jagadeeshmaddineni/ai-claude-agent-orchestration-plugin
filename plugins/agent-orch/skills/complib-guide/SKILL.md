---
name: complib-guide
description: Reference skill for UI/UX agent. Ensures consistent use of component libraries and design systems instead of creating custom styled components. Usage: /agent-orch:complib-guide
---

# Skill: Component Library Guide

## Configuration

Configure your component library paths in `.specify/memory/constitution.md`:

```markdown
## Component Library

COMPONENT_LIBRARY_ROOT: /path/to/your/Component-Library
DOCS_ROOT: ${COMPONENT_LIBRARY_ROOT}/packages/ui-docs/src
PACKAGE_DOCS: ${DOCS_ROOT}/<package-name>
COMPONENT_DOCS: ${DOCS_ROOT}/<package-name>/<ComponentName>/<ComponentName>.mdx
COMPONENT_STORIES: ${DOCS_ROOT}/<package-name>/<ComponentName>/<ComponentName>.stories.tsx
MATERIALS: ${DOCS_ROOT}/materials
```

### Materials (Design Tokens)

Configure your design token documentation paths:
- **Borders:** `materials/Borders.mdx`
- **Colours:** `materials/Colours.mdx`
- **Elevations:** `materials/Elevations.mdx`
- **Spacing:** `materials/Spacing.mdx`
- **Theming:** `materials/Theming.mdx`
- **Typography:** `materials/Typography.mdx`
- **ZIndex:** `materials/ZIndex.mdx`

---

## Package Structure

### Core Design System Packages

| Package | Purpose |
|---------|---------|
| @org/bsds-core | Foundational components (Button, Spinner, Layout, Stack, Cluster) |
| @org/bsds-badges | Badge and status indicators |
| @org/bsds-card | Card layouts |
| @org/bsds-combobox | Combobox/autocomplete inputs |
| @org/bsds-forms | Form controls and validation |
| @org/bsds-icons | Icon system |
| @org/bsds-layouts | Page layouts and containers |
| @org/bsds-table | Data tables |
| @org/bsds-tabs | Tab navigation |

### UI Pattern Packages

| Package | Purpose |
|---------|---------|
| @org/ui-canvas | Canvas/drawing components |
| @org/ui-charts | Data visualizations |
| @org/ui-drawer | Slide-out panels |
| @org/ui-inline-notification | Inline alerts/messages |
| @org/ui-menu | Menu components |
| @org/ui-modal | Modal dialogs |
| @org/ui-toast | Toast notifications |
| @org/ui-pattern-date-picker | Date selection |
| @org/ui-pattern-file-picker | File upload |
| @org/ui-pattern-tooltip | Tooltips |
| @org/ui-pattern-tree-view | Tree structures |

---

## Operating Principles

### 1. Design System First
- **Always** check if a component exists before creating custom
- The Component Library is composable with styling and UX guidelines
- Prefer composition of existing components over building from scratch

### 2. Documentation as Source of Truth
- **MDX files** define component APIs, props, and usage guidelines
- **Story files** are canonical examples showing proper usage patterns
- Follow code style and patterns from existing stories

### 3. Accessibility by Default
- All components should follow WCAG 2.1 AA standards
- Maintain accessibility when composing components
- Preserve ARIA attributes and keyboard navigation
- Use `aria-disabled` instead of `disabled` for buttons

### 4. Styling Guidelines
- Use design tokens from `materials` for any custom styling
- Modern color functions (oklch) preferred over HEX/RGB/HSL
- Never hardcode colors, spacing, or typography values

---

## Workflow

### Step 1: Identify the UI Need
Determine what type of component or pattern is needed.

### Step 2: Search Component Library
1. Check package list for relevant packages
2. Navigate to `${DOCS_ROOT}/<package-name>/`
3. Read `ComponentName.mdx` for API
4. Review `ComponentName.stories.tsx` for examples

### Step 3: Implement Using Examples
```tsx
import { Button } from '@org/bsds-core';
import { Trash } from '@org/bsds-icons';

<Button importance="primary" variant="danger">
  <Trash size={16} /> Delete
</Button>
```

### Step 4: Apply Design Tokens
Reference materials documentation for any custom styling.

---

## Common Patterns

### Layout & Spacing
```tsx
import { Stack, Cluster } from '@org/bsds-core';

<Stack gap={200}>
  <Cluster gap={100}>
    {/* Horizontal items */}
  </Cluster>
  {/* Vertical items */}
</Stack>
```

### Loading States
```tsx
import { Spinner } from '@org/bsds-core';
<Spinner />
```

### User Feedback
- Inline errors: `@org/ui-inline-notification`
- Toast messages: `@org/ui-toast`
- Modal dialogs: `@org/ui-modal`
- Tooltips: `@org/ui-pattern-tooltip`

### Icons
Icons in buttons should be `size={16}`.

---

## Implementation Checklist

- [ ] Checked for existing component in package list
- [ ] Read component MDX documentation
- [ ] Reviewed Storybook story examples
- [ ] Used all required props from docs
- [ ] Applied design tokens (not hardcoded values)
- [ ] Used layout components (Stack, Cluster) for spacing
- [ ] Icons sized correctly (size={16} for buttons)
- [ ] Maintained accessibility standards
- [ ] Followed naming conventions from examples

---

## Bluestone / SS&C Design System (@sds/*)

When a project uses the SS&C Bluestone design system (check for `.bluestone/config.md` with `mode: bluestone`), use these packages:

### Package Map

| Package | Purpose | Use When |
|---------|---------|----------|
| @sds/core | Design tokens, toggleDarkMode, foundational CSS | Always — required base |
| @sds/react | React component library | React/Next.js projects |
| @sds/icons | Icon set | When icons needed |
| @sds/charts | Chart primitives | Data visualization |
| @sds/react-charts | React chart wrappers | React + charts |
| @sds/custom-elements | Web components | Non-React or SSR-safe usage |

### Registry Setup

```
@sds:registry=https://artifactory.ssnc.dev/artifactory/api/npm/enterprise-npm-repo
```

Requires Artifactory login:
```bash
npm login --registry=https://artifactory.ssnc.dev/artifactory/api/npm/enterprise-npm-repo --scope=@sds
```

**Problems?** See [DevX Pod](https://teams.microsoft.com/l/channel/19%3Aa44d4548f87b4babb61648a91333eac5%40thread.tacv2/DevX%20Pod?groupId=1ca13069-d921-402e-82fb-4f67e7830b80&tenantId=f4c566ce-a3ce-4b10-b55b-1e9d56ad1b26) for access issues.

### Key Patterns

#### Dark Theme (Default)
```tsx
import { toggleDarkMode } from '@sds/core';
import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Bluestone is dark-first
    toggleDarkMode(false, true); // (lightMode: false, isDarkMode: true)
  }, []);

  return <>{children}</>;
}
```

#### CSS Variables
```css
.header {
  background: var(--background-01);
  color: var(--white);
  border-bottom: 1px solid var(--neutral-a50);
}

.button-primary {
  background: var(--primary-a50);
  color: var(--white);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-2);
}
```

#### React Components
```tsx
import { Button } from '@sds/react';
import { IconName } from '@sds/icons';

<Button variant="danger" size="medium">
  <IconName name="trash" size={16} />
  Delete
</Button>
```

#### SSR Note
`@sds/custom-elements` uses `CSSStyleSheet` which is NOT available in Node.js SSR environments.

**Next.js Solution:**
```tsx
'use client'; // Force client-side rendering

import { SdsComponent } from '@sds/custom-elements';

export function MyComponent() {
  return <SdsComponent />;
}
```

OR use dynamic import:
```tsx
import dynamic from 'next/dynamic';

const SdsComponent = dynamic(
  () => import('@sds/custom-elements').then(mod => mod.SdsComponent),
  { ssr: false }
);
```

### Full Reference

For complete Bluestone specification (colors, tokens, gradients, typography, spacing, elevation, etc.):

```
~/.claude/plugins/marketplaces/ssnc-agent-orch/plugins/agent-orch/skills/refactor-to-bluestone/bluestone-reference.md
```

---

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. Before running,
check that file for a `skills.complib-guide:` entry. If the file is absent, has no
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
