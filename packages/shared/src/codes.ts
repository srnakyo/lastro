import { z } from "zod";

/** Crockford base32: no I, L, O or U, so codes are easy to read aloud and never ambiguous. */
export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const CODE_PREFIXES = ["SRC", "REQ", "DEC", "Q", "INC", "PKG", "ART", "INV"] as const;
export type CodePrefix = (typeof CODE_PREFIXES)[number];

export function codeSchema(prefix: CodePrefix) {
  return z.string().regex(new RegExp(`^${prefix}-[${CROCKFORD}]{5}$`), `must look like ${prefix}-XXXXX`);
}

export const criterionCodeSchema = z.string().regex(/^AC-\d+$/, "must look like AC-1");
/** New invariants get INV-XXXXX like every entity; INV-1 style codes written by hand before stay valid. */
export const invariantCodeSchema = z.string().regex(/^INV-([0-9A-HJKMNP-TV-Z]{5}|\d+)$/, "must look like INV-K7Q2M (or INV-1 for older ones)");
export const projectKeySchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/, "lowercase letters, digits and hyphens, 3 to 50 characters");
