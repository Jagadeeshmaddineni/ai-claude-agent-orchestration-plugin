import { ToolDefinition, ToolScope, zodToJsonSchema } from '../../shared';
import { testrailSchemas } from './schemas';

/**
 * Generate MCP tool definitions from TestRail schemas.
 */
export function generateTestRailTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const [name, def] of Object.entries(testrailSchemas)) {
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
 */
export function getTestRailToolsByScope(configScope: ToolScope): ToolDefinition[] {
  const allTools = generateTestRailTools();

  if (configScope === 'write') {
    return allTools;
  }

  return allTools.filter(tool => tool.scope === 'read');
}

/**
 * Pre-generated tool definitions.
 */
export const testrailTools = generateTestRailTools();
