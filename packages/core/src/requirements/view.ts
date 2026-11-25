import type { ProjectConfig } from "@lastro/shared";
import { computeBlockers } from "../lifecycle/blockers";
import { computeHallmark } from "../lifecycle/hallmark";
import { toBlockerInput, type RequirementGraph } from "./graph";

/** A requirement with what holds it back and its four backing links. */
export function toView(graph: RequirementGraph, config: ProjectConfig) {
  const blockers = computeBlockers(toBlockerInput(graph), config);
  const hallmark = computeHallmark(
    blockers,
    graph.criteria.map((c) => ({ tests: c.tests.length, locked: c.lockedHash !== null })),
  );
  return { ...graph, blockers, hallmark };
}

export type RequirementView = ReturnType<typeof toView>;
