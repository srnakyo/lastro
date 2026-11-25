import { z } from "zod";
import { LANGUAGES } from "./enums";

/** A QA stage: a command name, or an object with run/check, conditions and manual sign-off. */
export const stageSchema = z.union([
  z.string(),
  z.object({
    run: z.string().optional(),
    check: z.string().optional(),
    conditions: z.array(z.string()).optional(),
    manual: z.boolean().optional(),
    by: z.string().optional(),
    note: z.string().optional(),
  }),
]);
export type Stage = z.infer<typeof stageSchema>;

const commandSchema = z.object({
  run: z.string(),
  env: z.record(z.string(), z.string()).optional(),
  report: z.object({ junit: z.string().optional(), sarif: z.string().optional() }).optional(),
});

const conditionSchema = z.object({
  env: z.record(z.string(), z.string()).optional(),
  setup: z.string().optional(),
  note: z.string().optional(),
});

const typeSchema = z.object({
  required: z.array(z.string()).default([]),
  flow: z.array(stageSchema).default([]),
});

/** The project configuration, the content of lastro.yml. */
export const projectConfigSchema = z.object({
  version: z.literal(1).default(1),
  project: z.string().min(1),
  language: z.enum(LANGUAGES).default("en"),
  approval: z
    .object({ spec: z.array(z.string()).default(["dev"]), require_final_source: z.boolean().default(false) })
    .default({ spec: ["dev"], require_final_source: false }),
  commands: z.record(z.string(), commandSchema).default({}),
  conditions: z.record(z.string(), conditionSchema).default({}),
  types: z.record(z.string(), typeSchema).default({}),
  global_flow: z.array(stageSchema).default([]),
  gate: z
    .object({
      block_agent_stop: z.boolean().default(true),
      stale_on_change: z.boolean().default(true),
      max_stop_blocks: z.number().int().min(1).default(3),
    })
    .default({ block_agent_stop: true, stale_on_change: true, max_stop_blocks: 3 }),
});
export type ProjectConfig = z.output<typeof projectConfigSchema>;
export type ProjectConfigInput = z.input<typeof projectConfigSchema>;
