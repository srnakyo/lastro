import type { VerifiedToken } from "@lastro/core";

export interface ApiContext {
  token: VerifiedToken;
  params: Record<string, string>;
  query: URLSearchParams;
  request: Request;
}

type Handler = (ctx: ApiContext) => Promise<unknown>;

interface Route {
  method: string;
  pattern: RegExp;
  names: string[];
  handler: Handler;
}

/** A tiny router for /api/v1: "GET /projects/:key/requirements/:code". */
export class ApiRouter {
  private readonly routes: Route[] = [];

  on(method: string, path: string, handler: Handler): this {
    const names: string[] = [];
    const pattern = new RegExp(`^${path.replace(/:([a-zA-Z]+)/g, (_m, name: string) => (names.push(name), "([^/]+)"))}$`);
    this.routes.push({ method, pattern, names, handler });
    return this;
  }

  match(method: string, path: string): { handler: Handler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      const m = route.method === method ? route.pattern.exec(path) : null;
      if (m) return { handler: route.handler, params: Object.fromEntries(route.names.map((n, i) => [n, decodeURIComponent(m[i + 1] ?? "")])) };
    }
    return null;
  }
}
