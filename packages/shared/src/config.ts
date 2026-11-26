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
  report: z
    .object({
      junit: z.string().optional(),
      sarif: z.string().optional(),
      /** Prepended to the file of each JUnit test case, when the tool reports it relative to its own folder (Playwright: "tests/e2e/"). */
      junit_prefix: z.string().optional(),
    })
    .optional(),
});

const conditionSchema = z.object({
  env: z.record(z.string(), z.string()).optional(),
  setup: z.string().optional(),
  note: z.string().optional(),
});

const coverageSchema = z.object({
  /** Share of the functions (the routines) of the files a requirement touches that its tests run, 0 to 100. */
  functions: z.number().min(0).max(100).optional(),
  /** Share of their lines, 0 to 100. */
  lines: z.number().min(0).max(100).optional(),
});

const typeSchema = z.object({
  required: z.array(z.string()).default([]),
  flow: z.array(stageSchema).default([]),
  /** What the tests of this type must be: the levels they cover (names from tests.levels) and the coverage of the touched files. */
  tests: z.object({ levels: z.array(z.string()).default([]), coverage: coverageSchema.optional() }).default({ levels: [] }),
});

/** Test levels by the path of the test file; the first level whose pattern matches wins. */
export const DEFAULT_TEST_LEVELS: Record<string, string[]> = {
  e2e: ["tests/e2e/**", "e2e/**", "**/*.spec.*"],
  integration: ["tests/integration/**", "**/*.integration.*"],
  unit: ["tests/unit/**", "**/*.test.*", "**/__tests__/**"],
};

const testsSchema = z.object({
  levels: z.record(z.string(), z.array(z.string())).default(DEFAULT_TEST_LEVELS),
  /** A linked test must be seen failing on a Lastro run before it passes: written before the code. */
  red_first: z.boolean().default(false),
  /** Every requester example with a number must have that number in one of its requirement's test files. */
  examples_in_tests: z.boolean().default(false),
  /** Where the unit or integration command writes its LCOV report, read for the coverage of the touched files. */
  coverage_report: z.string().optional(),
});

/** The project configuration, the content of lastro.yml. */
export const projectConfigSchema = z.object({
  version: z.literal(1).default(1),
  project: z.string().min(1),
  language: z.enum(LANGUAGES).default("en"),
  /**
   * auto: Lastro approves and locks a requirement by itself once its spec is complete and its criteria have
   * their tests, and the latest version of a source counts. review: a person approves each one.
   */
  autonomy: z.enum(["auto", "review"]).default("auto"),
  tests: testsSchema.default({ levels: DEFAULT_TEST_LEVELS, red_first: false, examples_in_tests: false }),
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
      /** Whether CI must run the gate: required (a failing gate fails the job), optional, or off. */
      ci: z.enum(["required", "optional", "off"]).default("required"),
      /** Who may skip the terminal confirmation of a human command with --yes: e-mails of people. */
      human_identities: z.array(z.string()).default([]),
    })
    .default({ block_agent_stop: true, stale_on_change: true, max_stop_blocks: 3, ci: "required", human_identities: [] }),
  /** Where the CLI finds the server: names of environment variables, never the values, and the linked project. */
  server: z
    .object({
      project: z.string().optional(),
      url_env: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "the name of an environment variable, like LASTRO_URL").optional(),
      token_env: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "the name of an environment variable, like LASTRO_TOKEN").optional(),
    })
    .optional(),
});
export type ProjectConfig = z.output<typeof projectConfigSchema>;
export type ProjectConfigInput = z.input<typeof projectConfigSchema>;
