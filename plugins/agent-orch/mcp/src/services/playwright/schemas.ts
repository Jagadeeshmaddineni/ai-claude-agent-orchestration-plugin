import { z } from 'zod';
import { ToolScope } from '../../shared';

export interface SchemaDefinition {
  schema: z.ZodType;
  description: string;
  scope: ToolScope;
}

export const playwrightSchemas = {
  // Navigation
  playwright_navigate: {
    schema: z.object({
      url: z.string().describe('URL to navigate to'),
      waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional()
        .describe('When to consider navigation complete'),
    }),
    description: 'Navigate browser to a URL',
    scope: 'write' as ToolScope,
  },

  playwright_navigateBack: {
    schema: z.object({}),
    description: 'Navigate browser back in history',
    scope: 'write' as ToolScope,
  },

  // Snapshot & Screenshot
  playwright_snapshot: {
    schema: z.object({
      selector: z.string().optional().describe('CSS selector to snapshot (default: full page)'),
    }),
    description: 'Get accessibility snapshot of the current page or element',
    scope: 'read' as ToolScope,
  },

  playwright_takeScreenshot: {
    schema: z.object({
      selector: z.string().optional().describe('CSS selector to screenshot (default: full page)'),
      filename: z.string().optional().describe('Filename for the screenshot'),
      fullPage: z.boolean().optional().describe('Capture full scrollable page'),
    }),
    description: 'Take a screenshot of the current page or element',
    scope: 'read' as ToolScope,
  },

  // Interaction
  playwright_click: {
    schema: z.object({
      selector: z.string().describe('CSS selector of element to click'),
      button: z.enum(['left', 'right', 'middle']).optional().describe('Mouse button to use'),
      clickCount: z.number().optional().describe('Number of clicks (default: 1)'),
      timeout: z.number().optional().describe('Timeout in milliseconds'),
    }),
    description: 'Click on an element',
    scope: 'write' as ToolScope,
  },

  playwright_type: {
    schema: z.object({
      selector: z.string().describe('CSS selector of element to type into'),
      text: z.string().describe('Text to type'),
      delay: z.number().optional().describe('Delay between key presses in ms'),
      clear: z.boolean().optional().describe('Clear existing text before typing'),
    }),
    description: 'Type text into an element',
    scope: 'write' as ToolScope,
  },

  playwright_fillForm: {
    schema: z.object({
      selector: z.string().describe('CSS selector of form element'),
      value: z.string().describe('Value to fill'),
    }),
    description: 'Fill a form field with a value (clears existing content)',
    scope: 'write' as ToolScope,
  },

  playwright_hover: {
    schema: z.object({
      selector: z.string().describe('CSS selector of element to hover'),
      timeout: z.number().optional().describe('Timeout in milliseconds'),
    }),
    description: 'Hover over an element',
    scope: 'write' as ToolScope,
  },

  playwright_selectOption: {
    schema: z.object({
      selector: z.string().describe('CSS selector of select element'),
      value: z.string().optional().describe('Value to select'),
      label: z.string().optional().describe('Label text to select'),
      index: z.number().optional().describe('Index to select'),
    }),
    description: 'Select an option from a dropdown',
    scope: 'write' as ToolScope,
  },

  playwright_pressKey: {
    schema: z.object({
      key: z.string().describe('Key to press (e.g., "Enter", "Tab", "Escape")'),
      selector: z.string().optional().describe('CSS selector to focus before pressing'),
    }),
    description: 'Press a keyboard key',
    scope: 'write' as ToolScope,
  },

  playwright_drag: {
    schema: z.object({
      sourceSelector: z.string().describe('CSS selector of element to drag'),
      targetSelector: z.string().describe('CSS selector of drop target'),
    }),
    description: 'Drag an element to another element',
    scope: 'write' as ToolScope,
  },

  playwright_fileUpload: {
    schema: z.object({
      selector: z.string().describe('CSS selector of file input'),
      filePath: z.string().describe('Path to file to upload'),
    }),
    description: 'Upload a file to a file input',
    scope: 'write' as ToolScope,
  },

  // Dialog handling
  playwright_handleDialog: {
    schema: z.object({
      action: z.enum(['accept', 'dismiss']).describe('How to handle the dialog'),
      promptText: z.string().optional().describe('Text to enter for prompt dialogs'),
    }),
    description: 'Handle browser dialogs (alert, confirm, prompt)',
    scope: 'write' as ToolScope,
  },

  // Browser state
  playwright_tabs: {
    schema: z.object({}),
    description: 'List all open browser tabs',
    scope: 'read' as ToolScope,
  },

  playwright_resize: {
    schema: z.object({
      width: z.number().describe('New viewport width'),
      height: z.number().describe('New viewport height'),
    }),
    description: 'Resize browser viewport',
    scope: 'write' as ToolScope,
  },

  playwright_close: {
    schema: z.object({}),
    description: 'Close the browser',
    scope: 'write' as ToolScope,
  },

  // Evaluation & execution
  playwright_evaluate: {
    schema: z.object({
      script: z.string().describe('JavaScript code to execute in browser context'),
    }),
    description: 'Execute JavaScript in the browser context',
    scope: 'write' as ToolScope,
  },

  playwright_runCode: {
    schema: z.object({
      code: z.string().describe('Playwright code to execute'),
    }),
    description: 'Run Playwright code directly',
    scope: 'write' as ToolScope,
  },

  // Wait operations
  playwright_waitFor: {
    schema: z.object({
      selector: z.string().optional().describe('CSS selector to wait for'),
      state: z.enum(['attached', 'detached', 'visible', 'hidden']).optional()
        .describe('State to wait for'),
      timeout: z.number().optional().describe('Timeout in milliseconds'),
    }),
    description: 'Wait for an element or condition',
    scope: 'read' as ToolScope,
  },

  // Debug & monitoring
  playwright_consoleMessages: {
    schema: z.object({
      clear: z.boolean().optional().describe('Clear messages after retrieving'),
    }),
    description: 'Get browser console messages',
    scope: 'read' as ToolScope,
  },

  playwright_networkRequests: {
    schema: z.object({
      clear: z.boolean().optional().describe('Clear requests after retrieving'),
    }),
    description: 'Get captured network requests',
    scope: 'read' as ToolScope,
  },
} as const;

export type PlaywrightToolName = keyof typeof playwrightSchemas;
