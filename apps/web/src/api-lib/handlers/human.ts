import { criteriaService, decisionsService, incidentsService, lifecycleService, questionsService, sourcesService } from "@lastro/core";
import { answerInputSchema, triageInputSchema } from "@lastro/shared";
import { z } from "zod";
import { body } from "../http";
import type { ApiRouter } from "../router";
import { tokenProject } from "../scope";

const reason = z.object({ reason: z.string().min(1) });
const reference = z.object({ reference: z.string().min(1) });
const ok = { ok: true };

/** Human actions through the API: the core refuses each of them for an agent token. */
export function humanRoutes(router: ApiRouter) {
  router
    .on("POST", "/projects/:key/requirements/:code/accept", async ({ token, params, request }) => {
      await lifecycleService.accept((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "", reference.parse(await body(request)).reference);
      return ok;
    })
    .on("POST", "/projects/:key/requirements/:code/drop", async ({ token, params, request }) => {
      await lifecycleService.drop((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "", reason.parse(await body(request)).reason);
      return ok;
    })
    .on("POST", "/projects/:key/requirements/:code/unlock", async ({ token, params }) => {
      await criteriaService.unlock((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "");
      return ok;
    })
    .on("POST", "/projects/:key/questions/:code/answer", async ({ token, params, request }) =>
      questionsService.answer((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "", answerInputSchema.parse(await body(request))))
    .on("POST", "/projects/:key/decisions/:code/confirm", async ({ token, params, request }) => {
      const options = z.object({ mine: z.boolean().optional() }).parse(await body(request));
      await decisionsService.confirm((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "", options);
      return ok;
    })
    .on("POST", "/projects/:key/decisions/:code/merge", async ({ token, params, request }) => {
      const { into } = z.object({ into: z.string().min(1) }).parse(await body(request));
      await decisionsService.merge((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "", into);
      return ok;
    })
    .on("POST", "/projects/:key/decisions/:code/overturn", async ({ token, params, request }) => {
      await decisionsService.overturn((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "", reason.parse(await body(request)).reason);
      return ok;
    })
    .on("POST", "/projects/:key/incidents/:code/triage", async ({ token, params, request }) => {
      await incidentsService.triage((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "", triageInputSchema.parse(await body(request)));
      return ok;
    })
    .on("POST", "/projects/:key/sources/:code/final", async ({ token, params }) => {
      await sourcesService.markFinal((await tokenProject(token, params.key ?? "")).id, token.actor, params.code ?? "");
      return ok;
    });
}
