import { chromium, firefox, webkit, Browser, BrowserContext, Page, Dialog } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { createInterface, Interface } from 'readline';
import { ToolScope, notConfiguredError } from '../../shared';

export interface PlaywrightClientConfig {
  enabled: boolean;
  headless: boolean;
  browserType: 'chromium' | 'firefox' | 'webkit';
  defaultTimeout: number;
  screenshotDir: string;
  scope?: ToolScope;
}

interface ConsoleMessage {
  type: string;
  text: string;
  timestamp: number;
}

interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  timestamp: number;
}

// Check if running on Bun (which has pipe IPC issues with Playwright on Windows)
const isBunOnWindows = typeof Bun !== 'undefined' && process.platform === 'win32';

/**
 * Worker proxy for running Playwright in a Node.js subprocess.
 * Used on Bun + Windows where direct Playwright doesn't work.
 */
class PlaywrightWorkerProxy {
  private process: ChildProcess | null = null;
  private readline: Interface | null = null;
  private pendingRequests = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private nextId = 1;
  private initialized = false;
  private readonly config: PlaywrightClientConfig;

  constructor(config: PlaywrightClientConfig) {
    this.config = config;
  }

  private async ensureWorker(): Promise<void> {
    if (this.process && this.initialized) return;

    // Find the worker script - handle URL encoding in file paths
    const currentDir = decodeURIComponent(dirname(import.meta.url.replace('file:///', '').replace('file://', '')));
    const workerPath = join(currentDir, 'playwright-worker.cjs');

    if (!existsSync(workerPath)) {
      throw new Error(`Playwright worker not found at: ${workerPath}`);
    }

    // Spawn Node.js process
    this.process = spawn('node', [workerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Set up stdout reading
    this.readline = createInterface({
      input: this.process.stdout!,
      terminal: false,
    });

    this.readline.on('line', (line) => {
      try {
        const response = JSON.parse(line);
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          this.pendingRequests.delete(response.id);
          if (response.error) {
            pending.reject(new Error(response.error));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch {
        // Ignore non-JSON output
      }
    });

    // Log stderr for debugging
    this.process.stderr?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[playwright-worker] ${msg}`);
    });

    // Handle process exit
    this.process.on('exit', (code) => {
      console.log(`[playwright-worker] Process exited with code ${code}`);
      this.process = null;
      this.readline = null;
      this.initialized = false;
      // Reject all pending requests
      for (const [id, pending] of this.pendingRequests) {
        pending.reject(new Error('Worker process exited'));
        this.pendingRequests.delete(id);
      }
    });

    // Wait for ready signal
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    // Initialize worker with config
    await this.sendCommand('init', {
      headless: this.config.headless,
      browserType: this.config.browserType,
      defaultTimeout: this.config.defaultTimeout,
      screenshotDir: this.config.screenshotDir,
    });

    this.initialized = true;
  }

  private sendCommand<T>(command: string, params: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('Worker process not running'));
        return;
      }

      const id = this.nextId++;
      this.pendingRequests.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });

      const message = JSON.stringify({ id, command, params }) + '\n';
      this.process.stdin.write(message);
    });
  }

  async execute<T>(command: string, params: Record<string, unknown> = {}): Promise<T> {
    await this.ensureWorker();
    return this.sendCommand<T>(command, params);
  }

  async close(): Promise<void> {
    if (this.process) {
      await this.sendCommand('close', {});
      this.process.kill();
      this.process = null;
      this.readline = null;
      this.initialized = false;
    }
  }
}

export class PlaywrightClient {
  private readonly config: PlaywrightClientConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private consoleMessages: ConsoleMessage[] = [];
  private networkRequests: NetworkRequest[] = [];
  private pendingDialog: Dialog | null = null;
  private workerProxy: PlaywrightWorkerProxy | null = null;

  constructor(config: PlaywrightClientConfig) {
    this.config = config;
    // Initialize worker proxy on Bun + Windows
    if (isBunOnWindows) {
      this.workerProxy = new PlaywrightWorkerProxy(config);
    }
  }

  isConfigured(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if using worker proxy (Bun + Windows)
   */
  private useWorker(): boolean {
    return isBunOnWindows && this.workerProxy !== null;
  }

  private async ensureBrowser(): Promise<Page> {
    if (!this.config.enabled) {
      throw notConfiguredError('playwright');
    }

    // On Bun + Windows, we use the worker - this method shouldn't be called
    if (this.useWorker()) {
      throw new Error('ensureBrowser should not be called when using worker proxy');
    }

    if (!this.browser) {
      const browserLauncher = {
        chromium,
        firefox,
        webkit,
      }[this.config.browserType];

      this.browser = await browserLauncher.launch({
        headless: this.config.headless,
      });
    }

    if (!this.context) {
      this.context = await this.browser.newContext();
    }

    if (!this.page) {
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.config.defaultTimeout);

      // Capture console messages
      this.page.on('console', (msg) => {
        this.consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
          timestamp: Date.now(),
        });
      });

      // Capture network requests
      this.page.on('response', (response) => {
        this.networkRequests.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          timestamp: Date.now(),
        });
      });

      // Handle dialogs
      this.page.on('dialog', (dialog) => {
        this.pendingDialog = dialog;
      });
    }

    return this.page;
  }

  private ensureScreenshotDir(): void {
    if (!existsSync(this.config.screenshotDir)) {
      mkdirSync(this.config.screenshotDir, { recursive: true });
    }
  }

  // Navigation
  async navigate(url: string, waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'): Promise<{ url: string; title: string }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('navigate', { url, waitUntil });
    }
    const page = await this.ensureBrowser();
    await page.goto(url, { waitUntil: waitUntil || 'load' });
    return {
      url: page.url(),
      title: await page.title(),
    };
  }

  async navigateBack(): Promise<{ url: string; title: string }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('navigateBack', {});
    }
    const page = await this.ensureBrowser();
    await page.goBack();
    return {
      url: page.url(),
      title: await page.title(),
    };
  }

  // Snapshot & Screenshot
  async snapshot(selector?: string): Promise<{ snapshot: string }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('snapshot', { selector });
    }
    const page = await this.ensureBrowser();
    const element = selector ? await page.$(selector) : null;
    const snapshot = await (element || page).evaluate((el) => {
      const getAccessibilityTree = (node: Element, depth = 0): string => {
        const role = node.getAttribute('role') || node.tagName.toLowerCase();
        const name = node.getAttribute('aria-label') ||
          node.getAttribute('title') ||
          (node as HTMLElement).innerText?.slice(0, 50) || '';
        const indent = '  '.repeat(depth);
        let result = `${indent}${role}: ${name}\n`;

        for (const child of node.children) {
          result += getAccessibilityTree(child, depth + 1);
        }
        return result;
      };
      return getAccessibilityTree(el as Element || document.body);
    });
    return { snapshot };
  }

  async takeScreenshot(selector?: string, filename?: string, fullPage?: boolean): Promise<{ path: string }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('takeScreenshot', { selector, filename, fullPage });
    }
    const page = await this.ensureBrowser();
    this.ensureScreenshotDir();

    const screenshotFilename = filename || `screenshot-${Date.now()}.png`;
    const path = join(this.config.screenshotDir, screenshotFilename);

    if (selector) {
      const element = await page.$(selector);
      if (element) {
        await element.screenshot({ path });
      }
    } else {
      await page.screenshot({ path, fullPage: fullPage ?? false });
    }

    return { path };
  }

  // Interactions
  async click(selector: string, button?: 'left' | 'right' | 'middle', clickCount?: number, timeout?: number): Promise<{ success: boolean }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('click', { selector, button, clickCount, timeout });
    }
    const page = await this.ensureBrowser();
    await page.click(selector, {
      button: button || 'left',
      clickCount: clickCount || 1,
      timeout,
    });
    return { success: true };
  }

  async type(selector: string, text: string, delay?: number, clear?: boolean): Promise<{ success: boolean }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('type', { selector, text, delay, clear });
    }
    const page = await this.ensureBrowser();
    if (clear) {
      await page.fill(selector, '');
    }
    await page.type(selector, text, { delay });
    return { success: true };
  }

  async fillForm(selector: string, value: string): Promise<{ success: boolean }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('fillForm', { selector, value });
    }
    const page = await this.ensureBrowser();
    await page.fill(selector, value);
    return { success: true };
  }

  async hover(selector: string, timeout?: number): Promise<{ success: boolean }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('hover', { selector, timeout });
    }
    const page = await this.ensureBrowser();
    await page.hover(selector, { timeout });
    return { success: true };
  }

  async selectOption(selector: string, value?: string, label?: string, index?: number): Promise<{ selected: string[] }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('selectOption', { selector, value, label, index });
    }
    const page = await this.ensureBrowser();
    let selected: string[];

    if (value !== undefined) {
      selected = await page.selectOption(selector, { value });
    } else if (label !== undefined) {
      selected = await page.selectOption(selector, { label });
    } else if (index !== undefined) {
      selected = await page.selectOption(selector, { index });
    } else {
      throw new Error('Must provide value, label, or index for selectOption');
    }

    return { selected };
  }

  async pressKey(key: string, selector?: string): Promise<{ success: boolean }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('pressKey', { key, selector });
    }
    const page = await this.ensureBrowser();
    if (selector) {
      await page.focus(selector);
    }
    await page.keyboard.press(key);
    return { success: true };
  }

  async drag(sourceSelector: string, targetSelector: string): Promise<{ success: boolean }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('drag', { sourceSelector, targetSelector });
    }
    const page = await this.ensureBrowser();
    await page.dragAndDrop(sourceSelector, targetSelector);
    return { success: true };
  }

  async fileUpload(selector: string, filePath: string): Promise<{ success: boolean }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('fileUpload', { selector, filePath });
    }
    const page = await this.ensureBrowser();
    await page.setInputFiles(selector, filePath);
    return { success: true };
  }

  // Dialog handling
  async handleDialog(action: 'accept' | 'dismiss', promptText?: string): Promise<{ handled: boolean; message?: string }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('handleDialog', { action, promptText });
    }
    if (!this.pendingDialog) {
      return { handled: false, message: 'No dialog pending' };
    }

    const message = this.pendingDialog.message();

    if (action === 'accept') {
      await this.pendingDialog.accept(promptText);
    } else {
      await this.pendingDialog.dismiss();
    }

    this.pendingDialog = null;
    return { handled: true, message };
  }

  // Browser state
  async getTabs(): Promise<{ tabs: Array<{ url: string; title: string; active: boolean }> }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('getTabs', {});
    }
    if (!this.context) {
      return { tabs: [] };
    }

    const pages = this.context.pages();
    const tabs = await Promise.all(
      pages.map(async (p) => ({
        url: p.url(),
        title: await p.title(),
        active: p === this.page,
      }))
    );

    return { tabs };
  }

  async resize(width: number, height: number): Promise<{ success: boolean }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('resize', { width, height });
    }
    const page = await this.ensureBrowser();
    await page.setViewportSize({ width, height });
    return { success: true };
  }

  async close(): Promise<{ success: boolean }> {
    if (this.useWorker()) {
      await this.workerProxy!.close();
      return { success: true };
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
    return { success: true };
  }

  // Evaluation & execution
  async evaluate(script: string): Promise<{ result: unknown }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('evaluate', { script });
    }
    const page = await this.ensureBrowser();
    const result = await page.evaluate(script);
    return { result };
  }

  async runCode(code: string): Promise<{ result: unknown }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('runCode', { code });
    }
    const page = await this.ensureBrowser();
    // Execute arbitrary Playwright code - create a function that receives page
    const fn = new Function('page', `return (async () => { ${code} })()`);
    const result = await fn(page);
    return { result };
  }

  // Wait operations
  async waitFor(selector?: string, state?: 'attached' | 'detached' | 'visible' | 'hidden', timeout?: number): Promise<{ success: boolean }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('waitFor', { selector, state, timeout });
    }
    const page = await this.ensureBrowser();

    if (selector) {
      await page.waitForSelector(selector, { state: state || 'visible', timeout });
    } else if (timeout) {
      await page.waitForTimeout(timeout);
    }

    return { success: true };
  }

  // Debug & monitoring
  getConsoleMessages(clear?: boolean): { messages: ConsoleMessage[] } {
    if (this.useWorker()) {
      // Worker returns a promise, but this is sync - need to handle differently
      // For now, return empty and let callers use async version
      return { messages: [] };
    }
    const messages = [...this.consoleMessages];
    if (clear) {
      this.consoleMessages = [];
    }
    return { messages };
  }

  getNetworkRequests(clear?: boolean): { requests: NetworkRequest[] } {
    if (this.useWorker()) {
      // Worker returns a promise, but this is sync - need to handle differently
      return { requests: [] };
    }
    const requests = [...this.networkRequests];
    if (clear) {
      this.networkRequests = [];
    }
    return { requests };
  }

  // Async versions for worker compatibility
  async getConsoleMessagesAsync(clear?: boolean): Promise<{ messages: ConsoleMessage[] }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('getConsoleMessages', { clear });
    }
    return this.getConsoleMessages(clear);
  }

  async getNetworkRequestsAsync(clear?: boolean): Promise<{ requests: NetworkRequest[] }> {
    if (this.useWorker()) {
      return this.workerProxy!.execute('getNetworkRequests', { clear });
    }
    return this.getNetworkRequests(clear);
  }
}
