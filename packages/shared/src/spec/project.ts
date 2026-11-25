import { z } from "zod";
import { codeSchema, invariantCodeSchema, projectKeySchema } from "../codes";
import { projectConfigSchema } from "../config";

export const projectInputSchema = z.object({
  key: projectKeySchema,
  name: z.string().min(1),
  description: z.string().optional(),
  repositoryUrl: z.string().url().optional(),
  config: projectConfigSchema,
});
export type ProjectInput = z.input<typeof projectInputSchema>;
export type ProjectData = z.output<typeof projectInputSchema>;

export const packageInputSchema = z.object({
  code: codeSchema("PKG").optional(),
  title: z.string().min(1),
  sources: z.array(codeSchema("SRC")).default([]),
  report: z.boolean().default(true),
});
export type PackageInput = z.input<typeof packageInputSchema>;
export type PackageData = z.output<typeof packageInputSchema>;

export const glossaryTermInputSchema = z.object({ term: z.string().min(1), means: z.string().min(1), note: z.string().optional() });
export const invariantInputSchema = z.object({
  code: invariantCodeSchema.optional(),
  text: z.string().min(1),
  testRefs: z.array(z.string()).default([]),
});
export const designContractInputSchema = z.object({
  components: z.record(z.string(), z.string()).default({}),
  forbidden: z.array(z.string()).default([]),
  palette: z.record(z.string(), z.string()).default({}),
  referenceScreens: z.array(z.string()).default([]),
});
