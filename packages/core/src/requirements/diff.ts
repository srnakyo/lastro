import type { RequirementUpdateData } from "@lastro/shared";
import type { RequirementGraph } from "./graph";

/** The spec of a stored requirement, in the shape of an update, so both can be compared field by field. */
function current(graph: RequirementGraph & { dependsOn?: { dependsOn: { code: string } }[] }) {
  return {
    title: graph.title,
    type: graph.type,
    statement: graph.statement,
    package: graph.package?.code,
    where: graph.where ?? undefined,
    who: graph.who ?? undefined,
    dataSource: graph.dataSource ?? undefined,
    period: graph.period ?? undefined,
    reach: graph.reach ?? undefined,
    whenMissing: graph.whenMissing ?? undefined,
    examples: graph.examples,
    visualRefs: graph.visualRefs,
    dependsOn: graph.dependsOn?.map((d) => d.dependsOn.code).sort(),
    citations: graph.citations.map((c) => ({ source: c.source.code, anchor: c.anchor, label: c.label ?? undefined, quote: c.quote })),
    criteria: graph.criteria.map((c) => ({ code: c.code, text: c.text, tests: c.tests.map((t) => t.testRef) })),
  };
}

/** Stable JSON: object keys sorted, undefined dropped, so equal values compare equal whatever their key order. */
function stable(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b))) : v,
  );
}

/** The fields of an update that differ from what is stored. An empty list means the update changes nothing. */
export function changedFields(graph: RequirementGraph, input: RequirementUpdateData): string[] {
  const now = current(graph) as Record<string, unknown>;
  return Object.entries(input)
    .filter(([key, value]) => value !== undefined && stable(key === "dependsOn" ? [...(value as string[])].sort() : value) !== stable(now[key]))
    .map(([key]) => key);
}
