import { db } from "../db";
import { findRequirement } from "../requirements/service";
import { loadScope } from "../scope/project-scope";
import { LIFECYCLE_EDGES, allowedActors } from "../lifecycle/transitions";
import { latestTestResults } from "../overview/tests";
import { evaluateGate } from "./gate";
import { latestStages } from "./latest";

/** What the QA card of a requirement shows: its flow with the latest result per stage, the gate and the evidence. */
export async function requirementQa(projectId: string, code: string) {
  const tx = db();
  const scope = await loadScope(tx, projectId);
  const requirement = await findRequirement(tx, projectId, code);
  const stages = await latestStages(tx, requirement.id);
  const gate = await evaluateGate(tx, scope.config, requirement.id, stages);
  const evidence = await tx.evidence.findMany({ where: { requirementId: requirement.id }, orderBy: { verifiedAt: "desc" }, take: 5, include: { run: { select: { id: true, commit: true, trigger: true } } } });
  return {
    config: scope.config,
    type: (await tx.requirement.findUniqueOrThrow({ where: { id: requirement.id }, select: { type: true } })).type,
    states: Object.fromEntries(stages.map((s) => [`${s.stage}|${s.condition ?? ""}`, s.status])),
    gate,
    evidence: evidence.map((e) => ({ id: e.id, runId: e.run.id, commit: e.run.commit, trigger: e.run.trigger, treeHash: e.treeHash, verifiedAt: e.verifiedAt })),
  };
}

/** Everything the Diagrams screen draws, straight from the project data. */
export async function diagramsData(projectId: string) {
  const tx = db();
  const scope = await loadScope(tx, projectId);
  const requirements = await tx.requirement.findMany({
    where: { projectId, status: { not: "dropped" } },
    orderBy: { code: "asc" },
    select: {
      code: true, title: true, status: true, type: true,
      citations: { select: { anchor: true, found: true, source: { select: { code: true } } } },
      criteria: { orderBy: { code: "asc" }, select: { code: true, tests: { select: { testRef: true } } } },
    },
  });
  const latest = await latestTestResults(projectId);
  const counts: Record<string, number> = {};
  for (const r of requirements) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return {
    config: scope.config,
    types: Object.keys(scope.config.types),
    requirements: requirements.map((r) => ({
      code: r.code, title: r.title, status: r.status,
      citations: r.citations.map((c) => ({ source: c.source.code, anchor: c.anchor, found: c.found })),
      criteria: r.criteria.map((c) => ({ code: c.code, tests: c.tests.map((t) => t.testRef) })),
    })),
    tests: Object.fromEntries([...latest.values()].map((v) => [v.ref, v.status])),
    counts,
    edges: LIFECYCLE_EDGES.map(([from, to]) => ({ from, to, actors: allowedActors(from, to) })),
  };
}
