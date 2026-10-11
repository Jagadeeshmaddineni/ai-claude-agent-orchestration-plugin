/**
 * Structured error codes for MCP operations.
 */
export type MCPErrorCode =
  | 'NOT_CONFIGURED'
  | 'AUTH_FAILED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_REQUEST'
  | 'ORG_NOT_FOUND'
  | 'TOOL_NOT_FOUND'
  | 'API_ERROR';

/**
 * Structured error for MCP operations with actionable hints.
 */
export class MCPError extends Error {
  readonly code: MCPErrorCode;
  readonly hint?: string;
  readonly service: string;
  readonly statusCode?: number;

  constructor(
    service: string,
    code: MCPErrorCode,
    message: string,
    hint?: string,
    statusCode?: number
  ) {
    const fullMessage = hint
      ? `[${service}] ${message} | Hint: ${hint}`
      : `[${service}] ${message}`;
    super(fullMessage);
    this.name = 'MCPError';
    this.service = service;
    this.code = code;
    this.hint = hint;
    this.statusCode = statusCode;
  }

  /**
   * Convert to JSON-serializable object for MCP responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      error: true,
      code: this.code,
      service: this.service,
      message: this.message,
      hint: this.hint,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Extract error message from API response body.
 * Handles various JSON error formats from different APIs.
 */
export function extractApiMessage(body: string): string {
  try {
    const json = JSON.parse(body);
    // Jira/Confluence format
    if (json.errorMessages?.length) return json.errorMessages[0];
    // Common formats
    if (json.message) return json.message;
    if (json.error?.message) return json.error.message;
    if (json.error && typeof json.error === 'string') return json.error;
    // Azure DevOps format
    if (json.Message) return json.Message;
    // TestRail format
    if (json.error) return json.error;
    // Fallback to stringified JSON if it's short
    if (body.length < 200) return body;
    return 'Unknown error';
  } catch {
    // Not JSON, return raw text (truncated if too long)
    return body.length > 200 ? body.substring(0, 200) + '...' : body;
  }
}

/**
 * Handle HTTP response errors with structured error codes.
 */
export async function handleApiError(
  service: string,
  response: Response,
  context?: string
): Promise<never> {
  const errorBody = await response.text();
  const apiMessage = extractApiMessage(errorBody);
  const status = response.status;
  const contextStr = context ? ` (${context})` : '';

  switch (status) {
    case 401:
    case 403:
      throw new MCPError(
        service,
        'AUTH_FAILED',
        `Authentication failed${contextStr}: ${apiMessage}`,
        `Check your token in ~/.claude/mcp-config.json`,
        status
      );
    case 404:
      throw new MCPError(
        service,
        'NOT_FOUND',
        `Not found${contextStr}: ${apiMessage}`,
        undefined,
        status
      );
    case 429:
      throw new MCPError(
        service,
        'RATE_LIMITED',
        `Rate limit exceeded${contextStr}: ${apiMessage}`,
        'Wait a few minutes and retry',
        status
      );
    case 400:
      throw new MCPError(
        service,
        'INVALID_REQUEST',
        `Bad request${contextStr}: ${apiMessage}`,
        undefined,
        status
      );
    default:
      if (status >= 500) {
        throw new MCPError(
          service,
          'SERVER_ERROR',
          `Server error (${status})${contextStr}: ${apiMessage}`,
          'This is an issue with the external service, retry later',
          status
        );
      }
      throw new MCPError(
        service,
        'API_ERROR',
        `API error (${status})${contextStr}: ${apiMessage}`,
        undefined,
        status
      );
  }
}

/**
 * Create a "not configured" error for a service.
 */
export function notConfiguredError(service: string, configFields: string[]): MCPError {
  return new MCPError(
    service,
    'NOT_CONFIGURED',
    `${service} is not configured or disabled`,
    `Enable ${service} and set ${configFields.join(', ')} in ~/.claude/mcp-config.json`
  );
}

/**
 * Create a "tool not found" error.
 */
export function toolNotFoundError(service: string, toolName: string): MCPError {
  return new MCPError(
    service,
    'TOOL_NOT_FOUND',
    `Unknown tool: ${toolName}`,
    `Check available tools with tools/list`
  );
}
