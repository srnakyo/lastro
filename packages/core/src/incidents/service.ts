import { incidentInputSchema, triageInputSchema, type Actor, type IncidentInput, type TriageInput } from "@lastro/shared";
import { auditService } from "../audit/service";
import { newCode } from "../codes/generate";
import { db, transaction } from "../db";
import { LastroError, notFound } from "../errors";
import { recordTransition } from "../lifecycle/record";
import { findRequirement } from "../requirements/service";
import { requireHuman, systemActor } from "../scope/actor";
import { loadScope } from "../scope/project-scope";

const REOPENABLE = ["verified", "delivered", "accepted"] as const;

export const incidentsService = {
  /** Registers a complaint after delivery. A delivered requirement it points to is reopened. */
  async report(projectId: string, actor: Actor, raw: IncidentInput) {
    const input = incidentInputSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const requirement = input.requirement ? await findRequirement(tx, projectId, input.requirement) : null;
      const exists = async (c: string) => !!(await tx.incident.findUnique({ where: { projectId_code: { projectId, code: c } } }));
      if (input.code && (await exists(input.code))) throw new LastroError("CONFLICT", `${input.code} already exists`);
      const code = input.code ?? (await newCode("INC", exists));
      const incident = await tx.incident.create({
        data: { projectId, code, reported: input.reported, sourceRef: input.sourceRef ?? null, requirementId: requirement?.id ?? null },
      });
      if (requirement && (REOPENABLE as readonly string[]).includes(requirement.status)) {
        await recordTransition(tx, scope, requirement, "reopened", systemActor, `incident ${code}`);
      }
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "incident.report", entity: "incident", entityId: code });
      return incident;
    });
  },

  /** A person classifies the incident: is it a defect, whose cause, and who pays. Bugs need a regression test. */
  async triage(projectId: string, actor: Actor, code: string, raw: TriageInput) {
    requireHuman(actor, "triaging an incident");
    const input = triageInputSchema.parse(raw);
    if (input.triage === "bug" && !input.regressionTest) throw new LastroError("VALIDATION", "a bug needs the regression test that will cover it");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const incident = await tx.incident.findUnique({ where: { projectId_code: { projectId, code } } });
      if (!incident) throw notFound(`incident ${code}`);
      await tx.incident.update({
        where: { id: incident.id },
        data: { triage: input.triage, cause: input.cause, billing: input.billing, regressionTest: input.regressionTest ?? null, triagedAt: new Date() },
      });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "incident.triage", entity: "incident", entityId: code, data: input });
    });
  },

  list(projectId: string) {
    return db().incident.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, include: { requirement: { select: { code: true, title: true } } } });
  },
};
