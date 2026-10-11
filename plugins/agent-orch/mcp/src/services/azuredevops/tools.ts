import { ToolDefinition, ToolScope, zodToJsonSchema } from '../../shared';
import { azureDevOpsSchemas } from './schemas';

/**
 * Generate MCP tool definitions from Azure DevOps schemas.
 */
export function generateAzureDevOpsTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const [name, def] of Object.entries(azureDevOpsSchemas)) {
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
export function getAzureDevOpsToolsByScope(configScope: ToolScope): ToolDefinition[] {
  const allTools = generateAzureDevOpsTools();

  if (configScope === 'write') {
    return allTools;
  }

  return allTools.filter(tool => tool.scope === 'read');
}

/**
 * Pre-generated tool definitions.
 */
export const azureDevOpsTools = generateAzureDevOpsTools();
