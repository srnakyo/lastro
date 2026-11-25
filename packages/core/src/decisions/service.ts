import { decisionInputSchema, type Actor, type DecisionData, type DecisionInput } from "@lastro/shared";
import { auditService } from "../audit/service";
import { newCode } from "../codes/generate";
import { db, transaction, type Tx } from "../db";
import { LastroError, notFound } from "../errors";
import { recordTransition } from "../lifecycle/record";
import { requirementIds } from "../requirements/links";
import { requireHuman, systemActor } from "../scope/actor";
import { loadScope, type ProjectScope } from "../scope/project-scope";

/** Records a decision inside an existing transaction (also used when a question is answered). */
export async function createDecision(tx: Tx, scope: ProjectScope, actor: Actor, input: DecisionData) {
  const exists = async (c: string) => !!(await tx.decision.findUnique({ where: { projectId_code: { projectId: scope.id, code: c } } }));
  if (input.code && (await exists(input.code))) throw new LastroError("CONFLICT", `${input.code} already exists`);
  const code = input.code ?? (await newCode("DEC", exists));
  const linked = await requirementIds(tx, scope.id, input.requirements);
  const decision = await tx.decision.create({
    data: {
      projectId: scope.id, code, kind: input.kind, text: input.text, reason: input.reason ?? null,
      decidedBy: input.decidedBy, decidedByAgent: actor.type === "agent",
      status: actor.type === "user" && input.kind !== "assumption" ? "confirmed" : "proposed",
      showToClient: input.showToClient, sourceRef: input.sourceRef ?? null,
      requirements: { create: linked.map((r) => ({ requirementId: r.id })) },
    },
  });
  await auditService.record(tx, { workspaceId: scope.workspaceId, projectId: scope.id, actor, action: "decision.create", entity: "decision", entityId: code });
  return decision;
}

async function findDecision(tx: Tx, projectId: string, code: string) {
  const decision = await tx.decision.findUnique({ relationLoadStrategy: "join", where: { projectId_code: { projectId, code } }, include: { requirements: { include: { requirement: true } } } });
  if (!decision) throw notFound(`decision ${code}`);
  return decision;
}

export const decisionsService = {
  async record(projectId: string, actor: Actor, raw: DecisionInput) {
    const input = decisionInputSchema.parse(raw);
    return transaction(async (tx) => createDecision(tx, await loadScope(tx, projectId), actor, input));
  },

  async confirm(projectId: string, actor: Actor, code: string) {
    requireHuman(actor, "confirming a decision");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      await findDecision(tx, projectId, code);
      await tx.decision.update({ where: { projectId_code: { projectId, code } }, data: { status: "confirmed" } });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "decision.confirm", entity: "decision", entityId: code });
    });
  },

  /** Overturning a decision reopens what was built on it. */
  async overturn(projectId: string, actor: Actor, code: string, reason: string) {
    requireHuman(actor, "overturning a decision");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const decision = await findDecision(tx, projectId, code);
      await tx.decision.update({ where: { id: decision.id }, data: { status: "overturned" } });
      for (const { requirement } of decision.requirements) {
        const target = { id: requirement.id, code: requirement.code, status: requirement.status };
        if (target.status === "verified") await recordTransition(tx, scope, target, "building", systemActor, `decision ${code} overturned`);
        if (target.status === "delivered" || target.status === "accepted") await recordTransition(tx, scope, target, "reopened", systemActor, `decision ${code} overturned`);
      }
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "decision.overturn", entity: "decision", entityId: code, data: { reason } });
    });
  },

  list(projectId: string) {
    return db().decision.findMany({ where: { projectId }, orderBy: { createdAt: "asc" }, include: { requirements: { include: { requirement: { select: { code: true } } } } } });
  },
};
