import { docBuildsService } from "@lastro/core";
import { DOCUMENT_IDS } from "@lastro/docs";
import { storeFromEnv } from "@lastro/storage";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildDocs } from "@/server/docs";
import { requireProject } from "./context.server";

const keySchema = z.object({ key: z.string() });

export const listDocs = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => docBuildsService.latest((await requireProject(data.key)).project.id));

export const generateDocs = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ lang: z.enum(["en", "pt-BR"]) }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    return buildDocs(project.id, actor, { lang: data.lang });
  });

export const readDoc = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.extend({ document: z.enum(DOCUMENT_IDS) }).parse(d))
  .handler(async ({ data }) => {
    const { project } = await requireProject(data.key);
    const doc = await docBuildsService.read(project.id, data.document, "md", storeFromEnv());
    return { markdown: new TextDecoder().decode(doc.bytes), createdAt: doc.createdAt };
  });
