import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { TEST_QUALITY_STAGE, testLevel, type ProjectConfig } from "@lastro/shared";
import { coverageOf, parseLcov, type FileCoverage } from "./lcov";
import type { Finding } from "./sarif";

export interface QualityTarget {
  code: string;
  type: string;
  touches: string[];
  testFiles?: string[];
  examples?: { given: string; expect: string }[];
}

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte|py|php|go|rb|java|kt|cs|rs|swift|dart)$/;
const finding = (ruleId: string, message: string, file: string | null = null): Finding => ({ tool: "lastro", ruleId, level: "error", file, line: null, message });

/** The numbers an example states ("R$ 301 to Recife" → 301): what its test has to use. */
export function exampleNumbers(example: { given: string; expect: string }): string[] {
  return [...new Set(`${example.given} ${example.expect}`.match(/\d+(?:[.,]\d+)?/g) ?? [])];
}

/** Whether a number appears in a test file on its own, also with the other decimal mark (1,5 and 1.5). */
function hasNumber(text: string, n: string): boolean {
  const forms = new Set([n, n.replace(",", "."), n.replace(".", ","), n.replace(/[.,]/g, "")]);
  return [...forms].some((f) => new RegExp(`(?<![\\d.,])${f.replace(/[.]/g, "\\.")}(?![\\d])`).test(text));
}

/** Every requester example with numbers must have them in one of the requirement's test files. */
export function examplesFindings(cwd: string, target: QualityTarget): Finding[] {
  const files = target.testFiles ?? [];
  const texts = files.map((f) => (existsSync(join(cwd, f)) ? readFileSync(join(cwd, f), "utf8") : ""));
  const out: Finding[] = [];
  for (const example of target.examples ?? []) {
    const missing = exampleNumbers(example).filter((n) => !texts.some((t) => hasNumber(t, n)));
    if (missing.length) out.push(finding("examples-in-tests", `the example "${example.given} → ${example.expect}" uses ${missing.join(", ")}, which no test of ${target.code} uses`));
  }
  return out;
}

/** Coverage of the source files the requirement touches, against its type's thresholds. */
export function coverageFindings(config: ProjectConfig, target: QualityTarget, report: FileCoverage[] | null): Finding[] {
  const wanted = config.types[target.type]?.tests.coverage;
  if (!wanted || (wanted.functions === undefined && wanted.lines === undefined)) return [];
  if (!report) return [finding("coverage-report", `no coverage report at ${config.tests.coverage_report ?? "(tests.coverage_report is not set)"}: make the unit command write LCOV there`)];
  const sources = target.touches.filter((f) => CODE.test(f) && testLevel(f, config.tests.levels) === null);
  if (sources.length === 0) return [finding("coverage-touches", `${target.code} has no touched source file recorded, so its coverage cannot be checked`)];
  const out: Finding[] = [];
  for (const file of sources) {
    const entry = coverageOf(report, file);
    if (!entry) {
      out.push(finding("coverage-missing", "no test ran this file", file));
      continue;
    }
    const uncovered = entry.functions.filter((f) => f.hits === 0);
    const fnPct = entry.functions.length ? Math.round(((entry.functions.length - uncovered.length) / entry.functions.length) * 100) : 100;
    const linePct = entry.linesFound ? Math.round((entry.linesHit / entry.linesFound) * 100) : 100;
    if (wanted.functions !== undefined && fnPct < wanted.functions) {
      const names = uncovered.slice(0, 8).map((f) => f.name).join(", ");
      out.push(finding("coverage-functions", `${fnPct}% of the functions run in tests (wanted ${wanted.functions}%); not run: ${names}${uncovered.length > 8 ? "…" : ""}`, file));
    }
    if (wanted.lines !== undefined && linePct < wanted.lines) out.push(finding("coverage-lines", `${linePct}% of the lines run in tests (wanted ${wanted.lines}%)`, file));
  }
  return out;
}

/** The LCOV report the configuration points to, once the commands have run. */
export function readCoverage(cwd: string, config: ProjectConfig): FileCoverage[] | null {
  const path = config.tests.coverage_report;
  if (!path || !existsSync(join(cwd, path))) return null;
  return parseLcov(readFileSync(join(cwd, path), "utf8"));
}

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
