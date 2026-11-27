import { decisionInputSchema, type Actor } from "@lastro/shared";
import { auditService } from "../audit/service";
import { transaction } from "../db";
import { createDecision } from "../decisions/service";
import { notFound } from "../errors";
import { reevaluate } from "../requirements/evaluate";
import { findRequirement } from "../requirements/service";
import { loadScope } from "../scope/project-scope";

/**
 * The agent says a criterion's tests check a behavior that already existed, so they cannot have failed
 * first. Lastro records it as a proposed decision the person sees and may overturn, and the gate stops asking
 * those tests to fail first. Nobody has to break working code to show a red run.
 */
export async function markPreexisting(projectId: string, actor: Actor, requirementCode: string, criterionCode: string, reason: string) {
  return transaction(async (tx) => {
    const scope = await loadScope(tx, projectId);
    const requirement = await findRequirement(tx, projectId, requirementCode);
    const criterion = await tx.criterion.findUnique({ where: { requirementId_code: { requirementId: requirement.id, code: criterionCode } } });
    if (!criterion) throw notFound(`criterion ${criterionCode}`);
    if (criterion.preexistingDecision) return { decision: criterion.preexistingDecision };
    const decision = await createDecision(tx, scope, actor, decisionInputSchema.parse({
      kind: "assumption",
      text: `${requirementCode} ${criterionCode} checks a behavior that already existed, so its tests are not asked to fail first.`,
      reason,
      decidedBy: "dev",
      showToClient: false,
      requirements: [requirementCode],
    }));
    await tx.criterion.update({ where: { id: criterion.id }, data: { preexistingDecision: decision.code } });
    await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "criterion.preexisting", entity: "requirement", entityId: requirementCode, data: { criterion: criterionCode, decision: decision.code, reason } });
    await reevaluate(tx, scope, requirement.id);
    return { decision: decision.code };
  });
}
