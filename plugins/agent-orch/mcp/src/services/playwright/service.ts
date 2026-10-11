import { IToolService, ToolDefinition, ToolScope, toolNotFoundError } from '../../shared';
import { PlaywrightClient, PlaywrightClientConfig } from './client';
import { playwrightSchemas, PlaywrightToolName } from './schemas';
import { getPlaywrightToolsByScope } from './tools';

/**
 * Playwright tool service implementing IToolService interface.
 */
export class PlaywrightService implements IToolService {
  readonly serviceName = 'playwright';

  private readonly client: PlaywrightClient;
  private readonly scope: ToolScope;

  constructor(config: PlaywrightClientConfig) {
    this.client = new PlaywrightClient(config);
    this.scope = config.scope || 'write';
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getTools(): ToolDefinition[] {
    return getPlaywrightToolsByScope(this.scope);
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    // Validate tool exists
    if (!(toolName in playwrightSchemas)) {
      throw toolNotFoundError(this.serviceName, toolName);
    }

    // Parse and validate args
    const schema = playwrightSchemas[toolName as PlaywrightToolName].schema;
    const parsed = schema.parse(args);

    // Execute tool
    switch (toolName) {
      // Navigation
      case 'playwright_navigate':
        return this.client.navigate(parsed.url, parsed.waitUntil);

      case 'playwright_navigateBack':
        return this.client.navigateBack();

      // Snapshot & Screenshot
      case 'playwright_snapshot':
        return this.client.snapshot(parsed.selector);

      case 'playwright_takeScreenshot':
        return this.client.takeScreenshot(parsed.selector, parsed.filename, parsed.fullPage);

      // Interactions
      case 'playwright_click':
        return this.client.click(parsed.selector, parsed.button, parsed.clickCount, parsed.timeout);

      case 'playwright_type':
        return this.client.type(parsed.selector, parsed.text, parsed.delay, parsed.clear);

      case 'playwright_fillForm':
        return this.client.fillForm(parsed.selector, parsed.value);

      case 'playwright_hover':
        return this.client.hover(parsed.selector, parsed.timeout);

      case 'playwright_selectOption':
        return this.client.selectOption(parsed.selector, parsed.value, parsed.label, parsed.index);

      case 'playwright_pressKey':
        return this.client.pressKey(parsed.key, parsed.selector);

      case 'playwright_drag':
        return this.client.drag(parsed.sourceSelector, parsed.targetSelector);

      case 'playwright_fileUpload':
        return this.client.fileUpload(parsed.selector, parsed.filePath);

      // Dialog handling
      case 'playwright_handleDialog':
        return this.client.handleDialog(parsed.action, parsed.promptText);

      // Browser state
      case 'playwright_tabs':
        return this.client.getTabs();

      case 'playwright_resize':
        return this.client.resize(parsed.width, parsed.height);

      case 'playwright_close':
        return this.client.close();

      // Evaluation & execution
      case 'playwright_evaluate':
        return this.client.evaluate(parsed.script);

      case 'playwright_runCode':
        return this.client.runCode(parsed.code);

      // Wait operations
      case 'playwright_waitFor':
        return this.client.waitFor(parsed.selector, parsed.state, parsed.timeout);

      // Debug & monitoring
      case 'playwright_consoleMessages':
        return this.client.getConsoleMessages(parsed.clear);

      case 'playwright_networkRequests':
        return this.client.getNetworkRequests(parsed.clear);

      default:
        throw toolNotFoundError(this.serviceName, toolName);
    }
  }
}
