import { requirementUpdateSchema, type Snapshot } from "@lastro/shared";
import { db } from "../db";
import { loadGraph } from "../requirements/graph";
import { changedFields } from "../requirements/diff";

/** Something in a snapshot that only a person may do: applied with a person's token, refused and named with an agent's. */
export interface HumanAction {
  kind: "config" | "design" | "invariant" | "source_final" | "answer" | "decision_confirm" | "decision_overturn" | "approve" | "drop" | "triage";
  target: string;
  detail: string;
}

export interface ImportPlan {
  sources: { code: string; change: "new" | "new_version" }[];
  packages: string[];
  terms: string[];
  requirements: { code: string; change: "new" | "updated"; fields: string[] }[];
  decisions: { code: string; change: "new" | "updated" }[];
  questions: { code: string; change: "new" | "updated" }[];
  incidents: string[];
  human: HumanAction[];
}

export const stable = (value: unknown): string =>
  JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b))) : v,
  );

/** The spec fields of a snapshot requirement, as an update. */
export function specOf(r: Snapshot["requirements"][number]) {
  const { status: _s, code: _c, touches: _t, decisions: _d, questions: _q, criteria, ...fields } = r;
  return requirementUpdateSchema.parse({ ...fields, criteria: criteria.map(({ locked: _l, ...c }) => c) });
}

async function planRequirements(projectId: string, snapshot: Snapshot, plan: ImportPlan) {
  for (const r of snapshot.requirements) {
    const row = await db().requirement.findUnique({ where: { projectId_code: { projectId, code: r.code } }, select: { id: true, status: true } });
    if (!row) {
      plan.requirements.push({ code: r.code, change: "new", fields: [] });
      if (r.status === "approved") plan.human.push({ kind: "approve", target: r.code, detail: "approved in the snapshot" });
      continue;
    }
    const fields = changedFields(await loadGraph(db(), row.id), specOf(r));
    if (fields.length) plan.requirements.push({ code: r.code, change: "updated", fields });
    if (r.status === "approved" && ["captured", "specified"].includes(row.status)) plan.human.push({ kind: "approve", target: r.code, detail: `${row.status} → approved` });
    if (r.status === "dropped" && row.status !== "dropped") plan.human.push({ kind: "drop", target: r.code, detail: `${row.status} → dropped` });
  }
}

async function planKnowledge(projectId: string, snapshot: Snapshot, plan: ImportPlan) {
  const project = await db().project.findUniqueOrThrow({ where: { id: projectId }, select: { config: true } });
  if (stable(project.config) !== stable(snapshot.config)) plan.human.push({ kind: "config", target: "lastro.yml", detail: "QA flows, conditions, commands or gate" });
  const design = await db().designContract.findUnique({ where: { projectId } });
  const now = { components: design?.components ?? {}, forbidden: design?.forbidden ?? [], palette: design?.palette ?? {}, referenceScreens: design?.referenceScreens ?? [] };
  if (stable(now) !== stable(snapshot.design)) plan.human.push({ kind: "design", target: "design.yml", detail: "layout contract" });
  for (const t of snapshot.glossary.terms) {
    const row = await db().glossaryTerm.findUnique({ where: { projectId_term: { projectId, term: t.term } } });
    if (!row || row.means !== t.means || (row.note ?? undefined) !== t.note) plan.terms.push(t.term);
  }
  for (const i of snapshot.glossary.invariants) {
    const row = await db().invariant.findUnique({ where: { projectId_code: { projectId, code: i.code } } });
    if (!row || row.text !== i.text || stable(row.testRefs) !== stable(i.testRefs)) plan.human.push({ kind: "invariant", target: i.code, detail: row ? "changed" : "new" });
  }
}

async function planSources(projectId: string, snapshot: Snapshot, plan: ImportPlan) {
  for (const s of snapshot.sources) {
    const source = await db().source.findUnique({ where: { projectId_code: { projectId, code: s.code } }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
    const last = source?.versions[0];
    if (!source) plan.sources.push({ code: s.code, change: "new" });
    else if (last?.hash !== s.hash) plan.sources.push({ code: s.code, change: "new_version" });
    if (s.final && !(last?.hash === s.hash && last.final)) plan.human.push({ kind: "source_final", target: s.code, detail: "marked final" });
  }
  for (const p of snapshot.packages) {
    const row = await db().package.findUnique({ where: { projectId_code: { projectId, code: p.code } }, include: { sources: { include: { source: { select: { code: true } } } } } });
    if (!row || row.title !== p.title || row.report !== p.report || stable(row.sources.map((x) => x.source.code).sort()) !== stable([...p.sources].sort())) plan.packages.push(p.code);
  }
}

async function planDecisionsAndQuestions(projectId: string, snapshot: Snapshot, plan: ImportPlan) {
  for (const d of snapshot.decisions) {
    const row = await db().decision.findUnique({ where: { projectId_code: { projectId, code: d.code } } });
    const status = row?.status ?? "proposed";
    if (!row) plan.decisions.push({ code: d.code, change: "new" });
    else if (row.text !== d.text || (row.reason ?? undefined) !== d.reason || row.showToClient !== d.showToClient) plan.decisions.push({ code: d.code, change: "updated" });
    if (d.status !== status && d.status !== "proposed") plan.human.push({ kind: d.status === "confirmed" ? "decision_confirm" : "decision_overturn", target: d.code, detail: `${status} → ${d.status}` });
  }
  for (const q of snapshot.questions) {
    const row = await db().question.findUnique({ where: { projectId_code: { projectId, code: q.code } } });
    if (!row) plan.questions.push({ code: q.code, change: "new" });
    else if (row.text !== q.text || row.blocks !== q.blocks) plan.questions.push({ code: q.code, change: "updated" });
    if (q.answer && !row?.answer) plan.human.push({ kind: "answer", target: q.code, detail: q.answerSource ? `answered (${q.answerSource})` : "answered" });
  }
  for (const i of snapshot.incidents) {
    const row = await db().incident.findUnique({ where: { projectId_code: { projectId, code: i.code } } });
    if (!row) plan.incidents.push(i.code);
    if (i.triage && !row?.triage) plan.human.push({ kind: "triage", target: i.code, detail: `${i.triage}, ${i.cause ?? "?"}, ${i.billing ?? "?"}` });
  }
}

/** What an import would change, and which of those changes are a person's to make. Reads only. */
export async function planImport(projectId: string, snapshot: Snapshot): Promise<ImportPlan> {
  const plan: ImportPlan = { sources: [], packages: [], terms: [], requirements: [], decisions: [], questions: [], incidents: [], human: [] };
  await planKnowledge(projectId, snapshot, plan);
  await planSources(projectId, snapshot, plan);
  await planRequirements(projectId, snapshot, plan);
  await planDecisionsAndQuestions(projectId, snapshot, plan);
  return plan;
}
