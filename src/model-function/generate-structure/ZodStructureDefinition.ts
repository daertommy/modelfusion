import { z } from "zod";
import { StructureDefinition } from "../../core/structure/StructureDefinition.js";
import { Schema } from "../../core/structure/Schema.js";
import { ZodSchema } from "./ZodSchema.js";

export class ZodStructureDefinition<NAME extends string, STRUCTURE>
  implements StructureDefinition<NAME, STRUCTURE>
{
  name: NAME;
  description?: string;
  schema: Schema<STRUCTURE>;

  constructor({
    name,
    description,
    schema,
  }: {
    name: NAME;
    description?: string;
    schema: z.Schema<STRUCTURE>;
  }) {
    this.name = name;
    this.description = description;
    this.schema = new ZodSchema(schema);
  }
}
