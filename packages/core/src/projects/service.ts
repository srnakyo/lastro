import { reevaluate } from "../requirements/evaluate";
import { loadScope } from "../scope/project-scope";
import { projectConfigSchema, projectInputSchema, starterProjectConfig, type Actor, type ProjectConfig, type ProjectConfigInput, type ProjectInput } from "@lastro/shared";
import { auditService } from "../audit/service";
import { db, transaction } from "../db";
import { LastroError, notFound } from "../errors";
import { loosenings } from "./loosening";
import { stampTestRules } from "./test-rules";

/**
 * An agent may create a project (`lastro init` when the person says "let's use Lastro"), but always with the
 * strict start: only a person may loosen the QA rules, so the configuration an agent sends is not used.
 */
function startingConfig(actor: Actor, key: string, config: ProjectConfig): ProjectConfig {
  if (actor.type === "user") return config;
  return { ...starterProjectConfig(key), language: config.language };
}

export const projectsService = {
  async create(workspaceId: string, actor: Actor, raw: ProjectInput) {
    const parsed = projectInputSchema.parse(raw);
    const input = { ...parsed, config: startingConfig(actor, parsed.key, parsed.config) };
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
          config: stampTestRules(null, input.config),
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

  /**
   * Changes the QA flows, conditions, commands or gate; requirements are re-checked against the new required
   * fields. An agent may set them up and tighten them; loosening a rule needs a person.
   */
  async updateConfig(projectId: string, actor: Actor, raw: ProjectConfigInput) {
    const parsed = projectConfigSchema.parse(raw);
    return transaction(async (tx) => {
      const current = await tx.project.findUniqueOrThrow({ where: { id: projectId }, select: { config: true } });
      const previous = projectConfigSchema.parse(current.config);
      const loose = actor.type === "user" ? [] : loosenings(previous, parsed);
      if (loose.length) throw new LastroError("HUMAN_ONLY", `only a person can loosen the QA rules: ${loose.join("; ")}`, { loosenings: loose });
      const config = stampTestRules(previous, parsed);
      const project = await tx.project.update({ where: { id: projectId }, data: { config, language: config.language } });
      await auditService.record(tx, { workspaceId: project.workspaceId, projectId, actor, action: "project.config", entity: "project", entityId: projectId });
      const scope = await loadScope(tx, projectId);
      const open = await tx.requirement.findMany({ where: { projectId, status: { in: ["captured", "specified"] } }, select: { id: true } });
      for (const r of open) await reevaluate(tx, scope, r.id);
      return project;
    }, { timeout: 60_000 });
  },
};
