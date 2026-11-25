import { db } from "../db";

export interface TestTotals {
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
}

/** The latest result of every test of a project. */
export async function latestTestResults(projectId: string) {
  const results = await db().testResult.findMany({
    where: { test: { projectId } },
    orderBy: { runStage: { startedAt: "desc" } },
    select: { testId: true, status: true, test: { select: { ref: true } } },
  });
  const latest = new Map<string, { ref: string; status: string }>();
  for (const r of results) if (!latest.has(r.testId)) latest.set(r.testId, { ref: r.test.ref, status: r.status });
  return latest;
}

export function totals(latest: Map<string, { status: string }>): TestTotals {
  const values = [...latest.values()];
  return {
    tests: values.length,
    passed: values.filter((v) => v.status === "passed").length,
    failed: values.filter((v) => v.status === "failed" || v.status === "error").length,
    skipped: values.filter((v) => v.status === "skipped").length,
  };
}

export async function latestRuns(projectId: string, take = 6) {
  return db().run.findMany({
    where: { projectId },
    orderBy: { startedAt: "desc" },
    take,
    select: { id: true, trigger: true, commit: true, branch: true, status: true, startedAt: true, durationMs: true },
  });
}
