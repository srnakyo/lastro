import { projectsService, workspacesService } from "@lastro/core";
import type { Actor } from "@lastro/shared";
import { getCookie, getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth.server";

export const WORKSPACE_COOKIE = "lastro_ws";

export class Unauthorized extends Error {
  constructor() {
    super("UNAUTHORIZED");
  }
}

/** The signed-in person, or Unauthorized. */
export async function requireUser() {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session) throw new Unauthorized();
  const actor: Actor = { type: "user", id: session.user.id };
  return { user: session.user, actor };
}

/** The workspace picked in the cookie, or the first one the person belongs to. */
export async function activeWorkspace(userId: string) {
  const workspaces = await workspacesService.listForUser(userId);
  const slug = getCookie(WORKSPACE_COOKIE);
  return { workspaces, workspace: workspaces.find((w) => w.slug === slug) ?? workspaces[0] ?? null };
}

/** A project of the active workspace, by key, checked against the membership. */
export async function requireProject(key: string) {
  const { user, actor } = await requireUser();
  const { workspace } = await activeWorkspace(user.id);
  if (!workspace) throw new Error("NO_WORKSPACE");
  await workspacesService.requireMember(workspace.id, user.id);
  const project = await projectsService.getByKey(workspace.id, key);
  return { user, actor, workspace, project };
}
