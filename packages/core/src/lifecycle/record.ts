import type { Actor, RequirementStatus } from "@lastro/shared";
import { auditService } from "../audit/service";
import type { Tx } from "../db";
import { LastroError } from "../errors";
import type { ProjectScope } from "../scope/project-scope";
import { allowedActors } from "./transitions";

export interface TransitionTarget {
  id: string;
  code: string;
  status: RequirementStatus;
}

/** Moves a requirement along one lifecycle edge, refusing edges the actor may not take. */
export async function recordTransition(
  tx: Tx,
  scope: ProjectScope,
  requirement: TransitionTarget,
  to: RequirementStatus,
  actor: Actor,
  reason: string | null,
) {
  if (requirement.status === to) return;
  const allowed = allowedActors(requirement.status, to);
  if (!allowed.includes(actor.type)) {
    throw new LastroError("INVALID_TRANSITION", `${requirement.code}: ${requirement.status} → ${to} is not allowed for ${actor.type}`);
  }
  await tx.requirement.update({ where: { id: requirement.id }, data: { status: to } });
  await tx.stateEvent.create({
    data: { projectId: scope.id, requirementId: requirement.id, fromStatus: requirement.status, toStatus: to, reason, actorType: actor.type, actorId: actor.id },
  });
  await auditService.record(tx, {
    workspaceId: scope.workspaceId,
    projectId: scope.id,
    actor,
    action: "requirement.transition",
    entity: "requirement",
    entityId: requirement.code,
    data: { from: requirement.status, to, reason },
  });
  requirement.status = to;
}
