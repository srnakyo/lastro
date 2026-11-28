import { needsTestQuality, onlyGrew, TEST_QUALITY_STAGE, type ProjectConfig } from "@lastro/shared";
import { createHash } from "node:crypto";
import type { Tx } from "../db";
import { auditService } from "../audit/service";
import { systemActor } from "../scope/actor";
import { blocksStep, computeBlockers } from "../lifecycle/blockers";
import { loadGraph, toBlockerInput } from "../requirements/graph";
import { gateText, NOT_RUN, type GateItem } from "./gate-items";
import { neverRed } from "./red-first";

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
  testFileLines?: Record<string, string[]>;
  testBlocks?: Record<string, string[]>;
}

function requiredStages(config: ProjectConfig, type: string) {
  const stages = [...config.global_flow, ...(config.types[type]?.flow ?? [])];
  const flow = stages.flatMap((s) => {
    if (typeof s === "string") return [{ stage: s, condition: null as string | null, manual: false, builtin: false }];
    const name = s.run ?? s.check ?? "stage";
    return (s.conditions?.length ? s.conditions : [null]).map((condition) => ({ stage: name, condition, manual: !!s.manual, builtin: !s.run && !s.manual }));
  });
  // The runner adds the test-quality stage (examples in the tests, coverage of the touched files) when the type asks.
  return needsTestQuality(config, type) ? [...flow, { stage: TEST_QUALITY_STAGE, condition: null as string | null, manual: false, builtin: false }] : flow;
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
    orderBy: [{ runStage: { run: { startedAt: "desc" } } }, { runStage: { startedAt: "desc" } }],
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

/** The tests among these that passed at least once, in any run. */
async function everPassed(tx: Tx, projectId: string, refs: string[]) {
  if (refs.length === 0) return new Set<string>();
  const rows = await tx.testResult.findMany({ where: { status: "passed", test: { projectId, ref: { in: refs } } }, select: { test: { select: { ref: true } } }, distinct: ["testId"] });
  return new Set(rows.map((r) => r.test.ref));
}

export { onlyGrew };

type Files = { hashes: Record<string, string>; lines: Record<string, string[]>; blocks: Record<string, string[]> };

const BLOCK = "block:";
const blockSeal = (lines: string[]) => `${BLOCK}${createHash("sha256").update(lines.join("\n")).digest("hex")}`;

type Sealed = { testRef: string; lockedHash: string | null; sealedLines: string[] };

/**
 * A test sealed on its own block: unchanged, or only grown (renewed), or changed. A seal of the whole file from
 * before becomes a block seal when the test's own lines are still there in order, or the file only grew.
 */
function blockVerdict(t: Sealed, block: string[], fileNow: string[] | undefined, passing: boolean): "same" | "renew" | "changed" {
  const now = blockSeal(block);
  if (t.lockedHash === now) return "same";
  if (t.lockedHash?.startsWith(BLOCK)) return onlyGrew(t.sealedLines, block) ? "renew" : "changed";
  if (!t.sealedLines.length) return passing ? "renew" : "changed";
  return onlyGrew(block, t.sealedLines) || (fileNow !== undefined && onlyGrew(t.sealedLines, fileNow)) ? "renew" : "changed";
}

/**
 * Rule 4: a locked test's file is sealed once the test has proven itself, on its first pass. Afterwards a
 * changed or removed line fails the gate; a file that only grew (another test added to it) keeps the seal,
 * renewed. Until that first pass the agent may still fix its own test, so a seal put on a test that never
 * passed is lifted. A seal from before line fingerprints is renewed once, on a passing run.
 */
async function lockedTests(tx: Tx, graph: Awaited<ReturnType<typeof loadGraph>>, files: Files, latest: Map<string, string>, out: GateItem[]) {
  const proven = await everPassed(tx, graph.projectId, graph.criteria.flatMap((c) => (c.lockedHash ? c.tests.map((t) => t.testRef) : [])));
  const renewed: string[] = [];
  for (const c of graph.criteria) {
    if (!c.lockedHash) continue;
    for (const t of c.tests) {
      const file = t.testRef.split("::")[0] ?? t.testRef;
      const now = files.hashes[file];
      const lines = files.lines[file];
      const seal = (lockedHash: string | null, sealedLines: string[] = []) => tx.criterionTest.updateMany({ where: { criterionId: c.id, testRef: t.testRef }, data: { lockedHash, sealedLines } });
      if (!proven.has(t.testRef)) {
        if (t.lockedHash) await seal(null);
        continue;
      }
      if (!now) continue;
      const passing = latest.get(t.testRef) === "passed";
      const block = files.blocks[t.testRef];
      if (block) {
        // The seal covers this test's own lines: a change in another test of the same file leaves it alone.
        const verdict = t.lockedHash ? blockVerdict(t, block, lines, passing) : passing ? "renew" : "same";
        if (verdict === "renew") {
          await seal(blockSeal(block), block);
          if (t.lockedHash) renewed.push(`${c.code} ${t.testRef}`);
        } else if (verdict === "changed") out.push({ kind: "locked_changed", file: t.testRef, criterion: c.code });
        continue;
      }
      if (!t.lockedHash) {
        if (passing) await seal(now, lines);
      } else if (t.lockedHash === now) {
        if (t.sealedLines.length === 0 && lines) await seal(now, lines);
      } else if (lines && (t.sealedLines.length ? onlyGrew(t.sealedLines, lines) : passing)) {
        await seal(now, lines);
        renewed.push(`${c.code} ${file}`);
      } else out.push({ kind: "locked_changed", file, criterion: c.code });
    }
  }
  if (renewed.length) {
    const project = await tx.project.findUniqueOrThrow({ where: { id: graph.projectId }, select: { workspaceId: true } });
    await auditService.record(tx, { workspaceId: project.workspaceId, projectId: graph.projectId, actor: systemActor, action: "test.reseal", entity: "requirement", entityId: graph.code, data: { files: renewed } });
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
  await lockedTests(tx, graph, { hashes: ctx.testFiles ?? {}, lines: ctx.testFileLines ?? {}, blocks: ctx.testBlocks ?? {} }, latest, fix);
  if (config.tests.red_first) {
    // Only tests locked after the rule was turned on must have failed first, and not those of a behavior that
    // already existed (recorded as a decision the person may overturn).
    const on = config.tests.red_first_since ? new Date(config.tests.red_first_since) : null;
    const asked = graph.criteria.filter((c) => !c.preexistingDecision && c.lockedAt && (!on || c.lockedAt >= on));
    const locked = asked.flatMap((c) => c.tests.map((t) => ({ ref: t.testRef, since: c.lockedAt as Date })));
    for (const test of await neverRed(tx, graph.projectId, locked)) fix.push({ kind: "never_red", test });
  }
  const holding = blocksStep(computeBlockers({ ...toBlockerInput(graph), hasEvidence: true }, config), "verified").filter((b) => b.kind !== "criterion_without_test");
  for (const b of holding) person.push({ kind: "blocker", blocker: b.kind, detail: b.detail ?? "" });
  return { pass: fix.length === 0 && person.length === 0, agentCanFix: fix.map(gateText), needsPerson: person.map(gateText), fixItems: fix, personItems: person };
}
