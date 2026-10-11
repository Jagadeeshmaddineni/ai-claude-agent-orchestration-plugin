# Playwright

[< Back to docs hub](../README.md) | [< Back to MCP README](../../README.md)

Browser automation — navigation, interaction, snapshots, screenshots, and debugging.
**21 tools.**

## Overview

Drives a real browser (Chromium, Firefox, or WebKit). Unlike the other services it
needs no remote credentials, but it does require browser binaries to be installed and
**must run the MCP server with `bun run dev`** (not the compiled binary) because of
Playwright's binary dependencies. Default scope is **`write`**.

## Configuration

```json
{
  "playwright": {
    "enabled": true,
    "headless": true,
    "browserType": "chromium",
    "defaultTimeout": 30000,
    "screenshotDir": "./screenshots",
    "scope": "write"
  }
}
```

| Field | Description | Default |
|-------|-------------|---------|
| `enabled` | Enable Playwright browser automation | `false` |
| `headless` | Run browser in headless mode | `true` |
| `browserType` | `chromium`, `firefox`, or `webkit` | `"chromium"` |
| `defaultTimeout` | Default timeout for operations (ms) | `30000` |
| `screenshotDir` | Directory to save screenshots | `"./screenshots"` |
| `scope` | `"write"` for full control, `"read"` for snapshot/screenshot only | `"write"` |

### Installing browsers

```bash
# Install Chromium (run once)
npx playwright install chromium
# Or install all browsers
npx playwright install
```

> Playwright support requires running the MCP server with `bun run dev` (not the
> compiled binary).

## Tools

| Tool | Scope | Description |
|------|-------|-------------|
| `playwright_navigate` | write | Navigate the browser to a URL. |
| `playwright_navigateBack` | write | Navigate back in history. |
| `playwright_snapshot` | read | Get an accessibility snapshot of the page or element. |
| `playwright_takeScreenshot` | read | Take a screenshot of the page or element. |
| `playwright_click` | write | Click on an element. |
| `playwright_type` | write | Type text into an element. |
| `playwright_fillForm` | write | Fill a form field with a value (clears existing content). |
| `playwright_hover` | write | Hover over an element. |
| `playwright_selectOption` | write | Select an option from a dropdown. |
| `playwright_pressKey` | write | Press a keyboard key. |
| `playwright_drag` | write | Drag an element to another element. |
| `playwright_fileUpload` | write | Upload a file to a file input. |
| `playwright_handleDialog` | write | Handle browser dialogs (alert, confirm, prompt). |
| `playwright_tabs` | read | List all open browser tabs. |
| `playwright_resize` | write | Resize the browser viewport. |
| `playwright_close` | write | Close the browser. |
| `playwright_evaluate` | write | Execute JavaScript in the browser context. |
| `playwright_runCode` | write | Run Playwright code directly. |
| `playwright_waitFor` | read | Wait for an element or condition. |
| `playwright_consoleMessages` | read | Get browser console messages. |
| `playwright_networkRequests` | read | Get captured network requests. |

## Scope behaviour

With `scope: "read"`, only the 6 read tools register (`playwright_snapshot`,
`playwright_takeScreenshot`, `playwright_tabs`, `playwright_waitFor`,
`playwright_consoleMessages`, `playwright_networkRequests`) — useful for read-only
inspection. The 15 `write` tools that drive the browser are dropped.
