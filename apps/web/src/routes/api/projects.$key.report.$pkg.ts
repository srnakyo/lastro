import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json } from "@/api-lib/http";
import { requireProject } from "@/fns/context.server";
import { packageReportMarkdown } from "@/server/docs";

/** The item-by-item report of a package, from the dashboard: /api/projects/<key>/report/PKG-X?lang=pt-BR */
export const Route = createFileRoute("/api/projects/$key/report/$pkg")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { project } = await requireProject(params.key);
          const lang = new URL(request.url).searchParams.get("lang");
          const markdown = await packageReportMarkdown(project.id, params.pkg, { lang: lang === "pt-BR" ? "pt-BR" : lang === "en" ? "en" : undefined });
          return new Response(markdown, { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="${project.key}-${params.pkg}-report.md"` } });
        } catch (error) {
          if (error instanceof Error && error.message === "UNAUTHORIZED") return json({ error: "sign in first" }, 401);
          return errorResponse(error);
        }
      },
    },
  },
});
