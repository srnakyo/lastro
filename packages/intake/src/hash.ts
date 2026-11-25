import { createHash } from "node:crypto";

/** "sha256:<hex>" of the original bytes, the same for every kind of source. */
export function sourceHash(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
