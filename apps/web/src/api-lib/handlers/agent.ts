import { addTouches, agentEventsService, lockedTestFiles } from "@lastro/core";
import { z } from "zod";
import { body } from "../http";
import type { ApiRouter } from "../router";
import { tokenProject } from "../scope";

const touchesSchema = z.object({ files: z.array(z.string()).max(500), branch: z.string().nullable().default(null), requirement: z.string().nullable().default(null) });
const eventSchema = z.object({ agent: z.string().min(1).max(60), session: z.string().min(1).max(200), kind: z.string().min(1).max(60), payload: z.record(z.string(), z.unknown()).default({}) });

/** Endpoints the agent hooks call: touched files, locked tests and session events. */
export function agentRoutes(router: ApiRouter) {
  router
    .on("POST", "/projects/:key/touches", async ({ token, params, request }) => {
      const input = touchesSchema.parse(await body(request));
      return addTouches((await tokenProject(token, params.key ?? "")).id, token.actor, input.files, input.branch, input.requirement);
    })
    .on("GET", "/projects/:key/locked-tests", async ({ token, params }) => lockedTestFiles((await tokenProject(token, params.key ?? "")).id))
    .on("POST", "/projects/:key/agent-events", async ({ token, params, request }) => {
      const e = eventSchema.parse(await body(request));
      await agentEventsService.record((await tokenProject(token, params.key ?? "")).id, { agent: e.agent, externalId: e.session }, e.kind, e.payload as never);
      return { ok: true };
    });
}
