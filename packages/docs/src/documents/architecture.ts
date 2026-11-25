import type { Stage } from "@lastro/shared";
import type { DocT } from "../i18n";
import { join, pct, table } from "../md";
import type { DocsInput } from "../model";
import { covered, header, isVerified } from "./header";

export const stageName = (s: Stage) => (typeof s === "string" ? s : `${s.run ?? s.check ?? "stage"}${s.manual ? " ✍" : ""}`);
export const stageConditions = (s: Stage) => (typeof s === "string" ? "" : (s.conditions ?? []).join(", "));

export function modules(input: DocsInput) {
  const groups = new Map<string, DocsInput["requirements"]>();
  for (const r of input.requirements) groups.set(r.module, [...(groups.get(r.module) ?? []), r]);
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function architectureDoc(input: DocsInput, t: DocT): string {
  const { config } = input;
  return join(
    header(input, t, t("arch.title")),
    `## ${t("arch.modules")}`,
    table([t("col.module"), t("col.requirements"), t("col.covered"), t("col.verified")], modules(input).map(([name, items]) => [name, items.length, pct(items.filter(covered).length, items.length), pct(items.filter((r) => isVerified(r.status)).length, items.length)])),
    `## ${t("arch.types")}`,
    table([t("col.type"), "required", "flow"], Object.entries(config.types).map(([type, def]) => [type, def.required.join(", "), [...config.global_flow, ...def.flow].map(stageName).join(" → ")])),
    `## ${t("arch.conditions")}`,
    table(["", "env", ""], Object.entries(config.conditions).map(([name, c]) => [name, Object.entries(c.env ?? {}).map(([k, v]) => `${k}=${v}`).join(" "), c.note ?? ""])) || t("none"),
    `## ${t("arch.commands")}`,
    table(["", "run", "report"], Object.entries(config.commands).map(([name, c]) => [name, `\`${c.run}\``, [c.report?.junit && `JUnit ${c.report.junit}`, c.report?.sarif && `SARIF ${c.report.sarif}`].filter(Boolean).join(", ")])) || t("none"),
  );
}
