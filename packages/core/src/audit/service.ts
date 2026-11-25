import type { Actor } from "@lastro/shared";
import type { Prisma } from "@lastro/database";
import { db, type Tx } from "../db";

export interface AuditEntry {
  workspaceId: string;
  projectId?: string | null;
  actor: Actor;
  action: string;
  entity: string;
  entityId: string;
  data?: Prisma.InputJsonValue;
}

export const auditService = {
  async record(tx: Tx, entry: AuditEntry) {
    await tx.auditEvent.create({
      data: {
        workspaceId: entry.workspaceId,
        projectId: entry.projectId ?? null,
        actorType: entry.actor.type,
        actorId: entry.actor.id,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        data: entry.data ?? {},
      },
    });
  },

  async list(projectId: string, options: { limit?: number; before?: Date } = {}) {
    return db().auditEvent.findMany({
      where: { projectId, ...(options.before ? { createdAt: { lt: options.before } } : {}) },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
    });
  },
};
