import { cliLoginService } from "@lastro/core";
import { z } from "zod";
import { body } from "../http";
import type { ApiRouter, PublicContext } from "../router";

const startSchema = z.object({ host: z.string().max(200).default("") });
const collectSchema = z.object({ secret: z.string().min(1).max(200) });

/**
 * `lastro login` without a token: start a login (the CLI opens /cli/authorize/<id> in the browser), then
 * poll with the secret until the person authorizes it, refuses it or it expires.
 */
export function cliLoginRoutes(router: ApiRouter<PublicContext>) {
  router
    .on("POST", "/cli/login", async ({ request }) => {
      const login = await cliLoginService.start(startSchema.parse(await body(request)));
      return { id: login.id, code: login.code, secret: login.secret, expiresAt: login.expiresAt.toISOString() };
    })
    .on("POST", "/cli/login/:id", async ({ params, request }) => cliLoginService.collect(params.id ?? "", collectSchema.parse(await body(request)).secret));
}
