import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json } from "@/api-lib/http";
import { requireProject } from "@/fns/context.server";
import { ingestUpload } from "@/server/intake";

/** Upload from the dashboard, with the session cookie. */
export const Route = createFileRoute("/api/projects/$key/sources")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { project, actor } = await requireProject(params.key);
          const result = await ingestUpload(project.id, actor, await request.formData());
          return json({ sourceCode: result.sourceCode, version: result.version, assets: result.assets.length });
        } catch (error) {
          if (error instanceof Error && error.message === "UNAUTHORIZED") return json({ error: "sign in first" }, 401);
          return errorResponse(error);
        }
      },
    },
  },
});
