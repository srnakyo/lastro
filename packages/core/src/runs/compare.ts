import { db } from "../db";

type Status = string;

/** Latest status of each test in a set of stages. */
const statuses = (stages: { results: { status: Status; test: { ref: string } }[] }[]) => new Map(stages.flatMap((s) => s.results.map((r) => [r.test.ref, r.status] as const)));
const failing = (s: Status | undefined) => s === "failed" || s === "error";

/**
 * For each requirement of a run, the previous run of that same requirement and the tests that started
 * failing or passed again since (REQ-S9A2B).
 */
export async function compareWithPrevious(projectId: string, run: { startedAt: Date; stages: { requirementId: string | null; requirement: { code: string } | null; results: { status: Status; test: { ref: string } }[] }[] }) {
  const ids = [...new Set(run.stages.map((s) => s.requirementId).filter((id): id is string => !!id))];
  return Promise.all(
    ids.map(async (requirementId) => {
      const code = run.stages.find((s) => s.requirementId === requirementId)?.requirement?.code ?? "";
      const previous = await db().run.findFirst({
        where: { projectId, proof: false, startedAt: { lt: run.startedAt }, stages: { some: { requirementId } } },
        orderBy: { startedAt: "desc" },
        select: { id: true, commit: true, stages: { where: { requirementId }, select: { results: { select: { status: true, test: { select: { ref: true } } } } } } },
      });
      const before = statuses(previous?.stages ?? []);
      const now = statuses(run.stages.filter((s) => s.requirementId === requirementId));
      const refs = [...now.keys()].filter((ref) => before.has(ref));
      return {
        requirement: code,
        previousId: previous?.id ?? null,
        previousCommit: previous?.commit ?? null,
        newlyFailing: refs.filter((ref) => failing(now.get(ref)) && !failing(before.get(ref))),
        newlyPassing: refs.filter((ref) => now.get(ref) === "passed" && failing(before.get(ref))),
      };
    }),
  );
}
