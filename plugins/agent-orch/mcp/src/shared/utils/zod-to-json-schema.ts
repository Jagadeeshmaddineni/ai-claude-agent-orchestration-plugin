import { z } from 'zod';

/**
 * Convert Zod schema to JSON Schema for MCP tool definition.
 * Simplified conversion that handles common Zod types.
 */
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodType;
      properties[key] = zodFieldToJsonSchema(zodValue);

      // Check if field is required (not optional)
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

/**
 * Convert a Zod field to JSON Schema property.
 */
function zodFieldToJsonSchema(field: z.ZodType): Record<string, unknown> {
  // Handle optional wrapper
  if (field instanceof z.ZodOptional) {
    return zodFieldToJsonSchema(field._def.innerType);
  }

  // Handle nullable wrapper
  if (field instanceof z.ZodNullable) {
    const inner = zodFieldToJsonSchema(field._def.innerType);
    return { ...inner, nullable: true };
  }

  // Handle described fields
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
    return {
      type: 'object',
      ...(description && { description }),
    };
  }

  if (field instanceof z.ZodObject) {
    return zodToJsonSchema(field);
  }

  if (field instanceof z.ZodUnknown) {
    return { ...(description && { description }) };
  }

  // Fallback
  return { ...(description && { description }) };
}
