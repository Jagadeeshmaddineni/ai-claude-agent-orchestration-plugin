import { ToolRegistry } from './tool-registry';
import { ServiceType } from './sse-session';
import { getLogger, isEnabled, truncate } from '../shared/logger';

/**
 * MCP Protocol constants.
 */
const MCP_PROTOCOL_VERSION = '2024-11-05';
const SERVER_VERSION = '0.2.0';

/**
 * JSON-RPC response helper.
 */
function jsonRpcResponse(id: string | number | null, result: unknown): string {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

/**
 * JSON-RPC error response helper.
 */
function jsonRpcError(id: string | number | null, code: number, message: string): string {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

/**
 * MCP JSON-RPC error codes.
 */
export const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

/**
 * MCP message handler.
 * Processes JSON-RPC messages according to MCP protocol.
 */
export class MCPHandler {
  private readonly registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  /**
   * Handle an incoming MCP message.
   * Returns empty string for notifications that don't require a response.
   */
  async handleMessage(
    method: string,
    params: unknown,
    id: string | number | null,
    serviceType: ServiceType
  ): Promise<string> {
    switch (method) {
      case 'initialize':
        return this.handleInitialize(id, serviceType);

      case 'notifications/initialized':
        // Client acknowledges initialization - no response needed
        return '';

      case 'tools/list':
        return this.handleToolsList(id, serviceType);

      case 'tools/call':
        return this.handleToolsCall(id, params, serviceType);

      case 'resources/list':
        return jsonRpcResponse(id, { resources: [] });

      case 'prompts/list':
        return jsonRpcResponse(id, { prompts: [] });

      default:
        return jsonRpcError(id, MCPErrorCodes.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  }

  /**
   * Handle initialize request.
   */
  private handleInitialize(id: string | number | null, serviceType: ServiceType): string {
    return jsonRpcResponse(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: `agent-orch-mcp-${serviceType}`,
        version: SERVER_VERSION,
      },
    });
  }

  /**
   * Handle tools/list request.
   */
  private handleToolsList(id: string | number | null, serviceType: ServiceType): string {
    const tools = this.registry.getTools(serviceType);

    // Convert to MCP tool format (remove scope, keep name/description/inputSchema)
    const mcpTools = tools.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    }));

    return jsonRpcResponse(id, { tools: mcpTools });
  }

  /**
   * Handle tools/call request.
   */
  private async handleToolsCall(
    id: string | number | null,
    params: unknown,
    serviceType: ServiceType
  ): Promise<string> {
    const { name, arguments: args } = params as {
      name: string;
      arguments: Record<string, unknown>;
    };

    const logging = isEnabled();
    const start = Date.now();
    if (logging) getLogger().info({ tool: name, service: serviceType, input: args }, 'tool_call_start');

    try {
      const result = await this.registry.executeTool(serviceType, name, args || {});

      if (logging) {
        const durationMs = Date.now() - start;
        getLogger().info(
          { tool: name, service: serviceType, durationMs, output: truncate(result) },
          'tool_call_success'
        );
      }

      const text = result === undefined || result === null
        ? 'Success'
        : JSON.stringify(result, null, 2);

      return jsonRpcResponse(id, {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (logging) {
        const durationMs = Date.now() - start;
        getLogger().error(
          { tool: name, service: serviceType, durationMs, error: message },
          'tool_call_error'
        );
      }

      return jsonRpcResponse(id, {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      });
    }
  }
}
