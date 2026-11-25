import type { DocT } from "../i18n";
import { join, table } from "../md";
import type { DocsInput } from "../model";
import { header } from "./header";

/** Business rules and invariants: the domain terms, the rules that must always hold and the layout contract. */
export function rulesDoc(input: DocsInput, t: DocT): string {
  const design = input.design;
  return join(
    header(input, t, t("rules.title")),
    t("rules.lead"),
    `## ${t("project.glossary")}`,
    table(["", ""], input.glossary.terms.map((g) => [`**${g.term}**`, g.means])) || t("none"),
    `## ${t("project.invariants")}`,
    table([t("col.code"), t("col.what"), t("col.tests")], input.glossary.invariants.map((i) => [i.code, i.text, i.testRefs.join(", ")])) || t("none"),
    design?.forbidden.length ? `## ${t("rules.forbidden")}\n\n${design.forbidden.map((f) => `- ${f}`).join("\n")}` : "",
    design && Object.keys(design.components).length ? `## ${t("rules.components")}\n\n${table(["", ""], Object.entries(design.components))}` : "",
    design && Object.keys(design.palette).length ? `## ${t("rules.palette")}\n\n${table(["", ""], Object.entries(design.palette))}` : "",
  );
}
