import { createFileRoute } from "@tanstack/react-router";
import { authenticate, errorResponse, json } from "@/api-lib/http";
import { handleRpc } from "@/api-lib/mcp/rpc";

/** MCP over streamable HTTP (JSON responses), authenticated with a Bearer token. */
export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = await authenticate(request);
          const url = new URL(request.url);
          const session = request.headers.get("mcp-session-id") ?? crypto.randomUUID();
          const message = await request.json();
          const batch = Array.isArray(message) ? message : [message];
          const results = (await Promise.all(batch.map((m) => handleRpc(m, token, url.searchParams.get("project"), session)))).filter((r) => r !== null);
          if (results.length === 0) return new Response(null, { status: 202, headers: { "mcp-session-id": session } });
          const response = json(Array.isArray(message) ? results : results[0]);
          response.headers.set("mcp-session-id", session);
          return response;
        } catch (error) {
          return errorResponse(error);
        }
      },
      GET: () => new Response(null, { status: 405, headers: { allow: "POST" } }),
    },
  },
});
