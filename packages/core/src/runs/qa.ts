import { db } from "../db";
import { findRequirement, requirementsService } from "../requirements/service";
import { loadScope } from "../scope/project-scope";
import { LIFECYCLE_EDGES, allowedActors } from "../lifecycle/transitions";
import { evaluateGate } from "./gate";
import { latestCommit, latestStages } from "./latest";

const moduleOf = (reach: unknown, type: string) => {
  const modules = (reach as { modules?: unknown } | null)?.modules;
  return Array.isArray(modules) && typeof modules[0] === "string" ? modules[0] : type;
};

/** What the QA card of a requirement shows: its flow with the latest result per stage, the gate and the evidence. */
export async function requirementQa(projectId: string, code: string) {
  const tx = db();
  const scope = await loadScope(tx, projectId);
  const requirement = await findRequirement(tx, projectId, code);
  // The diagram shows the latest commit that ran this requirement, not results mixed from older commits.
  const commit = await latestCommit(tx, requirement.id);
  const stages = await latestStages(tx, requirement.id, commit);
  const gate = await evaluateGate(tx, scope.config, requirement.id, stages, { commit });
  const evidence = await tx.evidence.findMany({ where: { requirementId: requirement.id }, orderBy: { verifiedAt: "desc" }, take: 5, include: { run: { select: { id: true, commit: true, trigger: true } } } });
  return {
    config: scope.config,
    type: (await tx.requirement.findUniqueOrThrow({ where: { id: requirement.id }, select: { type: true } })).type,
    states: Object.fromEntries(stages.map((s) => [`${s.stage}|${s.condition ?? ""}`, s.status])),
    gate,
    evidence: evidence.map((e) => ({ id: e.id, runId: e.run.id, commit: e.run.commit, trigger: e.run.trigger, treeHash: e.treeHash, verifiedAt: e.verifiedAt })),
  };
}

// Blocker kinds go out as codes; the diagram and each screen put them in words in their own language.
const label = (b: { kind: string; detail: string }) => b.kind;

/** Latest result of each test with the run it came from. */
async function latestTests(projectId: string) {
  const results = await db().testResult.findMany({
    where: { test: { projectId } },
    orderBy: { runStage: { startedAt: "desc" } },
    select: { status: true, test: { select: { ref: true } }, runStage: { select: { run: { select: { id: true, commit: true } } } } },
  });
  const latest: Record<string, { status: string; runId: string; commit: string | null }> = {};
  for (const r of results) latest[r.test.ref] ??= { status: r.status, runId: r.runStage.run.id, commit: r.runStage.run.commit };
  return latest;
}

/** Everything the Diagrams screen draws, straight from the project data. */
export async function diagramsData(projectId: string) {
  const scope = await loadScope(db(), projectId);
  const [views, packages, tests] = await Promise.all([
    requirementsService.list(projectId),
    db().package.findMany({ where: { projectId }, orderBy: { code: "asc" }, select: { code: true, title: true } }),
    latestTests(projectId),
  ]);
  const live = views.filter((v) => v.status !== "dropped");
  return {
    config: scope.config,
    types: Object.keys(scope.config.types),
    packages,
    requirements: live.map((r) => ({
      code: r.code, title: r.title, status: r.status, module: moduleOf(r.reach, r.type), package: r.package?.code ?? null,
      finalSource: r.citations.every((c) => c.source.versions[0]?.final ?? false),
      citations: r.citations.map((c) => ({ source: c.source.code, anchor: c.anchor, found: c.found })),
      criteria: r.criteria.map((c) => ({ code: c.code, tests: c.tests.map((t) => t.testRef) })),
      // What holds it on its next step, for the blocked edges of the lifecycle diagram.
      holds: {
        toSpecified: r.status === "captured" ? [...new Set(r.blockers.filter((b) => b.blocks === "specified").map(label))] : [],
        toApproved: r.status === "specified" ? [...new Set(r.blockers.filter((b) => b.blocks === "approved").map(label))] : [],
      },
    })),
    tests,
    edges: LIFECYCLE_EDGES.map(([from, to]) => ({ from, to, actors: allowedActors(from, to) })),
  };
}
