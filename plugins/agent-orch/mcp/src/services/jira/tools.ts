import { ToolDefinition, ToolScope, zodToJsonSchema } from '../../shared';
import { jiraSchemas } from './schemas';

/**
 * Generate MCP tool definitions from Jira schemas.
 */
export function generateJiraTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const [name, def] of Object.entries(jiraSchemas)) {
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
export function getJiraToolsByScope(configScope: ToolScope): ToolDefinition[] {
  const allTools = generateJiraTools();

  if (configScope === 'write') {
    return allTools; // Write scope gets all tools
  }

  return allTools.filter(tool => tool.scope === 'read');
}

/**
 * Pre-generated tool definitions for performance.
 */
export const jiraTools = generateJiraTools();
