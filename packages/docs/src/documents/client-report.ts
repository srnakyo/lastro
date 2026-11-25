import type { DocT } from "../i18n";
import { formatDate } from "../i18n";
import { join, quote } from "../md";
import type { DocRequirement, DocsInput } from "../model";
import { header, isVerified } from "./header";

function item(r: DocRequirement, input: DocsInput, t: DocT): string {
  const decisions = input.decisions.filter((d) => d.requirements.includes(r.code));
  const open = input.questions.filter((q) => !q.answer && q.requirements.includes(r.code));
  return join(
    `## ${r.title}`,
    `**${t(`plain.${r.status}` as never)}**`,
    `### ${t("client.asked")}`,
    ...r.citations.map((c) => quote(c.quote)),
    `### ${t("client.done")}`,
    r.statement,
    decisions.length ? `### ${t("client.decided")}\n\n${decisions.map((d) => `- ${d.text}${d.reason ? ` (${d.reason})` : ""}`).join("\n")}` : "",
    `### ${t("client.verified")}`,
    r.criteria.map((c) => `- ${c.text}`).join("\n"),
    r.evidence ? `${r.evidence.commit ?? ""} · ${formatDate(r.evidence.verifiedAt, input.lang)}` : "",
    open.length ? `### ${t("client.pending")}\n\n${open.map((q) => `- ${q.text}`).join("\n")}` : "",
  );
}

/** For the requester: no internal codes in the headings, their own words first. Only items that matter to them. */
export function clientReportDoc(input: DocsInput, t: DocT): string {
  const items = input.requirements.filter((r) => r.status !== "dropped");
  const ordered = [...items.filter((r) => isVerified(r.status)), ...items.filter((r) => !isVerified(r.status))];
  return join(header(input, t, t("client.title")), t("client.lead"), ...ordered.map((r) => item(r, input, t)));
}
