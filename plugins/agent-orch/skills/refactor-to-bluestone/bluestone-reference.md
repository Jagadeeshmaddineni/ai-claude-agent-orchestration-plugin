# Bluestone Design System Reference

Complete specification for the SS&C Bluestone design system. This document is the source of truth for UI/UX agents enforcing Bluestone standards.

---

## Color Tokens

### Primary Color

| Token | Value | HSL | Usage |
|-------|-------|-----|-------|
| Primary A50 | `#1F6681` | hsl(234, 94%, 43%, 1) | Primary CTAs, Text, Line |

### Secondary Colors

| Token | Value | HSL | Usage |
|-------|-------|-----|-------|
| Secondary A50 | `#0D9DDB` | hsl(203, 100%, 63%, 1) | Accent and Focus Text, Panels |
| Secondary A30 | `#8FC1D7` | hsl(202, 100%, 70%, 1) | Tags |
| Secondary B20 | `#C1BFE1` | hsl(263, 97%, 88%, 1) | Supporting Text, Status, Interaction |

### Semantic Colors (RAG Status)

| Token | Value | HSL | Usage |
|-------|-------|-----|-------|
| Success | `#00A86B` | hsl(74, 100%, 29%, 1) | Success states, positive indicators |
| Informational | `#3790E2` | hsl(216, 100%, 49%, 1) | Info messages, neutral indicators |
| Informational 90 | `#D5A5C8` | hsl(216, 100%, 50%, 1) | Alternative info variant |
| Warning | `#FFA800` | hsl(32, 100%, 50%, 1) | Warning states, caution indicators |
| Error | `#FF3B30` | hsl(0, 100%, 60%, 1) | Error states, destructive actions |

### Neutrals

| Token | Value | HSL | Usage |
|-------|-------|-----|-------|
| Neutral A20 | `#C2D0DB` | hsl(205, 29%, 84%, 1) | Table / Copy, Data Table Text, Table |
| Neutral A15 | `#A8ABB5` | hsl(225, 22%, 90%, 1) | Headings, Table Registration Text |
| Neutral A30 | `#A4B2C1` | hsl(205, 23%, 70%, 1) | Subheaders |
| Neutral A60 | `#7B89A3` | hsl(222, 77%, 56%, 1) | Inactive Text Elements (e.g. Buttons, Form Elements) |
| Neutral A50 | `#5B6A85` | hsl(219, 25%, 43%, 1) | Graphic Elements - Small, Variations / Dividers |
| Neutral A80 | `#455D70` | hsl(203, 28%, 44%, 1) | Copy (Alt) |
| Neutral A70 | `#3D5167` | hsl(202, 30%, 25%, 1) | Inactive elements (Alt) |
| White | `#F6FDFF` | hsl(0, 0%, 100%, 1) | Primary Text, Button Colors, Tooltips Text, Dropbox Text |

### Backgrounds

| Token | Value | HSL | Usage |
|-------|-------|-----|-------|
| Background 01 | `#070D20` | hsl(225, 59%, 7%, 1) | Global Header |
| Background 02 | `#0B4D61` | hsl(202, 46%, 77%, 1) | Tooltips, Promo/Dwell elements |
| Background 03 | `#1B3D55` | hsl(203, 43%, 19%, 1) | Form Element Backgrounds, Inactive |
| Background 04 | `#032A44` | hsl(213, 90%, 20%, 1) | Form element / Background (inactive) |
| Background 05 | `#1E3E58` | hsl(208, 50%, 53%, 1) | Badges, Secondary Tabs |
| Background 06 | `#162E45` | hsl(213, 39%, 59%, 1) | Dropdown, Popover Elements |
| Background 07 | `#1F4C67` | hsl(204, 44%, 17%, 1) | Hovers and Drawers |
| Background 08 | `#0F2837` | hsl(213, 79%, 4%, 0.8) | Internal Background |
| Background 09 | `#070B61` | hsl(237, 88%, 6%, 1) | Table / Expand, Table Row |
| Background 10 | `#142A52` | hsl(217, 52%, 39%, 1) | Static |

### Active States

| Token | Value | HSL | Usage |
|-------|-------|-----|-------|
| Hover | `#8EC3FF @70%` | hsl(213, 104%, 78%, 0.3) | Hover - Interactive Elements |
| Active | `#8EC3FF @50%` | hsl(213, 100%, 78%, 0.12) | Active - Interactive Elements |
| Backdrop | `#070C18 @70%` | hsl(223, 59%, 7%, 0.170) | Modal and Drawer Overlay |

