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
  if (actor.type === "agent" && input.madeBy === "person" && !input.sourceRef) {
    throw new LastroError("VALIDATION", "a decision the person made needs sourceRef: where they said it");
  }
  const code = input.code ?? (await newCode("DEC", exists));
  const linked = await requirementIds(tx, scope.id, input.requirements);
  const decision = await tx.decision.create({
    data: {
      projectId: scope.id, code, kind: input.kind, text: input.text, reason: input.reason ?? null,
      decidedBy: input.decidedBy, decidedByAgent: actor.type === "agent" && input.madeBy !== "person",
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

  /**
   * A person confirms decisions, one or many at once. `mine` says the person made them: what the agent wrote
   * down as its own choice becomes the person's.
   */
  async confirm(projectId: string, actor: Actor, codes: string | string[], options: { mine?: boolean } = {}) {
    requireHuman(actor, "confirming a decision");
    const list = Array.isArray(codes) ? codes : [codes];
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      for (const code of list) {
        await findDecision(tx, projectId, code);
        await tx.decision.update({ where: { projectId_code: { projectId, code } }, data: { status: "confirmed", ...(options.mine ? { decidedByAgent: false } : {}) } });
        await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "decision.confirm", entity: "decision", entityId: code, data: options.mine ? { mine: true } : {} });
      }
    });
  },

  /**
   * A person says a decision repeats another: its requirements and answered questions move to the original,
   * and the repeat goes away. Nothing reopens, since the original still stands.
   */
  async merge(projectId: string, actor: Actor, code: string, into: string) {
    requireHuman(actor, "merging decisions");
    if (code === into) throw new LastroError("VALIDATION", "a decision cannot repeat itself");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const repeat = await findDecision(tx, projectId, code);
      const original = await findDecision(tx, projectId, into);
      const linked = new Set(original.requirements.map((r) => r.requirementId));
      const moved = repeat.requirements.filter((r) => !linked.has(r.requirementId));
      if (moved.length) await tx.decisionRequirement.createMany({ data: moved.map((r) => ({ decisionId: original.id, requirementId: r.requirementId })) });
      await tx.question.updateMany({ where: { decisionId: repeat.id }, data: { decisionId: original.id } });
      await tx.decision.delete({ where: { id: repeat.id } });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "decision.merge", entity: "decision", entityId: code, data: { into, text: repeat.text } });
    });
  },

  /** Overturning a decision reopens what was built on it. */
  async overturn(projectId: string, actor: Actor, code: string, reason: string) {
    requireHuman(actor, "overturning a decision");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const decision = await findDecision(tx, projectId, code);
      await tx.decision.update({ where: { id: decision.id }, data: { status: "overturned" } });
      // A behavior the person says did not exist yet: its tests must have failed first again.
      await tx.criterion.updateMany({ where: { preexistingDecision: code, requirement: { projectId } }, data: { preexistingDecision: null } });
      for (const { requirement } of decision.requirements) {
        const target = { id: requirement.id, code: requirement.code, status: requirement.status };
        if (target.status === "verified") await recordTransition(tx, scope, target, "building", systemActor, "decision overturned");
        if (target.status === "delivered" || target.status === "accepted") await recordTransition(tx, scope, target, "reopened", systemActor, "decision overturned");
      }
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "decision.overturn", entity: "decision", entityId: code, data: { reason } });
    });
  },

  list(projectId: string) {
    return db().decision.findMany({ where: { projectId }, orderBy: { createdAt: "asc" }, include: { requirements: { include: { requirement: { select: { code: true, title: true, status: true } } } } } });
  },
};
