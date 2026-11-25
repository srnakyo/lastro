import type { DocT } from "../i18n";
import { formatDate } from "../i18n";
import { join, mermaid, table } from "../md";
import type { DocsInput } from "../model";
import { lifecycleDiagram } from "../diagrams/lifecycle";
import { qaFlowDiagram } from "../diagrams/qa-flow";
import { traceabilityDiagram } from "../diagrams/traceability";
import { header } from "./header";

export function changelogDoc(input: DocsInput, t: DocT): string {
  const rows = [...input.history].sort((a, b) => b.at.getTime() - a.at.getTime()).map((h) => [formatDate(h.at, input.lang), `${h.code} ${h.title}`, `${h.from ?? "—"} → ${h.to}`, h.actor, h.reason]);
  return join(header(input, t, t("changelog.title")), t("changelog.lead"), table([t("col.when"), t("col.code"), t("col.status"), t("col.by"), t("col.why")], rows) || t("none"));
}

export function decisionsDoc(input: DocsInput, t: DocT): string {
  const open = input.questions.filter((q) => !q.answer);
  const answered = input.questions.filter((q) => q.answer);
  return join(
    header(input, t, t("decisions.title")),
    table([t("col.code"), t("col.what"), t("col.why"), t("col.by"), t("col.status"), t("col.requirements")], input.decisions.map((d) => [`${d.code} (${d.kind})`, d.text, d.reason, d.decidedBy, d.status, d.requirements.join(", ")])) || t("none"),
    `## ${t("decisions.open")}`,
    table([t("col.code"), t("col.what"), t("col.by"), t("col.requirements")], open.map((q) => [`${q.code}${q.blocks ? " ⛔" : ""}`, q.text, q.askedTo, q.requirements.join(", ")])) || t("none"),
    `## ${t("decisions.answered")}`,
    table([t("col.code"), t("col.what"), "answer"], answered.map((q) => [q.code, q.text, q.answer])) || t("none"),
  );
}

export function diagramsDoc(input: DocsInput, t: DocT): string {
  const counts: Record<string, number> = {};
  for (const r of input.requirements) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const tests = Object.fromEntries(input.tests.map((x) => [x.ref, x.last ?? ""]));
  return join(
    header(input, t, t("diagrams.title")),
    ...Object.keys(input.config.types).map((type) => `## ${t("diagrams.flow", { type })}\n\n${mermaid(qaFlowDiagram(input.config, type))}`),
    `## ${t("diagrams.trace")}`,
    mermaid(traceabilityDiagram(input.requirements.map((r) => ({ code: r.code, title: r.title, citations: r.citations, criteria: r.criteria })), tests)),
    `## ${t("diagrams.lifecycle")}`,
    mermaid(lifecycleDiagram(LIFECYCLE, counts)),
  );
}

/** The lifecycle edges and who moves them (mirrors the core transitions). */
const LIFECYCLE = [
  ["captured", "specified", "system"], ["specified", "approved", "user"], ["approved", "building", "user agent"], ["building", "verified", "system"],
  ["verified", "building", "system"], ["verified", "previewed", "user"], ["verified", "delivered", "system"], ["previewed", "delivered", "system"],
  ["delivered", "accepted", "user"], ["delivered", "reopened", "system"], ["accepted", "reopened", "system"], ["reopened", "building", "user agent"], ["specified", "dropped", "user"],
].map(([from, to, actors]) => ({ from: from ?? "", to: to ?? "", actors: (actors ?? "").split(" ") }));
