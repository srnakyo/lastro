import { workspacesService } from "@lastro/core";
import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { WORKSPACE_COOKIE, requireUser } from "./context.server";

const cookie = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 365 };

export const createWorkspace = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ name: z.string().min(1), slug: z.string().min(3) }).parse(d))
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    const workspace = await workspacesService.create(user.id, data);
    setCookie(WORKSPACE_COOKIE, workspace.slug, cookie);
    return { slug: workspace.slug };
  });

export const switchWorkspace = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    const workspaces = await workspacesService.listForUser(user.id);
    if (!workspaces.some((w) => w.slug === data.slug)) throw new Error("FORBIDDEN");
    setCookie(WORKSPACE_COOKIE, data.slug, cookie);
    return { slug: data.slug };
  });

export const setPreference = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ name: z.enum(["lastro_lang", "lastro_theme"]), value: z.string().max(10) }).parse(d))
  .handler(async ({ data }) => {
    setCookie(data.name, data.value, { ...cookie, httpOnly: false });
    return { ok: true };
  });
