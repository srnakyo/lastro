import type { Actor } from "@lastro/shared";
import { auditService } from "../audit/service";
import { transaction, type Tx } from "../db";
import { notFound } from "../errors";
import { criterionHash } from "../lifecycle/lock";
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
  /**
   * Links a test ("file::test name") to a criterion. On a locked criterion one more test only makes it stricter:
   * Lastro seals the lock again with it. Changing the text or removing a test still needs a person's unlock.
   */
  async linkTest(projectId: string, actor: Actor, requirementCode: string, criterionCode: string, testRef: string) {
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const requirement = await findRequirement(tx, projectId, requirementCode);
      const criterion = await findCriterion(tx, requirement.id, criterionCode);
      // Linking a test that is already linked changes nothing, so a locked criterion lets it through.
      if (await tx.criterionTest.findUnique({ where: { criterionId_testRef: { criterionId: criterion.id, testRef } } })) return;
      await tx.criterionTest.create({ data: { criterionId: criterion.id, testRef } });
      const resealed = criterion.lockedHash !== null;
      if (resealed) {
        const tests = (await tx.criterionTest.findMany({ where: { criterionId: criterion.id }, select: { testRef: true } })).map((t) => t.testRef);
        await tx.criterion.update({ where: { id: criterion.id }, data: { lockedHash: await criterionHash(criterion.text, tests) } });
      }
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "criterion.link_test", entity: "requirement", entityId: requirementCode, data: { criterion: criterionCode, testRef, ...(resealed ? { resealed: true } : {}) } });
      // The last missing test may be the one that lets the requirement be approved.
      await reevaluate(tx, scope, requirement.id);
    });
  },

  /** Unlocking criteria sends an approved requirement back to specified: it needs a new approval. */
  async unlock(projectId: string, actor: Actor, requirementCode: string) {
    requireHuman(actor, "unlocking acceptance criteria");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const requirement = await findRequirement(tx, projectId, requirementCode);
      await tx.criterion.updateMany({ where: { requirementId: requirement.id }, data: { lockedHash: null, lockedAt: null, lockedById: null } });
      // The sealed test files go too: the next approval seals them again on the first run.
      await tx.criterionTest.updateMany({ where: { criterion: { requirementId: requirement.id } }, data: { lockedHash: null } });
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
