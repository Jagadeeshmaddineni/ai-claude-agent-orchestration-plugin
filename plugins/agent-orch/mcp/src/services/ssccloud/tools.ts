import { ToolDefinition, ToolScope, zodToJsonSchema } from '../../shared';
import { sscCloudSchemas } from './schemas';

/**
 * Generate MCP tool definitions from SSC Cloud schemas.
 */
export function generateSscCloudTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const [name, def] of Object.entries(sscCloudSchemas)) {
    tools.push({
      name,
      description: def.description,
      inputSchema: zodToJsonSchema(def.schema),
      scope: def.scope,
    });
  }

  return tools;
}

/**
 * Get tools filtered by scope.
 * Since all SSC Cloud tools are read-only, this returns all tools regardless of scope.
 */
export function getSscCloudToolsByScope(configScope: ToolScope): ToolDefinition[] {
  // All SSC Cloud tools are read-only, so we always return everything
  return generateSscCloudTools();
}

/**
 * Pre-generated tool definitions for performance.
 */
export const sscCloudTools = generateSscCloudTools();
