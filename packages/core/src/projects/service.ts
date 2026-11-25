import { requireHuman } from "../scope/actor";
import { projectConfigSchema, projectInputSchema, type Actor, type ProjectConfigInput, type ProjectInput } from "@lastro/shared";
import { auditService } from "../audit/service";
import { db, transaction } from "../db";
import { LastroError, notFound } from "../errors";

export const projectsService = {
  async create(workspaceId: string, actor: Actor, raw: ProjectInput) {
    requireHuman(actor, "creating a project");
    const input = projectInputSchema.parse(raw);
    return transaction(async (tx) => {
      const taken = await tx.project.findUnique({ where: { workspaceId_key: { workspaceId, key: input.key } } });
      if (taken) throw new LastroError("CONFLICT", `project ${input.key} already exists`);
      const project = await tx.project.create({
        data: {
          workspaceId,
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          repositoryUrl: input.repositoryUrl ?? null,
          language: input.config.language,
          config: input.config,
        },
      });
      await auditService.record(tx, { workspaceId, projectId: project.id, actor, action: "project.create", entity: "project", entityId: project.id });
      return project;
    });
  },

  list(workspaceId: string) {
    return db().project.findMany({ where: { workspaceId, archivedAt: null }, orderBy: { name: "asc" } });
  },

  async getByKey(workspaceId: string, key: string) {
    const project = await db().project.findUnique({ where: { workspaceId_key: { workspaceId, key } } });
    if (!project) throw notFound(`project ${key}`);
    return { ...project, config: projectConfigSchema.parse(project.config) };
  },

  async updateConfig(projectId: string, actor: Actor, raw: ProjectConfigInput) {
    const config = projectConfigSchema.parse(raw);
    return transaction(async (tx) => {
      const project = await tx.project.update({ where: { id: projectId }, data: { config, language: config.language } });
      await auditService.record(tx, { workspaceId: project.workspaceId, projectId, actor, action: "project.config", entity: "project", entityId: projectId });
      return project;
    });
  },
};
