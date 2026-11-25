import type { Actor } from "@lastro/shared";
import { auditService } from "../audit/service";
import { transaction, type Tx } from "../db";
import { LastroError, notFound } from "../errors";
import { recordTransition } from "../lifecycle/record";
import { reevaluate } from "../requirements/evaluate";
import { findRequirement } from "../requirements/service";
import { requireHuman, systemActor } from "../scope/actor";
import { loadScope } from "../scope/project-scope";

async function findCriterion(tx: Tx, requirementId: string, code: string) {
  const criterion = await tx.criterion.findUnique({ where: { requirementId_code: { requirementId, code } } });
  if (!criterion) throw notFound(`criterion ${code}`);
  return criterion;
}

export const criteriaService = {
  /** Links a test ("file::test name") to a criterion. Locked criteria refuse it until a person unlocks them. */
  async linkTest(projectId: string, actor: Actor, requirementCode: string, criterionCode: string, testRef: string) {
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const requirement = await findRequirement(tx, projectId, requirementCode);
      const criterion = await findCriterion(tx, requirement.id, criterionCode);
      if (criterion.lockedHash) throw new LastroError("HUMAN_ONLY", `${requirementCode} ${criterionCode} is locked; a person must unlock it`);
      await tx.criterionTest.upsert({
        where: { criterionId_testRef: { criterionId: criterion.id, testRef } },
        create: { criterionId: criterion.id, testRef },
        update: {},
      });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "criterion.link_test", entity: "requirement", entityId: requirementCode, data: { criterion: criterionCode, testRef } });
    });
  },

  /** Unlocking criteria sends an approved requirement back to specified: it needs a new approval. */
  async unlock(projectId: string, actor: Actor, requirementCode: string) {
    requireHuman(actor, "unlocking acceptance criteria");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const requirement = await findRequirement(tx, projectId, requirementCode);
      await tx.criterion.updateMany({ where: { requirementId: requirement.id }, data: { lockedHash: null, lockedAt: null, lockedById: null } });
      if (requirement.status === "approved" || requirement.status === "building") {
        await recordTransition(tx, scope, requirement, "specified", systemActor, "criteria unlocked");
      }
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "criterion.unlock", entity: "requirement", entityId: requirementCode });
    });
  },

  /** A person confirms that a quote taken from a machine transcript says what was said. */
  async confirmQuote(projectId: string, actor: Actor, requirementCode: string, position: number) {
    requireHuman(actor, "confirming a transcribed quote");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const requirement = await findRequirement(tx, projectId, requirementCode);
      const updated = await tx.citation.updateMany({ where: { requirementId: requirement.id, position }, data: { confirmed: true } });
      if (updated.count === 0) throw notFound(`citation ${position} of ${requirementCode}`);
      await reevaluate(tx, scope, requirement.id);
    });
  },
};
