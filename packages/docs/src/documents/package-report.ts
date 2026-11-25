import type { DocT } from "../i18n";
import { formatDate } from "../i18n";
import { join, quote } from "../md";
import type { DocRequirement, DocsInput } from "../model";
import { header } from "./header";

/** The requester's order: the numbering they used (the quote's label), then where the quote sits in the source. */
function sourceOrder(a: DocRequirement, b: DocRequirement): number {
  const label = (r: DocRequirement) => r.citations[0]?.label ?? null;
  const num = (r: DocRequirement) => {
    const l = label(r);
    const n = l ? Number.parseFloat(l.replace(/[^\d.]/g, "")) : Number.NaN;
    return Number.isNaN(n) ? null : n;
  };
  const na = num(a);
  const nb = num(b);
  if (na !== null && nb !== null && na !== nb) return na - nb;
  return (a.citations[0]?.order ?? 0) - (b.citations[0]?.order ?? 0) || a.code.localeCompare(b.code);
}

function item(r: DocRequirement, input: DocsInput, t: DocT): string {
  const label = r.citations[0]?.label;
  const decisions = input.decisions.filter((d) => d.requirements.includes(r.code) && d.showToClient !== false && d.status !== "overturned");
  return join(
    `## ${label ? `${t("report.item", { label })}: ` : ""}${r.title}`,
    `**${t(`plain.${r.status}` as never)}**`,
    ...r.citations.map((c) => quote(c.quote)),
    r.statement,
    ...decisions.map((d) => `- ${t("report.decided", { text: d.text })}`),
    r.where ? `${t("report.where")}: ${r.where}` : "",
    r.evidence ? `${t("report.evidence")}: ${r.evidence.commit ?? ""}${r.evidenceRun ? ` (run ${r.evidenceRun})` : ""} · ${formatDate(r.evidence.verifiedAt, input.lang)}` : "",
  );
}

/**
 * `lastro report <PKG>` (REQ-D1F4M): one entry per requirement of the package, in the requester's order and
 * numbering, with their literal words, the status in plain language, what was done, the decisions shown to
 * them, where to see it and the evidence. Items with an open question go only under "Awaiting answer".
 */
export function packageReport(input: DocsInput, packageCode: string, t: DocT): string {
  const pkg = input.packages.find((p) => p.code === packageCode);
  const items = input.requirements.filter((r) => r.package === packageCode && r.status !== "dropped").sort(sourceOrder);
  const open = new Set(input.questions.filter((q) => !q.answer).flatMap((q) => q.requirements));
  const awaiting = items.filter((r) => open.has(r.code));
  const awaitingSection = awaiting.map((r) => {
    const questions = input.questions.filter((q) => !q.answer && q.requirements.includes(r.code));
    const label = r.citations[0]?.label;
    return join(`### ${label ? `${t("report.item", { label })}: ` : ""}${r.title}`, ...r.citations.map((c) => quote(c.quote)), questions.map((q) => `- ${q.text}`).join("\n"));
  });
  return join(
    header(input, t, `${t("report.title")} ${packageCode}${pkg ? ` · ${pkg.title}` : ""}`),
    ...items.filter((r) => !open.has(r.code)).map((r) => item(r, input, t)),
    awaiting.length ? `## ${t("report.awaiting")}` : "",
    ...awaitingSection,
  );
}
