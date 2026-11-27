import { TEST_QUALITY_STAGE, type ProjectConfig } from "@lastro/shared";
import type { FileCoverage } from "./lcov";
import { coverageFindings } from "./quality/coverage";
import { examplesFindings } from "./quality/examples";
import type { QualityTarget } from "./quality/target";

export { coverageFindings, readCoverage } from "./quality/coverage";
export { exampleNumbers, examplesFindings, hasNumber } from "./quality/examples";
export type { QualityTarget } from "./quality/target";

/** The test-quality stage of one requirement: the examples in its tests and the coverage of what it touches. */
export function qualityStage(cwd: string, config: ProjectConfig, target: QualityTarget, report: FileCoverage[] | null) {
  const started = Date.now();
  const findings = [...(config.tests.examples_in_tests ? examplesFindings(cwd, target) : []), ...coverageFindings(config, target, report)];
  return {
    stage: TEST_QUALITY_STAGE,
    condition: null,
    command: null,
    exitCode: null,
    status: findings.length ? ("failed" as const) : ("passed" as const),
    durationMs: Date.now() - started,
    output: findings.length ? findings.map((f) => `${f.file ? `${f.file}: ` : ""}${f.message}`).join("\n") : "examples and coverage as the type asks",
    env: {},
    results: [],
    findings,
  };
}
