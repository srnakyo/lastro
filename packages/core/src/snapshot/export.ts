import type { Snapshot } from "@lastro/shared";
import { projectConfigSchema } from "@lastro/shared";
import { db } from "../db";
import { requirementsService } from "../requirements/service";
import type { RequirementView } from "../requirements/view";

const sorted = (codes: string[]) => [...codes].sort();
const opt = <T>(v: T | null | undefined) => v ?? undefined;

function requirement(r: RequirementView): Snapshot["requirements"][number] {
  return {
    code: r.code, status: r.status, title: r.title, type: r.type, statement: r.statement, package: r.package?.code,
    where: opt(r.where), who: opt(r.who) as never, dataSource: opt(r.dataSource), period: opt(r.period),
    reach: opt(r.reach) as never, whenMissing: opt(r.whenMissing), examples: r.examples as never, visualRefs: r.visualRefs,
    dependsOn: sorted(r.dependsOn.map((d) => d.dependsOn.code)),
    touches: [...r.touches].sort(),
    decisions: sorted(r.decisions.map((d) => d.decision.code)),
    questions: sorted(r.questions.map((q) => q.question.code)),
    citations: r.citations.map((c) => ({ source: c.source.code, anchor: c.anchor, ...(c.label ? { label: c.label } : {}), quote: c.quote })),
    criteria: r.criteria.map((c) => ({ code: c.code, text: c.text, tests: c.tests.map((t) => t.testRef), locked: c.lockedHash, lockedAt: c.lockedAt?.toISOString() ?? null })),
  };
}

async function load(projectId: string) {
  return Promise.all([
    db().project.findUniqueOrThrow({ where: { id: projectId } }),
    db().glossaryTerm.findMany({ where: { projectId }, orderBy: { term: "asc" } }),
    db().invariant.findMany({ where: { projectId }, orderBy: { code: "asc" } }),
    db().source.findMany({ where: { projectId }, orderBy: { code: "asc" }, include: { versions: { orderBy: { version: "desc" }, take: 1, include: { passages: { orderBy: { position: "asc" } } } } } }),
    db().package.findMany({ where: { projectId }, orderBy: { code: "asc" }, include: { sources: { include: { source: { select: { code: true } } } } } }),
    db().decision.findMany({ where: { projectId }, orderBy: { code: "asc" }, include: { requirements: { include: { requirement: { select: { code: true } } } } } }),
    db().question.findMany({ where: { projectId }, orderBy: { code: "asc" }, include: { decision: { select: { code: true } }, requirements: { include: { requirement: { select: { code: true } } } } } }),
    db().incident.findMany({ where: { projectId }, orderBy: { code: "asc" }, include: { requirement: { select: { code: true } } } }),
    db().designContract.findUnique({ where: { projectId } }),
    requirementsService.list(projectId),
  ]);
}

/** Builds the snapshot of a project as it is in the database: the content of a .lastro/ export, in a fixed order. */
export async function exportSnapshot(projectId: string): Promise<Snapshot> {
  const [project, terms, invariants, sources, packages, decisions, questions, incidents, design, requirements] = await load(projectId);
  return {
    config: projectConfigSchema.parse(project.config),
    glossary: {
      terms: terms.map((t) => ({ term: t.term, means: t.means, ...(t.note ? { note: t.note } : {}) })),
      invariants: invariants.map((i) => ({ code: i.code, text: i.text, testRefs: i.testRefs })),
    },
    design: {
      components: (design?.components ?? {}) as Record<string, string>, forbidden: design?.forbidden ?? [],
      palette: (design?.palette ?? {}) as Record<string, string>, referenceScreens: design?.referenceScreens ?? [],
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
    packages: packages.map((p) => ({ code: p.code, title: p.title, sources: sorted(p.sources.map((s) => s.source.code)), report: p.report })),
    requirements: [...requirements].sort((a, b) => a.code.localeCompare(b.code)).map(requirement),
    decisions: decisions.map((d) => ({
      code: d.code, kind: d.kind, text: d.text, ...(d.reason ? { reason: d.reason } : {}), decidedBy: d.decidedBy, decidedByAgent: d.decidedByAgent,
      status: d.status, showToClient: d.showToClient, ...(d.sourceRef ? { sourceRef: d.sourceRef } : {}), requirements: sorted(d.requirements.map((r) => r.requirement.code)),
    })),
    questions: questions.map((q) => ({
      code: q.code, text: q.text, blocks: q.blocks, askedTo: q.askedTo, ...(q.askedVia ? { askedVia: q.askedVia } : {}), askedAt: q.askedAt,
      answer: q.answer, answerSource: q.answerSource, ...(q.decision ? { decision: q.decision.code } : {}), requirements: sorted(q.requirements.map((r) => r.requirement.code)),
    })),
    incidents: incidents.map((i) => ({
      code: i.code, reported: i.reported, sourceRef: opt(i.sourceRef), requirement: opt(i.requirement?.code),
      triage: opt(i.triage), cause: opt(i.cause), billing: opt(i.billing), regressionTest: opt(i.regressionTest),
    })),
  };
}
