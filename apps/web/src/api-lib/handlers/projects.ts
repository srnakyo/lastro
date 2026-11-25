import { agentContext, exportSnapshot, pendingList, projectsService, snapshotService } from "@lastro/core";
import { database } from "@lastro/database";
import { projectInputSchema } from "@lastro/shared";
import { body } from "../http";
import type { ApiRouter } from "../router";
import { tokenProject } from "../scope";

export function projectRoutes(router: ApiRouter) {
  router
    .on("GET", "/me", async ({ token }) => {
      const person = token.actor.type === "user" ? await database().user.findUnique({ where: { id: token.actor.id ?? "" }, select: { email: true, name: true } }) : null;
      return { workspaceId: token.workspaceId, projectId: token.projectId, kind: token.kind, email: person?.email ?? null, name: person?.name ?? null };
    })
    .on("GET", "/projects", async ({ token }) => (await projectsService.list(token.workspaceId)).map((p) => ({ key: p.key, name: p.name })))
    .on("POST", "/projects", async ({ token, request }) => {
      const project = await projectsService.create(token.workspaceId, token.actor, projectInputSchema.parse(await body(request)));
      return { key: project.key, id: project.id };
    })
    .on("GET", "/projects/:key", async ({ token, params }) => {
      const p = await tokenProject(token, params.key ?? "");
      return { key: p.key, name: p.name, config: p.config };
    })
    .on("GET", "/projects/:key/context", async ({ token, params }) => agentContext((await tokenProject(token, params.key ?? "")).id))
    .on("POST", "/projects/:key/import", async ({ token, params, request, query }) =>
      snapshotService.import((await tokenProject(token, params.key ?? "")).id, token.actor, (await body(request)) as never, { dryRun: query.get("dryRun") === "1" }))
    .on("GET", "/projects/:key/export", async ({ token, params }) => exportSnapshot((await tokenProject(token, params.key ?? "")).id))
    .on("GET", "/projects/:key/pending", async ({ token, params, query }) => pendingList((await tokenProject(token, params.key ?? "")).id, query.get("package") ?? undefined));
}
