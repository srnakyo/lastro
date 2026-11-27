import { cliLoginService } from "@lastro/core";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireWorkspace } from "./context.server";

const idSchema = z.object({ id: z.string() });

/** The login a terminal is waiting on, and the workspace it would get a token for. */
export const getCliLogin = createServerFn({ method: "GET" })
  .validator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspace();
    const login = await cliLoginService.get(data.id);
    return { ...login, expiresAt: login.expiresAt.toISOString(), workspace: { name: workspace.name, slug: workspace.slug } };
  });

export const answerCliLogin = createServerFn({ method: "POST" })
  .validator((d: unknown) => idSchema.extend({ allow: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { workspace, actor } = await requireWorkspace();
    if (data.allow) await cliLoginService.approve(data.id, workspace.id, actor);
    else await cliLoginService.deny(data.id, actor);
    return { ok: true };
  });
