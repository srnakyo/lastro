import { systemActor } from "../scope/actor";
import type { Tx } from "../db";
import { blocksStep, computeBlockers } from "../lifecycle/blockers";
import { recordTransition } from "../lifecycle/record";
import type { ProjectScope } from "../scope/project-scope";
import { loadGraph, toBlockerInput } from "./graph";

/**
 * Keeps captured/specified in line with the spec: a complete requirement becomes specified,
 * and one that lost a required field, quote or answer goes back to captured.
 */
export async function reevaluate(tx: Tx, scope: ProjectScope, requirementId: string) {
  const graph = await loadGraph(tx, requirementId);
  const blockers = computeBlockers(toBlockerInput(graph), scope.config);
  const specOk = blocksStep(blockers, "specified").length === 0;
  const target = { id: graph.id, code: graph.code, status: graph.status };
  if (graph.status === "captured" && specOk) await recordTransition(tx, scope, target, "specified", systemActor, "spec complete");
  if (graph.status === "specified" && !specOk) await recordTransition(tx, scope, target, "captured", systemActor, "spec incomplete");
  return blockers;
}
