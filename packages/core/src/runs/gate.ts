import type { ProjectConfig } from "@lastro/shared";
import type { Tx } from "../db";
import { blocksStep, computeBlockers } from "../lifecycle/blockers";
import { loadGraph, toBlockerInput } from "../requirements/graph";
import { gateText, NOT_RUN, type GateItem } from "./gate-items";

export interface GateResult {
  pass: boolean;
  /** What an agent can fix: failing stages, missing or failing tests, a changed locked test. */
  agentCanFix: string[];
  /** What only a person can resolve: manual stages, approvals, unlocks. */
  needsPerson: string[];
  /** The same, as data for screens that write them in their own language. */
  fixItems: GateItem[];
  personItems: GateItem[];
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
    if (typeof s === "string") return [{ stage: s, condition: null as string | null, manual: false, builtin: false }];
    const name = s.run ?? s.check ?? "stage";
    return (s.conditions?.length ? s.conditions : [null]).map((condition) => ({ stage: name, condition, manual: !!s.manual, builtin: !s.run && !s.manual }));
  });
}

/**
 * Automatic checks Lastro performs itself (a `check` stage that is not manual). `examples`: every example of
 * the requester has a linked test that passed. A check Lastro does not know needs a person to decide.
 */
function builtinCheck(name: string, examples: number, passingTests: number): { fix?: GateItem; person?: GateItem } {
  if (name === "examples") {
    if (examples === 0) return { fix: { kind: "no_examples" } };
    if (passingTests < examples) return { fix: { kind: "examples_short", examples, passing: passingTests } };
    return {};
  }
  return { person: { kind: "unknown_check", check: name } };
}

const RANK: Record<string, number> = { error: 3, failed: 2, passed: 1, skipped: 0 };

/**
 * Result of each test, by ref, from the latest run that ran it (on the commit when given). A run can hold the
 * test under several conditions: it failed if it failed under any, passed if it passed under one and was
 * skipped (did not apply) under the others.
 */
async function latestByRef(tx: Tx, projectId: string, refs: string[], commit?: string | null) {
  const results = await tx.testResult.findMany({
    where: { test: { projectId, ref: { in: refs } }, ...(commit ? { runStage: { run: { commit } } } : {}) },
    orderBy: { runStage: { startedAt: "desc" } },
    select: { status: true, test: { select: { ref: true } }, runStage: { select: { runId: true } } },
  });
  const run = new Map<string, string>();
  const latest = new Map<string, string>();
  for (const r of results) {
    const ref = r.test.ref;
    if (!run.has(ref)) run.set(ref, r.runStage.runId);
    if (run.get(ref) !== r.runStage.runId) continue;
    const seen = latest.get(ref);
    if (!seen || (RANK[r.status] ?? 0) > (RANK[seen] ?? 0)) latest.set(ref, r.status);
  }
  return latest;
}

/** Rule 4: a locked test file is sealed on its first run after approval; a different hash afterwards fails the gate. */
async function lockedTests(tx: Tx, graph: Awaited<ReturnType<typeof loadGraph>>, testFiles: Record<string, string>, out: GateItem[]) {
  for (const c of graph.criteria) {
    if (!c.lockedHash) continue;
    for (const t of c.tests) {
      const file = t.testRef.split("::")[0] ?? t.testRef;
      const now = testFiles[file];
      if (!now) continue;
      if (!t.lockedHash) await tx.criterionTest.updateMany({ where: { criterionId: c.id, testRef: t.testRef }, data: { lockedHash: now } });
      else if (t.lockedHash !== now) out.push({ kind: "locked_changed", file, criterion: c.code });
    }
  }
}

