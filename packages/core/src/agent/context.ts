import { db } from "../db";
import { isPending } from "../lifecycle/transitions";
import { requirementsService } from "../requirements/service";
import { loadScope } from "../scope/project-scope";

/**
 * What an agent needs at the start of every session and after every compaction:
 * the requirements it may work on, the ones waiting for its tests, the test rules,
 * the glossary, the invariants, the layout contract, recent decisions and the open questions.
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
  const needTests = views.filter((v) => v.status === "specified" && v.blockers.some((b) => b.kind === "criterion_without_test" || b.kind === "missing_test_level"));
  const { config } = scope;
  return {
    project: scope.key,
    rules: [
      "Write the code only for approved, building or reopened requirements; call lastro_start before changing code for one.",
      config.autonomy === "auto"
        ? "Automatic mode: write and link the tests of every criterion first; Lastro approves the requirement by itself once every criterion has its tests at the levels its type asks."
        : "Review mode: write and link the tests of every criterion first; then a person approves the requirement.",
      "Tests first: run lastro_verify and see the new tests fail before writing the code.",
      "Never assume silently: record a decision (lastro_record_decision) or ask (lastro_ask).",
      "Lastro verifies: run lastro_verify; do not say a requirement is done while its gate is red.",
      "Locked criteria and their tests cannot be edited.",
    ],
    tests: {
      autonomy: config.autonomy,
      redFirst: config.tests.red_first,
      examplesInTests: config.tests.examples_in_tests,
      coverageReport: config.tests.coverage_report ?? null,
      types: Object.fromEntries(Object.entries(config.types).map(([name, t]) => [name, { levels: t.tests.levels, coverage: t.tests.coverage ?? null }])),
    },
    needTests: needTests.map((v) => ({ code: v.code, title: v.title, type: v.type, missing: v.blockers.filter((b) => b.kind === "criterion_without_test" || b.kind === "missing_test_level").map((b) => `${b.kind} ${b.detail}`) })),
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
