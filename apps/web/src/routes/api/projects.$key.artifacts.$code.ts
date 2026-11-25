import { artifactsService } from "@lastro/core";
import { storeFromEnv } from "@lastro/storage";
import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json } from "@/api-lib/http";
import { requireProject } from "@/fns/context.server";

/** Serves a stored artifact (source images, screenshots) to signed-in members. */
export const Route = createFileRoute("/api/projects/$key/artifacts/$code")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { project } = await requireProject(params.key);
          const { artifact, bytes } = await artifactsService.read(project.id, params.code, storeFromEnv());
          return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]), {
            headers: { "content-type": artifact.contentType, "cache-control": "private, max-age=31536000, immutable", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" },
          });
        } catch (error) {
          if (error instanceof Error && error.message === "UNAUTHORIZED") return json({ error: "sign in first" }, 401);
          return errorResponse(error);
        }
      },
    },
  },
});
