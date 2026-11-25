import { overviewService, projectsService } from "@lastro/core";
import { projectConfigSchema, projectKeySchema } from "@lastro/shared";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { activeWorkspace, requireProject, requireUser } from "./context.server";

/** Home: one line per project of the active workspace with its numbers. */
export const listProjects = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await requireUser();
  const { workspace } = await activeWorkspace(user.id);
  if (!workspace) return [];
  return overviewService.workspace(workspace.id);
});

export const createProject = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ key: projectKeySchema, name: z.string().min(1), description: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { user, actor } = await requireUser();
    const { workspace } = await activeWorkspace(user.id);
    if (!workspace) throw new Error("NO_WORKSPACE");
    const config = projectConfigSchema.parse({ project: data.key, types: { behavior: { required: ["where"] } } });
    const project = await projectsService.create(workspace.id, actor, { ...data, config });
    return { key: project.key };
  });

/** Project header data: name, key, language and the list of sibling projects for the switcher. */
export const getProject = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ key: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { project, workspace } = await requireProject(data.key);
    const siblings = await projectsService.list(workspace.id);
    return {
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      repositoryUrl: project.repositoryUrl,
      language: project.language,
      siblings: siblings.map((p) => ({ key: p.key, name: p.name })),
    };
  });

export const getProjectOverview = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ key: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { project } = await requireProject(data.key);
    return overviewService.project(project.id);
  });
