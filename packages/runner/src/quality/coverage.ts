import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { globToRegExp, testLevel, type ProjectConfig } from "@lastro/shared";
import { coverageOf, lineRanges, parseLcov, type FileCoverage } from "../lcov";
import type { Finding } from "../sarif";
import { finding, type QualityTarget } from "./target";

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte|py|php|go|rb|java|kt|cs|rs|swift|dart)$/;
const percent = (hit: number, found: number) => (found ? Math.floor((hit / found) * 100) : 100);

/** What is not run, as precisely as the report allows: the function names, or else the lines. */
function notRun(entry: FileCoverage): string {
  const names = entry.functions.filter((f) => f.hits === 0).map((f) => f.name);
  if (names.length) return `not run: ${names.slice(0, 8).join(", ")}${names.length > 8 ? "…" : ""}`;
  return entry.uncoveredLines.length ? `lines not run: ${lineRanges(entry.uncoveredLines)}` : "";
}

/** One touched file against the type's thresholds. */
function fileFindings(file: string, entry: FileCoverage, wanted: { functions?: number; lines?: number }): Finding[] {
  const out: Finding[] = [];
  const fn = percent(entry.functionsHit, entry.functionsFound);
  const ln = percent(entry.linesHit, entry.linesFound);
  const where = notRun(entry);
  if (wanted.functions !== undefined && fn < wanted.functions) out.push(finding("coverage-functions", `${fn}% of the functions run in tests (wanted ${wanted.functions}%)${where ? `; ${where}` : ""}`, file));
  if (wanted.lines !== undefined && ln < wanted.lines) out.push(finding("coverage-lines", `${ln}% of the lines run in tests (wanted ${wanted.lines}%)${where && fn >= (wanted.functions ?? 0) ? `; ${where}` : ""}`, file));
  return out;
}

/** Coverage of the source files the requirement touches, against its type's thresholds. */
export function coverageFindings(config: ProjectConfig, target: QualityTarget, report: FileCoverage[] | null): Finding[] {
  const wanted = config.types[target.type]?.tests.coverage;
  if (!wanted || (wanted.functions === undefined && wanted.lines === undefined)) return [];
  if (!report) return [finding("coverage-report", `no coverage report at ${config.tests.coverage_report ?? "(tests.coverage_report is not set)"}: make the unit command write LCOV there`)];
  const excluded = config.tests.coverage_exclude.map(globToRegExp);
  const sources = target.touches.filter((f) => CODE.test(f) && testLevel(f, config.tests.levels) === null && !excluded.some((re) => re.test(f)));
  if (sources.length === 0 && target.touches.length === 0) return [finding("coverage-touches", `${target.code} has no touched source file recorded, so its coverage cannot be checked`)];
  return sources.flatMap((file) => {
    const entry = coverageOf(report, file);
    return entry ? fileFindings(file, entry, wanted) : [finding("coverage-missing", "no test ran this file", file)];
  });
}

/** The LCOV report the configuration points to, once the commands have run. */
export function readCoverage(cwd: string, config: ProjectConfig): FileCoverage[] | null {
  const path = config.tests.coverage_report;
  if (!path || !existsSync(join(cwd, path))) return null;
  return parseLcov(readFileSync(join(cwd, path), "utf8"));
}
