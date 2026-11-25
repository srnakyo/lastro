import type { DocT } from "../i18n";
import { values } from "../values";
import { formatDate } from "../i18n";
import { join, mermaid, pct, table } from "../md";
import type { DocsInput } from "../model";
import { qaFlowDiagram } from "../diagrams/qa-flow";
import { modules, stageConditions, stageName } from "./architecture";
import { covered, header, isVerified } from "./header";

export function testPlanDoc(input: DocsInput, t: DocT): string {
  const { config } = input;
  return join(
    header(input, t, t("plan.title")),
    t("plan.lead"),
    ...Object.entries(config.types).map(([type, def]) =>
      join(
        `## ${type}`,
        table([t("col.stage"), t("col.conditions"), t("col.manual")], [...config.global_flow, ...def.flow].map((s) => [stageName(s), stageConditions(s), typeof s === "object" && s.manual ? (s.by ?? "person") : ""])),
        mermaid(qaFlowDiagram(config, type, undefined, input.lang)),
      ),
    ),
    `## ${t("plan.gate")}`,
    t("plan.gate.body"),
  );
}

export function testCasesDoc(input: DocsInput, t: DocT): string {
  const v = values(input.lang);
  const last = new Map(input.tests.map((x) => [x.ref, x.last]));
  const rows = input.requirements.flatMap((r) => r.criteria.flatMap((c) => (c.tests.length ? c.tests : [""]).map((ref) => [`${r.code} ${c.code}`, c.text, ref || "—", ref ? (last.get(ref) ? v.of("result", last.get(ref)) : t("notRun")) : "—"])));
  const uncovered = input.requirements.flatMap((r) => r.criteria.filter((c) => c.tests.length === 0).map((c) => [`${r.code} ${c.code}`, c.text]));
  return join(
    header(input, t, t("cases.title")),
    t("cases.lead"),
    table([t("col.code"), t("col.what"), t("col.test"), t("col.result")], rows) || t("none"),
    `## ${t("cases.uncovered")}`,
    table([t("col.code"), t("col.what")], uncovered) || t("none"),
    `## ${t("cases.orphans")}`,
    input.tests.filter((x) => x.orphan).map((x) => `- \`${x.ref}\``).join("\n") || t("none"),
  );
}

export function qualityReportDoc(input: DocsInput, t: DocT): string {
  const v = values(input.lang);
  const reqs = input.requirements;
  const failing = input.tests.filter((x) => x.last === "failed" || x.last === "error").length;
  return join(
    header(input, t, t("quality.title")),
    `## ${t("quality.kpis")}`,
    table([t("kpi.coverage"), t("kpi.tests"), t("kpi.passed"), t("kpi.failed"), t("kpi.verified"), t("kpi.pending")], [[pct(reqs.filter(covered).length, reqs.length), input.tests.length, input.tests.filter((x) => x.last === "passed").length, failing, reqs.filter((r) => isVerified(r.status)).length, reqs.filter((r) => !isVerified(r.status) && r.status !== "dropped").length]]),
    `## ${t("quality.modules")}`,
    table([t("col.module"), t("col.requirements"), t("col.covered"), t("col.verified")], modules(input).map(([name, items]) => [name, items.length, pct(items.filter(covered).length, items.length), pct(items.filter((r) => isVerified(r.status)).length, items.length)])),
    `## ${t("quality.runs")}`,
    table([t("col.when"), t("col.commit"), t("col.by"), t("col.status"), t("col.tests"), t("col.duration")], input.runs.slice(0, 15).map((r) => [formatDate(r.startedAt, input.lang), r.commit, v.of("trigger", r.trigger), v.of("result", r.status), `${r.tests.passed} ✓ ${r.tests.failed} ✗`, r.durationMs ? `${Math.round(r.durationMs / 1000)} s` : "—"])) || t("none"),
    `## ${t("quality.flaky")}`,
    input.tests.filter((x) => x.flaky).map((x) => `- \`${x.ref}\``).join("\n") || t("none"),
    `## ${t("quality.incidents")}`,
    table([t("col.code"), t("col.what"), "triage", "cause", "billing"], input.incidents.map((i) => [i.code, i.reported, i.triage, i.cause, i.billing])) || t("none"),
  );
}
