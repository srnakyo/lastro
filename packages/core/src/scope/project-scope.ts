import { projectConfigSchema, type ProjectConfig } from "@lastro/shared";
import { notFound } from "../errors";
import type { Tx } from "../db";

export interface ProjectScope {
  id: string;
  workspaceId: string;
  key: string;
  config: ProjectConfig;
}

export async function loadScope(tx: Tx, projectId: string): Promise<ProjectScope> {
  const project = await tx.project.findUnique({ where: { id: projectId }, select: { id: true, workspaceId: true, key: true, config: true } });
  if (!project) throw notFound("project");
  return { ...project, config: projectConfigSchema.parse(project.config) };
}
