import type { ProjectConfig, Stage } from "@lastro/shared";

const stageKey = (stage: Stage) => JSON.stringify(stage);
const missing = <T>(before: T[], after: T[], key: (item: T) => string = String) => {
  const kept = new Set(after.map(key));
  return before.filter((item) => !kept.has(key(item)));
};

const CI_STRICTNESS = { off: 0, optional: 1, required: 2 } as const;

function testRules(prev: ProjectConfig, next: ProjectConfig): string[] {
  const out: string[] = [];
  if (prev.autonomy === "review" && next.autonomy === "auto") out.push("autonomy from review to auto");
  if (prev.tests.red_first && !next.tests.red_first) out.push("tests.red_first off");
  if (prev.tests.examples_in_tests && !next.tests.examples_in_tests) out.push("tests.examples_in_tests off");
  if (prev.tests.coverage_report && !next.tests.coverage_report) out.push("tests.coverage_report removed");
  for (const glob of missing(next.tests.coverage_exclude, prev.tests.coverage_exclude)) out.push(`tests.coverage_exclude adds ${glob}`);
  for (const [level, globs] of Object.entries(prev.tests.levels)) {
    for (const glob of missing(globs, next.tests.levels[level] ?? [])) out.push(`tests.levels.${level} drops ${glob}`);
  }
  return out;
}

function types(prev: ProjectConfig, next: ProjectConfig): string[] {
  const out: string[] = [];
  for (const [name, before] of Object.entries(prev.types)) {
    const after = next.types[name];
    if (!after) {
      out.push(`type ${name} removed`);
      continue;
    }
    for (const field of missing(before.required, after.required)) out.push(`${name} no longer requires ${field}`);
    for (const level of missing(before.tests.levels, after.tests.levels)) out.push(`${name} no longer asks for ${level} tests`);
    for (const metric of ["functions", "lines"] as const) {
      const was = before.tests.coverage?.[metric];
      const is = after.tests.coverage?.[metric];
      if (was !== undefined && (is === undefined || is < was)) out.push(`${name} coverage of ${metric} from ${was}% to ${is ?? "none"}`);
    }
    if (missing(before.flow, after.flow, stageKey).length) out.push(`a stage of the ${name} flow removed`);
  }
  return out;
}

function flowsAndGate(prev: ProjectConfig, next: ProjectConfig): string[] {
  const out: string[] = [];
  if (missing(prev.global_flow, next.global_flow, stageKey).length) out.push("a stage of the global flow removed");
  for (const condition of missing(Object.keys(prev.conditions), Object.keys(next.conditions))) out.push(`condition ${condition} removed`);
  if (prev.approval.require_final_source && !next.approval.require_final_source) out.push("approval.require_final_source off");
  if (JSON.stringify(prev.approval.spec) !== JSON.stringify(next.approval.spec)) out.push("approval.spec changed");
  if (prev.gate.block_agent_stop && !next.gate.block_agent_stop) out.push("gate.block_agent_stop off");
  if (prev.gate.stale_on_change && !next.gate.stale_on_change) out.push("gate.stale_on_change off");
  if (next.gate.max_stop_blocks > prev.gate.max_stop_blocks) out.push("gate.max_stop_blocks raised");
  if (CI_STRICTNESS[next.gate.ci] < CI_STRICTNESS[prev.gate.ci]) out.push(`gate.ci from ${prev.gate.ci} to ${next.gate.ci}`);
  if (JSON.stringify(prev.gate.human_identities) !== JSON.stringify(next.gate.human_identities)) out.push("gate.human_identities changed");
  return out;
}

/**
 * What a configuration change would loosen. An agent may set up and tighten the QA configuration (commands,
 * conditions, flows, test levels, stricter rules), but only a person may loosen it.
 */
export function loosenings(prev: ProjectConfig, next: ProjectConfig): string[] {
  return [...testRules(prev, next), ...types(prev, next), ...flowsAndGate(prev, next)];
}
