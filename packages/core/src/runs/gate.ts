import type { ProjectConfig } from "@lastro/shared";
import type { Tx } from "../db";
import { blocksStep, computeBlockers } from "../lifecycle/blockers";
import { loadGraph, toBlockerInput } from "../requirements/graph";

export interface GateResult {
  pass: boolean;
  /** What an agent can fix: failing stages, missing or failing tests, a changed locked test. */
  agentCanFix: string[];
  /** What only a person can resolve: manual stages, approvals, unlocks. */
  needsPerson: string[];
}

interface StageState {
  stage: string;
  condition: string | null;
  status: string;
  manual: boolean;
  findings?: { file: string | null; line: number | null; ruleId: string | null; message: string }[];
}

/** Where the gate looks: the commit under evaluation and the hashes of the test files on disk. */
export interface GateContext {
  commit?: string | null;
  testFiles?: Record<string, string>;
}

function requiredStages(config: ProjectConfig, type: string) {
  const stages = [...config.global_flow, ...(config.types[type]?.flow ?? [])];
  return stages.flatMap((s) => {
    if (typeof s === "string") return [{ stage: s, condition: null as string | null, manual: false }];
    const name = s.run ?? s.check ?? "stage";
    return (s.conditions?.length ? s.conditions : [null]).map((condition) => ({ stage: name, condition, manual: !!s.manual }));
  });
}

/** Latest result of each test, by ref, on the commit when given. */
async function latestByRef(tx: Tx, projectId: string, refs: string[], commit?: string | null) {
  const results = await tx.testResult.findMany({
    where: { test: { projectId, ref: { in: refs } }, ...(commit ? { runStage: { run: { commit } } } : {}) },
    orderBy: { runStage: { startedAt: "desc" } },
    select: { status: true, test: { select: { ref: true } } },
  });
  const latest = new Map<string, string>();
  for (const r of results) if (!latest.has(r.test.ref)) latest.set(r.test.ref, r.status);
  return latest;
}

/** Rule 4: a locked test file is sealed on its first run after approval; a different hash afterwards fails the gate. */
async function lockedTests(tx: Tx, graph: Awaited<ReturnType<typeof loadGraph>>, testFiles: Record<string, string>, out: string[]) {
  for (const c of graph.criteria) {
    if (!c.lockedHash) continue;
    for (const t of c.tests) {
      const file = t.testRef.split("::")[0] ?? t.testRef;
      const now = testFiles[file];
      if (!now) continue;
      if (!t.lockedHash) await tx.criterionTest.updateMany({ where: { criterionId: c.id, testRef: t.testRef }, data: { lockedHash: now } });
      else if (t.lockedHash !== now) out.push(`locked test changed: ${file} (${c.code}); revert it, or a person unlocks the criteria`);
    }
  }
}

/** Rules 5 and 6: regression tests of the requirement's incidents and the project's invariant tests. */
async function extraTests(tx: Tx, projectId: string, requirementId: string) {
  const [incidents, invariants] = await Promise.all([
    tx.incident.findMany({ where: { requirementId, regressionTest: { not: null } }, select: { code: true, regressionTest: true } }),
    tx.invariant.findMany({ where: { projectId }, select: { code: true, testRefs: true } }),
  ]);
  return [
    ...incidents.map((i) => ({ ref: i.regressionTest ?? "", why: `regression test of ${i.code}` })),
    ...invariants.flatMap((i) => i.testRefs.map((ref) => ({ ref, why: `invariant ${i.code}` }))),
  ];
}

/**
 * The gate of one requirement (PRD, building → verified), from what Lastro recorded on the commit: the
 * type's stages passed in every condition, every criterion has tests and they passed, no locked test
 * changed, incident regression tests and invariant tests passed, and nothing before verification holds it.
 */
export async function evaluateGate(tx: Tx, config: ProjectConfig, requirementId: string, latestStages: StageState[], ctx: GateContext = {}): Promise<GateResult> {
  const graph = await loadGraph(tx, requirementId);
  const agentCanFix: string[] = [];
  const needsPerson: string[] = [];
  for (const need of requiredStages(config, graph.type)) {
    const found = latestStages.find((s) => s.stage === need.stage && s.condition === need.condition);
    const label = `${need.stage}${need.condition ? ` · ${need.condition}` : ""}`;
    if (need.manual && found?.status !== "passed") needsPerson.push(`manual stage ${label} not signed`);
    if (!need.manual && found?.status !== "passed") {
      agentCanFix.push(found ? `${label} ${found.status}` : `${label} not run`);
      for (const f of found?.findings ?? []) agentCanFix.push(`${label}: ${f.file ?? "?"}${f.line ? `:${f.line}` : ""} ${f.ruleId ?? ""} ${f.message}`.trim());
    }
  }
  const extra = await extraTests(tx, graph.projectId, requirementId);
  const refs = [...graph.criteria.flatMap((c) => c.tests.map((t) => t.testRef)), ...extra.map((e) => e.ref)];
  const latest = await latestByRef(tx, graph.projectId, refs, ctx.commit);
  for (const c of graph.criteria) {
    if (c.tests.length === 0) agentCanFix.push(`${c.code} has no test`);
    for (const t of c.tests) if (latest.get(t.testRef) !== "passed") agentCanFix.push(`${c.code} ${t.testRef} ${latest.get(t.testRef) ?? "not run"}`);
  }
  for (const e of extra) if (latest.get(e.ref) !== "passed") agentCanFix.push(`${e.why}: ${e.ref} ${latest.get(e.ref) ?? "not run"}`);
  await lockedTests(tx, graph, ctx.testFiles ?? {}, agentCanFix);
  const holding = blocksStep(computeBlockers({ ...toBlockerInput(graph), hasEvidence: true }, config), "verified").filter((b) => b.kind !== "criterion_without_test");
  for (const b of holding) needsPerson.push(`${b.kind}${b.detail ? ` ${b.detail}` : ""}`);
  return { pass: agentCanFix.length === 0 && needsPerson.length === 0, agentCanFix, needsPerson };
}
