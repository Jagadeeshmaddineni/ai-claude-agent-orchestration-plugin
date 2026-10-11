// Interfaces
export type { IToolService } from './interfaces/tool-service';
export type { IHttpClient } from './interfaces/http-client';

// Types
export type {
  ToolScope,
  ToolDefinition,
  BaseServiceConfig,
  HttpResponse,
  HttpRequestOptions,
} from './types/common';

// Errors
export {
  MCPError,
  extractApiMessage,
  handleApiError,
  notConfiguredError,
  toolNotFoundError,
} from './errors/mcp-error';
export type { MCPErrorCode } from './errors/mcp-error';

// HTTP
export { BaseHttpClient } from './http/base-client';
export type { HttpClientConfig } from './http/base-client';

// Utilities
export { zodToJsonSchema } from './utils';

// Logger
export { initLogger, getLogger, isEnabled, truncate } from './logger';
