import { db } from "../db";

/**
 * The test catalog: every test seen in a run, with its history, whether it is flaky (it passed and failed
 * while the files its requirement is bound to did not change) and whether any criterion points to it.
 */
export async function testCatalog(projectId: string) {
  const [tests, links] = await Promise.all([
    db().test.findMany({
      where: { projectId },
      orderBy: { ref: "asc" },
      include: { results: { orderBy: [{ runStage: { run: { startedAt: "desc" } } }, { runStage: { startedAt: "desc" } }], take: 20, select: { status: true, durationMs: true, runStage: { select: { condition: true, startedAt: true, treeHash: true, run: { select: { id: true, commit: true } } } } } } },
    }),
    db().criterionTest.findMany({ where: { criterion: { requirement: { projectId } } }, select: { testRef: true, criterion: { select: { code: true, requirement: { select: { code: true } } } } } }),
  ]);
  return tests.map((t) => {
    // Same fingerprint of the covered files (or, for a test no requirement covers, the same commit) and both
    // outcomes: nothing changed, yet the result did.
    const byTree = new Map<string, Set<string>>();
    for (const r of t.results) {
      const key = r.runStage.treeHash ?? `commit:${r.runStage.run.commit ?? ""}`;
      byTree.set(key, (byTree.get(key) ?? new Set()).add(r.status));
    }
    const flaky = [...byTree.values()].some((s) => s.has("passed") && (s.has("failed") || s.has("error")));
    const covers = links.filter((l) => l.testRef === t.ref).map((l) => `${l.criterion.requirement.code} ${l.criterion.code}`);
    return { id: t.id, ref: t.ref, file: t.file, name: t.name, last: t.results[0]?.status ?? null, history: t.results, flaky, orphan: covers.length === 0, covers };
  });
}

/** What `lastro verify` and `lastro gate` need to run on a machine: the flows and the active requirements. */
export async function verifyPlan(projectId: string, code?: string) {
  const project = await db().project.findUniqueOrThrow({ where: { id: projectId }, select: { config: true } });
  const requirements = await db().requirement.findMany({
    where: { projectId, ...(code ? { code } : { status: { in: ["building", "reopened", "verified"] } }) },
    select: { code: true, type: true, touches: true, status: true, examples: true, criteria: { select: { tests: { select: { testRef: true } } } } },
    orderBy: { code: "asc" },
  });
  // Each requirement carries the files of its linked tests: their hashes guard the locks, and with no touched
  // files recorded yet they are what the evidence is bound to.
  return {
    config: project.config,
    requirements: requirements.map(({ criteria, examples, ...r }) => ({
      ...r,
      examples: Array.isArray(examples) ? examples : [],
      testFiles: [...new Set(criteria.flatMap((c) => c.tests.map((t) => t.testRef.split("::")[0] ?? t.testRef)))].sort(),
      tests: [...new Set(criteria.flatMap((c) => c.tests.map((t) => t.testRef)))].sort(),
    })),
  };
}

/** Criteria of live requirements that no test points to. */
export function uncoveredCriteria(projectId: string) {
  return db().criterion.findMany({
    where: { requirement: { projectId, status: { not: "dropped" } }, tests: { none: {} } },
    select: { code: true, text: true, requirement: { select: { code: true, title: true } } },
    orderBy: [{ requirement: { code: "asc" } }, { code: "asc" }],
  });
}
