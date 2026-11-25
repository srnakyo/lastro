import { db } from "../db";

/** Latest runs of a project, each with its stage tallies and test totals, for the Runs screen and its chart. */
export async function listRuns(projectId: string, take = 50) {
  const runs = await db().run.findMany({
    where: { projectId },
    orderBy: { startedAt: "desc" },
    take,
    include: { stages: { select: { status: true, manual: true, condition: true, requirement: { select: { code: true } } } } },
  });
  const results = await db().testResult.findMany({ where: { runStage: { runId: { in: runs.map((r) => r.id) } } }, select: { status: true, runStage: { select: { runId: true } } } });
  const tally = new Map<string, { passed: number; failed: number; skipped: number }>();
  for (const r of results) {
    const t = tally.get(r.runStage.runId) ?? { passed: 0, failed: 0, skipped: 0 };
    if (r.status === "passed") t.passed += 1;
    else if (r.status === "skipped") t.skipped += 1;
    else t.failed += 1;
    tally.set(r.runStage.runId, t);
  }
  return runs.map(({ stages, ...run }) => ({
    ...run,
    requirements: [...new Set(stages.map((s) => s.requirement?.code).filter((c): c is string => !!c))],
    conditions: [...new Set(stages.map((s) => s.condition).filter((c): c is string => !!c))],
    stages: { total: stages.length, passed: stages.filter((s) => s.status === "passed").length, failed: stages.filter((s) => s.status !== "passed").length },
    tests: tally.get(run.id) ?? { passed: 0, failed: 0, skipped: 0 },
  }));
}
