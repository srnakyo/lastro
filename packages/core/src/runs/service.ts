import { manualCheckSchema, runReportSchema, type Actor, type ManualCheckInput, type RunReportInput } from "@lastro/shared";
import { auditService } from "../audit/service";
import { db, transaction, type Tx } from "../db";
import { recordTransition } from "../lifecycle/record";
import { findRequirement } from "../requirements/service";
import { requireHuman, systemActor } from "../scope/actor";
import { loadScope, type ProjectScope } from "../scope/project-scope";
import { evaluateGate, type GateResult } from "./gate";
import { writeRun } from "./record";

/** The latest result of every stage and condition recorded for a requirement. */
async function latestStages(tx: Tx, requirementId: string) {
  const stages = await tx.runStage.findMany({ where: { requirementId }, orderBy: { startedAt: "desc" }, select: { stage: true, condition: true, status: true, manual: true } });
  const latest = new Map<string, (typeof stages)[number]>();
  for (const s of stages) if (!latest.has(`${s.stage}|${s.condition ?? ""}`)) latest.set(`${s.stage}|${s.condition ?? ""}`, s);
  return [...latest.values()];
}

/** Applies the gate to one requirement after a run: building becomes verified; a failure sends verified back to building. */
async function settle(tx: Tx, scope: ProjectScope, requirement: { id: string; code: string; status: string }, runId: string, tree: string | undefined): Promise<GateResult> {
  const result = await evaluateGate(tx, scope.config, requirement.id, await latestStages(tx, requirement.id));
  const target = { id: requirement.id, code: requirement.code, status: requirement.status as never };
  if (result.pass && (requirement.status === "building" || requirement.status === "reopened")) {
    if (requirement.status === "reopened") await recordTransition(tx, scope, target, "building", systemActor, "verification run");
    await tx.evidence.create({ data: { requirementId: requirement.id, runId, treeHash: tree ?? "" } });
    await recordTransition(tx, scope, target, "verified", systemActor, `run ${runId}`);
  }
  if (!result.pass && requirement.status === "verified") await recordTransition(tx, scope, target, "building", systemActor, "verification failed");
  return result;
}

export const runsService = {
  /** Records a run sent by `lastro verify` and settles the gate of every requirement it covered. */
  async record(projectId: string, actor: Actor, raw: RunReportInput) {
    const report = runReportSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const run = await writeRun(tx, projectId, report);
      const codes = [...new Set(report.stages.map((s) => s.requirement).filter((c): c is string => !!c))];
      const gates: Record<string, GateResult> = {};
      for (const code of codes) {
        const requirement = await findRequirement(tx, projectId, code);
        gates[code] = await settle(tx, scope, requirement, run.id, report.trees[code]);
      }
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "run.record", entity: "run", entityId: run.id, data: { status: run.status } });
      return { runId: run.id, status: run.status, gates };
    }, { timeout: 60_000 });
  },

  /** A person signs a manual stage (a preview, a reconciliation) with the reference of where it was approved. */
  async signManual(projectId: string, actor: Actor, code: string, raw: ManualCheckInput) {
    requireHuman(actor, "signing a manual stage");
    const input = manualCheckSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const requirement = await findRequirement(tx, projectId, code);
      const run = await tx.run.create({ data: { projectId, trigger: "dev", status: input.status === "passed" ? "passed" : "failed", finishedAt: new Date(), durationMs: 0 } });
      await tx.runStage.create({
        data: { runId: run.id, requirementId: requirement.id, stage: input.stage, condition: input.condition ?? null, status: input.status, manual: true, signedBy: actor.id, reference: input.reference },
      });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "stage.sign", entity: "requirement", entityId: code, data: input });
      const last = await tx.evidence.findFirst({ where: { requirementId: requirement.id }, orderBy: { verifiedAt: "desc" } });
      return settle(tx, scope, requirement, run.id, last?.treeHash);
    });
  },

  /**
   * The gate for CI and the stop hook: building items must be verified, and verified items whose
   * touched files changed since their evidence go back to building.
   */
  async gate(projectId: string, trees: Record<string, string>) {
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const items = await tx.requirement.findMany({ where: { projectId, status: { in: ["building", "verified", "reopened"] } }, select: { id: true, code: true, status: true } });
      const results: Record<string, GateResult & { status: string }> = {};
      for (const item of items) {
        const evidence = await tx.evidence.findFirst({ where: { requirementId: item.id }, orderBy: { verifiedAt: "desc" } });
        const tree = trees[item.code];
        if (item.status === "verified" && scope.config.gate.stale_on_change && evidence && tree && evidence.treeHash !== tree) {
          await recordTransition(tx, scope, { ...item, status: "verified" }, "building", systemActor, "stale evidence: touched files changed");
          item.status = "building";
        }
        const result = await evaluateGate(tx, scope.config, item.id, await latestStages(tx, item.id));
        results[item.code] = { ...result, pass: item.status === "verified" && result.pass, status: item.status };
      }
      return { pass: Object.values(results).every((r) => r.pass), requirements: results };
    });
  },

  list(projectId: string, take = 50) {
    return db().run.findMany({
      where: { projectId },
      orderBy: { startedAt: "desc" },
      take,
      include: { stages: { select: { id: true, stage: true, condition: true, status: true, durationMs: true, manual: true, requirement: { select: { code: true } }, _count: { select: { results: true, findings: true } } } } },
    });
  },

  /** One run with every stage, its output, test results and findings, compared with the previous run of the project. */
  async get(projectId: string, id: string) {
    const run = await db().run.findFirstOrThrow({
      where: { projectId, id },
      include: { stages: { orderBy: { startedAt: "asc" }, include: { requirement: { select: { code: true, title: true } }, results: { include: { test: { select: { ref: true } } } }, findings: true } }, evidence: { include: { requirement: { select: { code: true } } } } },
    });
    const previous = await db().run.findFirst({ where: { projectId, startedAt: { lt: run.startedAt } }, orderBy: { startedAt: "desc" }, include: { stages: { include: { results: { include: { test: { select: { ref: true } } } } } } } });
    const before = new Map(previous?.stages.flatMap((s) => s.results.map((r) => [r.test.ref, r.status])) ?? []);
    const now = new Map(run.stages.flatMap((s) => s.results.map((r) => [r.test.ref, r.status])));
    const changed = [...now.entries()].filter(([ref, status]) => before.has(ref) && before.get(ref) !== status).map(([ref, status]) => ({ ref, from: before.get(ref) ?? null, to: status }));
    return { ...run, previousId: previous?.id ?? null, changed };
  },
};
