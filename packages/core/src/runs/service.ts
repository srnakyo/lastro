import { manualCheckSchema, runReportSchema, type Actor, type ManualCheckInput, type RunReportData, type RunReportInput } from "@lastro/shared";
import { auditService } from "../audit/service";
import { db, transaction, type Tx } from "../db";
import { recordTransition } from "../lifecycle/record";
import { findRequirement } from "../requirements/service";
import { requireHuman, systemActor } from "../scope/actor";
import { loadScope, type ProjectScope } from "../scope/project-scope";
import { evaluateGate, type GateContext, type GateResult } from "./gate";
import { latestCommit, latestStages } from "./latest";
import { linkByName } from "./auto-link";
import { compareWithPrevious } from "./compare";
import { listRuns } from "./list";
import { writeRun } from "./record";

/** Applies the gate to one requirement after a run: building becomes verified; a failure sends verified back to building. */
async function settle(tx: Tx, scope: ProjectScope, requirement: { id: string; code: string; status: string }, runId: string, tree: string | undefined, ctx: GateContext): Promise<GateResult> {
  const result = await evaluateGate(tx, scope.config, requirement.id, await latestStages(tx, requirement.id, ctx.commit), ctx);
  const target = { id: requirement.id, code: requirement.code, status: requirement.status as never };
  // A reopened requirement goes back to building through `start`, by a person or the agent, before it can verify again.
  if (result.pass && requirement.status === "building") {
    await tx.evidence.create({ data: { requirementId: requirement.id, runId, treeHash: tree ?? "" } });
    await recordTransition(tx, scope, target, "verified", systemActor, `run ${runId}`);
  }
  if (!result.pass && requirement.status === "verified") await recordTransition(tx, scope, target, "building", systemActor, "verification failed");
  return result;
}

/** A proof keeps only the results of the criterion it proves: the suite may run other tests, nobody's red. */
async function onlyProvedTests(tx: Tx, projectId: string, report: RunReportData): Promise<RunReportData> {
  if (!report.proof) return report;
  const { requirement, criterion } = report.proof;
  const links = await tx.criterionTest.findMany({ where: { criterion: { code: criterion, requirement: { projectId, code: requirement } } }, select: { testRef: true } });
  const refs = new Set(links.map((l) => l.testRef));
  return { ...report, stages: report.stages.map((s) => ({ ...s, results: s.results.filter((r) => refs.has(r.ref)) })) };
}

export const runsService = {
  /** Records a run sent by `lastro verify` and settles the gate of every requirement it covered. */
  async record(projectId: string, actor: Actor, raw: RunReportInput) {
    const parsed = runReportSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const report = await onlyProvedTests(tx, projectId, parsed);
      const run = await writeRun(tx, projectId, report);
      // Tests named after their criterion link themselves before the gate looks at the criteria.
      const linked = await linkByName(tx, scope, actor, report);
      const codes = [...new Set(report.stages.map((s) => s.requirement).filter((c): c is string => !!c))];
      const gates: Record<string, GateResult> = {};
      // A proof on an earlier commit only records the red of the tests; the requirement's evidence is on its own commit.
      for (const code of report.proof ? [] : codes) {
        const requirement = await findRequirement(tx, projectId, code);
        gates[code] = await settle(tx, scope, requirement, run.id, report.trees[code], { commit: report.commit, testFiles: report.testFiles, testFileLines: report.testFileLines, testBlocks: report.testBlocks });
      }
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: report.proof ? "run.proof" : "run.record", entity: "run", entityId: run.id, data: { status: run.status, ...(report.proof ?? {}) } });
      return { runId: run.id, status: run.status, gates, linked };
    }, { timeout: 60_000 });
  },

  /** A person signs a manual stage (a preview, a reconciliation) with the reference of where it was approved. */
  async signManual(projectId: string, actor: Actor, code: string, raw: ManualCheckInput) {
    requireHuman(actor, "signing a manual stage");
    const input = manualCheckSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const requirement = await findRequirement(tx, projectId, code);
      // The signature belongs to the commit the requirement was last run on.
      const commit = await latestCommit(tx, requirement.id);
      const run = await tx.run.create({ data: { projectId, trigger: "dev", commit, status: input.status === "passed" ? "passed" : "failed", finishedAt: new Date(), durationMs: 0 } });
      await tx.runStage.create({
        data: { runId: run.id, requirementId: requirement.id, stage: input.stage, condition: input.condition ?? null, status: input.status, manual: true, signedBy: actor.id, reference: input.reference },
      });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "stage.sign", entity: "requirement", entityId: code, data: input });
      const last = await tx.evidence.findFirst({ where: { requirementId: requirement.id }, orderBy: { verifiedAt: "desc" } });
      return settle(tx, scope, requirement, run.id, last?.treeHash, { commit });
    });
  },

  /**
   * The gate for CI and the stop hook: building items must be verified, and verified items whose
   * touched files changed since their evidence go back to building.
   */
  async gate(projectId: string, trees: Record<string, string>, ctx: GateContext = {}) {
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const items = await tx.requirement.findMany({ where: { projectId, status: { in: ["building", "verified", "reopened"] } }, select: { id: true, code: true, status: true } });
      const results: Record<string, GateResult & { status: string }> = {};
      for (const item of items) {
        const evidence = await tx.evidence.findFirst({ where: { requirementId: item.id }, orderBy: { verifiedAt: "desc" } });
        const tree = trees[item.code];
        if (item.status === "verified" && scope.config.gate.stale_on_change && evidence && tree && evidence.treeHash !== tree) {
          await recordTransition(tx, scope, { ...item, status: "verified" }, "building", systemActor, "stale evidence");
          item.status = "building";
        }
        // Verified evidence is bound to the tree of the touched files; what is still building must pass on this commit.
        const commit = item.status === "verified" ? undefined : ctx.commit;
        const result = await evaluateGate(tx, scope.config, item.id, await latestStages(tx, item.id, commit), { commit, testFiles: ctx.testFiles, testFileLines: ctx.testFileLines, testBlocks: ctx.testBlocks });
        results[item.code] = { ...result, pass: item.status === "verified" && result.pass, status: item.status };
      }
      return { pass: Object.values(results).every((r) => r.pass), requirements: results };
    });
  },

  list: listRuns,

  /** One run with every stage, its output, results, findings and artifacts, compared per requirement with that requirement's previous run. */
  async get(projectId: string, id: string) {
    const run = await db().run.findFirstOrThrow({
      where: { projectId, id },
      include: {
        stages: { orderBy: { startedAt: "asc" }, include: { requirement: { select: { code: true, title: true } }, results: { include: { test: { select: { ref: true } } } }, findings: true, artifacts: { select: { code: true, kind: true, contentType: true } } } },
        evidence: { include: { requirement: { select: { code: true } } } },
      },
    });
    return { ...run, comparisons: await compareWithPrevious(projectId, run) };
  },
};
