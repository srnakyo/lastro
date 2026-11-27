import { snapshotSchema, type Actor, type SnapshotInput } from "@lastro/shared";
import { auditService } from "../audit/service";
import { transaction } from "../db";
import { reevaluate } from "../requirements/evaluate";
import { loadScope } from "../scope/project-scope";
import { applyHumanActions } from "./apply-human";
import { applyRecords, applyRequirements, applySources } from "./apply-spec";
import { planImport, type HumanAction, type ImportPlan } from "./plan";
import { restoreLockDates } from "./lock-dates";

export interface ImportReport {
  plan: ImportPlan;
  applied: HumanAction[];
  refused: (HumanAction & { reason: string })[];
  dryRun: boolean;
}

export const snapshotService = {
  /**
   * Loads a .lastro/ snapshot into a project through the same services as the API. The spec (sources,
   * requirements, decisions, questions) is applied for anyone; what only a person may do (approve, final
   * source, answers, decision status, QA configuration, invariants, layout contract, triage) is applied only
   * for a person and otherwise returned as refused. With dryRun nothing changes: the plan says what would.
   */
  async import(projectId: string, actor: Actor, raw: SnapshotInput, options: { dryRun?: boolean } = {}): Promise<ImportReport> {
    const snapshot = snapshotSchema.parse(raw);
    const plan = await planImport(projectId, snapshot);
    if (options.dryRun) return { plan, applied: [], refused: actor.type === "user" ? [] : plan.human.filter((a) => a.kind !== "config").map((a) => ({ ...a, reason: "needs a person's token" })), dryRun: true };
    await applySources(projectId, snapshot);
    await applyRequirements(projectId, actor, snapshot, plan);
    await applyRecords(projectId, actor, snapshot, plan);
    const human = await applyHumanActions(projectId, actor, snapshot, plan.human);
    await transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      for (const { id } of await tx.requirement.findMany({ where: { projectId, status: { in: ["captured", "specified"] } }, select: { id: true } })) await reevaluate(tx, scope, id);
      // Lock dates are a person's record: an agent's import cannot move them (red first counts from them).
      if (actor.type === "user") await restoreLockDates(tx, projectId, snapshot);
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "snapshot.import", entity: "project", entityId: projectId, data: { requirements: plan.requirements.length, applied: human.applied.length, refused: human.refused.length } });
    }, { timeout: 60_000 });
    return { plan, ...human, dryRun: false };
  },
};
