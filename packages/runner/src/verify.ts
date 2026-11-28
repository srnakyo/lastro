import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { needsTestQuality, type ProjectConfig } from "@lastro/shared";
import { runCommand } from "./exec";
import { commitInfo, fileHashes, fileLines, treeHash } from "./git";
import { mergeResults, parseJunit, type TestCaseResult } from "./junit";
import { planStages } from "./plan";
import { qualityStage, readCoverage } from "./quality";
import { fillCommand, selectionFor, selects } from "./selection";
import { testBlocks } from "./test-blocks";
import { parseSarif, type Finding } from "./sarif";

export interface RequirementToVerify {
  code: string;
  type: string;
  touches: string[];
  /** Files of the tests linked to its criteria. */
  testFiles?: string[];
  /** The tests linked to its criteria ("file::test name"): a shared suite is judged for it by these. */
  tests?: string[];
  /** The requester's examples, checked against the test files when the project asks. */
  examples?: { given: string; expect: string }[];
}

export interface StageRun {
  requirement: string | null;
  stage: string;
  condition: string | null;
  command: string | null;
  exitCode: number | null;
  status: "passed" | "failed" | "error";
  durationMs: number;
  output: string;
  /** The environment the condition added. */
  env: Record<string, string>;
  results: TestCaseResult[];
  findings: Finding[];
}

export interface RunReport {
  trigger: "dev" | "agent" | "ci";
  commit: string | null;
  branch: string | null;
  dirty: boolean;
  environment: Record<string, string>;
  startedAt: string;
  durationMs: number;
  stages: StageRun[];
  trees: Record<string, string>;
  testFiles: Record<string, string>;
  /** Line fingerprints of the test files: a sealed file that only grew keeps its seal. */
  testFileLines: Record<string, string[]>;
  /** Line fingerprints of each linked test's own block: its seal covers that test, not the whole file. */
  testBlocks: Record<string, string[]>;
}

function readReport(cwd: string, path: string | undefined, parse: (text: string) => unknown[]): unknown[] {
  if (!path) return [];
  const file = join(cwd, path);
  if (!existsSync(file)) return [];
  const items = parse(readFileSync(file, "utf8"));
  return items;
}

/** A stage with nothing to run for these requirements: its command selects tests and none of theirs is at its level. */
const nothingToRun = (name: string, condition: string | null, env: Record<string, string>): Omit<StageRun, "requirement"> => ({
  stage: name, condition, command: null, exitCode: null, status: "passed", durationMs: 0, output: "no linked test for this stage: not run", results: [], findings: [], env,
});

/** Runs one stage, once, for the linked tests of the requirements that need it (when its command selects tests). */
async function runStage(cwd: string, config: ProjectConfig, name: string, condition: string | null, tests: string[]): Promise<Omit<StageRun, "requirement">> {
  const command = config.commands[name];
  const cond = condition ? config.conditions[condition] : undefined;
  const conditionEnv = cond?.env ?? {};
  if (!command) return { stage: name, condition, command: null, exitCode: null, status: "error", durationMs: 0, output: `no command named ${name} in lastro.yml`, results: [], findings: [], env: conditionEnv };
  const selection = selects(command) ? selectionFor(command, config.tests.levels, tests) : null;
  if (selection && selection.files.length === 0) return nothingToRun(name, condition, conditionEnv);
  const line = selection ? fillCommand(command.run, selection) : command.run;
  const where = command.dir ? join(cwd, command.dir) : cwd;
  const env = { ...(command.env ?? {}), ...(cond?.env ?? {}), ...(condition ? { LASTRO_CONDITION: condition } : {}) };
  for (const report of [command.report?.junit, command.report?.sarif]) if (report) rmSync(join(cwd, report), { force: true });
  if (cond?.setup) {
    const setup = await runCommand(cond.setup, cwd, env);
    // A condition that cannot be set up fails its stage, with the setup output; the other conditions still run.
    if (setup.exitCode !== 0) return { stage: name, condition, command: cond.setup, exitCode: setup.exitCode, status: "failed", durationMs: setup.durationMs, output: `setup failed\n${setup.output}`, results: [], findings: [], env: conditionEnv };
  }
  const run = await runCommand(line, where, env);
  const results = mergeResults(readReport(cwd, command.report?.junit, (xml) => parseJunit(xml, { root: cwd, prefix: command.report?.junit_prefix })) as TestCaseResult[]);
  const findings = readReport(cwd, command.report?.sarif, parseSarif) as Finding[];
  const failed = run.exitCode !== 0 || results.some((r) => r.status === "failed" || r.status === "error") || findings.some((f) => f.level === "error");
  return { stage: name, condition, command: line, exitCode: run.exitCode, status: failed ? "failed" : "passed", durationMs: run.durationMs, output: run.output, results, findings, env: conditionEnv };
}

