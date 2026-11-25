import type { Actor, Snapshot } from "@lastro/shared";
import type { Tx } from "../db";
import { requirementIds } from "../requirements/links";
import type { ProjectScope } from "../scope/project-scope";

/** Decisions keep the status and authorship recorded in the snapshot. */
export async function importDecisions(tx: Tx, scope: ProjectScope, snapshot: Snapshot) {
  for (const d of snapshot.decisions) {
    const linked = await requirementIds(tx, scope.id, d.requirements);
    const data = {
      kind: d.kind, text: d.text, reason: d.reason ?? null, decidedBy: d.decidedBy, decidedByAgent: d.decidedByAgent,
      status: d.status, showToClient: d.showToClient, sourceRef: d.sourceRef ?? null,
    };
    const saved = await tx.decision.upsert({ where: { projectId_code: { projectId: scope.id, code: d.code } }, create: { projectId: scope.id, code: d.code, ...data }, update: data });
    await tx.decisionRequirement.deleteMany({ where: { decisionId: saved.id } });
    if (linked.length > 0) await tx.decisionRequirement.createMany({ data: linked.map((r) => ({ decisionId: saved.id, requirementId: r.id })) });
  }
}

export async function importQuestions(tx: Tx, scope: ProjectScope, snapshot: Snapshot) {
  for (const q of snapshot.questions) {
    const linked = await requirementIds(tx, scope.id, q.requirements);
    const data = { text: q.text, blocks: q.blocks, askedTo: q.askedTo, askedVia: q.askedVia ?? null, answer: q.answer ?? null, answerSource: q.answerSource ?? null };
    const saved = await tx.question.upsert({ where: { projectId_code: { projectId: scope.id, code: q.code } }, create: { projectId: scope.id, code: q.code, ...data }, update: data });
    await tx.questionRequirement.deleteMany({ where: { questionId: saved.id } });
    if (linked.length > 0) await tx.questionRequirement.createMany({ data: linked.map((r) => ({ questionId: saved.id, requirementId: r.id })) });
  }
}

export async function importGlossary(tx: Tx, scope: ProjectScope, snapshot: Snapshot) {
  for (const t of snapshot.glossary.terms) {
    const data = { means: t.means, note: t.note ?? null };
    await tx.glossaryTerm.upsert({ where: { projectId_term: { projectId: scope.id, term: t.term } }, create: { projectId: scope.id, term: t.term, ...data }, update: data });
  }
  for (const i of snapshot.glossary.invariants) {
    const data = { text: i.text, testRefs: i.testRefs };
    await tx.invariant.upsert({ where: { projectId_code: { projectId: scope.id, code: i.code } }, create: { projectId: scope.id, code: i.code, ...data }, update: data });
  }
}

export async function importPackages(tx: Tx, scope: ProjectScope, snapshot: Snapshot) {
  for (const p of snapshot.packages) {
    const saved = await tx.package.upsert({
      where: { projectId_code: { projectId: scope.id, code: p.code } },
      create: { projectId: scope.id, code: p.code, title: p.title, report: p.report },
      update: { title: p.title, report: p.report },
    });
    const sources = await tx.source.findMany({ where: { projectId: scope.id, code: { in: p.sources } }, select: { id: true } });
    await tx.packageSource.deleteMany({ where: { packageId: saved.id } });
    if (sources.length > 0) await tx.packageSource.createMany({ data: sources.map((s) => ({ packageId: saved.id, sourceId: s.id })) });
  }
}

export type ImportActor = Actor;
