import type { BlockerKind, Hallmark, LinkState, RequirementStatus } from "@lastro/shared";
import { db } from "../db";
import { isPending } from "../lifecycle/transitions";
import { requirementsService } from "../requirements/service";
import type { RequirementView } from "../requirements/view";
import { latestRuns, latestTestResults, totals } from "./tests";

const LINKS = ["origin", "spec", "acceptance", "evidence"] as const;

function moduleOf(view: RequirementView): string {
  const reach = view.reach as { modules?: unknown } | null;
  const first = Array.isArray(reach?.modules) ? reach.modules[0] : undefined;
  return typeof first === "string" ? first : view.type;
}

const covered = (v: RequirementView) => v.criteria.length > 0 && v.criteria.every((c) => c.tests.length > 0);
const backed = (h: Hallmark) => LINKS.every((l) => h[l] === "ok");

function modules(views: RequirementView[]) {
  const groups = new Map<string, RequirementView[]>();
  for (const v of views) groups.set(moduleOf(v), [...(groups.get(moduleOf(v)) ?? []), v]);
  return [...groups.entries()]
    .map(([name, items]) => ({
      name,
      requirements: items.length,
      covered: items.filter(covered).length,
      backed: items.filter((v) => backed(v.hallmark)).length,
      quality: Math.round((items.filter((v) => v.hallmark.evidence === "ok").length / items.length) * 100),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function summarize(views: RequirementView[]) {
  const byStatus: Partial<Record<RequirementStatus, number>> = {};
  const blockers: Partial<Record<BlockerKind, number>> = {};
  const links = Object.fromEntries(LINKS.map((l) => [l, { ok: 0, partial: 0, missing: 0 }])) as Record<(typeof LINKS)[number], Record<LinkState, number>>;
  for (const v of views) {
    byStatus[v.status] = (byStatus[v.status] ?? 0) + 1;
    for (const kind of new Set(v.blockers.map((b) => b.kind))) blockers[kind] = (blockers[kind] ?? 0) + 1;
    for (const l of LINKS) links[l][v.hallmark[l]] += 1;
  }
  return { byStatus, blockers, links };
}

export const overviewService = {
  /** Everything the project overview shows: KPIs, distribution, latest runs, quality per module, what holds items back. */
  async project(projectId: string) {
    const views = (await requirementsService.list(projectId)).filter((v) => v.status !== "dropped");
    const latest = await latestTestResults(projectId);
    const testTotals = totals(latest);
    const pendingCriteria = views.flatMap((v) => v.criteria.filter((c) => c.tests.length === 0)).length;
    const [runs, openQuestions, proposedDecisions, openIncidents] = await Promise.all([
      latestRuns(projectId),
      db().question.count({ where: { projectId, answer: null } }),
      db().decision.count({ where: { projectId, status: "proposed" } }),
      db().incident.count({ where: { projectId, triagedAt: null } }),
    ]);
    return {
      requirements: views.length,
      pending: views.filter((v) => isPending(v.status)).length,
      coverage: views.length === 0 ? 0 : Math.round((views.filter(covered).length / views.length) * 100),
      fullyBacked: views.filter((v) => backed(v.hallmark)).length,
      tests: { ...testTotals, pending: pendingCriteria },
      runs,
      modules: modules(views),
      ...summarize(views),
      openQuestions,
      proposedDecisions,
      openIncidents,
    };
  },

  /** One line per project of a workspace, for the home screen. */
  async workspace(workspaceId: string) {
    const projects = await db().project.findMany({ where: { workspaceId, archivedAt: null }, orderBy: { name: "asc" } });
    return Promise.all(
      projects.map(async (p) => {
        const o = await overviewService.project(p.id);
        const lastRun = o.runs[0] ?? null;
        const gate: "failing" | "passing" | "no_runs" = o.tests.failed > 0 ? "failing" : lastRun ? "passing" : "no_runs";
        return { id: p.id, key: p.key, name: p.name, description: p.description, language: p.language, requirements: o.requirements, pending: o.pending, coverage: o.coverage, tests: o.tests, lastRun, gate };
      }),
    );
  },
};
