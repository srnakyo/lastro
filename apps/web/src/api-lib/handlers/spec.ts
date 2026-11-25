import { criteriaService, decisionsService, incidentsService, lifecycleService, questionsService, requirementsService } from "@lastro/core";
import { REQUIREMENT_STATUSES, decisionInputSchema, incidentInputSchema, questionInputSchema, requirementInputSchema, requirementUpdateSchema } from "@lastro/shared";
import { z } from "zod";
import { body } from "../http";
import type { ApiRouter } from "../router";
import { tokenProject } from "../scope";
import { ingestUpload } from "../../server/intake";

const statusSchema = z.enum(REQUIREMENT_STATUSES).optional();

export function specRoutes(router: ApiRouter) {
  router
    .on("GET", "/projects/:key/requirements", async ({ token, params, query }) => {
      const p = await tokenProject(token, params.key ?? "");
      return requirementsService.list(p.id, { status: statusSchema.parse(query.get("status") ?? undefined), type: query.get("type") ?? undefined, packageCode: query.get("package") ?? undefined });
    })
    .on("GET", "/projects/:key/requirements/:code", async ({ token, params }) => requirementsService.get((await tokenProject(token, params.key ?? "")).id, params.code ?? ""))
    .on("POST", "/projects/:key/requirements", async ({ token, params, request }) =>
      requirementsService.create((await tokenProject(token, params.key ?? "")).id, token.actor, requirementInputSchema.parse(await body(request))))
    .on("PATCH", "/projects/:key/requirements/:code", async ({ token, params, request }) =>
      requirementsService.update((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "", requirementUpdateSchema.parse(await body(request))))
    .on("POST", "/projects/:key/requirements/:code/start", async ({ token, params, request }) => {
      const { branch } = z.object({ branch: z.string().nullable().default(null) }).parse(await body(request));
      await lifecycleService.start((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "", branch);
      return { ok: true };
    })
    .on("POST", "/projects/:key/requirements/:code/approve", async ({ token, params }) => {
      await lifecycleService.approve((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "");
      return { ok: true };
    })
    .on("POST", "/projects/:key/requirements/:code/tests", async ({ token, params, request }) => {
      const input = z.object({ criterion: z.string(), test: z.string() }).parse(await body(request));
      await criteriaService.linkTest((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "", input.criterion, input.test);
      return { ok: true };
    })
    .on("POST", "/projects/:key/decisions", async ({ token, params, request }) =>
      decisionsService.record((await tokenProject(token, params.key ?? "")).id, token.actor, decisionInputSchema.parse(await body(request))))
    .on("POST", "/projects/:key/questions", async ({ token, params, request }) =>
      questionsService.ask((await tokenProject(token, params.key ?? "")).id, token.actor, questionInputSchema.parse(await body(request))))
    .on("POST", "/projects/:key/incidents", async ({ token, params, request }) =>
      incidentsService.report((await tokenProject(token, params.key ?? "")).id, token.actor, incidentInputSchema.parse(await body(request))));
}

/** POST /projects/:key/sources: multipart upload from the CLI (`lastro intake <file>`). */
export function intakeRoutes(router: ApiRouter) {
  router.on("POST", "/projects/:key/sources", async ({ token, params, request }) => {
    const result = await ingestUpload((await tokenProject(token, params.key ?? "")).id, token.actor, await request.formData());
    return { sourceCode: result.sourceCode, version: result.version, assets: result.assets.length };
  });
}
