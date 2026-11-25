import { CROCKFORD, type CodePrefix } from "@lastro/shared";
import { LastroError } from "../errors";

export function randomCode(prefix: CodePrefix): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return `${prefix}-${Array.from(bytes, (b) => CROCKFORD[b % 32]).join("")}`;
}

/** Generates a code that does not exist yet in the project. */
export async function newCode(prefix: CodePrefix, exists: (code: string) => Promise<boolean>): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode(prefix);
    if (!(await exists(code))) return code;
  }
  throw new LastroError("CONFLICT", `could not generate a free ${prefix} code`);
}
