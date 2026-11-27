import type { Snapshot } from "@lastro/shared";
import type { Tx } from "../db";

/**
 * An import approves again what the export says is approved, which locks the criteria now. Where the lock is
 * the same one (same hash), it gets back the date it was first taken: rules that count from a date, like
 * red first, then see the lock as it was.
 */
export async function restoreLockDates(tx: Tx, projectId: string, snapshot: Snapshot) {
  for (const r of snapshot.requirements) {
    for (const c of r.criteria) {
      if (!c.locked || !c.lockedAt) continue;
      await tx.criterion.updateMany({ where: { code: c.code, lockedHash: c.locked, requirement: { projectId, code: r.code } }, data: { lockedAt: new Date(c.lockedAt) } });
    }
  }
}
