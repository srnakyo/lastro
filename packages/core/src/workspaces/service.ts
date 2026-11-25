import { LastroError } from "../errors";
import { db, transaction } from "../db";

const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export const workspacesService = {
  /** Creates a workspace with the user as owner. */
  async create(userId: string, input: { name: string; slug: string }) {
    if (!SLUG.test(input.slug)) throw new LastroError("VALIDATION", "slug: lowercase letters, digits and hyphens, 3 to 40 characters");
    return transaction(async (tx) => {
      const taken = await tx.workspace.findUnique({ where: { slug: input.slug } });
      if (taken) throw new LastroError("CONFLICT", `workspace ${input.slug} already exists`);
      const workspace = await tx.workspace.create({ data: { name: input.name, slug: input.slug } });
      await tx.membership.create({ data: { workspaceId: workspace.id, userId, role: "owner" } });
      await tx.auditEvent.create({
        data: { workspaceId: workspace.id, actorType: "user", actorId: userId, action: "workspace.create", entity: "workspace", entityId: workspace.id },
      });
      return workspace;
    });
  },

  async listForUser(userId: string) {
    const memberships = await db().membership.findMany({ where: { userId }, include: { workspace: true }, orderBy: { createdAt: "asc" } });
    return memberships.map((m) => ({ ...m.workspace, role: m.role }));
  },

  /** Returns the membership or refuses access. */
  async requireMember(workspaceId: string, userId: string) {
    const membership = await db().membership.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
    if (!membership) throw new LastroError("FORBIDDEN", "not a member of this workspace");
    return membership;
  },
};
