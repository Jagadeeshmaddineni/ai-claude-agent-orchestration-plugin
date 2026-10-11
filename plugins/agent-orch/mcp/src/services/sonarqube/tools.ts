import { ToolDefinition, ToolScope, zodToJsonSchema } from '../../shared';
import { sonarqubeSchemas } from './schemas';

/**
 * Generate MCP tool definitions from SonarQube schemas.
 */
export function generateSonarQubeTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const [name, def] of Object.entries(sonarqubeSchemas)) {
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
export function getSonarQubeToolsByScope(configScope: ToolScope): ToolDefinition[] {
  const allTools = generateSonarQubeTools();

  if (configScope === 'write') {
    return allTools; // Write scope gets all tools
  }

  return allTools.filter(tool => tool.scope === 'read');
}

/**
 * Pre-generated tool definitions for performance.
 */
export const sonarqubeTools = generateSonarQubeTools();
