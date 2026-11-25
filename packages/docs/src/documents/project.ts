import type { DocT } from "../i18n";
import { join, pct, table } from "../md";
import type { DocsInput } from "../model";
import { covered, header, isVerified } from "./header";

export function projectDoc(input: DocsInput, t: DocT): string {
  const reqs = input.requirements;
  return join(
    header(input, t, t("project.title")),
    `## ${t("project.summary")}`,
    input.project.description ?? "",
    input.project.repositoryUrl ? `Repository: ${input.project.repositoryUrl}` : "",
    `## ${t("project.numbers")}`,
    table([t("kpi.requirements"), t("kpi.verified"), t("kpi.coverage"), t("kpi.tests"), t("kpi.failed")], [[reqs.length, reqs.filter((r) => isVerified(r.status)).length, pct(reqs.filter(covered).length, reqs.length), input.tests.length, input.tests.filter((x) => x.last === "failed" || x.last === "error").length]]),
    `## ${t("project.packages")}`,
    table([t("col.code"), t("col.title"), t("col.requirements")], input.packages.map((p) => [p.code, p.title, p.requirements.join(", ")])) || t("none"),
    `## ${t("project.sources")}`,
    table([t("col.code"), t("col.title"), t("col.by"), "v", "final"], input.sources.map((s) => [s.code, s.title, s.from, s.version, s.final ? t("yes") : t("no")])) || t("none"),
    `## ${t("project.glossary")}`,
    table(["", ""], input.glossary.terms.map((g) => [`**${g.term}**`, g.means])) || t("none"),
    `## ${t("project.invariants")}`,
    table([t("col.code"), t("col.what"), t("col.tests")], input.glossary.invariants.map((i) => [i.code, i.text, i.testRefs.join(", ")])) || t("none"),
  );
}
