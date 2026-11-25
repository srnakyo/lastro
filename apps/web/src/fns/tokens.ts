import { tokensService } from "@lastro/core";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProject } from "./context.server";

const keySchema = z.object({ key: z.string() });

export const listTokens = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => {
    const { workspace } = await requireProject(data.key);
    return tokensService.list(workspace.id);
  });

/** Returns the plain token once: it is never shown again. */
export const createToken = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ name: z.string().min(1), kind: z.enum(["person", "agent"]), projectOnly: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { workspace, project, actor } = await requireProject(data.key);
    return tokensService.create(workspace.id, actor, { name: data.name, kind: data.kind, projectId: data.projectOnly ? project.id : null });
  });

export const revokeToken = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { workspace, actor } = await requireProject(data.key);
    await tokensService.revoke(workspace.id, actor, data.id);
    return { ok: true };
  });
