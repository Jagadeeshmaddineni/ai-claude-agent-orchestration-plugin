import { ToolDefinition, ToolScope, zodToJsonSchema } from '../../shared';
import { servicenowSchemas } from './schemas';

/**
 * Generate MCP tool definitions from ServiceNow schemas.
 */
export function generateServiceNowTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const [name, def] of Object.entries(servicenowSchemas)) {
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
 * Filter ServiceNow tools by configured scope.
 *
 * v1 only ships read tools, but the filter still runs so that future write
 * tools can be added without changing this function.
 */
export function getServiceNowToolsByScope(configScope: ToolScope): ToolDefinition[] {
  const allTools = generateServiceNowTools();

  if (configScope === 'write') {
    return allTools;
  }

  return allTools.filter((tool) => tool.scope === 'read');
}

export const servicenowTools = generateServiceNowTools();
