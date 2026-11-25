import { LastroError, projectsService, type VerifiedToken } from "@lastro/core";

/** The project a token may act on: its own project, or any project of its workspace. */
export async function tokenProject(token: VerifiedToken, key: string) {
  const project = await projectsService.getByKey(token.workspaceId, key);
  if (token.projectId && token.projectId !== project.id) throw new LastroError("FORBIDDEN", "this token belongs to another project");
  return project;
}