### Workspace Colors

| Token | Value | HSL | Usage |
|-------|-------|-----|-------|
| Workspace Primary | `#0B3E95` | hsl(217, 80%, 66%, 1) | Interactive Elements |
| Empty Panels | `#173B80` | hsl(221, 47%, 23%, 1) | Empty Panels |
| Near Empty Panel | `#637A97` | hsl(214, 43%, 33%, 1) | Supporting Elements/Tags |
| Move Shadow | `#56638B` | hsl(228, 53%, 50%, 1) | Shadow Color When Moving |

---

## Gradients

### Background Gradients

| Token | Values | Usage |
|-------|--------|-------|
| BG Gradient 01 | `#070D20` → `#1F4C67` | Primary background gradient |
| BG Gradient 02 | `#032A44` → `#1B3D55` | Secondary background gradient |
| BG Gradient 03 | `#0F2837` → `#162E45` | Tertiary background gradient |
| BG Gradient 04 | `#070B61` → `#142A52` | Quaternary background gradient |
| BG Gradient 05 | `#1E3E58` → `#1F4C67` | Quinary background gradient |
| BG Gradient 06 | `#0B4D61` → `#1B3D55` | Senary background gradient |
| BG Gradient 07 | `#070D20` → `#0B4D61` | Septenary background gradient |
| BG Gradient 08 | `#032A44` → `#0F2837` | Octonary background gradient |
| BG Gradient 09 | `#070B61` → `#1E3E58` | Nonary background gradient |

### Stroke Gradients

| Token | Values | Usage |
|-------|--------|-------|
| Stroke Gradient 01 | `#1F6681` → `#0D9DDB` | Primary to Secondary transition |
| Stroke Gradient 02 | `#8FC1D7` → `#C1BFE1` | Light secondary transition |

### Neutral Gradients

| Token | Values | Usage |
|-------|--------|-------|
| Neutral Gradient 01 | `#C2D0DB` → `#A8ABB5` | Light neutral transition |
| Neutral Gradient 02 | `#A4B2C1` → `#7B89A3` | Medium neutral transition |
| Neutral Gradient 03 | `#5B6A85` → `#455D70` | Dark neutral transition |

---

## Data Visualization Colors

### Primary Palette (use for ≤5 data categories)

| Token | Value | Usage |
|-------|-------|-------|
| Aqua | `#00CED1` | First data category |
| Marigold | `#FFB347` | Second data category |
| Indigo | `#4B0082` | Third data category |
| Raspberry | `#E30B5C` | Fourth data category |
| Sapphire | `#0F52BA` | Fifth data category |
| Canary | `#FFEF00` | Accent category |
| Scarlett | `#FF2400` | Warning/alert category |
| Grape | `#6F2DA8` | Alternative category |

### Secondary Palette (for >5 categories)

| Token | Value | Usage |
|-------|-------|-------|
| Caribbean | `#00CCCC` | Extended category 1 |
| Magenta | `#FF00FF` | Extended category 2 |
| Silver | `#C0C0C0` | Neutral/baseline |
| BAC Gradient | `#0B3E95` → `#8EC3FF` | Special emphasis gradient |

### Usage Guidelines

- **≤5 categories**: Use primary palette only
- **6-8 categories**: Use primary palette + select secondary colors
- **>8 categories**: Consider redesigning the visualization or using gradients
- **Time series**: Use blue gradient variants
- **Comparison**: Use contrasting colors (Aqua vs Marigold, Indigo vs Raspberry)
- **Hierarchical**: Use gradient from dark to light within same hue family

---

## Typography

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display 1 | 48px | 700 | 56px | Hero headlines |
| Display 2 | 40px | 700 | 48px | Page titles |
| Heading 1 | 32px | 600 | 40px | Section headers |
| Heading 2 | 24px | 600 | 32px | Subsection headers |
| Heading 3 | 20px | 600 | 28px | Card titles |
| Heading 4 | 18px | 600 | 24px | Small headers |
| Body Large | 16px | 400 | 24px | Lead paragraphs |
| Body | 14px | 400 | 20px | Standard body text |
| Body Small | 12px | 400 | 16px | Secondary text |
| Caption | 11px | 400 | 14px | Labels, captions |
| Overline | 10px | 600 | 12px | Uppercase labels |

### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | All UI text |
| Monospace | `'Fira Code', 'Courier New', monospace` | Code, data tables |

