import { z } from "zod";
import { codeSchema, criterionCodeSchema } from "../codes";

export const citationInputSchema = z.object({
  source: codeSchema("SRC"),
  anchor: z.string().min(1),
  label: z.string().optional(),
  quote: z.string().min(1),
});

export const criterionInputSchema = z.object({
  code: criterionCodeSchema,
  text: z.string().min(1),
  tests: z.array(z.string().min(1)).default([]),
});

export const exampleSchema = z.object({ given: z.string().min(1), expect: z.string().min(1) });

export const requirementFieldsSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1),
  statement: z.string().min(1),
  package: codeSchema("PKG").optional(),
  where: z.string().optional(),
  who: z.object({ sees: z.array(z.string()).optional(), uses: z.array(z.string()).optional(), scope: z.string().optional() }).optional(),
  dataSource: z.string().optional(),
  period: z.string().optional(),
  reach: z.record(z.string(), z.unknown()).optional(),
  whenMissing: z.string().optional(),
  examples: z.array(exampleSchema),
  visualRefs: z.array(z.string()),
  dependsOn: z.array(codeSchema("REQ")),
});

/** Creation fills list fields with empty defaults; updates never do, so they only touch what was sent. */
export const requirementInputSchema = requirementFieldsSchema.extend({
  examples: z.array(exampleSchema).default([]),
  visualRefs: z.array(z.string()).default([]),
  dependsOn: z.array(codeSchema("REQ")).default([]),
  code: codeSchema("REQ").optional(),
  citations: z.array(citationInputSchema).min(1),
  criteria: z.array(criterionInputSchema).min(1),
});
export type RequirementInput = z.input<typeof requirementInputSchema>;
export type RequirementData = z.output<typeof requirementInputSchema>;

export const requirementUpdateSchema = requirementFieldsSchema.partial().extend({
  citations: z.array(citationInputSchema).min(1).optional(),
  criteria: z.array(criterionInputSchema).min(1).optional(),
});
export type RequirementUpdate = z.input<typeof requirementUpdateSchema>;
export type RequirementUpdateData = z.output<typeof requirementUpdateSchema>;
