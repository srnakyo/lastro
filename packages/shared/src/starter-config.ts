import { projectConfigSchema, type ProjectConfig } from "./config";

/**
 * How every new project starts, whether a person creates it in the dashboard or `lastro init` does: automatic,
 * and strict about tests: written before the code, at the levels each type asks (an interface needs a
 * Playwright test), using the requester's numbers, running every routine touched.
 */
export function starterProjectConfig(key: string): ProjectConfig {
  return projectConfigSchema.parse({
    version: 1,
    project: key,
    language: "en",
    autonomy: "auto",
    tests: { red_first: true, examples_in_tests: true, coverage_report: "coverage/lcov.info" },
    approval: { spec: ["dev"], require_final_source: true },
    commands: {},
    conditions: {},
    types: {
      behavior: { required: ["where"], flow: [], tests: { levels: ["unit", "integration"], coverage: { functions: 100, lines: 90 } } },
      calculation: { required: ["examples"], flow: [], tests: { levels: ["unit"], coverage: { functions: 100, lines: 100 } } },
      // Screens are proven on screen, in every condition: unit coverage does not measure them.
      ui: { required: ["where"], flow: [], tests: { levels: ["unit", "e2e"] } },
    },
    global_flow: [],
    server: { project: key },
  });
}
