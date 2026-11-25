import { requirementInputSchema, requirementUpdateSchema, type Actor, type RequirementInput, type RequirementStatus, type RequirementUpdate } from "@lastro/shared";
import { auditService } from "../audit/service";
import { newCode } from "../codes/generate";
import { db, transaction, type Tx } from "../db";
import { LastroError, notFound } from "../errors";
import { recordTransition } from "../lifecycle/record";
import { systemActor } from "../scope/actor";
import { loadScope, type ProjectScope } from "../scope/project-scope";
import { resolveCitations } from "./citations";
import { reevaluate } from "./evaluate";
import { graphInclude, loadGraph } from "./graph";
import { toView } from "./view";
import { packageId, replaceCriteria, replaceDependencies, scalarData } from "./write";

const FROZEN: RequirementStatus[] = ["verified", "previewed", "delivered", "accepted", "dropped"];

async function findId(tx: Tx, projectId: string, code: string) {
  const found = await tx.requirement.findUnique({ where: { projectId_code: { projectId, code } }, select: { id: true, code: true, status: true } });
  if (!found) throw notFound(`requirement ${code}`);
  return found;
}

/** A spec change after approval needs a new approval: locks are cleared and the item goes back to specified. */
async function invalidateApproval(tx: Tx, scope: ProjectScope, target: { id: string; code: string; status: RequirementStatus }) {
  if (target.status !== "approved" && target.status !== "building") return;
  await tx.criterion.updateMany({ where: { requirementId: target.id }, data: { lockedHash: null, lockedAt: null, lockedById: null } });
  await recordTransition(tx, scope, target, "specified", systemActor, "spec changed after approval");
}

export const requirementsService = {
  async create(projectId: string, actor: Actor, raw: RequirementInput) {
    const input = requirementInputSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const exists = async (c: string) => !!(await tx.requirement.findUnique({ where: { projectId_code: { projectId, code: c } } }));
      if (input.code && (await exists(input.code))) throw new LastroError("CONFLICT", `${input.code} already exists`);
      const code = input.code ?? (await newCode("REQ", exists));
      const position = await tx.requirement.count({ where: { projectId } });
      const created = await tx.requirement.create({
        data: {
          ...(scalarData(input) as object),
          title: input.title, type: input.type, statement: input.statement,
          projectId, code, position, packageId: await packageId(tx, projectId, input.package),
          citations: { create: await resolveCitations(tx, projectId, input.citations) },
        },
      });
      await replaceCriteria(tx, created.id, input.criteria);
      await replaceDependencies(tx, projectId, created.id, input.dependsOn);
      await tx.stateEvent.create({ data: { projectId, requirementId: created.id, toStatus: "captured", reason: "created", actorType: actor.type, actorId: actor.id } });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "requirement.create", entity: "requirement", entityId: code });
      await reevaluate(tx, scope, created.id);
      return toView(await loadGraph(tx, created.id), scope.config);
    });
  },

  async update(projectId: string, actor: Actor, code: string, raw: RequirementUpdate) {
    const input = requirementUpdateSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const target = await findId(tx, projectId, code);
      if (FROZEN.includes(target.status)) {
        throw new LastroError("INVALID_TRANSITION", `${code} is ${target.status}; report an incident to change what was delivered`);
      }
      await tx.requirement.update({
        where: { id: target.id },
        data: { ...scalarData(input), ...(input.package !== undefined ? { packageId: await packageId(tx, projectId, input.package) } : {}) },
      });
      if (input.citations) {
        await tx.citation.deleteMany({ where: { requirementId: target.id } });
        await tx.citation.createMany({ data: (await resolveCitations(tx, projectId, input.citations)).map((c) => ({ ...c, requirementId: target.id })) });
      }
      if (input.criteria) await replaceCriteria(tx, target.id, input.criteria);
      if (input.dependsOn) await replaceDependencies(tx, projectId, target.id, input.dependsOn);
      await invalidateApproval(tx, scope, target);
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "requirement.update", entity: "requirement", entityId: code, data: { fields: Object.keys(input) } });
      await reevaluate(tx, scope, target.id);
      return toView(await loadGraph(tx, target.id), scope.config);
    });
  },

  async list(projectId: string, filter: { status?: RequirementStatus; packageCode?: string; type?: string } = {}) {
    const scope = await loadScope(db(), projectId);
    const graphs = await db().requirement.findMany({
      where: {
        projectId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.type ? { type: filter.type } : {}),
        ...(filter.packageCode ? { package: { code: filter.packageCode } } : {}),
      },
      include: graphInclude,
      orderBy: { position: "asc" },
    });
    return graphs.map((g) => toView(g, scope.config));
  },

  async get(projectId: string, code: string) {
    const scope = await loadScope(db(), projectId);
    const target = await findId(db(), projectId, code);
    const history = await db().stateEvent.findMany({ where: { requirementId: target.id }, orderBy: { createdAt: "asc" } });
    return { ...toView(await loadGraph(db(), target.id), scope.config), history };
  },
};

export { findId as findRequirement };
