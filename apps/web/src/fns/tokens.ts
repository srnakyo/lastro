import { tokensService } from "@lastro/core";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProject, requireWorkspace } from "./context.server";

/** A project's key for its own tokens; none for the workspace's tokens (they work in every project). */
const scopeSchema = z.object({ key: z.string().optional() });

async function scopeOf(key: string | undefined) {
  if (key) {
    const { workspace, project, actor } = await requireProject(key);
    return { workspace, actor, projectId: project.id as string | null };
  }
  const { workspace, actor } = await requireWorkspace();
  return { workspace, actor, projectId: null };
}

export const listTokens = createServerFn({ method: "GET" })
  .validator((d: unknown) => scopeSchema.parse(d))
  .handler(async ({ data }) => {
    const { workspace, projectId } = await scopeOf(data.key);
    const tokens = await tokensService.list(workspace.id);
    return projectId ? tokens.filter((t) => t.projectId === projectId) : tokens;
  });

/** Returns the plain token once: it is never shown again. In a project, the token works only there. */
export const createToken = createServerFn({ method: "POST" })
  .validator((d: unknown) => scopeSchema.extend({ name: z.string().min(1), kind: z.enum(["person", "agent"]) }).parse(d))
  .handler(async ({ data }) => {
    const { workspace, actor, projectId } = await scopeOf(data.key);
    return tokensService.create(workspace.id, actor, { name: data.name, kind: data.kind, projectId });
  });

export const revokeToken = createServerFn({ method: "POST" })
  .validator((d: unknown) => scopeSchema.extend({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { workspace, actor } = await scopeOf(data.key);
    await tokensService.revoke(workspace.id, actor, data.id);
    return { ok: true };
  });