### Font Weights

- **Regular**: 400 (body text)
- **Medium**: 500 (emphasis)
- **Semibold**: 600 (headings)
- **Bold**: 700 (display text)

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| Space 0 | 0px | Reset |
| Space 1 | 4px | Tight spacing |
| Space 2 | 8px | Small gaps |
| Space 3 | 12px | Default inline spacing |
| Space 4 | 16px | Default block spacing |
| Space 5 | 20px | Medium gaps |
| Space 6 | 24px | Large gaps |
| Space 8 | 32px | Section spacing |
| Space 10 | 40px | Major section spacing |
| Space 12 | 48px | Page-level spacing |
| Space 16 | 64px | Hero spacing |

---

## Elevation (Shadows)

| Token | Value | Usage |
|-------|-------|-------|
| Elevation 1 | `0 1px 2px rgba(0,0,0,0.3)` | Subtle lift (buttons, cards) |
| Elevation 2 | `0 2px 4px rgba(0,0,0,0.3)` | Standard lift (dropdowns) |
| Elevation 3 | `0 4px 8px rgba(0,0,0,0.3)` | Medium lift (popovers) |
| Elevation 4 | `0 8px 16px rgba(0,0,0,0.3)` | High lift (modals) |
| Elevation 5 | `0 16px 32px rgba(0,0,0,0.3)` | Maximum lift (drawers) |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| Radius 0 | 0px | Sharp corners |
| Radius 1 | 2px | Subtle rounding (inputs) |
| Radius 2 | 4px | Standard rounding (buttons) |
| Radius 3 | 8px | Medium rounding (cards) |
| Radius 4 | 12px | Large rounding (panels) |
| Radius Full | 9999px | Circular (badges, avatars) |

---

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| Z-Index Base | 0 | Standard layer |
| Z-Index Dropdown | 100 | Dropdowns |
| Z-Index Sticky | 200 | Sticky headers |
| Z-Index Fixed | 300 | Fixed elements |
| Z-Index Popover | 400 | Popovers, tooltips |
| Z-Index Modal | 500 | Modal dialogs |
| Z-Index Toast | 600 | Toast notifications |

---

## @sds/* Package Reference

### Registry Configuration

```bash
# Add to .npmrc
@sds:registry=https://artifactory.ssnc.dev/artifactory/api/npm/enterprise-npm-repo
```

### Authentication

```bash
npm login --registry=https://artifactory.ssnc.dev/artifactory/api/npm/enterprise-npm-repo --scope=@sds
```

**Problems?** Contact DevX Pod:  
https://teams.microsoft.com/l/channel/19%3Aa44d4548f87b4babb61648a91333eac5%40thread.tacv2/DevX%20Pod?groupId=1ca13069-d921-402e-82fb-4f67e7830b80&tenantId=f4c566ce-a3ce-4b10-b55b-1e9d56ad1b26

### Available Packages

| Package | Version | Purpose |
|---------|---------|---------|
| @sds/core | ^1.0.252 | Core design tokens, toggleDarkMode(), foundational styles |
| @sds/react | ^1.0.252 | React component library |
| @sds/icons | ^1.0.252 | Icon set |
| @sds/charts | ^1.0.252 | Chart components |
| @sds/react-charts | ^1.0.252 | React chart wrappers |
| @sds/custom-elements | ^1.0.252 | Web components (framework-agnostic) |

### Installation

```bash
# Full install
npm install @sds/core @sds/react @sds/icons @sds/charts @sds/react-charts @sds/custom-elements

# Minimal install (tokens only)
npm install @sds/core

# Common install (React + tokens + icons)
npm install @sds/core @sds/react @sds/icons
```

---

## Usage Patterns

### Theme Provider Setup

```tsx
import { toggleDarkMode } from '@sds/core';
import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Bluestone is dark-first — set dark mode by default
    toggleDarkMode(false, true); // (lightMode: false, isDarkMode: true)
  }, []);

  return <>{children}</>;
}
```

### CSS Variable Usage

```css
/* Use Bluestone tokens via CSS variables */
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

.button-primary:hover {
  background: var(--hover);
}
```

### React Component Usage

```tsx
import { Button } from '@sds/react';
import { IconName } from '@sds/icons';

function DeleteButton() {
  return (
    <Button variant="danger" size="medium">
      <IconName name="trash" size={16} />
      Delete
    </Button>
  );
}
```

### Layout Patterns

