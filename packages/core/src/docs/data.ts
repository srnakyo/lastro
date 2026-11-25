import { db } from "../db";
import { listRuns } from "../runs/list";
import { testCatalog } from "../runs/tests";
import { requirementsService } from "../requirements/service";
import { loadScope } from "../scope/project-scope";

const moduleOf = (reach: unknown, type: string) => {
  const modules = (reach as { modules?: unknown } | null)?.modules;
  return Array.isArray(modules) && typeof modules[0] === "string" ? modules[0] : type;
};

/** Position of every passage of each source's latest version, by "SRC-X @anchor": the requester's order. */
async function passagePositions(projectId: string) {
  const sources = await db().source.findMany({ where: { projectId }, select: { code: true, versions: { orderBy: { version: "desc" }, take: 1, select: { passages: { select: { anchor: true, position: true } } } } } });
  return new Map(sources.flatMap((s) => (s.versions[0]?.passages ?? []).map((p) => [`${s.code} ${p.anchor}`, p.position] as const)));
}

/** Everything the documents are generated from, read in one place (the shape of @lastro/docs DocsInput). */
export async function docsData(projectId: string, lang?: "en" | "pt-BR", commit?: string | null) {
  const scope = await loadScope(db(), projectId);
  const project = await db().project.findUniqueOrThrow({ where: { id: projectId } });
  const [views, packages, sources, decisions, questions, incidents, terms, invariants, runs, tests, events, design, positions] = await Promise.all([
    requirementsService.list(projectId),
    db().package.findMany({ where: { projectId }, orderBy: { code: "asc" }, include: { requirements: { select: { code: true } } } }),
    db().source.findMany({ where: { projectId }, orderBy: { code: "asc" }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } }),
    db().decision.findMany({ where: { projectId }, orderBy: { createdAt: "asc" }, include: { requirements: { include: { requirement: { select: { code: true } } } } } }),
    db().question.findMany({ where: { projectId }, orderBy: { askedAt: "asc" }, include: { requirements: { include: { requirement: { select: { code: true } } } } } }),
    db().incident.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, include: { requirement: { select: { code: true } } } }),
    db().glossaryTerm.findMany({ where: { projectId }, orderBy: { term: "asc" } }),
    db().invariant.findMany({ where: { projectId }, orderBy: { code: "asc" } }),
    listRuns(projectId, 30),
    testCatalog(projectId),
    db().stateEvent.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 300, include: { requirement: { select: { code: true, title: true } } } }),
    db().designContract.findUnique({ where: { projectId } }),
    passagePositions(projectId),
  ]);
  // The repository's HEAD when the CLI asks; from the dashboard, the commit of the latest run.
  const lastCommit = commit ?? runs[0]?.commit ?? null;
  return {
    generatedAt: new Date(),
    commit: lastCommit,
    lang: lang ?? (scope.config.language === "pt-BR" ? "pt-BR" : "en"),
    project: { key: project.key, name: project.name, description: project.description, repositoryUrl: project.repositoryUrl },
    config: scope.config,
    requirements: views.map((v) => ({
      code: v.code, title: v.title, type: v.type, status: v.status, statement: v.statement, where: v.where, dataSource: v.dataSource, period: v.period, whenMissing: v.whenMissing,
      module: moduleOf(v.reach, v.type), package: v.package?.code ?? null,
      examples: (v.examples as { given: string; expect: string }[] | null) ?? [],
      citations: v.citations.map((c) => ({ source: c.source.code, anchor: c.anchor, quote: c.quote, found: c.found, label: c.label, order: positions.get(`${c.source.code} ${c.passageAnchor ?? c.anchor}`) ?? null })),
      criteria: v.criteria.map((c) => ({ code: c.code, text: c.text, tests: c.tests.map((x) => x.testRef), locked: c.lockedHash !== null })),
      decisions: v.decisions.map((d) => d.decision.code), questions: v.questions.map((q) => q.question.code),
      blockers: v.blockers.map((b) => ({ kind: b.kind, detail: b.detail })),
      evidenceRun: v.evidence[0]?.runId ?? null,
      evidence: v.evidence[0] ? { commit: runs.find((r) => r.id === v.evidence[0]?.runId)?.commit ?? null, verifiedAt: v.evidence[0].verifiedAt } : null,
    })),
    packages: packages.map((p) => ({ code: p.code, title: p.title, requirements: p.requirements.map((r) => r.code) })),
    sources: sources.map((s) => ({ code: s.code, title: s.title, from: s.from, version: s.versions[0]?.version ?? 1, final: s.versions[0]?.final ?? false })),
    decisions: decisions.map((d) => ({ code: d.code, kind: d.kind, text: d.text, reason: d.reason, decidedBy: d.decidedBy, status: d.status, showToClient: d.showToClient, requirements: d.requirements.map((r) => r.requirement.code), createdAt: d.createdAt })),
    questions: questions.map((q) => ({ code: q.code, text: q.text, askedTo: q.askedTo, blocks: q.blocks, answer: q.answer, requirements: q.requirements.map((r) => r.requirement.code) })),
    incidents: incidents.map((i) => ({ code: i.code, reported: i.reported, triage: i.triage, cause: i.cause, billing: i.billing, requirement: i.requirement?.code ?? null, createdAt: i.createdAt })),
    glossary: { terms: terms.map((t) => ({ term: t.term, means: t.means })), invariants: invariants.map((i) => ({ code: i.code, text: i.text, testRefs: i.testRefs })) },
    design: { forbidden: design?.forbidden ?? [], components: (design?.components ?? {}) as Record<string, string>, palette: (design?.palette ?? {}) as Record<string, string> },
    runs: runs.map((r) => ({ id: r.id, commit: r.commit, branch: r.branch, trigger: r.trigger, status: r.status, startedAt: r.startedAt, durationMs: r.durationMs, tests: r.tests })),
    tests: tests.map((t) => ({ ref: t.ref, last: t.last, flaky: t.flaky, orphan: t.orphan, covers: t.covers })),
    history: events.map((e) => ({ code: e.requirement.code, title: e.requirement.title, from: e.fromStatus, to: e.toStatus, at: e.createdAt, actor: e.actorType === "user" ? "person" : e.actorType, reason: e.reason })),
  };
}
