import type { RunReportData } from "@lastro/shared";
import type { Tx } from "../db";

/** Writes the run, its stages, the test catalog and every result and finding. Returns the stage ids per requirement. */
export async function writeRun(tx: Tx, projectId: string, report: RunReportData) {
  const failed = report.stages.some((s) => s.status !== "passed");
  const run = await tx.run.create({
    data: {
      projectId, trigger: report.trigger, commit: report.commit, branch: report.branch, dirty: report.dirty, environment: report.environment,
      status: failed ? "failed" : "passed", startedAt: report.startedAt, finishedAt: new Date(report.startedAt.getTime() + report.durationMs), durationMs: report.durationMs,
    },
  });
  const requirements = await tx.requirement.findMany({ where: { projectId, code: { in: report.stages.map((s) => s.requirement).filter((c): c is string => !!c) } }, select: { id: true, code: true } });
  const idOf = new Map(requirements.map((r) => [r.code, r.id]));
  const recorded = new Set<string>();
  let offset = 0;
  for (const s of report.stages) {
    const startedAt = new Date(report.startedAt.getTime() + offset);
    offset += s.durationMs;
    const stage = await tx.runStage.create({
      data: {
        runId: run.id, startedAt, requirementId: s.requirement ? (idOf.get(s.requirement) ?? null) : null, stage: s.stage, condition: s.condition, command: s.command,
        exitCode: s.exitCode, status: s.status, durationMs: s.durationMs, output: s.output,
        findings: { create: s.findings.map((f) => ({ tool: f.tool, ruleId: f.ruleId, level: f.level, file: f.file, line: f.line, message: f.message })) },
      },
    });
    const key = `${s.stage}|${s.condition ?? ""}`;
    if (recorded.has(key)) continue;
    recorded.add(key);
    for (const r of s.results) {
      const test = await tx.test.upsert({ where: { projectId_ref: { projectId, ref: r.ref } }, create: { projectId, ref: r.ref, file: r.file, name: r.name }, update: {} });
      await tx.testResult.create({ data: { runStageId: stage.id, testId: test.id, status: r.status, durationMs: r.durationMs, message: r.message } });
    }
  }
  return run;
}
