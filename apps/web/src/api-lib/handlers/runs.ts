import { runsService, testCatalog, verifyPlan } from "@lastro/core";
import { z } from "zod";
import { body } from "../http";
import type { ApiRouter } from "../router";
import { tokenProject } from "../scope";

const gateSchema = z.object({
  trees: z.record(z.string(), z.string()).default({}),
  commit: z.string().nullable().optional(),
  testFiles: z.record(z.string(), z.string()).default({}),
});

export function runRoutes(router: ApiRouter) {
  router
    .on("GET", "/projects/:key/verify-plan", async ({ token, params, query }) => verifyPlan((await tokenProject(token, params.key ?? "")).id, query.get("code") ?? undefined))
    .on("POST", "/projects/:key/runs", async ({ token, params, request }) => runsService.record((await tokenProject(token, params.key ?? "")).id, token.actor, (await body(request)) as never))
    .on("GET", "/projects/:key/runs", async ({ token, params }) => runsService.list((await tokenProject(token, params.key ?? "")).id))
    .on("GET", "/projects/:key/runs/:id", async ({ token, params }) => runsService.get((await tokenProject(token, params.key ?? "")).id, params.id ?? ""))
    .on("POST", "/projects/:key/gate", async ({ token, params, request }) => {
      const input = gateSchema.parse(await body(request));
      return runsService.gate((await tokenProject(token, params.key ?? "")).id, input.trees, { commit: input.commit, testFiles: input.testFiles });
    })
    .on("POST", "/projects/:key/requirements/:code/sign", async ({ token, params, request }) =>
      runsService.signManual((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "", (await body(request)) as never))
    .on("GET", "/projects/:key/tests", async ({ token, params }) => testCatalog((await tokenProject(token, params.key ?? "")).id));
}
