import { db } from "../db";

/**
 * The test catalog: every test seen in a run, with its history, whether it is flaky (passed and
 * failed on the same commit) and whether any criterion points to it.
 */
export async function testCatalog(projectId: string) {
  const [tests, links] = await Promise.all([
    db().test.findMany({
      where: { projectId },
      orderBy: { ref: "asc" },
      include: { results: { orderBy: { runStage: { startedAt: "desc" } }, take: 20, select: { status: true, durationMs: true, runStage: { select: { condition: true, startedAt: true, run: { select: { id: true, commit: true } } } } } } },
    }),
    db().criterionTest.findMany({ where: { criterion: { requirement: { projectId } } }, select: { testRef: true, criterion: { select: { code: true, requirement: { select: { code: true } } } } } }),
  ]);
  return tests.map((t) => {
    const byCommit = new Map<string, Set<string>>();
    for (const r of t.results) {
      const commit = r.runStage.run.commit ?? "";
      byCommit.set(commit, (byCommit.get(commit) ?? new Set()).add(r.status));
    }
    const flaky = [...byCommit.values()].some((s) => s.has("passed") && (s.has("failed") || s.has("error")));
    const covers = links.filter((l) => l.testRef === t.ref).map((l) => `${l.criterion.requirement.code} ${l.criterion.code}`);
    return { id: t.id, ref: t.ref, file: t.file, name: t.name, last: t.results[0]?.status ?? null, history: t.results, flaky, orphan: covers.length === 0, covers };
  });
}

/** What `lastro verify` and `lastro gate` need to run on a machine: the flows and the active requirements. */
export async function verifyPlan(projectId: string, code?: string) {
  const project = await db().project.findUniqueOrThrow({ where: { id: projectId }, select: { config: true } });
  const requirements = await db().requirement.findMany({
    where: { projectId, ...(code ? { code } : { status: { in: ["building", "reopened", "verified"] } }) },
    select: { code: true, type: true, touches: true, status: true },
    orderBy: { code: "asc" },
  });
  return { config: project.config, requirements };
}

/** Criteria of live requirements that no test points to. */
export function uncoveredCriteria(projectId: string) {
  return db().criterion.findMany({
    where: { requirement: { projectId, status: { not: "dropped" } }, tests: { none: {} } },
    select: { code: true, text: true, requirement: { select: { code: true, title: true } } },
    orderBy: [{ requirement: { code: "asc" } }, { code: "asc" }],
  });
}
