import { db } from "../db";
import { isPending } from "../lifecycle/transitions";
import { requirementsService } from "../requirements/service";
import { loadScope } from "../scope/project-scope";

/**
 * What an agent needs at the start of every session and after every compaction:
 * the requirements it may work on, the glossary, the invariants, the layout contract,
 * recent decisions and the open questions.
 */
export async function agentContext(projectId: string) {
  const scope = await loadScope(db(), projectId);
  const [views, terms, invariants, design, decisions, questions] = await Promise.all([
    requirementsService.list(projectId),
    db().glossaryTerm.findMany({ where: { projectId }, orderBy: { term: "asc" } }),
    db().invariant.findMany({ where: { projectId }, orderBy: { code: "asc" } }),
    db().designContract.findUnique({ where: { projectId } }),
    db().decision.findMany({ where: { projectId }, orderBy: { updatedAt: "desc" }, take: 15 }),
    db().question.findMany({ where: { projectId, answer: null }, orderBy: { askedAt: "asc" } }),
  ]);
  const active = views.filter((v) => ["approved", "building", "reopened"].includes(v.status));
  return {
    project: scope.key,
    rules: [
      "Work only on approved, building or reopened requirements; call lastro_start before changing code for one.",
      "Never assume silently: record a decision (lastro_record_decision) or ask (lastro_ask).",
      "Lastro verifies: run lastro_verify; do not say a requirement is done while its gate is red.",
      "Locked criteria and their tests cannot be edited.",
    ],
    active: active.map((v) => ({
      code: v.code, title: v.title, status: v.status, type: v.type, statement: v.statement, where: v.where,
      criteria: v.criteria.map((c) => ({ code: c.code, text: c.text, tests: c.tests.map((t) => t.testRef), locked: c.lockedHash !== null })),
      blockers: v.blockers,
    })),
    pending: views.filter((v) => isPending(v.status)).map((v) => ({ code: v.code, title: v.title, status: v.status })),
    glossary: terms.map((t) => ({ term: t.term, means: t.means, note: t.note })),
    invariants: invariants.map((i) => ({ code: i.code, text: i.text, tests: i.testRefs })),
    design: design ? { components: design.components, forbidden: design.forbidden, palette: design.palette } : null,
    decisions: decisions.map((d) => ({ code: d.code, text: d.text, status: d.status, kind: d.kind })),
    openQuestions: questions.map((q) => ({ code: q.code, text: q.text, blocks: q.blocks })),
  };
}
