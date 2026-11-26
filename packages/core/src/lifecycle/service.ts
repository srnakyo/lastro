import type { Actor } from "@lastro/shared";
import { transaction } from "../db";
import { LastroError } from "../errors";
import { requireHuman } from "../scope/actor";
import { loadScope } from "../scope/project-scope";
import { loadGraph, toBlockerInput } from "../requirements/graph";
import { findRequirement } from "../requirements/service";
import { blocksStep, computeBlockers } from "./blockers";
import { approveAndLock } from "./approve";
import { recordTransition } from "./record";

export const lifecycleService = {
  /** A person approves the spec. Criteria and their tests are locked from here on. */
  async approve(projectId: string, actor: Actor, code: string) {
    requireHuman(actor, "approving a requirement");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const target = await findRequirement(tx, projectId, code);
      const graph = await loadGraph(tx, target.id);
      const blocking = blocksStep(computeBlockers(toBlockerInput(graph), scope.config), "approved");
      if (blocking.length > 0) throw new LastroError("BLOCKED", `${code} cannot be approved yet`, blocking);
      await approveAndLock(tx, scope, graph, actor, null);
    });
  },

  /** The agent or a person starts building an approved (or reopened) requirement. */
  async start(projectId: string, actor: Actor, code: string, branch: string | null) {
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const target = await findRequirement(tx, projectId, code);
      await recordTransition(tx, scope, target, "building", actor, branch ? `branch ${branch}` : null);
      await tx.requirement.update({ where: { id: target.id }, data: { branch } });
    });
  },

  async drop(projectId: string, actor: Actor, code: string, reason: string) {
    requireHuman(actor, "dropping a requirement");
    if (reason.trim() === "") throw new LastroError("VALIDATION", "dropping needs a reason");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      await recordTransition(tx, scope, await findRequirement(tx, projectId, code), "dropped", actor, reason);
    });
  },

  /** The requester accepted the delivery. The reference says where (message, e-mail, signature). */
  async accept(projectId: string, actor: Actor, code: string, reference: string) {
    requireHuman(actor, "accepting a delivery");
    if (reference.trim() === "") throw new LastroError("VALIDATION", "acceptance needs a reference");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      await recordTransition(tx, scope, await findRequirement(tx, projectId, code), "accepted", actor, reference);
    });
  },
};
