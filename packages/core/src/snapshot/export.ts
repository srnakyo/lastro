import type { Snapshot } from "@lastro/shared";
import { projectConfigSchema } from "@lastro/shared";
import { db } from "../db";
import { requirementsService } from "../requirements/service";

/** Builds the snapshot of a project as it is in the database: the content of a .lastro/ export. */
export async function exportSnapshot(projectId: string): Promise<Snapshot> {
  const project = await db().project.findUniqueOrThrow({ where: { id: projectId } });
  const [terms, invariants, sources, packages, decisions, questions, requirements] = await Promise.all([
    db().glossaryTerm.findMany({ where: { projectId }, orderBy: { term: "asc" } }),
    db().invariant.findMany({ where: { projectId }, orderBy: { code: "asc" } }),
    db().source.findMany({ where: { projectId }, orderBy: { code: "asc" }, include: { versions: { orderBy: { version: "desc" }, take: 1, include: { passages: { orderBy: { position: "asc" } } } } } }),
    db().package.findMany({ where: { projectId }, orderBy: { code: "asc" }, include: { sources: { include: { source: { select: { code: true } } } } } }),
    db().decision.findMany({ where: { projectId }, orderBy: { code: "asc" }, include: { requirements: { include: { requirement: { select: { code: true } } } } } }),
    db().question.findMany({ where: { projectId }, orderBy: { code: "asc" }, include: { requirements: { include: { requirement: { select: { code: true } } } } } }),
    requirementsService.list(projectId),
  ]);
  return {
    config: projectConfigSchema.parse(project.config),
    glossary: {
      terms: terms.map((t) => ({ term: t.term, means: t.means, ...(t.note ? { note: t.note } : {}) })),
      invariants: invariants.map((i) => ({ code: i.code, text: i.text, testRefs: i.testRefs })),
    },
    sources: sources.flatMap((s) => {
      const v = s.versions[0];
      if (!v) return [];
      return [{
        code: s.code, kind: s.kind, title: s.title, from: s.from, receivedAt: s.receivedAt, final: v.final, machineTranscript: s.machineTranscript,
        ...(v.path ? { path: v.path } : {}), hash: v.hash,
        passages: v.passages.map((p) => ({ anchor: p.anchor, ...(p.heading ? { heading: p.heading } : {}), text: p.text })),
      }];
    }),
    packages: packages.map((p) => ({ code: p.code, title: p.title, sources: p.sources.map((s) => s.source.code), report: p.report })),
    requirements: requirements.map((r) => ({
      code: r.code, status: r.status, title: r.title, type: r.type, statement: r.statement, package: r.package?.code,
      where: r.where ?? undefined, who: (r.who as never) ?? undefined, dataSource: r.dataSource ?? undefined, period: r.period ?? undefined,
      reach: (r.reach as never) ?? undefined, whenMissing: r.whenMissing ?? undefined, examples: r.examples as never, visualRefs: r.visualRefs, dependsOn: [],
      citations: r.citations.map((c) => ({ source: c.source.code, anchor: c.anchor, ...(c.label ? { label: c.label } : {}), quote: c.quote })),
      criteria: r.criteria.map((c) => ({ code: c.code, text: c.text, tests: c.tests.map((t) => t.testRef) })),
    })),
    decisions: decisions.map((d) => ({
      code: d.code, kind: d.kind, text: d.text, ...(d.reason ? { reason: d.reason } : {}), decidedBy: d.decidedBy, decidedByAgent: d.decidedByAgent,
      status: d.status, showToClient: d.showToClient, ...(d.sourceRef ? { sourceRef: d.sourceRef } : {}), requirements: d.requirements.map((r) => r.requirement.code),
    })),
    questions: questions.map((q) => ({
      code: q.code, text: q.text, blocks: q.blocks, askedTo: q.askedTo, ...(q.askedVia ? { askedVia: q.askedVia } : {}),
      answer: q.answer, answerSource: q.answerSource, requirements: q.requirements.map((r) => r.requirement.code),
    })),
  };
}
