import { ToolDefinition } from '../types/common';

/**
 * Interface for all tool services (Jira, Confluence, TestRail, Azure DevOps).
 * Each service must implement this interface to be registered with the MCP server.
 */
export interface IToolService {
  /**
   * Unique identifier for this service (e.g., 'jira', 'confluence').
   */
  readonly serviceName: string;

  /**
   * Check if the service is properly configured with required credentials.
   */
  isConfigured(): boolean;

  /**
   * Get all tools provided by this service.
   * Tools are tagged with their scope for filtering.
   */
  getTools(): ToolDefinition[];

  /**
   * Execute a tool by name with the provided arguments.
   *
   * @param toolName - The full tool name (e.g., 'jira_getIssue')
   * @param args - Validated arguments for the tool
   * @returns Tool execution result
   * @throws MCPError if tool not found or execution fails
   */
  executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown>;
}
