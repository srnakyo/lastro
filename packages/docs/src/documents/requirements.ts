import type { DocT } from "../i18n";
import { formatDate } from "../i18n";
import { join, quote, table } from "../md";
import type { DocRequirement, DocsInput } from "../model";
import { header } from "./header";

function requirement(r: DocRequirement, input: DocsInput, t: DocT): string {
  const fields = [["where", r.where], ["data_source", r.dataSource], ["period", r.period], ["when_missing", r.whenMissing]].filter(([, v]) => v);
  return join(
    `## ${r.code}: ${r.title}`,
    `\`${r.type}\` · **${r.status}** · ${r.module}${r.package ? ` · ${r.package}` : ""}`,
    `### ${t("req.request")}`,
    ...r.citations.map((c) => `${quote(c.quote)}\n\n${c.source} \`${c.anchor}\`${c.found ? "" : " ⚠"}`),
    `### ${t("req.does")}`,
    r.statement,
    fields.length ? table(["", ""], fields.map(([k, v]) => [k ?? "", v ?? ""])) : "",
    r.examples.length ? `### ${t("req.examples")}\n\n${table(["given", "expect"], r.examples.map((e) => [e.given, e.expect]))}` : "",
    `### ${t("req.criteria")}`,
    table([t("col.code"), t("col.what"), t("col.tests")], r.criteria.map((c) => [`${c.code}${c.locked ? " 🔒" : ""}`, c.text, c.tests.join(", ") || "—"])),
    r.blockers.length ? `### ${t("req.holding")}\n\n${r.blockers.map((b) => `- ${b.kind}${b.detail ? `: ${b.detail}` : ""}`).join("\n")}` : "",
    r.evidence ? `### ${t("req.evidence")}\n\n${r.evidence.commit ?? "—"} · ${formatDate(r.evidence.verifiedAt, input.lang)}` : "",
  );
}

/** Every requirement, grouped by package (REQ-P0V3Y); those in no package come last. */
export function requirementsDoc(input: DocsInput, t: DocT): string {
  if (input.requirements.length === 0) return join(header(input, t, t("req.title")), t("req.none"));
  const groups = [
    ...input.packages.map((p) => ({ title: `${p.code} · ${p.title}`, items: input.requirements.filter((r) => r.package === p.code) })),
    { title: t("pkg.none"), items: input.requirements.filter((r) => !r.package || !input.packages.some((p) => p.code === r.package)) },
  ].filter((g) => g.items.length);
  return join(
    header(input, t, t("req.title")),
    ...groups.flatMap((g) => [
      `# ${g.title}`,
      table([t("col.code"), t("col.title"), t("col.type"), t("col.status"), t("col.module")], g.items.map((r) => [r.code, r.title, r.type, r.status, r.module])),
      ...g.items.map((r) => requirement(r, input, t)),
    ]),
  );
}
