#!/usr/bin/env node
/**
 * Playwright Worker for Node.js
 *
 * This script runs Playwright operations in a Node.js subprocess,
 * working around Bun's pipe IPC incompatibility on Windows.
 *
 * Communication is via JSON messages on stdin/stdout.
 */

const { chromium, firefox, webkit } = require('playwright');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const readline = require('readline');

// State
let browser = null;
let context = null;
let page = null;
let consoleMessages = [];
let networkRequests = [];
let pendingDialog = null;
let config = null;

// Read JSON messages from stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Send response to parent
function respond(id, result, error = null) {
  const response = { id, result, error };
  process.stdout.write(JSON.stringify(response) + '\n');
}

// Initialize config
function handleInit(params) {
  config = params;
  return { success: true };
}

// Ensure browser is running
async function ensureBrowser() {
  if (!browser) {
    const browserLauncher = {
      chromium,
      firefox,
      webkit,
    }[config.browserType || 'chromium'];

    browser = await browserLauncher.launch({
      headless: config.headless !== false,
    });
  }

  if (!context) {
    context = await browser.newContext();
  }

  if (!page) {
    page = await context.newPage();
    page.setDefaultTimeout(config.defaultTimeout || 30000);

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
      });
    });

    // Capture network requests
    page.on('response', (response) => {
      networkRequests.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
        timestamp: Date.now(),
      });
    });

    // Handle dialogs
    page.on('dialog', (dialog) => {
      pendingDialog = dialog;
    });
  }

  return page;
}

function ensureScreenshotDir() {
  const dir = config.screenshotDir || './screenshots';
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Command handlers
const handlers = {
  init: handleInit,

  navigate: async ({ url, waitUntil }) => {
    const p = await ensureBrowser();
    await p.goto(url, { waitUntil: waitUntil || 'load' });
    return { url: p.url(), title: await p.title() };
  },

  navigateBack: async () => {
    const p = await ensureBrowser();
    await p.goBack();
    return { url: p.url(), title: await p.title() };
  },

  snapshot: async ({ selector }) => {
    const p = await ensureBrowser();
    const element = selector ? await p.$(selector) : null;
    const snapshot = await (element || p).evaluate((el) => {
      const getAccessibilityTree = (node, depth = 0) => {
        const role = node.getAttribute('role') || node.tagName.toLowerCase();
        const name = node.getAttribute('aria-label') ||
          node.getAttribute('title') ||
          node.innerText?.slice(0, 50) || '';
        const indent = '  '.repeat(depth);
        let result = `${indent}${role}: ${name}\n`;
        for (const child of node.children) {
          result += getAccessibilityTree(child, depth + 1);
        }
        return result;
      };
      return getAccessibilityTree(el || document.body);
    });
    return { snapshot };
  },

  takeScreenshot: async ({ selector, filename, fullPage }) => {
    const p = await ensureBrowser();
    const dir = ensureScreenshotDir();
    const screenshotFilename = filename || `screenshot-${Date.now()}.png`;
    const path = join(dir, screenshotFilename);

    if (selector) {
      const element = await p.$(selector);
      if (element) {
        await element.screenshot({ path });
      }
    } else {
      await p.screenshot({ path, fullPage: fullPage ?? false });
    }
    return { path };
  },

  click: async ({ selector, button, clickCount, timeout }) => {
    const p = await ensureBrowser();
    await p.click(selector, {
      button: button || 'left',
      clickCount: clickCount || 1,
      timeout,
    });
    return { success: true };
  },

  type: async ({ selector, text, delay, clear }) => {
    const p = await ensureBrowser();
    if (clear) {
      await p.fill(selector, '');
    }
    await p.type(selector, text, { delay });
    return { success: true };
  },

  fillForm: async ({ selector, value }) => {
    const p = await ensureBrowser();
    await p.fill(selector, value);
    return { success: true };
  },

  hover: async ({ selector, timeout }) => {
    const p = await ensureBrowser();
    await p.hover(selector, { timeout });
    return { success: true };
  },

  selectOption: async ({ selector, value, label, index }) => {
    const p = await ensureBrowser();
    let selected;
    if (value !== undefined) {
      selected = await p.selectOption(selector, { value });
    } else if (label !== undefined) {
      selected = await p.selectOption(selector, { label });
    } else if (index !== undefined) {
      selected = await p.selectOption(selector, { index });
    } else {
      throw new Error('Must provide value, label, or index for selectOption');
    }
    return { selected };
  },

  pressKey: async ({ key, selector }) => {
    const p = await ensureBrowser();
    if (selector) {
      await p.focus(selector);
    }
    await p.keyboard.press(key);
    return { success: true };
  },

  drag: async ({ sourceSelector, targetSelector }) => {
    const p = await ensureBrowser();
    await p.dragAndDrop(sourceSelector, targetSelector);
    return { success: true };
  },

  fileUpload: async ({ selector, filePath }) => {
    const p = await ensureBrowser();
    await p.setInputFiles(selector, filePath);
    return { success: true };
  },

  handleDialog: async ({ action, promptText }) => {
    if (!pendingDialog) {
      return { handled: false, message: 'No dialog pending' };
    }
    const message = pendingDialog.message();
    if (action === 'accept') {
      await pendingDialog.accept(promptText);
    } else {
      await pendingDialog.dismiss();
    }
    pendingDialog = null;
    return { handled: true, message };
  },

  getTabs: async () => {
    if (!context) {
      return { tabs: [] };
    }
    const pages = context.pages();
    const tabs = await Promise.all(
      pages.map(async (p) => ({
        url: p.url(),
        title: await p.title(),
        active: p === page,
      }))
    );
    return { tabs };
  },

  resize: async ({ width, height }) => {
    const p = await ensureBrowser();
    await p.setViewportSize({ width, height });
    return { success: true };
  },

  close: async () => {
    if (browser) {
      await browser.close();
      browser = null;
      context = null;
      page = null;
    }
    return { success: true };
  },

  evaluate: async ({ script }) => {
    const p = await ensureBrowser();
    const result = await p.evaluate(script);
    return { result };
  },

  runCode: async ({ code }) => {
    const p = await ensureBrowser();
    const fn = new Function('page', `return (async () => { ${code} })()`);
    const result = await fn(p);
    return { result };
  },

  waitFor: async ({ selector, state, timeout }) => {
    const p = await ensureBrowser();
    if (selector) {
      await p.waitForSelector(selector, { state: state || 'visible', timeout });
    } else if (timeout) {
      await p.waitForTimeout(timeout);
    }
    return { success: true };
  },

  getConsoleMessages: ({ clear }) => {
    const messages = [...consoleMessages];
    if (clear) {
      consoleMessages = [];
    }
    return { messages };
  },

  getNetworkRequests: ({ clear }) => {
    const requests = [...networkRequests];
    if (clear) {
      networkRequests = [];
    }
    return { requests };
  },
};

// Process incoming messages
rl.on('line', async (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch (e) {
    console.error('Invalid JSON:', line);
    return;
  }

  const { id, command, params } = msg;
  const handler = handlers[command];

  if (!handler) {
    respond(id, null, `Unknown command: ${command}`);
    return;
  }

  try {
    const result = await handler(params || {});
    respond(id, result);
  } catch (e) {
    respond(id, null, e.message);
  }
});

// Handle shutdown
process.on('SIGTERM', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

// Signal ready
console.error('[playwright-worker] Ready');
