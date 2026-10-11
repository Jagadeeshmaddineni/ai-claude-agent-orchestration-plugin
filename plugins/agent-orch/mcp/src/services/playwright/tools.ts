import { z } from 'zod';
import { ToolDefinition, ToolScope } from '../../shared';
import { playwrightSchemas } from './schemas';

/**
 * Convert Zod schema to JSON Schema for MCP tool definition.
 */
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodType;
      properties[key] = zodFieldToJsonSchema(zodValue);

      if (!(zodValue instanceof z.ZodOptional) && !(zodValue instanceof z.ZodNullable)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  return { type: 'object', properties: {} };
}

function zodFieldToJsonSchema(field: z.ZodType): Record<string, unknown> {
  if (field instanceof z.ZodOptional) {
    return zodFieldToJsonSchema(field._def.innerType);
  }

  if (field instanceof z.ZodNullable) {
    const inner = zodFieldToJsonSchema(field._def.innerType);
    return { ...inner, nullable: true };
  }

  const description = field.description;

  if (field instanceof z.ZodString) {
    return { type: 'string', ...(description && { description }) };
  }

  if (field instanceof z.ZodNumber) {
    return { type: 'number', ...(description && { description }) };
  }

  if (field instanceof z.ZodBoolean) {
    return { type: 'boolean', ...(description && { description }) };
  }

  if (field instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodFieldToJsonSchema(field._def.type),
      ...(description && { description }),
    };
  }

  if (field instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: field._def.values,
      ...(description && { description }),
    };
  }

  if (field instanceof z.ZodRecord) {
    return { type: 'object', ...(description && { description }) };
  }

  if (field instanceof z.ZodObject) {
    return zodToJsonSchema(field);
  }

  return { ...(description && { description }) };
}

/**
 * Generate MCP tool definitions from Playwright schemas.
 */
export function generatePlaywrightTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const [name, def] of Object.entries(playwrightSchemas)) {
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
export function getPlaywrightToolsByScope(configScope: ToolScope): ToolDefinition[] {
  const allTools = generatePlaywrightTools();

  if (configScope === 'write') {
    return allTools;
  }

  return allTools.filter(tool => tool.scope === 'read');
}

/**
 * Pre-generated tool definitions.
 */
export const playwrightTools = generatePlaywrightTools();