```tsx
import { Stack, Cluster } from '@sds/react';

function PageLayout() {
  return (
    <Stack gap={200}> {/* 200 = var(--space-8) = 32px */}
      <header style={{ height: '60px', background: 'var(--background-01)' }}>
        <Cluster gap={100} align="center"> {/* 100 = var(--space-4) = 16px */}
          <Logo />
          <Navigation />
        </Cluster>
      </header>
      <main>
        <ContentArea />
      </main>
    </Stack>
  );
}
```

### Chart Usage

```tsx
import { BarChart } from '@sds/react-charts';

function DataVisualization({ data }: { data: ChartData[] }) {
  return (
    <BarChart
      data={data}
      colors={[
        'var(--aqua)',
        'var(--marigold)',
        'var(--indigo)',
        'var(--raspberry)',
        'var(--sapphire)'
      ]}
      darkMode={true} // Bluestone default
    />
  );
}
```

---

## SSR Compatibility Note

**CRITICAL**: `@sds/custom-elements` uses `CSSStyleSheet.replace()`, which is NOT available in Node.js SSR environments.

### Solutions

**Next.js (App Router):**
```tsx
'use client'; // Force client-side rendering

import { SdsComponent } from '@sds/custom-elements';

export function MyComponent() {
  return <SdsComponent />;
}
```

**Next.js (Pages Router):**
```tsx
import dynamic from 'next/dynamic';

const SdsComponent = dynamic(
  () => import('@sds/custom-elements').then(mod => mod.SdsComponent),
  { ssr: false }
);
```

**Remix:**
```tsx
import { ClientOnly } from 'remix-utils';

export function MyComponent() {
  return (
    <ClientOnly fallback={<div>Loading...</div>}>
      {() => <SdsComponent />}
    </ClientOnly>
  );
}
```

---

## White Label / Custom Theming

For white-labeled products or custom branding:

1. Override CSS custom properties at root level:
```css
:root {
  --primary-a50: #your-brand-color;
  --background-01: #your-dark-bg;
  /* ... */
}
```

2. Use flat color palette (no gradients) for simpler customization
3. Maintain Bluestone structure but replace color values
4. Ensure WCAG 2.1 AA contrast ratios are maintained

---

## Accessibility Requirements

All Bluestone implementations MUST meet:

- **WCAG 2.1 AA** contrast ratios (4.5:1 for text, 3:1 for large text)
- **Keyboard navigation** for all interactive elements
- **Focus indicators** visible on all focusable elements
- **ARIA labels** for icon-only buttons
- **Screen reader support** for all dynamic content
- **Color-blind safe** palettes (do not rely on color alone)

---

## Enforcement Checklist

When reviewing code for Bluestone compliance:

- [ ] No hardcoded colors (must use Bluestone tokens)
- [ ] No custom components duplicating @sds/* functionality
- [ ] Dark theme is default (Bluestone is dark-first)
- [ ] Data viz uses Bluestone dataviz palette
- [ ] Typography uses Bluestone type scale
- [ ] Spacing uses Bluestone spacing scale
- [ ] Shadows use Bluestone elevation tokens
- [ ] Border radius uses Bluestone radius tokens
- [ ] CSS variables follow `var(--token-name)` pattern
- [ ] Contrast ratios meet WCAG 2.1 AA
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels present on icon-only buttons
- [ ] SSR compatibility handled (if applicable)

---

## Examples from Real Projects

### Example 1: recon-ai (Next.js)

**Layout (header + sidebar):**
```tsx
<header style={{ height: '60px', background: 'var(--background-01)' }}>
  <Cluster gap={100} align="center">
    <Logo />
    <Navigation />
  </Cluster>
</header>
<div style={{ display: 'flex' }}>
  <aside style={{
    width: '240px',
    background: 'var(--bg-gradient-07)',
    borderRight: '1px solid var(--neutral-a50)'
  }}>
    <Sidebar />
  </aside>
  <main style={{ flex: 1, padding: 'var(--space-8)' }}>
    <Content />
  </main>
</div>
```

**Active state (sidebar item):**
```css
.sidebar-item.active {
  background: var(--hover);
  border-left: 3px solid var(--primary-a50);
}
```

**Button with icon:**
```tsx
<Button variant="primary" size="medium">
  <IconName name="plus" size={16} />
  Add New
</Button>
```

---

**Version:** 1.0.252  
**Last Updated:** 2026-04-09  
**Maintained By:** SS&C DevX Pod
