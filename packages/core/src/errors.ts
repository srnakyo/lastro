export type LastroErrorCode =
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "HUMAN_ONLY"
  | "INVALID_TRANSITION"
  | "BLOCKED"
  | "FORBIDDEN";

/** Domain error with a stable code that the API maps to an HTTP status. */
export class LastroError extends Error {
  constructor(
    readonly code: LastroErrorCode,
    message: string,
    readonly details: unknown = undefined,
  ) {
    super(message);
    this.name = "LastroError";
  }
}

export const notFound = (what: string) => new LastroError("NOT_FOUND", `${what} not found`);
