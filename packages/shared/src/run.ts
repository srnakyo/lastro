import { z } from "zod";

const testResultSchema = z.object({
  ref: z.string(),
  file: z.string(),
  name: z.string(),
  status: z.enum(["passed", "failed", "skipped", "error"]),
  durationMs: z.number().int().nonnegative(),
  message: z.string().nullable(),
});

const findingSchema = z.object({
  tool: z.string(),
  ruleId: z.string().nullable(),
  level: z.enum(["error", "warning", "note"]),
  file: z.string().nullable(),
  line: z.number().int().nullable(),
  message: z.string(),
});

/** What `lastro verify` sends after running the stages on a machine or in CI. */
export const runReportSchema = z.object({
  trigger: z.enum(["dev", "agent", "ci"]),
  commit: z.string().nullable(),
  branch: z.string().nullable(),
  dirty: z.boolean(),
  environment: z.record(z.string(), z.string()),
  startedAt: z.coerce.date(),
  durationMs: z.number().int().nonnegative(),
  stages: z.array(
    z.object({
      requirement: z.string().nullable(),
      stage: z.string(),
      condition: z.string().nullable(),
      command: z.string().nullable(),
      exitCode: z.number().int().nullable(),
      status: z.enum(["passed", "failed", "error"]),
      durationMs: z.number().int().nonnegative(),
      output: z.string(),
      results: z.array(testResultSchema),
      findings: z.array(findingSchema),
    }),
  ),
  /** Fingerprint of the files each requirement touches, at the time of the run. */
  trees: z.record(z.string(), z.string()),
  /** SHA-256 of each test file linked to a criterion, so a locked test cannot change unnoticed. */
  testFiles: z.record(z.string(), z.string()).default({}),
});

export type RunReportInput = z.input<typeof runReportSchema>;
export type RunReportData = z.output<typeof runReportSchema>;

export const manualCheckSchema = z.object({
  stage: z.string().min(1),
  condition: z.string().nullable().default(null),
  status: z.enum(["passed", "failed"]),
  reference: z.string().min(1),
});
export type ManualCheckInput = z.input<typeof manualCheckSchema>;
