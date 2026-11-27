import { activityTimeline, agentEventsService, auditService, membersService, projectsService } from "@lastro/core";
import { projectConfigSchema } from "@lastro/shared";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProject, requireWorkspace } from "./context.server";

const keySchema = z.object({ key: z.string() });
const role = z.enum(["owner", "admin", "member"]);

export const listAudit = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.extend({ before: z.string().optional(), action: z.string().optional(), actorType: z.enum(["user", "agent", "system"]).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { project } = await requireProject(data.key);
    return auditService.list(project.id, { limit: 100, before: data.before ? new Date(data.before) : undefined, action: data.action, actorType: data.actorType });
  });

export const listAgentSessions = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => agentEventsService.sessions((await requireProject(data.key)).project.id));

export const getTimeline = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => activityTimeline((await requireProject(data.key)).project.id));

export const getConfig = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => projectConfigSchema.parse((await requireProject(data.key)).project.config));

export const saveConfig = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ config: projectConfigSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    await projectsService.updateConfig(project.id, actor, data.config);
    return { ok: true };
  });

/** Members belong to the workspace, not to a project: these work on the active workspace. */
export const listMembers = createServerFn({ method: "GET" }).handler(async () => membersService.list((await requireWorkspace()).workspace.id));

export const addMember = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ email: z.string().email(), role }).parse(d))
  .handler(async ({ data }) => {
    const { workspace, actor } = await requireWorkspace();
    await membersService.add(workspace.id, actor, data.email, data.role);
    return { ok: true };
  });

export const changeMember = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string(), role: role.nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { workspace, actor } = await requireWorkspace();
    if (data.role) await membersService.setRole(workspace.id, actor, data.id, data.role);
    else await membersService.remove(workspace.id, actor, data.id);
    return { ok: true };
  });
