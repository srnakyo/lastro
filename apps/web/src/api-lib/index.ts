import { authenticate, errorResponse, json } from "./http";
import { projectRoutes } from "./handlers/projects";
import { agentRoutes } from "./handlers/agent";
import { docsRoutes } from "./handlers/docs";
import { runRoutes } from "./handlers/runs";
import { intakeRoutes, specRoutes } from "./handlers/spec";
import { ApiRouter } from "./router";

export const apiRouter = new ApiRouter();
projectRoutes(apiRouter);
specRoutes(apiRouter);
intakeRoutes(apiRouter);
runRoutes(apiRouter);
docsRoutes(apiRouter);
agentRoutes(apiRouter);

/** Entry for /api/v1/*: token, route, JSON. */
export async function handleApi(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/v1/, "") || "/";
    const route = apiRouter.match(request.method, path);
    if (!route) return json({ error: `no route for ${request.method} ${path}`, code: "NOT_FOUND" }, 404);
    const token = await authenticate(request);
    const result = await route.handler({ token, params: route.params, query: url.searchParams, request });
    return result instanceof Response ? result : json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
