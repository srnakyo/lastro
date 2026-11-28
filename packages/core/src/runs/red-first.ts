import type { Tx } from "../db";

/**
 * Tests that Lastro never saw fail since their criterion was locked: they passed, and no run after the lock
 * shows them failing. A test written before the code fails once; a test that has only ever passed may test
 * nothing. A test that passed against a stub that did nothing (a negative test) and was then made stronger
 * counts once it fails, so it is not stuck for having passed too early.
 */
export async function neverRed(tx: Tx, projectId: string, tests: { ref: string; since: Date }[]): Promise<string[]> {
  if (tests.length === 0) return [];
  const since = new Date(Math.min(...tests.map((t) => t.since.getTime())));
  const results = await tx.testResult.findMany({
    where: { test: { projectId, ref: { in: tests.map((t) => t.ref) } }, status: { in: ["passed", "failed", "error"] }, runStage: { run: { startedAt: { gte: since } } } },
    select: { status: true, test: { select: { ref: true } }, runStage: { select: { run: { select: { startedAt: true } } } } },
  });
  const after = (t: { ref: string; since: Date }) => results.filter((x) => x.test.ref === t.ref && x.runStage.run.startedAt >= t.since);
  return tests.filter((t) => {
    const seen = after(t);
    return seen.some((x) => x.status === "passed") && !seen.some((x) => x.status !== "passed");
  }).map((t) => t.ref);
}
