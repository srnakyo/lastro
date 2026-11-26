import type { Tx } from "../db";

/**
 * Tests that Lastro never saw fail since their criterion was locked: their first result after the lock was a
 * pass. A test written before the code fails once; a test that has only ever passed may test nothing.
 */
export async function neverRed(tx: Tx, projectId: string, tests: { ref: string; since: Date }[]): Promise<string[]> {
  if (tests.length === 0) return [];
  const since = new Date(Math.min(...tests.map((t) => t.since.getTime())));
  const results = await tx.testResult.findMany({
    where: { test: { projectId, ref: { in: tests.map((t) => t.ref) } }, status: { in: ["passed", "failed", "error"] }, runStage: { run: { startedAt: { gte: since } } } },
    orderBy: { runStage: { run: { startedAt: "asc" } } },
    select: { status: true, test: { select: { ref: true } }, runStage: { select: { run: { select: { startedAt: true } } } } },
  });
  const first = new Map<string, string>();
  for (const t of tests) {
    const r = results.find((x) => x.test.ref === t.ref && x.runStage.run.startedAt >= t.since);
    if (r) first.set(t.ref, r.status);
  }
  return tests.filter((t) => first.get(t.ref) === "passed").map((t) => t.ref);
}
