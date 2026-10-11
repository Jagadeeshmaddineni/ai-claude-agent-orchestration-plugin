import { ToolDefinition, ToolScope, zodToJsonSchema } from '../../shared';
import { confluenceSchemas } from './schemas';

/**
 * Generate MCP tool definitions from Confluence schemas.
 */
export function generateConfluenceTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const [name, def] of Object.entries(confluenceSchemas)) {
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
export function getConfluenceToolsByScope(configScope: ToolScope): ToolDefinition[] {
  const allTools = generateConfluenceTools();

  if (configScope === 'write') {
    return allTools;
  }

  return allTools.filter(tool => tool.scope === 'read');
}

/**
 * Pre-generated tool definitions.
 */
export const confluenceTools = generateConfluenceTools();
