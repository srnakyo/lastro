import { systemActor } from "../scope/actor";
import type { Tx } from "../db";
import { blocksStep, computeBlockers } from "../lifecycle/blockers";
import { approveAndLock } from "../lifecycle/approve";
import { recordTransition } from "../lifecycle/record";
import type { ProjectScope } from "../scope/project-scope";
import { loadGraph, toBlockerInput } from "./graph";

/**
 * Keeps captured/specified in line with the spec: a complete requirement becomes specified, and one that
 * lost a required field, quote or answer goes back to captured. In automatic mode, a specified requirement
 * that nothing holds from approval (every criterion has its tests, at the levels its type asks) is approved.
 */
export async function reevaluate(tx: Tx, scope: ProjectScope, requirementId: string) {
  const graph = await loadGraph(tx, requirementId);
  const blockers = computeBlockers(toBlockerInput(graph), scope.config);
  const specOk = blocksStep(blockers, "specified").length === 0;
  const target = { id: graph.id, code: graph.code, status: graph.status };
  let status = graph.status;
  if (status === "captured" && specOk) {
    await recordTransition(tx, scope, target, "specified", systemActor, "spec complete");
    status = "specified";
  }
  if (status === "specified" && !specOk) await recordTransition(tx, scope, target, "captured", systemActor, "spec incomplete");
  // Automatic mode: nothing holds the approval, so Lastro approves and locks by itself.
  if (scope.config.autonomy === "auto" && status === "specified" && specOk && blocksStep(blockers, "approved").length === 0) {
    await approveAndLock(tx, scope, { ...graph, status }, systemActor, "approved automatically");
  }
  return blockers;
}
