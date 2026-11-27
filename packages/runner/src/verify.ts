import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { needsTestQuality, type ProjectConfig } from "@lastro/shared";
import { runCommand } from "./exec";
import { commitInfo, fileHashes, fileLines, treeHash } from "./git";
import { mergeResults, parseJunit, type TestCaseResult } from "./junit";
import { planStages } from "./plan";
import { qualityStage, readCoverage } from "./quality";
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
}

function readReport(cwd: string, path: string | undefined, parse: (text: string) => unknown[]): unknown[] {
  if (!path) return [];
  const file = join(cwd, path);
  if (!existsSync(file)) return [];
  const items = parse(readFileSync(file, "utf8"));
  return items;
}

async function runStage(cwd: string, config: ProjectConfig, name: string, condition: string | null): Promise<Omit<StageRun, "requirement">> {
  const command = config.commands[name];
  const cond = condition ? config.conditions[condition] : undefined;
  const conditionEnv = cond?.env ?? {};
  if (!command) return { stage: name, condition, command: null, exitCode: null, status: "error", durationMs: 0, output: `no command named ${name} in lastro.yml`, results: [], findings: [], env: conditionEnv };
  const env = { ...(command.env ?? {}), ...(cond?.env ?? {}), ...(condition ? { LASTRO_CONDITION: condition } : {}) };
  for (const report of [command.report?.junit, command.report?.sarif]) if (report) rmSync(join(cwd, report), { force: true });
  if (cond?.setup) {
    const setup = await runCommand(cond.setup, cwd, env);
    // A condition that cannot be set up fails its stage, with the setup output; the other conditions still run.
    if (setup.exitCode !== 0) return { stage: name, condition, command: cond.setup, exitCode: setup.exitCode, status: "failed", durationMs: setup.durationMs, output: `setup failed\n${setup.output}`, results: [], findings: [], env: conditionEnv };
  }
  const run = await runCommand(command.run, cwd, env);
  const results = mergeResults(readReport(cwd, command.report?.junit, (xml) => parseJunit(xml, { root: cwd, prefix: command.report?.junit_prefix })) as TestCaseResult[]);
  const findings = readReport(cwd, command.report?.sarif, parseSarif) as Finding[];
  const failed = run.exitCode !== 0 || results.some((r) => r.status === "failed" || r.status === "error") || findings.some((f) => f.level === "error");
  return { stage: name, condition, command: command.run, exitCode: run.exitCode, status: failed ? "failed" : "passed", durationMs: run.durationMs, output: run.output, results, findings, env: conditionEnv };
}

/**
 * A suite several requirements share, judged for one of them: by its own linked tests when the suite reports
 * test results, so a failing test of another requirement does not fail it; by the exit code otherwise (a lint,
 * a build, a suite that wrote no report). Error findings fail it either way.
 */
export function stageFor(stage: Omit<StageRun, "requirement">, req: RequirementToVerify): Omit<StageRun, "requirement"> {
  if (stage.results.length === 0 || !req.tests?.length) return stage;
  const own = new Set(req.tests);
  const failed = stage.results.some((r) => own.has(r.ref) && (r.status === "failed" || r.status === "error")) || stage.findings.some((f) => f.level === "error");
  return { ...stage, status: failed ? "failed" : "passed" };
}

/** The files a requirement's evidence is bound to: what it touches, or its test files until it touches anything. */
export const boundFiles = (r: RequirementToVerify) => (r.touches.length ? r.touches : (r.testFiles ?? []));

/** Runs every automatic stage each requirement needs, once per stage and condition, and builds the report. */
export async function verify(cwd: string, config: ProjectConfig, requirements: RequirementToVerify[], trigger: RunReport["trigger"]): Promise<RunReport> {
  const started = Date.now();
  const done = new Map<string, Omit<StageRun, "requirement">>();
  const stages: StageRun[] = [];
  for (const req of requirements) {
    for (const planned of planStages(config, req.type).filter((s) => s.kind === "command")) {
      const key = `${planned.stage}|${planned.condition ?? ""}`;
      if (!done.has(key)) done.set(key, await runStage(cwd, config, planned.stage, planned.condition));
      stages.push({ requirement: req.code, ...stageFor(done.get(key) as Omit<StageRun, "requirement">, req) });
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
  };
}