/** Rules 5 and 6: regression tests of the requirement's incidents (always) and invariant tests (where they run). */
async function extraTests(tx: Tx, projectId: string, requirementId: string) {
  const [incidents, invariants] = await Promise.all([
    tx.incident.findMany({ where: { requirementId, regressionTest: { not: null } }, select: { code: true, regressionTest: true } }),
    tx.invariant.findMany({ where: { projectId }, select: { code: true, testRefs: true } }),
  ]);
  return [
    ...incidents.map((i) => ({ ref: i.regressionTest ?? "", kind: "regression" as const, code: i.code, always: true })),
    // An invariant counts where its tests run in this requirement's stages: Lastro cannot know which files
    // an invariant's test covers, so the tests that the requirement's own suites run stand for "the same files".
    ...invariants.flatMap((i) => i.testRefs.map((ref) => ({ ref, kind: "invariant" as const, code: i.code, always: false }))),
  ];
}

/**
 * The gate of one requirement (PRD, building → verified), from what Lastro recorded on the commit: the
 * type's stages passed in every condition, every criterion has tests and they passed, no locked test
 * changed, incident regression tests and invariant tests passed, and nothing before verification holds it.
 */
export async function evaluateGate(tx: Tx, config: ProjectConfig, requirementId: string, latestStages: StageState[], ctx: GateContext = {}): Promise<GateResult> {
  const graph = await loadGraph(tx, requirementId);
  const fix: GateItem[] = [];
  const person: GateItem[] = [];
  const extra = await extraTests(tx, graph.projectId, requirementId);
  const refs = [...graph.criteria.flatMap((c) => c.tests.map((t) => t.testRef)), ...extra.map((e) => e.ref)];
  const latest = await latestByRef(tx, graph.projectId, refs, ctx.commit);
  for (const need of requiredStages(config, graph.type)) {
    if (need.builtin) {
      const passing = new Set(graph.criteria.flatMap((c) => c.tests.map((t) => t.testRef)).filter((ref) => latest.get(ref) === "passed")).size;
      const result = builtinCheck(need.stage, Array.isArray(graph.examples) ? graph.examples.length : 0, passing);
      if (result.fix) fix.push(result.fix);
      if (result.person) person.push(result.person);
      continue;
    }
    const found = latestStages.find((s) => s.stage === need.stage && s.condition === need.condition);
    const label = `${need.stage}${need.condition ? ` · ${need.condition}` : ""}`;
    if (need.manual && found?.status !== "passed") person.push({ kind: "manual", stage: label });
    if (!need.manual && found?.status !== "passed") {
      fix.push({ kind: "stage", stage: label, status: found?.status ?? NOT_RUN });
      for (const f of found?.findings ?? []) fix.push({ kind: "finding", stage: label, text: `${f.file ?? "?"}${f.line ? `:${f.line}` : ""} ${f.ruleId ?? ""} ${f.message}`.trim() });
    }
  }
  for (const c of graph.criteria) {
    if (c.tests.length === 0) fix.push({ kind: "no_test", criterion: c.code });
    for (const t of c.tests) if (latest.get(t.testRef) !== "passed") fix.push({ kind: "test", criterion: c.code, test: t.testRef, status: latest.get(t.testRef) ?? NOT_RUN });
  }
  for (const e of extra) {
    const status = latest.get(e.ref);
    if ((e.always || status) && status !== "passed") fix.push(e.kind === "regression" ? { kind: "regression", incident: e.code, test: e.ref, status: status ?? NOT_RUN } : { kind: "invariant", invariant: e.code, test: e.ref, status: status ?? NOT_RUN });
  }
  await lockedTests(tx, graph, ctx.testFiles ?? {}, fix);
  const holding = blocksStep(computeBlockers({ ...toBlockerInput(graph), hasEvidence: true }, config), "verified").filter((b) => b.kind !== "criterion_without_test");
  for (const b of holding) person.push({ kind: "blocker", blocker: b.kind, detail: b.detail ?? "" });
  return { pass: fix.length === 0 && person.length === 0, agentCanFix: fix.map(gateText), needsPerson: person.map(gateText), fixItems: fix, personItems: person };
}
