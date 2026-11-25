import { LastroError, tokensService, type VerifiedToken } from "@lastro/core";
import { ZodError } from "zod";

const STATUS: Record<string, number> = { NOT_FOUND: 404, VALIDATION: 422, CONFLICT: 409, HUMAN_ONLY: 403, FORBIDDEN: 403, INVALID_TRANSITION: 409, BLOCKED: 409 };

export const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Domain errors become JSON with a stable code; everything else is a 500 without internals. */
export function errorResponse(error: unknown): Response {
  if (error instanceof LastroError) return json({ error: error.message, code: error.code, details: error.details ?? null }, STATUS[error.code] ?? 400);
  if (error instanceof ZodError) return json({ error: "invalid request", code: "VALIDATION", details: error.issues }, 422);
  console.error(error);
  return json({ error: "internal error", code: "INTERNAL" }, 500);
}

export async function authenticate(request: Request): Promise<VerifiedToken> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new LastroError("FORBIDDEN", "missing Bearer token");
  return tokensService.verify(token);
}

export async function body(request: Request): Promise<unknown> {
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}
