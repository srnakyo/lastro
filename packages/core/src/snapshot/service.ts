import { snapshotSchema, type Actor, type SnapshotInput } from "@lastro/shared";
import { auditService } from "../audit/service";
import { db } from "../db";
import { reevaluate } from "../requirements/evaluate";
import { requirementsService } from "../requirements/service";
import { requireHuman } from "../scope/actor";
import { loadScope } from "../scope/project-scope";
import { recheckCitations } from "../sources/recheck";
import { importDecisions, importGlossary, importPackages, importQuestions } from "./import-entities";
import { importSources } from "./import-sources";

export interface ImportReport {
  sources: number;
  requirementsCreated: number;
  requirementsUpdated: number;
  decisions: number;
  questions: number;
}

export const snapshotService = {
  /**
   * Loads a .lastro/ snapshot into a project. Spec content is written; statuses are recomputed by the
   * lifecycle rules, never copied, so an import cannot approve or accept anything on its own.
   */
  async import(projectId: string, actor: Actor, raw: SnapshotInput): Promise<ImportReport> {
    // An import replaces the QA flows and the gate settings: an agent must not be able to loosen its own gate.
    requireHuman(actor, "importing a snapshot");
    const snapshot = snapshotSchema.parse(raw);
    const report: ImportReport = { sources: 0, requirementsCreated: 0, requirementsUpdated: 0, decisions: 0, questions: 0 };
    await db().$transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      await tx.project.update({ where: { id: projectId }, data: { config: snapshot.config, language: snapshot.config.language } });
      scope.config = snapshot.config;
      await importGlossary(tx, scope, snapshot);
      const changed = await importSources(tx, scope, snapshot);
      report.sources = changed.length;
      await importPackages(tx, scope, snapshot);
      for (const sourceId of changed) await recheckCitations(tx, scope, sourceId);
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "snapshot.import", entity: "project", entityId: projectId });
    }, { timeout: 60_000 });
    for (const r of snapshot.requirements) {
      const exists = await db().requirement.findUnique({ where: { projectId_code: { projectId, code: r.code } }, select: { id: true } });
      const { status: _status, code, ...fields } = r;
      if (exists) {
        await requirementsService.update(projectId, actor, code, fields);
        report.requirementsUpdated += 1;
      } else {
        await requirementsService.create(projectId, actor, { ...fields, code });
        report.requirementsCreated += 1;
      }
    }
    await db().$transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      await importDecisions(tx, scope, snapshot);
      await importQuestions(tx, scope, snapshot);
      const ids = await tx.requirement.findMany({ where: { projectId }, select: { id: true } });
      for (const { id } of ids) await reevaluate(tx, scope, id);
    }, { timeout: 60_000 });
    report.decisions = snapshot.decisions.length;
    report.questions = snapshot.questions.length;
    return report;
  },
};
