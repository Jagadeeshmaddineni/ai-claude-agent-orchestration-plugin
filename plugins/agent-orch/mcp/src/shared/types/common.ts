/**
 * Tool scope determines whether a tool is read-only or can modify data.
 * Used to filter tools based on service configuration.
 */
export type ToolScope = 'read' | 'write';

/**
 * MCP tool definition as exposed to clients.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  scope: ToolScope;
}

/**
 * Base configuration shared by all services.
 */
export interface BaseServiceConfig {
  enabled: boolean;
  scope: ToolScope;
}

/**
 * HTTP response wrapper with status code.
 */
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
}

/**
 * Standard request options for HTTP clients.
 */
export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}
