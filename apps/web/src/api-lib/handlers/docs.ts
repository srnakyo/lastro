import { docBuildsService } from "@lastro/core";
import { DOCUMENT_IDS } from "@lastro/docs";
import { storeFromEnv } from "@lastro/storage";
import { z } from "zod";
import { buildDocs, packageReportMarkdown } from "../../server/docs";
import { body } from "../http";
import type { ApiRouter } from "../router";
import { tokenProject } from "../scope";

const buildSchema = z.object({ lang: z.enum(["en", "pt-BR"]).optional(), pdf: z.boolean().default(true), only: z.array(z.enum(DOCUMENT_IDS)).optional(), commit: z.string().nullable().optional() });
const fileSchema = z.object({ document: z.enum(DOCUMENT_IDS), format: z.enum(["md", "html", "pdf"]) });

export function docsRoutes(router: ApiRouter) {
  router
    .on("POST", "/projects/:key/docs", async ({ token, params, request }) => buildDocs((await tokenProject(token, params.key ?? "")).id, token.actor, buildSchema.parse(await body(request))))
    .on("GET", "/projects/:key/report/:pkg", async ({ token, params, query }) => {
      const lang = query.get("lang") === "pt-BR" ? "pt-BR" : query.get("lang") === "en" ? "en" : undefined;
      const markdown = await packageReportMarkdown((await tokenProject(token, params.key ?? "")).id, params.pkg ?? "", { lang, commit: query.get("commit") });
      return new Response(markdown, { headers: { "content-type": "text/markdown; charset=utf-8" } });
    })
    .on("GET", "/projects/:key/docs", async ({ token, params }) => docBuildsService.latest((await tokenProject(token, params.key ?? "")).id))
    .on("GET", "/projects/:key/docs/:file", async ({ token, params }) => {
      const [document, format] = (params.file ?? "").split(".");
      const file = fileSchema.parse({ document, format });
      const doc = await docBuildsService.read((await tokenProject(token, params.key ?? "")).id, file.document, file.format, storeFromEnv());
      return new Response(new Blob([doc.bytes as Uint8Array<ArrayBuffer>]), { headers: { "content-type": doc.contentType } });
    });
}
