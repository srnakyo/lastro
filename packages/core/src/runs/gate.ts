import type { ProjectConfig } from "@lastro/shared";
import type { Tx } from "../db";
import { blocksStep, computeBlockers } from "../lifecycle/blockers";
import { loadGraph, toBlockerInput } from "../requirements/graph";

export interface GateResult {
  pass: boolean;
  /** What an agent can fix: failing stages, missing tests, failing tests. */
  agentCanFix: string[];
  /** What only a person can resolve: manual stages, approvals. */
  needsPerson: string[];
}

interface StageState {
  stage: string;
  condition: string | null;
  status: string;
  manual: boolean;
}

function requiredStages(config: ProjectConfig, type: string) {
  const stages = [...config.global_flow, ...(config.types[type]?.flow ?? [])];
  return stages.flatMap((s) => {
    if (typeof s === "string") return [{ stage: s, condition: null as string | null, manual: false }];
    const name = s.run ?? s.check ?? "stage";
    return (s.conditions?.length ? s.conditions : [null]).map((condition) => ({ stage: name, condition, manual: !!s.manual }));
  });
}

/** Latest result of every test of the project, by ref. */
async function latestByRef(tx: Tx, projectId: string, refs: string[]) {
  const results = await tx.testResult.findMany({
    where: { test: { projectId, ref: { in: refs } } },
    orderBy: { runStage: { startedAt: "desc" } },
    select: { status: true, test: { select: { ref: true } } },
  });
  const latest = new Map<string, string>();
  for (const r of results) if (!latest.has(r.test.ref)) latest.set(r.test.ref, r.status);
  return latest;
}

/**
 * The gate of one requirement, from what Lastro recorded: every required stage passed in every
 * condition on the latest run that covered it, every criterion has tests and they passed, and nothing
 * before verification is still holding it.
 */
export async function evaluateGate(tx: Tx, config: ProjectConfig, requirementId: string, latestStages: StageState[]): Promise<GateResult> {
  const graph = await loadGraph(tx, requirementId);
  const agentCanFix: string[] = [];
  const needsPerson: string[] = [];
  for (const need of requiredStages(config, graph.type)) {
    const found = latestStages.find((s) => s.stage === need.stage && s.condition === need.condition);
    const label = `${need.stage}${need.condition ? ` · ${need.condition}` : ""}`;
    if (need.manual && found?.status !== "passed") needsPerson.push(`manual stage ${label} not signed`);
    if (!need.manual && found?.status !== "passed") agentCanFix.push(found ? `${label} ${found.status}` : `${label} not run`);
  }
  const refs = graph.criteria.flatMap((c) => c.tests.map((t) => t.testRef));
  const latest = await latestByRef(tx, graph.projectId, refs);
  for (const c of graph.criteria) {
    if (c.tests.length === 0) agentCanFix.push(`${c.code} has no test`);
    for (const t of c.tests) if (latest.get(t.testRef) !== "passed") agentCanFix.push(`${c.code} ${t.testRef} ${latest.get(t.testRef) ?? "not run"}`);
  }
  const holding = blocksStep(computeBlockers({ ...toBlockerInput(graph), hasEvidence: true }, config), "verified").filter((b) => b.kind !== "criterion_without_test");
  for (const b of holding) needsPerson.push(`${b.kind}${b.detail ? ` ${b.detail}` : ""}`);
  return { pass: agentCanFix.length === 0 && needsPerson.length === 0, agentCanFix, needsPerson };
}
