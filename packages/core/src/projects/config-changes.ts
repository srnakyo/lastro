import type { ProjectConfig } from "@lastro/shared";

const added = (before: string[], after: string[]) => after.filter((x) => !before.includes(x));

function listChanges(label: string, before: string[], after: string[]): string[] {
  return [...added(before, after).map((x) => `${label} +${x}`), ...added(after, before).map((x) => `${label} -${x}`)];
}

function recordChanges(label: string, before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const key of Object.keys(after)) {
    if (!(key in before)) out.push(`${label} +${key}`);
    else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) out.push(`${label} ${key} changed`);
  }
  for (const key of Object.keys(before)) if (!(key in after)) out.push(`${label} -${key}`);
  return out;
}

/** What a QA configuration change did, item by item, for the audit: the person sees what the agent set up. */
export function configChanges(prev: ProjectConfig, next: ProjectConfig): string[] {
  const levels = [...new Set([...Object.keys(prev.tests.levels), ...Object.keys(next.tests.levels)])];
  return [
    ...levels.flatMap((level) => listChanges(`tests.levels.${level}`, prev.tests.levels[level] ?? [], next.tests.levels[level] ?? [])),
    ...listChanges("tests.coverage_exclude", prev.tests.coverage_exclude, next.tests.coverage_exclude),
    ...recordChanges("commands", prev.commands, next.commands),
    ...recordChanges("conditions", prev.conditions, next.conditions),
    ...recordChanges("types", prev.types, next.types),
    ...(JSON.stringify(prev.global_flow) === JSON.stringify(next.global_flow) ? [] : ["global_flow changed"]),
    ...(JSON.stringify({ ...prev.tests, red_first_since: null, levels: null, coverage_exclude: null }) === JSON.stringify({ ...next.tests, red_first_since: null, levels: null, coverage_exclude: null }) ? [] : ["test rules changed"]),
    ...(prev.autonomy === next.autonomy ? [] : [`autonomy ${next.autonomy}`]),
    ...(JSON.stringify(prev.gate) === JSON.stringify(next.gate) && JSON.stringify(prev.approval) === JSON.stringify(next.approval) ? [] : ["gate or approval changed"]),
  ];
}
