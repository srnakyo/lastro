import { requireCredentials, type Credentials } from "../config/credentials";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown,
  ) {
    super(message);
  }
}

/** Calls the Lastro server's /api/v1 with the stored token. */
export class LastroClient {
  constructor(private readonly credentials: Credentials = requireCredentials()) {}

  get baseUrl() {
    return this.credentials.url.replace(/\/$/, "");
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers: { authorization: `Bearer ${this.credentials.token}`, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string; details?: unknown };
    if (!res.ok) throw new ApiError(res.status, data.code ?? "HTTP", data.error ?? res.statusText, data.details);
    return data as T;
  }

  async upload<T>(path: string, form: FormData): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, { method: "POST", headers: { authorization: `Bearer ${this.credentials.token}` }, body: form });
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string; details?: unknown };
    if (!res.ok) throw new ApiError(res.status, data.code ?? "HTTP", data.error ?? res.statusText, data.details);
    return data as T;
  }

  /** Raw bytes of a file the server generated (documents). */
  async download(path: string): Promise<Uint8Array> {
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, { headers: { authorization: `Bearer ${this.credentials.token}` } });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      throw new ApiError(res.status, data.code ?? "HTTP", data.error ?? res.statusText, null);
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body: unknown = {}) {
    return this.request<T>("POST", path, body);
  }

  /** Raw call to the MCP endpoint, for the stdio bridge. */
  async mcp(project: string, message: unknown, session: string | null): Promise<{ status: number; body: string; session: string | null }> {
    const res = await fetch(`${this.baseUrl}/api/mcp?project=${encodeURIComponent(project)}`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.credentials.token}`, "content-type": "application/json", ...(session ? { "mcp-session-id": session } : {}) },
      body: JSON.stringify(message),
    });
    return { status: res.status, body: await res.text(), session: res.headers.get("mcp-session-id") };
  }
}
