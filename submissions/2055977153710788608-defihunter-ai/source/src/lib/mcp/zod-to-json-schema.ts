import { z } from "zod";

/**
 * Minimal Zod → JSON Schema converter for MCP tool registration.
 */
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodFieldToJson(value as z.ZodType);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  return { type: "object", properties: {} };
}

function zodFieldToJson(field: z.ZodType): Record<string, unknown> {
  if (field instanceof z.ZodOptional || field instanceof z.ZodDefault) {
    return zodFieldToJson(field._def.innerType as z.ZodType);
  }
  if (field instanceof z.ZodNumber) return { type: "number" };
  if (field instanceof z.ZodString) return { type: "string" };
  if (field instanceof z.ZodBoolean) return { type: "boolean" };
  if (field instanceof z.ZodArray) return { type: "array", items: zodFieldToJson(field.element) };
  if (field instanceof z.ZodEnum) return { type: "string", enum: field.options };
  return { type: "string" };
}
