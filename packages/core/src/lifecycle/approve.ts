import type { Actor } from "@lastro/shared";
import type { Tx } from "../db";
import type { loadGraph } from "../requirements/graph";
import type { ProjectScope } from "../scope/project-scope";
import { criterionHash } from "./lock";
import { recordTransition } from "./record";

/** Moves a specified requirement to approved and locks its criteria with their tests, inside a transaction. */
export async function approveAndLock(tx: Tx, scope: ProjectScope, graph: Awaited<ReturnType<typeof loadGraph>>, actor: Actor, reason: string | null) {
  await recordTransition(tx, scope, { id: graph.id, code: graph.code, status: graph.status }, "approved", actor, reason);
  for (const criterion of graph.criteria) {
    const tests = criterion.tests.map((t) => t.testRef);
    await tx.criterion.update({
      where: { id: criterion.id },
      data: { lockedHash: await criterionHash(criterion.text, tests), lockedAt: new Date(), lockedById: actor.type === "user" ? actor.id : null },
    });
  }
}
