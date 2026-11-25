import { docBuildsService } from "@lastro/core";
import { DOCUMENT_IDS } from "@lastro/docs";
import { storeFromEnv } from "@lastro/storage";
import { z } from "zod";
import { buildDocs } from "../../server/docs";
import { body } from "../http";
import type { ApiRouter } from "../router";
import { tokenProject } from "../scope";

const buildSchema = z.object({ lang: z.enum(["en", "pt-BR"]).optional(), pdf: z.boolean().default(true), only: z.array(z.enum(DOCUMENT_IDS)).optional() });
const fileSchema = z.object({ document: z.enum(DOCUMENT_IDS), format: z.enum(["md", "html", "pdf"]) });

export function docsRoutes(router: ApiRouter) {
  router
    .on("POST", "/projects/:key/docs", async ({ token, params, request }) => buildDocs((await tokenProject(token, params.key ?? "")).id, token.actor, buildSchema.parse(await body(request))))
    .on("GET", "/projects/:key/docs", async ({ token, params }) => docBuildsService.latest((await tokenProject(token, params.key ?? "")).id))
    .on("GET", "/projects/:key/docs/:file", async ({ token, params }) => {
      const [document, format] = (params.file ?? "").split(".");
      const file = fileSchema.parse({ document, format });
      const doc = await docBuildsService.read((await tokenProject(token, params.key ?? "")).id, file.document, file.format, storeFromEnv());
      return new Response(new Blob([doc.bytes as Uint8Array<ArrayBuffer>]), { headers: { "content-type": doc.contentType } });
    });
}
