import type { ProjectConfig } from "@lastro/shared";

/**
 * Red first counts from the moment it is turned on, so an existing project can turn it on without every test
 * it already locked being held: keeps the first date while the rule stays on, and drops it when it goes off.
 */
export function stampTestRules(previous: ProjectConfig | null, next: ProjectConfig, now = new Date()): ProjectConfig {
  const { red_first_since: _drop, ...tests } = next.tests;
  if (!next.tests.red_first) return { ...next, tests };
  const kept = previous?.tests.red_first ? previous.tests.red_first_since : undefined;
  return { ...next, tests: { ...tests, red_first_since: kept ?? next.tests.red_first_since ?? now.toISOString() } };
}
