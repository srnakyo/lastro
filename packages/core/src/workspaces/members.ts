import type { Actor } from "@lastro/shared";
import { db, transaction } from "../db";
import { LastroError } from "../errors";
import { requireHuman } from "../scope/actor";

type Role = "owner" | "admin" | "member";

async function requireManager(workspaceId: string, actor: Actor) {
  requireHuman(actor, "managing members");
  const m = await db().membership.findUnique({ where: { workspaceId_userId: { workspaceId, userId: actor.id ?? "" } } });
  if (!m || m.role === "member") throw new LastroError("FORBIDDEN", "only owners and admins manage members");
  return m;
}

const audit = (workspaceId: string, actor: Actor, action: string, entityId: string, data: object) =>
  db().auditEvent.create({ data: { workspaceId, actorType: actor.type, actorId: actor.id, action, entity: "membership", entityId, data } });

/** Who belongs to a workspace and with which role. People sign up first; an owner or admin then adds them. */
export const membersService = {
  list(workspaceId: string) {
    return db().membership.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" }, select: { id: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true } } } });
  },

  async add(workspaceId: string, actor: Actor, email: string, role: Role) {
    await requireManager(workspaceId, actor);
    const user = await db().user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) throw new LastroError("NOT_FOUND", `nobody signed up with ${email}: ask them to create an account first`);
    const exists = await db().membership.findUnique({ where: { workspaceId_userId: { workspaceId, userId: user.id } } });
    if (exists) throw new LastroError("CONFLICT", `${email} is already a member`);
    const m = await db().membership.create({ data: { workspaceId, userId: user.id, role } });
    await audit(workspaceId, actor, "member.add", m.id, { email, role });
    return m;
  },

  async setRole(workspaceId: string, actor: Actor, membershipId: string, role: Role) {
    await requireManager(workspaceId, actor);
    return transaction(async (tx) => {
      const m = await tx.membership.findFirstOrThrow({ where: { id: membershipId, workspaceId } });
      if (m.role === "owner" && role !== "owner" && (await tx.membership.count({ where: { workspaceId, role: "owner" } })) === 1) throw new LastroError("CONFLICT", "a workspace keeps at least one owner");
      await tx.auditEvent.create({ data: { workspaceId, actorType: actor.type, actorId: actor.id, action: "member.role", entity: "membership", entityId: m.id, data: { from: m.role, to: role } } });
      return tx.membership.update({ where: { id: m.id }, data: { role } });
    });
  },

  async remove(workspaceId: string, actor: Actor, membershipId: string) {
    await requireManager(workspaceId, actor);
    return transaction(async (tx) => {
      const m = await tx.membership.findFirstOrThrow({ where: { id: membershipId, workspaceId } });
      if (m.role === "owner" && (await tx.membership.count({ where: { workspaceId, role: "owner" } })) === 1) throw new LastroError("CONFLICT", "a workspace keeps at least one owner");
      await tx.auditEvent.create({ data: { workspaceId, actorType: actor.type, actorId: actor.id, action: "member.remove", entity: "membership", entityId: m.id, data: { userId: m.userId } } });
      await tx.membership.delete({ where: { id: m.id } });
    });
  },
};
