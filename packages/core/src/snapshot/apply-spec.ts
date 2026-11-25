import type { Actor, Snapshot } from "@lastro/shared";
import { db, transaction } from "../db";
import { createDecision } from "../decisions/service";
import { incidentsService } from "../incidents/service";
import { questionsService } from "../questions/service";
import { requirementIds } from "../requirements/links";
import { requirementsService } from "../requirements/service";
import { loadScope } from "../scope/project-scope";
import { recheckCitations } from "../sources/recheck";
import { importPackages, importTerms } from "./import-entities";
import { importSources } from "./import-sources";
import { specOf, type ImportPlan } from "./plan";

/** Sources, packages and glossary terms, in one transaction; quotes are checked again against new source versions. */
export async function applySources(projectId: string, snapshot: Snapshot) {
  await transaction(async (tx) => {
    const scope = await loadScope(tx, projectId);
    const changed = await importSources(tx, scope, snapshot);
    await importPackages(tx, scope, snapshot);
    await importTerms(tx, scope, snapshot);
    for (const id of changed) await recheckCitations(tx, scope, id);
  }, { timeout: 60_000 });
}

/** New requirements first (without dependencies, which may point at each other), then every changed one. */
export async function applyRequirements(projectId: string, actor: Actor, snapshot: Snapshot, plan: ImportPlan) {
  const byCode = new Map(snapshot.requirements.map((r) => [r.code, r]));
  for (const p of plan.requirements.filter((x) => x.change === "new")) {
    const r = byCode.get(p.code);
    if (r) await requirementsService.create(projectId, actor, { ...specOf(r), code: r.code, dependsOn: [] } as never);
  }
  for (const r of snapshot.requirements) {
    const isNew = plan.requirements.some((x) => x.code === r.code && x.change === "new");
    const updated = plan.requirements.find((x) => x.code === r.code && x.change === "updated");
    if (isNew && r.dependsOn.length) await requirementsService.update(projectId, actor, r.code, { dependsOn: r.dependsOn });
    if (updated) await requirementsService.update(projectId, actor, r.code, specOf(r));
    if (r.touches.length) await db().requirement.update({ where: { projectId_code: { projectId, code: r.code } }, data: { touches: [...new Set(r.touches)].sort() } });
  }
}

/** Decisions, questions and incidents: content and links; their status changes are human actions. */
export async function applyRecords(projectId: string, actor: Actor, snapshot: Snapshot, plan: ImportPlan) {
  const changed = (list: { code: string; change: string }[], code: string, change: string) => list.some((x) => x.code === code && x.change === change);
  for (const d of snapshot.decisions) {
    if (changed(plan.decisions, d.code, "new")) {
      await transaction(async (tx) => {
        const created = await createDecision(tx, await loadScope(tx, projectId), actor, { ...d, showToClient: d.showToClient, requirements: d.requirements });
        // A snapshot keeps who decided; only a person's import may say a person did. The status starts proposed:
        // confirming or overturning is a human action of its own.
        await tx.decision.update({ where: { id: created.id }, data: { status: "proposed", decidedByAgent: actor.type === "user" ? d.decidedByAgent : true } });
      });
    } else if (changed(plan.decisions, d.code, "updated")) {
      await transaction(async (tx) => {
        const linked = await requirementIds(tx, projectId, d.requirements);
        const saved = await tx.decision.update({ where: { projectId_code: { projectId, code: d.code } }, data: { text: d.text, reason: d.reason ?? null, showToClient: d.showToClient } });
        await tx.decisionRequirement.deleteMany({ where: { decisionId: saved.id } });
        if (linked.length) await tx.decisionRequirement.createMany({ data: linked.map((r) => ({ decisionId: saved.id, requirementId: r.id })) });
      });
    }
  }
  for (const q of snapshot.questions) {
    if (changed(plan.questions, q.code, "new")) {
      await questionsService.ask(projectId, actor, { code: q.code, text: q.text, blocks: q.blocks, askedTo: q.askedTo, askedVia: q.askedVia, requirements: q.requirements });
      if (q.askedAt) await db().question.update({ where: { projectId_code: { projectId, code: q.code } }, data: { askedAt: q.askedAt } });
    }
    else if (changed(plan.questions, q.code, "updated")) await db().question.update({ where: { projectId_code: { projectId, code: q.code } }, data: { text: q.text, blocks: q.blocks } });
  }
  for (const i of snapshot.incidents.filter((x) => plan.incidents.includes(x.code))) {
    await incidentsService.report(projectId, actor, { code: i.code, reported: i.reported, sourceRef: i.sourceRef, requirement: i.requirement });
  }
}
