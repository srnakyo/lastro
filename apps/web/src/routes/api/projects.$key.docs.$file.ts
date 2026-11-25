import { docBuildsService } from "@lastro/core";
import { DOCUMENT_IDS, type DocumentId } from "@lastro/docs";
import { storeFromEnv } from "@lastro/storage";
import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json } from "@/api-lib/http";
import { requireProject } from "@/fns/context.server";

const FORMATS = ["md", "html", "pdf"] as const;

/** Download of the latest build of a document: /api/projects/<key>/docs/test-plan.pdf */
export const Route = createFileRoute("/api/projects/$key/docs/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const [document, format] = params.file.split(".") as [DocumentId, (typeof FORMATS)[number]];
          if (!DOCUMENT_IDS.includes(document) || !FORMATS.includes(format)) return json({ error: "unknown document" }, 404);
          const { project } = await requireProject(params.key);
          const doc = await docBuildsService.read(project.id, document, format, storeFromEnv());
          const name = `${project.key}-${document.toUpperCase()}.${format}`;
          return new Response(new Blob([doc.bytes as Uint8Array<ArrayBuffer>]), {
            headers: {
              "content-type": doc.contentType,
              "content-disposition": `${format === "md" ? "attachment" : "inline"}; filename="${name}"`,
              "x-content-type-options": "nosniff",
              ...(format === "html" ? { "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:" } : {}),
            },
          });
        } catch (error) {
          if (error instanceof Error && error.message === "UNAUTHORIZED") return json({ error: "sign in first" }, 401);
          return errorResponse(error);
        }
      },
    },
  },
});