/**
 * A suite several requirements share, judged for one of them: by its own linked tests when the suite reports
 * test results, so a failing test of another requirement does not fail it; by the exit code otherwise (a lint,
 * a build, a suite that wrote no report). Error findings fail it either way.
 */
export function stageFor(stage: Omit<StageRun, "requirement">, req: RequirementToVerify, config?: ProjectConfig): Omit<StageRun, "requirement"> {
  const command = config?.commands[stage.stage];
  // The stage ran for other requirements' tests; this one has none at its level.
  if (config && command && selects(command) && selectionFor(command, config.tests.levels, req.tests ?? []).files.length === 0) return nothingToRun(stage.stage, stage.condition, stage.env);
  if (stage.results.length === 0 || !req.tests?.length) return stage;
  const own = new Set(req.tests);
  const failed = stage.results.some((r) => own.has(r.ref) && (r.status === "failed" || r.status === "error")) || stage.findings.some((f) => f.level === "error");
  return { ...stage, status: failed ? "failed" : "passed" };
}

/** The files a requirement's evidence is bound to: what it touches, or its test files until it touches anything. */
export const boundFiles = (r: RequirementToVerify) => (r.touches.length ? r.touches : (r.testFiles ?? []));

/**
 * Runs every automatic stage each requirement needs, once per stage and condition, and builds the report. A
 * command that names the tests ({files}, {dirs}, {names}) runs only the linked tests of these requirements.
 */
export async function verify(cwd: string, config: ProjectConfig, requirements: RequirementToVerify[], trigger: RunReport["trigger"]): Promise<RunReport> {
  const started = Date.now();
  const plans = requirements.map((req) => ({ req, stages: planStages(config, req.type).filter((s) => s.kind === "command") }));
  const keyOf = (s: { stage: string; condition: string | null }) => `${s.stage}|${s.condition ?? ""}`;
  const testsOf = (key: string) => plans.filter((p) => p.stages.some((s) => keyOf(s) === key)).flatMap((p) => p.req.tests ?? []);
  const done = new Map<string, Omit<StageRun, "requirement">>();
  const stages: StageRun[] = [];
  for (const { req, stages: planned } of plans) {
    for (const s of planned) {
      const key = keyOf(s);
      if (!done.has(key)) done.set(key, await runStage(cwd, config, s.stage, s.condition, testsOf(key)));
      stages.push({ requirement: req.code, ...stageFor(done.get(key) as Omit<StageRun, "requirement">, req, config) });
    }
  }
  // After the commands, so the coverage report they write is there to read.
  const coverage = readCoverage(cwd, config);
  for (const req of requirements) if (needsTestQuality(config, req.type)) stages.push({ requirement: req.code, ...qualityStage(cwd, config, req, coverage) });
  return {
    trigger, ...commitInfo(cwd), environment: { node: process.version, platform: process.platform },
    startedAt: new Date(started).toISOString(), durationMs: Date.now() - started, stages,
    trees: Object.fromEntries(requirements.map((r) => [r.code, treeHash(cwd, boundFiles(r))])),
    testFiles: fileHashes(cwd, requirements.flatMap((r) => r.testFiles ?? [])),
    testFileLines: fileLines(cwd, requirements.flatMap((r) => r.testFiles ?? [])),
    testBlocks: testBlocks(cwd, requirements.flatMap((r) => r.tests ?? [])),
  };
}
